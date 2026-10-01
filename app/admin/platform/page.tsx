import { redirect } from "next/navigation";

export default function AdminPlatformRedirect() {
  redirect("/admin/settings");
}
