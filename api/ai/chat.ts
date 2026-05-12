import { createClient } from '@supabase/supabase-js';

interface SimpleMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CartAction {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

// Shared tool definitions (provider-agnostic, lowercase types)
const TOOL_DECLARATIONS = [
  {
    name: 'search_products',
    description: 'ค้นหาสินค้าในร้านตามชื่อ หมวดหมู่ หรือแบรนด์ ควรใช้เมื่อลูกค้าถามหาหรือสนใจสินค้า',
    parameters: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'คำค้นหา เช่น เครื่องพิมพ์ HP หมึก' },
        category: { type: 'string', description: 'หมวดหมู่สินค้า' },
        minPrice: { type: 'number', description: 'ราคาต่ำสุด (บาท)' },
        maxPrice: { type: 'number', description: 'ราคาสูงสุด (บาท)' }
      }
    }
  },
  {
    name: 'get_product_details',
    description: 'ดูรายละเอียดครบถ้วนของสินค้าตาม ID สินค้า',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้า' } },
      required: ['productId']
    }
  },
  {
    name: 'check_stock',
    description: 'เช็คจำนวนสต็อกสินค้าว่ายังมีขายอยู่ไหม',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้า' } },
      required: ['productId']
    }
  },
  {
    name: 'get_order_info',
    description: 'ดูข้อมูลออเดอร์และสถานะการจัดส่งของลูกค้า (ต้องล็อคอินก่อน)',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'รหัสออเดอร์ (ถ้าต้องการดูออเดอร์นั้นโดยเฉพาะ)' },
        limit:   { type: 'number', description: 'จำนวนออเดอร์ล่าสุดที่ต้องการดู (default 5)' }
      }
    }
  },
  {
    name: 'get_store_info',
    description: 'ดูข้อมูลร้าน เช่น ที่อยู่ เบอร์โทรศัพท์ LINE',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_categories_and_brands',
    description: 'ดูรายการหมวดหมู่สินค้าและแบรนด์ทั้งหมดที่มีในร้าน',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'add_to_cart',
    description: 'เพิ่มสินค้าลงตะกร้าให้ลูกค้า ใช้เมื่อลูกค้าตกลงหรือต้องการสั่งซื้อสินค้า',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'รหัสสินค้า' },
        quantity:  { type: 'number', description: 'จำนวนที่ต้องการ (default 1)' }
      },
      required: ['productId']
    }
  }
];

// Convert lowercase schema types to UPPERCASE for Gemini REST API.
// Also skips empty properties (Gemini rejects them).
function toGeminiSchema(schema: any): any {
  if (!schema) return null;
  const typeMap: Record<string, string> = {
    object: 'OBJECT', string: 'STRING', number: 'NUMBER',
    boolean: 'BOOLEAN', array: 'ARRAY', integer: 'INTEGER'
  };
  const out: any = {};
  if (schema.type) out.type = typeMap[schema.type.toLowerCase()] ?? schema.type.toUpperCase();
  if (schema.description) out.description = schema.description;
  const props = schema.properties;
  if (props && Object.keys(props).length > 0) {
    out.properties = Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, toGeminiSchema(v)])
    );
  }
  if (schema.required?.length) out.required = schema.required;
  return out;
}

// Remap deprecated/unavailable Gemini model names to a current equivalent.
// gemini-2.0-flash was deprecated for new API users; use gemini-1.5-flash as fallback.
const GEMINI_DEPRECATED: Record<string, string> = {
  'gemini-2.0-flash':        'gemini-1.5-flash',
  'gemini-2.0-flash-exp':    'gemini-1.5-flash',
  'gemini-2.0-flash-001':    'gemini-1.5-flash',
  'gemini-pro':              'gemini-1.5-pro',
};
function remapGeminiModel(model: string): string {
  return GEMINI_DEPRECATED[model] ?? model;
}

