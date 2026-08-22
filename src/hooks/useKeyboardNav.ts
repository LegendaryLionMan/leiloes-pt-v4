import { useEffect } from 'react';

/**
 * Hook de navegação por teclado para listas.
 *
 * Atalhos:
 *   j / ArrowDown → próximo item
 *   k / ArrowUp   → item anterior
 *   Enter         → activa item (callback onActivate)
 *   Escape        → fecha/limpa (callback onEscape)
 *   Home / End    → primeiro/último
 *
 * @param itemCount número total de items na lista
 * @param selectedIndex índice actualmente seleccionado (-1 se nenhum)
 * @param setSelectedIndex setter para o índice
 * @param onActivate callback quando user prime Enter
 * @param onEscape callback quando user prime Escape
 */
export function useKeyboardNav(opts: {
  itemCount: number;
  selectedIndex: number;
  setSelectedIndex: (n: number) => void;
  onActivate?: (idx: number) => void;
  onEscape?: () => void;
}) {
  const { itemCount, selectedIndex, setSelectedIndex, onActivate, onEscape } = opts;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Não intercepta se user está a escrever num input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (itemCount === 0) return;

      let next = selectedIndex;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          next = selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, itemCount - 1);
          break;
        case 'k':
        case 'ArrowUp':
          next = selectedIndex < 0 ? 0 : Math.max(selectedIndex - 1, 0);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = itemCount - 1;
          break;
        case 'Enter':
          if (selectedIndex >= 0 && onActivate) {
            e.preventDefault();
            onActivate(selectedIndex);
          }
          return;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          return;
        default:
          return;
      }

      if (next !== selectedIndex) {
        e.preventDefault();
        setSelectedIndex(next);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [itemCount, selectedIndex, setSelectedIndex, onActivate, onEscape]);
}
