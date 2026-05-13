interface ErrorPayload {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  context?: string;
  timestamp?: string;
}

async function sendViaResend(payload: ErrorPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const to = process.env.ERROR_ALERT_EMAIL || process.env.ADMIN_EMAIL;

  if (!apiKey || !to) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `🚨 KingVision Error: ${payload.message.slice(0, 80)}`,
      html: `
        <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:8px">
          <h2 style="color:#f97316;margin:0 0 16px">Production Error Alert</h2>
          <p><b>Time:</b> ${payload.timestamp || new Date().toISOString()}</p>
          <p><b>URL:</b> ${payload.url || '-'}</p>
          <p><b>Context:</b> ${payload.context || 'frontend'}</p>
          <p style="background:#1e293b;padding:12px;border-radius:4px;word-break:break-all">
            <b style="color:#fb923c">Error:</b><br>${payload.message}
          </p>
          ${payload.stack ? `<pre style="background:#1e293b;padding:12px;border-radius:4px;overflow:auto;font-size:12px;white-space:pre-wrap">${payload.stack}</pre>` : ''}
          <p style="color:#64748b;font-size:12px">UserAgent: ${payload.userAgent || '-'}</p>
        </div>`,
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  // Only accept reports from production (prevents dev noise)
  const origin = req.headers.origin || '';
  const isAllowedOrigin =
    origin.includes('vercel.app') ||
    origin.includes('kingvision') ||
    process.env.NODE_ENV === 'development';

  if (!isAllowedOrigin) return res.status(403).end();

  const payload = req.body as ErrorPayload;
  if (!payload?.message) return res.status(400).json({ error: 'Missing message' });

  try {
    await sendViaResend(payload);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('error-report handler failed:', err);
    return res.status(500).json({ error: 'Failed to send alert' });
  }
}
