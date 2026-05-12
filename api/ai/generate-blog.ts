import { createClient } from '@supabase/supabase-js';

type Provider = 'gemini' | 'openai' | 'anthropic';

function extractJsonObject(raw: string) {
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function parseGenerated(raw: string) {
  const fallback = {
    title: 'บทความแนะนำสินค้า',
    excerpt: 'สรุปเนื้อหาสำหรับบทความนี้',
    content: raw || 'ไม่สามารถสร้างเนื้อหาได้ในขณะนี้',
    category: 'ความรู้'
  };

  try {
    const parsed = JSON.parse(extractJsonObject(raw));
    return {
      title: parsed?.title || fallback.title,
      excerpt: parsed?.excerpt || fallback.excerpt,
      content: parsed?.content || fallback.content,
      category: parsed?.category || fallback.category
    };
  } catch {
    return fallback;
  }
}

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
    const { topic, category } = req.body as { topic?: string; category?: string };

    const { data: setting } = await adminDb
      .from('store_settings')
      .select('ai_provider, ai_model, ai_enabled')
      .single();

    if (setting?.ai_enabled === false) {
      return res.status(400).json({ error: 'AI is disabled in store settings' });
    }

    const provider = ((setting?.ai_provider || 'gemini') as Provider).toLowerCase() as Provider;
    const model = setting?.ai_model || 'gemini-1.5-flash';
    const prompt = `เขียนบทความภาษาไทยสำหรับร้านขายเครื่องพิมพ์และอะไหล่
หัวข้อ: ${topic || 'เทคนิคการดูแลเครื่องพิมพ์'}
หมวดหมู่: ${category || 'ความรู้'}

ตอบกลับเป็น JSON เท่านั้น รูปแบบ:
{
  "title": "หัวข้อบทความ",
  "excerpt": "สรุปสั้น 1-2 ประโยค",
  "content": "เนื้อหาฉบับเต็มแบบอ่านง่าย มีหัวข้อย่อยและ bullet",
  "category": "ชื่อหมวดหมู่"
}`;

    let rawText = '';
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
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'You are a Thai ecommerce content writer.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'OpenAI request failed');
      rawText = j?.choices?.[0]?.message?.content || '';
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
          max_tokens: 1200,
          system: 'You are a Thai ecommerce content writer.',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'Anthropic request failed');
      rawText = j?.content?.[0]?.text || '';
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        }
      );
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || 'Gemini request failed');
      rawText = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    return res.json({ post: parseGenerated(rawText), provider, model });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'AI generate blog failed' });
  }
}

