export type ExactStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type LocalRestoreProfile<Key extends string = string> = {
  profileId: string
  schemaVersion: 1
  keys: readonly Key[]
  portableExcludedKeys: readonly Key[]
}

export type ExactLocalSnapshot<Key extends string = string> = {
  profileId: string
  schemaVersion: 1
  capturedAt: string
  values: Record<Key, string | null>
}

function sameKeys(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  const expected = new Set(left)
  return expected.size === left.length && right.every(key => expected.has(key))
}

export function captureExactLocalSnapshot<Key extends string>(
  profile: LocalRestoreProfile<Key>,
  storage: ExactStorage,
  capturedAt = new Date().toISOString()
): ExactLocalSnapshot<Key> {
  const values = {} as Record<Key, string | null>
  for (const key of profile.keys) values[key] = storage.getItem(key)
  return { profileId: profile.profileId, schemaVersion: profile.schemaVersion, capturedAt, values }
}

export function validateExactLocalSnapshot<Key extends string>(
  profile: LocalRestoreProfile<Key>,
  snapshot: ExactLocalSnapshot<string>
): asserts snapshot is ExactLocalSnapshot<Key> {
  if (!snapshot || snapshot.profileId !== profile.profileId || snapshot.schemaVersion !== profile.schemaVersion) {
    throw new Error('この端末の復元ポイント形式ではありません')
  }
  if (!snapshot.values || typeof snapshot.values !== 'object' || Array.isArray(snapshot.values)) {
    throw new Error('端末内復元ポイントの保存内容が壊れています')
  }
  const actualKeys = Object.keys(snapshot.values)
  if (!sameKeys(profile.keys, actualKeys)) throw new Error('端末内復元ポイントの保存範囲が一致しません')
  for (const key of actualKeys) {
    const value = snapshot.values[key]
    if (value !== null && typeof value !== 'string') throw new Error(`端末内復元ポイントの値が壊れています：${key}`)
  }
}

function applyExactValues<Key extends string>(
  profile: LocalRestoreProfile<Key>,
  values: Record<Key, string | null>,
  storage: ExactStorage
) {
  for (const key of profile.keys) {
    const value = values[key]
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
}

function assertExactValues<Key extends string>(
  profile: LocalRestoreProfile<Key>,
  values: Record<Key, string | null>,
  storage: ExactStorage
) {
  for (const key of profile.keys) {
    if (storage.getItem(key) !== values[key]) throw new Error(`復元後の検証に失敗しました：${key}`)
  }
}

/**
 * Applies an exact device-local snapshot as one verified operation. If any
 * write or verification fails, every covered key is restored byte-for-byte
 * from the pre-operation snapshot and that rollback is verified before the
 * error is returned.
 */
export function restoreExactLocalSnapshot<Key extends string>(
  profile: LocalRestoreProfile<Key>,
  snapshot: ExactLocalSnapshot<string>,
  storage: ExactStorage
) {
  validateExactLocalSnapshot(profile, snapshot)
  const before = captureExactLocalSnapshot(profile, storage)
  try {
    applyExactValues(profile, snapshot.values, storage)
    assertExactValues(profile, snapshot.values, storage)
  } catch (error) {
    try {
      applyExactValues(profile, before.values, storage)
      assertExactValues(profile, before.values, storage)
    } catch (rollbackError) {
      throw new Error(`端末内復元とロールバックの両方を確認できません：${rollbackError instanceof Error ? rollbackError.message : '保存エラー'}`)
    }
    throw new Error(`端末内復元を完了できなかったため、直前の状態へ戻しました：${error instanceof Error ? error.message : '保存エラー'}`)
  }
}

export function auditLocalRestoreProfile<Key extends string>(profile: LocalRestoreProfile<Key>) {
  const issues: string[] = []
  if (new Set(profile.keys).size !== profile.keys.length) issues.push('local restore keys contain duplicates')
  for (const key of profile.portableExcludedKeys) {
    if (!profile.keys.includes(key)) issues.push(`portable-excluded runtime key is missing from local restore: ${key}`)
  }
  return { ready: issues.length === 0, issues }
}
