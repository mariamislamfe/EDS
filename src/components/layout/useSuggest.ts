"use client";
import { useEffect, useRef, useState } from "react";
import { suggest } from "@/app/actions";
import type { CatalogProduct } from "@/lib/types";

/** Live product suggestions for a query (debounced; stale responses are dropped). */
export function useSuggest(q: string) {
  const [state, setState] = useState<{ query: string; items: CatalogProduct[]; loading: boolean }>({ query: "", items: [], loading: false });
  const seq = useRef(0);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const items = await suggest(query);
        if (id === seq.current) setState({ query, items, loading: false });
      } catch {
        if (id === seq.current) setState({ query, items: [], loading: false });
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  const ready = query.length >= 2;
  return {
    // while the next results load, keep the last ones only if the user is refining the same word
    items: ready && (state.query === query || (state.query && query.startsWith(state.query))) ? state.items : [],
    loading: ready && (state.loading || state.query !== query),
    ready,
  };
}
