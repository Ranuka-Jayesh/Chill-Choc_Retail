import React, { useState } from 'react';
import { CompletedSale } from '@/types';
import { usePrinter } from '@/hooks/usePrinter';
import { useToast } from '@/stores/toastStore';
import { generateReceiptPdf, downloadReceiptPdf } from '@/services/receiptPdfGenerator';
import { ThermalReceiptContent } from '@/components/pos/ThermalReceiptContent';
import { PrintableReceiptPortal } from '@/components/pos/PrintableReceiptPortal';
import { Printer, Download, Loader2 } from 'lucide-react';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: CompletedSale | null;
  onReturn?: (invoiceNumber: string) => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const { isConnected, printReceipt, isPrinting } = usePrinter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sale) return null;

  const handleDownloadPdf = async () => {
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

  const handlePrint = async () => {
    try {
      setIsSubmitting(true);
      const pdfBase64 = await generateReceiptPdf(sale, { paperWidthMm: 80 });

      if (isConnected) {
        await printReceipt({
          format: 'pdf',
          data: pdfBase64,
          jobId: 'receipt-' + (sale.invoiceNumber || sale.id),
        });
        showToast(`Receipt sent to printer (${sale.invoiceNumber})`, 'success');
      } else {
        showToast('POS Print Agent offline. Opening browser print dialog...', 'info');
        window.print();
      }
    } catch (err: any) {
      console.error('Failed to print receipt:', err);
      showToast(`Print failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex flex-col items-center max-w-[360px] w-full max-h-[92vh] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* White Thermal Bill Card */}
          <div className="w-full bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[76vh] border border-zinc-200/90">
            <ThermalReceiptContent sale={sale} isPrintMode={false} />
          </div>

          {/* Action Buttons Below Receipt */}
          <div className="flex items-center justify-center gap-3 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 rounded-full bg-[#2A2A2A] hover:bg-[#383838] active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center"
            >
              Done
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isSubmitting}
              title="Download PDF"
              aria-label="Download PDF"
              className="w-10 h-10 rounded-full bg-white hover:bg-zinc-100 active:scale-95 disabled:opacity-60 text-zinc-800 hover:text-black transition-all shadow-md border border-zinc-200/90 flex items-center justify-center cursor-pointer shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
              ) : (
                <Download className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isSubmitting || isPrinting}
              title="Print Receipt"
              aria-label="Print Receipt"
              className="w-10 h-10 rounded-full bg-[#14B8A6] hover:bg-[#0D9488] active:scale-95 disabled:opacity-60 text-white transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center cursor-pointer shrink-0"
            >
              {isSubmitting || isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Unconstrained Standard 80mm Browser Print Portal */}
      <PrintableReceiptPortal sale={sale} paperWidth={80} />
    </>
  );
};
