type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function isFirestoreTimestamp(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function" &&
    "seconds" in value
  );
}

function isFirestoreDocumentReference(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "id" in value &&
    typeof (value as { path: unknown }).path === "string" &&
    typeof (value as { id: unknown }).id === "string"
  );
}

function shouldPreserveValue(value: unknown): boolean {
  return (
    Array.isArray(value) ||
    isFirestoreTimestamp(value) ||
    isFirestoreDocumentReference(value)
  );
}

/**
 * Removes undefined keys from objects before Firestore writes.
 * Recurses into nested plain objects. Arrays, Timestamps, and
 * DocumentReferences are returned unchanged.
 */
export function stripUndefined<T>(value: T): T {
  if (shouldPreserveValue(value) || !isPlainObject(value)) {
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
