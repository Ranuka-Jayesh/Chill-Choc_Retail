import React from 'react';
import { Product } from '@/types';
import { Package, Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          onAddToCart(product);
        }
      }}
      className={`group relative bg-white rounded-xl border border-zinc-200 p-2.5 flex flex-col justify-between transition-all duration-150 select-none shadow-xs ${
        isOutOfStock
          ? 'opacity-60 cursor-not-allowed bg-zinc-50 border-dashed'
          : 'cursor-pointer hover:border-[#FF5500] hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]'
      }`}
    >
      {/* Top Media / Confectionery Image */}
      <div className="relative w-full h-24 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200 mb-2">
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

        {/* Fallback Product Brand Badge */}
        <div
          className="absolute inset-0 flex items-center justify-center font-bold text-white shadow-xs -z-10"
          style={{ backgroundColor: product.imageColor || '#18181B' }}
        >
          <span className="text-sm font-extrabold tracking-wider font-mono">
            {product.brand ? product.brand.substring(0, 2).toUpperCase() : 'CC'}
          </span>
        </div>

        {/* Subtle Stock Badges */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Out of Stock
            </span>
          </div>
        )}

        {isLowStock && (
          <div className="absolute bottom-1.5 right-1.5">
            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#FF5500] text-[9px] font-bold border border-orange-200">
              Only {product.stock} left
            </span>
          </div>
        )}

        {/* Quick Add overlay button */}
        {!isOutOfStock && (
          <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-lg bg-[#FF5500] text-white flex items-center justify-center shadow-xs">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {product.weight}
            </span>
            <span className="text-[9px] font-mono text-zinc-400">
              {product.sku}
            </span>
          </div>

          <h4 className="text-xs font-bold text-zinc-900 mt-0.5 line-clamp-1 leading-snug group-hover:text-[#FF5500] transition-colors" title={product.name}>
            {product.name}
          </h4>
        </div>

        {/* Price display */}
        <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-baseline justify-between">
          <span className="text-xs font-black text-black font-mono tabular-numbers">
            Rs. {product.price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          <span className="text-[9px] font-medium text-zinc-400">
            LKR
          </span>
        </div>
      </div>
    </div>
  );
};
