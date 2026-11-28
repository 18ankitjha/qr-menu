import { LIVE_CART, MESSAGES, STORAGE_KEYS } from '../constants';
import { messageOf, statusOf } from '../api/http';
import { getSocket } from '../realtime/socket';
import { CART_EVENTS, RETRYABLE_SOCKET_ERRORS } from '../realtime/events';
import type { ICartChange, ICartLine, ITableSession } from '../types';

// ============================================================
// LiveCartStore — this phone's view of the table's live cart (one store per table session). No React here.
//
//   server state  = the last cart the server sent (socket cart_updated / REST responses; newer version wins)
//   pending       = this phone's edits not yet confirmed (shown on top of the server state, kept in
//                   localStorage so a reload / dropped connection loses nothing)
//
//   tap −/+  → pending (instant on screen) → after 250ms ONE socket message cart_set → the server pushes the
//              new cart to everyone at the table (us included) → ack → those edits leave `pending`
//   no live connection → edits wait on the phone; the connection coming back or opening Cart sends them
//   Cart tab opened → REST PUT cart/sync (the server also saves the cart to the DB)
//   place order → settle(): everything delivered, then the order uses the version that came back
//
// Sends never overlap (one queue). Debug: localStorage 'qr:realtime-debug' = '1' logs socket traffic.
// ============================================================

type Pending = Record<string, number>;

export interface LiveCartSnapshot {
  version: number;
  lines: ICartLine[];
  pending: Pending;
}

interface SetAck {
  ok: boolean;
  version?: number;
  skipped?: string[];
  error?: string;
}

export interface LiveCartDeps {
  /** PUT cart/sync for this session (through the table's request queue, so the table view updates too). */
  restSync: (changes: ICartChange[]) => Promise<ITableSession>;
  onError: (message: string) => void;
  /** Some dishes could not be added (no longer available). */
  onSkipped: () => void;
}

const MAX_SOCKET_RETRIES = 3;

/** Socket error codes (UPPER_CASE) aren't meant for diners; operational errors are plain sentences. */
const isCode = (error: string): boolean => /^[A-Z_]+$/.test(error);

// ---------------------------------------------------------------- storage

const readPending = (sessionId: string, me: string): Pending => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PENDING_CART(sessionId));
    if (saved) return JSON.parse(saved) as Pending;
    // Picks saved by the previous version of the app (dishId → quantity on the diner's own line)
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_DRAFT(sessionId));
    if (!legacy) return {};
    localStorage.removeItem(STORAGE_KEYS.LEGACY_DRAFT(sessionId));
    return Object.fromEntries(
      Object.entries(JSON.parse(legacy) as Pending).map(([dishId, quantity]) => [`${me}.${dishId}`, quantity])
    );
  } catch {
    return {};
  }
};

const writePending = (sessionId: string, pending: Pending): void => {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(STORAGE_KEYS.PENDING_CART(sessionId));
    else localStorage.setItem(STORAGE_KEYS.PENDING_CART(sessionId), JSON.stringify(pending));
  } catch {
    /* private mode — pending edits just live in memory */
  }
};

/** The session is over (billed / cleared): its unsent edits can never be used. */
export const forgetPending = (sessionId: string): void => writePending(sessionId, {});

// ---------------------------------------------------------------- store

export class LiveCartStore {
  private server: { version: number; lines: ICartLine[] } = { version: 0, lines: [] };
  private pending: Pending;
  private snapshot: LiveCartSnapshot;
  private readonly listeners = new Set<() => void>();

  private live = false;
  private cartOpen = false;
  private deps: LiveCartDeps | null = null;

  private queue: Promise<unknown> = Promise.resolve();
  private flushQueued = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private socketRetries = 0;

  readonly sessionId: string;
  /** This diner's member key — lines they add are `<me>.<dishId>`. */
  readonly me: string;

  constructor(sessionId: string, me: string) {
    this.sessionId = sessionId;
    this.me = me;
    this.pending = readPending(sessionId, me);
    this.snapshot = this.makeSnapshot();
  }

  // ---------------- React glue (useSyncExternalStore)

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LiveCartSnapshot => this.snapshot;

  private makeSnapshot(): LiveCartSnapshot {
    return { ...this.server, pending: this.pending };
  }

