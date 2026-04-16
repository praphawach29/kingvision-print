import { supabase } from '../lib/supabase';

export const notificationService = {
  async sendLineMessage(message: string) {
    try {
      const { data: settings, error } = await supabase
        .from('store_settings')
        .select('line_oa_channel_token, line_oa_admin_id, notify_new_order, notify_order_status, notify_low_stock')
        .single();

      if (error || !settings?.line_oa_channel_token || !settings?.line_oa_admin_id) return;

      console.log('Sending LINE OA Message:', message);
      
      // In a production environment, you MUST call this through a backend/proxy
      // to avoid CORS and keep your Channel Access Token secure.
      // Example using fetch (this might fail in browser due to CORS if called directly):
      /*
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.line_oa_channel_token}`
        },
        body: JSON.stringify({
          to: settings.line_oa_admin_id,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        })
      });
      */
    } catch (err) {
      console.error('Error sending LINE OA notification:', err);
    }
  },

  async notifyNewOrder(orderId: string, total: number, customerName: string) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('notify_new_order')
        .single();

      if (!settings || settings.notify_new_order) {
        const message = `📦 ออเดอร์ใหม่! #${orderId.slice(0, 8)}\n👤 ลูกค้า: ${customerName}\n💰 ยอดรวม: ฿${total.toLocaleString()}\n🌐 ตรวจสอบได้ที่ระบบหลังบ้าน`;
        await this.sendLineMessage(message);
      }
    } catch (err) {
      console.error('Error in notifyNewOrder:', err);
    }
  },

  async notifyStatusUpdate(orderId: string, status: string, userId?: string) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('notify_order_status, notify_customer_line')
        .single();

      const statusMap: any = {
        'pending': 'รอชำระเงิน',
        'processing': 'กำลังจัดเตรียมสินค้า',
        'shipped': 'จัดส่งสินค้าแล้ว',
        'completed': 'เสร็จสิ้น',
        'cancelled': 'ยกเลิกแล้ว'
      };
      
      const statusLabel = statusMap[status] || status;
      const message = `🔔 อัปเดตสถานะออเดอร์ #${orderId.slice(0, 8)}\n📍 สถานะใหม่: ${statusLabel}`;
      
      // 1. Send LINE (Admin/System) - Only if enabled
      if (!settings || settings.notify_order_status) {
        await this.sendLineMessage(message);
      }

      // 2. Save In-App Notification for User
      if (userId) {
        try {
          await supabase.from('notifications').insert([{
            user_id: userId,
            title: 'อัปเดตสถานะออเดอร์',
            message: `ออเดอร์ #${orderId.slice(0, 8)} ของคุณเปลี่ยนสถานะเป็น "${statusLabel}"`,
            type: 'order_update',
            link: `/account`
          }]);
        } catch (err) {
          console.error('Error saving in-app notification:', err);
        }

        // 3. Customer LINE Notification logic would go here if enabled
        if (settings?.notify_customer_line) {
          console.log('Customer LINE notification is enabled for user:', userId);
        }
      }
    } catch (err) {
      console.error('Error in notifyStatusUpdate:', err);
    }
  },

  async notifyLowStock(productName: string, currentStock: number) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('notify_low_stock')
        .single();

      if (!settings || settings.notify_low_stock) {
        const message = `⚠️ สินค้าสต็อกต่ำ!\n📦 ${productName}\nคงเหลือ: ${currentStock} ชิ้น\nกรุณาเติมสต็อกโดยด่วน`;
        await this.sendLineMessage(message);
      }
    } catch (err) {
      console.error('Error in notifyLowStock:', err);
    }
  }
};
