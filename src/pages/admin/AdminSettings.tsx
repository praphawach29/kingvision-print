import React, { useState, useEffect } from 'react';
import { Settings, Save, Bell, Globe, Shield, CreditCard, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Package, ShoppingCart, Bot, BookOpen, Edit2, ToggleLeft, ToggleRight, Wifi, WifiOff, RefreshCw, Phone, Mail, Clock, MapPin, ImagePlus, X } from 'lucide-react';
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
  // Payment settings
  promptpay_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  logo_url?: string;
  // Contact page fields
  phone_main?: string;
  phone_support?: string;
  email_sales?: string;
  business_hours?: string;
  map_embed_url?: string;
  // AI settings
  ai_provider?: 'gemini' | 'openai' | 'anthropic';
  ai_model?: string;
  ai_enabled?: boolean;
  ai_persona_name?: string;
  ai_system_prompt?: string;
  ai_speaking_style?: 'friendly' | 'professional' | 'casual';
  ai_temperature?: number;
  ai_gender?: 'male' | 'female';
}

interface AiStatus {
  state: 'idle' | 'testing' | 'ok' | 'error';
  provider?: string;
  model?: string;
  latency?: number;
  error?: string;
}

interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

const AI_MODEL_OPTIONS: Record<'gemini' | 'openai' | 'anthropic', string[]> = {
  gemini:    ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite'],
  openai:    ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-3-5-sonnet-latest']
};

