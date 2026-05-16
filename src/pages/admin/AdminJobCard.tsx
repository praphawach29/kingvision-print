import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Download, Eye, EyeOff, Loader2,
  RefreshCw, Search, X, Save, User, ChevronDown,
  FileText, CheckCircle, Clock, RotateCcw, Wrench, Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  description: string;
  type: 'parts' | 'labor';
  price: number;
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

interface JobCardRecord {
  id: string;
  jc_number: string;
  customer_name: string;
  customer_company: string;
  customer_phone: string;
  customer_email: string;
  equipment_brand: string;
  equipment_model: string;
  equipment_serial: string;
  symptoms: string;
  technician: string;
  diagnosis: string;
  service_items: ServiceItem[];
  estimated_cost: number;
  actual_cost: number;
  warranty_days: number;
  notes: string;
  received_date: string | null;
  status: 'received' | 'diagnosing' | 'repairing' | 'done' | 'delivered';
  created_at: string;
}

interface DocProps {
  storeSettings: StoreSettings;
  customer: CustomerInfo;
  jcNumber: string;
  jcDate: string;
  receivedDate: string;
  technician: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerial: string;
  symptoms: string;
  diagnosis: string;
  serviceItems: ServiceItem[];
  estimatedCost: number;
  actualCost: number;
  warrantyDays: number;
  notes: string;
  signatureDataUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateJCNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `JC${yy}${mm}${dd}-${rand}`;
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

const STATUS_ORDER: JobCardRecord['status'][] = ['received', 'diagnosing', 'repairing', 'done', 'delivered'];

const STATUS_CONFIG: Record<JobCardRecord['status'], { label: string; color: string; bg: string }> = {
  received:   { label: 'รับงานแล้ว',    color: 'text-gray-600',   bg: 'bg-gray-100' },
  diagnosing: { label: 'วินิจฉัย',       color: 'text-yellow-700', bg: 'bg-yellow-100' },
  repairing:  { label: 'กำลังซ่อม',     color: 'text-blue-600',   bg: 'bg-blue-100' },
  done:       { label: 'ซ่อมเสร็จ',     color: 'text-green-700',  bg: 'bg-green-100' },
  delivered:  { label: 'ส่งมอบแล้ว',    color: 'text-purple-700', bg: 'bg-purple-100' },
};

// ─── JobCardDoc (forwardRef — DEFINED OUTSIDE main component) ─────────────────

const JobCardDoc = React.forwardRef<HTMLDivElement, DocProps>(
  ({ storeSettings, customer, jcNumber, jcDate, receivedDate, technician,
     equipmentBrand, equipmentModel, equipmentSerial, symptoms, diagnosis,
     serviceItems, estimatedCost, actualCost, warrantyDays, notes, signatureDataUrl }, ref) => {
    const totalServiceCost = serviceItems.reduce((sum, it) => sum + it.price, 0);
    return (
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
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#f7941d', lineHeight: '1.2' }}>ใบแจ้งซ่อม</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', marginTop: '2px' }}>Job Card</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2b4a', marginTop: '6px' }}>{jcNumber}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>วันที่รับเครื่อง: {receivedDate ? fdate(receivedDate) : jcDate}</div>
            {technician && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>ช่าง: {technician}</div>
            )}
          </div>
        </div>

        {/* Customer + Equipment Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Customer */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>ข้อมูลลูกค้า</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2b4a' }}>{customer.name || 'ชื่อลูกค้า'}</div>
            {customer.company && <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '3px' }}>{customer.company}</div>}
            {customer.phone && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px' }}>โทร: {customer.phone}</div>}
            {customer.email && <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '3px' }}>อีเมล: {customer.email}</div>}
          </div>
          {/* Equipment */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>ข้อมูลอุปกรณ์</div>
            {equipmentBrand && <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}><span style={{ fontWeight: 700, color: '#1a2b4a' }}>ยี่ห้อ: </span>{equipmentBrand}</div>}
            {equipmentModel && <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}><span style={{ fontWeight: 700, color: '#1a2b4a' }}>รุ่น: </span>{equipmentModel}</div>}
            {equipmentSerial && <div style={{ fontSize: '13px', color: '#4b5563' }}><span style={{ fontWeight: 700, color: '#1a2b4a' }}>Serial: </span><span style={{ fontFamily: 'monospace' }}>{equipmentSerial}</span></div>}
            {!equipmentBrand && !equipmentModel && !equipmentSerial && (
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>—</div>
            )}
          </div>
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: '16px', padding: '14px 18px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>อาการเสีย (Symptoms)</div>
          <div style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '24px' }}>{symptoms || '—'}</div>
        </div>

        {/* Diagnosis */}
        <div style={{ marginBottom: '24px', padding: '14px 18px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>การวินิจฉัย (Diagnosis)</div>
          <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '24px' }}>{diagnosis || '—'}</div>
        </div>

        {/* Service Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#1a2b4a', color: '#fff' }}>
              <th style={{ padding: '11px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '48px', borderRadius: '8px 0 0 0' }}>ลำดับ</th>
              <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700 }}>รายการบริการ</th>
              <th style={{ padding: '11px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, width: '100px' }}>ประเภท</th>
              <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: '12px', fontWeight: 700, width: '130px', borderRadius: '0 8px 0 0' }}>ราคา (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {serviceItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>—</td>
              </tr>
            ) : serviceItems.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{item.description || '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: item.type === 'parts' ? '#dbeafe' : '#dcfce7',
                    color: item.type === 'parts' ? '#1d4ed8' : '#15803d',
                  }}>
                    {item.type === 'parts' ? 'อะไหล่' : 'ค่าแรง'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#1a2b4a' }}>{fp(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Cost Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
              <span>รวมค่าบริการ</span>
              <span style={{ fontWeight: 600 }}>{fp(totalServiceCost)} บาท</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
              <span>ประมาณการ</span>
              <span style={{ fontWeight: 600 }}>{fp(estimatedCost)} บาท</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#1a2b4a', borderRadius: '10px', marginTop: '8px', color: '#fff' }}>
              <span style={{ fontWeight: 900, fontSize: '14px' }}>ราคาจริง</span>
              <span style={{ fontWeight: 900, fontSize: '18px', color: '#f7941d' }}>{fp(actualCost)} บาท</span>
            </div>
          </div>
        </div>

        {/* Warranty */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', fontWeight: 900, color: '#16a34a' }}>การรับประกัน:</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>{warrantyDays} วัน</span>
        </div>

        {/* Notes */}
        {notes && (
          <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>หมายเหตุ</div>
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '8px' }}>
          {/* ช่างเทคนิค */}
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
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลายเซ็นช่างเทคนิค</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{technician || storeSettings.store_name || 'KingVision Print'}</div>
            </div>
          </div>
          {/* ลูกค้ารับทราบ */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '56px' }} />
            <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '10px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>ลูกค้ารับทราบ</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>วันที่: ____________</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            เอกสารนี้ออกโดย {storeSettings.store_name || 'KingVision Print'} | ใบแจ้งซ่อมเลขที่ {jcNumber}
          </div>
        </div>
      </div>
    );
  }
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

