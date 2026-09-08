import React, { createContext, useContext, useState, useEffect } from 'react';
import { HeldBill, CartItem, Customer } from '@/types';

interface HeldBillsContextType {
  heldBills: HeldBill[];
  holdBill: (items: CartItem[], total: number, customer?: Customer, note?: string) => string;
  deleteHeldBill: (id: string) => void;
  getHeldBill: (id: string) => HeldBill | undefined;
}

const STORAGE_KEY = 'pos_held_bills';

const HeldBillsContext = createContext<HeldBillsContextType | undefined>(undefined);

export const HeldBillsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(heldBills));
    } catch {}
  }, [heldBills]);

  const holdBill = (items: CartItem[], total: number, customer?: Customer, note?: string) => {
    const holdNumber = heldBills.length + 1;
    const holdCode = `HOLD-${String(holdNumber).padStart(4, '0')}`;
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const newHeldBill: HeldBill = {
      id: `hold-${Date.now()}`,
      holdCode,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: [...items],
      itemsCount,
      total,
      cashier: 'Cashier',
      customer,
      note,
    };

    setHeldBills((prev) => [newHeldBill, ...prev]);
    return holdCode;
  };

  const deleteHeldBill = (id: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== id));
  };

  const getHeldBill = (id: string) => {
    return heldBills.find((b) => b.id === id);
  };

  return (
    <HeldBillsContext.Provider value={{ heldBills, holdBill, deleteHeldBill, getHeldBill }}>
      {children}
    </HeldBillsContext.Provider>
  );
};

export const useHeldBills = () => {
  const context = useContext(HeldBillsContext);
  if (!context) {
    throw new Error('useHeldBills must be used within a HeldBillsProvider');
  }
  return context;
};
