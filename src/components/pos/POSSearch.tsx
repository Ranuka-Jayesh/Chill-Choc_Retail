import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/stores/cartStore';
import { isBatchExpired } from '@/stores/productStore';
import { BarcodeNotFoundModal } from '@/components/modals/BarcodeNotFoundModal';
import { ExpiredProductData } from '@/components/modals/ProductExpiredModal';

interface POSSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products: Product[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
  viewMode?: 'list' | 'grid';
  onToggleViewMode?: () => void;
  onArrowRight?: () => void;
  onArrowLeft?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onSelectProduct?: () => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onProductExpired?: (data: ExpiredProductData) => void;
}

export const POSSearch: React.FC<POSSearchProps> = ({
  searchQuery,
  onSearchChange,
  products,
  inputRef,
  viewMode = 'grid',
  onToggleViewMode,
  onArrowRight,
  onArrowLeft,
  onArrowUp,
  onArrowDown,
  onSelectProduct,
  isFocused = false,
  onFocus,
  onBlur,
  onProductExpired,
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [failedBarcode, setFailedBarcode] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown?.();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp?.();
      return;
    }

    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (!searchQuery || input.selectionStart === input.value.length) {
        e.preventDefault();
        onArrowRight?.();
        return;
      }
    }

    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (!searchQuery || (input.selectionStart === 0 && input.selectionEnd === 0)) {
        e.preventDefault();
        onArrowLeft?.();
        return;
      }
    }

    if (e.key === 'Enter') {
      const term = searchQuery.trim();
      const cleanTerm = term.replace(/^\*+|\*+$/g, '').trim();

      // Check if it's an invoice barcode
      if (
        cleanTerm.toUpperCase().startsWith('INV-') ||
        cleanTerm.toUpperCase().startsWith('CC-')
      ) {
        onSearchChange('');
        navigate(`/cashier/sales-history?invoice=${encodeURIComponent(cleanTerm)}`);
        return;
      }

      // If scanner scanned numbers (barcode with 8+ digits)
      if (/^\d{8,}$/.test(cleanTerm)) {
        for (const p of products) {
          const batch = p.batches?.find(
            (b) => b.batchNumber.toLowerCase() === cleanTerm.toLowerCase()
          );
          if (batch) {
            if (isBatchExpired(batch.expiryDate)) {
              onProductExpired?.({
                product: p,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                supplierName: batch.supplierName,
              });
              onSearchChange('');
              return;
            }
            addItem(p, 1, null, batch.batchNumber);
            onSearchChange('');
            return;
          }
        }

        const barcodeMatch = products.find((p) => p.barcode === cleanTerm || p.barcode === term);
        if (barcodeMatch) {
          if (
            (barcodeMatch.expiryDate && isBatchExpired(barcodeMatch.expiryDate)) ||
            (barcodeMatch.batches && barcodeMatch.batches.length === 1 && isBatchExpired(barcodeMatch.batches[0].expiryDate))
          ) {
            onProductExpired?.({
              product: barcodeMatch,
              expiryDate: barcodeMatch.expiryDate || barcodeMatch.batches?.[0]?.expiryDate,
              batchNumber: barcodeMatch.batches?.[0]?.batchNumber,
              supplierName: barcodeMatch.batches?.[0]?.supplierName,
            });
            onSearchChange('');
            return;
          }
          addItem(barcodeMatch);
          onSearchChange('');
          return;
        }

        setFailedBarcode(term);
        return;
      }

      // Otherwise select the currently highlighted product card!
      if (onSelectProduct) {
        e.preventDefault();
        onSelectProduct();
        return;
      }

      // Fallback exact SKU match
      const skuMatch = products.find((p) => p.sku.toLowerCase() === term.toLowerCase());
      if (skuMatch) {
        if (
          (skuMatch.expiryDate && isBatchExpired(skuMatch.expiryDate)) ||
          (skuMatch.batches && skuMatch.batches.length === 1 && isBatchExpired(skuMatch.batches[0].expiryDate))
        ) {
          onProductExpired?.({
            product: skuMatch,
            expiryDate: skuMatch.expiryDate || skuMatch.batches?.[0]?.expiryDate,
            batchNumber: skuMatch.batches?.[0]?.batchNumber,
            supplierName: skuMatch.batches?.[0]?.supplierName,
          });
          onSearchChange('');
          return;
        }
        addItem(skuMatch);
        onSearchChange('');
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onSearchChange('');
      inputRef?.current?.blur();
      onBlur?.();
      return;
    }
  };

  return (
    <>
      <div className="relative w-full select-none">
        {/* Sleek White Pill Search Bar with Dynamic Active State & Integrated Multifunctional View Toggle */}
        <div
          className={`relative flex items-center h-10 sm:h-10.5 bg-white rounded-full pl-3.5 pr-[3px] transition-all duration-150 ${
            isFocused
              ? 'border-2 border-[#FF5500] ring-4 ring-[#FF5500]/20 shadow-md'
              : 'border border-zinc-200 hover:border-zinc-300 shadow-xs'
          }`}
        >
          {/* Search Icon */}
          <div
            className={`${
              isFocused ? 'text-[#FF5500]' : 'text-zinc-400'
            } pointer-events-none flex-shrink-0 mr-2 flex items-center justify-center transition-colors`}
          >
            <Search className="w-4 h-4" />
          </div>

          {/* Search Input */}
          <input
            ref={inputRef}
            id="pos-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Search products..."
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-w-0 caret-[#FF5500]"
          />

          {/* Right Action Controls: Clear Button & Circular Multifunctional View Toggle */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5 text-[#FF5500]" />
              </button>
            )}

            {/* Multifunctional View Mode Toggle Button (Switches between 3-Column Grid and List View) */}
            {onToggleViewMode && (
              <button
                type="button"
                onClick={onToggleViewMode}
                className="w-[30px] h-[30px] sm:w-8 sm:h-8 aspect-square rounded-full bg-black hover:bg-zinc-800 text-white inline-flex items-center justify-center p-0 m-0 shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer flex-shrink-0 group"
                title={
                  viewMode === 'grid'
                    ? 'Grid view active • Click to switch to List view'
                    : 'List view active • Click to switch to Grid view'
                }
                aria-label="Toggle Grid and List View"
              >
                {viewMode === 'grid' ? (
                  <LayoutGrid className="w-4 h-4 text-white stroke-[2.3] group-hover:scale-110 transition-transform duration-150 block shrink-0" />
                ) : (
                  <List className="w-4 h-4 text-white stroke-[2.3] group-hover:scale-110 transition-transform duration-150 block shrink-0" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Not Found Modal */}
      {failedBarcode && (
        <BarcodeNotFoundModal
          isOpen={!!failedBarcode}
          onClose={() => setFailedBarcode(null)}
          barcode={failedBarcode}
          onSearchManually={() => {
            // Keep query in search bar for manual results
            setFailedBarcode(null);
            if (inputRef?.current) {
              inputRef.current.focus();
            }
          }}
        />
      )}
    </>
  );
};
