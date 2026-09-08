import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { useOperators } from '@/stores/operatorStore';
import { LogIn, ShieldAlert } from 'lucide-react';
import { AppFooter } from '@/components/common/AppFooter';

export const CashierLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const pinInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login, hasActiveSession, session } = useCashier();
  const { getOperatorByPin, isOperatorBlocked } = useOperators();

  const executeLogin = (pinCode: string) => {
    setLoginError('');

    if (pinCode.length < 4) {
      setLoginError('Please enter a complete 4-digit PIN');
      return;
    }

    // Strictly check if PIN belongs to an admin-added operator
    const matchedOp = getOperatorByPin(pinCode);
    if (!matchedOp) {
      setLoginError('Invalid PIN. No registered operator found.');
      return;
    }

    // Strictly check if the operator is active
    if (
      matchedOp.status !== 'Active' ||
      isOperatorBlocked(matchedOp.id) ||
      isOperatorBlocked(matchedOp.handle)
    ) {
      setLoginError(
        `Operator account (${matchedOp.name} ${matchedOp.handle}) is blocked by Administrator.`
      );
      return;
    }

    setIsLoading(true);
    login(matchedOp.name);

    const isSessionOuted = !hasActiveSession || session?.isClosed;
    if (isSessionOuted) {
      navigate('/cashier/start-session');
    } else {
      navigate('/cashier/pos');
    }
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    executeLogin(pin);
  };

  // Always keep PIN input focused
  useEffect(() => {
    const timer = setTimeout(() => {
      pinInputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard listener for Enter key and auto-focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          executeLogin(pin);
        }
      } else if (document.activeElement !== pinInputRef.current) {
        pinInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div
      className="h-screen w-screen relative flex flex-col justify-between select-none font-sans overflow-hidden"
      style={{
        backgroundImage: "url('/login.png')",
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay layer so white text and orange accents pop with maximum contrast */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none z-0" />

      {/* Main Centered Form Area */}
      <div className="flex-1 flex items-center justify-center px-4 w-full relative z-10">
        {/* Form Container */}
        <div className="w-full max-w-[330px] sm:max-w-[360px] bg-transparent border-none shadow-none flex flex-col items-center pt-16 sm:pt-20 pb-2 animate-in zoom-in-95 duration-200">
          {/* Header Title (Clean without key icon) */}
          <div className="flex flex-col items-center mb-8 text-center">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cashier PIN Login
            </h2>
            <p className="text-xs text-zinc-300 font-medium mt-1">
              Enter your 4-digit security PIN to access POS
            </p>
          </div>

          {/* PIN Login Area */}
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Underline Field with Centered PIN Input (No key icon) */}
            <div
              onClick={() => pinInputRef.current?.focus()}
              className="w-full pb-3 border-b-2 border-[#FF5500] focus-within:border-orange-400 cursor-pointer transition-colors"
              title="Click and type your 4-digit PIN"
            >
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  setLoginError('');
                  if (val.length === 4) {
                    setTimeout(() => {
                      executeLogin(val);
                    }, 100);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (pin.length === 4) {
                      executeLogin(pin);
                    }
                  }
                }}
                placeholder="••••"
                autoFocus
                className="w-full bg-transparent text-center font-black tracking-[0.4em] text-white placeholder:text-zinc-500 placeholder:tracking-[0.4em] text-3xl outline-none border-none p-0 leading-normal"
              />
            </div>

            {/* Login Error Notification */}
            {loginError && (
              <div className="w-full p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Action Button: Full width rounded-xl with LogIn icon */}
            <div className="pt-2 w-full">
              <button
                type="button"
                onClick={() => executeLogin(pin)}
                disabled={isLoading || pin.length < 4}
                className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  pin.length === 4
                    ? 'bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.99] text-white hover:shadow-lg'
                    : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed shadow-none'
                }`}
              >
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <AppFooter className="w-full z-10" />
    </div>
  );
};
