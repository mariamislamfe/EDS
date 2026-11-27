"use client";
import { useSyncExternalStore } from "react";

/**
 * Tiny persisted stores (cart, wishlist, recently viewed).
 * localStorage is a convenience only — prices are always re-quoted by the
 * server (quote_cart) before anything is shown as a total or ordered.
 */
function createStore<T>(key: string, initial: T) {
  let state: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = JSON.parse(raw) as T;
    } catch { /* storage blocked: keep in-memory state */ }
  };
  const persist = () => {
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try { state = e.newValue ? (JSON.parse(e.newValue) as T) : initial; } catch { state = initial; }
      listeners.forEach((l) => l());
    });
  }
  return {
    get: () => { load(); return state; },
    set: (updater: (prev: T) => T) => {
      load();
      state = updater(state);
      persist();
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
    initial,
  };
}

// ---------------- cart ----------------
export interface CartLine {
  key: string;
  type: "product" | "bundle";
  id: string;
  variantId: string | null;
  qty: number;
  snapshot: {
    slug: string;
    name_en: string | null;
    name_ar: string | null;
    image: string | null;
    price: number;
    variantLabel?: string | null;
  };
}

const cartStore = createStore<CartLine[]>("eds_cart_v1", []);
const EMPTY: CartLine[] = [];

const noopSubscribe = () => () => {};
/** false on the server and during hydration, true after: localStorage-backed UI waits for it. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, () => EMPTY);
}

export const cart = {
  add(line: Omit<CartLine, "key" | "qty">, qty = 1) {
    const key = `${line.type}:${line.id}:${line.variantId ?? ""}`;
    cartStore.set((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, 999), snapshot: line.snapshot } : l));
      return [...prev, { ...line, key, qty }];
    });
    window.dispatchEvent(new CustomEvent("eds:cart-added", { detail: { key, id: line.id, type: line.type, price: line.snapshot.price, qty, name: line.snapshot.name_en ?? line.snapshot.name_ar } }));
  },
  setQty(key: string, qty: number) {
    cartStore.set((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, 999) } : l))));
  },
  remove(key: string) {
    cartStore.set((prev) => prev.filter((l) => l.key !== key));
  },
  clear() {
    cartStore.set(() => []);
  },
  toPayload(lines: CartLine[]) {
    return lines.map((l) => ({ type: l.type, id: l.id, variant_id: l.variantId, qty: l.qty }));
  },
};

// ---------------- wishlist ----------------
const wishStore = createStore<string[]>("eds_wishlist_v1", []);
const EMPTY_IDS: string[] = [];
export function useWishlist() {
  return useSyncExternalStore(wishStore.subscribe, wishStore.get, () => EMPTY_IDS);
}
export const wishlist = {
  toggle(id: string) {
    wishStore.set((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev].slice(0, 100)));
  },
};

// ---------------- recently viewed ----------------
const recentStore = createStore<string[]>("eds_recent_v1", []);
export function useRecentlyViewed() {
  return useSyncExternalStore(recentStore.subscribe, recentStore.get, () => EMPTY_IDS);
}
export const recent = {
  push(id: string) {
    recentStore.set((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
  },
};

// ---------------- student checklist ----------------
const checklistStore = createStore<Record<string, boolean>>("eds_checklist_v1", {});
const EMPTY_MAP: Record<string, boolean> = {};
export function useChecklist() {
  return useSyncExternalStore(checklistStore.subscribe, checklistStore.get, () => EMPTY_MAP);
}
export const checklist = {
  toggle(id: string) {
    checklistStore.set((prev) => ({ ...prev, [id]: !prev[id] }));
  },
};
