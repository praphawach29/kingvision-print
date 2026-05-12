export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, channelAccessToken, messages } = req.body as {
    to: string;
    channelAccessToken: string;
    messages: any[];
  };

  if (!to || !channelAccessToken || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: to, channelAccessToken, messages' });
  }

  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    const body: any = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error('LINE API error:', body);
      return res.status(r.status).json({ error: body?.message || `LINE API returned ${r.status}` });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('line-notify handler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send LINE message' });
  }
}
