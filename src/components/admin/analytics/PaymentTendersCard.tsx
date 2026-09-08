import React from 'react';
import { CreditCard, Banknote, Landmark, Ticket, Wallet } from 'lucide-react';

export interface TenderBreakdown {
  cash: number;
  card: number;
  bankTransfer: number;
  voucher: number;
  total: number;
}

export interface DrawerAuditSummary {
  totalOpeningFloat: number;
  totalCashSales: number;
  totalCashRefunds: number;
  totalCashExpenses: number;
  totalExpectedCash: number;
  totalActualCounted: number;
  netVariance: number;
  sessionsAuditedCount: number;
}

interface PaymentTendersCardProps {
  tenders: TenderBreakdown;
  drawerAudit: DrawerAuditSummary;
}

export const PaymentTendersCard: React.FC<PaymentTendersCardProps> = ({
  tenders,
  drawerAudit,
}) => {
  const total = tenders.total || 1;
  const cashPct = (tenders.cash / total) * 100;
  const cardPct = (tenders.card / total) * 100;
  const bankPct = (tenders.bankTransfer / total) * 100;
  const voucherPct = (tenders.voucher / total) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Tender Breakdown - Clean Neutral Styling (No bright pastels) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Payment Channels
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Customer tender settlement breakdown
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-700">
            Rs. {tenders.total.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* 4 Tenders Grid - Minimal Neutral Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* Cash */}
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-800 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-zinc-600" />
                Cash
              </span>
              <span className="text-[10px] font-mono font-bold px-1 rounded bg-white border border-zinc-200 text-zinc-700">
                {cashPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 text-sm font-black font-mono text-zinc-900">
              Rs. {tenders.cash.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Card */}
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
                Cards
              </span>
              <span className="text-[10px] font-mono font-bold px-1 rounded bg-white border border-zinc-200 text-zinc-700">
                {cardPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 text-sm font-black font-mono text-zinc-900">
              Rs. {tenders.card.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-800 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-zinc-600" />
                Bank Transfer
              </span>
              <span className="text-[10px] font-mono font-bold px-1 rounded bg-white border border-zinc-200 text-zinc-700">
                {bankPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 text-sm font-black font-mono text-zinc-900">
              Rs. {tenders.bankTransfer.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Voucher */}
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-800 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-zinc-600" />
                Voucher
              </span>
              <span className="text-[10px] font-mono font-bold px-1 rounded bg-white border border-zinc-200 text-zinc-700">
                {voucherPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 text-sm font-black font-mono text-zinc-900">
              Rs. {tenders.voucher.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Cash Drawer Reconciliation */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 text-[#FF5500]" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Drawer Reconciliation
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Closing session counts vs physical register till
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
            {drawerAudit.sessionsAuditedCount} Sessions
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-600 text-[11px]">Recorded Cash Inflow</span>
            <span className="font-mono font-bold text-zinc-900 text-xs">
              Rs. {drawerAudit.totalCashSales.toLocaleString('en-LK')}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-600 text-[11px]">Till Petty Cash Expenses</span>
            <span className="font-mono font-bold text-rose-600 text-xs">
              - Rs. {drawerAudit.totalCashExpenses.toLocaleString('en-LK')}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-600 text-[11px]">Customer Cash Refunds</span>
            <span className="font-mono font-bold text-zinc-600 text-xs">
              - Rs. {drawerAudit.totalCashRefunds.toLocaleString('en-LK')}
            </span>
          </div>

          <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-900 block">
                Drawer Variance
              </span>
              <span className="text-[9px] text-zinc-400">
                Net difference across closed sessions
              </span>
            </div>
            <div className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
              drawerAudit.netVariance === 0
                ? 'bg-zinc-100 text-zinc-700'
                : drawerAudit.netVariance > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {drawerAudit.netVariance === 0
                ? 'Balanced (Rs. 0)'
                : drawerAudit.netVariance > 0
                ? `+ Rs. ${drawerAudit.netVariance.toLocaleString('en-LK')} Over`
                : `- Rs. ${Math.abs(drawerAudit.netVariance).toLocaleString('en-LK')} Short`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
