import React, { useState, useEffect, useRef } from 'react';
import { CartItem, BillDiscount } from '@/types';
import { ShieldAlert, X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: CartItem | null;
  billSubtotal: number;
  onApplyItemDiscount: (
    itemId: string,
    discount: { type: 'percentage' | 'fixed'; value: number } | null
  ) => void;
  onApplyBillDiscount: (discount: BillDiscount | null) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  billSubtotal,
  onApplyItemDiscount,
  onApplyBillDiscount,
}) => {
  // Default to 'bill' as requested!
  const [targetTab, setTargetTab] = useState<'item' | 'bill'>('bill');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [valueInput, setValueInput] = useState<string>('10');

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Always default to entire bill
    setTargetTab('bill');
    setValueInput('10');
    setDiscountType('percentage');

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, [isOpen]);

  const handleSelectTab = (tab: 'item' | 'bill') => {
    setTargetTab(tab);
    if (tab === 'item' && targetItem?.discount) {
      setDiscountType(targetItem.discount.type);
      setValueInput(targetItem.discount.value.toString());
    } else if (tab === 'bill') {
      setValueInput('10');
      setDiscountType('percentage');
    }
  };

  const numValue = parseFloat(valueInput) || 0;

  const originalAmount =
    targetTab === 'item' && targetItem
      ? targetItem.unitPrice * targetItem.quantity
      : billSubtotal;

  let calculatedDiscount = 0;
  if (discountType === 'percentage') {
    calculatedDiscount = (originalAmount * numValue) / 100;
  } else {
    calculatedDiscount = Math.min(numValue, originalAmount);
  }

  const newTotal = Math.max(0, originalAmount - calculatedDiscount);

  const isManagerApprovalRequired =
    (discountType === 'percentage' && numValue > 20) ||
    (discountType === 'fixed' && numValue > 1000);

  const handleApply = () => {
    if (targetTab === 'item' && targetItem) {
      if (numValue <= 0) {
        onApplyItemDiscount(targetItem.id, null);
      } else {
        onApplyItemDiscount(targetItem.id, { type: discountType, value: numValue });
      }
    } else {
      if (numValue <= 0) {
        onApplyBillDiscount(null);
      } else {
        onApplyBillDiscount({
          type: discountType,
          value: numValue,
          reason: 'Special Discount',
        });
      }
    }
    onClose();
  };

  // Keyboard shortcut listeners (Enter to confirm, Escape to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleApply, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[365px] sm:max-w-[385px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-3.5 sm:p-4 relative animate-in zoom-in-95 duration-150 flex items-center gap-3 sm:gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Compact Mascot (Dis.png) */}
        <div className="flex-shrink-0 flex items-center justify-center pl-0.5">
          <img
            src="/Dis.png"
            alt="Discount"
            className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
          />
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2 text-left">
          {/* Header */}
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-black text-black leading-none">Apply Discount</h4>
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer -mr-0.5"
              title="Close (Escape)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab Switch: Entire Bill vs Item (Increased height) */}
          {targetItem && (
            <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/90 select-none">
              <button
                type="button"
                onClick={() => handleSelectTab('bill')}
                className={`flex-1 h-7.5 sm:h-8 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                  targetTab === 'bill'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Entire Bill
              </button>
              <button
                type="button"
                onClick={() => handleSelectTab('item')}
                className={`flex-1 h-7.5 sm:h-8 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center truncate px-2 ${
                  targetTab === 'item'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Item ({targetItem.product.name.split(' ')[0]})
              </button>
            </div>
          )}

          {/* Subtitle Description */}
          <p className="text-[10px] text-zinc-400 font-medium truncate leading-none">
            {targetTab === 'bill' ? 'Applies to entire current bill' : `Item: ${targetItem?.product.name}`}
          </p>

          {/* Integrated Input & %/Rs Toggle Row */}
          <div className="flex items-center gap-1.5 mt-1">
            {/* % / Rs Selector */}
            <div className="flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  discountType === 'percentage'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
                title="Percentage discount"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  discountType === 'fixed'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
                title="Fixed cash discount (Rs.)"
              >
                Rs
              </button>
            </div>

            {/* Input Field */}
            <div className="flex-1 flex items-center h-8 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF5500] focus-within:border-[#FF5500] transition-all">
              <input
                ref={inputRef}
                type="number"
                min="0"
                max={discountType === 'percentage' ? 100 : originalAmount}
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                className="w-full bg-transparent text-xs font-mono font-black text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                autoFocus
              />
            </div>

            {/* Live Payable Total */}
            <div className="flex-shrink-0 text-right leading-none pl-0.5">
              <span className="text-[8px] font-medium text-zinc-400 block mb-0.5">Pay</span>
              <span className="text-xs font-mono font-black text-[#FF5500]">
                {Math.round(newTotal).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1">
            {(discountType === 'percentage'
              ? ['5', '10', '15', '20']
              : ['50', '100', '250', '500']
            ).map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => {
                  setValueInput(pill);
                  inputRef.current?.focus();
                }}
                className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                  valueInput === pill
                    ? 'bg-orange-50 border-orange-300 text-[#FF5500] shadow-2xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200/80'
                }`}
              >
                {discountType === 'percentage' ? `${pill}%` : pill}
              </button>
            ))}
          </div>

          {/* Manager Approval Warning if needed */}
          {isManagerApprovalRequired && (
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[9px] animate-in fade-in duration-150">
              <ShieldAlert className="w-3 h-3 text-amber-600 flex-shrink-0" />
              <span className="font-bold leading-tight">Requires Manager Review</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-9 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
