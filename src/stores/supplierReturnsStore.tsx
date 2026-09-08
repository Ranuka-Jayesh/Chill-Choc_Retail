import React, { createContext, useContext, useState } from 'react';
import { SupplierReturn } from '@/types';

interface SupplierReturnsContextType {
  supplierReturns: SupplierReturn[];
  createSupplierReturn: (claim: Omit<SupplierReturn, 'id' | 'returnCode' | 'timestamp'>) => SupplierReturn;
  updateClaimStatus: (id: string, status: SupplierReturn['claimStatus']) => void;
}

const INITIAL_SUPPLIER_RETURNS: SupplierReturn[] = [
  {
    id: 'rtv-103',
    returnCode: 'RTV-00103',
    supplierId: 'sup-nestle',
    supplierName: 'Nestlé Lanka PLC',
    customerInvoiceNumber: 'INV-3145',
    productId: 'prod-kitkat',
    productName: 'KitKat Chunky 40g',
    quantity: 3,
    unitCost: 360,
    totalDebitAmount: 1080,
    batchNumber: 'LOT-NES-401',
    reason: 'Packaging Defect',
    claimStatus: 'Pending Dispatch',
    date: '2026-09-07',
    timestamp: '07 Sept 2026, 02:15 PM',
    notes: 'Secondary seal broken on outer carton. Batch LOT-NES-401 recurring packaging fault.',
  },
  {
    id: 'rtv-102',
    returnCode: 'RTV-00102',
    supplierId: 'sup-nestle',
    supplierName: 'Nestlé Lanka PLC',
    customerInvoiceNumber: 'INV-1040',
    productId: 'prod-kitkat',
    productName: 'KitKat Chunky 40g',
    quantity: 1,
    unitCost: 365,
    totalDebitAmount: 365,
    batchNumber: 'LOT-NES-402',
    reason: 'Quality Issue',
    claimStatus: 'Dispatched to Supplier',
    date: '2026-09-05',
    timestamp: '05 Sept 2026, 11:30 AM',
    notes: 'Severe chocolate discoloration and bloom reported by stock auditor.',
  },
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
    date: '2026-09-04',
    timestamp: '04 Sept 2026, 04:20 PM',
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
    date: '2026-09-03',
    timestamp: '03 Sept 2026, 10:15 AM',
    notes: 'Crushed wafer bar inside sealed pack; credit note #CN-991 issued by supplier.',
  },
  {
    id: 'rtv-099',
    returnCode: 'RTV-00099',
    supplierId: 'sup-mondelez',
    supplierName: 'Mondelēz International',
    customerInvoiceNumber: 'INV-001680',
    productId: 'prod-toblerone',
    productName: 'Toblerone Milk 100g',
    quantity: 4,
    unitCost: 650,
    totalDebitAmount: 2600,
    batchNumber: 'LOT-MDZ-092',
    reason: 'Expired',
    claimStatus: 'Credit Note Received',
    date: '2026-08-25',
    timestamp: '25 Aug 2026, 03:40 PM',
    notes: 'Supplier credit note #CN-MDZ-44 settled for expired display stock.',
  },
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