// Parse a tool result string into a JSON object safe for Gemini's functionResponse.
// Gemini requires the response field to be a real JSON object, never a raw string.
function toGeminiResponse(resultStr: string): Record<string, any> {
  try {
    const parsed = JSON.parse(resultStr);
    if (Array.isArray(parsed)) return { items: parsed };
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return { result: parsed };
  } catch {
    return { result: resultStr };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase server credentials (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { messages, userId } = req.body as { messages: SimpleMessage[]; userId?: string };
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Load agent settings from DB
    const { data: settings } = await db
      .from('store_settings')
      .select('ai_provider, ai_model, ai_enabled, ai_persona_name, ai_system_prompt, ai_speaking_style, ai_temperature')
      .single();

    if (settings?.ai_enabled === false) {
      return res.json({ text: 'ขออภัยครับ ระบบแชตบอทปิดอยู่ชั่วคราว กรุณาติดต่อเจ้าหน้าที่ผ่าน LINE ครับ', cartActions: [] });
    }

    const provider    = ((settings?.ai_provider as string) || 'gemini').toLowerCase() as 'gemini' | 'openai' | 'anthropic';
    // Remap deprecated / unavailable Gemini model names automatically
    const rawModel    = (settings?.ai_model as string) || 'gemini-1.5-flash';
    const model       = provider === 'gemini' ? remapGeminiModel(rawModel) : rawModel;
    const personaName = (settings?.ai_persona_name as string) || 'น้องคิง';
    const temperature = typeof settings?.ai_temperature === 'number' ? settings.ai_temperature : 0.7;

    // Load customer memory for logged-in users
    let customerContext = '';
    if (userId) {
      const { data: insights } = await db
        .from('customer_insights')
        .select('preferred_categories, preferred_brands, budget_range, notes')
        .eq('user_id', userId)
        .maybeSingle();
      if (insights) {
        const parts: string[] = [];
        if ((insights.preferred_categories as string[])?.length)
          parts.push(`หมวดหมู่ที่สนใจ: ${(insights.preferred_categories as string[]).join(', ')}`);
        if ((insights.preferred_brands as string[])?.length)
          parts.push(`แบรนด์ที่ชอบ: ${(insights.preferred_brands as string[]).join(', ')}`);
        const br = insights.budget_range as any;
        if (br?.min) parts.push(`งบประมาณ: ${br.min}-${br.max || '?'} บาท`);
        if (insights.notes) parts.push(`บันทึก: ${insights.notes}`);
        if (parts.length)
          customerContext = `\n### ความทรงจำเกี่ยวกับลูกค้าคนนี้:\n${parts.join('\n')}`;
      }
    }

    // Load knowledge base
    const { data: kb } = await db
      .from('ai_knowledge_base')
      .select('question, answer')
      .eq('is_active', true)
      .order('sort_order')
      .limit(20);
    const knowledgeContext = kb?.length
      ? '\n### คลังความรู้ร้าน (ตอบตามนี้เป็นอันดับแรก):\n' +
        (kb as { question: string; answer: string }[]).map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n---\n')
      : '';

    // Compose system prompt
    const styleMap: Record<string, string> = {
      professional: 'พูดสุภาพ เป็นทางการ ใช้คำว่า "ครับ" ลงท้าย มืออาชีพ',
      casual:       'พูดเป็นกันเอง สนุกสนาน ไม่ทางการ ใช้ภาษาเข้าใจง่าย',
      friendly:     'พูดเป็นมิตร อบอุ่น กระตือรือร้น ลงท้ายด้วย "ครับ"'
    };
    const styleGuide = styleMap[(settings?.ai_speaking_style as string) || 'friendly'] ?? styleMap.friendly;

    const systemPrompt = `คุณคือ "${personaName}" พนักงานขายมืออาชีพของร้าน KingVision Print (คิงวิชั่น พริ้นท์)
คุณเชี่ยวชาญด้านเครื่องพิมพ์และอุปกรณ์สำนักงานมากกว่า 10 ปี มีความรู้ด้านเทคนิคอย่างลึกซึ้ง

### สไตล์การสนทนา:
${styleGuide}
- ตอบเป็นภาษาไทยเสมอ ยกเว้นชื่อรุ่นสินค้า/แบรนด์ที่เป็นอังกฤษ
- ตอบแบบเป็นธรรมชาติ เหมือนพนักงานขายจริงๆ ไม่ใช่ bot
- ห้ามบอกว่าตัวเองเป็น AI หรือ chatbot ถ้าไม่ถูกถามโดยตรง
- ตอบกระชับ ตรงประเด็น ยาวพอดี ไม่ยาวเกินไป
- ใช้ emoji เล็กน้อยพอดี เช่น 🖨️ ✅ 💡 📦
- ถ้าไม่รู้ข้อมูลสินค้า ให้ค้นหาก่อนตอบเสมอ อย่าเดา

### ความสามารถ:
- ค้นหาและแนะนำสินค้าที่เหมาะกับความต้องการลูกค้า
- เช็คสต็อกและราคาแบบ real-time
- ดูประวัติออเดอร์และสถานะการจัดส่ง
- เพิ่มสินค้าลงตะกร้าให้ลูกค้าได้เลย
- ให้คำแนะนำเชิงเทคนิคเกี่ยวกับเครื่องพิมพ์

### กฎสำคัญเรื่องลิงค์สินค้า:
- เมื่อแนะนำสินค้า ให้ลิงค์ไปยังหน้าสินค้าในเว็บไซต์ของร้านเสมอ โดยใช้ค่า product_url ที่ได้จาก tool
- รูปแบบที่ถูกต้อง: [ชื่อสินค้า](product_url) เช่น [HP CF350A](/product/abc-123)
- ห้ามใส่ลิงค์ Shopee, Lazada, หรือเว็บไซต์ภายนอกใดๆ ทั้งสิ้น
- ถ้าไม่มี product_url ให้บอกชื่อสินค้าโดยไม่ต้องใส่ลิงค์

### เกี่ยวกับร้าน KingVision Print:
- เชี่ยวชาญ Dot Matrix (Epson LQ series) และ Laser Printer ทุกแบรนด์
- แบรนด์หลัก: HP, Epson, Canon, Brother, Samsung
- มีทั้งมือหนึ่งและมือสอง (มือสองผ่านการ QC แล้ว มีประกัน)
- ออกใบกำกับภาษีได้
- จัดส่งทั่วประเทศ Kerry/Flash Express
- LINE OA: @kingvision
${settings?.ai_system_prompt ? `\n### คำสั่งพิเศษจากเจ้าของร้าน:\n${settings.ai_system_prompt}` : ''}${customerContext}${knowledgeContext}`;

    // Collect cart actions to return to client
    const cartActions: CartAction[] = [];

    // Tool executor (server-side, uses service role key)
    const executeTool = async (name: string, args: any): Promise<string> => {
      try {
        switch (name) {
          case 'search_products': {
            let q = db.from('products').select('id, title, price, brand, category, stock, image_url, condition');
            if (args.query) {
              const terms = String(args.query).trim().split(/\s+/).filter(Boolean);
              const orParts = terms.flatMap((t: string) => [
                `title.ilike.%${t}%`, `brand.ilike.%${t}%`, `description.ilike.%${t}%`
              ]).join(',');
              q = q.or(orParts);
            }
            if (args.category) q = q.eq('category', args.category);
            if (args.minPrice)  q = q.gte('price', args.minPrice);
            if (args.maxPrice)  q = q.lte('price', args.maxPrice);
            const { data } = await q.limit(6);
            if (!data || data.length === 0) return 'ไม่พบสินค้าที่ตรงกับคำค้นหาในขณะนี้ครับ';
            const withUrls = data.map((p: any) => ({ ...p, product_url: `/product/${p.id}` }));
            return JSON.stringify(withUrls);
          }
          case 'get_product_details': {
            const { data } = await db.from('products').select('*').eq('id', args.productId).single();
            return data ? JSON.stringify({ ...data, product_url: `/product/${data.id}` }) : 'ไม่พบสินค้านี้ในระบบครับ';
          }
          case 'check_stock': {
            const { data } = await db.from('products').select('id, title, stock').eq('id', args.productId).single();
            return data ? JSON.stringify(data) : 'ไม่พบสินค้านี้ครับ';
          }
          case 'get_store_info': {
            const { data } = await db
              .from('store_settings')
              .select('store_name, contact_email, address, line_oa_id, line_oa_link')
              .single();
            return data ? JSON.stringify(data) : '{}';
          }
          case 'get_categories_and_brands': {
            const [{ data: cats }, { data: brands }] = await Promise.all([
              db.from('products').select('category'),
              db.from('products').select('brand')
            ]);
            return JSON.stringify({
              categories: [...new Set((cats ?? []).map((c: any) => c.category).filter(Boolean))],
              brands:     [...new Set((brands ?? []).map((b: any) => b.brand).filter(Boolean))]
            });
          }
          case 'get_order_info': {
            if (!userId) return 'กรุณาเข้าสู่ระบบก่อนเช็คออเดอร์ครับ';
            let q = db
              .from('orders')
              .select('id, status, total, created_at, shipping_method, tracking_number')
              .eq('user_id', userId);
            if (args.orderId) q = q.eq('id', args.orderId);
            const { data } = await q.order('created_at', { ascending: false }).limit(args.limit || 5);
            return data?.length ? JSON.stringify(data) : 'ยังไม่มีออเดอร์ในระบบครับ';
          }
          case 'add_to_cart': {
            const { data: prod } = await db
              .from('products')
              .select('id, title, price, image_url')
              .eq('id', args.productId)
              .single();
            if (!prod) return 'ไม่พบสินค้านี้ ไม่สามารถเพิ่มลงตะกร้าได้ครับ';
            const qty = Math.max(1, Number(args.quantity) || 1);
            cartActions.push({
              productId:   prod.id,
              productName: prod.title,
              price:       prod.price,
              imageUrl:    prod.image_url,
              quantity:    qty
            });
            return `เพิ่ม "${prod.title}" จำนวน ${qty} ชิ้น ลงตะกร้าเรียบร้อยแล้วครับ ✅`;
          }
          default:
            return `ไม่รู้จัก tool: ${name}`;
        }
      } catch (err: any) {
        console.error(`Tool "${name}" error:`, err.message);
        return `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`;
      }
    };

    let responseText = '';

    if (provider === 'openai') {
      responseText = await runOpenAI(model, systemPrompt, messages, temperature, executeTool);
    } else if (provider === 'anthropic') {
      responseText = await runAnthropic(model, systemPrompt, messages, temperature, executeTool);
    } else {
      responseText = await runGemini(model, systemPrompt, messages, temperature, executeTool);
    }

    // Update customer insights in background (don't block response)
    if (userId) {
      updateCustomerInsights(db, userId, messages).catch(console.error);
    }

    return res.json({ text: responseText, cartActions });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: error.message || 'AI request failed' });
  }
}

