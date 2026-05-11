import React, { useState, useEffect } from 'react';
import { Search, Truck, Package, CheckCircle2, Clock, AlertCircle, MapPin, Phone, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

interface OrderTrackingInfo {
  id: string;
  created_at: string;
  status: string;
  tracking_number?: string;
  shipping_provider?: string;
  shipped_at?: string;
  total_amount: number;
  address: string;
  order_items: {
    quantity: number;
    products: {
      title: string;
      image_url: string;
    }
  }[];
}

export function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderTrackingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      performTracking(id);
    }
  }, [searchParams]);

  const performTracking = async (id: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          tracking_number,
          shipping_provider,
          shipped_at,
          total_amount,
          address,
          order_items (
            quantity,
            products (
              title,
              image_url
            )
          )
        `);

      if (id.length === 8) {
        query = query.ilike('id', `${id}%`);
      } else {
        query = query.eq('id', id);
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('ไม่พบรหัสออเดอร์นี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง');
        }
        throw fetchError;
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    performTracking(orderId);
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'processing', 'shipped', 'completed'];
    return steps.indexOf(status);
  };

  const statusMap: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: 'รอชำระเงิน', icon: Clock, color: 'text-yellow-500' },
    processing: { label: 'กำลังเตรียมสินค้า', icon: Package, color: 'text-blue-500' },
    shipped: { label: 'จัดส่งแล้ว', icon: Truck, color: 'text-purple-500' },
    completed: { label: 'ได้รับสินค้าแล้ว', icon: CheckCircle2, color: 'text-green-500' },
    cancelled: { label: 'ยกเลิกออเดอร์', icon: AlertCircle, color: 'text-red-500' }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-thai pb-20">
      {/* Header */}
      <div className="bg-kv-navy text-white py-12 px-4 text-center">
        <h1 className="text-3xl font-black mb-4">ติดตามสถานะออเดอร์</h1>
        <p className="text-gray-300 max-w-md mx-auto">กรอกรหัสออเดอร์ของคุณเพื่อตรวจสอบสถานะการจัดส่งแบบเรียลไทม์</p>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        <div className="max-w-3xl mx-auto">
          {/* Search Form */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8">
            <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="รหัสออเดอร์ (เช่น 8 ตัวแรก)" 
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                />
                <Search className="absolute left-4 top-4 text-gray-400" size={24} />
              </div>
              <button 
                type="submit"
                disabled={loading || !orderId.trim()}
                className="px-8 py-4 bg-kv-orange text-white rounded-2xl font-black text-lg hover:bg-kv-navy transition-all shadow-lg shadow-kv-orange/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Truck size={20} />}
                ติดตามเลย
              </button>
            </form>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <AlertCircle size={18} /> {error}
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {order && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Status Progress */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-xl font-black text-kv-navy">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()}</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">สั่งซื้อเมื่อ {new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className={`flex items-center gap-2 font-black ${statusMap[order.status]?.color || 'text-gray-400'}`}>
                      {React.createElement(statusMap[order.status]?.icon || AlertCircle, { size: 20 })}
                      {statusMap[order.status]?.label}
                    </div>
                  </div>

                  {order.status !== 'cancelled' && (
                    <div className="relative px-2">
                      <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-0" />
                      <div 
                        className="absolute top-5 left-0 h-1 bg-kv-orange transition-all duration-1000 -z-0" 
                        style={{ width: `${(getStatusStep(order.status) / 3) * 100}%` }}
                      />
                      <div className="flex justify-between relative z-10">
                        {['pending', 'processing', 'shipped', 'completed'].map((s, i) => {
                          const Icon = statusMap[s].icon;
                          const isActive = getStatusStep(order.status) >= i;
                          return (
                            <div key={s} className="flex flex-col items-center gap-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all ${isActive ? 'bg-kv-orange text-white' : 'bg-gray-200 text-gray-400'}`}>
                                <Icon size={18} />
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-kv-navy' : 'text-gray-400'}`}>
                                {statusMap[s].label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tracking Details */}
                {(order.tracking_number || order.shipping_provider) && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                    <h3 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-2">
                      <Truck className="text-kv-orange" size={20} /> ข้อมูลการจัดส่ง
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">ขนส่งโดย</p>
                        <p className="text-lg font-black text-kv-navy">{order.shipping_provider || 'ไม่ระบุ'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">เลขพัสดุ</p>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-black text-purple-600">{order.tracking_number || 'กำลังเตรียมเลขพัสดุ'}</p>
                          {order.tracking_number && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(order.tracking_number!);
                                alert('คัดลอกเลขพัสดุแล้ว');
                              }}
                              className="text-xs font-bold text-kv-orange hover:underline"
                            >
                              คัดลอก
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {order.shipped_at && (
                      <p className="mt-4 text-xs text-gray-400 font-bold text-center">
                        จัดส่งเมื่อ: {new Date(order.shipped_at).toLocaleString('th-TH')}
                      </p>
                    )}
                  </div>
                )}

                {/* Order Summary */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                  <h3 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-2">
                    <Package className="text-kv-orange" size={20} /> รายการสินค้า
                  </h3>
                  <div className="space-y-4">
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-all">
                        <img 
                          src={item.products.image_url} 
                          alt="" 
                          className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-kv-navy text-sm line-clamp-1">{item.products.title}</p>
                          <p className="text-xs text-gray-400 font-bold">จำนวน {item.quantity} ชิ้น</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className="font-bold text-gray-400">ยอดรวมทั้งหมด</span>
                      <span className="text-2xl font-black text-kv-orange">฿{order.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                  <h3 className="text-lg font-black text-kv-navy mb-6 flex items-center gap-2">
                    <MapPin className="text-kv-orange" size={20} /> ที่อยู่จัดส่ง
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
                      {order.address}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
