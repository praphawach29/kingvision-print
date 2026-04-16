import React, { useState, useEffect } from 'react';
import { Settings, Save, Bell, Globe, Shield, CreditCard, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Package, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  details?: string;
  account_name?: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
}

interface StoreSettings {
  id?: string;
  store_name: string;
  contact_email: string;
  address: string;
  payment_methods: PaymentMethod[];
  shipping_methods: ShippingMethod[];
  two_factor_enabled: boolean;
  // Notification settings
  line_oa_admin_id?: string;
  line_oa_id?: string;
  line_oa_link?: string;
  line_oa_channel_token?: string;
  line_oa_channel_secret?: string;
  notify_new_order: boolean;
  notify_order_status: boolean;
  notify_low_stock: boolean;
  notify_customer_line: boolean;
  web_notifications_enabled: boolean;
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'KingVision Print',
    contact_email: 'contact@kingvision.com',
    address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    payment_methods: [
      { id: '1', name: 'PromptPay', description: 'ชำระผ่าน QR Code', enabled: true, type: 'promptpay', details: '081-234-5678' },
      { id: '2', name: 'Bank Transfer', description: 'โอนเงินผ่านธนาคาร', enabled: true, type: 'bank', details: 'ธนาคารกสิกรไทย\nเลขที่บัญชี: 123-4-56789-0\nชื่อบัญชี: บจก. คิงวิชั่น' }
    ],
    shipping_methods: [
      { id: '1', name: 'Kerry Express', price: 50, enabled: true },
      { id: '2', name: 'Flash Express', price: 40, enabled: true }
    ],
    two_factor_enabled: false,
    notify_new_order: true,
    notify_order_status: true,
    notify_low_stock: true,
    notify_customer_line: true,
    web_notifications_enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('store_settings')) {
          setError('ไม่พบตาราง store_settings ในฐานข้อมูล กรุณารัน SQL ในไฟล์ supabase_setup.sql');
        }
        throw error;
      }

      if (data) {
        // Ensure arrays exist
        setSettings({
          ...data,
          payment_methods: data.payment_methods || [],
          shipping_methods: data.shipping_methods || []
        });
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      const { error } = await supabase
        .from('store_settings')
        .upsert({ 
          id: settings.id || undefined,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchSettings();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      let msg = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      const rawError = JSON.stringify(err);
      
      if (msg.toLowerCase().includes('store_settings')) {
        msg = 'ไม่พบตาราง store_settings ในฐานข้อมูล กรุณารัน SQL ในไฟล์ supabase_setup.sql ที่หน้า Supabase Dashboard';
      } else if (msg.toLowerCase().includes('row-level security') || err.code === '42501') {
        msg = 'คุณไม่มีสิทธิ์ในการบันทึกข้อมูล (RLS Policy) กรุณาตรวจสอบว่าบัญชีของคุณมีสิทธิ์เป็น Admin ในตาราง profiles หรือรันคำสั่ง SQL ในไฟล์ supabase_setup.sql อีกครั้ง';
      } else if (msg.toLowerCase().includes('schema cache')) {
        msg = 'ระบบฐานข้อมูลยังไม่อัปเดต (Schema Cache) กรุณารันคำสั่ง SQL "NOTIFY pgrst, \'reload schema\';" ใน Supabase SQL Editor';
      }
      
      setError(`${msg}${rawError !== '{}' ? ` (Debug: ${rawError})` : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addPaymentMethod = () => {
    const newMethod: PaymentMethod = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'ช่องทางใหม่',
      description: 'คำอธิบาย',
      enabled: true,
      type: 'custom'
    };
    setSettings({ ...settings, payment_methods: [...settings.payment_methods, newMethod] });
  };

  const removePaymentMethod = (id: string) => {
    setSettings({ ...settings, payment_methods: settings.payment_methods.filter(m => m.id !== id) });
  };

  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setSettings({
      ...settings,
      payment_methods: settings.payment_methods.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const addShippingMethod = () => {
    const newMethod: ShippingMethod = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'ขนส่งใหม่',
      price: 0,
      enabled: true
    };
    setSettings({ ...settings, shipping_methods: [...settings.shipping_methods, newMethod] });
  };

  const removeShippingMethod = (id: string) => {
    setSettings({ ...settings, shipping_methods: settings.shipping_methods.filter(m => m.id !== id) });
  };

  const updateShippingMethod = (id: string, updates: Partial<ShippingMethod>) => {
    setSettings({
      ...settings,
      shipping_methods: settings.shipping_methods.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 font-thai pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-kv-navy flex items-center gap-2">
          <Settings className="text-kv-orange" /> ตั้งค่าระบบ
        </h2>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">บันทึกการตั้งค่าสำเร็จ</span>
          </motion.div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
              <Globe size={18} className="text-blue-500" /> ข้อมูลทั่วไปของร้าน
            </h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">ชื่อร้านค้า</label>
              <input 
                type="text" 
                value={settings.store_name || ''}
                onChange={(e) => setSettings({...settings, store_name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">อีเมลติดต่อ</label>
              <input 
                type="email" 
                value={settings.contact_email || ''}
                onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">ที่อยู่ร้าน</label>
              <textarea 
                rows={3}
                value={settings.address || ''}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none resize-none font-bold text-kv-navy transition-all"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-green-500 rounded-full" />
              <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
                <CreditCard size={18} className="text-green-500" /> การชำระเงิน
              </h3>
            </div>
            <button 
              type="button" 
              onClick={addPaymentMethod}
              className="text-xs font-black text-kv-orange flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> เพิ่มช่องทาง
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {settings.payment_methods.map((method) => (
              <div key={method.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                      {method.type === 'promptpay' ? (
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png" alt="PromptPay" className="h-5 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <CreditCard className="text-blue-500" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={method.name}
                        onChange={(e) => updatePaymentMethod(method.id, { name: e.target.value })}
                        className="font-black text-kv-navy text-sm bg-transparent border-none p-0 focus:ring-0 w-full"
                      />
                      <input 
                        type="text"
                        value={method.description}
                        onChange={(e) => updatePaymentMethod(method.id, { description: e.target.value })}
                        className="text-[10px] text-gray-400 font-bold bg-transparent border-none p-0 focus:ring-0 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={method.enabled}
                        onChange={(e) => updatePaymentMethod(method.id, { enabled: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kv-orange"></div>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => removePaymentMethod(method.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อบัญชี</label>
                  <input 
                    type="text"
                    value={method.account_name || ''}
                    onChange={(e) => updatePaymentMethod(method.id, { account_name: e.target.value })}
                    placeholder="ชื่อบัญชี..."
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px] mb-2"
                  />
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">รายละเอียดเพิ่มเติม (เช่น เลขที่บัญชี)</label>
                  <textarea 
                    value={method.details || ''}
                    onChange={(e) => updatePaymentMethod(method.id, { details: e.target.value })}
                    rows={2}
                    placeholder="ระบุเลขที่บัญชี หรือข้อมูลการชำระเงิน..."
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px] resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
              <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
                <Package size={18} className="text-purple-500" /> การจัดส่ง
              </h3>
            </div>
            <button 
              type="button" 
              onClick={addShippingMethod}
              className="text-xs font-black text-kv-orange flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> เพิ่มขนส่ง
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {settings.shipping_methods.map((method) => (
              <div key={method.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <input 
                    type="text"
                    value={method.name}
                    onChange={(e) => updateShippingMethod(method.id, { name: e.target.value })}
                    className="font-black text-kv-navy text-sm bg-transparent border-none p-0 focus:ring-0"
                    placeholder="ชื่อขนส่ง"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">฿</span>
                    <input 
                      type="number"
                      value={method.price}
                      onChange={(e) => updateShippingMethod(method.id, { price: Number(e.target.value) })}
                      className="font-black text-kv-navy text-sm bg-transparent border-none p-0 focus:ring-0 w-20"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={method.enabled}
                      onChange={(e) => updateShippingMethod(method.id, { enabled: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kv-orange"></div>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => removeShippingMethod(method.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/30 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-red-500 rounded-full" />
            <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
              <Shield size={18} className="text-red-500" /> ความปลอดภัย
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-kv-navy text-sm">2-Factor Authentication</p>
                <p className="text-[10px] text-gray-400 font-bold">เพิ่มความปลอดภัยในการเข้าสู่ระบบ</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.two_factor_enabled}
                  onChange={(e) => setSettings({...settings, two_factor_enabled: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kv-orange"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
            <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
              <Bell size={18} className="text-orange-500" /> การแจ้งเตือน
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-kv-navy uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" /> Web Notifications
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="font-bold text-kv-navy text-xs">เปิดใช้งานการแจ้งเตือนบนเว็บ</p>
                    <p className="text-[10px] text-gray-400">แสดงการแจ้งเตือนเมื่อมีออเดอร์ใหม่ขณะเปิดหน้าเว็บ</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.web_notifications_enabled}
                      onChange={(e) => setSettings({...settings, web_notifications_enabled: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kv-orange"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-kv-navy uppercase tracking-wider flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-4 h-4" referrerPolicy="no-referrer" /> LINE OA (Messaging API)
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Line OA ID</label>
                    <input 
                      type="text" 
                      value={settings.line_oa_id || ''}
                      onChange={(e) => setSettings({...settings, line_oa_id: e.target.value})}
                      placeholder="เช่น @kingvision"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Line OA Link</label>
                    <input 
                      type="text" 
                      value={settings.line_oa_link || ''}
                      onChange={(e) => setSettings({...settings, line_oa_link: e.target.value})}
                      placeholder="เช่น https://line.me/R/ti/p/@kingvision"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Admin User ID / Group ID</label>
                    <input 
                      type="text" 
                      value={settings.line_oa_admin_id || ''}
                      onChange={(e) => setSettings({...settings, line_oa_admin_id: e.target.value})}
                      placeholder="ใส่ ID สำหรับรับแจ้งเตือน (Uxxxx...)"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-xs"
                    />
                    <p className="text-[9px] text-gray-400 font-bold px-1 italic">* ใช้สำหรับส่ง Push Message แจ้งเตือนแอดมิน</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Channel Access Token</label>
                    <input 
                      type="password" 
                      value={settings.line_oa_channel_token || ''}
                      onChange={(e) => setSettings({...settings, line_oa_channel_token: e.target.value})}
                      placeholder="ใส่ Long-lived Channel Access Token..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">หัวข้อที่ต้องการแจ้งเตือน</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'notify_new_order', label: 'ออเดอร์ใหม่', icon: ShoppingCart },
                  { id: 'notify_order_status', label: 'อัปเดตสถานะ', icon: Package },
                  { id: 'notify_low_stock', label: 'สินค้าสต็อกต่ำ', icon: AlertCircle },
                  { id: 'notify_customer_line', label: 'แจ้งเตือนลูกค้า (LINE)', icon: Bell },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <label key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={(settings as any)[item.id]}
                        onChange={(e) => setSettings({...settings, [item.id]: e.target.checked})}
                        className="w-4 h-4 rounded text-kv-orange focus:ring-kv-orange"
                      />
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-kv-navy" />
                        <span className="text-xs font-bold text-kv-navy">{item.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-4 bg-kv-navy text-white rounded-2xl font-black uppercase tracking-wider hover:bg-kv-orange transition-all flex items-center justify-center gap-2 shadow-xl shadow-kv-navy/20 disabled:opacity-70 active:scale-95"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            บันทึกการตั้งค่า
          </button>
        </div>
      </form>
    </div>
  );
}
