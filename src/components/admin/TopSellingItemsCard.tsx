import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '@/stores/salesStore';
import { useProducts } from '@/stores/productStore';
import { Product } from '@/types';
import { Flame, ArrowRight } from 'lucide-react';

interface TopItemStat {
  product: Product;
  unitsSold: number;
}

const BASE_TOP_VELOCITY: Record<string, number> = {
  'prod-kitkat': 48,
  'prod-snickers': 39,
  'prod-toblerone': 32,
  'prod-ferrero': 27,
  'prod-kinder': 23,
  'prod-mars': 19,
  'prod-cadbury': 16,
  'prod-mnm': 14,
  'prod-twix': 11,
  'prod-bounty': 9,
  'prod-hershey': 8,
  'prod-oreo': 6,
};

export const TopSellingItemsCard: React.FC = () => {
  const navigate = useNavigate();
  const { sales } = useSales();
  const { products } = useProducts();

  // Compute top 6 selling products
  const top6Items: TopItemStat[] = React.useMemo(() => {
    const itemMap = new Map<string, number>();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = itemMap.get(item.product.id) || 0;
        itemMap.set(item.product.id, existing + item.quantity);
      });
    });

    const candidateProducts = products.length > 0 ? products : [];
    const stats: { product: Product; unitsSold: number }[] = candidateProducts.map((p) => {
      const liveSold = itemMap.get(p.id) || 0;
      const baseSold = BASE_TOP_VELOCITY[p.id] || 5;
      return { product: p, unitsSold: baseSold + liveSold };
    });

    stats.sort((a, b) => b.unitsSold - a.unitsSold);
    return stats.slice(0, 6);
  }, [sales, products]);

  const rankBadges = [
    'bg-amber-100 text-amber-900 border-amber-300',
    'bg-zinc-200 text-zinc-800 border-zinc-300',
    'bg-orange-100 text-orange-900 border-orange-300',
    'bg-rose-50 text-rose-800 border-rose-200',
    'bg-blue-50 text-blue-800 border-blue-200',
    'bg-purple-50 text-purple-800 border-purple-200',
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-3.5 space-y-2.5">
      {/* Minimal Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-orange-50 text-[#FF5500]">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Top Selling Items
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="text-[11px] font-bold text-[#FF5500] hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>Catalog</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal 6 Items Grid (Compact, Non-popup) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {top6Items.map((item, idx) => {
          const rankStyle = rankBadges[idx] || rankBadges[3];

          return (
            <div
              key={item.product.id}
              className="group relative bg-white rounded-xl border border-zinc-200 p-2 flex flex-col justify-between select-none shadow-xs"
            >
              {/* Product Image */}
              <div className="relative w-full h-18 sm:h-20 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200 mb-1.5">
                {item.product.imageUrl && (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}

                {/* Fallback Brand Badge */}
                <div
                  className="absolute inset-0 flex items-center justify-center font-bold text-white shadow-xs -z-10"
                  style={{ backgroundColor: item.product.imageColor || '#18181B' }}
                >
                  <span className="text-[11px] font-extrabold tracking-wider font-mono">
                    {item.product.weight}
                  </span>
                </div>

                {/* Rank Badge */}
                <div className="absolute top-1 left-1">
                  <span className={`px-1 py-0.2 rounded text-[8px] font-black font-mono shadow-2xs border ${rankStyle}`}>
                    #{idx + 1}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 justify-between">
                <div>
                  <h4
                    className="text-[11px] font-bold text-zinc-900 line-clamp-1 leading-snug"
                    title={item.product.name}
                  >
                    {item.product.name}
                  </h4>
                  <span className="text-[9px] text-zinc-400 font-medium block">
                    {item.product.weight}
                  </span>
                </div>

                {/* Price & Sold Count (NO + icon) */}
                <div className="mt-1.5 pt-1 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] font-black text-zinc-900 font-mono">
                    Rs. {item.product.price.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                  </span>

                  <span className="text-[9px] font-bold text-emerald-700 font-mono bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                    {item.unitsSold} sold
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
