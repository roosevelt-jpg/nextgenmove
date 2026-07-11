import { redirect } from "next/navigation";
import { PORTAL_HOME } from "@/lib/auth/constants";

export default function StudentHomePage() {
  redirect(PORTAL_HOME.student);
}
