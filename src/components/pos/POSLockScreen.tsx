import React, { useState, useEffect } from 'react';
import { useCashier } from '@/stores/cashierStore';

export const POSLockScreen: React.FC = () => {
  const { isLocked, unlockPOS } = useCashier();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setError(false);
      // Blur any active element so typing doesn't leak into background inputs
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Physical digits 0-9 (top row or numpad)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        setError(false);
        setPin((prev) => {
          if (prev.length < 4) {
            const next = prev + e.key;
            if (next.length === 4) {
              const success = unlockPOS(next);
              if (!success) {
                setError(true);
                return '';
              }
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        setError(false);
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        setPin((current) => {
          if (current.length === 4) {
            const success = unlockPOS(current);
            if (!success) {
              setError(true);
              return '';
            }
          }
          return current;
        });
      } else {
        // Intercept navigation/shortcut keys while terminal is locked
        if (e.key.startsWith('F') || ['Tab', ' '].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isLocked, unlockPOS]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-7 sm:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Big Lock Mascot Image */}
        <div className="relative mb-2 flex items-center justify-center">
          <img
            src="/lock.png"
            alt="Terminal Locked"
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-sm select-none pointer-events-none"
          />
        </div>

        {/* Simple Text */}
        <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
          Terminal Locked
        </h2>
        <p className="text-xs sm:text-sm font-medium text-zinc-400 mt-1">
          Enter 4-digit PIN to unlock
        </p>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3.5 my-5">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'border-2 border-rose-500 bg-rose-50'
                    : isFilled
                    ? 'bg-[#FF5500] scale-110 shadow-sm shadow-orange-500/30 ring-4 ring-[#FF5500]/20'
                    : 'border-2 border-zinc-300 bg-zinc-100'
                }`}
              />
            );
          })}
        </div>

        {/* Simple Error Message */}
        {error && (
          <p className="text-xs font-bold text-rose-600 animate-in fade-in">
            Incorrect PIN. Try again.
          </p>
        )}
      </div>
    </div>
  );
};
