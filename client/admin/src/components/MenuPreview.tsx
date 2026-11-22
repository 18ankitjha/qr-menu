import { useState, useMemo, useEffect } from 'react';
import type { IRestaurant, IMenu, ICategory, IDish } from '../types';
import './MenuPreview.css';

// ============================================================
// MenuPreview — Exact replica of customer menu in a phone frame
// ============================================================

interface ICategoryWithDishes extends ICategory {
  dishes: IDish[];
}

interface MenuPreviewProps {
  restaurant: IRestaurant;
  menu: IMenu;
  categories: ICategoryWithDishes[];
  onClose: () => void;
}

export const MenuPreview = ({ restaurant, menu, categories, onClose }: MenuPreviewProps) => {
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const [selectedCatId, setSelectedCatId] = useState<string>(
    activeCategories[0]?._id || ''
  );

  const filteredDishes = useMemo(() => {
    const cat = activeCategories.find((c) => c._id === selectedCatId);
    return cat ? cat.dishes.filter((d) => d.isAvailable) : [];
  }, [activeCategories, selectedCatId]);

  const { theme } = menu;
  const cssVars = {
    '--mp-primary': theme.primaryColor,
    '--mp-secondary': theme.secondaryColor,
    '--mp-bg': theme.backgroundColor,
  } as React.CSSProperties;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="mp-overlay" onClick={onClose}>
      <button
        type="button"
        className="mp-close-btn"
        onClick={onClose}
        aria-label="Close preview"
        title="Close preview (Esc)"
      >
        ✕
      </button>

      {/* Phone frame */}
      <div className="mp-phone" onClick={(e) => e.stopPropagation()}>
        {/* Phone chrome */}
        <div className="mp-phone-chrome">
          <div className="mp-phone-notch" />
        </div>

        {/* Scrollable menu content */}
        <div
          className="mp-screen"
          style={{ ...cssVars, fontFamily: theme.fontFamily }}
        >
          {/* Header */}
          <header className="mp-header">
            {restaurant.logoUrl && (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="mp-logo" />
            )}
            <h1 className="mp-restaurant-name">{restaurant.name}</h1>
          </header>

          {/* Category tabs */}
          <nav className="mp-cat-nav">
            {activeCategories.map((cat) => (
              <button
                key={cat._id}
                className={`mp-cat-tab ${selectedCatId === cat._id ? 'mp-cat-tab--active' : ''}`}
                onClick={() => setSelectedCatId(cat._id)}
              >
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Dishes */}
          <main className={`mp-dishes ${theme.layout === 'list' ? 'mp-dishes--list' : 'mp-dishes--grid'}`}>
            {filteredDishes.length === 0 ? (
              <p className="mp-empty">No available dishes in this category.</p>
            ) : (
              filteredDishes.map((dish) => (
                <article key={dish._id} className="mp-dish-card">
                  {dish.imageUrl && (
                    <img src={dish.imageUrl} alt={dish.name} className="mp-dish-img" />
                  )}
                  <div className="mp-dish-body">
                    <div className="mp-dish-title-row">
                      <span className="mp-dish-name">{dish.name}</span>
                      <span className={`mp-veg-dot ${dish.isVeg ? 'mp-veg-dot--veg' : 'mp-veg-dot--nonveg'}`} />
                    </div>
                    {dish.description && (
                      <p className="mp-dish-desc">{dish.description}</p>
                    )}
                    <div className="mp-dish-bottom">
                      <span className="mp-dish-price">₹{dish.price}</span>
                      {dish.tags && dish.tags.length > 0 && (
                        <div className="mp-dish-tags">
                          {dish.tags.map((tag) => (
                            <span key={tag} className="mp-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mp-dish-action">
                    <button className="mp-btn-add">Add</button>
                  </div>
                </article>
              ))
            )}
          </main>
        </div>

        {/* Bottom bar */}
        <div className="mp-phone-bottom" />
      </div>

      {/* Close hint */}
      <p className="mp-close-hint">Click outside, press Esc or ✕ to close</p>
    </div>
  );
};
