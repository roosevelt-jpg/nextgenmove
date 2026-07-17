import { adminDb } from "@/lib/firebase-admin";
import { notifyAdminPending } from "@/lib/email/notify";
import { createNotification } from "@/lib/notifications/create";
import { shouldSendEmail } from "@/lib/email/preferences";

/** Email + in-app notify all active admins about a new public form / pending item. */
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
      const data = doc.data();
      const email = String(data.email ?? "").trim();
      const adminId = doc.id;

      const allowPending = await shouldSendEmail({
        userId: adminId,
        role: "admin",
        preferenceKey: "pending_requests",
      });
      if (!allowPending) continue;

      if (email.includes("@")) {
        void notifyAdminPending({
          adminEmail: email,
          adminUserId: adminId,
          summary,
          request,
        });
      }

      void createNotification({
        userId: adminId,
        type: "pending",
        title: "New pending request",
        body: summary,
        link: "/admin/dashboard",
      });
    }
  } catch (error) {
    console.error("notify_admins_pending_failed", error);
  }
}
