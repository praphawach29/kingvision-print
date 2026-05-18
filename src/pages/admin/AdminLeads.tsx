import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Trash2, MessageSquare, Phone, User, Calendar,
  Loader2, RefreshCw, Users as UsersIcon, Link2, X, CheckCircle, LinkIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Lead {
  id: string;
  user_id: string;
  display_name: string;
  phone: string;
  interest: string;
  message: string;
  created_at: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  line_user_id: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-kv-navy text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold">
      <CheckCircle size={16} className="text-green-400 shrink-0" />
      {message}
    </div>
  );
}

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // linked: map line_user_id → customer name
  const [linkedMap, setLinkedMap] = useState<Record<string, string>>({});

  // Dialog state
  const [linkingLead, setLinkingLead] = useState<Lead | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<CustomerRecord[]>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: linkedCustomers }] = await Promise.all([
      supabase.from('line_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('name, line_user_id').not('line_user_id', 'is', null),
    ]);
    setLeads(leadsData || []);
    const map: Record<string, string> = {};
    (linkedCustomers || []).forEach((c: { name: string; line_user_id: string }) => {
      if (c.line_user_id) map[c.line_user_id] = c.name;
    });
    setLinkedMap(map);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  // Close dialog on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        closeDialog();
      }
    }
    if (linkingLead) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [linkingLead]);

  // Customer search with debounce
  useEffect(() => {
    if (!linkingLead) return;
    if (!custSearch.trim()) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      setCustSearching(true);
      const { data } = await supabase
        .from('customers')
        .select('id, name, company, phone, email, line_user_id')
        .or(`name.ilike.%${custSearch.trim()}%,company.ilike.%${custSearch.trim()}%,phone.ilike.%${custSearch.trim()}%`)
        .limit(20);
      setCustResults(data || []);
      setCustSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, linkingLead]);

  const handleDelete = async (id: string) => {
    if (!confirm('ลบ lead นี้ใช่ไหมครับ?')) return;
    setDeleting(id);
    await supabase.from('line_leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  };

  function openLinkDialog(lead: Lead) {
    setLinkingLead(lead);
    setCustSearch('');
    setCustResults([]);
  }

  function closeDialog() {
    setLinkingLead(null);
    setCustSearch('');
    setCustResults([]);
  }

  async function handleLink(customer: CustomerRecord) {
    if (!linkingLead) return;
    setLinking(true);
    const { error } = await supabase
      .from('customers')
      .update({ line_user_id: linkingLead.user_id })
      .eq('id', customer.id);
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      setLinkedMap(prev => ({ ...prev, [linkingLead.user_id]: customer.name }));
      setToast(`เชื่อม "${linkingLead.display_name}" กับลูกค้า "${customer.name}" สำเร็จ`);
      closeDialog();
    }
    setLinking(false);
  }

  async function handleUnlink(lead: Lead) {
    if (!confirm(`ยกเลิกการเชื่อม "${lead.display_name}" ออกจากลูกค้า "${linkedMap[lead.user_id]}" ใช่หรือไม่?`)) return;
    const { error } = await supabase
      .from('customers')
      .update({ line_user_id: null })
      .eq('line_user_id', lead.user_id);
    if (!error) {
      setLinkedMap(prev => {
        const next = { ...prev };
        delete next[lead.user_id];
        return next;
      });
      setToast('ยกเลิกการเชื่อมแล้ว');
    }
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return (
      l.display_name?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.interest?.toLowerCase().includes(q) ||
      l.message?.toLowerCase().includes(q)
    );
  });

  const today = new Date().toDateString();
  const todayCount = leads.filter(l => new Date(l.created_at).toDateString() === today).length;
  const linkedCount = leads.filter(l => linkedMap[l.user_id]).length;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-kv-navy">LINE Leads</h2>
          <p className="text-sm text-gray-500 mt-0.5">ลูกค้าที่สนใจสินค้าผ่าน LINE OA</p>
        </div>
        <button
          onClick={fetchLeads}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
        >
          <RefreshCw size={15} /> รีเฟรช
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-kv-navy">{leads.length}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><UsersIcon size={12} /> Lead ทั้งหมด</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-kv-orange">{todayCount}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Calendar size={12} /> วันนี้</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-green-600">{leads.filter(l => l.phone).length}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Phone size={12} /> มีเบอร์โทร</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-purple-600">{linkedCount}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Link2 size={12} /> เชื่อมแล้ว</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
        <LinkIcon size={16} className="text-purple-500 shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700 font-medium">
          กดปุ่ม <strong>เชื่อมลูกค้า</strong> เพื่อผูก LINE User ID เข้ากับข้อมูลลูกค้าในระบบ
          — เมื่อเชื่อมแล้ว เอกสารทุกประเภทจะส่งถึงลูกค้าผ่าน LINE OA ได้อัตโนมัติ
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ เบอร์โทร ความสนใจ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-kv-orange shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-kv-orange" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">{search ? 'ไม่พบ lead ที่ค้นหา' : 'ยังไม่มี lead ครับ'}</p>
            <p className="text-xs mt-1">เมื่อลูกค้าสนใจสินค้าผ่าน LINE OA จะปรากฏที่นี่</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ลูกค้า LINE</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ความสนใจ</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ข้อความ</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">สถานะ</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">เวลา</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map(lead => {
                      const linkedName = linkedMap[lead.user_id];
                      return (
                        <motion.tr
                          key={lead.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                <User size={14} className="text-green-600" />
                              </div>
                              <div>
                                <div className="font-bold text-kv-navy">{lead.display_name || '—'}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{lead.user_id?.slice(0, 12)}…</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="font-bold text-kv-orange hover:underline flex items-center gap-1">
                                <Phone size={12} />{lead.phone}
                              </a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            {lead.interest ? (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">{lead.interest}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-4 max-w-[200px]">
                            <p className="text-gray-600 text-xs truncate">{lead.message || '—'}</p>
                          </td>
                          <td className="px-5 py-4">
                            {linkedName ? (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                  <Link2 size={10} /> {linkedName}
                                </span>
                                <button
                                  onClick={() => handleUnlink(lead)}
                                  title="ยกเลิกการเชื่อม"
                                  className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openLinkDialog(lead)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                              >
                                <Link2 size={11} /> เชื่อมลูกค้า
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-xs text-gray-400">{timeAgo(lead.created_at)}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleDelete(lead.id)}
                              disabled={deleting === lead.id}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              {deleting === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(lead => {
                const linkedName = linkedMap[lead.user_id];
                return (
                  <div key={lead.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <User size={14} className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-bold text-kv-navy text-sm">{lead.display_name || '—'}</div>
                          <div className="text-[10px] text-gray-400">{timeAgo(lead.created_at)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting === lead.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        {deleting === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-kv-orange font-bold text-sm">
                        <Phone size={12} />{lead.phone}
                      </a>
                    )}
                    {lead.interest && (
                      <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">{lead.interest}</span>
                    )}
                    {lead.message && <p className="text-xs text-gray-500 line-clamp-2">{lead.message}</p>}
                    <div>
                      {linkedName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                            <Link2 size={10} /> {linkedName}
                          </span>
                          <button onClick={() => handleUnlink(lead)} className="p-1 rounded text-gray-300 hover:text-red-400">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openLinkDialog(lead)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold"
                        >
                          <Link2 size={11} /> เชื่อมลูกค้า
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">แสดง {filtered.length} จาก {leads.length} leads</p>

      {/* ── Link Dialog ── */}
      <AnimatePresence>
        {linkingLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          >
            <motion.div
              ref={dialogRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-black text-kv-navy">เชื่อมกับลูกค้าในระบบ</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    LINE: <span className="font-bold text-green-600">{linkingLead.display_name}</span>
                  </p>
                </div>
                <button onClick={closeDialog} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Search input */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 focus-within:border-kv-orange transition-colors">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={custSearch}
                    onChange={e => setCustSearch(e.target.value)}
                    placeholder="ค้นหาชื่อลูกค้า บริษัท เบอร์โทร..."
                    className="flex-1 text-sm bg-transparent outline-none text-kv-navy placeholder:text-gray-400"
                  />
                  {custSearching && <Loader2 size={13} className="animate-spin text-kv-orange shrink-0" />}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto px-2 pb-4">
                {!custSearch.trim() && (
                  <p className="text-xs text-gray-400 text-center py-6">พิมพ์เพื่อค้นหาลูกค้า</p>
                )}
                {custSearch.trim() && !custSearching && custResults.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">ไม่พบลูกค้าที่ตรงกัน</p>
                )}
                {custResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleLink(c)}
                    disabled={linking}
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-purple-50 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-kv-navy/10 flex items-center justify-center text-kv-navy font-black text-sm shrink-0">
                        {c.name.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-kv-navy text-sm truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {c.company && <span className="mr-2">{c.company}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {c.line_user_id ? (
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">เชื่อมอยู่</span>
                      ) : (
                        <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-lg flex items-center gap-1">
                          {linking ? <Loader2 size={10} className="animate-spin" /> : <Link2 size={10} />} เชื่อม
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
