import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerRestaurant, updateRestaurant, setRestaurantGps, setBillingSettings, getErrorMessage } from '../services/api';
import { MESSAGES } from '../constants';
import './FormPage.css';

// ============================================================
// Restaurant Page — Register / Edit restaurant details
// ============================================================

const PAGE_CONSTANTS = {
  TITLE: 'Restaurant Setup',
  SUBTITLE: 'Configure your restaurant details and GPS location.',
  REGISTER_TITLE: 'Register Your Restaurant',
  FIELDS: {
    NAME: 'Restaurant Name',
    ADDRESS: 'Address',
    LATITUDE: 'Latitude',
    LONGITUDE: 'Longitude',
    RADIUS: 'GPS Radius (meters)',
  },
  PLACEHOLDER: {
    NAME: 'e.g. The Spice Garden',
    ADDRESS: 'e.g. 123 Main St, Mumbai',
    LATITUDE: 'e.g. 19.0760',
    LONGITUDE: 'e.g. 72.8777',
    RADIUS: '200',
  },
  GPS_SECTION: 'GPS Anti-Spam Settings',
  GPS_DESC: 'Set the location and radius within which customers can place orders.',
  SUCCESS_REGISTER: 'Restaurant registered! It is now waiting for approval from the QR Menu team.',
  SUCCESS_UPDATE: 'Restaurant updated!',
  SUCCESS_GPS: 'GPS settings updated!',
  BTN_REGISTER: 'Register Restaurant',
  BTN_UPDATE: 'Update Details',
  BTN_UPDATE_GPS: 'Update GPS',
  STAFF_CODE_SECTION: 'Staff Login Code',
  STAFF_CODE_DESC: 'Waiters sign in on the admin login page with this code + their username and PIN (add them under Staff).',
  BILLING_SECTION: 'Billing Settings',
  BILLING_DESC: 'Applied to every table bill. Service charge is on the subtotal; GST is on subtotal + service charge.',
  GST: 'GST (%)',
  SERVICE_CHARGE: 'Service Charge (%)',
  BTN_UPDATE_BILLING: 'Save Billing Settings',
  SUCCESS_BILLING: 'Billing settings updated!',
} as const;

