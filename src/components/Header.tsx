import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Phone, MessageCircle, Search, ShoppingCart, User, Menu, ChevronDown, Crown, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { totalItems } = useCart();
  const { settings } = useSettings();
  const { role } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="w-full">
      {/* Top Bar - Hidden on very small screens, simplified on mobile */}
      <div className="bg-kv-navy text-white text-xs lg:text-sm py-2 px-4 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className="flex items-center space-x-1">
            <Phone size={14} />
            <span className="hidden sm:inline">095-585-1136</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageCircle size={14} />
            <a href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} target="_blank" rel="noopener noreferrer" className="hover:text-kv-orange transition-colors hidden sm:inline">LINE: {settings.line_oa_id || "@kingvision"}</a>
          </div>
        </div>
        <div className="flex items-center space-x-3 lg:space-x-4">
          <a href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} target="_blank" rel="noopener noreferrer" className="hover:text-kv-orange transition-colors hidden sm:block">Live Chat (LINE)</a>
          <div className="flex items-center space-x-2 sm:border-l sm:border-white/20 sm:pl-4">
            <button className="hover:text-kv-orange transition-colors">TH</button>
            <span>|</span>
            <button className="hover:text-kv-orange transition-colors">EN</button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white py-3 lg:py-4 px-4 lg:px-8 flex flex-wrap justify-between items-center border-b border-kv-border relative">
        
        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden text-kv-navy hover:text-kv-orange p-1"
          onClick={onOpenMobileMenu}
        >
          <Menu size={28} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center mx-auto lg:mx-0">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.store_name} className="h-10 lg:h-12 w-auto object-contain" />
          ) : (
            <span className="text-2xl lg:text-3xl font-bold text-kv-navy flex items-center">
              <Crown className="text-kv-orange mr-1 lg:mr-2" size={28} />
              King<span className="text-kv-orange">Vision</span>
            </span>
          )}
        </Link>

        {/* Icons - Mobile (Right side) */}
        <div className="flex lg:hidden items-center space-x-4 text-kv-navy">
          <NotificationBell />
          <Link to="/cart" className="flex flex-col items-center hover:text-kv-orange transition-colors relative">
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-kv-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </div>

        {/* Search Bar - Full width on mobile, inline on desktop */}
        <div className="w-full lg:flex-1 lg:max-w-2xl lg:mx-4 mt-3 lg:mt-0 order-last lg:order-none flex">
          <div className="relative flex w-full border-2 border-kv-navy rounded-md overflow-hidden">
            <select className="bg-kv-gray px-2 lg:px-4 py-2 border-r border-kv-border outline-none hidden lg:block text-sm">
              <option>หมวดหมู่ทั้งหมด</option>
              <option>ปริ้นเตอร์มือสอง</option>
              <option>หมึกพิมพ์</option>
              <option>อะไหล่ปริ้นเตอร์</option>
            </select>
            <input 
              type="text" 
              placeholder="ค้นหาสินค้า..." 
              className="flex-1 px-3 lg:px-4 py-2 outline-none text-sm lg:text-base"
            />
            <button className="bg-kv-navy text-white px-4 lg:px-6 py-2 hover:bg-kv-navy/90 transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Icons - Desktop */}
        <div className="hidden lg:flex items-center space-x-6 text-kv-navy">
          <NotificationBell />
          <Link to="/account" className="flex flex-col items-center hover:text-kv-orange transition-colors">
            <User size={24} />
            <span className="text-xs mt-1">บัญชี</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center hover:text-kv-orange transition-colors relative">
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-kv-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
            <span className="text-xs mt-1">ตะกร้า</span>
          </Link>
        </div>
      </div>

      {/* Sticky navbar — slides in after scrolling past top bar */}
      <div
        className={`fixed top-0 inset-x-0 z-[90] bg-kv-navy shadow-lg transition-transform duration-300 ${
          scrolled ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-[1360px] px-4 lg:px-8 flex items-center gap-4 h-14">
          {/* Mobile: hamburger + logo + cart */}
          <button className="lg:hidden text-white p-1" onClick={onOpenMobileMenu}>
            <Menu size={24} />
          </button>
          <Link to="/" className="flex items-center flex-shrink-0">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name} className="h-8 w-auto object-contain brightness-0 invert" />
            ) : (
              <span className="flex items-center gap-1 text-white font-bold text-xl">
                <Crown size={20} className="text-kv-orange" />
                King<span className="text-kv-orange">Vision</span>
              </span>
            )}
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {[
              { label: 'หน้าแรก', to: '/' },
              { label: 'เครื่องปริ้นเตอร์', to: '/shop?category=เครื่องปริ้นเตอร์' },
              { label: 'หมึกพิมพ์', to: '/shop?category=หมึกพิมพ์' },
              { label: 'อะไหล่', to: '/shop?category=อะไหล่' },
              { label: 'แบรนด์', to: '/brands' },
              { label: 'บทความ', to: '/blog' },
              { label: 'ติดต่อเรา', to: '/contact' },
            ].map(({ label, to }) => (
              <Link key={to} to={to} className="text-white/80 hover:text-kv-orange transition-colors text-sm font-medium px-3 py-1">
                {label}
              </Link>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-3 text-white ml-auto">
            <NotificationBell />
            <Link to="/cart" className="relative">
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-kv-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link to="/account" className="hidden lg:block"><User size={22} /></Link>
          </div>
        </div>
      </div>

      {/* Navigation - Desktop Mega Menu */}
      <nav className="hidden lg:block bg-kv-navy text-white px-4 lg:px-8 relative w-full z-40">
        <ul className="flex flex-row flex-wrap items-center space-x-1">
          <li>
            <Link to="/" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              หน้าแรก
            </Link>
          </li>
          <li>
            <Link to="/shop?category=เครื่องปริ้นเตอร์" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              เครื่องปริ้นเตอร์
            </Link>
          </li>
          <li>
            <Link to="/shop?category=หมึกพิมพ์" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              หมึกพิมพ์
            </Link>
          </li>
          <li>
            <Link to="/shop?category=อุปกรณ์เสริม" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              อุปกรณ์เสริม
            </Link>
          </li>
          <li>
            <Link to="/shop?category=อะไหล่" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              อะไหล่
            </Link>
          </li>
          <li>
            <Link to="/brands" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              แบรนด์
            </Link>
          </li>
          <li>
            <Link to="/blog" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              บทความ
            </Link>
          </li>
          <li>
            <Link to="/contact" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              ติดต่อเรา
            </Link>
          </li>
          <li>
            <Link to="/track-order" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              ติดตามออเดอร์
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
