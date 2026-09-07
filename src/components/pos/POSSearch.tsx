import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/stores/cartStore';
import { BarcodeNotFoundModal } from '@/components/modals/BarcodeNotFoundModal';

interface POSSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products: Product[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
  viewMode?: 'list' | 'grid';
  onToggleViewMode?: () => void;
}

export const POSSearch: React.FC<POSSearchProps> = ({
  searchQuery,
  onSearchChange,
  products,
  inputRef,
  viewMode = 'grid',
  onToggleViewMode,
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [failedBarcode, setFailedBarcode] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = searchQuery.trim();
      if (!term) return;

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

      // 1. Try exact barcode match
      const barcodeMatch = products.find((p) => p.barcode === cleanTerm || p.barcode === term);
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
      <div className="relative w-full select-none">
        {/* Sleek White Pill Search Bar with Orange Border & Integrated Multifunctional View Toggle */}
        <div className="relative flex items-center h-10 sm:h-10.5 bg-white rounded-full pl-3.5 pr-[3px] border-2 border-[#FF5500] shadow-xs transition-all focus-within:ring-4 focus-within:ring-[#FF5500]/20 focus-within:shadow-md">
          {/* Search Icon */}
          <div className="text-[#FF5500] pointer-events-none flex-shrink-0 mr-2 flex items-center justify-center">
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
