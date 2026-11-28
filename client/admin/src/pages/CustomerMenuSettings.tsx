import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setMenuTheme, updateMenu, updateRestaurant, uploadImage, discardImage, getErrorMessage } from '../services/api';
import { MESSAGES, ROUTES } from '../constants';
import type { IMenuTheme } from '../types';
import { PhoneMenuPreview } from '../components/menu-preview/MenuPreview';
import { fetchCategoriesWithDishes, type ICategoryWithDishes } from '../components/menu-preview/preview-data';
import { usePendingUpload } from '../hooks/usePendingUpload';
import { readablePalette } from '../utils/theme.util';
import './FormPage.css';
import './CustomerMenuSettings.css';

// ============================================================
// Customer Menu — what diners see after scanning a table QR:
// whether they can order from their phone, the logo, and the look (colours, font, layout).
// ============================================================

const PAGE = {
  TITLE: 'Customer Menu',
  SUBTITLE: 'Choose how customers use the menu they open by scanning a table QR, and how it looks.',
  ORDERING: {
    TITLE: 'How customers use this menu',
    SUBTITLE: 'Saved as soon as you pick an option. Waiters can always take orders from the Tables page.',
    OPTIONS: [
      {
        value: true,
        icon: '🛒',
        title: 'View & order',
        body: 'Customers browse, add dishes to a shared table cart and send orders to the kitchen from their phone.',
      },
      {
        value: false,
        icon: '👀',
        title: 'View only',
        body: 'Customers only browse the menu. They can still call a waiter or ask for the bill — the waiter takes the order.',
      },
    ],
    SAVED_ON: 'Customers can now order from their phones.',
    SAVED_OFF: 'Menu is now view-only — customers call a waiter to order.',
  },
  LOOK_TITLE: 'Look & feel',
  FIELDS: {
    PRIMARY: 'Button colour',
    SECONDARY: 'Heading colour',
    BACKGROUND: 'Background colour',
    BG_IMAGE: 'Cover Image',
    FONT: 'Font Family',
    LAYOUT: 'Menu Layout',
    LOGO: 'Restaurant Logo',
  },
  FIELD_TAGS: { PRIMARY: 'primary', SECONDARY: 'secondary' },
  HINTS: {
    PRIMARY: 'Used for the selected category tab, the ADD button and the Place order button.',
    SECONDARY: 'Used for category titles on the menu, like "Starters" or "Burger".',
    BACKGROUND: 'The page colour. Text and cards turn light or dark automatically so they stay readable.',
  },
  SAMPLE: {
    TAB: 'Starters',
    ADD: 'ADD',
    ORDER: 'Place order',
    HEADING: 'Starters',
    DISH: 'Paneer Tikka · ₹280',
    TEXT: 'Dish names and prices',
    MUTED: 'Descriptions',
    CARD: 'Card',
  },
  WARN_PRIMARY: (dark: boolean) =>
    `Too ${dark ? 'dark' : 'light'} to read on this background, so the ADD text shows in ${dark ? 'white' : 'black'}. Tabs and buttons still use it.`,
  WARN_SECONDARY: (dark: boolean) =>
    `Too ${dark ? 'dark' : 'light'} to read on this background, so customers see headings in ${dark ? 'white' : 'black'}. Pick a ${dark ? 'lighter' : 'darker'} colour.`,
  FONTS: ['Inter', 'Roboto', 'Outfit', 'Poppins', 'Lato', 'Nunito', 'Montserrat'],
  LAYOUTS: { grid: 'Grid View', list: 'List View' },
  PREVIEW_TITLE: 'Preview',
  PREVIEW_DESC: 'Exactly what customers see after scanning a table QR. Try it: search, filter, add dishes — nothing is sent.',
  SUCCESS: 'Look & feel saved!',
  SUCCESS_LOGO: 'Logo updated!',
  BTN_SAVE: 'Save Look & Feel',
  NO_MENU: 'Create a menu first to set up the customer menu.',
} as const;

