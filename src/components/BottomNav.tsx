import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Grid, Search, ChevronUp, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BottomNavProps {
  onOpenMobileMenu: () => void;
}

export function BottomNav({ onOpenMobileMenu }: BottomNavProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-kv-border z-[50] md:hidden flex items-center justify-around py-2 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link to="/account" className="flex flex-col items-center text-gray-500 hover:text-kv-orange transition-colors">
          <User size={22} />
          <span className="text-[10px] mt-1 font-medium">บัญชี</span>
        </Link>
        
        <button 
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center text-gray-500 hover:text-kv-orange transition-colors"
        >
          <Grid size={22} />
          <span className="text-[10px] mt-1 font-medium">หมวดหมู่</span>
        </button>

        <button 
          onClick={() => setIsFilterOpen(true)}
          className="flex flex-col items-center text-gray-500 hover:text-kv-orange transition-colors"
        >
          <Filter size={22} />
          <span className="text-[10px] mt-1 font-medium">ค้นหาปริ้นเตอร์</span>
        </button>

        <button 
          onClick={() => navigate('/shop')}
          className="flex flex-col items-center text-gray-500 hover:text-kv-orange transition-colors"
        >
          <Search size={22} />
          <span className="text-[10px] mt-1 font-medium">ค้นหา</span>
        </button>

        <button 
          onClick={scrollToTop}
          className="flex flex-col items-center text-gray-500 hover:text-kv-orange transition-colors"
        >
          <ChevronUp size={22} />
          <span className="text-[10px] mt-1 font-medium">ขึ้นบน</span>
        </button>
      </nav>

      {/* Printer Filter Slide-up Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/50 z-[80] md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[90] md:hidden rounded-t-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-kv-navy">ค้นหาปริ้นเตอร์</h3>
                <button onClick={() => setIsFilterOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เลือกแบรนด์ (Make)</label>
                  <select className="w-full p-3 border border-kv-border rounded-md outline-none text-gray-700 bg-gray-50">
                    <option>ทั้งหมด</option>
                    <option>HP</option>
                    <option>Canon</option>
                    <option>Epson</option>
                    <option>Brother</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เลือกประเภท (Type)</label>
                  <select className="w-full p-3 border border-kv-border rounded-md outline-none text-gray-700 bg-gray-50">
                    <option>ทั้งหมด</option>
                    <option>LaserJet</option>
                    <option>InkJet</option>
                    <option>Dot Matrix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เลือกรุ่น (Model)</label>
                  <select className="w-full p-3 border border-kv-border rounded-md outline-none text-gray-700 bg-gray-50">
                    <option>ทั้งหมด</option>
                    <option>Pro M15w</option>
                    <option>G2010</option>
                    <option>L3150</option>
                  </select>
                </div>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full bg-kv-orange text-white font-bold py-3 rounded-md mt-4 hover:bg-kv-orange/90 transition-colors shadow-lg"
                >
                  ค้นหาสินค้า
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
