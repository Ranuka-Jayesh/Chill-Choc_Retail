import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { CartItem } from '@/types';
import { Minus, Plus, PackageCheck } from 'lucide-react';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdateQuantity,
}) => {
  const [qtyString, setQtyString] = useState<string>('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setQtyString(String(item.quantity));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const currentQty = parseInt(qtyString, 10) || 0;
  const availableStock = item.product.stock;

  const handleStep = (delta: number) => {
    const next = Math.max(1, Math.min(availableStock, currentQty + delta));
    setQtyString(String(next));
  };

  const handleSetPreset = (qty: number) => {
    const next = Math.max(1, Math.min(availableStock, qty));
    setQtyString(String(next));
  };

  const handleConfirm = () => {
    const finalQty = Math.max(1, Math.min(availableStock, currentQty));
    onUpdateQuantity(item.id, finalQty);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Change Quantity"
      subtitle={`${item.product.name} • ${item.product.weight}`}
      maxWidth="xs"
    >
      <div className="space-y-3 select-none" onKeyDown={handleKeyDown}>
        {/* Available Stock Indicator */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px]">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <PackageCheck className="w-3 h-3 text-[#FF5500]" />
            <span className="font-semibold">In Stock</span>
          </div>
          <span className="font-mono font-bold text-black">
            {availableStock} units
          </span>
        </div>

        {/* Stepper Controls & Direct Input */}
        <div className="py-1">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              disabled={currentQty <= 1}
              className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-black hover:bg-zinc-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer"
              title="Decrease quantity (-1)"
            >
              <Minus className="w-4 h-4 text-black" />
            </button>

            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max={availableStock}
                value={qtyString}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQtyString('');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    setQtyString(String(Math.min(availableStock, Math.max(0, num))));
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-24 h-11 rounded-xl bg-white border-2 border-black text-center text-2xl font-black text-black font-mono tabular-numbers focus:outline-none focus:ring-2 focus:ring-[#FF5500] transition-all shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => handleStep(1)}
              disabled={currentQty >= availableStock}
              className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-black hover:bg-zinc-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer"
              title="Increase quantity (+1)"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Quick Quantity Presets */}
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1 text-center">
            Presets
          </span>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 5, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPreset(preset)}
                disabled={preset > availableStock}
                className={`py-1 rounded-md border text-[11px] font-mono font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  currentQty === preset
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100 hover:text-black'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-1.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1"
          >
            <span>Update</span>
            <span className="text-[10px] font-mono opacity-80">(↵)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
