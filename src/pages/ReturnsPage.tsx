import { RotateCcw, CheckCircle, XCircle, AlertCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const accepted = [
  'สินค้าได้รับผิดรุ่น / ผิดสเปค ไม่ตรงกับที่สั่ง',
  'สินค้าชำรุดเสียหายจากการขนส่ง',
  'สินค้ามีความบกพร่องที่ไม่ได้แจ้งไว้ในรายละเอียดสินค้า',
  'เครื่องเปิดไม่ติดหรือใช้งานไม่ได้ตั้งแต่แกะกล่อง',
];

const notAccepted = [
  'สินค้าถูกใช้งานและมีร่องรอยเพิ่มเติมจากที่แจ้งไว้',
  'เปลี่ยนใจหลังรับสินค้าโดยไม่มีเหตุผล',
  'ความเสียหายจากการใช้งานผิดวิธีหรืออุบัติเหตุ',
  'สินค้าที่ผ่านการซ่อมแซมโดยศูนย์บริการอื่น',
  'อุปกรณ์เสริมที่แกะบรรจุภัณฑ์แล้ว (เช่น หมึก)',
];

const steps = [
  { no: '1', title: 'แจ้งปัญหา', desc: 'ติดต่อทีมงานภายใน 7 วัน พร้อมรูป/วิดีโออาการ และหมายเลขออเดอร์' },
  { no: '2', title: 'รอการยืนยัน', desc: 'ทีมงานตรวจสอบและยืนยันสิทธิ์คืนสินค้าภายใน 1 วันทำการ' },
  { no: '3', title: 'ส่งสินค้าคืน', desc: 'จัดส่งสินค้าพร้อมอุปกรณ์ครบชุดกลับมาตามที่อยู่ที่แจ้ง (ร้านออกค่าส่งให้กรณีสินค้าผิดพลาด)' },
  { no: '4', title: 'รับสินค้าใหม่ / เงินคืน', desc: 'ตรวจรับสินค้าแล้วเปลี่ยนเครื่องหรือคืนเงินภายใน 3–5 วันทำการ' },
];

export function ReturnsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-kv-navy text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <RotateCcw size={28} className="text-kv-orange" />
            <h1 className="text-3xl font-black">นโยบายการคืนสินค้า</h1>
          </div>
          <p className="text-white/60">คืนสินค้าได้ภายใน 7 วัน ตามเงื่อนไขด้านล่าง</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">

        {/* Summary banner */}
        <div className="bg-kv-orange/10 border border-kv-orange/30 rounded-2xl px-6 py-5 text-center">
          <p className="text-kv-navy font-black text-xl">คืนสินค้าได้ภายใน <span className="text-kv-orange">7 วัน</span></p>
          <p className="text-gray-600 text-sm mt-1">นับจากวันที่ได้รับสินค้า</p>
        </div>

        {/* Accepted / Not accepted */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <h2 className="font-black text-green-800">รับคืนสินค้า</h2>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {accepted.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              <h2 className="font-black text-red-700">ไม่รับคืนสินค้า</h2>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {notAccepted.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-black text-kv-navy">ขั้นตอนการคืนสินค้า</h2>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-5">
              {steps.map((s, i) => (
                <div key={s.no} className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-kv-orange text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                    {s.no}
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-kv-navy">{s.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
                    {i < steps.length - 1 && <div className="mt-4 border-l-2 border-dashed border-gray-200 h-4 ml-[-28px] pl-7" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold mb-2">เงื่อนไขสำคัญ</p>
            <ul className="space-y-1 list-disc list-inside text-amber-700">
              <li>สินค้าต้องอยู่ในสภาพเดิม ไม่มีความเสียหายเพิ่มเติม</li>
              <li>มีอุปกรณ์และกล่องบรรจุภัณฑ์ครบถ้วน</li>
              <li>แจ้งคืนภายใน 7 วัน พ้นกำหนดจะไม่รับพิจารณา</li>
              <li>กรณีคืนเงิน จะโอนคืนภายใน 3–5 วันทำการ</li>
            </ul>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-kv-navy rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div>
            <p className="font-bold text-lg">ต้องการแจ้งคืนสินค้า?</p>
            <p className="text-white/60 text-sm">ติดต่อทีมงานได้เลย พร้อมให้บริการ</p>
          </div>
          <div className="flex gap-3">
            <a
              href="tel:0955851136"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Phone size={15} /> 095-585-1136
            </a>
            <Link
              to="/contact"
              className="bg-kv-orange hover:bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              ติดต่อออนไลน์
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
