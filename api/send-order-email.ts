import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return res.status(200).json({ skipped: true });
  }

  const resend = new Resend(apiKey);

  const {
    toEmail,
    toName,
    orderRef,
    total,
    items,
    paymentMethod,
    shippingAddress,
    storeName = 'KingVision Print',
    storeEmail = 'contact@kingvision.com',
  } = req.body as {
    toEmail: string;
    toName: string;
    orderRef: string;
    total: number;
    items: { title: string; quantity: number; price: number }[];
    paymentMethod: string;
    shippingAddress: string;
    storeName?: string;
    storeEmail?: string;
  };

  if (!toEmail || !orderRef) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const paymentLabel: Record<string, string> = {
    promptpay: 'พร้อมเพย์ (QR Code)',
    qr: 'พร้อมเพย์ (QR Code)',
    bank_transfer: 'โอนเงินผ่านธนาคาร',
    transfer: 'โอนเงินผ่านธนาคาร',
    cod: 'เก็บเงินปลายทาง (COD)',
  };

  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">฿${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#0f1d33;padding:32px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:2px;">${storeName}</div>
            <div style="color:#eb6c00;font-size:13px;font-weight:bold;margin-top:4px;">ยืนยันการสั่งซื้อ</div>
          </td>
        </tr>

        <!-- Order ref banner -->
        <tr>
          <td style="background:#eb6c00;padding:16px 32px;">
            <table width="100%"><tr>
              <td style="color:#fff;font-size:13px;font-weight:bold;">หมายเลขออเดอร์</td>
              <td align="right" style="color:#fff;font-size:18px;font-weight:900;">#${orderRef}</td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px;">

          <p style="margin:0 0 24px;color:#333;font-size:15px;">
            สวัสดีคุณ <strong>${toName}</strong> ขอบคุณที่ไว้วางใจ ${storeName} ครับ<br>
            เราได้รับคำสั่งซื้อของคุณแล้ว และกำลังดำเนินการต่อไป
          </p>

          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8f8f8;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;font-weight:bold;">สินค้า</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;font-weight:bold;">จำนวน</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;font-weight:bold;">ราคา</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="background:#fff8f0;">
                <td colspan="2" style="padding:12px;font-weight:900;color:#0f1d33;">ยอดรวมทั้งหมด</td>
                <td style="padding:12px;text-align:right;font-size:20px;font-weight:900;color:#eb6c00;">฿${total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Payment + Address -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" valign="top" style="padding-right:12px;">
                <div style="background:#f8f8f8;border-radius:8px;padding:16px;">
                  <div style="font-size:11px;font-weight:bold;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">ช่องทางชำระเงิน</div>
                  <div style="font-weight:bold;color:#0f1d33;font-size:14px;">${paymentLabel[paymentMethod] || paymentMethod}</div>
                </div>
              </td>
              <td width="4%"></td>
              <td width="48%" valign="top">
                <div style="background:#f8f8f8;border-radius:8px;padding:16px;">
                  <div style="font-size:11px;font-weight:bold;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">ที่อยู่จัดส่ง</div>
                  <div style="font-size:13px;color:#333;line-height:1.6;">${shippingAddress.replace(/\n/g, '<br>')}</div>
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top:24px;padding:16px;background:#e8f5e9;border-radius:8px;border-left:4px solid #4caf50;">
            <p style="margin:0;font-size:13px;color:#2e7d32;">
              ✅ ทีมงานจะตรวจสอบการชำระเงินและแจ้งสถานะให้ทราบผ่านอีเมลนี้ หากมีข้อสงสัยติดต่อได้ที่
              <a href="mailto:${storeEmail}" style="color:#2e7d32;font-weight:bold;">${storeEmail}</a>
            </p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:20px 32px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#999;">${storeName} · ขอบคุณที่ใช้บริการ</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const fromDomain = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    await resend.emails.send({
      from: `${storeName} <${fromDomain}>`,
      to: toEmail,
      subject: `✅ ยืนยันออเดอร์ #${orderRef} — ${storeName}`,
      html,
    });
    return res.status(200).json({ sent: true });
  } catch (err: any) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