// ─── Gemini (Google Generative Language REST) ────────────────────────────────
async function runGemini(
  model: string,
  systemPrompt: string,
  messages: SimpleMessage[],
  temperature: number,
  executeTool: (name: string, args: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY — add it to Vercel environment variables');

  let contents: any[] = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // Build Gemini function declarations.
  // IMPORTANT: omit `parameters` entirely when there are no properties —
  // Gemini rejects schemas with empty properties objects.
  const geminiTools = [{
    functionDeclarations: TOOL_DECLARATIONS.map(t => {
      const schema = toGeminiSchema(t.parameters);
      const decl: any = { name: t.name, description: t.description };
      if (schema?.properties) decl.parameters = schema;
      return decl;
    })
  }];

  for (let i = 0; i < 5; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools: geminiTools,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature, maxOutputTokens: 800 }
        })
      }
    );

    const j: any = await r.json();
    if (!r.ok) {
      const msg = j?.error?.message ?? `Gemini HTTP ${r.status}`;
      throw new Error(`Gemini error: ${msg}`);
    }

    // Guard against blocked / empty responses
    const candidate = j?.candidates?.[0];
    if (!candidate?.content) {
      const blockReason = j?.promptFeedback?.blockReason;
      if (blockReason) return `ขออภัยครับ เนื้อหาถูกบล็อกโดยระบบความปลอดภัย (${blockReason})`;
      return 'ขออภัยครับ ไม่ได้รับการตอบกลับจาก Gemini กรุณาลองใหม่ครับ';
    }

    const parts: any[] = candidate.content.parts ?? [];
    const funcCalls = parts.filter((p: any) => p.functionCall);

    if (funcCalls.length === 0) {
      return parts.find((p: any) => p.text)?.text ?? '';
    }

    // Append model turn (contains functionCall parts)
    contents.push({ role: 'model', parts });

    // Execute each tool and build functionResponse parts.
    // CRITICAL: Gemini requires `response` to be a real JSON object, never a plain string.
    const toolResults: any[] = [];
    for (const p of funcCalls) {
      const resultStr = await executeTool(p.functionCall.name, p.functionCall.args ?? {});
      toolResults.push({
        functionResponse: {
          name:     p.functionCall.name,
          response: toGeminiResponse(resultStr)  // ← parsed object, not raw string
        }
      });
    }

    // Append user turn with tool results
    contents.push({ role: 'user', parts: toolResults });
  }

  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งนะครับ';
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────
async function runOpenAI(
  model: string,
  systemPrompt: string,
  messages: SimpleMessage[],
  temperature: number,
  executeTool: (name: string, args: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY — add it to Vercel environment variables');

  let oaiMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  ];

  const tools = TOOL_DECLARATIONS.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }));

  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: oaiMessages, tools, temperature, max_tokens: 700 })
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`OpenAI error: ${j?.error?.message ?? r.status}`);

    const msg = j?.choices?.[0]?.message;
    if (!msg?.tool_calls?.length) return msg?.content ?? '';

    oaiMessages.push(msg);
    for (const tc of msg.tool_calls) {
      let args: any = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
      const result = await executeTool(tc.function.name, args);
      oaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
    }
  }

  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งนะครับ';
}

