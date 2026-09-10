import React, { createContext, useContext, useState, useEffect } from 'react';
import { Supplier } from '@/types';
import {
  fetchSuppliersFromSupabase,
  upsertSupplierToSupabase,
  updateSupplierInSupabase,
  syncSupplierProductsInSupabase,
  generateUUID,
} from '@/services/supabaseData';

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'code'>) => Supplier;
  getSupplierById: (id: string) => Supplier | undefined;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<{ success: boolean; error?: string }>;
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
      if (isMounted && Array.isArray(data)) {
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

    // Also sync assigned products if any
    if (newSupplier.suppliedProductIds && newSupplier.suppliedProductIds.length > 0) {
      syncSupplierProductsInSupabase(newSupplier.id, newSupplier.suppliedProductIds);
    }

    return newSupplier;
  };

  const getSupplierById = (id: string) => {
    return suppliers.find((s) => s.id === id);
  };

  const updateSupplier = async (
    id: string,
    updates: Partial<Supplier>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = suppliers.find((s) => s.id === id);
      if (!existing) {
        return { success: false, error: 'Supplier not found' };
      }

      const mod: Supplier = { ...existing, ...updates };

      // Update local state and local storage immediately
      const updated = suppliers.map((s) => (s.id === id ? mod : s));
      setSuppliers(updated);
      persistSuppliers(updated);

      // Sync to Supabase cloud
      try {
        await updateSupplierInSupabase(id, updates);
      } catch (updateErr) {
        console.warn('Update failed, attempting upsert fallback in Supabase:', updateErr);
        await upsertSupplierToSupabase(mod);
      }

      // If suppliedProductIds were updated, sync products in Supabase
      if (updates.suppliedProductIds !== undefined) {
        await syncSupplierProductsInSupabase(id, updates.suppliedProductIds);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to update supplier in Supabase:', err);
      return {
        success: false,
        error: err?.message || 'Failed to update supplier in Supabase',
      };
    }
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
