/**
 * LINE OA Unified Agent — feature-parity with /api/ai/chat (web chatbot)
 *
 * Customer mode  : Full AI sales agent (same tools, persona, knowledge base,
 *                  upsell/cross-sell, multi-provider) + LINE Flex Message cards
 * Admin mode     : Product CRUD commands + image → Gemini Vision product creation
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;
export const config = { api: { bodyParser: false } };

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE_URL       = (process.env.VITE_SITE_URL || 'https://kingvision-print.vercel.app').replace(/\/$/, '');
const ADMIN_IDS      = (process.env.LINE_ADMIN_USER_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── Tool declarations (identical to web chatbot) ──────────────────────────────
// In LINE context, add_to_cart sends a purchase link instead of mutating browser cart.
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
        maxPrice: { type: 'number', description: 'ราคาสูงสุด (บาท)' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'ดูรายละเอียดครบถ้วนของสินค้าตาม ID สินค้า',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้า' } },
      required: ['productId'],
    },
  },
  {
    name: 'check_stock',
    description: 'เช็คจำนวนสต็อกสินค้าว่ายังมีขายอยู่ไหม',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้า' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_order_info',
    description: 'ดูข้อมูลออเดอร์และสถานะการจัดส่ง ใช้เบอร์โทรหรือรหัสออเดอร์',
    parameters: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'เบอร์โทรที่ใช้สั่งซื้อ' },
        orderId: { type: 'string', description: 'รหัสออเดอร์บางส่วน' },
        limit:   { type: 'number', description: 'จำนวนออเดอร์ล่าสุดที่ต้องการ' },
      },
    },
  },
  {
    name: 'get_store_info',
    description: 'ดูข้อมูลร้าน เช่น ที่อยู่ เบอร์โทรศัพท์ LINE',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_categories_and_brands',
    description: 'ดูรายการหมวดหมู่สินค้าและแบรนด์ทั้งหมดที่มีในร้าน',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_cart',
    description: 'ส่งลิงก์สั่งซื้อสินค้าให้ลูกค้า ใช้เมื่อลูกค้าต้องการสั่งซื้อหรือตกลงซื้อสินค้า',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'รหัสสินค้า' },
        quantity:  { type: 'number', description: 'จำนวนที่ต้องการ' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'get_upsell_products',
    description: 'หาสินค้ารุ่นที่ดีกว่าในหมวดเดียวกัน (upsell) — ใช้เมื่อลูกค้าสนใจสินค้าแล้วอยากเสนอทางเลือกที่คุ้มกว่า',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้าที่ลูกค้าสนใจ' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_crosssell_products',
    description: 'หาสินค้าที่ใช้ร่วมกันได้ (cross-sell) — ใช้หลังลูกค้าสนใจสินค้า เช่น เครื่องปริ้น → แนะนำหมึก',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'รหัสสินค้าหลักที่ลูกค้าสนใจ' } },
      required: ['productId'],
    },
  },
  {
    name: 'save_lead',
    description: 'บันทึกข้อมูลลูกค้าที่ต้องการให้แอดมินติดต่อกลับ หรืออยากได้ใบเสนอราคา',
    parameters: {
      type: 'object',
      properties: {
        phone:    { type: 'string', description: 'เบอร์โทรลูกค้า' },
        interest: { type: 'string', description: 'สินค้าหรือบริการที่สนใจ' },
        message:  { type: 'string', description: 'รายละเอียดเพิ่มเติม' },
      },
    },
  },
];

// ── Schema converter for Gemini (same logic as web chatbot) ───────────────────
function toGeminiSchema(schema: any): any {
  if (!schema) return null;
  const typeMap: Record<string, string> = {
    object: 'OBJECT', string: 'STRING', number: 'NUMBER',
    boolean: 'BOOLEAN', array: 'ARRAY', integer: 'INTEGER',
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

function toGeminiResponse(resultStr: string): Record<string, any> {
  try {
    const parsed = JSON.parse(resultStr);
    if (Array.isArray(parsed)) return { items: parsed };
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return { result: parsed };
  } catch { return { result: resultStr }; }
}

const GEMINI_REMAP: Record<string, string> = {
  'gemini-1.5-flash':     'gemini-2.5-flash',
  'gemini-1.5-flash-8b':  'gemini-2.0-flash-lite',
  'gemini-1.5-pro':       'gemini-2.5-pro',
  'gemini-2.0-flash':     'gemini-2.5-flash',
  'gemini-2.0-flash-exp': 'gemini-2.5-flash',
  'gemini-pro':           'gemini-2.5-flash',
};
const remapModel = (m: string) => GEMINI_REMAP[m] ?? m;

// ── LINE helpers ──────────────────────────────────────────────────────────────
async function rawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function verifySig(body: Buffer, sig: string) {
  if (!CHANNEL_SECRET) return true;
  return crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64') === sig;
}
async function lineReply(replyToken: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_TOKEN}` },
    body: JSON.stringify({ replyToken, messages }),
  });
}
async function linePush(to: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_TOKEN}` },
    body: JSON.stringify({ to, messages }),
  });
}
async function getLineProfile(userId: string) {
  try {
    const r = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${CHANNEL_TOKEN}` },
    });
    return r.ok ? (r.json() as Promise<{ displayName: string }>) : null;
  } catch { return null; }
}
async function fetchLineImage(messageId: string) {
  const r = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${CHANNEL_TOKEN}` },
  });
  return { buffer: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'image/jpeg' };
}

// ── Flex Message product cards ────────────────────────────────────────────────
function buildProductFlex(products: any[], altText = 'สินค้าแนะนำ'): any {
  const bubbles = products.slice(0, 10).map((p) => ({
    type: 'bubble',
    size: 'micro',
    ...(p.image_url ? {
      hero: {
        type: 'image', url: p.image_url, size: 'full',
        aspectRatio: '1:1', aspectMode: 'cover',
        action: { type: 'uri', label: 'ดู', uri: `${SITE_URL}/product/${p.id}` },
      },
    } : {}),
    body: {
      type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: 'md',
      contents: [
        ...(p.brand ? [{ type: 'text', text: p.brand, size: 'xxs', color: '#f97316', weight: 'bold' }] : []),
        { type: 'text', text: p.title, size: 'xs', weight: 'bold', wrap: true, maxLines: 2, color: '#0f2a5e' },
        { type: 'text', text: `฿${Number(p.price).toLocaleString()}`, size: 'sm', weight: 'bold', color: '#f97316', margin: 'sm' },
        { type: 'text', text: p.stock > 0 ? `✅ มี ${p.stock} ชิ้น` : '❌ สินค้าหมด', size: 'xxs', color: p.stock > 0 ? '#16a34a' : '#dc2626' },
        ...(p.condition === 'used' ? [{ type: 'text', text: '(มือสอง)', size: 'xxs', color: '#9ca3af' }] : []),
      ],
    },
    footer: {
      type: 'box', layout: 'vertical', paddingAll: 'sm',
      contents: [{
        type: 'button', style: 'primary', color: '#f97316', height: 'sm',
        action: { type: 'uri', label: p.stock > 0 ? 'สั่งซื้อเลย' : 'ดูรายละเอียด', uri: `${SITE_URL}/product/${p.id}` },
      }],
    },
  }));

  return {
    type: 'flex',
    altText: `${altText} ${products.length} รายการ`,
    contents: { type: 'carousel', contents: bubbles },
  };
}

// ── Session management ────────────────────────────────────────────────────────
const MAX_HISTORY = 12;

async function loadHistory(userId: string, db: any) {
  try {
    const { data } = await db.from('line_sessions').select('messages').eq('user_id', userId).single();
    return (data?.messages as any[]) || [];
  } catch { return []; }
}

async function saveHistory(userId: string, displayName: string, messages: any[], db: any) {
  try {
    await db.from('line_sessions').upsert({
      user_id: userId, display_name: displayName,
      messages: messages.slice(-MAX_HISTORY),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch {}
}

// ── Build system prompt (mirrors web chatbot) ─────────────────────────────────
async function buildSystemPrompt(settings: any, db: any): Promise<string> {
  const personaName = (settings?.ai_persona_name as string) || 'น้องคิง';
  const gender      = (settings?.ai_gender as string) || 'male';
  const isFemale    = gender === 'female';
  const ending      = isFemale ? 'ค่ะ หรือ คะ' : 'ครับ';

  const genderGuide = isFemale
    ? 'คุณเป็นผู้หญิง ใช้คำสรรพนาม "หนู" หรือ "ดิฉัน" ลงท้ายด้วย "ค่ะ" หรือ "คะ" เท่านั้น ห้ามใช้ "ครับ"'
    : 'คุณเป็นผู้ชาย ใช้คำสรรพนาม "ผม" ลงท้ายด้วย "ครับ" เท่านั้น ห้ามใช้ "ค่ะ"';

  const styleMap: Record<string, string> = {
    professional: `พูดสุภาพ เป็นทางการ มืออาชีพ ลงท้ายด้วย "${ending}"`,
    casual:       `พูดเป็นกันเอง สนุกสนาน ไม่ทางการ ลงท้ายด้วย "${ending}"`,
    friendly:     `พูดเป็นมิตร อบอุ่น กระตือรือร้น ลงท้ายด้วย "${ending}"`,
  };
  const styleGuide = styleMap[(settings?.ai_speaking_style as string) || 'friendly'] ?? styleMap.friendly;

  // Knowledge base
  const { data: kb } = await db.from('ai_knowledge_base')
    .select('question, answer').eq('is_active', true).order('sort_order').limit(25);
  const knowledgeContext = kb?.length
    ? '\n### คลังความรู้ร้าน (ตอบตามนี้ก่อน):\n' +
      (kb as any[]).map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n---\n')
    : '';

  return `คุณคือ "${personaName}" พนักงานขายมืออาชีพของร้าน KingVision Print (คิงวิชั่น พริ้นท์)
คุณเชี่ยวชาญด้านเครื่องพิมพ์และอุปกรณ์สำนักงานมากกว่า 10 ปี มีความรู้ด้านเทคนิคอย่างลึกซึ้ง
กำลังคุยกับลูกค้าผ่าน LINE Official Account

### เพศและสรรพนาม:
${genderGuide}

### สไตล์การสนทนา:
${styleGuide}
- ตอบเป็นภาษาไทยเสมอ ยกเว้นชื่อรุ่นสินค้า/แบรนด์ที่เป็นอังกฤษ
- ตอบแบบเป็นธรรมชาติ เหมือนพนักงานขายจริงๆ ไม่ใช่ bot
- ห้ามบอกว่าตัวเองเป็น AI หรือ chatbot ถ้าไม่ถูกถามโดยตรง
- ตอบกระชับ ตรงประเด็น ไม่ยาวเกินไป (LINE มีพื้นที่จำกัด)
- ใช้ emoji เล็กน้อยพอดี เช่น 🖨️ ✅ 💡 📦
- ถ้าไม่รู้ข้อมูลสินค้า ให้ค้นหาก่อนตอบเสมอ อย่าเดา

### ความสามารถ:
- ค้นหาและแนะนำสินค้าที่เหมาะกับความต้องการลูกค้า
- เช็คสต็อกและราคาแบบ real-time
- ดูประวัติออเดอร์และสถานะการจัดส่ง (ใช้เบอร์โทรที่สั่งซื้อ)
- ส่งลิงก์สั่งซื้อสินค้าให้ลูกค้า
- ให้คำแนะนำเชิงเทคนิคเกี่ยวกับเครื่องพิมพ์

### กลยุทธ์การขาย (สำคัญมาก — ทำทุกครั้ง):
**Upsell** — เมื่อลูกค้าสนใจสินค้าใด ให้เรียก get_upsell_products เสมอ
- ถ้ามีรุ่นที่ดีกว่าในราคาใกล้เคียง (ต่างไม่เกิน 30-50%) ให้พูดถึงสั้นๆ 1-2 ประโยค
- เน้นว่าดีกว่าตรงไหน เช่น "WiFi ในตัว", "ความเร็วสูงกว่า", "ประหยัดหมึกกว่า"

**Cross-sell** — เมื่อลูกค้าสนใจหรือสั่งซื้อแล้ว ให้เรียก get_crosssell_products ทันที
- เครื่องปริ้นเตอร์ → แนะนำหมึกพิมพ์ที่ใช้ร่วมกันได้ (แบรนด์เดียวกันก่อน)
- พูดแบบเป็นธรรมชาติ เช่น "อ้อ แล้วก็อย่าลืมหมึกด้วยนะครับ เผื่อหมดเร็ว 🖨️"

### กฎสำคัญ:
- เมื่อแนะนำสินค้า ให้ใช้ product_url จาก tool เสมอ รูปแบบ: [ชื่อสินค้า](product_url)
- ห้ามใส่ลิงก์ Shopee, Lazada หรือเว็บภายนอก
- ถ้าลูกค้าอยากสั่งซื้อ ให้เรียก add_to_cart เพื่อส่งลิงก์สั่งซื้อให้
- ถ้าลูกค้าอยากได้ใบเสนอราคาหรือให้โทรกลับ ให้เรียก save_lead

### เกี่ยวกับร้าน KingVision Print:
- เชี่ยวชาญ Dot Matrix (Epson LQ series) และ Laser Printer ทุกแบรนด์
- แบรนด์หลัก: HP, Epson, Canon, Brother, Samsung
- มีทั้งมือหนึ่งและมือสอง (มือสองผ่านการ QC แล้ว มีประกัน)
- ออกใบกำกับภาษีได้ จัดส่งทั่วประเทศ Kerry/Flash Express
${settings?.ai_system_prompt ? `\n### คำสั่งพิเศษจากเจ้าของร้าน:\n${settings.ai_system_prompt}` : ''}${knowledgeContext}`;
}

// ── Tool executor ─────────────────────────────────────────────────────────────
function buildExecuteTool(db: any, userId: string, displayName: string, pendingProducts: any[]) {
  return async (name: string, args: any): Promise<string> => {
    try {
      switch (name) {
        case 'search_products': {
          let q = db.from('products')
            .select('id,title,price,brand,category,stock,image_url,condition')
            .eq('is_active', true);
          if (args.query) {
            const terms = String(args.query).trim().split(/\s+/).filter(Boolean);
            const orParts = terms.flatMap((t: string) => [
              `title.ilike.%${t}%`, `brand.ilike.%${t}%`, `description.ilike.%${t}%`,
            ]).join(',');
            q = q.or(orParts);
          }
          if (args.category) q = q.eq('category', args.category);
          if (args.minPrice) q = q.gte('price', args.minPrice);
          if (args.maxPrice) q = q.lte('price', args.maxPrice);
          const { data } = await q.order('stock', { ascending: false }).limit(6);
          if (!data?.length) return 'ไม่พบสินค้าที่ตรงกับคำค้นหาในขณะนี้ครับ';
          const withUrls = data.map((p: any) => ({ ...p, product_url: `${SITE_URL}/product/${p.id}` }));
          pendingProducts.push(...withUrls);
          return JSON.stringify(withUrls);
        }

        case 'get_product_details': {
          const { data } = await db.from('products').select('*').eq('id', args.productId).single();
          if (!data) return 'ไม่พบสินค้านี้ในระบบครับ';
          return JSON.stringify({ ...data, product_url: `${SITE_URL}/product/${data.id}` });
        }

        case 'check_stock': {
          const { data } = await db.from('products').select('id,title,stock').eq('id', args.productId).single();
          return data ? JSON.stringify(data) : 'ไม่พบสินค้านี้ครับ';
        }

        case 'get_order_info': {
          const term = (args.phone || args.orderId || '').trim();
          if (!term) return 'กรุณาระบุเบอร์โทรหรือรหัสออเดอร์ด้วยครับ';
          let q = db.from('orders')
            .select('id,status,total_amount,created_at,tracking_number,shipping_provider,shipping_data');
          if (/^\d{9,10}$/.test(term)) {
            q = q.contains('shipping_data', { phone: term });
          } else {
            q = q.ilike('id', `%${term}%`);
          }
          const { data } = await q.order('created_at', { ascending: false }).limit(args.limit || 5);
          return data?.length ? JSON.stringify(data) : 'ไม่พบออเดอร์ที่ตรงกับข้อมูลที่ให้มาครับ';
        }

        case 'get_store_info': {
          const { data } = await db.from('store_settings')
            .select('store_name,contact_email,address,line_oa_id,line_oa_link,store_phone')
            .single();
          return data ? JSON.stringify(data) : '{}';
        }

        case 'get_categories_and_brands': {
          const [{ data: cats }, { data: brands }] = await Promise.all([
            db.from('products').select('category').eq('is_active', true),
            db.from('products').select('brand').eq('is_active', true),
          ]);
          return JSON.stringify({
            categories: [...new Set((cats ?? []).map((c: any) => c.category).filter(Boolean))],
            brands:     [...new Set((brands ?? []).map((b: any) => b.brand).filter(Boolean))],
          });
        }

        case 'add_to_cart': {
          const { data: prod } = await db.from('products')
            .select('id,title,price,stock,image_url').eq('id', args.productId).single();
          if (!prod) return 'ไม่พบสินค้านี้ครับ';
          if (prod.stock === 0) return `ขออภัยครับ ${prod.title} หมดสต็อกแล้ว`;
          const qty = Math.max(1, Number(args.quantity) || 1);
          // On LINE, "add to cart" = send purchase link (can't mutate browser cart)
          pendingProducts.push({ ...prod, product_url: `${SITE_URL}/product/${prod.id}` });
          return JSON.stringify({
            success: true,
            product: prod.title,
            quantity: qty,
            product_url: `${SITE_URL}/product/${prod.id}`,
            message: `ส่งลิงก์สั่งซื้อ "${prod.title}" จำนวน ${qty} ชิ้น — กดการ์ดด้านล่างเพื่อสั่งซื้อได้เลยครับ`,
          });
        }

        case 'get_upsell_products': {
          const { data: base } = await db.from('products')
            .select('id,title,price,category,brand').eq('id', args.productId).single();
          if (!base) return 'ไม่พบสินค้าต้นทางครับ';
          let { data } = await db.from('products')
            .select('id,title,price,brand,category,stock,image_url,condition')
            .eq('category', base.category).eq('brand', base.brand)
            .neq('id', base.id).gt('price', base.price)
            .lte('price', base.price * 2).gt('stock', 0)
            .order('price', { ascending: true }).limit(3);
          if (!data?.length) {
            const { data: fb } = await db.from('products')
              .select('id,title,price,brand,category,stock,image_url,condition')
              .eq('category', base.category).neq('id', base.id)
              .gt('price', base.price).lte('price', base.price * 1.8).gt('stock', 0)
              .order('price', { ascending: true }).limit(3);
            data = fb;
          }
          if (!data?.length) return 'ไม่พบสินค้ารุ่นที่ดีกว่าในขณะนี้ครับ';
          const withUrls = data.map((p: any) => ({ ...p, product_url: `${SITE_URL}/product/${p.id}` }));
          pendingProducts.push(...withUrls);
          return JSON.stringify(withUrls);
        }

        case 'get_crosssell_products': {
          const { data: base } = await db.from('products')
            .select('id,title,price,category,brand').eq('id', args.productId).single();
          if (!base) return 'ไม่พบสินค้าต้นทางครับ';
          const crossMap: Record<string, string[]> = {
            'เครื่องปริ้นเตอร์': ['หมึกพิมพ์', 'อะไหล่', 'กระดาษพิมพ์'],
            'หมึกพิมพ์':         ['เครื่องปริ้นเตอร์', 'อะไหล่'],
            'อะไหล่':            ['หมึกพิมพ์', 'เครื่องปริ้นเตอร์'],
            'อุปกรณ์เสริม':      ['เครื่องปริ้นเตอร์', 'หมึกพิมพ์'],
          };
          const targetCats = crossMap[base.category] ?? [];
          if (!targetCats.length) return 'ไม่มีสินค้าที่เกี่ยวข้องสำหรับหมวดนี้ครับ';
          let { data: sameBrand } = await db.from('products')
            .select('id,title,price,brand,category,stock,image_url,condition')
            .in('category', targetCats).eq('brand', base.brand).gt('stock', 0)
            .order('price', { ascending: true }).limit(4);
          if (!sameBrand?.length) {
            const { data: any } = await db.from('products')
              .select('id,title,price,brand,category,stock,image_url,condition')
              .in('category', targetCats).gt('stock', 0)
              .order('price', { ascending: true }).limit(4);
            sameBrand = any;
          }
          if (!sameBrand?.length) return 'ไม่พบสินค้าที่ใช้ร่วมกันได้ในขณะนี้ครับ';
          const withUrls = sameBrand.map((p: any) => ({ ...p, product_url: `${SITE_URL}/product/${p.id}` }));
          pendingProducts.push(...withUrls);
          return JSON.stringify(withUrls);
        }

        case 'save_lead': {
          await db.from('line_leads').insert([{
            user_id: userId, display_name: displayName,
            phone: args.phone || null, interest: args.interest || null,
            message: args.message || null,
          }]);
          return JSON.stringify({ success: true, message: 'บันทึกข้อมูลแล้ว แอดมินจะติดต่อกลับเร็วๆ นี้ครับ' });
        }

        default:
          return `ไม่รู้จัก tool: ${name}`;
      }
    } catch (err: any) {
      console.error(`[line-agent] tool "${name}" error:`, err.message);
      return `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`;
    }
  };
}

// ── AI runners (Gemini / OpenAI / Anthropic) ─────────────────────────────────
type MsgHistory = { role: 'user' | 'model'; parts: [{ text: string }] }[];

async function runGemini(
  model: string, systemPrompt: string, history: MsgHistory, temperature: number,
  executeTool: (n: string, a: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const geminiTools = [{
    functionDeclarations: TOOL_DECLARATIONS.map(t => {
      const schema = toGeminiSchema(t.parameters);
      const decl: any = { name: t.name, description: t.description };
      if (schema?.properties) decl.parameters = schema;
      return decl;
    }),
  }];

  let contents: any[] = [...history];

  for (let i = 0; i < 6; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${remapModel(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools: geminiTools,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature, maxOutputTokens: 700 },
        }),
      }
    );
    const j: any = await r.json();
    if (!r.ok) throw new Error(`Gemini: ${j?.error?.message ?? r.status}`);

    const candidate = j?.candidates?.[0];
    if (!candidate?.content) return 'ขออภัยครับ ไม่ได้รับการตอบกลับ กรุณาลองใหม่';

    const parts: any[] = candidate.content.parts ?? [];
    const fnCalls = parts.filter((p: any) => p.functionCall);

    if (!fnCalls.length) return parts.find((p: any) => p.text)?.text ?? '';

    contents.push({ role: 'model', parts });

    const toolResults: any[] = [];
    for (const p of fnCalls) {
      const result = await executeTool(p.functionCall.name, p.functionCall.args ?? {});
      toolResults.push({ functionResponse: { name: p.functionCall.name, response: toGeminiResponse(result) } });
    }
    contents.push({ role: 'user', parts: toolResults });
  }
  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่';
}

async function runOpenAI(
  model: string, systemPrompt: string, history: MsgHistory, temperature: number,
  executeTool: (n: string, a: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  let msgs: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text })),
  ];
  const tools = TOOL_DECLARATIONS.map(t => ({
    type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let i = 0; i < 6; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: msgs, tools, temperature, max_tokens: 700 }),
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`OpenAI: ${j?.error?.message ?? r.status}`);

    const msg = j?.choices?.[0]?.message;
    if (!msg?.tool_calls?.length) return msg?.content ?? '';

    msgs.push(msg);
    for (const tc of msg.tool_calls) {
      let args: any = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
      const result = await executeTool(tc.function.name, args);
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: result });
    }
  }
  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่';
}

async function runAnthropic(
  model: string, systemPrompt: string, history: MsgHistory, temperature: number,
  executeTool: (n: string, a: any) => Promise<string>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  let msgs: any[] = history.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text,
  }));
  const tools = TOOL_DECLARATIONS.map(t => ({
    name: t.name, description: t.description, input_schema: t.parameters,
  }));

  for (let i = 0; i < 6; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, system: systemPrompt, messages: msgs, tools, max_tokens: 700, temperature }),
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error(`Anthropic: ${j?.error?.message ?? r.status}`);

    const content: any[] = j?.content ?? [];
    const toolUses = content.filter(c => c.type === 'tool_use');
    if (!toolUses.length) return content.find(c => c.type === 'text')?.text ?? '';

    msgs.push({ role: 'assistant', content });
    const results = await Promise.all(
      toolUses.map(async (tu: any) => ({
        type: 'tool_result', tool_use_id: tu.id,
        content: await executeTool(tu.name, tu.input ?? {}),
      }))
    );
    msgs.push({ role: 'user', content: results });
  }
  return 'ขออภัยครับ ระบบประมวลผลนานเกินไป กรุณาลองใหม่';
}

// ── Admin handler ─────────────────────────────────────────────────────────────
const ADMIN_HELP = `🔧 Admin Mode — KingVision Bot

📸 ส่งรูปสินค้า → AI บันทึกสินค้าอัตโนมัติ

✏️ แก้ราคา [ชื่อ] [ราคา]
📦 แก้สต็อก [ชื่อ] [จำนวน]
🟢 เปิดขาย [ชื่อ]
⏸ ปิดขาย [ชื่อ]
🔍 ดูสินค้า [ชื่อ]
📊 สรุปสต็อก`;

async function handleAdmin(text: string, replyToken: string, db: any) {
  if (/^(admin|ช่วยเหลือ|help)$/i.test(text))
    return lineReply(replyToken, [{ type: 'text', text: ADMIN_HELP }]);

  const pm = text.match(/^แก้ราคา\s+(.+?)\s+(\d+(?:\.\d+)?)\s*$/);
  if (pm) {
    const price = parseFloat(pm[2]);
    const { data: f } = await db.from('products').select('id,title,price').ilike('title', `%${pm[1]}%`).limit(5);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${pm[1]}"` }]);
    if (f.length === 1) {
      await db.from('products').update({ price }).eq('id', f[0].id);
      return lineReply(replyToken, [{ type: 'text', text: `✅ ${f[0].title}\n฿${Number(f[0].price).toLocaleString()} → ฿${price.toLocaleString()}` }]);
    }
    return lineReply(replyToken, [{ type: 'text', text: `พบ ${f.length} รายการ:\n${f.map((p: any, i: number) => `${i+1}. ${p.title}`).join('\n')}` }]);
  }

  const sm = text.match(/^แก้สต็อก\s+(.+?)\s+(\d+)\s*$/);
  if (sm) {
    const stock = parseInt(sm[2]);
    const { data: f } = await db.from('products').select('id,title,stock').ilike('title', `%${sm[1]}%`).limit(5);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${sm[1]}"` }]);
    if (f.length === 1) {
      await db.from('products').update({ stock }).eq('id', f[0].id);
      return lineReply(replyToken, [{ type: 'text', text: `✅ ${f[0].title}\n${f[0].stock} → ${stock} ชิ้น` }]);
    }
    return lineReply(replyToken, [{ type: 'text', text: `พบ ${f.length} รายการ:\n${f.map((p: any, i: number) => `${i+1}. ${p.title}`).join('\n')}` }]);
  }

  const stm = text.match(/^(เปิดขาย|ปิดขาย)\s+(.+)$/);
  if (stm) {
    const active = stm[1] === 'เปิดขาย';
    const { data: f } = await db.from('products').select('id,title').ilike('title', `%${stm[2]}%`).limit(5);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${stm[2]}"` }]);
    if (f.length === 1) {
      await db.from('products').update({ is_active: active }).eq('id', f[0].id);
      return lineReply(replyToken, [{ type: 'text', text: `✅ ${f[0].title}\n${active ? '🟢 เปิดขายแล้ว' : '⏸ ปิดขายแล้ว'}` }]);
    }
    return lineReply(replyToken, [{ type: 'text', text: `พบ ${f.length} รายการ:\n${f.map((p: any, i: number) => `${i+1}. ${p.title}`).join('\n')}` }]);
  }

  const vm = text.match(/^ดูสินค้า\s+(.+)$/);
  if (vm) {
    const { data: f } = await db.from('products').select('title,price,stock,is_active').ilike('title', `%${vm[1]}%`).limit(5);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${vm[1]}"` }]);
    const list = f.map((p: any) => `${p.is_active ? '🟢' : '⏸'} ${p.title}\n   ฿${Number(p.price).toLocaleString()} | ${p.stock} ชิ้น`).join('\n');
    return lineReply(replyToken, [{ type: 'text', text: list }]);
  }

  if (text === 'สรุปสต็อก') {
    const { data: f } = await db.from('products').select('title,stock').eq('is_active', true).lte('stock', 5).order('stock').limit(15);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: '✅ ไม่มีสินค้าสต็อกต่ำ' }]);
    const list = f.map((p: any) => `${p.stock === 0 ? '🔴' : '🟡'} ${p.title}: ${p.stock} ชิ้น`).join('\n');
    return lineReply(replyToken, [{ type: 'text', text: `📊 สต็อกต่ำ (≤5 ชิ้น)\n\n${list}` }]);
  }

  return lineReply(replyToken, [{ type: 'text', text: 'พิมพ์ "admin" เพื่อดูคำสั่ง' }]);
}

async function handleAdminImage(messageId: string, userId: string, replyToken: string, db: any) {
  await lineReply(replyToken, [{ type: 'text', text: '⏳ กำลังวิเคราะห์รูปสินค้า...' }]);
  try {
    const { buffer, contentType } = await fetchLineImage(messageId);
    const base64 = buffer.toString('base64');
    const filePath = `line-bot/${Date.now()}.${contentType.includes('png') ? 'png' : 'jpg'}`;
    await db.storage.from('products').upload(filePath, buffer, { contentType });
    const { data: { publicUrl } } = db.storage.from('products').getPublicUrl(filePath);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: contentType, data: base64 } },
            { text: 'วิเคราะห์รูปสินค้าปริ้นเตอร์/หมึก/อะไหล่ ตอบเป็น JSON object เท่านั้น:\n{"title":"ชื่อสินค้า","description":"รายละเอียด","price":0,"stock":0,"brand":"แบรนด์","category":"หมวดหมู่","condition":"new"}' },
          ]}],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );
    const gd: any = await r.json();
    const raw = gd?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const info = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    const { data: product } = await db.from('products').insert([{
      title: info.title || 'สินค้าใหม่', description: info.description || '',
      price: Number(info.price) || 0, stock: Number(info.stock) || 0,
      brand: info.brand || '', category: info.category || '',
      condition: info.condition || 'new', image_url: publicUrl, is_active: false,
    }]).select().single();

    await linePush(userId, [{ type: 'text', text: `✅ บันทึกสินค้า (ร่าง) แล้ว!\n\n📦 ${product.title}\n🏷️ ${product.brand || '-'} | ${product.category || '-'}\n💰 ฿${Number(product.price).toLocaleString()}\n📊 สต็อก: ${product.stock} ชิ้น\n\n⚠️ กรุณาตรวจสอบและเปิดขายในหน้าจัดการสินค้า` }]);
  } catch (err: any) {
    await linePush(userId, [{ type: 'text', text: `❌ ${err.message}` }]);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = await rawBody(req);
  if (!verifySig(raw, req.headers['x-line-signature'])) return res.status(401).end();

  const body = JSON.parse(raw.toString());
  const db   = createClient(SUPABASE_URL, SERVICE_KEY);

  for (const event of body.events || []) {
    if (event.type !== 'message') continue;

    const userId: string     = event.source?.userId;
    const replyToken: string = event.replyToken;
    const isAdmin            = ADMIN_IDS.includes(userId);

    // Admin: image
    if (isAdmin && event.message.type === 'image') {
      await handleAdminImage(event.message.id, userId, replyToken, db);
      continue;
    }

    if (event.message.type !== 'text') continue;
    const text = (event.message.text as string).trim();

    // Admin: text commands
    if (isAdmin) { await handleAdmin(text, replyToken, db); continue; }

    // Customer: AI sales agent
    try {
      // Load settings + history + profile in parallel
      const [settingsRes, history, profile] = await Promise.all([
        db.from('store_settings')
          .select('ai_provider,ai_model,ai_enabled,ai_persona_name,ai_system_prompt,ai_speaking_style,ai_temperature,ai_gender')
          .single(),
        loadHistory(userId, db),
        getLineProfile(userId),
      ]);
      const settings    = settingsRes.data;
      const displayName = profile?.displayName || 'ลูกค้า';

      if (settings?.ai_enabled === false) {
        await lineReply(replyToken, [{ type: 'text', text: 'ขออภัยครับ ระบบแชตบอทปิดอยู่ชั่วคราว กรุณาติดต่อเจ้าหน้าที่ผ่าน LINE ครับ' }]);
        continue;
      }

      const provider    = ((settings?.ai_provider as string) || 'gemini').toLowerCase();
      const model       = (settings?.ai_model as string) || 'gemini-2.5-flash';
      const temperature = typeof settings?.ai_temperature === 'number' ? settings.ai_temperature : 0.7;

      const systemPrompt = await buildSystemPrompt(settings, db);

      // Build history in Gemini format (used by all providers internally here)
      const msgHistory: MsgHistory = [
        ...history,
        { role: 'user', parts: [{ text }] },
      ];

      // pendingProducts collected during tool execution → becomes Flex cards
      const pendingProducts: any[] = [];
      const executeTool = buildExecuteTool(db, userId, displayName, pendingProducts);

      // Run AI
      const historyForAI: MsgHistory = history;
      const historyWithUser: MsgHistory = [...historyForAI, { role: 'user', parts: [{ text }] }];

      let aiText = '';
      if (provider === 'openai') {
        aiText = await runOpenAI(model, systemPrompt, historyWithUser, temperature, executeTool);
      } else if (provider === 'anthropic') {
        aiText = await runAnthropic(model, systemPrompt, historyWithUser, temperature, executeTool);
      } else {
        aiText = await runGemini(model, systemPrompt, historyWithUser, temperature, executeTool);
      }

      // Build reply messages
      const lineMessages: any[] = [{ type: 'text', text: aiText }];
      if (pendingProducts.length > 0) {
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = pendingProducts.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
        lineMessages.push(buildProductFlex(unique));
      }

      await lineReply(replyToken, lineMessages);

      // Save session (text turns only, no tool internals)
      await saveHistory(userId, displayName, [
        ...history,
        { role: 'user',  parts: [{ text }] },
        { role: 'model', parts: [{ text: aiText }] },
      ], db);
    } catch (err: any) {
      console.error('[line-agent] error:', err);
      await lineReply(replyToken, [{ type: 'text', text: 'ขออภัยครับ เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งนะครับ 🙏' }]);
    }
  }

  return res.status(200).json({ ok: true });
}
