import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { applyCrmImportRows } from "@/lib/admin/crm-import-apply";
import {
  buildCsvTemplate,
  parseCsvText,
  rowsFromMatrix,
  type CrmImportTarget,
} from "@/lib/admin/crm-import-parse";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function"
  );
}

function parseTarget(raw: FormDataEntryValue | null): CrmImportTarget | null {
  const value = String(raw ?? "").trim();
  if (value === "students" || value === "companies") return value;
  return null;
}

function matrixFromWorkbook(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    {
      header: 1,
      defval: "",
      raw: false,
    },
  );
  return raw.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => String(cell ?? "").trim()),
  );
}

/** Download a blank CSV template. */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const target = parseTarget(searchParams.get("target"));
  if (!target) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }

  const csv = buildCsvTemplate(target);
  const filename =
    target === "students"
      ? "venturo-students-import.csv"
      : "venturo-companies-import.csv";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const target = parseTarget(form.get("target"));
    const file = form.get("file");

    if (!target) {
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    }
    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const filename = String(file.name || "").toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let matrix: string[][] = [];
    if (filename.endsWith(".csv") || file.type.includes("csv")) {
      matrix = parseCsvText(buffer.toString("utf8"));
    } else if (
      filename.endsWith(".xlsx") ||
      filename.endsWith(".xls") ||
      file.type.includes("sheet") ||
      file.type.includes("excel")
    ) {
      matrix = matrixFromWorkbook(buffer);
    } else {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 400 });
    }

    const rows = rowsFromMatrix(matrix, target);
    if (rows.length === 0) {
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({ error: "too_many_rows" }, { status: 400 });
    }

    const summary = await applyCrmImportRows({
      target,
      rows,
      actorId: session.uid,
    });

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "crm_import",
      targetType: target,
      targetId: "bulk",
      metadata: {
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        filename: file.name,
      },
    });

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    console.error(
      "crm_import_failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
}
