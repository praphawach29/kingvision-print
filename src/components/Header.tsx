import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Search, ShoppingCart, Heart, User, Menu, ChevronDown, Crown, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { NotificationBell } from './NotificationBell';

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { totalItems } = useCart();
  const { settings } = useSettings();

  return (
    <header className="w-full">
      {/* Top Bar - Hidden on very small screens, simplified on mobile */}
      <div className="bg-kv-navy text-white text-xs md:text-sm py-2 px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="flex items-center space-x-1">
            <Phone size={14} />
            <span className="hidden sm:inline">095-585-1136</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageCircle size={14} />
            <a href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} target="_blank" rel="noopener noreferrer" className="hover:text-kv-orange transition-colors hidden sm:inline">LINE: {settings.line_oa_id || "@kingvision"}</a>
          </div>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4">
          <a href={settings.line_oa_link || "https://line.me/R/ti/p/@kingvision"} target="_blank" rel="noopener noreferrer" className="hover:text-kv-orange transition-colors hidden sm:block">Live Chat (LINE)</a>
          <div className="flex items-center space-x-2 sm:border-l sm:border-white/20 sm:pl-4">
            <button className="hover:text-kv-orange transition-colors">TH</button>
            <span>|</span>
            <button className="hover:text-kv-orange transition-colors">EN</button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white py-3 md:py-4 px-4 md:px-8 flex flex-wrap justify-between items-center border-b border-kv-border relative">
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-kv-navy hover:text-kv-orange p-1"
          onClick={onOpenMobileMenu}
        >
          <Menu size={28} />
        </button>

        {/* Logo */}
        <Link to="/" className="text-2xl md:text-3xl font-bold text-kv-navy flex items-center mx-auto md:mx-0">
          <Crown className="text-kv-orange mr-1 md:mr-2" size={28} />
          King<span className="text-kv-orange">Vision</span>
        </Link>

        {/* Icons - Mobile (Right side) */}
        <div className="flex md:hidden items-center space-x-4 text-kv-navy">
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
        <div className="w-full md:flex-1 md:max-w-2xl md:mx-4 mt-3 md:mt-0 order-last md:order-none flex">
          <div className="relative flex w-full border-2 border-kv-navy rounded-md overflow-hidden">
            <select className="bg-kv-gray px-2 md:px-4 py-2 border-r border-kv-border outline-none hidden lg:block text-sm">
              <option>หมวดหมู่ทั้งหมด</option>
              <option>ปริ้นเตอร์มือสอง</option>
              <option>หมึกพิมพ์</option>
              <option>อะไหล่ปริ้นเตอร์</option>
            </select>
            <input 
              type="text" 
              placeholder="ค้นหาสินค้า..." 
              className="flex-1 px-3 md:px-4 py-2 outline-none text-sm md:text-base"
            />
            <button className="bg-kv-navy text-white px-4 md:px-6 py-2 hover:bg-kv-navy/90 transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Icons - Desktop */}
        <div className="hidden md:flex items-center space-x-6 text-kv-navy">
          <NotificationBell />
          <Link to="/account" className="flex flex-col items-center hover:text-kv-orange transition-colors">
            <User size={24} />
            <span className="text-xs mt-1">บัญชี</span>
          </Link>
          <Link to="/wishlist" className="flex flex-col items-center hover:text-kv-orange transition-colors relative">
            <Heart size={24} />
            <span className="absolute -top-2 -right-2 bg-kv-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">0</span>
            <span className="text-xs mt-1">รายการโปรด</span>
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

      {/* Navigation - Desktop Mega Menu */}
      <nav className="hidden md:block bg-kv-navy text-white px-4 md:px-8 relative w-full z-40">
        <ul className="flex flex-row flex-wrap items-center space-x-1">
          <li>
            <Link to="/" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              หน้าแรก
            </Link>
          </li>
          <li>
            <Link to="/category/used-printers" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              สินค้ามือสอง
            </Link>
          </li>
          <li>
            <Link to="/category/ink" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
              หมึกพิมพ์
            </Link>
          </li>
          <li>
            <Link to="/category/parts" className="px-4 py-4 block hover:text-kv-orange transition-colors font-medium">
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
