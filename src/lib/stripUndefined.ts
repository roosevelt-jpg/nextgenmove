type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Removes undefined keys from objects before Firestore writes.
 * Recurses into nested plain objects; arrays are mapped but not stripped at the top level.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: PlainObject = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) {
      continue;
    }

    result[key] = stripUndefined(nestedValue);
  }

  return result as T;
}
