import React, { createContext, useContext, useState } from 'react';
import { CompletedSale, CartItem, Customer, PaymentTender } from '@/types';
import { INITIAL_SALES } from '@/data/mockSales';
import { useCashier } from './cashierStore';

interface SalesContextType {
  sales: CompletedSale[];
  lastCompletedSale: CompletedSale | null;
  completeSale: (params: {
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    tax: number;
    total: number;
    customer?: Customer;
    tenders: PaymentTender[];
    change: number;
    cashierName: string;
  }) => CompletedSale;
  getSaleByInvoice: (invoiceNumber: string) => CompletedSale | undefined;
  setLastCompletedSale: (sale: CompletedSale | null) => void;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { recordSaleCash } = useCashier();
  const [sales, setSales] = useState<CompletedSale[]>(INITIAL_SALES);
  const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(INITIAL_SALES[0]);

  const completeSale = ({
    items,
    subtotal,
    discountTotal,
    tax,
    total,
    customer,
    tenders,
    change,
    cashierName,
  }: {
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    tax: number;
    total: number;
    customer?: Customer;
    tenders: PaymentTender[];
    change: number;
    cashierName: string;
  }) => {
    const nextInvoiceNum = sales.length + 1830;
    const invoiceNumber = `INV-${String(nextInvoiceNum).padStart(6, '0')}`;

    const newSale: CompletedSale = {
      id: `sale-${Date.now()}`,
      invoiceNumber,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      items: [...items],
      subtotal,
      discountTotal,
      tax,
      total,
      cashier: cashierName,
      customer,
      tenders,
      change,
      status: 'Completed',
    };

    setSales((prev) => [newSale, ...prev]);
    setLastCompletedSale(newSale);

    // Tally cash in drawer if sale was paid with cash
    const cashTenders = tenders.filter(
      (t) =>
        (t.method && t.method.toLowerCase() === 'cash') ||
        ((t as any).type && (t as any).type.toLowerCase() === 'cash')
    );
    if (cashTenders.length > 0) {
      const cashTendered = cashTenders.reduce((sum, t) => sum + t.amount, 0);
      const netCashAdded = Math.max(0, cashTendered - (change || 0));
      recordSaleCash(netCashAdded);
    }

    return newSale;
  };

  const getSaleByInvoice = (invoiceNumber: string) => {
    const clean = invoiceNumber.trim().toUpperCase().replace(/^\*+|\*+$/g, '');
    return sales.find((s) => {
      const inv = s.invoiceNumber.toUpperCase();
      return (
        inv === clean ||
        inv === `INV-${clean}` ||
        inv.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, '') ||
        s.id.toUpperCase() === clean
      );
    });
  };

  return (
    <SalesContext.Provider
      value={{
        sales,
        lastCompletedSale,
        completeSale,
        getSaleByInvoice,
        setLastCompletedSale,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};
