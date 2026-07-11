import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { CrmImportTarget } from "@/lib/admin/crm-import-parse";

export interface CrmImportRowResult {
  row: number;
  email: string;
  action: "created" | "updated" | "skipped";
  id?: string;
  error?: string;
}

export interface CrmImportSummary {
  target: CrmImportTarget;
  created: number;
  updated: number;
  skipped: number;
  results: CrmImportRowResult[];
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseSkills(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loadEmailIndex(
  target: CrmImportTarget,
): Promise<Map<string, string>> {
  const collection = target === "students" ? "students" : "companies";
  const emailField = target === "students" ? "email" : "contactEmail";
  const snap = await adminDb.collection(collection).get();
  const map = new Map<string, string>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const email = normalizeEmail(String(data[emailField] ?? ""));
    if (email) map.set(email, doc.id);
  }

  return map;
}

function buildStudentPayload(row: Record<string, string>) {
  const statusRaw = (row.status ?? "active").toLowerCase();
  const status =
    statusRaw === "placed" || statusRaw === "inactive" ? statusRaw : "active";

  return stripUndefined({
    fullName: row.fullName?.trim() ?? "",
    email: normalizeEmail(row.email ?? ""),
    phone: row.phone?.trim() || null,
    nationality: row.nationality?.trim() || null,
    sector: row.sector?.trim() || "",
    seniority: row.seniority?.trim() || "",
    currentCity: row.currentCity?.trim() || "",
    targetCities: [],
    bio: row.bio?.trim() || "",
    skills: parseSkills(row.skills),
    availability: row.availability?.trim() || "",
    linkedinUrl: row.linkedinUrl?.trim() || null,
    portfolioUrl: row.portfolioUrl?.trim() || null,
    photoUrl: null,
    cvUrl: null,
    credits: 0,
    status,
    importSource: "admin_csv",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function buildCompanyPayload(row: Record<string, string>) {
  const planRaw = (row.plan ?? "").toLowerCase().replace(/\s+/g, "_");
  const plan =
    planRaw === "track_a" || planRaw === "track_b" || planRaw === "a"
      ? planRaw === "a"
        ? "track_a"
        : planRaw
      : planRaw === "b"
        ? "track_b"
        : null;

  const subRaw = (row.subscriptionStatus ?? "pending").toLowerCase();
  const subscriptionStatus =
    subRaw === "active" || subRaw === "inactive" ? subRaw : "pending";

  return stripUndefined({
    name: row.name?.trim() ?? "",
    contactName: row.contactName?.trim() || null,
    contactEmail: normalizeEmail(row.contactEmail ?? row.email ?? ""),
    contactPhone: row.contactPhone?.trim() || null,
    nationality: row.nationality?.trim() || null,
    industry: row.industry?.trim() || "",
    website: row.website?.trim() || null,
    hiringNeeds: row.hiringNeeds?.trim() || null,
    logoUrl: null,
    plan,
    subscriptionStatus,
    requirements: [],
    preferredLocations: [],
    requirementTags: [],
    importSource: "admin_csv",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function applyCrmImportRows(options: {
  target: CrmImportTarget;
  rows: Record<string, string>[];
  actorId: string;
}): Promise<CrmImportSummary> {
  const { target, rows, actorId } = options;
  const emailIndex = await loadEmailIndex(target);
  const results: CrmImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const rowNumber = i + 2; // header is row 1
    const row = rows[i]!;

    if (target === "students") {
      const email = normalizeEmail(row.email ?? "");
      const fullName = (row.fullName ?? "").trim();

      if (!fullName || !email || !isValidEmail(email)) {
        skipped += 1;
        results.push({
          row: rowNumber,
          email,
          action: "skipped",
          error: "missing_or_invalid_required",
        });
        continue;
      }

      const payload = buildStudentPayload(row);
      const existingId = emailIndex.get(email);

      if (existingId) {
        await adminDb.collection("students").doc(existingId).set(
          stripUndefined({
            ...payload,
            importedBy: actorId,
          }),
          { merge: true },
        );
        updated += 1;
        results.push({
          row: rowNumber,
          email,
          action: "updated",
          id: existingId,
        });
      } else {
        const ref = adminDb.collection("students").doc();
        await ref.set(
          stripUndefined({
            id: ref.id,
            userId: null,
            ...payload,
            importedBy: actorId,
            createdAt: FieldValue.serverTimestamp(),
          }),
        );
        emailIndex.set(email, ref.id);
        created += 1;
        results.push({
          row: rowNumber,
          email,
          action: "created",
          id: ref.id,
        });
      }
      continue;
    }

    const email = normalizeEmail(row.contactEmail ?? row.email ?? "");
    const name = (row.name ?? "").trim();

    if (!name || !email || !isValidEmail(email)) {
      skipped += 1;
      results.push({
        row: rowNumber,
        email,
        action: "skipped",
        error: "missing_or_invalid_required",
      });
      continue;
    }

    const payload = buildCompanyPayload(row);
    const existingId = emailIndex.get(email);

    if (existingId) {
      await adminDb.collection("companies").doc(existingId).set(
        stripUndefined({
          ...payload,
          importedBy: actorId,
        }),
        { merge: true },
      );
      updated += 1;
      results.push({
        row: rowNumber,
        email,
        action: "updated",
        id: existingId,
      });
    } else {
      const ref = adminDb.collection("companies").doc();
      await ref.set(
        stripUndefined({
          id: ref.id,
          userId: null,
          ...payload,
          importedBy: actorId,
          createdAt: FieldValue.serverTimestamp(),
        }),
      );
      emailIndex.set(email, ref.id);
      created += 1;
      results.push({
        row: rowNumber,
        email,
        action: "created",
        id: ref.id,
      });
    }
  }

  return { target, created, updated, skipped, results };
}
