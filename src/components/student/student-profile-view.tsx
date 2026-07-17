"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

interface WorkEntry {
  company: string;
  title: string;
  from: string;
  to: string;
  description: string;
}

interface StudentProfile {
  id: string;
  fullName: string;
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  bio: string;
  skills: string[];
  cvUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  availability: string;
  photoUrl: string | null;
  workExperienceEntries: WorkEntry[];
}

export interface StudentProfileViewProps {
  labels: Record<string, string>;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(values: string[]): string {
  return values.join(", ");
}

const EMPTY_ENTRY: WorkEntry = {
  company: "",
  title: "",
  from: "",
  to: "",
  description: "",
};

export function StudentProfileView({ labels }: StudentProfileViewProps) {
  const { taxonomies, isLoading } = useTaxonomies();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [completeness, setCompleteness] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/student/profile");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      student: StudentProfile & {
        workExperienceEntries?: WorkEntry[];
        githubUrl?: string | null;
      };
      profileCompleteness: number;
    };

    setProfile({
      ...data.student,
      githubUrl: data.student.githubUrl ?? null,
      workExperienceEntries: (data.student.workExperienceEntries ?? []).map((e) => ({
        company: e.company ?? "",
        title: e.title ?? "",
        from: e.from ?? "",
        to: e.to ?? "",
        description: e.description ?? "",
      })),
    });
    setCompleteness(data.profileCompleteness);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        workExperienceEntries: profile.workExperienceEntries
          .filter((e) => e.company.trim() && e.title.trim() && e.from.trim())
          .map((e) => ({
            company: e.company.trim(),
            title: e.title.trim(),
            from: e.from.trim(),
            to: e.to.trim() || null,
            description: e.description.trim(),
          })),
      }),
    });

    setIsSaving(false);

    if (response.ok) {
      const data = (await response.json()) as {
        profileCompleteness: number;
      };
      setCompleteness(data.profileCompleteness);
      setStatusMessage(labels.saveSuccess ?? "");
      await loadProfile();
    } else {
      setStatusMessage(labels.saveError ?? "");
    }
  };

  if (!profile) {
    return null;
  }

  const entries = profile.workExperienceEntries ?? [];

  return (
    <form className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" onSubmit={saveProfile}>
      <div className="space-y-4">
        {labels.profileTitle ? (
          <h1 className="font-serif text-2xl text-text-primary">{labels.profileTitle}</h1>
        ) : null}
        {labels.profileCompleteness ? (
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              {labels.profileCompleteness.replace("{percent}", String(completeness))}
            </p>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={completeness}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, completeness))}%`,
                  backgroundImage:
                    completeness >= 80
                      ? "linear-gradient(90deg, var(--fill-accent), var(--text-accent), var(--text-success))"
                      : completeness >= 40
                        ? "linear-gradient(90deg, var(--fill-accent), var(--text-accent))"
                        : "linear-gradient(90deg, var(--fill-accent-strong), var(--fill-accent))",
                }}
              />
            </div>
          </div>
        ) : null}

        <Input
          id="student-full-name"
          required
          aria-label={labels.fullName || "Full name"}
          label={labels.fullName || "Full name"}
          value={profile.fullName}
          onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
        />
        <Select
          id="student-sector"
          required
          disabled={isLoading}
          aria-label={labels.sector || "Sector"}
          label={labels.sector || "Sector"}
          value={profile.sector}
          options={taxonomies.sector ?? []}
          onChange={(event) => setProfile({ ...profile, sector: event.target.value })}
        />
        <Select
          id="student-seniority"
          required
          disabled={isLoading}
          aria-label={labels.seniority || "Seniority"}
          label={labels.seniority || "Seniority"}
          value={profile.seniority}
          options={taxonomies.seniority ?? []}
          onChange={(event) => setProfile({ ...profile, seniority: event.target.value })}
        />
        <Input
          id="student-current-city"
          required
          aria-label={labels.currentCity || "Current city"}
          label={labels.currentCity || "Current city"}
          value={profile.currentCity}
          onChange={(event) => setProfile({ ...profile, currentCity: event.target.value })}
        />
        <Input
          id="student-target-cities"
          aria-label={labels.targetCities || "Target cities"}
          label={labels.targetCities || "Target cities"}
          value={joinList(profile.targetCities)}
          onChange={(event) =>
            setProfile({ ...profile, targetCities: splitList(event.target.value) })
          }
        />
        <Textarea
          id="student-bio"
          aria-label={labels.bio || "Bio"}
          label={labels.bio || "Bio"}
          value={profile.bio}
          onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
        />
        <Input
          id="student-skills"
          aria-label={labels.skills || "Skills"}
          label={labels.skills || "Skills"}
          value={joinList(profile.skills)}
          onChange={(event) =>
            setProfile({ ...profile, skills: splitList(event.target.value) })
          }
        />
        <Input
          id="student-availability"
          aria-label={labels.availability || "Availability"}
          label={labels.availability || "Availability"}
          value={profile.availability}
          onChange={(event) => setProfile({ ...profile, availability: event.target.value })}
        />
        <Input
          id="student-linkedin"
          type="url"
          aria-label={labels.linkedinUrl || "LinkedIn URL"}
          label={labels.linkedinUrl || "LinkedIn URL"}
          value={profile.linkedinUrl ?? ""}
          onChange={(event) =>
            setProfile({ ...profile, linkedinUrl: event.target.value || null })
          }
        />
        <Input
          id="student-github"
          type="url"
          aria-label={labels.githubUrl || "GitHub URL"}
          label={labels.githubUrl || "GitHub URL"}
          value={profile.githubUrl ?? ""}
          onChange={(event) =>
            setProfile({ ...profile, githubUrl: event.target.value || null })
          }
        />
        <Input
          id="student-portfolio"
          type="url"
          aria-label={labels.portfolioUrl || "Portfolio URL"}
          label={labels.portfolioUrl || "Portfolio URL"}
          value={profile.portfolioUrl ?? ""}
          onChange={(event) =>
            setProfile({ ...profile, portfolioUrl: event.target.value || null })
          }
        />

        <section className="space-y-3">
          <h2 className="font-medium text-text-primary">
            {labels.workExperienceEntriesLabel || "Work experience"}
          </h2>
          {entries.map((entry, index) => (
            <div
              key={index}
              className="space-y-2 rounded-radius border border-border p-3"
            >
              <Input
                label={labels.companyLabel || "Company"}
                value={entry.company}
                onChange={(e) => {
                  const next = [...entries];
                  next[index] = { ...entry, company: e.target.value };
                  setProfile({ ...profile, workExperienceEntries: next });
                }}
              />
              <Input
                label={labels.jobTitleLabel || "Title"}
                value={entry.title}
                onChange={(e) => {
                  const next = [...entries];
                  next[index] = { ...entry, title: e.target.value };
                  setProfile({ ...profile, workExperienceEntries: next });
                }}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  label={labels.fromLabel || "From"}
                  value={entry.from}
                  onChange={(e) => {
                    const next = [...entries];
                    next[index] = { ...entry, from: e.target.value };
                    setProfile({ ...profile, workExperienceEntries: next });
                  }}
                />
                <Input
                  label={labels.toLabel || "To"}
                  value={entry.to}
                  onChange={(e) => {
                    const next = [...entries];
                    next[index] = { ...entry, to: e.target.value };
                    setProfile({ ...profile, workExperienceEntries: next });
                  }}
                />
              </div>
              <Textarea
                label={labels.workExperienceDescriptionLabel || "Description"}
                value={entry.description}
                onChange={(e) => {
                  const next = [...entries];
                  next[index] = { ...entry, description: e.target.value };
                  setProfile({ ...profile, workExperienceEntries: next });
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setProfile({
                    ...profile,
                    workExperienceEntries: entries.filter((_, i) => i !== index),
                  })
                }
              >
                {labels.removeLabel || "Remove"}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setProfile({
                ...profile,
                workExperienceEntries: [...entries, { ...EMPTY_ENTRY }],
              })
            }
          >
            {labels.addWorkExperienceLabel || "Add experience"}
          </Button>
        </section>
      </div>

      <aside className="space-y-4 rounded-radius border border-border bg-grad-card p-5">
        {labels.documentsTitle ? (
          <h2 className="font-medium text-text-primary">{labels.documentsTitle}</h2>
        ) : null}
        <FileUpload
          storagePath={`students/${profile.id}/cv`}
          uploadEndpoint="/api/student/upload"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          label={labels.cvUpload || "CV / resume"}
          dropzoneContent={labels.cvDropzone || "PDF or Word (.doc, .docx)"}
          progressLabel={labels.uploadProgress || "Uploading…"}
          onUploadComplete={(result: FileUploadMetadata) =>
            setProfile({ ...profile, cvUrl: result.url })
          }
        />
        {profile.cvUrl ? (
          <a
            href={profile.cvUrl}
            target="_blank"
            rel="noreferrer"
            className="link-brand text-sm"
          >
            {labels.cvUploaded || "View uploaded CV"}
          </a>
        ) : null}
        <FileUpload
          storagePath={`students/${profile.id}/photo`}
          uploadEndpoint="/api/student/upload"
          accept="image/*"
          label={labels.photoUpload || "Profile photo"}
          dropzoneContent={labels.photoDropzone || "JPG or PNG"}
          progressLabel={labels.uploadProgress || "Uploading…"}
          onUploadComplete={(result: FileUploadMetadata) =>
            setProfile({ ...profile, photoUrl: result.url })
          }
        />
        {statusMessage ? (
          <p className="text-sm text-text-secondary" role="status">
            {statusMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {labels.save || "Save"}
        </Button>
      </aside>
    </form>
  );
}
