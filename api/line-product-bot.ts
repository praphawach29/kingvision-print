import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Vercel: allow up to 25s for image processing
export const maxDuration = 25;
export const config = { api: { bodyParser: false } };

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const GEMINI_KEY     = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_IDS      = (process.env.LINE_ADMIN_USER_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ─── helpers ────────────────────────────────────────────────────────────────

async function rawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(body: Buffer, sig: string): boolean {
  if (!CHANNEL_SECRET) return true; // skip in dev if not set
  const hash = crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64');
  return hash === sig;
}

async function replyMsg(replyToken: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_TOKEN}` },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function pushMsg(to: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_TOKEN}` },
    body: JSON.stringify({ to, messages }),
  });
}

async function fetchLineImage(messageId: string) {
  const r = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${CHANNEL_TOKEN}` },
  });
  const contentType = r.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, contentType };
}

async function extractWithGemini(base64: string, mimeType: string, hint: string) {
  const prompt = `คุณเป็น AI ผู้ช่วยจัดการสินค้าร้านปริ้นเตอร์ KingVision Print
วิเคราะห์รูปภาพสินค้าและข้อความเพิ่มเติม แล้วสกัดข้อมูลเป็น JSON เท่านั้น

ข้อความเพิ่มเติมจากแอดมิน: "${hint || 'ไม่มี'}"

ตอบกลับเป็น JSON object เท่านั้น ห้ามมีข้อความอื่น:
{
  "title": "ชื่อสินค้า (ภาษาไทยหรืออังกฤษ)",
  "description": "รายละเอียด 1-3 ประโยค",
  "price": 0,
  "stock": 0,
  "brand": "เช่น Epson HP Canon Brother",
  "category": "เช่น เครื่องปริ้นเตอร์ หมึกพิมพ์ อะไหล่ปริ้นเตอร์",
  "condition": "new"
}`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: prompt },
        ]}],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );
  const data: any = await r.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean); } catch { return {}; }
}

const HELP_TEXT = `🤖 KingVision Product Bot

📸 ส่งรูปสินค้า
→ AI วิเคราะห์และบันทึกสินค้าให้อัตโนมัติ

📸 ส่งรูป + พิมพ์ข้อความในครั้งเดียว
→ เช่น ส่งรูป Epson L3250 พร้อมพิมพ์ "ราคา 6990 สต็อก 3"

✏️ แก้ราคา [ชื่อ] [ราคา]
เช่น: แก้ราคา Epson L3250 5990

📦 แก้สต็อก [ชื่อ] [จำนวน]
เช่น: แก้สต็อก Canon 810 5

🟢 เปิดขาย [ชื่อ]
⏸ ปิดขาย [ชื่อ]

🔍 ดูสินค้า [ชื่อ]
เช่น: ดูสินค้า Epson

หมายเหตุ: สินค้าจากรูปจะบันทึกเป็น "ร่าง"
กรุณาตรวจสอบและเปิดขายในหน้าจัดการสินค้า`;

// ─── main handler ────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = await rawBody(req);
  const sig = req.headers['x-line-signature'] as string;

  if (!verifySignature(raw, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = JSON.parse(raw.toString());
  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  for (const event of body.events || []) {
    if (event.type !== 'message') continue;

    const userId: string = event.source?.userId;
    const replyToken: string = event.replyToken;

    // Admin whitelist check
    if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(userId)) {
      await replyMsg(replyToken, [{ type: 'text', text: '⛔ ไม่มีสิทธิ์ใช้งาน\nระบบนี้สำหรับแอดมินเท่านั้น' }]);
      continue;
    }

    // ── IMAGE: auto-create product ──────────────────────────────────────────
    if (event.message.type === 'image') {
      // Reply immediately so LINE knows we received it
      await replyMsg(replyToken, [{ type: 'text', text: '⏳ กำลังวิเคราะห์รูปสินค้า...' }]);

      try {
        const { buffer, contentType } = await fetchLineImage(event.message.id);
        const base64 = buffer.toString('base64');

        // Upload image to Supabase Storage
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const filePath = `line-bot/${Date.now()}.${ext}`;
        await db.storage.from('products').upload(filePath, buffer, { contentType });
        const { data: { publicUrl } } = db.storage.from('products').getPublicUrl(filePath);

        // Extract product info with Gemini Vision
        const info = await extractWithGemini(base64, contentType, '');

        // Insert draft product
        const { data: product, error } = await db
          .from('products')
          .insert([{
            title:       info.title       || 'สินค้าใหม่',
            description: info.description || '',
            price:       Number(info.price)  || 0,
            stock:       Number(info.stock)  || 0,
            brand:       info.brand       || '',
            category:    info.category    || '',
            condition:   info.condition   || 'new',
            image_url:   publicUrl,
            is_active:   false,
          }])
          .select()
          .single();

        if (error) throw error;

        await pushMsg(userId, [{
          type: 'text',
          text: [
            '✅ บันทึกสินค้า (ร่าง) แล้ว!',
            '',
            `📦 ${product.title}`,
            `🏷️ ${product.brand || '-'} | ${product.category || '-'}`,
            `💰 ฿${Number(product.price).toLocaleString()}`,
            `📊 สต็อก: ${product.stock} ชิ้น`,
            '',
            '⚠️ สินค้าถูกบันทึกเป็นร่าง',
            'กรุณาตรวจสอบและเปิดขายในหน้าจัดการสินค้า',
            '',
            'พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่มี',
          ].join('\n'),
        }]);
      } catch (err: any) {
        console.error('[line-bot] image error:', err);
        await pushMsg(userId, [{ type: 'text', text: `❌ เกิดข้อผิดพลาด: ${err.message}` }]);
      }
      continue;
    }

    // ── TEXT COMMANDS ───────────────────────────────────────────────────────
    if (event.message.type !== 'text') continue;
    const text = (event.message.text as string).trim();

    // ช่วยเหลือ
    if (/^(ช่วยเหลือ|help|คำสั่ง)$/i.test(text)) {
      await replyMsg(replyToken, [{ type: 'text', text: HELP_TEXT }]);
      continue;
    }

    // แก้ราคา [ชื่อ] [ราคา]
    const priceMatch = text.match(/^แก้ราคา\s+(.+?)\s+(\d+(?:\.\d+)?)\s*$/);
    if (priceMatch) {
      const [, q, priceStr] = priceMatch;
      const price = parseFloat(priceStr);
      const { data: found } = await db.from('products').select('id,title,price')
        .ilike('title', `%${q}%`).limit(5);

      if (!found?.length) {
        await replyMsg(replyToken, [{ type: 'text', text: `❌ ไม่พบสินค้า "${q}"` }]);
      } else if (found.length === 1) {
        await db.from('products').update({ price }).eq('id', found[0].id);
        await replyMsg(replyToken, [{
          type: 'text',
          text: `✅ อัปเดตราคาแล้ว\n\n${found[0].title}\n฿${Number(found[0].price).toLocaleString()} → ฿${price.toLocaleString()}`,
        }]);
      } else {
        await replyMsg(replyToken, [{
          type: 'text',
          text: `พบ ${found.length} รายการ ระบุชื่อให้ชัดขึ้น:\n\n${found.map((p, i) => `${i + 1}. ${p.title}`).join('\n')}`,
        }]);
      }
      continue;
    }

    // แก้สต็อก [ชื่อ] [จำนวน]
    const stockMatch = text.match(/^แก้สต็อก\s+(.+?)\s+(\d+)\s*$/);
    if (stockMatch) {
      const [, q, stockStr] = stockMatch;
      const stock = parseInt(stockStr);
      const { data: found } = await db.from('products').select('id,title,stock')
        .ilike('title', `%${q}%`).limit(5);

      if (!found?.length) {
        await replyMsg(replyToken, [{ type: 'text', text: `❌ ไม่พบสินค้า "${q}"` }]);
      } else if (found.length === 1) {
        await db.from('products').update({ stock }).eq('id', found[0].id);
        await replyMsg(replyToken, [{
          type: 'text',
          text: `✅ อัปเดตสต็อกแล้ว\n\n${found[0].title}\n${found[0].stock} → ${stock} ชิ้น`,
        }]);
      } else {
        await replyMsg(replyToken, [{
          type: 'text',
          text: `พบ ${found.length} รายการ ระบุชื่อให้ชัดขึ้น:\n\n${found.map((p, i) => `${i + 1}. ${p.title}`).join('\n')}`,
        }]);
      }
      continue;
    }

    // เปิดขาย / ปิดขาย [ชื่อ]
    const statusMatch = text.match(/^(เปิดขาย|ปิดขาย)\s+(.+)$/);
    if (statusMatch) {
      const [, action, q] = statusMatch;
      const isActive = action === 'เปิดขาย';
      const { data: found } = await db.from('products').select('id,title')
        .ilike('title', `%${q}%`).limit(5);

      if (!found?.length) {
        await replyMsg(replyToken, [{ type: 'text', text: `❌ ไม่พบสินค้า "${q}"` }]);
      } else if (found.length === 1) {
        await db.from('products').update({ is_active: isActive }).eq('id', found[0].id);
        await replyMsg(replyToken, [{
          type: 'text',
          text: `✅ ${found[0].title}\n${isActive ? '🟢 เปิดขายแล้ว' : '⏸ ปิดขายแล้ว'}`,
        }]);
      } else {
        await replyMsg(replyToken, [{
          type: 'text',
          text: `พบ ${found.length} รายการ ระบุชื่อให้ชัดขึ้น:\n\n${found.map((p, i) => `${i + 1}. ${p.title}`).join('\n')}`,
        }]);
      }
      continue;
    }

    // ดูสินค้า [ชื่อ]
    const viewMatch = text.match(/^ดูสินค้า\s+(.+)$/);
    if (viewMatch) {
      const [, q] = viewMatch;
      const { data: found } = await db.from('products')
        .select('id,title,price,stock,brand,is_active')
        .ilike('title', `%${q}%`).limit(5);

      if (!found?.length) {
        await replyMsg(replyToken, [{ type: 'text', text: `❌ ไม่พบสินค้า "${q}"` }]);
      } else {
        const list = found.map(p =>
          `📦 ${p.title}\n💰 ฿${Number(p.price).toLocaleString()} | ${p.stock} ชิ้น\n${p.is_active ? '🟢 เปิดขาย' : '⏸ ร่าง/ปิด'}`
        ).join('\n─────────\n');
        await replyMsg(replyToken, [{ type: 'text', text: `🔍 ค้นหา "${q}"\n\n${list}` }]);
      }
      continue;
    }

    // Unknown command
    await replyMsg(replyToken, [{ type: 'text', text: 'พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้ครับ 😊' }]);
  }

  return res.status(200).json({ ok: true });
}
