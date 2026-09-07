import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MOCK_SALESPERSONS, CURRENT_CASHIER } from '@/data/mockEmployees';
import { useSales } from '@/stores/salesStore';
import { useToast } from '@/stores/toastStore';
import { Users, KeyRound, ShieldCheck, Award, TrendingUp, Check, Store } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export const AdminStaff: React.FC = () => {
  const { sales } = useSales();
  const { showToast } = useToast();

  const [cashierPin, setCashierPin] = useState('1234');
  const [managerPassword, setManagerPassword] = useState('admin123');

  // Change PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [tempPin, setTempPin] = useState('');

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPin.length !== 4 || !/^\d+$/.test(tempPin)) {
      showToast('PIN must be exactly 4 digits', 'error');
      return;
    }
    setCashierPin(tempPin);
    showToast(`Cashier ${CURRENT_CASHIER.name} PIN updated to ${tempPin}`, 'success');
    setIsPinModalOpen(false);
    setTempPin('');
  };

  // Calculate commissions per sales rep from salesStore
  const repPerformance = MOCK_SALESPERSONS.map((sp) => {
    let salesCount = 0;
    let revenue = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.salesperson?.id === sp.id) {
          salesCount += item.quantity;
          revenue += item.unitPrice * item.quantity;
        }
      });
    });

    const commission = Math.round(revenue * 0.05); // 5% standard retail commission

    return {
      ...sp,
      salesCount,
      revenue,
      commission,
    };
  });

  return (
    <AdminLayout
      title="Staff &amp; Cashier Credentials"
      subtitle="Manage terminal access PINs, cashier registers, and sales rep commission attribution"
    >
      <div className="space-y-6">
        {/* Terminal Access & Cashier PINs */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                Cashier Terminal Credentials
              </h3>
              <p className="text-[11px] text-zinc-400">
                Security PINs used for register unlock, shift start, and drawer operations
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              1 Active Register
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#27140B] text-white flex items-center justify-center font-bold text-xs">
                {CURRENT_CASHIER.avatarInitials}
              </div>
              <div>
                <span className="font-bold text-sm text-zinc-900 block">
                  {CURRENT_CASHIER.name} ({CURRENT_CASHIER.code})
                </span>
                <span className="text-xs text-zinc-500">
                  Assigned Terminal: <strong>{CURRENT_CASHIER.register}</strong> &bull; {CURRENT_CASHIER.outlet}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Active Unlock PIN
                </span>
                <span className="font-mono text-xs font-bold text-zinc-700 bg-white px-2 py-0.5 rounded border border-zinc-200">
                  •••• ({cashierPin})
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempPin(cashierPin);
                  setIsPinModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#27140B] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Change PIN
              </button>
            </div>
          </div>
        </div>

        {/* Sales Representatives & Commission Leaderboard */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Sales Representatives &amp; Commission Performance
              </h3>
              <p className="text-[11px] text-zinc-400">
                Line-item commission tracking tagged during cashier checkout
              </p>
            </div>
            <span className="text-xs font-semibold text-zinc-500">
              Commission Rate: <strong>5.0% Standard</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-3">Staff Code</th>
                  <th className="py-3 px-3 text-right">Items Sold</th>
                  <th className="py-3 px-3 text-right">Total Attributed Sales</th>
                  <th className="py-3 px-4 text-right">Commission Earned (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {repPerformance.map((rep) => (
                  <tr key={rep.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-[10px]">
                          {rep.avatarInitials}
                        </div>
                        <span className="font-bold text-zinc-900">{rep.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-zinc-500">{rep.code}</td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-700">
                      {rep.salesCount} units
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                      Rs. {rep.revenue.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-[#FF5500]">
                      Rs. {rep.commission.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Change PIN Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Update Cashier Terminal PIN"
        maxWidth="xs"
      >
        <form onSubmit={handleUpdatePin} className="space-y-3 text-xs">
          <p className="text-zinc-500">
            Set the 4-digit PIN for <strong>{CURRENT_CASHIER.name}</strong> to unlock register <strong>{CURRENT_CASHIER.register}</strong>.
          </p>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700">New 4-Digit PIN</label>
            <input
              type="password"
              maxLength={4}
              value={tempPin}
              onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 5678"
              required
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono text-center text-lg font-black tracking-widest text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[#27140B] text-white font-bold hover:bg-black shadow-xs"
            >
              Update PIN
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
