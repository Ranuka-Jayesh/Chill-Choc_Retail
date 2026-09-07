import { Product } from '@/types';

export interface TSPLLabelOptions {
  copies?: number;
  labelType?: 'barcode' | 'shelftag';
  storeName?: string;
}

/**
 * Generate TSPL-II commands for thermal barcode label or shelf edge tag
 */
export function generateTSPLLabel(product: Product, options: TSPLLabelOptions = {}): string {
  const copies = Math.max(1, options.copies || 1);
  const labelType = options.labelType || 'barcode';
  const storeName = (options.storeName || 'CHILL & CHOC').replace(/"/g, "'");

  // Sanitize strings for TSPL text fields
  const cleanName = (product.name || '').replace(/"/g, "'").trim();
  const cleanSku = (product.sku || '').replace(/"/g, "'").trim();
  const cleanBarcode = (product.barcode || '').trim();
  const cleanWeight = (product.weight || '').replace(/"/g, "'").trim();
  const cleanPrice = product.price.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const lines: string[] = [];

  if (labelType === 'shelftag') {
    // Shelf Edge Tag (50mm x 30mm) - Optimized for customer readability on retail shelves
    lines.push('SIZE 50 mm, 30 mm');
    lines.push('GAP 2 mm, 0 mm');
    lines.push('DIRECTION 1,0');
    lines.push('CLS');
    // Store mini-banner
    lines.push(`TEXT 20, 15, "2", 0, 1, 1, "${storeName} - SHELF TAG"`);
    // Product Title (Bold font 3)
    lines.push(`TEXT 20, 42, "3", 0, 1, 1, "${cleanName.slice(0, 22)}"`);
    // Weight & SKU
    lines.push(`TEXT 20, 78, "2", 0, 1, 1, "${cleanWeight} | SKU: ${cleanSku}"`);
    // Code 128 Barcode with human readable digits underneath
    if (cleanBarcode) {
      lines.push(`BARCODE 20, 105, "128", 45, 1, 0, 2, 4, "${cleanBarcode}"`);
    }
    // Prominent bold price on bottom
    lines.push(`TEXT 20, 185, "4", 0, 1, 1, "Rs. ${cleanPrice}"`);
    lines.push(`PRINT ${copies}, 1`);
  } else {
    // Product Barcode Label (40mm x 30mm) - Item packaging sticker
    lines.push('SIZE 40 mm, 30 mm');
    lines.push('GAP 2 mm, 0 mm');
    lines.push('DIRECTION 1,0');
    lines.push('CLS');
    // Store Header
    lines.push(`TEXT 20, 15, "3", 0, 1, 1, "${storeName}"`);
    // Product Name (Font 2)
    lines.push(`TEXT 20, 48, "2", 0, 1, 1, "${cleanName.slice(0, 24)}"`);
    // Weight & SKU
    if (cleanWeight || cleanSku) {
      lines.push(`TEXT 20, 75, "1", 0, 1, 1, "${cleanWeight} | ${cleanSku}"`);
    }
    // Code 128 Barcode
    if (cleanBarcode) {
      lines.push(`BARCODE 20, 95, "128", 50, 1, 0, 2, 4, "${cleanBarcode}"`);
    }
    // Price
    lines.push(`TEXT 20, 180, "3", 0, 1, 1, "Rs. ${cleanPrice}"`);
    lines.push(`PRINT ${copies}, 1`);
  }

  return lines.join('\r\n') + '\r\n';
}
