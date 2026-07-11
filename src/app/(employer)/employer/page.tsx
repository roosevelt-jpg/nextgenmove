import { redirect } from "next/navigation";
import { PORTAL_HOME } from "@/lib/auth/constants";

export default function EmployerHomePage() {
  redirect(PORTAL_HOME.company);
}
