import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper to deduce device name from telemetry
function deduceDeviceName(telemetry = {}) {
  const ua = telemetry.userAgent || '';
  const screen = telemetry.screen || {};
  const dpr = screen.dpr || 1;
  const w = screen.width || 0;
  const h = screen.height || 0;
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);

  if (/iPhone/i.test(ua)) {
    if (minDim === 430 && maxDim === 932) return 'iPhone 14/15/16 Pro Max or Plus (430x932 @ 3x)';
    if (minDim === 393 && maxDim === 852) return 'iPhone 14/15/16 Pro or Base 15/16 (393x852 @ 3x)';
    if (minDim === 390 && maxDim === 844) return 'iPhone 12/13/14 Base or 13/14 Pro (390x844 @ 3x)';
    if (minDim === 414 && maxDim === 896) return 'iPhone 11 / XR / XS Max (414x896)';
    if (minDim === 375 && maxDim === 812) return 'iPhone X / XS / 11 Pro / 12/13 Mini (375x812 @ 3x)';
    if (minDim === 375 && maxDim === 667) return 'iPhone SE (2nd/3rd Gen) or iPhone 8 (375x667 @ 2x)';
    return `Apple iPhone (${minDim}x${maxDim} @ ${dpr}x)`;
  }
  if (/iPad/i.test(ua)) {
    return `Apple iPad (${minDim}x${maxDim} @ ${dpr}x)`;
  }
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]+;\s*([^;)]+)\)/i);
    const model = match ? match[1].trim() : 'Android Device';
    return `${model} (${minDim}x${maxDim} @ ${dpr}x)`;
  }
  if (/Macintosh/i.test(ua)) return 'Apple Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return `${telemetry.platform || 'Unknown Device'} (${minDim}x${maxDim})`;
}

