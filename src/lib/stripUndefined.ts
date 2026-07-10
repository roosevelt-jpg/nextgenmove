/**
 * Recursively removes undefined values from an object.
 * Preserves Firestore Timestamps and DocumentReferences.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Don't process Firestore special types
  if (
    obj instanceof Date ||
    (typeof obj === 'object' && 'toDate' in obj) || // Firestore Timestamp
    (typeof obj === 'object' && '_key' in obj) // Firestore DocumentReference
  ) {
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as T
  }

  // Handle objects
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value)
      }
    }
    return cleaned as T
  }

  return obj
}
