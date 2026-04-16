import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Menu as MenuIcon, ChevronRight, Crown, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'account'>('menu');
  const { user, signOut } = useAuth();
  const { settings } = useSettings();

  const categories = [
    { name: 'ปริ้นเตอร์เลเซอร์', icon: '🖨️', subItems: ['LaserJet ขาวดำ', 'LaserJet สี', 'มัลติฟังก์ชัน (MFP)'] },
    { name: 'ปริ้นเตอร์อิงค์เจ็ท', icon: '🎨', subItems: ['Ink Tank', 'ตลับหมึก (Cartridge)', 'เครื่องพิมพ์พกพา'] },
    { name: 'ดอทเมทริกซ์', icon: '📄', subItems: ['แคร่สั้น', 'แคร่ยาว', 'กระดาษต่อเนื่อง'] },
    { name: 'หมึกแท้ (Original)', icon: '💧', subItems: ['หมึก HP', 'หมึก Canon', 'หมึก Epson', 'หมึก Brother'] },
    { name: 'หมึกเทียบเท่า (Compatible)', icon: '🧪', subItems: ['ตลับหมึกเลเซอร์', 'ขวดเติมอิงค์เจ็ท', 'ตลับผ้าหมึก'] },
    { name: 'อะไหล่ปริ้นเตอร์', icon: '⚙️', subItems: ['หัวพิมพ์ (Printhead)', 'เมนบอร์ด', 'ชุดฟีดกระดาษ', 'สายแพร'] },
    { name: 'ดรัม (Drum Units)', icon: '🔄', subItems: ['ดรัม HP', 'ดรัม Brother', 'ดรัมแท้', 'ดรัมเทียบเท่า'] },
    { name: 'กระดาษพิมพ์', icon: '📑', subItems: ['A4 70 แกรม', 'A4 80 แกรม', 'กระดาษโฟโต้', 'สติ๊กเกอร์'] },
    { name: 'อุปกรณ์เสริม', icon: '🔌', subItems: ['สาย USB', 'สายไฟ', 'อแดปเตอร์'] },
  ];

  const menuItems = [
    { name: 'หน้าแรก', path: '/' },
    { name: 'สินค้ามือสอง', path: '/category/used-printers' },
    { name: 'หมึกพิมพ์', path: '/category/ink' },
    { name: 'อะไหล่', path: '/category/parts' },
    { name: 'แบรนด์', path: '/brands' },
    { name: 'บทความ', path: '/blog' },
    { name: 'ติดต่อเรา', path: '/contact' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[70] md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-kv-navy p-6 text-white">
              <div className="flex items-center mb-6">
                <button onClick={onClose} className="mr-4 p-1 hover:bg-white/10 rounded-full">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold text-xl">
                    {user ? user.email?.charAt(0).toUpperCase() : <User size={24} />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-lg truncate">{user ? user.email : 'สวัสดีลูกค้า'}</h3>
                    <p className="text-xs text-white/70">{user ? 'สมาชิก' : 'เข้าสู่ระบบเพื่อประสบการณ์ที่ดีกว่า'}</p>
                  </div>
                </div>
              </div>
              
              {!user ? (
                <Link
                  to="/auth"
                  onClick={onClose}
                  className="w-full bg-white text-kv-navy font-bold py-2 rounded-md flex items-center justify-center space-x-2 hover:bg-gray-100 transition-colors"
                >
                  <LogIn size={18} />
                  <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    signOut();
                    onClose();
                  }}
                  className="w-full bg-white/10 text-white font-bold py-2 rounded-md flex items-center justify-center space-x-2 hover:bg-white/20 transition-colors"
                >
                  <LogOut size={18} />
                  <span>ออกจากระบบ</span>
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-kv-border">
              {(['menu', 'categories', 'account'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                    activeTab === tab ? 'text-kv-navy' : 'text-gray-400'
                  }`}
                >
                  {tab === 'menu' ? 'เมนู' : tab === 'categories' ? 'หมวดหมู่' : 'บัญชี'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-kv-orange"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'menu' && (
                <ul className="divide-y divide-kv-border">
                  {menuItems.map((item, idx) => (
                    <li key={idx}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium">{item.name}</span>
                        <ChevronRight size={18} className="text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'categories' && (
                <ul className="divide-y divide-kv-border">
                  {categories.map((cat, idx) => (
                    <li key={idx}>
                      <Link
                        to="/shop"
                        onClick={onClose}
                        className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="mr-3 text-xl">{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'account' && (
                <ul className="divide-y divide-kv-border">
                  {user ? (
                    <>
                      <li>
                        <Link to="/account" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className="font-medium">บัญชีของฉัน</span>
                          <ChevronRight size={18} className="text-gray-400" />
                        </Link>
                      </li>
                      <li>
                        <Link to="/account" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className="font-medium">ประวัติการสั่งซื้อ</span>
                          <ChevronRight size={18} className="text-gray-400" />
                        </Link>
                      </li>
                      <li>
                        <Link to="/admin" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-kv-orange">จัดการระบบหลังบ้าน (Admin)</span>
                          <ChevronRight size={18} className="text-gray-400" />
                        </Link>
                      </li>
                    </>
                  ) : (
                    <li>
                      <Link to="/auth" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                        <span className="font-medium">เข้าสู่ระบบ / สมัครสมาชิก</span>
                        <ChevronRight size={18} className="text-gray-400" />
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link to="/wishlist" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="font-medium">รายการโปรด</span>
                      <ChevronRight size={18} className="text-gray-400" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" onClick={onClose} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="font-medium">ศูนย์ช่วยเหลือ</span>
                      <ChevronRight size={18} className="text-gray-400" />
                    </Link>
                  </li>
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-kv-border space-y-4">
              <a 
                href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#00B900] text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-green-100"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-5 h-5" />
                <span>สอบถามทาง LINE</span>
              </a>
              <div className="flex items-center justify-center text-kv-navy font-bold text-xl">
                <Crown className="text-kv-orange mr-2" size={24} />
                King<span className="text-kv-orange">Vision</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
