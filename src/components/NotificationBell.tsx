import React, { useState, useEffect } from 'react';
import { Bell, X, Check, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  created_at: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Real-time subscription
      const channelId = `user-notifications-${user.id}-${Math.random().toString(36).substr(2, 9)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async function markAllAsRead() {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  return (
    <div className="relative font-thai">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-kv-navy hover:text-kv-orange transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-kv-navy text-sm">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-kv-orange hover:underline"
                  >
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Loader2 className="animate-spin text-kv-orange mx-auto" size={24} />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 transition-colors relative group ${n.is_read ? 'bg-white' : 'bg-orange-50/30'}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className={`text-xs font-black ${n.is_read ? 'text-kv-navy' : 'text-kv-orange'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[9px] text-gray-400 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleString('th-TH', { 
                              day: 'numeric', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="p-1 text-gray-300 hover:text-green-500 transition-colors"
                            title="ทำเป็นอ่านแล้ว"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      {n.link && (
                        <Link 
                          to={n.link}
                          onClick={() => {
                            setIsOpen(false);
                            markAsRead(n.id);
                          }}
                          className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          ดูรายละเอียด <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto text-gray-200 mb-2" size={32} />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ไม่มีการแจ้งเตือน</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-50 text-center">
                <Link 
                  to="/account" 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-kv-navy hover:text-kv-orange transition-colors uppercase tracking-widest"
                >
                  ดูประวัติทั้งหมด
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
