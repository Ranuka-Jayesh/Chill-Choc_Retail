import React, { useState, useEffect } from 'react';
import { Menu, Wifi, Database, RefreshCw, Printer } from 'lucide-react';
import { usePrinter } from '@/hooks/usePrinter';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onToggleMobileMenu?: () => void;
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  onToggleMobileMenu,
  actions,
}) => {
  const { isConnected, reconnect } = usePrinter();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
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
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  return (
    <header className="h-14 px-4 sm:px-6 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu & Screen Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        <h1 className="text-base sm:text-lg font-black text-[#27140B] tracking-tight leading-none">
          {title}
        </h1>
      </div>

      {/* Right: Clock & Status Indicators Matching POS Header Design */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Real-time Clock & Date */}
        <div className="text-right hidden sm:block">
          <div className="text-xs sm:text-[13px] font-black text-[#27140B] font-mono tabular-numbers leading-none tracking-tight">
            {currentTime || '06:50:52 PM'}
          </div>
          <div className="text-[9.5px] sm:text-[10px] font-medium text-zinc-400 mt-0.5 leading-none">
            {currentDate || 'Mon, Sep 7'}
          </div>
        </div>

        {/* Connectivity & Device Status Capsule (Wifi, Database, Sync, Printer) */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/80 shadow-2xs">
          <div
            title={isOnline ? "Wi-Fi: Connected (Online)" : "Wi-Fi: Offline"}
            className={`flex items-center justify-center ${isOnline ? 'text-emerald-600' : 'text-zinc-400'}`}
          >
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <div
            title="Database: Connected (Online)"
            className="flex items-center justify-center text-emerald-600"
          >
            <Database className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <button
            type="button"
            onClick={handleSync}
            title={isSyncing ? "Syncing..." : "Cloud Sync: Synced (Click to sync)"}
            className="flex items-center justify-center text-emerald-600 hover:text-black transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.2] ${isSyncing ? 'animate-spin text-[#FF5500]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (isConnected || isReconnecting) return;
              setIsReconnecting(true);
              await reconnect();
              setIsReconnecting(false);
            }}
            title={isConnected ? "Receipt Printer: Ready" : "Receipt Printer: Click to connect"}
            className={`flex items-center justify-center transition-colors cursor-pointer ${
              isConnected ? 'text-emerald-600' : 'text-emerald-600 hover:text-black'
            }`}
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Dynamic Page Actions */}
        {actions}
      </div>
    </header>
  );
};
