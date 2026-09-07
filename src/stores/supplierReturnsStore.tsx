import React, { createContext, useContext, useState } from 'react';
import { SupplierReturn } from '@/types';

interface SupplierReturnsContextType {
  supplierReturns: SupplierReturn[];
  createSupplierReturn: (claim: Omit<SupplierReturn, 'id' | 'returnCode' | 'timestamp'>) => SupplierReturn;
  updateClaimStatus: (id: string, status: SupplierReturn['claimStatus']) => void;
}

const INITIAL_SUPPLIER_RETURNS: SupplierReturn[] = [
  {
    id: 'rtv-101',
    returnCode: 'RTV-00101',
    supplierId: 'sup-mars',
    supplierName: 'Mars Global Foods Importers',
    customerInvoiceNumber: 'INV-001825',
    productId: 'prod-mars',
    productName: 'Mars Bar 51g',
    quantity: 1,
    unitCost: 380,
    totalDebitAmount: 380,
    batchNumber: 'LOT-MARS-88',
    reason: 'Damaged',
    claimStatus: 'Dispatched to Supplier',
    timestamp: 'Yesterday, 04:20 PM',
    notes: 'Packaging melted upon arrival from supplier truck.',
  },
  {
    id: 'rtv-100',
    returnCode: 'RTV-00100',
    supplierId: 'sup-nestle',
    supplierName: 'Nestlé Lanka PLC',
    customerInvoiceNumber: 'INV-001820',
    productId: 'prod-kitkat',
    productName: 'KitKat Chunky 40g',
    quantity: 2,
    unitCost: 360,
    totalDebitAmount: 720,
    batchNumber: 'LOT-NES-401',
    reason: 'Quality Issue',
    claimStatus: 'Credit Note Received',
    timestamp: '03 Sept 2026',
    notes: 'Crushed wafer bar inside sealed pack; credit note #CN-991 issued.',
  }
];

const SupplierReturnsContext = createContext<SupplierReturnsContextType | undefined>(undefined);

export const SupplierReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(INITIAL_SUPPLIER_RETURNS);

  const createSupplierReturn = (claim: Omit<SupplierReturn, 'id' | 'returnCode' | 'timestamp'>): SupplierReturn => {
    const nextCode = `RTV-${String(102 + supplierReturns.length).padStart(5, '0')}`;
    const newClaim: SupplierReturn = {
      ...claim,
      id: `rtv-${Date.now()}`,
      returnCode: nextCode,
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
