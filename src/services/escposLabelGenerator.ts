import { Product } from '@/types';
import { extractProductMeasurement } from './labelConfig';

export type LabelSize = '30x20' | '35x25' | '40x20' | '40x25' | '40x30' | '50x30';

export interface ESCPOSLabelOptions {
  copies?: number;
  labelType?: 'barcode' | 'shelftag';
  labelSize?: LabelSize;
  storeName?: string;
  batchNumber?: string;
}

/**
 * Standard Code 39 valid character filter
 */
export function sanitizeCode39(val: string): string {
  const raw = (val || '').toUpperCase().trim();
  const stripped = raw.replace(/^\*+|\*+$/g, '');
  const filtered = stripped.replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
  return filtered || 'LOT-001';
}

const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

/**
 * Generate vector SVG string for Code 39 barcode (suitable for HTML printing)
 */
export function generateCode39SvgHtml(value: string, height: number = 36, maxBarWidth: number = 240): string {
  const clean = sanitizeCode39(value);
  const fullText = `*${clean}*`;
  const charCount = fullText.length;
  const totalModules = charCount * 13.5 + (charCount - 1);

  // Dynamically scale narrow module width to expand or contract with maxBarWidth
  let narrow = (maxBarWidth * 0.88) / totalModules;
  narrow = Math.min(1.85, Math.max(0.60, narrow));
  const wide = narrow * 2.5;
  const gap = narrow;
  const quietZone = Math.max(8, narrow * 10);

  const rects: Array<{ x: number; width: number }> = [];
  let currentX = quietZone;

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const w = pattern[j] === '1' ? wide : narrow;
      if (isBar) {
        rects.push({ x: currentX, width: w });
      }
      currentX += w;
    }

    if (i < fullText.length - 1) {
      currentX += gap;
    }
  }

  const totalWidth = Math.ceil(currentX + quietZone);

  let rectsSvg = '';
  rects.forEach((r) => {
    rectsSvg += `<rect x="${r.x.toFixed(2)}" y="0" width="${r.width.toFixed(2)}" height="${height}" fill="#000000" />`;
  });

  return `<svg viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}" style="width:100%;max-width:${Math.min(maxBarWidth, totalWidth)}px;height:${height}px;display:block;margin:0 auto;" shape-rendering="crispEdges"><rect width="${totalWidth}" height="${height}" fill="#ffffff" />${rectsSvg}</svg>`;
}

/**
 * Gracefully wrap long product titles across up to 2 lines without truncating words
 */
function wrapProductTitle(text: string, maxPerLine: number = 28): string[] {
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
  return lines.slice(0, 2);
}

/**
 * Generate native ESC/POS binary commands for thermal receipt/label printers (like Xprinter XP-80TS)
 */
