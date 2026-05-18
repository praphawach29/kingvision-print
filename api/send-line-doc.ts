import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });

  const { to, text } = req.body as { to?: string; text?: string };
  if (!to || !text) return res.status(400).json({ error: 'Missing required fields: to, text' });

  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }],
      }),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[send-line-doc] LINE push failed:', r.status, body);
      return res.status(502).json({ error: `LINE API error ${r.status}`, detail: body });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-line-doc] fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
