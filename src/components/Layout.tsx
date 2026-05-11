import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MessageCircle, LayoutDashboard, ExternalLink } from 'lucide-react';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { BottomNav } from './BottomNav';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { ChatAgent } from './ChatAgent';
import { Link } from 'react-router-dom';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();
  const { role } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-x-hidden ${isAuthPage ? '' : 'pb-16 lg:pb-0'}`}>
      {isAdmin && !isAuthPage && (
        <div className="bg-kv-navy text-white py-1.5 px-4 flex items-center justify-center gap-4 text-[10px] lg:text-xs font-bold border-b border-white/10 relative z-[100]">
          <div className="flex items-center gap-1.5 text-kv-orange">
            <LayoutDashboard size={14} />
            <span>คุณกำลังใช้งานในโหมดผู้ดูแลระบบ</span>
          </div>
          <Link to="/admin" className="flex items-center gap-1 hover:underline hover:text-kv-orange transition-colors">
            เข้าสู่หน้าจัดการหลังบ้าน <ExternalLink size={12} />
          </Link>
        </div>
      )}
      <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      
      <MobileMenuDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      <main className="flex-grow">
        <Outlet />
      </main>
      
      {!isAuthPage && (
        <>
          <Footer />
          
          <BottomNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
          
          <ChatAgent />
        </>
      )}
    </div>
  );
}
