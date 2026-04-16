import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="bg-kv-navy text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand & Contact */}
          <div className="lg:col-span-2">
            <Link to="/" className="text-3xl font-bold text-white mb-6 block">
              {settings.store_name.split(' ')[0]}<span className="text-kv-orange">{settings.store_name.split(' ')[1] || ''}</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-sm">
              จำหน่ายปริ้นเตอร์มือสอง หมึกพิมพ์ และอะไหล่ปริ้นเตอร์คุณภาพสูง พร้อมบริการหลังการขายที่ยอดเยี่ยม
            </p>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <MapPin size={20} className="text-kv-orange shrink-0 mt-1" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={20} className="text-kv-orange shrink-0" />
                <span>095-585-1136</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail size={20} className="text-kv-orange shrink-0" />
                <span>{settings.contact_email}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">หมวดหมู่สินค้า</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link to="/category/used-printers" className="hover:text-kv-orange transition-colors">ปริ้นเตอร์มือสอง</Link></li>
              <li><Link to="/category/ink" className="hover:text-kv-orange transition-colors">หมึกพิมพ์</Link></li>
              <li><Link to="/category/parts" className="hover:text-kv-orange transition-colors">อะไหล่ปริ้นเตอร์</Link></li>
              <li><Link to="/brands" className="hover:text-kv-orange transition-colors">แบรนด์ทั้งหมด</Link></li>
              <li><Link to="/promotions" className="hover:text-kv-orange transition-colors">โปรโมชั่น</Link></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">บริการลูกค้า</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link to="/contact" className="hover:text-kv-orange transition-colors">ติดต่อเรา</Link></li>
              <li><Link to="/faq" className="hover:text-kv-orange transition-colors">คำถามที่พบบ่อย</Link></li>
              <li><Link to="/shipping" className="hover:text-kv-orange transition-colors">การจัดส่งสินค้า</Link></li>
              <li><Link to="/returns" className="hover:text-kv-orange transition-colors">นโยบายการคืนสินค้า</Link></li>
              <li><Link to="/warranty" className="hover:text-kv-orange transition-colors">การรับประกัน</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">บัญชีของฉัน</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link to="/account" className="hover:text-kv-orange transition-colors">เข้าสู่ระบบ / สมัครสมาชิก</Link></li>
              <li><Link to="/account" className="hover:text-kv-orange transition-colors">ประวัติการสั่งซื้อ</Link></li>
              <li><Link to="/track-order" className="hover:text-kv-orange transition-colors">ติดตามสถานะออเดอร์</Link></li>
              <li><Link to="/wishlist" className="hover:text-kv-orange transition-colors">รายการโปรด</Link></li>
              <li><Link to="/cart" className="hover:text-kv-orange transition-colors">ตะกร้าสินค้า</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} KingVision. All rights reserved.
          </p>
          
          {/* Social Media */}
          <div className="flex space-x-4 mb-4 md:mb-0">
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kv-orange transition-colors">
              <Facebook size={18} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kv-orange transition-colors">
              <Twitter size={18} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kv-orange transition-colors">
              <Instagram size={18} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-kv-orange transition-colors">
              <Youtube size={18} />
            </a>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="bg-white px-2 py-1 rounded text-xs font-bold text-[#1434CB] border border-gray-200 shadow-sm">VISA</div>
            <div className="bg-white px-2 py-1 rounded text-xs font-bold text-[#EB001B] border border-gray-200 shadow-sm">MasterCard</div>
            <div className="bg-[#113566] px-2 py-1 rounded text-xs font-bold text-white border border-[#113566] shadow-sm flex items-center">
              <span className="text-[#00B2E3] mr-1">Prompt</span>Pay
            </div>
            <div className="bg-white px-2 py-1 rounded text-xs font-bold text-green-600 border border-gray-200 shadow-sm">COD</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
