type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value instanceof Date
  ) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isFirestoreTimestamp(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
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

function isFirestoreFieldValue(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // firebase-admin FieldValue sentinels (serverTimestamp, delete, increment, …)
  const ctorName = (value as { constructor?: { name?: string } }).constructor
    ?.name;
  if (ctorName === "FieldValue" || ctorName === "FieldTransform") {
    return true;
  }

  return (
    "isEqual" in value &&
    typeof (value as { isEqual: unknown }).isEqual === "function" &&
    !("toDate" in value)
  );
}

function shouldPreserveValue(value: unknown): boolean {
  return (
    Array.isArray(value) ||
    isFirestoreTimestamp(value) ||
    isFirestoreDocumentReference(value) ||
    isFirestoreFieldValue(value)
  );
}

/**
 * Removes undefined keys from objects before Firestore writes.
 * Recurses into nested plain objects. Arrays, Timestamps,
 * DocumentReferences, and FieldValue sentinels are returned unchanged.
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
