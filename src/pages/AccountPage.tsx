import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Package, Settings, LogOut, Shield, Save, Loader2, CheckCircle2, AlertCircle, Clock, ChevronRight, Truck, Bell } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

function NotificationsList({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-kv-orange" /></div>;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Bell size={48} className="mx-auto text-gray-200 mb-4" />
        <p>คุณยังไม่มีการแจ้งเตือน</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((n) => (
        <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-white border-gray-100' : 'bg-orange-50/30 border-orange-100'}`}>
          <div className="flex justify-between items-start mb-1">
            <h4 className={`font-bold text-sm ${n.is_read ? 'text-kv-navy' : 'text-kv-orange'}`}>{n.title}</h4>
            <span className="text-[10px] text-gray-400 font-medium">
              {new Date(n.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
          {n.link && (
            <Link to={n.link} className="inline-block mt-2 text-[10px] font-black text-kv-orange hover:underline">
              ดูรายละเอียดเพิ่มเติม
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

export function AccountPage() {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'notifications' | 'settings'>('profile');
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || (isLoading && user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="text-kv-orange animate-spin mb-4" size={48} />
        <p className="text-gray-500 font-thai">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isAdmin = role === 'admin' || role === 'super_admin';

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'สำเร็จแล้ว';
      case 'processing': return 'กำลังดำเนินการ';
      case 'pending': return 'รอชำระเงิน';
      case 'cancelled': return 'ยกเลิกแล้ว';
      default: return status;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16 font-thai">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'บัญชีของฉัน' }]} />
        <h1 className="text-3xl font-bold text-kv-navy mb-8">บัญชีของฉัน</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-kv-orange text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-kv-navy text-sm truncate leading-tight mb-0.5" title={user.email || ''}>
                    {user.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {role === 'super_admin' ? 'Super Admin' : (role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิกทั่วไป')}
                  </div>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                    activeTab === 'profile' ? 'text-kv-orange bg-orange-50' : 'text-gray-600 hover:text-kv-orange hover:bg-orange-50'
                  }`}
                >
                  <User size={18} /> ข้อมูลส่วนตัว
                </button>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                    activeTab === 'orders' ? 'text-kv-orange bg-orange-50' : 'text-gray-600 hover:text-kv-orange hover:bg-orange-50'
                  }`}
                >
                  <Package size={18} /> ประวัติการสั่งซื้อ
                </button>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                    activeTab === 'notifications' ? 'text-kv-orange bg-orange-50' : 'text-gray-600 hover:text-kv-orange hover:bg-orange-50'
                  }`}
                >
                  <Bell size={18} /> การแจ้งเตือน
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                    activeTab === 'settings' ? 'text-kv-orange bg-orange-50' : 'text-gray-600 hover:text-kv-orange hover:bg-orange-50'
                  }`}
                >
                  <Settings size={18} /> ตั้งค่าบัญชี
                </button>
                {/* Admin Link - Only show for admin/super_admin */}
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-3 text-gray-600 hover:text-kv-orange hover:bg-orange-50 px-4 py-2.5 rounded-lg transition-colors font-medium">
                    <Shield size={18} /> จัดการระบบหลังบ้าน
                  </Link>
                )}
              </nav>
            </div>
            
            <button 
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 px-4 py-3 rounded-xl transition-colors font-bold shadow-sm"
            >
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  <h2 className="text-xl font-bold text-kv-navy mb-6 border-b pb-4">ข้อมูลส่วนตัว</h2>
                  
                  {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                      message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      <p className="text-sm font-medium">{message.text}</p>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อ-นามสกุล</label>
                        <input 
                          type="text"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange focus:border-transparent outline-none transition-all"
                          placeholder="กรอกชื่อ-นามสกุล"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">เบอร์โทรศัพท์</label>
                        <input 
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange focus:border-transparent outline-none transition-all"
                          placeholder="08x-xxx-xxxx"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">ที่อยู่สำหรับการจัดส่ง</label>
                        <textarea 
                          rows={3}
                          value={profile.address}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-kv-orange focus:border-transparent outline-none transition-all resize-none"
                          placeholder="กรอกที่อยู่โดยละเอียด"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">อีเมล (ไม่สามารถเปลี่ยนได้)</label>
                        <div className="text-gray-400 font-medium p-3 bg-gray-100 rounded-xl border border-gray-200 cursor-not-allowed">{user.email}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">รหัสผู้ใช้ (UID)</label>
                        <div className="text-gray-400 font-medium p-3 bg-gray-100 rounded-xl border border-gray-200 text-[10px] truncate cursor-not-allowed">{user.id}</div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 bg-kv-navy text-white px-8 py-3 rounded-xl font-bold hover:bg-kv-orange transition-all disabled:opacity-70 shadow-lg shadow-kv-navy/10"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        บันทึกข้อมูล
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  <h2 className="text-xl font-bold text-kv-navy mb-6 border-b pb-4">ประวัติการสั่งซื้อ</h2>
                  
                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-gray-100 rounded-2xl p-4 md:p-6 hover:border-kv-orange/30 transition-all group">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-kv-navy">
                                <Package size={20} />
                              </div>
                              <div>
                                <div className="font-bold text-kv-navy">ออเดอร์ #{order.id.slice(0, 8)}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} /> {new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-gray-500">ยอดรวม</div>
                                <div className="font-bold text-kv-navy">฿{order.total_amount?.toLocaleString()}</div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                              <ChevronRight size={20} className="text-gray-300 group-hover:text-kv-orange transition-colors" />
                            </div>
                          </div>
                          {order.tracking_number && (
                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-kv-orange" />
                                <span className="text-xs font-bold text-gray-500">เลขพัสดุ:</span>
                                <span className="text-xs font-black text-kv-navy">
                                  {order.shipping_provider && `${order.shipping_provider}: `}
                                  {order.tracking_number}
                                </span>
                              </div>
                              <Link 
                                to={`/track-order?id=${order.id.slice(0, 8)}`}
                                className="text-xs font-black text-kv-orange hover:underline flex items-center gap-1"
                              >
                                ติดตามสถานะ <ChevronRight size={12} />
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <Package size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="font-medium">ยังไม่มีประวัติการสั่งซื้อ</p>
                      <Link to="/shop" className="inline-block mt-4 text-kv-orange font-bold hover:underline">
                        ไปช้อปปิ้งกันเลย
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  <h2 className="text-xl font-bold text-kv-navy mb-6 border-b pb-4">การแจ้งเตือน</h2>
                  <NotificationsList userId={user.id} />
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  <h2 className="text-xl font-bold text-kv-navy mb-6 border-b pb-4">ตั้งค่าบัญชี</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                      <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-bold text-blue-800 mb-1">การเปลี่ยนรหัสผ่าน</p>
                        <p className="text-xs text-blue-600">คุณสามารถเปลี่ยนรหัสผ่านได้โดยใช้ฟังก์ชัน "ลืมรหัสผ่าน" ในหน้าเข้าสู่ระบบเพื่อรับลิงก์รีเซ็ตรหัสผ่านทางอีเมล</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-bold text-red-600 mb-2">โซนอันตราย</h3>
                      <p className="text-xs text-gray-500 mb-4">การลบบัญชีจะทำให้ข้อมูลทั้งหมดของคุณหายไปและไม่สามารถกู้คืนได้</p>
                      <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">
                        ลบบัญชีผู้ใช้
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
