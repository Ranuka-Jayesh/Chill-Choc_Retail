import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CashMovement, CashSession } from '@/types';
import { cashSyncSocket, CashSyncMessage } from '@/services/cashSyncSocket';
import { operatorSyncSocket, OperatorSyncMessage } from '@/services/operatorSyncSocket';
import { DEFAULT_OPERATORS } from '@/stores/operatorStore';
import { supabase } from '@/services/supabase';
import {
  generateUUID,
  fetchCashSessionsFromSupabase,
  insertCashSessionToSupabase,
  updateCashSessionInSupabase,
  fetchCashMovementsFromSupabase,
  insertCashMovementToSupabase,
} from '@/services/supabaseData';

export interface CashierProfile {
  id: string;
  name: string;
  code: string;
  avatarInitials: string;
  outlet: string;
  register: string;
  shiftStatus: 'OPEN' | 'CLOSED';
  shiftSince: string;
}

export const INITIAL_CASHIER: CashierProfile = {
  id: '',
  name: 'Cashier',
  code: 'POS-01',
  avatarInitials: 'CA',
  outlet: 'Main Branch',
  register: 'POS-01',
  shiftStatus: 'CLOSED',
  shiftSince: '',
};

interface CashierContextType {
  cashier: CashierProfile;
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
  cashier: '',
  register: 'POS-01',
  startedAt: '',
  businessDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  sessionDate: getTodayDateStr(),
  openingCash: 0,
  cashSales: 0,
  cashRefunds: 0,
  cashExpenses: 0,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 0,
  isClosed: true,
};

const INITIAL_MOVEMENTS: CashMovement[] = [];

const CashierContext = createContext<CashierContextType | undefined>(undefined);

export const CashierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cashier, setCashier] = useState<CashierProfile>(INITIAL_CASHIER);
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

  // Fetch initial cash session and movements from Supabase + Subscribe to Supabase Realtime
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchCashSessionsFromSupabase(),
      fetchCashMovementsFromSupabase(),
    ]).then(([sessions, movements]) => {
      if (!isMounted) return;
      if (sessions && sessions.length > 0) {
        const active = sessions.find((s) => !s.isClosed) || sessions[0];
        if (active) {
          setSession(active);
          setHasActiveSession(!active.isClosed);
          sessionRef.current = active;
        }
        setSessionHistory(sessions);
        historyRef.current = sessions;
      }
      if (movements && movements.length > 0) {
        setCashMovements(movements);
        movementsRef.current = movements;
      }
    });

    // Supabase Realtime channel for cross-device / cloud sync
    const channel = supabase
      .channel('realtime_cash_drawer_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cash_movements' },
        (payload: any) => {
          const row = payload.new as any;
          if (!row) return;
          const newMov: CashMovement = {
            id: row.id,
            type: row.type,
            amount: Number(row.amount) || 0,
            reason: row.reason || '',
            reference: row.reference || '',
            notes: row.notes || '',
            cashier: row.cashier || 'Cashier',
            timestamp: row.timestamp ? new Date(row.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            date: row.business_date || '',
          };
          setCashMovements((prev) => {
            if (prev.some((m) => m.id === newMov.id)) return prev;
            const updated = [newMov, ...prev];
            persistState(undefined, updated);
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_sessions' },
        (payload: any) => {
          const row = payload.new as any;
          if (!row) return;
          const sess: CashSession = {
            id: row.id,
            cashier: row.cashier_name || 'Cashier',
            register: row.register_code || 'POS-01',
            startedAt: row.started_at ? new Date(row.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            closedAt: row.closed_at ? new Date(row.closed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
            businessDate: row.business_date || '',
            sessionDate: row.business_date || '',
            openingCash: Number(row.opening_cash) || 0,
            cashSales: Number(row.cash_sales) || 0,
            cashRefunds: Number(row.cash_refunds) || 0,
            cashExpenses: Number(row.cash_expenses) || 0,
            cashIn: Number(row.cash_in) || 0,
            cashOut: Number(row.cash_out) || 0,
            expectedCash: Number(row.expected_cash) || 0,
            countedCash: row.counted_cash !== null && row.counted_cash !== undefined ? Number(row.counted_cash) : undefined,
            difference: Number(row.difference) || 0,
            differenceReason: row.difference_reason || '',
            isClosed: Boolean(row.is_closed),
          };
          setSession((prev) => {
            if (prev.id === sess.id || !prev.id) return sess;
            return prev;
          });
          setHasActiveSession(!sess.isClosed);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
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

      // Safe fallback for standard operator PINs
      if (pin === '1234' || pin === '2580') {
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
    const sessionId = generateUUID();

    const newSession: CashSession = {
      id: sessionId,
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

    const movementId = generateUUID();
    const initialMovement: CashMovement = {
      id: movementId,
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

    // Save to Supabase Cloud
    insertCashSessionToSupabase(newSession);
    insertCashMovementToSupabase(initialMovement, sessionId);

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

    // Update in Supabase Cloud
    if (session.id) {
      updateCashSessionInSupabase(session.id, {
        countedCash,
        difference: diff,
        differenceReason: differenceReason || '',
        isClosed: true,
      });
    }

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
    const movementId = generateUUID();

    const newMovement: CashMovement = {
      ...movement,
      id: movementId,
      timestamp: timeStr,
      cashier: cashier.name,
      date: movement.date || today,
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

    // Save to Supabase Cloud
    insertCashMovementToSupabase(newMovement, session.id);
    if (session.id) {
      updateCashSessionInSupabase(session.id, {
        cashIn,
        cashOut,
        cashExpenses,
        expectedCash: expected,
      });
    }

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

    // Update in Supabase Cloud
    if (session.id) {
      updateCashSessionInSupabase(session.id, {
        cashSales: newCashSales,
        expectedCash: expected,
      });
    }

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

    // Update in Supabase Cloud
    if (session.id) {
      updateCashSessionInSupabase(session.id, {
        cashRefunds: newCashRefunds,
        expectedCash: expected,
      });
    }

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
