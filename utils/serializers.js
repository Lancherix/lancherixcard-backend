// Mongoose Map fields (limits/monthlyLimits) technically JSON-serialize to
// plain objects on their own via each doc's default toJSON, but we do it
// explicitly here so the wire shape is obvious and doesn't silently change
// if the schema's toJSON options ever change.

export function serializeCategory(doc) {
  const obj = doc.toObject();
  return { ...obj, limits: Object.fromEntries(doc.limits ?? []) };
}

export function serializeSettings(doc) {
  const obj = doc.toObject();
  return { ...obj, monthlyLimits: Object.fromEntries(doc.monthlyLimits ?? []) };
}