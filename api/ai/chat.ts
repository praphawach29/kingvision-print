import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT =
  'You are Nong King, a Thai sales assistant for KingVision Print. Reply in Thai politely and concise.';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase server credentials' });
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey);
    const { messages } = req.body as { messages: any[] };
    const latestText =
      messages?.[messages.length - 1]?.parts?.find((p: any) => typeof p.text === 'string')?.text || '';

    const { data: setting } = await adminDb
      .from('store_settings')
      .select('ai_provider, ai_model, ai_enabled')
      .single();

    if (setting?.ai_enabled === false) {
      return res.json({
        candidates: [{ content: { parts: [{ text: 'ระบบแชตบอทยังไม่เปิดใช้งานในหน้าตั้งค่าครับ' }] } }],
        functionCalls: []
      });
    }

    const provider = (setting?.ai_provider || 'gemini').toLowerCase();
    const model = setting?.ai_model || 'gemini-1.5-flash';

    let text = '';
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: latestText }
          ]
        })
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'OpenAI request failed');
      text = j?.choices?.[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: latestText }]
        })
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'Anthropic request failed');
      text = j?.content?.[0]?.text || '';
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: latestText }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
          })
        }
      );
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'Gemini request failed');
      text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    return res.json({
      candidates: [{ content: { parts: [{ text }] } }],
      functionCalls: []
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'AI request failed' });
  }
}
