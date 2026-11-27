import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { headers } from "next/headers";
import { z } from "zod";
import { q } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalog";
import type { CatalogProduct } from "@/lib/types";

/**
 * Kit assistant: a student pastes (or photographs) their university's tools
 * list; Claude searches the live catalogue item by item and reports what we
 * stock, the options (sizes / colours / brands) and how they differ.
 * The model only sees catalogue data returned by its tools.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5-5";

const body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().max(8000),
    image: z.object({
      media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      data: z.string().max(4_000_000), // base64, already downscaled in the browser
    }).nullish(),
  })).min(1).max(12),
});

// ---- per-IP rate limit (per server instance) ----
const hits = new Map<string, number[]>();
const LIMIT = 15, WINDOW = 10 * 60_000;
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

const SYSTEM = `You are the kit assistant of EDS (Al Esraa Dental Store), a dental supplies store in Egypt for dental students and dentists.

A customer gives you a list of required tools/materials (often a university year's list, pasted as text or as a photo) or asks about products. Your job:
1. Read every item on the list. For a photo, transcribe the items first.
2. For EACH item call search_catalog (try English and Arabic names, synonyms, and the generic name, e.g. "wax knife", "carver", "سكينة شمع"). Search several items in parallel.
3. Only state products, prices, sizes, colours and stock that appear in tool results. Never invent products or prices. Prices are in EGP.
4. When an item has several matches or variants, say so: list the options (sizes, colours, brands/origin such as Chinese vs German/Pakistani/Korean) and the price range, and explain the practical difference in one short line (quality, durability, what most students choose). If the origin is not in the product data, you may mention a brand's well-known country of origin but say it is general information.
5. If we don't stock an item, say it's not available online and suggest contacting the store on WhatsApp.
6. At the end call present_matches ONCE with every requested item, in list order.

Reply in the customer's language (Egyptian Arabic if they write Arabic). Keep the written reply short and scannable: a one-line summary (e.g. "متوفر 12 من 15"), then only the notes that matter (choices to make, unavailable items). The product cards are shown to the customer from present_matches, so don't repeat every price in text.`;

const strip = (html: string | null) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);

type Match = { requested: string; status: "available" | "alternative" | "unavailable"; note: string; product_ids: string[] };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ error: "The assistant isn't switched on yet. Please message us on WhatsApp with your list." }, { status: 503 });
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  if (limited(ip)) return Response.json({ error: "You've sent a lot of lists — please wait a few minutes and try again." }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That message couldn't be read. Try a shorter list or a smaller photo." }, { status: 400 });

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => {
    if (m.role === "assistant") return { role: "assistant", content: m.text || "…" };
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (m.image) content.push({ type: "image", source: { type: "base64", media_type: m.image.media_type, data: m.image.data } });
    content.push({ type: "text", text: m.text || "Here is my list — what do you have?" });
    return { role: "user", content };
  });

  let matches: Match[] = [];

  const searchCatalog = betaZodTool({
    name: "search_catalog",
    description: "Search the EDS catalogue (published products only) by name, brand or keyword, in English or Arabic. Returns up to 8 products with price, stock, brand and every variant (size/colour/type) with its own price.",
    inputSchema: z.object({ query: z.string().min(2).max(80).describe("A product name, generic tool name, brand or keyword") }),
    run: async ({ query }) => {
      const rows = await q<{ id: string; slug: string; name_en: string | null; name_ar: string | null; brand_name: string | null; price: number; compare_at_price: number | null; in_stock: boolean; product_type: string | null; short_description_en: string | null }>(
        `select id, slug, name_en, name_ar, brand_name, price, compare_at_price, in_stock, product_type, short_description_en from public.search_products($1, 8)`, [query]);
      if (!rows.length) return JSON.stringify({ query, results: [] });
      const ids = rows.map((r) => r.id);
      const [variants, details] = await Promise.all([
        q<{ product_id: string; options: Record<string, string>; price: number; stock_qty: number | null }>(
          `select product_id, options, price, stock_qty from catalog_variants where product_id = any($1::uuid[]) and is_active order by sort_order`, [ids]),
        q<{ id: string; description_en: string | null; categories: string[] }>(
          `select p.id, p.description_en, array(select c.name_en from product_categories pc join categories c on c.id = pc.category_id where pc.product_id = p.id) as categories
             from products p where p.id = any($1::uuid[])`, [ids]),
      ]);
      return JSON.stringify({
        query,
        results: rows.map((r) => {
          const d = details.find((x) => x.id === r.id);
          return {
            id: r.id, name: r.name_en ?? r.name_ar, name_ar: r.name_ar, brand: r.brand_name, type: r.product_type,
            categories: d?.categories ?? [], price_egp: Number(r.price), was_egp: r.compare_at_price, in_stock: r.in_stock,
            about: r.short_description_en || strip(d?.description_en ?? null),
            variants: variants.filter((v) => v.product_id === r.id).map((v) => ({ options: v.options, price_egp: Number(v.price), in_stock: v.stock_qty == null || v.stock_qty > 0 })),
          };
        }),
      });
    },
  });

  const presentMatches = betaZodTool({
    name: "present_matches",
    description: "Show the customer the result card for every item on their list, in order. Call once, at the end.",
    inputSchema: z.object({
      items: z.array(z.object({
        requested: z.string().max(200).describe("The item as written on the customer's list"),
        status: z.enum(["available", "alternative", "unavailable"]).describe("available = we stock it; alternative = a close substitute; unavailable = not stocked"),
        note: z.string().max(300).describe("One short line: options, price range or the key difference. Same language as the reply."),
        product_ids: z.array(z.string().uuid()).max(6).describe("Matching product ids from search_catalog, best first"),
      })).max(80),
    }),
    run: async ({ items }) => {
      matches = items;
      return "Shown to the customer.";
    },
  });

  try {
    const client = new Anthropic();
    const final = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      max_iterations: 12,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      tools: [searchCatalog, presentMatches],
      messages,
    });
    if (final.stop_reason === "refusal") {
      return Response.json({ error: "I can only help with dental tools and supplies from our store." }, { status: 200 });
    }
    const reply = final.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();

    const allIds = [...new Set(matches.flatMap((m) => m.product_ids))];
    const products: CatalogProduct[] = allIds.length ? await getProductsByIds(allIds) : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return Response.json({
      reply,
      matches: matches.map((m) => ({ ...m, products: m.product_ids.map((id) => byId.get(id)).filter(Boolean) })),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "The assistant is busy right now — try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.APIError) {
      console.error("[assistant]", e.status, e.message);
      return Response.json({ error: "The assistant couldn't answer right now. Please try again." }, { status: 502 });
    }
    console.error("[assistant]", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
