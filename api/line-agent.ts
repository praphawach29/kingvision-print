/**
 * LINE OA Unified Agent
 * - Admin (LINE_ADMIN_USER_IDS): product management commands + image upload
 * - Customers: AI sales agent with Gemini function calling + Flex Message product cards
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 25;
export const config = { api: { bodyParser: false } };

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const GEMINI_KEY     = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE_URL       = (process.env.VITE_SITE_URL || 'https://kingvision-print.vercel.app').replace(/\/$/, '');
const ADMIN_IDS      = (process.env.LINE_ADMIN_USER_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── low-level helpers ────────────────────────────────────────────────────────

async function rawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySig(body: Buffer, sig: string): boolean {
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
    if (!r.ok) return null;
    return r.json() as Promise<{ displayName: string; pictureUrl?: string }>;
  } catch { return null; }
}

async function fetchLineImage(messageId: string) {
  const r = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${CHANNEL_TOKEN}` },
  });
  return {
    buffer: Buffer.from(await r.arrayBuffer()),
    contentType: r.headers.get('content-type') || 'image/jpeg',
  };
}

// ── Flex Message product cards ────────────────────────────────────────────────

function buildProductFlex(products: any[]): any {
  const bubbles = products.slice(0, 10).map((p) => ({
    type: 'bubble',
    size: 'micro',
    ...(p.image_url ? {
      hero: {
        type: 'image',
        url: p.image_url,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        action: { type: 'uri', label: 'ดู', uri: `${SITE_URL}/product/${p.id}` },
      },
    } : {}),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      paddingAll: 'md',
      contents: [
        ...(p.brand ? [{ type: 'text', text: p.brand, size: 'xxs', color: '#f97316', weight: 'bold' }] : []),
        { type: 'text', text: p.title, size: 'xs', weight: 'bold', wrap: true, maxLines: 2, color: '#0f2a5e' },
        { type: 'text', text: `฿${Number(p.price).toLocaleString()}`, size: 'sm', weight: 'bold', color: '#f97316', margin: 'sm' },
        {
          type: 'text',
          text: p.stock > 0 ? `✅ มี ${p.stock} ชิ้น` : '❌ สินค้าหมด',
          size: 'xxs',
          color: p.stock > 0 ? '#16a34a' : '#dc2626',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'sm',
      contents: [{
        type: 'button',
        style: 'primary',
        color: '#f97316',
        height: 'sm',
        action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${SITE_URL}/product/${p.id}` },
      }],
    },
  }));

  return {
    type: 'flex',
    altText: `สินค้าแนะนำ ${products.length} รายการ`,
    contents: { type: 'carousel', contents: bubbles },
  };
}

// ── Agent tools ───────────────────────────────────────────────────────────────

async function toolSearchProducts(args: any, db: any) {
  let q = db.from('products')
    .select('id,title,brand,category,price,stock,image_url,description')
    .eq('is_active', true);

  if (args.query) {
    q = q.or(`title.ilike.%${args.query}%,brand.ilike.%${args.query}%,description.ilike.%${args.query}%`);
  }
  if (args.category) q = q.ilike('category', `%${args.category}%`);
  if (args.brand)    q = q.ilike('brand', `%${args.brand}%`);
  if (args.max_price) q = q.lte('price', args.max_price);
  if (args.min_price) q = q.gte('price', args.min_price);

  q = q.order('stock', { ascending: false }).limit(args.limit || 6);
  const { data } = await q;
  return data || [];
}

async function toolGetProductDetails(args: any, db: any) {
  const { data } = await db.from('products').select('*').eq('id', args.product_id).single();
  return data || null;
}

async function toolCheckOrder(args: any, db: any) {
  const term = (args.phone || args.order_id || '').trim();
  if (!term) return { error: 'กรุณาระบุเบอร์โทรหรือรหัสออเดอร์' };

  let q = db.from('orders')
    .select('id,status,total_amount,created_at,tracking_number,shipping_provider,shipping_data');

  if (/^\d{9,10}$/.test(term)) {
    q = q.contains('shipping_data', { phone: term });
  } else {
    q = q.ilike('id', `%${term}%`);
  }

  const { data } = await q.order('created_at', { ascending: false }).limit(3);
  return data || [];
}

async function toolGetShopInfo(db: any) {
  const { data } = await db.from('store_settings')
    .select('store_name,store_address,store_phone,store_email,store_hours,line_oa_link')
    .limit(1).single();
  return data || {};
}

async function toolGetKnowledge(args: any, db: any) {
  let q = db.from('ai_knowledge_base').select('question,answer,category');
  if (args.category) q = q.eq('category', args.category);
  if (args.query) q = q.or(`question.ilike.%${args.query}%,answer.ilike.%${args.query}%`);
  const { data } = await q.order('sort_order').limit(5);
  return data || [];
}

async function toolSaveLead(args: any, db: any) {
  const { error } = await db.from('line_leads').insert([{
    user_id:      args.user_id,
    display_name: args.display_name,
    phone:        args.phone || null,
    interest:     args.interest || null,
    message:      args.message || null,
  }]);
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Gemini function declarations ──────────────────────────────────────────────

const TOOL_DECLARATIONS = [
  {
    name: 'search_products',
    description: 'ค้นหาสินค้าที่มีในร้าน ใช้เมื่อลูกค้าถามหาสินค้าหรืออยากเปรียบเทียบรุ่น',
    parameters: {
      type: 'object',
      properties: {
        query:     { type: 'string',  description: 'คำค้นหา เช่น ชื่อรุ่น แบรนด์ ประเภทสินค้า' },
        category:  { type: 'string',  description: 'หมวดหมู่ เช่น เครื่องปริ้นเตอร์ หมึกพิมพ์' },
        brand:     { type: 'string',  description: 'แบรนด์ เช่น Epson HP Canon Brother' },
        max_price: { type: 'number',  description: 'ราคาสูงสุดที่ลูกค้ายอมรับได้' },
        min_price: { type: 'number',  description: 'ราคาต่ำสุด' },
        limit:     { type: 'integer', description: 'จำนวนสินค้าที่ต้องการ (default 6)' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'ดูรายละเอียดสินค้าแบบเต็ม รวมถึงสเปค รายละเอียด เมื่อลูกค้าสนใจสินค้าชิ้นนั้นเป็นพิเศษ',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'ID ของสินค้าที่ต้องการดูรายละเอียด' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'check_order_status',
    description: 'ตรวจสอบสถานะออเดอร์และเลขติดตามพัสดุ เมื่อลูกค้าถามว่าสินค้าไปถึงไหนแล้ว',
    parameters: {
      type: 'object',
      properties: {
        phone:    { type: 'string', description: 'เบอร์โทรที่ใช้ตอนสั่งซื้อ' },
        order_id: { type: 'string', description: 'รหัสออเดอร์บางส่วน' },
      },
    },
  },
  {
    name: 'get_shop_info',
    description: 'ดูข้อมูลร้าน เช่น ที่อยู่ เวลาทำการ เบอร์โทร LINE ของร้าน',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_knowledge',
    description: 'ค้นหาข้อมูลจากคลังความรู้ของร้าน เช่น นโยบายจัดส่ง การรับประกัน วิธีสั่งซื้อ',
    parameters: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'คำถามหรือหัวข้อที่ต้องการ' },
        category: { type: 'string', description: 'หมวด เช่น shipping warranty general' },
      },
    },
  },
  {
    name: 'save_lead',
    description: 'บันทึกข้อมูลลูกค้าที่สนใจสินค้าเพื่อให้แอดมินติดต่อกลับ เมื่อลูกค้าขอให้โทรกลับหรืออยากได้ใบเสนอราคา',
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

const SYSTEM_PROMPT = `คุณคือ "น้องวิชัน" ผู้ช่วยฝ่ายขายออนไลน์ของร้าน KingVision Print
ร้านจำหน่ายเครื่องปริ้นเตอร์ หมึกพิมพ์ อะไหล่ปริ้นเตอร์ และรับซ่อมทุกยี่ห้อ

บุคลิก: สุภาพ เป็นกันเอง ใส่ใจลูกค้า ตอบภาษาไทย ใช้ emoji บ้างเล็กน้อย
ตอบกระชับ ไม่เกิน 6 ประโยคต่อข้อความ ตอบตรงประเด็น

กลยุทธ์การขาย:
- ถามงบประมาณ + การใช้งานก่อนแนะนำเครื่องปริ้นเตอร์ (บ้าน/สำนักงาน/ธุรกิจ)
- Cross-sell: เสนอหมึก กระดาษ หรืออะไหล่ที่เข้ากันกับสินค้าหลักเสมอ
- Upsell: ถ้าลูกค้ามีงบพอ แนะนำรุ่นที่ดีกว่าพร้อมเหตุผลที่ชัดเจน
- ถ้าสินค้าหมดสต็อก แจ้งและค้นหาสินค้าทดแทนที่ใกล้เคียงทันที
- ถ้าลูกค้าถามราคาหลายรุ่น ให้เปรียบเทียบ 2-3 ตัวเลือกพร้อมข้อดีแต่ละรุ่น

กฎสำคัญ:
- ใช้ข้อมูลจากฐานข้อมูลจริงเท่านั้น ห้ามแต่งข้อมูลสินค้าหรือราคา
- ถ้าอยากสั่งซื้อ: แนะนำให้สั่งผ่านเว็บไซต์ ${SITE_URL} หรือฝากเบอร์ให้แอดมินโทรกลับ
- ถ้าต้องการใบเสนอราคา: ให้ลูกค้าฝากชื่อและเบอร์ แล้ว save_lead
- ตรวจสอบสถานะออเดอร์ได้จากเบอร์โทรที่ใช้สั่งซื้อ`;

// ── Gemini call + agentic loop ────────────────────────────────────────────────

async function callGemini(contents: any[], useTools = true) {
  const body: any = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 600, temperature: 0.75 },
  };
  if (useTools) {
    body.tools = [{ function_declarations: TOOL_DECLARATIONS }];
    body.tool_config = { function_calling_config: { mode: 'AUTO' } };
  }
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  return r.json() as Promise<any>;
}

async function runAgent(
  userId: string,
  displayName: string,
  userText: string,
  history: any[],
  db: any
): Promise<{ text: string; products: any[] }> {
  const contents: any[] = [
    ...history,
    { role: 'user', parts: [{ text: userText }] },
  ];

  let foundProducts: any[] = [];

  // Agentic loop — max 5 tool-call rounds
  for (let round = 0; round < 5; round++) {
    const resp = await callGemini(contents);
    const parts: any[] = resp?.candidates?.[0]?.content?.parts || [];
    const fnCalls = parts.filter((p: any) => p.functionCall);

    if (fnCalls.length === 0) {
      const text = parts.find((p: any) => p.text)?.text?.trim() || 'ขออภัย ไม่สามารถตอบได้ในขณะนี้ครับ';
      return { text, products: foundProducts };
    }

    // Add model's tool-call turn to context
    contents.push({ role: 'model', parts });

    // Execute all tool calls in parallel
    const responseParts = await Promise.all(
      fnCalls.map(async (part: any) => {
        const { name, args } = part.functionCall;
        let result: any;

        switch (name) {
          case 'search_products':
            result = await toolSearchProducts(args, db);
            if (Array.isArray(result) && result.length > 0) foundProducts = result;
            break;
          case 'get_product_details':
            result = await toolGetProductDetails(args, db);
            break;
          case 'check_order_status':
            result = await toolCheckOrder(args, db);
            break;
          case 'get_shop_info':
            result = await toolGetShopInfo(db);
            break;
          case 'get_knowledge':
            result = await toolGetKnowledge(args, db);
            break;
          case 'save_lead':
            result = await toolSaveLead({ ...args, user_id: userId, display_name: displayName }, db);
            break;
          default:
            result = { error: 'unknown tool' };
        }

        return { functionResponse: { name, response: { result } } };
      })
    );

    // Add tool responses to context
    contents.push({ role: 'user', parts: responseParts });
  }

  return { text: 'ขออภัยครับ ไม่สามารถประมวลผลได้ กรุณาลองใหม่อีกครั้ง 🙏', products: [] };
}

// ── Session management ────────────────────────────────────────────────────────

const MAX_HISTORY = 12; // 6 conversation turns

async function loadHistory(userId: string, db: any): Promise<any[]> {
  try {
    const { data } = await db.from('line_sessions').select('messages').eq('user_id', userId).single();
    return data?.messages || [];
  } catch { return []; }
}

async function saveHistory(userId: string, displayName: string, messages: any[], db: any) {
  try {
    await db.from('line_sessions').upsert({
      user_id:      userId,
      display_name: displayName,
      messages:     messages.slice(-MAX_HISTORY),
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) { console.error('[line-agent] saveHistory:', e); }
}

// ── Admin command handler ─────────────────────────────────────────────────────

const ADMIN_HELP = `🔧 Admin Mode — KingVision Bot

📸 ส่งรูปสินค้า → AI บันทึกสินค้าอัตโนมัติ

✏️ แก้ราคา [ชื่อ] [ราคา]
📦 แก้สต็อก [ชื่อ] [จำนวน]
🟢 เปิดขาย [ชื่อ]
⏸ ปิดขาย [ชื่อ]
🔍 ดูสินค้า [ชื่อ]
📊 สรุปสต็อก`;

async function handleAdmin(text: string, replyToken: string, db: any) {
  if (/^(admin|ช่วยเหลือ|help)$/i.test(text)) {
    return lineReply(replyToken, [{ type: 'text', text: ADMIN_HELP }]);
  }

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
    const { data: f } = await db.from('products')
      .select('title,price,stock,is_active').ilike('title', `%${vm[1]}%`).limit(5);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${vm[1]}"` }]);
    const list = f.map((p: any) =>
      `${p.is_active ? '🟢' : '⏸'} ${p.title}\n   ฿${Number(p.price).toLocaleString()} | ${p.stock} ชิ้น`
    ).join('\n');
    return lineReply(replyToken, [{ type: 'text', text: list }]);
  }

  if (text === 'สรุปสต็อก') {
    const { data: f } = await db.from('products')
      .select('title,stock').eq('is_active', true).lte('stock', 5).order('stock').limit(15);
    if (!f?.length) return lineReply(replyToken, [{ type: 'text', text: '✅ ไม่มีสินค้าสต็อกต่ำ' }]);
    const list = f.map((p: any) => `${p.stock === 0 ? '🔴' : '🟡'} ${p.title}: ${p.stock} ชิ้น`).join('\n');
    return lineReply(replyToken, [{ type: 'text', text: `📊 สต็อกต่ำ (≤5 ชิ้น)\n\n${list}` }]);
  }

  return lineReply(replyToken, [{ type: 'text', text: 'พิมพ์ "admin" เพื่อดูคำสั่ง' }]);
}

// ── Admin image: extract product with Gemini Vision ───────────────────────────

async function handleAdminImage(messageId: string, userId: string, replyToken: string, db: any) {
  await lineReply(replyToken, [{ type: 'text', text: '⏳ กำลังวิเคราะห์รูปสินค้า...' }]);

  try {
    const { buffer, contentType } = await fetchLineImage(messageId);
    const base64 = buffer.toString('base64');

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `line-bot/${Date.now()}.${ext}`;
    await db.storage.from('products').upload(path, buffer, { contentType });
    const { data: { publicUrl } } = db.storage.from('products').getPublicUrl(path);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: contentType, data: base64 } },
            { text: 'วิเคราะห์รูปสินค้าปริ้นเตอร์/หมึก/อะไหล่ แล้วตอบเป็น JSON object เท่านั้น:\n{"title":"ชื่อสินค้า","description":"รายละเอียด","price":0,"stock":0,"brand":"แบรนด์","category":"หมวดหมู่","condition":"new"}' },
          ]}],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );
    const gd: any = await r.json();
    const raw = gd?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const info = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    const { data: product, error } = await db.from('products').insert([{
      title:       info.title       || 'สินค้าใหม่',
      description: info.description || '',
      price:       Number(info.price)  || 0,
      stock:       Number(info.stock)  || 0,
      brand:       info.brand       || '',
      category:    info.category    || '',
      condition:   info.condition   || 'new',
      image_url:   publicUrl,
      is_active:   false,
    }]).select().single();

    if (error) throw error;

    await linePush(userId, [{
      type: 'text',
      text: [
        '✅ บันทึกสินค้า (ร่าง) แล้ว!',
        '',
        `📦 ${product.title}`,
        `🏷️ ${product.brand || '-'} | ${product.category || '-'}`,
        `💰 ฿${Number(product.price).toLocaleString()}`,
        `📊 สต็อก: ${product.stock} ชิ้น`,
        '',
        '⚠️ สถานะ: ร่าง (ยังไม่เปิดขาย)',
        'กรุณาตรวจสอบและเปิดขายในหน้าจัดการสินค้า',
      ].join('\n'),
    }]);
  } catch (err: any) {
    await linePush(userId, [{ type: 'text', text: `❌ เกิดข้อผิดพลาด: ${err.message}` }]);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = await rawBody(req);
  if (!verifySig(raw, req.headers['x-line-signature'])) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body   = JSON.parse(raw.toString());
  const db     = createClient(SUPABASE_URL, SERVICE_KEY);

  for (const event of body.events || []) {
    if (event.type !== 'message') continue;

    const userId: string     = event.source?.userId;
    const replyToken: string = event.replyToken;
    const isAdmin            = ADMIN_IDS.includes(userId);

    // ── Admin: image upload ──────────────────────────────────────────────────
    if (isAdmin && event.message.type === 'image') {
      await handleAdminImage(event.message.id, userId, replyToken, db);
      continue;
    }

    if (event.message.type !== 'text') continue;
    const text = (event.message.text as string).trim();

    // ── Admin: text commands ─────────────────────────────────────────────────
    if (isAdmin) {
      await handleAdmin(text, replyToken, db);
      continue;
    }

    // ── Customer: AI sales agent ─────────────────────────────────────────────
    try {
      const [history, profile] = await Promise.all([
        loadHistory(userId, db),
        getLineProfile(userId),
      ]);
      const displayName = profile?.displayName || 'ลูกค้า';

      const { text: aiText, products } = await runAgent(userId, displayName, text, history, db);

      // Reply with AI text + optional product cards
      const messages: any[] = [{ type: 'text', text: aiText }];
      if (products.length > 0) messages.push(buildProductFlex(products));
      await lineReply(replyToken, messages);

      // Persist conversation history (only text turns, skip function internals)
      await saveHistory(userId, displayName, [
        ...history,
        { role: 'user',  parts: [{ text }] },
        { role: 'model', parts: [{ text: aiText }] },
      ], db);
    } catch (err: any) {
      console.error('[line-agent] customer error:', err);
      await lineReply(replyToken, [{ type: 'text', text: 'ขออภัยครับ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 🙏' }]);
    }
  }

  return res.status(200).json({ ok: true });
}
