import React, { useState, useEffect } from 'react';
import {
  Search, Users as UsersIcon, Shield, User, Loader2, Mail, Calendar,
  Edit, Save, X, Building2, Phone, MapPin, UserPlus, FileText, Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  phone?: string;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

type CustomerDraft = Omit<Customer, 'id' | 'created_at'>;

// ─── Empty draft ──────────────────────────────────────────────────────────────

const emptyDraft = (): CustomerDraft => ({
  name: '', company: '', address: '', phone: '', email: '', notes: '',
});

// ─── AdminUsers ───────────────────────────────────────────────────────────────

export function AdminUsers() {
  const navigate = useNavigate();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'members' | 'customers'>('members');

  // ════════════════════════════════════════════════════════════
  // Members tab state
  // ════════════════════════════════════════════════════════════
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab === 'members') fetchUsers();
  }, [currentPage, searchTerm, activeTab]);

  async function fetchUsers() {
    try {
      setLoading(true);
      let query = supabase.from('profiles').select('*', { count: 'exact' });
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
    } catch (err: unknown) {
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (err: unknown) {
      console.error('Update role error:', err);
      let msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปเดตบทบาท';
      if (msg.includes('row-level security')) {
        msg = 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลผู้ใช้ (RLS Policy) เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้ได้ กรุณาตรวจสอบสิทธิ์ของคุณในตาราง profiles';
      }
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

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

  // ════════════════════════════════════════════════════════════
  // Customers tab state
  // ════════════════════════════════════════════════════════════
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);

  // Slide-in panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft());
  const [panelSaving, setPanelSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const customerItemsPerPage = 10;

  useEffect(() => {
    if (activeTab === 'customers') fetchCustomers();
  }, [activeTab, customerPage, customerSearch]);

  async function fetchCustomers() {
    setCustomersLoading(true);
    try {
      let query = supabase.from('customers').select('*', { count: 'exact' });
      if (customerSearch.trim()) {
        const term = customerSearch.trim();
        query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
      }
      const from = (customerPage - 1) * customerItemsPerPage;
      const to = from + customerItemsPerPage - 1;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setCustomers((data as Customer[]) || []);
      setCustomerTotal(count || 0);
    } catch (err: unknown) {
      console.error('Error fetching customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  }

  const customerTotalPages = Math.ceil(customerTotal / customerItemsPerPage);

  function openAddPanel() {
    setEditingCustomer(null);
    setDraft(emptyDraft());
    setPanelOpen(true);
  }

  function openEditPanel(c: Customer) {
    setEditingCustomer(c);
    setDraft({ name: c.name, company: c.company, address: c.address, phone: c.phone, email: c.email, notes: c.notes });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingCustomer(null);
    setDraft(emptyDraft());
  }

  async function handleSaveCustomer() {
    if (!draft.name.trim()) { alert('กรุณาระบุชื่อลูกค้า'); return; }
    setPanelSaving(true);
    try {
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(draft).eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert(draft);
        if (error) throw error;
      }
      closePanel();
      setCustomerPage(1);
      await fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      alert(msg);
    } finally {
      setPanelSaving(false);
    }
  }

  async function handleDeleteCustomer(id: string) {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      setCustomerTotal(prev => prev - 1);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ';
      alert(msg);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 font-thai">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'members' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UsersIcon size={15} />
          สมาชิก
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'customers' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={15} />
          ลูกค้า/บริษัท
          {customerTotal > 0 && (
            <span className="bg-kv-orange text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {customerTotal}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════ MEMBERS TAB ══════════════════════════ */}
      {activeTab === 'members' && (
        <>
          {loading && users.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="animate-spin text-kv-orange" size={32} />
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="relative w-full lg:w-96">
                  <input
                    type="text"
                    placeholder="ค้นหาสมาชิกด้วยชื่อ หรือ อีเมล..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent shadow-sm"
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                </div>
                <div className="text-sm text-gray-500 font-bold bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm text-center lg:text-left">
                  พบสมาชิกทั้งหมด {totalCount} ราย
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                      <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                        <th className="p-4 font-bold whitespace-nowrap">สมาชิก</th>
                        <th className="p-4 font-bold whitespace-nowrap">บทบาท</th>
                        <th className="p-4 font-bold whitespace-nowrap">วันที่สมัคร</th>
                        <th className="p-4 font-bold whitespace-nowrap">เบอร์โทร</th>
                        <th className="p-4 font-bold whitespace-nowrap">จัดการ</th>
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

                {/* Mobile */}
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
                  <div className="p-12 text-center text-gray-400 font-bold">ไม่พบข้อมูลสมาชิก</div>
                )}
              </div>

              {/* Pagination */}
              {totalCount > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    แสดง {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
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
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
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
            </>
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
                            {editingUser.role === role.id && <div className="w-2 h-2 rounded-full bg-kv-orange" />}
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
        </>
      )}

      {/* ══════════════════════════ CUSTOMERS TAB ══════════════════════════ */}
      {activeTab === 'customers' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ค้นหาด้วยชื่อ, บริษัท, อีเมล..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>
            <button
              onClick={openAddPanel}
              className="flex items-center gap-2 px-4 py-2.5 bg-kv-orange text-white rounded-xl text-sm font-bold hover:bg-kv-orange/90 transition-colors shadow-sm shrink-0"
            >
              <UserPlus size={16} />
              เพิ่มลูกค้าใหม่
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
            {customersLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-kv-orange" />
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                      <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                        <th className="p-4 font-bold whitespace-nowrap">ชื่อ</th>
                        <th className="p-4 font-bold whitespace-nowrap">บริษัท</th>
                        <th className="p-4 font-bold whitespace-nowrap">เบอร์โทร</th>
                        <th className="p-4 font-bold whitespace-nowrap">อีเมล</th>
                        <th className="p-4 font-bold whitespace-nowrap">วันที่เพิ่ม</th>
                        <th className="p-4 font-bold whitespace-nowrap text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                      {customers.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-kv-navy/10 flex items-center justify-center text-kv-navy font-black text-sm shrink-0">
                                {c.name.charAt(0) || '?'}
                              </div>
                              <span className="font-bold text-kv-navy">{c.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500 font-medium">{c.company || '—'}</td>
                          <td className="p-4 text-gray-500 font-medium">
                            <div className="flex items-center gap-1">
                              <Phone size={13} className="text-gray-300" />
                              {c.phone || '—'}
                            </div>
                          </td>
                          <td className="p-4 text-gray-500 font-medium">
                            <div className="flex items-center gap-1">
                              <Mail size={13} className="text-gray-300" />
                              {c.email || '—'}
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 text-xs font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar size={13} />
                              {new Date(c.created_at).toLocaleDateString('th-TH')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 justify-center flex-wrap">
                              <button
                                onClick={() => navigate('/admin/quotation')}
                                title="ใช้ในใบเสนอราคา"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-kv-navy/10 text-kv-navy rounded-lg text-[10px] font-bold hover:bg-kv-navy/20 transition-colors"
                              >
                                <FileText size={11} />
                                ใบเสนอราคา
                              </button>
                              <button
                                onClick={() => openEditPanel(c)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="แก้ไข"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(c.id)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบ"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-50">
                  {customers.map(c => (
                    <div key={c.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-kv-navy/10 flex items-center justify-center text-kv-navy font-black shrink-0">
                            {c.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-kv-navy">{c.name}</div>
                            {c.company && <div className="text-xs text-gray-400">{c.company}</div>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => openEditPanel(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {c.phone && (
                          <div className="flex items-center gap-1"><Phone size={12} className="text-gray-300" />{c.phone}</div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1"><Mail size={12} className="text-gray-300" />{c.email}</div>
                        )}
                      </div>
                      <button
                        onClick={() => navigate('/admin/quotation')}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-kv-navy/5 text-kv-navy rounded-xl text-xs font-bold hover:bg-kv-navy/10 transition-colors"
                      >
                        <FileText size={13} />
                        ใช้ในใบเสนอราคา
                      </button>
                    </div>
                  ))}
                </div>

                {customers.length === 0 && (
                  <div className="p-12 text-center text-gray-400 font-bold">ไม่พบข้อมูลลูกค้า</div>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          {customerTotal > customerItemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                แสดง {((customerPage - 1) * customerItemsPerPage) + 1}–{Math.min(customerPage * customerItemsPerPage, customerTotal)} จาก {customerTotal} รายการ
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomerPage(prev => Math.max(prev - 1, 1))}
                  disabled={customerPage === 1}
                  className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  ก่อนหน้า
                </button>
                {[...Array(customerTotalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === customerTotalPages || (p >= customerPage - 1 && p <= customerPage + 1)) {
                    return (
                      <button
                        key={p}
                        onClick={() => setCustomerPage(p)}
                        className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                          customerPage === p
                            ? 'bg-kv-orange text-white shadow-lg shadow-kv-orange/20'
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === customerPage - 2 || p === customerPage + 2) {
                    return <span key={p} className="text-gray-300">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => setCustomerPage(prev => Math.min(prev + 1, customerTotalPages))}
                  disabled={customerPage === customerTotalPages}
                  className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          <AnimatePresence>
            {deleteConfirmId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                >
                  <div className="p-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                      <Trash2 size={24} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-kv-navy">ยืนยันการลบ</h3>
                      <p className="text-sm text-gray-500 mt-1">คุณต้องการลบข้อมูลลูกค้านี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(deleteConfirmId)}
                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                      >
                        ลบเลย
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ══════════ Slide-in Customer Panel ══════════ */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-kv-navy">
                  {editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                </h2>
                <button onClick={closePanel} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 block">
                    <User size={12} /> ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ชื่อลูกค้า"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 block">
                    <Building2 size={12} /> บริษัท / องค์กร
                  </label>
                  <input
                    type="text"
                    value={draft.company}
                    onChange={e => setDraft(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="ชื่อบริษัท (ถ้ามี)"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 block">
                    <Phone size={12} /> เบอร์โทร
                  </label>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={e => setDraft(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 block">
                    <Mail size={12} /> อีเมล
                  </label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 block">
                    <MapPin size={12} /> ที่อยู่
                  </label>
                  <textarea
                    value={draft.address}
                    onChange={e => setDraft(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">หมายเหตุ</label>
                  <textarea
                    value={draft.notes}
                    onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="บันทึกเพิ่มเติม..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={closePanel}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveCustomer}
                  disabled={panelSaving}
                  className="flex-1 py-3 bg-kv-orange text-white rounded-xl font-bold hover:bg-kv-orange/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {panelSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
