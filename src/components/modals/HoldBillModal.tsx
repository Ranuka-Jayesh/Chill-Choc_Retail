import React, { useState, useEffect, useRef } from 'react';
import { CartItem, Customer } from '@/types';
import { Bookmark, User, FileText, X } from 'lucide-react';
import { useHeldBills } from '@/stores/heldBillsStore';
import { useCart } from '@/stores/cartStore';
import { useToast } from '@/stores/toastStore';

interface HoldBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  currentCustomer: Customer;
}

export const HoldBillModal: React.FC<HoldBillModalProps> = ({
  isOpen,
  onClose,
  items,
  total,
  currentCustomer,
}) => {
  const { holdBill } = useHeldBills();
  const { clearCart } = useCart();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');

  const customerInputRef = useRef<HTMLInputElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerName(currentCustomer.isWalkIn ? '' : currentCustomer.name);
      setNote('');
    }
  }, [isOpen, currentCustomer]);

  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleHold = () => {
    const cust: Customer = {
      id: currentCustomer.id,
      name: customerName.trim() || currentCustomer.name,
      phone: currentCustomer.phone,
      isWalkIn: !customerName.trim() && currentCustomer.isWalkIn,
    };

    const holdCode = holdBill(items, total, cust, note.trim());
    clearCart();
    showToast(`Bill parked as ${holdCode}`, 'success');
    onClose();
  };

  // Keyboard listener: Escape to close, 1st Enter (when outside inputs) to activate 1st field
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        // If neither input is active, 1st Enter activates 1st field
        if (activeEl !== customerInputRef.current && activeEl !== reasonInputRef.current) {
          e.preventDefault();
          e.stopPropagation();
          customerInputRef.current?.focus();
          customerInputRef.current?.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-[520px] overflow-hidden flex flex-row animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: hold.png mascot (seamless white, no background, bigger size) */}
        <div className="w-[200px] sm:w-[220px] p-3 sm:p-4 flex flex-col items-center justify-center shrink-0 select-none">
          <img
            src="/hold.png"
            alt="Hold Bill Mascot"
            className="w-full max-w-[190px] h-auto max-h-[190px] sm:max-h-[210px] object-contain drop-shadow-md select-none pointer-events-none transition-transform hover:scale-105 duration-200"
          />
        </div>

        {/* Right Side: Header, Summary, Inputs, Actions */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-black leading-tight">Hold Bill</h4>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-snug">
                Park cart to serve next customer
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Items & Total Summary Box */}
          <div className="p-2 rounded-xl bg-orange-50/80 border border-orange-200/60 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#FF5500] block leading-none">
                Items
              </span>
              <span className="text-xs font-bold text-black block mt-0.5">
                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block leading-none">
                Total
              </span>
              <span className="text-xs font-black text-black font-mono tabular-numbers block mt-0.5">
                Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-2">
            {/* 1st Field: Customer */}
            <div>
              <label className="block text-[11px] font-bold text-black mb-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#FF5500]" />
                <span>Customer (Optional)</span>
              </label>
              <input
                ref={customerInputRef}
                type="text"
                placeholder="e.g. Dinuka / Walk-in"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    reasonInputRef.current?.focus();
                    reasonInputRef.current?.select();
                  }
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200/90 bg-zinc-50 focus:bg-white text-xs font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all shadow-2xs"
              />
            </div>

            {/* 2nd Field: Reason */}
            <div>
              <label className="block text-[11px] font-bold text-black mb-1 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-[#FF5500]" />
                <span>Reason (Optional)</span>
              </label>
              <input
                ref={reasonInputRef}
                type="text"
                placeholder="e.g. Fetching wallet"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleHold();
                  }
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200/90 bg-zinc-50 focus:bg-white text-xs font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-8 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleHold}
              className="flex-1 h-8 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Bookmark className="w-3 h-3" />
              <span>HOLD BILL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
