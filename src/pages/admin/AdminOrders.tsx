import React, { useState, useEffect } from 'react';
import { Search, Eye, Loader2, CheckCircle2, XCircle, Clock, Truck, PackageCheck, AlertCircle, Users as UsersIcon, Edit, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../services/notificationService';

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
  profiles?: {
    full_name: string;
    email: string;
  };
  order_items?: OrderItem[];
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
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
                <th className="p-4 font-bold">รหัสออเดอร์</th>
                <th className="p-4 font-bold">วันที่</th>
                <th className="p-4 font-bold">ลูกค้า</th>
                <th className="p-4 font-bold">ยอดรวม</th>
                <th className="p-4 font-bold">สถานะ</th>
                <th className="p-4 font-bold">จัดการ</th>
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
                      <div className="font-bold text-kv-navy">{order.profiles?.full_name || 'ไม่ระบุชื่อ'}</div>
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
                    <p className="font-bold text-kv-navy">{order.profiles?.full_name || 'ไม่ระบุชื่อ'}</p>
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

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-kv-navy">
                  รายละเอียดออเดอร์ #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>

                <div className="p-6 overflow-y-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                        <UsersIcon size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">ข้อมูลลูกค้า</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">ชื่อลูกค้า</span>
                          <span className="text-sm font-black text-kv-navy">{selectedOrder.profiles?.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">อีเมล</span>
                          <span className="text-sm font-bold text-kv-navy">{selectedOrder.profiles?.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">เบอร์โทร</span>
                          <span className="text-sm font-bold text-kv-navy">{selectedOrder.phone}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400 font-bold block mb-1">ที่อยู่จัดส่ง</span>
                          <span className="text-xs font-medium text-gray-600 leading-relaxed">{selectedOrder.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                        <PackageCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">ข้อมูลออเดอร์</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">วันที่สั่งซื้อ</span>
                          <span className="text-sm font-bold text-kv-navy">{new Date(selectedOrder.created_at).toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">การชำระเงิน</span>
                          <span className="text-sm font-black text-kv-navy">{selectedOrder.payment_method}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">สถานะ</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(selectedOrder.status).color}`}>
                            {getStatusBadge(selectedOrder.status).label}
                          </span>
                        </div>
                        {selectedOrder.tracking_number && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-400 font-bold">เลขพัสดุ</span>
                            <span className="text-sm font-black text-purple-600">
                              {selectedOrder.shipping_provider && `${selectedOrder.shipping_provider}: `}
                              {selectedOrder.tracking_number}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400 font-bold">ยอดรวมสุทธิ</span>
                          <span className="text-lg font-black text-kv-orange">฿{selectedOrder.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                      <Plus size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">รายการสินค้า</span>
                    </div>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {selectedOrder.order_items?.map((item) => (
                          <div key={item.id} className="p-4 flex items-center gap-4 bg-white">
                            <img 
                              src={item.products?.image_url || 'https://via.placeholder.com/50'} 
                              alt={item.products?.title}
                              className="w-12 h-12 rounded-lg object-cover bg-gray-50"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-kv-navy line-clamp-1">{item.products?.title}</h5>
                              {item.selected_options && item.selected_options.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {item.selected_options.map((opt, idx) => (
                                    <div key={idx} className="text-[10px] text-gray-400 font-bold">
                                      {opt.name}: <span className="text-kv-navy">{opt.value}</span>
                                      {opt.price_modifier > 0 && <span className="text-green-600 ml-0.5">(+฿{opt.price_modifier})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5">฿{item.price.toLocaleString()} x {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-kv-navy">฿{(item.price * item.quantity).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Update Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                      <Edit size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">จัดการสถานะและเลขพัสดุ</span>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-3xl space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {[
                          { id: 'pending', label: 'รอชำระเงิน', color: 'hover:bg-yellow-50 hover:text-yellow-700 border-yellow-200' },
                          { id: 'processing', label: 'กำลังจัดเตรียม', color: 'hover:bg-blue-50 hover:text-blue-700 border-blue-200' },
                          { id: 'shipped', label: 'จัดส่งแล้ว', color: 'hover:bg-purple-50 hover:text-purple-700 border-purple-200' },
                          { id: 'completed', label: 'เสร็จสิ้น', color: 'hover:bg-green-50 hover:text-green-700 border-green-200' },
                          { id: 'cancelled', label: 'ยกเลิก', color: 'hover:bg-red-50 hover:text-red-700 border-red-200' },
                        ].map((s) => (
                          <button
                            key={s.id}
                            disabled={isUpdating || selectedOrder.status === s.id}
                            onClick={() => handleUpdateStatus(selectedOrder.id, s.id)}
                            className={`px-3 py-3 text-[10px] font-black uppercase tracking-tighter border rounded-xl transition-all disabled:opacity-50 shadow-sm ${
                              selectedOrder.status === s.id 
                                ? 'bg-kv-navy text-white border-kv-navy' 
                                : `text-gray-600 bg-white ${s.color}`
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">บริษัทขนส่ง</label>
                            <select 
                              value={shippingProvider || selectedOrder.shipping_provider || ''}
                              onChange={(e) => setShippingProvider(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                            >
                              <option value="">เลือกบริษัทขนส่ง</option>
                              <option value="Kerry Express">Kerry Express</option>
                              <option value="Flash Express">Flash Express</option>
                              <option value="J&T Express">J&T Express</option>
                              <option value="Thailand Post">ไปรษณีย์ไทย (EMS)</option>
                              <option value="Ninja Van">Ninja Van</option>
                              <option value="Best Express">Best Express</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เลขพัสดุ (Tracking Number)</label>
                            <input 
                              type="text"
                              placeholder="กรอกเลขพัสดุ เช่น TH123456789"
                              value={trackingNumber || selectedOrder.tracking_number || ''}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status)}
                          disabled={isUpdating || (!trackingNumber && !shippingProvider)}
                          className="w-full py-3 bg-kv-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-kv-orange transition-all disabled:opacity-50"
                        >
                          อัปเดตข้อมูลการจัดส่ง
                        </button>
                        <p className="text-[10px] text-gray-400 italic ml-1 text-center">* ข้อมูลการจัดส่งจะถูกบันทึกเมื่อกด "อัปเดตข้อมูลการจัดส่ง" หรือเมื่อเปลี่ยนสถานะเป็น "จัดส่งแล้ว"</p>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="p-6 border-t border-gray-100 shrink-0">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
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
