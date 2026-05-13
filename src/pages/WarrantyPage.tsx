import { ShieldCheck, CheckCircle, XCircle, Wrench, Phone, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const covered = [
  'เครื่องไม่ทำงานหรือทำงานผิดปกติโดยไม่มีสาเหตุจากผู้ใช้',
  'ปัญหาจากชิ้นส่วนภายในที่ชำรุดตามอายุการใช้งาน',
  'ปัญหาการพิมพ์ที่เกิดจากกลไกภายในเครื่อง',
  'ข้อบกพร่องที่มีอยู่ก่อนและไม่ได้แจ้งไว้ในรายละเอียดสินค้า',
];

const notCovered = [
  'ความเสียหายจากอุบัติเหตุ การตก หรือน้ำเข้า',
  'ความเสียหายจากการใช้งานหมึกหรืออะไหล่ผิดประเภท',
  'การซ่อมแซมหรือดัดแปลงโดยบุคคลภายนอก',
  'ความเสียหายจากไฟฟ้าแรงดันเกินหรือฟ้าผ่า',
  'Drum, Roller และชิ้นส่วนสิ้นเปลือง',
  'ความเสียหายจากการขนส่งหลังการส่งมอบ',
];

const periods = [
  { type: 'เครื่องปริ้นเตอร์มือสอง', period: '3 เดือน', color: 'bg-kv-orange', highlight: true },
  { type: 'หมึกพิมพ์', period: '7 วัน', color: 'bg-blue-500', highlight: false },
  { type: 'อะไหล่ปริ้นเตอร์', period: '30 วัน', color: 'bg-green-500', highlight: false },
  { type: 'ดรัม / โรลเลอร์', period: 'ไม่รับประกัน', color: 'bg-gray-400', highlight: false },
];

export function WarrantyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-kv-navy text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck size={28} className="text-kv-orange" />
            <h1 className="text-3xl font-black">การรับประกันสินค้า</h1>
          </div>
          <p className="text-white/60">ทุกเครื่องผ่านการตรวจสอบโดยช่างผู้เชี่ยวชาญ พร้อมรับประกัน 3 เดือน</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">

        {/* Warranty periods */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck size={20} className="text-kv-orange" />
            <h2 className="font-black text-kv-navy">ระยะเวลารับประกัน</h2>
          </div>
          <div className="px-6 py-5 grid sm:grid-cols-2 gap-4">
            {periods.map((p) => (
              <div
                key={p.type}
                className={`rounded-xl p-4 flex items-center justify-between ${p.highlight ? 'bg-kv-navy text-white' : 'bg-gray-50'}`}
              >
                <div>
                  <p className={`text-sm ${p.highlight ? 'text-white/60' : 'text-gray-500'}`}>{p.type}</p>
                  <p className={`text-2xl font-black mt-0.5 ${p.highlight ? 'text-kv-orange' : 'text-kv-navy'}`}>{p.period}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${p.color}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Covered / Not covered */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <h2 className="font-black text-green-800">ครอบคลุมโดยการรับประกัน</h2>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {covered.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              <h2 className="font-black text-red-700">ไม่ครอบคลุม</h2>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {notCovered.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                  <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Claim process */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench size={20} className="text-kv-orange" />
            <h2 className="font-black text-kv-navy">วิธีเคลมประกัน</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {[
              { step: '1', t: 'ถ่ายรูป/วิดีโออาการ', d: 'บันทึกหลักฐานอาการเสีย พร้อมหมายเลขออเดอร์หรือใบเสร็จ' },
              { step: '2', t: 'ติดต่อทีมงาน', d: 'แจ้งปัญหาผ่าน Line OA หรือโทร 095-585-1136 ทีมงานตอบกลับภายใน 2 ชั่วโมง (เวลาทำการ)' },
              { step: '3', t: 'ส่งเครื่องเข้าซ่อม', d: 'นำเครื่องมาที่ร้าน หรือนัดรับ/ส่งโดยร้านออกค่าขนส่งให้ (ในเขต กทม.)' },
              { step: '4', t: 'รับเครื่องคืน', d: 'ซ่อมเสร็จภายใน 3–7 วันทำการ หรือเปลี่ยนเครื่องทดแทนถ้าซ่อมไม่ได้' },
            ].map((item, i, arr) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-kv-orange text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  {i < arr.length - 1 && <div className="w-0.5 h-5 bg-gray-200 mt-1" />}
                </div>
                <div className="pb-1">
                  <p className="font-bold text-kv-navy">{item.t}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <span className="font-bold">หมายเหตุ:</span> การรับประกันเริ่มนับจากวันที่ได้รับสินค้า
            กรุณาเก็บหลักฐานการสั่งซื้อไว้เพื่อการเคลมประกัน
          </p>
        </div>

        {/* CTA */}
        <div className="bg-kv-navy rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div>
            <p className="font-bold text-lg">มีปัญหาต้องการเคลมประกัน?</p>
            <p className="text-white/60 text-sm">ทีมช่างพร้อมให้บริการ จ.–ส. 9:00–18:00 น.</p>
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
