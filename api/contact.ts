interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, subject, message } = req.body as ContactPayload;
  if (!name || !phone || !subject || !message) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const apiKey  = process.env.RESEND_API_KEY;
  const from    = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const adminTo = process.env.ERROR_ALERT_EMAIL || process.env.ADMIN_EMAIL;

  if (!apiKey || !adminTo) {
    // Graceful degradation — log and return success so UX isn't broken
    console.log('[contact] RESEND_API_KEY or ADMIN_EMAIL not set, skipping email');
    return res.json({ ok: true });
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0f2a5e;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">📬 ข้อความใหม่จากหน้าติดต่อเรา</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#64748b;width:120px">ชื่อ</td><td style="padding:8px 0;font-weight:bold">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">เบอร์โทร</td><td style="padding:8px 0;font-weight:bold">${phone}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">อีเมล</td><td style="padding:8px 0">${email || '-'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">หัวข้อ</td><td style="padding:8px 0"><span style="background:#f97316;color:#fff;padding:2px 10px;border-radius:99px;font-size:13px">${subject}</span></td></tr>
        </table>
        <div style="margin-top:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px">
          <p style="margin:0;color:#1e293b;line-height:1.7;white-space:pre-wrap">${message}</p>
        </div>
        <p style="margin-top:16px;color:#94a3b8;font-size:12px">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
      </div>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: adminTo,
        reply_to: email || undefined,
        subject: `[KingVision] ${subject} — ${name}`,
        html,
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('[contact] Resend error:', err);
      return res.status(500).json({ error: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[contact] handler error:', err);
    return res.status(500).json({ error: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
  }
}
