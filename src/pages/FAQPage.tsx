import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ShieldCheck, Truck, RotateCcw, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  icon: React.ReactNode;
  title: string;
  items: FAQItem[];
}

const sections: FAQSection[] = [
  {
    icon: <ShieldCheck size={20} />,
    title: 'การรับประกันสินค้า',
    items: [
      {
        q: 'สินค้ารับประกันนานแค่ไหน?',
        a: 'เครื่องปริ้นเตอร์มือสองทุกเครื่องรับประกัน 3 เดือน นับจากวันที่ได้รับสินค้า ครอบคลุมความเสียหายจากการใช้งานปกติ ไม่รวมความเสียหายจากอุบัติเหตุหรือการใช้งานผิดวิธี',
      },
      {
        q: 'ถ้าเครื่องมีปัญหาในช่วงรับประกัน ต้องทำอย่างไร?',
        a: 'ติดต่อเราทาง Line OA หรือโทร 095-585-1136 พร้อมแจ้งปัญหาและถ่ายรูป/วิดีโออาการ ทีมช่างจะประเมินและนัดรับเครื่องเพื่อซ่อมฟรีหรือเปลี่ยนเครื่องใหม่ให้',
      },
      {
        q: 'หมึกพิมพ์และอะไหล่รับประกันด้วยไหม?',
        a: 'หมึกพิมพ์รับประกัน 7 วัน (ตรวจพบสินค้าชำรุด/ผิดรุ่น) อะไหล่รับประกัน 30 วัน ในกรณีสินค้าชำรุดจากการผลิต',
      },
    ],
  },
  {
    icon: <Truck size={20} />,
    title: 'การจัดส่ง',
    items: [
      {
        q: 'ส่งฟรีพื้นที่ไหนบ้าง?',
        a: 'ส่งฟรีสำหรับคำสั่งซื้อที่อยู่ในเขตกรุงเทพฯ และปริมณฑล (นนทบุรี, ปทุมธานี, สมุทรปราการ, สมุทรสาคร) โดยไม่มีขั้นต่ำ ต่างจังหวัดคิดตามน้ำหนักและระยะทาง',
      },
      {
        q: 'ต่างจังหวัดส่งได้ไหม? ใช้เวลากี่วัน?',
        a: 'ส่งได้ทั่วประเทศผ่าน Kerry Express และ Flash Express กรุงเทพฯ 1-2 วันทำการ ต่างจังหวัด 2-4 วันทำการ สินค้าขนาดใหญ่อาจใช้บริการขนส่งเฉพาะและนัดเวลาส่งล่วงหน้า',
      },
      {
        q: 'สั่งวันนี้ส่งได้วันเดียวกันไหม?',
        a: 'คำสั่งซื้อที่ชำระเงินก่อน 12:00 น. (วันจันทร์-ศุกร์) จะจัดส่งภายในวันเดียวกัน สำหรับในเขต กทม. บางครั้งสามารถนัดรับสินค้าหรือส่งด่วนได้ในวันเดียวกัน (ติดต่อสอบถามก่อน)',
      },
    ],
  },
  {
    icon: <RotateCcw size={20} />,
    title: 'การคืนสินค้า',
    items: [
      {
        q: 'คืนสินค้าได้ภายในกี่วัน?',
        a: 'สามารถคืนสินค้าได้ภายใน 7 วัน นับจากวันที่ได้รับสินค้า โดยสินค้าต้องอยู่ในสภาพเดิมและมีอุปกรณ์ครบ เหตุผลที่รับคืน: ผิดรุ่น, ชำรุดจากการขนส่ง, ไม่ตรงตามที่ระบุไว้',
      },
      {
        q: 'เปลี่ยนเครื่องได้ไหมถ้าไม่พอใจ?',
        a: 'ถ้าสินค้าไม่ตรงตามที่โฆษณาหรือมีความบกพร่องที่ไม่ได้แจ้งไว้ เราพร้อมเปลี่ยนเครื่องใหม่ให้ทันที แต่หากเป็นการเปลี่ยนใจโดยไม่มีเหตุผล จะต้องรับผิดชอบค่าจัดส่งเอง',
      },
    ],
  },
  {
    icon: <CreditCard size={20} />,
    title: 'การชำระเงิน',
    items: [
      {
        q: 'ชำระเงินได้ช่องทางไหนบ้าง?',
        a: 'รับชำระผ่าน PromptPay, โอนบัญชีธนาคาร (กสิกร, กรุงไทย, ไทยพาณิชย์) และชำระเงินสดเมื่อรับสินค้า (เฉพาะ กทม.)',
      },
      {
        q: 'สั่งซื้อแล้วต้องโอนเงินภายในกี่วัน?',
        a: 'กรุณาชำระเงินภายใน 24 ชั่วโมงหลังสั่งซื้อ หากไม่ชำระภายในเวลาดังกล่าว คำสั่งซื้อจะถูกยกเลิกโดยอัตโนมัติ',
      },
      {
        q: 'ผ่อนชำระได้ไหม?',
        a: 'ปัจจุบันยังไม่มีบริการผ่อนชำระ แต่หากสนใจสินค้าราคาสูง สามารถติดต่อเพื่อตกลงเงื่อนไขพิเศษได้โดยตรง',
      },
    ],
  },
  {
    icon: <HelpCircle size={20} />,
    title: 'คำถามทั่วไป',
    items: [
      {
        q: 'เครื่องปริ้นเตอร์มือสองใช้ได้นานแค่ไหน?',
        a: 'เครื่องทุกเครื่องผ่านการตรวจสอบและซ่อมบำรุงโดยช่างผู้เชี่ยวชาญก่อนขาย คาดอายุการใช้งานต่อเนื่อง 1-3 ปีขึ้นไป ขึ้นอยู่กับการดูแลรักษา',
      },
      {
        q: 'หมึกพิมพ์ต้องใช้รุ่นเดิมหรือใช้รุ่นอื่นแทนได้?',
        a: 'แนะนำใช้หมึกพิมพ์ตามรุ่นที่ระบุในเครื่อง หากต้องการใช้หมึกทดแทน ทีมงานสามารถแนะนำรุ่นที่ใช้งานร่วมกันได้ ติดต่อสอบถามก่อนสั่งซื้อได้เลย',
      },
      {
        q: 'มีบริการซ่อมปริ้นเตอร์ที่ไม่ได้ซื้อจากร้านด้วยไหม?',
        a: 'มีบริการรับซ่อมปริ้นเตอร์ทุกยี่ห้อ ทุกรุ่น สามารถนำเข้ามาซ่อมที่ร้านหรือนัดรับได้ ติดต่อสอบถามราคาประเมินก่อนได้ที่ Line OA หรือโทร 095-585-1136',
      },
    ],
  },
];

export function FAQPage() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-kv-navy text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle size={28} className="text-kv-orange" />
            <h1 className="text-3xl font-black">คำถามที่พบบ่อย</h1>
          </div>
          <p className="text-white/60">คำตอบสำหรับคำถามที่ลูกค้าถามบ่อยที่สุด</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {sections.map((section) => (
          <div key={section.title} className="mb-8">
            <div className="flex items-center gap-2 text-kv-navy font-black text-lg mb-3">
              <span className="text-kv-orange">{section.icon}</span>
              {section.title}
            </div>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = `${section.title}-${i}`;
                const open = !!openMap[key];
                return (
                  <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                      {open
                        ? <ChevronUp size={18} className="text-kv-orange flex-shrink-0" />
                        : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-5 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="mt-10 bg-kv-navy rounded-2xl p-6 text-center text-white">
          <p className="font-bold text-lg mb-1">ยังไม่เจอคำตอบที่ต้องการ?</p>
          <p className="text-white/60 text-sm mb-4">ทีมงานพร้อมตอบทุกคำถาม</p>
          <Link
            to="/contact"
            className="inline-block bg-kv-orange hover:bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            ติดต่อเรา
          </Link>
        </div>
      </div>
    </div>
  );
}
