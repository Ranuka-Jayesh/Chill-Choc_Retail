import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { useOperators } from '@/stores/operatorStore';
import { Delete, ArrowRight, UserCheck, ArrowLeft, ShieldAlert } from 'lucide-react';

export const CashierPin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { cashier, hasActiveSession, session, isBlockedByAdmin, blockedReason } = useCashier();
  const { isOperatorBlocked, getOperatorByPin } = useOperators();

  const handleKeypadPress = (val: string) => {
    if (val === 'back') {
      setPin((prev) => prev.slice(0, -1));
      setError(false);
      setErrorMessage('');
    } else if (val === 'enter') {
      handleContinue(pin);
    } else if (pin.length < 4) {
      const next = pin + val;
      setPin(next);
      setError(false);
      setErrorMessage('');
      if (next.length === 4) {
        handleContinue(next);
      }
    }
  };

  const handleContinue = (enteredPin: string) => {
    if (enteredPin.length === 4) {
      if (isBlockedByAdmin) {
        setError(true);
        setErrorMessage(blockedReason || 'Terminal is blocked by Administrator via WebSocket.');
        return;
      }
      const matchedOp = getOperatorByPin(enteredPin);
      if (!matchedOp) {
        setError(true);
        setErrorMessage('Invalid PIN. No registered operator found.');
        return;
      }
      if (
        matchedOp.status !== 'Active' ||
        isOperatorBlocked(matchedOp.id) ||
        isOperatorBlocked(matchedOp.handle)
      ) {
        setError(true);
        setErrorMessage(`Operator account (${matchedOp.name} ${matchedOp.handle}) is blocked by Administrator.`);
        return;
      }

      // If cashier does not have an active session, navigate to start-session, else to /pos
      if (!hasActiveSession || session?.isClosed) {
        navigate('/cashier/start-session');
      } else {
        navigate('/cashier/pos');
      }
    } else {
      setError(true);
      setErrorMessage('Please enter a complete 4-digit register PIN');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          const next = pin + e.key;
          setPin(next);
          setError(false);
          if (next.length === 4) {
            handleContinue(next);
          }
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError(false);
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          handleContinue(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, hasActiveSession]);

  return (
    <div className="min-h-screen w-full bg-brand-bg flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-card border border-brand-border p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {/* Small Chill & Choc logo */}
        <img
          src="/logo.png"
          alt="Chill & Choc"
          className="h-14 w-auto object-contain mb-3 drop-shadow-xs"
        />

        {/* Welcome Text */}
        <span className="text-xs font-semibold text-brand-muted">Welcome back,</span>
        <h2 className="text-xl font-extrabold text-brand-brown tracking-tight mt-0.5">
          {cashier.name}
        </h2>

        {/* Outlet & Register Info */}
        <p className="text-xs font-medium text-brand-muted mt-1">
          {cashier.outlet} &bull; Register {cashier.register}
        </p>

        {/* PIN Entry Heading */}
        <p className="text-xs font-bold text-brand-brown mt-6 mb-2">
          Enter your 4-digit PIN
        </p>

        {/* PIN Dots display */}
        <div className="flex items-center gap-3.5 my-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#FF5500] scale-110 shadow-xs'
                    : 'border-2 border-zinc-300 bg-zinc-100'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-600 mt-1 px-2 py-1 bg-rose-50 rounded-lg border border-rose-100">
            {errorMessage || 'Please enter a complete 4-digit register PIN'}
          </p>
        )}

        {/* Modern Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'enter'].map((key) => {
            if (key === 'back') {
              return (
                <button
                  key={key}
                  onClick={() => handleKeypadPress('back')}
                  className="h-12 rounded-xl bg-zinc-100 text-zinc-600 hover:text-black flex items-center justify-center border border-zinc-200 transition-colors active:scale-95"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }
            if (key === 'enter') {
              return (
                <button
                  key={key}
                  onClick={() => handleContinue(pin)}
                  disabled={pin.length !== 4}
                  className="h-12 rounded-xl bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 flex items-center justify-center transition-all shadow-sm active:scale-95"
                  title="Continue"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className="h-12 rounded-xl bg-white hover:bg-zinc-50 text-black font-mono font-black text-base border border-zinc-200 transition-colors shadow-2xs active:scale-95"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Large Continue Button */}
        <button
          onClick={() => handleContinue(pin)}
          disabled={pin.length !== 4}
          className="w-full h-12 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 mt-6"
        >
          <span>Continue to Terminal</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Switch Account */}
        <button
          onClick={() => navigate('/cashier/login')}
          className="mt-4 text-xs font-bold text-brand-muted hover:text-brand-brown transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Account</span>
        </button>
      </div>
    </div>
  );
};
