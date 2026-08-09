/**
 * Printable Family Trust Pack HTML from a sponsor dashboard payload.
 */

type SponsorDashboard = Awaited<
  ReturnType<typeof import("./sponsor").buildSponsorDashboard>
>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSponsorProgressHtml(input: {
  sponsorName: string;
  dashboard: SponsorDashboard;
  generatedAt?: string;
}): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const student = input.dashboard.student;
  const evidence = input.dashboard.evidence;
  const move = input.dashboard.move;
  const milestones = move?.milestones ?? [];

  const evidenceRows = evidence
    .map(
      (item) =>
        `<tr><td>${escapeHtml(String(item.label ?? item.kind))}</td><td>${escapeHtml(String(item.status))}</td><td>${escapeHtml(String(item.verifiedAt ?? "—"))}</td></tr>`,
    )
    .join("");

  const milestoneRows = milestones
    .map(
      (m) =>
        `<tr><td>${escapeHtml(String(m.label))}</td><td>${escapeHtml(String(m.status))}</td><td>${escapeHtml(String(m.dueAt ?? "—"))}</td><td>${escapeHtml(String(m.blocker ?? "—"))}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Nextgenmove · Progress report</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Inter, system-ui, sans-serif; color: #1A1A18; margin: 0; padding: 32px; background: #fff; }
    h1 { font-family: "Playfair Display", Georgia, serif; font-size: 28px; margin: 0 0 8px; }
    h2 { font-family: "Playfair Display", Georgia, serif; font-size: 18px; margin: 28px 0 10px; }
    .eyebrow { font-family: "JetBrains Mono", monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #3C3489; }
    .muted { color: #6B6A63; font-size: 13px; }
    .score { font-family: "Playfair Display", Georgia, serif; font-size: 40px; color: #C97A2E; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #E7E4D9; text-align: left; padding: 8px 6px; vertical-align: top; }
    th { font-family: "JetBrains Mono", monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #3C3489; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <p class="eyebrow">Family Trust Pack</p>
  <h1>Progress report</h1>
  <p class="muted">Prepared for ${escapeHtml(input.sponsorName)} · ${escapeHtml(generatedAt)}</p>
  <p class="muted">Read-only view of ${escapeHtml(String(student.displayName))}’s Dubai-ready progress. Employer deal terms are never included.</p>

  <h2>Readiness</h2>
  <p class="score">${escapeHtml(String(student.dubaiReadyScore))}</p>
  <p class="muted">Bench status: ${escapeHtml(String(student.benchStatus))}</p>

  <h2>Evidence pack</h2>
  <table>
    <thead><tr><th>Item</th><th>Status</th><th>Verified</th></tr></thead>
    <tbody>${evidenceRows || `<tr><td colspan="3">No evidence items yet.</td></tr>`}</tbody>
  </table>

  <h2>Move itinerary</h2>
  ${
    move
      ? `<p class="muted">Status: ${escapeHtml(String(move.status))} · Start: ${escapeHtml(String(move.startDate ?? "—"))}</p>
  <table>
    <thead><tr><th>Milestone</th><th>Status</th><th>Due</th><th>Blocker</th></tr></thead>
    <tbody>${milestoneRows || `<tr><td colspan="4">No sponsor-visible milestones.</td></tr>`}</tbody>
  </table>`
      : `<p class="muted">No active move yet.</p>`
  }

  <p class="no-print muted" style="margin-top:32px">Use your browser’s Print dialog to save as PDF.</p>
  <script class="no-print">window.addEventListener("load", function () { /* printable HTML ready */ });</script>
</body>
</html>`;
}

export function buildSponsorWhatsAppDigestBody(input: {
  sponsorName: string;
  dashboard: SponsorDashboard;
  eventNote?: string | null;
}): string {
  const student = input.dashboard.student;
  const move = input.dashboard.move;
  const doneCount =
    move?.milestones.filter((m) => m.status === "done").length ?? 0;
  const total = move?.milestones.length ?? 0;
  const eventLine = input.eventNote ? ` Update: ${input.eventNote}.` : "";
  return `Nextgenmove · Hi ${input.sponsorName}, ${student.displayName} readiness score is ${student.dubaiReadyScore} (bench: ${student.benchStatus}). Move milestones ${doneCount}/${total} done.${eventLine} Open your trust link for full detail.`;
}
