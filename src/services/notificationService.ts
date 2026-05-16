import { supabase } from '../lib/supabase';
import { lineFlexTemplates } from './lineFlexTemplates';

export const notificationService = {
  async sendLineMessage(messages: any[]) {
    try {
      const { data: settings, error } = await supabase
        .from('store_settings')
        .select('line_oa_channel_token, line_oa_admin_id')
        .single();

      if (error || !settings?.line_oa_channel_token || !settings?.line_oa_admin_id) return;

      console.log('Sending LINE OA Flex Messages');

      // Call our backend proxy
      const response = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.line_oa_admin_id,
          channelAccessToken: settings.line_oa_channel_token,
          messages,
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send LINE message');
      }
    } catch (err) {
      console.error('Error sending LINE OA notification:', err);
    }
  },

  async sendLineMessageTo(lineUserId: string, messages: any[]) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('line_oa_channel_token')
        .single();
      if (!settings?.line_oa_channel_token) return;
      await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lineUserId, channelAccessToken: settings.line_oa_channel_token, messages }),
      });
    } catch (err) {
      console.error('Error sending LINE message to customer:', err);
    }
  },

  async notifyShipped(orderId: string, orderRef: string, trackingNumber: string, shippingProvider: string, customerPhone: string, customerName: string) {
    try {
      const { lineFlexTemplates } = await import('./lineFlexTemplates');
      const siteUrl = (import.meta as any).env?.VITE_SITE_URL || 'https://kingvision-print.vercel.app';

      // Look up customer's LINE userId by phone number from line_leads
      const { data: lead } = await supabase
        .from('line_leads')
        .select('user_id')
        .eq('phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lead?.user_id) {
        const flexData = lineFlexTemplates.shippedCustomer(orderRef, trackingNumber, shippingProvider, customerName, siteUrl);
        await this.sendLineMessageTo(lead.user_id, [{
          type: 'flex',
          altText: `📦 สินค้าของคุณถูกจัดส่งแล้ว! เลขพัสดุ: ${trackingNumber}`,
          contents: flexData,
        }]);
      }
    } catch (err) {
      console.error('Error in notifyShipped:', err);
    }
  },

  async notifyNewOrder(orderId: string, total: number, customerName: string) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('notify_new_order')
        .single();

      if (!settings || settings.notify_new_order !== false) {
        // Use Flex Message Template
        const flexData = lineFlexTemplates.newOrder(orderId, total, customerName);
        
        await this.sendLineMessage([
          {
            type: 'flex',
            altText: `📦 ออเดอร์ใหม่! #${orderId}`,
            contents: flexData
          }
        ]);
      }
    } catch (err) {
      console.error('Error in notifyNewOrder:', err);
    }
  },

  async notifyPaymentSlip(orderId: string, orderRef: string, total: number, customerName: string, slipUrl: string, paymentMethod: string) {
    try {
      const flexData = lineFlexTemplates.paymentSlip(orderId, orderRef, total, customerName, slipUrl, paymentMethod);
      await this.sendLineMessage([{
        type: 'flex',
        altText: `💰 แจ้งชำระเงิน #${orderRef} — ${customerName} ฿${total.toLocaleString()}`,
        contents: flexData,
      }]);
    } catch (err) {
      console.error('Error in notifyPaymentSlip:', err);
    }
  },

  async notifyStatusUpdate(orderId: string, status: string, userId?: string) {
    try {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('notify_order_status, notify_customer_line')
        .single();

      const statusMap: any = {
        'pending': { label: 'รอชำระเงิน', color: '#f1c40f' },
        'processing': { label: 'กำลังจัดเตรียมสินค้า', color: '#3498db' },
        'shipped': { label: 'จัดส่งสินค้าแล้ว', color: '#9b59b6' },
        'completed': { label: 'เสร็จสิ้น', color: '#2ecc71' },
        'cancelled': { label: 'ยกเลิกแล้ว', color: '#e74c3c' }
      };
      
      const statusInfo = statusMap[status] || { label: status, color: '#eb6c00' };
      const statusLabel = statusInfo.label;

      // 1. Send LINE (Admin/System) - Use Flex Message
      if (!settings || settings.notify_order_status) {
        const flexData = lineFlexTemplates.statusUpdate(orderId.slice(0, 8), statusLabel, statusInfo.color);
        await this.sendLineMessage([
          {
            type: 'flex',
            altText: `🔔 อัปเดตสถานะออเดอร์ #${orderId.slice(0, 8)}`,
            contents: flexData
          }
        ]);
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
        const flexData = lineFlexTemplates.lowStock(productName, currentStock);
        await this.sendLineMessage([
          {
            type: 'flex',
            altText: `⚠️ สินค้าสต็อกต่ำ!: ${productName}`,
            contents: flexData
          }
        ]);
      }
    } catch (err) {
      console.error('Error in notifyLowStock:', err);
    }
  }
};
