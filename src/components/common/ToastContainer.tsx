import React from 'react';
import { useToast } from '@/stores/toastStore';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-brand-border shadow-card text-xs font-semibold text-brand-brown animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-brand-orange flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-brand-teal flex-shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-brand-muted hover:text-brand-brown transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
