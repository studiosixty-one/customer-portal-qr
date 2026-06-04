import { redirect } from "next/navigation";

export default function Home() {
  // This is an admin tool; send the root to the admin area (which redirects to
  // /login when signed out). Dynamic QR short links live at /q/[slug].
  redirect("/admin");
}
