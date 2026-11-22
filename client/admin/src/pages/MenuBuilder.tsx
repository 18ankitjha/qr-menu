import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createMenu,
  getCategories,
  addCategory,
  updateCategory,
  setCategoryActive,
  deleteCategory,
  getDishes,
  addDish,
  updateDish,
  setDishAvailability,
  deleteDish,
  uploadImage,
} from '../services/api';
import { MESSAGES } from '../constants';
import type { ICategory, IDish } from '../types';
import { MenuPreview } from '../components/MenuPreview';
import './MenuBuilder.css';
import './FormPage.css';

// ============================================================
// Menu Builder — Categories + Dishes management
// ============================================================

const PAGE = {
  TITLE: 'Menu Builder',
  SUBTITLE: 'Create and manage your menu categories and dishes.',
  CREATE_MENU: 'Create Your Menu',
  MENU_NAME_LABEL: 'Menu Name',
  MENU_NAME_PLACEHOLDER: 'e.g. Main Menu',
  BTN_CREATE_MENU: 'Create Menu',
  CATEGORY_SECTION: 'Categories',
  ADD_CATEGORY: 'Add Category',
  CATEGORY_NAME: 'Category Name',
  CATEGORY_DESC: 'Description (optional)',
  DISH_SECTION: 'Dishes',
  ADD_DISH: 'Add Dish',
  DISH_FIELDS: {
    NAME: 'Dish Name',
    DESCRIPTION: 'Description',
    PRICE: 'Price (₹)',
    PREP_TIME: 'Prep Time (min)',
    TAGS: 'Tags (comma-separated)',
    IS_VEG: 'Vegetarian',
    IMAGE: 'Upload Image',
  },
  VEG_BADGE: 'VEG',
  NONVEG_BADGE: 'NON-VEG',
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
  NO_CATEGORIES: 'No categories yet. Add one to get started.',
  NO_DISHES: 'No dishes in this category.',
  SELECT_CATEGORY: 'Select a category to manage dishes.',
  SUCCESS_MENU: 'Menu created!',
  SUCCESS_CATEGORY: 'Category saved!',
  SUCCESS_DISH: 'Dish saved!',
} ;

