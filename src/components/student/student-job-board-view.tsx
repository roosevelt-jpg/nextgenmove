"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Input, Select } from "@/components/ui";

interface JobCard {
  id: string;
  title: string;
  companyName: string;
  location: string;
  salary: string;
  employmentType: string;
  categories: string[];
}

export function StudentJobBoardView({ labels }: { labels: Record<string, string> }) {
  const [items, setItems] = useState<JobCard[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [salary, setSalary] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/student/jobs");
    if (!res.ok) return;
    const data = (await res.json()) as { items?: JobCard[] };
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeOptions = useMemo(
    () => [
      { value: "", label: labels.filterAll || "All" },
      { value: "full_time", label: labels.typeFullTime || "Full time" },
      { value: "part_time", label: labels.typePartTime || "Part time" },
      { value: "internship", label: labels.typeInternship || "Internship" },
      { value: "freelance", label: labels.typeFreelance || "Freelance" },
    ],
    [labels],
  );

  const salaryOptions = useMemo(() => {
    const unique = [...new Set(items.map((i) => i.salary).filter(Boolean))];
    return [
      { value: "", label: labels.filterAll || "All" },
      ...unique.map((s) => ({ value: s, label: s })),
    ];
  }, [items, labels.filterAll]);

  const categoryOptions = useMemo(() => {
    const unique = [
      ...new Set(items.flatMap((i) => i.categories ?? []).filter(Boolean)),
    ];
    return [
      { value: "", label: labels.filterAll || "All" },
      ...unique.map((c) => ({ value: c, label: c })),
    ];
  }, [items, labels.filterAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((job) => {
      if (q) {
        const hay = `${job.title} ${job.location} ${job.companyName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (type && job.employmentType !== type) return false;
      if (salary && job.salary !== salary) return false;
      if (category && !(job.categories ?? []).includes(category)) return false;
      return true;
    });
  }, [items, search, type, salary, category]);

  const typeLabel = (value: string) =>
    typeOptions.find((o) => o.value === value)?.label || value;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4 rounded-radius border border-border bg-grad-card p-4">
        <Select
          label={labels.filterType || "Job type"}
          value={type}
          options={typeOptions}
          onChange={(e) => setType(e.target.value)}
        />
        <Select
          label={labels.filterSalary || "Salary"}
          value={salary}
          options={salaryOptions}
          onChange={(e) => setSalary(e.target.value)}
        />
        <Select
          label={labels.filterCategory || "Category"}
          value={category}
          options={categoryOptions}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setType("");
            setSalary("");
            setCategory("");
            setSearch("");
          }}
        >
          {labels.clearFilters || "Clear filters"}
        </Button>
      </aside>

      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="font-serif text-2xl text-text-primary">
            {labels.title || "Job board"}
          </h1>
          {labels.subtitle ? (
            <p className="text-sm text-text-secondary">{labels.subtitle}</p>
          ) : null}
        </header>

        <Input
          label={labels.searchPlaceholder || "Search"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder || "Search by title or location"}
        />

        {filtered.length === 0 ? (
          <EmptyState title={labels.empty || "No open jobs match your filters."} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((job) => (
              <li
                key={job.id}
                className="rounded-radius border border-border bg-grad-card p-4"
              >
                <h2 className="font-medium text-text-primary">{job.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {[job.companyName, job.location, typeLabel(job.employmentType)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {job.salary ? (
                  <p className="mt-1 text-sm text-text-primary">{job.salary}</p>
                ) : null}
                <div className="mt-3">
                  <Link
                    href={`/student/jobs/${job.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-text-label hover:text-fill-accent"
                  >
                    {labels.viewDetails || "View details"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
