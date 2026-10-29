import { query, insert, transaction, assertWritable, handle, body, HttpError } from '../../../../lib/db.mjs';
import { admin, sameOrigin, rateLimit, signIn, signOut } from '../../../../lib/auth.mjs';
import { loginSchema, contactUpdate, appointmentUpdate, projectSchema, experienceSchema, typeSchema, storageData, serialize } from '../../../../lib/validation.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const tables = { contacts: 'contacts', appointments: 'appointments', projects: 'projects', experiences: 'experience', types: 'project_types' };
const schemas = { contacts: contactUpdate, appointments: appointmentUpdate, projects: projectSchema, experiences: experienceSchema, types: typeSchema };
const json = data => Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
async function route(request, context) {
  return handle(async () => {
    const { path } = await context.params;
    const [resource, id] = path;
    if (request.method !== 'GET') sameOrigin(request);
    if (resource === 'login' && path.length === 1 && request.method === 'POST') {
      await rateLimit(request, 'login');
      const input = loginSchema.parse(await body(request, 4000));
      await rateLimit(request, 'login', input.email.toLowerCase());
      await signIn(input.email, input.password); return json({ ok: true });
    }
    await admin();
    if (resource === 'logout' && path.length === 1 && request.method === 'POST') { await signOut(); return json({ ok: true }); }
    if (resource === 'session' && path.length === 1 && request.method === 'GET') return json({ readOnly: process.env.MIGRATION_READ_ONLY !== '0' });
    if (resource === 'categories' && path.length === 1 && request.method === 'GET') {
      return json(await query('SELECT category,name FROM project_types UNION SELECT category,category AS name FROM projects WHERE category NOT IN (SELECT category FROM project_types WHERE category IS NOT NULL) ORDER BY name'));
    }
    if (resource === 'stats' && path.length === 1 && request.method === 'GET') {
      const counts = {};
      for (const table of ['contacts','appointments','projects','experience']) counts[table] = (await query(`SELECT COUNT(*) AS total FROM \`${table}\``))[0].total;
      counts.unread_contacts = (await query('SELECT COUNT(*) AS total FROM contacts WHERE is_read=0'))[0].total;
      counts.pending_requests = (await query("SELECT COUNT(*) AS total FROM appointments WHERE status='pending'"))[0].total;
      const pipeline = await query('SELECT lead_status,COUNT(*) AS total FROM (SELECT lead_status FROM contacts UNION ALL SELECT lead_status FROM appointments) t GROUP BY lead_status');
      const activity = await query('SELECT DATE(created_at) AS day,COUNT(*) AS total FROM (SELECT created_at FROM contacts UNION ALL SELECT created_at FROM appointments) t WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY day');
      return json({ counts,pipeline,activity });
    }
    const table = tables[resource];
    if (!table || path.length > 2 || (id && !/^[1-9][0-9]*$/.test(id))) throw new HttpError(404, 'Not found.');
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const page = Math.max(1, Math.min(1000000, Number(url.searchParams.get('page')) || 1));
      const clauses = [], values = [];
      if (id) { clauses.push('id=?'); values.push(id); }
      const search = url.searchParams.get('search')?.slice(0,255);
      const columns = { contacts: ['name','email','phone','subject'], appointments: ['client_name','client_email','client_phone'], projects: ['title'], experiences: ['title','company'], types: ['name'] }[resource];
      if (search) { clauses.push('(' + columns.map(column => `\`${column}\` LIKE ?`).join(' OR ') + ')'); values.push(...columns.map(() => `%${search}%`)); }
      const filter = url.searchParams.get('filter');
      if (resource === 'contacts' && filter === 'unread') clauses.push('is_read=0');
      if (resource === 'appointments' && ['pending','confirmed','completed','cancelled'].includes(filter)) { clauses.push('status=?'); values.push(filter); }
      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const rows = await query(`SELECT * FROM \`${table}\`${where} ORDER BY id DESC LIMIT 20 OFFSET ${Math.floor((page-1)*20)}`, values);
      if (id && !rows.length) throw new HttpError(404, 'Not found.');
      const [{ count }] = await query(`SELECT COUNT(*) AS count FROM \`${table}\`${where}`, values);
      return json({ data: rows.map(row => serialize(row, table)), count, page });
    }
    assertWritable();
    const existing = id ? (await query(`SELECT * FROM \`${table}\` WHERE id=?`, [id]))[0] : null;
    if (id && !existing) throw new HttpError(404, 'Not found.');
    if (request.method === 'DELETE') {
      if (!id || resource === 'appointments') throw new HttpError(405, 'Method not allowed.');
      if (resource === 'types') {
        await transaction(async connection => {
          await query('SELECT id FROM project_types WHERE id=? FOR UPDATE', [id], connection);
          if ((await query('SELECT id FROM projects WHERE category=? LIMIT 1', [existing.category], connection)).length) throw new HttpError(409, 'Move projects to another type first.');
          await query('DELETE FROM project_types WHERE id=?', [id], connection);
        });
      } else await query(`DELETE FROM \`${table}\` WHERE id=?`, [id]);
      // Media is retained for recovery; remove orphaned blobs only after a backup review.
      return json({ ok: true });
    }
    if (!['POST','PUT'].includes(request.method) || (request.method === 'POST' && id) || (request.method === 'PUT' && !id)) throw new HttpError(405, 'Method not allowed.');
    if (['contacts','appointments'].includes(resource) && !id) throw new HttpError(405, 'Create leads through the public form.');
    let data = schemas[resource].parse(await body(request));
    if (resource === 'types' && !id) data.category = data.name;
    if (resource === 'experiences' && data.is_current) data.end_date = null;
    const save = async connection => {
      if (resource === 'projects') {
        const categories = await query('SELECT id FROM project_types WHERE category=? FOR UPDATE', [data.category], connection);
        const legacy = await query('SELECT id FROM projects WHERE category=? LIMIT 1', [data.category], connection);
        if (!categories.length && !legacy.length) throw new HttpError(422, 'Create the project type first.');
      }
      data = storageData(data);
      if (id) await query(`UPDATE \`${table}\` SET ${Object.keys(data).map(k => `\`${k}\`=?`).join(',')},updated_at=UTC_TIMESTAMP() WHERE id=?`, [...Object.values(data),id], connection);
      else await insert(table, data, connection);
    };
    await transaction(save);
    return json({ ok: true });
  });
}
export { route as GET, route as POST, route as PUT, route as DELETE };
