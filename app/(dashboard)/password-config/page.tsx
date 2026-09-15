import { redirect } from "next/navigation";

/** Legacy path ΓÇö keep working after rename to /config */
export default function PasswordConfigRedirect() {
  redirect("/config");
}
