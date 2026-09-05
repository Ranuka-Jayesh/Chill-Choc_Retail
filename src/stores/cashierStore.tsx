import React, { createContext, useContext, useState, useEffect } from 'react';
import { CURRENT_CASHIER } from '@/data/mockEmployees';
import { CashMovement, CashSession } from '@/types';

interface CashierContextType {
  cashier: typeof CURRENT_CASHIER;
  isLoggedIn: boolean;
  isLocked: boolean;
  hasActiveSession: boolean;
  session: CashSession;
  cashMovements: CashMovement[];
  login: (email?: string, pin?: string) => void;
  verifyPin: (pin: string) => boolean;
  lockPOS: () => void;
  unlockPOS: (pin: string) => boolean;
  logout: () => void;
  startSession: (openingAmount: number) => void;
  endSession: (countedCash: number, differenceReason?: string) => void;
  recordMovement: (movement: Omit<CashMovement, 'id' | 'timestamp' | 'cashier'>) => void;
  recordSaleCash: (amount: number) => void;
  recordRefundCash: (amount: number) => void;
}

const DEFAULT_SESSION: CashSession = {
  cashier: 'Nimal Perera',
  register: 'POS-01',
  startedAt: '09:12 AM',
  businessDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  openingCash: 15000,
  cashSales: 0,
  cashRefunds: 0,
  cashExpenses: 0,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 15000,
  isClosed: false,
};

const CashierContext = createContext<CashierContextType | undefined>(undefined);

const INITIAL_MOVEMENTS: CashMovement[] = [
  {
    id: 'cm-init-1',
    type: 'Cash In',
    amount: 15000,
    reason: 'Opening Drawer Float',
    timestamp: '09:12 AM',
    cashier: 'Nimal Perera',
    reference: 'FLT-01',
  },
];

export const CashierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cashier, setCashier] = useState(CURRENT_CASHIER);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_is_locked') === 'true';
    } catch {
      return false;
    }
  });
  const [hasActiveSession, setHasActiveSession] = useState(true);
  const [session, setSession] = useState<CashSession>(DEFAULT_SESSION);

  // Sync isLocked state to localStorage for persistence across browser refreshes
  useEffect(() => {
    try {
      if (isLocked) {
        localStorage.setItem('pos_is_locked', 'true');
      } else {
        localStorage.removeItem('pos_is_locked');
      }
    } catch (err) {
      console.error('Failed to sync lock state to localStorage', err);
    }
  }, [isLocked]);

  // Global Shift + L shortcut to Lock Terminal anywhere
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        (e.key === 'L' || e.key === 'l' || e.code === 'KeyL') &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        if (isLocked) return;

        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        if (!isOtherInput && (!isSearchInput || activeEl.value.trim().length === 0)) {
          e.preventDefault();
          e.stopPropagation();
          setIsLocked(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isLocked]);

  const [cashMovements, setCashMovements] = useState<CashMovement[]>(INITIAL_MOVEMENTS);

  const login = (emailOrId?: string) => {
    setIsLoggedIn(true);
    setIsLocked(false);
    if (emailOrId && emailOrId.trim().length > 0) {
      const trimmed = emailOrId.trim();
      const displayName = trimmed.includes('@')
        ? trimmed.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      setCashier((prev) => ({
        ...prev,
        name: displayName || prev.name,
      }));
    }
  };

  const verifyPin = (pin: string) => {
    // Demo PIN is 1234 or any 4-digit PIN
    return pin.length === 4;
  };

  const lockPOS = () => {
    setIsLocked(true);
    try {
      localStorage.setItem('pos_is_locked', 'true');
    } catch {
      // ignore
    }
  };

  const unlockPOS = (pin: string) => {
    if (pin.length === 4) {
      setIsLocked(false);
      try {
        localStorage.removeItem('pos_is_locked');
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsLocked(false);
    try {
      localStorage.removeItem('pos_is_locked');
    } catch {
      // ignore
    }
  };

  const startSession = (openingAmount: number) => {
    setSession({
      ...DEFAULT_SESSION,
      openingCash: openingAmount,
      startedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashSales: 0,
      cashRefunds: 0,
      cashExpenses: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingAmount,
      countedCash: undefined,
      difference: 0,
      isClosed: false,
    });
    setCashMovements([]);
    setHasActiveSession(true);
  };

  const endSession = (countedCash: number, differenceReason?: string) => {
    const diff = countedCash - session.expectedCash;
    setSession((prev) => ({
      ...prev,
      countedCash,
      difference: diff,
      differenceReason: differenceReason || '',
      isClosed: true,
    }));
    setHasActiveSession(false);
  };

  const recordMovement = (movement: Omit<CashMovement, 'id' | 'timestamp' | 'cashier'>) => {
    const newMovement: CashMovement = {
      ...movement,
      id: `cm-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashier: cashier.name,
    };
    setCashMovements((prev) => [newMovement, ...prev]);

    setSession((prev) => {
      let cashIn = prev.cashIn;
      let cashOut = prev.cashOut;
      let cashExpenses = prev.cashExpenses;

      if (movement.type === 'Cash In') {
        cashIn += movement.amount;
      } else if (movement.type === 'Cash Out' || movement.type === 'Bank Drop') {
        cashOut += movement.amount;
      } else if (movement.type === 'Expense' || movement.type === 'Petty Cash') {
        cashExpenses += movement.amount;
      }

      const expected = prev.openingCash + prev.cashSales - prev.cashRefunds - cashExpenses + cashIn - cashOut;

      return {
        ...prev,
        cashIn,
        cashOut,
        cashExpenses,
        expectedCash: expected,
      };
    });
  };

  const recordSaleCash = (amount: number) => {
    if (amount <= 0) return;
    setSession((prev) => {
      const newCashSales = prev.cashSales + amount;
      const expected = prev.openingCash + newCashSales - prev.cashRefunds - prev.cashExpenses + prev.cashIn - prev.cashOut;
      return {
        ...prev,
        cashSales: newCashSales,
        expectedCash: expected,
      };
    });
  };

  const recordRefundCash = (amount: number) => {
    if (amount <= 0) return;
    setSession((prev) => {
      const newCashRefunds = prev.cashRefunds + amount;
      const expected = prev.openingCash + prev.cashSales - newCashRefunds - prev.cashExpenses + prev.cashIn - prev.cashOut;
      return {
        ...prev,
        cashRefunds: newCashRefunds,
        expectedCash: expected,
      };
    });
  };

  return (
    <CashierContext.Provider
      value={{
        cashier,
        isLoggedIn,
        isLocked,
        hasActiveSession,
        session,
        cashMovements,
        login,
        verifyPin,
        lockPOS,
        unlockPOS,
        logout,
        startSession,
        endSession,
        recordMovement,
        recordSaleCash,
        recordRefundCash,
      }}
    >
      {children}
    </CashierContext.Provider>
  );
};

export const useCashier = () => {
  const context = useContext(CashierContext);
  if (!context) {
    throw new Error('useCashier must be used within a CashierProvider');
  }
  return context;
};
