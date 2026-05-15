import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Upload, X, Loader2, Check, Package, ArrowRight, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface PaymentInfo {
  promptpayId?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
}

interface Props {
  orderId: string;
  orderRef: string;
  total: number;
  paymentMethod: string;
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

  const isPromptPay = paymentMethod === 'promptpay' || paymentMethod === 'qr';
  const isBankTransfer = paymentMethod === 'bank_transfer' || paymentMethod === 'transfer';
  const isCOD = paymentMethod === 'cod';
  const needsSlip = isPromptPay || isBankTransfer;

  useEffect(() => {
    if (!isPromptPay || !paymentInfo.promptpayId || !canvasRef.current) return;
    try {
      const payload = generatePayload(paymentInfo.promptpayId, { amount: total });
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 220,
        margin: 2,
        color: { dark: '#0f1d33', light: '#ffffff' },
      }, (err) => { if (!err) setQrGenerated(true); });
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
      const { data: { publicUrl } } = supabase.storage.from('payment-slips').getPublicUrl(path);
      await supabase.from('orders').update({ payment_slip_url: publicUrl, status: 'processing' }).eq('id', orderId);
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
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-y-auto max-h-[95vh] font-thai"
      >
        {/* Success Banner */}
        <div className="relative bg-gradient-to-br from-kv-navy to-[#1a3a6b] px-6 pt-8 pb-10 text-center rounded-t-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-kv-orange/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="relative z-10 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-400/30"
          >
            <CheckCircle2 size={36} className="text-white" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10">
            <h2 className="text-white font-black text-2xl mb-1">ขอบคุณที่ไว้วางใจเรา!</h2>
            <p className="text-gray-300 text-sm">คำสั่งซื้อของคุณได้รับการบันทึกเรียบร้อยแล้ว</p>
          </motion.div>
          {/* Order ref pill */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="relative z-10 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mt-4">
            <Package size={14} className="text-kv-orange" />
            <span className="text-kv-orange font-black text-sm">{orderRef}</span>
            <span className="text-gray-300 text-sm">|</span>
            <span className="text-white font-black text-sm">฿{total.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* Pull-down tab */}
        <div className="flex justify-center -mt-3 mb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Payment instructions label */}
          {!isCOD && (
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">ข้อมูลการชำระเงิน</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
          )}

          {/* COD */}
          {isCOD && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🚚</div>
              <div className="font-black text-kv-navy text-lg">ชำระเงินปลายทาง</div>
              <div className="text-gray-500 text-sm mt-1">เตรียมเงินสด <span className="font-black text-kv-orange">฿{total.toLocaleString()}</span> ไว้รับสินค้าได้เลยครับ</div>
            </div>
          )}

          {/* PromptPay QR */}
          {isPromptPay && (
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-3 border border-gray-100">
              <p className="text-xs font-black text-kv-navy uppercase tracking-wider">สแกน QR พร้อมเพย์</p>
              {paymentInfo.promptpayId ? (
                <>
                  <canvas ref={canvasRef} className={`rounded-xl shadow ${qrGenerated ? '' : 'hidden'}`} />
                  {!qrGenerated && <div className="w-[220px] h-[220px] flex items-center justify-center"><Loader2 className="animate-spin text-kv-orange" size={32} /></div>}
                  <div className="text-center">
                    <div className="text-xs text-gray-400">ยอดชำระ</div>
                    <div className="text-2xl font-black text-kv-orange">฿{total.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                    <span className="text-sm font-black text-kv-navy">{paymentInfo.promptpayId}</span>
                    <button onClick={() => copyAccount(paymentInfo.promptpayId!)} className="ml-2 text-kv-orange hover:text-kv-orange/70 transition-colors">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  {paymentInfo.bankAccountName && <p className="text-xs text-gray-400">ชื่อบัญชี: {paymentInfo.bankAccountName}</p>}
                </>
              ) : (
                <div className="py-6 text-center text-gray-400 text-sm">ยังไม่ได้ตั้งค่า PromptPay ID — กรุณาติดต่อร้านค้าครับ</div>
              )}
            </div>
          )}

          {/* Bank Transfer */}
          {isBankTransfer && paymentInfo.bankAccount && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400 font-bold">{paymentInfo.bankName}</div>
                  <div className="font-black text-kv-navy text-xl tracking-widest">{paymentInfo.bankAccount}</div>
                  <div className="text-sm text-gray-500">{paymentInfo.bankAccountName}</div>
                </div>
                <button onClick={() => copyAccount(paymentInfo.bankAccount!)}
                  className="flex items-center gap-1 bg-kv-orange/10 text-kv-orange px-3 py-2 rounded-xl font-bold text-xs hover:bg-kv-orange/20 transition-all">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-gray-500 text-sm font-bold">ยอดโอน</span>
                <span className="text-2xl font-black text-kv-orange">฿{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Slip Upload */}
          {needsSlip && (
            <div className="space-y-2">
              <div className="font-black text-kv-navy text-xs uppercase tracking-wider">แนบสลิปการชำระเงิน</div>
              {slipUploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <Check className="text-green-600 shrink-0" size={20} />
                  <div>
                    <div className="font-bold text-green-700 text-sm">อัปโหลดสลิปสำเร็จ!</div>
                    <div className="text-xs text-green-600">ทีมงานจะยืนยันและเตรียมจัดส่งให้เร็วที่สุดครับ</div>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" disabled={uploading} />
                  <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${uploading ? 'border-kv-orange bg-kv-orange/5' : 'border-gray-200 hover:border-kv-orange hover:bg-kv-orange/5'}`}>
                    {uploading
                      ? <><Loader2 className="animate-spin text-kv-orange mx-auto mb-1" size={20} /><div className="text-xs font-bold text-kv-orange">กำลังอัปโหลด...</div></>
                      : <><Upload className="text-gray-400 mx-auto mb-1" size={20} /><div className="text-sm font-bold text-gray-500">กดเพื่ออัปโหลดสลิป</div><div className="text-xs text-gray-400">JPG, PNG</div></>
                    }
                  </div>
                </label>
              )}
              {!slipUploaded && (
                <p className="text-xs text-gray-400 text-center">หรือส่งสลิปผ่าน <a href="https://line.me/ti/p/@kingvision" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold">LINE @kingvision</a></p>
              )}
            </div>
          )}

          {/* Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Heart size={16} className="text-kv-orange shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              เราจะแจ้งสถานะออเดอร์ให้คุณทราบทางอีเมล หากมีข้อสงสัยสามารถติดต่อเราผ่าน LINE ได้ตลอด 24 ชั่วโมงครับ
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <button
              onClick={() => { onClose(); navigate('/account?tab=orders'); }}
              className="w-full bg-kv-navy text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-kv-orange transition-all"
            >
              <Package size={18} /> ดูสถานะออเดอร์ <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { onClose(); navigate('/'); }}
              className="w-full bg-gray-50 text-gray-600 py-3.5 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-200 text-sm"
            >
              กลับสู่หน้าหลัก
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
