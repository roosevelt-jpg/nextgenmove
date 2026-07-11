import { redirect } from "next/navigation";
import { PORTAL_HOME } from "@/lib/auth/constants";

export default function AdminHomePage() {
  redirect(PORTAL_HOME.admin);
}
