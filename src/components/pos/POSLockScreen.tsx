import React, { useState, useEffect } from 'react';
import { useCashier } from '@/stores/cashierStore';
import { ShieldAlert, Radio, AlertOctagon } from 'lucide-react';

export const POSLockScreen: React.FC = () => {
  const { isLocked, isBlockedByAdmin, blockedReason, unlockPOS } = useCashier();
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
  }, [isLocked, isBlockedByAdmin]);

  useEffect(() => {
    if (!isLocked || isBlockedByAdmin) return;

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
  }, [isLocked, isBlockedByAdmin, unlockPOS]);

  if (!isLocked || window.location.pathname.startsWith('/admin')) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[380px] sm:max-w-[400px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-7 sm:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {isBlockedByAdmin ? (
          /* Real-time Blocked State */
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Pulsing red badge */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                <ShieldAlert className="w-10 h-10 stroke-[2.2] animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600"></span>
              </span>
            </div>

            {/* Blocked Heading */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" />
              <span>Real-Time Security Lockout</span>
            </div>

            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              Terminal Suspended
            </h2>

            <p className="text-xs text-rose-600 font-bold mt-2 px-3 py-2 bg-rose-50/80 rounded-xl border border-rose-100">
              {blockedReason || 'Operator credentials have been blocked by Administrator via WebSocket.'}
            </p>

            <p className="text-xs text-zinc-500 font-medium mt-4 leading-relaxed">
              PIN unlock is disabled while this account is blocked. Please contact your administrator or store manager to reactivate terminal permissions.
            </p>

            <div className="mt-5 w-full pt-4 border-t border-zinc-100 flex items-center justify-center gap-2 text-[11px] text-zinc-400 font-medium">
              <AlertOctagon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Will unlock automatically when restored in Admin</span>
            </div>
          </div>
        ) : (
          /* Normal Locked State */
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
