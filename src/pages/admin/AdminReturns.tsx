import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useReturns } from '@/stores/returnsStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useToast } from '@/stores/toastStore';
import { ReturnRequest, ReturnItem, SupplierReturn } from '@/types';
import { SupplierClaimModal } from '@/components/admin/SupplierClaimModal';
import {
  RotateCcw,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  FileText,
  Package,
  Layers,
} from 'lucide-react';

export const AdminReturns: React.FC = () => {
  const { returnRequests, approveReturn, rejectReturn, linkSupplierReturn } = useReturns();
  const { supplierReturns, updateClaimStatus } = useSupplierReturns();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'approvals' | 'supplier_rtv'>('approvals');

  // Supplier Claim modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<{
    returnRequestId: string;
    invoiceNumber: string;
    item: ReturnItem;
  } | null>(null);

  const pendingCount = returnRequests.filter(
    (r) => r.status === 'Pending Admin Approval'
  ).length;

  const handleOpenClaim = (returnReq: ReturnRequest, item: ReturnItem) => {
    setSelectedItemForClaim({
      returnRequestId: returnReq.id,
      invoiceNumber: returnReq.invoiceNumber,
      item,
    });
    setClaimModalOpen(true);
  };

  const handleApprove = (reqId: string) => {
    approveReturn(reqId, 'Approved by store administrator');
    showToast('Customer refund approved successfully', 'success');
  };

  const handleReject = (reqId: string) => {
    rejectReturn(reqId, 'Rejected: return window exceeded or product consumed');
    showToast('Return request rejected', 'error');
  };

  return (
    <AdminLayout
      title="Refund Approvals &amp; Supplier Claims"
      subtitle="Inspect customer refunds, trace originating suppliers, and generate supplier debit notes (RTV)"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center justify-between p-1.5 bg-white rounded-2xl border border-zinc-200/90 shadow-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-[#27140B] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Customer Refund Approvals</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('supplier_rtv')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'supplier_rtv'
                  ? 'bg-[#27140B] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Return to Supplier (RTV Claims)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-[#FF5500] text-[10px] font-black">
                {supplierReturns.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-zinc-400 hidden sm:inline px-3">
            Trace defective stock directly back to vendors
          </span>
        </div>

        {/* Tab 1: Customer Refund Approvals */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {returnRequests.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 text-zinc-400 text-xs">
                No customer returns submitted yet.
              </div>
            ) : (
              returnRequests.map((req) => {
                const isPending = req.status === 'Pending Admin Approval';
                const isApproved = req.status === 'Approved';

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-4 ${
                      isPending
                        ? 'border-amber-300 ring-2 ring-amber-100/60'
                        : 'border-zinc-200/90'
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {req.returnCode}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Invoice: <strong className="text-zinc-800">{req.invoiceNumber}</strong>
                        </span>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.timestamp}
                        </span>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="text-[11px] text-zinc-500">
                          Submitted by <strong>{req.submittedBy}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            isPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Returned Items Table with Supplier Traceability */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-zinc-400 font-bold border-b border-zinc-100 text-[11px] uppercase tracking-wider">
                            <th className="py-1.5 px-2">Product Item</th>
                            <th className="py-1.5 px-2">Customer Reason</th>
                            <th className="py-1.5 px-2">Origin Supplier &amp; Batch</th>
                            <th className="py-1.5 px-2 text-right">Refund Qty</th>
                            <th className="py-1.5 px-2 text-right">Refund Amount</th>
                            <th className="py-1.5 px-2 text-right">Supplier Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {req.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/50">
                              <td className="py-2.5 px-2 font-bold text-zinc-900">
                                {item.productName}
                              </td>

                              <td className="py-2.5 px-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    item.reason === 'Damaged' || item.reason === 'Expired'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  {item.reason}
                                </span>
                              </td>

                              {/* Who supplied this product? (Supplier Traceability) */}
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                                  <Building2 className="w-3.5 h-3.5 text-[#FF5500]" />
                                  <span>{item.supplierName || 'Mars Global Foods Importers'}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                                  Batch: {item.batchNumber || 'LOT-MARS-081'}
                                </span>
                              </td>

                              <td className="py-2.5 px-2 text-right font-mono font-bold text-zinc-800">
                                {item.quantity}
                              </td>

                              <td className="py-2.5 px-2 text-right font-mono font-black text-[#FF5500]">
                                Rs. {item.refundAmount.toLocaleString()}
                              </td>

                              {/* Action to Return to Supplier */}
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenClaim(req, item)}
                                  className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF5500] font-bold text-[11px] border border-orange-200 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Charge this item back to the vendor who supplied it"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Return to Supplier</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Actions (Approve / Reject) */}
                    <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-zinc-500">
                        {req.reviewNotes && (
                          <p className="text-[11px] italic text-zinc-600">
                            Audit note: &ldquo;{req.reviewNotes}&rdquo; &bull; {req.reviewedBy}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="text-right mr-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Total Customer Refund
                          </span>
                          <span className="text-sm font-black font-mono text-zinc-900">
                            Rs. {req.totalRefund.toLocaleString()}
                          </span>
                        </div>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Reject Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Customer Refund</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Return to Supplier (RTV Claims) */}
        {activeTab === 'supplier_rtv' && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Supplier Debit Notes &amp; RTV Claims Ledger
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Track chargebacks, warranty credits, and replacement claims sent to vendors
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#FF5500] bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200">
                {supplierReturns.length} Total Claims
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Debit Note #</th>
                    <th className="py-3 px-3">Supplier Name</th>
                    <th className="py-3 px-3">Product Item</th>
                    <th className="py-3 px-3">Batch &amp; Invoice</th>
                    <th className="py-3 px-3">Claim Reason</th>
                    <th className="py-3 px-3 text-right">Debit Claim (Rs.)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {supplierReturns.map((claim) => (
                    <tr key={claim.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                        {claim.returnCode}
                        <span className="block text-[10px] font-normal text-zinc-400">
                          {claim.timestamp}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-zinc-800 block">
                          {claim.supplierName}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-zinc-900 block">{claim.productName}</span>
                        <span className="text-[11px] text-zinc-400">Qty: {claim.quantity}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        <span>{claim.batchNumber}</span>
                        <span className="block text-zinc-400">Inv: {claim.customerInvoiceNumber}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold text-[11px]">
                          {claim.reason}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-[#FF5500]">
                        Rs. {claim.totalDebitAmount.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            claim.claimStatus === 'Credit Note Received'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : claim.claimStatus === 'Dispatched to Supplier'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {claim.claimStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <select
                          value={claim.claimStatus}
                          onChange={(e) =>
                            updateClaimStatus(claim.id, e.target.value as SupplierReturn['claimStatus'])
                          }
                          className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5500] cursor-pointer"
                        >
                          <option value="Pending Dispatch">Pending Dispatch</option>
                          <option value="Dispatched to Supplier">Dispatched to Supplier</option>
                          <option value="Credit Note Received">Credit Note Received</option>
                          <option value="Replacement Received">Replacement Received</option>
                          <option value="Rejected by Supplier">Rejected by Supplier</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Claim Modal */}
      {selectedItemForClaim && (
        <SupplierClaimModal
          isOpen={claimModalOpen}
          onClose={() => {
            setClaimModalOpen(false);
            setSelectedItemForClaim(null);
          }}
          returnRequestId={selectedItemForClaim.returnRequestId}
          invoiceNumber={selectedItemForClaim.invoiceNumber}
          item={selectedItemForClaim.item}
          onClaimCreated={(claimId) => {
            linkSupplierReturn(selectedItemForClaim.returnRequestId, claimId);
          }}
        />
      )}
    </AdminLayout>
  );
};
