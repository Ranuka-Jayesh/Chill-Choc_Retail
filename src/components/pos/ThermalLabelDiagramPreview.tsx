import React, { useMemo } from 'react';
import { LabelSize, LABEL_SIZE_CONFIGS, extractProductMeasurement } from '@/services/labelConfig';
import { sanitizeCode39 } from '@/services/escposLabelGenerator';

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

function wrapProductTitle(text: string, maxPerLine: number = 24): string[] {
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

export interface ThermalLabelDiagramPreviewProps {
  labelSize: LabelSize;
  productName: string;
  weight?: string;
  price: number;
  barcode: string;
  storeName?: string;
  tagline?: string;
  className?: string;
}

export const ThermalLabelDiagramPreview: React.FC<ThermalLabelDiagramPreviewProps> = ({
  labelSize,
  productName,
  weight,
  price,
  barcode,
  storeName = 'Chill&Chock',
  tagline = 'Cool vibe sweet bite',
  className = '',
}) => {
  const cfg = LABEL_SIZE_CONFIGS[labelSize] || LABEL_SIZE_CONFIGS['40x20'];
  const { cleanTitle, measurement } = extractProductMeasurement(productName, weight);
  const cleanBarcode = sanitizeCode39(barcode);

  const formattedPrice = price.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Scale calculations in local SVG coordinate space
  const layout = useMemo(() => {
    // Determine sticker width and height based on physical proportions
    // Scale factor chosen so 40x20 sticker has width 260 and height 130
    const mmScale = 6.5;
    const stickerWidth = Math.round(cfg.widthMm * mmScale);
    const stickerHeight = Math.round(cfg.heightMm * mmScale);

    // Margin for left dimension bracket and bottom dimension bracket
    const leftMargin = 58; // Space for "20 mm" text + vertical line
    const topMargin = 8;
    const rightMargin = 8;
    const bottomMargin = 38; // Space for horizontal line + "40 mm" text

    const stickerX = leftMargin;
    const stickerY = topMargin;
    const stickerBottom = stickerY + stickerHeight;
    const centerX = stickerX + stickerWidth / 2;

    const totalWidth = stickerX + stickerWidth + rightMargin;
    const totalHeight = stickerBottom + bottomMargin;

    // Left bracket coordinates
    const leftLineX = stickerX - 12;
    const leftTextX = leftLineX - 18;
    const leftTextY = stickerY + stickerHeight / 2 + 5;

    // Bottom bracket coordinates
    const bottomLineY = stickerBottom + 12;
    const bottomTextY = bottomLineY + 18;

    // Inside sticker element positions
    const showTagline = cfg.showTagline;
    const titleLines = wrapProductTitle(cleanTitle, cfg.widthMm >= 40 ? 25 : 18);

    // Dynamic vertical balancing based on label height (20mm, 25mm, 30mm)
    const is20mm = cfg.heightMm <= 20;
    const is25mm = cfg.heightMm <= 25 && !is20mm;

    let brandY = stickerY + 23;
    let taglineY = stickerY + 36;
    let titleY1 = stickerY + (showTagline ? 51 : 38);
    let titleY2 = titleY1 + 13;
    let priceY = stickerY + (showTagline ? (titleLines.length > 1 ? 77 : 69) : (titleLines.length > 1 ? 65 : 57));
    let barcodeY = priceY + 9;
    let barcodeHeight = is20mm ? 25 : is25mm ? 32 : 38;
    let barcodeTextY = barcodeY + barcodeHeight + 11;

    // Fine-tune for 20mm height (e.g. 40x20mm, 30x20mm)
    if (is20mm) {
      if (showTagline) {
        brandY = stickerY + 21;
        taglineY = stickerY + 33;
        titleY1 = stickerY + 47;
        titleY2 = titleY1 + 12;
        priceY = stickerY + (titleLines.length > 1 ? 73 : 64);
        barcodeY = priceY + (titleLines.length > 1 ? 7 : 8);
        barcodeHeight = titleLines.length > 1 ? 22 : 25;
        barcodeTextY = barcodeY + barcodeHeight + 10;
      } else {
        // 30x20 ultra-compact (tagline hidden for safe scanning)
        brandY = stickerY + 23;
        titleY1 = stickerY + 42;
        titleY2 = titleY1 + 13;
        priceY = stickerY + (titleLines.length > 1 ? 71 : 62);
        barcodeY = priceY + 9;
        barcodeHeight = 26;
        barcodeTextY = barcodeY + barcodeHeight + 11;
      }
    } else if (is25mm) {
      // 25mm height (35x25, 40x25)
      brandY = stickerY + 25;
      taglineY = stickerY + 39;
      titleY1 = stickerY + (showTagline ? 56 : 42);
      titleY2 = titleY1 + 14;
      priceY = stickerY + (showTagline ? (titleLines.length > 1 ? 86 : 76) : (titleLines.length > 1 ? 72 : 62));
      barcodeY = priceY + 11;
      barcodeHeight = 30;
      barcodeTextY = barcodeY + barcodeHeight + 12;
    } else {
      // 30mm height (40x30, 50x30)
      brandY = stickerY + 28;
      taglineY = stickerY + 44;
      titleY1 = stickerY + (showTagline ? 64 : 48);
      titleY2 = titleY1 + 16;
      priceY = stickerY + (showTagline ? (titleLines.length > 1 ? 98 : 86) : (titleLines.length > 1 ? 82 : 70));
      barcodeY = priceY + 14;
      barcodeHeight = 38;
      barcodeTextY = barcodeY + barcodeHeight + 14;
    }

    // Barcode calculation
    const fullText = `*${cleanBarcode}*`;
    const charCount = fullText.length;
    const totalModules = charCount * 13.5 + (charCount - 1);
    const maxBarWidth = stickerWidth - 28; // 14px quiet zone on each side

    let narrow = (maxBarWidth * 0.88) / totalModules;
    narrow = Math.min(1.85, Math.max(0.55, narrow));
    const wide = narrow * 2.5;
    const gap = narrow;

    let totalBcWidth = 0;
    for (let i = 0; i < fullText.length; i++) {
      const pattern = CODE39_PATTERNS[fullText[i]] || CODE39_PATTERNS['-'];
      for (let j = 0; j < 9; j++) {
        totalBcWidth += pattern[j] === '1' ? wide : narrow;
      }
      if (i < fullText.length - 1) totalBcWidth += gap;
    }

    const startX = centerX - totalBcWidth / 2;
    let currX = startX;
    const rects: Array<{ x: number; width: number }> = [];

    for (let i = 0; i < fullText.length; i++) {
      const pattern = CODE39_PATTERNS[fullText[i]] || CODE39_PATTERNS['-'];
      for (let j = 0; j < 9; j++) {
        const isBar = j % 2 === 0;
        const w = pattern[j] === '1' ? wide : narrow;
        if (isBar) {
          rects.push({ x: currX, width: w });
        }
        currX += w;
      }
      if (i < fullText.length - 1) currX += gap;
    }

    return {
      stickerWidth,
      stickerHeight,
      stickerX,
      stickerY,
      stickerBottom,
      centerX,
      totalWidth,
      totalHeight,
      leftLineX,
      leftTextX,
      leftTextY,
      bottomLineY,
      bottomTextY,
      showTagline,
      brandY,
      taglineY,
      titleLines,
      titleY1,
      titleY2,
      priceY,
      barcodeY,
      barcodeHeight,
      barcodeTextY,
      rects,
    };
  }, [cfg, cleanTitle, cleanBarcode]);

  return (
    <div className={`w-full flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${layout.totalWidth} ${layout.totalHeight}`}
        className="w-full h-auto max-w-[340px] block"
        style={{ aspectRatio: `${layout.totalWidth} / ${layout.totalHeight}` }}
      >
        {/* ========================================================================= */}
        {/* LEFT DIMENSION INDICATOR (e.g. "20 mm")                                    */}
        {/* ========================================================================= */}
        {/* Height Text */}
        <text
          x={layout.leftTextX}
          y={layout.leftTextY}
          textAnchor="middle"
          fill="#000000"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="13.5"
          letterSpacing="-0.2px"
        >
          {cfg.heightMm} mm
        </text>
        {/* Vertical Dimension Line */}
        <line
          x1={layout.leftLineX}
          y1={layout.stickerY}
          x2={layout.leftLineX}
          y2={layout.stickerBottom}
          stroke="#000000"
          strokeWidth="2"
        />
        {/* Top End Cap Tick */}
        <line
          x1={layout.leftLineX - 5}
          y1={layout.stickerY}
          x2={layout.leftLineX + 5}
          y2={layout.stickerY}
          stroke="#000000"
          strokeWidth="2"
        />
        {/* Bottom End Cap Tick */}
        <line
          x1={layout.leftLineX - 5}
          y1={layout.stickerBottom}
          x2={layout.leftLineX + 5}
          y2={layout.stickerBottom}
          stroke="#000000"
          strokeWidth="2"
        />

        {/* ========================================================================= */}
        {/* THE PHYSICAL LABEL STICKER CARD                                           */}
        {/* ========================================================================= */}
        <rect
          x={layout.stickerX}
          y={layout.stickerY}
          width={layout.stickerWidth}
          height={layout.stickerHeight}
          rx={cfg.heightMm <= 20 ? 14 : 16}
          ry={cfg.heightMm <= 20 ? 14 : 16}
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* 1. Shop Name: Bold Serif Font matching user design */}
        <text
          x={layout.centerX}
          y={layout.brandY}
          textAnchor="middle"
          fill="#000000"
          fontFamily="Georgia, 'Times New Roman', Times, serif"
          fontWeight="900"
          fontSize={cfg.heightMm <= 20 ? "18" : "20"}
          letterSpacing="-0.3px"
        >
          {storeName}
        </text>

        {/* 2. Tagline: Cool vibe sweet bite (Clean sans-serif regular) */}
        {layout.showTagline && (
          <text
            x={layout.centerX}
            y={layout.taglineY}
            textAnchor="middle"
            fill="#000000"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="400"
            fontSize="9"
          >
            {tagline}
          </text>
        )}

        {/* 3. Product Name: Clean sans-serif bold, centered, max 2 lines */}
        <text
          x={layout.centerX}
          y={layout.titleY1}
          textAnchor="middle"
          fill="#000000"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize={cleanTitle.length > 30 ? "9.5" : cleanTitle.length > 20 ? "11" : "12"}
        >
          {layout.titleLines[0]}
        </text>
        {layout.titleLines.length > 1 && (
          <text
            x={layout.centerX}
            y={layout.titleY2}
            textAnchor="middle"
            fill="#000000"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize={cleanTitle.length > 30 ? "9.5" : cleanTitle.length > 20 ? "11" : "12"}
          >
            {layout.titleLines[1]}
          </text>
        )}

        {/* 4. Large Bold Price */}
        <text
          x={layout.centerX}
          y={layout.priceY}
          textAnchor="middle"
          fill="#000000"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
          fontWeight="900"
          fontSize={cfg.heightMm <= 20 ? "17.5" : "19.5"}
          letterSpacing="-0.4px"
        >
          Rs. {formattedPrice}
          {measurement && (
            <tspan
              fontSize={cfg.heightMm <= 20 ? "11" : "12.5"}
              fontWeight="700"
              letterSpacing="0"
            >
              {` / ${measurement}`}
            </tspan>
          )}
        </text>

        {/* 5. Barcode: Pure vector black bars */}
        {layout.rects.map((bar, i) => (
          <rect
            key={i}
            x={bar.x.toFixed(2)}
            y={layout.barcodeY}
            width={bar.width.toFixed(2)}
            height={layout.barcodeHeight}
            fill="#000000"
            shapeRendering="crispEdges"
          />
        ))}

        {/* 6. Barcode Digits */}
        <text
          x={layout.centerX}
          y={layout.barcodeTextY}
          textAnchor="middle"
          fill="#000000"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace, sans-serif"
          fontWeight="700"
          fontSize="9.5"
          letterSpacing="0.8px"
        >
          {cleanBarcode}
        </text>

        {/* ========================================================================= */}
        {/* BOTTOM DIMENSION INDICATOR (e.g. "40 mm")                                 */}
        {/* ========================================================================= */}
        {/* Horizontal Dimension Line */}
        <line
          x1={layout.stickerX}
          y1={layout.bottomLineY}
          x2={layout.stickerX + layout.stickerWidth}
          y2={layout.bottomLineY}
          stroke="#000000"
          strokeWidth="2"
        />
        {/* Left End Cap Tick */}
        <line
          x1={layout.stickerX}
          y1={layout.bottomLineY - 5}
          x2={layout.stickerX}
          y2={layout.bottomLineY + 5}
          stroke="#000000"
          strokeWidth="2"
        />
        {/* Right End Cap Tick */}
        <line
          x1={layout.stickerX + layout.stickerWidth}
          y1={layout.bottomLineY - 5}
          x2={layout.stickerX + layout.stickerWidth}
          y2={layout.bottomLineY + 5}
          stroke="#000000"
          strokeWidth="2"
        />
        {/* Width Text */}
        <text
          x={layout.centerX}
          y={layout.bottomTextY}
          textAnchor="middle"
          fill="#000000"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="13.5"
          letterSpacing="-0.2px"
        >
          {cfg.widthMm} mm
        </text>
      </svg>
    </div>
  );
};
