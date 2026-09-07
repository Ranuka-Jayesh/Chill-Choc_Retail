import React from 'react';
import { createPortal } from 'react-dom';
import { CompletedSale } from '@/types';
import { ThermalReceiptContent } from './ThermalReceiptContent';

interface PrintableReceiptPortalProps {
  sale: CompletedSale | null;
  paperWidth?: 80 | 58;
}

export const PrintableReceiptPortal: React.FC<PrintableReceiptPortalProps> = ({
  sale,
  paperWidth = 80,
}) => {
  if (!sale || typeof document === 'undefined') return null;

  return createPortal(
    <div id="print-mount" className="hidden print:block">
      <ThermalReceiptContent sale={sale} paperWidth={paperWidth} isPrintMode={true} />
    </div>,
    document.body
  );
};