export function AdminSettings() {
  const [loading, setLoading]       = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [kbItems, setKbItems]       = useState<KBItem[]>([]);
  const [kbLoading, setKbLoading]   = useState(false);
  const [editingKB, setEditingKB]   = useState<Partial<KBItem> | null>(null);
  const [aiStatus, setAiStatus]     = useState<AiStatus>({ state: 'idle' });
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'KingVision Print',
    contact_email: 'contact@kingvision.com',
    address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    phone_main: '095-585-1136',
    phone_support: '',
    email_sales: '',
    business_hours: 'จันทร์ - เสาร์: 09:00 - 18:00 น.\nหยุดวันอาทิตย์และวันหยุดนักขัตฤกษ์',
    map_embed_url: '',
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
    ai_provider: 'gemini',
    ai_model: 'gemini-1.5-flash',
    ai_enabled: true,
    ai_persona_name: 'น้องคิง',
    ai_system_prompt: '',
    ai_speaking_style: 'friendly',
    ai_temperature: 0.7,
    ai_gender: 'male',
  });

  useEffect(() => {
    fetchSettings();
    fetchKnowledgeBase();
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

  async function fetchKnowledgeBase() {
    setKbLoading(true);
    try {
      const { data } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('sort_order')
        .order('created_at');
      setKbItems(data || []);
    } finally {
      setKbLoading(false);
    }
  }

  const saveKBItem = async () => {
    if (!editingKB?.question?.trim() || !editingKB?.answer?.trim()) return;
    try {
      if (editingKB.id) {
        await supabase.from('ai_knowledge_base').update({
          question:   editingKB.question,
          answer:     editingKB.answer,
          category:   editingKB.category || 'general',
          is_active:  editingKB.is_active ?? true,
          updated_at: new Date().toISOString()
        }).eq('id', editingKB.id);
      } else {
        await supabase.from('ai_knowledge_base').insert({
          question:  editingKB.question,
          answer:    editingKB.answer,
          category:  editingKB.category || 'general',
          is_active: true,
          sort_order: kbItems.length
        });
      }
      setEditingKB(null);
      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to save KB item:', err);
    }
  };

  const deleteKBItem = async (id: string) => {
    if (!confirm('ต้องการลบข้อมูลนี้ใช่ไหม?')) return;
    await supabase.from('ai_knowledge_base').delete().eq('id', id);
    fetchKnowledgeBase();
  };

  const toggleKBItem = async (item: KBItem) => {
    await supabase.from('ai_knowledge_base')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    fetchKnowledgeBase();
  };

  const testAiConnection = async () => {
    setAiStatus({ state: 'testing' });
    try {
      const res = await fetch('/api/ai/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.ai_provider,
          model: settings.ai_model,
        }),
      });
      const data = await res.json();
      if (data.connected) {
        setAiStatus({ state: 'ok', provider: data.provider, model: data.model, latency: data.latency });
      } else {
        setAiStatus({ state: 'error', error: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setAiStatus({ state: 'error', error: err.message || 'Network error' });
    }
  };

  const saveAiSettingsInstant = async (next: StoreSettings) => {
    try {
      await supabase.from('store_settings').upsert({
        id:               next.id || undefined,
        ai_provider:      next.ai_provider      || 'gemini',
        ai_model:         next.ai_model         || 'gemini-1.5-flash',
        ai_enabled:       next.ai_enabled       ?? true,
        ai_persona_name:  next.ai_persona_name  || 'น้องคิง',
        ai_system_prompt: next.ai_system_prompt || '',
        ai_speaking_style:next.ai_speaking_style|| 'friendly',
        ai_temperature:   next.ai_temperature   ?? 0.7,
        ai_gender:        next.ai_gender        || 'male',
        updated_at:       new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to save AI settings instantly:', err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/store-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setSettings(prev => ({ ...prev, logo_url: data.publicUrl }));
    } catch (err: any) {
      setError(`อัปโหลดโลโก้ไม่สำเร็จ: ${err.message}`);
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const addPaymentMethod = () => {
    const newMethod: PaymentMethod = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'โอนเงิน PromptPay',
      description: 'สแกน QR Code หรือโอนผ่าน PromptPay',
      enabled: true,
      type: 'promptpay'
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
        {/* Store Logo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-kv-orange rounded-full" />
            <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
              <ImagePlus size={18} className="text-kv-orange" /> โลโก้ร้านค้า
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-6 flex-wrap">
              <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="store logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center text-gray-300">
                    <ImagePlus size={28} className="mx-auto mb-1" />
                    <span className="text-[10px] font-bold">ยังไม่มีโลโก้</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-xs text-gray-500 font-bold">อัปโหลดโลโก้ร้านค้า (PNG, JPG, SVG) — แนะนำขนาด 200×200px ขึ้นไป พื้นหลังโปร่งใสจะแสดงผลดีที่สุด</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className={`cursor-pointer px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${logoUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-kv-navy text-white hover:bg-kv-orange'}`}>
                    {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {logoUploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {settings.logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, logo_url: '' }))}
                      className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-red-100 transition-all"
                    >
                      <X size={14} /> ลบโลโก้
                    </button>
                  )}
                </div>
                {settings.logo_url && (
                  <p className="text-[10px] text-gray-400 font-bold break-all">{settings.logo_url}</p>
                )}
                <p className="text-[10px] text-gray-400">โลโก้จะแสดงที่ Header และ Footer ของหน้าร้านค้า</p>
              </div>
            </div>
          </div>
        </div>

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

        {/* Contact Page Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-kv-orange rounded-full" />
            <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
              <Phone size={18} className="text-kv-orange" /> ข้อมูลหน้าติดต่อเรา
            </h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Phone size={12} /> เบอร์โทรหลัก
              </label>
              <input
                type="text"
                value={settings.phone_main || ''}
                onChange={(e) => setSettings({ ...settings, phone_main: e.target.value })}
                placeholder="เช่น 095-585-1136"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Phone size={12} /> เบอร์โทรซัพพอร์ต (ถ้ามี)
              </label>
              <input
                type="text"
                value={settings.phone_support || ''}
                onChange={(e) => setSettings({ ...settings, phone_support: e.target.value })}
                placeholder="เช่น 081-234-5678"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Mail size={12} /> อีเมลฝ่ายขาย (ถ้ามี)
              </label>
              <input
                type="email"
                value={settings.email_sales || ''}
                onChange={(e) => setSettings({ ...settings, email_sales: e.target.value })}
                placeholder="sales@yourdomain.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> เวลาทำการ
              </label>
              <textarea
                rows={2}
                value={settings.business_hours || ''}
                onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })}
                placeholder={'จันทร์ - เสาร์: 09:00 - 18:00 น.\nหยุดวันอาทิตย์'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none resize-none font-bold text-kv-navy transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={12} /> Google Maps Embed URL
              </label>
              <input
                type="url"
                value={settings.map_embed_url || ''}
                onChange={(e) => setSettings({ ...settings, map_embed_url: e.target.value })}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
              />
              <p className="text-[11px] text-gray-400">⚠️ ต้องใช้ <strong>Embed URL</strong> เท่านั้น: Google Maps → Share → <strong>Embed a map</strong> → คัดลอก URL จาก src="..." (ไม่ใช่ลิงก์แชร์ทั่วไป)</p>
              <p className="text-[11px] text-blue-500 font-bold">หากใส่ลิงก์แชร์ธรรมดา (maps.app.goo.gl หรือ goo.gl) จะแสดงเป็นปุ่ม "เปิดใน Google Maps" แทน</p>
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
                      {method.type === 'promptpay' || method.type === 'qr' ? (
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png" alt="PromptPay" className="h-5 object-contain" referrerPolicy="no-referrer" />
                      ) : method.type === 'cod' ? (
                        <span className="text-lg">🚚</span>
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
                
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  {/* Type selector */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ประเภทการชำระเงิน</label>
                    <select
                      value={method.type}
                      onChange={(e) => {
                        const typeNameMap: Record<string, string> = {
                          promptpay: 'โอนเงิน PromptPay',
                          bank_transfer: 'โอนเงินผ่านธนาคาร',
                          cod: 'เก็บเงินปลายทาง',
                          custom: 'ช่องทางอื่นๆ',
                        };
                        const defaultDescMap: Record<string, string> = {
                          promptpay: 'สแกน QR Code หรือโอนผ่าน PromptPay',
                          bank_transfer: 'โอนเงินเข้าบัญชีธนาคาร',
                          cod: 'ชำระเงินเมื่อได้รับสินค้า',
                          custom: 'คำอธิบาย',
                        };
                        const newType = e.target.value;
                        updatePaymentMethod(method.id, {
                          type: newType,
                          name: typeNameMap[newType] || method.name,
                          description: defaultDescMap[newType] || method.description,
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                    >
                      <option value="promptpay">PromptPay / QR Code</option>
                      <option value="bank_transfer">โอนบัญชีธนาคาร</option>
                      <option value="cod">เก็บเงินปลายทาง (COD)</option>
                      <option value="custom">อื่นๆ</option>
                    </select>
                  </div>
                  {method.type === 'promptpay' || method.type === 'qr' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">PromptPay ID (เบอร์โทร หรือ เลขบัตรประชาชน)</label>
                        <input
                          type="text"
                          value={settings.promptpay_id || ''}
                          onChange={e => setSettings(prev => ({ ...prev, promptpay_id: e.target.value }))}
                          placeholder="เช่น 0812345678"
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อบัญชี (แสดงใต้ QR)</label>
                        <input
                          type="text"
                          value={settings.bank_account_name || ''}
                          onChange={e => setSettings(prev => ({ ...prev, bank_account_name: e.target.value }))}
                          placeholder="เช่น บจก. คิงวิชั่น"
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                    </>
                  ) : method.type === 'cod' ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      <p className="text-[11px] font-bold text-green-700">🚚 ไม่ต้องกรอกข้อมูลเพิ่มเติม — ลูกค้าชำระเงินเมื่อรับสินค้า</p>
                    </div>
                  ) : method.type === 'bank_transfer' || method.type === 'transfer' || method.type === 'bank' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ธนาคาร</label>
                        <input
                          type="text"
                          value={settings.bank_name || ''}
                          onChange={e => setSettings(prev => ({ ...prev, bank_name: e.target.value }))}
                          placeholder="เช่น ธนาคารกสิกรไทย"
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">เลขที่บัญชี</label>
                        <input
                          type="text"
                          value={settings.bank_account || ''}
                          onChange={e => setSettings(prev => ({ ...prev, bank_account: e.target.value }))}
                          placeholder="เช่น 123-4-56789-0"
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อบัญชี</label>
                        <input
                          type="text"
                          value={settings.bank_account_name || ''}
                          onChange={e => setSettings(prev => ({ ...prev, bank_account_name: e.target.value }))}
                          placeholder="เช่น บจก. คิงวิชั่น"
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อบัญชี</label>
                        <input
                          type="text"
                          value={method.account_name || ''}
                          onChange={(e) => updatePaymentMethod(method.id, { account_name: e.target.value })}
                          placeholder="ชื่อบัญชี..."
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">รายละเอียดเพิ่มเติม</label>
                        <textarea
                          value={method.details || ''}
                          onChange={(e) => updatePaymentMethod(method.id, { details: e.target.value })}
                          rows={2}
                          placeholder="ระบุข้อมูลการชำระเงิน..."
                          className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-[11px] resize-none"
                        />
                      </div>
                    </>
                  )}
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
                      value={method.price === 0 ? '' : method.price}
                      onChange={(e) => updateShippingMethod(method.id, { price: e.target.value === '' ? 0 : Number(e.target.value) })}
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

        {/* AI Chatbot Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
                  <Bot size={18} className="text-indigo-500" /> AI Chatbot
                </h3>
              </div>
              {/* Connection status badge */}
              <div className="flex items-center gap-2">
                {aiStatus.state === 'idle' && (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">ยังไม่ได้ทดสอบ</span>
                )}
                {aiStatus.state === 'testing' && (
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> กำลังทดสอบ...
                  </span>
                )}
                {aiStatus.state === 'ok' && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Wifi size={10} /> เชื่อมต่อสำเร็จ {aiStatus.latency ? `(${aiStatus.latency}ms)` : ''}
                  </span>
                )}
                {aiStatus.state === 'error' && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1 max-w-[220px] truncate" title={aiStatus.error}>
                    <WifiOff size={10} /> {aiStatus.error}
                  </span>
                )}
                <button
                  type="button"
                  onClick={testAiConnection}
                  disabled={aiStatus.state === 'testing'}
                  className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full hover:bg-indigo-100 transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw size={10} /> ทดสอบ
                </button>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ai_enabled ?? true}
                onChange={e => {
                  const next = { ...settings, ai_enabled: e.target.checked };
                  setSettings(next);
                  saveAiSettingsInstant(next);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500" />
            </label>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Provider + Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">AI Provider</label>
                <select
                  value={settings.ai_provider || 'gemini'}
                  onChange={e => {
                    const provider = e.target.value as 'gemini' | 'openai' | 'anthropic';
                    const next = { ...settings, ai_provider: provider, ai_model: AI_MODEL_OPTIONS[provider][0] };
                    setSettings(next);
                    saveAiSettingsInstant(next);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Model</label>
                <input
                  type="text"
                  list={`model-list-${settings.ai_provider || 'gemini'}`}
                  value={settings.ai_model || AI_MODEL_OPTIONS[(settings.ai_provider || 'gemini')][0]}
                  onChange={e => {
                    const next = { ...settings, ai_model: e.target.value };
                    setSettings(next);
                  }}
                  onBlur={e => {
                    if (e.target.value.trim()) saveAiSettingsInstant({ ...settings, ai_model: e.target.value.trim() });
                  }}
                  placeholder="พิมพ์ model ID หรือเลือกจากรายการ"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                />
                <datalist id={`model-list-${settings.ai_provider || 'gemini'}`}>
                  {AI_MODEL_OPTIONS[(settings.ai_provider || 'gemini')].map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Persona + Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">ชื่อ AI (Persona Name)</label>
                <input
                  type="text"
                  value={settings.ai_persona_name || ''}
                  onChange={e => setSettings({ ...settings, ai_persona_name: e.target.value })}
                  placeholder="เช่น น้องคิง"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">สไตล์การพูด</label>
                <select
                  value={settings.ai_speaking_style || 'friendly'}
                  onChange={e => setSettings({ ...settings, ai_speaking_style: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                >
                  <option value="friendly">เป็นมิตร / อบอุ่น (Friendly)</option>
                  <option value="professional">มืออาชีพ (Professional)</option>
                  <option value="casual">เป็นกันเอง (Casual)</option>
                </select>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">เพศของ AI</label>
              <div className="flex gap-3">
                {([
                  { value: 'male',   label: '👨 ชาย', sub: 'ใช้ "ครับ" / "ผม"' },
                  { value: 'female', label: '👩 หญิง', sub: 'ใช้ "ค่ะ/คะ" / "หนู"' },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      (settings.ai_gender || 'male') === opt.value
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-100 bg-gray-50 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai_gender"
                      value={opt.value}
                      checked={(settings.ai_gender || 'male') === opt.value}
                      onChange={() => setSettings({ ...settings, ai_gender: opt.value })}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-black text-kv-navy text-sm">{opt.label}</div>
                      <div className="text-[10px] text-gray-400 font-bold">{opt.sub}</div>
                    </div>
                    {(settings.ai_gender || 'male') === opt.value && (
                      <CheckCircle2 size={16} className="text-indigo-500 ml-auto shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">ความสร้างสรรค์ (Temperature)</label>
                <span className="text-xs font-black text-indigo-600">{(settings.ai_temperature ?? 0.7).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={settings.ai_temperature ?? 0.7}
                onChange={e => setSettings({ ...settings, ai_temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400">
                <span>ตอบตรงๆ แม่นยำ</span>
                <span>สร้างสรรค์ ยืดหยุ่น</span>
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">System Prompt พิเศษ (เพิ่มเติม)</label>
              <textarea
                rows={4}
                value={settings.ai_system_prompt || ''}
                onChange={e => setSettings({ ...settings, ai_system_prompt: e.target.value })}
                placeholder="เช่น: ถ้าลูกค้าถามราคา ให้แจ้งว่าราคาอาจเปลี่ยนได้ กรุณาโทรยืนยันก่อนสั่งซื้อ&#10;เช่น: โปรโมชั่นพิเศษเดือนนี้ ซื้อ 2 แถม 1 สินค้าหมึก Epson..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all resize-none text-sm"
              />
              <p className="text-[10px] text-gray-400 font-bold px-1">คำสั่งนี้จะถูกเพิ่มต่อท้าย system prompt หลัก สามารถใส่โปรโมชั่น นโยบายพิเศษ หรือข้อมูลสำคัญได้</p>
            </div>

            {/* API Keys note */}
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[11px] text-indigo-700 font-bold">
                🔑 API Key ต้องตั้งค่าใน Environment Variables ของ Vercel (ไม่เก็บในฐานข้อมูล):<br />
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code>{' '}
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">OPENAI_API_KEY</code>{' '}
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">ANTHROPIC_API_KEY</code>{' '}
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">SUPABASE_SERVICE_ROLE_KEY</code>
              </p>
            </div>
          </div>
        </div>

        {/* AI Knowledge Base */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-teal-500 rounded-full" />
              <h3 className="font-black text-kv-navy flex items-center gap-2 text-sm sm:text-base">
                <BookOpen size={18} className="text-teal-500" /> คลังความรู้ AI (Knowledge Base)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingKB({ question: '', answer: '', category: 'general', is_active: true })}
              className="text-xs font-black text-teal-600 flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> เพิ่มคำถาม
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-[11px] text-gray-500 font-bold">
              เพิ่มคำถาม-คำตอบที่ AI จะใช้ตอบลูกค้า เช่น นโยบายร้าน โปรโมชั่น ข้อมูลสินค้าพิเศษ
            </p>

            {/* Edit/Add Form */}
            {editingKB && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-teal-50 rounded-2xl border border-teal-100 space-y-3"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">คำถาม</label>
                  <input
                    type="text"
                    value={editingKB.question || ''}
                    onChange={e => setEditingKB({ ...editingKB, question: e.target.value })}
                    placeholder="เช่น ร้านเปิดกี่โมง?"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none font-bold text-kv-navy text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">คำตอบ</label>
                  <textarea
                    rows={3}
                    value={editingKB.answer || ''}
                    onChange={e => setEditingKB({ ...editingKB, answer: e.target.value })}
                    placeholder="เช่น ร้านเปิดวันจันทร์-เสาร์ เวลา 9:00-18:00 น. ครับ"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none font-bold text-kv-navy text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">หมวดหมู่</label>
                    <select
                      value={editingKB.category || 'general'}
                      onChange={e => setEditingKB({ ...editingKB, category: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none font-bold text-kv-navy text-sm"
                    >
                      <option value="general">ทั่วไป</option>
                      <option value="product">สินค้า</option>
                      <option value="shipping">การจัดส่ง</option>
                      <option value="warranty">ประกัน/ซ่อม</option>
                      <option value="invoice">ใบกำกับภาษี</option>
                      <option value="promotion">โปรโมชั่น</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={saveKBItem}
                      disabled={!editingKB.question?.trim() || !editingKB.answer?.trim()}
                      className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-black text-sm hover:bg-teal-600 transition-all disabled:opacity-40"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKB(null)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm hover:bg-gray-200 transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* KB List */}
            {kbLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-teal-400" size={24} />
              </div>
            ) : kbItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm font-bold">
                ยังไม่มีข้อมูลในคลังความรู้ กด "เพิ่มคำถาม" เพื่อเริ่มต้น
              </div>
            ) : (
              <div className="space-y-2">
                {kbItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex gap-3 items-start transition-all ${
                      item.is_active ? 'bg-gray-50 border-gray-100' : 'bg-gray-100/50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-kv-navy text-xs truncate">{item.question}</span>
                        <span className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-black uppercase">{item.category}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => toggleKBItem(item)} className="p-1.5 rounded-lg hover:bg-white transition-all text-gray-400 hover:text-teal-500" title={item.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                        {item.is_active ? <ToggleRight size={16} className="text-teal-500" /> : <ToggleLeft size={16} />}
                      </button>
                      <button type="button" onClick={() => setEditingKB(item)} className="p-1.5 rounded-lg hover:bg-white transition-all text-gray-400 hover:text-blue-500">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" onClick={() => deleteKBItem(item.id)} className="p-1.5 rounded-lg hover:bg-white transition-all text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
