import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingBag,
  Receipt,
} from 'lucide-react';

interface AnalyticsKPIsProps {
  grossRevenue: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  profitMarginPercent: number;
  averageOrderValue: number;
  totalOrders: number;
  totalUnitsSold: number;
  totalDiscounts: number;
  periodLabel: string;
}

export const AnalyticsKPIs: React.FC<AnalyticsKPIsProps> = ({
  grossRevenue,
  netRevenue,
  totalCogs,
  grossProfit,
  profitMarginPercent,
  averageOrderValue,
  totalOrders,
  totalUnitsSold,
  totalDiscounts,
  periodLabel,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* 1. Net Revenue */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Net Sales Revenue
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-zinc-600" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black text-zinc-900 font-mono tracking-tight">
            Rs. {netRevenue.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-zinc-700 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-[#FF5500]" />
              {totalOrders} Bills
            </span>
            <span className="text-[10px] text-zinc-400 truncate">
              • Gross: Rs. {grossRevenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>{periodLabel}</span>
          <span className="font-semibold text-zinc-600">Settled POS</span>
        </div>
      </div>

      {/* 2. Gross Profit & Margin */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Gross Profit (Margin)
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <Percent className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black text-zinc-900 font-mono tracking-tight flex items-baseline gap-1.5">
            <span>Rs. {grossProfit.toLocaleString('en-LK', { minimumFractionDigits: 0 })}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700">
              {profitMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
            COGS: Rs. {totalCogs.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>Net - Batch Cost</span>
          <span className="font-semibold text-zinc-700 font-mono">
            +{((grossProfit / (totalCogs || 1)) * 100).toFixed(0)}% Markup
          </span>
        </div>
      </div>

      {/* 3. Average Order Value (Basket) */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Avg Order Value (AOV)
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-zinc-600" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black text-zinc-900 font-mono tracking-tight">
            Rs. {averageOrderValue.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
            <span className="font-bold text-zinc-700">
              {totalOrders > 0 ? (totalUnitsSold / totalOrders).toFixed(1) : 0} items
            </span>
            <span>avg basket</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>Total Units: {totalUnitsSold}</span>
          <span className="font-semibold text-zinc-600">Basket Size</span>
        </div>
      </div>

      {/* 4. Discounts Absorbed */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Discounts Absorbed
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-zinc-600" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black text-zinc-900 font-mono tracking-tight">
            Rs. {totalDiscounts.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
            {grossRevenue > 0 ? ((totalDiscounts / grossRevenue) * 100).toFixed(1) : 0}% of gross sales
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>Promotions</span>
          <span className="font-semibold text-zinc-600">Savings</span>
        </div>
      </div>
    </div>
  );
};
