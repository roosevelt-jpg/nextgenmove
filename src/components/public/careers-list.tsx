"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";
import type { JobPostingDocument } from "@/types/cms";

export interface CareersListProps {
  jobs: JobPostingDocument[];
  labels: Record<string, string>;
}

export function CareersList({ jobs, labels }: CareersListProps) {
  const { taxonomies } = useTaxonomies();
  const [department, setDepartment] = useState("");

  const filteredJobs = useMemo(() => {
    if (!department) return jobs;
    return jobs.filter((job) => job.department === department);
  }, [department, jobs]);

  if (!jobs.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {labels.filterByDepartment ? (
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="careers-department-filter"
            className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted"
          >
            {labels.filterByDepartment}
          </label>
          <select
            id="careers-department-filter"
            className="rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">{labels.allDepartments}</option>
            {(taxonomies.department ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ul className="space-y-3">
        {filteredJobs.map((job) => (
          <li
            key={job.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-radius border border-border bg-surface-1 px-5 py-4"
          >
            <div>
              <h2 className="font-medium text-text-primary">{job.title}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {[
                  taxonomies.department?.find((o) => o.value === job.department)
                    ?.label ?? job.department,
                  job.location,
                  taxonomies.employmentType?.find(
                    (o) => o.value === job.employmentType,
                  )?.label ?? job.employmentType,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/careers/${job.id}`}>
                <Button variant="outline" size="sm">
                  {labels.viewRole ?? labels.apply}
                </Button>
              </Link>
              <a href="#apply">
                <Button variant="ghost" size="sm">
                  {labels.applyHere ?? labels.apply}
                </Button>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
