import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage, getStats } from '../services/api';
import { useStatusAction } from '../hooks/useStatusAction';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/format';
import { MESSAGES, RESTAURANT_STATUS, ROUTES, STATUS_COLORS, STATUS_LABELS } from '../constants';
import type { RestaurantStatus } from '../constants';
import type { IPlatformStats } from '../types';

// ============================================================
// Dashboard — onboarding overview + pending requests
// ============================================================

const PAGE = {
  TITLE: 'Platform overview',
  SUBTITLE: 'Restaurants onboarded on QR Menu and requests waiting for review.',
  TOTAL: 'Total restaurants',
  PENDING_TITLE: 'Waiting for approval',
  VIEW_ALL: 'View all pending →',
  NO_PENDING: 'No onboarding requests waiting. 🎉',
  REVIEW: 'Review',
  REGISTERED: 'Registered',
};

const TILE_ORDER: RestaurantStatus[] = [
  RESTAURANT_STATUS.PENDING_APPROVAL,
  RESTAURANT_STATUS.ACTIVE,
  RESTAURANT_STATUS.SUSPENDED,
  RESTAURANT_STATUS.REJECTED,
];

const restaurantsWithStatus = (status?: RestaurantStatus) =>
  status ? `${ROUTES.RESTAURANTS}?status=${status}` : ROUTES.RESTAURANTS;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<IPlatformStats | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then(({ data }) => {
        if (cancelled) return;
        setStats(data.data);
        setError('');
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC)));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const { openAction, dialog, successMessage } = useStatusAction(() => setReloadKey((key) => key + 1));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {!stats && !error && <p className="cell-sub">{MESSAGES.LOADING}</p>}

      {stats && (
        <>
          <div className="stat-grid">
            <button className="stat-tile" onClick={() => navigate(restaurantsWithStatus())}>
              <span className="stat-tile-label">{PAGE.TOTAL}</span>
              <span className="stat-tile-value">{stats.counts.TOTAL}</span>
            </button>
            {TILE_ORDER.map((status) => (
              <button key={status} className="stat-tile" onClick={() => navigate(restaurantsWithStatus(status))}>
                <span className="stat-tile-label">
                  <span className="stat-dot" style={{ background: STATUS_COLORS[status].fg }} />
                  {STATUS_LABELS[status]}
                </span>
                <span className="stat-tile-value">{stats.counts[status]}</span>
              </button>
            ))}
          </div>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">
                {PAGE.PENDING_TITLE} ({stats.counts.PENDING_APPROVAL})
              </h2>
              {stats.counts.PENDING_APPROVAL > stats.recentPending.length && (
                <Link to={restaurantsWithStatus(RESTAURANT_STATUS.PENDING_APPROVAL)} className="back-link">
                  {PAGE.VIEW_ALL}
                </Link>
              )}
            </div>

            {stats.recentPending.length === 0 ? (
              <div className="empty-state">{PAGE.NO_PENDING}</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table data-table--stack">
                  <thead>
                    <tr>
                      <th>Restaurant</th>
                      <th>Owner</th>
                      <th>{PAGE.REGISTERED}</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPending.map((restaurant) => (
                      <tr key={restaurant._id} onClick={() => navigate(ROUTES.restaurantDetail(restaurant._id))}>
                        <td>
                          <div className="cell-title">{restaurant.name}</div>
                          <div className="cell-sub">{restaurant.address}</div>
                        </td>
                        <td data-label="Owner">
                          <div>{restaurant.owner?.name ?? '—'}</div>
                          <div className="cell-sub">{restaurant.owner?.email}</div>
                        </td>
                        <td className="nowrap" data-label={PAGE.REGISTERED}>{formatDate(restaurant.createdAt)}</td>
                        <td data-label="Status">
                          <StatusBadge status={restaurant.status} />
                        </td>
                        <td className="nowrap cell-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="action-row">
                            <button className="btn btn-primary btn-sm" onClick={() => openAction(restaurant, 'approve')}>
                              Approve
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openAction(restaurant, 'reject')}>
                              Reject
                            </button>
                            <Link className="btn btn-ghost btn-sm" to={ROUTES.restaurantDetail(restaurant._id)}>
                              {PAGE.REVIEW}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {dialog}
    </div>
  );
};

export { Dashboard };
