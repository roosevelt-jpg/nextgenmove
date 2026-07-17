import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export type NotificationType =
  | "hire"
  | "reject"
  | "interview"
  | "application"
  | "match_update";

export async function createNotification(options: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  const ref = adminDb.collection("notifications").doc();
  await ref.set(
    stripUndefined({
      id: ref.id,
      userId: options.userId,
      type: options.type,
      title: options.title,
      body: options.body,
      link: options.link || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    }),
  );
  return ref.id;
}
