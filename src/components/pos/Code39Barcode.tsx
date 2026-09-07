import React, { useMemo } from 'react';

/**
 * Standard Code 39 (Code 3 of 9, ISO/IEC 16388) Symbology Encoding Table
 * Each character consists of 9 elements: 5 bars (indices 0,2,4,6,8) and 4 spaces (indices 1,3,5,7).
 * '1' represents a wide element, '0' represents a narrow element.
 * Exactly 3 of the 9 elements are wide (2 wide bars + 1 wide space, or 3 wide spaces for symbols).
 */
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

export interface Code39BarcodeProps {
  /** The value to encode (e.g. "INV-001836") */
  value: string;
  /** Height in pixels (default: 36px / ~9.5mm for reliable laser/CCD scanning) */
  height?: number;
  /** Whether to show human-readable text underneath */
  showText?: boolean;
  /** Additional CSS class names */
  className?: string;
}

export const Code39Barcode: React.FC<Code39BarcodeProps> = ({
  value,
  height = 36,
  showText = true,
  className = '',
}) => {
  // 1. Sanitize text for standard Code 39 (letters, numbers, hyphens, etc.)
  const cleanValue = useMemo(() => {
    const raw = (value || '').toUpperCase().trim();
    // Strip leading/trailing asterisks if already provided
    const stripped = raw.replace(/^\*+|\*+$/g, '');
    // Keep only valid Code 39 characters
    const filtered = stripped.replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
    return filtered || 'INV-000000';
  }, [value]);

  // 2. Compute bar coordinates and dimensions
  const barcodeData = useMemo(() => {
    // Delimit with standard start and stop asterisk characters
    const fullText = `*${cleanValue}*`;
    const charCount = fullText.length;

    // Standard wide-to-narrow ratio is 2.5:1
    // Each character is 3 wide + 6 narrow modules + 1 narrow intercharacter gap = 14.5 modules
    const totalModules = charCount * 13.5 + (charCount - 1);
    const maxBarWidth = 200; // Safe barcode width inside 64mm thermal receipt (59mm total)

    let narrow = 1.15;
    if (totalModules * narrow > maxBarWidth) {
      narrow = maxBarWidth / totalModules;
    }
    const wide = narrow * 2.5;
    const gap = narrow;
    // Quiet zone at least 10x narrow bar width
    const quietZone = Math.max(12, narrow * 10);

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

    const totalWidth = currentX + quietZone;

    return {
      rects,
      totalWidth,
      height,
    };
  }, [cleanValue, height]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Crisp vector SVG barcode */}
      <svg
        viewBox={`0 0 ${barcodeData.totalWidth} ${barcodeData.height}`}
        style={{
          width: `${barcodeData.totalWidth}px`,
          maxWidth: '100%',
          height: `${barcodeData.height}px`,
          display: 'block',
        }}
        shapeRendering="crispEdges"
        className="text-black"
      >
        {/* Crisp white quiet zone background */}
        <rect
          x="0"
          y="0"
          width={barcodeData.totalWidth}
          height={barcodeData.height}
          fill="#ffffff"
        />
        {/* Pure solid black bars */}
        {barcodeData.rects.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height={barcodeData.height}
            fill="#000000"
          />
        ))}
      </svg>

      {/* Human-readable text with start/stop asterisks */}
      {showText && (
        <span className="font-mono text-[9px] font-bold tracking-widest text-black mt-1">
          * {cleanValue} *
        </span>
      )}
    </div>
  );
};
