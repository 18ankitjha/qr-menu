import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_DISH_QUANTITY, STORAGE_KEYS } from '../constants';
import type { ICartLine, IMyCartItem, ITableSession } from '../types';

// ============================================================
// useCartDraft — the diner's picks on the Menu tab, kept on the phone (instant +/−, no API calls).
// They are sent to the shared table cart in ONE call when the diner opens the Cart tab (see App).
// Saved in localStorage per session, so a reload doesn't lose them.
// Draft = dish → quantity wanted on the diner's own plain (no notes) line.
// ============================================================

type Draft = Record<string, number>;

const read = (sessionId: string): Draft => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFT(sessionId)) ?? '{}') as Draft;
  } catch {
    return {};
  }
};

const write = (sessionId: string, draft: Draft): void => {
  try {
    if (Object.keys(draft).length === 0) localStorage.removeItem(STORAGE_KEYS.DRAFT(sessionId));
    else localStorage.setItem(STORAGE_KEYS.DRAFT(sessionId), JSON.stringify(draft));
  } catch {
    /* private mode — the draft just lives in memory */
  }
};

/** The diner's own plain line for a dish — what the menu's −/+ edits. */
export const myPlainLine = (cart: ICartLine[], dishId: string): ICartLine | undefined =>
  cart.find((l) => l.dishId === dishId && l.addedBy.isMe && !l.notes);

export const useCartDraft = (session: ITableSession | null) => {
  const sessionId = session?.status === 'OPEN' ? session._id : undefined;
  const [state, setState] = useState<{ sessionId?: string; draft: Draft }>(() => ({
    sessionId,
    draft: sessionId ? read(sessionId) : {},
  }));
  // Different table session → load that session's saved picks
  if (state.sessionId !== sessionId) setState({ sessionId, draft: sessionId ? read(sessionId) : {} });
  const { draft } = state;
  const setDraft = useCallback(
    (update: (prev: Draft) => Draft) => setState((s) => ({ ...s, draft: update(s.draft) })),
    []
  );

  // A closed (billed / cleared) table can't take these picks any more
  const closedId = session?.status === 'CLOSED' ? session._id : undefined;
  useEffect(() => {
    if (closedId) write(closedId, {});
  }, [closedId]);

  const cart = useMemo(() => session?.cart ?? [], [session]);

  /** Quantity shown on the menu: the draft if touched, else what's already in the table cart. */
  const myQuantity = useCallback(
    (dishId: string) => draft[dishId] ?? myPlainLine(cart, dishId)?.quantity ?? 0,
    [draft, cart]
  );

  const setMyQuantity = useCallback(
    (dishId: string, quantity: number) => {
      if (!sessionId) return;
      setDraft((prev) => {
        const next = { ...prev, [dishId]: Math.min(MAX_DISH_QUANTITY, Math.max(0, quantity)) };
        write(sessionId, next);
        return next;
      });
    },
    [sessionId, setDraft]
  );

  /** Only the picks that differ from the table cart — nothing to send if empty. */
  const pending = useMemo<IMyCartItem[]>(
    () =>
      Object.entries(draft)
        .filter(([dishId, quantity]) => quantity !== (myPlainLine(cart, dishId)?.quantity ?? 0))
        .map(([dishId, quantity]) => ({ dishId, quantity })),
    [draft, cart]
  );

  /** Cart badge: the table cart with this diner's picks applied. */
  const cartCount = useMemo(() => {
    const base = cart.reduce((sum, l) => sum + l.quantity, 0);
    return Object.entries(draft).reduce(
      (sum, [dishId, quantity]) => sum - (myPlainLine(cart, dishId)?.quantity ?? 0) + quantity,
      base
    );
  }, [draft, cart]);

  const clear = useCallback(() => {
    if (sessionId) write(sessionId, {});
    setDraft(() => ({}));
  }, [sessionId, setDraft]);

  return { myQuantity, setMyQuantity, pending, cartCount, clear };
};
