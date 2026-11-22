import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, MESSAGES } from './constants';
import type {
  IPublicMenuData,
  ICartItem,
  IDish,
  ICategoryWithDishes,
  IPlaceOrderPayload,
  IApiResponse,
} from './types';
import './index.css';

// ============================================================
// Customer Menu SPA — QR scanned entry point
// ============================================================

const App = () => {
  const [menuData, setMenuData] = useState<IPublicMenuData | null>(null);
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [showCart, setShowCart] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  // Extract restaurantId and tableId from URL path: /menu/:restaurantId/:tableId
  const { restaurantId, tableId } = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // parts = ['menu', '<restaurantId>', '<tableId>']
    return {
      restaurantId: parts[1] || '',
      tableId: parts[2] || '',
    };
  }, []);

  // Fetch menu data
  useEffect(() => {
    if (!restaurantId || !tableId) {
      setError(MESSAGES.ERROR_LOAD);
      setLoading(false);
      return;
    }

    const fetchMenu = async () => {
      try {
        const { data } = await axios.get<IApiResponse<IPublicMenuData>>(
          API_ENDPOINTS.PUBLIC_MENU(restaurantId, tableId)
        );
        setMenuData(data.data);
        const activeCategories = data.data.categories.filter((c: ICategoryWithDishes) => c.isActive);
        if (activeCategories.length > 0) {
          setSelectedCatId(activeCategories[0]._id);
        }
      } catch {
        setError(MESSAGES.ERROR_LOAD);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId, tableId]);

  // Poll order status
  useEffect(() => {
    if (!orderId) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await axios.get(API_ENDPOINTS.ORDER_STATUS(orderId));
        setOrderStatus(data.data.status);
      } catch { /* empty */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [orderId]);

  // Cart operations
  const addToCart = useCallback((dish: IDish) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.dish._id === dish._id);
      if (existing) {
        return prev.map((item) =>
          item.dish._id === dish._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { dish, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((dishId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.dish._id === dishId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.dish._id === dishId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.dish._id !== dishId);
    });
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Attempt to get GPS coordinates — returns null if unavailable (e.g. HTTP on mobile)
  const getCoords = (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setOrderLoading(true);

    try {
      const coords = await getCoords();

      const payload: IPlaceOrderPayload = {
        restaurantId,
        tableId,
        items: cart.map((item) => ({
          dishId: item.dish._id,
          dishName: item.dish.name,
          quantity: item.quantity,
          price: item.dish.price,
          notes: item.notes,
        })),
        specialInstructions: instructions || undefined,
        customerName: customerName || undefined,
        gpsCoordinates: coords ?? undefined,
      };

      const { data } = await axios.post<IApiResponse<{ _id: string; status: string }>>(
        API_ENDPOINTS.PLACE_ORDER,
        payload
      );
      setOrderId(data.data._id);
      setOrderStatus(data.data.status);
      setCart([]);
      setShowCart(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError(MESSAGES.ERROR_TOO_FAR);
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError(MESSAGES.ERROR_GPS);
      } else {
        setError(MESSAGES.ERROR_GENERIC);
      }
    } finally {
      setOrderLoading(false);
    }
  };

  // Filter dishes by selected category
  const filteredDishes = useMemo(() => {
    if (!menuData) return [];
    const selectedCat = menuData.categories.find((c) => c._id === selectedCatId);
    if (!selectedCat) return [];
    return selectedCat.dishes.filter((d) => d.isAvailable);
  }, [menuData, selectedCatId]);

  const activeCategories = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories.filter((c) => c.isActive);
  }, [menuData]);

  // --- Render ---

  if (loading) {
    return <div className="loading-screen">{MESSAGES.LOADING}</div>;
  }

  if (error && !menuData) {
    return <div className="error-screen">{error}</div>;
  }

  if (!menuData) return null;

  const { theme } = menuData.menu;

  // Order confirmation view
  if (orderId) {
    return (
      <div className="menu-app" style={{ '--primary': theme.primaryColor, '--secondary': theme.secondaryColor, '--bg': theme.backgroundColor, '--bg-image': theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none', fontFamily: theme.fontFamily } as React.CSSProperties}>
        <div className="order-success">
          <h1 className="success-title">{MESSAGES.ORDER_PLACED_TITLE}</h1>
          <p className="success-desc">{MESSAGES.ORDER_PLACED_DESC}</p>
          <div className="status-tracker">
            <h2 className="status-label">{MESSAGES.ORDER_TRACKING}</h2>
            <div className="status-value">{orderStatus}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-app" style={{ '--primary': theme.primaryColor, '--secondary': theme.secondaryColor, '--bg': theme.backgroundColor, '--bg-image': theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none', fontFamily: theme.fontFamily } as React.CSSProperties}>
      {/* Header */}
      <header className="menu-header">
        {menuData.restaurant.logoUrl && (
          <img src={menuData.restaurant.logoUrl} alt={menuData.restaurant.name} className="restaurant-logo" />
        )}
        <h1 className="restaurant-name">{menuData.restaurant.name}</h1>
      </header>

      {error && <div className="menu-error">{error}</div>}

      {/* Category Navigation */}
      <nav className="category-nav">
        {activeCategories.map((cat) => (
          <button
            key={cat._id}
            className={`cat-tab ${selectedCatId === cat._id ? 'cat-tab--active' : ''}`}
            onClick={() => setSelectedCatId(cat._id)}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Dish Grid/List */}
      <main className={`dish-container ${theme.layout === 'list' ? 'dish-container--list' : 'dish-container--grid'}`}>
        {filteredDishes.map((dish) => {
          const inCart = cart.find((i) => i.dish._id === dish._id);
          return (
            <article key={dish._id} className="dish-card">
              {dish.imageUrl && (
                <img src={dish.imageUrl} alt={dish.name} className="dish-img" />
              )}
              <div className="dish-body">
                <div className="dish-title-row">
                  <h3 className="dish-name">{dish.name}</h3>
                  <span className={`veg-dot ${dish.isVeg ? 'veg-dot--veg' : 'veg-dot--nonveg'}`} />
                </div>
                {dish.description && <p className="dish-desc">{dish.description}</p>}
                <div className="dish-bottom">
                  <span className="dish-price">{MESSAGES.CURRENCY}{dish.price}</span>
                  {dish.tags && dish.tags.length > 0 && (
                    <div className="dish-tags">
                      {dish.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="dish-cart-action">
                {inCart ? (
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => removeFromCart(dish._id)}>−</button>
                    <span className="qty-value">{inCart.quantity}</span>
                    <button className="qty-btn" onClick={() => addToCart(dish)}>+</button>
                  </div>
                ) : (
                  <button className="btn-add" onClick={() => addToCart(dish)}>
                    {MESSAGES.BTN_ADD}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <button className="fab-cart" onClick={() => setShowCart(true)}>
          🛒 {cartCount} · {MESSAGES.CURRENCY}{cartTotal}
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2>{MESSAGES.CART_TITLE}</h2>
              <button className="cart-close" onClick={() => setShowCart(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <p className="cart-empty">{MESSAGES.CART_EMPTY}</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.dish._id} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.dish.name}</span>
                        <span className="cart-item-price">{MESSAGES.CURRENCY}{item.dish.price * item.quantity}</span>
                      </div>
                      <div className="qty-control qty-control--sm">
                        <button className="qty-btn" onClick={() => removeFromCart(item.dish._id)}>−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => addToCart(item.dish)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-extras">
                  <input
                    className="cart-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={MESSAGES.CART_NAME}
                  />
                  <textarea
                    className="cart-input cart-textarea"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={MESSAGES.CART_INSTRUCTIONS}
                  />
                </div>

                <div className="cart-footer">
                  <div className="cart-total">
                    <span>{MESSAGES.CART_TOTAL}</span>
                    <span className="cart-total-amount">{MESSAGES.CURRENCY}{cartTotal}</span>
                  </div>
                  <button className="btn-place-order" onClick={placeOrder} disabled={orderLoading}>
                    {orderLoading ? MESSAGES.LOADING : MESSAGES.BTN_PLACE_ORDER}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
