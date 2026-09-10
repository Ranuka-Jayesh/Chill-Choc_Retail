import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  POSPrintAgent,
  PrintOptions,
  PrintReceiptOptions,
  PrintResponse,
  AgentStatus,
} from '@/services/POSPrintAgent';

// Instantiate the singleton printer instance with autoReconnect disabled to prevent console polling spam when offline
export const printer = new POSPrintAgent({
  url: 'ws://127.0.0.1:17891',
  autoReconnect: false,
  reconnectInterval: 5000,
  maxReconnectAttempts: 0,
});

export interface PrinterContextType {
  isConnected: boolean;
  isPrinting: boolean;
  status: AgentStatus | null;
  printer: POSPrintAgent;
  printLabel: (options: PrintOptions) => Promise<PrintResponse>;
  printReceipt: (options: PrintReceiptOptions) => Promise<PrintResponse>;
  reconnect: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(printer.isConnected());
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    // Sync initial state
    setIsConnected(printer.isConnected());

    const unsubConnected = printer.on('connected', () => {
      setIsConnected(true);
      printer
        .getStatus()
        .then(setStatus)
        .catch(() => {});
    });

    const unsubDisconnected = printer.on('disconnected', () => {
      setIsConnected(false);
      setStatus(null);
    });

    const unsubStatus = printer.on('status', (info: { connected: boolean }) => {
      setIsConnected(info.connected);
      if (info.connected) {
        printer
          .getStatus()
          .then(setStatus)
          .catch(() => {});
      } else {
        setStatus(null);
      }
    });

    // Automatically attempt connection on app startup (no manual click needed)
    printer.connect().catch(() => {
      // Seamlessly falls back to browser printing if no desktop agent is running on port 17891
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubStatus();
    };
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await printer.connect();
      setIsConnected(printer.isConnected());
      if (printer.isConnected()) {
        localStorage.setItem('pos_hardware_printer_enabled', 'true');
      }
    } catch (err) {
      console.warn('Manual reconnect to POS Print Agent failed (no desktop service on port 17891):', err);
      setIsConnected(false);
      localStorage.removeItem('pos_hardware_printer_enabled');
      throw err;
    }
  }, []);

  const printLabel = useCallback(async (options: PrintOptions): Promise<PrintResponse> => {
    setIsPrinting(true);
    try {
      return await printer.printLabel(options);
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printReceipt = useCallback(async (options: PrintReceiptOptions): Promise<PrintResponse> => {
    setIsPrinting(true);
    try {
      return await printer.printReceipt(options);
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return (
    <PrinterContext.Provider
      value={{
        isConnected,
        isPrinting,
        status,
        printer,
        printLabel,
        printReceipt,
        reconnect,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = (): PrinterContextType => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};
