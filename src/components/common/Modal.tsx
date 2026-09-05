import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  children,
  maxWidth = 'sm',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter' && onConfirm) {
        const isTextarea = document.activeElement instanceof HTMLTextAreaElement;
        if (!isTextarea) {
          e.preventDefault();
          e.stopPropagation();
          onConfirm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    xs: 'max-w-[310px]',
    sm: 'max-w-[350px]',
    md: 'max-w-[420px]',
    lg: 'max-w-[480px]',
    xl: 'max-w-[560px]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        className={`w-full ${maxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col max-h-[86vh] animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        {/* Compact Cute Modal Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-100 bg-white flex-shrink-0">
          <div className="pr-2">
            <h3 className="text-xs font-black text-black tracking-tight leading-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Modal Body with Smart Compact Padding */}
        <div className="p-3.5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
