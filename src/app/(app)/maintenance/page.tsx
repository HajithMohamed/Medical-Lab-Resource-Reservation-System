import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function MaintenanceRedirectPage() {
  await requireRole("MANAGER", "ADMIN");
  redirect("/equipment?tab=blocked");
}
