import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Filter, Grid, List, Star, ShoppingCart, ChevronDown, ChevronUp, X, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const brandParam = searchParams.get('brand');

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, any[]>>({});
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState<string | null>(null);
  const { addToCart } = useCart();

  const itemsPerPage = 12;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, categoryParam, brandParam]);

  useEffect(() => {
    fetchFilters();
  }, []);

  async function fetchFilters() {
    try {
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      const { data: brs } = await supabase.from('brands').select('*').order('name');
      if (cats) setDbCategories(cats);
      if (brs) setDbBrands(brs);

      // Fetch product counts for categories
      const { data: countData, error: countError } = await supabase
        .from('products')
        .select('category');
      
      if (!countError && countData) {
        const counts: Record<string, number> = {};
        countData.forEach(p => {
          if (p.category) {
            counts[p.category] = (counts[p.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  }

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (categoryParam) {
        query = query.eq('category', categoryParam);
      }
      if (brandParam) {
        query = query.eq('brand', brandParam);
      }

      const { data, count, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProducts(data);
        setTotalItems(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (error.message?.includes('relation "products" does not exist')) {
        // This is a common setup error, we can show a more helpful log or UI state
        console.warn('Database table "products" is missing. Please run the setup SQL.');
      }
      setTotalItems(0);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id.toString(),
      name: item.title || item.name,
      price: item.price,
      quantity: 1,
      image: item.image_url || item.image
    });
    
    setShowSuccess(true);
    if (successTimeout) clearTimeout(successTimeout);
    const timeout = setTimeout(() => setShowSuccess(false), 3000);
    setSuccessTimeout(timeout);
  };

  const toggleCategory = async (catName: string) => {
    if (expandedCategory === catName) {
      setExpandedCategory(null);
      return;
    }

    setExpandedCategory(catName);

    // Fetch products for this category if not already fetched
    if (!categoryProducts[catName]) {
      setLoadingCategoryProducts(catName);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, image_url')
          .eq('category', catName)
          .limit(10); // Limit to 10 for sidebar

        if (error) throw error;
        if (data) {
          setCategoryProducts(prev => ({ ...prev, [catName]: data }));
        }
      } catch (error) {
        console.error('Error fetching category products:', error);
      } finally {
        setLoadingCategoryProducts(null);
      }
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-kv-gray min-h-screen py-8">
      <SEO 
        title={categoryParam ? `หมวดหมู่ ${categoryParam}` : brandParam ? `แบรนด์ ${brandParam}` : "เลือกซื้อสินค้า"}
        description={`เลือกซื้อสินค้า${categoryParam ? `ในหมวดหมู่ ${categoryParam}` : brandParam ? `แบรนด์ ${brandParam}` : ""} คุณภาพสูงจาก KingVision Print`}
      />
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'สินค้าทั้งหมด', path: '/shop' },
          ...(categoryParam ? [{ label: categoryParam }] : []),
          ...(brandParam ? [{ label: brandParam }] : [])
        ]} />

        {/* Mobile Collapsible Filter Button */}
        <div className="mb-6 lg:hidden">
          <button 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="w-full bg-white border border-kv-border rounded-lg py-4 px-6 flex items-center justify-center font-bold text-kv-navy hover:bg-gray-50 transition-colors shadow-sm font-thai"
          >
            <Filter size={20} className="mr-2 text-kv-orange" />
            {isFilterExpanded ? 'ปิดตัวกรอง' : 'ตัวกรองสินค้า'}
            {isFilterExpanded ? <ChevronUp size={20} className="ml-2" /> : <ChevronDown size={20} className="ml-2" />}
          </button>

          <AnimatePresence>
            {isFilterExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 bg-[#f39c12] p-6 rounded-lg shadow-inner grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Categories Dropdown */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-bold text-kv-navy mb-3 border-b pb-2">หมวดหมู่สินค้า</h3>
                    <select 
                      value={categoryParam || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) searchParams.set('category', val);
                        else searchParams.delete('category');
                        setSearchParams(searchParams);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-kv-border rounded outline-none focus:border-kv-orange text-sm"
                    >
                      <option value="">ทั้งหมด</option>
                      {dbCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-bold text-kv-navy mb-3 border-b pb-2">ช่วงราคา</h3>
                    <div className="space-y-3">
                      <input type="range" className="w-full accent-kv-orange" min="0" max="10000" />
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="ต่ำสุด" className="w-full p-2 border border-kv-border rounded text-xs" />
                        <span className="text-gray-400">-</span>
                        <input type="number" placeholder="สูงสุด" className="w-full p-2 border border-kv-border rounded text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Brands Dropdown */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-bold text-kv-navy mb-3 border-b pb-2">แบรนด์</h3>
                    <select 
                      value={brandParam || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) searchParams.set('brand', val);
                        else searchParams.delete('brand');
                        setSearchParams(searchParams);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-kv-border rounded outline-none focus:border-kv-orange text-sm"
                    >
                      <option value="">ทั้งหมด</option>
                      {dbBrands.map(brand => (
                        <option key={brand.id} value={brand.name}>{brand.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 flex justify-center">
                    <button 
                      onClick={() => setIsFilterExpanded(false)}
                      className="bg-kv-navy text-white px-12 py-3 rounded-md font-bold hover:bg-kv-navy/90 transition-colors shadow-lg font-thai"
                    >
                      ค้นหา
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filter */}
          <aside className="hidden lg:block w-1/4 shrink-0 space-y-6 font-thai sticky top-24 self-start">
            {/* Categories */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-kv-border">
              <h3 className="font-bold text-kv-navy mb-4 border-b pb-2">หมวดหมู่สินค้า</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li 
                  onClick={() => {
                    searchParams.delete('category');
                    setSearchParams(searchParams);
                    setCurrentPage(1);
                  }}
                  className={`flex justify-between items-center hover:text-kv-orange cursor-pointer transition-colors ${!categoryParam ? 'text-kv-orange font-bold' : ''}`}
                >
                  <span>ทั้งหมด</span>
                </li>
                {dbCategories.map((cat) => (
                  <li key={cat.id} className="space-y-2">
                    <div 
                      onClick={() => toggleCategory(cat.name)}
                      className={`flex justify-between items-center hover:text-kv-orange cursor-pointer transition-colors ${categoryParam === cat.name ? 'text-kv-orange font-bold' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{categoryCounts[cat.name] || 0} รายการ</span>
                      </div>
                      {expandedCategory === cat.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    
                    <AnimatePresence>
                      {expandedCategory === cat.name && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-4 space-y-2 border-l-2 border-gray-100 ml-1"
                        >
                          {loadingCategoryProducts === cat.name ? (
                            <li className="text-xs text-gray-400 py-1 flex items-center gap-2">
                              <Loader2 size={12} className="animate-spin" /> กำลังโหลด...
                            </li>
                          ) : categoryProducts[cat.name]?.length > 0 ? (
                            categoryProducts[cat.name].map((product) => (
                              <li key={product.id} className="group/item">
                                <div className="text-xs text-gray-500 hover:text-kv-orange cursor-default flex flex-col gap-0.5 py-1">
                                  <span className="font-medium line-clamp-1">{product.title}</span>
                                  <span className="text-[10px] text-kv-orange font-bold">฿{product.price.toLocaleString()}</span>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-gray-400 py-1 italic">ไม่มีสินค้าในหมวดหมู่นี้</li>
                          )}
                          <li 
                            onClick={() => {
                              searchParams.set('category', cat.name);
                              setSearchParams(searchParams);
                              setCurrentPage(1);
                            }}
                            className="text-xs text-kv-navy font-bold hover:text-kv-orange cursor-pointer py-1 mt-1 border-t border-gray-50 pt-2 flex items-center gap-1"
                          >
                            ดูสินค้าทั้งหมดในหมวดนี้ <ChevronRight size={10} />
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Filter */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-kv-border">
              <h3 className="font-bold text-kv-navy mb-4 border-b pb-2">ช่วงราคา</h3>
              <div className="space-y-4">
                <input type="range" className="w-full accent-kv-orange" min="0" max="10000" />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">฿</span>
                    <input type="number" placeholder="0" className="w-full pl-6 pr-2 py-2 border border-kv-border rounded text-sm outline-none focus:border-kv-orange" />
                  </div>
                  <span className="text-gray-400">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">฿</span>
                    <input type="number" placeholder="10,000" className="w-full pl-6 pr-2 py-2 border border-kv-border rounded text-sm outline-none focus:border-kv-orange" />
                  </div>
                </div>
                <button className="w-full bg-kv-navy text-white py-2 rounded font-bold hover:bg-kv-navy/90 transition-colors text-sm">
                  กรองราคา
                </button>
              </div>
            </div>

            {/* Brand Filter */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-kv-border">
              <h3 className="font-bold text-kv-navy mb-4 border-b pb-2">แบรนด์</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="brand"
                    checked={!brandParam}
                    onChange={() => {
                      searchParams.delete('brand');
                      setSearchParams(searchParams);
                      setCurrentPage(1);
                    }}
                    className="rounded-full border-gray-300 text-kv-orange focus:ring-kv-orange w-4 h-4" 
                  />
                  <span className="text-sm text-gray-600 group-hover:text-kv-orange transition-colors">ทั้งหมด</span>
                </label>
                {dbBrands.map((brand) => (
                  <label key={brand.id} className="flex items-center space-x-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="brand"
                      checked={brandParam === brand.name}
                      onChange={() => {
                        searchParams.set('brand', brand.name);
                        setSearchParams(searchParams);
                        setCurrentPage(1);
                      }}
                      className="rounded-full border-gray-300 text-kv-orange focus:ring-kv-orange w-4 h-4" 
                    />
                    <span className="text-sm text-gray-600 group-hover:text-kv-orange transition-colors">{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Condition Filter */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-kv-border">
              <h3 className="font-bold text-kv-navy mb-4 border-b pb-2">สภาพสินค้า</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="rounded border-gray-300 text-kv-orange focus:ring-kv-orange w-4 h-4" />
                    <span className="text-sm text-gray-600 group-hover:text-kv-orange transition-colors">มือหนึ่ง (New)</span>
                  </div>
                  <span className="text-xs text-gray-400">(45)</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="rounded border-gray-300 text-kv-orange focus:ring-kv-orange w-4 h-4" />
                    <span className="text-sm text-gray-600 group-hover:text-kv-orange transition-colors">มือสอง (Used)</span>
                  </div>
                  <span className="text-xs text-gray-400">(75)</span>
                </label>
              </div>
            </div>

            {/* Advertisement Banners (Vertical & Tall) */}
            <div className="space-y-4 flex flex-col">
              <div className="bg-kv-navy rounded-lg overflow-hidden relative group cursor-pointer shadow-md min-h-[450px] flex flex-col">
                <img 
                  src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=800&auto=format&fit=crop" 
                  alt="Special Offer" 
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy via-kv-navy/40 to-transparent"></div>
                <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                  <div className="mb-auto">
                    <span className="bg-kv-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-3 inline-block shadow-lg">PREMIUM SERVICE</span>
                    <h4 className="text-white font-black text-2xl leading-none mb-3 tracking-tighter uppercase">
                      EXPERT<br/>PRINTER<br/>REPAIR
                    </h4>
                    <div className="w-10 h-1 bg-kv-orange mb-4"></div>
                    <p className="text-white/90 text-[11px] font-medium mb-6">
                      Fast, reliable, and professional maintenance for all major brands.
                    </p>
                  </div>
                  
                  <button className="w-full bg-white text-kv-navy font-black py-3 rounded-xl hover:bg-kv-orange hover:text-white transition-all duration-300 shadow-xl text-xs">
                    BOOK NOW
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-6 relative overflow-hidden group cursor-pointer shadow-md min-h-[200px] flex flex-col justify-center">
                <div className="relative z-10">
                  <span className="text-white/80 text-[9px] font-bold tracking-widest uppercase mb-1 block">Premium Quality</span>
                  <h4 className="text-white font-black text-xl leading-tight mb-1">GENUINE<br/>INK & TONER</h4>
                  <p className="text-white/90 text-[11px] mb-4">100% Original Guaranteed</p>
                  <button className="bg-kv-navy text-white text-[10px] font-black py-2 px-6 rounded-full hover:bg-white hover:text-kv-navy transition-all duration-300 shadow-lg">
                    SHOP NOW
                  </button>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=400&q=80" 
                  alt="Ink" 
                  className="absolute right-[-20px] bottom-[-15px] w-32 h-32 object-contain opacity-30 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="bg-white border border-kv-border rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="text-kv-orange" size={24} />
                </div>
                <h4 className="text-kv-navy font-bold text-xs mb-1">รับประกันคุณภาพ</h4>
                <p className="text-gray-500 text-[9px] mb-3">สินค้าทุกชิ้นผ่านการตรวจสอบมาตรฐานสากล</p>
                <Link to="/contact" className="text-kv-orange font-bold text-[9px] hover:underline">
                  ติดต่อสอบถามเพิ่มเติม
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="w-full lg:w-3/4">
            {/* Mobile Banner */}
            <div className="lg:hidden mb-6 bg-kv-navy rounded-lg p-4 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-white font-black text-sm uppercase">Special Offer</h4>
                <p className="text-kv-orange text-[10px] font-bold">Get 10% off on your first order</p>
              </div>
              <Link to="/contact" className="relative z-10 bg-white text-kv-navy text-[10px] font-bold px-3 py-1.5 rounded-full">
                Contact Us
              </Link>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-kv-orange/20 to-transparent"></div>
            </div>

            {/* Top Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-kv-border mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-4">
                <button className="text-kv-orange"><Grid size={20} /></button>
                <button className="text-gray-400 hover:text-kv-orange"><List size={20} /></button>
                <span className="text-sm text-gray-500 border-l pl-4">แสดง {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ</span>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-kv-orange focus:ring-kv-orange" />
                  <span className="text-sm text-gray-600">สินค้าลดราคา</span>
                </label>
                <select className="p-2 border border-kv-border rounded text-sm outline-none focus:border-kv-orange">
                  <option>เรียงตามความนิยม</option>
                  <option>เรียงตามราคา: ต่ำไปสูง</option>
                  <option>เรียงตามราคา: สูงไปต่ำ</option>
                  <option>สินค้าใหม่ล่าสุด</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 w-full">
                <Loader2 size={40} className="text-kv-orange animate-spin mb-4" />
                <p className="text-gray-500 font-thai">กำลังโหลดสินค้า...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
                {products.map((item) => (
                  <div key={item.id} className="bg-white border border-kv-border rounded-lg overflow-hidden group hover:shadow-md transition-shadow flex flex-col relative">
                    <Link to={`/product/${item.id}`} className="relative h-40 md:h-48 bg-gray-100 block overflow-hidden">
                      {item.is_sale && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded z-10">
                          ลดพิเศษ
                        </span>
                      )}
                      <img 
                        src={item.image_url || item.image || `https://picsum.photos/seed/${item.id}/300/300`} 
                        alt={item.title || item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <div className="p-3 md:p-4 flex flex-col flex-grow">
                      <div className="text-[10px] text-gray-500 mb-1">{item.brand || 'Printer'}</div>
                      <Link to={`/product/${item.id}`} className="font-medium text-xs md:text-sm text-kv-navy hover:text-kv-orange transition-colors line-clamp-2 mb-2 flex-grow">
                        {item.title || item.name}
                      </Link>
                      <div className="flex items-center mb-2">
                        <div className="flex text-yellow-400 text-[10px]">
                          <Star size={10} fill="currentColor" />
                          <Star size={10} fill="currentColor" />
                          <Star size={10} fill="currentColor" />
                          <Star size={10} fill="currentColor" />
                          <Star size={10} fill="currentColor" />
                        </div>
                        <span className="text-[10px] text-gray-500 ml-1">(12)</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                          <span className="text-sm md:text-base font-bold text-kv-orange">฿{(item.price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-kv-navy text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-kv-orange transition-colors shadow-md z-10"
                    >
                      <ShoppingCart size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center mt-8">
              <div className="flex space-x-1">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-8 h-8 flex items-center justify-center rounded border border-kv-border bg-white text-gray-500 hover:bg-kv-gray disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  &lt;
                </button>
                
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show first page, last page, and pages around current page
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button 
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded border ${currentPage === pageNum ? 'border-kv-orange bg-kv-orange text-white' : 'border-kv-border bg-white text-gray-700 hover:bg-kv-gray'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === 2 && currentPage > 3) || 
                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={pageNum} className="w-8 h-8 flex items-center justify-center text-gray-500">...</span>;
                  }
                  return null;
                })}

                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-8 h-8 flex items-center justify-center rounded border border-kv-border bg-white text-gray-500 hover:bg-kv-gray disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  &gt;
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Success Message Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-4 right-4 md:left-auto md:bottom-12 md:right-12 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-50 flex items-center space-x-3"
          >
            <CheckCircle2 size={24} className="shrink-0" />
            <div>
              <p className="font-bold font-thai text-sm md:text-base">เพิ่มสินค้าสำเร็จ</p>
              <p className="text-xs md:text-sm opacity-90 font-thai">สินค้าได้ถูกเพิ่มลงในตะกร้าของคุณแล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
