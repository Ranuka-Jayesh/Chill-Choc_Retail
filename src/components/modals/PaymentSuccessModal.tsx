import React, { useEffect, useRef } from 'react';
import { CompletedSale } from '@/types';
import { Check, Printer, X } from 'lucide-react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: CompletedSale | null;
  onNewSale: () => void;
  onPrintReceipt?: (sale: CompletedSale) => void;
  onViewReceipt?: (sale: CompletedSale) => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  sale,
  onNewSale,
}) => {
  const openTimeRef = useRef<number>(0);
  const printedInvoiceRef = useRef<string | null>(null);

  const handleCloseAndNewSale = () => {
    onClose();
    onNewSale();
  };

  // Record open timestamp & trigger auto-print
  useEffect(() => {
    if (!isOpen || !sale) return;

    openTimeRef.current = Date.now();

    // Auto-trigger printing once per completed invoice
    if (printedInvoiceRef.current !== sale.invoiceNumber) {
      printedInvoiceRef.current = sale.invoiceNumber;
      const printTimer = setTimeout(() => {
        try {
          window.print();
        } catch {
          // Ignore if printing dialog is cancelled or unavailable in browser environment
        }
      }, 400);

      return () => clearTimeout(printTimer);
    }
  }, [isOpen, sale]);

  // Keyboard navigation: Enter / Escape / Space to dismiss & start new sale
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCloseAndNewSale();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        // Prevent instant dismissal from the payment confirmation keystroke (600ms grace period)
        if (Date.now() - openTimeRef.current < 600) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleCloseAndNewSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const totalPaid =
    sale.tenders && sale.tenders.length > 0
      ? sale.tenders.reduce((sum, t) => sum + t.amount, 0)
      : sale.total + (sale.change || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={handleCloseAndNewSale}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col p-5 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={handleCloseAndNewSale}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Graphic: paymentdone.png */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/paymentdone.png"
            alt="Payment Done"
            className="w-44 h-44 sm:w-48 sm:h-48 object-contain drop-shadow-sm select-none pointer-events-none -mt-2 -mb-2"
          />

          {/* Invoice Number Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#FF5500] font-mono text-xs font-black shadow-2xs mt-1">
            <span>{sale.invoiceNumber}</span>
          </div>

          {/* Transaction Summary Card */}
          <div className="w-full mt-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Customer</span>
              <span className="font-bold text-zinc-900 truncate max-w-[180px]">
                {sale.customer?.name || 'Walk-in Customer'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Paid</span>
              <span className="font-mono font-bold text-zinc-900">
                Rs. {totalPaid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-t border-zinc-200/80 my-1" />

            <div className="flex items-center justify-between">
              <span className="font-black text-zinc-900 uppercase tracking-wide text-[11px]">
                Change Due
              </span>
              <span className="font-mono text-base font-black text-emerald-600">
                Rs. {(sale.change || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Automatic Print Status Notice */}
          <div className="w-full mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600 font-medium bg-emerald-50/80 border border-emerald-200/70 rounded-xl py-1 px-2.5 shadow-2xs">
            <Printer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Printing receipt automatically...</span>
          </div>

          {/* Clean Done Button */}
          <button
            type="button"
            onClick={handleCloseAndNewSale}
            className="w-full h-9 mt-3 rounded-xl bg-black hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-xs tracking-wide transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Done</span>
            <span className="text-[10px] text-zinc-400 font-mono font-normal">↵</span>
          </button>
        </div>

        {/* Hidden 80mm Thermal Receipt for window.print() */}
        <div id="thermal-receipt" className="hidden print:block text-black font-mono text-[11px] leading-relaxed">
          {/* Header */}
          <div className="text-center pb-1.5 border-b border-dashed border-zinc-300">
            <img
              src="/logo.png"
              alt="Chill & Choc"
              className="h-9 w-auto mx-auto object-contain mb-1"
            />
            <h2 className="text-xs font-black tracking-tight text-black">CHILL & CHOC</h2>
            <p className="text-[9px] font-bold text-[#FF5500] tracking-wider uppercase">
              COOL VIBES, SWEET BITES
            </p>
            <p className="text-[9px] text-zinc-400 mt-0.5">
              Colombo Flagship Branch &bull; +94 11 234 5678
            </p>
          </div>

          {/* Meta Info */}
          <div className="text-[10px] space-y-0.5 pb-1.5 border-b border-dashed border-zinc-300">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>
                {sale.date} • {sale.timestamp}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.cashier}</span>
            </div>
            {sale.customer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{sale.customer.name}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-1 py-1 border-b border-dashed border-zinc-300">
            {sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="truncate pr-1">{item.product.name}</span>
                  <span className="tabular-numbers">
                    {(item.unitPrice * item.quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400">
                  <span>
                    {item.quantity} &times; Rs. {item.unitPrice.toLocaleString()} ({item.product.weight})
                  </span>
                  {item.salesperson && (
                    <span>TM: {item.salesperson.name.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-0.5 text-[11px] py-1 border-b border-dashed border-zinc-300">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="tabular-numbers">Rs. {sale.subtotal.toLocaleString()}</span>
            </div>
            {sale.discountTotal > 0 && (
              <div className="flex justify-between text-[#FF5500]">
                <span>Discount:</span>
                <span className="tabular-numbers">- Rs. {sale.discountTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xs pt-1 text-black">
              <span>TOTAL:</span>
              <span className="tabular-numbers">Rs. {sale.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Tenders & Change */}
          <div className="space-y-0.5 text-[10px] py-1 border-b border-dashed border-zinc-300">
            {sale.tenders.map((t, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize">{t.method}:</span>
                <span className="tabular-numbers">Rs. {t.amount.toLocaleString()}</span>
              </div>
            ))}
            {sale.change > 0 && (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Change Given:</span>
                <span className="tabular-numbers">Rs. {sale.change.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-1 space-y-1">
            <p className="text-[10px] font-bold text-black">Thank you for visiting!</p>
            <p className="text-[8px] text-zinc-400 uppercase tracking-wider">
              Cool Vibes, Sweet Bites &bull; Keep for Returns
            </p>
            <div className="py-1 flex flex-col items-center">
              <div className="h-6 w-36 bg-gradient-to-r from-black via-transparent to-black flex items-center justify-center tracking-widest text-[7px] font-bold">
                ||||| | |||| ||| || |||||| | |||
              </div>
              <span className="text-[8px] text-zinc-400 tracking-widest mt-0.5">
                *{sale.invoiceNumber}*
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

