"use client";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleSlash, ImagePlus, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/types";
import { formatPrice } from "@/lib/i18n";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { cn } from "@/lib/utils";

type Img = { media_type: "image/jpeg"; data: string; preview: string };
type MatchRow = { requested: string; status: "available" | "alternative" | "unavailable"; note: string; products: CatalogProduct[] };
type Msg =
  | { role: "user"; text: string; image?: Img | null }
  | { role: "assistant"; text: string; matches?: MatchRow[]; error?: boolean };

/** Downscale a photo in the browser so uploads stay small (≤1600px JPEG). */
async function toJpeg(file: Blob): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: url.split(",")[1], preview: url };
}

const STATUS = {
  available: { icon: CheckCircle2, cls: "text-success", label: "Available" },
  alternative: { icon: CircleAlert, cls: "text-warn", label: "Alternative" },
  unavailable: { icon: CircleSlash, cls: "text-muted", label: "Not stocked" },
};

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<Img | null>(null);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClick = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.("[data-open-assistant]")) setOpen(true); };
    window.addEventListener("eds:assistant", onOpen);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("eds:assistant", onOpen); document.removeEventListener("click", onClick); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const attach = async (f: File | null | undefined) => { if (f && f.type.startsWith("image/")) setImage(await toJpeg(f)); };

  const send = async () => {
    if (busy || (!text.trim() && !image)) return;
    const next: Msg[] = [...msgs, { role: "user", text: text.trim(), image }];
    setMsgs(next); setText(""); setImage(null); setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-8).map((m) => m.role === "user"
            ? { role: "user", text: m.text, image: m.image ? { media_type: m.image.media_type, data: m.image.data } : null }
            : { role: "assistant", text: m.text || "(results shown)" }),
        }),
      });
      const data = await res.json();
      setMsgs([...next, data.error ? { role: "assistant", text: data.error, error: true } : { role: "assistant", text: data.reply, matches: data.matches }]);
    } catch {
      setMsgs([...next, { role: "assistant", text: "Connection problem — please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open the kit assistant"
        className={cn("group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-navy-deep pe-5 ps-4 text-white shadow-[0_20px_40px_-16px_rgb(2_42_82/0.7)] transition-[transform,opacity] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-0.5",
          open && "pointer-events-none translate-y-4 opacity-0")}>
        <span className="relative grid size-8 place-items-center rounded-full bg-teal text-navy-deep">
          <Sparkles className="size-4" />
          <span className="pin-pulse absolute inset-0 rounded-full bg-teal/60" aria-hidden />
        </span>
        <span className="text-sm font-medium">Check my list</span>
      </button>

      <>
        {open && (
          <div data-enter
            role="dialog" aria-modal="false" aria-label="Kit assistant"
            className="fixed inset-x-2 bottom-2 top-16 z-[70] flex origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_40px_100px_-30px_rgb(2_42_82/0.55)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(44rem,calc(100dvh-6rem))] sm:w-[26rem]"
          >
            <div className="on-dark relative overflow-hidden bg-navy-deep px-5 py-4 text-white">
              <div aria-hidden className="mm-grid-dark absolute inset-0" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Kit assistant</p>
                  <p className="mt-1 font-display text-lg font-semibold leading-tight">Paste your university list — we&apos;ll check it.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Close"><X className="size-5" /></button>
              </div>
            </div>

            <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" aria-live="polite">
              {!msgs.length && (
                <div className="rounded-2xl bg-aqua p-4 text-sm leading-relaxed text-navy">
                  <p className="font-medium">How it works</p>
                  <ol className="mt-2 list-decimal space-y-1 ps-5 text-ink/80">
                    <li>Paste your tools list, or attach a photo of it.</li>
                    <li>We check every item against what&apos;s in stock.</li>
                    <li>You see the options — sizes, colours, brands (e.g. Chinese vs German) — and add them to your bag.</li>
                  </ol>
                  <p className="mt-3 text-ink/70" dir="rtl">ابعت ليستة الكلية كتابة أو صورة، وهنقولك المتوفر وأسعاره والفرق بين الأنواع.</p>
                </div>
              )}
              {msgs.map((m, i) => m.role === "user" ? (
                <div key={i} className="ms-auto flex max-w-[85%] flex-col items-end gap-2">
                  {m.image && <Image src={m.image.preview} alt="Your list" width={220} height={220} unoptimized className="h-auto max-h-56 w-auto rounded-2xl border border-line object-contain" />}
                  {m.text && <p className="whitespace-pre-line rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-sm text-white" dir="auto">{m.text}</p>}
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-3">
                  {m.text && <p className={cn("whitespace-pre-line rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed", m.error ? "bg-danger/10 text-danger" : "bg-cloud text-ink")} dir="auto">{m.text}</p>}
                  {m.matches?.map((row, k) => {
                    const S = STATUS[row.status];
                    return (
                      <div key={k} className="rounded-2xl border border-line p-3">
                        <p className="flex items-start gap-2 text-sm">
                          <S.icon className={cn("mt-0.5 size-4 shrink-0", S.cls)} aria-label={S.label} />
                          <span className="min-w-0"><span className="font-medium text-navy" dir="auto">{row.requested}</span>
                            {row.note && <span className="block text-xs text-muted" dir="auto">{row.note}</span>}</span>
                        </p>
                        {row.products.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-2">
                            {row.products.map((p) => (
                              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-cloud/60 p-2">
                                <Link href={`/products/${encodeURIComponent(p.slug)}`} className="product-tile relative size-12 shrink-0 overflow-hidden rounded-lg" onClick={() => setOpen(false)}>
                                  {p.image_url && <Image src={p.image_url} alt="" fill sizes="48px" className="object-contain p-1" />}
                                </Link>
                                <span className="min-w-0 flex-1">
                                  <Link href={`/products/${encodeURIComponent(p.slug)}`} onClick={() => setOpen(false)} className="line-clamp-1 text-xs font-medium text-ink hover:underline">{p.name_en ?? p.name_ar}</Link>
                                  <span className="text-xs tabular-nums text-navy">{p.has_variants ? "from " : ""}{formatPrice(p.price, "en")}{!p.in_stock && <span className="ms-1 text-danger">· out of stock</span>}</span>
                                </span>
                                {p.has_variants ? (
                                  <Link href={`/products/${encodeURIComponent(p.slug)}`} onClick={() => setOpen(false)} className="btn btn-ghost btn-sm !min-h-8 !px-3 text-xs">Options</Link>
                                ) : (
                                  <AddToCartButton compact disabled={!p.in_stock} className="!size-8"
                                    line={{ type: "product", id: p.id, variantId: null, snapshot: { slug: p.slug, name_en: p.name_en, name_ar: p.name_ar, image: p.image_url, price: p.price } }} />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-3 rounded-2xl bg-cloud px-4 py-3 text-sm text-muted">
                  <span className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="typing-dot size-1.5 rounded-full bg-navy" style={{ animationDelay: `${d * 150}ms` }} />)}</span>
                  Checking every item against our stock…
                </div>
              )}
            </div>

            <form className="border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
              {image && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-cloud p-2 text-xs text-muted">
                  <Image src={image.preview} alt="" width={40} height={40} unoptimized className="size-10 rounded-lg object-cover" />
                  Photo attached
                  <button type="button" className="ms-auto grid size-7 place-items-center rounded-full hover:bg-white" onClick={() => setImage(null)} aria-label="Remove photo"><X className="size-4" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-navy hover:border-navy" aria-label="Attach a photo of your list">
                  <ImagePlus className="size-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
                <textarea
                  value={text} onChange={(e) => setText(e.target.value)} rows={2} dir="auto"
                  onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); attach(f); } }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Paste your list, or ask about a product…" aria-label="Message"
                  className="field max-h-40 min-h-11 flex-1 resize-none !rounded-2xl !py-2.5 text-sm"
                />
                <button type="submit" disabled={busy || (!text.trim() && !image)} className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-white transition-opacity disabled:opacity-40" aria-label="Send">
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    </>
  );
}
