import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, X, Save, Image as ImageIcon, AlertCircle, FileText, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  author_id: string;
  created_at: string;
  published: boolean;
}

export function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    image_url: '',
    category: 'ข่าวสาร',
    published: true
  });

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchTerm]);

  async function fetchPosts() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('blog_posts')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setPosts(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData(post);
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        image_url: '',
        category: 'ข่าวสาร',
        published: true
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 2MB)');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') // Using existing bucket for simplicity
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (err: any) {
      alert('อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      // Ensure author_id is set for new posts
      const dataToSave = { 
        ...formData,
        author_id: formData.author_id || authUser.id
      };

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(dataToSave)
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([dataToSave]);
        if (error) throw error;
      }
      
      await fetchPosts();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Submit error:', err);
      let msg = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      const rawError = JSON.stringify(err);
      
      if (msg.toLowerCase().includes('row-level security') || err.code === '42501') {
        msg = 'คุณไม่มีสิทธิ์ในการบันทึกข้อมูล (RLS Policy) กรุณาตรวจสอบว่าบัญชีของคุณมีสิทธิ์เป็น Admin ในตาราง profiles หรือรันคำสั่ง SQL ในไฟล์ supabase_setup.sql อีกครั้ง';
      } else if (msg.toLowerCase().includes('schema cache')) {
        msg = 'ระบบฐานข้อมูลยังไม่อัปเดต (Schema Cache) กรุณารันคำสั่ง SQL "NOTIFY pgrst, \'reload schema\';" ใน Supabase SQL Editor';
      }
      
      setError(`${msg}${rawError !== '{}' ? ` (Debug: ${rawError})` : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบบทความนี้ใช่หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPosts();
    } catch (err: any) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6 font-thai">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="relative w-full lg:w-96">
          <input 
            type="text" 
            placeholder="ค้นหาบทความ..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent shadow-sm"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-kv-navy text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-kv-orange transition-all shrink-0 font-bold shadow-lg shadow-kv-navy/20 active:scale-95"
        >
          <Plus size={20} /> เขียนบทความใหม่
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                <th className="p-4 font-bold">บทความ</th>
                <th className="p-4 font-bold">หมวดหมู่</th>
                <th className="p-4 font-bold">สถานะ</th>
                <th className="p-4 font-bold">วันที่สร้าง</th>
                <th className="p-4 font-bold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                        {post.image_url ? (
                          <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-kv-navy truncate max-w-[300px]">{post.title}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[300px]">{post.excerpt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {post.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {post.published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 font-medium">
                    {new Date(post.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(post)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(post.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {posts.map((post) => (
            <div key={post.id} className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-kv-navy line-clamp-2">{post.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black">{post.category}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {post.published ? 'เผยแพร่' : 'ร่าง'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => handleOpenModal(post)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">แก้ไข</button>
                <button onClick={() => handleDelete(post.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">ลบ</button>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-400 font-bold">ไม่พบข้อมูลบทความ</div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > itemsPerPage && (
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            หน้า {currentPage} จาก {totalPages}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-kv-navy uppercase">{editingPost ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-100">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">หัวข้อบทความ</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy"
                      placeholder="ระบุหัวข้อบทความ..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">หมวดหมู่</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy"
                      >
                        <option value="ข่าวสาร">ข่าวสาร</option>
                        <option value="โปรโมชั่น">โปรโมชั่น</option>
                        <option value="ความรู้">ความรู้</option>
                        <option value="รีวิว">รีวิว</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">สถานะ</label>
                      <div className="flex items-center gap-4 h-[52px] px-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.published}
                            onChange={(e) => setFormData({...formData, published: e.target.checked})}
                            className="w-5 h-5 rounded-lg text-kv-orange focus:ring-kv-orange"
                          />
                          <span className="text-sm font-bold text-kv-navy">เผยแพร่ทันที</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">รูปภาพหน้าปก</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                        {isUploading ? <Loader2 className="animate-spin text-kv-orange" /> : (
                          <>
                            <Upload className="text-gray-400 mb-2" />
                            <p className="text-[10px] font-bold text-gray-500">คลิกเพื่ออัปโหลดรูปภาพ</p>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                      <div className="h-32 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="text-gray-200" size={32} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">คำโปรย (Excerpt)</label>
                    <textarea 
                      rows={2}
                      value={formData.excerpt || ''}
                      onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy resize-none"
                      placeholder="สรุปเนื้อหาสั้นๆ..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">เนื้อหาบทความ</label>
                    <textarea 
                      rows={10}
                      required
                      value={formData.content || ''}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy resize-none"
                      placeholder="เขียนเนื้อหาบทความที่นี่..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">ยกเลิก</button>
                  <button type="submit" disabled={isSaving || isUploading} className="flex-[2] py-4 bg-kv-navy text-white rounded-2xl font-black uppercase tracking-widest hover:bg-kv-orange transition-all flex items-center justify-center gap-2 shadow-xl shadow-kv-navy/20 disabled:opacity-70">
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {editingPost ? 'บันทึกการแก้ไข' : 'เผยแพร่บทความ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
