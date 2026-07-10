"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";
import type { PublicRoleDocument } from "@/types/cms";

export interface PublicRolesListProps {
  roles: PublicRoleDocument[];
  labels: Record<string, string>;
}

export function PublicRolesList({ roles, labels }: PublicRolesListProps) {
  const { taxonomies } = useTaxonomies();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((role) => {
      if (sector && role.sector !== sector) return false;
      if (location && role.location !== location) return false;
      if (
        q &&
        !`${role.title} ${role.employerLabel} ${role.description ?? ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [location, query, roles, sector]);

  const locationOptions = useMemo(
    () => [...new Set(roles.map((role) => role.location).filter(Boolean))],
    [roles],
  );

  if (!roles.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-radius border border-border bg-surface-1 p-3 md:flex-row md:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder ?? "search"}
          className="min-w-0 flex-1 rounded-radius border-0 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <select
          className="rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm"
          value={sector}
          aria-label={labels.filterSector ?? "sector"}
          onChange={(event) => setSector(event.target.value)}
        >
          <option value="">{labels.allSectors ?? labels.all}</option>
          {(taxonomies.sector ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm"
          value={location}
          aria-label={labels.filterLocation ?? "location"}
          onChange={(event) => setLocation(event.target.value)}
        >
          <option value="">{labels.allLocations ?? labels.all}</option>
          {locationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-4">
        {filteredRoles.map((role) => (
          <li
            key={role.id}
            className="rounded-radius border border-border bg-surface-1 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-xl text-text-primary">{role.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {[
                    role.employerLabel,
                    role.location,
                    taxonomies.sector?.find((o) => o.value === role.sector)?.label ??
                      role.sector,
                    taxonomies.seniority?.find((o) => o.value === role.seniority)
                      ?.label ?? role.seniority,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {role.relocationSupport && labels.relocationBadge ? (
                  <Badge variant="accent">{labels.relocationBadge}</Badge>
                ) : null}
                <Link href={`/careers-talent/${role.id}`}>
                  <Button variant="outline" size="sm">
                    {labels.applyLabel ?? labels.viewRole}
                  </Button>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
