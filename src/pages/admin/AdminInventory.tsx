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
import { notificationService } from '../../services/notificationService';

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

      // 3. Notify if low stock after adjustment
      if (newStock <= 5 && adjustmentAmount < 0) {
        await notificationService.notifyLowStock(selectedProduct.title, newStock);
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 px-2 sm:px-0">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-col sm:flex-row items-center sm:items-center gap-3 md:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Box size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase leading-tight">จำนวนสินค้า</div>
            <div className="text-lg md:text-2xl font-black text-kv-navy leading-none md:mt-1">{totalItems.toLocaleString()} <span className="text-[10px] md:text-sm font-bold text-gray-400">ชิ้น</span></div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-col sm:flex-row items-center sm:items-center gap-3 md:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase leading-tight">มูลค่าสต็อก</div>
            <div className="text-lg md:text-2xl font-black text-kv-navy leading-none md:mt-1 font-mono">฿{totalStockValue.toLocaleString()}</div>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-row items-center justify-center sm:justify-start gap-4 text-left">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase leading-tight">สินค้าใกล้หมด</div>
            <div className="text-lg md:text-2xl font-black text-red-600 leading-none md:mt-1">{lowStockProducts.length} <span className="text-[10px] md:text-sm font-bold text-gray-400">รายการ</span></div>
          </div>
        </div>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex border-b border-gray-100 min-w-max">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 sm:px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} /> ภาพรวมสต็อก
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 sm:px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
          >
            <div className="flex items-center gap-2">
              <History size={18} /> ประวัติการเคลื่อนไหว
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('low-stock')}
            className={`px-4 sm:px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'low-stock' ? 'border-kv-orange text-kv-orange' : 'border-transparent text-gray-400 hover:text-kv-navy'}`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} /> รายการสินค้าใกล้หมด
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="ค้นหาสินค้า..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange font-bold text-sm"
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={fetchData}
                  className="px-4 py-3 bg-gray-50 text-kv-navy rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> รีเฟรช
                </button>
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-3 bg-kv-navy text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-kv-navy/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-kv-navy/10"
                >
                  <Download size={16} /> ส่งออกรายงาน
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {/* Desktop Table View */}
              <table className="w-full text-left hidden sm:table">
                <thead>
                  <tr className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-4 py-3">สินค้า</th>
                    <th className="px-4 py-3 hidden md:table-cell">หมวดหมู่</th>
                    <th className="px-4 py-3 text-right">สต็อก</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">มูลค่ารวม</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.image_url || 'https://picsum.photos/seed/printer/100/100'} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-kv-navy text-sm line-clamp-1">{product.title}</div>
                            <div className="md:hidden text-[10px] font-bold text-gray-400">{product.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-500 hidden md:table-cell">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black text-sm ${product.stock < 5 ? 'text-red-600' : 'text-kv-navy'}`}>
                          {product.stock.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sm text-kv-navy hidden lg:table-cell font-mono">
                        ฿{(product.price * product.stock).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center uppercase">
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

              {/* Mobile Card View - Matches low stock style but with general colors */}
              <div className="sm:hidden flex flex-col gap-3 px-4">
                {filteredProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 border border-gray-100 bg-white rounded-2xl shadow-sm active:bg-gray-50 transition-colors">
                    <div 
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsAdjusting(true);
                      }}
                    >
                      <img 
                        src={product.image_url || 'https://picsum.photos/seed/printer/100/100'} 
                        alt="" 
                        className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-kv-navy text-xs sm:text-sm leading-tight mb-1">{product.title}</div>
                        <div className={`text-xs font-black ${product.stock < 5 ? 'text-red-500' : 'text-kv-orange'}`}>
                          {product.stock < 5 ? 'ใกล้หมด: ' : 'คงเหลือ: '}{product.stock} ชิ้น
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">฿{(product.price * product.stock).toLocaleString()}</div>
                      </div>
                    </div>
                    <button 
                      onClick={fetchData}
                      disabled={loading}
                      className="w-10 h-10 flex items-center justify-center bg-gray-50 text-kv-navy rounded-xl border border-gray-100 active:bg-gray-100 transition-all ml-2 shrink-0"
                    >
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-gray-400 font-bold">ไม่พบข้อมูลสินค้า</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4 md:p-6">
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${log.change_amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {log.change_amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-kv-navy text-xs sm:text-sm leading-tight">{log.product?.title || 'สินค้าถูกลบ'}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase truncate leading-none mt-1">
                        {new Date(log.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} • {
                          log.reason === 'sale' ? 'ขายสินค้า' :
                          log.reason === 'restock' ? 'เติมสต็อก' :
                          log.reason === 'adjustment' ? 'ปรับสต็อก' :
                          log.reason === 'return' ? 'คืนสินค้า' : log.reason
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-black text-xs sm:text-sm ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold font-mono">
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
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-red-100 bg-red-50/30 rounded-2xl">
                    <div 
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsAdjusting(true);
                      }}
                    >
                      <img 
                        src={product.image_url || 'https://picsum.photos/seed/printer/100/100'} 
                        alt="" 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-white shadow-sm shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-kv-navy text-sm leading-tight mb-1">{product.title}</div>
                        <div className="text-xs font-black text-red-600">เหลือ {product.stock} ชิ้น</div>
                      </div>
                    </div>
                    <button 
                      onClick={fetchData}
                      disabled={loading}
                      className="w-10 h-10 flex items-center justify-center bg-gray-50 text-kv-navy rounded-xl border border-gray-100 active:bg-gray-100 transition-all ml-2 shrink-0"
                    >
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-400 font-bold">ไม่มีสินค้าที่สต็อกต่ำกว่าเกณฑ์</div>
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
              className="relative bg-white w-full max-w-md rounded-b-none rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden self-end sm:self-center"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-kv-navy">ปรับปรุงสต็อกสินค้า</h3>
                <button onClick={() => setIsAdjusting(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-kv-navy rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <img src={selectedProduct.image_url || 'https://picsum.photos/seed/printer/100/100'} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <div className="font-bold text-kv-navy text-sm line-clamp-2 leading-tight">{selectedProduct.title}</div>
                    <div className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">สต็อกเดิม: <span className="text-kv-navy">{selectedProduct.stock}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">จำนวนที่ปรับปรุง (+ หรือ -)</label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button 
                        onClick={() => setAdjustmentAmount(prev => prev - 1)}
                        className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-90"
                      >
                        <Minus size={20} />
                      </button>
                      <input 
                        type="number" 
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                        className="flex-1 h-12 text-center font-black text-xl bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none"
                      />
                      <button 
                        onClick={() => setAdjustmentAmount(prev => prev + 1)}
                        className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center hover:bg-green-100 transition-all active:scale-90"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เหตุผลการปรับปรุง</label>
                    <select 
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-kv-orange appearance-none"
                    >
                      <option value="adjustment">ปรับปรุงทั่วไป</option>
                      <option value="restock">เติมสต็อกสินค้า</option>
                      <option value="return">คืนสินค้า</option>
                      <option value="damage">สินค้าชำรุด/สูญหาย</option>
                    </select>
                  </div>

                  <div className="p-4 bg-kv-navy/5 rounded-2xl border border-kv-navy/5">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-gray-500">สต็อกใหม่จะเป็น:</span>
                      <span className={`text-xl sm:text-2xl font-black ${selectedProduct.stock + adjustmentAmount < 0 ? 'text-red-600' : 'text-kv-navy'}`}>
                        {selectedProduct.stock + adjustmentAmount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleAdjustment}
                    disabled={isSaving || adjustmentAmount === 0 || (selectedProduct.stock + adjustmentAmount < 0)}
                    className="w-full h-14 bg-kv-navy text-white rounded-2xl font-black text-lg hover:bg-kv-orange transition-all shadow-lg shadow-kv-navy/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    ยืนยันการปรับปรุง
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
