import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, CreditCard, Banknote, QrCode, Upload, 
  CheckCircle2, Package, ArrowLeft, ChevronDown, ChevronUp,
  Truck, Wallet, Building2, MessageSquare, Loader2,
  ShieldCheck, Headphones, Phone, Lock, Check,
  ShoppingBag, Printer, Droplets, RotateCcw, Facebook, Twitter,
  MessageCircle, Info, Layers, Star, HelpCircle, Scale, Heart, Zap, Minus, Plus
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  details?: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
}

export function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    lineId: '',
    firstName: '',
    lastName: '',
    address: '',
    address2: '',
    subDistrict: '',
    district: '',
    province: '',
    zipCode: '',
    note: ''
  });

  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_settings')
        .select('payment_methods, shipping_methods')
        .single();

      if (error) throw error;

      if (data) {
        const enabledPayments = (data.payment_methods || []).filter((m: any) => m.enabled);
        const enabledShipping = (data.shipping_methods || []).filter((m: any) => m.enabled);
        
        setPaymentMethods(enabledPayments);
        setShippingMethods(enabledShipping);
        
        if (enabledPayments.length > 0) setPaymentMethod(enabledPayments[0].id);
        if (enabledShipping.length > 0) setSelectedShipping(enabledShipping[0]);
      }
    } catch (err) {
      console.error('Error fetching checkout settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const shippingCost = selectedShipping?.price || 0;
  const grandTotal = totalPrice + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    
    setIsOrdering(true);
    
    try {
      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          total_amount: grandTotal,
          status: 'pending',
          address: `${formData.firstName} ${formData.lastName}\n${formData.address} ${formData.address2}\n${formData.subDistrict} ${formData.district} ${formData.province} ${formData.zipCode}`,
          phone: formData.phone,
          payment_method: paymentMethod
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items and update stock
      for (const item of items) {
        // Create order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert([{
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            selected_options: item.selectedOptions
          }]);

        if (itemError) throw itemError;

        // Fetch current stock
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock, title')
          .eq('id', item.id)
          .single();

        if (fetchError) throw fetchError;

        const previousStock = product.stock || 0;
        const newStock = previousStock - item.quantity;

        // Update stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);

        if (stockError) throw stockError;

        // Log inventory change
        await supabase
          .from('inventory_logs')
          .insert([{
            product_id: item.id,
            change_amount: -item.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: 'sale',
            reference_id: order.id,
            user_id: user?.id
          }]);

        // Notify if low stock
        if (newStock <= 5) {
          await notificationService.notifyLowStock(product.title, newStock);
        }
      }

      // 3. Send notification
      await notificationService.notifyNewOrder(
        order.id.slice(0, 8).toUpperCase(), 
        grandTotal, 
        formData.email || user?.email || 'Guest'
      );

      setOrderSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error('Failed to place order:', err);
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ: ' + err.message);
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-kv-orange mx-auto mb-4" size={48} />
          <p className="font-bold text-kv-navy font-thai">กำลังโหลดข้อมูลการชำระเงิน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen font-thai">
      {/* TOP BAR */}
      <div className="bg-[#0f1d33] text-[#ccc] text-xs py-2 hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-4">
            <a href="tel:0955851136" className="hover:text-kv-orange transition-colors flex items-center gap-1">
              <Phone size={12} /> 095-585-1136
            </a>
            <a href="#" className="hover:text-kv-orange transition-colors flex items-center gap-1">
              <MessageCircle size={12} /> LINE: @kingvision
            </a>
          </div>
          <div className="flex items-center gap-1">
            <Lock size={12} /> ชำระเงินปลอดภัย 100%
          </div>
        </div>
      </div>

      {/* HEADER (Simplified) */}
      <header className="bg-kv-navy py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="logo">
            <Link to="/" className="block">
              <h1 className="text-white text-2xl md:text-3xl font-black">KING<span className="text-kv-orange">VISION</span></h1>
              <small className="text-gray-400 text-[8px] md:text-[10px] block tracking-[2px] uppercase">Printer & Supplies</small>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6 text-white text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-kv-orange" />
              <span>ชำระเงินปลอดภัย</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones size={16} className="text-kv-orange" />
              <span>ต้องการช่วยเหลือ? โทร 095-585-1136</span>
            </div>
          </div>
        </div>
      </header>

      {/* BREADCRUMB */}
      <div className="bg-white border-b border-gray-200 py-3 text-[13px]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Link to="/" className="hover:text-kv-orange">หน้าแรก</Link>
            <span>/</span>
            <Link to="/cart" className="hover:text-kv-orange">ตะกร้าสินค้า</Link>
            <span>/</span>
            <span className="text-kv-navy font-bold">ชำระเงิน</span>
          </div>
        </div>
      </div>

      {/* PROGRESS STEPS */}
      <div className="bg-white border-b border-gray-200 py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-0">
            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                <Check size={14} />
              </div>
              <span>ตะกร้าสินค้า</span>
            </div>
            <div className="w-8 md:w-16 h-[2px] bg-green-600 mx-2 md:mx-3"></div>
            
            <div className="flex items-center gap-2 text-kv-orange font-bold text-sm">
              <div className="w-8 h-8 rounded-full bg-kv-orange text-white flex items-center justify-center text-xs">2</div>
              <span>ข้อมูลจัดส่ง</span>
            </div>
            <div className="w-8 md:w-16 h-[2px] bg-gray-200 mx-2 md:mx-3"></div>
            
            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-xs">3</div>
              <span>ชำระเงิน</span>
            </div>
            <div className="w-8 md:w-16 h-[2px] bg-gray-200 mx-2 md:mx-3"></div>
            
            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-xs">4</div>
              <span>ยืนยันคำสั่งซื้อ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT: FORMS */}
          <div className="w-full lg:flex-1 space-y-6">
            
            {/* Step 1: Contact Info */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-3 pb-3 border-b-2 border-kv-orange">
                <span className="w-7 h-7 bg-kv-orange text-white rounded-full flex items-center justify-center text-xs">1</span>
                ข้อมูลติดต่อ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">อีเมล <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="08X-XXX-XXXX" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">LINE ID <span className="text-gray-400 font-normal">(ไม่บังคับ — สำหรับแจ้งสถานะจัดส่ง)</span></label>
                  <input 
                    type="text" 
                    name="lineId"
                    value={formData.lineId}
                    onChange={handleInputChange}
                    placeholder="@your_line_id" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-3 pb-3 border-b-2 border-kv-orange">
                <span className="w-7 h-7 bg-kv-orange text-white rounded-full flex items-center justify-center text-xs">2</span>
                ที่อยู่จัดส่ง
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">ชื่อ <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="ชื่อจริง" 
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">นามสกุล <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="นามสกุล" 
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">ที่อยู่ (บ้านเลขที่ ซอย ถนน) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="เช่น 123/45 ซอยสุขุมวิท 55 ถ.สุขุมวิท" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">ที่อยู่ (เพิ่มเติม)</label>
                  <input 
                    type="text" 
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                    placeholder="อาคาร ชั้น ห้อง (ถ้ามี)" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">แขวง/ตำบล <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="subDistrict"
                      value={formData.subDistrict}
                      onChange={handleInputChange}
                      placeholder="แขวง/ตำบล" 
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">เขต/อำเภอ <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="เขต/อำเภอ" 
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">จังหวัด <span className="text-red-500">*</span></label>
                    <select 
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all appearance-none"
                    >
                      <option value="">เลือกจังหวัด</option>
                      <option value="กรุงเทพมหานคร">กรุงเทพมหานคร</option>
                      <option value="นนทบุรี">นนทบุรี</option>
                      <option value="ปทุมธานี">ปทุมธานี</option>
                      <option value="สมุทรปราการ">สมุทรปราการ</option>
                      <option value="เชียงใหม่">เชียงใหม่</option>
                      <option value="ขอนแก่น">ขอนแก่น</option>
                      <option value="ชลบุรี">ชลบุรี</option>
                      <option value="สงขลา">สงขลา</option>
                      <option value="นครราชสีมา">นครราชสีมา</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-kv-navy">รหัสไปรษณีย์ <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="10110" 
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-kv-navy">หมายเหตุถึงร้านค้า</label>
                  <textarea 
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    placeholder="เช่น ส่งนอกเวลาได้ ฝากไว้ที่ล็อบบี้ เป็นต้น" 
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-kv-orange focus:ring-4 focus:ring-kv-orange/5 transition-all min-h-[80px]"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Step 3: Shipping Options */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-3 pb-3 border-b-2 border-kv-orange">
                <span className="w-7 h-7 bg-kv-orange text-white rounded-full flex items-center justify-center text-xs">3</span>
                วิธีจัดส่ง
              </h2>
              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <label 
                    key={method.id} 
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedShipping?.id === method.id ? 'border-kv-orange bg-orange-50/30' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <input 
                      type="radio" 
                      name="shipping" 
                      checked={selectedShipping?.id === method.id}
                      onChange={() => setSelectedShipping(method)}
                      className="w-5 h-5 accent-kv-orange"
                    />
                    <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-kv-navy shrink-0">
                      {method.name.split(' ')[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-kv-navy">{method.name}</div>
                      <div className="text-xs text-gray-500">จัดส่ง 1-3 วันทำการ ทั่วประเทศ</div>
                    </div>
                    <div className={`text-sm font-bold ${method.price === 0 ? 'text-green-600' : 'text-kv-navy'}`}>
                      {method.price === 0 ? 'ฟรี!' : `฿${method.price.toLocaleString()}`}
                    </div>
                  </label>
                ))}
                {shippingMethods.length === 0 && (
                  <p className="text-center text-gray-400 py-4 italic">ไม่มีตัวเลือกการจัดส่งในขณะนี้</p>
                )}
              </div>
            </div>

            {/* Step 4: Payment Options */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-3 pb-3 border-b-2 border-kv-orange">
                <span className="w-7 h-7 bg-kv-orange text-white rounded-full flex items-center justify-center text-xs">4</span>
                วิธีชำระเงิน
              </h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="space-y-3">
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === method.id ? 'border-kv-orange bg-orange-50/30' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="w-5 h-5 accent-kv-orange"
                      />
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                        method.type === 'bank' ? 'bg-blue-50 text-blue-600' : 
                        method.type === 'promptpay' ? 'bg-green-50 text-green-600' : 
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {method.type === 'bank' ? <Building2 size={20} /> : 
                         method.type === 'promptpay' ? <QrCode size={20} /> : 
                         <Banknote size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-kv-navy">{method.name}</div>
                        <div className="text-xs text-gray-500">{method.description}</div>
                      </div>
                    </label>
                    
                    {paymentMethod === method.id && (
                      <div className="p-4 bg-gray-50 rounded-xl text-xs md:text-sm text-gray-600 leading-relaxed border border-gray-100 animate-fade-in">
                        {method.details && (
                          <div className="whitespace-pre-line">
                            <div className="font-bold text-kv-navy mb-2 flex items-center gap-2">
                              <Info size={14} className="text-kv-orange" /> รายละเอียดการชำระเงิน:
                            </div>
                            {method.details}
                          </div>
                        )}
                        {method.type === 'promptpay' && (
                          <div className="mt-4 text-center bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                            <div className="flex justify-center mb-4">
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/d/df/PromptPay-logo.png" 
                                alt="PromptPay" 
                                className="h-8 object-contain"
                              />
                            </div>
                            <div className="w-48 h-48 bg-white border-4 border-kv-navy rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md relative overflow-hidden">
                              <QrCode size={120} className="text-kv-navy" />
                              <div className="absolute inset-0 bg-gradient-to-tr from-kv-navy/5 to-transparent pointer-events-none"></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-2">สแกน QR Code นี้ด้วยแอปธนาคารของคุณ</p>
                            <div className="flex flex-col items-center gap-2">
                              <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
                                <span className="text-sm font-black text-kv-navy tracking-wider">{method.details || '095-585-1136'}</span>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(method.details?.replace(/-/g, '') || '0955851136');
                                    alert('คัดลอกหมายเลข PromptPay แล้ว');
                                  }}
                                  className="text-[10px] bg-kv-navy text-white px-2 py-1 rounded hover:bg-kv-orange transition-colors"
                                >
                                  คัดลอก
                                </button>
                              </div>
                              <p className="text-[11px] font-bold text-kv-navy">ชื่อบัญชี: {method.account_name || 'บจก. คิงวิชั่น พรินเตอร์'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {paymentMethods.length === 0 && (
                  <p className="text-center text-gray-400 py-4 font-bold">ไม่มีช่องทางการชำระเงินที่เปิดใช้งาน</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="w-full lg:w-[400px] shrink-0 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl">
              <div className="bg-kv-navy text-white p-5 font-black flex items-center gap-3">
                <ShoppingBag className="text-kv-orange" size={20} />
                สรุปคำสั่งซื้อ ({items.length} รายการ)
              </div>
              
              <div className="p-5 border-b border-gray-50 max-h-[400px] overflow-y-auto scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-gray-50 last:border-0">
                    <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center p-2 shrink-0">
                      <img src={item.image_url} alt={item.name} className="max-h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-kv-navy line-clamp-2 mb-1 leading-tight">{item.name}</div>
                      {item.selected_options && item.selected_options.length > 0 && (
                        <div className="mb-1 space-y-0.5">
                          {item.selected_options.map((opt, idx) => (
                            <div key={idx} className="text-[9px] text-gray-400 font-bold">
                              {opt.name}: <span className="text-kv-navy">{opt.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mb-1">จำนวน: {item.quantity}</div>
                      <div className="text-sm font-black text-kv-navy">฿{(item.price * item.quantity).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 border-b border-gray-50">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="กรอกรหัสคูปอง" 
                    className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-kv-orange transition-all"
                  />
                  <button className="px-4 py-2.5 bg-kv-navy text-white rounded-lg font-bold text-xs hover:bg-kv-orange transition-colors">ใช้คูปอง</button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ราคาสินค้า</span>
                  <span className="font-bold text-kv-navy">฿{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ส่วนลดสินค้า</span>
                  <span className="font-bold text-green-600">−฿0</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ค่าจัดส่ง ({selectedShipping?.name || 'ยังไม่ได้เลือก'})</span>
                  <span className={`font-bold ${shippingCost === 0 ? 'text-green-600' : 'text-kv-navy'}`}>
                    {shippingCost === 0 ? 'ฟรี' : `฿${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-4 mt-2 border-t-2 border-gray-100 flex justify-between items-center">
                  <span className="text-lg font-black text-kv-navy">ยอดรวมทั้งสิ้น</span>
                  <span className="text-2xl font-black text-red-600">฿{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={isOrdering || items.length === 0}
                  className="w-full py-4 bg-kv-orange text-white rounded-xl font-black text-lg hover:bg-kv-orange/90 transition-all shadow-lg shadow-kv-orange/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOrdering ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <Lock size={20} /> ยืนยันคำสั่งซื้อ
                    </>
                  )}
                </button>
                <p className="text-center mt-3 text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck size={12} className="text-green-600" /> ข้อมูลของคุณปลอดภัย เข้ารหัสด้วย SSL 256-bit
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 p-5 border-t border-gray-50 bg-gray-50/50">
                {[
                  { icon: <Truck size={18} />, label: 'จัดส่งฟรี' },
                  { icon: <ShieldCheck size={18} />, label: 'รับประกัน' },
                  { icon: <RotateCcw size={18} />, label: 'คืนสินค้า' },
                  { icon: <Headphones size={18} />, label: 'ซัพพอร์ต' }
                ].map((item, idx) => (
                  <div key={idx} className="text-center space-y-1">
                    <div className="text-kv-navy flex justify-center">{item.icon}</div>
                    <div className="text-[9px] font-bold text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER MINI */}
      <footer className="bg-[#0f1d33] text-gray-500 py-8 mt-12 text-center text-xs">
        <div className="container mx-auto px-4">
          <p>&copy; 2026 <Link to="/" className="text-kv-orange hover:underline font-bold">KingVision</Link>. สงวนลิขสิทธิ์ทุกประการ.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="#" className="hover:text-white">นโยบายความเป็นส่วนตัว</Link>
            <Link to="#" className="hover:text-white">ข้อกำหนดการใช้งาน</Link>
            <Link to="#" className="hover:text-white">นโยบายคืนสินค้า</Link>
          </div>
        </div>
      </footer>

      {/* LINE CHAT WIDGET */}
      <a 
        href="https://line.me/R/ti/p/@kingvision" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#00b900] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform z-50"
      >
        <MessageCircle size={28} fill="currentColor" />
      </a>

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 size={56} />
            </div>
            <h2 className="text-3xl font-bold text-kv-navy mb-4 font-thai">สั่งซื้อสำเร็จ!</h2>
            <p className="text-gray-600 mb-10 leading-relaxed font-thai">
              ขอบคุณสำหรับการสั่งซื้อของคุณ หมายเลขคำสั่งซื้อของคุณคือ <span className="font-bold text-kv-navy">#KV-{(Math.random() * 1000000).toFixed(0)}</span> เราได้ส่งอีเมลยืนยันไปยังกล่องจดหมายของคุณแล้ว
            </p>
            <div className="space-y-4 font-thai">
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-kv-navy text-white py-4 rounded-xl font-bold hover:bg-kv-navy/90 transition-all shadow-md"
              >
                กลับสู่หน้าหลัก
              </button>
              <button 
                onClick={() => navigate('/shop')}
                className="w-full bg-gray-50 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
              >
                เลือกซื้อสินค้าต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
