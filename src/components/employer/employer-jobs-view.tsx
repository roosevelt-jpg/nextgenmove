"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Modal, Textarea } from "@/components/ui";

interface JobItem {
  id: string;
  title: string;
  companyName: string;
  description: string;
  location: string;
  salary: string;
  employmentType: string;
  gender: string;
  categories: string[];
  skills: string[];
  status: string;
  postedAt: string | null;
  expiresAt: string | null;
}

const EMPTY = {
  title: "",
  companyName: "",
  description: "",
  location: "",
  salary: "",
  employmentType: "full_time",
  gender: "",
  categoriesText: "",
  skillsText: "",
  expiresAt: "",
};

export function EmployerJobsView({ labels }: { labels: Record<string, string> }) {
  const [items, setItems] = useState<JobItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/employer/jobs");
    if (!res.ok) return;
    const payload = (await res.json()) as { items?: JobItem[] };
    setItems(payload.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (item: JobItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      companyName: item.companyName,
      description: item.description,
      location: item.location,
      salary: item.salary,
      employmentType: item.employmentType || "full_time",
      gender: item.gender,
      categoriesText: (item.categories ?? []).join(", "),
      skillsText: (item.skills ?? []).join(", "),
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : "",
    });
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setError(null);
    const categories = form.categoriesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setError(labels.missing_required || "Please fill in all required fields.");
      return;
    }
    if (categories.length === 0) {
      setError(labels.categoriesRequired || "Add at least one category.");
      return;
    }
    setSaving(true);
    const body = {
      title: form.title.trim(),
      companyName: form.companyName.trim() || undefined,
      description: form.description.trim(),
      location: form.location.trim(),
      salary: form.salary.trim() || undefined,
      employmentType: form.employmentType,
      gender: form.gender.trim() || undefined,
      categories,
      skills: form.skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : null,
    };
    const res = await fetch(
      editing ? `/api/employer/jobs/${editing.id}` : "/api/employer/jobs",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(
        labels[payload?.error ?? ""] ||
          labels.saveFailed ||
          "Could not save job.",
      );
      return;
    }
    setOpen(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-text-primary sm:text-3xl">
            {labels.title || "Opportunities"}
          </h1>
          <p className="text-sm text-text-secondary">
            {labels.subtitle ||
              "Manage your job and opportunity postings."}
          </p>
        </div>
        <Button onClick={openCreate}>{labels.postJob || "Post a Job"}</Button>
      </header>

      <div className="overflow-x-auto rounded-radius border border-border">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[40rem]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-text-muted">
              <th className="px-3 py-2">{labels.colTitle || "Title"}</th>
              <th className="px-3 py-2">{labels.colCompany || "Company"}</th>
              <th className="px-3 py-2">{labels.colStatus || "Status"}</th>
              <th className="px-3 py-2">{labels.colDate || "Date"}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  {labels.empty || "No opportunities yet."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-3 font-medium text-text-primary">
                    {item.title}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {item.companyName}
                  </td>
                  <td className="px-3 py-3 capitalize text-text-secondary">
                    {item.status}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {item.postedAt
                      ? new Date(item.postedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                      {labels.edit || "Edit"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? labels.editTitle || "Edit Opportunity"
            : labels.createTitle || "Post a Job"
        }
        footer={
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => void save()}>
              {labels.save || "Save changes"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {labels.cancel || "Cancel"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-text-warning" role="alert">
              {error}
            </p>
          ) : null}
          <Input
            label={labels.fieldTitle || "Title"}
            value={form.title}
            placeholder={labels.titlePlaceholder || "e.g. Freelance Web Designer"}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            label={labels.fieldCompany || "Company name"}
            value={form.companyName}
            placeholder={labels.companyPlaceholder || "Your company"}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyName: e.target.value }))
            }
          />
          <Input
            label={labels.fieldCategories || "Categories (comma-separated)"}
            value={form.categoriesText}
            placeholder={labels.categoriesPlaceholder || "Services, Design"}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoriesText: e.target.value }))
            }
          />
          <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {labels.fieldType || "Type"}
            <select
              className="min-h-11 rounded-radius-sm border border-border bg-surface-1 px-2.5 text-sm text-text-primary"
              value={form.employmentType}
              onChange={(e) =>
                setForm((f) => ({ ...f, employmentType: e.target.value }))
              }
            >
              <option value="full_time">{labels.typeFullTime || "Full time"}</option>
              <option value="part_time">{labels.typePartTime || "Part time"}</option>
              <option value="internship">{labels.typeInternship || "Internship"}</option>
              <option value="freelance">{labels.typeFreelance || "Freelance"}</option>
            </select>
          </label>
          <Input
            label={labels.fieldGender || "Gender"}
            value={form.gender}
            placeholder={labels.genderPlaceholder || "Any / optional"}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          />
          <Input
            label={labels.fieldLocation || "Location"}
            value={form.location}
            placeholder={labels.locationPlaceholder || "Dubai"}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
          />
          <Input
            label={labels.fieldSalary || "Salary"}
            value={form.salary}
            placeholder={labels.salaryPlaceholder || "e.g. €3,000 / mo"}
            onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
          />
          <Input
            label={labels.fieldSkills || "Required skills (comma-separated)"}
            value={form.skillsText}
            placeholder={labels.skillsPlaceholder || "React, Figma"}
            onChange={(e) =>
              setForm((f) => ({ ...f, skillsText: e.target.value }))
            }
          />
          <Input
            type="datetime-local"
            label={labels.fieldExpiry || "Expiry date (optional)"}
            value={form.expiresAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, expiresAt: e.target.value }))
            }
          />
          <Textarea
            label={labels.fieldDescription || "Description"}
            value={form.description}
            rows={5}
            placeholder={
              labels.descriptionPlaceholder ||
              "Part-time contract building landing pages…"
            }
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </Modal>
    </div>
  );
}
