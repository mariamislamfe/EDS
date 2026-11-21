import { EntityPage } from "@/components/admin/EntityPage";

export const metadata = { title: "Specialties" };

export default function SpecialtiesAdmin() {
  return <EntityPage entity="specialties" text="Dental specialties on the dentist landing page. Products appear under a specialty when assigned to it and their audience is Dentists or Both." />;
}
