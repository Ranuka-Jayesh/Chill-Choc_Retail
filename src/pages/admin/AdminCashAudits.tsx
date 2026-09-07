import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useCashier } from '@/stores/cashierStore';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const AdminCashAudits: React.FC = () => {
  const { session, cashMovements, cashier } = useCashier();

  const totalIn = cashMovements
    .filter((m) => m.type === 'Cash In')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOut = cashMovements
    .filter((m) => m.type !== 'Cash In')
    .reduce((sum, m) => sum + m.amount, 0);

  return (
    <AdminLayout
      title="Cash Session &amp; Drawer Audits"
      subtitle="Monitor register float, mid-shift cash movements, and end-of-shift over/short reconciliation"
    >
      <div className="space-y-6">
        {/* Top Active Session Summary Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-50 text-[#FF5500] border border-orange-200/60">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-zinc-900">
                    Active Drawer: Register {session.register || 'POS-01'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                    Live Session
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Assigned Cashier: <strong>{cashier.name}</strong> &bull; Shift Started at {session.startedAt}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Current Drawer Cash
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-[#FF5500]">
                Rs. {session.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Opening Float</span>
              <p className="text-sm font-mono font-bold text-zinc-800">
                Rs. {session.openingCash.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Cash Sales</span>
              <p className="text-sm font-mono font-bold text-emerald-600">
                + Rs. {session.cashSales.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Cash In (Adjustments)</span>
              <p className="text-sm font-mono font-bold text-blue-600">
                + Rs. {session.cashIn.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Cash Out / Drops</span>
              <p className="text-sm font-mono font-bold text-rose-600">
                - Rs. {session.cashOut.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Mid-Shift Cash Movements Table */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Manager-Authorized Cash Movements
              </h3>
              <p className="text-[11px] text-zinc-400">
                Detailed audit trail of mid-shift Cash In, Cash Out, Petty Cash &amp; Bank Drops
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                In: Rs. {totalIn.toLocaleString()}
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Out: Rs. {totalOut.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Reason / Description</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3">Auth Level</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {cashMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No cash adjustments recorded for this shift.
                    </td>
                  </tr>
                ) : (
                  cashMovements.map((mov) => {
                    const isCashIn = mov.type === 'Cash In';

                    return (
                      <tr key={mov.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{mov.timestamp}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                              isCashIn
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isCashIn ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{mov.type}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-zinc-800">
                          {mov.reason}
                          {mov.reference && (
                            <span className="font-mono text-[10px] text-zinc-400 block">
                              Ref: {mov.reference}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-zinc-600">{mov.cashier}</td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Manager Verified</span>
                          </span>
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                            isCashIn ? 'text-blue-600' : 'text-rose-600'
                          }`}
                        >
                          {isCashIn ? '+' : '-'} Rs. {mov.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
