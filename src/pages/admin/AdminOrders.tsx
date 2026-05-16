import React, { useState, useEffect } from 'react';
import { Search, Eye, Loader2, CheckCircle2, XCircle, Clock, Truck, PackageCheck, AlertCircle, Users as UsersIcon, Edit, Plus, Receipt, ZoomIn, ExternalLink, QrCode, Building2, CreditCard, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../services/notificationService';

const PAYMENT_LABELS: Record<string, string> = {
  promptpay:     'โอนเงิน PromptPay',
  qr:            'โอนเงิน PromptPay',
  bank_transfer: 'โอนเงินผ่านธนาคาร',
  transfer:      'โอนเงินผ่านธนาคาร',
  bank:          'โอนเงินผ่านธนาคาร',
  cod:           'เก็บเงินปลายทาง',
};

function paymentLabel(method: string | undefined | null) {
  if (!method) return '-';
  return PAYMENT_LABELS[method.toLowerCase()] || method;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    [0, 0.15, 0.3].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = [880, 1100, 1320][i];
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.13);
    });
  } catch { /* audio blocked */ }
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  selected_options?: { name: string; value: string; price_modifier: number }[];
  products?: {
    title: string;
    image_url: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  user_id: string;
  address: string;
  phone: string;
  payment_method: string;
  tracking_number?: string;
  shipping_provider?: string;
  shipped_at?: string;
  payment_slip_url?: string;
  shipping_data?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    subDistrict?: string;
    district?: string;
    province?: string;
    zipCode?: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
  order_items?: OrderItem[];
}