  private changed(): void {
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  /** Latest callbacks + whether the cart room is live / the Cart tab is open. Called after every render. */
  configure(deps: LiveCartDeps, live: boolean, cartOpen: boolean): void {
    this.deps = deps;
    this.cartOpen = cartOpen;
    if (live === this.live) return;
    this.live = live;
    if (live) {
      this.socketRetries = 0;
      if (this.unsent().length) this.schedule(); // connection back → send what waited on the phone
    }
  }

  dispose(): void {
    clearTimeout(this.timer);
  }

  // ---------------- incoming

  /** A cart from the server (socket push or REST response). Older than what we have → ignored. */
  accept(version: number, lines: ICartLine[]): void {
    if (version < this.server.version || (version === this.server.version && lines === this.server.lines)) return;
    this.server = { version, lines };
    this.changed();
  }

  // ---------------- edits

  /** Set a line's quantity (0 removes it). Instant on screen; sent a moment later. */
  set(key: string, quantity: number): void {
    this.pending = { ...this.pending, [key]: quantity };
    writePending(this.sessionId, this.pending);
    this.changed();
    this.schedule();
  }

  /** Cart tab opened: send everything still on the phone over REST; the server saves the cart. */
  syncNow(): Promise<void> {
    clearTimeout(this.timer);
    return this.enqueue(() => this.sendRest(this.unsent())).catch((e) => this.deps?.onError(messageOf(e)));
  }

  /** Before placing an order: every edit delivered. Returns the cart version the order must match. */
  async settle(): Promise<number> {
    await this.flush();
    if (this.unsent().length) await this.enqueue(() => this.sendRest(this.unsent())); // throws → no order
    return this.server.version;
  }

  // ---------------- sending

  private unsent(): ICartChange[] {
    return Object.entries(this.pending)
      .slice(0, LIVE_CART.MAX_CHANGES_PER_MESSAGE)
      .map(([key, quantity]) => ({ key, quantity }));
  }

  private schedule(delay: number = LIVE_CART.SEND_AFTER_MS): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Send pending edits: socket when live, REST when the Cart tab is open, otherwise they wait on the phone. */
  private flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.flushQueued) return this.queue.then(() => undefined); // the flush already waiting sends these too
    this.flushQueued = true;
    return this.enqueue(async () => {
      this.flushQueued = false;
      const changes = this.unsent();
      if (!changes.length) return;
      if (this.live) await this.sendSocket(changes);
      else if (this.cartOpen) await this.sendRest(changes).catch((e) => this.deps?.onError(messageOf(e)));
    });
  }

  /** These edits reached the server (or were refused): stop showing them as pending — unless tapped again since. */
  private settleSent(changes: ICartChange[]): void {
    const next = { ...this.pending };
    let touched = false;
    for (const { key, quantity } of changes) {
      if (next[key] === quantity) {
        delete next[key];
        touched = true;
      }
    }
    if (!touched) return;
    this.pending = next;
    writePending(this.sessionId, next);
    this.changed();
  }

  private sendSocket(changes: ICartChange[]): Promise<void> {
    return new Promise((resolve) => {
      getSocket()
        .timeout(LIVE_CART.ACK_TIMEOUT_MS)
        .emit(CART_EVENTS.CART_SET, { sessionId: this.sessionId, changes }, (err: Error | null, ack?: SetAck) => {
          if (err || !ack || (!ack.ok && RETRYABLE_SOCKET_ERRORS.includes(ack.error ?? ''))) {
            // No answer / busy: keep the edits and retry a few times; after that they wait for Cart or a reconnect
            if (++this.socketRetries <= MAX_SOCKET_RETRIES) this.schedule(LIVE_CART.RETRY_AFTER_MS);
          } else if (ack.ok) {
            this.socketRetries = 0;
            // The new cart (cart_updated) arrived just before this ack, on the same connection
            this.settleSent(changes);
            if (ack.skipped?.length) this.deps?.onSkipped();
          } else {
            this.settleSent(changes);
            this.deps?.onError(!ack.error || isCode(ack.error) ? MESSAGES.ERROR_GENERIC : ack.error);
          }
          resolve();
        });
    });
  }

  private async sendRest(changes: ICartChange[]): Promise<void> {
    if (!this.deps) return;
    try {
      const view = await this.deps.restSync(changes);
      this.accept(view.cartVersion, view.cart);
      this.settleSent(changes);
      if (view.cartSkipped?.length) this.deps.onSkipped();
    } catch (e) {
      const status = statusOf(e);
      if (status && status < 500) this.settleSent(changes); // refused (e.g. ordering is off) → don't resend
      throw e;
    }
  }
}
