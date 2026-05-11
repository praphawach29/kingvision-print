import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Package, Calendar, Loader2, Filter, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';

interface SalesData {
  date: string;
  amount: number;
  orders: number;
}

interface ProductSales {
  name: string;
  sales: number;
  revenue: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  async function fetchAnalyticsData() {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const startDate = subDays(new Date(), days);
      
      // 1. Fetch Orders for Sales Chart
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // 2. Fetch Order Items for Top Products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          products (title)
        `)
        .gte('created_at', startDate.toISOString());

      if (itemsError) throw itemsError;

      // Process Sales Data (Daily)
      const interval = eachDayOfInterval({
        start: startDate,
        end: new Date()
      });

      const processedSales = interval.map(day => {
        const dayOrders = orders.filter(o => isSameDay(new Date(o.created_at), day));
        return {
          date: format(day, 'd MMM', { locale: th }),
          amount: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          orders: dayOrders.length
        };
      });

      setSalesData(processedSales);

      // Process Product Sales
      const productMap = new Map<string, { sales: number; revenue: number }>();
      orderItems.forEach((item: any) => {
        const title = item.products?.title || 'Unknown Product';
        const current = productMap.get(title) || { sales: 0, revenue: 0 };
        productMap.set(title, {
          sales: current.sales + item.quantity,
          revenue: current.revenue + (item.price * item.quantity)
        });
      });

      const processedProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setProductSales(processedProducts);

      // Process Status Data
      const statusCounts = orders.reduce((acc: any, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});

      const statusMap: Record<string, { label: string; color: string }> = {
        pending: { label: 'รอชำระเงิน', color: '#EAB308' },
        processing: { label: 'กำลังเตรียม', color: '#3B82F6' },
        shipped: { label: 'จัดส่งแล้ว', color: '#A855F7' },
        completed: { label: 'เสร็จสิ้น', color: '#22C55E' },
        cancelled: { label: 'ยกเลิก', color: '#EF4444' }
      };

      const processedStatus = Object.entries(statusCounts).map(([status, count]) => ({
        name: statusMap[status]?.label || status,
        value: count as number,
        color: statusMap[status]?.color || '#94A3B8'
      }));

      setStatusData(processedStatus);

      // Process Summary
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalOrders = orders.length;
      setSummary({
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        revenueGrowth: 12.5, // Mocked growth
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-thai pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[21px] font-black text-kv-navy text-left">รายงานวิเคราะห์การขาย</h1>
          <p className="text-[15px] text-gray-500 font-medium">ข้อมูลสรุปผลการดำเนินงานของร้านค้า</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-sm appearance-none shadow-sm w-full"
            >
              <option value="7">7 วันล่าสุด</option>
              <option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option>
            </select>
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-kv-navy transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'รายได้ทั้งหมด', value: `฿${summary.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', growth: '+12.5%' },
          { title: 'จำนวนออเดอร์', value: summary.totalOrders.toLocaleString(), icon: ShoppingBag, color: 'bg-blue-500', growth: '+5.2%' },
          { title: 'ยอดเฉลี่ยต่อออเดอร์', value: `฿${summary.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'bg-purple-500', growth: '+2.1%' },
          { title: 'อัตราการเติบโต', value: `${summary.revenueGrowth}%`, icon: TrendingUp, color: 'bg-kv-orange', growth: '+1.5%' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${item.color} text-white shadow-lg shadow-gray-100`}>
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs font-black text-green-500 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> {item.growth}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{item.title}</p>
            <h3 className="text-base sm:text-2xl font-black text-kv-navy">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trend Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-kv-orange rounded-full" />
              <h3 className="text-lg font-black text-kv-navy uppercase tracking-tight">แนวโน้มยอดขาย</h3>
            </div>
          </div>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ff6b00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `฿${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 900, color: '#001d3d', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#ff6b00" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  name="ยอดขาย"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              <h3 className="text-lg font-black text-kv-navy uppercase tracking-tight">สินค้าขายดี (ตามรายได้)</h3>
            </div>
          </div>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#001d3d' }}
                  width={120}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#001d3d" 
                  radius={[0, 10, 10, 0]} 
                  barSize={20}
                  name="รายได้"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Status Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-50">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-2 h-6 bg-purple-500 rounded-full" />
            <h3 className="text-lg font-black text-kv-navy uppercase tracking-tight">สัดส่วนสถานะออเดอร์</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-green-500 rounded-full" />
              <h3 className="text-lg font-black text-kv-navy uppercase tracking-tight">อันดับสินค้าขายดี</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px] lg:min-w-0">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-6 py-4">อันดับ</th>
                  <th className="px-6 py-4">ชื่อสินค้า</th>
                  <th className="px-6 py-4 text-center">ขายแล้ว</th>
                  <th className="px-6 py-4 text-right">รายได้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productSales.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                        idx === 1 ? 'bg-gray-100 text-gray-700' : 
                        idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400 font-bold'
                      }`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-kv-navy line-clamp-1">{product.name}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-gray-600">{product.sales}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-kv-orange">฿{product.revenue.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
