import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import type { RestaurantStatus } from '../constants';

// ============================================================
// StatusBadge — coloured pill for a restaurant onboarding status
// ============================================================

const StatusBadge = ({ status }: { status: RestaurantStatus }) => {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <span className="status-badge" style={{ background: bg, color: fg }}>
      {STATUS_LABELS[status]}
    </span>
  );
};

export { StatusBadge };
