import React, { useState } from 'react';
import { Search, ScanLine, X } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/stores/cartStore';
import { BarcodeNotFoundModal } from '@/components/modals/BarcodeNotFoundModal';

interface POSSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products: Product[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const POSSearch: React.FC<POSSearchProps> = ({
  searchQuery,
  onSearchChange,
  products,
  inputRef,
}) => {
  const { addItem } = useCart();
  const [failedBarcode, setFailedBarcode] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = searchQuery.trim();
      if (!term) return;

      // 1. Try exact barcode match
      const barcodeMatch = products.find((p) => p.barcode === term);
      if (barcodeMatch) {
        addItem(barcodeMatch);
        onSearchChange('');
        return;
      }

      // 2. Try exact SKU match
      const skuMatch = products.find((p) => p.sku.toLowerCase() === term.toLowerCase());
      if (skuMatch) {
        addItem(skuMatch);
        onSearchChange('');
        return;
      }

      // 3. Try exact Name match
      const exactNameMatch = products.find(
        (p) => p.name.toLowerCase() === term.toLowerCase()
      );
      if (exactNameMatch) {
        addItem(exactNameMatch);
        onSearchChange('');
        return;
      }

      // 4. If all numbers and length >= 8, treated as barcode scan that failed
      if (/^\d{8,}$/.test(term)) {
        setFailedBarcode(term);
      }
    }
  };

  return (
    <>
      <div className="relative w-full">
        {/* Search & Scanner Input Container */}
        <div className="relative flex items-center">
          <div className="absolute left-3 text-zinc-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            id="pos-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode or search confections... (F1)"
            className="w-full h-10 pl-9 pr-20 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="p-1 rounded-md text-zinc-400 hover:text-black transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-mono font-bold">
              <ScanLine className="w-3 h-3 text-[#FF5500]" />
              <span>F1</span>
            </div>
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
