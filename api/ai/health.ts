import { createClient } from '@supabase/supabase-js';

const GEMINI_DEPRECATED: Record<string, string> = {
  'gemini-2.0-flash-exp':  'gemini-2.0-flash',
  'gemini-2.0-flash-001':  'gemini-2.0-flash',
  'gemini-1.5-flash':      'gemini-2.0-flash',
  'gemini-1.5-flash-8b':   'gemini-2.0-flash-lite',
  'gemini-1.5-pro':        'gemini-2.5-flash',
  'gemini-pro':            'gemini-2.0-flash',
};
function remapGeminiModel(m: string) { return GEMINI_DEPRECATED[m] ?? m; }

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return res.json({ connected: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY', provider: 'unknown', model: 'unknown' });
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: settings } = await db
      .from('store_settings')
      .select('ai_provider, ai_model, ai_enabled, ai_persona_name, ai_gender')
      .single();

    // Allow the caller to override provider/model (e.g. the admin form before saving)
    const bodyProvider = req.body?.provider as string | undefined;
    const bodyModel    = req.body?.model    as string | undefined;

    const provider    = (bodyProvider || (settings?.ai_provider as string) || 'gemini').toLowerCase();
    const rawModel    = bodyModel    || (settings?.ai_model as string) || 'gemini-2.0-flash';
    const model       = provider === 'gemini' ? remapGeminiModel(rawModel) : rawModel;
    const personaName = (settings?.ai_persona_name as string) || 'น้องคิง';
    const gender      = (settings?.ai_gender as string) || 'male';
    const aiEnabled   = settings?.ai_enabled ?? true;

    // GET → return config only (no AI call, fast)
    if (req.method === 'GET') {
      return res.json({ provider, model, personaName, gender, aiEnabled });
    }

    // POST → test actual AI connection with a minimal call
    if (!aiEnabled) {
      return res.json({ connected: false, provider, model, personaName, gender, error: 'AI is disabled in settings' });
    }

    const startTime = Date.now();
    let connected = false;
    let errorMsg  = '';

    try {
      if (provider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 })
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
        connected = true;

      } else if (provider === 'anthropic') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] })
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
        connected = true;

      } else {
        // Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 5 }
            })
          }
        );
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
        connected = true;
      }
    } catch (e: any) {
      errorMsg = e.message;
    }

    const latency = Date.now() - startTime;
    return res.json({
      connected, provider, model, personaName, gender,
      latency: connected ? latency : undefined,
      error:   errorMsg  || undefined
    });

  } catch (e: any) {
    return res.status(500).json({ connected: false, error: e.message });
  }
}
