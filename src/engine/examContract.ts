import type { MathLearningPhaseRole } from './appProfile'

export type ScoreAuthority =
  | 'official'
  | 'school-modelled'
  | 'internal'
  | 'not-available'

/**
 * Canonical identity for one concrete exam/form.
 *
 * `year` is metadata. Generic engine code must key exam-specific state by
 * `examId` so schools with multiple forms in the same year do not collide.
 */
export type CanonicalExamDefinition = {
  examId: string
  year: number
  form?: string
  label: string
  role?: MathLearningPhaseRole
}

/**
 * Shared exam-result shape. Numeric score is intentionally optional because
 * not every school has an authoritative point model for every subquestion.
 *
 * `schoolEvidence` preserves school-specific derived evidence without making
 * those fields universal engine semantics. Generic engine code must not depend
 * on school-specific keys inside this object.
 */
export type CanonicalExamResult = {
  id: string
  examId: string
  completed: boolean
  at: string
  score?: number
  maxScore?: number
  scoreAuthority: ScoreAuthority
  correctCount?: number
  wrongCount?: number
  unansweredCount?: number
  deviceId?: string
  resetVersion?: number
  schoolEvidence?: Record<string, unknown>
}

export function assertCanonicalExamResult(result: CanonicalExamResult) {
  if (!result.id) throw new Error('exam result id is required')
  if (!result.examId) throw new Error('examId is required')
  if (!result.at || Number.isNaN(Date.parse(result.at))) throw new Error('valid result timestamp is required')
  if (result.resetVersion !== undefined && (!Number.isInteger(result.resetVersion) || result.resetVersion < 0)) {
    throw new Error('resetVersion must be a non-negative integer when supplied')
  }

  const hasScore = result.score !== undefined || result.maxScore !== undefined
  if (hasScore) {
    if (typeof result.score !== 'number' || !Number.isFinite(result.score)) throw new Error('score must be finite when supplied')
    if (typeof result.maxScore !== 'number' || !Number.isFinite(result.maxScore) || result.maxScore <= 0) throw new Error('maxScore must be positive when supplied')
    if (result.score < 0 || result.score > result.maxScore) throw new Error('score must be within 0..maxScore')
    if (result.scoreAuthority === 'not-available') throw new Error('scored result cannot use not-available authority')
  }

  if (!hasScore && result.scoreAuthority !== 'not-available') {
    throw new Error('unscored result must use not-available authority')
  }

  return result
}
