import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { ArrowRight, LogOut } from 'lucide-react';
import { useToast } from '@/stores/toastStore';
import { AppFooter } from '@/components/common/AppFooter';

export const CashierStartSession: React.FC = () => {
  const [openingAmount, setOpeningAmount] = useState<string>('15000');
  const navigate = useNavigate();
  const { startSession, logout } = useCashier();
  const { showToast } = useToast();

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = parseFloat(openingAmount.replace(/,/g, '')) || 0;
    startSession(amount);
    showToast(`Cash session started with Rs. ${amount.toLocaleString()} opening float`, 'success');
    navigate('/cashier/pos');
  };

  return (
    <div className="h-screen w-screen bg-white flex flex-col justify-between select-none font-sans overflow-hidden">
      {/* Main Centered Content Area - Fully Responsive & Centered without Header */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 max-w-md mx-auto w-full animate-in zoom-in-95 duration-200">
        {/* Prominent CASHIN Mascot Artwork */}
        <div className="flex justify-center mb-2 sm:mb-3">
          <img
            src="/CASHIN.png"
            alt="Cash In Drawer Float"
            className="w-48 sm:w-56 md:w-64 max-h-[180px] sm:max-h-[220px] h-auto object-contain drop-shadow-sm hover:scale-102 transition-transform duration-200"
          />
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-xl sm:text-2xl font-black text-[#3B2011] tracking-tight text-center">
          Opening Cash In Float
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5 mb-6 text-center font-medium">
          Enter initial drawer float amount to start your cashier shift
        </p>

        {/* Cash In Form */}
        <form onSubmit={handleStart} noValidate className="w-full max-w-[300px] sm:max-w-[340px] flex flex-col items-center">
          {/* Amount Field - Fixed, Non-scrolling, Bottom Border Only */}
          <div className="w-full mb-7">
            <div className="w-full flex items-center justify-center gap-3 pb-3 border-b-2 border-zinc-300 focus-within:border-[#FF5500] transition-colors">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FF5500] flex-shrink-0 select-none">
                Rs.
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={openingAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setOpeningAmount(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleStart();
                  }
                }}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="0.00"
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-center text-3xl sm:text-4xl font-black font-mono text-[#3B2011] placeholder:text-zinc-300 outline-none border-none p-0 leading-none overflow-hidden"
              />
            </div>
          </div>

          {/* Action Button: Start Cash Session */}
          <div className="w-full flex justify-center">
            <button
              type="submit"
              className="w-full max-w-[250px] sm:max-w-[270px] h-12 rounded-full bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Cash Session</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Switch Cashier / Logout Option */}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/cashier/login');
            }}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer mt-4"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Cashier / Logout</span>
          </button>
        </form>
      </main>

      {/* Footer Pinned At Bottom */}
      <AppFooter className="w-full z-10 flex-shrink-0" />
    </div>
  );
};
