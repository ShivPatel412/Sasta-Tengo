import nodemailer from 'nodemailer';
import { query } from './db.mjs';
export async function enqueue(kind, id, connection) {
  await query('INSERT INTO next_mail_outbox (kind,record_id,created_at) VALUES (?,?,UTC_TIMESTAMP())', [kind,id], connection);
}
export async function deliver({run=query}={}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.LEAD_RECIPIENT) throw new Error('SMTP not configured');
  const secure=process.env.SMTP_SECURE==='true'||Number(process.env.SMTP_PORT||587)===465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    requireTLS: !secure, connectionTimeout: 10000, socketTimeout: 15000
  });
  const rows = await run('SELECT * FROM next_mail_outbox WHERE sent_at IS NULL AND attempts<10 AND (locked_until IS NULL OR locked_until<UTC_TIMESTAMP()) ORDER BY id LIMIT 10');
  let sent = 0;
  for (const job of rows) {
    const lock = await run('UPDATE next_mail_outbox SET locked_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),attempts=attempts+1 WHERE id=? AND (locked_until IS NULL OR locked_until<UTC_TIMESTAMP()) AND sent_at IS NULL', [job.id]);
    if (!lock.affectedRows) continue;
    try {
      const contact = job.kind === 'contact';
      const table = job.kind==='rsvp' ? 'next_rsvps' : contact ? 'contacts' : 'appointments';
      const record = (await run(`SELECT * FROM ${table} WHERE id=?`, [job.record_id]))[0];
      if (!record) { await run('UPDATE next_mail_outbox SET sent_at=UTC_TIMESTAMP() WHERE id=?', [job.id]); continue; }
      if(job.kind==='rsvp'){
        const payload=typeof record.payload==='string'?JSON.parse(record.payload):record.payload;
        await transport.sendMail({from:process.env.SMTP_FROM,to:process.env.NOTIFICATION_EMAIL||process.env.LEAD_RECIPIENT,
          subject:'Birthday RSVP received',text:'Birthday RSVP\n\n'+JSON.stringify(payload,null,2),
          messageId:`<shiv-rsvp-${job.id}@${new URL(process.env.APP_ORIGIN).hostname}>`});
        await run('UPDATE next_mail_outbox SET sent_at=UTC_TIMESTAMP(),locked_until=NULL WHERE id=?',[job.id]);
        sent++;continue;
      }
      // Each recipient has an independent checkpoint so one failure does not resend both.
      if (!job.admin_sent_at) {
        await transport.sendMail({ from: process.env.SMTP_FROM, to: process.env.LEAD_RECIPIENT,
          subject: contact ? 'New website contact' : 'New project request',
          text: `A new submission (#${record.id}) is available in your dashboard.`,
          messageId: `<shiv-admin-${job.id}@${new URL(process.env.APP_ORIGIN).hostname}>` });
        await run('UPDATE next_mail_outbox SET admin_sent_at=UTC_TIMESTAMP() WHERE id=?', [job.id]);
      }
      await transport.sendMail({ from: process.env.SMTP_FROM, to: contact ? record.email : record.client_email,
        subject: 'Your request has been received', text: 'Thank you for getting in touch. Your submission has been received and will be reviewed.',
        messageId: `<shiv-client-${job.id}@${new URL(process.env.APP_ORIGIN).hostname}>` });
      await run('UPDATE next_mail_outbox SET sent_at=UTC_TIMESTAMP(),locked_until=NULL WHERE id=?', [job.id]);
      sent++;
    } catch { /* Retained for retry; no personal details in logs. */ }
  }
  await run('DELETE FROM next_rate_limits WHERE expires_at<UTC_TIMESTAMP()');
  await run('DELETE FROM next_sessions WHERE expires_at<UTC_TIMESTAMP()');
  return sent;
}
