import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ChevronRight, Star, Heart, Share2, ShoppingCart, Check, 
  ShieldCheck, Truck, RotateCcw, CheckCircle2, Plus, Minus, 
  Facebook, Twitter, Linkedin, Scale, Eye, Loader2, Clock,
  MessageCircle, Info, Layers, HelpCircle, Recycle, Zap,
  Search, ExternalLink, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

interface ProductOption {
  name: string;
  values: {
    label: string;
    price_modifier: number;
    stock?: number;
  }[];
}

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { label: string; price_modifier: number }>>({});
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (id) {
      setProduct(null);
      setRelatedProducts([]);
      setIsLoadingRelated(false);
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product?.category && product?.id) {
      fetchRelatedProducts(product.category, product.id);
    } else if (product) {
      setIsLoadingRelated(false);
    }
  }, [product?.id, product?.category]);

  async function fetchProduct() {
    setIsLoading(true);
    try {
      // Check if ID is a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      if (!isUUID) {
        throw new Error('Invalid product ID format');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setProduct(data);
        // Initialize default options
        if (data.options && Array.isArray(data.options)) {
          const defaults: Record<string, { label: string; price_modifier: number }> = {};
          (data.options as ProductOption[]).forEach((opt) => {
            if (opt.values && opt.values.length > 0) {
              defaults[opt.name] = opt.values[0];
            }
          });
          setSelectedOptions(defaults);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRelatedProducts(category: string, currentId: string) {
    try {
      setIsLoadingRelated(true);
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId || '');
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('category', category);
      
      if (isUUID) {
        query = query.neq('id', currentId);
      }
      
      const { data, error } = await query.limit(5);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Fallback to any products if no related category products
        const { data: anyData } = await supabase.from('products').select('*').neq('id', currentId).limit(5);
        if (anyData && anyData.length > 0) {
          setRelatedProducts(anyData);
        } else {
          setRelatedProducts([]);
        }
      } else {
        setRelatedProducts(data);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setIsLoadingRelated(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 size={48} className="text-kv-orange animate-spin mb-4" />
        <p className="text-gray-500 font-thai">กำลังโหลดข้อมูลสินค้า...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h2 className="text-2xl font-bold text-kv-navy mb-4">ไม่พบสินค้าที่ต้องการ</h2>
        <Link to="/shop" className="text-kv-orange hover:underline">กลับไปที่หน้าร้านค้า</Link>
      </div>
    );
  }

  const images = (product.images && product.images.length > 0)
    ? product.images.filter(img => img && img.trim() !== '')
    : [product.image_url].filter(img => img && img.trim() !== '');

  if (images.length === 0) {
    images.push(`https://picsum.photos/seed/printer${id}/600/600`);
  }

  const basePrice = product.price || 0;
  const optionsPriceModifier = Object.values(selectedOptions).reduce((sum, opt) => sum + ((opt as any).price_modifier || 0), 0);
  const totalPrice = basePrice + optionsPriceModifier;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.title || product.name,
      price: totalPrice,
      quantity: quantity,
      image: product.image_url || product.image,
      selected_options: Object.entries(selectedOptions).map(([name, opt]) => ({
        name,
        value: (opt as any).label,
        price_modifier: (opt as any).price_modifier
      }))
    });
    
    setShowSuccess(true);
    if (successTimeout) clearTimeout(successTimeout);
    const timeout = setTimeout(() => setShowSuccess(false), 3000);
    setSuccessTimeout(timeout);
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.title || product.name,
      price: totalPrice,
      quantity: quantity,
      image: product.image_url || product.image,
      selected_options: Object.entries(selectedOptions).map(([name, opt]) => ({
        name,
        value: (opt as any).label,
        price_modifier: (opt as any).price_modifier
      }))
    });
    navigate('/cart');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title || product.name,
    "image": images,
    "description": product.description,
    "sku": product.sku,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "KingVision"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "THB",
      "price": totalPrice,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16 font-thai">
      <SEO 
        title={product.title || product.name}
        description={product.description}
        keywords={`${product.title || product.name}, ${product.brand}, ปริ้นเตอร์, อะไหล่ปริ้นเตอร์, KingVision`}
        image={product.image_url || product.image}
        type="product"
        schema={productSchema}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb 
          items={[
            { label: 'สินค้าทั้งหมด', path: '/shop' },
            { label: product.title || product.name }
          ]} 
        />

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-16 mt-8">
          {/* Left: Product Images */}
          <div className="w-full lg:w-[55%]">
            <div className="lg:sticky lg:top-24">
              <div className="aspect-square bg-white border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden mb-4 flex items-center justify-center p-4 md:p-8">
                <img 
                  src={images[activeImage]} 
                  alt={product.title} 
                  className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                {images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl border-2 overflow-hidden flex-shrink-0 transition-all ${activeImage === idx ? 'border-kv-orange' : 'border-transparent hover:border-gray-200'}`}
                  >
                    <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="w-full lg:w-[45%] flex flex-col">
            <div className="mb-6">
              <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded-md font-bold text-xs text-kv-navy mb-3 uppercase tracking-wider">
                {product.brand || 'Generic'}
              </div>
              
              <h1 className="text-2xl md:text-3xl font-black text-kv-navy mb-2 leading-tight">
                {product.title || product.name}
              </h1>
              
              <p className="text-xs text-gray-500 mb-4">
                SKU: <strong className="text-gray-700">{product.sku || `KV-${product.brand || 'GEN'}-${id?.substring(0, 8).toUpperCase()}`}</strong> &nbsp;|&nbsp; 
                รหัสสินค้า: <strong className="text-gray-700">{product.product_code || 'HP-LJ-M404DN-USED'}</strong>
              </p>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex text-kv-orange">
                  {[1, 2, 3, 4].map(i => <Star key={i} size={16} fill="currentColor" />)}
                  <Star size={16} fill="currentColor" className="opacity-50" />
                </div>
                <span className="text-xs text-gray-500">4.5 (23 รีวิว) &nbsp;|&nbsp; ขายแล้ว 156 ชิ้น</span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 md:p-5 mb-6 flex flex-wrap items-center gap-3 md:gap-4">
                <div className="text-2xl md:text-3xl font-black text-red-600">฿{totalPrice.toLocaleString()}</div>
                <div className="text-base md:text-lg text-gray-400 line-through">฿{(totalPrice * 1.5).toLocaleString()}</div>
                <div className="bg-red-600 text-white text-[9px] md:text-[10px] font-black px-2 py-1 rounded uppercase">ประหยัด 33%</div>
              </div>

              {/* Product Options */}
              {product.options && Array.isArray(product.options) && product.options.length > 0 && (
                <div className="space-y-6 mb-8">
                  {(product.options as ProductOption[]).map((option, idx) => (
                    <div key={idx} className="space-y-3">
                      <label className="text-sm font-black text-kv-navy uppercase tracking-wider flex items-center gap-2">
                        {option.name}
                        <span className="text-[10px] font-bold text-gray-400 lowercase">(เลือกหนึ่งอย่าง)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((val, valIdx) => (
                          <button
                            key={valIdx}
                            disabled={val.stock === 0}
                            onClick={() => setSelectedOptions({ ...selectedOptions, [option.name]: val })}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                              selectedOptions[option.name]?.label === val.label
                                ? 'border-kv-orange bg-orange-50 text-kv-orange'
                                : val.stock === 0 
                                  ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed'
                                  : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                            }`}
                          >
                            {val.label}
                            {val.price_modifier > 0 && (
                              <span className="ml-1 opacity-60">+฿{val.price_modifier}</span>
                            )}
                            {val.stock !== undefined && val.stock < 5 && val.stock > 0 && (
                              <span className="ml-1 text-[9px] text-red-500">(เหลือ {val.stock})</span>
                            )}
                            {val.stock === 0 && (
                              <span className="ml-1 text-[9px] text-gray-400">(หมด)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mb-4 text-sm">
                {product.stock && product.stock > 0 ? (
                  <>
                    <CheckCircle2 size={18} className="text-green-600" />
                    <span className="text-green-700 font-bold">มีสินค้า</span>
                    <span className="text-gray-400">— เหลือ {product.stock} เครื่อง</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-red-600" />
                    <span className="text-red-700 font-bold">สินค้าหมด</span>
                  </>
                )}
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold mb-6">
                <Recycle size={14} />
                สินค้ามือสอง สภาพดี — รับประกัน 3 เดือน
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center border border-gray-200 rounded-xl h-12 w-32 bg-white overflow-hidden shrink-0">
                  <button 
                    className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-kv-orange hover:bg-gray-50 transition-all" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus size={14} strokeWidth={3} />
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="flex-1 text-center font-bold text-sm outline-none bg-transparent text-kv-navy w-full" 
                  />
                  <button 
                    className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-kv-orange hover:bg-gray-50 transition-all" 
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 h-12 bg-kv-orange text-white rounded-xl font-black text-[11px] sm:text-sm hover:bg-kv-orange/90 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-kv-orange/20 active:scale-[0.98]"
                >
                  <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" /> เพิ่มลงตะกร้า
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={handleBuyNow}
                  className="h-12 bg-green-600 text-white rounded-xl font-black text-[11px] sm:text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-green-100 active:scale-[0.98]"
                >
                  <Zap size={16} className="sm:w-[18px] sm:h-[18px]" /> ซื้อทันที
                </button>
                <a 
                  href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-12 bg-[#00b900] text-white rounded-xl font-black text-[11px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-green-100 active:scale-[0.98]"
                >
                  <MessageCircle size={16} fill="currentColor" className="sm:w-[18px] sm:h-[18px]" /> สอบถามทาง LINE
                </a>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-500 hover:text-kv-orange transition-colors"
                >
                  <Share2 size={14} /> {isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                </button>
                <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-500 hover:text-kv-orange transition-colors">
                  <Heart size={14} /> เพิ่มในรายการโปรด
                </button>
                <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-500 hover:text-kv-orange transition-colors">
                  <Scale size={14} /> เปรียบเทียบ
                </button>
                <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-500 hover:text-kv-orange transition-colors">
                  <HelpCircle size={14} /> สอบถาม
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">แชร์:</span>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded-full bg-[#3b5998] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Facebook size={14} fill="currentColor" /></button>
                  <button className="w-8 h-8 rounded-full bg-[#1da1f2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Twitter size={14} fill="currentColor" /></button>
                  <button className="w-8 h-8 rounded-full bg-[#00b900] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><MessageCircle size={14} fill="currentColor" /></button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                <p>หมวดหมู่: <Link to={`/shop?category=${product.category}`} className="text-kv-orange hover:underline">{product.category || 'ปริ้นเตอร์'}</Link>, <Link to={`/shop?brand=${product.brand}`} className="text-kv-orange hover:underline">{product.brand || 'HP'}</Link></p>
                <p>แท็ก: <span className="text-gray-400">มือสอง, เลเซอร์, ขาวดำ, M404</span></p>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-kv-orange shadow-sm">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-kv-navy uppercase">จัดส่งฟรี</p>
                    <p className="text-[10px] text-gray-400 font-bold">ในเขตกรุงเทพและปริมณฑล</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-kv-orange shadow-sm">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-kv-navy uppercase">ประกันคุณภาพ</p>
                    <p className="text-[10px] text-gray-400 font-bold">รับประกันนาน 3 เดือน</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4">
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto scrollbar-hide">
            {[
              { id: 'description', label: 'รายละเอียด', icon: <Info size={16} /> },
              { id: 'specs', label: 'ข้อมูลเพิ่มเติม', icon: <Layers size={16} /> },
              { id: 'compatibility', label: 'รุ่นที่รองรับ', icon: <Check size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-black flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'text-kv-navy border-kv-orange bg-white' : 'text-gray-400 border-transparent hover:text-kv-navy'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-5 md:p-8">
            {activeTab === 'description' && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-black text-kv-navy mb-4">รายละเอียดสินค้า</h3>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {product.description}
                </div>
              </div>
            )}
            
            {activeTab === 'specs' && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-black text-kv-navy mb-4">ข้อมูลจำเพาะ</h3>
                <div className="grid grid-cols-1 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {[
                    { label: 'ยี่ห้อ', value: product.brand || 'HP' },
                    { label: 'สภาพ', value: product.is_new ? 'ใหม่' : 'มือสอง สภาพดี' },
                    { label: 'รหัสสินค้า', value: product.sku || `KV-${product.brand || 'GEN'}-${id?.substring(0, 8).toUpperCase()}` },
                    { label: 'หมวดหมู่', value: product.category || 'ปริ้นเตอร์เลเซอร์' },
                    { label: 'รับประกัน', value: '3 เดือน' },
                    { label: 'ส่งจาก', value: 'กรุงเทพมหานคร' }
                  ].map((spec, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 bg-white p-4 gap-1 sm:gap-4">
                      <div className="text-xs sm:text-sm font-black text-kv-navy">{spec.label}</div>
                      <div className="sm:col-span-2 text-xs sm:text-sm text-gray-600">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'compatibility' && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-black text-kv-navy mb-4">ตลับหมึกที่รองรับ</h3>
                <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0 scrollbar-hide">
                  <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                    <thead>
                      <tr className="bg-kv-navy text-white text-[10px] uppercase tracking-widest">
                        <th className="p-4 font-bold">รหัสตลับหมึก</th>
                        <th className="p-4 font-bold">ประเภท</th>
                        <th className="p-4 font-bold">สี</th>
                        <th className="p-4 font-bold">จำนวนหน้า</th>
                        <th className="p-4 font-bold">ราคา</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-kv-navy">HP 58A (CF258A)</td>
                        <td className="p-4 text-gray-500">หมึกแท้</td>
                        <td className="p-4 text-gray-500">ดำ</td>
                        <td className="p-4 text-gray-500">3,000 หน้า</td>
                        <td className="p-4 font-bold text-red-600">฿1,590</td>
                      </tr>
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-kv-navy">HP 58X (CF258X)</td>
                        <td className="p-4 text-gray-500">หมึกแท้ (ปริมาณสูง)</td>
                        <td className="p-4 text-gray-500">ดำ</td>
                        <td className="p-4 text-gray-500">10,000 หน้า</td>
                        <td className="p-4 font-bold text-red-600">฿2,890</td>
                      </tr>
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-kv-navy">HP 58A เทียบเท่า</td>
                        <td className="p-4 text-gray-500">หมึกเทียบเท่า</td>
                        <td className="p-4 text-gray-500">ดำ</td>
                        <td className="p-4 text-gray-500">3,000 หน้า</td>
                        <td className="p-4 font-bold text-red-600">฿490</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequently Bought Together */}
        <div className="mt-12 bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-lg md:text-xl font-black text-kv-navy mb-6 md:mb-8 flex items-center gap-2">
            <Layers className="text-kv-orange" /> สินค้าที่มักซื้อด้วยกัน
          </h3>
          <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8">
            <div className="flex items-center gap-3 md:gap-4 flex-1 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0 w-full lg:w-auto">
              <div className="text-center w-24 md:w-32 shrink-0">
                <div className="aspect-square bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center p-2 md:p-4 mb-2 md:mb-3">
                  <img src={product.image_url} alt={product.name} className="max-h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-kv-navy line-clamp-1">{product.name}</p>
                <p className="text-xs font-black text-red-600">฿{product.price.toLocaleString()}</p>
              </div>
              <div className="text-xl md:text-2xl font-black text-gray-300 shrink-0">+</div>
              <div className="text-center w-24 md:w-32 shrink-0">
                <div className="aspect-square bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center p-2 md:p-4 mb-2 md:mb-3">
                  <ShoppingCart className="text-gray-300" size={24} />
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-kv-navy line-clamp-1">HP 58A ตลับหมึกแท้</p>
                <p className="text-xs font-black text-red-600">฿1,590</p>
              </div>
              <div className="text-xl md:text-2xl font-black text-gray-300 shrink-0">+</div>
              <div className="text-center w-24 md:w-32 shrink-0">
                <div className="aspect-square bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center p-2 md:p-4 mb-2 md:mb-3">
                  <ShoppingCart className="text-gray-300" size={24} />
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-kv-navy line-clamp-1">กระดาษ A4 Double A</p>
                <p className="text-xs font-black text-red-600">฿89</p>
              </div>
            </div>
            
            <div className="w-full lg:w-64 bg-gray-50 rounded-2xl md:rounded-3xl p-5 md:p-6 text-center border border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-1">ราคารวมทั้งหมด</p>
              <div className="text-2xl md:text-3xl font-black text-red-600 mb-2">฿{(product.price + 1590 + 89).toLocaleString()}</div>
              <p className="text-[10px] font-bold text-green-600 mb-4">ประหยัด ฿179 เมื่อซื้อร่วมกัน</p>
              <button className="w-full py-3 bg-kv-orange text-white rounded-xl font-black text-sm hover:bg-kv-orange/90 transition-all shadow-lg shadow-kv-orange/20">
                เพิ่มทั้งหมดลงรถเข็น
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-lg md:text-xl font-black text-kv-navy mb-6 md:mb-8 flex items-center gap-2">
            <Star className="text-kv-orange" /> รีวิวจากลูกค้า
          </h3>
          
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-8 md:mb-12 pb-8 md:pb-12 border-b border-gray-50">
            <div className="text-center md:w-48">
              <div className="text-5xl md:text-6xl font-black text-kv-navy mb-2">4.5</div>
              <div className="flex justify-center text-kv-orange mb-2">
                {[1, 2, 3, 4].map(i => <Star key={i} size={18} fill="currentColor" />)}
                <Star size={18} fill="currentColor" className="opacity-50" />
              </div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400">จาก 23 รีวิว</p>
            </div>
            
            <div className="flex-1 space-y-2 md:space-y-3">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="flex items-center gap-3 md:gap-4">
                  <span className="text-[10px] md:text-xs font-bold text-gray-500 w-8 md:w-10">{star} ดาว</span>
                  <div className="flex-1 h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-kv-orange rounded-full" style={{ width: `${star === 5 ? 65 : star === 4 ? 22 : 5}%` }}></div>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 w-6 md:w-8">{star === 5 ? 15 : star === 4 ? 5 : 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {[
              { name: 'สมชาย ก.', date: '2 สัปดาห์ที่แล้ว', text: 'สินค้าสภาพดีมาก เหมือนได้ของใหม่ในราคามือสอง พิมพ์ชัด เร็ว คุ้มค่ามากครับ แพ็คมาอย่างดี ส่งเร็ว ร้านบริการดีมากครับ', rating: 5 },
              { name: 'นภา ว.', date: '1 เดือนที่แล้ว', text: 'ใช้งานได้ดีค่ะ ซื้อมาใช้ในออฟฟิศ พิมพ์วันละหลายร้อยแผ่นไม่มีปัญหา มีหมึกให้มาด้วยพร้อมใช้เลย แนะนำค่ะ', rating: 4 }
            ].map((review, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-kv-navy text-white flex items-center justify-center font-black shrink-0">
                  {review.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black text-sm text-kv-navy">{review.name}</h4>
                    <span className="text-[10px] font-bold text-gray-400">{review.date}</span>
                  </div>
                  <div className="flex text-kv-orange mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-200"} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q&A Section */}
        <div className="mt-12 bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-lg md:text-xl font-black text-kv-navy mb-6 md:mb-8 flex items-center gap-2">
            <HelpCircle className="text-kv-orange" /> คำถามที่พบบ่อย
          </h3>
          <div className="space-y-3 md:space-y-4">
            {[
              { q: 'สินค้ามือสองมีรับประกันไหม?', a: 'สินค้ามือสองทุกชิ้นของ KingVision มีรับประกัน 3-12 เดือน ขึ้นอยู่กับประเภทสินค้า สำหรับเครื่องพิมพ์มือสองรุ่นนี้รับประกัน 3 เดือนครับ หากพบปัญหาสามารถส่งซ่อมหรือเปลี่ยนได้ฟรี' },
              { q: 'ใช้หมึกเทียบเท่าได้ไหม?', a: 'ได้ครับ เครื่องพิมพ์รุ่นนี้สามารถใช้ได้ทั้งหมึกแท้ HP 58A/58X และหมึกเทียบเท่า ทางร้านมีหมึกเทียบเท่าคุณภาพสูงจำหน่ายในราคาประหยัดครับ' },
              { q: 'จัดส่งใช้เวลากี่วัน?', a: 'สินค้าจัดส่งภายใน 1-2 วันทำการหลังชำระเงิน กรุงเทพและปริมณฑลได้รับภายใน 1-2 วัน ต่างจังหวัด 2-4 วันครับ จัดส่งผ่าน Kerry, Flash Express และไปรษณีย์ไทย' }
            ].map((item, idx) => (
              <details key={idx} className="group border border-gray-100 rounded-xl md:rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors list-none">
                  <span className="text-xs md:text-sm font-black text-kv-navy">{item.q}</span>
                  <ChevronRight size={16} className="text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="p-4 md:p-5 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-20 bg-gray-50 -mx-4 px-4 py-20">
          <div className="container mx-auto">
            <h3 className="text-2xl font-black text-kv-navy mb-12 flex items-center gap-3">
              <Layers className="text-kv-orange" /> สินค้าที่คุณอาจสนใจ
            </h3>
          
          {isLoadingRelated ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-kv-orange" size={32} />
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {relatedProducts.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-xl transition-all relative flex flex-col">
                  <Link to={`/product/${item.id}`} className="relative h-48 md:h-56 bg-white block overflow-hidden">
                    {item.is_popular && <span className="absolute top-3 left-3 bg-[#d32f2f] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10">HOT</span>}
                    <img 
                      src={(item.image_url && item.image_url.trim() !== '') ? item.image_url : `https://picsum.photos/seed/related${item.id}/400/400`} 
                      alt={item.title || item.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <div className="p-4 flex flex-col flex-grow text-center border-t border-gray-50">
                    <Link to={`/product/${item.id}`} className="font-bold text-sm text-kv-navy hover:text-[#d32f2f] transition-colors line-clamp-2 mb-1 flex-grow">
                      {item.title || item.name}
                    </Link>
                    <div className="text-xs text-gray-400 mb-2">{item.category}</div>
                    <div className="text-sm font-bold text-[#d32f2f]">฿{(item.price || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">ไม่พบสินค้าที่เกี่ยวข้อง</p>
          )}
        </div>
      </div>

      {/* Sticky Mobile/Tablet Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-40 lg:hidden flex gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <a 
          href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-12 h-12 bg-[#00b900] text-white rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <MessageCircle size={24} fill="currentColor" />
        </a>
        <button 
          onClick={handleAddToCart}
          className="flex-1 h-12 bg-kv-navy text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs"
        >
          <ShoppingCart size={18} /> ใส่ตะกร้า
        </button>
        <button 
          onClick={handleBuyNow}
          className="flex-1 h-12 bg-kv-orange text-white rounded-xl font-bold active:scale-95 transition-transform text-xs"
        >
          ซื้อทันที
        </button>
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
              <p className="font-bold text-sm md:text-base">เพิ่มสินค้าสำเร็จ</p>
              <p className="text-xs md:text-sm opacity-90">สินค้าได้ถูกเพิ่มลงในตะกร้าของคุณแล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
