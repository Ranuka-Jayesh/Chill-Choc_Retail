import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

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
  const [currentDateTime, setCurrentDateTime] = React.useState<{ time: string; date: string }>({
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  });

  React.useEffect(() => {
    const updateDateTime = () => {
      setCurrentDateTime({
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      });
    };
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 px-4 sm:px-6 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-30">
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

      <div className="flex items-center gap-3">
        {/* Date & Time Display (Clean, borderless, icon-free with seconds) */}
        <div className="flex items-center gap-2 px-1 py-1 text-zinc-700 select-none">
          <span className="text-xs font-bold text-zinc-600 hidden sm:inline">
            {currentDateTime.date}
          </span>
          <span className="text-zinc-300 hidden sm:inline">&bull;</span>
          <span className="text-xs sm:text-sm font-black font-mono text-[#27140B] tracking-tight">
            {currentDateTime.time}
          </span>
        </div>

        {/* Dynamic Page Actions */}
        {actions}
      </div>
    </header>
  );
};

