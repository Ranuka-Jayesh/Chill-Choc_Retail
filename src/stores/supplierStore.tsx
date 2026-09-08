import React, { createContext, useContext, useState, useEffect } from 'react';
import { Supplier } from '@/types';
import {
  fetchSuppliersFromSupabase,
  upsertSupplierToSupabase,
  generateUUID,
} from '@/services/supabaseData';

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'code'>) => Supplier;
  getSupplierById: (id: string) => Supplier | undefined;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
}

const STORAGE_KEY = 'chill_choc_suppliers';

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export const SupplierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse suppliers from localStorage', e);
    }
    return [];
  });

  const persistSuppliers = (list: Supplier[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save suppliers to localStorage', e);
    }
  };

  // Fetch initial suppliers from Supabase cloud database
  useEffect(() => {
    let isMounted = true;
    fetchSuppliersFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setSuppliers(data);
        persistSuppliers(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'code'>): Supplier => {
    const nextNum = suppliers.length + 1;
    const code = `SUP-${String(nextNum).padStart(3, '0')}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: generateUUID(),
      code,
    };
    const updated = [newSupplier, ...suppliers];
    setSuppliers(updated);
    persistSuppliers(updated);

    // Sync to Supabase cloud
    upsertSupplierToSupabase(newSupplier);

    return newSupplier;
  };

  const getSupplierById = (id: string) => {
    return suppliers.find((s) => s.id === id);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    const updated = suppliers.map((s) => {
      if (s.id === id) {
        const mod = { ...s, ...updates };
        upsertSupplierToSupabase(mod);
        return mod;
      }
      return s;
    });
    setSuppliers(updated);
    persistSuppliers(updated);
  };

  return (
    <SupplierContext.Provider value={{ suppliers, addSupplier, getSupplierById, updateSupplier }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => {
  const context = useContext(SupplierContext);
  if (!context) {
    throw new Error('useSuppliers must be used within a SupplierProvider');
  }
  return context;
};
