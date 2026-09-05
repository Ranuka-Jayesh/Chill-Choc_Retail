import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { Mail, Lock, Key, LogIn, Eye, EyeOff } from 'lucide-react';
import { AppFooter } from '@/components/common/AppFooter';

export const CashierLogin: React.FC = () => {
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('cashier.colombo@chillchoc.lk');
  const [password, setPassword] = useState('chillchoc2026');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login, hasActiveSession, session } = useCashier();

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsLoading(true);
    login(email, password);
    const isSessionOuted = !hasActiveSession || session?.isClosed;
    if (isSessionOuted) {
      navigate('/cashier/start-session');
    } else {
      navigate('/cashier/pos');
    }
  };

  // Focus PIN input when switching to PIN mode
  useEffect(() => {
    if (mode === 'pin') {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 50);
    }
  }, [mode]);

  // Global keyboard listener for Enter key and auto-focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'pin') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (pin.length === 4) {
            handleLoginSubmit();
          }
        } else if (document.activeElement !== pinInputRef.current) {
          // If the PIN input is not focused, focus it immediately
          pinInputRef.current?.focus();
        }
      } else {
        // In Password mode, Enter immediately triggers login (if not handled by input)
        const isInputFocused =
          document.activeElement === emailInputRef.current ||
          document.activeElement === passwordInputRef.current;
        if (e.key === 'Enter' && !isInputFocused) {
          e.preventDefault();
          handleLoginSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, pin, email, password]);

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

          {/* Tab Bar: Password & PIN with Bottom Active Line */}
          <div className="w-full flex items-center border-b border-zinc-700/60 mb-7">
            {/* Password Tab */}
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all relative cursor-pointer ${
                mode === 'password' ? 'text-[#FF5500]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Password</span>
              {mode === 'password' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF5500]" />
              )}
            </button>

            {/* PIN Tab */}
            <button
              type="button"
              onClick={() => setMode('pin')}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all relative cursor-pointer ${
                mode === 'pin' ? 'text-[#FF5500]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>PIN</span>
              {mode === 'pin' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF5500]" />
              )}
            </button>
          </div>

          {/* Mode 1: Password Login Pattern (Matching Reference Screenshot 2) */}
          {mode === 'password' ? (
            <form onSubmit={handleLoginSubmit} noValidate className="w-full space-y-6">
              {/* Email Field - Bottom Border Only */}
              <div className="relative group">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-600/80 focus-within:border-[#FF5500] transition-colors">
                  <Mail className="w-4.5 h-4.5 text-[#FF5500] flex-shrink-0" />
                  <input
                    ref={emailInputRef}
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!password) {
                          passwordInputRef.current?.focus();
                        } else {
                          handleLoginSubmit();
                        }
                      }
                    }}
                    placeholder="cashier@chillchoc.lk"
                    className="w-full bg-transparent text-sm font-medium text-white placeholder:text-zinc-400 outline-none border-none p-0 leading-normal"
                  />
                </div>
              </div>

              {/* Password Field - Bottom Border Only */}
              <div className="relative group">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-600/80 focus-within:border-[#FF5500] transition-colors">
                  <Lock className="w-4.5 h-4.5 text-[#FF5500] flex-shrink-0" />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLoginSubmit();
                      }
                    }}
                    placeholder="Password"
                    className="w-full bg-transparent text-sm font-medium text-white placeholder:text-zinc-400 outline-none border-none p-0 leading-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#FF5500] hover:text-[#FF7733] transition-colors cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Action Button: Full width rounded-xl with LogIn icon */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.99] text-white font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-5 h-5 stroke-[2.5]" />
                  <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Mode 2: PIN Login Pattern (Matching Reference Screenshot 1) */
            <div className="w-full flex flex-col items-center space-y-6">
              {/* Underline Field with Key Icon and Centered PIN Input */}
              <div
                onClick={() => pinInputRef.current?.focus()}
                className="w-full flex items-center gap-3 pb-3 border-b border-[#FF5500]/70 focus-within:border-[#FF5500] cursor-pointer transition-colors"
                title="Click and type your 4-digit PIN"
              >
                <Key className="w-5 h-5 text-[#FF5500] flex-shrink-0" />
                <div className="flex-1 flex items-center justify-center">
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(val);
                      if (val.length === 4) {
                        handleLoginSubmit();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (pin.length === 4) {
                          handleLoginSubmit();
                        }
                      }
                    }}
                    placeholder="CHILL&CHOC"
                    autoFocus
                    className="w-full bg-transparent text-center font-bold tracking-[0.25em] text-white placeholder:text-zinc-400 placeholder:tracking-[0.25em] placeholder:text-sm text-xl outline-none border-none p-0 leading-normal"
                  />
                </div>
              </div>

              {/* Action Button for PIN: Full width rounded-xl with LogIn icon */}
              <div className="pt-3 w-full">
                <button
                  type="button"
                  onClick={() => handleLoginSubmit()}
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
          )}
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <AppFooter className="w-full z-10" />
    </div>
  );
};
