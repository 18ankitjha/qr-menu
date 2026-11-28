// ============================================================
// Live Cart Constants
// ============================================================

export const LIVE_CART_LIMITS = {
  MAX_LINE_QUANTITY: 50,
  MAX_LINES: 60,
  /** Most changes one edit message may carry (a phone sends its batched taps in one message). */
  MAX_CHANGES_PER_MESSAGE: 60,
  /** Changed carts are written to the DB this often (write-behind). Cart open / order / shutdown write at once. */
  FLUSH_EVERY_MS: 30 * 1000,
  /** Carts nobody touched for this long leave memory (saved first) — reloaded from the DB on next use.
   * Shorter than the table session's IDLE_HOURS, so an idle-closed session never has a cart in memory. */
  EVICT_AFTER_MS: 2 * 60 * 60 * 1000,
  /** Orderable dishes per restaurant are cached this long (an owner's "sold out" shows up within a minute). */
  DISH_CACHE_MS: 60 * 1000,
  /** Edit messages one socket may send per second (a phone batches taps, so real use is ~4/s at most). */
  MAX_EDITS_PER_SECOND: 10,
} as const;

/** `<memberKey>.<dishId>` — memberKey is 12 hex chars, dishId a Mongo id. */
export const CART_LINE_KEY = /^([a-f0-9]{12})\.([a-f0-9]{24})$/;
