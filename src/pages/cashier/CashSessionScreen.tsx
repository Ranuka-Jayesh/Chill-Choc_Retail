import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { useToast } from '@/stores/toastStore';
import { AppFooter } from '@/components/common/AppFooter';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

export const CashSessionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { cashier, session, endSession, logout } = useCashier();
  const { showToast } = useToast();

  const [countedCashInput, setCountedCashInput] = useState<string>(
    String(session.countedCash !== undefined ? session.countedCash : session.expectedCash)
  );
  const [differenceReason, setDifferenceReason] = useState<string>(
    session.differenceReason || ''
  );

  const countedCash = parseFloat(countedCashInput.replace(/,/g, '')) || 0;
  const difference = countedCash - session.expectedCash;
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  const handleEndSession = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    endSession(countedCash, differenceReason);
    logout();
    showToast('Shift cash session closed and audited successfully', 'success');
    navigate('/cashier/login');
  };

  return (
    <div className="h-screen w-screen bg-white flex flex-col justify-between select-none font-sans overflow-hidden">
      {/* Top Header Bar */}
      <header className="w-full h-12 px-6 sm:px-8 flex justify-between items-center z-10 flex-shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/cashier/pos')}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-black transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Return to POS"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to POS</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
            <img
              src="/logo.png"
              alt="Chill & Choc"
              className="h-7 w-auto object-contain"
            />
            <span className="text-xs sm:text-sm font-black text-black tracking-tight hidden sm:inline">
              CHILL <span className="text-[#FF5500]">&amp;</span> CHOC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700">
          <span className="font-bold text-black">{cashier.name}</span>
          <span className="text-zinc-400">&bull;</span>
          <span className="text-zinc-500">Register {cashier.register}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-2 w-full max-w-4xl mx-auto">
        {/* Minimal Responsive Cash Out Screen */}
        <div className="w-full max-w-3xl flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 animate-in zoom-in-95 duration-200 py-2">
            {/* Left Side: Mascot Artwork & Title */}
            <div className="flex flex-col items-center text-center md:w-[42%] flex-shrink-0">
              <img
                src="/cashout.png"
                alt="Cash Out Mascot"
                className="w-44 sm:w-52 md:w-60 max-h-[170px] sm:max-h-[200px] h-auto object-contain drop-shadow-sm hover:scale-102 transition-transform duration-200 mb-2"
              />
              <h1 className="text-xl sm:text-2xl font-black text-[#3B2011] tracking-tight">
                End Cash Session
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium max-w-[260px]">
                Reconcile physical cash drawer balance to safely close your shift
              </p>
            </div>

            {/* Right Side: Ledger Summary & Count Input Form */}
            <div className="w-full max-w-[340px] sm:max-w-[370px] flex flex-col space-y-4">
              {/* Financial Compact Ledger */}
              <div className="px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Opening Float</span>
                  <span className="font-mono font-semibold text-zinc-800">
                    Rs. {session.openingCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Cash Sales</span>
                  <span className="font-mono font-semibold">
                    + Rs. {session.cashSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {(session.cashIn > 0 || session.cashOut > 0) && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Net Adjustments</span>
                    <span className="font-mono font-semibold">
                      Rs. {(session.cashIn - session.cashOut).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-zinc-200/80 flex justify-between font-black text-sm text-[#3B2011]">
                  <span>EXPECTED CASH</span>
                  <span className="font-mono text-[#FF5500]">
                    Rs. {session.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Counted Cash Form */}
              <form onSubmit={handleEndSession} noValidate className="space-y-4">
                {/* Counted Cash - Bottom Border Only */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 text-center">
                    Counted Physical Drawer Cash
                  </label>
                  <div className="flex items-center justify-center gap-2.5 pb-2 border-b-2 border-zinc-300 focus-within:border-[#FF5500] transition-colors">
                    <span className="text-xl font-black font-mono text-[#FF5500]">
                      Rs.
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={countedCashInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setCountedCashInput(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEndSession();
                        }
                      }}
                      placeholder="0.00"
                      autoFocus
                      className="w-44 sm:w-48 bg-transparent text-center text-3xl font-black font-mono text-zinc-900 placeholder:text-zinc-300 outline-none border-none p-0 leading-none"
                    />
                  </div>
                </div>

                {/* Discrepancy Status Pill */}
                <div
                  className={`px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs ${
                    hasDiscrepancy
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    {hasDiscrepancy ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{hasDiscrepancy ? 'Discrepancy' : 'Exactly Balanced'}</span>
                  </div>
                  <span className="font-mono font-bold text-xs">
                    {difference >= 0 ? `+ Rs. ${difference.toLocaleString()}` : `- Rs. ${Math.abs(difference).toLocaleString()}`}
                  </span>
                </div>

                {/* Reason input if discrepancy */}
                {hasDiscrepancy && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={differenceReason}
                      onChange={(e) => setDifferenceReason(e.target.value)}
                      placeholder="Reason for discrepancy (e.g. change shortage)..."
                      className="w-full text-xs text-zinc-800 placeholder:text-zinc-400 bg-transparent pb-1.5 border-b border-rose-300 focus:border-rose-500 outline-none"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full h-11 rounded-full bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 stroke-[2.5]" />
                    <span>Cash Out &amp; End Shift</span>
                  </button>
                </div>
              </form>
            </div>
        </div>
      </main>

      {/* Footer Pinned at Bottom */}
      <AppFooter className="w-full z-10 flex-shrink-0" />
    </div>
  );
};
