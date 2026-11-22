import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setMenuTheme, getCategories, getDishes, updateRestaurant, uploadImage, discardImage } from '../services/api';
import { MESSAGES, ROUTES } from '../constants';
import type { IMenuTheme, ICategory, IDish } from '../types';
import { usePendingUpload } from '../hooks/usePendingUpload';
import './FormPage.css';

// ============================================================
// Settings — Menu theme customization + Restaurant branding
// ============================================================

const PAGE = {
  TITLE: 'Theme Customizer',
  SUBTITLE: 'Customize the look and feel of your customer-facing menu.',
  FIELDS: {
    PRIMARY: 'Primary Color',
    SECONDARY: 'Secondary Color',
    BACKGROUND: 'Background Color',
    BG_IMAGE: 'Background Image',
    FONT: 'Font Family',
    LAYOUT: 'Menu Layout',
    LOGO: 'Restaurant Logo',
  },
  FONTS: ['Inter', 'Roboto', 'Outfit', 'Poppins', 'Lato', 'Nunito', 'Montserrat'],
  LAYOUTS: { grid: 'Grid View', list: 'List View' },
  PREVIEW_TITLE: 'Preview',
  PREVIEW_DESC: 'This is how your menu will look to customers.',
  SUCCESS: 'Theme updated!',
  SUCCESS_LOGO: 'Logo updated!',
  BTN_SAVE: 'Save Theme',
  NO_MENU: 'Create a menu first to customize its theme.',
} as const;

interface ICategoryWithDishes extends ICategory {
  dishes: IDish[];
}