const CustomerMenuSettings = () => {
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [orderingSaving, setOrderingSaving] = useState(false);
  const bgUpload = usePendingUpload();
  const customerOrderingEnabled = menu?.customerOrderingEnabled !== false;

  // Real categories & dishes for the live preview (once per menu — not on every theme change)
  const menuId = menu?._id;
  useEffect(() => {
    if (!menuId) return;
    fetchCategoriesWithDishes(menuId).then(setPreviewCategories).catch(() => { /* preview shows an empty menu */ });
  }, [menuId]);

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

  const handleOrderingChange = async (enabled: boolean) => {
    if (!menu || enabled === customerOrderingEnabled) return;
    setOrderingSaving(true);
    try {
      const { data } = await updateMenu(menu._id, { customerOrderingEnabled: enabled });
      setMenu(data.data);
      setMessage(enabled ? PAGE.ORDERING.SAVED_ON : PAGE.ORDERING.SAVED_OFF);
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setOrderingSaving(false);
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

  const pal = readablePalette(theme.backgroundColor, theme.primaryColor, theme.secondaryColor);

  return (
    <div className="form-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      {/* Ordering mode */}
      <div className="form-card">
        <h2 className="card-title">{PAGE.ORDERING.TITLE}</h2>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>{PAGE.ORDERING.SUBTITLE}</p>
        <div className="ordering-options" role="radiogroup" aria-label={PAGE.ORDERING.TITLE}>
          {PAGE.ORDERING.OPTIONS.map((option) => {
            const selected = option.value === customerOrderingEnabled;
            return (
              <button
                key={option.title}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={orderingSaving}
                className={`ordering-option ${selected ? 'ordering-option--selected' : ''}`}
                onClick={() => void handleOrderingChange(option.value)}
              >
                <span className="ordering-option-icon">{option.icon}</span>
                <span className="ordering-option-text">
                  <strong>{option.title}</strong>
                  <span>{option.body}</span>
                </span>
                <span className="ordering-option-check" aria-hidden>{selected ? '●' : '○'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="card-title customer-menu-section-title">{PAGE.LOOK_TITLE}</h2>

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
        {/* Colours — each picker shows a live sample of where the colour appears */}
        <div className="form-group">
          <label className="form-label">
            {PAGE.FIELDS.PRIMARY} <span className="field-tag">{PAGE.FIELD_TAGS.PRIMARY}</span>
          </label>
          <p className="form-hint">{PAGE.HINTS.PRIMARY}</p>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
            <input className="form-input" value={theme.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
          </div>
          <div className="color-sample" style={{ background: theme.backgroundColor }}>
            <span className="color-sample-tab" style={{ background: theme.primaryColor, color: pal.onPrimary }}>{PAGE.SAMPLE.TAB}</span>
            <span className="color-sample-add" style={{ background: pal.surface, color: pal.primaryText, borderColor: pal.line }}>{PAGE.SAMPLE.ADD}</span>
            <span className="color-sample-btn" style={{ background: theme.primaryColor, color: pal.onPrimary }}>{PAGE.SAMPLE.ORDER}</span>
          </div>
          {!pal.primaryReadable && <p className="form-warn">⚠ {PAGE.WARN_PRIMARY(pal.dark)}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">
            {PAGE.FIELDS.SECONDARY} <span className="field-tag">{PAGE.FIELD_TAGS.SECONDARY}</span>
          </label>
          <p className="form-hint">{PAGE.HINTS.SECONDARY}</p>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
            <input className="form-input" value={theme.secondaryColor} onChange={(e) => updateField('secondaryColor', e.target.value)} />
          </div>
          <div className="color-sample color-sample--stack" style={{ background: theme.backgroundColor }}>
            <span className="color-sample-heading" style={{ color: pal.accent }}>{PAGE.SAMPLE.HEADING}</span>
            <span style={{ color: pal.ink, fontSize: 14 }}>{PAGE.SAMPLE.DISH}</span>
          </div>
          {!pal.accentReadable && <p className="form-warn">⚠ {PAGE.WARN_SECONDARY(pal.dark)}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.BACKGROUND}</label>
          <p className="form-hint">{PAGE.HINTS.BACKGROUND}</p>
          <div className="color-input-row">
            <input type="color" className="color-swatch" value={theme.backgroundColor} onChange={(e) => updateField('backgroundColor', e.target.value)} />
            <input className="form-input" value={theme.backgroundColor} onChange={(e) => updateField('backgroundColor', e.target.value)} />
          </div>
          <div className="color-sample" style={{ background: theme.backgroundColor }}>
            <span style={{ color: pal.ink, fontWeight: 600, fontSize: 14 }}>{PAGE.SAMPLE.TEXT}</span>
            <span style={{ color: pal.ink2, fontSize: 13 }}>{PAGE.SAMPLE.MUTED}</span>
            <span className="color-sample-add" style={{ background: pal.surface, color: pal.ink, borderColor: pal.line }}>{PAGE.SAMPLE.CARD}</span>
          </div>
        </div>

        {/* Background Image */}
        <div className="form-group">
          <label className="form-label">{PAGE.FIELDS.BG_IMAGE}</label>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Optional cover photo shown behind your restaurant name at the top of the menu. The rest of the page uses the background color.</p>
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

      {/* Live preview — the real customer menu, with the colours above applied before saving */}
      <div className="form-card">
        <h2 className="card-title">{PAGE.PREVIEW_TITLE}</h2>
        <p className="card-subtitle" style={{ marginBottom: 16 }}>{PAGE.PREVIEW_DESC}</p>
        <PhoneMenuPreview restaurant={restaurant} menu={menu} theme={theme} categories={previewCategories} />
      </div>
    </div>
  );
};

export { CustomerMenuSettings };
