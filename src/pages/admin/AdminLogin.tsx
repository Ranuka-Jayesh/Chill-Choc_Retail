import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/stores/adminAuthStore';
import { useOperators } from '@/stores/operatorStore';
import { useReturns } from '@/stores/returnsStore';
import { useToast } from '@/stores/toastStore';
import { ArrowRight, ShieldAlert } from 'lucide-react';
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
    <div
      className="h-screen w-screen relative flex flex-col justify-between select-none font-sans overflow-hidden"
      style={{
        backgroundImage: "url('/loginadmin.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark gradient overlay for contrast and typography clarity */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/70 pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header className="w-full h-14 px-6 sm:px-8 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Chill & Choc Logo" className="h-8 w-auto object-contain drop-shadow-md" />
          <span className="text-sm font-black text-white tracking-tight drop-shadow-sm">
            CHILL <span className="text-[#FF5500]">&amp;</span> CHOC
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-orange-400 border border-white/10 ml-1">
            Admin Portal
          </span>
        </div>
      </header>

      {/* Center Frameless Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 w-full relative z-10">
        <div className="w-full max-w-[340px] sm:max-w-[380px] bg-transparent border-none shadow-none flex flex-col items-center animate-in zoom-in-95 duration-200">
          {!hasAnyAdmin ? (
            /* INITIAL SETUP: ZERO OPERATORS EXIST */
            <div className="w-full space-y-7">
              <div className="flex flex-col items-center text-center">
                <img
                  src="/logobg.webp"
                  alt="Chill & Choc Logo"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl mb-2 select-none pointer-events-none"
                />
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  Initial Setup
                </h2>
              </div>

              <form onSubmit={handleInitialSetup} className="space-y-5 w-full">
                {error && (
                  <div className="w-full p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1">
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Full Name"
                    required
                    className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5"
                  />
                </div>

                {/* Username & PIN Grid */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1">
                    <input
                      type="text"
                      value={setupHandle}
                      onChange={(e) => setSetupHandle(e.target.value)}
                      placeholder="Username (@admin)"
                      required
                      className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5"
                    />
                  </div>
                  <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1">
                    <input
                      type="password"
                      maxLength={4}
                      value={setupPin}
                      onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4-Digit PIN"
                      required
                      className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5 tracking-widest text-center"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1">
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="Administrator Email"
                    required
                    className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5"
                  />
                </div>

                {/* Password */}
                <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1">
                  <input
                    type="password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5 tracking-wider"
                  />
                </div>

                <div className="pt-3 w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Creating Account...' : 'Create Super Admin & Enter'}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* REGULAR LOGIN FORM */
            <div className="w-full space-y-6">
              {/* Header: Logo & Title */}
              <div className="flex flex-col items-center text-center">
                <img
                  src="/logobg.webp"
                  alt="Chill & Choc Logo"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-xl mb-3 select-none pointer-events-none"
                />
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  Admin Portal
                </h1>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-6 w-full">
                {error && (
                  <div className="w-full p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Username / Email field with bottom border only */}
                <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1.5">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username / Email"
                    required
                    autoComplete="username"
                    className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5"
                  />
                </div>

                {/* Password / PIN field with bottom border only */}
                <div className="w-full border-b-2 border-white/30 focus-within:border-[#FF5500] transition-colors pb-1.5">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password or 4-Digit PIN"
                    required
                    autoComplete="current-password"
                    className="w-full bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none border-none py-1.5 tracking-wider"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !username.trim() || !password.trim()}
                    className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      username.trim() && password.trim()
                        ? 'bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white hover:shadow-lg shadow-orange-500/25'
                        : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Enter'}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* App Footer */}
      <AppFooter className="w-full z-10" />
    </div>
  );
};
