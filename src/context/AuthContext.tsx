import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const VALID_ROLES = new Set(['user', 'admin', 'super_admin']);
const ROLE_REFRESH_MS = 5 * 60 * 1000; // re-validate role every 5 minutes

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  signOut: async () => {},
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  async function fetchRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      // Only accept known roles — reject any unexpected value
      const fetched = data?.role || 'user';
      setRole(VALID_ROLES.has(fetched) ? fetched : 'user');
    } catch (err) {
      console.error('Error fetching role:', err);
      setRole('user');
    }
  }

  useEffect(() => {
    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-validate role periodically and on window focus (catches revoked admin access)
  useEffect(() => {
    const revalidate = () => {
      if (userIdRef.current) fetchRole(userIdRef.current);
    };

    const interval = setInterval(revalidate, ROLE_REFRESH_MS);
    window.addEventListener('focus', revalidate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', revalidate);
    };
  }, []);

  useEffect(() => {
    if (role !== null) {
      setLoading(false);
    }
  }, [role]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
