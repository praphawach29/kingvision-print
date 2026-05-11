import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface Brand {
  id: string;
  name: string;
  image_url?: string;
  description?: string;
  product_count: number;
}

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      setLoading(true);
      
      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

      if (brandsError) throw brandsError;

      // Fetch product counts per brand
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('brand_id');

      if (productsError) throw productsError;

      const brandCounts: Record<string, number> = {};
      productsData?.forEach(p => {
        if (p.brand_id) {
          brandCounts[p.brand_id] = (brandCounts[p.brand_id] || 0) + 1;
        }
      });

      // Map data and add some default descriptions if missing
      const brandsWithCounts = (brandsData || []).map(brand => ({
        ...brand,
        product_count: brandCounts[brand.id] || 0,
        // Fallback description if not in DB
        description: brand.description || `เครื่องพิมพ์และอุปกรณ์คุณภาพสูงจากแบรนด์ ${brand.name}`
      }));

      setBrands(brandsWithCounts);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-screen font-thai pb-16">
      {/* Hero Section */}
      <div className="bg-kv-navy text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-kv-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-24 -left-24 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            แบรนด์ชั้นนำที่เราไว้วางใจ
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8"
          >
            รวบรวมเครื่องพิมพ์และอุปกรณ์จากแบรนด์ชั้นนำระดับโลก เพื่อให้คุณได้สินค้าที่มีคุณภาพและมาตรฐานสูงสุด
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="text-kv-orange group-focus-within:scale-110 transition-transform duration-300" size={22} />
            </div>
            <input
              type="text"
              placeholder="ค้นหาแบรนด์ที่ต้องการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 rounded-full text-gray-900 bg-white border-4 border-white/10 focus:border-kv-orange focus:outline-none focus:ring-8 focus:ring-kv-orange/10 shadow-2xl transition-all text-lg font-bold placeholder:text-gray-400"
            />
          </motion.div>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-kv-orange" size={48} />
          </div>
        ) : filteredBrands.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBrands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link 
                  to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                  className="block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 h-full flex flex-col"
                >
                  <div className={`h-40 bg-gray-50 flex items-center justify-center p-8 group-hover:scale-105 transition-transform duration-500`}>
                    {brand.image_url ? (
                      <img 
                        src={brand.image_url} 
                        alt={brand.name} 
                        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-kv-navy font-black text-2xl opacity-20">{brand.name}</div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-kv-navy group-hover:text-kv-orange transition-colors">
                        {brand.name}
                      </h3>
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                        {brand.product_count} สินค้า
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm flex-grow mb-4 line-clamp-2">
                      {brand.description}
                    </p>
                    <div className="flex items-center text-kv-orange font-medium text-sm group-hover:translate-x-2 transition-transform">
                      ดูสินค้าทั้งหมด <ChevronRight size={16} className="ml-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">ไม่พบแบรนด์ที่คุณค้นหา</h3>
            <p className="text-gray-500">ลองใช้คำค้นหาอื่น หรือดูแบรนด์ทั้งหมดของเรา</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-6 px-6 py-2 bg-kv-navy text-white rounded-full hover:bg-kv-orange transition-colors"
            >
              ดูแบรนด์ทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-kv-navy mb-4">ทำไมต้องซื้อกับ KingVision?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">เราคัดสรรเฉพาะสินค้าคุณภาพจากแบรนด์ชั้นนำ พร้อมบริการหลังการขายที่คุณวางใจได้</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ของแท้ 100%</h3>
              <p className="text-gray-500">สินค้าทุกชิ้นรับประกันของแท้จากตัวแทนจำหน่ายอย่างเป็นทางการ</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-orange-50 text-kv-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">จัดส่งรวดเร็ว</h3>
              <p className="text-gray-500">มีสินค้าพร้อมส่ง จัดส่งถึงมือคุณอย่างรวดเร็วและปลอดภัย</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">บริการหลังการขาย</h3>
              <p className="text-gray-500">ทีมช่างผู้เชี่ยวชาญพร้อมให้คำปรึกษาและดูแลตลอดอายุการใช้งาน</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