const MenuBuilder = () => {
  const { restaurant, menu, setMenu } = useAuth();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<IDish[]>([]);
  const [menuName, setMenuName] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewCategories, setPreviewCategories] = useState<(ICategory & { dishes: IDish[] })[]>([]);

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<ICategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Dish form state
  const [showDishForm, setShowDishForm] = useState(false);
  const [editingDish, setEditingDish] = useState<IDish | null>(null);
  const [dishFormKey, setDishFormKey] = useState(0);
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    preparationTime: '',
    tags: '',
    isVeg: true,
    imageUrl: '',
  });

  const fetchCategories = useCallback(async () => {
    if (!menu) return;
    try {
      const { data } = await getCategories(menu._id);
      setCategories(data.data);
    } catch { /* empty */ }
  }, [menu]);

  const fetchDishes = useCallback(async (categoryId: string) => {
    try {
      const { data } = await getDishes(categoryId);
      setDishes(data.data);
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCatId) {
      fetchDishes(selectedCatId);
    }
  }, [selectedCatId, fetchDishes]);

  // --- Menu Creation ---
  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      const { data } = await createMenu({ restaurantId: restaurant._id, name: menuName });
      setMenu(data.data);
      setMessage(PAGE.SUCCESS_MENU);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  // --- Category CRUD ---
  const openCatForm = (cat?: ICategory) => {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ name: cat.name, description: cat.description || '' });
    } else {
      setEditingCat(null);
      setCatForm({ name: '', description: '' });
    }
    setShowCatForm(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu) return;
    setLoading(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat._id, catForm);
      } else {
        await addCategory({ ...catForm, menuId: menu._id });
      }
      await fetchCategories();
      setShowCatForm(false);
      setMessage(PAGE.SUCCESS_CATEGORY);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCatActive = async (cat: ICategory) => {
    await setCategoryActive(cat._id, !cat.isActive);
    await fetchCategories();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    await deleteCategory(catId);
    if (selectedCatId === catId) {
      setSelectedCatId(null);
      setDishes([]);
    }
    await fetchCategories();
  };

  // --- Dish CRUD ---
  const resetDishForm = () => {
    setDishForm({ name: '', description: '', price: '', preparationTime: '', tags: '', isVeg: true, imageUrl: '' });
  };

  const openDishForm = (dish?: IDish) => {
    // Increment key to force remount the modal form
    setDishFormKey((k) => k + 1);
    if (dish) {
      setEditingDish(dish);
      setDishForm({
        name: dish.name ?? '',
        description: dish.description ?? '',
        price: dish.price != null ? String(dish.price) : '',
        preparationTime: dish.preparationTime != null ? String(dish.preparationTime) : '',
        tags: Array.isArray(dish.tags) ? dish.tags.join(', ') : '',
        isVeg: typeof dish.isVeg === 'boolean' ? dish.isVeg : true,
        imageUrl: dish.imageUrl ?? '',
      });
    } else {
      setEditingDish(null);
      resetDishForm();
    }
    setShowDishForm(true);
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const { data } = await uploadImage(file, 'dishes');
      setDishForm((prev) => ({ ...prev, imageUrl: data.data.url }));
    } catch {
      setMessage('Image upload failed. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !menu) return;
    setLoading(true);
    try {
      const parsedTags = dishForm.tags
        ? dishForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;

      const payload = {
        name: dishForm.name,
        description: dishForm.description || undefined,
        price: parseFloat(dishForm.price),
        preparationTime: dishForm.preparationTime ? parseInt(dishForm.preparationTime) : undefined,
        tags: parsedTags && parsedTags.length > 0 ? parsedTags : undefined,
        isVeg: dishForm.isVeg,
        imageUrl: dishForm.imageUrl || undefined,
        categoryId: selectedCatId,
        menuId: menu._id,
      };

      if (editingDish) {
        await updateDish(editingDish._id, payload);
      } else {
        await addDish(payload);
      }
      await fetchDishes(selectedCatId);
      setShowDishForm(false);
      setEditingDish(null);
      resetDishForm();
      setMessage(PAGE.SUCCESS_DISH);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const openPreview = async () => {
    try {
      const withDishes = await Promise.all(
        categories.map(async (cat) => {
          const { data } = await getDishes(cat._id);
          return { ...cat, dishes: data.data as IDish[] };
        })
      );
      setPreviewCategories(withDishes);
      setShowPreview(true);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    }
  };

  const handleToggleDishAvailability = async (dish: IDish) => {
    await setDishAvailability(dish._id, !dish.isAvailable);
    if (selectedCatId) await fetchDishes(selectedCatId);
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    await deleteDish(dishId);
    if (selectedCatId) await fetchDishes(selectedCatId);
  };

  // --- Pre-menu state ---
  if (!menu) {
    return (
      <div className="form-page">
        <div className="page-header">
          <h1 className="page-title">{PAGE.TITLE}</h1>
        </div>
        {message && <div className="form-message">{message}</div>}
        <form onSubmit={handleCreateMenu} className="form-card">
          <h2 className="card-title">{PAGE.CREATE_MENU}</h2>
          <div className="form-group">
            <label className="form-label">{PAGE.MENU_NAME_LABEL}</label>
            <input
              className="form-input"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder={PAGE.MENU_NAME_PLACEHOLDER}
              required
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? MESSAGES.LOADING : PAGE.BTN_CREATE_MENU}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="menu-builder">
      <div className="page-header">
        <div>
          <h1 className="page-title">{PAGE.TITLE}</h1>
          <p className="page-subtitle">{PAGE.SUBTITLE}</p>
        </div>
        {categories.length > 0 && (
          <button className="btn-primary" onClick={openPreview}>
            👁️ Preview Menu
          </button>
        )}
      </div>

      {message && <div className="form-message">{message}</div>}

      <div className="menu-builder-grid">
        {/* Left: Categories */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">{PAGE.CATEGORY_SECTION}</h2>
            <button className="btn-secondary" onClick={() => openCatForm()}>
              + {PAGE.ADD_CATEGORY}
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p className="empty-text">{PAGE.NO_CATEGORIES}</p>
            </div>
          ) : (
            <div className="category-list">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className={`category-item ${selectedCatId === cat._id ? 'category-item--selected' : ''} ${!cat.isActive ? 'category-item--inactive' : ''}`}
                  onClick={() => setSelectedCatId(cat._id)}
                >
                  <div className="category-info">
                    <span className="category-name">{cat.name}</span>
                    {cat.description && <span className="category-desc">{cat.description}</span>}
                  </div>
                  <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => handleToggleCatActive(cat)} title={cat.isActive ? 'Deactivate' : 'Activate'}>
                      {cat.isActive ? '👁️' : '🚫'}
                    </button>
                    <button className="btn-icon" onClick={() => openCatForm(cat)}>✏️</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteCategory(cat._id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Dishes */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">{PAGE.DISH_SECTION}</h2>
            {selectedCatId && (
              <button className="btn-secondary" onClick={() => openDishForm()}>
                + {PAGE.ADD_DISH}
              </button>
            )}
          </div>

          {!selectedCatId ? (
            <div className="empty-state">
              <div className="empty-icon">👈</div>
              <p className="empty-text">{PAGE.SELECT_CATEGORY}</p>
            </div>
          ) : dishes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p className="empty-text">{PAGE.NO_DISHES}</p>
            </div>
          ) : (
            <div className="dish-list">
              {dishes.map((dish) => (
                <div key={dish._id} className={`dish-card ${!dish.isAvailable ? 'dish-card--unavailable' : ''}`}>
                  {dish.imageUrl && (
                    <img src={dish.imageUrl} alt={dish.name} className="dish-image" />
                  )}
                  <div className="dish-info">
                    <div className="dish-header-row">
                      <span className="dish-name">{dish.name}</span>
                      <span className={`veg-badge ${dish.isVeg ? 'veg-badge--veg' : 'veg-badge--nonveg'}`}>
                        {dish.isVeg ? PAGE.VEG_BADGE : PAGE.NONVEG_BADGE}
                      </span>
                    </div>
                    {dish.description && <p className="dish-description">{dish.description}</p>}
                    <div className="dish-meta">
                      <span className="dish-price">₹{dish.price}</span>
                      {dish.preparationTime && <span className="dish-time">⏱️ {dish.preparationTime}m</span>}
                    </div>
                    {dish.tags && dish.tags.length > 0 && (
                      <div className="dish-tags">
                        {dish.tags.map((tag) => (
                          <span key={tag} className="dish-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="dish-actions">
                    <button
                      className={`btn-avail ${dish.isAvailable ? 'btn-avail--on' : 'btn-avail--off'}`}
                      onClick={() => handleToggleDishAvailability(dish)}
                    >
                      {dish.isAvailable ? PAGE.AVAILABLE : PAGE.UNAVAILABLE}
                    </button>
                    <button className="btn-icon" onClick={() => openDishForm(dish)}>✏️</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteDish(dish._id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCatForm && (
        <div className="modal-overlay" onClick={() => setShowCatForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveCategory}>
            <h2 className="card-title">{editingCat ? MESSAGES.EDIT : MESSAGES.ADD} Category</h2>
            <div className="form-group">
              <label className="form-label">{PAGE.CATEGORY_NAME}</label>
              <input className="form-input" value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.CATEGORY_DESC}</label>
              <textarea className="form-textarea" value={catForm.description} onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="btn-row">
              <button className="btn-primary" disabled={loading}>{loading ? MESSAGES.LOADING : MESSAGES.SAVE}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCatForm(false)}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Preview Modal */}
      {showPreview && restaurant && menu && (
        <MenuPreview
          restaurant={restaurant}
          menu={menu}
          categories={previewCategories}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Dish Modal */}
      {showDishForm && (
        <div className="modal-overlay" onClick={() => setShowDishForm(false)}>
          <form key={dishFormKey} className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveDish}>
            <h2 className="card-title">{editingDish ? MESSAGES.EDIT : MESSAGES.ADD} Dish</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.NAME}</label>
                <input className="form-input" value={dishForm.name} onChange={(e) => setDishForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.PRICE}</label>
                <input type="number" step="0.01" className="form-input" value={dishForm.price} onChange={(e) => setDishForm((p) => ({ ...p, price: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.DISH_FIELDS.DESCRIPTION}</label>
              <textarea className="form-textarea" value={dishForm.description} onChange={(e) => setDishForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.PREP_TIME}</label>
                <input type="number" className="form-input" value={dishForm.preparationTime} onChange={(e) => setDishForm((p) => ({ ...p, preparationTime: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.TAGS}</label>
                <input className="form-input" value={dishForm.tags} onChange={(e) => setDishForm((p) => ({ ...p, tags: e.target.value }))} placeholder="spicy, bestseller" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.DISH_FIELDS.IS_VEG}</label>
              <div className="veg-selector">
                <button
                  type="button"
                  className={`veg-option veg-option--veg ${dishForm.isVeg ? 'veg-option--active' : ''}`}
                  onClick={() => setDishForm((p) => ({ ...p, isVeg: true }))}
                >
                  <span className="veg-icon veg-icon--veg" />
                  Veg
                </button>
                <button
                  type="button"
                  className={`veg-option veg-option--nonveg ${!dishForm.isVeg ? 'veg-option--active' : ''}`}
                  onClick={() => setDishForm((p) => ({ ...p, isVeg: false }))}
                >
                  <span className="veg-icon veg-icon--nonveg" />
                  Non-Veg
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.DISH_FIELDS.IMAGE}</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                disabled={imageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              {imageUploading && <p className="upload-status">Uploading image...</p>}
              {dishForm.imageUrl && !imageUploading && <img src={dishForm.imageUrl} alt="Preview" className="image-preview" />}
            </div>
            <div className="btn-row">
              <button className="btn-primary" disabled={loading || imageUploading}>
                {imageUploading ? 'Uploading image...' : loading ? MESSAGES.LOADING : MESSAGES.SAVE}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowDishForm(false)}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { MenuBuilder };
