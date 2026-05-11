import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CartPage } from './pages/CartPage';
import { AuthPage } from './pages/AuthPage';
import { AccountPage } from './pages/AccountPage';
import { BrandsPage } from './pages/BrandsPage';
import { BlogPage } from './pages/BlogPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { ContactPage } from './pages/ContactPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminBlog } from './pages/admin/AdminBlog';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminBrands } from './pages/admin/AdminBrands';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminBackup } from './pages/admin/AdminBackup';
import { ScrollToTop } from './components/ScrollToTop';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

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
            {import.meta.env.DEV && this.state.error && (
              <pre style={{ marginTop: 24, textAlign: 'left', background: '#1e1e1e', color: '#f8f8f2', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
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
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="*" element={<AdminDashboard />} />
                  </Route>

                  <Route path="*" element={<Layout><HomePage /></Layout>} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
