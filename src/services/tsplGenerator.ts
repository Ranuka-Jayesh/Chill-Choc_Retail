import { Product } from '@/types';
import { extractProductMeasurement } from './labelConfig';

export type LabelSize = '30x20' | '30x22' | '35x25' | '40x20' | '40x25' | '40x30' | '50x30';

export interface TSPLLabelOptions {
  copies?: number;
  labelType?: 'barcode' | 'shelftag';
  labelSize?: LabelSize;
  storeName?: string;
  batchNumber?: string;
}

function wrapTitle(text: string, maxPerLine: number = 24): string[] {
  const clean = text.trim();
  if (clean.length <= maxPerLine) return [clean];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current ? current + ' ' + w : w).length <= maxPerLine) {
      current = current ? current + ' ' + w : w;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function getCode128Modules(val: string): number {
  let words = 0;
  let i = 0;
  while (i < val.length) {
    if (i + 1 < val.length && /\d/.test(val[i]) && /\d/.test(val[i + 1])) {
      words++;
      i += 2;
    } else {
      words++;
      i++;
    }
  }
  return (words + 2) * 11 + 15;
}

/**
 * Generate TSPL-II commands for thermal barcode label or shelf edge tag
 */
export function generateTSPLLabel(product: Product, options: TSPLLabelOptions = {}): string {
  const copies = Math.max(1, options.copies || 1);
  const labelSize = options.labelSize || '30x22';
  const storeName = (options.storeName || 'Chill&Chock').replace(/"/g, "'");
  const tagline = 'Cool vibe sweet bite';

  const sizeMap: Record<LabelSize, { w: number; h: number }> = {
    '40x20': { w: 40, h: 20 },
    '30x20': { w: 30, h: 20 },
    '30x22': { w: 30, h: 22 },
    '35x25': { w: 35, h: 25 },
    '40x25': { w: 40, h: 25 },
    '40x30': { w: 40, h: 30 },
    '50x30': { w: 50, h: 30 },
  };
  const { w: widthMm, h: heightMm } = sizeMap[labelSize] || { w: 30, h: 22 };

  // Sanitize strings for TSPL text fields
  const cleanName = (product.name || '').replace(/"/g, "'").trim();
  const cleanBarcode = (options.batchNumber || product.barcode || '').trim();
  const cleanWeight = (product.weight || '').replace(/"/g, "'").trim();
  const cleanPrice = product.price.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const { cleanTitle, measurement } = extractProductMeasurement(cleanName, cleanWeight);
  const measurementSuffix = measurement ? ` / ${measurement}` : '';
  const priceDisplay = `Rs. ${cleanPrice}${measurementSuffix}`;
  const lines: string[] = [];

  lines.push(`SIZE ${widthMm} mm, ${heightMm} mm`);
  lines.push('GAP 2 mm, 0 mm');
  lines.push('REFERENCE 0, 0');
  lines.push('DIRECTION 1,0');
  lines.push('CLS');

  // Center-aligned TSPL elements
  const centerX = Math.round(widthMm * 4); // 8 dots/mm -> center dot coordinate is widthMm * 4

  // Dynamically calculate barcode module width and exact centered start coordinate
  let tsplNarrow = 1;
  let barcodeStartX = 10;
  let barcodeHeight = 32;

  if (cleanBarcode) {
    const totalModules = getCode128Modules(cleanBarcode);
    const widthDots = widthMm * 8;
    const printableDots = widthDots - 16; // 8 dots (~1.0mm) minimum margin
    tsplNarrow = Math.floor(printableDots / totalModules) >= 2 ? 2 : 1;
    const barcodeWidth = totalModules * tsplNarrow;
    barcodeStartX = Math.max(6, Math.round((widthDots - barcodeWidth) / 2));

    if (heightMm <= 20) {
      barcodeHeight = 52;
    } else if (heightMm <= 22) {
      barcodeHeight = 54;
    } else if (heightMm <= 25) {
      barcodeHeight = 66;
    } else {
      barcodeHeight = 82;
    }
  }

  if (heightMm <= 20) {
    const wrapped = wrapTitle(cleanTitle, widthMm >= 40 ? 24 : 18);
    lines.push(`TEXT ${centerX}, 4, "2", 0, 1, 1, 2, "${storeName}"`);
    lines.push(`TEXT ${centerX}, 26, "2", 0, 1, 1, 2, "${wrapped[0] || cleanTitle}"`);
    lines.push(`TEXT ${centerX}, 48, "3", 0, 1, 1, 2, "${priceDisplay}"`);
    if (cleanBarcode) {
      lines.push(`BARCODE ${barcodeStartX}, 74, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
    }
  } else if (heightMm <= 22) {
    // 30x22 mm: Perfectly balanced vertical rhythm within 176 dots
    const wrapped = wrapTitle(cleanTitle, 18);
    lines.push(`TEXT ${centerX}, 8, "2", 0, 1, 1, 2, "${storeName}"`);
    lines.push(`TEXT ${centerX}, 28, "2", 0, 1, 1, 2, "${wrapped[0] || cleanTitle}"`);
    lines.push(`TEXT ${centerX}, 50, "3", 0, 1, 1, 2, "${priceDisplay}"`);
    if (cleanBarcode) {
      lines.push(`BARCODE ${barcodeStartX}, 78, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
    }
  } else if (heightMm <= 25) {
    // 35x25 & 40x25
    const wrapped = wrapTitle(cleanTitle, widthMm >= 40 ? 26 : 22);
    lines.push(`TEXT ${centerX}, 4, "2", 0, 1, 1, 2, "${storeName}"`);
    lines.push(`TEXT ${centerX}, 24, "1", 0, 1, 1, 2, "${tagline}"`);
    if (wrapped.length > 1) {
      lines.push(`TEXT ${centerX}, 38, "2", 0, 1, 1, 2, "${wrapped[0]}"`);
      lines.push(`TEXT ${centerX}, 56, "2", 0, 1, 1, 2, "${wrapped[1]}"`);
      lines.push(`TEXT ${centerX}, 76, "4", 0, 1, 1, 2, "${priceDisplay}"`);
      if (cleanBarcode) {
        lines.push(`BARCODE ${barcodeStartX}, 104, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
      }
    } else {
      lines.push(`TEXT ${centerX}, 42, "3", 0, 1, 1, 2, "${wrapped[0]}"`);
      lines.push(`TEXT ${centerX}, 68, "4", 0, 1, 1, 2, "${priceDisplay}"`);
      if (cleanBarcode) {
        lines.push(`BARCODE ${barcodeStartX}, 98, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
      }
    }
  } else {
    // 30mm height (40x30, 50x30)
    const wrapped = wrapTitle(cleanTitle, widthMm >= 50 ? 28 : 24);
    lines.push(`TEXT ${centerX}, 6, "3", 0, 1, 1, 2, "${storeName}"`);
    lines.push(`TEXT ${centerX}, 28, "2", 0, 1, 1, 2, "${tagline}"`);
    if (wrapped.length > 1) {
      lines.push(`TEXT ${centerX}, 48, "3", 0, 1, 1, 2, "${wrapped[0]}"`);
      lines.push(`TEXT ${centerX}, 70, "3", 0, 1, 1, 2, "${wrapped[1]}"`);
      lines.push(`TEXT ${centerX}, 94, "4", 0, 1, 1, 2, "${priceDisplay}"`);
      if (cleanBarcode) {
        lines.push(`BARCODE ${barcodeStartX}, 124, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
      }
    } else {
      lines.push(`TEXT ${centerX}, 52, "4", 0, 1, 1, 2, "${wrapped[0]}"`);
      lines.push(`TEXT ${centerX}, 84, "4", 0, 1, 1, 2, "${priceDisplay}"`);
      if (cleanBarcode) {
        lines.push(`BARCODE ${barcodeStartX}, 118, "128", ${barcodeHeight}, 2, 0, ${tsplNarrow}, ${tsplNarrow * 2}, "${cleanBarcode}"`);
      }
    }
  }

  lines.push(`PRINT ${copies}, 1`);

  return lines.join('\r\n') + '\r\n';
}
