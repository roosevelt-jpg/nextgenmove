import { describe, expect, it } from "vitest";
import {
  mapHeader,
  parseCsvText,
  rowsFromMatrix,
} from "@/lib/admin/crm-import-parse";

describe("crm import parse", () => {
  it("maps student and company header aliases", () => {
    expect(mapHeader("Full Name", "students")).toBe("fullName");
    expect(mapHeader("E-mail", "students")).toBe("email");
    expect(mapHeader("Company Name", "companies")).toBe("name");
    expect(mapHeader("Contact Email", "companies")).toBe("contactEmail");
  });

  it("parses CSV with quoted commas", () => {
    const matrix = parseCsvText(
      'fullName,email,skills\n"Doe, Jane",jane@example.com,"react, node"\n',
    );
    const rows = rowsFromMatrix(matrix, "students");
    expect(rows).toEqual([
      {
        fullName: "Doe, Jane",
        email: "jane@example.com",
        skills: "react, node",
      },
    ]);
  });
});
