import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/stores/adminAuthStore';
import { useReturns } from '@/stores/returnsStore';
import { useToast } from '@/stores/toastStore';
import { ShieldCheck, KeyRound, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { AppFooter } from '@/components/common/AppFooter';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdminLoggedIn } = useAdminAuth();
  const { returnRequests } = useReturns();
  const { showToast } = useToast();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingRefundsCount = returnRequests.filter((r) => r.status === 'Pending Admin Approval').length;

  // If already logged in, redirect immediately to /admin
  React.useEffect(() => {
    if (isAdminLoggedIn) {
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    }
  }, [isAdminLoggedIn, location, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = login(username, password);
    if (success) {
      if (pendingRefundsCount > 0) {
        showToast(`Welcome! ${pendingRefundsCount} customer return pending admin review`, 'warning');
      } else {
        showToast('Welcome to Chill & Choc Admin Portal', 'success');
      }
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    } else {
      setError('Invalid admin credentials. Use admin / admin123 or PIN 1234');
      setIsSubmitting(false);
    }
  };

  const handleAutofill = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-between items-center p-4 select-none font-sans">
      {/* Top Bar */}
      <header className="w-full max-w-5xl h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Chill & Choc Logo" className="h-8 w-auto object-contain" />
          <span className="text-sm font-black text-[#27140B] tracking-tight">
            CHILL <span className="text-[#FF5500]">&amp;</span> CHOC
          </span>
        </div>
      </header>

      {/* Center Login Card */}
      <main className="w-full max-w-md my-auto py-8">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-7 sm:p-9 space-y-6 animate-in zoom-in-95 duration-200">
          {/* Header & Mascot */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/80 mx-auto flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-8 h-8 text-[#FF5500]" />
            </div>
            <h2 className="text-2xl font-black text-[#27140B] tracking-tight">
              Admin Portal
            </h2>
            <p className="text-xs text-zinc-400 font-medium max-w-xs mx-auto">
              Centralized inventory, multi-supplier restocking, refund approvals &amp; audits
            </p>
          </div>

          {/* Quick Demo Autofill Badge */}
          <div
            onClick={handleAutofill}
            className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs flex items-center justify-between cursor-pointer hover:bg-orange-50/60 hover:border-orange-200 hover:text-[#FF5500] transition-colors"
            title="Click to auto-fill demo credentials"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
              <span className="font-semibold text-[11px]">Demo: admin / admin123 (or PIN 1234)</span>
            </div>
            <span className="text-[10px] font-bold text-[#FF5500] uppercase">Auto-fill</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 animate-in fade-in duration-100">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Admin Username / Email</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>Password or Security PIN</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#27140B] hover:bg-[#180b05] text-white text-xs font-black tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-lg active:scale-98"
            >
              <span>Authenticate &amp; Enter</span>
              <ArrowRight className="w-4 h-4 text-[#FF5500]" />
            </button>
          </form>
        </div>
      </main>

      {/* App Footer */}
      <AppFooter className="w-full max-w-5xl rounded-lg border border-zinc-200 mt-4 shadow-xs" />
    </div>
  );
};
