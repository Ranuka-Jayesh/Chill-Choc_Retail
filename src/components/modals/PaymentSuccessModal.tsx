import React, { useEffect, useRef } from 'react';
import { CompletedSale } from '@/types';
import { usePrinter } from '@/hooks/usePrinter';
import { useToast } from '@/stores/toastStore';
import { generateReceiptPdf } from '@/services/receiptPdfGenerator';
import { Check, Printer, X, FileText } from 'lucide-react';
import { PrintableReceiptPortal } from '@/components/pos/PrintableReceiptPortal';

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
  onPrintReceipt: _onPrintReceipt,
  onViewReceipt,
}) => {
  const { isConnected, printReceipt } = usePrinter();
  const { showToast } = useToast();
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

      const triggerPrint = async () => {
        try {
          if (isConnected) {
            const pdfBase64 = await generateReceiptPdf(sale);
            await printReceipt({
              format: 'pdf',
              data: pdfBase64,
              jobId: 'receipt-' + (sale.invoiceNumber || sale.id),
            });
            showToast(`Receipt sent to printer (${sale.invoiceNumber})`, 'success');
          }
        } catch (err: any) {
          console.error('Failed receipt print:', err);
        }
      };

      // Immediate print dispatch with zero artificial latency
      triggerPrint();
    }
  }, [isOpen, sale, isConnected, printReceipt, showToast]);

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
        // Prevent instant dismissal from the payment confirmation keystroke (500ms grace period)
        if (Date.now() - openTimeRef.current < 500) {
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
    <>
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
              <span className="truncate">
                {isConnected ? 'Receipt sent to printer' : 'Sale completed successfully'}
              </span>
            </div>

            {/* Buttons: Clean Done Button & View Receipt option */}
            <div className="w-full space-y-2 mt-3.5">
              <button
                type="button"
                onClick={handleCloseAndNewSale}
                className="w-full h-10 rounded-xl bg-black hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-xs tracking-wide transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Done</span>
                <span className="text-[10px] text-zinc-400 font-mono font-normal">↵</span>
              </button>

              {onViewReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewReceipt(sale);
                  }}
                  className="w-full h-8 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-[0.98] text-zinc-700 font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3 h-3 text-zinc-500" />
                  <span>View / Reprint Receipt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fallback Unconstrained Browser Print Portal */}
      <PrintableReceiptPortal sale={sale} paperWidth={80} />
    </>
  );
};
