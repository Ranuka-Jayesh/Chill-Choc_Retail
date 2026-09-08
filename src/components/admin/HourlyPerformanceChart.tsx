import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { useSales } from '@/stores/salesStore';
import { CompletedSale } from '@/types';

interface HourlyDataPoint {
  hourLabel: string;
  hourFull: string;
  revenue: number;
  transactions: number;
  isPeak?: boolean;
}

const STANDARD_HOURS = [
  { hour: 8, label: '8A', full: '8:00 AM' },
  { hour: 9, label: '9A', full: '9:00 AM' },
  { hour: 10, label: '10A', full: '10:00 AM' },
  { hour: 11, label: '11A', full: '11:00 AM' },
  { hour: 12, label: '12P', full: '12:00 PM' },
  { hour: 13, label: '1P', full: '1:00 PM' },
  { hour: 14, label: '2P', full: '2:00 PM' },
  { hour: 15, label: '3P', full: '3:00 PM' },
  { hour: 16, label: '4P', full: '4:00 PM' },
  { hour: 17, label: '5P', full: '5:00 PM' },
  { hour: 18, label: '6P', full: '6:00 PM' },
  { hour: 19, label: '7P', full: '7:00 PM' },
  { hour: 20, label: '8P', full: '8:00 PM' },
  { hour: 21, label: '9P', full: '9:00 PM' },
];

export const HourlyPerformanceChart: React.FC = () => {
  const { sales } = useSales();
  const [metric, setMetric] = useState<'revenue' | 'transactions'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Helper to extract hour (0-23) from sale timestamp or ISO date
  const parseSaleHour = (s: CompletedSale): number | null => {
    if (!s.timestamp) return null;
    const timeStr = s.timestamp.trim();

    // Match 12-hour format e.g. "04:30 PM" or "4:30 PM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const meridian = match12[3]?.toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;
      return h;
    }

    // Try parsing ISO
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.getHours();
    }
    return null;
  };

  // Check if sale belongs to today
  const isSaleToday = (s: CompletedSale): boolean => {
    if (!s.date) return true;
    const lower = s.date.toLowerCase().trim();
    if (lower === 'today') return true;

    const todayStr = new Date().toISOString().split('T')[0];
    if (s.date === todayStr) return true;

    const parsed = new Date(s.date);
    if (!isNaN(parsed.getTime())) {
      const today = new Date();
      return (
        parsed.getDate() === today.getDate() &&
        parsed.getMonth() === today.getMonth() &&
        parsed.getFullYear() === today.getFullYear()
      );
    }
    return false;
  };

  // Compute hourly metrics from real sales strictly for today
  const hourlyData = useMemo<HourlyDataPoint[]>(() => {
    const todaySales = sales.filter((s) => s.status !== 'Returned' && isSaleToday(s));

    const hourBuckets: Record<number, { revenue: number; transactions: number }> = {};
    STANDARD_HOURS.forEach((sh) => {
      hourBuckets[sh.hour] = { revenue: 0, transactions: 0 };
    });

    todaySales.forEach((s) => {
      const h = parseSaleHour(s);
      if (h !== null && hourBuckets[h] !== undefined) {
        hourBuckets[h].revenue += s.total;
        hourBuckets[h].transactions += 1;
      } else if (h !== null) {
        // Map to closest boundary if outside 8A-9P
        const clampedHour = Math.min(21, Math.max(8, h));
        hourBuckets[clampedHour].revenue += s.total;
        hourBuckets[clampedHour].transactions += 1;
      }
    });

    // Find peak value
    let maxVal = 0;
    STANDARD_HOURS.forEach((sh) => {
      const b = hourBuckets[sh.hour];
      const val = metric === 'revenue' ? b.revenue : b.transactions;
      if (val > maxVal) maxVal = val;
    });

    return STANDARD_HOURS.map((sh) => {
      const b = hourBuckets[sh.hour];
      const val = metric === 'revenue' ? b.revenue : b.transactions;
      const isPeak = maxVal > 0 && val === maxVal;
      return {
        hourLabel: sh.label,
        hourFull: sh.full,
        revenue: b.revenue,
        transactions: b.transactions,
        isPeak,
      };
    });
  }, [sales, metric]);

  const maxRevenue = Math.max(1, ...hourlyData.map((d) => d.revenue));
  const maxTransactions = Math.max(1, ...hourlyData.map((d) => d.transactions));
  const totalRevenue = hourlyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = hourlyData.reduce((sum, d) => sum + d.transactions, 0);
  const hasAnyActivity = totalRevenue > 0 || totalOrders > 0;

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
            • {metric === 'revenue' ? `Rs. ${totalRevenue.toLocaleString()} today` : `${totalOrders} bills today`}
          </span>
        </div>

        {/* Metric Toggle */}
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

      {/* Graph Area */}
      {!hasAnyActivity ? (
        <div className="h-28 sm:h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-200/70 rounded-xl bg-zinc-50/40">
          <BarChart2 className="w-6 h-6 text-zinc-300 mb-1.5" />
          <p className="text-xs font-semibold text-zinc-600">No sales recorded yet today</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm">
            Hourly distribution bars will rank and plot in real-time as customer orders are completed at the POS.
          </p>
        </div>
      ) : (
        <div className="relative pt-6 pb-1">
          <div className="h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-1">
            {hourlyData.map((d, index) => {
              const isHovered = hoveredIndex === index;
              const val = metric === 'revenue' ? d.revenue : d.transactions;
              const max = metric === 'revenue' ? maxRevenue : maxTransactions;
              const heightPercent = val > 0 ? Math.max(8, Math.round((val / max) * 100)) : 4;

              return (
                <div
                  key={d.hourLabel}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                >
                  {/* Micro Tooltip */}
                  {isHovered && val > 0 && (
                    <div className="absolute -top-7 z-20 px-2 py-0.5 rounded-md bg-[#27140B] text-white text-[10px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-none animate-in fade-in zoom-in-95">
                      {d.hourFull}: {metric === 'revenue' ? `Rs. ${d.revenue.toLocaleString()}` : `${d.transactions} bills`}
                    </div>
                  )}

                  {/* Vertical Bar */}
                  <div className="w-full max-w-[18px] sm:max-w-[22px] h-full flex items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-150 ${
                        isHovered && val > 0
                          ? 'bg-[#FF5500] shadow-sm'
                          : d.isPeak && val > 0
                          ? 'bg-[#FF5500]/80'
                          : val > 0
                          ? 'bg-orange-200 hover:bg-orange-300'
                          : 'bg-zinc-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Hour Label */}
                  <span
                    className={`mt-1.5 text-[10px] font-mono transition-colors ${
                      isHovered
                        ? 'text-[#FF5500] font-black'
                        : d.isPeak && val > 0
                        ? 'text-zinc-800 font-bold'
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
      )}
    </div>
  );
};
