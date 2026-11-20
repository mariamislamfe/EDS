"use client";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; callMethod?: (...a: unknown[]) => void; push?: unknown; version?: string };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

/**
 * Sends a standard Meta Pixel event. A no-op when no Pixel ID is configured
 * (the base code is only loaded by <MetaPixel> when at least one ID is set).
 */
export function trackPixel(event: string, params?: Record<string, unknown>, opts?: { eventID?: string }) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (opts?.eventID) window.fbq("track", event, params ?? {}, { eventID: opts.eventID });
  else window.fbq("track", event, params ?? {});
}
