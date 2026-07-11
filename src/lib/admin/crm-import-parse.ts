/**
 * Parse CRM import files (CSV / Excel) into row objects keyed by normalized headers.
 */

export type CrmImportTarget = "students" | "companies";

const STUDENT_ALIASES: Record<string, string> = {
  fullname: "fullName",
  "full name": "fullName",
  name: "fullName",
  email: "email",
  "e-mail": "email",
  phone: "phone",
  mobile: "phone",
  nationality: "nationality",
  sector: "sector",
  seniority: "seniority",
  city: "currentCity",
  currentcity: "currentCity",
  "current city": "currentCity",
  bio: "bio",
  skills: "skills",
  availability: "availability",
  linkedin: "linkedinUrl",
  linkedinurl: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  portfolio: "portfolioUrl",
  portfoliourl: "portfolioUrl",
  status: "status",
};

const COMPANY_ALIASES: Record<string, string> = {
  name: "name",
  company: "name",
  companyname: "name",
  "company name": "name",
  contactname: "contactName",
  "contact name": "contactName",
  contact: "contactName",
  contactemail: "contactEmail",
  "contact email": "contactEmail",
  email: "contactEmail",
  "e-mail": "contactEmail",
  contactphone: "contactPhone",
  "contact phone": "contactPhone",
  phone: "contactPhone",
  mobile: "contactPhone",
  nationality: "nationality",
  industry: "industry",
  website: "website",
  hiringneeds: "hiringNeeds",
  "hiring needs": "hiringNeeds",
  plan: "plan",
  subscriptionstatus: "subscriptionStatus",
  "subscription status": "subscriptionStatus",
};

export function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mapHeader(
  raw: string,
  target: CrmImportTarget,
): string | null {
  const key = normalizeHeader(raw);
  const aliases = target === "students" ? STUDENT_ALIASES : COMPANY_ALIASES;
  return aliases[key] ?? aliases[key.replace(/\s/g, "")] ?? null;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  return lines.map(splitCsvLine);
}

export function rowsFromMatrix(
  matrix: string[][],
  target: CrmImportTarget,
): Record<string, string>[] {
  if (matrix.length < 2) return [];

  const headerRow = matrix[0]!;
  const mappedKeys = headerRow.map((h) => mapHeader(h, target));

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const line = matrix[r]!;
    const row: Record<string, string> = {};
    let hasValue = false;

    for (let c = 0; c < mappedKeys.length; c += 1) {
      const key = mappedKeys[c];
      if (!key) continue;
      const value = String(line[c] ?? "").trim();
      if (!value) continue;
      row[key] = value;
      hasValue = true;
    }

    if (hasValue) rows.push(row);
  }

  return rows;
}

export const STUDENT_TEMPLATE_HEADERS = [
  "fullName",
  "email",
  "phone",
  "nationality",
  "sector",
  "seniority",
  "currentCity",
  "skills",
  "availability",
  "linkedinUrl",
  "status",
] as const;

export const COMPANY_TEMPLATE_HEADERS = [
  "name",
  "contactName",
  "contactEmail",
  "contactPhone",
  "nationality",
  "industry",
  "website",
  "hiringNeeds",
  "plan",
  "subscriptionStatus",
] as const;

export function buildCsvTemplate(target: CrmImportTarget): string {
  const headers =
    target === "students" ? STUDENT_TEMPLATE_HEADERS : COMPANY_TEMPLATE_HEADERS;
  return `${headers.join(",")}\n`;
}
