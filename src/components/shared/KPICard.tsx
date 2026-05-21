import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

export default function KPICard({ label, value, subtitle, icon, trend, accentColor }: KPICardProps) {
  return (
    <div className="kpi-card" style={{ position: 'relative' }}>
      {/* Accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accentColor || 'var(--primary)',
          borderRadius: 'var(--radius) var(--radius) 0 0',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--foreground-muted)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {label}
        </span>
        <div style={{ color: accentColor || 'var(--primary)', opacity: 0.8 }}>
          {icon}
        </div>
      </div>

      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          color: 'var(--foreground)',
          lineHeight: 1.2,
          marginBottom: '0.25rem',
        }}
      >
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
            {subtitle}
          </span>
        )}
        {trend && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
