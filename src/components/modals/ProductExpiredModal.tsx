import React, { useEffect } from 'react';
import { Product } from '@/types';
import { AlertCircle, X } from 'lucide-react';

export interface ExpiredProductData {
  product: Product;
  batchNumber?: string | null;
  expiryDate?: string | null;
  supplierName?: string | null;
}

interface ProductExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExpiredProductData | null;
}

export const ProductExpiredModal: React.FC<ProductExpiredModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  // Global Escape & Enter keyboard handlers
  useEffect(() => {
    if (!isOpen || !data) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, data, onClose]);

  if (!isOpen || !data || !data.product) return null;

  const { product, batchNumber, expiryDate } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-2xl shadow-xl p-5 text-center relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Minimal Alert Icon */}
        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-stone-900 tracking-tight">
          Product Expired
        </h3>

        {/* Product Name */}
        <p className="text-xs font-semibold text-stone-700 mt-1 line-clamp-2">
          {product.name}
        </p>

        {/* Expiry & Batch info */}
        <div className="mt-2 text-[11px] font-mono text-rose-600 font-semibold flex items-center justify-center gap-1.5 flex-wrap">
          {expiryDate && <span>Expired: {expiryDate}</span>}
          {batchNumber && (
            <span className="text-stone-400 font-normal">
              ({batchNumber})
            </span>
          )}
        </div>

        {/* Minimal Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full mt-4 h-9 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          OK
        </button>
      </div>
    </div>
  );
};

