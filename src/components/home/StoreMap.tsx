import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import type { StoreLocation } from "@/lib/catalog";

/**
 * A themed street map (OpenStreetMap data, CARTO tiles) drawn as one responsive
 * SVG: tiles are laid out around the branches, tinted to the site palette, and
 * every pin opens that branch in Google Maps.
 */
const TILE = 256;
const VIEW_W = 1200;
const VIEW_H = 620;

const lon2x = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z;
};

export const mapsHref = (l: Pick<StoreLocation, "maps_url" | "lat" | "lng">) =>
  l.maps_url || `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;

export function StoreMap({ locations }: { locations: StoreLocation[] }) {
  if (!locations.length) return null;
  const pts = locations.map((l) => ({ ...l, lat: Number(l.lat), lng: Number(l.lng) }));

  // zoom so every branch fits comfortably
  let z = 12;
  for (; z > 5; z--) {
    const xs = pts.map((p) => lon2x(p.lng, z)), ys = pts.map((p) => lat2y(p.lat, z));
    if (Math.max(...xs) - Math.min(...xs) < VIEW_W * 0.55 && Math.max(...ys) - Math.min(...ys) < VIEW_H * 0.5) break;
  }
  const xs = pts.map((p) => lon2x(p.lng, z)), ys = pts.map((p) => lat2y(p.lat, z));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const left = cx - VIEW_W / 2, top = cy - VIEW_H / 2;
  const tiles: { x: number; y: number; px: number; py: number }[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + VIEW_W) / TILE); tx++)
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + VIEW_H) / TILE); ty++)
      tiles.push({ x: tx, y: ty, px: tx * TILE - left, py: ty * TILE - top });

  return (
    <section className="container-x pb-6 pt-10 lg:pt-14" aria-labelledby="visit-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Visit us</p>
          <h2 id="visit-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]">
            {pts.length} stores, <span className="font-serif font-normal italic text-teal-strong">one standard.</span>
          </h2>
        </div>
        <p className="max-w-sm text-muted">Tap a pin to open directions in Google Maps.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-aqua" data-rise>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" className="block aspect-[4/3] w-full sm:aspect-[16/9]" role="img" aria-label="Map of EDS branches">
            <g style={{ filter: "grayscale(1) contrast(0.92) brightness(1.04)" }}>
              {tiles.map((t) => (
                <image key={`${t.x}-${t.y}`} href={`https://basemaps.cartocdn.com/light_all/${z}/${t.x}/${t.y}@2x.png`} x={t.px} y={t.py} width={TILE + 0.5} height={TILE + 0.5} />
              ))}
            </g>
            <rect width={VIEW_W} height={VIEW_H} fill="#65c2c7" opacity="0.14" style={{ mixBlendMode: "multiply" }} />
            {pts.length > 1 && (
              <polyline
                points={pts.map((p) => `${lon2x(p.lng, z) - left},${lat2y(p.lat, z) - top}`).join(" ")}
                fill="none" stroke="#043d74" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity="0.5"
              />
            )}
            {pts.map((p) => {
              const x = lon2x(p.lng, z) - left, y = lat2y(p.lat, z) - top;
              return (
                <a key={p.id} href={mapsHref(p)} target="_blank" rel="noopener noreferrer" aria-label={`${p.name_en} — open in Google Maps`} className="group/pin">
                  <circle cx={x} cy={y} r="16" fill="#65c2c7" className="pin-pulse" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                  <circle cx={x} cy={y} r="11" fill="#022a52" stroke="#fff" strokeWidth="4" className="transition-[r] duration-300 group-hover/pin:[r:14]" />
                  <g transform={`translate(${x + 22}, ${y - 22})`}>
                    <rect width={p.name_en.length * 12 + 34} height="44" rx="22" fill="#fff" stroke="#dde5eb" />
                    <text x="18" y="28" fontSize="19" fontWeight="600" fill="#022a52" fontFamily="var(--font-instrument), system-ui, sans-serif">{p.name_en}</text>
                  </g>
                </a>
              );
            })}
          </svg>
          <p className="absolute bottom-2 right-3 rounded bg-white/80 px-1.5 text-[0.62rem] text-muted">© OpenStreetMap contributors © CARTO</p>
        </div>

        <ul className="grid content-start gap-3" data-stagger>
          {pts.map((p, i) => (
            <li key={p.id}>
              <a href={mapsHref(p)} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col gap-3 rounded-[1.5rem] border border-line bg-white p-6 transition-colors duration-300 hover:border-navy hover:bg-navy-deep">
                <span className="flex items-center justify-between">
                  <span className="font-mono text-xs text-teal-strong group-hover:text-teal">0{i + 1}</span>
                  <ArrowUpRight className="size-5 text-muted transition-transform duration-300 group-hover:rotate-45 group-hover:text-teal" />
                </span>
                <span className="display text-2xl leading-tight group-hover:text-white">{p.name_en}</span>
                <span className="flex flex-col gap-1.5 text-sm text-muted group-hover:text-white/70">
                  {p.address_en && <span className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{p.address_en}</span>}
                  {p.phone && <span className="flex items-center gap-2" dir="ltr"><Phone className="size-4 shrink-0" />{p.phone}</span>}
                  {p.hours_en && <span className="flex items-center gap-2"><Clock className="size-4 shrink-0" />{p.hours_en}</span>}
                </span>
                <span className="text-sm font-medium text-navy underline-offset-4 group-hover:text-teal group-hover:underline">Get directions</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
