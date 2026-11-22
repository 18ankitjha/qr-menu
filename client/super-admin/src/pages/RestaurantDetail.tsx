import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteRestaurant, getErrorMessage, getRestaurant } from '../services/api';
import { useStatusAction } from '../hooks/useStatusAction';
import { StatusBadge } from '../components/StatusBadge';
import { DeleteRestaurantDialog } from '../components/DeleteRestaurantDialog';
import { formatAmount, formatDate, formatDateTime } from '../utils/format';
import { ACTION_CONFIG, MESSAGES, ROUTES, STATUS_ACTIONS, STATUS_LABELS } from '../constants';
import type { IRestaurantDetails, IStatusChange } from '../types';

// ============================================================
// RestaurantDetail — full profile + onboarding actions + history
// ============================================================

const PAGE = {
  BACK: '← All restaurants',
  RESTAURANT: 'Restaurant',
  OWNER: 'Owner',
  SETUP: 'Setup & activity',
  HISTORY: 'Status history',
  NO_HISTORY: 'No history yet — this restaurant was registered before onboarding approval existed.',
  NOT_FOUND: 'Restaurant not found.',
  REASON_PREFIX: 'Reason: ',
  OWNER_DEACTIVATED: 'Deactivated by owner',
  YES: 'Yes',
  NO: 'No',
  NONE: '—',
  DANGER_TITLE: 'Danger zone',
  DANGER_DESC: 'Permanently delete this restaurant, all its data and the owner account.',
  DELETE: 'Delete restaurant',
};

const HISTORY_LABELS: Record<IStatusChange['action'], string> = {
  REGISTER: 'Registered — waiting for approval',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  SUSPEND: 'Suspended',
  REACTIVATE: 'Reactivated',
};

const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

const RestaurantDetail = () => {
  const { id = '' } = useParams();
  const [details, setDetails] = useState<IRestaurantDetails | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRestaurant(id)
      .then(({ data }) => {
        if (cancelled) return;
        setDetails(data.data);
        setError('');
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, PAGE.NOT_FOUND)));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const { openAction, dialog, successMessage } = useStatusAction(() => setReloadKey((key) => key + 1));

  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (confirmName: string) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const { data } = await deleteRestaurant(id, confirmName);
      navigate(ROUTES.RESTAURANTS, { replace: true, state: { flash: data.message } });
    } catch (err) {
      setDeleteError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
      setDeleting(false);
    }
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteError('');
  };

  if (error && !details) {
    return (
      <div className="page">
        <Link to={ROUTES.RESTAURANTS} className="back-link">{PAGE.BACK}</Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!details) {
    return <div className="page cell-sub">{MESSAGES.LOADING}</div>;
  }

  const { restaurant, stats } = details;
  const history = [...(restaurant.statusHistory ?? [])].reverse();
  const actions = STATUS_ACTIONS[restaurant.status];

  return (
    <div className="page">
      <Link to={ROUTES.RESTAURANTS} className="back-link">{PAGE.BACK}</Link>

      <div className="page-header detail-header">
        <div>
          <div className="detail-title-row">
            <h1 className="page-title">{restaurant.name}</h1>
            <StatusBadge status={restaurant.status} />
            {!restaurant.isActive && <span className="cell-sub">{PAGE.OWNER_DEACTIVATED}</span>}
          </div>
          <p className="page-subtitle">{restaurant.address}</p>
        </div>
        <div className="action-row">
          {actions.map((action) => (
            <button
              key={action}
              className={`btn ${ACTION_CONFIG[action].tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => openAction(restaurant, action)}
            >
              {ACTION_CONFIG[action].label}
            </button>
          ))}
        </div>
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {restaurant.statusReason && (
        <div className="status-reason card">
          <strong>{STATUS_LABELS[restaurant.status]}.</strong> {PAGE.REASON_PREFIX}
          {restaurant.statusReason}
        </div>
      )}

      <div className="detail-grid">
        <section className="card">
          <h2 className="card-title">{PAGE.RESTAURANT}</h2>
          <dl className="kv-list">
            <dt>Restaurant ID</dt>
            <dd><code>{restaurant._id}</code></dd>
            <dt>Address</dt>
            <dd>{restaurant.address}</dd>
            <dt>GPS</dt>
            <dd>
              <a
                href={mapsUrl(restaurant.gpsCoordinates.latitude, restaurant.gpsCoordinates.longitude)}
                target="_blank"
                rel="noreferrer"
                className="back-link"
              >
                {restaurant.gpsCoordinates.latitude}, {restaurant.gpsCoordinates.longitude} ↗
              </a>
            </dd>
            <dt>Order radius</dt>
            <dd>{restaurant.gpsRadiusMeters} m</dd>
            <dt>Registered</dt>
            <dd>{formatDateTime(restaurant.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(restaurant.updatedAt)}</dd>
          </dl>
        </section>

        <section className="card">
          <h2 className="card-title">{PAGE.OWNER}</h2>
          {restaurant.owner ? (
            <div className="owner-cell">
              {restaurant.owner.profilePicture && (
                <img src={restaurant.owner.profilePicture} alt="" className="avatar-sm" referrerPolicy="no-referrer" />
              )}
              <div>
                <div className="cell-title">{restaurant.owner.name}</div>
                <a href={`mailto:${restaurant.owner.email}`} className="cell-sub">
                  {restaurant.owner.email}
                </a>
              </div>
            </div>
          ) : (
            <p className="cell-sub">{PAGE.NONE}</p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">{PAGE.SETUP}</h2>
          <dl className="kv-list">
            <dt>Menu</dt>
            <dd>{stats.menuName ?? PAGE.NONE}</dd>
            <dt>Dishes</dt>
            <dd>{stats.dishCount}</dd>
            <dt>Tables</dt>
            <dd>{stats.tableCount}</dd>
            <dt>Orders</dt>
            <dd>
              {stats.orders.totalOrders} total · {stats.orders.deliveredOrders} delivered
            </dd>
            <dt>Delivered revenue</dt>
            <dd>{formatAmount(stats.orders.deliveredRevenue)}</dd>
            <dt>Last order</dt>
            <dd>{stats.orders.lastOrderAt ? formatDate(stats.orders.lastOrderAt) : PAGE.NONE}</dd>
          </dl>
        </section>

        <section className="card">
          <h2 className="card-title">{PAGE.HISTORY}</h2>
          {history.length === 0 ? (
            <p className="cell-sub">{PAGE.NO_HISTORY}</p>
          ) : (
            <ol className="timeline">
              {history.map((change, index) => (
                <li key={`${change.changedAt}-${index}`} className="timeline-item">
                  <span className="timeline-dot" />
                  <div>
                    <div className="cell-title">{HISTORY_LABELS[change.action]}</div>
                    <div className="timeline-meta">
                      {formatDateTime(change.changedAt)} · {change.changedBy}
                    </div>
                    {change.reason && <div className="timeline-reason">“{change.reason}”</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card danger-zone">
        <div>
          <h2 className="card-title">{PAGE.DANGER_TITLE}</h2>
          <p className="cell-sub">{PAGE.DANGER_DESC}</p>
        </div>
        <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
          {PAGE.DELETE}
        </button>
      </section>

      {dialog}
      {deleteOpen && (
        <DeleteRestaurantDialog
          restaurantName={restaurant.name}
          ownerEmail={restaurant.owner?.email}
          busy={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
};

export { RestaurantDetail };
