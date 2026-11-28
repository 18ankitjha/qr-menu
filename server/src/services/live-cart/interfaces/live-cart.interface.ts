// ============================================================
// Live Cart Interfaces
// Plain JSON only (no ObjectIds / Maps / Dates) so a cart can move to Redis unchanged.
// ============================================================

export interface ILiveCartLine {
  customerId: string;
  /** Name of the diner who added it. */
  name: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
  addedAt: number;
}

/** One table session's shared cart while diners are picking food. */
export interface ILiveCart {
  sessionId: string;
  restaurantId: string;
  tableId: string;
  /** customerId → name of everyone allowed to edit (the session's members). */
  members: Record<string, string>;
  lines: ILiveCartLine[];
  version: number;
  /** Changed since the last DB snapshot. */
  dirty: boolean;
  /** Last time anyone read or changed it (drives eviction). */
  touchedAt: number;
}

/** Set one line to `quantity` (0 removes it). `key` = `<memberKey>.<dishId>`. */
export interface ICartChange {
  key: string;
  quantity: number;
}

export interface ICartActor {
  customerId: string;
  name: string;
}
