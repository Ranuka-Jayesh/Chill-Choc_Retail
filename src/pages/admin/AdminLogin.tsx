import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/stores/adminAuthStore';
import { useOperators } from '@/stores/operatorStore';
import { useReturns } from '@/stores/returnsStore';
import { useToast } from '@/stores/toastStore';
import { ShieldCheck, KeyRound, User, Lock, ArrowRight, UserPlus, Mail, ShieldAlert } from 'lucide-react';
import { AppFooter } from '@/components/common/AppFooter';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdminLoggedIn } = useAdminAuth();
  const { operators, addOperator } = useOperators();
  const { returnRequests } = useReturns();
  const { showToast } = useToast();

  const hasAnyAdmin = operators.some((o) => o.role === 'ADMIN');

  // Normal login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial setup state (when zero admin operators exist)
  const [setupName, setSetupName] = useState('');
  const [setupHandle, setSetupHandle] = useState('@admin');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPin, setSetupPin] = useState('');

  const pendingRefundsCount = returnRequests.filter((r) => r.status === 'Pending Admin Approval').length;

  // If already logged in, redirect immediately to /admin
  React.useEffect(() => {
    if (isAdminLoggedIn) {
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    }
  }, [isAdminLoggedIn, location, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(username, password);
    if (success) {
      if (pendingRefundsCount > 0) {
        showToast(`Welcome! ${pendingRefundsCount} customer return pending admin review`, 'warning');
      } else {
        showToast('Welcome to Chill & Choc Admin Portal', 'success');
      }
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    } else {
      setError('Invalid admin credentials. Please check your username/email and password or PIN.');
      setIsSubmitting(false);
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!setupName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!setupEmail.trim()) {
      setError('Please enter your administrator email');
      return;
    }
    if (!setupPassword.trim() || setupPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    if (!setupPin.trim() || setupPin.length !== 4 || !/^\d{4}$/.test(setupPin)) {
      setError('Security PIN must be exactly 4 numeric digits');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanHandle = setupHandle.startsWith('@') ? setupHandle : `@${setupHandle}`;
      addOperator({
        name: setupName.trim(),
        handle: cleanHandle,
        email: setupEmail.trim().toLowerCase(),
        password: setupPassword.trim(),
        pin: setupPin.trim(),
        role: 'ADMIN',
        status: 'Active',
        avatarColor: 'teal',
        notes: 'Initial Super Administrator & Store Owner',
      });

      // Automatically log the newly registered administrator in
      const success = await login(setupEmail.trim(), setupPassword.trim());
      if (success) {
        showToast('Super Administrator account created successfully!', 'success');
        const destination = (location.state as any)?.from?.pathname || '/admin';
        navigate(destination, { replace: true });
      } else {
        showToast('Account created. Please log in with your credentials.', 'info');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize administrator account');
      setIsSubmitting(false);
    }
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

      {/* Center Card */}
      <main className="w-full max-w-md my-auto py-8">
        {!hasAnyAdmin ? (
          /* INITIAL SETUP: ZERO OPERATORS EXIST */
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-7 sm:p-9 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/80 mx-auto flex items-center justify-center shadow-xs">
                <UserPlus className="w-8 h-8 text-[#FF5500]" />
              </div>
              <h2 className="text-2xl font-black text-[#27140B] tracking-tight">
                Initial System Setup
              </h2>
              <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto">
                No administrator accounts exist. Create your primary Super Administrator account to configure the system.
              </p>
            </div>

            <form onSubmit={handleInitialSetup} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 animate-in fade-in duration-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Store Owner"
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Username / Handle</label>
                  <input
                    type="text"
                    value={setupHandle}
                    onChange={(e) => setSetupHandle(e.target.value)}
                    placeholder="@admin"
                    required
                    className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                    <span>4-Digit PIN</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={setupPin}
                    onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234"
                    required
                    className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all tracking-widest text-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Administrator Email</span>
                </label>
                <input
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@chillandchoc.lk"
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Enter strong password"
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] text-white text-xs font-black tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-lg active:scale-98"
              >
                <span>Create Super Admin &amp; Enter</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        ) : (
          /* REGULAR LOGIN FORM */
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-7 sm:p-9 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
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

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 animate-in fade-in duration-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Username / Email</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter email or handle"
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Password or 4-Digit Security PIN</span>
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
        )}
      </main>

      {/* App Footer */}
      <AppFooter className="w-full max-w-5xl rounded-lg border border-zinc-200 mt-4 shadow-xs" />
    </div>
  );
};
