import { query, transaction, insert, assertWritable, handle, body, HttpError } from '../../../../lib/db.mjs';
import { rateLimit } from '../../../../lib/auth.mjs';
import { contactSchema, appointmentSchema, requestSchema, storageData, serialize } from '../../../../lib/validation.mjs';
import { enqueue } from '../../../../lib/mail.mjs';
import { isLocalPreview } from '../../../../lib/preview.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const tables = { services: 'services', projects: 'projects', experience: 'experience', education: 'education' };
export async function GET(request, context) {
  return handle(async () => {
    const { path } = await context.params;
    const [resource, action, category] = path; const table = tables[resource];
    if (!table) throw new HttpError(404, 'Not found.');
    let where = ''; let values = [];
    if (path.length === 1) where = resource === 'services' ? ' WHERE is_active=1' : '';
    else if (resource === 'projects' && action === 'featured' && path.length === 2) where = ' WHERE is_featured=1';
    else if (resource === 'projects' && action === 'category' && path.length === 3) { where = ' WHERE category=?'; values = [category]; }
    else if (/^[1-9][0-9]*$/.test(action) && path.length === 2) { where = ' WHERE id=?'; values = [action]; }
    else throw new HttpError(404, 'Not found.');
    const single = path.length === 2 && /^[1-9][0-9]*$/.test(action);
    if (isLocalPreview()) {
      if (single) throw new HttpError(404, 'No saved records are loaded in local preview.');
      return Response.json([], { headers: { 'Cache-Control': 'no-store', 'X-Local-Preview': '1' } });
    }
    const ordering = { services: 'id', projects: '`order`,created_at DESC', experience: '`order`,start_date DESC', education: '`order`,start_year DESC' }[resource];
    const rows = (await query(`SELECT * FROM \`${table}\`${where} ORDER BY ${ordering}`, values)).map(row => serialize(row, table));
    if (single && !rows[0]) throw new HttpError(404, 'Not found.');
    return Response.json(single ? rows[0] : rows, { headers: { 'Cache-Control': 'no-store' } });
  });
}
export async function POST(request, context) {
  return handle(async () => {
    const { path } = await context.params;
    if (path.length !== 1 || !['contacts','appointments','project-requests'].includes(path[0])) throw new HttpError(404, 'Not found.');
    assertWritable();
    await rateLimit(request, 'leads');
    const input = await body(request);
    if (path[0] === 'contacts') {
      const data = contactSchema.parse(input);
      await transaction(async connection => {
        const duplicate = await query('SELECT id FROM contacts WHERE email=? AND subject=? AND message=? AND created_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 10 SECOND) LIMIT 1', [data.email,data.subject,data.message], connection);
        if (duplicate.length) return;
        const id = await insert('contacts', storageData({ ...data, is_read: false }), connection);
        await enqueue('contact', id, connection);
      });
      return Response.json({ message: 'Your message has been received.' }, { status: 201 });
    }
    if (path[0] === 'project-requests') {
      const data = requestSchema.parse(input);
      await transaction(async connection => {
        const id = await insert('appointments', storageData({ client_name: data.fullName, client_email: data.email, client_phone: data.phone, notes: data.description, request_data: JSON.stringify(data) }), connection);
        await enqueue('request', id, connection);
      });
    } else {
      const data = appointmentSchema.parse(input);
      await transaction(async connection => {
        // The old site treats each time slot as global, even across services.
        await query('SELECT id FROM next_booking_mutex WHERE id=1 FOR UPDATE', [], connection);
        const service = await query('SELECT id FROM services WHERE id=? AND is_active=1 FOR UPDATE', [data.service_id], connection);
        if (!service.length) throw new HttpError(422, 'Choose an available service.');
        const instant = new Date(data.appointment_date).toISOString().slice(0,19).replace('T',' ');
        const booked = await query("SELECT id FROM appointments WHERE appointment_date=? AND status IN ('pending','confirmed') LIMIT 1", [instant], connection);
        if (booked.length) throw new HttpError(422, 'This time slot is no longer available.');
        await insert('appointments', storageData({ ...data, appointment_date: instant }), connection);
      });
    }
    return Response.json({ message: 'Your request has been received.' }, { status: 201 });
  });
}
