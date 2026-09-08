import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CURRENT_CASHIER } from '@/data/mockEmployees';
import { CashMovement, CashSession } from '@/types';
import { cashSyncSocket, CashSyncMessage } from '@/services/cashSyncSocket';
import { operatorSyncSocket, OperatorSyncMessage } from '@/services/operatorSyncSocket';
import { DEFAULT_OPERATORS } from '@/stores/operatorStore';

interface CashierContextType {
  cashier: typeof CURRENT_CASHIER;
  isLoggedIn: boolean;
  isLocked: boolean;
  isBlockedByAdmin: boolean;
  blockedReason: string;
  hasActiveSession: boolean;
  session: CashSession;
  cashMovements: CashMovement[];
  sessionHistory: CashSession[];
  isWsConnected: boolean;
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

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const DEFAULT_SESSION: CashSession = {
  cashier: 'Nimal Perera',
  register: 'POS-01',
  startedAt: '09:12 AM',
  businessDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  sessionDate: getTodayDateStr(),
  openingCash: 15000,
  cashSales: 0,
  cashRefunds: 0,
  cashExpenses: 0,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 15000,
  isClosed: false,
};

const INITIAL_MOVEMENTS: CashMovement[] = [
  {
    id: 'cm-init-1',
    type: 'Cash In',
    amount: 15000,
    reason: 'Opening Drawer Float',
    timestamp: '09:12 AM',
    cashier: 'Nimal Perera',
    reference: 'FLT-01',
    date: getTodayDateStr(),
  },
];

const CashierContext = createContext<CashierContextType | undefined>(undefined);

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

