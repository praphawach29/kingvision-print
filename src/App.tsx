/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { ScrollToTop } from './components/ScrollToTop';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public Storefront Routes */}
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

              {/* Admin Backend Routes */}
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
                <Route path="settings" element={<AdminSettings />} />
                {/* Fallback for other admin routes */}
                <Route path="*" element={<AdminDashboard />} />
              </Route>

              {/* Fallback for other routes */}
              <Route path="*" element={<Layout><HomePage /></Layout>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  </HelmetProvider>
  );
}
