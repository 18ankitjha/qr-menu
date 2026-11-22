import { useMemo, useState } from 'react';
import { MESSAGES } from '../constants';
import type { ICartLine, ICategoryWithDishes, IDish, ITableMenu } from '../types';
import DishCard from './DishCard';
import { thumbUrl } from '../utils/image.util';

interface Props {
  menu: ITableMenu;
  cart: ICartLine[];
  busy: boolean;
  onAdd: (dishId: string) => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
}

type DietFilter = 'all' | 'veg' | 'nonveg';

/** Category picture: its own image, else the first dish photo, else its first letter. */
const CategoryThumb = ({ category, className }: { category: ICategoryWithDishes; className: string }) => {
  const src = category.imageUrl || category.dishes.find((d) => d.imageUrl)?.imageUrl;
  return src ? (
    <img src={thumbUrl(src)} alt="" className={className} loading="lazy" />
  ) : (
    <span className={`${className} ${className}--initial`}>{category.name.charAt(0).toUpperCase()}</span>
  );
};

const matches = (dish: IDish, diet: DietFilter, query: string) => {
  if (diet === 'veg' && !dish.isVeg) return false;
  if (diet === 'nonveg' && dish.isVeg) return false;
  if (!query) return true;
  return [dish.name, dish.description ?? '', ...(dish.tags ?? [])].some((text) => text.toLowerCase().includes(query));
};

/**
 * The menu as collapsible category cards, with a category icon strip and Search / Veg / Non-veg filters.
 * Quantities come from the live table cart.
 */
const MenuTab = ({ menu, cart, busy, onAdd, onSetQuantity }: Props) => {
  const categories = useMemo(
    () =>
      menu.categories
        .filter((c) => c.isActive)
        .map((c) => ({ ...c, dishes: c.dishes.filter((d) => d.isAvailable) }))
        .filter((c) => c.dishes.length > 0),
    [menu]
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set(categories[0] ? [categories[0]._id] : []));
  const [diet, setDiet] = useState<DietFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const visible = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, dishes: c.dishes.filter((d) => matches(d, diet, query)) }))
        .filter((c) => c.dishes.length > 0),
    [categories, diet, query]
  );

  if (categories.length === 0) return <p className="empty-note">{MESSAGES.MENU_EMPTY}</p>;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const jumpTo = (id: string) => {
    setOpen((prev) => new Set(prev).add(id));
    // Wait for the card to expand before scrolling to it
    requestAnimationFrame(() =>
      document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const toggleDiet = (value: DietFilter) => setDiet((d) => (d === value ? 'all' : value));

  const closeSearch = () => {
    setSearch('');
    setSearchOpen(false);
  };

  return (
    <>
      <div className="menu-toolbar">
        <nav className="cat-strip" aria-label={MESSAGES.CATEGORIES}>
          {categories.map((cat) => (
            <button key={cat._id} className="cat-strip-item" onClick={() => jumpTo(cat._id)}>
              <CategoryThumb category={cat} className="cat-strip-img" />
              <span className="cat-strip-name">{cat.name}</span>
            </button>
          ))}
        </nav>

        <div className="filter-chips">
          {searchOpen ? (
            <div className="search-box">
              <span aria-hidden>🔍</span>
              <input
                autoFocus
                className="search-input"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                placeholder={MESSAGES.SEARCH_PLACEHOLDER}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-clear" onClick={closeSearch} aria-label={MESSAGES.CLOSE_SEARCH}>
                ✕
              </button>
            </div>
          ) : (
            <button className="filter-chip" onClick={() => setSearchOpen(true)}>
              🔍 {MESSAGES.SEARCH}
            </button>
          )}
          <button
            className={`filter-chip ${diet === 'nonveg' ? 'filter-chip--active-nonveg' : ''}`}
            onClick={() => toggleDiet('nonveg')}
            aria-pressed={diet === 'nonveg'}
          >
            <span className="veg-dot veg-dot--nonveg" /> {MESSAGES.NON_VEG}
          </button>
          <button
            className={`filter-chip ${diet === 'veg' ? 'filter-chip--active-veg' : ''}`}
            onClick={() => toggleDiet('veg')}
            aria-pressed={diet === 'veg'}
          >
            <span className="veg-dot veg-dot--veg" /> {MESSAGES.VEG}
          </button>
        </div>
      </div>

      <main className="cat-accordion">
        {visible.length === 0 && <p className="empty-note">{MESSAGES.NO_MATCH}</p>}
        {visible.map((cat) => {
          // While searching, show every match without needing to open each card
          const expanded = !!query || open.has(cat._id);
          return (
            <section key={cat._id} id={`cat-${cat._id}`} className={`cat-card ${expanded ? 'cat-card--open' : ''}`}>
              <button className="cat-card-head" onClick={() => toggle(cat._id)} aria-expanded={expanded}>
                <CategoryThumb category={cat} className="cat-card-img" />
                <span className="cat-card-title">
                  <span className="cat-card-name">{cat.name}</span>
                  <span className="cat-card-count">{MESSAGES.ITEM_COUNT(cat.dishes.length)}</span>
                </span>
                <span className="cat-card-chevron" aria-hidden>
                  ⌄
                </span>
              </button>
              {expanded && (
                <div className="cat-card-body dish-container dish-container--list">
                  {cat.description && <p className="cat-card-desc">{cat.description}</p>}
                  {cat.dishes.map((dish) => {
                    const lines = cart.filter((l) => l.dishId === dish._id);
                    const mine = lines.find((l) => l.addedBy.isMe && !l.notes);
                    return (
                      <DishCard
                        key={dish._id}
                        dish={dish}
                        tableQuantity={lines.reduce((sum, l) => sum + l.quantity, 0)}
                        myQuantity={mine?.quantity ?? 0}
                        busy={busy}
                        onAdd={() => onAdd(dish._id)}
                        onRemoveOne={() => mine && onSetQuantity(mine._id, mine.quantity - 1)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
};

export default MenuTab;
