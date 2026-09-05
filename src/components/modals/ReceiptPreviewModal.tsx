import React from 'react';
import { Modal } from '@/components/common/Modal';
import { CompletedSale } from '@/types';
import { Printer, X } from 'lucide-react';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: CompletedSale | null;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handlePrint}
      title="Thermal Receipt Preview"
      subtitle="80mm Thermal Receipt Simulation"
      maxWidth="xs"
    >
      <div className="space-y-2.5 select-none">
        {/* Thermal Receipt Body */}
        <div
          id="thermal-receipt"
          className="bg-white p-3 rounded-lg border border-zinc-300 text-black font-mono text-[11px] shadow-2xs space-y-2 leading-relaxed max-h-[50vh] overflow-y-auto"
        >
          {/* Receipt Header */}
          <div className="text-center pb-1.5 border-b border-dashed border-zinc-300">
            <img
              src="/logo.png"
              alt="Chill & Choc"
              className="h-9 w-auto mx-auto object-contain mb-1"
            />
            <h2 className="text-xs font-black tracking-tight text-black">
              CHILL & CHOC
            </h2>
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
              <span>{sale.date} • {sale.timestamp}</span>
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
            <p className="text-[10px] font-bold text-black">
              Thank you for visiting!
            </p>
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

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Close</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#FF5500] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E04B00] transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            <Printer className="w-3 h-3" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
