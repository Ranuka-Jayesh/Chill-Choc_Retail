import React from 'react';
import { Product } from '@/types';
import { Plus } from 'lucide-react';
import { useCart } from '@/stores/cartStore';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { items: cartItems } = useCart();
  const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
  const inCartQty = inCartItem ? inCartItem.quantity : 0;
  const availableStock = Math.max(0, product.stock - inCartQty);

  const isUnavailable = product.isAvailable === false;
  const isOutOfStock = !isUnavailable && availableStock <= 0;
  const isLowStock = !isUnavailable && !isOutOfStock && availableStock <= (product.lowStockThreshold || 5);

  return (
    <div
      onClick={() => {
        if (!isOutOfStock && !isUnavailable) {
          onAddToCart(product);
        }
      }}
      className={`group relative bg-white rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-150 select-none shadow-xs ${
        isUnavailable || isOutOfStock
          ? 'opacity-60 cursor-not-allowed bg-zinc-50 border-dashed border-zinc-200'
          : 'border-zinc-200 cursor-pointer hover:border-zinc-300 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]'
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

        {/* Subtle Stock & Availability Badges */}
        {isUnavailable ? (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-200 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Unavailable
            </span>
          </div>
        ) : isOutOfStock ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Out of Stock
            </span>
          </div>
        ) : null}

        {/* Stock Qty Count (black circle with white bold number at right top corner) */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <span
            className="min-w-[20px] h-[20px] px-1 rounded-full bg-black text-white font-mono font-black text-[9px] flex items-center justify-center shadow-md border border-white/25 leading-none select-none"
            title={`Available Stock: ${availableStock} (Total: ${product.stock}, In Cart: ${inCartQty})`}
          >
            {availableStock}
          </span>
        </div>

        {/* Quick Add overlay button */}
        {!isOutOfStock && !isUnavailable && (
          <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 aspect-square rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center shadow-xs transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
