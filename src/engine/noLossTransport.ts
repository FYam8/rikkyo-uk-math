export type PortableRecordProvenance = { deviceId?: string; resetVersion?: number }
export type ProvenanceFallback = { deviceId: string; resetVersion?: number }
export type NoLossMergeIssue = { surface: string; code: 'duplicate-id' | 'record-conflict' | 'map-conflict'; message: string }

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Materializes exactly the fallback interpretation already used by a source
 * runtime. Callers must provide that source installation's audited identity;
 * this helper never invents a device or reset epoch.
 */
export function materializePortableProvenance<T extends PortableRecordProvenance>(
  record: T,
  fallback: ProvenanceFallback
): T & Required<Pick<PortableRecordProvenance, 'deviceId'>> {
  if (!fallback.deviceId) throw new Error('audited source deviceId is required')
  const resetVersion = record.resetVersion ?? fallback.resetVersion
  if (resetVersion !== undefined && (!Number.isInteger(resetVersion) || resetVersion < 0)) {
    throw new Error('resetVersion must be a non-negative integer')
  }
  return {
    ...record,
    deviceId: record.deviceId || fallback.deviceId,
    ...(resetVersion === undefined ? {} : { resetVersion })
  }
}

/** Same-ID/different-payload collisions fail closed; neither side wins. */
export function mergeRecordsNoLoss<T extends Record<string, unknown>>(
  surface: string,
  local: readonly T[],
  incoming: readonly T[],
  idOf: (record: T) => string
) {
  const issues: NoLossMergeIssue[] = []
  const merged: T[] = []
  const byId = new Map<string, T>()
  for (const [side, records] of [['local', local], ['incoming', incoming]] as const) {
    const seen = new Set<string>()
    for (const record of records) {
      const id = idOf(record)
      if (!id || seen.has(id)) {
        issues.push({ surface: `${surface}:${id || '<missing>'}`, code: 'duplicate-id', message: `${side} contains a duplicate or missing record identity` })
        continue
      }
      seen.add(id)
      const current = byId.get(id)
      if (current && stable(current) !== stable(record)) {
        issues.push({ surface: `${surface}:${id}`, code: 'record-conflict', message: 'same record identity has different preserved evidence' })
        continue
      }
      if (!current) {
        byId.set(id, record)
        merged.push(record)
      }
    }
  }
  return { ready: issues.length === 0, merged: issues.length === 0 ? merged : null, issues }
}

/** Differing values under one map key fail closed; no shallow overwrite. */
export function mergeMapNoLoss<T>(surface: string, local: Record<string, T>, incoming: Record<string, T>) {
  const issues: NoLossMergeIssue[] = []
  const merged: Record<string, T> = { ...local }
  for (const [key, value] of Object.entries(incoming)) {
    if (key in merged && stable(merged[key]) !== stable(value)) {
      issues.push({ surface: `${surface}.${key}`, code: 'map-conflict', message: 'map key has different preserved evidence' })
    } else if (!(key in merged)) merged[key] = value
  }
  return { ready: issues.length === 0, merged: issues.length === 0 ? merged : null, issues }
}
