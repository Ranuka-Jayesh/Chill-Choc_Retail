import React from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { SearchX } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  searchQuery,
  onClearSearch,
}) => {
  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 rounded-2xl border border-dashed border-brand-border select-none">
        <div className="w-12 h-12 rounded-2xl bg-brand-bg text-brand-muted flex items-center justify-center mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-brand-brown">No products found</h4>
        <p className="text-xs text-brand-muted mt-1 max-w-xs">
          {searchQuery
            ? `No confectionery matches "${searchQuery}". Try another product name, SKU, or barcode.`
            : 'No products available in this category.'}
        </p>
        {searchQuery && onClearSearch && (
          <button
            onClick={onClearSearch}
            className="mt-4 px-3.5 py-1.5 rounded-xl border border-brand-border bg-white text-xs font-bold text-brand-brown hover:bg-brand-bg transition-colors"
          >
            Clear Search Filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
};
