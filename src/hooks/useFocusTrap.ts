import { useEffect, useRef } from 'react';

/**
 * Focus trap para modais e drawers.
 *
 * - Quando activo, Tab/Shift+Tab ficam confined dentro do ref.
 * - Foca o primeiro elemento focável ao activar.
 * - Restaura focus ao elemento anterior quando desactiva.
 *
 * @param active se true, prende o focus
 * @param selectorOverride (opcional) CSS selector para o container (default: o ref)
 */
export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save current focus to restore on close
    previousFocus.current = document.activeElement as HTMLElement;

    function focusables(): HTMLElement[] {
      if (!ref.current) return [];
      return Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function handler(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Foca primeiro elemento focável
    const initial = focusables()[0];
    if (initial) initial.focus();

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      // Restore focus
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, [active]);

  return ref;
}
