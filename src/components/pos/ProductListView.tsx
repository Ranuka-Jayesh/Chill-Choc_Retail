import React, { useState, useRef, useEffect } from 'react';
import { Product, ConfectionCategory } from '@/types';
import { CategoryFilter } from './CategoryFilter';
import { POSSearch } from './POSSearch';
import { Plus, SearchX } from 'lucide-react';
import { useCart } from '@/stores/cartStore';

import { ExpiredProductData } from '@/components/modals/ProductExpiredModal';

interface ProductListViewProps {
  products: Product[];
  allProducts: Product[];
  selectedCategory: ConfectionCategory;
  onSelectCategory: (cat: ConfectionCategory) => void;
  categoryCounts: Record<ConfectionCategory, number>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddToCart: (product: Product) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onProductExpired?: (data: ExpiredProductData) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  allProducts,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  searchQuery,
  onSearchChange,
  onAddToCart,
  searchInputRef,
  onProductExpired,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { items: cartItems } = useCart();

  const cols = viewMode === 'grid' ? 3 : 1;

  // Handle focus when search bar is activated (F1 or clicked)
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (products.length > 0) {
      const firstAvailable = products.findIndex(
        (p) =>
          p.isAvailable !== false &&
          p.stock - (cartItems.find((ci) => ci.product.id === p.id)?.quantity || 0) > 0
      );
      setSelectedIndex(firstAvailable !== -1 ? firstAvailable : 0);
    }
  };

  const handleSearchBlur = () => {
    // Managed cooperatively with click-outside
  };

  // Click outside listener: deactivates card selection and search bar focus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setSelectedIndex(-1);
        searchInputRef?.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchInputRef]);

  // Adjust selectedIndex bounds when products change
  useEffect(() => {
    if (products.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    if (isSearchFocused) {
      if (selectedIndex >= products.length) {
        setSelectedIndex(Math.max(0, products.length - 1));
      } else if (selectedIndex < 0) {
        setSelectedIndex(0);
      }
    }
  }, [products.length, isSearchFocused, selectedIndex]);

  const handleArrowRight = () => {
    if (products.length === 0) return;
    if (!isSearchFocused) {
      setIsSearchFocused(true);
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.min(products.length - 1, Math.max(0, prev) + 1));
  };

  const handleArrowLeft = () => {
    if (products.length === 0) return;
    if (!isSearchFocused) {
      setIsSearchFocused(true);
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleArrowDown = () => {
    if (products.length === 0) return;
    if (!isSearchFocused) {
      setIsSearchFocused(true);
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => {
      const cur = Math.max(0, prev);
      const next = cur + cols;
      if (next < products.length) return next;
      return Math.min(products.length - 1, cur + 1);
    });
  };

  const handleArrowUp = () => {
    if (products.length === 0) return;
    if (!isSearchFocused) {
      setIsSearchFocused(true);
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => {
      const cur = Math.max(0, prev);
      const next = cur - cols;
      if (next >= 0) return next;
      return Math.max(0, cur - 1);
    });
  };

  const handleSelectProduct = () => {
    if (!isSearchFocused || selectedIndex < 0 || selectedIndex >= products.length) return;
    const selected = products[selectedIndex];
    if (selected && selected.isAvailable !== false) {
      onAddToCart(selected);
      // After adding item to cart, deactivate selection and search bar
      setIsSearchFocused(false);
      setSelectedIndex(-1);
      onSearchChange('');
      searchInputRef?.current?.blur();
    }
  };

  const handleCardClick = (product: Product, isOutOfStock: boolean, isUnavailable: boolean) => {
    if (!isOutOfStock && !isUnavailable) {
      onAddToCart(product);
      // After adding item to cart, deactivate selection and search bar
      setIsSearchFocused(false);
      setSelectedIndex(-1);
      onSearchChange('');
      searchInputRef?.current?.blur();
    }
  };

  // Scroll active card into view smoothly
  useEffect(() => {
    if (isSearchFocused && selectedIndex >= 0 && cardRefs.current[selectedIndex]) {
      cardRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isSearchFocused]);

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white border-r border-zinc-200 select-none overflow-hidden"
    >
      {/* Search & Scanner Input Header */}
      <div className="p-3 pb-2 border-b border-zinc-100 bg-white">
        <POSSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          products={allProducts}
          inputRef={searchInputRef}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
          onArrowRight={handleArrowRight}
          onArrowLeft={handleArrowLeft}
          onArrowUp={handleArrowUp}
          onArrowDown={handleArrowDown}
          onSelectProduct={handleSelectProduct}
          isFocused={isSearchFocused}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onProductExpired={onProductExpired}
        />

        {/* Category Pills Header (Full-width horizontal scroll) */}
        <div className="mt-2 flex items-center">
          <div className="w-full overflow-x-auto scrollbar-none no-scrollbar">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              categoryCounts={categoryCounts}
            />
          </div>
        </div>
      </div>

      {/* Products Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {products.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <SearchX className="w-8 h-8 mb-2 text-zinc-300" />
            <p className="text-xs font-bold text-black">No confections found</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Try searching by another term or barcode
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* Minimal List View with Confection Images */
          <div className="space-y-1">
            {products.map((product, index) => {
              const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;
              const availableStock = Math.max(0, product.stock - inCartQty);
              const isUnavailable = product.isAvailable === false;
              const isOutOfStock = !isUnavailable && availableStock <= 0;
              const isSelected = isSearchFocused && index === selectedIndex;

              return (
                <div
                  key={product.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  onMouseEnter={() => {
                    if (isSearchFocused) {
                      setSelectedIndex(index);
                    }
                  }}
                  onClick={() => handleCardClick(product, isOutOfStock, isUnavailable)}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all duration-150 ${
                    isUnavailable || isOutOfStock
                      ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-white border-zinc-300 shadow-xs cursor-pointer'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Confectionery Thumbnail */}
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0 relative flex items-center justify-center border border-zinc-100">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-white -z-10"
                        style={{ backgroundColor: product.imageColor || '#18181B' }}
                      >
                        {product.brand ? product.brand.substring(0, 2).toUpperCase() : 'CC'}
                      </div>
                    </div>

                    {/* Product Name & Specs */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold truncate text-zinc-900">
                          {product.name}
                        </h4>
                        {isUnavailable && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 text-[9px] font-bold shrink-0">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        <span className="font-medium text-zinc-500">{product.weight}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{product.sku}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price, Stock Qty & Add Action */}
                  <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                    <div className="text-right">
                      <span className="text-xs font-black text-black font-mono tabular-numbers block leading-tight">
                        Rs. {product.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        className={`text-[10px] font-mono block leading-tight mt-0.5 ${
                          isOutOfStock ? 'text-rose-500 font-bold' : 'text-zinc-400 font-medium'
                        }`}
                      >
                        {isOutOfStock ? 'Out of stock' : `Qty: ${availableStock}`}
                      </span>
                    </div>

                    {!isOutOfStock && (
                      <div
                        className={`w-5 h-5 aspect-square rounded-md flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#FF5500] text-white shadow-xs scale-105'
                            : 'bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Minimal Compact 3-Column Grid View with Real Images */
          <div className="grid grid-cols-3 gap-1.5">
            {products.map((product, index) => {
              const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;
              const availableStock = Math.max(0, product.stock - inCartQty);
              const isUnavailable = product.isAvailable === false;
              const isOutOfStock = !isUnavailable && availableStock <= 0;
              const isSelected = isSearchFocused && index === selectedIndex;

              return (
                <div
                  key={product.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  onMouseEnter={() => {
                    if (isSearchFocused) {
                      setSelectedIndex(index);
                    }
                  }}
                  onClick={() => handleCardClick(product, isOutOfStock, isUnavailable)}
                  className={`group p-1.5 rounded-xl border flex flex-col justify-between transition-all duration-150 select-none relative ${
                    isUnavailable || isOutOfStock
                      ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-white border-zinc-300 shadow-xs cursor-pointer'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-xs cursor-pointer active:scale-[0.97]'
                  }`}
                >
                  {/* Confectionery Thumbnail Image with Brand & Stock Badge */}
                  <div className="relative w-full aspect-[4/3] rounded-lg bg-zinc-100 overflow-hidden mb-1 flex items-center justify-center">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* Fallback Brand Badge */}
                    <div
                      className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-white -z-10"
                      style={{ backgroundColor: product.imageColor || '#18181B' }}
                    >
                      {product.brand ? product.brand.substring(0, 2).toUpperCase() : 'CC'}
                    </div>

                    {/* Stock & Availability Badges */}
                    {isUnavailable ? (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-[0.5px] flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-white">
                          Unavailable
                        </span>
                      </div>
                    ) : isOutOfStock ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[0.5px] flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-white">
                          Out
                        </span>
                      </div>
                    ) : null}

                    {/* Stock Qty Count (Black Circle with White Bold Number at right top corner) */}
                    <div className="absolute top-1 right-1 z-10">
                      <span
                        className="min-w-[20px] h-[20px] px-1 rounded-full bg-black text-white font-mono font-black text-[9px] flex items-center justify-center shadow-md border border-white/25 leading-none select-none"
                        title={`Available Stock: ${availableStock} (Total: ${product.stock}, In Cart: ${inCartQty})`}
                      >
                        {availableStock}
                      </span>
                    </div>
                  </div>

                  {/* Title & Weight */}
                  <div className="min-w-0">
                    <h4
                      className="text-[11px] font-bold truncate leading-tight text-zinc-900 group-hover:text-zinc-900"
                      title={product.name}
                    >
                      {product.name}
                    </h4>
                    <span className="text-[9px] text-zinc-400 font-medium block truncate mt-0.5 leading-none">
                      {product.weight}
                    </span>
                  </div>

                  {/* Price & Add Indicator */}
                  <div className="mt-1.5 pt-1 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10.5px] font-black font-mono text-black tabular-numbers leading-none">
                      Rs. {product.price.toLocaleString()}
                    </span>
                    {!isOutOfStock && (
                      <div
                        className={`w-5 h-5 aspect-square rounded-md flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#FF5500] text-white shadow-xs scale-105'
                            : 'bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
