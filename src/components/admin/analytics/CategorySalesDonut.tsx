import React from 'react';
import {
  PieChart,
  Package,
  Layers,
  Coffee,
  Sparkles,
  Gift,
  Boxes,
} from 'lucide-react';

export interface CategoryBreakdownItem {
  category: string;
  displayName: string;
  revenue: number;
  unitsSold: number;
  percentage: number;
  color: string;
}

interface CategorySalesDonutProps {
  categories: CategoryBreakdownItem[];
  totalRevenue: number;
}

export const CategorySalesDonut: React.FC<CategorySalesDonutProps> = ({
  categories,
  totalRevenue,
}) => {
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('choc')) return <Package className="w-3.5 h-3.5 text-zinc-700" />;
    if (cat.includes('bisc')) return <Layers className="w-3.5 h-3.5 text-zinc-700" />;
    if (cat.includes('drink')) return <Coffee className="w-3.5 h-3.5 text-zinc-700" />;
    if (cat.includes('toff')) return <Sparkles className="w-3.5 h-3.5 text-zinc-700" />;
    if (cat.includes('gift')) return <Gift className="w-3.5 h-3.5 text-zinc-700" />;
    return <Boxes className="w-3.5 h-3.5 text-zinc-700" />;
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
            <PieChart className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Category Distribution
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium">
              Sales share across confection product lines
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold font-mono text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md">
          Rs. {totalRevenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Multi-Segment Stacked Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden flex">
          {categories.map((cat) => (
            <div
              key={cat.category}
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
              }}
              className="h-full transition-all duration-200"
              title={`${cat.displayName}: ${cat.percentage.toFixed(1)}% (Rs. ${cat.revenue.toLocaleString()})`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-semibold px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Category Grid Cards - Compact, No Emojis, No Rainbow Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
        {categories.map((cat) => (
          <div
            key={cat.category}
            className="p-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-100/70 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {getCategoryIcon(cat.category)}
                <span className="text-[11px] font-bold text-zinc-800 truncate">
                  {cat.displayName}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-600 bg-white border border-zinc-200 px-1 rounded">
                {cat.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5 pt-1 border-t border-zinc-100">
              <span className="text-[11px] font-black text-zinc-900 font-mono">
                Rs. {cat.revenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {cat.unitsSold} pcs
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