const Restaurant = () => {
  const { restaurant, setRestaurant, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    address: restaurant?.address || '',
  });

  const [gpsData, setGpsData] = useState({
    latitude: restaurant?.gpsCoordinates?.latitude?.toString() || '',
    longitude: restaurant?.gpsCoordinates?.longitude?.toString() || '',
    gpsRadiusMeters: restaurant?.gpsRadiusMeters?.toString() || '200',
  });

  const [billingData, setBillingData] = useState({
    gstPercent: restaurant?.billingSettings?.gstPercent?.toString() ?? '0',
    serviceChargePercent: restaurant?.billingSettings?.serviceChargePercent?.toString() ?? '0',
  });

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await registerRestaurant({
        name: formData.name,
        address: formData.address,
        gpsCoordinates: {
          latitude: parseFloat(gpsData.latitude),
          longitude: parseFloat(gpsData.longitude),
        },
        gpsRadiusMeters: parseInt(gpsData.gpsRadiusMeters),
      });
      setRestaurant(data.data);
      await refreshProfile();
      setMessage(PAGE_CONSTANTS.SUCCESS_REGISTER);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await updateRestaurant(restaurant._id, {
        name: formData.name,
        address: formData.address,
      });
      setRestaurant(data.data);
      setMessage(PAGE_CONSTANTS.SUCCESS_UPDATE);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleGpsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await setRestaurantGps(restaurant._id, {
        latitude: parseFloat(gpsData.latitude),
        longitude: parseFloat(gpsData.longitude),
        gpsRadiusMeters: parseInt(gpsData.gpsRadiusMeters),
      });
      setRestaurant(data.data);
      setMessage(PAGE_CONSTANTS.SUCCESS_GPS);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleBillingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await setBillingSettings(restaurant._id, {
        gstPercent: parseFloat(billingData.gstPercent) || 0,
        serviceChargePercent: parseFloat(billingData.serviceChargePercent) || 0,
      });
      setRestaurant(data.data);
      setMessage(PAGE_CONSTANTS.SUCCESS_BILLING);
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        setMessage('Location fetched! Review and save.');
      },
      () => {
        setLocating(false);
        setMessage('Could not get location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleInputChange = (field: string, value: string, isGps = false) => {
    if (isGps) {
      setGpsData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE_CONSTANTS.TITLE}</h1>
        <p className="page-subtitle">{PAGE_CONSTANTS.SUBTITLE}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      {/* Restaurant Details */}
      <form onSubmit={restaurant ? handleUpdate : handleRegister} className="form-card">
        <h2 className="card-title">
          {restaurant ? PAGE_CONSTANTS.TITLE : PAGE_CONSTANTS.REGISTER_TITLE}
        </h2>

        <div className="form-group">
          <label className="form-label">{PAGE_CONSTANTS.FIELDS.NAME}</label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={PAGE_CONSTANTS.PLACEHOLDER.NAME}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{PAGE_CONSTANTS.FIELDS.ADDRESS}</label>
          <input
            type="text"
            className="form-input"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder={PAGE_CONSTANTS.PLACEHOLDER.ADDRESS}
            required
          />
        </div>

        {!restaurant && (
          <>
            <div className="form-group">
              <button type="button" className="btn-secondary" onClick={handleUseMyLocation} disabled={locating}>
                {locating ? 'Fetching location...' : '📍 Use My Location'}
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{PAGE_CONSTANTS.FIELDS.LATITUDE}</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={gpsData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value, true)}
                  placeholder={PAGE_CONSTANTS.PLACEHOLDER.LATITUDE}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{PAGE_CONSTANTS.FIELDS.LONGITUDE}</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={gpsData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value, true)}
                  placeholder={PAGE_CONSTANTS.PLACEHOLDER.LONGITUDE}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE_CONSTANTS.FIELDS.RADIUS}</label>
              <input
                type="number"
                className="form-input"
                value={gpsData.gpsRadiusMeters}
                onChange={(e) => handleInputChange('gpsRadiusMeters', e.target.value, true)}
                placeholder={PAGE_CONSTANTS.PLACEHOLDER.RADIUS}
              />
            </div>
          </>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? MESSAGES.LOADING : (restaurant ? PAGE_CONSTANTS.BTN_UPDATE : PAGE_CONSTANTS.BTN_REGISTER)}
        </button>
      </form>

      {/* GPS Settings (shown only after registration) */}
      {restaurant && (
        <form onSubmit={handleGpsUpdate} className="form-card">
          <h2 className="card-title">{PAGE_CONSTANTS.GPS_SECTION}</h2>
          <p className="card-subtitle">{PAGE_CONSTANTS.GPS_DESC}</p>

          <div className="form-group">
            <button type="button" className="btn-secondary" onClick={handleUseMyLocation} disabled={locating}>
              {locating ? 'Fetching location...' : '📍 Use My Location'}
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{PAGE_CONSTANTS.FIELDS.LATITUDE}</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={gpsData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value, true)}
                placeholder={PAGE_CONSTANTS.PLACEHOLDER.LATITUDE}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE_CONSTANTS.FIELDS.LONGITUDE}</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={gpsData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value, true)}
                placeholder={PAGE_CONSTANTS.PLACEHOLDER.LONGITUDE}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{PAGE_CONSTANTS.FIELDS.RADIUS}</label>
            <input
              type="number"
              className="form-input"
              value={gpsData.gpsRadiusMeters}
              onChange={(e) => handleInputChange('gpsRadiusMeters', e.target.value, true)}
              placeholder={PAGE_CONSTANTS.PLACEHOLDER.RADIUS}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? MESSAGES.LOADING : PAGE_CONSTANTS.BTN_UPDATE_GPS}
          </button>
        </form>
      )}

      {restaurant && (
        <div className="form-card">
          <h2 className="card-title">{PAGE_CONSTANTS.STAFF_CODE_SECTION}</h2>
          <p className="card-subtitle">{PAGE_CONSTANTS.STAFF_CODE_DESC}</p>
          <div className="page-title" style={{ letterSpacing: 6 }}>{restaurant.restaurantCode ?? '—'}</div>
        </div>
      )}

      {restaurant && (
        <form onSubmit={handleBillingUpdate} className="form-card">
          <h2 className="card-title">{PAGE_CONSTANTS.BILLING_SECTION}</h2>
          <p className="card-subtitle">{PAGE_CONSTANTS.BILLING_DESC}</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{PAGE_CONSTANTS.GST}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="28"
                className="form-input"
                value={billingData.gstPercent}
                onChange={(e) => setBillingData((p) => ({ ...p, gstPercent: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE_CONSTANTS.SERVICE_CHARGE}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                className="form-input"
                value={billingData.serviceChargePercent}
                onChange={(e) => setBillingData((p) => ({ ...p, serviceChargePercent: e.target.value }))}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? MESSAGES.LOADING : PAGE_CONSTANTS.BTN_UPDATE_BILLING}
          </button>
        </form>
      )}
    </div>
  );
};

export { Restaurant };
