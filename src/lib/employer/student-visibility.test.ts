import { describe, expect, it } from "vitest";
import {
  anonymizedDisplayName,
  isStudentInitiatedMatch,
  normalizeAssessment,
  projectStudentForEmployer,
  redactContactLeak,
} from "@/lib/employer/student-visibility";

describe("student visibility / anonymization", () => {
  it("builds a stable anonymized display name", () => {
    expect(anonymizedDisplayName("abc123xyz")).toBe("Candidate · ABC1");
  });

  it("redacts emails and phones from free text", () => {
    expect(
      redactContactLeak("Reach me at jane@example.com or +971 50 123 4567"),
    ).toBe("Reach me at [redacted] or [redacted]");
  });

  it("hides identity fields until unlocked", () => {
    const locked = projectStudentForEmployer(
      {
        id: "stu1",
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+971500000000",
        photoUrl: "https://example.com/a.jpg",
        skills: ["TypeScript"],
        bio: "Strong engineer",
        workExperience: "Built systems. Contact ada@example.com",
        workExperienceEntries: [
          {
            company: "Secret Co",
            title: "Engineer",
            from: "2020",
            to: "2022",
            description: "Owned APIs",
          },
        ],
        education: [{ institution: "MIT", degree: "BSc", year: "2019" }],
        assessment: { overallScore: 88, sections: [{ name: "Comms", score: 9 }] },
      },
      { identityUnlocked: false },
    );

    expect(locked.displayName).toBe("Candidate · STU1");
    expect(locked.fullName).toBe("");
    expect(locked.email).toBe("");
    expect(locked.phone).toBeNull();
    expect(locked.photoUrl).toBeNull();
    expect(locked.skills).toEqual(["TypeScript"]);
    expect(locked.workExperienceEntries[0]?.company).toBe("");
    expect(locked.workExperienceEntries[0]?.title).toBe("Engineer");
    expect(locked.education[0]?.institution).toBe("");
    expect(locked.education[0]?.degree).toBe("BSc");
    expect(locked.workExperience).toContain("[redacted]");
    expect(locked.assessment?.overallScore).toBe(88);
  });

  it("reveals identity after unlock", () => {
    const unlocked = projectStudentForEmployer(
      {
        id: "stu1",
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+971500000000",
        photoUrl: "https://example.com/a.jpg",
      },
      { identityUnlocked: true },
    );
    expect(unlocked.displayName).toBe("Ada Lovelace");
    expect(unlocked.email).toBe("ada@example.com");
    expect(unlocked.photoUrl).toBe("https://example.com/a.jpg");
  });

  it("classifies student-initiated matches only", () => {
    expect(isStudentInitiatedMatch({ source: "student_applied" })).toBe(true);
    expect(isStudentInitiatedMatch({ jobPostingId: "job1" })).toBe(true);
    expect(isStudentInitiatedMatch({ source: "company_browsed" })).toBe(false);
    expect(isStudentInitiatedMatch({ source: "admin_curated" })).toBe(false);
  });

  it("normalizes assessment payloads", () => {
    expect(normalizeAssessment(90)?.overallScore).toBe(90);
    expect(
      normalizeAssessment({
        score: 70,
        sections: [{ label: "Leadership", value: 8, max: 10 }],
      })?.sections[0],
    ).toEqual({
      name: "Leadership",
      score: 8,
      maxScore: 10,
      level: null,
    });
  });
});
