import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompletedSale, CartItem, Customer, PaymentTender, Salesperson } from '@/types';
import { useCashier } from './cashierStore';
import { supabase } from '@/services/supabase';
import {
  fetchSalesFromSupabase,
  insertSaleToSupabase,
  generateUUID,
} from '@/services/supabaseData';

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
    salesperson?: Salesperson | null;
  }) => CompletedSale;
  getSaleByInvoice: (invoiceNumber: string) => CompletedSale | undefined;
  setLastCompletedSale: (sale: CompletedSale | null) => void;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const STORAGE_KEY = 'pos_completed_sales';

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { recordSaleCash } = useCashier();
  const [sales, setSales] = useState<CompletedSale[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load sales from localStorage', e);
    }
    return [];
  });
  const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(() => sales[0] || null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    } catch (e) {
      console.error('Failed to save sales to localStorage', e);
    }
  }, [sales]);

  // Fetch initial sales from Supabase + Subscribe to Supabase Realtime WebSocket
  useEffect(() => {
    let isMounted = true;
    fetchSalesFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data)) {
        setSales(data);
        setLastCompletedSale(data[0] || null);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    });

    const channel = supabase
      .channel('realtime_sales_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchSalesFromSupabase().then((data) => {
            if (isMounted && Array.isArray(data)) {
              setSales(data);
              setLastCompletedSale(data[0] || null);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
              } catch {}
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
    salesperson,
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
    salesperson?: Salesperson | null;
  }) => {
    const nextInvoiceNum = sales.length + 1001;
    const invoiceNumber = `INV-${String(nextInvoiceNum).padStart(6, '0')}`;

    const effectiveItems = items.map((item) => ({
      ...item,
      salesperson: item.salesperson || salesperson || null,
    }));

    const newSale: CompletedSale = {
      id: generateUUID(),
      invoiceNumber,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      items: effectiveItems,
      subtotal,
      discountTotal,
      tax,
      total,
      cashier: cashierName,
      customer,
      tenders,
      change,
      status: 'Completed',
      salesperson: salesperson || null,
    };

    setSales((prev) => [newSale, ...prev]);
    setLastCompletedSale(newSale);

    // Sync to Supabase cloud
    insertSaleToSupabase(newSale);

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
