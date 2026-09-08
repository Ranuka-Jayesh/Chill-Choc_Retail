import React, { createContext, useContext, useState } from 'react';
import { SupplierReturn } from '@/types';

interface SupplierReturnsContextType {
  supplierReturns: SupplierReturn[];
  createSupplierReturn: (claim: Omit<SupplierReturn, 'id' | 'returnCode' | 'timestamp'>) => SupplierReturn;
  updateClaimStatus: (id: string, status: SupplierReturn['claimStatus']) => void;
}

const INITIAL_SUPPLIER_RETURNS: SupplierReturn[] = [];


const SupplierReturnsContext = createContext<SupplierReturnsContextType | undefined>(undefined);

export const SupplierReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(INITIAL_SUPPLIER_RETURNS);

  const createSupplierReturn = (claim: Omit<SupplierReturn, 'id' | 'returnCode' | 'timestamp'>): SupplierReturn => {
    const nextCode = `RTV-${String(102 + supplierReturns.length).padStart(5, '0')}`;
    const newClaim: SupplierReturn = {
      ...claim,
      id: `rtv-${Date.now()}`,
      returnCode: nextCode,
      date: new Date().toISOString().split('T')[0],
      timestamp: 'Just now',
    };
    setSupplierReturns((prev) => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaimStatus = (id: string, status: SupplierReturn['claimStatus']) => {
    setSupplierReturns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, claimStatus: status } : r))
    );
  };

  return (
    <SupplierReturnsContext.Provider value={{ supplierReturns, createSupplierReturn, updateClaimStatus }}>
      {children}
    </SupplierReturnsContext.Provider>
  );
};

export const useSupplierReturns = () => {
  const context = useContext(SupplierReturnsContext);
  if (!context) {
    throw new Error('useSupplierReturns must be used within a SupplierReturnsProvider');
  }
  return context;
};