export function AdminJobCard() {
  const captureRef = useRef<HTMLDivElement>(null);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── JC form state ──
  const [jcNumber, setJcNumber] = useState(generateJCNumber);
  const [jcDate] = useState(
    new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  );
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('');
  const [warrantyDays, setWarrantyDays] = useState(30);

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', company: '', phone: '', email: '',
  });

  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [equipmentSerial, setEquipmentSerial] = useState('');

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
    { id: '1', description: '', type: 'labor', price: 0 },
  ]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [actualCost, setActualCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [savedJCId, setSavedJCId] = useState<string | null>(null);

  // ── Customer search ──
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerRecord[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // ── History ──
  const [history, setHistory] = useState<JobCardRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | JobCardRecord['status']>('all');

  const docProps: DocProps = {
    storeSettings, customer, jcNumber, jcDate, receivedDate, technician,
    equipmentBrand, equipmentModel, equipmentSerial,
    symptoms, diagnosis, serviceItems, estimatedCost, actualCost, warrantyDays, notes,
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
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setCustomerSearchOpen(false);
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
      }
    }
    if (customerSearchOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [customerSearchOpen]);

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
        .from('job_cards')
        .select('*')
        .order('created_at', { ascending: false });
      setHistory((data as JobCardRecord[]) || []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }

  function pickCustomer(c: CustomerRecord) {
    setCustomer({ name: c.name, company: c.company, phone: c.phone, email: c.email });
    setCustomerSearchOpen(false);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
  }

  function addServiceItem() {
    setServiceItems(prev => [...prev, { id: Date.now().toString(), description: '', type: 'labor', price: 0 }]);
  }
  function removeServiceItem(id: string) {
    setServiceItems(prev => prev.filter(item => item.id !== id));
  }
  function updateServiceItem(id: string, field: keyof ServiceItem, value: string | number) {
    setServiceItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function buildPayload(status: JobCardRecord['status'] = 'received') {
    return {
      jc_number: jcNumber,
      customer_name: customer.name,
      customer_company: customer.company,
      customer_phone: customer.phone,
      customer_email: customer.email,
      equipment_brand: equipmentBrand,
      equipment_model: equipmentModel,
      equipment_serial: equipmentSerial,
      symptoms,
      technician,
      diagnosis,
      service_items: serviceItems as unknown as ServiceItem[],
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      warranty_days: warrantyDays,
      notes,
      received_date: receivedDate || null,
      status,
    };
  }

  async function handleSave(status: JobCardRecord['status'] = 'received') {
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (savedJCId) {
        const { error } = await supabase.from('job_cards').update(payload).eq('id', savedJCId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('job_cards').insert(payload).select('id').single();
        if (error) throw error;
        if (data) setSavedJCId(data.id);
      }
      setToast('บันทึกใบแจ้งซ่อมแล้ว');
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
      pdf.save(`${jcNumber}.pdf`);
      await handleSave('repairing');
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  }

  function loadJC(rec: JobCardRecord) {
    setJcNumber(rec.jc_number);
    setReceivedDate(rec.received_date || '');
    setTechnician(rec.technician || '');
    setWarrantyDays(rec.warranty_days);
    setCustomer({
      name: rec.customer_name,
      company: rec.customer_company,
      phone: rec.customer_phone,
      email: rec.customer_email,
    });
    setEquipmentBrand(rec.equipment_brand || '');
    setEquipmentModel(rec.equipment_model || '');
    setEquipmentSerial(rec.equipment_serial || '');
    setSymptoms(rec.symptoms || '');
    setDiagnosis(rec.diagnosis || '');
    const loadedItems: ServiceItem[] = Array.isArray(rec.service_items)
      ? rec.service_items.map((it: ServiceItem) => ({
          id: it.id || Date.now().toString() + Math.random(),
          description: it.description || '',
          type: (it.type === 'parts' || it.type === 'labor') ? it.type : 'labor',
          price: Number(it.price) || 0,
        }))
      : [{ id: '1', description: '', type: 'labor', price: 0 }];
    setServiceItems(loadedItems);
    setEstimatedCost(rec.estimated_cost || 0);
    setActualCost(rec.actual_cost || 0);
    setNotes(rec.notes || '');
    setSavedJCId(rec.id);
    setActiveTab('create');
  }

  async function deleteJC(id: string) {
    if (!confirm('ลบใบแจ้งซ่อมนี้ใช่หรือไม่?')) return;
    await supabase.from('job_cards').delete().eq('id', id);
    setHistory(prev => prev.filter(r => r.id !== id));
  }

  async function cycleStatus(rec: JobCardRecord) {
    const currentIdx = STATUS_ORDER.indexOf(rec.status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    const { error } = await supabase.from('job_cards').update({ status: nextStatus }).eq('id', rec.id);
    if (!error) {
      setHistory(prev => prev.map(r => r.id === rec.id ? { ...r, status: nextStatus } : r));
    }
  }

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(r => r.status === historyFilter);

  const totalServiceCost = serviceItems.reduce((sum, it) => sum + it.price, 0);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Hidden capture target */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <JobCardDoc ref={captureRef} {...docProps} />
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-black text-kv-navy">ใบแจ้งซ่อม</h1>
          <p className="text-sm text-gray-500 mt-0.5">สร้างและจัดการใบแจ้งซ่อม Job Card</p>
        </div>
        {activeTab === 'create' && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleSave('received')}
              disabled={saving}
              title="บันทึก"
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden sm:inline">บันทึก</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'ซ่อน Preview' : 'ดู Preview'}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{showPreview ? 'ซ่อน' : 'ดู'} Preview</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              title="Export PDF"
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden sm:inline">Export PDF</span>
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
          สร้างใบแจ้งซ่อม
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history' ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={15} />
          ประวัติใบแจ้งซ่อม
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
            {/* JC Meta */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">ข้อมูลใบแจ้งซ่อม</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">เลขที่</label>
                  <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-black text-kv-navy border border-gray-100">{jcNumber}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">วันที่รับเครื่อง</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ช่างเทคนิค</label>
                  <input
                    type="text"
                    value={technician}
                    onChange={e => setTechnician(e.target.value)}
                    placeholder="ชื่อช่าง"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">รับประกัน (วัน)</label>
                  <input
                    type="number"
                    min="0"
                    value={warrantyDays}
                    onChange={e => setWarrantyDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">ข้อมูลลูกค้า</h2>

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
                  { key: 'phone', label: 'เบอร์โทร', placeholder: '08x-xxx-xxxx', type: 'text' },
                  { key: 'email', label: 'อีเมล', placeholder: 'email@example.com', type: 'email' },
                ] as const).map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{field.label}</label>
                    <input
                      type={field.type}
                      value={customer[field.key]}
                      onChange={e => setCustomer(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">ข้อมูลอุปกรณ์</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ยี่ห้อ (Brand)</label>
                  <input
                    type="text"
                    value={equipmentBrand}
                    onChange={e => setEquipmentBrand(e.target.value)}
                    placeholder="เช่น Canon, Epson, HP"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">รุ่น (Model)</label>
                  <input
                    type="text"
                    value={equipmentModel}
                    onChange={e => setEquipmentModel(e.target.value)}
                    placeholder="รุ่นของอุปกรณ์"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Serial No.</label>
                  <input
                    type="text"
                    value={equipmentSerial}
                    onChange={e => setEquipmentSerial(e.target.value)}
                    placeholder="หมายเลข Serial"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Symptoms & Diagnosis */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">อาการเสีย & การวินิจฉัย</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">อาการเสีย (Symptoms)</label>
                  <textarea
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    rows={3}
                    placeholder="อธิบายอาการเสียของอุปกรณ์..."
                    className="w-full px-3 py-2.5 bg-amber-50/50 rounded-xl text-sm border border-amber-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">การวินิจฉัย (Diagnosis)</label>
                  <textarea
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    rows={3}
                    placeholder="ผลการวินิจฉัยของช่างเทคนิค..."
                    className="w-full px-3 py-2.5 bg-blue-50/50 rounded-xl text-sm border border-blue-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Service Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">รายการบริการ</h2>
                <button
                  onClick={addServiceItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-kv-orange/10 text-kv-orange rounded-lg text-xs font-bold hover:bg-kv-orange/20 transition-colors"
                >
                  <Plus size={13} /> เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-2">
                {serviceItems.map((item, idx) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-2 space-y-2">
                    <div className="flex gap-1.5 items-center">
                      <input
                        value={item.description}
                        onChange={e => updateServiceItem(item.id, 'description', e.target.value)}
                        placeholder={`รายการที่ ${idx + 1}`}
                        className="flex-1 px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange"
                      />
                      <button
                        type="button"
                        onClick={() => serviceItems.length > 1 && removeServiceItem(item.id)}
                        disabled={serviceItems.length <= 1}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Type toggle */}
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">ประเภท</p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-100">
                          <button
                            type="button"
                            onClick={() => updateServiceItem(item.id, 'type', 'parts')}
                            className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                              item.type === 'parts'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <Settings size={11} /> อะไหล่
                          </button>
                          <button
                            type="button"
                            onClick={() => updateServiceItem(item.id, 'type', 'labor')}
                            className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                              item.type === 'labor'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <Wrench size={11} /> ค่าแรง
                          </button>
                        </div>
                      </div>
                      {/* Price */}
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">ราคา (บาท)</p>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={e => updateServiceItem(item.id, 'price', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-100 focus:outline-none focus:border-kv-orange text-right"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 mt-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>รวมค่าบริการ</span>
                  <span className="font-bold text-gray-700">{totalServiceCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                </div>
              </div>
            </div>

            {/* Cost & Warranty */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">ค่าใช้จ่ายและการรับประกัน</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ประมาณการ (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ราคาจริง (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={actualCost}
                    onChange={e => setActualCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-kv-orange focus:ring-2 focus:ring-kv-orange/10 text-right"
                  />
                </div>
              </div>
              <div className="mt-3 p-3 bg-green-50 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-green-700">การรับประกัน</span>
                <span className="text-sm font-black text-green-800">{warrantyDays} วัน</span>
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
                <p className="text-xs font-bold text-gray-500">ตัวอย่างใบแจ้งซ่อม (A4)</p>
                {loadingSettings && <RefreshCw size={13} className="animate-spin text-gray-400" />}
              </div>
              <div className="rounded-2xl shadow-lg border border-gray-200 bg-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '794px' }}>
                  <JobCardDoc {...docProps} />
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
            {(['all', 'received', 'diagnosing', 'repairing', 'done', 'delivered'] as const).map(f => (
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
              ไม่มีประวัติใบแจ้งซ่อม
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80">
                    <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-black">เลขที่</th>
                      <th className="p-4 font-black">ลูกค้า</th>
                      <th className="p-4 font-black">อุปกรณ์</th>
                      <th className="p-4 font-black text-right">ราคาจริง</th>
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
                          <td className="p-4 font-black text-kv-navy text-xs">{rec.jc_number}</td>
                          <td className="p-4">
                            <div className="font-bold text-kv-navy text-sm">{rec.customer_name || '—'}</div>
                            {rec.customer_phone && (
                              <div className="text-[10px] text-gray-400">{rec.customer_phone}</div>
                            )}
                          </td>
                          <td className="p-4 text-xs text-gray-500">
                            <div>{rec.equipment_brand} {rec.equipment_model}</div>
                            {rec.equipment_serial && (
                              <div className="font-mono text-[10px] text-gray-400">{rec.equipment_serial}</div>
                            )}
                          </td>
                          <td className="p-4 text-right font-black text-kv-orange">
                            {rec.actual_cost > 0 ? `฿${fp(rec.actual_cost)}` : '—'}
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
                                onClick={() => loadJC(rec)}
                                className="px-3 py-1.5 bg-kv-navy/10 text-kv-navy rounded-lg text-xs font-bold hover:bg-kv-navy/20 transition-colors"
                              >
                                โหลด
                              </button>
                              <button
                                onClick={() => deleteJC(rec.id)}
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
                          <div className="font-black text-kv-navy text-sm">{rec.jc_number}</div>
                          <div className="text-xs font-bold text-gray-600 mt-0.5">{rec.customer_name || '—'}</div>
                          <div className="text-[10px] text-gray-400">{rec.equipment_brand} {rec.equipment_model}</div>
                        </div>
                        <button
                          onClick={() => cycleStatus(rec)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.color} shrink-0 flex items-center gap-1`}
                        >
                          {sc.label} <RotateCcw size={8} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-kv-orange">{rec.actual_cost > 0 ? `฿${fp(rec.actual_cost)}` : '—'}</span>
                        <span className="text-[10px] text-gray-400">{fdateShort(rec.created_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadJC(rec)}
                          className="flex-1 py-2 bg-kv-navy/10 text-kv-navy rounded-xl text-xs font-bold"
                        >
                          โหลด
                        </button>
                        <button
                          onClick={() => deleteJC(rec.id)}
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
