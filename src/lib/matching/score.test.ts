import { describe, expect, it } from "vitest";
import { computeMatchScore } from "@/lib/matching/score";

const baseStudent = {
  skills: ["typescript", "react"],
  currentCity: "Berlin",
  targetCities: ["Dubai"],
  sector: "Engineering",
  bio: "Full-stack engineer with relocation intent.",
  cvUrl: "https://example.com/cv.pdf",
  fullName: "Alex Candidate",
  seniority: "mid",
  availability: "immediate",
  photoUrl: null,
  linkedinUrl: "https://linkedin.com/in/alex",
  portfolioUrl: null,
};

describe("computeMatchScore", () => {
  it("scores high when skills and location overlap", () => {
    const score = computeMatchScore({
      student: baseStudent,
      company: {
        industry: "Engineering",
        preferredLocations: ["dubai"],
        requirementTags: ["typescript", "react"],
      },
    });

    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores lower when skills miss and location misses", () => {
    const score = computeMatchScore({
      student: {
        ...baseStudent,
        skills: ["cobol"],
        currentCity: "Lyon",
        targetCities: ["Paris"],
      },
      company: {
        industry: "Finance",
        preferredLocations: ["dubai"],
        requirementTags: ["typescript", "react"],
      },
    });

    expect(score).toBeLessThan(50);
  });
});
