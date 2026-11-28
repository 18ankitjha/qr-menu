import { useEffect, useMemo, useRef, useState } from 'react';
import { MESSAGES } from '../constants';
import type { ICartLine, IDish, ITableMenu } from '../types';
import DishCard from './DishCard';
import { buildMenuTree, tabsUnder, treeDepth } from '../utils/menu-tree.util';

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
 * Nested categories (up to 3 levels) adapt the layout — see utils/menu-tree.util.ts.
 * −/+ edit this diner's line in the live table cart: instant here, on everyone's phone a moment later.
 */
const MenuTab = ({ menu, lines, me, canAdd, onSetMine }: Props) => {
  // The full tree decides the layout, so filtering never makes the page jump between layouts
  const fullTree = useMemo(() => buildMenuTree(menu.categories, (d) => d.isAvailable), [menu]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [diet, setDiet] = useState<DietFilter>('all');
  const [search, setSearch] = useState('');
  /** Tab being read (a category id) */
  const [active, setActive] = useState('');
  /** Top switch pick when the menu has 3 levels (e.g. Food | Drinks) */
  const [rootId, setRootId] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  /** A tapped tab stays highlighted until the diner scrolls themselves (the page may not reach that section). */
  const pinnedRef = useRef(false);
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

  const roots = useMemo(
    () => buildMenuTree(menu.categories, (d) => d.isAvailable && matches(d, diet, query)),
    [menu, diet, query]
  );
  // A switch only for 3-level menus with several top categories; searching looks through everything
  const useSwitch = !query && treeDepth(fullTree) >= 3 && fullTree.length > 1;
  const root = useSwitch ? roots.find((r) => r.cat._id === rootId) ?? roots[0] : undefined;
  const tabs = useMemo(() => {
    // One top category with sub-categories (e.g. only "Food"): skip it and start one level down
    const parent = root ?? (!query && roots.length === 1 && roots[0].children.length > 0 ? roots[0] : null);
    return tabsUnder(parent, roots);
  }, [root, roots, query]);
  const visible = useMemo(() => tabs.flatMap((t) => t.sections), [tabs]);

  // Highlight the category being read: the last section whose top has passed under the sticky bar
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (pinnedRef.current) return;
      const line = (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
      // Scrolled to the very end: the last sections can't reach the top, so the last one counts as read
      const atBottom =
        window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = visible[0]?.tabId ?? '';
      for (const section of visible) {
        const top = document.getElementById(sectionId(section.id))?.getBoundingClientRect().top;
        if (top !== undefined && (top <= line || atBottom)) current = section.tabId;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onUserScroll = () => {
      pinnedRef.current = false;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onUserScroll, { passive: true });
    window.addEventListener('touchmove', onUserScroll, { passive: true });
    window.addEventListener('keydown', onUserScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchmove', onUserScroll);
      window.removeEventListener('keydown', onUserScroll);
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

  if (fullTree.length === 0) return <p className="empty-note">{MESSAGES.MENU_EMPTY}</p>;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const jumpTo = (tabId: string) => {
    const id = tabs.find((t) => t.id === tabId)?.sections[0]?.id;
    if (!id) return;
    pinnedRef.current = true;
    setActive(tabId);
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

  const switchRoot = (id: string) => {
    setRootId(id);
    pinnedRef.current = false;
    // Start the new part of the menu from its top
    const menuTop = (mainRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - (toolbarRef.current?.offsetHeight ?? 0);
    if (window.scrollY > menuTop) window.scrollTo({ top: menuTop });
  };

  return (
    <>
      <div className="menu-toolbar" ref={toolbarRef}>
        {useSwitch && roots.length > 0 && (
          <div className="cat-switch" role="tablist" aria-label={MESSAGES.MENU_PARTS}>
            {roots.map((r) => (
              <button
                key={r.cat._id}
                role="tab"
                aria-selected={root?.cat._id === r.cat._id}
                className={`cat-switch-btn ${root?.cat._id === r.cat._id ? 'cat-switch-btn--active' : ''}`}
                onClick={() => switchRoot(r.cat._id)}
              >
                {r.cat.name}
              </button>
            ))}
          </div>
        )}
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

        {tabs.length > 1 && (
          <nav className="cat-tabs" ref={tabsRef} aria-label={MESSAGES.CATEGORIES}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                data-category={tab.id}
                className={`cat-tab ${active === tab.id ? 'cat-tab--active' : ''}`}
                onClick={() => jumpTo(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        )}
      </div>

      <main className="menu-sections" ref={mainRef}>
        {visible.length === 0 && <p className="empty-note">{MESSAGES.NO_MATCH}</p>}
        {visible.map((cat) => {
          // While searching, every match shows even in a closed section
          const expanded = !!query || !collapsed.has(cat.id);
          return (
            <section key={cat.id} id={sectionId(cat.id)} className={`menu-section ${expanded ? 'menu-section--open' : ''}`}>
              <button className="menu-section-head" onClick={() => toggle(cat.id)} aria-expanded={expanded}>
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
