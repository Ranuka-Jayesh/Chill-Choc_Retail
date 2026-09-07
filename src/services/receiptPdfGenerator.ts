import React from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CompletedSale } from '@/types';
import { ThermalReceiptContent } from '@/components/pos/ThermalReceiptContent';

export interface ReceiptPdfOptions {
  paperWidthMm?: 80 | 58;
  renderedHeightMm?: number;
}

/**
 * Measures actual rendered receipt container element in the DOM (in millimeters)
 */
export function measureRenderedReceiptHeightMm(): number | undefined {
  if (typeof document === 'undefined') return undefined;
  const container = document.getElementById('thermal-receipt-container')
    || document.querySelector('.thermal-receipt-root');
  if (!container) return undefined;

  const footer = container.querySelector('[data-receipt-footer="true"]')
    || document.getElementById('receipt-footer-attribution');

  if (footer) {
    const containerTop = container.getBoundingClientRect().top;
    const footerBottom = footer.getBoundingClientRect().bottom;
    const heightPx = footerBottom - containerTop;
    if (heightPx > 40) {
      // 96 DPI CSS standard: 1 px = 25.4 / 96 mm
      // Plus 3.5mm bottom clearance after the footer
      return Math.ceil((heightPx * 25.4) / 96 + 3.5);
    }
  }

  const rect = container.getBoundingClientRect();
  const heightPx = container.scrollHeight || rect.height;
  if (heightPx > 40) {
    return Math.ceil((heightPx * 25.4) / 96 + 3.5);
  }
  return undefined;
}

/**
 * Calculates estimated physical layout height (in mm) of the receipt based on items.
 */
export function calculateReceiptPdfHeightMm(sale: CompletedSale, isCompact = false): number {
  let y = 3.0; // Top padding
  const logoSize = isCompact ? 16 : 25.4;
  y += logoSize + 1.5;
  y += 2.8 + 3.5 + 3.5; // Address, Tel, Divider
  y += 3.6 + 3.0 + 3.0; // Invoice header, Date, Cashier
  if (sale.customer?.name) y += 3.0;
  y += 3.2 + 3.4; // Divider, Items header
  y += sale.items.length * 4.2; // Line items
  y += 3.2 + 3.2; // Divider, Subtotal
  if (sale.discountTotal > 0) y += 3.2;
  y += 3.5 + 4.0 + 3.2; // Divider, Total, Divider
  y += 3.0 + 3.0 + 3.5 + 3.2; // Payment method, Cash, Change, Divider
  y += 2.8 + 3.2 + 11.5 + 3.5; // Thank you, Barcode, Divider
  y += 2.8 + 3.5; // Footer attribution
  y += 3.5; // Bottom clearance
  return Math.ceil(y);
}

/**
 * Builds a print-ready jsPDF document rendered directly from the ThermalReceiptContent
 * DOM component at 1:1 scale, exactly matching Chrome browser print preview at 100%.
 *
 * - Page width: exactly 80mm (or 58mm compact)
 * - Page height: dynamic, matching exact rendered receipt content + 4mm clearance
 * - Font physical size: identical to Chrome print (Plus Jakarta Sans)
 * - Logo physical size: identical (w-24 = 25.4mm / 1 inch)
 * - Barcode physical size: identical (w-44 h-8 = 46.56mm x 8.47mm)
 * - Zero artificial CSS transform: scale() or canvas compression
 */
export async function createReceiptPdfDoc(
  sale: CompletedSale,
  options: ReceiptPdfOptions = {}
): Promise<jsPDF> {
  const paperWidth = options.paperWidthMm === 58 ? 58 : 80;

  if (typeof document === 'undefined') {
    const doc = new jsPDF({ unit: 'mm', format: [paperWidth, 150], orientation: 'portrait' });
    doc.text(`Invoice: #${sale.invoiceNumber || sale.id}`, 10, 10);
    return doc;
  }

  // 1. Create a dedicated off-screen print mount with identical styles to print CSS
  const container = document.createElement('div');
  container.id = 'pdf-thermal-capture-mount';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = `${paperWidth}mm`;
  container.style.maxWidth = `${paperWidth}mm`;
  container.style.padding = '0 1.5mm 4mm 1.5mm';
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  container.style.margin = '0';
  container.style.overflow = 'visible';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  // 2. Render the exact ThermalReceiptContent component with isPrintMode=true
  const root = createRoot(container);
  root.render(
    React.createElement(ThermalReceiptContent, {
      sale,
      paperWidth,
      isPrintMode: true,
    })
  );

  try {
    // 3. Wait for React 19 to commit DOM layout
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 60);
        });
      });
    });

    // 4. Ensure all document fonts (e.g. Plus Jakarta Sans) are fully loaded
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback continues
      }
    }

    // 5. Ensure logo and all images are fully loaded and decoded
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 800);
          });
        }
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            // Fallback continues
          }
        }
      })
    );

    // 6. Capture element at scale: 2 (supersampling for sharp 203 DPI thermal printheads)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 7. Calculate physical dimensions in mm (96 CSS px = 25.4 mm)
    const cssHeightPx = canvas.height / 2;
    const heightMm = Math.ceil((cssHeightPx * 25.4) / 96);
    const widthMm = paperWidth;

    // 8. Create jsPDF with exact physical dimensions matching content
    const doc = new jsPDF({
      unit: 'mm',
      format: [widthMm, heightMm],
      orientation: 'portrait',
      compress: true,
    });

    (doc as any).autoPaging = false;

    // 9. Embed captured receipt image at exact 1:1 physical dimension
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);

    return doc;
  } finally {
    // 10. Clean up off-screen DOM mount
    root.unmount();
    container.remove();
  }
}

/**
 * Returns a base64 Data URL ('data:application/pdf;base64,...')
 */
export async function generateReceiptPdf(
  sale: CompletedSale,
  options: ReceiptPdfOptions = {}
): Promise<string> {
  const doc = await createReceiptPdfDoc(sale, options);
  return doc.output('dataurlstring');
}

/**
 * Direct file download helper for cashier / manager records
 */
export async function downloadReceiptPdf(
  sale: CompletedSale,
  options: ReceiptPdfOptions = {}
): Promise<void> {
  const doc = await createReceiptPdfDoc(sale, options);
  doc.save(`${sale.invoiceNumber || 'receipt'}.pdf`);
}
