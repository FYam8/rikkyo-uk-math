/**
 * Canonical read model for one source-problem remediation thread.
 *
 * Problem identities are opaque. School-owned pool ordering, labels and rank
 * policy stay in `schoolEvidence` so they never become generic engine rules.
 */
export type CanonicalRemediationProgress = {
  sourceProblemId: string
  sourceActivityAt?: string
  status: 'in-progress' | 'completed'
  streak: number
  attemptCount: number
  correctProblemIdsInCurrentStreak: string[]
  updatedAt: string
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalRemediationState = {
  progressBySourceProblemId: Record<string, CanonicalRemediationProgress>
}
