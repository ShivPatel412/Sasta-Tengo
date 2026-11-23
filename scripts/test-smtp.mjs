import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

// Read .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key] && val) {
        process.env[key] = val;
      }
    }
  }
}

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
const to = 'shivppatel412@gmail.com';
const from = process.env.SMTP_FROM || `"Birthday Invitation Radar" <${user || to}>`;

console.log('====================================');
console.log('📧 SMTP DIAGNOSTIC & TEST RUNNER');
console.log('====================================');
console.log(`Host: ${host}:${port}`);
console.log(`SMTP User: ${user ? user : '(not configured)'}`);
console.log(`SMTP Password: ${pass ? '••••••••' : '(not configured)'}`);
console.log(`Recipient: ${to}`);
console.log('------------------------------------');

if (!user || !pass) {
  console.log('❌ SMTP credentials (SMTP_USER and SMTP_PASSWORD/SMTP_PASS) are not yet configured in .env.local or environment variables.');
  console.log('To send live emails through Gmail, generate a 16-character Google App Password:');
  console.log('1. Visit: https://myaccount.google.com/apppasswords');
  console.log('2. Create an App Password named "Birthday Invitation"');
  console.log('3. Set in .env.local:');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log(`   SMTP_USER=${to}`);
  console.log('   SMTP_PASSWORD=your-16-char-app-password');
  console.log('   SMTP_FROM="Birthday Invitation Radar <' + to + '>"');
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: process.env.SMTP_SECURE === 'true' || port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: false }
});

try {
  console.log('🔄 Verifying SMTP transporter connection...');
  await transport.verify();
  console.log('✅ SMTP transporter verified successfully!');

  console.log(`📨 Sending test email to ${to}...`);
  const info = await transport.sendMail({
    from,
    to,
    subject: '🎂 TEST EMAIL: Birthday Invitation RSVP Radar is Live!',
    html: `
      <div style="font-family: sans-serif; background: #0b0b14; color: #fff; padding: 24px; border-radius: 12px; max-width: 500px;">
        <h2 style="color: #ec4899; margin-top: 0;">🎉 SMTP Email Test Successful!</h2>
        <p>Hey Shiv, your birthday invitation RSVP email system is verified and working!</p>
        <p style="background: rgba(255,255,255,0.08); padding: 12px; border-radius: 8px;">
          <strong>Target:</strong> 28-29 November Birthday Party<br>
          <strong>Recipient:</strong> ${to}<br>
          <strong>Status:</strong> Active & Ready for submissions
        </p>
        <p style="color: #9ca3af; font-size: 12px;">Sent from shivpatel.in</p>
      </div>
    `
  });

  console.log('🎉 Test email sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
} catch (err) {
  console.error('❌ Failed to send email via SMTP:', err.message);
  process.exit(1);
}
