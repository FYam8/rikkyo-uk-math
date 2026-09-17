import {
  captureExactLocalSnapshot,
  restoreExactLocalSnapshot,
  type ExactStorage,
  type LocalRestoreProfile
} from './localRestoreContract'

export type CanonicalCandidateWriteProfile<Key extends string = string> = {
  targetKey: Key
  restoreProfile: LocalRestoreProfile<Key>
}

/**
 * Writes one staged canonical candidate and verifies its parsed value. On any
 * failure every covered key is restored byte-for-byte. It does not delete the
 * legacy source and is not wired into WaseShibu production.
 */
export function writeCanonicalCandidateWithRollback<Key extends string, Candidate>(
  profile: CanonicalCandidateWriteProfile<Key>,
  candidate: Candidate,
  validate: (value: unknown) => asserts value is Candidate,
  storage: ExactStorage
) {
  if (!profile.restoreProfile.keys.includes(profile.targetKey)) {
    throw new Error('candidate target key must be covered by the local restore profile')
  }
  const before = captureExactLocalSnapshot(profile.restoreProfile, storage)
  try {
    const raw = JSON.stringify(candidate)
    storage.setItem(profile.targetKey, raw)
    const reread = storage.getItem(profile.targetKey)
    if (reread !== raw) throw new Error('candidate bytes changed during write')
    const parsed: unknown = JSON.parse(reread)
    validate(parsed)
    return { written: true as const, before }
  } catch (error) {
    restoreExactLocalSnapshot(profile.restoreProfile, before, storage)
    throw error
  }
}
