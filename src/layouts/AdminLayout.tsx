import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Home, Menu, X, BarChart2, FileText, Bell, List, Tag, Box, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export function AdminLayout() {
  const location = useLocation();
  const { user, role, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; id: string } | null>(null);

  useEffect(() => {
    if (!user || (role !== 'admin' && role !== 'super_admin')) return;

    // Listen for new orders
    const channelId = `admin-notifications-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Fetch settings to check if web notifications are enabled
          supabase
            .from('store_settings')
            .select('web_notifications_enabled')
            .single()
            .then(({ data }) => {
              if (data?.web_notifications_enabled) {
                setNotification({
                  message: `มีออเดอร์ใหม่! #${payload.new.id.slice(0, 8)}`,
                  id: payload.new.id
                });
                // Auto hide after 5 seconds
                setTimeout(() => setNotification(null), 5000);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kv-orange"></div>
      </div>
    );
  }

  // Protection - check for admin or super_admin role
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'แดชบอร์ด' },
    { path: '/admin/analytics', icon: BarChart2, label: 'รายงานวิเคราะห์' },
    { path: '/admin/products', icon: Package, label: 'จัดการสินค้า' },
    { path: '/admin/inventory', icon: Box, label: 'จัดการสต็อก' },
    { path: '/admin/categories', icon: List, label: 'จัดการหมวดหมู่' },
    { path: '/admin/brands', icon: Tag, label: 'จัดการแบรนด์' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'รายการสั่งซื้อ' },
    { path: '/admin/blog', icon: FileText, label: 'จัดการบทความ' },
    { path: '/admin/users', icon: Users, label: 'ลูกค้า' },
    { path: '/admin/backup', icon: Database, label: 'สำรองข้อมูล' },
    { path: '/admin/settings', icon: Settings, label: 'ตั้งค่าระบบ' },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-kv-orange rounded flex items-center justify-center font-bold text-xl">K</div>
          <span className="font-bold text-lg tracking-wider">Admin Panel</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-kv-orange text-white font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white transition-colors">
          <Home size={20} />
          กลับหน้าร้านค้า
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex font-thai overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-kv-navy text-white flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-kv-navy text-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-kv-navy hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-kv-navy truncate max-w-[150px] sm:max-w-none">
              {navItems.find(item => item.path === location.pathname)?.label || 'ระบบจัดการหลังบ้าน'}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:block text-sm font-medium text-gray-600 truncate max-w-[150px]">{user?.email}</div>
            <div className="w-8 h-8 bg-kv-orange text-white rounded-full flex items-center justify-center font-bold shadow-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </div>

        {/* Real-time Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className="fixed bottom-8 left-1/2 z-[100] bg-kv-navy text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-[300px]"
            >
              <div className="w-10 h-10 bg-kv-orange rounded-full flex items-center justify-center shrink-0 animate-pulse">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm">{notification.message}</p>
                <Link 
                  to="/admin/orders" 
                  onClick={() => setNotification(null)}
                  className="text-xs font-bold text-kv-orange hover:underline"
                >
                  คลิกเพื่อดูรายละเอียด
                </Link>
              </div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
