import React, { useEffect } from 'react';
import { Product, ProductBatch } from '@/types';
import { ProductSupplierOption, ProductBatchOption } from './SupplierSelectModal';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';

export interface StockOverData {
  product: Product;
  exceededSupplier?: ProductSupplierOption | null;
  exceededBatch?: ProductBatchOption | ProductBatch | null;
  availableBatches?: (ProductBatchOption | ProductBatch)[];
  availableSuppliers?: ProductSupplierOption[];
}

interface SupplierStockOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StockOverData | null;
  onConfirm?: () => void;
  onChooseDifferentSupplier?: () => void;
  onSelectAvailableBatch?: (batch: any, supplier: any) => void;
  onSelectAvailableSupplier?: (option: any) => void;
}

export const SupplierStockOverModal: React.FC<SupplierStockOverModalProps> = ({
  isOpen,
  onClose,
  data,
  onConfirm,
  onChooseDifferentSupplier,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onChooseDifferentSupplier) {
      onChooseDifferentSupplier();
    } else {
      onClose();
    }
  };

  // Global Escape & Enter keyboard handlers
  useEffect(() => {
    if (!isOpen || !data) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, data]);

  if (!isOpen || !data || !data.product) return null;

  const { product } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[390px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          {/* Left Side: Mascot Warning Image */}
          <div className="flex-shrink-0 pt-0.5">
            <img
              src="/warning.png"
              alt="Warning"
              className="w-16 h-16 sm:w-18 sm:h-18 object-contain drop-shadow-sm select-none pointer-events-none"
            />
          </div>

          {/* Right Side: Simple Clean Confirmation */}
          <div className="flex-1 min-w-0 text-left">
            {/* Header Badge & Close Button */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80">
                <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                <span>Stock Over</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-black p-0.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Product Name */}
            <h4 className="text-sm font-black text-black tracking-tight leading-tight mt-2.5">
              Select other supplier?
            </h4>

            <p className="text-xs font-semibold text-zinc-500 mt-1 truncate">
              {product.name}
            </p>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-9 rounded-xl border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 h-9 rounded-xl bg-black hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Select Supplier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
