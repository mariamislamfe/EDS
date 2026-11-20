import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { isConfigured } from "@/lib/env";

/**
 * Permanent redirects for product URLs from the previous store
 * (/ar/product/all/<handle>) so existing links and search results keep working.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const handle = decodeURIComponent((await params).handle);
  const fallback = new URL("/shop", request.url);
  if (!isConfigured) return NextResponse.redirect(fallback, 302);
  const row = await one<{ slug: string }>(`select slug from products where legacy_handle = $1 and is_published`, [handle]).catch(() => null);
  if (!row) return NextResponse.redirect(fallback, 302);
  return NextResponse.redirect(new URL(`/products/${encodeURIComponent(row.slug)}`, request.url), 301);
}
