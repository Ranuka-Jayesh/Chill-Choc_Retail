export type { LabelSize } from './escposLabelGenerator';
import { LabelSize } from './escposLabelGenerator';

export interface LabelSizeDefinition {
  id: LabelSize;
  name: string;
  widthMm: number;
  heightMm: number;
  badge: string;
  badgeClass: string;
  badgeActiveRing: string;
  description: string;
  showTagline: boolean;
  // Browser print CSS tokens (black and white thermal)
  brandFontSizePt: number;
  taglineFontSizePt: number;
  titleFontSizePt: number;
  priceFontSizePt: number;
  barcodeSvgHeight: number;
  barcodeMaxBarWidth: number;
  barcodeFontSizePt: number;
  pagePadding: string;
  // UI simulation preview tokens (exact aspect ratio, pure black text)
  previewWidthPx: number;
  previewHeightPx: number;
  previewBrandClass: string;
  previewTaglineClass: string;
  previewTitleClass: string;
  previewPriceClass: string;
  previewBarcodeHeight: number;
  previewBarcodeTextClass: string;
}

export const LABEL_SIZE_CONFIGS: Record<LabelSize, LabelSizeDefinition> = {
  '40x20': {
    id: '40x20',
    name: '40 × 20 mm',
    widthMm: 40,
    heightMm: 20,
    badge: 'Recommended',
    badgeClass: 'bg-zinc-900 text-white border-black',
    badgeActiveRing: 'ring-black',
    description: 'Primary compact thermal retail sticker (tagline omitted for clean spacing)',
    showTagline: false,
    brandFontSizePt: 7.2,
    taglineFontSizePt: 0,
    titleFontSizePt: 7.0,
    priceFontSizePt: 9.6,
    barcodeSvgHeight: 20,
    barcodeMaxBarWidth: 180,
    barcodeFontSizePt: 5.0,
    pagePadding: '0.6mm 1mm',
    previewWidthPx: 300,
    previewHeightPx: 150,
    previewBrandClass: 'font-sans font-black text-[19px] text-black leading-none tracking-tight',
    previewTaglineClass: 'hidden',
    previewTitleClass: 'font-sans font-bold text-[13px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[19px] text-black leading-none tracking-tight mt-1',
    previewBarcodeHeight: 24,
    previewBarcodeTextClass: 'font-mono font-bold text-[10px] text-black leading-none tracking-wider mt-1',
  },
  '30x22': {
    id: '30x22',
    name: '30 × 22 mm',
    widthMm: 30,
    heightMm: 22,
    badge: 'Responsive Mini',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Perfect responsive mini retail sticker with 2mm extra height for clean barcode clearance',
    showTagline: false,
    brandFontSizePt: 6.8,
    taglineFontSizePt: 0,
    titleFontSizePt: 6.5,
    priceFontSizePt: 9.5,
    barcodeSvgHeight: 28,
    barcodeMaxBarWidth: 165,
    barcodeFontSizePt: 4.8,
    pagePadding: '0.5mm 0.8mm',
    previewWidthPx: 255,
    previewHeightPx: 187,
    previewBrandClass: 'font-sans font-black text-[18px] text-black leading-none tracking-tight',
    previewTaglineClass: 'hidden',
    previewTitleClass: 'font-sans font-bold text-[12px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[19px] text-black leading-none tracking-tight mt-1',
    previewBarcodeHeight: 32,
    previewBarcodeTextClass: 'font-mono font-bold text-[10px] text-black leading-none tracking-wider mt-1',
  },
  '30x20': {
    id: '30x20',
    name: '30 × 20 mm',
    widthMm: 30,
    heightMm: 20,
    badge: 'Ultra Compact',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Ultra-compact sticker (tagline hidden for barcode safety)',
    showTagline: false,
    brandFontSizePt: 6.5,
    taglineFontSizePt: 0,
    titleFontSizePt: 6.2,
    priceFontSizePt: 9.0,
    barcodeSvgHeight: 26,
    barcodeMaxBarWidth: 165,
    barcodeFontSizePt: 4.5,
    pagePadding: '0.4mm 0.8mm',
    previewWidthPx: 255,
    previewHeightPx: 170,
    previewBrandClass: 'font-serif font-black text-[18px] text-black leading-none tracking-tight',
    previewTaglineClass: 'hidden',
    previewTitleClass: 'font-sans font-bold text-[11.5px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[19px] text-black leading-none tracking-tight mt-1',
    previewBarcodeHeight: 30,
    previewBarcodeTextClass: 'font-mono font-bold text-[10px] text-black leading-none tracking-wider mt-1',
  },
  '35x25': {
    id: '35x25',
    name: '35 × 25 mm',
    widthMm: 35,
    heightMm: 25,
    badge: 'Small',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Small confectionery sticker',
    showTagline: true,
    brandFontSizePt: 7.6,
    taglineFontSizePt: 4.0,
    titleFontSizePt: 7.5,
    priceFontSizePt: 10.5,
    barcodeSvgHeight: 32,
    barcodeMaxBarWidth: 195,
    barcodeFontSizePt: 5.0,
    pagePadding: '0.6mm 1.2mm',
    previewWidthPx: 280,
    previewHeightPx: 200,
    previewBrandClass: 'font-serif font-black text-[21px] text-black leading-none tracking-tight',
    previewTaglineClass: 'font-sans font-normal text-[10.5px] text-black leading-none mt-1',
    previewTitleClass: 'font-sans font-bold text-[13px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[21px] text-black leading-none tracking-tight mt-1.5',
    previewBarcodeHeight: 32,
    previewBarcodeTextClass: 'font-mono font-bold text-[11px] text-black leading-none tracking-wider mt-1',
  },
  '40x25': {
    id: '40x25',
    name: '40 × 25 mm',
    widthMm: 40,
    heightMm: 25,
    badge: 'Spacious Small',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Versatile label with extra vertical breathing room',
    showTagline: true,
    brandFontSizePt: 8.0,
    taglineFontSizePt: 4.2,
    titleFontSizePt: 8.0,
    priceFontSizePt: 11.2,
    barcodeSvgHeight: 32,
    barcodeMaxBarWidth: 210,
    barcodeFontSizePt: 5.2,
    pagePadding: '0.8mm 1.4mm',
    previewWidthPx: 304,
    previewHeightPx: 190,
    previewBrandClass: 'font-serif font-black text-[22px] text-black leading-none tracking-tight',
    previewTaglineClass: 'font-sans font-normal text-[11px] text-black leading-none mt-1',
    previewTitleClass: 'font-sans font-bold text-[13.5px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[22px] text-black leading-none tracking-tight mt-1.5',
    previewBarcodeHeight: 34,
    previewBarcodeTextClass: 'font-mono font-bold text-[11.5px] text-black leading-none tracking-wider mt-1',
  },
  '40x30': {
    id: '40x30',
    name: '40 × 30 mm',
    widthMm: 40,
    heightMm: 30,
    badge: 'Standard',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Standard retail sticker',
    showTagline: true,
    brandFontSizePt: 8.4,
    taglineFontSizePt: 4.5,
    titleFontSizePt: 8.8,
    priceFontSizePt: 12.0,
    barcodeSvgHeight: 38,
    barcodeMaxBarWidth: 215,
    barcodeFontSizePt: 5.5,
    pagePadding: '1mm 1.5mm',
    previewWidthPx: 280,
    previewHeightPx: 210,
    previewBrandClass: 'font-serif font-black text-[22px] text-black leading-none tracking-tight',
    previewTaglineClass: 'font-sans font-normal text-[11px] text-black leading-none mt-1',
    previewTitleClass: 'font-sans font-bold text-[14px] text-black leading-tight mt-1',
    previewPriceClass: 'font-sans font-black text-[23px] text-black leading-none tracking-tight mt-1.5',
    previewBarcodeHeight: 36,
    previewBarcodeTextClass: 'font-mono font-bold text-[12px] text-black leading-none tracking-wider mt-1',
  },
  '50x30': {
    id: '50x30',
    name: '50 × 30 mm',
    widthMm: 50,
    heightMm: 30,
    badge: 'Shelf Edge',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    badgeActiveRing: 'ring-black',
    description: 'Large shelf-edge tag',
    showTagline: true,
    brandFontSizePt: 9.0,
    taglineFontSizePt: 4.8,
    titleFontSizePt: 9.5,
    priceFontSizePt: 13.0,
    barcodeSvgHeight: 40,
    barcodeMaxBarWidth: 260,
    barcodeFontSizePt: 6.0,
    pagePadding: '1mm 2mm',
    previewWidthPx: 330,
    previewHeightPx: 198,
    previewBrandClass: 'font-serif font-black text-[24px] text-black leading-none tracking-tight',
    previewTaglineClass: 'font-sans font-normal text-[11.5px] text-black leading-none mt-1',
    previewTitleClass: 'font-sans font-bold text-[15px] text-black leading-tight mt-1.5',
    previewPriceClass: 'font-sans font-black text-[24px] text-black leading-none tracking-tight mt-1.5',
    previewBarcodeHeight: 38,
    previewBarcodeTextClass: 'font-mono font-bold text-[12.5px] text-black leading-none tracking-wider mt-1',
  },
};

