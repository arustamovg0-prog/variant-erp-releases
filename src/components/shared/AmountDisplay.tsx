import { useApp } from '@/lib/store';
import { formatAmount } from '@/lib/calculations';

interface AmountDisplayProps {
  amount: number;           // USD
  size?: 'sm' | 'md' | 'lg';
  showUZS?: boolean;
}

/**
 * Displays amount in USD with optional UZS equivalent below.
 */
export default function AmountDisplay({ amount, size = 'md', showUZS = true }: AmountDisplayProps) {
  const { state } = useApp();

  const uzsAmount = Math.round(amount * state.uzsRate);
  const formattedUZS = new Intl.NumberFormat('ru-RU').format(uzsAmount) + ' сўм';

  const fontSizes = {
    sm: { usd: '0.8125rem', uzs: '0.625rem' },
    md: { usd: '0.9375rem', uzs: '0.6875rem' },
    lg: { usd: '1.5rem', uzs: '0.75rem' },
  };

  const s = fontSizes[size];

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.3 }}>
      <span style={{ fontSize: s.usd, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
        {formatAmount(amount)}
      </span>
      {showUZS && (
        <span style={{ fontSize: s.uzs, color: 'var(--foreground-muted)', fontWeight: 400 }}>
          {formattedUZS}
        </span>
      )}
    </span>
  );
}
