import { adminDb } from "@/lib/firebase-admin";
import { PROFILE_UNLOCK_TYPE } from "@/lib/employer/profile-unlock";
import { generateGeminiReply } from "@/lib/ai/gemini";
import { anonymizedDisplayName } from "@/lib/employer/student-visibility";

/** Roles allowed to invoke NGM Assistant admin tools. */
export function canUseAssistantTools(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin" || role === "ops";
}

export type AssistantToolName =
  | "list_pending_evidence"
  | "summarize_unlock_queue"
  | "move_os_sla_counts"
  | "draft_crm_reply";

/** Gemini functionDeclarations for admin tool calling. */
export const ASSISTANT_TOOL_DECLARATIONS = [
  {
    name: "list_pending_evidence",
    description:
      "List evidence items awaiting admin verification (id, studentId, kind, label). Use for ops queues.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "INTEGER",
          description: "Max items to return (default 20, max 40)",
        },
      },
    },
  },
  {
    name: "summarize_unlock_queue",
    description:
      "Summarize pending employer profile-unlock requests (counts and short queue).",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "INTEGER",
          description: "Max pending items to include (default 15, max 40)",
        },
      },
    },
  },
  {
    name: "move_os_sla_counts",
    description:
      "Return Move OS operational counts: pending evidence, SLA-breached moves, active moves, ready bench, locked escrows.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "draft_crm_reply",
    description:
      "Draft a CRM reply email/message body only. Does not send. Provide topic and optional contactSubmissionId, companyId, or studentId for context.",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: {
          type: "STRING",
          description: "What the reply should address",
        },
        tone: {
          type: "STRING",
          description: "Optional tone, e.g. professional, warm, concise",
        },
        contactSubmissionId: {
          type: "STRING",
          description: "Optional contact_submissions document id",
        },
        companyId: {
          type: "STRING",
          description: "Optional companies document id",
        },
        studentId: {
          type: "STRING",
          description: "Optional students document id",
        },
      },
      required: ["topic"],
    },
  },
] as const;

function clampLimit(raw: unknown, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.floor(n));
}

async function listPendingEvidence(limit: number): Promise<string> {
  const snap = await adminDb
    .collection("evidence_items")
    .where("status", "==", "pending")
    .limit(limit)
    .get();

  if (snap.empty) {
    return JSON.stringify({ count: 0, items: [] });
  }

  const items = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      studentId: String(d.studentId ?? ""),
      kind: String(d.kind ?? ""),
      label: String(d.label ?? d.kind ?? ""),
      createdAt: d.createdAt == null ? null : String(d.createdAt),
    };
  });

  return JSON.stringify({ count: items.length, items });
}

async function summarizeUnlockQueue(limit: number): Promise<string> {
  const snap = await adminDb
    .collection("requests")
    .where("type", "==", PROFILE_UNLOCK_TYPE)
    .get();

  let pending = 0;
  let approved = 0;
  let declined = 0;
  const pendingItems: Array<Record<string, string | null>> = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const status = String(d.status ?? "pending");
    if (status === "pending") {
      pending += 1;
      if (pendingItems.length < limit) {
        const studentId = String(d.studentId ?? "");
        pendingItems.push({
          id: doc.id,
          companyId: String(d.companyId ?? ""),
          studentId,
          candidateLabel:
            typeof d.payload?.candidateLabel === "string"
              ? d.payload.candidateLabel
              : anonymizedDisplayName(studentId),
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
        });
      }
    } else if (status === "approved") {
      approved += 1;
    } else if (status === "declined") {
      declined += 1;
    }
  }

  return JSON.stringify({
    pending,
    approved,
    declined,
    total: snap.size,
    pendingSample: pendingItems,
  });
}

async function moveOsSlaCounts(): Promise<string> {
  const [
    pendingEvidence,
    slaBreached,
    activeMoves,
    readyBench,
    lockedEscrows,
  ] = await Promise.all([
    adminDb
      .collection("evidence_items")
      .where("status", "==", "pending")
      .limit(200)
      .get(),
    adminDb
      .collection("move_itineraries")
      .where("status", "==", "sla_breached")
      .limit(200)
      .get(),
    adminDb
      .collection("move_itineraries")
      .where("status", "==", "active")
      .limit(200)
      .get(),
    adminDb
      .collection("students")
      .where("benchStatus", "==", "ready")
      .limit(200)
      .get(),
    adminDb
      .collection("credit_escrows")
      .where("status", "==", "locked")
      .limit(200)
      .get(),
  ]);

  return JSON.stringify({
    pendingEvidence: pendingEvidence.size,
    slaBreachedMoves: slaBreached.size,
    activeMoves: activeMoves.size,
    readyBench: readyBench.size,
    lockedEscrows: lockedEscrows.size,
    note: "Counts capped at 200 per query; treat as operational snapshot.",
  });
}

