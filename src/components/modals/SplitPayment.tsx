import React, { useState } from 'react';
import { PaymentMethod, PaymentTender } from '@/types';
import { Plus, Trash2, Banknote, CreditCard, Building2, Ticket, HelpCircle } from 'lucide-react';

interface SplitPaymentProps {
  totalDue: number;
  tenders: PaymentTender[];
  onChangeTenders: (tenders: PaymentTender[]) => void;
}

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  voucher: Ticket,
  other: HelpCircle,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card (Visa / MC)',
  bank_transfer: 'Bank Transfer',
  voucher: 'Confectionery Voucher',
  other: 'Other',
};

export const SplitPayment: React.FC<SplitPaymentProps> = ({
  totalDue,
  tenders,
  onChangeTenders,
}) => {
  const [newMethod, setNewMethod] = useState<PaymentMethod>('card');
  const [newAmount, setNewAmount] = useState<string>('');

  const totalPaid = tenders.reduce((sum, t) => sum + t.amount, 0);
  const remaining = Math.max(0, totalDue - totalPaid);

  const handleAddTender = () => {
    const amt = parseFloat(newAmount) || remaining;
    if (amt <= 0) return;

    const tenderAmount = Math.min(amt, remaining > 0 ? remaining : amt);
    onChangeTenders([...tenders, { method: newMethod, amount: tenderAmount }]);
    setNewAmount('');
  };

  const handleRemoveTender = (index: number) => {
    const updated = tenders.filter((_, i) => i !== index);
    onChangeTenders(updated);
  };

  return (
    <div className="space-y-3">
      {/* Balance Tracker */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
            Total Due
          </span>
          <span className="text-xs font-black text-black font-mono tabular-numbers">
            Rs. {totalDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
            Paid
          </span>
          <span className="text-xs font-black text-black font-mono tabular-numbers">
            Rs. {totalPaid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#FF5500] block">
            Remaining
          </span>
          <span className={`text-xs font-black font-mono tabular-numbers ${remaining === 0 ? 'text-black' : 'text-[#FF5500]'}`}>
            Rs. {remaining.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Added Tenders List */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-black block">
          Applied Split Payments ({tenders.length})
        </span>

        {tenders.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-1">
            No partial payments added yet. Add tender lines below.
          </p>
        ) : (
          tenders.map((tender, index) => {
            const Icon = METHOD_ICONS[tender.method] || CreditCard;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-xl border border-zinc-200 bg-white shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-black text-[#FF5500] flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-black block">
                      {METHOD_LABELS[tender.method]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-black tabular-numbers">
                    Rs. {tender.amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => handleRemoveTender(index)}
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Tender Form */}
      {remaining > 0 && (
        <div className="p-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 space-y-2">
          <span className="text-xs font-bold text-black block">
            Add Split Tender Line
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-semibold text-zinc-500 mb-1">
                Method
              </label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value as PaymentMethod)}
                className="w-full h-8 px-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
              >
                <option value="cash">Cash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="voucher">Voucher</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-semibold text-zinc-500 mb-1">
                Amount (Rs.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={String(remaining)}
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-zinc-200 bg-white text-xs font-mono font-bold text-black focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleAddTender}
            className="w-full h-8 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Add Tender (Rs. {newAmount || remaining})</span>
          </button>
        </div>
      )}
    </div>
  );
};
