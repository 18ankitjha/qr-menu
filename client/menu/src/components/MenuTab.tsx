import { useEffect, useMemo, useRef, useState } from 'react';
import { MESSAGES } from '../constants';
import type { ICartLine, IDish, ITableMenu } from '../types';
import DishCard from './DishCard';

interface Props {
  menu: ITableMenu;
  /** The live table cart (everyone's picks, with this phone's taps on top). */
  lines: ICartLine[];
  /** This diner's member key — their lines are `<me>.<dishId>`. */
  me?: string;
  canAdd: boolean;
  onSetMine: (dishId: string, quantity: number) => void;
}

type DietFilter = 'all' | 'veg' | 'nonveg';

const sectionId = (categoryId: string) => `cat-${categoryId}`;

const matches = (dish: IDish, diet: DietFilter, query: string) => {
  if (diet === 'veg' && !dish.isVeg) return false;
  if (diet === 'nonveg' && dish.isVeg) return false;
  if (!query) return true;
  return [dish.name, dish.description ?? '', ...(dish.tags ?? [])].some((text) => text.toLowerCase().includes(query));
};

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * The menu: a sticky bar (search, Veg / Non-veg, category tabs that follow the scroll) over plain category sections.
 * −/+ edit this diner's line in the live table cart: instant here, on everyone's phone a moment later.
 */
const MenuTab = ({ menu, lines, me, canAdd, onSetMine }: Props) => {
  const categories = useMemo(
    () =>
      menu.categories
        .filter((c) => c.isActive)
        .map((c) => ({ ...c, dishes: c.dishes.filter((d) => d.isAvailable) }))
        .filter((c) => c.dishes.length > 0),
    [menu]
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [diet, setDiet] = useState<DietFilter>('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const query = search.trim().toLowerCase();

  // dishId → { mine, others, who } from the live cart
  const quantities = useMemo(() => {
    const byDish = new Map<string, { mine: number; others: number; names: string[] }>();
    for (const line of lines) {
      const entry = byDish.get(line.dishId) ?? { mine: 0, others: 0, names: [] };
      if (me && line.key === `${me}.${line.dishId}`) {
        entry.mine += line.quantity;
      } else {
        entry.others += line.quantity;
        if (!entry.names.includes(line.by)) entry.names.push(line.by);
      }
      byDish.set(line.dishId, entry);
    }
    return byDish;
  }, [lines, me]);

  const visible = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, dishes: c.dishes.filter((d) => matches(d, diet, query)) }))
        .filter((c) => c.dishes.length > 0),
    [categories, diet, query]
  );

  // Highlight the category being read: the last section whose top has passed under the sticky bar
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = visible[0]?._id ?? '';
      for (const cat of visible) {
        const top = document.getElementById(sectionId(cat._id))?.getBoundingClientRect().top;
        if (top !== undefined && (top <= line || atBottom)) current = cat._id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [visible]);

  // Keep the highlighted tab in view
  useEffect(() => {
    const tabs = tabsRef.current;
    const tab = tabs?.querySelector<HTMLElement>(`[data-category="${active}"]`);
    if (!tabs || !tab) return;
    tabs.scrollTo({ left: tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  if (categories.length === 0) return <p className="empty-note">{MESSAGES.MENU_EMPTY}</p>;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const jumpTo = (id: string) => {
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // After the section opens: scroll so its heading sits just under the sticky bar
    requestAnimationFrame(() => {
      const section = document.getElementById(sectionId(id));
      if (!section) return;
      const barHeight = toolbarRef.current?.offsetHeight ?? 0;
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - barHeight + 1, behavior: 'smooth' });
    });
  };

  const toggleDiet = (value: DietFilter) => setDiet((d) => (d === value ? 'all' : value));

  return (
    <>
      <div className="menu-toolbar" ref={toolbarRef}>
        <div className="filter-row">
          <label className="search-box">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder={MESSAGES.SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label={MESSAGES.CLOSE_SEARCH}>
                ✕
              </button>
            )}
          </label>
          <button
            className={`filter-chip ${diet === 'veg' ? 'filter-chip--active-veg' : ''}`}
            onClick={() => toggleDiet('veg')}
            aria-pressed={diet === 'veg'}
          >
            <span className="veg-dot veg-dot--veg" /> {MESSAGES.VEG}
          </button>
          <button
            className={`filter-chip ${diet === 'nonveg' ? 'filter-chip--active-nonveg' : ''}`}
            onClick={() => toggleDiet('nonveg')}
            aria-pressed={diet === 'nonveg'}
          >
            <span className="veg-dot veg-dot--nonveg" /> {MESSAGES.NON_VEG}
          </button>
        </div>

        {visible.length > 1 && (
          <nav className="cat-tabs" ref={tabsRef} aria-label={MESSAGES.CATEGORIES}>
            {visible.map((cat) => (
              <button
                key={cat._id}
                data-category={cat._id}
                className={`cat-tab ${active === cat._id ? 'cat-tab--active' : ''}`}
                onClick={() => jumpTo(cat._id)}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        )}
      </div>

      <main className="menu-sections">
        {visible.length === 0 && <p className="empty-note">{MESSAGES.NO_MATCH}</p>}
        {visible.map((cat) => {
          // While searching, every match shows even in a closed section
          const expanded = !!query || !collapsed.has(cat._id);
          return (
            <section key={cat._id} id={sectionId(cat._id)} className={`menu-section ${expanded ? 'menu-section--open' : ''}`}>
              <button className="menu-section-head" onClick={() => toggle(cat._id)} aria-expanded={expanded}>
                <span className="menu-section-title">{cat.name}</span>
                <span className="menu-section-count">{cat.dishes.length}</span>
                <span className="menu-section-chevron">
                  <Chevron />
                </span>
              </button>
              {expanded && (
                <div className="dish-list">
                  {cat.description && <p className="menu-section-desc">{cat.description}</p>}
                  {cat.dishes.map((dish) => {
                    const { mine = 0, others = 0, names = [] } = quantities.get(dish._id) ?? {};
                    return (
                      <DishCard
                        key={dish._id}
                        dish={dish}
                        othersQuantity={others}
                        othersNames={names}
                        myQuantity={mine}
                        canAdd={canAdd}
                        onAdd={() => onSetMine(dish._id, mine + 1)}
                        onRemoveOne={() => onSetMine(dish._id, mine - 1)}
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
