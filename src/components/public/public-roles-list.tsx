"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";
import type { PublicRoleDocument } from "@/types/cms";

export interface PublicRolesListProps {
  roles: PublicRoleDocument[];
  labels: Record<string, string>;
}

export function PublicRolesList({ roles, labels }: PublicRolesListProps) {
  const { taxonomies } = useTaxonomies();
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      if (sector && role.sector !== sector) {
        return false;
      }

      if (location && role.location !== location) {
        return false;
      }

      if (seniority && role.seniority !== seniority) {
        return false;
      }

      return true;
    });
  }, [location, roles, sector, seniority]);

  const locationOptions = useMemo(
    () => [...new Set(roles.map((role) => role.location).filter(Boolean))],
    [roles],
  );

  if (!roles.length) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {labels.filterSector ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSector}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {(taxonomies.sector ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {labels.filterLocation ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterLocation}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {locationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {labels.filterSeniority ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSeniority}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={seniority}
              onChange={(event) => setSeniority(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {(taxonomies.seniority ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <ul className="space-y-4">
        {filteredRoles.map((role) => (
          <li
            key={role.id}
            className="rounded-radius border border-border bg-surface-1 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/careers-talent/${role.id}`}
                  className="font-serif text-xl text-text-primary hover:text-text-accent"
                >
                  {role.title}
                </Link>
                <p className="mt-1 text-sm text-text-muted">{role.employerLabel}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {role.location}
                  {role.sector
                    ? ` · ${
                        taxonomies.sector?.find((option) => option.value === role.sector)
                          ?.label ?? role.sector
                      }`
                    : null}
                  {role.seniority
                    ? ` · ${
                        taxonomies.seniority?.find(
                          (option) => option.value === role.seniority,
                        )?.label ?? role.seniority
                      }`
                    : null}
                </p>
              </div>
              {role.relocationSupport && labels.relocationBadge ? (
                <Badge variant="accent">{labels.relocationBadge}</Badge>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
