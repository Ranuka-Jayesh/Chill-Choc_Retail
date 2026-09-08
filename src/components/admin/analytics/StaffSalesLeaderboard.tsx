import React from 'react';
import { Award, Users, TrendingUp, Gift } from 'lucide-react';

export interface RepSalesStat {
  id: string;
  name: string;
  role: string;
  code?: string;
  avatarInitials: string;
  totalBills: number;
  totalUnits: number;
  totalRevenue: number;
  percentageOfStoreSales: number;
  recommendedBonus: number;
}

interface StaffSalesLeaderboardProps {
  stats: RepSalesStat[];
  totalStoreSales: number;
}

export const StaffSalesLeaderboard: React.FC<StaffSalesLeaderboardProps> = ({
  stats,
  totalStoreSales,
}) => {
  const topPerformer = stats[0];

  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Salesperson &amp; Staff Attribution Leaderboard
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Sales performance attributed to floor staff and cashiers
            </p>
          </div>
        </div>

        {topPerformer && topPerformer.totalRevenue > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold self-start sm:self-auto">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Top Seller: {topPerformer.name} ({topPerformer.percentageOfStoreSales.toFixed(0)}%)</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full text-left text-xs border-collapse min-w-[550px]">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
              <th className="py-2.5 px-3.5">Rank &amp; Salesperson</th>
              <th className="py-2.5 px-3.5">Role</th>
              <th className="py-2.5 px-3.5 text-right">Bills Handled</th>
              <th className="py-2.5 px-3.5 text-right">Units Sold</th>
              <th className="py-2.5 px-3.5 text-right">Attributed Sales</th>
              <th className="py-2.5 px-3.5 text-right">Store Share</th>
              <th className="py-2.5 px-3.5 text-right">Rec. Incentive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {stats.map((sp, idx) => {
              const isTop = idx === 0 && sp.totalRevenue > 0;
              return (
                <tr key={sp.id} className="hover:bg-zinc-50/50">
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isTop ? 'bg-amber-400 text-amber-950 shadow-xs' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#27140B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {sp.avatarInitials}
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 block">{sp.name}</span>
                        {sp.code && <span className="font-mono text-[10px] text-zinc-400">{sp.code}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-500 text-[11px]">
                    {sp.role}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-700">
                    {sp.totalBills}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-700">
                    {sp.totalUnits}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-zinc-900">
                    Rs. {sp.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5500] rounded-full"
                          style={{ width: `${Math.min(100, sp.percentageOfStoreSales)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-700 font-mono">
                        {sp.percentageOfStoreSales.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                      <Gift className="w-3 h-3 text-emerald-600" />
                      Rs. {sp.recommendedBonus.toLocaleString('en-LK')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
