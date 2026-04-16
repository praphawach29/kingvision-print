import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp, Loader2, Package, AlertCircle, ArrowRight, CheckCircle2, Database, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalSales: number;
  orderCount: number;
  userCount: number;
  productCount: number;
  lowStockCount: number;
}

interface LowStockProduct {
  id: string;
  title: string;
  stock: number;
  image_url: string;
}

interface RecentOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    orderCount: 0,
    userCount: 0,
    productCount: 0,
    lowStockCount: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // Fetch stats in parallel
      const [ordersRes, usersRes, productsRes, recentOrdersRes, lowStockRes] = await Promise.all([
        supabase.from('orders').select('total_amount, status'),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select(`
          id, 
          created_at, 
          total_amount, 
          status,
          profiles:user_id (email, full_name)
        `).order('created_at', { ascending: false }).limit(5),
        supabase.from('products')
          .select('id, title, stock, image_url')
          .lt('stock', 5)
          .order('stock', { ascending: true })
          .limit(5)
      ]);

      const orders = ordersRes.data || [];
      const totalSales = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const lowStockCount = lowStockRes.data?.length || 0;

      setStats({
        totalSales,
        orderCount: orders.length,
        userCount: usersRes.count || 0,
        productCount: productsRes.count || 0,
        lowStockCount: lowStockRes.data?.length || 0
      });

      setRecentOrders(recentOrdersRes.data || []);
      setLowStockProducts(lowStockRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { title: 'ยอดขายรวม', value: `฿${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'ออเดอร์ทั้งหมด', value: stats.orderCount.toString(), icon: ShoppingBag, color: 'bg-blue-500' },
    { title: 'ลูกค้าทั้งหมด', value: stats.userCount.toString(), icon: Users, color: 'bg-purple-500' },
    { title: 'สินค้าใกล้หมด', value: stats.lowStockCount.toString(), icon: AlertCircle, color: 'bg-red-500' },
  ];

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 font-thai">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-50">
        <div>
          <h1 className="text-2xl font-black text-kv-navy">ยินดีต้อนรับสู่ระบบจัดการร้านค้า</h1>
          <p className="text-gray-500">ภาพรวมการทำงานและสถิติของร้านค้าในวันนี้</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start lg:items-center hover:shadow-md transition-all border border-gray-50">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${stat.color} text-white flex items-center justify-center mb-3 sm:mb-0 sm:mr-4 shrink-0 shadow-lg shadow-gray-100`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wider">{stat.title}</p>
                <p className={`text-base sm:text-2xl font-black ${stat.title === 'สินค้าใกล้หมด' && stats.lowStockCount > 0 ? 'text-red-600' : 'text-kv-navy'}`}>{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-6 bg-kv-navy rounded-full" />
          <h2 className="text-lg font-bold text-kv-navy">จัดการข้อมูลพื้นฐาน</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/admin/products" className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-kv-orange hover:bg-orange-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-kv-navy group-hover:text-kv-orange shadow-sm">
                <Package size={20} />
              </div>
              <div>
                <p className="font-bold text-kv-navy text-sm">จัดการสินค้า</p>
                <p className="text-[10px] text-gray-400">เพิ่ม/แก้ไข รายการสินค้า</p>
              </div>
            </div>
          </Link>
          <Link to="/admin/categories" className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-kv-orange hover:bg-orange-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-kv-navy group-hover:text-kv-orange shadow-sm">
                <Database size={20} />
              </div>
              <div>
                <p className="font-bold text-kv-navy text-sm">จัดการหมวดหมู่</p>
                <p className="text-[10px] text-gray-400">ตั้งค่าหมวดหมู่สินค้า</p>
              </div>
            </div>
          </Link>
          <Link to="/admin/brands" className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-kv-orange hover:bg-orange-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-kv-navy group-hover:text-kv-orange shadow-sm">
                <Tag size={20} />
              </div>
              <div>
                <p className="font-bold text-kv-navy text-sm">จัดการแบรนด์</p>
                <p className="text-[10px] text-gray-400">ตั้งค่าแบรนด์สินค้า</p>
              </div>
            </div>
          </Link>
          <Link to="/admin/inventory" className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-kv-orange hover:bg-orange-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-kv-navy group-hover:text-kv-orange shadow-sm">
                <Package size={20} />
              </div>
              <div>
                <p className="font-bold text-kv-navy text-sm">จัดการสต็อก</p>
                <p className="text-[10px] text-gray-400">ประวัติและคลังสินค้า</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-kv-orange rounded-full" />
              <h2 className="text-lg font-bold text-kv-navy">ออเดอร์ล่าสุด</h2>
            </div>
            <Link to="/admin/orders" className="text-sm font-bold text-kv-orange hover:bg-orange-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>
          
          {/* ... existing table code ... */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                  <th className="p-6 font-bold">รหัสออเดอร์</th>
                  <th className="p-6 font-bold">ลูกค้า</th>
                  <th className="p-6 font-bold">วันที่</th>
                  <th className="p-6 font-bold">ยอดรวม</th>
                  <th className="p-6 font-bold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-6">
                      <div className="font-bold text-kv-navy">{order.profiles?.full_name || 'ไม่ระบุชื่อ'}</div>
                      <div className="text-xs text-gray-400">{order.profiles?.email}</div>
                    </td>
                    <td className="p-6 text-gray-500 font-medium">
                      {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="p-6 font-black text-kv-navy">฿{order.total_amount.toLocaleString()}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {
                          order.status === 'pending' ? 'รอชำระเงิน' :
                          order.status === 'processing' ? 'กำลังเตรียม' :
                          order.status === 'shipped' ? 'จัดส่งแล้ว' :
                          order.status === 'completed' ? 'เสร็จสิ้น' :
                          order.status === 'cancelled' ? 'ยกเลิก' : order.status
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-3 active:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-bold text-kv-navy">{order.profiles?.full_name || 'ไม่ระบุชื่อ'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {
                      order.status === 'pending' ? 'รอชำระเงิน' :
                      order.status === 'processing' ? 'กำลังเตรียม' :
                      order.status === 'shipped' ? 'จัดส่งแล้ว' :
                      order.status === 'completed' ? 'เสร็จสิ้น' :
                      order.status === 'cancelled' ? 'ยกเลิก' : order.status
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">
                    {new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="font-black text-kv-navy text-sm">฿{order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {recentOrders.length === 0 && (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto text-gray-200 mb-2" size={48} />
              <p className="text-gray-400 font-bold">ยังไม่มีรายการสั่งซื้อ</p>
            </div>
          )}
        </div>

        {/* Low Stock Alerts Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-50 flex justify-between items-center bg-red-50/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-red-500 rounded-full" />
              <h2 className="text-lg font-bold text-kv-navy">สินค้าใกล้หมด</h2>
            </div>
            <Link to="/admin/products" className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
              จัดการสต็อก
            </Link>
          </div>
          
          <div className="flex-1 divide-y divide-gray-50">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <img 
                    src={product.image_url || 'https://via.placeholder.com/50'} 
                    alt={product.title}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-kv-navy line-clamp-1">{product.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full rounded-full" 
                          style={{ width: `${(product.stock / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-red-600 shrink-0">{product.stock} ชิ้น</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">สต็อกสินค้าปกติ</p>
              </div>
            )}
          </div>
          
          {lowStockProducts.length > 0 && (
            <div className="p-4 bg-gray-50/50 border-t border-gray-50">
              <p className="text-[10px] text-gray-400 font-medium text-center">
                แสดงสินค้าที่มีจำนวนเหลือน้อยกว่า 5 ชิ้น
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
