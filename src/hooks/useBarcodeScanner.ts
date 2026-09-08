import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minBarcodeLength?: number;
  maxIntervalMs?: number; // Maximum ms between characters to be considered a scanner
}

/**
 * Global Barcode Scanner Hook for Retail POS
 * 
 * Barcode scanners act as rapid keyboard wedges ending with 'Enter'.
 * This hook captures barcode scans globally across the POS application without
 * requiring any input field to be focused.
 */
export const useBarcodeScanner = ({
  onScan,
  enabled = true,
  minBarcodeLength = 3,
  maxIntervalMs = 75,
}: BarcodeScannerOptions) => {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const strokeIntervalsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const lastTime = lastKeyTimeRef.current;
      const interval = lastTime > 0 ? now - lastTime : 0;
      lastKeyTimeRef.current = now;

      // Ignore modifier combinations (Ctrl+C, Alt+Tab, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        bufferRef.current = '';
        strokeIntervalsRef.current = [];
        return;
      }

      // Check if user is currently typing in an input or textarea
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Handle scanner completion key ('Enter')
      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        const intervals = strokeIntervalsRef.current;
        const avgInterval =
          intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 999;

        // Valid scan criteria:
        // 1. Minimum length satisfied
        // 2. Either no input is focused, OR timing indicates super-fast scanner input (avg < 75ms)
        const isFastScan = intervals.length >= 2 && avgInterval <= maxIntervalMs;
        const isScanCandidate =
          code.length >= minBarcodeLength && (!isInputFocused || isFastScan);

        if (isScanCandidate) {
          e.preventDefault();
          e.stopImmediatePropagation();

          // If the active input received the scanned text, clear it so it doesn't leave stray text
          if (isInputFocused && activeEl instanceof HTMLInputElement) {
            activeEl.value = '';
          }

          bufferRef.current = '';
          strokeIntervalsRef.current = [];
          lastKeyTimeRef.current = 0;

          // Dispatch the scanned barcode
          onScanRef.current(code);
          return;
        }

        // Reset if Enter didn't qualify as a scan
        bufferRef.current = '';
        strokeIntervalsRef.current = [];
        return;
      }

      // Printable single character keys
      if (e.key.length === 1) {
        // Mark scanner activity timestamp on rapid input (<150ms)
        if (interval > 0 && interval <= 150) {
          (window as any).__lastBarcodeKeystroke = now;
        }

        // If too much time elapsed between strokes (> 150ms), reset buffer
        if (interval > 150) {
          bufferRef.current = e.key;
          strokeIntervalsRef.current = [];
        } else {
          bufferRef.current += e.key;
          if (interval > 0) {
            strokeIntervalsRef.current.push(interval);
          }
          // If this is rapid keystrokes from a scanner (interval <= 100ms), prevent leaking to hotkeys
          if (interval <= 100) {
            e.stopPropagation();
          }
        }
      }
    };

    // Use capturing phase so we intercept before input elements if needed
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minBarcodeLength, maxIntervalMs]);
};
