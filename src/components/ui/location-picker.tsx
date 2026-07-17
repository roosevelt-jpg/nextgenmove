"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LocationValue {
  country: string;
  countryCode: string;
  city: string;
  town: string;
  formattedAddress: string;
  placeId: string;
}

export interface LocationPickerProps {
  labels: Record<string, string>;
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  required?: boolean;
  className?: string;
  /** When false, fields remain manual text inputs. */
  placesEnabled?: boolean;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

type FieldKey = "country" | "city" | "town";

const EMPTY: LocationValue = {
  country: "",
  countryCode: "",
  city: "",
  town: "",
  formattedAddress: "",
  placeId: "",
};

function sessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}`;
}

export function LocationPicker({
  labels,
  value,
  onChange,
  required = false,
  className,
  placesEnabled = true,
}: LocationPickerProps) {
  const baseId = useId();
  const tokenRef = useRef(sessionToken());
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [placesLive, setPlacesLive] = useState(placesEnabled);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setPlacesLive(placesEnabled);
  }, [placesEnabled]);

  const search = useCallback(
    async (field: FieldKey, query: string) => {
      if (!placesLive || query.trim().length < 2) {
        setPredictions([]);
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({
        action: "autocomplete",
        query: query.trim(),
        type: field,
        sessionToken: tokenRef.current,
      });
      if (field !== "country" && value.countryCode) {
        params.set("countryCode", value.countryCode);
      }
      try {
        const response = await fetch(`/api/places?${params}`);
        if (response.status === 503) {
          setPlacesLive(false);
          setPredictions([]);
          return;
        }
        if (!response.ok) {
          setPredictions([]);
          return;
        }
        const data = (await response.json()) as { predictions?: Prediction[] };
        setPredictions(data.predictions ?? []);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    [placesLive, value.countryCode],
  );

  const onFieldChange = (field: FieldKey, next: string) => {
    setActiveField(field);
    if (field === "country") {
      onChange({
        ...value,
        country: next,
        countryCode: "",
        city: value.city,
        town: value.town,
      });
    } else if (field === "city") {
      onChange({ ...value, city: next });
    } else {
      onChange({ ...value, town: next });
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void search(field, next);
    }, 280);
  };

  const pickPrediction = async (field: FieldKey, prediction: Prediction) => {
    setPredictions([]);
    setActiveField(null);
    try {
      const params = new URLSearchParams({
        action: "details",
        placeId: prediction.placeId,
        sessionToken: tokenRef.current,
      });
      const response = await fetch(`/api/places?${params}`);
      tokenRef.current = sessionToken();
      if (!response.ok) {
        if (field === "country") {
          onChange({ ...value, country: prediction.mainText, countryCode: "" });
        } else if (field === "city") {
          onChange({ ...value, city: prediction.mainText });
        } else {
          onChange({ ...value, town: prediction.mainText });
        }
        return;
      }
      const data = (await response.json()) as {
        place: {
          placeId: string;
          formattedAddress: string;
          country: string;
          countryCode: string;
          city: string;
          town: string;
        };
      };
      const place = data.place;
      if (field === "country") {
        onChange({
          ...value,
          country: place.country || prediction.mainText,
          countryCode: place.countryCode,
          placeId: place.placeId,
          formattedAddress: place.formattedAddress,
        });
      } else if (field === "city") {
        onChange({
          ...value,
          country: place.country || value.country,
          countryCode: place.countryCode || value.countryCode,
          city: place.city || prediction.mainText,
          town: value.town || place.town,
          placeId: place.placeId,
          formattedAddress: place.formattedAddress,
        });
      } else {
        onChange({
          ...value,
          country: place.country || value.country,
          countryCode: place.countryCode || value.countryCode,
          city: place.city || value.city,
          town: place.town || prediction.mainText,
          placeId: place.placeId,
          formattedAddress: place.formattedAddress,
        });
      }
    } catch {
      /* keep typed value */
    }
  };

  const field = (
    key: FieldKey,
    label: string,
    fieldValue: string,
    isRequired: boolean,
  ) => (
    <div className="relative space-y-1">
      <label
        htmlFor={`${baseId}-${key}`}
        className="block text-sm font-medium text-text-primary"
      >
        {label}
        {isRequired ? " *" : ""}
      </label>
      <input
        id={`${baseId}-${key}`}
        type="text"
        autoComplete="off"
        required={isRequired}
        value={fieldValue}
        placeholder={
          placesLive
            ? labels.locationSearchHint ?? "Start typing to search worldwide…"
            : undefined
        }
        onChange={(event) => onFieldChange(key, event.target.value)}
        onFocus={() => setActiveField(key)}
        onBlur={() => {
          window.setTimeout(() => {
            setActiveField((current) => (current === key ? null : current));
          }, 180);
        }}
        className="w-full rounded-radius-sm border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-border-accent"
      />
      {activeField === key && predictions.length > 0 ? (
        <ul
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-radius border border-border bg-surface-1 shadow-md"
          role="listbox"
        >
          {predictions.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-bg-purple"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void pickPrediction(key, item)}
              >
                <span className="font-medium text-text-primary">{item.mainText}</span>
                {item.secondaryText ? (
                  <span className="text-xs text-text-muted">
                    {item.secondaryText}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {activeField === key && loading ? (
        <p className="text-xs text-text-muted">
          {labels.locationSearching ?? "Searching…"}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        {field(
          "country",
          labels.countryLabel ?? "Country",
          value.country,
          required,
        )}
        {field("city", labels.cityLabel ?? "City", value.city, required)}
        {field("town", labels.townLabel ?? "Town / area", value.town, false)}
      </div>
      {!placesLive ? (
        <p className="text-xs text-text-muted">
          {labels.locationManualHint ??
            "Type your country, city, and town. Connect Google Places under Admin → Integrations for autocomplete."}
        </p>
      ) : null}
    </div>
  );
}

export { EMPTY as EMPTY_LOCATION };
