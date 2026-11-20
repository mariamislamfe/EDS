/** Splits a heading into masked words for the [data-split] rise (server-safe). */
export function Words({ text, accent, accentClass = "font-serif font-normal italic text-teal-strong" }: { text: string; accent?: string; accentClass?: string }) {
  const parts = text.split(" ").filter(Boolean);
  const acc = accent ? accent.split(" ").filter(Boolean) : [];
  return (
    <>
      <span className="sr-only">{[text, accent].filter(Boolean).join(" ")}</span>
      <span aria-hidden>
        {parts.map((w, i) => (
          <span key={`a${i}`} className="w -mb-[0.12em] inline-block overflow-hidden pb-[0.16em] align-bottom">
            <span className="inline-block">{w}&nbsp;</span>
          </span>
        ))}
        {acc.map((w, i) => (
          <span key={`b${i}`} className="w -mb-[0.12em] inline-block overflow-hidden pb-[0.16em] align-bottom">
            <span className={`inline-block ${accentClass}`}>{w}{i < acc.length - 1 ? " " : ""}</span>
          </span>
        ))}
      </span>
    </>
  );
}