async function draftCrmReply(args: Record<string, unknown>): Promise<string> {
  const topic = String(args.topic ?? "").trim();
  if (!topic) {
    return JSON.stringify({ error: "topic_required" });
  }
  const tone = String(args.tone ?? "professional").trim() || "professional";
  const contextBits: string[] = [];

  const contactSubmissionId = String(args.contactSubmissionId ?? "").trim();
  if (contactSubmissionId) {
    const snap = await adminDb
      .collection("contact_submissions")
      .doc(contactSubmissionId)
      .get();
    if (snap.exists) {
      const d = snap.data()!;
      contextBits.push(
        `Contact submission: name=${String(d.name ?? "")}; email=${String(d.email ?? "")}; subject=${String(d.subject ?? "")}; message=${String(d.message ?? "").slice(0, 800)}`,
      );
    }
  }

  const companyId = String(args.companyId ?? "").trim();
  if (companyId) {
    const snap = await adminDb.collection("companies").doc(companyId).get();
    if (snap.exists) {
      const d = snap.data()!;
      contextBits.push(
        `Company: name=${String(d.name ?? "")}; industry=${String(d.industry ?? "")}; contact=${String(d.contactName ?? "")}`,
      );
    }
  }

  const studentId = String(args.studentId ?? "").trim();
  if (studentId) {
    const snap = await adminDb.collection("students").doc(studentId).get();
    if (snap.exists) {
      const d = snap.data()!;
      contextBits.push(
        `Student: firstName=${String(d.firstName ?? "")}; sector=${String(d.sector ?? "")}; nationality=${String(d.nationality ?? "")}`,
      );
    }
  }

  const draft = await generateGeminiReply({
    system: `You draft CRM replies for Nextgenmove staff.
Return ONLY the message body text — no subject line, no meta commentary, no markdown fences.
Tone: ${tone}.
Do not invent salaries, visa guarantees, or confidential deal terms.
Keep it concise and actionable.`,
    userMessage: `Topic: ${topic}\n\nContext:\n${contextBits.length ? contextBits.join("\n") : "(none)"}`,
  });

  return JSON.stringify({ draft });
}

export async function executeAssistantTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<string> {
  switch (name as AssistantToolName) {
    case "list_pending_evidence":
      return listPendingEvidence(clampLimit(args.limit, 20, 40));
    case "summarize_unlock_queue":
      return summarizeUnlockQueue(clampLimit(args.limit, 15, 40));
    case "move_os_sla_counts":
      return moveOsSlaCounts();
    case "draft_crm_reply":
      return draftCrmReply(args);
    default:
      return JSON.stringify({ error: "unknown_tool", name });
  }
}

/**
 * Pragmatic intent detection: when the admin message clearly asks for a tool,
 * run it and return a context block to inject before generation.
 */
export async function runToolsFromIntentKeywords(
  message: string,
): Promise<string | null> {
  const lower = message.toLowerCase();
  const results: string[] = [];

  // Explicit JSON tool request: {"tool":"list_pending_evidence","args":{}}
  const jsonMatch = message.match(
    /\{\s*"tool"\s*:\s*"([a-z_]+)"\s*(?:,\s*"args"\s*:\s*(\{[\s\S]*?\}))?\s*\}/i,
  );
  if (jsonMatch) {
    const name = jsonMatch[1]!;
    let args: Record<string, unknown> = {};
    if (jsonMatch[2]) {
      try {
        args = JSON.parse(jsonMatch[2]) as Record<string, unknown>;
      } catch {
        args = {};
      }
    }
    const allowed = ASSISTANT_TOOL_DECLARATIONS.some((t) => t.name === name);
    if (allowed) {
      results.push(
        `${name}: ${await executeAssistantTool(name, args)}`,
      );
    }
  }

  if (
    /pending\s+evidence|evidence\s+queue|list\s+evidence|verify\s+evidence/.test(
      lower,
    )
  ) {
    results.push(
      `list_pending_evidence: ${await executeAssistantTool("list_pending_evidence", {})}`,
    );
  }
  if (
    /unlock\s+queue|profile\s+unlock|pending\s+unlock|summarize\s+unlock/.test(
      lower,
    )
  ) {
    results.push(
      `summarize_unlock_queue: ${await executeAssistantTool("summarize_unlock_queue", {})}`,
    );
  }
  if (
    /sla\s+count|move\s*os\s+sla|arrival\s+sla|breached\s+move|ops\s+counts/.test(
      lower,
    )
  ) {
    results.push(
      `move_os_sla_counts: ${await executeAssistantTool("move_os_sla_counts", {})}`,
    );
  }
  if (/draft\s+(crm\s+)?reply|draft\s+(an?\s+)?email|compose\s+reply/.test(lower)) {
    results.push(
      `draft_crm_reply: ${await executeAssistantTool("draft_crm_reply", {
        topic: message.slice(0, 500),
        tone: "professional",
      })}`,
    );
  }

  if (!results.length) return null;
  return `Admin tool results (use these; do not invent queue data):\n${results.join("\n\n")}`;
}
