import React from 'react';
import { Truck, CheckCircle2, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { PurchaseOrder, SupplierReturn } from '@/types';

interface SupplierProcurementCardProps {
  purchaseOrders: PurchaseOrder[];
  supplierReturns: SupplierReturn[];
}

export const SupplierProcurementCard: React.FC<SupplierProcurementCardProps> = ({
  purchaseOrders,
  supplierReturns,
}) => {
  const totalInvoiced = purchaseOrders.reduce((sum, po) => sum + po.totalInvoiced, 0);
  const totalPaid = purchaseOrders.reduce((sum, po) => sum + po.totalPaid, 0);
  const totalOutstanding = purchaseOrders.reduce((sum, po) => sum + po.balanceDue, 0);

  // Pending post-dated cheques
  const pendingCheques = purchaseOrders
    .filter(
      (po) =>
        po.paymentStatus === 'CHEQUE PENDING' &&
        po.paymentBreakdown.cheque > 0 &&
        po.paymentBreakdown.chequeStatus !== 'CLEARED'
    )
    .map((po) => ({
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      chequeNumber: po.paymentBreakdown.chequeNumber || 'N/A',
      amount: po.paymentBreakdown.cheque,
      dueDate: po.paymentBreakdown.chequeDueDate || po.date,
    }));

  const totalChequeAmount = pendingCheques.reduce((sum, c) => sum + c.amount, 0);

  // Supplier RTV claims
  const totalDebitClaimed = supplierReturns.reduce((sum, r) => sum + r.totalDebitAmount, 0);
  const creditNotesReceived = supplierReturns
    .filter((r) => r.claimStatus === 'Credit Note Received')
    .reduce((sum, r) => sum + r.totalDebitAmount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Procurement & Liabilities Overview */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Procurement &amp; Supplier Liabilities
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Purchase orders and payable balance due
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-500">
            {purchaseOrders.length} Invoices
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Invoiced</span>
            <div className="text-sm font-black text-zinc-900 mt-1 font-mono">
              Rs. {totalInvoiced.toLocaleString('en-LK')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Settled</span>
            <div className="text-sm font-black text-emerald-950 mt-1 font-mono">
              Rs. {totalPaid.toLocaleString('en-LK')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Outstanding</span>
            <div className="text-sm font-black text-rose-950 mt-1 font-mono">
              Rs. {totalOutstanding.toLocaleString('en-LK')}
            </div>
          </div>
        </div>

        {/* Post-Dated Cheques */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Post-Dated Cheques
            </span>
            <span className="font-mono font-bold text-amber-700">
              Rs. {totalChequeAmount.toLocaleString('en-LK')} ({pendingCheques.length} chqs)
            </span>
          </div>

          <div className="max-h-32 overflow-y-auto rounded-xl border border-zinc-100 divide-y divide-zinc-50">
            {pendingCheques.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400 font-medium">
                No pending cheques due.
              </div>
            ) : (
              pendingCheques.map((chq, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between text-xs hover:bg-zinc-50">
                  <div>
                    <span className="font-bold text-zinc-900 block">{chq.supplierName}</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {chq.chequeNumber} • Due: {chq.dueDate}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-zinc-800">
                    Rs. {chq.amount.toLocaleString('en-LK')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Supplier Return Claims (RTV) & Defect Recovery */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Supplier Claims &amp; RTV Recovery
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Defective &amp; expired return recovery from vendors
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-500">
            {supplierReturns.length} Claims
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Debit Notes Dispatched</span>
            <div className="text-base font-black text-zinc-900 mt-1 font-mono">
              Rs. {totalDebitClaimed.toLocaleString('en-LK')}
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">Total damaged/expired claims</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Credit Notes Realized</span>
            <div className="text-base font-black text-emerald-950 mt-1 font-mono">
              Rs. {creditNotesReceived.toLocaleString('en-LK')}
            </div>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">
              {totalDebitClaimed > 0 ? ((creditNotesReceived / totalDebitClaimed) * 100).toFixed(0) : 0}% recovery rate
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-950 block">Vendor Dispute &amp; Replacement Watch</span>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
              Ensure physical return dispatch notes match credit note deductions during subsequent restock invoice payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
