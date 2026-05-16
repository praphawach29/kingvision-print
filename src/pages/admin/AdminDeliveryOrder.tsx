import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Download, Eye, EyeOff, Loader2,
  RefreshCw, Package, Search, X, Save, User, ChevronDown,
  FileText, CheckCircle, Clock, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Product {
  id: string;
  title: string;
  price: number;
  category?: string;
  brand?: string;
}

interface DeliveryItem {
  id: string;
  description: string;
  qty: number;
  remark: string;
}

interface StoreSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  logo_url?: string;
  signature_url?: string;
}

interface CustomerInfo {
  name: string;
  company: string;
  address: string;
  phone: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

interface DeliveryOrderRecord {
  id: string;
  do_number: string;
  invoice_ref: string;
  customer_name: string;
  customer_company: string;
  customer_address: string;
  customer_phone: string;
  items: DeliveryItem[];
  delivery_date: string | null;
  carrier: string;
  tracking_number: string;
  notes: string;
  status: 'pending' | 'delivered' | 'returned';
  created_at: string;
}

interface DocProps {
  storeSettings: StoreSettings;
  customer: CustomerInfo;
  items: DeliveryItem[];
  doNumber: string;
  doDate: string;
  invoiceRef: string;
  deliveryDate: string;
  carrier: string;
  trackingNumber: string;
  notes: string;
  signatureDataUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDONumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `DO${yy}${mm}${dd}-${rand}`;
}

function fdate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fdateShort(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('th-TH');
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_ORDER: DeliveryOrderRecord['status'][] = ['pending', 'delivered', 'returned'];

const STATUS_CONFIG: Record<DeliveryOrderRecord['status'], { label: string; color: string; bg: string }> = {
  pending:   { label: 'รอจัดส่ง',   color: 'text-gray-600',  bg: 'bg-gray-100' },
  delivered: { label: 'ส่งแล้ว',    color: 'text-green-700', bg: 'bg-green-100' },
  returned:  { label: 'คืนสินค้า',  color: 'text-red-600',   bg: 'bg-red-100' },
};

// ─── DeliveryOrderDoc (forwardRef — DEFINED OUTSIDE main component) ────────────

const DeliveryOrderDoc = React.forwardRef<HTMLDivElement, DocProps>(
  ({ storeSettings, customer, items, doNumber, doDate, invoiceRef,
     deliveryDate, carrier, trackingNumber, notes, signatureDataUrl }, ref) => (
    <div
      ref={ref}
      style={{
        width: '794px',
        background: '#fff',
        fontFamily: "'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', sans-serif",
        fontSize: '14px',
        color: '#1a1a2e',
        padding: '48px',
        boxSizing: 'border-box',
      }}
    >
      {/* Store Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '3px solid #1a2b4a', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {storeSettings.logo_url ? (
            <img src={storeSettings.logo_url} alt="logo" style={{ height: '60px', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '60px', height: '60px', background: '#1a2b4a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7941d', fontWeight: 900, fontSize: '28px' }}>K</div>
          )}
          <div>
            <div style={{ fontWeight: 900, fontSize: '20px', color: '#1a2b4a' }}>{storeSettings.store_name || 'KingVision Print'}</div>
            {storeSettings.store_address && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '280px', lineHeight: '1.5' }}>{storeSettings.store_address}</div>
            )}
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>
              {storeSettings.store_phone && `โทร: ${storeSettings.store_phone}`}
              {storeSettings.store_phone && storeSettings.store_email && '  |  '}
              {storeSettings.store_email && `อีเมล: ${storeSettings.store_email}`}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#f7941d' }}>ใบส่งสินค้า</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2b4a', marginTop: '6px' }}>{doNumber}</div>
          {invoiceRef && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>อ้างอิงใบแจ้งหนี้: {invoiceRef}</div>
          )}
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>วันที่: {doDate}</div>
        </div>
      </div>

      {/* Customer / Delivery Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>ผู้รับสินค้า</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2b4a' }}>{customer.name || 'ชื่อลูกค้า'}</div>
          {customer.company && <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '3px' }}>{customer.company}</div>}
          {customer.address && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{customer.address}</div>}
          {customer.phone && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px' }}>โทร: {customer.phone}</div>}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>ข้อมูลการจัดส่ง</div>
          <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#1a2b4a' }}>วันที่ส่ง: </span>
            {deliveryDate ? fdate(deliveryDate) : '—'}
          </div>
          {carrier && (
            <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: '#1a2b4a' }}>ขนส่ง: </span>{carrier}
            </div>
          )}
          {trackingNumber && (
            <div style={{ fontSize: '13px', color: '#4b5563' }}>
              <span style={{ fontWeight: 700, color: '#1a2b4a' }}>เลขติดตาม: </span>
              <span style={{ fontFamily: 'monospace', background: '#e5e7eb', padding: '1px 6px', borderRadius: '4px' }}>{trackingNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#1a2b4a', color: '#fff' }}>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '48px', borderRadius: '8px 0 0 0' }}>ลำดับ</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700 }}>รายการสินค้า</th>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '80px' }}>จำนวน</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderRadius: '0 8px 0 0' }}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{item.description || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'center', color: '#4b5563', fontWeight: 700 }}>{item.qty}</td>
              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6b7280' }}>{item.remark || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes */}
      {notes && (
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '16px', marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>หมายเหตุ</div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{notes}</div>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: notes ? '0' : '24px' }}>
        {/* ผู้ส่ง (store) */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {signatureDataUrl && (
              <img
                src={signatureDataUrl}
                alt="signature"
                crossOrigin="anonymous"
                style={{ maxHeight: '52px', maxWidth: '180px', objectFit: 'contain' }}
              />
            )}
          </div>
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลายเซ็นผู้ส่ง</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{storeSettings.store_name || 'KingVision Print'}</div>
          </div>
        </div>
        {/* ผู้รับ (customer) */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '56px' }} />
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลายเซ็นผู้รับ</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>วันที่: ____________</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          เอกสารนี้ออกโดย {storeSettings.store_name || 'KingVision Print'} | ใบส่งสินค้าเลขที่ {doNumber}
        </div>
      </div>
    </div>
  )
);

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-kv-navy text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold transition-all">
      <CheckCircle size={16} className="text-green-400 shrink-0" />
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminDeliveryOrder() {
  const captureRef = useRef<HTMLDivElement>(null);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── DO form state ──
  const [doNumber, setDoNumber] = useState(generateDONumber);
  const [doDate] = useState(
    new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  );
  const [invoiceRef, setInvoiceRef] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', company: '', address: '', phone: '',
  });
  const [items, setItems] = useState<DeliveryItem[]>([
    { id: '1', description: '', qty: 1, remark: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [savedDOId, setSavedDOId] = useState<string | null>(null);

  // ── Product search ──
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Customer search ──
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerRecord[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // ── History ──
  const [history, setHistory] = useState<DeliveryOrderRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | DeliveryOrderRecord['status']>('all');

  const docProps: DocProps = {
    storeSettings, customer, items, doNumber, doDate, invoiceRef,
    deliveryDate, carrier, trackingNumber, notes,
    signatureDataUrl: storeSettings.signature_url || '',
  };

  useEffect(() => {
    supabase.from('store_settings').select('*').single()
      .then(({ data }) => { if (data) setStoreSettings(data); })
      .then(() => setLoadingSettings(false), () => setLoadingSettings(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpenSearchId(null);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
    if (openSearchId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openSearchId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setCustomerSearchOpen(false);
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
      }
    }
    if (customerSearchOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [customerSearchOpen]);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const term = q.trim().replace(/[+\-_()\[\]{}.,:;/\\*"']/g, ' ').trim();
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, category, brand')
        .or(`title.ilike.%${term}%,brand.ilike.%${term}%`)
        .limit(30);

      if (error) { setSearchError(error.message); setSearchResults([]); return; }

      const words = term.split(/\s+/).filter(w => w.length >= 1);
      const lc = (s: string) => (s || '').toLowerCase();
      const all = data || [];
      const andMatched = words.length <= 1
        ? all
        : all.filter(p => words.every(w => lc(p.title).includes(lc(w)) || lc(p.brand || '').includes(lc(w))));
      const results = andMatched.length > 0 ? andMatched : all;
      const scored = results
        .map(p => ({
          ...p,
          _score: words.reduce(
            (acc, w) => acc + (lc(p.title).includes(lc(w)) ? 2 : 0) + (lc(p.brand || '').includes(lc(w)) ? 1 : 0),
            0
          ),
        }))
        .sort((a, b) => b._score - a._score);

      setSearchError(null);
      setSearchResults(scored);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerSearchResults([]); return; }
    setCustomerSearching(true);
    try {
      const term = q.trim();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(20);

      if (error) { setCustomerSearchResults([]); return; }
      setCustomerSearchResults(data || []);
    } catch {
      setCustomerSearchResults([]);
    } finally {
      setCustomerSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!customerSearchOpen) return;
    const t = setTimeout(() => searchCustomers(customerSearchQuery), 300);
    return () => clearTimeout(t);
  }, [customerSearchQuery, customerSearchOpen, searchCustomers]);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('delivery_orders')
        .select('*')
        .order('created_at', { ascending: false });
      setHistory((data as DeliveryOrderRecord[]) || []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }

  function openSearch(itemId: string) {
    setOpenSearchId(itemId);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }

  function pickProduct(itemId: string, product: Product) {
    updateItem(itemId, 'description', product.title);
    setOpenSearchId(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  function pickCustomer(c: CustomerRecord) {
    setCustomer({ name: c.name, company: c.company, address: c.address, phone: c.phone });
    setCustomerSearchOpen(false);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
  }

  function addItem() {
    setItems(prev => [...prev, { id: Date.now().toString(), description: '', qty: 1, remark: '' }]);
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id));
  }
  function updateItem(id: string, field: keyof DeliveryItem, value: string | number) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function buildPayload(status: DeliveryOrderRecord['status'] = 'pending') {
    return {
      do_number: doNumber,
      invoice_ref: invoiceRef,
      customer_name: customer.name,
      customer_company: customer.company,
      customer_address: customer.address,
      customer_phone: customer.phone,
      items: items as unknown as DeliveryItem[],
      delivery_date: deliveryDate || null,
      carrier,
      tracking_number: trackingNumber,
      notes,
      status,
    };
  }

  async function handleSave(status: DeliveryOrderRecord['status'] = 'pending') {
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (savedDOId) {
        const { error } = await supabase.from('delivery_orders').update(payload).eq('id', savedDOId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('delivery_orders').insert(payload).select('id').single();
        if (error) throw error;
        if (data) setSavedDOId(data.id);
      }
      setToast('บันทึกใบส่งสินค้าแล้ว');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก';
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPDF() {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let pos = 0;
        pdf.addImage(imgData, 'PNG', 0, pos, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          pos -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, pos, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      pdf.save(`${doNumber}.pdf`);
      await handleSave('delivered');
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  }

  function loadDO(rec: DeliveryOrderRecord) {
    setDoNumber(rec.do_number);
    setInvoiceRef(rec.invoice_ref || '');
    setDeliveryDate(rec.delivery_date || '');
    setCarrier(rec.carrier || '');
    setTrackingNumber(rec.tracking_number || '');
    setCustomer({
      name: rec.customer_name,
      company: rec.customer_company,
      address: rec.customer_address,
      phone: rec.customer_phone,
    });
    const loadedItems: DeliveryItem[] = Array.isArray(rec.items)
      ? rec.items.map((it: DeliveryItem) => ({
          id: it.id || Date.now().toString() + Math.random(),
          description: it.description || '',
          qty: Number(it.qty) || 1,
          remark: it.remark || '',
        }))
      : [{ id: '1', description: '', qty: 1, remark: '' }];
    setItems(loadedItems);
    setNotes(rec.notes);
    setSavedDOId(rec.id);
    setActiveTab('create');
  }

  async function deleteDO(id: string) {
    if (!confirm('ลบใบส่งสินค้านี้ใช่หรือไม่?')) return;
    await supabase.from('delivery_orders').delete().eq('id', id);
    setHistory(prev => prev.filter(r => r.id !== id));
  }

  async function cycleStatus(rec: DeliveryOrderRecord) {
    const currentIdx = STATUS_ORDER.indexOf(rec.status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    const { error } = await supabase.from('delivery_orders').update({ status: nextStatus }).eq('id', rec.id);
    if (!error) {
      setHistory(prev => prev.map(r => r.id === rec.id ? { ...r, status: nextStatus } : r));
    }
  }

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(r => r.status === historyFilter);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Hidden capture target */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <DeliveryOrderDoc ref={captureRef} {...docProps} />
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-kv-navy">ใบส่งสินค้า</h1>
          <p className="text-sm text-gray-500 mt-0.5">สร้างและจัดการใบส่งสินค้า</p>
        </div>
        {activeTab === 'create' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSave('pending')}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              บันทึก
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{showPreview ? 'ซ่อน' : 'ดู'}</span> Preview
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'create' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={15} />
          สร้างใบส่งสินค้า
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={15} />
          ประวัติใบส่งสินค้า
          {history.length > 0 && (
            <span className="bg-kv-orange text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: Create ── */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── LEFT: Form ── */}
          <div className="space-y-4">
            {/* DO Meta */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">ข้อมูลใบส่งสินค้า</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">เลขที่</label>
                  <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-black text-kv-navy border border-gray-100">{doNumber}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">วันที่ออก</label>
                  <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">{doDate}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">อ้างอิงใบแจ้งหนี้</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={e => setInvoiceRef(e.target.value)}
                    placeholder="INVxxxxxx-xxx"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">วันที่ส่ง</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ขนส่ง (Carrier)</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="เช่น Kerry, Flash, J&T"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">เลขติดตามพัสดุ</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">ข้อมูลลูกค้า / ปลายทาง</h2>

              <div ref={customerSearchRef} className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchOpen(prev => !prev);
                    setCustomerSearchQuery('');
                    setCustomerSearchResults([]);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-kv-navy/5 text-kv-navy rounded-xl text-xs font-bold hover:bg-kv-navy/10 transition-colors w-full justify-center border border-kv-navy/10"
                >
                  <User size={13} />
                  ค้นหาลูกค้า
                  <ChevronDown size={12} className={`transition-transform ${customerSearchOpen ? 'rotate-180' : ''}`} />
                </button>

                {customerSearchOpen && (
                  <div className="mt-2 bg-white rounded-xl border border-kv-navy/20 shadow-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        placeholder="ค้นหาด้วยชื่อ, บริษัท, อีเมล..."
                        className="flex-1 text-sm outline-none bg-transparent text-kv-navy placeholder:text-gray-400"
                      />
                      {customerSearching && <Loader2 size={13} className="animate-spin text-kv-orange shrink-0" />}
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {customerSearchResults.length === 0 && !customerSearching && customerSearchQuery.trim() && (
                        <p className="text-xs text-gray-400 font-bold text-center py-4">ไม่พบลูกค้าที่ตรงกัน</p>
                      )}
                      {customerSearchResults.length === 0 && !customerSearchQuery.trim() && (
                        <p className="text-xs text-gray-400 text-center py-4">พิมพ์เพื่อค้นหาลูกค้า</p>
                      )}
                      {customerSearchResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-kv-navy/5 transition-colors text-left border-b border-gray-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-kv-navy/10 flex items-center justify-center text-kv-navy font-black text-sm shrink-0">
                            {c.name.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-kv-navy truncate">{c.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {c.company && <span className="mr-2">{c.company}</span>}
                              {c.email && <span>{c.email}</span>}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {([
                  { key: 'name', label: 'ชื่อ-นามสกุล', placeholder: 'คุณ...', type: 'text' },
                  { key: 'company', label: 'บริษัท / องค์กร', placeholder: 'ชื่อบริษัท (ถ้ามี)', type: 'text' },
                  { key: 'address', label: 'ที่อยู่จัดส่ง', placeholder: 'ที่อยู่สำหรับจัดส่งสินค้า', type: 'textarea' },
                  { key: 'phone', label: 'เบอร์โทร', placeholder: '08x-xxx-xxxx', type: 'text' },
                ] as const).map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={customer[field.key]}
                        onChange={e => setCustomer(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={customer[field.key]}
                        onChange={e => setCustomer(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">รายการสินค้า</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-kv-orange/10 text-kv-orange rounded-lg text-xs font-bold hover:bg-kv-orange/20 transition-colors"
                >
                  <Plus size={13} /> เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-2" ref={searchRef}>
                {items.map((item, idx) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-2 space-y-1.5">
                    <div className="flex gap-1.5 items-center">
                      <div className="relative flex-1">
                        <input
                          value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          placeholder={`รายการที่ ${idx + 1}`}
                          className="w-full px-2 py-1.5 pr-8 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange"
                        />
                        {item.description && (
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, 'description', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openSearchId === item.id ? setOpenSearchId(null) : openSearch(item.id)}
                        title="ค้นหาสินค้าจากฐานข้อมูล"
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${openSearchId === item.id ? 'bg-kv-orange text-white' : 'bg-white border border-gray-100 text-kv-navy hover:bg-kv-navy hover:text-white'}`}
                      >
                        <Package size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => items.length > 1 && removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {openSearchId === item.id && (
                      <div className="bg-white rounded-xl border border-kv-orange/30 shadow-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                          <Search size={14} className="text-gray-400 shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาชื่อสินค้า, แบรนด์..."
                            className="flex-1 text-sm outline-none bg-transparent text-kv-navy placeholder:text-gray-400"
                          />
                          {searching && <Loader2 size={13} className="animate-spin text-kv-orange shrink-0" />}
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {searchError && (
                            <p className="text-xs text-red-500 font-bold text-center py-4 px-2">ข้อผิดพลาด: {searchError}</p>
                          )}
                          {!searchError && searchResults.length === 0 && !searching && searchQuery.trim() && (
                            <p className="text-xs text-gray-400 font-bold text-center py-4">ไม่พบสินค้าที่ตรงกัน</p>
                          )}
                          {!searchError && searchResults.length === 0 && !searchQuery.trim() && (
                            <p className="text-xs text-gray-400 text-center py-4">พิมพ์เพื่อค้นหาสินค้า</p>
                          )}
                          {searchResults.map(product => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => pickProduct(item.id, product)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-kv-orange/5 transition-colors text-left border-b border-gray-50 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-kv-navy truncate">{product.title}</p>
                                <p className="text-[10px] text-gray-400">
                                  {product.brand && <span className="mr-2">{product.brand}</span>}
                                  {product.category && <span>{product.category}</span>}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">จำนวน</p>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange text-center"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">หมายเหตุ</p>
                        <input
                          type="text"
                          value={item.remark}
                          onChange={e => updateItem(item.id, 'remark', e.target.value)}
                          placeholder="หมายเหตุ (ถ้ามี)"
                          className="w-full px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">หมายเหตุ</h2>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
              />
            </div>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className={showPreview ? 'block' : 'hidden xl:block'}>
            <div className="sticky top-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">ตัวอย่างใบส่งสินค้า (A4)</p>
                {loadingSettings && <RefreshCw size={13} className="animate-spin text-gray-400" />}
              </div>
              <div className="rounded-2xl shadow-lg border border-gray-200 bg-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '794px' }}>
                  <DeliveryOrderDoc {...docProps} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'delivered', 'returned'] as const).map(f => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  historyFilter === f
                    ? 'bg-kv-navy text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-kv-navy/30'
                }`}
              >
                {f === 'all' ? 'ทั้งหมด' : STATUS_CONFIG[f].label}
                {f !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    ({history.filter(r => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-kv-orange" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 font-bold">
              ไม่มีประวัติใบส่งสินค้า
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80">
                    <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-black">เลขที่</th>
                      <th className="p-4 font-black">ลูกค้า</th>
                      <th className="p-4 font-black">ขนส่ง</th>
                      <th className="p-4 font-black">สถานะ</th>
                      <th className="p-4 font-black">วันที่</th>
                      <th className="p-4 font-black text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {filteredHistory.map(rec => {
                      const sc = STATUS_CONFIG[rec.status];
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-black text-kv-navy text-xs">{rec.do_number}</td>
                          <td className="p-4">
                            <div className="font-bold text-kv-navy text-sm">{rec.customer_name || '—'}</div>
                            {rec.customer_company && (
                              <div className="text-[10px] text-gray-400">{rec.customer_company}</div>
                            )}
                          </td>
                          <td className="p-4 text-xs text-gray-500">
                            <div>{rec.carrier || '—'}</div>
                            {rec.tracking_number && (
                              <div className="font-mono text-[10px] text-gray-400">{rec.tracking_number}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => cycleStatus(rec)}
                              title="คลิกเพื่อเปลี่ยนสถานะ"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.color} hover:opacity-80 transition-opacity flex items-center gap-1`}
                            >
                              {sc.label}
                              <RotateCcw size={9} />
                            </button>
                          </td>
                          <td className="p-4 text-xs text-gray-400 font-medium">{fdateShort(rec.created_at)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => loadDO(rec)}
                                className="px-3 py-1.5 bg-kv-navy/10 text-kv-navy rounded-lg text-xs font-bold hover:bg-kv-navy/20 transition-colors"
                              >
                                โหลด
                              </button>
                              <button
                                onClick={() => deleteDO(rec.id)}
                                className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-50">
                {filteredHistory.map(rec => {
                  const sc = STATUS_CONFIG[rec.status];
                  return (
                    <div key={rec.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-kv-navy text-sm">{rec.do_number}</div>
                          <div className="text-xs font-bold text-gray-600 mt-0.5">{rec.customer_name || '—'}</div>
                          {rec.customer_company && (
                            <div className="text-[10px] text-gray-400">{rec.customer_company}</div>
                          )}
                        </div>
                        <button
                          onClick={() => cycleStatus(rec)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.color} shrink-0 flex items-center gap-1`}
                        >
                          {sc.label} <RotateCcw size={8} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{rec.carrier || '—'}</span>
                        <span className="text-[10px] text-gray-400">{fdateShort(rec.created_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadDO(rec)}
                          className="flex-1 py-2 bg-kv-navy/10 text-kv-navy rounded-xl text-xs font-bold"
                        >
                          โหลด
                        </button>
                        <button
                          onClick={() => deleteDO(rec.id)}
                          className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
