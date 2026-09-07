import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface HourlyDataPoint {
  hourLabel: string;
  hourFull: string;
  revenue: number;
  transactions: number;
  isPeak?: boolean;
}

const HOURLY_DATA: HourlyDataPoint[] = [
  { hourLabel: '8A', hourFull: '8:00 AM', revenue: 2800, transactions: 4 },
  { hourLabel: '9A', hourFull: '9:00 AM', revenue: 4500, transactions: 6 },
  { hourLabel: '10A', hourFull: '10:00 AM', revenue: 7800, transactions: 11 },
  { hourLabel: '11A', hourFull: '11:00 AM', revenue: 9200, transactions: 13 },
  { hourLabel: '12P', hourFull: '12:00 PM', revenue: 14600, transactions: 19 },
  { hourLabel: '1P', hourFull: '1:00 PM', revenue: 12400, transactions: 16 },
  { hourLabel: '2P', hourFull: '2:00 PM', revenue: 8100, transactions: 10 },
  { hourLabel: '3P', hourFull: '3:00 PM', revenue: 11200, transactions: 14 },
  { hourLabel: '4P', hourFull: '4:00 PM', revenue: 16500, transactions: 21 },
  { hourLabel: '5P', hourFull: '5:00 PM', revenue: 26800, transactions: 34, isPeak: true },
  { hourLabel: '6P', hourFull: '6:00 PM', revenue: 29400, transactions: 38, isPeak: true },
  { hourLabel: '7P', hourFull: '7:00 PM', revenue: 21500, transactions: 27 },
  { hourLabel: '8P', hourFull: '8:00 PM', revenue: 13900, transactions: 17 },
  { hourLabel: '9P', hourFull: '9:00 PM', revenue: 5600, transactions: 8 },
];

export const HourlyPerformanceChart: React.FC = () => {
  const [metric, setMetric] = useState<'revenue' | 'transactions'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxRevenue = Math.max(...HOURLY_DATA.map((d) => d.revenue));
  const maxTransactions = Math.max(...HOURLY_DATA.map((d) => d.transactions));
  const totalRevenue = HOURLY_DATA.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = HOURLY_DATA.reduce((sum, d) => sum + d.transactions, 0);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-4 space-y-3">
      {/* Minimal Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-orange-50 text-[#FF5500]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Hourly Sales
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-medium hidden sm:inline">
            • {metric === 'revenue' ? `Rs. ${(totalRevenue / 1000).toFixed(1)}k today` : `${totalOrders} bills today`}
          </span>
        </div>

        {/* Minimal Toggle */}
        <div className="flex p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/60 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setMetric('transactions')}
            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
              metric === 'transactions'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Minimal Graph Area */}
      <div className="relative pt-6 pb-1">
        <div className="h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-1">
          {HOURLY_DATA.map((d, index) => {
            const isHovered = hoveredIndex === index;
            const val = metric === 'revenue' ? d.revenue : d.transactions;
            const max = metric === 'revenue' ? maxRevenue : maxTransactions;
            const heightPercent = Math.max(8, Math.round((val / max) * 100));

            return (
              <div
                key={d.hourLabel}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              >
                {/* Micro Tooltip */}
                {isHovered && (
                  <div className="absolute -top-7 z-20 px-2 py-0.5 rounded-md bg-[#27140B] text-white text-[10px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-none animate-in fade-in zoom-in-95">
                    {d.hourFull}: {metric === 'revenue' ? `Rs. ${d.revenue.toLocaleString()}` : `${d.transactions} bills`}
                  </div>
                )}

                {/* Vertical Bar */}
                <div className="w-full max-w-[18px] sm:max-w-[22px] h-full flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-150 ${
                      isHovered
                        ? 'bg-[#FF5500] shadow-sm'
                        : d.isPeak
                        ? 'bg-orange-300'
                        : 'bg-zinc-100 hover:bg-zinc-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Hour Label */}
                <span
                  className={`mt-1.5 text-[10px] font-mono transition-colors ${
                    isHovered
                      ? 'text-[#FF5500] font-black'
                      : d.isPeak
                      ? 'text-zinc-700 font-bold'
                      : 'text-zinc-400'
                  }`}
                >
                  {d.hourLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
