import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import { ChevronRight, Star, ShoppingCart, ShieldCheck, Truck, RotateCcw, MessageCircle, Menu, Crown, Wallet, Wrench, ArrowRight, CheckCircle2, Image as ImageIcon } from 'lucide-react';

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

  // Sort helper: printers first, then ink/parts/others
  function sortPrintersFirst(products: any[]): any[] {
    const PRINTER_KEYWORDS = ['ปริ้น', 'พิมพ์', 'printer'];
    const SECONDARY_KEYWORDS = ['หมึก', 'อะไหล่', 'ink', 'toner', 'drum', 'กระดาษ'];
    const score = (p: any) => {
      const cat = (p.category || '').toLowerCase();
      if (PRINTER_KEYWORDS.some(kw => cat.includes(kw))) return 2;
      if (SECONDARY_KEYWORDS.some(kw => cat.includes(kw))) return 1;
      return 0;
    };
    return [...products].sort((a, b) => score(b) - score(a));
  }



  async function fetchDbCategories() {

    setIsLoadingCategories(true);

    try {

      const { data, error } = await supabase

        .from('categories')

        .select('*')

        .order('name', { ascending: true });

      if (error) throw error;

      setDbCategories(data || []);



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

        .limit(30);



      if (error) throw error;



      const sorted = sortPrintersFirst(data || []);

      setBestSellers(sorted.slice(0, 6));

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

        .limit(30);



      if (error) throw error;



      const sorted = sortPrintersFirst(data || []);

      setBestDeals(sorted.slice(0, 6));

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

      // Try is_popular first; fall back to all products
      let { data, error } = await supabase

        .from('products')

        .select('*')

        .eq('is_popular', true)

        .limit(30);



      if (error) throw error;



      if (!data || data.length === 0) {

        const { data: allData, error: allErr } = await supabase

          .from('products')

          .select('*')

          .limit(30);

        if (!allErr) data = allData;

      }



      const sorted = sortPrintersFirst(data || []);

      setFeaturedProducts(sorted.slice(0, 8));

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

        .order('created_at', { ascending: false })

        .limit(5);



      if (error) throw error;

      setBlogPosts(data || []);

    } catch (error) {

      console.error('Error fetching blog posts:', error);

      setBlogPosts([]);

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

    if (!categoryProducts[categoryName]) {

      setLoadingCategoryProducts(categoryName);

      try {

        const { data, error } = await supabase

          .from('products')

          .select('id, title, price, image_url')

          .eq('category', categoryName)

          .limit(10);

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

        title="KingVision Print - ศูนย์รวมเครื่องปริ้นเตอร์และอุปกรณ์คุณภาพ"

        description="KingVision Print ศูนย์รวมเครื่องปริ้นเตอร์มือสอง หมึกพิมพ์ อะไหล่ และอุปกรณ์เสริม คุณภาพสูง ราคาถูก รับประกัน 3 เดือน จัดส่งทั่วประเทศ"

      />



      {/* HERO */}
      <section className="relative bg-kv-navy overflow-hidden min-h-[580px] md:min-h-[680px] flex items-center">

        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=1920&q=85&auto=format&fit=crop"
            alt="KingVision Print Hero"
            className="w-full h-full object-cover object-center opacity-50"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-kv-navy via-kv-navy/90 to-kv-navy/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-kv-navy/50 via-transparent to-kv-navy/40" />
        </div>

        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-kv-orange/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* LEFT: Text content */}
            <div className="flex-1 max-w-xl">

              <div className="inline-flex items-center gap-2 bg-kv-orange/15 border border-kv-orange/25 text-kv-orange text-xs font-bold px-4 py-1.5 rounded-full mb-6">
                <Crown size={12} />
                ศูนย์รวมเครื่องปริ้นเตอร์ครบวงจร
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-[1.15] mb-5">
                <span className="block">เครื่องปริ้นเตอร์</span>
                <span className="relative inline-block">
                  <span className="text-kv-orange">คุณภาพเยี่ยม</span>
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-kv-orange/40 rounded-full" />
                </span>
                <span className="block mt-1">ราคาคุ้มค่า</span>
              </h1>

              <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                เลือกซื้อเครื่องปริ้นเตอร์มือสอง หมึกพิมพ์ อะไหล่ และอุปกรณ์เสริมกว่า
                <span className="text-white font-semibold"> 100+ รายการ</span>{' '}
                พร้อมรับประกัน 3 เดือน โดยทีมช่างผู้เชี่ยวชาญ
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  to="/shop"
                  className="group bg-kv-orange hover:bg-orange-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  ดูสินค้าทั้งหมด
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <Link
                  to="/contact"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 font-bold px-7 py-3.5 rounded-xl transition-all duration-300 backdrop-blur-sm flex items-center gap-2"
                >
                  <MessageCircle size={17} /> ปรึกษาฟรี
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {[
                  { icon: <ShieldCheck size={13} />, label: 'รับประกัน 3 เดือน' },
                  { icon: <Truck size={13} />, label: 'ส่งฟรี กทม. & ปริมณฑล' },
                  { icon: <RotateCcw size={13} />, label: 'คืนสินค้าได้ใน 7 วัน' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-1.5 text-white/60 text-xs">
                    <span className="text-kv-orange/80">{t.icon}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Printer collage desktop only */}
            <div className="hidden lg:block relative w-[460px] h-[400px] flex-shrink-0">
              <div className="absolute top-0 left-0 w-[260px] h-[190px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80" alt="Printer 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy/60 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white text-[10px] font-black bg-kv-orange px-2 py-0.5 rounded-full">เครื่องปริ้นเตอร์</span>
              </div>
              <div className="absolute top-0 right-0 w-[185px] h-[175px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src="https://images.unsplash.com/photo-1563452675059-efa1e2e7a787?w=300&q=80" alt="Printer 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy/60 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white text-[10px] font-black bg-kv-navy/80 px-2 py-0.5 rounded-full">อะไหล่</span>
              </div>
              <div className="absolute bottom-0 left-0 w-[195px] h-[195px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src="https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=300&q=80" alt="Printer 3" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy/60 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white text-[10px] font-black bg-kv-navy/80 px-2 py-0.5 rounded-full">หมึกพิมพ์</span>
              </div>
              <div className="absolute bottom-0 right-0 w-[250px] h-[210px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&q=80" alt="Printer 4" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy/60 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white text-[10px] font-black bg-green-600 px-2 py-0.5 rounded-full">✓ พร้อมส่ง</span>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kv-navy/90 backdrop-blur-sm border border-kv-orange/40 rounded-2xl px-4 py-2.5 text-center shadow-xl z-10">
                <div className="text-kv-orange font-black text-2xl leading-none">100+</div>
                <div className="text-white/70 text-[10px] font-bold mt-0.5">รายการสินค้า</div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom fade to white */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { value: '1,000+', label: 'รายการสินค้า', icon: <ShoppingCart size={20} /> },
              { value: '50+', label: 'แบรนด์ชั้นนำ', icon: <Crown size={20} /> },
              { value: '10,000+', label: 'ลูกค้าพึงพอใจ', icon: <Star size={20} /> },
              { value: '10 ปี', label: 'ประสบการณ์', icon: <ShieldCheck size={20} /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 py-5 px-4 md:px-8">
                <div className="text-kv-orange flex-shrink-0">{s.icon}</div>
                <div>
                  <p className="text-xl font-black text-kv-navy leading-none">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-kv-navy">หมวดหมู่สินค้า</h2>
            <Link to="/shop" className="text-sm text-kv-orange font-semibold hover:underline flex items-center gap-1">
              ดูทั้งหมด <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {isLoadingCategories
              ? [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-2xl bg-gray-200 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
                </div>
              ))
              : dbCategories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white border-2 border-transparent group-hover:border-kv-orange transition-all duration-300 shadow-sm group-hover:shadow-md">
                    <img
                      src={cat.image_url || `https://picsum.photos/seed/${cat.name}/200/200`}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {categoryCounts[cat.name] > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-kv-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {categoryCounts[cat.name]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-700 group-hover:text-kv-orange transition-colors text-center leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* PROMO BANNERS */}
      <section className="py-6 bg-gray-50">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
            {[
              {
                to: '/shop?category=เครื่องปริ้นเตอร์',
                bg: 'from-blue-900 to-blue-700',
                badge: 'ลด 40%',
                badgeColor: 'bg-green-500',

                title: 'เครื่องปริ้นเตอร์',

                sub: 'มือสองคุณภาพสูง',

                img: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&q=80',

              },

              {

                to: '/shop?category=หมึกพิมพ์',

                bg: 'from-emerald-800 to-emerald-600',

                badge: 'สินค้าใหม่',

                badgeColor: 'bg-kv-orange',

                title: 'หมึกพิมพ์',

                sub: 'ทุกยี่ห้อ ทุกรุ่น',

                img: 'https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=300&q=80',

              },

              {

                to: '/shop?category=อะไหล่',

                bg: 'from-orange-700 to-orange-500',

                badge: 'อะไหล่แท้',

                badgeColor: 'bg-red-600',

                title: 'อะไหล่ & ซ่อม',

                sub: 'อะไหล่ครบทุกรุ่น',

                img: 'https://images.unsplash.com/photo-1563452675059-efa1e2e7a787?w=300&q=80',

              },

            ].map((b) => (

              <Link

                key={b.to}

                to={b.to}

                className={`bg-gradient-to-br ${b.bg} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group min-h-[160px] flex-shrink-0 w-[85vw] md:w-auto snap-center`}

              >

                <div className="relative z-10">

                  <span className={`${b.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full inline-block mb-3`}>

                    {b.badge}

                  </span>

                  <h3 className="text-2xl font-black text-white leading-tight">{b.title}</h3>

                  <p className="text-white/70 text-sm mt-1 mb-4">{b.sub}</p>

                  <span className="inline-flex items-center gap-1 text-white text-xs font-bold border border-white/40 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">

                    ดูสินค้า <ChevronRight size={12} />

                  </span>

                </div>

                <img

                  src={b.img}

                  alt={b.title}

                  className="absolute -bottom-4 -right-4 h-28 object-contain mix-blend-screen opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all duration-500"

                  referrerPolicy="no-referrer"

                />

              </Link>

            ))}

          </div>

        </div>

      </section>



      {/* FEATURED PRODUCTS + SIDEBAR */}

      <section className="py-10 bg-white">

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

          <div className="flex flex-col lg:flex-row gap-8">



            {/* Sidebar */}

            <aside className="hidden lg:block w-60 flex-shrink-0 space-y-4">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="bg-kv-navy text-white px-4 py-3 flex items-center gap-2 font-bold text-sm">

                  <Menu size={16} /> หมวดหมู่ทั้งหมด

                </div>

                <ul className="divide-y divide-gray-50">

                  {isLoadingCategories

                    ? [...Array(6)].map((_, i) => (

                      <li key={i} className="px-4 py-3 animate-pulse">

                        <div className="h-3 bg-gray-100 rounded w-28" />

                      </li>

                    ))

                    : dbCategories.map((cat) => (

                      <li key={cat.id}>

                        <Link

                          to={`/shop?category=${encodeURIComponent(cat.name)}`}

                          className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50 hover:text-kv-orange transition-colors group text-sm text-gray-700"

                        >

                          <div className="flex items-center gap-2.5">

                            {cat.image_url ? (

                              <img

                                src={cat.image_url}

                                alt={cat.name}

                                className="w-5 h-5 object-contain rounded"

                                referrerPolicy="no-referrer"

                              />

                            ) : (

                              <span className="text-sm">📦</span>

                            )}

                            <span className="font-medium group-hover:text-kv-orange">{cat.name}</span>

                          </div>

                          <ChevronRight size={13} className="text-gray-300 group-hover:text-kv-orange" />

                        </Link>

                      </li>

                    ))}

                </ul>

              </div>



              <div className="bg-kv-navy rounded-2xl overflow-hidden relative group cursor-pointer shadow-md min-h-[300px] flex flex-col">

                <img

                  src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=600"

                  alt="Promo"

                  className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700"

                  referrerPolicy="no-referrer"

                />

                <div className="absolute inset-0 bg-gradient-to-t from-kv-navy via-kv-navy/60 to-transparent" />

                <div className="relative z-10 p-6 flex flex-col h-full justify-end">

                  <span className="bg-kv-orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full w-max mb-3">

                    PREMIUM SERVICE

                  </span>

                  <h4 className="text-white font-black text-xl leading-tight mb-2">

                    ซ่อมปริ้นเตอร์<br />โดยช่างผู้เชี่ยวชาญ

                  </h4>

                  <p className="text-white/60 text-sm mb-4">รับประกันงานซ่อม ราคาโปร่งใส</p>

                  <Link

                    to="/contact"

                    className="bg-white text-kv-navy font-bold text-sm py-2.5 rounded-xl text-center hover:bg-kv-orange hover:text-white transition-all duration-300"

                  >

                    นัดซ่อมเดี๋ยวนี้

                  </Link>

                </div>

              </div>

            </aside>



            {/* Featured Products */}

            <div className="flex-1 min-w-0">

              <div className="flex items-center justify-between mb-5">

                <div className="flex items-center gap-3">

                  <div className="w-1 h-6 bg-kv-orange rounded-full" />

                  <h2 className="text-xl font-black text-kv-navy">สินค้าแนะนำ</h2>

                </div>

                <Link to="/shop" className="text-sm text-kv-orange font-semibold hover:underline flex items-center gap-1">

                  ดูทั้งหมด <ChevronRight size={14} />

                </Link>

              </div>



              {isLoadingFeatured ? (

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">

                  {[...Array(8)].map((_, i) => (

                    <div key={i} className="animate-pulse rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">

                      <div className="aspect-square bg-gray-200" />

                      <div className="p-3 space-y-2">

                        <div className="h-3 bg-gray-200 rounded w-full" />

                        <div className="h-3 bg-gray-200 rounded w-2/3" />

                        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />

                      </div>

                    </div>

                  ))}

                </div>

              ) : featuredProducts.length > 0 ? (

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">

                  {featuredProducts.map((item) => (

                    <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-kv-orange/20 transition-all duration-300 flex flex-col">

                      <Link to={`/product/${item.id}`} className="relative aspect-square bg-gray-50 overflow-hidden block">

                        <img

                          src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/${item.id}/300/300`}

                          alt={item.title || item.name}

                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"

                          referrerPolicy="no-referrer"

                        />

                        <div className="absolute top-2 left-2 flex flex-col gap-1">

                          {item.is_new && <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">NEW</span>}

                          {item.is_sale && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">SALE</span>}

                          {item.is_popular && <span className="bg-kv-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">HOT</span>}

                        </div>

                        <div className="absolute top-2 right-2">

                          <span className="bg-kv-navy/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">

                            {item.grade || 'Grade A'}

                          </span>

                        </div>

                        <div

                          onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}

                          className="absolute inset-x-0 bottom-0 bg-kv-navy/90 text-white text-xs font-bold py-2.5 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer hover:bg-kv-orange flex items-center justify-center gap-1.5"

                        >

                          <ShoppingCart size={13} /> เพิ่มลงตะกร้า

                        </div>

                      </Link>

                      <div className="p-3 flex flex-col flex-1">

                        <Link to={`/product/${item.id}`} className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1.5 hover:text-kv-orange transition-colors leading-snug">

                          {item.title || item.name}

                        </Link>

                        <div className="flex items-center gap-0.5 mb-2">

                          {[...Array(5)].map((_, i) => (

                            <Star key={i} size={10} className={i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />

                          ))}

                          <span className="text-[10px] text-gray-400 ml-1">(4.0)</span>

                        </div>

                        <p className="text-kv-orange font-black text-base mt-auto">

                          ฿{(item.price || 0).toLocaleString()}

                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="text-center py-16 text-gray-400">ไม่มีสินค้าแนะนำในขณะนี้</div>

              )}

            </div>

          </div>

        </div>

      </section>



      {/* FULL-WIDTH CTA BANNER */}

      <section className="relative bg-kv-navy overflow-hidden py-14 md:py-20">

        <div className="absolute inset-0 z-0">

          <img

            src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=1600&q=80"

            alt="Printer System"

            className="w-full h-full object-cover opacity-20"

            referrerPolicy="no-referrer"

          />

          <div className="absolute inset-0 bg-gradient-to-r from-kv-navy via-kv-navy/95 to-kv-navy/60" />

        </div>

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">

            <div>

              <span className="bg-kv-orange text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">

                แบรนด์ชั้นนำ

              </span>

              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">

                ครบทุกความต้องการ<br />

                <span className="text-kv-orange">ด้านการพิมพ์</span>

              </h2>

              <p className="text-white/55 text-base">Great Values. Always.</p>

            </div>

            <div className="flex flex-row gap-3 w-full md:w-auto">

              <Link

                to="/shop?category=เครื่องปริ้นเตอร์"

                className="flex-1 md:flex-none bg-kv-orange hover:bg-orange-500 text-white font-bold px-5 md:px-8 py-3 md:py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-orange-500/30 flex items-center gap-2 justify-center text-sm md:text-base"

              >

                ช็อปเลย <ArrowRight size={16} />

              </Link>

              <Link

                to="/contact"

                className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold px-5 md:px-8 py-3 md:py-3.5 rounded-xl transition-all flex items-center gap-2 justify-center text-sm md:text-base"

              >

                ติดต่อเรา

              </Link>

            </div>

          </div>

        </div>

      </section>



      {/* BEST SELLERS */}

      <section className="py-10 bg-gray-50">

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

          <div className="flex items-center justify-between mb-6">

            <div className="flex items-center gap-3">

              <div className="w-1 h-6 bg-kv-navy rounded-full" />

              <h2 className="text-xl font-black text-kv-navy">สินค้าขายดี</h2>

            </div>

            <Link to="/shop" className="text-sm text-kv-orange font-semibold hover:underline flex items-center gap-1">

              ดูทั้งหมด <ChevronRight size={14} />

            </Link>

          </div>



          {isLoadingBestSellers ? (

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

              {[...Array(6)].map((_, i) => (

                <div key={i} className="animate-pulse rounded-2xl bg-white border border-gray-100">

                  <div className="aspect-square bg-gray-200 rounded-t-2xl" />

                  <div className="p-3 space-y-2">

                    <div className="h-3 bg-gray-100 rounded" />

                    <div className="h-4 bg-gray-100 rounded w-2/3" />

                  </div>

                </div>

              ))}

            </div>

          ) : bestSellers.length > 0 ? (

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

              {bestSellers.map((item) => (

                <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-kv-orange/20 transition-all duration-300 flex flex-col">

                  <Link to={`/product/${item.id}`} className="relative aspect-square bg-gray-50 overflow-hidden block">

                    <img

                      src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/${item.id}/300/300`}

                      alt={item.title || item.name}

                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"

                      referrerPolicy="no-referrer"

                    />

                    {item.is_sale && (

                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">SALE</span>

                    )}

                    <div

                      onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}

                      className="absolute inset-x-0 bottom-0 bg-kv-navy/90 text-white text-[10px] font-bold py-2 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer hover:bg-kv-orange flex items-center justify-center gap-1"

                    >

                      <ShoppingCart size={11} /> เพิ่มลงตะกร้า

                    </div>

                  </Link>

                  <div className="p-2.5 flex flex-col flex-1">

                    <Link to={`/product/${item.id}`} className="text-[11px] font-semibold text-gray-800 line-clamp-2 mb-1.5 hover:text-kv-orange transition-colors leading-snug">

                      {item.title || item.name}

                    </Link>

                    <p className="text-kv-orange font-black text-sm mt-auto">

                      ฿{(item.price || 0).toLocaleString()}

                    </p>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="text-center py-12 text-gray-400">ไม่มีสินค้าขายดีในขณะนี้</div>

          )}

        </div>

      </section>



      {/* BEST DEALS */}

      <section className="py-10 bg-white">

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">

            <div className="flex items-center gap-3">

              <div className="w-1 h-6 bg-red-500 rounded-full" />

              <h2 className="text-xl font-black text-kv-navy">ดีลเด็ดประจำสัปดาห์</h2>

              <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-2.5 py-1 rounded-full">

                ลดราคาพิเศษ

              </span>

            </div>

            <Link to="/shop?sale=true" className="text-sm text-kv-orange font-semibold hover:underline flex items-center gap-1">

              ดูดีลทั้งหมด <ChevronRight size={14} />

            </Link>

          </div>



          {isLoadingBestDeals ? (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {[...Array(3)].map((_, i) => (

                <div key={i} className="animate-pulse rounded-2xl bg-gray-50 border border-gray-100 flex gap-3 p-4">

                  <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />

                  <div className="flex-1 space-y-2">

                    <div className="h-3 bg-gray-200 rounded w-full" />

                    <div className="h-3 bg-gray-200 rounded w-3/4" />

                    <div className="h-4 bg-gray-200 rounded w-1/2 mt-3" />

                  </div>

                </div>

              ))}

            </div>

          ) : bestDeals.length > 0 ? (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {bestDeals.map((item) => (

                <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-kv-orange/20 transition-all duration-300 flex gap-4">

                  <Link to={`/product/${item.id}`} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 block">

                    <img

                      src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/${item.id}/300/300`}

                      alt={item.title || item.name}

                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"

                      referrerPolicy="no-referrer"

                    />

                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col">

                    <div className="flex flex-wrap gap-1 mb-1.5">

                      {item.is_sale && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">SALE</span>}

                      {item.is_popular && <span className="bg-kv-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-full">HOT</span>}

                    </div>

                    <Link to={`/product/${item.id}`} className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-kv-orange transition-colors leading-snug mb-1.5">

                      {item.title || item.name}

                    </Link>

                    <div className="flex items-center gap-0.5 mb-2">

                      {[...Array(5)].map((_, i) => (

                        <Star key={i} size={10} className={i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />

                      ))}

                    </div>

                    <div className="flex items-center justify-between mt-auto">

                      <p className="text-kv-orange font-black text-lg">฿{(item.price || 0).toLocaleString()}</p>

                      <button

                        onClick={() => handleAddToCart(item)}

                        className="text-kv-navy hover:text-kv-orange text-xs font-bold flex items-center gap-1 transition-colors border border-gray-200 hover:border-kv-orange px-2.5 py-1 rounded-lg"

                      >

                        <ShoppingCart size={12} /> เพิ่ม

                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="text-center py-12 text-gray-400">ไม่มีดีลเด็ดในขณะนี้</div>

          )}

        </div>

      </section>



      {/* BRANDS STRIP */}

      {dbBrands.length > 0 && (

        <section className="py-8 bg-gray-50 border-t border-gray-100">

          <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

            <div className="flex items-center justify-between mb-5">

              <h2 className="text-xl font-black text-kv-navy">แบรนด์ที่วางจำหน่าย</h2>

              <Link to="/brands" className="text-sm text-kv-orange font-semibold hover:underline flex items-center gap-1">

                ดูทั้งหมด <ChevronRight size={14} />

              </Link>

            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">

              {dbBrands.slice(0, 12).map((brand) => (

                <Link

                  key={brand.id}

                  to={`/shop?brand=${encodeURIComponent(brand.name)}`}

                  className="flex-shrink-0 bg-white border border-gray-100 rounded-xl px-5 py-3 hover:border-kv-orange hover:shadow-sm transition-all duration-300 flex items-center justify-center min-w-[90px]"

                >

                  {brand.logo_url ? (

                    <img src={brand.logo_url} alt={brand.name} className="h-7 object-contain grayscale hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />

                  ) : (

                    <span className="text-sm font-bold text-gray-500 hover:text-kv-navy transition-colors whitespace-nowrap">{brand.name}</span>

                  )}

                </Link>

              ))}

            </div>

          </div>

        </section>

      )}



      {/* SERVICES / TRUST */}

      <section className="py-12 bg-white">

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

          <div className="text-center mb-8">

            <h2 className="text-2xl font-black text-kv-navy">ทำไมต้องเลือก KingVision?</h2>

            <p className="text-gray-500 mt-2 text-sm">เราใส่ใจในทุกรายละเอียดเพื่อประสบการณ์ที่ดีที่สุด</p>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {[

              { icon: <ShieldCheck size={26} strokeWidth={1.5} />, title: 'รับประกัน 3 เดือน', desc: 'สินค้าทุกชิ้นผ่านการตรวจสอบคุณภาพ พร้อมรับประกันการใช้งาน' },

              { icon: <Truck size={26} strokeWidth={1.5} />, title: 'ส่งฟรี กทม. & ปริมณฑล', desc: 'บริการจัดส่งฟรีถึงหน้าบ้าน สำหรับลูกค้าในเขตกรุงเทพฯ' },

              { icon: <Wallet size={26} strokeWidth={1.5} />, title: 'เก็บเงินปลายทาง', desc: 'สะดวก ปลอดภัย ชำระเงินเมื่อรับสินค้าได้เลย' },

              { icon: <MessageCircle size={26} strokeWidth={1.5} />, title: 'ให้คำปรึกษาฟรี', desc: 'ทีมช่างผู้เชี่ยวชาญพร้อมให้คำแนะนำก่อนและหลังการขาย' },

              { icon: <Wrench size={26} strokeWidth={1.5} />, title: 'อะไหล่แท้ & เทียบเท่า', desc: 'มีอะไหล่รองรับทุกรุ่น มั่นใจในคุณภาพและอายุการใช้งาน' },

              { icon: <RotateCcw size={26} strokeWidth={1.5} />, title: 'คืนสินค้าได้ใน 7 วัน', desc: 'หากสินค้ามีปัญหา สามารถเปลี่ยนหรือคืนได้ทันที' },

            ].map((f) => (

              <div key={f.title} className="bg-gray-50 rounded-2xl p-5 flex items-start gap-4 hover:shadow-md hover:bg-white border border-transparent hover:border-kv-orange/10 transition-all duration-300 group">

                <div className="text-kv-orange bg-orange-50 group-hover:bg-orange-100 p-2.5 rounded-xl flex-shrink-0 transition-colors">{f.icon}</div>

                <div>

                  <h4 className="font-bold text-kv-navy mb-1 text-sm">{f.title}</h4>

                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>



      {/* BLOG ARTICLES */}

      <section className="py-12 bg-kv-navy relative overflow-hidden">

        <div className="absolute inset-0 opacity-10">

          <img

            src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=1600&q=80"

            alt="bg"

            className="w-full h-full object-cover"

            referrerPolicy="no-referrer"

          />

        </div>

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">

            <div>

              <span className="text-kv-orange text-xs font-bold uppercase tracking-widest">Blog & Knowledge</span>

              <h2 className="text-2xl font-black text-white mt-1">สาระน่ารู้เกี่ยวกับเครื่องปริ้นเตอร์</h2>

              <p className="text-white/50 text-sm mt-1">เทคนิค การดูแลรักษา และการแก้ไขปัญหาเบื้องต้น</p>

            </div>

            <Link

              to="/blog"

              className="bg-white/10 hover:bg-kv-orange text-white border border-white/20 font-bold px-6 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2 w-max"

            >

              อ่านบทความทั้งหมด <ArrowRight size={16} />

            </Link>

          </div>



          {isLoadingBlog ? (

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {[...Array(3)].map((_, i) => (

                <div key={i} className="animate-pulse rounded-2xl bg-white/5">

                  <div className="aspect-video bg-white/10 rounded-t-2xl" />

                  <div className="p-4 space-y-2">

                    <div className="h-3 bg-white/10 rounded" />

                    <div className="h-3 bg-white/10 rounded w-3/4" />

                  </div>

                </div>

              ))}

            </div>

          ) : blogPosts.length > 0 ? (

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {blogPosts.map((post) => (

                <Link

                  key={post.id}

                  to={`/blog/${post.id}`}

                  className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl overflow-hidden transition-all duration-300"

                >

                  <div className="relative aspect-video overflow-hidden">

                    {post.image_url ? (

                      <img

                        src={post.image_url}

                        alt={post.title}

                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"

                        referrerPolicy="no-referrer"

                        onError={(e) => {

                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&q=80';

                        }}

                      />

                    ) : (

                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">

                        <ImageIcon size={48} />

                      </div>

                    )}

                    <div className="absolute top-3 left-3">

                      <span className="bg-kv-orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">

                        {post.category || 'บทความ'}

                      </span>

                    </div>

                  </div>

                  <div className="p-4">

                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-yellow-300 transition-colors">

                      {post.title}

                    </h3>

                    {post.excerpt && (

                      <p className="text-white/45 text-xs mt-1.5 line-clamp-2 leading-relaxed">{post.excerpt}</p>

                    )}

                    <div className="flex items-center gap-1 mt-3 text-kv-orange text-xs font-bold">

                      อ่านต่อ <ArrowRight size={12} />

                    </div>

                  </div>

                </Link>

              ))}

            </div>

          ) : (

            <div className="text-center py-12 text-white/40">ไม่มีบทความในขณะนี้</div>

          )}

        </div>

      </section>



      {/* CTA STRIP */}

      <section className="bg-kv-orange py-10">

        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10 xl:px-12">

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            <div className="text-center md:text-left">

              <h3 className="text-2xl font-black text-white">ยังไม่แน่ใจ? ปรึกษาผู้เชี่ยวชาญฟรี!</h3>

              <p className="text-white/80 mt-1 text-sm">ทีมงานพร้อมช่วยคุณเลือกสินค้าที่เหมาะสมที่สุด</p>

            </div>

            <div className="flex gap-3">

              <a

                href="https://line.me/R/ti/p/@kingvision"

                target="_blank"

                rel="noopener noreferrer"

                className="bg-white text-kv-orange font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-sm shadow-lg"

              >

                <MessageCircle size={16} /> LINE Chat

              </a>

              <Link

                to="/contact"

                className="bg-kv-navy text-white font-bold px-6 py-3 rounded-xl hover:bg-kv-navy/90 transition-all flex items-center gap-2 text-sm"

              >

                ติดต่อเรา <ArrowRight size={16} />

              </Link>

            </div>

          </div>

        </div>

      </section>



      {/* SUCCESS TOAST */}

      <AnimatePresence>

        {showSuccess && (

          <motion.div

            initial={{ opacity: 0, y: 50 }}

            animate={{ opacity: 1, y: 0 }}

            exit={{ opacity: 0, y: 50 }}

            className="fixed bottom-28 left-4 right-4 md:left-auto md:bottom-10 md:right-10 bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 max-w-sm"

          >

            <CheckCircle2 size={22} className="shrink-0" />

            <div>

              <p className="font-bold text-sm">เพิ่มสินค้าสำเร็จ</p>

              <p className="text-xs opacity-80">สินค้าถูกเพิ่มลงในตะกร้าแล้ว</p>

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}

