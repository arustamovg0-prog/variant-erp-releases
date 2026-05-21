import type { PaymentStatus } from '@/types';
import { useLanguage } from '@/lib/language';

interface StatusBadgeProps {
  status: PaymentStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage();

  const getStatusConfig = (statusKey: string) => {
    switch (statusKey) {
      case 'paid':
        return { label: t('payments.status_paid'), className: 'status-paid' };
      case 'pending':
        return { label: t('payments.status_pending'), className: 'status-pending' };
      case 'overdue':
        return { label: t('payments.status_overdue'), className: 'status-overdue' };
      case 'extended':
        return { label: t('payments.status_extended'), className: 'status-extended' };
      case 'active':
        return { label: t('deals.status_active'), className: 'status-pending' };
      case 'completed':
        return { label: t('deals.status_completed'), className: 'status-paid' };
      default:
        return { label: statusKey, className: 'status-pending' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`status-badge ${config.className}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {config.label}
    </span>
  );
}
