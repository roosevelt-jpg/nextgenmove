import { describe, expect, it } from "vitest";
import {
  anonymizedEmployerLabel,
  projectCompanyForStudent,
} from "@/lib/marketplace/company-visibility";

describe("company visibility", () => {
  it("builds a stable anonymized employer label from last 4 of id", () => {
    expect(anonymizedEmployerLabel("company-abc123xy")).toBe("Employer · 23XY");
  });

  it("prefers an existing employerLabel", () => {
    expect(anonymizedEmployerLabel("company1", "Employer · CUST")).toBe(
      "Employer · CUST",
    );
  });

  it("hides identity fields until unlocked", () => {
    const locked = projectCompanyForStudent({
      company: {
        id: "co1",
        name: "Acme Corp",
        industry: "Fintech",
        location: "Dubai",
        website: "https://acme.example",
        logoUrl: "https://acme.example/logo.png",
        contactEmail: "hr@acme.example",
        contactName: "Pat",
        phone: "+971500000000",
      },
      unlocked: false,
    });

    expect(locked.displayName).toBe("Employer · CO1");
    expect(locked.name).toBe("");
    expect(locked.contactEmail).toBe("");
    expect(locked.website).toBeNull();
    expect(locked.logoUrl).toBeNull();
    expect(locked.industry).toBe("Fintech");
    expect(locked.location).toBe("Dubai");
    expect(locked.identityUnlocked).toBe(false);
  });

  it("reveals safe identity after unlock", () => {
    const unlocked = projectCompanyForStudent({
      company: {
        id: "co1",
        name: "Acme Corp",
        website: "https://acme.example",
        logoUrl: "https://acme.example/logo.png",
        contactEmail: "hr@acme.example",
        phone: "+971500000000",
      },
      unlocked: true,
    });
    expect(unlocked.displayName).toBe("Acme Corp");
    expect(unlocked.name).toBe("Acme Corp");
    expect(unlocked.contactEmail).toBe("hr@acme.example");
    expect(unlocked.website).toBe("https://acme.example");
    expect(unlocked.logoUrl).toBe("https://acme.example/logo.png");
  });
});
