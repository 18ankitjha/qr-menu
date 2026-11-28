import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getErrorMessage,
} from '../services/api';
import { MESSAGES } from '../constants';
import type { ICategory, IDish } from '../types';
import { MenuPreview } from '../components/menu-preview/MenuPreview';
import { fetchCategoriesWithDishes, type ICategoryWithDishes } from '../components/menu-preview/preview-data';
import { usePendingUpload } from '../hooks/usePendingUpload';
import { thumbUrl } from '../utils/image';
import { MAX_CATEGORY_DEPTH, flattenCategoryTree, subtreeHeight, subtreeIds } from '../utils/category-tree';
import './MenuBuilder.css';
import './FormPage.css';

// ============================================================
// Menu Builder — Categories + Dishes management
// ============================================================

const PAGE = {
  TITLE: 'Menu Builder',
  SUBTITLE: `Create and manage your menu categories and dishes. Categories can have sub-categories, up to ${MAX_CATEGORY_DEPTH} levels (e.g. Food → Italian → Pastas).`,
  CREATE_MENU: 'Create Your Menu',
  MENU_NAME_LABEL: 'Menu Name',
  MENU_NAME_PLACEHOLDER: 'e.g. Main Menu',
  BTN_CREATE_MENU: 'Create Menu',
  CATEGORY_SECTION: 'Categories',
  ADD_CATEGORY: 'Add Category',
  CATEGORY_NAME: 'Category Name',
  CATEGORY_DESC: 'Description (optional)',
  CATEGORY_IMAGE: 'Category image (optional — shown on the customer menu)',
  PARENT_CATEGORY: 'Move inside',
  PARENT_HINT: 'Moves this category (and everything inside it) under another category, or back to the top level.',
  TOP_LEVEL: '— Top level —',
  ADD_SUB: 'Add sub-category',
  ADD_SUB_TITLE: (parent: string) => `Add sub-category in ${parent}`,
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
    DETAILS: 'Item Details (shown to customers)',
    SPICE_LEVEL: 'Spice Level',
    SERVING_SIZE: 'Serving Size',
    CALORIES: 'Calories (kcal)',
    INGREDIENTS: 'Ingredients',
    ALLERGENS: 'Allergens (comma-separated)',
  },
  SPICE_LEVELS: [
    { value: '', label: 'Not specified' },
    { value: 'NONE', label: 'Not spicy' },
    { value: 'MILD', label: '🌶️ Mild' },
    { value: 'MEDIUM', label: '🌶️🌶️ Medium' },
    { value: 'HOT', label: '🌶️🌶️🌶️ Hot' },
  ],
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
  const { restaurant, menu, setMenu, refreshSetup } = useAuth();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<IDish[]>([]);
  const [menuName, setMenuName] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewCategories, setPreviewCategories] = useState<ICategoryWithDishes[]>([]);
  const catUpload = usePendingUpload();
  const dishUpload = usePendingUpload();

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<ICategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', imageUrl: '', parentId: '' });
  const treeRows = useMemo(() => flattenCategoryTree(categories), [categories]);
  const selectedRow = treeRows.find((r) => r.cat._id === selectedCatId);

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
    spiceLevel: '',
    servingSize: '',
    calories: '',
    ingredients: '',
    allergens: '',
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
      refreshSetup();
      setMessage(PAGE.SUCCESS_MENU);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  // --- Category CRUD ---
  const openCatForm = (cat?: ICategory, parentId = '') => {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ name: cat.name, description: cat.description || '', imageUrl: cat.imageUrl || '', parentId: cat.parentId || '' });
    } else {
      setEditingCat(null);
      setCatForm({ name: '', description: '', imageUrl: '', parentId });
    }
    setShowCatForm(true);
  };

  // Where the category in the form may go: not inside itself, and the tree stays ≤ MAX_CATEGORY_DEPTH levels
  const parentOptions = useMemo(() => {
    if (!showCatForm) return [];
    const blocked = editingCat ? subtreeIds(categories, editingCat._id) : new Set<string>();
    const height = editingCat ? subtreeHeight(treeRows, editingCat._id) : 1;
    return treeRows.filter((r) => !blocked.has(r.cat._id) && r.depth + height <= MAX_CATEGORY_DEPTH);
  }, [showCatForm, editingCat, categories, treeRows]);

  const handleCategoryImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const { data } = await uploadImage(file, 'categories');
      catUpload.track(data.data.url);
      setCatForm((prev) => ({ ...prev, imageUrl: data.data.url }));
    } catch {
      setMessage('Image upload failed. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu) return;
    setLoading(true);
    const payload = { ...catForm, imageUrl: catForm.imageUrl || undefined, parentId: catForm.parentId || null };
    try {
      if (editingCat) {
        await updateCategory(editingCat._id, payload);
      } else {
        await addCategory({ ...payload, menuId: menu._id });
      }
      await fetchCategories();
      catUpload.commit();
      setShowCatForm(false);
      setMessage(PAGE.SUCCESS_CATEGORY);
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setLoading(false);
    }
  };

  const closeCatForm = () => {
    catUpload.discard();
    setShowCatForm(false);
  };

  const handleToggleCatActive = async (cat: ICategory) => {
    await setCategoryActive(cat._id, !cat.isActive);
    await fetchCategories();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    try {
      await deleteCategory(catId);
    } catch (err) {
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
      return;
    }
    if (selectedCatId === catId) {
      setSelectedCatId(null);
      setDishes([]);
    }
    await fetchCategories();
  };

  // --- Dish CRUD ---
  const resetDishForm = () => {
    setDishForm({
      name: '', description: '', price: '', preparationTime: '', tags: '', isVeg: true, imageUrl: '',
      spiceLevel: '', servingSize: '', calories: '', ingredients: '', allergens: '',
    });
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
        spiceLevel: dish.spiceLevel ?? '',
        servingSize: dish.servingSize ?? '',
        calories: dish.calories != null ? String(dish.calories) : '',
        ingredients: dish.ingredients ?? '',
        allergens: Array.isArray(dish.allergens) ? dish.allergens.join(', ') : '',
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
      dishUpload.track(data.data.url);
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
      const parsedAllergens = dishForm.allergens.split(',').map((t) => t.trim()).filter(Boolean);

      const payload = {
        name: dishForm.name,
        description: dishForm.description || undefined,
        price: parseFloat(dishForm.price),
        preparationTime: dishForm.preparationTime ? parseInt(dishForm.preparationTime) : undefined,
        tags: parsedTags && parsedTags.length > 0 ? parsedTags : undefined,
        isVeg: dishForm.isVeg,
        imageUrl: dishForm.imageUrl || undefined,
        spiceLevel: (dishForm.spiceLevel || undefined) as IDish['spiceLevel'],
        servingSize: dishForm.servingSize || undefined,
        calories: dishForm.calories ? parseInt(dishForm.calories) : undefined,
        ingredients: dishForm.ingredients || undefined,
        allergens: parsedAllergens,
        categoryId: selectedCatId,
        menuId: menu._id,
      };

      if (editingDish) {
        await updateDish(editingDish._id, payload);
      } else {
        await addDish(payload);
        refreshSetup();
      }
      await fetchDishes(selectedCatId);
      dishUpload.commit();
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

  const closeDishForm = () => {
    dishUpload.discard();
    setShowDishForm(false);
  };

  const openPreview = async () => {
    try {
      if (!menu) return;
      setPreviewCategories(await fetchCategoriesWithDishes(menu._id));
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
    refreshSetup();
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
              {treeRows.map(({ cat, depth }) => (
                <div
                  key={cat._id}
                  className={`category-item ${depth > 1 ? 'category-item--sub' : ''} ${selectedCatId === cat._id ? 'category-item--selected' : ''} ${!cat.isActive ? 'category-item--inactive' : ''}`}
                  style={{ paddingLeft: 24 + (depth - 1) * 22 }}
                  onClick={() => setSelectedCatId(cat._id)}
                >
                  <div className="category-info">
                    <span className="category-name">{depth > 1 && <span className="category-branch">↳</span>}{cat.name}</span>
                    {cat.description && <span className="category-desc">{cat.description}</span>}
                  </div>
                  <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => handleToggleCatActive(cat)} title={cat.isActive ? 'Deactivate' : 'Activate'}>
                      {cat.isActive ? '👁️' : '🚫'}
                    </button>
                    {depth < MAX_CATEGORY_DEPTH && (
                      <button className="btn-icon" onClick={() => openCatForm(undefined, cat._id)} title={PAGE.ADD_SUB} aria-label={PAGE.ADD_SUB}>➕</button>
                    )}
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
            <h2 className="panel-title">
              {PAGE.DISH_SECTION}
              {selectedRow && <span className="panel-breadcrumb"> · {selectedRow.path.join(' › ')}</span>}
            </h2>
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
                    <img src={thumbUrl(dish.imageUrl)} alt={dish.name} className="dish-image" loading="lazy" />
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
                      {dish.spiceLevel && dish.spiceLevel !== 'NONE' && <span className="dish-time">🌶️ {dish.spiceLevel.toLowerCase()}</span>}
                      {dish.servingSize && <span className="dish-time">🍽️ {dish.servingSize}</span>}
                      {dish.calories != null && <span className="dish-time">🔥 {dish.calories} kcal</span>}
                    </div>
                    {dish.allergens && dish.allergens.length > 0 && (
                      <div className="dish-description">⚠️ Contains: {dish.allergens.join(', ')}</div>
                    )}
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
        <div className="modal-overlay" onClick={closeCatForm}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveCategory}>
            <h2 className="card-title">
              {!editingCat && catForm.parentId
                ? PAGE.ADD_SUB_TITLE(treeRows.find((r) => r.cat._id === catForm.parentId)?.path.join(' › ') ?? '')
                : `${editingCat ? MESSAGES.EDIT : MESSAGES.ADD} Category`}
            </h2>
            <div className="form-group">
              <label className="form-label">{PAGE.CATEGORY_NAME}</label>
              <input className="form-input" value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.CATEGORY_DESC}</label>
              <textarea className="form-textarea" value={catForm.description} onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            {/* Add Category = top level, ➕ on a row = inside that row; only editing can move a category */}
            {editingCat && (
              <div className="form-group">
                <label className="form-label">{PAGE.PARENT_CATEGORY}</label>
                <select className="form-input" value={catForm.parentId} onChange={(e) => setCatForm((p) => ({ ...p, parentId: e.target.value }))}>
                  <option value="">{PAGE.TOP_LEVEL}</option>
                  {parentOptions.map((r) => (
                    <option key={r.cat._id} value={r.cat._id}>{r.path.join(' › ')}</option>
                  ))}
                </select>
                <p className="form-hint">{PAGE.PARENT_HINT}</p>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{PAGE.CATEGORY_IMAGE}</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                disabled={imageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCategoryImageUpload(file);
                }}
              />
              {imageUploading && <p className="upload-status">Uploading image...</p>}
              {catForm.imageUrl && !imageUploading && <img src={catForm.imageUrl} alt="Preview" className="image-preview" />}
            </div>
            <div className="btn-row">
              <button className="btn-primary" disabled={loading || imageUploading}>{loading ? MESSAGES.LOADING : MESSAGES.SAVE}</button>
              <button type="button" className="btn-secondary" onClick={closeCatForm}>{MESSAGES.CANCEL}</button>
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
        <div className="modal-overlay" onClick={closeDishForm}>
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
            <h3 className="form-label" style={{ marginTop: 8 }}>{PAGE.DISH_FIELDS.DETAILS}</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.SPICE_LEVEL}</label>
                <select className="form-input" value={dishForm.spiceLevel} onChange={(e) => setDishForm((p) => ({ ...p, spiceLevel: e.target.value }))}>
                  {PAGE.SPICE_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.SERVING_SIZE}</label>
                <input className="form-input" maxLength={50} value={dishForm.servingSize} onChange={(e) => setDishForm((p) => ({ ...p, servingSize: e.target.value }))} placeholder="e.g. 6 pcs, 250 g, serves 2" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.CALORIES}</label>
                <input type="number" min="0" max="5000" className="form-input" value={dishForm.calories} onChange={(e) => setDishForm((p) => ({ ...p, calories: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{PAGE.DISH_FIELDS.ALLERGENS}</label>
                <input className="form-input" value={dishForm.allergens} onChange={(e) => setDishForm((p) => ({ ...p, allergens: e.target.value }))} placeholder="dairy, nuts, gluten" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.DISH_FIELDS.INGREDIENTS}</label>
              <textarea className="form-textarea" maxLength={500} value={dishForm.ingredients} onChange={(e) => setDishForm((p) => ({ ...p, ingredients: e.target.value }))} placeholder="Paneer, yogurt, ginger, garlic, spices" />
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
              <button type="button" className="btn-secondary" onClick={closeDishForm}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { MenuBuilder };
