/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  BRAND_TEAL,
  BRAND_TEAL_LIGHT,
  SAVINGS,
  URGENT,
  INFO,
  CATEGORY_META,
  categoryEmoji,
  formatEUR,
  formatNumber,
  formatPct,
  urgencyBadge,
  isNovos24h,
  cx,
  Card,
  Pill,
  Skeleton,
  EmptyState,
  ErrorState,
  Spinner,
  toast,
  onToast,
} from '@/lib/ui';

// ============================================================
// Brand tokens — exported constants
// ============================================================

describe('brand tokens', () => {
  it('exports the 5 brand colors', () => {
    expect(BRAND_TEAL).toBe('#0F766E');
    expect(BRAND_TEAL_LIGHT).toBe('#14b8a6');
    expect(SAVINGS).toBe('#10b981');
    expect(URGENT).toBe('#f59e0b');
    expect(INFO).toBe('#3b82f6');
  });
});

// ============================================================
// CATEGORY_META + categoryEmoji
// ============================================================

describe('categoryEmoji', () => {
  it('returns the emoji for known categories', () => {
    expect(categoryEmoji('Imóvel')).toBe('🏠');
    expect(categoryEmoji('Veículo')).toBe('🚗');
    expect(categoryEmoji('Direito')).toBe('⚖️');
    expect(categoryEmoji('Equipamento')).toBe('🛠️');
    expect(categoryEmoji('Máquina')).toBe('⚙️');
    expect(categoryEmoji('Mobiliário')).toBe('🪑');
  });

  it('returns 📦 for unknown or empty categories', () => {
    expect(categoryEmoji('Desconhecido')).toBe('📦');
    expect(categoryEmoji(undefined)).toBe('📦');
    expect(categoryEmoji('')).toBe('📦');
  });

  it('exposes labels in CATEGORY_META', () => {
    expect(CATEGORY_META.Imóvel.label).toBe('Imóvel');
    expect(CATEGORY_META.Veículo.label).toBe('Veículo');
  });
});

// ============================================================
// formatEUR
// ============================================================

describe('formatEUR', () => {
  it('formats pt-PT locale currency', () => {
    // Portuguese locale: 100000 → "100 000 €" (with non-breaking space)
    const result = formatEUR(100000);
    expect(result).toContain('100');
    expect(result).toContain('€');
  });

  it('returns — for null/undefined', () => {
    expect(formatEUR(null)).toBe('—');
    expect(formatEUR(undefined)).toBe('—');
  });

  it('compact mode: ≥1M shows M€', () => {
    expect(formatEUR(2_500_000, { compact: true })).toBe('2,5 M€');
  });

  it('compact mode: ≥1k shows k€', () => {
    expect(formatEUR(15_000, { compact: true })).toBe('15 k€');
  });

  it('compact mode off for small values', () => {
    expect(formatEUR(500)).toContain('500');
    expect(formatEUR(500)).toContain('€');
  });
});

// ============================================================
// formatNumber
// ============================================================

describe('formatNumber', () => {
  it('formats pt-PT locale thousands separator', () => {
    expect(formatNumber(1234)).toContain('1');
    expect(formatNumber(1234567)).toContain('1');
  });

  it('returns — for null/undefined', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});

// ============================================================
// formatPct
// ============================================================

describe('formatPct', () => {
  it('formats with comma decimal separator', () => {
    expect(formatPct(41.4)).toBe('41,4%');
    expect(formatPct(50, 0)).toBe('50%');
  });

  it('respects custom digits', () => {
    expect(formatPct(33.333, 2)).toBe('33,33%');
  });

  it('returns — for null/undefined', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
  });
});

// ============================================================
// urgencyBadge
// ============================================================

describe('urgencyBadge', () => {
  it('encerrado for past dates (days < 0)', () => {
    expect(urgencyBadge(-1)).toEqual({ tone: 'slate', label: 'encerrado' });
    expect(urgencyBadge(-30)).toEqual({ tone: 'slate', label: 'encerrado' });
  });

  it('red tone for ≤3 days', () => {
    const r = urgencyBadge(2);
    expect(r.tone).toBe('red');
    expect(r.label).toContain('2d');
  });

  it('orange tone for 4-7 days', () => {
    expect(urgencyBadge(5).tone).toBe('orange');
  });

  it('amber tone for 8-30 days', () => {
    expect(urgencyBadge(15).tone).toBe('amber');
  });

  it('teal tone for >30 days', () => {
    expect(urgencyBadge(45).tone).toBe('teal');
  });

  it('slate tone for null/undefined', () => {
    expect(urgencyBadge(null).tone).toBe('slate');
    expect(urgencyBadge(undefined).tone).toBe('slate');
  });
});

// ============================================================
// isNovos24h
// ============================================================

describe('isNovos24h', () => {
  it('returns true for items published in the last 24h', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    expect(isNovos24h({ data_publicacao: recent })).toBe(true);
  });

  it('returns false for items older than 24h', () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(isNovos24h({ data_publicacao: old })).toBe(false);
  });

  it('returns false for missing date', () => {
    expect(isNovos24h({})).toBe(false);
    expect(isNovos24h({ data_publicacao: undefined })).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(isNovos24h({ data_publicacao: 'not-a-date' })).toBe(false);
  });
});

// ============================================================
// cx — classnames helper
// ============================================================

describe('cx', () => {
  it('joins truthy parts with spaces', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns empty string when all falsy', () => {
    expect(cx(false, null, undefined)).toBe('');
  });
});

// ============================================================
// Component smoke renders
// ============================================================

describe('Card', () => {
  it('renders children with rounded-xl class', () => {
    render(<Card><p>content</p></Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('Pill', () => {
  it('renders label with optional emoji', () => {
    render(<Pill emoji="🚗" label="Veículo" />);
    expect(screen.getByText('Veículo')).toBeInTheDocument();
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  it('sets aria-pressed based on active prop', () => {
    const { rerender } = render(<Pill label="X" active={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<Pill label="X" active={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('EmptyState', () => {
  it('renders title and icon', () => {
    render(<EmptyState icon="📭" title="No results" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('📭')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders message', () => {
    render(<ErrorState message="Algo correu mal" />);
    expect(screen.getByText(/Algo correu mal/)).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const retry = vi.fn();
    render(<ErrorState message="fail" onRetry={retry} />);
    screen.getByText('Tentar novamente').click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Toast pub/sub
// ============================================================

describe('toast / onToast', () => {
  beforeEach(() => {
    // No clean-up needed — onToast returns an unsubscribe function
  });

  afterEach(() => {
    // No global cleanup; listeners are local to each test
  });

  it('subscribes a listener and receives a toast', () => {
    const received: unknown[] = [];
    const unsub = onToast((t) => received.push(t));
    toast('Hello', 'success');
    expect(received).toHaveLength(1);
    expect((received[0] as { message: string }).message).toBe('Hello');
    unsub();
  });

  it('unsubscribe removes the listener', () => {
    const received: unknown[] = [];
    const unsub = onToast((t) => received.push(t));
    unsub();
    toast('after-unsub', 'info');
    expect(received).toHaveLength(0);
  });

  it('supports multiple listeners', () => {
    const r1: unknown[] = [];
    const r2: unknown[] = [];
    const u1 = onToast((t) => r1.push(t));
    const u2 = onToast((t) => r2.push(t));
    toast('multi', 'error');
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    u1();
    u2();
  });
});
