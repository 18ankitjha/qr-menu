import { useAuth } from '../context/AuthContext';
import type { IRestaurant } from '../types';
import './RestaurantStatusBanner.css';

// ============================================================
// RestaurantStatusBanner — tells the owner when the platform team
// hasn't approved, or has suspended/rejected, their restaurant
// ============================================================

type BannerStatus = Exclude<NonNullable<IRestaurant['status']>, 'ACTIVE'>;

const BANNERS: Record<BannerStatus, { tone: 'info' | 'danger'; title: string; body: string }> = {
  PENDING_APPROVAL: {
    tone: 'info',
    title: '⏳ Waiting for approval',
    body: 'Our team is reviewing your restaurant. You can edit your restaurant details now — menu, tables and theme unlock once it is approved.',
  },
  SUSPENDED: {
    tone: 'danger',
    title: '⛔ Restaurant suspended',
    body: 'Customers cannot open your menu or place orders. Contact the QR Menu team to resolve this.',
  },
  REJECTED: {
    tone: 'danger',
    title: '✖ Onboarding request rejected',
    body: 'Your restaurant was not approved. Contact the QR Menu team if you think this is a mistake.',
  },
};

const RestaurantStatusBanner = () => {
  const { restaurant } = useAuth();
  const status = restaurant?.status;

  if (!status || status === 'ACTIVE') return null;

  const banner = BANNERS[status];
  return (
    <div className={`status-banner status-banner--${banner.tone}`} role="status">
      <strong className="status-banner-title">{banner.title}</strong>
      <span>{banner.body}</span>
      {restaurant?.statusReason && (
        <span className="status-banner-reason">Reason: {restaurant.statusReason}</span>
      )}
    </div>
  );
};

export { RestaurantStatusBanner };
