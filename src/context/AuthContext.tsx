'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { AdminUser } from '@/lib/types';
import { toast } from 'sonner';

interface AuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await verifyAdminSession(session.access_token);
        } else {
          setAdmin(null);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await verifyAdminSession(session.access_token);
      } else {
        setAdmin(null);
        setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  const verifyAdminSession = async (accessToken: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
        // If on login page, redirect to dashboard
        if (pathname === '/login' || pathname === '/') {
          router.push('/dashboard');
        }
      } else {
        // Not an admin or invalid token
        setAdmin(null);
        await supabase.auth.signOut();
        toast.error('Access Denied: You are not authorized as an administrator.');
        router.push('/login');
      }
    } catch (err) {
      console.error('Error verifying admin session:', err);
      setAdmin(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data.session) {
      await verifyAdminSession(data.session.access_token);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // Clear cookies on server as well
    await fetch('/api/auth/logout', { method: 'POST' });
    setAdmin(null);
    setLoading(false);
    router.push('/login');
    toast.success('Successfully logged out.');
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
