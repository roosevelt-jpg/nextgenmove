import { Timestamp, DocumentReference } from 'firebase/firestore';

/**
 * Recursively removes any keys with undefined values from an object.
 * Preserves Timestamps, DocumentReferences, arrays, and nested objects.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Preserve Firestore Timestamp and DocumentReference
  if (obj instanceof Timestamp || obj instanceof DocumentReference) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = stripUndefined(value);
      }
    }
    return result as T;
  }

  return obj;
}
