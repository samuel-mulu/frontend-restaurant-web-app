import { redirect } from "next/navigation";

/** Legacy path — keep working after rename to /config */
export default function PasswordConfigRedirect() {
  redirect("/config");
}