export function generateESCPOSLabel(product: Product, options: ESCPOSLabelOptions = {}): string {
  const copies = Math.max(1, options.copies || 1);
  const labelSize = options.labelSize || '40x20';
  const storeName = (options.storeName || 'Chill&Chock').trim();
  const tagline = 'Cool vibe sweet bite';

  const cleanName = (product.name || '').trim();
  const cleanWeight = (product.weight || '').trim();
  const rawBarcode = (options.batchNumber || product.barcode || '').trim();
  const cleanBarcode = sanitizeCode39(rawBarcode);
  const cleanPrice = product.price.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ESC/POS Control Characters
  const ESC = '\x1B';
  const GS = '\x1D';

  const CMD_INIT = `${ESC}@`; // Initialize printer
  const CMD_ALIGN_CENTER = `${ESC}a\x01`; // Center alignment

  // Tighten line spacing (24 dots instead of default 32 dots)
  const CMD_LINE_SPACING_TIGHT = `${ESC}3\x18`;
  const CMD_LINE_SPACING_RESET = `${ESC}2`;

  // Natural, crisp ESC/POS fonts using universal ESC ! master mode
  const FONT_NORMAL = `${ESC}!\x00`;  // Font A standard (12x24)
  const FONT_BOLD = `${ESC}!\x08`;    // Font A bold (12x24)
  const FONT_SMALL = `${ESC}!\x01`;   // Font B standard (9x17) clean small (no glitch)
  const FONT_BRAND = `${ESC}!\x18`;   // Font A double-height + bold (large brand title)
  const FONT_PRICE = `${ESC}!\x18`;   // Font A double-height + bold (prominent price)

  // Dynamically calculate barcode module width so barcode is always compact and centered (~25-30mm wide)
  // For Code 39, start/stop adds 2 characters
  const code39Chars = cleanBarcode.length + 2;
  // If w=2, width is code39Chars * 29 dots. If that exceeds 280 dots (~35mm), switch to w=1 (14.5 dots/char)
  // This ensures LOT-KIT-040-53 (16 chars) prints at 232 dots (~29mm) instead of 464 dots (58mm)
  const barcodeWidthHex = code39Chars * 29 > 280 ? '\x01' : '\x02';

  // Substantial, easily scannable barcode heights matching preview proportions:
  // 60 dots = 7.5mm (for 20mm labels) -> More than 2x taller than previous 30 dots (3.75mm)!
  // 72 dots = 9.0mm (for 25mm labels)
  // 84 dots = 10.5mm (for 30mm labels)
  let barcodeHeightHex = '\x3C'; // 60 dots default (7.5 mm)
  if (labelSize === '30x20') {
    barcodeHeightHex = '\x34'; // 52 dots (6.5 mm)
  } else if (labelSize === '40x20') {
    barcodeHeightHex = '\x3C'; // 60 dots (7.5 mm)
  } else if (labelSize === '35x25' || labelSize === '40x25') {
    barcodeHeightHex = '\x48'; // 72 dots (9.0 mm)
  } else if (labelSize === '40x30' || labelSize === '50x30') {
    barcodeHeightHex = '\x54'; // 84 dots (10.5 mm)
  }

  const BARCODE_HEIGHT = `${GS}h${barcodeHeightHex}`;
  const BARCODE_WIDTH = `${GS}w${barcodeWidthHex}`;
  const BARCODE_HRI_OFF = `${GS}H\x00`; // Disable printer HRI asterisks
  const BARCODE_PRINT = `${GS}k\x04${cleanBarcode}\x00`; // Code 39

  const CMD_FEED = labelSize === '30x20' || labelSize === '40x20' ? `${ESC}d\x01` : `${ESC}d\x02`;
  const CMD_FEED_SEPARATION = `${ESC}d\x01`;

  const { cleanTitle, measurement } = extractProductMeasurement(cleanName, cleanWeight);
  const titleLines = wrapProductTitle(cleanTitle, labelSize === '30x20' ? 22 : 28);
  const measurementSuffix = measurement ? ` / ${measurement}` : '';

  const singleLabel = [
    CMD_ALIGN_CENTER,
    CMD_LINE_SPACING_RESET,
    // 1. Shop Name: Bold, largest brand text, horizontally centered
    `${FONT_BRAND}${storeName}${FONT_NORMAL}\n`,
    // 2. Tagline: Much smaller than shop name, regular/medium (omitted on 30x20 for barcode safety)
    ...(labelSize !== '30x20' ? [`${FONT_SMALL}${tagline}${FONT_NORMAL}\n`] : []),
    // 3. Product Name: Bold font, centered, max 2 lines
    ...titleLines.map((line) => `${FONT_BOLD}${line}${FONT_NORMAL}\n`),
    // 4. Price: Very bold, large, prominent
    `${FONT_PRICE}Rs. ${cleanPrice}${FONT_BOLD}${measurementSuffix}${FONT_NORMAL}\n`,
    // 5. Barcode Graphic: Scaled to label size (tall, centered, compact width)
    BARCODE_HEIGHT,
    BARCODE_WIDTH,
    BARCODE_HRI_OFF,
    BARCODE_PRINT,
    // 6. Barcode Human-Readable Digits: Clean, centered, bold
    `${FONT_BOLD}${cleanBarcode}${FONT_NORMAL}\n`,
    CMD_FEED,
  ].join('');

  // Repeat for number of copies requested
  let output = CMD_INIT;
  for (let c = 0; c < copies; c++) {
    output += singleLabel;
    if (c < copies - 1) {
      output += CMD_FEED_SEPARATION;
    }
  }

  return output;
}