export const ORDERED_LABEL_SIZES: LabelSize[] = [
  '30x22',
  '40x20',
  '30x20',
  '35x25',
  '40x25',
  '40x30',
  '50x30',
];

/**
 * Format single-line product name with weight matching sample: "KitKat 4 Finger 37g"
 */
export function formatDisplayTitle(productName: string, weight?: string): string {
  const cleanName = (productName || '').trim();
  const cleanWeight = (weight || '').trim();
  if (!cleanWeight) return cleanName;

  // Don't append if cleanName already ends with or includes the weight string
  if (cleanName.toLowerCase().endsWith(cleanWeight.toLowerCase())) {
    return cleanName;
  }
  return `${cleanName} ${cleanWeight}`;
}

/**
 * Extract clean product title and measurement unit (e.g., "1kg", "500g", "40g", "330ml", "1l")
 * When a measurement exists, it is displayed as a small suffix after the price: e.g. "Rs. 100.00 / 1kg"
 */
export function extractProductMeasurement(
  productName: string,
  weight?: string
): { cleanTitle: string; measurement: string } {
  let rawWeight = (weight || '').trim();
  let cleanName = (productName || '').trim();

  // Pattern matching standard retail measurements: kg, g, l, ml, oz, pcs, pc
  const unitRegex = /(\d+(?:\.\d+)?\s*(?:kg|g|l|ml|oz|pcs|pc))\b/i;

  if (!rawWeight) {
    const match = cleanName.match(unitRegex);
    if (match) {
      rawWeight = match[1];
    }
  }

  // Remove the measurement and parentheses from product title so it's not duplicated
  if (rawWeight) {
    const escaped = rawWeight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s*');
    cleanName = cleanName
      .replace(new RegExp(`\\s*\\(?${escaped}\\)?\\s*$`, 'i'), '')
      .replace(/\s*\(\s*\)\s*$/, '')
      .trim();
  }

  // Normalize measurement: e.g. "1 kg" -> "1kg", "500 g" -> "500g"
  const cleanMeasurement = rawWeight ? rawWeight.replace(/\s+/g, '') : '';

  return {
    cleanTitle: cleanName || productName,
    measurement: cleanMeasurement,
  };
}

/**
 * Automatically shrink product title font size if the name is long,
 * ensuring it stays clean and readable without overflowing the thermal printable area.
 */
export function getDynamicTitleSizePt(titleLength: number, basePt: number): number {
  if (titleLength > 32) return Math.max(4.8, Math.round(basePt * 0.74 * 10) / 10);
  if (titleLength > 20) return Math.max(5.2, Math.round(basePt * 0.85 * 10) / 10);
  return basePt;
}

