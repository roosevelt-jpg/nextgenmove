import { createNotification } from "@/lib/notifications/create";
import { sendRawEmail } from "@/lib/email/send";

export type MoveOsNotifyKind =
  | "bench_reserved"
  | "bench_expired"
  | "dual_commit_locked"
  | "sprint_started"
  | "sprint_submitted"
  | "sprint_go"
  | "sprint_no_go"
  | "arrival_sla_warning"
  | "arrival_sla_breach"
  | "sponsor_link_created";

const TITLES: Record<MoveOsNotifyKind, string> = {
  bench_reserved: "Bench seat reserved",
  bench_expired: "Bench hold expired",
  dual_commit_locked: "Dual commit locked",
  sprint_started: "Shadow sprint started",
  sprint_submitted: "Shadow sprint submitted",
  sprint_go: "Shadow sprint GO",
  sprint_no_go: "Shadow sprint NO-GO",
  arrival_sla_warning: "Arrival SLA warning",
  arrival_sla_breach: "Arrival SLA breached",
  sponsor_link_created: "Sponsor trust link ready",
};

/** Best-effort Move OS notify: in-app + optional raw email. */
export async function notifyMoveOsParty(options: {
  userId: string;
  kind: MoveOsNotifyKind;
  body: string;
  link?: string;
  emailTo?: string | null;
}): Promise<void> {
  void createNotification({
    userId: options.userId,
    type: "activity",
    title: TITLES[options.kind],
    body: options.body,
    link: options.link,
  });

  if (options.emailTo?.includes("@")) {
    const subject = `Nextgenmove · ${TITLES[options.kind]}`;
    const html = `<p>${options.body}</p>`;
    void sendRawEmail({
      to: options.emailTo,
      subject,
      html,
      text: options.body,
    });
  }
}