  const [isBlockedByAdmin, setIsBlockedByAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_blocked_by_admin') === 'true';
    } catch {
      return false;
    }
  });

  const [blockedReason, setBlockedReason] = useState<string>(() => {
    try {
      return localStorage.getItem('pos_blocked_reason') || '';
    } catch {
      return '';
    }
  });

  // Load persisted session if available
  const [session, setSession] = useState<CashSession>(() => {
    try {
      const saved = localStorage.getItem('pos_cash_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse pos_cash_session from localStorage', e);
    }
    return DEFAULT_SESSION;
  });

  const [hasActiveSession, setHasActiveSession] = useState<boolean>(() => !session.isClosed);

  // Load persisted movements
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => {
    try {
      const saved = localStorage.getItem('pos_cash_movements');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse pos_cash_movements from localStorage', e);
    }
    return INITIAL_MOVEMENTS;
  });

  // Load session history
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>(() => {
    try {
      const saved = localStorage.getItem('pos_cash_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse pos_cash_history from localStorage', e);
    }
    return [];
  });

  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // Keep refs for callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const movementsRef = useRef(cashMovements);
  movementsRef.current = cashMovements;
  const historyRef = useRef(sessionHistory);
  historyRef.current = sessionHistory;

  // Persist helper
  const persistState = (
    newSession?: CashSession,
    newMovements?: CashMovement[],
    newHistory?: CashSession[]
  ) => {
    try {
      if (newSession !== undefined) {
        localStorage.setItem('pos_cash_session', JSON.stringify(newSession));
      }
      if (newMovements !== undefined) {
        localStorage.setItem('pos_cash_movements', JSON.stringify(newMovements));
      }
      if (newHistory !== undefined) {
        localStorage.setItem('pos_cash_history', JSON.stringify(newHistory));
      }
    } catch (err) {
      console.warn('Error saving cash state to localStorage', err);
    }
  };

  // Setup WebSocket listeners and cross-tab storage sync
  useEffect(() => {
    const unsubConnection = cashSyncSocket.onConnectionChange(setIsWsConnected);

    const unsubMessages = cashSyncSocket.subscribe((msg: CashSyncMessage) => {
      if (msg.type === 'DRAWER_OPENED') {
        const newSession = msg.payload.session;
        const newMovements = msg.payload.movements || [];
        setSession(newSession);
        setCashMovements(newMovements);
        setHasActiveSession(!newSession.isClosed);
        persistState(newSession, newMovements);
      } else if (msg.type === 'DRAWER_CLOSED') {
        const closedSession = msg.payload.session;
        setSession(closedSession);
        setHasActiveSession(false);
        setSessionHistory((prev) => {
          const updated = [closedSession, ...prev.filter((s) => s.startedAt !== closedSession.startedAt)];
          persistState(closedSession, undefined, updated);
          return updated;
        });
      } else if (msg.type === 'CASH_MOVEMENT') {
        const { movement, session: updatedSession } = msg.payload;
        if (updatedSession) {
          setSession(updatedSession);
        }
        if (movement) {
          setCashMovements((prev) => {
            if (prev.some((m) => m.id === movement.id)) return prev;
            const updated = [movement, ...prev];
            persistState(updatedSession, updated);
            return updated;
          });
        }
      } else if (msg.type === 'CASH_SALE' || msg.type === 'CASH_REFUND') {
        const updatedSession = msg.payload.session;
        if (updatedSession) {
          setSession(updatedSession);
          persistState(updatedSession);
        }
      } else if (msg.type === 'SYNC_CASH_STATE') {
        if (msg.payload.session) {
          setSession(msg.payload.session);
          setHasActiveSession(!msg.payload.session.isClosed);
        }
        if (Array.isArray(msg.payload.movements)) {
          setCashMovements(msg.payload.movements);
        }
        if (Array.isArray(msg.payload.history)) {
          setSessionHistory(msg.payload.history);
        }
        persistState(msg.payload.session, msg.payload.movements, msg.payload.history);
      } else if (msg.type === 'REQUEST_SYNC') {
        // Send our current state if we have it
        if (sessionRef.current) {
          cashSyncSocket.send({
            type: 'SYNC_CASH_STATE',
            payload: {
              session: sessionRef.current,
              movements: movementsRef.current,
              history: historyRef.current,
            },
          });
        }
      }
    });

    // Cross-tab storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos_cash_session' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSession(parsed);
          setHasActiveSession(!parsed.isClosed);
        } catch {}
      } else if (e.key === 'pos_cash_movements' && e.newValue) {
        try {
          setCashMovements(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === 'pos_cash_history' && e.newValue) {
        try {
          setSessionHistory(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      unsubConnection();
      unsubMessages();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Listen to Staff & Terminal Operators WebSocket synchronization in real-time
  const cashierRef = useRef(cashier);
  cashierRef.current = cashier;

  useEffect(() => {
    const unsub = operatorSyncSocket.subscribe((msg: OperatorSyncMessage) => {
      if (msg.type === 'OPERATOR_STATUS_CHANGED') {
        const { id, status, handle, name } = msg.payload;
        const currentName = cashierRef.current?.name || '';

        const isCurrentCashier =
          id === 'op-cashier-1' ||
          (handle && handle.toLowerCase().includes('cashier')) ||
          (name && currentName.toLowerCase().includes(name.toLowerCase()));

        if (isCurrentCashier) {
          if (status === 'Blocked') {
            setIsBlockedByAdmin(true);
            const reasonMsg = `Terminal locked by Administrator: Operator Account (${name || handle || 'Cashier'}) has been suspended via real-time WebSocket.`;
            setBlockedReason(reasonMsg);
            setIsLocked(true);
            try {
              localStorage.setItem('pos_is_locked', 'true');
              localStorage.setItem('pos_blocked_by_admin', 'true');
              localStorage.setItem('pos_blocked_reason', reasonMsg);
            } catch {}
          } else if (status === 'Active') {
            setIsBlockedByAdmin(false);
            setBlockedReason('');
            try {
              localStorage.removeItem('pos_blocked_by_admin');
              localStorage.removeItem('pos_blocked_reason');
            } catch {}
          }
        }
      } else if (msg.type === 'SYNC_OPERATORS') {
        const currentName = cashierRef.current?.name || '';
        const cashierOp = msg.payload.find(
          (op) =>
            op.id === 'op-cashier-1' ||
            op.handle.toLowerCase().includes('cashier') ||
            currentName.toLowerCase().includes(op.name.toLowerCase())
        );
        if (cashierOp) {
          if (cashierOp.status === 'Blocked') {
            setIsBlockedByAdmin(true);
            const reasonMsg = `Terminal locked by Administrator: Operator Account (${cashierOp.name}) has been suspended.`;
            setBlockedReason(reasonMsg);
            setIsLocked(true);
            try {
              localStorage.setItem('pos_is_locked', 'true');
              localStorage.setItem('pos_blocked_by_admin', 'true');
              localStorage.setItem('pos_blocked_reason', reasonMsg);
            } catch {}
          } else {
            setIsBlockedByAdmin(false);
            setBlockedReason('');
            try {
              localStorage.removeItem('pos_blocked_by_admin');
              localStorage.removeItem('pos_blocked_reason');
            } catch {}
          }
        }
      }
    });

    return () => unsub();
  }, []);

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
    if (isBlockedByAdmin) return false;
    try {
      const storedOps = localStorage.getItem('chill_choc_operators');
      const ops = storedOps ? JSON.parse(storedOps) : DEFAULT_OPERATORS;
      const matchingOp = ops.find((o: any) => o.pin === pin);
      if (matchingOp) {
        return matchingOp.status === 'Active';
      }
    } catch {}
    return false;
  };

  const lockPOS = () => {
    setIsLocked(true);
    try {
      localStorage.setItem('pos_is_locked', 'true');
    } catch {}
  };

  const unlockPOS = (pin: string) => {
    if (isBlockedByAdmin) {
      return false;
    }

    // Verify strictly against admin added active operators only
    try {
      const storedOps = localStorage.getItem('chill_choc_operators');
      const ops = storedOps ? JSON.parse(storedOps) : DEFAULT_OPERATORS;
      const matchingOp = ops.find((o: any) => o.pin === pin);
      if (matchingOp && matchingOp.status === 'Active') {
        setIsLocked(false);
        try {
          localStorage.removeItem('pos_is_locked');
        } catch {}
        return true;
      }
    } catch {}

    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsLocked(false);
    try {
      localStorage.removeItem('pos_is_locked');
    } catch {}
  };

  // Start new cashier session / Open Drawer
  const startSession = (openingAmount: number) => {
    const today = getTodayDateStr();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newSession: CashSession = {
      ...DEFAULT_SESSION,
      cashier: cashier.name,
      openingCash: openingAmount,
      startedAt: timeStr,
      businessDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      sessionDate: today,
      cashSales: 0,
      cashRefunds: 0,
      cashExpenses: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingAmount,
      countedCash: undefined,
      difference: 0,
      isClosed: false,
    };

    const initialMovement: CashMovement = {
      id: `cm-flt-${Date.now()}`,
      type: 'Cash In',
      amount: openingAmount,
      reason: 'Opening Drawer Float',
      timestamp: timeStr,
      cashier: cashier.name,
      reference: 'FLT-01',
      date: today,
    };

    setSession(newSession);
    setCashMovements([initialMovement]);
    setHasActiveSession(true);
    persistState(newSession, [initialMovement]);

    // Broadcast in real-time over WebSocket & BroadcastChannel
    cashSyncSocket.send({
      type: 'DRAWER_OPENED',
      payload: {
        session: newSession,
        movements: [initialMovement],
      },
    });
  };

  // Close cashier session / Close Drawer & Reconcile
  const endSession = (countedCash: number, differenceReason?: string) => {
    const diff = countedCash - session.expectedCash;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const closedSession: CashSession = {
      ...session,
      countedCash,
      difference: diff,
      differenceReason: differenceReason || '',
      closedAt: timeStr,
      isClosed: true,
    };

    const updatedHistory = [closedSession, ...sessionHistory];

    setSession(closedSession);
    setHasActiveSession(false);
    setSessionHistory(updatedHistory);
    persistState(closedSession, undefined, updatedHistory);

    // Broadcast in real-time over WebSocket & BroadcastChannel
    cashSyncSocket.send({
      type: 'DRAWER_CLOSED',
      payload: {
        session: closedSession,
      },
    });
  };

  // Record cash movements (Cash In, Cash Out, Expense, Bank Drop, Petty Cash)
  const recordMovement = (movement: Omit<CashMovement, 'id' | 'timestamp' | 'cashier'>) => {
    const today = getTodayDateStr();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newMovement: CashMovement = {
      ...movement,
      id: `cm-${Date.now()}`,
      timestamp: timeStr,
      cashier: cashier.name,
      date: today,
    };

    let cashIn = session.cashIn;
    let cashOut = session.cashOut;
    let cashExpenses = session.cashExpenses;

    if (movement.type === 'Cash In') {
      cashIn += movement.amount;
    } else if (movement.type === 'Cash Out' || movement.type === 'Bank Drop') {
      cashOut += movement.amount;
    } else if (movement.type === 'Expense' || movement.type === 'Petty Cash') {
      cashExpenses += movement.amount;
    }

    const expected = session.openingCash + session.cashSales - session.cashRefunds - cashExpenses + cashIn - cashOut;

    const updatedSession: CashSession = {
      ...session,
      cashIn,
      cashOut,
      cashExpenses,
      expectedCash: expected,
    };

    const updatedMovements = [newMovement, ...cashMovements];

    setSession(updatedSession);
    setCashMovements(updatedMovements);
    persistState(updatedSession, updatedMovements);

    // Broadcast in real-time over WebSocket & BroadcastChannel
    cashSyncSocket.send({
      type: 'CASH_MOVEMENT',
      payload: {
        movement: newMovement,
        session: updatedSession,
      },
    });
  };

  // Record Cash Sales from POS Orders
  const recordSaleCash = (amount: number) => {
    if (amount <= 0) return;

    const newCashSales = session.cashSales + amount;
    const expected = session.openingCash + newCashSales - session.cashRefunds - session.cashExpenses + session.cashIn - session.cashOut;

    const updatedSession: CashSession = {
      ...session,
      cashSales: newCashSales,
      expectedCash: expected,
    };

    setSession(updatedSession);
    persistState(updatedSession);

    // Broadcast in real-time
    cashSyncSocket.send({
      type: 'CASH_SALE',
      payload: {
        amount,
        session: updatedSession,
      },
    });
  };

  // Record Cash Refund from Return Desk
  const recordRefundCash = (amount: number) => {
    if (amount <= 0) return;

    const newCashRefunds = session.cashRefunds + amount;
    const expected = session.openingCash + session.cashSales - newCashRefunds - session.cashExpenses + session.cashIn - session.cashOut;

    const updatedSession: CashSession = {
      ...session,
      cashRefunds: newCashRefunds,
      expectedCash: expected,
    };

    setSession(updatedSession);
    persistState(updatedSession);

    // Broadcast in real-time
    cashSyncSocket.send({
      type: 'CASH_REFUND',
      payload: {
        amount,
        session: updatedSession,
      },
    });
  };

  return (
    <CashierContext.Provider
      value={{
        cashier,
        isLoggedIn,
        isLocked,
        isBlockedByAdmin,
        blockedReason,
        hasActiveSession,
        session,
        cashMovements,
        sessionHistory,
        isWsConnected,
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