const Settings = () => {
  const { menu, restaurant, setMenu, setRestaurant, refreshSetup, isSetupComplete } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<IMenuTheme>(
    menu?.theme || {
      primaryColor: '#FF6B35',
      secondaryColor: '#004E89',
      backgroundColor: '#FFFFFF',
      backgroundImageUrl: '',
      fontFamily: 'Inter',
      layout: 'grid',
    }
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewCategories, setPreviewCategories] = useState<ICategoryWithDishes[]>([]);
  const [selectedPreviewCatId, setSelectedPreviewCatId] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const bgUpload = usePendingUpload();

  // Fetch real categories & dishes for the live preview
  const fetchPreviewData = useCallback(async () => {
    if (!menu) return;
    try {
      const { data: catData } = await getCategories(menu._id);
      const cats = catData.data.filter((c: ICategory) => c.isActive);
      const withDishes = await Promise.all(
        cats.map(async (cat: ICategory) => {
          const { data: dishData } = await getDishes(cat._id);
          return { ...cat, dishes: dishData.data as IDish[] };
        })
      );
      setPreviewCategories(withDishes);
      if (withDishes.length > 0) {
        setSelectedPreviewCatId(withDishes[0]._id);
      }
    } catch { /* silently fail */ }
  }, [menu]);

  useEffect(() => {
    fetchPreviewData();
  }, [fetchPreviewData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu) return;
    setLoading(true);
    try {
      const { data } = await setMenuTheme(menu._id, theme);
      bgUpload.commit();
      setMenu(data.data);
      setMessage(PAGE.SUCCESS);
      const next = await refreshSetup();
      // Saving the theme was the last Quick Setup step: celebrate on the Dashboard
      if (!isSetupComplete && next?.isComplete) {
        navigate(ROUTES.DASHBOARD, { state: { setupJustCompleted: true } });
      }
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!restaurant) return;
    setLogoUploading(true);
    let uploadedUrl: string | null = null;
    try {
      const { data: uploadData } = await uploadImage(file, 'logos');
      uploadedUrl = uploadData.data.url;
      const { data } = await updateRestaurant(restaurant._id, { logoUrl: uploadedUrl });
      setRestaurant(data.data);
      setMessage(PAGE.SUCCESS_LOGO);
    } catch {
      // Uploaded but not saved on the restaurant → don't leave it in Cloudinary.
      if (uploadedUrl) void discardImage(uploadedUrl);
      setMessage('Logo upload failed. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBgImageUpload = async (file: File) => {
    setBgUploading(true);
    try {
      const { data: uploadData } = await uploadImage(file, 'backgrounds');
      bgUpload.track(uploadData.data.url);
      setTheme((prev) => ({ ...prev, backgroundImageUrl: uploadData.data.url }));
    } catch {
      setMessage('Background image upload failed. Please try again.');
    } finally {
      setBgUploading(false);
    }
  };

  const updateField = <K extends keyof IMenuTheme>(key: K, value: IMenuTheme[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  if (!menu) {
    return (
      <div className="form-page">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">{PAGE.NO_MENU}</p>
        </div>
      </div>
    );
  }

  const selectedPreviewCat = previewCategories.find((c) => c._id === selectedPreviewCatId);
  const previewDishes = selectedPreviewCat ? selectedPreviewCat.dishes.filter((d) => d.isAvailable) : [];

  return (
    <div className="form-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      {/* Restaurant Logo Upload */}
      <div className="form-card">
        <h2 className="card-title">{PAGE.FIELDS.LOGO}</h2>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>Upload your restaurant logo — this appears at the top of your customer menu.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {restaurant?.logoUrl ? (
            <img src={restaurant.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, border: '2px solid var(--border)' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--text-secondary)' }}>🏪</div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              disabled={logoUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            {logoUploading && <p className="upload-status">Uploading logo...</p>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="form-card">
        {/* Colors */}
        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.PRIMARY}</label>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
            <input className="form-input" value={theme.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.SECONDARY}</label>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
            <input className="form-input" value={theme.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.BACKGROUND}</label>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.backgroundColor} onChange={(e) => updateField('backgroundColor', e.target.value)} />
            <input className="form-input" value={theme.backgroundColor} onChange={(e) => updateField('backgroundColor', e.target.value)} />
          </div>
        </div>

        {/* Background Image */}
        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.BG_IMAGE}</label>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Optional background image overlaid on the background color.</p>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            disabled={bgUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBgImageUpload(file);
            }}
          />
          {bgUploading && <p className="upload-status">Uploading background...</p>}
          {theme.backgroundImageUrl && !bgUploading && (
            <div style={{ marginTop: 10, position: 'relative' }}>
              <img src={theme.backgroundImageUrl} alt="Background preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--border)' }} />
              <button
                type="button"
                onClick={() => {
                  bgUpload.discard();
                  setTheme((prev) => ({ ...prev, backgroundImageUrl: '' }));
                }}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          )}
        </div>

        {/* Font */}
        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.FONT}</label>
          <select className="form-select" value={theme.fontFamily} onChange={(e) => updateField('fontFamily', e.target.value)}>
            {PAGE.FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Layout */}
        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.LAYOUT}</label>
          <select className="form-select" value={theme.layout} onChange={(e) => updateField('layout', e.target.value as 'grid' | 'list')}>
            {Object.entries(PAGE.LAYOUTS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" disabled={loading || bgUploading}>
          {bgUploading ? 'Uploading...' : loading ? MESSAGES.LOADING : PAGE.BTN_SAVE}
        </button>
      </form>

      {/* Live Theme Preview with Real Data */}
      <div className="form-card">
        <h2 className="card-title">{PAGE.PREVIEW_TITLE}</h2>
        <p className="card-subtitle" style={{ marginBottom: 16 }}>{PAGE.PREVIEW_DESC}</p>
        <div style={{
          background: theme.backgroundColor,
          backgroundImage: theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: theme.fontFamily,
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Restaurant header with logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {restaurant?.logoUrl && (
              <img src={restaurant.logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: theme.primaryColor }}>
              {restaurant?.name || 'Your Restaurant'}
            </div>
          </div>

          {/* Category tabs — real data */}
          {previewCategories.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {previewCategories.map((cat) => (
                <div
                  key={cat._id}
                  onClick={() => setSelectedPreviewCatId(cat._id)}
                  style={{
                    padding: '6px 16px',
                    background: selectedPreviewCatId === cat._id ? theme.primaryColor : 'rgba(255,255,255,0.85)',
                    color: selectedPreviewCatId === cat._id ? '#fff' : theme.primaryColor,
                    border: selectedPreviewCatId === cat._id ? 'none' : `1.5px solid ${theme.primaryColor}`,
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cat.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ padding: '6px 16px', background: theme.primaryColor, color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Starters</div>
              <div style={{ padding: '6px 16px', border: `1.5px solid ${theme.primaryColor}`, color: theme.primaryColor, borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.85)' }}>Mains</div>
            </div>
          )}

          {/* Dish cards — real data with images */}
          {previewDishes.length > 0 ? (
            <div style={{
              display: theme.layout === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: theme.layout === 'grid' ? 'repeat(2, 1fr)' : undefined,
              flexDirection: theme.layout === 'list' ? 'column' : undefined,
              gap: 10,
            }}>
              {previewDishes.slice(0, 4).map((dish) => (
                <div key={dish._id} style={{
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  display: theme.layout === 'list' ? 'flex' : 'block',
                  gap: theme.layout === 'list' ? 12 : 0,
                  alignItems: theme.layout === 'list' ? 'center' : undefined,
                }}>
                  {dish.imageUrl && (
                    <img src={dish.imageUrl} alt={dish.name} style={{
                      width: theme.layout === 'list' ? 72 : '100%',
                      height: theme.layout === 'list' ? 72 : 90,
                      objectFit: 'cover',
                      borderRadius: theme.layout === 'list' ? '12px 0 0 12px' : undefined,
                      flexShrink: 0,
                    }} />
                  )}
                  <div style={{ padding: theme.layout === 'list' ? '8px 12px' : 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {dish.name}
                        <span style={{ width: 10, height: 10, borderRadius: 2, border: `2px solid ${dish.isVeg ? '#10b981' : '#ef4444'}`, display: 'inline-block', flexShrink: 0 }} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: theme.primaryColor, marginTop: 2 }}>₹{dish.price}</div>
                    </div>
                    <div style={{ padding: '5px 12px', border: `2px solid ${theme.primaryColor}`, borderRadius: 8, color: theme.primaryColor, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.9)' }}>Add</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #f0f0f0', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Sample Dish</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: theme.primaryColor, marginTop: 4 }}>₹199</div>
              </div>
              <div style={{ padding: '7px 16px', border: `2px solid ${theme.primaryColor}`, borderRadius: 8, color: theme.primaryColor, fontSize: 12, fontWeight: 700 }}>Add</div>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
            Full preview available in Menu Builder →
          </p>
        </div>
      </div>
    </div>
  );
};

export { Settings };
