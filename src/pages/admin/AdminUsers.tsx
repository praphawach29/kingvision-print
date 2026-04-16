import React, { useState, useEffect } from 'react';
import { Search, Users as UsersIcon, Shield, User, Loader2, Mail, Calendar, Edit, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  phone?: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  async function fetchUsers() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setIsSaving(true);
    try {
      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (err: any) {
      console.error('Update role error:', err);
      let msg = err.message || 'เกิดข้อผิดพลาดในการอัปเดตบทบาท';
      if (msg.includes('row-level security')) {
        msg = 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลผู้ใช้ (RLS Policy) เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้ได้ กรุณาตรวจสอบสิทธิ์ของคุณในตาราง profiles';
      }
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-red-100 text-red-700', icon: Shield };
      case 'admin':
        return { label: 'Admin', color: 'bg-orange-100 text-orange-700', icon: Shield };
      default:
        return { label: 'User', color: 'bg-blue-100 text-blue-700', icon: User };
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-thai">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="relative w-full lg:w-96">
          <input 
            type="text" 
            placeholder="ค้นหาลูกค้าด้วยชื่อ หรือ อีเมล..." 
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent shadow-sm"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>
        <div className="text-sm text-gray-500 font-bold bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm text-center lg:text-left">
          พบลูกค้าทั้งหมด {totalCount} ราย
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                <th className="p-4 font-bold">ลูกค้า</th>
                <th className="p-4 font-bold">บทบาท</th>
                <th className="p-4 font-bold">วันที่สมัคร</th>
                <th className="p-4 font-bold">เบอร์โทร</th>
                <th className="p-4 font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((user) => {
                const role = getRoleBadge(user.role);
                const RoleIcon = role.icon;
                
                return (
                   <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-kv-navy font-black shadow-sm border border-gray-200">
                          {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-kv-navy">{user.full_name || 'ไม่ระบุชื่อ'}</div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                            <Mail size={10} /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${role.color}`}>
                        <RoleIcon size={12} />
                        {role.label}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 font-bold">{user.phone || '-'}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="แก้ไขบทบาท"
                      >
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {users.map((user) => {
            const role = getRoleBadge(user.role);
            const RoleIcon = role.icon;
            return (
              <div key={user.id} className="p-4 space-y-4 active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-kv-navy text-white flex items-center justify-center font-black text-xl shadow-lg shadow-kv-navy/20">
                    {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-kv-navy truncate">{user.full_name || 'ไม่ระบุชื่อ'}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${role.color}`}>
                        <RoleIcon size={10} />
                        {role.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                    <Calendar size={12} />
                    เป็นสมาชิกเมื่อ {new Date(user.created_at).toLocaleDateString('th-TH')}
                  </div>
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider"
                  >
                    <Edit size={12} /> แก้ไขบทบาท
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-bold">
            ไม่พบข้อมูลลูกค้า
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                        currentPage === pageNum 
                          ? 'bg-kv-orange text-white shadow-lg shadow-kv-orange/20' 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-gray-300">...</span>;
                }
                return null;
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-kv-navy">แก้ไขบทบาทผู้ใช้</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-kv-navy text-white flex items-center justify-center font-bold text-xl">
                    {editingUser.full_name?.charAt(0) || editingUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-kv-navy">{editingUser.full_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-sm text-gray-500">{editingUser.email}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">เลือกบทบาทใหม่</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'user', label: 'User (ลูกค้าทั่วไป)', desc: 'เข้าถึงหน้าเว็บปกติและประวัติการสั่งซื้อ' },
                      { id: 'admin', label: 'Admin (ผู้ดูแลระบบ)', desc: 'จัดการสินค้าและออเดอร์ได้' },
                      { id: 'super_admin', label: 'Super Admin (ผู้ดูแลสูงสุด)', desc: 'จัดการได้ทุกอย่างรวมถึงบทบาทผู้ใช้' },
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleUpdateRole(editingUser.id, role.id)}
                        disabled={isSaving}
                        className={`p-4 text-left border rounded-xl transition-all flex items-center justify-between group ${
                          editingUser.role === role.id 
                            ? 'border-kv-orange bg-orange-50 ring-1 ring-kv-orange' 
                            : 'border-gray-200 hover:border-kv-orange hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className={`font-bold ${editingUser.role === role.id ? 'text-kv-orange' : 'text-kv-navy'}`}>
                            {role.label}
                          </div>
                          <div className="text-xs text-gray-500">{role.desc}</div>
                        </div>
                        {isSaving && editingUser.role !== role.id && (
                          <Loader2 className="animate-spin text-kv-orange" size={18} />
                        )}
                        {editingUser.role === role.id && (
                          <div className="w-2 h-2 rounded-full bg-kv-orange" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
