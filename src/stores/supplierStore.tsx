import React, { createContext, useContext, useState } from 'react';
import { Supplier } from '@/types';
import { MOCK_SUPPLIERS } from '@/data/mockSuppliers';

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'code'>) => Supplier;
  getSupplierById: (id: string) => Supplier | undefined;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
}

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export const SupplierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'code'>): Supplier => {
    const nextNum = suppliers.length + 1;
    const code = `SUP-NEW-${String(nextNum).padStart(2, '0')}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      code,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const getSupplierById = (id: string) => {
    return suppliers.find((s) => s.id === id);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
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
