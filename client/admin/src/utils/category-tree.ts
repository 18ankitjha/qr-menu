// ============================================================
// Category tree helpers — categories come as a flat list with `parentId` (null = top level).
// Mirrors the server rule: at most MAX_CATEGORY_DEPTH levels (e.g. Food → Italian → Pastas).
// ============================================================

export const MAX_CATEGORY_DEPTH = 3;

interface ITreeCategory {
  _id: string;
  name: string;
  parentId?: string | null;
}

export interface ICategoryTreeRow<T> {
  cat: T;
  /** 1 = top level */
  depth: number;
  /** Names from the top level down to this category */
  path: string[];
  hasChildren: boolean;
}

/** A category whose parent is missing from the list is treated as top level. */
const parentKey = (cat: ITreeCategory, ids: Set<string>) =>
  cat.parentId && ids.has(cat.parentId) ? cat.parentId : '';

/** Depth-first rows (parent, then its children), keeping the list order among siblings. */
export const flattenCategoryTree = <T extends ITreeCategory>(cats: T[]): ICategoryTreeRow<T>[] => {
  const ids = new Set(cats.map((c) => c._id));
  const childrenOf = new Map<string, T[]>();
  for (const cat of cats) {
    const key = parentKey(cat, ids);
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), cat]);
  }

  const rows: ICategoryTreeRow<T>[] = [];
  const walk = (parentId: string, depth: number, path: string[]) => {
    for (const cat of childrenOf.get(parentId) ?? []) {
      const children = childrenOf.get(cat._id) ?? [];
      rows.push({ cat, depth, path: [...path, cat.name], hasChildren: children.length > 0 });
      if (depth < MAX_CATEGORY_DEPTH + 1) walk(cat._id, depth + 1, [...path, cat.name]);
    }
  };
  walk('', 1, []);
  return rows;
};

/** The category and every category under it. */
export const subtreeIds = <T extends ITreeCategory>(cats: T[], rootId: string): Set<string> => {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of cats) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c._id)) {
        ids.add(c._id);
        grew = true;
      }
    }
  }
  return ids;
};

/** Levels a category brings when moved: itself (1) + its deepest sub-category. */
export const subtreeHeight = <T extends ITreeCategory>(rows: ICategoryTreeRow<T>[], rootId: string): number => {
  const start = rows.findIndex((r) => r.cat._id === rootId);
  if (start < 0) return 1;
  const base = rows[start].depth;
  let height = 1;
  for (let i = start + 1; i < rows.length && rows[i].depth > base; i++) {
    height = Math.max(height, rows[i].depth - base + 1);
  }
  return height;
};
