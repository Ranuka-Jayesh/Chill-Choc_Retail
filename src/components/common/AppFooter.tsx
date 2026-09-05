import React from 'react';

interface AppFooterProps {
  className?: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ className = '' }) => {
  return (
    <div
      className={`h-5 px-3 sm:px-4 bg-white border-t border-zinc-100 flex items-center justify-between text-[10px] select-none flex-shrink-0 leading-none ${className}`}
    >
      {/* Left Side: Developed By www.ogotechnology.net */}
      <div className="flex items-center gap-1.5 text-zinc-500 font-normal whitespace-nowrap">
        <span>Developed By</span>
        <a
          href="https://www.ogotechnology.net"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#EA984B] hover:text-[#D97706] font-bold no-underline hover:underline transition-colors cursor-pointer"
        >
          www.ogotechnology.net
        </a>
      </div>

      {/* Right Side: Chill&Choc V1. with dot */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="font-semibold text-zinc-800 tracking-tight text-[10px]">
          Chill&amp;Choc V1.
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#EA984B] inline-block" />
      </div>
    </div>
  );
};
