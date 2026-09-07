import React, { useEffect, useRef, useState } from 'react';
import { CompletedSale } from '@/types';
import { usePrinter } from '@/hooks/usePrinter';
import { useToast } from '@/stores/toastStore';
import { generateReceiptPdf, downloadReceiptPdf } from '@/services/receiptPdfGenerator';
import { ThermalReceiptContent } from '@/components/pos/ThermalReceiptContent';
import { PrintableReceiptPortal } from '@/components/pos/PrintableReceiptPortal';
import { Printer, Download } from 'lucide-react';

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
  const { isConnected, printReceipt, isPrinting } = usePrinter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openTimeRef = useRef<number>(0);
  const printedInvoiceRef = useRef<string | null>(null);

  const handleCloseAndNewSale = () => {
    onClose();
    onNewSale();
  };

  // Record open timestamp & trigger silent PDF print
  useEffect(() => {
    if (!isOpen || !sale) return;

    openTimeRef.current = Date.now();

    // Auto-trigger printing once per completed invoice
    if (printedInvoiceRef.current !== sale.invoiceNumber) {
      printedInvoiceRef.current = sale.invoiceNumber;

      const triggerSilentPrint = async () => {
        try {
          const pdfBase64 = await generateReceiptPdf(sale);
          if (isConnected) {
            await printReceipt({
              format: 'pdf',
              data: pdfBase64,
              jobId: 'receipt-' + (sale.invoiceNumber || sale.id),
            });
            showToast(`Receipt sent to printer (${sale.invoiceNumber})`, 'success');
          } else {
            setTimeout(() => {
              try {
                window.print();
              } catch {
                // Ignore
              }
            }, 300);
          }
        } catch (err: any) {
          console.error('Failed silent receipt print:', err);
          showToast(`Print failed: ${err.message || 'Check printer agent'}`, 'error');
        }
      };

      const printTimer = setTimeout(triggerSilentPrint, 250);
      return () => clearTimeout(printTimer);
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

  const handleManualPrint = async () => {
    if (!sale) return;
    try {
      setIsSubmitting(true);
      const pdfBase64 = await generateReceiptPdf(sale);
      if (isConnected) {
        await printReceipt({
          format: 'pdf',
          data: pdfBase64,
          jobId: 'receipt-' + (sale.invoiceNumber || sale.id),
        });
        showToast(`Receipt sent to printer (${sale.invoiceNumber})`, 'success');
      } else {
        window.print();
      }
    } catch (err: any) {
      showToast(`Print error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sale) return;
    try {
      setIsSubmitting(true);
      await downloadReceiptPdf(sale, { paperWidthMm: 80 });
      showToast(`Downloaded ${sale.invoiceNumber || 'receipt'}.pdf`, 'success');
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      showToast('Failed to download PDF', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
        onClick={handleCloseAndNewSale}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex flex-col items-center max-w-[360px] w-full max-h-[92vh] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* White Thermal Bill Card Matching Reference Design */}
          <div className="w-full bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[76vh] border border-zinc-200/90">
            <ThermalReceiptContent sale={sale} isPrintMode={false} />
          </div>

          {/* Bottom Actions: Charcoal Done, White Download PDF & Teal Print Receipt */}
          <div className="flex items-center justify-center gap-2.5 mt-4 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCloseAndNewSale}
              className="px-6 py-2.5 rounded-full bg-[#2A2A2A] hover:bg-[#383838] active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>Done</span>
              <span className="text-[10px] text-zinc-400 font-mono font-normal">↵</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-zinc-100 active:scale-95 text-zinc-900 font-bold text-xs tracking-wide transition-all shadow-md border border-zinc-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-700" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleManualPrint}
              disabled={isSubmitting || isPrinting}
              className="px-6 py-2.5 rounded-full bg-[#14B8A6] hover:bg-[#0D9488] active:scale-95 disabled:opacity-60 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-teal-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting || isPrinting ? 'Printing...' : 'Print Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Unconstrained Browser Print Portal */}
      <PrintableReceiptPortal sale={sale} paperWidth={80} />
    </>
  );
};
