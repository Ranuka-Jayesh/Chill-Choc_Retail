import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onF1?: () => void;
  onF2?: () => void;
  onF3?: () => void;
  onF4?: () => void;
  onF5?: () => void;
  onF6?: () => void;
  onF7?: () => void;
  onF8?: () => void;
  onF9?: () => void;
  onF10?: () => void;
  onF11?: () => void;
  onF12?: () => void;
  onEnter?: () => void;
  onPlus?: () => void;
  onMinus?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onHelp?: () => void;
  onEscape?: () => void;
  onClearCart?: () => void;
  onSalesperson?: () => void;
  onLockTerminal?: () => void;
}

export const usePosShortcuts = (handlers: ShortcutHandlers, enabled = true) => {
  const handlersRef = useRef<ShortcutHandlers>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;

      // Ignore shortcut triggers while a hardware barcode scanner is streaming characters
      if (typeof window !== 'undefined' && Date.now() - ((window as any).__lastBarcodeKeystroke || 0) < 150) {
        return;
      }

      // Ignore shortcut triggers if an input or textarea is currently focused,
      // EXCEPT for F1-F12 which are dedicated functional hotkeys, or + / - / Arrows when on empty search input
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      // Handle keyboard + / - for adjusting selected item quantity (use Numpad or Ctrl to avoid conflict with barcode hyphens)
      const isPlusKey =
        (e.code === 'NumpadAdd' || (e.ctrlKey && (e.key === '+' || e.key === '='))) &&
        !e.metaKey &&
        !e.altKey;

      const isMinusKey =
        (e.code === 'NumpadSubtract' || (e.ctrlKey && (e.key === '-' || e.key === '_'))) &&
        !e.metaKey &&
        !e.altKey;

      // Handle keyboard ArrowUp / ArrowDown for moving between cart items
      const isArrowUpKey = e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isArrowDownKey = e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey && !e.altKey;

      // Handle Ctrl + Shift + L (or Ctrl + Alt + L) for Lock Terminal - safe modifier combo that never conflicts with barcodes
      const isLockCombo =
        (e.ctrlKey && (e.shiftKey || e.altKey)) &&
        (e.key === 'L' || e.key === 'l' || e.code === 'KeyL') &&
        !e.metaKey;

      if (isLockCombo) {
        e.preventDefault();
        h.onLockTerminal?.();
        return;
      }

      // Handle Ctrl + Shift + C for Cart Clear - safe modifier combo that never conflicts with barcodes
      const isClearCombo =
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === 'C' || e.key === 'c' || e.code === 'KeyC') &&
        !e.altKey &&
        !e.metaKey;

      if (isClearCombo) {
        e.preventDefault();
        h.onClearCart?.();
        return;
      }

      // Handle @ symbol (Shift + 2) for Salesperson / Team Member
      const isAtSymbol =
        (e.key === '@' || (e.shiftKey && (e.key === '2' || e.code === 'Digit2'))) &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey;

      if (isAtSymbol) {
        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        if (!isOtherInput && (!isSearchInput || activeEl.value.trim().length === 0)) {
          e.preventDefault();
          if (h.onSalesperson) {
            h.onSalesperson();
          } else {
            h.onF4?.();
          }
          return;
        }
      }

      if (isArrowUpKey) {
        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        // When search input is active, allow it to navigate products
        if (isSearchInput) {
          return;
        }

        if (!isOtherInput) {
          e.preventDefault();
          h.onArrowUp?.();
          return;
        }
      }

      if (isArrowDownKey) {
        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        // When search input is active, allow it to navigate products
        if (isSearchInput) {
          return;
        }

        if (!isOtherInput) {
          e.preventDefault();
          h.onArrowDown?.();
          return;
        }
      }

      if (isPlusKey) {
        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        if (!isOtherInput && (!isSearchInput || activeEl.value.trim().length === 0)) {
          e.preventDefault();
          h.onPlus?.();
          return;
        }
      }

      if (isMinusKey) {
        const activeEl = document.activeElement;
        const isSearchInput =
          activeEl instanceof HTMLInputElement &&
          activeEl.id === 'pos-search-input';
        const isOtherInput =
          (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
          !isSearchInput;

        if (!isOtherInput && (!isSearchInput || activeEl.value.trim().length === 0)) {
          e.preventDefault();
          h.onMinus?.();
          return;
        }
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          h.onF1?.();
          break;
        case 'F2':
          e.preventDefault();
          h.onF2?.();
          break;
        case 'F3':
          e.preventDefault();
          h.onF3?.();
          break;
        case 'F4':
          e.preventDefault();
          h.onF4?.();
          break;
        case 'F5':
          e.preventDefault();
          h.onF5?.();
          break;
        case 'F6':
          e.preventDefault();
          h.onF6?.();
          break;
        case 'F7':
          e.preventDefault();
          h.onF7?.();
          break;
        case 'F8':
          e.preventDefault();
          h.onF8?.();
          break;
        case 'F9':
          e.preventDefault();
          h.onF9?.();
          break;
        case 'F10':
          e.preventDefault();
          h.onF10?.();
          break;
        case 'F11':
          e.preventDefault();
          h.onF11?.();
          break;
        case 'F12':
          e.preventDefault();
          h.onF12?.();
          break;
        case 'Enter': {
          const activeEl = document.activeElement;
          const isSearchInput =
            activeEl instanceof HTMLInputElement &&
            activeEl.id === 'pos-search-input';
          const isAmountInput =
            activeEl instanceof HTMLInputElement &&
            activeEl.id === 'amount-received-input';

          // If inside the amount received input, its own onKeyDown handler processes payment
          if (isAmountInput) {
            break;
          }

          // If inside search input and search input has text, let it search/scan
          if (isSearchInput && activeEl.value.trim().length > 0) {
            break;
          }

          // If inside other inputs or textareas (e.g. note or modal inputs), don't hijack
          if (
            (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
            !isSearchInput
          ) {
            break;
          }

          // Otherwise, Enter triggers focusing the amount received field
          e.preventDefault();
          h.onEnter?.();
          break;
        }
        case '?':
          if (!isInputFocused) {
            e.preventDefault();
            h.onHelp?.();
          }
          break;
        case 'Escape':
          h.onEscape?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};
