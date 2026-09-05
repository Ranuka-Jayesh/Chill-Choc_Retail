import React from 'react';
import { Modal } from '@/components/common/Modal';
import { AlertCircle, Search, X } from 'lucide-react';

interface BarcodeNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  onSearchManually: () => void;
}

export const BarcodeNotFoundModal: React.FC<BarcodeNotFoundModalProps> = ({
  isOpen,
  onClose,
  barcode,
  onSearchManually,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => {
        onClose();
        onSearchManually();
      }}
      title="Product Not Found"
      maxWidth="xs"
    >
      <div className="flex flex-col items-center text-center py-1 select-none">
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center mb-2 border border-orange-200">
          <AlertCircle className="w-4 h-4" />
        </div>

        <p className="text-xs font-black text-black">
          No product for this barcode
        </p>

        <div className="mt-1.5 px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 font-mono text-[11px] font-bold text-black">
          {barcode}
        </div>

        <p className="text-[11px] text-zinc-400 mt-2">
          Verify code or search manually in catalog.
        </p>

        <div className="mt-3.5 flex items-center gap-2 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 px-2.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onSearchManually();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
