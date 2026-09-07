import React, { useState } from 'react';
import { ReturnItem, Supplier } from '@/types';
import { Modal } from '@/components/common/Modal';
import { useSuppliers } from '@/stores/supplierStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useToast } from '@/stores/toastStore';
import { Send, Building2, Package, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

interface SupplierClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequestId: string;
  invoiceNumber: string;
  item: ReturnItem | null;
  onClaimCreated?: (claimId: string) => void;
}

export const SupplierClaimModal: React.FC<SupplierClaimModalProps> = ({
  isOpen,
  onClose,
  returnRequestId,
  invoiceNumber,
  item,
  onClaimCreated,
}) => {
  const { suppliers } = useSuppliers();
  const { createSupplierReturn } = useSupplierReturns();
  const { showToast } = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(item?.supplierId || suppliers[0]?.id || '');
  const [claimReason, setClaimReason] = useState<
    'Damaged' | 'Expired' | 'Quality Issue' | 'Packaging Defect' | 'Customer Changed Mind' | 'Wrong Product' | 'Other'
  >((item?.reason as any) || 'Damaged');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (item?.supplierId) {
      setSelectedSupplierId(item.supplierId);
    }
    if (item?.reason) {
      setClaimReason((item.reason as any) || 'Damaged');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  const unitCost = Math.round(item.unitPrice * 0.78);
  const totalDebit = unitCost * item.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const claim = createSupplierReturn({
        supplierId: currentSupplier.id,
        supplierName: currentSupplier.name,
        customerInvoiceNumber: invoiceNumber,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCost,
        totalDebitAmount: totalDebit,
        batchNumber: item.batchNumber || 'N/A',
        reason: claimReason,
        claimStatus: 'Pending Dispatch',
        notes: notes.trim() || `Customer refund claim from invoice ${invoiceNumber}`,
      });

      showToast(`Debit Note ${claim.returnCode} generated for ${currentSupplier.name}`, 'success');
      if (onClaimCreated) onClaimCreated(claim.id);
      onClose();
    } catch (err) {
      showToast('Failed to create supplier claim', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Return to Supplier (Debit Note)" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Item & Origin Info */}
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-sm text-[#27140B] block">{item.productName}</span>
              <span className="text-[11px] text-zinc-500">Invoice: {invoiceNumber}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
              {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-200/70 flex justify-between text-zinc-600">
            <span>Customer Return Reason:</span>
            <span className="font-semibold text-zinc-900">{item.reason}</span>
          </div>
          {item.batchNumber && (
            <div className="flex justify-between text-zinc-600">
              <span>Origin Batch:</span>
              <span className="font-mono text-zinc-900 font-semibold">{item.batchNumber}</span>
            </div>
          )}
        </div>

        {/* Select Supplier to Chargeback */}
        <div className="space-y-1.5">
          <label className="font-bold text-zinc-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Target Supplier to Claim From:</span>
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-400">
            Contact: {currentSupplier.contactPerson} ({currentSupplier.phone})
          </p>
        </div>

        {/* Claim Reason */}
        <div className="space-y-1.5">
          <label className="font-bold text-zinc-700">Supplier Debit Reason:</label>
          <select
            value={claimReason}
            onChange={(e) => setClaimReason(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
          >
            <option value="Damaged">Damaged / Melted Goods</option>
            <option value="Expired">Near Expiry / Expired on Delivery</option>
            <option value="Quality Issue">Quality / Taste Defect</option>
            <option value="Packaging Defect">Packaging Seal Broken</option>
            <option value="Wrong Product">Wrong Spec Dispatched</option>
            <option value="Other">Other Operational Claim</option>
          </select>
        </div>

        {/* Estimated Debit Calculation */}
        <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/70 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">
              Total Debit Claim Amount
            </span>
            <span className="text-xs text-orange-600 font-medium">
              Rs. {unitCost.toLocaleString()} x {item.quantity} units (Wholesale Cost)
            </span>
          </div>
          <span className="text-base font-black text-[#FF5500] font-mono">
            Rs. {totalDebit.toLocaleString()}
          </span>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="font-bold text-zinc-700">Supplier Note / Dispatch Reference (Optional):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g., Driver acknowledged melted carton on delivery batch..."
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-[#FF5500] text-white font-bold hover:bg-[#e04b00] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate Supplier Claim</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
