"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

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
  availability: string;
  photoUrl: string | null;
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
      student: StudentProfile;
      profileCompleteness: number;
    };

    setProfile(data.student);
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
      body: JSON.stringify(profile),
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

  return (
    <form className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" onSubmit={saveProfile}>
      <div className="space-y-4">
        {labels.profileTitle ? (
          <h1 className="font-serif text-2xl text-text-primary">{labels.profileTitle}</h1>
        ) : null}
        {labels.profileCompleteness ? (
          <p className="text-sm text-text-muted">
            {labels.profileCompleteness.replace("{percent}", String(completeness))}
          </p>
        ) : null}

        <Input
          id="student-full-name"
          required
          aria-label={labels.fullName ?? "full-name"}
          label={labels.fullName}
          value={profile.fullName}
          onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
        />
        <Select
          id="student-sector"
          required
          disabled={isLoading}
          aria-label={labels.sector ?? "sector"}
          label={labels.sector}
          value={profile.sector}
          options={taxonomies.sector ?? []}
          onChange={(event) => setProfile({ ...profile, sector: event.target.value })}
        />
        <Select
          id="student-seniority"
          required
          disabled={isLoading}
          aria-label={labels.seniority ?? "seniority"}
          label={labels.seniority}
          value={profile.seniority}
          options={taxonomies.seniority ?? []}
          onChange={(event) => setProfile({ ...profile, seniority: event.target.value })}
        />
        <Input
          id="student-current-city"
          required
          aria-label={labels.currentCity ?? "current-city"}
          label={labels.currentCity}
          value={profile.currentCity}
          onChange={(event) => setProfile({ ...profile, currentCity: event.target.value })}
        />
        <Input
          id="student-target-cities"
          aria-label={labels.targetCities ?? "target-cities"}
          label={labels.targetCities}
          value={joinList(profile.targetCities)}
          onChange={(event) =>
            setProfile({ ...profile, targetCities: splitList(event.target.value) })
          }
        />
        <Textarea
          id="student-bio"
          aria-label={labels.bio ?? "bio"}
          label={labels.bio}
          value={profile.bio}
          onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
        />
        <Input
          id="student-skills"
          aria-label={labels.skills ?? "skills"}
          label={labels.skills}
          value={joinList(profile.skills)}
          onChange={(event) =>
            setProfile({ ...profile, skills: splitList(event.target.value) })
          }
        />
        <Input
          id="student-availability"
          aria-label={labels.availability ?? "availability"}
          label={labels.availability}
          value={profile.availability}
          onChange={(event) => setProfile({ ...profile, availability: event.target.value })}
        />
        <Input
          id="student-linkedin"
          type="url"
          aria-label={labels.linkedinUrl ?? "linkedin-url"}
          label={labels.linkedinUrl}
          value={profile.linkedinUrl ?? ""}
          onChange={(event) =>
            setProfile({ ...profile, linkedinUrl: event.target.value || null })
          }
        />
        <Input
          id="student-portfolio"
          type="url"
          aria-label={labels.portfolioUrl ?? "portfolio-url"}
          label={labels.portfolioUrl}
          value={profile.portfolioUrl ?? ""}
          onChange={(event) =>
            setProfile({ ...profile, portfolioUrl: event.target.value || null })
          }
        />
      </div>

      <aside className="space-y-4 rounded-radius border border-border bg-surface-2 p-5">
        {labels.documentsTitle ? (
          <h2 className="font-medium text-text-primary">{labels.documentsTitle}</h2>
        ) : null}
        <FileUpload
          storagePath={`students/${profile.id}/cv`}
          accept=".pdf,application/pdf"
          label={labels.cvUpload}
          dropzoneContent={labels.cvDropzone}
          progressLabel={labels.uploadProgress}
          onUploadComplete={(result: FileUploadMetadata) =>
            setProfile({ ...profile, cvUrl: result.url })
          }
        />
        {profile.cvUrl && labels.cvUploaded ? (
          <a
            href={profile.cvUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-text-primary hover:text-text-accent"
          >
            {labels.cvUploaded}
          </a>
        ) : null}
        <FileUpload
          storagePath={`students/${profile.id}/photo`}
          accept="image/*"
          label={labels.photoUpload}
          dropzoneContent={labels.photoDropzone}
          progressLabel={labels.uploadProgress}
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
          {labels.save}
        </Button>
      </aside>
    </form>
  );
}
