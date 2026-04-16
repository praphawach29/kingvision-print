import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MessageCircle } from 'lucide-react';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { BottomNav } from './BottomNav';
import { useSettings } from '../context/SettingsContext';
import { ChatAgent } from './ChatAgent';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className={`min-h-screen flex flex-col font-sans overflow-x-hidden ${isAuthPage ? '' : 'pb-16 md:pb-0'}`}>
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
