import React, { useState, useEffect } from 'react';
import { Search, Trash2, MessageSquare, Phone, User, Calendar, Loader2, RefreshCw, Users as UsersIcon } from 'lucide-react';
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

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('line_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('ลบ lead นี้ใช่ไหมครับ?')) return;
    setDeleting(id);
    await supabase.from('line_leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  };

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

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-kv-navy">{leads.length}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><UsersIcon size={12} /> Lead ทั้งหมด</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-black text-kv-orange">{todayCount}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Calendar size={12} /> วันนี้</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 col-span-2 sm:col-span-1">
          <div className="text-3xl font-black text-green-600">
            {leads.filter(l => l.phone).length}
          </div>
          <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Phone size={12} /> มีเบอร์โทร</div>
        </div>
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
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ลูกค้า</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ความสนใจ</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">ข้อความ</th>
                    <th className="text-left px-5 py-3 font-black text-xs text-gray-500 uppercase tracking-wider">เวลา</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map(lead => (
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
                        <td className="px-5 py-4 max-w-[220px]">
                          <p className="text-gray-600 text-xs truncate">{lead.message || '—'}</p>
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
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(lead => (
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">แสดง {filtered.length} จาก {leads.length} leads</p>
    </div>
  );
}
