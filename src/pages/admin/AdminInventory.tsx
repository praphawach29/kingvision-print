import React, { useState, useEffect } from 'react';
import { 
  Package, 
  History, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Plus,
  Minus,
  Save,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Box,
  ClipboardList
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryLog {
  id: string;
  created_at: string;
  product_id: string;
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference_id?: string;
  product?: {
    title: string;
    image_url: string;
  };
}

interface ProductStock {
  id: string;
  title: string;
  stock: number;
  price: number;
  category: string;
  image_url: string;
}

export function AdminInventory() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStock | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('adjustment');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'low-stock'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [productsRes, logsRes] = await Promise.all([
        supabase.from('products').select('id, title, stock, price, category, image_url').order('title'),
        supabase.from('inventory_logs').select('*, product:products(title, image_url)').order('created_at', { ascending: false }).limit(50)
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAdjustment = async () => {
    if (!selectedProduct || adjustmentAmount === 0) return;

    try {
      setIsSaving(true);
      const newStock = (selectedProduct.stock || 0) + adjustmentAmount;

      // 1. Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      // 2. Create inventory log
      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          product_id: selectedProduct.id,
          change_amount: adjustmentAmount,
          previous_stock: selectedProduct.stock || 0,
          new_stock: newStock,
          reason: adjustmentReason,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (logError) {
        console.warn('Failed to create log, but stock was updated:', logError);
      }

      await fetchData();
      setIsAdjusting(false);
      setSelectedProduct(null);
      setAdjustmentAmount(0);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const lowStockProducts = products.filter(p => (p.stock || 0) < 5);
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
  const totalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Product ID', 'Title', 'Category', 'Stock', 'Price', 'Total Value'];
    const data = products.map(p => [
      p.id,
      p.title,
      p.category,
      p.stock,
      p.price,
      p.stock * p.price
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && products.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-thai">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Box size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">จำนวนสินค้าทั้งหมด</div>
            <div className="text-2xl font-black text-kv-navy">{totalItems.toLocaleString()} <span className="text-sm font-bold text-gray-400">ชิ้น</span></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">มูลค่าสต็อกรวม</div>
            <div className="text-2xl font-black text-kv-navy">฿{totalStockValue.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">สินค้าใกล้หมด</div>
            <div className="text-2xl font-black text-red-600">{lowStockProducts.length} <span className="text-sm font-bold text-gray-400">รายการ</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'overview' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={18} /> ภาพรวมสต็อก
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'history' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
        >
          <div className="flex items-center gap-2">
            <History size={18} /> ประวัติการเคลื่อนไหว
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('low-stock')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'low-stock' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} /> รายการสินค้าใกล้หมด
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="ค้นหาสินค้า..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange font-bold text-sm"
                />
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              </div>
              <button 
                onClick={fetchData}
                className="px-4 py-2.5 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> รีเฟรช
              </button>
              <button 
                onClick={exportToCSV}
                className="px-4 py-2.5 bg-kv-navy text-white rounded-xl font-bold text-sm hover:bg-kv-navy/90 transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} /> ส่งออกรายงาน
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-4 py-3">สินค้า</th>
                    <th className="px-4 py-3">หมวดหมู่</th>
                    <th className="px-4 py-3 text-right">สต็อกปัจจุบัน</th>
                    <th className="px-4 py-3 text-right">มูลค่ารวม</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.image_url || 'https://via.placeholder.com/40'} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="font-bold text-kv-navy text-sm line-clamp-1">{product.title}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-500">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black text-sm ${product.stock < 5 ? 'text-red-600' : 'text-kv-navy'}`}>
                          {product.stock.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sm text-kv-navy">
                        ฿{(product.price * product.stock).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsAdjusting(true);
                          }}
                          className="p-2 text-kv-orange hover:bg-kv-orange/10 rounded-lg transition-all"
                          title="ปรับสต็อก"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.change_amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {log.change_amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-kv-navy text-sm">{log.product?.title || 'สินค้าถูกลบ'}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">
                        {new Date(log.created_at).toLocaleString('th-TH')} • {
                          log.reason === 'sale' ? 'ขายสินค้า' :
                          log.reason === 'restock' ? 'เติมสต็อก' :
                          log.reason === 'adjustment' ? 'ปรับปรุงสต็อก' :
                          log.reason === 'return' ? 'คืนสินค้า' : log.reason
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black text-sm ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {log.previous_stock} → {log.new_stock}
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-400 font-bold">ไม่พบประวัติการเคลื่อนไหว</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'low-stock' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-red-100 bg-red-50/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img 
                      src={product.image_url || 'https://via.placeholder.com/40'} 
                      alt="" 
                      className="w-12 h-12 rounded-xl object-cover bg-white shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-kv-navy text-sm line-clamp-1">{product.title}</div>
                      <div className="text-xs font-black text-red-600">เหลือเพียง {product.stock} ชิ้น</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsAdjusting(true);
                    }}
                    className="px-4 py-2 bg-kv-navy text-white rounded-xl text-xs font-bold hover:bg-kv-orange transition-all shadow-sm"
                  >
                    เติมสต็อก
                  </button>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-400 font-bold">ไม่มีสินค้าที่สต็อกต่ำกว่าเกณฑ์</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      <AnimatePresence>
        {isAdjusting && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdjusting(false)}
              className="absolute inset-0 bg-kv-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-kv-navy">ปรับปรุงสต็อกสินค้า</h3>
                <button onClick={() => setIsAdjusting(false)} className="text-gray-400 hover:text-kv-navy transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <img src={selectedProduct.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                  <div>
                    <div className="font-bold text-kv-navy text-sm line-clamp-2">{selectedProduct.title}</div>
                    <div className="text-xs font-bold text-gray-400">สต็อกปัจจุบัน: {selectedProduct.stock}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">จำนวนที่ปรับปรุง (+ หรือ -)</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setAdjustmentAmount(prev => prev - 1)}
                        className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                      >
                        <Minus size={20} />
                      </button>
                      <input 
                        type="number" 
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                        className="flex-1 h-12 text-center font-black text-xl bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none"
                      />
                      <button 
                        onClick={() => setAdjustmentAmount(prev => prev + 1)}
                        className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">เหตุผลการปรับปรุง</label>
                    <select 
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-kv-orange"
                    >
                      <option value="adjustment">ปรับปรุงทั่วไป</option>
                      <option value="restock">เติมสต็อกสินค้า</option>
                      <option value="return">คืนสินค้า</option>
                      <option value="damage">สินค้าชำรุด/สูญหาย</option>
                    </select>
                  </div>

                  <div className="p-4 bg-kv-navy/5 rounded-2xl">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-500">สต็อกใหม่จะเป็น:</span>
                      <span className={`text-lg font-black ${selectedProduct.stock + adjustmentAmount < 0 ? 'text-red-600' : 'text-kv-navy'}`}>
                        {selectedProduct.stock + adjustmentAmount}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAdjustment}
                  disabled={isSaving || adjustmentAmount === 0 || (selectedProduct.stock + adjustmentAmount < 0)}
                  className="w-full h-14 bg-kv-navy text-white rounded-2xl font-black text-lg hover:bg-kv-orange transition-all shadow-lg shadow-kv-navy/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  ยืนยันการปรับปรุง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
