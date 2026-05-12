import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Upload, X, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { supabase } from '../lib/supabase';

interface PaymentInfo {
  promptpayId?: string;      // phone or national ID
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
}

interface Props {
  orderId: string;
  orderRef: string;          // short display ID e.g. "KV-ABC123"
  total: number;
  paymentMethod: string;     // 'promptpay' | 'bank_transfer' | 'cod' | other
  paymentInfo: PaymentInfo;
  onClose: () => void;
}

export function PaymentModal({ orderId, orderRef, total, paymentMethod, paymentInfo, onClose }: Props) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);

  const isPromptPay = paymentMethod === 'promptpay' || paymentMethod === 'qr';
  const isBankTransfer = paymentMethod === 'bank_transfer' || paymentMethod === 'transfer';
  const isCOD = paymentMethod === 'cod';
  const needsSlip = isPromptPay || isBankTransfer;

  // Generate PromptPay QR
  useEffect(() => {
    if (!isPromptPay || !paymentInfo.promptpayId || !canvasRef.current) return;
    try {
      const payload = generatePayload(paymentInfo.promptpayId, { amount: total });
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 240,
        margin: 2,
        color: { dark: '#0f1d33', light: '#ffffff' },
      }, (err) => {
        if (!err) setQrGenerated(true);
      });
    } catch { /* ignore */ }
  }, [isPromptPay, paymentInfo.promptpayId, total]);

  const copyAccount = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `payment-slips/${orderId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(path);

      // Save slip URL to order
      await supabase.from('orders').update({
        payment_slip_url: publicUrl,
        status: 'processing',
      }).eq('id', orderId);

      setSlipUrl(publicUrl);
      setSlipUploaded(true);
    } catch (err) {
      console.error('Slip upload error:', err);
      alert('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่หรือส่งสลิปผ่าน LINE ครับ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-y-auto max-h-[95vh] font-thai">

        {/* Header */}
        <div className="bg-kv-navy p-5 flex justify-between items-center rounded-t-3xl">
          <div>
            <div className="text-white font-black text-lg">สั่งซื้อสำเร็จ!</div>
            <div className="text-kv-orange text-sm font-bold">#{orderRef}</div>
          </div>
          <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center">
            <CheckCircle2 size={28} className="text-white" />
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* COD */}
          {isCOD && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🚚</div>
              <div className="font-black text-kv-navy text-lg">ชำระเงินปลายทาง</div>
              <div className="text-gray-500 text-sm mt-1">กรุณาเตรียมเงินสด <span className="font-black text-kv-orange">฿{total.toLocaleString()}</span> ไว้รับสินค้าครับ</div>
            </div>
          )}

          {/* PromptPay QR */}
          {isPromptPay && (
            <div className="space-y-3">
              <div className="font-black text-kv-navy text-sm uppercase tracking-wider">สแกน QR พร้อมเพย์</div>
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-3 border border-gray-100">
                {paymentInfo.promptpayId ? (
                  <>
                    <canvas ref={canvasRef} className={`rounded-xl ${qrGenerated ? '' : 'hidden'}`} />
                    {!qrGenerated && (
                      <div className="w-[240px] h-[240px] flex items-center justify-center">
                        <Loader2 className="animate-spin text-kv-orange" size={32} />
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-bold">ยอดชำระ</div>
                      <div className="text-2xl font-black text-kv-orange">฿{total.toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-gray-400 text-center">พร้อมเพย์: {paymentInfo.promptpayId}</div>
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-400">
                    <div className="text-3xl mb-2">⚙️</div>
                    <div className="text-sm font-bold">ยังไม่ได้ตั้งค่า PromptPay ID</div>
                    <div className="text-xs mt-1">แอดมินกรุณาเพิ่ม PromptPay ID ในตั้งค่าระบบ</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Transfer */}
          {isBankTransfer && paymentInfo.bankAccount && (
            <div className="space-y-3">
              <div className="font-black text-kv-navy text-sm uppercase tracking-wider">โอนเงินผ่านธนาคาร</div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-400 font-bold">{paymentInfo.bankName}</div>
                    <div className="font-black text-kv-navy text-xl tracking-widest">{paymentInfo.bankAccount}</div>
                    <div className="text-sm text-gray-500">{paymentInfo.bankAccountName}</div>
                  </div>
                  <button
                    onClick={() => copyAccount(paymentInfo.bankAccount!)}
                    className="flex items-center gap-1 bg-kv-orange/10 text-kv-orange px-3 py-2 rounded-xl font-bold text-xs hover:bg-kv-orange/20 transition-all"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-bold">ยอดโอน</span>
                  <span className="text-2xl font-black text-kv-orange">฿{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Slip Upload */}
          {needsSlip && (
            <div className="space-y-2">
              <div className="font-black text-kv-navy text-sm uppercase tracking-wider">แนบสลิปการโอนเงิน</div>
              {slipUploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <Check className="text-green-600" size={24} />
                  <div>
                    <div className="font-bold text-green-700">อัปโหลดสลิปสำเร็จ!</div>
                    <div className="text-xs text-green-600">ทีมงานจะยืนยันการชำระเงินและเตรียมจัดส่งสินค้าครับ</div>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" disabled={uploading} />
                  <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${uploading ? 'border-kv-orange bg-kv-orange/5' : 'border-gray-200 hover:border-kv-orange hover:bg-kv-orange/5'}`}>
                    {uploading ? (
                      <><Loader2 className="animate-spin text-kv-orange mx-auto mb-2" size={24} /><div className="text-sm font-bold text-kv-orange">กำลังอัปโหลด...</div></>
                    ) : (
                      <><Upload className="text-gray-400 mx-auto mb-2" size={24} /><div className="text-sm font-bold text-gray-500">กดเพื่ออัปโหลดสลิป</div><div className="text-xs text-gray-400 mt-1">รองรับ JPG, PNG</div></>
                    )}
                  </div>
                </label>
              )}
              {!slipUploaded && (
                <p className="text-xs text-gray-400 text-center">หรือส่งสลิปผ่าน <a href="https://line.me/ti/p/@kingvision" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold">LINE @kingvision</a></p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button onClick={() => navigate('/account')} className="w-full bg-kv-navy text-white py-4 rounded-2xl font-bold hover:bg-kv-navy/90 transition-all">
              ดูสถานะออเดอร์
            </button>
            <button onClick={() => navigate('/')} className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-200">
              กลับสู่หน้าหลัก
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
