import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { OperatorCredential, OperatorRole } from '@/types';
import { operatorSyncSocket, OperatorSyncMessage } from '@/services/operatorSyncSocket';
import {
  fetchOperatorsFromSupabase,
  insertOperatorToSupabase,
  updateOperatorInSupabase,
  deleteOperatorFromSupabase,
  generateUUID,
} from '@/services/supabaseData';

interface OperatorContextType {
  operators: OperatorCredential[];
  isWsConnected: boolean;
  addOperator: (operator: Omit<OperatorCredential, 'id' | 'createdAt'>) => OperatorCredential;
  updateOperator: (id: string, updates: Partial<OperatorCredential>) => void;
  deleteOperator: (id: string) => void;
  toggleStatus: (id: string) => void;
  getOperatorByPin: (pin: string) => OperatorCredential | undefined;
  getOperatorByHandle: (handle: string) => OperatorCredential | undefined;
  isOperatorBlocked: (handleOrId: string) => boolean;
}

const STORAGE_KEY = 'chill_choc_operators';

export const DEFAULT_OPERATORS: OperatorCredential[] = [];

const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

export const OperatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operators, setOperators] = useState<OperatorCredential[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse operators from localStorage', e);
    }
    return DEFAULT_OPERATORS;
  });

  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const operatorsRef = useRef(operators);
  operatorsRef.current = operators;

  const persistOperators = (newList: OperatorCredential[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (err) {
      console.warn('Error saving operators to localStorage', err);
    }
  };

  // Fetch initial operators from Supabase cloud database
  useEffect(() => {
    let isMounted = true;
    fetchOperatorsFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setOperators(data);
        persistOperators(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Setup WebSocket listeners and cross-tab storage sync
  useEffect(() => {
    const unsubConnection = operatorSyncSocket.onConnectionChange(setIsWsConnected);

    const unsubMessages = operatorSyncSocket.subscribe((msg: OperatorSyncMessage) => {
      if (msg.type === 'OPERATOR_STATUS_CHANGED') {
        const { id, status } = msg.payload;
        setOperators((prev) => {
          const updated = prev.map((op) => (op.id === id ? { ...op, status } : op));
          persistOperators(updated);
          return updated;
        });
      } else if (msg.type === 'OPERATOR_CREATED') {
        const newOp = msg.payload;
        setOperators((prev) => {
          if (prev.some((op) => op.id === newOp.id)) return prev;
          const updated = [...prev, newOp];
          persistOperators(updated);
          return updated;
        });
      } else if (msg.type === 'OPERATOR_UPDATED') {
        const updatedOp = msg.payload;
        setOperators((prev) => {
          const updated = prev.map((op) => (op.id === updatedOp.id ? updatedOp : op));
          persistOperators(updated);
          return updated;
        });
      } else if (msg.type === 'OPERATOR_DELETED') {
        const { id } = msg.payload;
        setOperators((prev) => {
          const updated = prev.filter((op) => op.id !== id);
          persistOperators(updated);
          return updated;
        });
      } else if (msg.type === 'SYNC_OPERATORS') {
        if (Array.isArray(msg.payload) && msg.payload.length > 0) {
          setOperators(msg.payload);
          persistOperators(msg.payload);
        }
      } else if (msg.type === 'REQUEST_SYNC') {
        if (operatorsRef.current && operatorsRef.current.length > 0) {
          operatorSyncSocket.send({
            type: 'SYNC_OPERATORS',
            payload: operatorsRef.current,
          });
        }
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOperators(parsed);
          }
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

  const addOperator = (data: Omit<OperatorCredential, 'id' | 'createdAt'>): OperatorCredential => {
    let defaultColor: OperatorCredential['avatarColor'] = 'slate';
    if (data.role === 'ADMIN') defaultColor = 'teal';
    else if (data.role === 'CASHIER') defaultColor = 'gold';
    else if (data.role === 'MANAGER') defaultColor = 'indigo';

    const newOperator: OperatorCredential = {
      ...data,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      avatarColor: data.avatarColor || defaultColor,
      handle: data.handle.startsWith('@') ? data.handle : `@${data.handle}`,
    };

    const updated = [...operators, newOperator];
    setOperators(updated);
    persistOperators(updated);

    // Sync to Supabase cloud
    insertOperatorToSupabase(newOperator);

    operatorSyncSocket.send({
      type: 'OPERATOR_CREATED',
      payload: newOperator,
    });

    return newOperator;
  };

  const updateOperator = (id: string, updates: Partial<OperatorCredential>) => {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.handle && !cleanUpdates.handle.startsWith('@')) {
      cleanUpdates.handle = `@${cleanUpdates.handle}`;
    }

    let changedOp: OperatorCredential | undefined;
    const updated = operators.map((op) => {
      if (op.id === id) {
        changedOp = { ...op, ...cleanUpdates };
        return changedOp;
      }
      return op;
    });

    setOperators(updated);
    persistOperators(updated);

    // Sync to Supabase cloud
    updateOperatorInSupabase(id, cleanUpdates);

    if (changedOp) {
      operatorSyncSocket.send({
        type: 'OPERATOR_UPDATED',
        payload: changedOp,
      });
    }
  };

  const deleteOperator = (id: string) => {
    const updated = operators.filter((op) => op.id !== id);
    setOperators(updated);
    persistOperators(updated);

    // Sync to Supabase cloud
    deleteOperatorFromSupabase(id);

    operatorSyncSocket.send({
      type: 'OPERATOR_DELETED',
      payload: { id },
    });
  };

  const toggleStatus = (id: string) => {
    let targetOp: OperatorCredential | undefined;
    const updated = operators.map((op) => {
      if (op.id === id) {
        const nextStatus = op.status === 'Active' ? 'Blocked' : 'Active';
        targetOp = { ...op, status: nextStatus };
        return targetOp;
      }
      return op;
    });

    setOperators(updated);
    persistOperators(updated);

    if (targetOp) {
      // Sync to Supabase cloud
      updateOperatorInSupabase(id, { status: targetOp.status });

      operatorSyncSocket.send({
        type: 'OPERATOR_STATUS_CHANGED',
        payload: {
          id: targetOp.id,
          status: targetOp.status,
          handle: targetOp.handle,
          name: targetOp.name,
          role: targetOp.role,
        },
      });
    }
  };

  const getOperatorByPin = (pin: string): OperatorCredential | undefined => {
    return operators.find((op) => op.pin === pin);
  };

  const getOperatorByHandle = (handle: string): OperatorCredential | undefined => {
    const clean = handle.trim().toLowerCase().replace(/^@/, '');
    return operators.find((op) => op.handle.toLowerCase().replace(/^@/, '') === clean);
  };

  const isOperatorBlocked = (handleOrId: string): boolean => {
    const clean = handleOrId.trim().toLowerCase().replace(/^@/, '');
    const op = operators.find(
      (o) => o.id.toLowerCase() === clean || o.handle.toLowerCase().replace(/^@/, '') === clean
    );
    return op ? op.status === 'Blocked' : false;
  };

  return (
    <OperatorContext.Provider
      value={{
        operators,
        isWsConnected,
        addOperator,
        updateOperator,
        deleteOperator,
        toggleStatus,
        getOperatorByPin,
        getOperatorByHandle,
        isOperatorBlocked,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
};

export const useOperators = () => {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperators must be used within an OperatorProvider');
  }
  return context;
};
