import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import { usePrinter } from '@/hooks/usePrinter';
import { POSMoreMenu } from './POSMoreMenu';
import {
  Store,
  User,
  Wallet,
  Wifi,
  Database,
  RefreshCw,
  Maximize,
  Minimize,
  Lock,
  LogOut,
  Printer,
  MoreVertical,
} from 'lucide-react';

interface CashierHeaderProps {
  onOpenCashMovement?: () => void;
  onOpenShortcutsHelp?: () => void;
  onReprintReceipt?: () => void;
  onOpenRepReport?: () => void;
  onOpenHeldBills?: () => void;
}

export const CashierHeader: React.FC<CashierHeaderProps> = ({
  onOpenCashMovement = () => {},
  onOpenShortcutsHelp = () => {},
  onReprintReceipt = () => {},
  onOpenRepReport,
  onOpenHeldBills,
}) => {
  const { cashier, session, lockPOS, logout } = useCashier();
  const { isConnected, reconnect } = usePrinter();
  const navigate = useNavigate();
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard handler for Lock and Logout confirmation modals
  useEffect(() => {
    if (!showLockConfirm && !showLogoutConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowLockConfirm(false);
        setShowLogoutConfirm(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (showLockConfirm) {
          setShowLockConfirm(false);
          lockPOS();
        } else if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
          navigate('/cashier/cash-session');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showLockConfirm, showLogoutConfirm, lockPOS, logout, navigate]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-12 bg-white border-b border-zinc-200 px-2.5 sm:px-4 flex items-center justify-between flex-shrink-0 relative z-30 select-none">
      {/* Left Section: Brand & Register Meta */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto no-scrollbar">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-zinc-200">
          <img
            src="/logo.png"
            alt="Chill & Choc"
            className="h-8 w-auto object-contain transition-transform hover:scale-105"
          />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-black tracking-tight leading-none flex items-center gap-1">
              CHILL <span className="text-[#FF5500]">&</span> CHOC
            </h1>
            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
              COOL VIBES, SWEET BITES
            </p>
          </div>
        </div>

        {/* Outlet Information */}
        <div className="hidden md:flex items-center gap-2 pr-3 border-r border-zinc-200">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200">
            <Store className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              Outlet 02
            </span>
            <span className="text-xs font-bold text-black block leading-tight">
              Colombo Branch
            </span>
          </div>
        </div>

        {/* Cashier Information */}
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-200">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200">
            <User className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              POS-01
            </span>
            <span className="text-xs font-bold text-black block leading-tight">
              {cashier.name}
            </span>
          </div>
        </div>

        {/* Cash Drawer Information - Matching Outlet & Cashier Design (Straight | divider) */}
        <div
          onClick={onOpenCashMovement}
          className="flex items-center gap-2 pr-3 border-r border-zinc-200 cursor-pointer hover:opacity-85 transition-opacity"
          title="Cash Drawer Float & Balance (Click for Cash Movement F10)"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#FF5500] flex items-center justify-center flex-shrink-0 border border-zinc-200">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              Cash Drawer
            </span>
            <span className="text-xs font-bold text-black font-mono block leading-tight">
              Rs. {session.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section: Time, Connectivity, Fullscreen, More Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Real-time Clock & Date */}
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-black font-mono tabular-numbers leading-none">
            {currentTime || '01:33 PM'}
          </div>
          <div className="text-[9px] font-medium text-zinc-400 mt-0.5 leading-none">
            {currentDate || 'Tue, 10 Dec'}
          </div>
        </div>

        {/* Connectivity & Device Status: Wifi, Database, Sync, Printer */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/80">
          <div title="Wi-Fi: Connected (Online)" className="flex items-center justify-center text-emerald-600">
            <Wifi className="w-3.5 h-3.5" />
          </div>
          <div title="Database: Connected" className="flex items-center justify-center text-emerald-600">
            <Database className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            onClick={handleSync}
            title={isSyncing ? "Syncing..." : "Cloud Sync: Synced (Click to sync)"}
            className="flex items-center justify-center text-emerald-600 hover:text-black transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#FF5500]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (isConnected || isReconnecting) return;
              setIsReconnecting(true);
              try {
                await reconnect();
              } catch {
                // Handled in store
              } finally {
                setIsReconnecting(false);
              }
            }}
            title={
              isConnected
                ? "Printer Ready (ws://127.0.0.1:17891)"
                : isReconnecting
                ? "Connecting to Printer..."
                : "Printer Offline / Not Connected (ws://127.0.0.1:17891) - Click to reconnect"
            }
            className={`flex items-center justify-center transition-colors ${
              isConnected
                ? 'text-emerald-600 cursor-default'
                : isReconnecting
                ? 'text-amber-500 hover:text-amber-600 cursor-wait'
                : 'text-rose-500 hover:text-rose-600 cursor-pointer'
            }`}
          >
            <Printer className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isFullscreen
              ? 'bg-orange-50 text-[#FF5500] hover:bg-orange-100/80 shadow-2xs'
              : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
          }`}
          title={isFullscreen ? "Exit Full Screen (Esc)" : "Full Screen (F11)"}
          aria-label={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>

        {/* Lock Terminal Button */}
        <button
          type="button"
          onClick={() => setShowLockConfirm(true)}
          className="w-8 h-8 rounded-lg hover:bg-orange-50 flex items-center justify-center text-zinc-700 hover:text-[#FF5500] transition-colors cursor-pointer"
          title="Lock Terminal"
          aria-label="Lock Terminal"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Logout / Cash Out Button */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-zinc-700 hover:text-rose-600 transition-colors cursor-pointer"
          title="Cash Out & Logout"
          aria-label="Cash Out & Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* More Operations Menu Button */}
        <button
          type="button"
          onClick={() => setIsMoreMenuOpen((prev) => !prev)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isMoreMenuOpen
              ? 'bg-zinc-200 text-black'
              : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
          }`}
          title="More Operations"
          aria-label="More Operations"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* POS More Operations Menu Popup */}
      <POSMoreMenu
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onOpenCashMovement={onOpenCashMovement}
        onOpenShortcutsHelp={onOpenShortcutsHelp}
        onReprintReceipt={onReprintReceipt}
        onOpenRepReport={onOpenRepReport}
        onOpenHeldBills={onOpenHeldBills}
      />

      {/* ========================================================= */}
      {/* CONFIRM LOCK POPUP WITH WARNING MASCOT                    */}
      {/* ========================================================= */}
      {showLockConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100"
          onClick={() => setShowLockConfirm(false)}
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Cute Mascot Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  Lock terminal?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Lock this register terminal?
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLockConfirm(false)}
                    className="flex-1 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLockConfirm(false);
                      lockPOS();
                    }}
                    className="flex-1 h-9 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Lock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRM CASH OUT & LOGOUT POPUP WITH WARNING MASCOT      */}
      {/* ========================================================= */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Cute Mascot Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  End shift & cash out?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Reconcile drawer and log out?
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      navigate('/cashier/cash-session');
                    }}
                    className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Cash Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
