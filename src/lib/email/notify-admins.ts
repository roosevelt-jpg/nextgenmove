import { adminDb } from "@/lib/firebase-admin";
import { notifyAdminPending } from "@/lib/email/notify";

/** Email all active admins about a new public form / pending item. */
export async function notifyAdminsOfPending(
  summary: string,
  request?: Request,
) {
  try {
    const snap = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .where("status", "==", "active")
      .get();

    for (const doc of snap.docs) {
      const email = String(doc.data().email ?? "").trim();
      if (!email.includes("@")) continue;
      void notifyAdminPending({
        adminEmail: email,
        summary,
        request,
      });
    }
  } catch (error) {
    console.error("notify_admins_pending_failed", error);
  }
}
