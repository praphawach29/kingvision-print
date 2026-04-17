import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Brand {
  id: string;
  name: string;
  image_url?: string;
  created_at: string;
  product_count?: number;
}

export function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      const brandsWithCounts = (brandsData || []).map(brand => ({
        ...brand,
        product_count: brandCounts[brand.id] || 0
      }));

      setBrands(brandsWithCounts);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
      let msg = err.message;
      if (msg.includes('relation "brands" does not exist')) {
        msg = 'ไม่พบตารางข้อมูลแบรนด์ในระบบ กรุณาไปที่ไฟล์ supabase_setup.sql และคัดลอกคำสั่ง SQL ไปรันใน Supabase SQL Editor';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setName(brand.name);
      setImageUrl(brand.image_url || '');
    } else {
      setEditingBrand(null);
      setName('');
      setImageUrl('');
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create instant local preview
    const localPreview = URL.createObjectURL(file);
    setImageUrl(localPreview);

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `brands/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('ไม่สามารถอัปโหลดรูปภาพได้: ' + err.message);
      setImageUrl(''); // Reset if failed
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      setError(null);

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      const brandData = { 
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
        image_url: imageUrl.trim()
      };

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update(brandData)
          .eq('id', editingBrand.id);
        if (error) throw error;
        setSuccess('แก้ไขแบรนด์สำเร็จ');
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([brandData]);
        if (error) throw error;
        setSuccess('เพิ่มแบรนด์สำเร็จ');
      }

      await fetchBrands();
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      let msg = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      if (msg.includes('row-level security')) {
        msg = 'คุณไม่มีสิทธิ์ในการบันทึกข้อมูล (RLS Policy) กรุณาตรวจสอบว่าบัญชีของคุณมีสิทธิ์เป็น Admin ในตาราง profiles หรือรันคำสั่ง SQL ในไฟล์ supabase_setup.sql อีกครั้ง';
      }
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแบรนด์นี้?')) return;

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('ลบแบรนด์สำเร็จ');
      await fetchBrands();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert('ไม่สามารถลบได้: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 font-thai">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-bold">{error}</div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-kv-navy">จัดการแบรนด์</h1>
          <p className="text-sm text-gray-500">เพิ่ม แก้ไข หรือลบแบรนด์สินค้าของคุณ</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-kv-navy text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-kv-orange transition-all font-bold shadow-lg shadow-kv-navy/20 active:scale-95 text-sm"
        >
          <Plus size={20} /> เพิ่มแบรนด์
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="font-bold text-sm">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-kv-orange" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100 text-[10px] md:text-xs text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-4 sm:p-6 font-bold">โลโก้</th>
                  <th className="px-4 py-4 sm:p-6 font-bold">ชื่อแบรนด์</th>
                  <th className="px-4 py-4 sm:p-6 font-bold">จำนวนสินค้า</th>
                  <th className="px-4 py-4 sm:p-6 font-bold hidden sm:table-cell">วันที่สร้าง</th>
                  <th className="px-4 py-4 sm:p-6 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 sm:p-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                        {brand.image_url ? (
                          <img src={brand.image_url} alt={brand.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-gray-300 text-[8px] font-bold">NO LOGO</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:p-6 font-bold text-kv-navy text-xs sm:text-sm">{brand.name}</td>
                    <td className="px-4 py-4 sm:p-6">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] sm:text-xs font-bold">
                        {brand.product_count || 0} รายการ
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:p-6 text-gray-500 text-xs hidden sm:table-cell">
                      {new Date(brand.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-4 sm:p-6 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2 text-[10px] uppercase">
                        <button 
                          onClick={() => handleOpenModal(brand)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(brand.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {brands.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-bold">
                      ไม่พบข้อมูลแบรนด์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-kv-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-8">
              <h2 className="text-2xl font-black text-kv-navy mb-6">
                {editingBrand ? 'แก้ไขแบรนด์' : 'เพิ่มแบรนด์ใหม่'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อแบรนด์</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                    placeholder="เช่น HP, Canon, Epson"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">โลโก้แบรนด์</label>
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-gray-300 text-xs font-bold">PREVIEW</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input 
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy text-sm transition-all"
                        placeholder="URL โลโก้..."
                      />
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-kv-navy cursor-pointer hover:bg-gray-50 transition-all">
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        อัพโหลดโลโก้
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                      </label>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    <span className="font-bold">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving || isUploading}
                    className="flex-1 py-3.5 bg-kv-orange text-white rounded-2xl font-bold hover:bg-kv-orange/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
