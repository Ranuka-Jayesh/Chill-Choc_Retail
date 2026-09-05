import React, { useEffect } from 'react';
import { Customer } from '@/types';
import { X } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer?: Customer;
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Global Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[380px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 relative p-6 flex flex-col items-center justify-center animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Coming Soon Graphic */}
        <div className="w-full flex items-center justify-center pt-2 pb-4">
          <img
            src="/comingsoon.png"
            alt="Coming Soon"
            className="w-full max-w-[300px] h-auto object-contain drop-shadow-sm pointer-events-none select-none transition-transform hover:scale-105 duration-200"
          />
        </div>

        {/* Close Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
        >
          Close
        </button>
      </div>
    </div>
  );
};
