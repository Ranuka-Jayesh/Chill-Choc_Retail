import React, { createContext, useContext, useState } from 'react';
import { AdminUser } from '@/types';
import { fetchOperatorsFromSupabase } from '@/services/supabaseData';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminUser: AdminUser | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chill_admin_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('chill_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password = ''): Promise<boolean> => {
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPass = password.trim();

    const verifyOperatorList = (ops: any[]): boolean => {
      const matched = ops.find((o: any) => {
        const oEmail = (o.email || '').trim().toLowerCase();
        const oHandle = (o.handle || '').trim().toLowerCase().replace(/^@/, '');
        const oName = (o.name || '').trim().toLowerCase();
        return (
          (oEmail === cleanUser || oHandle === cleanUser || oName === cleanUser) &&
          (o.role === 'ADMIN' || o.role === 'MANAGER')
        );
      });

      if (matched) {
        // If operator is blocked, deny login
        if (matched.status === 'Blocked') {
          return false;
        }
        // Validate password or pin
        const passMatch =
          (matched.password && matched.password === cleanPass) ||
          (matched.password_hash && matched.password_hash === cleanPass) ||
          matched.pin === cleanPass;

        if (passMatch) {
          const user: AdminUser = {
            id: matched.id,
            name: matched.name,
            email: matched.email || (matched.role === 'ADMIN' ? 'admin@chillchoc.lk' : 'manager@chillchoc.lk'),
            role: matched.role === 'ADMIN' ? 'Super Admin' : 'Store Manager',
            avatarInitials: matched.name.slice(0, 2).toUpperCase(),
          };
          setIsAdminLoggedIn(true);
          setAdminUser(user);
          try {
            localStorage.setItem('chill_admin_logged_in', 'true');
            localStorage.setItem('chill_admin_user', JSON.stringify(user));
          } catch {}
          return true;
        }
      }
      return false;
    };

    // 1. Try local storage first
    try {
      const stored = localStorage.getItem('chill_choc_operators');
      if (stored) {
        const ops = JSON.parse(stored);
        if (Array.isArray(ops) && verifyOperatorList(ops)) {
          return true;
        }
      }
    } catch {}

    // 2. Fetch directly from Supabase cloud database
    try {
      const remoteOps = await fetchOperatorsFromSupabase();
      if (Array.isArray(remoteOps) && remoteOps.length > 0) {
        try {
          localStorage.setItem('chill_choc_operators', JSON.stringify(remoteOps));
        } catch {}
        if (verifyOperatorList(remoteOps)) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Error checking cloud operator auth', e);
    }

    return false;
  };

  const logout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem('chill_admin_logged_in');
    } catch (err) {
      console.error('Failed to clear admin auth', err);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminLoggedIn, adminUser, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
