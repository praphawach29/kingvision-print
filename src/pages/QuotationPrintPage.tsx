import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Loader2, AlertCircle, Crown } from 'lucide-react';

interface LineItem {
  title: string;
  brand?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Quotation {
  quotation_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_company?: string;
  customer_email?: string;
  customer_address?: string;
  items: LineItem[];
  subtotal: number;
  vat_enabled: boolean;
  vat_rate: number;
  vat_amount: number;
  total: number;
  notes?: string;
  quotation_date: string;
  valid_until?: string;
  status: string;
}

interface StoreInfo {
  store_name?: string;
  phone_main?: string;
  address?: string;
  contact_email?: string;
  logo_url?: string;
  signature_url?: string;
}

const fmt = (n: number) =>
  `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuotationPrintPage() {
  const { quotationNumber } = useParams<{ quotationNumber: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [store, setStore] = useState<StoreInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quotationNumber) { setError('ไม่พบเลขใบเสนอราคา'); setLoading(false); return; }
    fetch(`/api/quotation?q=${encodeURIComponent(quotationNumber)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); } else { setQuotation(d.quotation); setStore(d.store || {}); }
      })
      .catch(() => setError('ไม่สามารถโหลดข้อมูลได้'))
      .finally(() => setLoading(false));
  }, [quotationNumber]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-kv-orange" />
    </div>
  );

  if (error || !quotation) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <AlertCircle size={48} className="mx-auto text-red-400" />
        <p className="text-gray-600 font-bold">{error || 'ไม่พบใบเสนอราคา'}</p>
      </div>
    </div>
  );

  const items: LineItem[] = Array.isArray(quotation.items) ? quotation.items : [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Print button — hidden when printing */}
      <div className="max-w-[794px] mx-auto mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-kv-navy text-white px-5 py-2.5 rounded-xl font-bold hover:bg-kv-orange transition-colors shadow"
        >
          <Printer size={18} /> พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* Document */}
      <div
        ref={printRef}
        className="max-w-[794px] mx-auto bg-white shadow-xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden"
        style={{ fontFamily: '"Sarabun", "Prompt", sans-serif' }}
      >
        {/* Header */}
        <div className="bg-kv-navy px-10 py-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt="logo" className="h-14 object-contain" />
            ) : (
              <div className="flex items-center text-white font-black text-2xl">
                <Crown className="text-kv-orange mr-2" size={28} />
                King<span className="text-kv-orange">Vision</span>
              </div>
            )}
            <div className="text-white">
              <div className="font-black text-lg leading-tight">{store.store_name || 'KingVision Print'}</div>
              {store.phone_main && <div className="text-xs text-white/70 mt-0.5">โทร: {store.phone_main}</div>}
              {store.address && <div className="text-xs text-white/70">{store.address}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/60 text-xs font-bold uppercase tracking-widest">ใบเสนอราคา</div>
            <div className="text-kv-orange font-black text-xl mt-1">{quotation.quotation_number}</div>
            <div className="text-white/70 text-xs mt-1">วันที่: {quotation.quotation_date}</div>
            {quotation.valid_until && (
              <div className="text-white/70 text-xs">มีผลถึง: {quotation.valid_until}</div>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/40">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ข้อมูลลูกค้า</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ชื่อ-นามสกุล: </span>
              <span className="font-bold text-kv-navy">{quotation.customer_name}</span>
            </div>
            {quotation.customer_phone && (
              <div>
                <span className="text-gray-500">โทรศัพท์: </span>
                <span className="font-bold">{quotation.customer_phone}</span>
              </div>
            )}
            {quotation.customer_company && (
              <div>
                <span className="text-gray-500">บริษัท/ร้าน: </span>
                <span className="font-bold">{quotation.customer_company}</span>
              </div>
            )}
            {quotation.customer_email && (
              <div>
                <span className="text-gray-500">อีเมล: </span>
                <span className="font-bold">{quotation.customer_email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="px-10 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-kv-navy">
                <th className="text-left py-2 font-bold text-kv-navy w-8">#</th>
                <th className="text-left py-2 font-bold text-kv-navy">รายการสินค้า</th>
                <th className="text-center py-2 font-bold text-kv-navy w-20">จำนวน</th>
                <th className="text-right py-2 font-bold text-kv-navy w-28">ราคา/หน่วย</th>
                <th className="text-right py-2 font-bold text-kv-navy w-28">รวม</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                  <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-3">
                    {item.brand && <div className="text-xs font-bold text-kv-orange mb-0.5">{item.brand}</div>}
                    <div className="font-medium text-kv-navy leading-snug">{item.title}</div>
                  </td>
                  <td className="py-3 text-center font-bold">{item.quantity} ชิ้น</td>
                  <td className="py-3 text-right text-gray-600">{fmt(item.unit_price)}</td>
                  <td className="py-3 text-right font-bold text-kv-navy">{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 border-t pt-3">
                <span>ยอดก่อน VAT</span>
                <span className="font-bold">{fmt(quotation.subtotal)}</span>
              </div>
              {quotation.vat_enabled && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>VAT {quotation.vat_rate}%</span>
                  <span className="font-bold">{fmt(quotation.vat_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-kv-navy border-t-2 border-kv-navy pt-2">
                <span>ยอดรวมทั้งสิ้น</span>
                <span className="text-kv-orange text-lg">{fmt(quotation.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Signature */}
        <div className="px-10 pb-8 grid grid-cols-2 gap-8">
          <div>
            {quotation.notes && (
              <>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">หมายเหตุ</div>
                <p className="text-sm text-gray-600 whitespace-pre-line">{quotation.notes}</p>
              </>
            )}
            <div className="mt-4 text-xs text-gray-400">
              ใบเสนอราคานี้มีผลถึง {quotation.valid_until || '-'} | เลขที่ {quotation.quotation_number}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">ผู้เสนอราคา</div>
            {store.signature_url && (
              <img src={store.signature_url} alt="signature" className="h-16 object-contain mx-auto mb-2" />
            )}
            <div className="border-t border-gray-300 pt-2 text-sm font-bold text-kv-navy">
              {store.store_name || 'KingVision Print'}
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="bg-kv-navy/5 border-t border-gray-100 px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-kv-navy font-black text-sm">
            <Crown className="text-kv-orange" size={16} />
            King<span className="text-kv-orange">Vision</span> Print
          </div>
          {store.phone_main && (
            <div className="text-xs text-gray-500">โทร: {store.phone_main}</div>
          )}
          <div className="text-xs text-gray-400">kingvision-print.vercel.app</div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
