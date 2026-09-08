import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';

export interface TrajectoryDataPoint {
  label: string;
  subLabel?: string;
  revenue: number;
  orders: number;
  isPeak?: boolean;
}

interface RevenueTrajectoryChartProps {
  data: TrajectoryDataPoint[];
  title?: string;
  subtitle?: string;
}

export const RevenueTrajectoryChart: React.FC<RevenueTrajectoryChartProps> = ({
  data,
  title = 'Revenue & Transaction Velocity',
  subtitle = 'Temporal sales distribution',
}) => {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(1, ...data.map((d) => (metric === 'revenue' ? d.revenue : d.orders)));
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
            <BarChart2 className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              {title}
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium">
              {subtitle} •{' '}
              <span className="text-zinc-800 font-bold font-mono">
                {metric === 'revenue'
                  ? `Rs. ${totalRevenue.toLocaleString('en-LK')}`
                  : `${totalOrders} bills`}
              </span>
            </p>
          </div>
        </div>

        {/* Small Toggle Pills */}
        <div className="flex p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/60 text-[11px] font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Revenue (Rs.)
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
              metric === 'orders'
                ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Bills Count
          </button>
        </div>
      </div>

      {/* Compact Interactive Bar Grid */}
      <div className="relative pt-6 pb-1">
        {data.length === 0 || totalRevenue === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-zinc-400 font-medium">
            No transaction records in this period.
          </div>
        ) : (
          <div className="h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-0.5">
            {data.map((d, index) => {
              const val = metric === 'revenue' ? d.revenue : d.orders;
              const heightPercent = val > 0 ? Math.max(8, Math.round((val / maxVal) * 100)) : 4;
              const isHovered = hoveredIdx === index;

              return (
                <div
                  key={`${d.label}-${index}`}
                  onMouseEnter={() => setHoveredIdx(index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                >
                  {/* Floating Micro Tooltip */}
                  {isHovered && val > 0 && (
                    <div className="absolute -top-8 z-30 px-2 py-0.5 rounded-md bg-[#27140B] text-white text-[10px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-none animate-in fade-in zoom-in-95">
                      <span className="text-[#FF5500] font-bold">{d.subLabel || d.label}: </span>
                      {metric === 'revenue'
                        ? `Rs. ${d.revenue.toLocaleString('en-LK')}`
                        : `${d.orders} bills`}
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-full max-w-[18px] sm:max-w-[24px] h-full flex items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-150 ${
                        isHovered
                          ? 'bg-[#FF5500]'
                          : d.isPeak && val > 0
                          ? 'bg-zinc-800'
                          : val > 0
                          ? 'bg-zinc-300 group-hover:bg-zinc-400'
                          : 'bg-zinc-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Bottom Label */}
                  <div className="mt-1.5 text-center">
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono transition-colors block leading-tight ${
                        isHovered
                          ? 'text-[#FF5500] font-black'
                          : d.isPeak && val > 0
                          ? 'text-zinc-900 font-bold'
                          : 'text-zinc-400'
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Legend */}
      <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-zinc-800" />
            <span>Peak Activity</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-zinc-300" />
            <span>Standard Activity</span>
          </div>
        </div>
        <span>Calculated from live transactions</span>
      </div>
    </div>
  );
};
