import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft, Star, ShoppingCart, Clock, ShieldCheck, Truck, RotateCcw, MessageCircle, Menu, Crown, Wallet, Wrench, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

import nongKingAvatar from '../assets/nong-king.jpg';

export function HomePage() {
  const { addToCart } = useCart();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [bestDeals, setBestDeals] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryProducts, setCategoryProducts] = useState<Record<string, any[]>>({});
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState<string | null>(null);
  const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingBestDeals, setIsLoadingBestDeals] = useState(true);
  const [isLoadingBlog, setIsLoadingBlog] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  useEffect(() => {
    fetchBestSellers();
    fetchFeaturedProducts();
    fetchBestDeals();
    fetchBlogPosts();
    fetchDbCategories();
    fetchDbBrands();
  }, []);

  async function fetchDbCategories() {
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setDbCategories(data || []);

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
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function fetchDbBrands() {
    setIsLoadingBrands(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setDbBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setIsLoadingBrands(false);
    }
  }

  async function fetchBestSellers() {
    setIsLoadingBestSellers(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(6)
        .order('stock', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Fallback to random products
        const { data: randomData } = await supabase
          .from('products')
          .select('*')
          .limit(50);
        
        if (randomData && randomData.length > 0) {
          setBestSellers(randomData.sort(() => Math.random() - 0.5).slice(0, 6));
        } else {
          setBestSellers([]);
        }
      } else {
        setBestSellers(data);
      }
    } catch (error) {
      console.error('Error fetching best sellers:', error);
      setBestSellers([]);
    } finally {
      setIsLoadingBestSellers(false);
    }
  }

  async function fetchBestDeals() {
    setIsLoadingBestDeals(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_sale', true)
        .limit(6);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Fallback to random products
        const { data: randomData } = await supabase
          .from('products')
          .select('*')
          .limit(50);
        
        if (randomData && randomData.length > 0) {
          setBestDeals(randomData.sort(() => Math.random() - 0.5).slice(0, 6));
        } else {
          setBestDeals([]);
        }
      } else {
        setBestDeals(data);
      }
    } catch (error) {
      console.error('Error fetching best deals:', error);
      setBestDeals([]);
    } finally {
      setIsLoadingBestDeals(false);
    }
  }

  async function fetchFeaturedProducts() {
    setIsLoadingFeatured(true);
    try {
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_popular', true)
        .limit(8);

      if (error) throw error;
      
      // If no popular products, just get any products
      if (!data || data.length === 0) {
        const { data: allData, error: allErr } = await supabase
          .from('products')
          .select('*')
          .limit(50);
        if (!allErr && allData && allData.length > 0) {
          data = allData.sort(() => Math.random() - 0.5).slice(0, 8);
        } else {
          data = [];
        }
      }
      
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      setFeaturedProducts([]);
    } finally {
      setIsLoadingFeatured(false);
    }
  }

  async function fetchBlogPosts() {
    setIsLoadingBlog(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .limit(3)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setBlogPosts(data);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setIsLoadingBlog(false);
    }
  }

  const toggleCategory = async (categoryName: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (openCategory === categoryName) {
      setOpenCategory(null);
      return;
    }

    setOpenCategory(categoryName);

    // Fetch products for this category if not already fetched
    if (!categoryProducts[categoryName]) {
      setLoadingCategoryProducts(categoryName);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, image_url')
          .eq('category', categoryName)
          .limit(10); // Limit to 10 for sidebar

        if (error) throw error;
        if (data) {
          setCategoryProducts(prev => ({ ...prev, [categoryName]: data }));
        }
      } catch (error) {
        console.error('Error fetching category products:', error);
      } finally {
        setLoadingCategoryProducts(null);
      }
    }
  };

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
  return (
    <div className="w-full bg-white">
      <SEO 
        title="หน้าแรก - บริการงานพิมพ์คุณภาพสูง ครบวงจร"
        description="KingVision Print บริการงานพิมพ์คุณภาพสูง นามบัตร ใบปลิว สติ๊กเกอร์ และสื่อสิ่งพิมพ์ทุกชนิด พร้อมบริการออกแบบและจัดส่งทั่วประเทศ"
      />
      {/* 1. Hero Banner Slider (Static for now) */}
      <section className="pt-6 pb-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="relative bg-kv-navy text-white h-[250px] sm:h-[350px] md:h-[450px] flex items-center rounded-xl overflow-hidden shadow-lg group cursor-pointer">
            <div className="absolute inset-0 overflow-hidden">
              <img 
                src="https://img2.pic.in.th/hero-banner.jpg" 
                alt="กองทัพปริ้นเตอร์มือสองคุณภาพเยี่ยม" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1920&auto=format&fit=crop";
                  (e.target as HTMLImageElement).onerror = null;
                }}
              />
            </div>
            <div className="px-8 md:px-16 relative z-10 w-full flex justify-between items-center h-full">
              <button className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition-colors backdrop-blur-sm hidden md:flex"><ChevronLeft size={24} /></button>
              
              {/* Optional: Overlay content can be added here if needed in the future */}
              <div className="flex-1"></div>

              <button className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition-colors backdrop-blur-sm hidden md:flex"><ChevronRight size={24} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Icon Row */}
      <section className="py-12 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-kv-navy tracking-tight uppercase">หมวดหมู่ยอดนิยม</h2>
            <div className="h-px flex-1 bg-gray-100 mx-6 hidden md:block"></div>
            <Link to="/shop" className="text-kv-orange font-bold text-sm hover:underline flex items-center gap-1 group">
              ดูทั้งหมด <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          
          <div className="flex lg:grid lg:grid-cols-6 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 gap-6 scrollbar-hide snap-x snap-mandatory">
            {isLoadingCategories ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex-shrink-0 w-32 lg:w-auto">
                  <div className="aspect-square rounded-full bg-gray-100 mb-4 scale-90"></div>
                  <div className="h-4 bg-gray-100 rounded w-20 mx-auto"></div>
                </div>
              ))
            ) : dbCategories.length > 0 ? (
              dbCategories.slice(0, 6).map((cat, idx) => (
                <Link 
                  key={cat.id} 
                  to={`/shop?category=${cat.name}`} 
                  className="flex flex-col items-center group relative pt-4 pb-2 flex-shrink-0 w-32 lg:w-auto snap-center"
                >
                  {/* Card Background Decoration */}
                  <div className="absolute inset-0 bg-kv-navy/5 rounded-3xl opacity-0 lg:group-hover:opacity-100 transition-all duration-500 scale-90 lg:group-hover:scale-100 -z-10"></div>
                  
                  {/* Image Container */}
                  <div className="relative w-28 h-28 lg:w-32 lg:h-32 mb-4">
                    {/* Floating Circle Backdrop */}
                    <div className="absolute inset-0 bg-white rounded-full shadow-lg border border-gray-100 transition-all duration-500 lg:group-hover:scale-110 lg:group-hover:border-kv-orange/20 overflow-hidden">
                      {/* Ring Decoration */}
                      <div className="absolute -inset-2 border-2 border-kv-orange/0 rounded-full transition-all duration-700 lg:group-hover:border-kv-orange/10 lg:group-hover:rotate-45 z-10"></div>
                      
                      {/* Main Image - Changed from object-contain inside padding to object-cover filling circle */}
                      <img 
                        src={cat.image_url || `https://picsum.photos/seed/${cat.name}/150/150`} 
                        alt={cat.name} 
                        className="w-full h-full object-cover filter hover:scale-110 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>

                    {/* Badge/Count */}
                    {categoryCounts[cat.name] > 0 && (
                      <div className="absolute -top-1 -right-1 bg-kv-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-20 lg:group-hover:bg-kv-orange transition-colors duration-300">
                        {categoryCounts[cat.name]}
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="text-center relative">
                    <span className="font-black text-kv-navy lg:group-hover:text-kv-orange transition-colors text-xs lg:text-base tracking-tight uppercase block leading-tight">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden lg:block opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                      Explore Products
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-gray-400">ไม่พบหมวดหมู่</div>
            )}
          </div>
        </div>

        {/* Decorative elements behind cards */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-kv-orange/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-kv-navy/5 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* Two Column Layout Section */}
      <section className="py-8 bg-kv-gray">
        <div className="container mx-auto px-4">
          
          {/* Top Row: Sidebar + Main Content */}
          <div className="flex flex-col lg:flex-row gap-8 mb-12 items-stretch">
            
            {/* Left Sidebar - Categories & Banners */}
            <aside className="w-full lg:w-[320px] flex-shrink-0 hidden lg:block space-y-6 sticky top-24 self-start">
              <div className="bg-white rounded-lg shadow-sm border border-kv-border overflow-hidden">
                <div className="bg-gray-100 p-4 border-b border-kv-border flex items-center font-bold text-kv-navy text-lg">
                  <Menu className="mr-3" size={24} /> หมวดหมู่ทั้งหมด
                </div>
                <ul className="divide-y divide-kv-border">
                  {isLoadingCategories ? (
                    [...Array(6)].map((_, i) => (
                      <li key={i} className="p-3 animate-pulse flex items-center gap-3">
                        <div className="w-6 h-6 bg-gray-100 rounded-full"></div>
                        <div className="h-3 bg-gray-100 rounded w-24"></div>
                      </li>
                    ))
                  ) : dbCategories.map((cat) => (
                    <li key={cat.id}>
                      <Link 
                        to={`/shop?category=${cat.name}`}
                        className="flex items-center justify-between p-3 hover:text-kv-orange hover:bg-orange-50 transition-colors group"
                      >
                        <div className="flex items-center">
                          <div className="w-6 h-6 mr-3 flex items-center justify-center overflow-hidden rounded bg-gray-50 p-0.5">
                            {cat.image_url ? (
                              <img src={cat.image_url} alt={cat.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-sm">📦</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-kv-orange">{cat.name}</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-400 group-hover:text-kv-orange group-hover:translate-x-1 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Advertisement Banners (Vertical & Tall) */}
              <div className="space-y-4 flex flex-col h-full">
                <div className="bg-kv-navy rounded-lg overflow-hidden relative group cursor-pointer shadow-md flex-1 min-h-[600px] flex flex-col">
                  <img 
                    src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=800&auto=format&fit=crop" 
                    alt="Special Offer" 
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-kv-navy via-kv-navy/40 to-transparent"></div>
                  <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                    <div className="mb-auto">
                      <span className="bg-kv-orange text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-4 inline-block shadow-lg">PREMIUM SERVICE</span>
                      <h4 className="text-white font-black text-4xl leading-none mb-4 tracking-tighter uppercase">
                        EXPERT<br/>PRINTER<br/>REPAIR
                      </h4>
                      <div className="w-12 h-1 bg-kv-orange mb-6"></div>
                      <p className="text-white/90 text-sm font-medium mb-8 max-w-[200px]">
                        Fast, reliable, and professional maintenance for all major brands.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <p className="text-kv-orange font-black text-2xl mb-1">SAVE 20%</p>
                        <p className="text-white text-[10px] font-bold uppercase tracking-widest">On your first service</p>
                      </div>
                      <button className="w-full bg-white text-kv-navy font-black py-4 rounded-xl hover:bg-kv-orange hover:text-white transition-all duration-300 shadow-xl transform group-hover:-translate-y-1">
                        BOOK NOW
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

          {/* Right Content */}
          <div className="w-full lg:flex-1 space-y-10">
            
            {/* Featured Products */}
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-kv-navy">สินค้าแนะนำ</h2>
            </div>
            <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 sm:pb-0 scrollbar-hide snap-x snap-mandatory">
                {isLoadingFeatured ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <Loader2 size={32} className="text-kv-orange animate-spin mb-2" />
                    <p className="text-xs text-gray-500 font-thai">กำลังโหลดสินค้าแนะนำ...</p>
                  </div>
                ) : featuredProducts.length > 0 ? (
                  featuredProducts.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 group hover:shadow-md transition-shadow flex flex-col relative flex-shrink-0 w-[280px] sm:w-auto snap-center">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-wrap gap-1">
                          {item.is_sale && <span className="bg-[#f7941d] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Sale</span>}
                          {item.is_popular && <span className="bg-kv-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Popular</span>}
                          {item.is_new && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">New!</span>}
                        </div>
                        <div className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {item.grade || 'Grade A'}
                        </div>
                      </div>
                      
                      <Link to={`/product/${item.id}`} className="flex gap-3 flex-grow mb-2 group/link">
                        <div className="w-28 h-28 aspect-square flex-shrink-0 bg-white rounded flex items-center justify-center overflow-hidden">
                          <img 
                            src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/${item.id}/300/300`} 
                            alt={item.title || item.name} 
                            className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow flex flex-col pt-1">
                          <h3 className="font-bold text-xs text-gray-800 group-hover/link:text-blue-600 transition-colors line-clamp-2 mb-1">
                            {item.title || item.name}
                          </h3>
                          <div className="flex text-gray-300 text-[10px] mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className={i < 4 ? "text-yellow-400" : "text-gray-200"} fill={i < 4 ? "currentColor" : "none"} />
                            ))}
                          </div>
                          <div className="mt-auto text-right">
                            <div className="text-base font-bold text-[#c94c28]">฿{(item.price || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex gap-1.5">
                          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors">
                            <RotateCcw size={12} />
                          </button>
                          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors">
                            <Search size={12} />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="text-blue-600 text-[11px] font-bold flex items-center hover:text-blue-700 transition-colors font-thai"
                        >
                          เพิ่มลงตะกร้า <ArrowRight size={12} className="ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-400 font-thai">ไม่มีสินค้าแนะนำในขณะนี้</div>
                )}
              </div>

            {/* 3 Promotional Banners */}
            <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-4 my-8 scrollbar-hide snap-x snap-mandatory">
              {/* Banner 1 */}
              <div className="bg-[#00529b] rounded-lg p-6 flex flex-col justify-center relative overflow-hidden group min-h-[180px] flex-shrink-0 w-[85%] md:w-auto snap-center">
                <div className="relative z-10">
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">Up to 40% Off</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-1 uppercase tracking-tight">PRINTERS</h3>
                  <p className="text-white/90 text-sm mb-4">Print smoothly!</p>
                  <button className="bg-white text-kv-navy text-xs font-bold px-4 py-2 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&q=80" 
                  alt="Printers" 
                  className="absolute right-[-20px] bottom-[-20px] h-32 object-contain mix-blend-screen opacity-50 group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Banner 2 */}
              <div className="bg-[#27ae60] rounded-lg p-6 flex flex-col justify-center relative overflow-hidden group min-h-[180px] flex-shrink-0 w-[85%] md:w-auto snap-center">
                <div className="relative z-10">
                  <span className="bg-[#00529b] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">Top brands</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-1 uppercase tracking-tight">INK & TONER</h3>
                  <p className="text-white/90 text-sm mb-4">You need</p>
                  <button className="bg-white text-kv-navy text-xs font-bold px-4 py-2 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=300&q=80" 
                  alt="Ink & Toner" 
                  className="absolute right-[-20px] bottom-[-20px] h-32 object-contain mix-blend-screen opacity-50 group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Banner 3 */}
              <div className="bg-[#f39c12] rounded-lg p-6 flex flex-col justify-center relative overflow-hidden group min-h-[180px] flex-shrink-0 w-[85%] md:w-auto snap-center">
                <div className="relative z-10">
                  <span className="bg-[#c0392b] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">Top brands</span>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">SPARE PARTS</h3>
                  <p className="text-gray-800 text-sm mb-4">Fix it up!</p>
                  <button className="bg-white text-kv-navy text-xs font-bold px-4 py-2 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1563452675059-efa1e2e7a787?w=300&q=80" 
                  alt="Spare Parts" 
                  className="absolute right-[-20px] bottom-[-20px] h-32 object-contain mix-blend-multiply opacity-50 group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
          </div>
          {/* End Top Row Right Content */}
        </div>
        {/* End Top Row */}
      </section>

      {/* Full Width Banner */}
      <section className="w-full bg-[#1a1a1a] relative overflow-hidden flex items-center min-h-[300px] md:min-h-[400px]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=1600&q=80" 
            alt="Printer System" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/90 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <span className="bg-[#c94c28] text-white text-xs font-bold px-3 py-1 rounded inline-block mb-4">Top brands</span>
            <h2 className="text-3xl md:text-6xl font-black text-[#f39c12] mb-2 uppercase tracking-tight leading-none">PRINTER SYSTEM</h2>
            <h3 className="text-2xl md:text-5xl font-black text-white mb-4 uppercase tracking-tight leading-none">WE'VE GOT YOU COVERED</h3>
            <p className="text-base md:text-xl mb-8 font-medium text-white/90">Great Values. Always.</p>
            <button className="bg-white text-gray-900 text-sm font-bold px-8 py-3 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
              Shop now <ChevronRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Best Selling Products Section */}
      <section className="py-12 bg-kv-gray">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: 2 Banners (Desktop only) */}
            <aside className="hidden lg:flex w-1/4 flex-col gap-6">
              {/* Top Banner */}
              <div className="bg-[#00529b] rounded-lg p-6 flex flex-col relative overflow-hidden group flex-1 min-h-[300px]">
                <div className="relative z-10">
                  <span className="bg-[#c94c28] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-3">Save 25%. All in One!</span>
                  <h3 className="text-white font-black text-3xl mb-2 uppercase tracking-tight leading-none">PRINTER<br/>CARE KIT</h3>
                  <p className="text-white/90 mb-6 text-sm">Clean and shine!</p>
                  <button className="bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <img src="https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=400&q=80" alt="Care Kit" className="absolute bottom-[-20px] right-[-20px] w-[120%] max-w-none object-contain opacity-50 mix-blend-screen group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>

              {/* Bottom Banner */}
              <div className="bg-[#c94c28] rounded-lg p-6 flex flex-col relative overflow-hidden group flex-1 min-h-[300px]">
                <div className="relative z-10">
                  <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-1 rounded inline-block mb-3">Save 25%. All in One!</span>
                  <h3 className="text-white font-black text-3xl mb-2 uppercase tracking-tight leading-none">NEW<br/>BRAND</h3>
                  <p className="text-white/90 mb-6 text-sm">Let your printer shine!</p>
                  <button className="bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <img src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80" alt="New Brand" className="absolute bottom-[-20px] right-[-20px] w-[120%] max-w-none object-contain opacity-50 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
            </aside>

            {/* Right Column: Products & Bottom Banner */}
            <div className="w-full lg:w-3/4 flex flex-col">
              
              {/* Header */}
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-kv-navy">สินค้าขายดี</h2>
              </div>
              {/* Products Grid */}
              {isLoadingBestSellers ? (
                <div className="flex flex-col items-center justify-center py-20 w-full">
                  <Loader2 size={40} className="text-kv-orange animate-spin mb-4" />
                  <p className="text-gray-500 font-thai">กำลังโหลดสินค้าขายดี...</p>
                </div>
              ) : (
                <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6 pb-4 sm:pb-0 scrollbar-hide snap-x snap-mandatory">
                  {bestSellers.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 group hover:shadow-md transition-shadow flex flex-col relative flex-shrink-0 w-[280px] sm:w-auto snap-center">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-wrap gap-1">
                          {item.is_sale && <span className="bg-[#f7941d] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Sale</span>}
                          {item.is_popular && <span className="bg-kv-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Popular</span>}
                          {item.is_new && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">New!</span>}
                        </div>
                        <div className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {item.grade || 'Grade A'}
                        </div>
                      </div>
                      
                      <div className="flex gap-3 flex-grow mb-2">
                        <div className="w-28 h-28 aspect-square flex-shrink-0 bg-white rounded flex items-center justify-center overflow-hidden">
                          <img 
                            src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : (item.image && item.image.trim() !== '') ? item.image : `https://picsum.photos/seed/${item.id}/300/300`} 
                            alt={item.title || item.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow flex flex-col pt-1">
                          <Link to={`/product/${item.id}`} className="font-bold text-xs text-gray-800 hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                            {item.title || item.name}
                          </Link>
                          <div className="flex text-gray-300 text-[10px] mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className={i < 4 ? "text-yellow-400" : "text-gray-200"} fill={i < 4 ? "currentColor" : "none"} />
                            ))}
                          </div>
                          <div className="mt-auto text-right">
                            <div className="text-base font-bold text-[#c94c28]">฿{(item.price || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex gap-1.5">
                          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors">
                            <RotateCcw size={12} />
                          </button>
                          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors">
                            <Search size={12} />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="text-blue-600 text-[11px] font-bold flex items-center hover:text-blue-700 transition-colors font-thai"
                        >
                          เพิ่มลงตะกร้า <ArrowRight size={12} className="ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Banner (Desktop only) */}
              <div className="hidden lg:flex w-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group mt-auto">
                <div className="relative z-10 flex-1 mb-6 md:mb-0">
                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-3 uppercase">Top Brands</span>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 uppercase tracking-tight">NEW COLLECTION</h2>
                  <p className="text-gray-800 text-sm md:text-base mb-4">Take care of your printers</p>
                  <button className="bg-[#c94c28] text-white text-xs font-bold px-5 py-2 rounded flex items-center hover:bg-red-700 transition-colors w-max shadow-md">
                    Shop now <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
                <div className="flex-1 flex justify-center md:justify-end relative z-10 w-full">
                  <img 
                    src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&q=80" 
                    alt="New Collection" 
                    className="h-32 md:h-40 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Mobile Banners Layout (Visible only on mobile) */}
          <div className="lg:hidden mt-8 space-y-4">
            {/* Top Yellow Banner */}
            <div className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-6 flex flex-col relative overflow-hidden group">
              <div className="relative z-10">
                <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-3 uppercase">Top Brands</span>
                <h2 className="text-3xl font-black text-gray-900 mb-1 uppercase tracking-tight">NEW COLLECTION</h2>
                <p className="text-gray-800 text-sm mb-6">Take care of your printers</p>
                <button className="bg-[#c94c28] text-white text-sm font-bold px-6 py-2.5 rounded flex items-center hover:bg-red-700 transition-colors w-max shadow-md">
                  Shop now <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&q=80" 
                alt="New Collection" 
                className="absolute right-[-20px] bottom-[-10px] h-32 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Side-by-Side Banners */}
            <div className="grid grid-cols-2 gap-4">
              {/* Blue Banner */}
              <div className="bg-[#00529b] rounded-lg p-4 flex flex-col relative overflow-hidden group min-h-[220px]">
                <div className="relative z-10">
                  <span className="bg-[#c94c28] text-white text-[8px] font-bold px-1.5 py-0.5 rounded inline-block mb-2">Save 25%. All in One!</span>
                  <h3 className="text-white font-black text-xl mb-1 uppercase tracking-tight leading-none">PRINTER<br/>CARE KIT</h3>
                  <p className="text-white/90 mb-4 text-[10px]">Clean and shine!</p>
                  <button className="bg-white text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={12} className="ml-1" />
                  </button>
                </div>
                <img src="https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=400&q=80" alt="Care Kit" className="absolute bottom-[-10px] right-[-10px] w-[90%] object-contain opacity-50 mix-blend-screen group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>

              {/* Red Banner */}
              <div className="bg-[#c94c28] rounded-lg p-4 flex flex-col relative overflow-hidden group min-h-[220px]">
                <div className="relative z-10">
                  <span className="bg-yellow-400 text-gray-900 text-[8px] font-bold px-1.5 py-0.5 rounded inline-block mb-2">Save 25%. All in One!</span>
                  <h3 className="text-white font-black text-xl mb-1 uppercase tracking-tight leading-none">NEW<br/>BRAND</h3>
                  <p className="text-white/90 mb-4 text-[10px]">Let your printer shine!</p>
                  <button className="bg-white text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={12} className="ml-1" />
                  </button>
                </div>
                <img src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80" alt="New Brand" className="absolute bottom-[-10px] right-[-10px] w-[90%] object-contain opacity-50 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Row: Tall Banner + Best Deals */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Banner (Tall) */}
          <aside className="w-full lg:w-1/4 hidden lg:block">
            <div className="bg-gradient-to-b from-[#c94c28] to-[#8b2e16] rounded-lg p-8 flex flex-col relative overflow-hidden group h-full shadow-lg">
              <div className="relative z-10">
                <span className="bg-[#f1c40f] text-gray-900 text-xs font-bold px-3 py-1 rounded inline-block mb-6 shadow-sm">Special deals</span>
                <h3 className="text-white font-bold text-2xl mb-1 uppercase tracking-tight">ONE TIME SPECIAL</h3>
                <h2 className="text-white font-black text-6xl mb-6 tracking-tighter leading-none">BUYS</h2>
                <p className="text-white/90 mb-10 text-lg font-medium">Good Values. Always.</p>
                <button className="bg-white text-gray-900 text-sm font-bold px-6 py-3 rounded flex items-center hover:bg-gray-100 transition-all hover:px-8 w-max shadow-lg group/btn">
                  Shop now <ChevronRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="mt-auto relative z-10 -mx-8 -mb-8 pt-10">
                <img 
                  src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80" 
                  alt="Special Buys Products" 
                  className="w-full object-contain transform group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>
          </aside>

          {/* Right Content - Bottom */}
          <div className="w-full lg:w-3/4 space-y-10">
            
            {/* Best Deals of the week */}
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-kv-navy">ดีลเด็ดประจำสัปดาห์!</h2>
                  <div className="flex items-center space-x-1">
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-kv-orange hover:border-kv-orange transition-colors"><ChevronLeft size={16} /></button>
                  <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-kv-orange hover:border-kv-orange transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* Products Grid */}
              {isLoadingBestDeals ? (
                <div className="flex flex-col items-center justify-center py-20 w-full">
                  <Loader2 size={40} className="text-kv-orange animate-spin mb-4" />
                  <p className="text-gray-500 font-thai">กำลังโหลดดีลเด็ด...</p>
                </div>
              ) : (
                <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 sm:pb-0 scrollbar-hide snap-x snap-mandatory">
                  {bestDeals.length > 0 ? (
                    bestDeals.map((item) => (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-4 group hover:shadow-md transition-shadow flex flex-col relative flex-shrink-0 w-[280px] sm:w-auto snap-center">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap gap-1">
                            {item.is_sale && <span className="bg-[#f7941d] text-white text-[10px] font-bold px-2 py-0.5 rounded">Sale</span>}
                            {item.is_popular && <span className="bg-kv-navy text-white text-[10px] font-bold px-2 py-0.5 rounded">Popular</span>}
                            {item.is_new && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">New!</span>}
                          </div>
                          <div className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.grade || 'Grade A'}
                          </div>
                        </div>
                        
                        <Link to={`/product/${item.id}`} className="flex gap-4 flex-grow mb-3 group/link">
                          <div className="w-24 h-24 aspect-square flex-shrink-0 bg-white rounded flex items-center justify-center overflow-hidden">
                            <img 
                              src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/${item.id}/300/300`} 
                              alt={item.title || item.name} 
                              className="w-full h-full object-cover group-hover/link:scale-110 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-grow flex flex-col">
                            <h3 className="font-bold text-sm text-gray-800 group-hover/link:text-blue-600 transition-colors line-clamp-2 mb-1 leading-tight">
                              {item.title || item.name}
                            </h3>
                            <div className="flex text-gray-300 text-[10px] mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={i < 4 ? "text-yellow-400" : "text-gray-200"} fill={i < 4 ? "currentColor" : "none"} />
                              ))}
                              <span className="text-gray-400 ml-1">(1)</span>
                            </div>
                            <div className="mt-auto text-right">
                              <div className="text-lg font-bold text-[#c94c28]">฿{(item.price || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center justify-end pt-3 border-t border-gray-50">
                          <button 
                            onClick={() => handleAddToCart(item)}
                            className="text-blue-600 text-sm font-bold flex items-center hover:text-blue-800 transition-colors group/cart font-thai"
                          >
                            เพิ่มลงตะกร้า <ArrowRight size={16} className="ml-1 group-hover/cart:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-400 font-thai">ไม่มีดีลเด็ดในขณะนี้</div>
                  )}
                </div>
              )}

              {/* Mobile Banner (Visible only on small screens) */}
              <div className="w-full bg-[#c94c28] rounded-lg p-6 flex flex-col relative overflow-hidden group min-h-[300px] lg:hidden mt-6">
                <div className="relative z-10">
                  <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">Special deals</span>
                  <h3 className="text-white font-bold text-xl mb-1">ONE TIME SPECIAL</h3>
                  <h2 className="text-white font-black text-4xl mb-4 tracking-tight leading-none">BUYS</h2>
                  <p className="text-white mb-6 text-base">Good Values. Always.</p>
                  <button className="bg-white text-gray-900 text-sm font-bold px-5 py-2.5 rounded flex items-center hover:bg-gray-100 transition-colors w-max">
                    Shop now <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
                <img src="https://picsum.photos/seed/filters/400/400" alt="Special Buys" className="absolute bottom-0 right-0 w-[100%] max-w-none object-cover opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-500 translate-x-10 translate-y-10" referrerPolicy="no-referrer" />
              </div>
              </div>
            </div>

          </div>
          {/* End Bottom Row Right Content */}
        </div>
        {/* End Bottom Row */}
      </section>


      {/* Store Features Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-kv-navy mb-8 md:mb-10">มั่นใจได้ทุกการสั่งซื้อ</h2>
          <div className="grid grid-rows-2 grid-flow-col overflow-x-auto gap-4 pb-8 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
            
            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">รับประกันสินค้านาน 3 เดือน</h4>
                <p className="text-sm text-gray-600 leading-relaxed">สินค้าทุกชิ้นผ่านการตรวจสอบคุณภาพอย่างละเอียด พร้อมรับประกันการใช้งาน</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <Truck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">ส่งฟรี กรุงเทพฯ และปริมณฑล</h4>
                <p className="text-sm text-gray-600 leading-relaxed">บริการจัดส่งฟรีถึงหน้าบ้าน สำหรับลูกค้าในเขตกรุงเทพฯ และปริมณฑล</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <Wallet size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">มีบริการเก็บเงินปลายทาง</h4>
                <p className="text-sm text-gray-600 leading-relaxed">สะดวก ปลอดภัย รอรับสินค้าและชำระเงินที่หน้าบ้านได้เลย</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <MessageCircle size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">ให้คำปรึกษาฟรี</h4>
                <p className="text-sm text-gray-600 leading-relaxed">ทีมช่างผู้ชำนาญการพร้อมให้คำแนะนำทั้งก่อนและหลังการขาย</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <Wrench size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">อะไหล่แท้และเทียบเท่า</h4>
                <p className="text-sm text-gray-600 leading-relaxed">มีอะไหล่รองรับทุกรุ่น มั่นใจได้ในคุณภาพและอายุการใช้งาน</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg flex items-start space-x-4 hover:shadow-md transition-shadow border border-gray-100 flex-shrink-0 w-[280px] md:w-auto snap-center">
              <div className="text-kv-orange p-2 bg-orange-50 rounded-full flex-shrink-0">
                <RotateCcw size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-kv-navy mb-1">เปลี่ยน/คืนสินค้าได้ใน 7 วัน</h4>
                <p className="text-sm text-gray-600 leading-relaxed">หากสินค้ามีปัญหาจากการใช้งานปกติ สามารถเปลี่ยนหรือคืนได้ทันที</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-12 md:py-16 bg-[#00529b] text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-center">
            
            {/* Left Content */}
            <div className="w-full lg:w-1/3 text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight">สาระน่ารู้เกี่ยวกับ<br className="hidden lg:block"/>ปริ้นเตอร์มือสอง</h2>
              <p className="text-blue-100 mb-8 text-sm md:text-base leading-relaxed max-w-md mx-auto lg:mx-0">
                รวมบทความ เทคนิคการเลือกซื้อ การดูแลรักษา และการแก้ไขปัญหาเบื้องต้นสำหรับปริ้นเตอร์มือสอง เพื่อให้คุณใช้งานได้อย่างคุ้มค่าที่สุด
              </p>
              <button className="bg-white text-[#00529b] font-bold px-6 py-3 rounded flex items-center justify-center mx-auto lg:mx-0 hover:bg-gray-100 transition-colors">
                อ่านบทความทั้งหมด <ArrowRight size={18} className="ml-2" />
              </button>
            </div>

            {/* Right Content (Article Cards) */}
            <div className="w-full lg:w-2/3 flex overflow-x-auto gap-6 pb-8 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
              {isLoadingBlog ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="text-white animate-spin mb-2" />
                  <p className="text-xs text-blue-100 font-thai">กำลังโหลดบทความ...</p>
                </div>
              ) : blogPosts.length > 0 ? (
                blogPosts.map((post) => (
                  <Link key={post.id} to={`/blog/${post.id}`} className="group flex-shrink-0 w-[280px] lg:w-auto snap-center">
                    <div className="relative rounded-lg overflow-hidden mb-4 aspect-video bg-gray-800">
                      <img 
                        src={post.image_url || "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&q=80"} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <h3 className="font-bold text-lg leading-snug group-hover:text-yellow-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-blue-200 font-thai">ไม่มีบทความในขณะนี้</div>
              )}
            </div>

          </div>
        </div>
      </section>
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
