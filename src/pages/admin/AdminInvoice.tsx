import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Download, Mail, Eye, EyeOff, Loader2,
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

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
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
  email: string;
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

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  quotation_ref: string;
  customer_name: string;
  customer_company: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  items: InvoiceItem[];
  subtotal: number;
  vat_enabled: boolean;
  vat_rate: number;
  vat_amount: number;
  total: number;
  notes: string;
  payment_terms: string;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
}

interface DocProps {
  storeSettings: StoreSettings;
  customer: CustomerInfo;
  items: InvoiceItem[];
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  quotationRef: string;
  subtotal: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string;
  paymentTerms: string;
  signatureDataUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV${yy}${mm}${dd}-${rand}`;
}

function fp(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const STATUS_ORDER: InvoiceRecord['status'][] = ['draft', 'sent', 'paid', 'overdue'];

const STATUS_CONFIG: Record<InvoiceRecord['status'], { label: string; color: string; bg: string }> = {
  draft:   { label: 'สร้างแล้ว',    color: 'text-gray-600',   bg: 'bg-gray-100' },
  sent:    { label: 'ส่งแล้ว',      color: 'text-blue-600',   bg: 'bg-blue-100' },
  paid:    { label: 'ชำระแล้ว',     color: 'text-green-700',  bg: 'bg-green-100' },
  overdue: { label: 'เกินกำหนด',    color: 'text-red-600',    bg: 'bg-red-100' },
};

// ─── InvoiceDoc (forwardRef — DEFINED OUTSIDE main component) ─────────────────

const InvoiceDoc = React.forwardRef<HTMLDivElement, DocProps>(
  ({ storeSettings, customer, items, invoiceNumber, invoiceDate, dueDate, quotationRef,
     subtotal, vatEnabled, vatRate, vatAmount, total, notes, paymentTerms, signatureDataUrl }, ref) => (
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
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#f7941d' }}>ใบแจ้งหนี้</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2b4a', marginTop: '6px' }}>{invoiceNumber}</div>
          {quotationRef && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>อ้างอิงใบเสนอราคา: {quotationRef}</div>
          )}
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>วันที่: {invoiceDate}</div>
          {dueDate && (
            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '3px', fontWeight: 600 }}>วันครบกำหนด: {fdate(dueDate)}</div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>เรียน / ผู้รับใบแจ้งหนี้</div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a2b4a' }}>{customer.name || 'ชื่อลูกค้า'}</div>
        {customer.company && <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '3px' }}>{customer.company}</div>}
        {customer.address && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{customer.address}</div>}
        {(customer.phone || customer.email) && (
          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px' }}>
            {customer.phone && `โทร: ${customer.phone}`}
            {customer.phone && customer.email && '  |  '}
            {customer.email && `อีเมล: ${customer.email}`}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#1a2b4a', color: '#fff' }}>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '48px', borderRadius: '8px 0 0 0' }}>ลำดับ</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700 }}>รายการสินค้า / บริการ</th>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '70px' }}>จำนวน</th>
            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px', fontWeight: 700, width: '140px' }}>ราคา/หน่วย (บาท)</th>
            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px', fontWeight: 700, width: '140px', borderRadius: '0 8px 0 0' }}>รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{item.description || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'center', color: '#4b5563' }}>{item.qty}</td>
              <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'right', color: '#4b5563' }}>{fp(item.unitPrice)}</td>
              <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#1a2b4a' }}>{fp(item.qty * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
            <span>ยอดรวมก่อน VAT</span>
            <span style={{ fontWeight: 600 }}>{fp(subtotal)} บาท</span>
          </div>
          {vatEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
              <span>VAT {vatRate}%</span>
              <span style={{ fontWeight: 600 }}>{fp(vatAmount)} บาท</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1a2b4a', borderRadius: '10px', marginTop: '10px', color: '#fff' }}>
            <span style={{ fontWeight: 900, fontSize: '15px' }}>ยอดรวมทั้งสิ้น</span>
            <span style={{ fontWeight: 900, fontSize: '20px', color: '#f7941d' }}>{fp(total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(notes || paymentTerms) && (
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          {notes && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>หมายเหตุ</div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{notes}</div>
            </div>
          )}
          {paymentTerms && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>เงื่อนไขการชำระเงิน</div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.7' }}>{paymentTerms}</div>
            </div>
          )}
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '16px' }}>
        {/* ผู้จ่ายเงิน */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '56px' }} />
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลายเซ็นผู้จ่ายเงิน</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>วันที่: ____________</div>
          </div>
        </div>
        {/* ผู้รับเงิน */}
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
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลายเซ็นผู้รับเงิน</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{storeSettings.store_name || 'KingVision Print'}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          เอกสารนี้ออกโดย {storeSettings.store_name || 'KingVision Print'} | ใบแจ้งหนี้เลขที่ {invoiceNumber}
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

export function AdminInvoice() {
  const captureRef = useRef<HTMLDivElement>(null);

  // ── Store settings ──
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Invoice form state ──
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate] = useState(
    new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [quotationRef, setQuotationRef] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', company: '', address: '', phone: '', email: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', qty: 1, unitPrice: 0 },
  ]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const vatRate = 7;
  const [notes, setNotes] = useState('ขอบคุณที่ไว้วางใจเลือกใช้บริการของเรา');
  const [paymentTerms, setPaymentTerms] = useState('ชำระเงินภายในวันครบกำหนด');

  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  // ── Product search state ──
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Customer search state ──
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerRecord[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // ── History state ──
  const [history, setHistory] = useState<InvoiceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | InvoiceRecord['status']>('all');

  // ── Derived ──
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vatAmount;

  const effectiveSignature = storeSettings.signature_url || '';

  const docProps: DocProps = {
    storeSettings, customer, items, invoiceNumber, invoiceDate, dueDate, quotationRef,
    subtotal, vatEnabled, vatRate, vatAmount, total, notes, paymentTerms,
    signatureDataUrl: effectiveSignature,
  };

  // ── Load store settings ──
  useEffect(() => {
    supabase.from('store_settings').select('*').single()
      .then(({ data }) => { if (data) setStoreSettings(data); })
      .then(() => setLoadingSettings(false), () => setLoadingSettings(false));
  }, []);

  // ── Load history when tab switches ──
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  // ── Close product search on outside click ──
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

  // ── Close customer search on outside click ──
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

  // ── Product search ──
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

  // ── Customer search ──
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

  // ── History fetch ──
  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      setHistory((data as InvoiceRecord[]) || []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }

  // ── Helpers ──
  function openSearch(itemId: string) {
    setOpenSearchId(itemId);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }

  function pickProduct(itemId: string, product: Product) {
    updateItem(itemId, 'description', product.title);
    updateItem(itemId, 'unitPrice', product.price || 0);
    setOpenSearchId(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  function pickCustomer(c: CustomerRecord) {
    setCustomer({ name: c.name, company: c.company, address: c.address, phone: c.phone, email: c.email });
    setCustomerSearchOpen(false);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
  }

  function addItem() {
    setItems(prev => [...prev, { id: Date.now().toString(), description: '', qty: 1, unitPrice: 0 }]);
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id));
  }
  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  // ── Build payload ──
  function buildPayload(status: InvoiceRecord['status'] = 'draft') {
    return {
      invoice_number: invoiceNumber,
      quotation_ref: quotationRef,
      customer_name: customer.name,
      customer_company: customer.company,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_address: customer.address,
      items: items as unknown as InvoiceItem[],
      subtotal,
      vat_enabled: vatEnabled,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      notes,
      payment_terms: paymentTerms,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      status,
    };
  }

  // ── Save ──
  async function handleSave(status: InvoiceRecord['status'] = 'draft') {
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (savedInvoiceId) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', savedInvoiceId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
        if (error) throw error;
        if (data) setSavedInvoiceId(data.id);
      }
      setToast(status === 'sent' ? 'บันทึกและอัปเดตสถานะเป็น "ส่งแล้ว"' : 'บันทึกใบแจ้งหนี้แล้ว');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก';
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Export PDF ──
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
      pdf.save(`${invoiceNumber}.pdf`);
      await handleSave('sent');
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  }

  function handleSendEmail() {
    const subject = encodeURIComponent(`ใบแจ้งหนี้ ${invoiceNumber} - ${storeSettings.store_name || 'KingVision'}`);
    const body = encodeURIComponent(
      `เรียน คุณ${customer.name}\n\n` +
      `แนบใบแจ้งหนี้เลขที่ ${invoiceNumber} มาด้วยครับ/ค่ะ\n\n` +
      `ยอดรวมทั้งสิ้น: ${fp(total)} บาท\n` +
      (dueDate ? `กำหนดชำระ: ${fdate(dueDate)}\n` : '') +
      `\nขอบคุณครับ/ค่ะ\n${storeSettings.store_name || ''}\nโทร: ${storeSettings.store_phone || ''}`
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
  }

  // ── History actions ──
  function loadInvoice(inv: InvoiceRecord) {
    setInvoiceNumber(inv.invoice_number);
    setQuotationRef(inv.quotation_ref || '');
    setCustomer({
      name: inv.customer_name,
      company: inv.customer_company,
      address: inv.customer_address,
      phone: inv.customer_phone,
      email: inv.customer_email,
    });
    const loadedItems: InvoiceItem[] = Array.isArray(inv.items)
      ? inv.items.map((it: InvoiceItem) => ({
          id: it.id || Date.now().toString() + Math.random(),
          description: it.description || '',
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        }))
      : [{ id: '1', description: '', qty: 1, unitPrice: 0 }];
    setItems(loadedItems);
    setVatEnabled(inv.vat_enabled);
    setNotes(inv.notes);
    setPaymentTerms(inv.payment_terms);
    if (inv.due_date) setDueDate(inv.due_date);
    setSavedInvoiceId(inv.id);
    setActiveTab('create');
  }

  async function deleteInvoice(id: string) {
    if (!confirm('ลบใบแจ้งหนี้นี้ใช่หรือไม่?')) return;
    await supabase.from('invoices').delete().eq('id', id);
    setHistory(prev => prev.filter(q => q.id !== id));
  }

  async function cycleStatus(inv: InvoiceRecord) {
    const currentIdx = STATUS_ORDER.indexOf(inv.status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    const { error } = await supabase.from('invoices').update({ status: nextStatus }).eq('id', inv.id);
    if (!error) {
      setHistory(prev => prev.map(r => r.id === inv.id ? { ...r, status: nextStatus } : r));
    }
  }

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(q => q.status === historyFilter);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Hidden capture target */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <InvoiceDoc ref={captureRef} {...docProps} />
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-kv-navy">ใบแจ้งหนี้</h1>
          <p className="text-sm text-gray-500 mt-0.5">สร้างและส่งใบแจ้งหนี้ให้ลูกค้า</p>
        </div>
        {activeTab === 'create' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSave('draft')}
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
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">ส่ง</span>อีเมล
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
          สร้างใบแจ้งหนี้
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={15} />
          ประวัติใบแจ้งหนี้
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
            {/* Invoice Meta */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">ข้อมูลใบแจ้งหนี้</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">เลขที่</label>
                  <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-black text-kv-navy border border-gray-100">{invoiceNumber}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">วันที่ออก</label>
                  <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">{invoiceDate}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">วันครบกำหนดชำระ</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">อ้างอิงใบเสนอราคา</label>
                  <input
                    type="text"
                    value={quotationRef}
                    onChange={e => setQuotationRef(e.target.value)}
                    placeholder="QTxxxxxx-xxx"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">ข้อมูลลูกค้า</h2>

              {/* Customer search */}
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
                  { key: 'address', label: 'ที่อยู่', placeholder: 'ที่อยู่สำหรับออกใบกำกับภาษี', type: 'textarea' },
                  { key: 'phone', label: 'เบอร์โทร', placeholder: '08x-xxx-xxxx', type: 'text' },
                  { key: 'email', label: 'อีเมล', placeholder: 'email@example.com', type: 'email' },
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
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">รายการสินค้า / บริการ</h2>
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
                          placeholder={`รายการที่ ${idx + 1} — พิมพ์หรือค้นหาสินค้า`}
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
                              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-kv-orange/5 transition-colors text-left border-b border-gray-50 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-kv-navy truncate">{product.title}</p>
                                <p className="text-[10px] text-gray-400">
                                  {product.brand && <span className="mr-2">{product.brand}</span>}
                                  {product.category && <span>{product.category}</span>}
                                </p>
                              </div>
                              <span className="text-sm font-black text-kv-orange shrink-0">
                                ฿{fp(product.price || 0)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-11 gap-1.5 items-center">
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase text-center mb-0.5">จำนวน</p>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                          className="w-full px-1 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange text-center"
                        />
                      </div>
                      <div className="col-span-1 text-center text-gray-300 font-black text-sm mt-4">×</div>
                      <div className="col-span-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">ราคา/หน่วย (บาท)</p>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange text-right"
                        />
                      </div>
                      <div className="col-span-1 text-center text-gray-300 font-black text-sm mt-4">=</div>
                      <div className="col-span-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">รวม (บาท)</p>
                        <div className="px-2 py-1.5 bg-kv-navy/5 rounded-lg text-sm font-black text-kv-navy text-right">
                          {fp(item.qty * item.unitPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 mt-3 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ยอดรวมก่อน VAT</span>
                  <span className="font-bold text-gray-700">{fp(subtotal)} บาท</span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={vatEnabled}
                      onChange={e => setVatEnabled(e.target.checked)}
                      className="w-4 h-4 accent-kv-orange"
                    />
                    รวม VAT {vatRate}%
                  </label>
                  <span className="text-sm font-bold text-gray-500">{vatEnabled ? `+${fp(vatAmount)} บาท` : '—'}</span>
                </div>
                <div className="flex justify-between font-black text-base text-kv-navy border-t border-gray-200 pt-2">
                  <span>ยอดรวมทั้งสิ้น</span>
                  <span className="text-kv-orange">{fp(total)} บาท</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">หมายเหตุ & เงื่อนไข</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">หมายเหตุ</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">เงื่อนไขการชำระเงิน</label>
                  <textarea
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className={showPreview ? 'block' : 'hidden xl:block'}>
            <div className="sticky top-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">ตัวอย่างใบแจ้งหนี้ (A4)</p>
                {loadingSettings && <RefreshCw size={13} className="animate-spin text-gray-400" />}
              </div>
              <div className="rounded-2xl shadow-lg border border-gray-200 bg-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '794px' }}>
                  <InvoiceDoc {...docProps} />
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
            {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(f => (
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
                    ({history.filter(q => q.status === f).length})
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
              ไม่มีประวัติใบแจ้งหนี้
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80">
                    <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-black">เลขที่</th>
                      <th className="p-4 font-black">ลูกค้า</th>
                      <th className="p-4 font-black text-right">ยอดรวม</th>
                      <th className="p-4 font-black">ครบกำหนด</th>
                      <th className="p-4 font-black">สถานะ</th>
                      <th className="p-4 font-black">วันที่</th>
                      <th className="p-4 font-black text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {filteredHistory.map(inv => {
                      const sc = STATUS_CONFIG[inv.status];
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-black text-kv-navy text-xs">{inv.invoice_number}</td>
                          <td className="p-4">
                            <div className="font-bold text-kv-navy text-sm">{inv.customer_name || '—'}</div>
                            {inv.customer_company && (
                              <div className="text-[10px] text-gray-400">{inv.customer_company}</div>
                            )}
                          </td>
                          <td className="p-4 text-right font-black text-kv-orange">฿{fp(inv.total)}</td>
                          <td className="p-4 text-xs text-red-500 font-medium">
                            {inv.due_date ? fdateShort(inv.due_date) : '—'}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => cycleStatus(inv)}
                              title="คลิกเพื่อเปลี่ยนสถานะ"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.color} hover:opacity-80 transition-opacity flex items-center gap-1`}
                            >
                              {sc.label}
                              <RotateCcw size={9} />
                            </button>
                          </td>
                          <td className="p-4 text-xs text-gray-400 font-medium">{fdateShort(inv.created_at)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => loadInvoice(inv)}
                                className="px-3 py-1.5 bg-kv-navy/10 text-kv-navy rounded-lg text-xs font-bold hover:bg-kv-navy/20 transition-colors"
                              >
                                โหลด
                              </button>
                              <button
                                onClick={() => deleteInvoice(inv.id)}
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
                {filteredHistory.map(inv => {
                  const sc = STATUS_CONFIG[inv.status];
                  return (
                    <div key={inv.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-kv-navy text-sm">{inv.invoice_number}</div>
                          <div className="text-xs font-bold text-gray-600 mt-0.5">{inv.customer_name || '—'}</div>
                          {inv.customer_company && (
                            <div className="text-[10px] text-gray-400">{inv.customer_company}</div>
                          )}
                        </div>
                        <button
                          onClick={() => cycleStatus(inv)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.color} shrink-0 flex items-center gap-1`}
                        >
                          {sc.label} <RotateCcw size={8} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-kv-orange">฿{fp(inv.total)}</span>
                        <span className="text-[10px] text-gray-400">{fdateShort(inv.created_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadInvoice(inv)}
                          className="flex-1 py-2 bg-kv-navy/10 text-kv-navy rounded-xl text-xs font-bold"
                        >
                          โหลด
                        </button>
                        <button
                          onClick={() => deleteInvoice(inv.id)}
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