function buildEmailHtml(data, clientIp) {
  const { activities, dinner, dessert, bottle, wishlistPlace = {}, telemetry = {}, location = {} } = data;
  const guessedDevice = deduceDeviceName(telemetry);

  const formattedActivities = Array.isArray(activities)
    ? activities.join(', ')
    : (activities || 'None selected');

  const mapsUrl = (location.latitude && location.longitude)
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b14; color: #f3f4f6; margin: 0; padding: 24px; }
      .container { max-width: 600px; margin: 0 auto; background: #131325; border: 1px solid #2d2b55; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
      .header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 1px; }
      .header p { margin: 8px 0 0 0; color: #fdf2f8; font-size: 14px; }
      .content { padding: 24px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: rgba(236,72,153,0.2); color: #f472b6; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
      .section-card { background: #1c1c36; border-radius: 12px; padding: 18px; margin-bottom: 20px; border-left: 4px solid #a855f7; }
      .section-card.spot { border-left-color: #ec4899; }
      .section-card.spy { border-left-color: #06b6d4; }
      .section-title { font-size: 16px; font-weight: bold; color: #ffffff; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
      .choice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #28284e; font-size: 14px; }
      .choice-row:last-child { border-bottom: none; }
      .choice-label { color: #9ca3af; font-weight: 500; }
      .choice-value { color: #ffffff; font-weight: 600; text-align: right; }
      .highlight-bottle { color: #fbbf24; font-size: 16px; }
      .maps-btn { display: inline-block; margin-top: 10px; padding: 10px 18px; background: #06b6d4; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; }
      .spot-btn { display: inline-block; margin-top: 10px; padding: 10px 18px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; }
      .footer { text-align: center; font-size: 12px; color: #6b7280; padding: 20px; background: #0e0e1c; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 NEW BIRTHDAY RSVP RECEIVED!</h1>
        <p>28-29 November Celebration | Bad Decisions Locked In 😈</p>
      </div>
      <div class="content">
        <div class="badge">🔥 FRESH SUBMISSION DETECTED</div>

        <div class="section-card">
          <div class="section-title">🗳️ PARTY CHOICES LOCKED IN</div>
          <div class="choice-row">
            <span class="choice-label">🎯 Voted Activities:</span>
            <span class="choice-value">${formattedActivities}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🥩 Dinner Craving:</span>
            <span class="choice-value">${dinner || 'Host Picks'}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🍰 Dessert Spot:</span>
            <span class="choice-value">${dessert || 'Midnight Sweet Rush'}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🍾 Bottle of Poison:</span>
            <span class="choice-value highlight-bottle">${bottle || 'Surprise Me'}</span>
          </div>
        </div>

        ${(wishlistPlace.name || wishlistPlace.link) ? `
        <div class="section-card spot">
          <div class="section-title">📍 REQUESTED SPOT (INSTAGRAM / GOOGLE MAPS)</div>
          ${wishlistPlace.name ? `
          <div class="choice-row">
            <span class="choice-label">🏢 Venue / Place Name:</span>
            <span class="choice-value" style="color: #f472b6; font-size: 15px;">${wishlistPlace.name}</span>
          </div>
          ` : ''}
          ${wishlistPlace.link ? `
          <div class="choice-row">
            <span class="choice-label">🔗 Shared Link:</span>
            <span class="choice-value"><a href="${wishlistPlace.link}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${wishlistPlace.link}</a></span>
          </div>
          <div style="text-align: center; margin-top: 10px;">
            <a href="${wishlistPlace.link}" target="_blank" class="spot-btn">📱 Open Shared Instagram Reel / Map Link</a>
          </div>
          ` : ''}
          ${wishlistPlace.notes ? `
          <div class="choice-row">
            <span class="choice-label">💬 Vibe / Notes:</span>
            <span class="choice-value">${wishlistPlace.notes}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="section-card spy">
          <div class="section-title">🕵️‍♂️ DETECTIVE DOSSIER (WHO FILLED THIS?)</div>
          <div class="choice-row">
            <span class="choice-label">📱 Suspected Device:</span>
            <span class="choice-value" style="color: #38bdf8;">${guessedDevice}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🖥️ Screen & DPR:</span>
            <span class="choice-value">${telemetry.screen?.width || '?'}x${telemetry.screen?.height || '?'} @ ${telemetry.screen?.dpr || 1}x</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🔋 Battery Level:</span>
            <span class="choice-value">${telemetry.battery ? `${telemetry.battery.level}% (${telemetry.battery.charging ? '⚡ Charging' : 'Discharging'})` : 'Unavailable'}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">📶 Network / Platform:</span>
            <span class="choice-value">${telemetry.network?.effectiveType || 'WiFi/Cellular'} | ${telemetry.platform || 'Mobile'}</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">⏰ Local Time:</span>
            <span class="choice-value">${telemetry.localTime || new Date().toLocaleString()} (${telemetry.timezone || 'UTC'})</span>
          </div>
          <div class="choice-row">
            <span class="choice-label">🌐 IP Address:</span>
            <span class="choice-value">${clientIp}</span>
          </div>
          ${location.latitude ? `
          <div class="choice-row">
            <span class="choice-label">📍 GPS Coordinates:</span>
            <span class="choice-value">${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} (±${Math.round(location.accuracy || 0)}m)</span>
          </div>
          <div style="text-align: center; margin-top: 12px;">
            <a href="${mapsUrl}" target="_blank" class="maps-btn">📍 Open Location in Google Maps</a>
          </div>
          ` : `
          <div class="choice-row">
            <span class="choice-label">📍 Geolocation:</span>
            <span class="choice-value">${location.city ? `${location.city}, ${location.region || ''} (${location.country || ''})` : 'GPS permission not granted'}</span>
          </div>
          `}
        </div>
      </div>
      <div class="footer">
        Birthday RSVP Stealth Engine | 28-29 Nov Birthday Party | shivpatel.in
      </div>
    </div>
  </body>
  </html>
  `;
}

export async function POST(request) {
  try {
    const data = await request.json().catch(() => ({}));
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     'Unknown IP';

    console.log('[RSVP] Received submission from IP:', clientIp);

    // Send email via Nodemailer if SMTP credentials are provided
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    const recipient = process.env.NOTIFICATION_EMAIL || process.env.LEAD_RECIPIENT || 'shivppatel412@gmail.com';
    const fromAddr = process.env.SMTP_FROM || `"Birthday RSVP Radar" <${user || recipient}>`;

    let emailSent = false;
    let emailError = null;

    if (user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: process.env.SMTP_SECURE === 'true' || port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });

        const info = await transporter.sendMail({
          from: fromAddr,
          to: recipient,
          subject: `🎂 Party RSVP: New Bad Decisions Locked In! (From: ${deduceDeviceName(data.telemetry)})`,
          html: buildEmailHtml(data, clientIp)
        });

        console.log('[RSVP] Email delivered to', recipient, 'MessageId:', info.messageId);
        emailSent = true;
      } catch (err) {
        console.error('[RSVP] Nodemailer error:', err.message);
        emailError = err.message;
      }
    } else {
      console.log('[RSVP] SMTP credentials not set. Email dispatch queued/skipped.');
    }

    return Response.json({
      success: true,
      message: 'Submission received successfully! Your bad decisions are locked in.',
      emailSent,
      emailError
    });
  } catch (error) {
    console.error('[RSVP] Handler exception:', error);
    return Response.json(
      { success: false, message: 'Server error, but choices were noted.' },
      { status: 500 }
    );
  }
}
