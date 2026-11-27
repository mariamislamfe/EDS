import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { loadEntityRows } from "@/components/admin/EntityPage";
import { EntityManager } from "@/components/admin/EntityManager";
import { AnnouncementForm, HeroForm, SectionsForm } from "@/components/admin/SettingsForms";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Website content" };

export default async function ContentAdmin() {
  await requireStaffPage();
  const [settings, banners, testimonials, branches] = await Promise.all([
    q<{ key: string; value: unknown }>(`select key, value from settings where key = any($1)`, [["home_hero", "announcement", "home_sections"]]),
    loadEntityRows("banners"),
    loadEntityRows("testimonials"),
    loadEntityRows("store_locations"),
  ]);
  const get = <T,>(k: string, fallback: T) => ((settings ?? []).find((s) => s.key === k)?.value as T) ?? fallback;
  return (
    <>
      <PageHeader title="Website content" text="Homepage copy, banners and testimonials. Changes appear on the storefront right after saving." />
      <div className="flex flex-col gap-6">
        <HeroForm value={get("home_hero", {})} />
        <AnnouncementForm value={get("announcement", { enabled: false, text_en: "", text_ar: "", href: null })} />
        <SectionsForm value={get("home_sections", {})} />
        <div>
          <h2 className="mb-1 mt-6 text-xl font-semibold">Banners</h2>
          <p className="mb-2 text-sm text-muted">
            <strong>Homepage hero slideshow</strong>: add several banners with placement “Homepage hero slideshow” — only their images are used; they cross-fade behind the same headline (wide photos, at least 2000px, work best).
            Also: the homepage promotional banner and the hero of the Students and Dentists pages.
          </p>
          <EntityManager entity="banners" rows={banners} />
        </div>
        <div>
          <h2 className="mb-1 mt-6 text-xl font-semibold">Customer feedback</h2>
          <p className="mb-2 text-sm text-muted">Upload a photo or screenshot of each piece of feedback. They show under the brands strip in identical 4:5 frames with the site&apos;s colours, so they always look consistent. Only publish real feedback.</p>
          <EntityManager entity="testimonials" rows={testimonials} />
        </div>
        <div>
          <h2 className="mb-1 mt-6 text-xl font-semibold">Store branches (map)</h2>
          <p className="mb-2 text-sm text-muted">Shown as pins on the map at the bottom of the homepage. Tapping a pin opens the branch in Google Maps.</p>
          <EntityManager entity="store_locations" rows={branches} />
        </div>
      </div>
    </>
  );
}
