"use client";

import { useEffect, useState } from "react";
import type { TaxonomiesDocument } from "@/types/cms";

export function useTaxonomies() {
  const [taxonomies, setTaxonomies] = useState<TaxonomiesDocument>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/taxonomies")
      .then((response) => response.json())
      .then((data: TaxonomiesDocument) => {
        if (!cancelled) {
          setTaxonomies(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { taxonomies, isLoading };
}
