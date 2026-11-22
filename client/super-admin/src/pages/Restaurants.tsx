import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage, getRestaurants, getStats } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/format';
import { MESSAGES, PAGE_SIZE, RESTAURANT_STATUS, ROUTES, STATUS_FILTERS } from '../constants';
import type { RestaurantStatus } from '../constants';
import type { IRestaurantList, IStatusCounts } from '../types';

// ============================================================
// Restaurants — all restaurants with status filter, search and paging
// ============================================================

const PAGE = {
  TITLE: 'Restaurants',
  SUBTITLE: 'Every restaurant registered on the platform.',
  SEARCH_PLACEHOLDER: 'Search by name or address…',
  EMPTY: 'No restaurants match these filters.',
  PREV: '← Previous',
  NEXT: 'Next →',
  SEARCH_DEBOUNCE_MS: 300,
};

const isRestaurantStatus = (value: string | null): value is RestaurantStatus =>
  !!value && Object.values(RESTAURANT_STATUS).includes(value as RestaurantStatus);

const Restaurants = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Success message passed by RestaurantDetail after a delete
  const [flash] = useState<string | undefined>(() => (location.state as { flash?: string } | null)?.flash);
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const status = isRestaurantStatus(statusParam) ? statusParam : undefined;
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState<IRestaurantList | null>(null);
  const [counts, setCounts] = useState<IStatusCounts | null>(null);
  const [error, setError] = useState('');
  // Loading = the current filters haven't come back from the API yet
  const requestKey = `${status ?? ''}|${search}|${page}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next, { replace: true });
  };

  // Debounce typing into the search box before it hits the URL (and the API)
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(
      () => updateParams({ search: searchInput.trim() || undefined, page: undefined }),
      PAGE.SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    getRestaurants({ status, search, page, limit: PAGE_SIZE })
      .then(({ data }) => {
        if (cancelled) return;
        setResult(data.data);
        setError('');
        setLoadedKey(requestKey);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
        setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, page, requestKey]);

  useEffect(() => {
    getStats()
      .then(({ data }) => setCounts(data.data.counts))
      .catch(() => setCounts(null));
  }, []);

  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      <div className="toolbar">
        <div className="filter-tabs" role="tablist">
          {STATUS_FILTERS.map((filter) => {
            const active = (filter.value || undefined) === status;
            const count = counts ? (filter.value ? counts[filter.value] : counts.TOTAL) : null;
            return (
              <button
                key={filter.label}
                role="tab"
                aria-selected={active}
                className={`filter-tab ${active ? 'filter-tab--active' : ''}`}
                onClick={() => updateParams({ status: filter.value || undefined, page: undefined })}
              >
                {filter.label}
                {count !== null && <span className="filter-count">{count}</span>}
              </button>
            );
          })}
        </div>
        <input
          type="search"
          className="search-input"
          placeholder={PAGE.SEARCH_PLACEHOLDER}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search restaurants"
        />
      </div>

      {flash && <div className="alert alert-success">{flash}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        {loading && !result ? (
          <p className="cell-sub">{MESSAGES.LOADING}</p>
        ) : result && result.items.length === 0 ? (
          <div className="empty-state">{PAGE.EMPTY}</div>
        ) : (
          result && (
            <div className="table-scroll">
              <table className="data-table data-table--stack" style={{ opacity: loading ? 0.6 : 1 }}>
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((restaurant) => (
                    <tr key={restaurant._id} onClick={() => navigate(ROUTES.restaurantDetail(restaurant._id))}>
                      <td>
                        <div className="cell-title">{restaurant.name}</div>
                        <div className="cell-sub">{restaurant.address}</div>
                      </td>
                      <td data-label="Owner">
                        <div className="owner-cell">
                          {restaurant.owner?.profilePicture && (
                            <img src={restaurant.owner.profilePicture} alt="" className="avatar-sm" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <div>{restaurant.owner?.name ?? '—'}</div>
                            <div className="cell-sub">{restaurant.owner?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={restaurant.status} />
                        {!restaurant.isActive && <div className="cell-sub">Deactivated by owner</div>}
                      </td>
                      <td className="nowrap" data-label="Registered">{formatDate(restaurant.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {pagination && pagination.total > 0 && (
          <div className="pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
              {pagination.total === 1 ? 'restaurant' : 'restaurants'}
            </span>
            <div className="action-row">
              <button
                className="btn btn-ghost btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => updateParams({ page: String(pagination.page - 1) })}
              >
                {PAGE.PREV}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateParams({ page: String(pagination.page + 1) })}
              >
                {PAGE.NEXT}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export { Restaurants };
