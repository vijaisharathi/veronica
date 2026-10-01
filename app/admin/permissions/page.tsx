import { redirect } from "next/navigation";

export default function AdminPermissionsRedirect() {
  redirect("/admin/roles");
}
