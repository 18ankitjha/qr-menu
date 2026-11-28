import type { ICategoryWithDishes, IDish } from '../types';

// ============================================================
// Menu tree — categories arrive as a flat list with `parentId` (null = top level, max 3 levels).
// The menu adapts to how deep the restaurant's tree is:
//   1 level  → tabs = categories, each a section of dishes (classic menu)
//   2 levels → tabs = top level, sections = the level below
//   3 levels → a top switch (Food | Drinks), tabs = 2nd level, sections = 3rd level
// A category with dishes of its own shows them in a section under its own name.
// ============================================================

/** Server rule (MAX_CATEGORY_DEPTH); also a guard against bad data loops. */
const MAX_DEPTH = 3;

export interface IMenuNode {
  cat: ICategoryWithDishes;
  /** This category's own dishes (after filters) */
  dishes: IDish[];
  children: IMenuNode[];
}

export interface IMenuSection {
  id: string;
  name: string;
  description?: string;
  dishes: IDish[];
  tabId: string;
}

export interface IMenuTab {
  id: string;
  name: string;
  sections: IMenuSection[];
}

/** Active categories as a tree (a hidden category hides its branch). Branches with no matching dishes are dropped. */
export const buildMenuTree = (cats: ICategoryWithDishes[], keepDish: (dish: IDish) => boolean): IMenuNode[] => {
  const ids = new Set(cats.map((c) => c._id));
  const childrenOf = new Map<string, ICategoryWithDishes[]>();
  for (const cat of cats) {
    // A category whose parent isn't in the list counts as top level
    const key = cat.parentId && ids.has(cat.parentId) ? cat.parentId : '';
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), cat]);
  }

  const build = (parentId: string, depth: number): IMenuNode[] =>
    (childrenOf.get(parentId) ?? [])
      .filter((cat) => cat.isActive)
      .map((cat) => ({
        cat,
        dishes: cat.dishes.filter(keepDish),
        children: depth < MAX_DEPTH ? build(cat._id, depth + 1) : [],
      }))
      .filter((node) => node.dishes.length > 0 || node.children.length > 0);

  return build('', 1);
};

export const treeDepth = (nodes: IMenuNode[]): number =>
  nodes.length === 0 ? 0 : 1 + Math.max(...nodes.map((n) => treeDepth(n.children)));

/** Every dish-holding category in a branch, in menu order. Sub-categories carry their parent's name ("Pizza · Italian") so it's clear where they belong. */
const sectionsOf = (node: IMenuNode, tabId: string, prefix = ''): IMenuSection[] => {
  const name = prefix ? `${prefix} · ${node.cat.name}` : node.cat.name;
  const own: IMenuSection[] = node.dishes.length
    ? [{ id: node.cat._id, name, description: node.cat.description, dishes: node.dishes, tabId }]
    : [];
  return [...own, ...node.children.flatMap((child) => sectionsOf(child, tabId, node.cat.name))];
};

/** Tabs for the categories under `parent` (or the top level). The parent's own dishes get the first tab. */
export const tabsUnder = (parent: IMenuNode | null, roots: IMenuNode[]): IMenuTab[] => {
  const items = parent
    ? [...(parent.dishes.length ? [{ ...parent, children: [] }] : []), ...parent.children]
    : roots;
  return items.map((node) => ({ id: node.cat._id, name: node.cat.name, sections: sectionsOf(node, node.cat._id) }));
};
