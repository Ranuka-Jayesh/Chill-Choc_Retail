import React, { useState } from 'react';
import { Product, ConfectionCategory } from '@/types';
import { CategoryFilter } from './CategoryFilter';
import { POSSearch } from './POSSearch';
import { LayoutGrid, List, Plus, SearchX } from 'lucide-react';

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
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  return (
    <div className="h-full flex flex-col bg-white border-r border-zinc-200 select-none overflow-hidden">
      {/* Search & Scanner Input Header */}
      <div className="p-3 pb-2 border-b border-zinc-100 bg-white">
        <POSSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          products={allProducts}
          inputRef={searchInputRef}
        />

        {/* Category Pills & View Mode Toggle */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex-1 overflow-x-auto scrollbar-none no-scrollbar">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              categoryCounts={categoryCounts}
            />
          </div>

          <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-200 flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-black text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-black'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-black text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-black'
              }`}
              title="3-Column Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
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
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all duration-150 ${
                    isOutOfStock
                      ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-zinc-200 hover:border-[#FF5500] hover:bg-zinc-50/60 cursor-pointer active:scale-[0.99]'
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
                        <h4 className="text-xs font-bold text-zinc-900 truncate group-hover:text-[#FF5500] transition-colors">
                          {product.name}
                        </h4>
                        {isLowStock && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-100 text-[#FF5500] text-[9px] font-bold">
                            {product.stock} left
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-600 text-[9px] font-bold">
                            Out
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span className="font-medium text-zinc-500">{product.weight}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{product.sku}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Add Action */}
                  <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                    <span className="text-xs font-black text-black font-mono tabular-numbers">
                      Rs. {product.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>

                    {!isOutOfStock && (
                      <div className="w-5 h-5 rounded-md bg-zinc-100 group-hover:bg-[#FF5500] group-hover:text-white text-zinc-600 flex items-center justify-center transition-colors">
                        <Plus className="w-3 h-3" />
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
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  className={`group p-1.5 rounded-xl border flex flex-col justify-between transition-all duration-150 select-none ${
                    isOutOfStock
                      ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-zinc-200 hover:border-[#FF5500] hover:shadow-xs cursor-pointer active:scale-[0.97]'
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

                    {/* Stock Badges */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[0.5px] flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-white">
                          Out
                        </span>
                      </div>
                    )}
                    {isLowStock && (
                      <div className="absolute top-1 right-1">
                        <span className="px-1 py-0.2 rounded bg-orange-100 text-[#FF5500] text-[8px] font-bold shadow-2xs">
                          {product.stock} left
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Weight */}
                  <div className="min-w-0">
                    <h4
                      className="text-[11px] font-bold text-zinc-900 truncate leading-tight group-hover:text-[#FF5500] transition-colors"
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
                      <div className="w-4 h-4 rounded bg-zinc-100 group-hover:bg-[#FF5500] group-hover:text-white text-zinc-500 flex items-center justify-center transition-colors">
                        <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
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
