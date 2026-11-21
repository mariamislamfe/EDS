import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { loadEntityRows } from "@/components/admin/EntityPage";
import { EntityManager } from "@/components/admin/EntityManager";
import { AnnouncementForm, HeroForm, SectionsForm } from "@/components/admin/SettingsForms";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Website content" };

export default async function ContentAdmin() {
  await requireStaffPage();
  const [settings, banners, testimonials] = await Promise.all([
    q<{ key: string; value: unknown }>(`select key, value from settings where key = any($1)`, [["home_hero", "announcement", "home_sections"]]),
    loadEntityRows("banners"),
    loadEntityRows("testimonials"),
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
          <p className="mb-2 text-sm text-muted">Homepage promotional banner, and the hero of the Students and Dentists pages.</p>
          <EntityManager entity="banners" rows={banners} />
        </div>
        <div>
          <h2 className="mb-1 mt-6 text-xl font-semibold">Testimonials</h2>
          <p className="mb-2 text-sm text-muted">The homepage section stays hidden until at least one visible testimonial exists. Only publish real feedback.</p>
          <EntityManager entity="testimonials" rows={testimonials} />
        </div>
      </div>
    </>
  );
}
