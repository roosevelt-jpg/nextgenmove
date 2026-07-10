"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
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
    if (!department) {
      return jobs;
    }

    return jobs.filter((job) => job.department === department);
  }, [department, jobs]);

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, JobPostingDocument[]>();

    for (const job of filteredJobs) {
      const bucket = groups.get(job.department) ?? [];
      bucket.push(job);
      groups.set(job.department, bucket);
    }

    return groups;
  }, [filteredJobs]);

  if (!jobs.length) {
    return null;
  }

  return (
    <div className="space-y-8">
      {labels.filterByDepartment ? (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="careers-department-filter" className="text-sm text-text-secondary">
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

      {[...groupedJobs.entries()].map(([groupDepartment, groupJobs]) => (
        <section key={groupDepartment} className="space-y-4">
          <h2 className="font-serif text-2xl text-text-primary">
            {taxonomies.department?.find((option) => option.value === groupDepartment)
              ?.label ?? groupDepartment}
          </h2>
          <ul className="space-y-3">
            {groupJobs.map((job) => (
              <li
                key={job.id}
                className="rounded-radius border border-border bg-surface-1 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/careers/${job.id}`}
                      className="font-medium text-text-primary hover:text-text-accent"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 text-sm text-text-muted">
                      {job.location}
                      {job.employmentType
                        ? ` · ${
                            taxonomies.employmentType?.find(
                              (option) => option.value === job.employmentType,
                            )?.label ?? job.employmentType
                          }`
                        : null}
                    </p>
                  </div>
                  {job.department ? (
                    <Badge>{taxonomies.department?.find((option) => option.value === job.department)?.label ?? job.department}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
