import React, { lazy, Suspense } from 'react';

// Auto-reload once when a lazy chunk fails (stale deploy cache)
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() => {
      if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
      }
      return new Promise(() => {}) as any;
    })
  );
}
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

// Core user flow — loaded synchronously (must be fast)
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';

// Secondary user pages — lazy loaded
const CartPage        = lazyWithRetry(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage    = lazyWithRetry(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const AuthPage        = lazyWithRetry(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const AccountPage     = lazyWithRetry(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const BrandsPage      = lazyWithRetry(() => import('./pages/BrandsPage').then(m => ({ default: m.BrandsPage })));
const BlogPage        = lazyWithRetry(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage    = lazyWithRetry(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const ContactPage     = lazyWithRetry(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const TrackOrderPage  = lazyWithRetry(() => import('./pages/TrackOrderPage').then(m => ({ default: m.TrackOrderPage })));
const FAQPage         = lazyWithRetry(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const ShippingPage    = lazyWithRetry(() => import('./pages/ShippingPage').then(m => ({ default: m.ShippingPage })));
const ReturnsPage     = lazyWithRetry(() => import('./pages/ReturnsPage').then(m => ({ default: m.ReturnsPage })));
const WarrantyPage    = lazyWithRetry(() => import('./pages/WarrantyPage').then(m => ({ default: m.WarrantyPage })));

// Admin — all lazy loaded (heaviest, only used by staff)
const AdminLayout     = lazyWithRetry(() => import('./layouts/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard  = lazyWithRetry(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts   = lazyWithRetry(() => import('./pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminOrders     = lazyWithRetry(() => import('./pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminUsers      = lazyWithRetry(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminSettings   = lazyWithRetry(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminAnalytics  = lazyWithRetry(() => import('./pages/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminBlog       = lazyWithRetry(() => import('./pages/admin/AdminBlog').then(m => ({ default: m.AdminBlog })));
const AdminCategories = lazyWithRetry(() => import('./pages/admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminBrands     = lazyWithRetry(() => import('./pages/admin/AdminBrands').then(m => ({ default: m.AdminBrands })));
const AdminInventory  = lazyWithRetry(() => import('./pages/admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminBackup     = lazyWithRetry(() => import('./pages/admin/AdminBackup').then(m => ({ default: m.AdminBackup })));
const AdminQuotation  = lazyWithRetry(() => import('./pages/admin/AdminQuotation').then(m => ({ default: m.AdminQuotation })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-kv-orange border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400 font-medium">กำลังโหลด...</span>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '2rem', background: '#f9fafb' }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: '#1a2b4a', marginBottom: 8 }}>เกิดข้อผิดพลาด</h1>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>กรุณาลองรีเฟรชหน้าเว็บ หากยังพบปัญหาโปรดติดต่อทีมงาน</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#f7941d', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              รีเฟรชหน้าเว็บ
            </button>
            {this.state.error && (
              <pre style={{ marginTop: 24, textAlign: 'left', background: '#1e1e1e', color: '#f8f8f2', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path="shop" element={<ShopPage />} />
                      <Route path="category/:category" element={<ShopPage />} />
                      <Route path="product/:id" element={<ProductPage />} />
                      <Route path="cart" element={<CartPage />} />
                      <Route path="checkout" element={<CheckoutPage />} />
                      <Route path="auth" element={<AuthPage />} />
                      <Route path="account" element={<AccountPage />} />
                      <Route path="brands" element={<BrandsPage />} />
                      <Route path="blog" element={<BlogPage />} />
                      <Route path="blog/:id" element={<BlogPostPage />} />
                      <Route path="contact" element={<ContactPage />} />
                      <Route path="track-order" element={<TrackOrderPage />} />
                      <Route path="faq" element={<FAQPage />} />
                      <Route path="shipping" element={<ShippingPage />} />
                      <Route path="returns" element={<ReturnsPage />} />
                      <Route path="warranty" element={<WarrantyPage />} />
                    </Route>

                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="inventory" element={<AdminInventory />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="brands" element={<AdminBrands />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="blog" element={<AdminBlog />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="backup" element={<AdminBackup />} />
                      <Route path="quotation" element={<AdminQuotation />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="*" element={<AdminDashboard />} />
                    </Route>

                    <Route path="*" element={<Layout><HomePage /></Layout>} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
