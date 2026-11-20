"use client";
import { useEffect, useState } from "react";

/**
 * Decides, per product photo, whether it can be shown as an isolated object:
 * the photo's border must be (near-)white or transparent. The check samples a
 * 48px copy served by our own /_next/image endpoint (same origin, so the
 * canvas stays readable). Results are cached for the session.
 */
const cache = new Map<string, Promise<boolean>>();

export function isCleanBackground(src: string): Promise<boolean> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        try {
          const w = 48, h = 48;
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(false);
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let bad = 0, n = 0;
          const check = (x: number, y: number) => {
            const i = (y * w + x) * 4;
            const r = d[i], g = d[i + 1], b = d[i + 2];
            const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
            n++;
            if (lo < 238 || hi - lo > 14) bad++;
          };
          for (let x = 0; x < w; x++) { check(x, 0); check(x, 1); check(x, h - 2); check(x, h - 1); }
          for (let y = 2; y < h - 2; y++) { check(0, y); check(1, y); check(w - 2, y); check(w - 1, y); }
          resolve(bad / n < 0.04);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
    });
    cache.set(src, p);
  }
  return p;
}

/** Returns `null` while checking, then the sources split into clean cut-outs and framed photos. */
export function useCleanImages(srcs: string[]) {
  const key = srcs.join("|");
  const [result, setResult] = useState<{ clean: Set<string> } | null>(null);
  useEffect(() => {
    let alive = true;
    const list = key ? key.split("|") : [];
    Promise.all(list.map((s) => isCleanBackground(s).then((ok) => [s, ok] as const))).then((pairs) => {
      if (alive) setResult({ clean: new Set(pairs.filter(([, ok]) => ok).map(([s]) => s)) });
    });
    return () => { alive = false; };
  }, [key]);
  return result;
}

/**
 * Picks up to `count` items, preferring clean cut-outs. Framed photos only
 * fill in when fewer than `minClean` cut-outs exist.
 */
export function pickCutouts<T extends { image: string }>(items: T[], clean: Set<string> | undefined, count: number, minClean = count) {
  if (!clean) return [];
  const good = items.filter((i) => clean.has(i.image));
  const rest = items.filter((i) => !clean.has(i.image));
  const list = good.length >= minClean ? good : [...good, ...rest];
  return list.slice(0, count).map((i) => ({ ...i, cutout: clean.has(i.image) }));
}