// ─── Anthropic (Claude) ──────────────────────────────────────────────────────
async function runAnthropic(
  model: string,
  systemPrompt: string,
  messages: SimpleMessage[],
  temperature: number,
  executeTool: (name: string, args: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY — add it to Vercel environment variables');

  let anthMessages: any[] = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const tools = TOOL_DECLARATIONS.map(t => ({
    name:         t.name,
    description:  t.description,
    input_schema: t.parameters
  }));

  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model, system: systemPrompt,
        messages: anthMessages,
        tools, max_tokens: 700, temperature
      })
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`Anthropic error: ${j?.error?.message ?? r.status}`);

    const content: any[] = j?.content ?? [];
    const toolUses = content.filter(c => c.type === 'tool_use');

    if (!toolUses.length) return content.find(c => c.type === 'text')?.text ?? '';

    anthMessages.push({ role: 'assistant', content });

    const toolResults = await Promise.all(
      toolUses.map(async (tu: any) => ({
        type:        'tool_result',
        tool_use_id: tu.id,
        content:     await executeTool(tu.name, tu.input ?? {})
      }))
    );
    anthMessages.push({ role: 'user', content: toolResults });
  }

  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งนะครับ';
}

// ─── Customer insights learning ──────────────────────────────────────────────
async function updateCustomerInsights(db: any, userId: string, messages: SimpleMessage[]) {
  const userText = messages
    .filter(m => m.role === 'user')
    .slice(-5)
    .map(m => m.content.toLowerCase())
    .join(' ');

  const brandMap: Record<string, string> = {
    hp: 'HP', epson: 'Epson', canon: 'Canon', brother: 'Brother', samsung: 'Samsung'
  };
  const foundBrands = Object.entries(brandMap)
    .filter(([key]) => userText.includes(key))
    .map(([, val]) => val);

  const categoryMap: Record<string, string> = {
    'เครื่องพิมพ์': 'เครื่องปริ้นเตอร์',
    'ปริ้น':        'เครื่องปริ้นเตอร์',
    'หมึก':         'หมึกพิมพ์',
    'toner':        'หมึกพิมพ์',
    'อะไหล่':       'อะไหล่',
    'อุปกรณ์':      'อุปกรณ์เสริม'
  };
  const foundCategories = Object.entries(categoryMap)
    .filter(([key]) => userText.includes(key))
    .map(([, val]) => val);

  if (!foundBrands.length && !foundCategories.length) return;

  const { data: existing } = await db
    .from('customer_insights')
    .select('preferred_brands, preferred_categories')
    .eq('user_id', userId)
    .maybeSingle();

  const merged: any = {
    user_id:    userId,
    updated_at: new Date().toISOString()
  };

  if (foundBrands.length) {
    const current: string[] = existing?.preferred_brands ?? [];
    merged.preferred_brands = [...new Set([...current, ...foundBrands])].slice(0, 8);
  }
  if (foundCategories.length) {
    const current: string[] = existing?.preferred_categories ?? [];
    merged.preferred_categories = [...new Set([...current, ...foundCategories])].slice(0, 6);
  }

  await db.from('customer_insights').upsert(merged, { onConflict: 'user_id' });
}