function getCustomerName(order: Order): string {
  const fromShipping = [order.shipping_data?.firstName, order.shipping_data?.lastName].filter(Boolean).join(' ');
  if (fromShipping) return fromShipping;
  const firstLine = order.address?.split('\n')[0]?.trim();
  if (firstLine) return firstLine;
  return order.profiles?.full_name || 'ไม่ระบุชื่อ';
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingProvider, setShippingProvider] = useState('');
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        playNotificationSound();
        const incoming = payload.new as Order;
        setOrders(prev => [incoming, ...prev]);
        setTotalCount(prev => prev + 1);
        setNewOrderAlert(incoming);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!newOrderAlert) return;
    const t = setTimeout(() => setNewOrderAlert(null), 8000);
    return () => clearTimeout(t);
  }, [newOrderAlert]);

  async function fetchOrders() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          order_items (
            *,
            products (
              title,
              image_url
            )
          )
        `, { count: 'exact' });

      if (searchTerm) {
        // Search by order ID or customer name/email
        // Note: Complex OR filtering with joins can be tricky in Supabase
        // For simplicity, we'll search by ID if it looks like a UUID, or filter client-side if needed
        // But let's try a basic search on ID
        query = query.or(`id.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'shipped') {
        if (trackingNumber) updateData.tracking_number = trackingNumber;
        if (shippingProvider) updateData.shipping_provider = shippingProvider;
        updateData.shipped_at = new Date().toISOString();
      } else if (trackingNumber || shippingProvider) {
        // Allow updating tracking info without changing status to shipped
        if (trackingNumber) updateData.tracking_number = trackingNumber;
        if (shippingProvider) updateData.shipping_provider = shippingProvider;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updateData });
      }
      
      // Send notification
      const orderToNotify = orders.find(o => o.id === orderId);
      await notificationService.notifyStatusUpdate(orderId, newStatus, orderToNotify?.user_id);
      
      if (newStatus !== 'shipped') {
        setTrackingNumber('');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'รอชำระเงิน', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'processing':
        return { label: 'กำลังจัดเตรียม', color: 'bg-blue-100 text-blue-700', icon: PackageCheck };
      case 'shipped':
        return { label: 'จัดส่งแล้ว', color: 'bg-purple-100 text-purple-700', icon: Truck };
      case 'completed':
        return { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-thai">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="relative w-full lg:w-96">
          <input 
            type="text" 
            placeholder="ค้นหารหัสออเดอร์ หรือ ชื่อลูกค้า..." 
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent shadow-sm"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>
        <select 
          value={statusFilter}
          onChange={handleStatusFilter}
          className="border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-kv-orange bg-white shadow-sm font-bold text-sm"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="pending">รอชำระเงิน</option>
          <option value="processing">กำลังจัดเตรียม</option>
          <option value="shipped">จัดส่งแล้ว</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                <th className="p-4 font-bold whitespace-nowrap">รหัสออเดอร์</th>
                <th className="p-4 font-bold whitespace-nowrap">วันที่</th>
                <th className="p-4 font-bold whitespace-nowrap">ลูกค้า</th>
                <th className="p-4 font-bold whitespace-nowrap">ยอดรวม</th>
                <th className="p-4 font-bold whitespace-nowrap">สถานะ</th>
                <th className="p-4 font-bold whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {orders.map((order) => {
                const status = getStatusBadge(order.status);
                const StatusIcon = status.icon;
                
                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-4 text-gray-500 font-medium">
                      {new Date(order.created_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-kv-navy">{getCustomerName(order)}</div>
                      <div className="text-xs text-gray-400">{order.profiles?.email}</div>
                    </td>
                    <td className="p-4 font-black text-kv-navy text-base">฿{order.total_amount.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 text-kv-navy bg-gray-100 hover:bg-kv-orange hover:text-white rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
                      >
                        <Eye size={14} /> รายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {orders.map((order) => {
            const status = getStatusBadge(order.status);
            const StatusIcon = status.icon;
            return (
              <div 
                key={order.id} 
                className="p-4 space-y-4 active:bg-gray-50 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-bold text-kv-navy">{getCustomerName(order)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${status.color}`}>
                    <StatusIcon size={10} />
                    {status.label}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">ยอดรวม</p>
                    <p className="font-black text-kv-navy text-base">฿{order.total_amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-bold">
            ไม่พบรายการสั่งซื้อ
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                        currentPage === pageNum 
                          ? 'bg-kv-orange text-white shadow-lg shadow-kv-orange/20' 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-gray-300">...</span>;
                }
                return null;
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* New order alert toast */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-kv-navy text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 min-w-[280px] max-w-sm"
          >
            <div className="w-10 h-10 rounded-full bg-kv-orange flex items-center justify-center shrink-0 animate-bounce">
              <PackageCheck size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-kv-orange uppercase tracking-widest">ออเดอร์ใหม่!</p>
              <p className="text-sm font-bold truncate">#{newOrderAlert.id.slice(0, 8).toUpperCase()} · ฿{newOrderAlert.total_amount?.toLocaleString()}</p>
            </div>
            <button onClick={() => setNewOrderAlert(null)} className="text-white/60 hover:text-white transition-colors shrink-0">
              <XCircle size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slip Lightbox */}
      <AnimatePresence>
        {slipPreviewUrl && (
          <div
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSlipPreviewUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={slipPreviewUrl}
                alt="สลิปการโอนเงิน"
                className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <a
                  href={slipPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/90 text-kv-navy px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-white transition-all"
                >
                  <ExternalLink size={12} /> เปิดไฟล์ต้นฉบับ
                </a>
                <button
                  onClick={() => setSlipPreviewUrl(null)}
                  className="bg-white/90 text-kv-navy w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white transition-all font-black"
                >
                  ✕
                </button>
              </div>
              <p className="text-white/60 text-xs text-center mt-3 font-bold">คลิกด้านนอกเพื่อปิด</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-kv-navy">
                      #{selectedOrder.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${getStatusBadge(selectedOrder.status).color}`}>
                      {getStatusBadge(selectedOrder.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selectedOrder.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}฿{selectedOrder.total_amount.toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <XCircle size={22} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto space-y-4">

                {/* Customer + Order info — compact grid */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ข้อมูลลูกค้า & ออเดอร์</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">ชื่อลูกค้า</p>
                      <p className="font-black text-kv-navy text-xs mt-0.5">{getCustomerName(selectedOrder)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">เบอร์โทร</p>
                      <p className="font-bold text-kv-navy text-xs mt-0.5">{selectedOrder.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">อีเมล</p>
                      <p className="font-bold text-kv-navy text-xs mt-0.5 break-all">{selectedOrder.profiles?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">ช่องทางชำระเงิน</p>
                      <p className="font-bold text-kv-navy text-xs mt-0.5">{paymentLabel(selectedOrder.payment_method)}</p>
                    </div>
                    {selectedOrder.tracking_number && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-gray-400 font-bold">เลขพัสดุ</p>
                        <p className="font-black text-purple-600 text-xs mt-0.5">
                          {selectedOrder.shipping_provider ? `${selectedOrder.shipping_provider}: ` : ''}
                          {selectedOrder.tracking_number}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t border-gray-200">
                      <p className="text-[10px] text-gray-400 font-bold">ที่อยู่จัดส่ง</p>
                      <p className="font-medium text-gray-600 text-xs leading-relaxed mt-0.5">{selectedOrder.address}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold">ยอดรวมสุทธิ</span>
                    <span className="text-xl font-black text-kv-orange">฿{selectedOrder.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Plus size={11} /> รายการสินค้า
                  </p>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="p-3 flex items-center gap-3 bg-white">
                        <img
                          src={item.products?.image_url || 'https://via.placeholder.com/50'}
                          alt={item.products?.title}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-50 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-kv-navy line-clamp-1">{item.products?.title}</h5>
                          {item.selected_options && item.selected_options.length > 0 && (
                            <div className="flex flex-wrap gap-x-2">
                              {item.selected_options.map((opt, idx) => (
                                <span key={idx} className="text-[10px] text-gray-400 font-bold">
                                  {opt.name}: <span className="text-kv-navy">{opt.value}</span>
                                  {opt.price_modifier > 0 && <span className="text-green-600">(+฿{opt.price_modifier})</span>}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">฿{item.price.toLocaleString()} × {item.quantity}</p>
                        </div>
                        <p className="text-sm font-black text-kv-navy shrink-0">฿{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Slip */}
                {(selectedOrder.payment_slip_url || selectedOrder.status === 'pending') && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Receipt size={11} /> สลิปการชำระเงิน
                    </p>
                    {selectedOrder.payment_slip_url ? (
                      <div className="bg-gray-50 rounded-2xl p-3 space-y-3">
                        <div className="relative group cursor-pointer" onClick={() => setSlipPreviewUrl(selectedOrder.payment_slip_url!)}>
                          <img
                            src={selectedOrder.payment_slip_url}
                            alt="สลิปการโอนเงิน"
                            className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-white"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-kv-navy font-bold text-xs shadow">
                              <ZoomIn size={12} /> ดูรูปเต็ม
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSlipPreviewUrl(selectedOrder.payment_slip_url!)}
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-kv-navy hover:bg-gray-50 transition-all"
                          >
                            <ZoomIn size={13} /> ดูสลิปเต็ม
                          </button>
                          <a
                            href={selectedOrder.payment_slip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-kv-navy hover:bg-gray-50 transition-all"
                          >
                            <ExternalLink size={13} /> เปิดในแท็บใหม่
                          </a>
                        </div>
                        {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg shadow-green-200"
                          >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                            ยืนยันรับชำระเงินแล้ว
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Receipt size={16} className="text-yellow-500 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-yellow-700">ยังไม่ได้รับสลิป</p>
                            <p className="text-[11px] text-yellow-600 mt-0.5">ลูกค้ายังไม่ได้อัปโหลดสลิป — อาจส่งมาทาง LINE</p>
                          </div>
                        </div>
                        {selectedOrder.status === 'pending' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg shadow-green-200"
                          >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                            ยืนยันรับชำระเงินแล้ว (ไม่มีสลิป)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Status Update */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Edit size={11} /> จัดการสถานะและเลขพัสดุ
                  </p>
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                    {/* Status pills — horizontal scroll on mobile */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                      {[
                        { id: 'pending',    label: 'รอชำระเงิน',    active: 'bg-yellow-400 border-yellow-400', hover: 'hover:bg-yellow-50 hover:text-yellow-700 border-yellow-200' },
                        { id: 'processing', label: 'กำลังจัดเตรียม', active: 'bg-blue-500 border-blue-500',    hover: 'hover:bg-blue-50 hover:text-blue-700 border-blue-200' },
                        { id: 'shipped',    label: 'จัดส่งแล้ว',    active: 'bg-purple-500 border-purple-500', hover: 'hover:bg-purple-50 hover:text-purple-700 border-purple-200' },
                        { id: 'completed',  label: 'เสร็จสิ้น',     active: 'bg-green-500 border-green-500',  hover: 'hover:bg-green-50 hover:text-green-700 border-green-200' },
                        { id: 'cancelled',  label: 'ยกเลิก',        active: 'bg-red-500 border-red-500',      hover: 'hover:bg-red-50 hover:text-red-700 border-red-200' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          disabled={isUpdating || selectedOrder.status === s.id}
                          onClick={() => handleUpdateStatus(selectedOrder.id, s.id)}
                          className={`shrink-0 px-3 py-2 text-[11px] font-black border rounded-xl transition-all disabled:opacity-60 whitespace-nowrap ${
                            selectedOrder.status === s.id
                              ? `${s.active} text-white`
                              : `text-gray-600 bg-white ${s.hover}`
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Shipping fields */}
                    <div className="space-y-2.5">
                      <select
                        value={shippingProvider || selectedOrder.shipping_provider || ''}
                        onChange={(e) => setShippingProvider(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-sm transition-all"
                      >
                        <option value="">บริษัทขนส่ง</option>
                        <option value="Kerry Express">Kerry Express</option>
                        <option value="Flash Express">Flash Express</option>
                        <option value="J&T Express">J&T Express</option>
                        <option value="Thailand Post">ไปรษณีย์ไทย (EMS)</option>
                        <option value="Ninja Van">Ninja Van</option>
                        <option value="Best Express">Best Express</option>
                      </select>
                      <input
                        type="text"
                        placeholder="เลขพัสดุ เช่น TH123456789"
                        value={trackingNumber || selectedOrder.tracking_number || ''}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-sm transition-all"
                      />
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status)}
                        disabled={isUpdating || (!trackingNumber && !shippingProvider)}
                        className="w-full py-3 bg-kv-navy text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-kv-orange transition-all disabled:opacity-50"
                      >
                        อัปเดตข้อมูลการจัดส่ง
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
