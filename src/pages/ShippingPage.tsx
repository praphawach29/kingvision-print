import { Truck, Clock, MapPin, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-kv-navy text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <Truck size={28} className="text-kv-orange" />
            <h1 className="text-3xl font-black">การจัดส่งสินค้า</h1>
          </div>
          <p className="text-white/60">ข้อมูลการจัดส่ง ระยะเวลา และค่าบริการ</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">

        {/* Free shipping zones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <h2 className="font-black text-green-800">ส่งฟรี — กรุงเทพฯ & ปริมณฑล</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-600 mb-4">ไม่มีขั้นต่ำ ส่งฟรีทุกคำสั่งซื้อสำหรับพื้นที่ดังนี้</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร', 'นครปฐม'].map((p) => (
                <div key={p} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 text-sm font-medium text-green-800">
                  <MapPin size={13} className="text-green-600 flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shipping rates table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={20} className="text-kv-orange" />
            <h2 className="font-black text-kv-navy">ค่าจัดส่งต่างจังหวัด</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">ประเภทสินค้า</th>
                  <th className="text-left px-6 py-3 font-semibold">น้ำหนัก</th>
                  <th className="text-left px-6 py-3 font-semibold">ค่าส่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { type: 'หมึก / อะไหล่ขนาดเล็ก', weight: 'ไม่เกิน 2 กก.', price: '50–80 บาท' },
                  { type: 'เครื่องปริ้นเตอร์ขนาดเล็ก', weight: '2–5 กก.', price: '100–150 บาท' },
                  { type: 'เครื่องปริ้นเตอร์ขนาดกลาง', weight: '5–15 กก.', price: '200–350 บาท' },
                  { type: 'เครื่องปริ้นเตอร์ขนาดใหญ่', weight: '15 กก. ขึ้นไป', price: 'คำนวณตามจริง' },
                ].map((row) => (
                  <tr key={row.type} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900 font-medium">{row.type}</td>
                    <td className="px-6 py-3 text-gray-500">{row.weight}</td>
                    <td className="px-6 py-3 font-bold text-kv-navy">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
            * ค่าส่งอาจเปลี่ยนแปลงตามราคาของบริษัทขนส่ง ราคาสุดท้ายแสดงในขั้นตอน Checkout
          </p>
        </div>

        {/* Delivery time */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={20} className="text-kv-orange" />
            <h2 className="font-black text-kv-navy">ระยะเวลาจัดส่ง</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {[
              {
                title: 'กรุงเทพฯ & ปริมณฑล',
                time: '1–2 วันทำการ',
                note: 'สั่งก่อน 12:00 น. จัดส่งวันเดียวกัน',
                color: 'bg-blue-50 border-blue-200 text-blue-800',
              },
              {
                title: 'ต่างจังหวัด (ภาคกลาง)',
                time: '2–3 วันทำการ',
                note: 'ผ่าน Kerry Express / Flash Express',
                color: 'bg-orange-50 border-orange-200 text-orange-800',
              },
              {
                title: 'ต่างจังหวัด (ภาคเหนือ/ใต้/อีสาน)',
                time: '3–5 วันทำการ',
                note: 'ผ่าน Kerry Express / Flash Express',
                color: 'bg-purple-50 border-purple-200 text-purple-800',
              },
            ].map((item) => (
              <div key={item.title} className={`rounded-xl border px-5 py-4 ${item.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{item.title}</span>
                  <span className="font-black text-lg">{item.time}</span>
                </div>
                <p className="text-sm opacity-70">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-bold">ข้อมูลเพิ่มเติม</p>
            <ul className="space-y-1 list-disc list-inside text-amber-700">
              <li>วันหยุดราชการและวันหยุดนักขัตฤกษ์ไม่นับเป็นวันทำการ</li>
              <li>สินค้าขนาดใหญ่มากอาจต้องนัดส่งพิเศษ ทีมงานจะติดต่อกลับ</li>
              <li>สามารถนัดรับสินค้าที่ร้านได้โดยไม่มีค่าใช้จ่าย</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">มีคำถามเพิ่มเติมเกี่ยวกับการจัดส่ง?</p>
          <Link
            to="/contact"
            className="inline-block bg-kv-navy hover:bg-blue-900 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            ติดต่อเรา
          </Link>
        </div>
      </div>
    </div>
  );
}
