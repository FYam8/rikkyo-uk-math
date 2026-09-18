/**
 * School-neutral learning-flow state transitions.
 *
 * IDs are opaque. This module does not read storage, grade answers, select
 * school content, or attach meaning to a school target/exam/problem ID.
 */

export type CanonicalGuidedMode = 'guided' | 'retry'
export type CanonicalGuidedMastery =
  | 'unseen'
  | 'attempted'
  | 'exposed'
  | 'guided'
  | 'reproduced'
  | 'independent'
  | 'consolidated'

export type CanonicalGuidedFinalInput = {
  currentMastery: CanonicalGuidedMastery
  correct: boolean
  mode: CanonicalGuidedMode
  finalAnswerSeen: boolean
  stepHintLevels: readonly number[]
  dependencyMode?: 'own' | 'official'
  reproductionAttempts: number
  reproductionSucceeded: boolean
  independentSucceeded: boolean
}

export function deriveCanonicalGuidedFinal(input: CanonicalGuidedFinalInput) {
  const hintUsed = input.stepHintLevels.some(level => level > 0)
  const answerExposed = input.finalAnswerSeen || input.stepHintLevels.some(level => level >= 3)
  let mastery = input.currentMastery
  let reproductionAttempts = input.reproductionAttempts
  let reproductionSucceeded = input.reproductionSucceeded
  let independentSucceeded = input.independentSucceeded

  if (input.mode === 'retry') reproductionAttempts += 1
  if (!input.correct) mastery = 'attempted'
  else if (input.currentMastery === 'consolidated') mastery = 'consolidated'
  else if (input.mode === 'retry' && answerExposed) {
    mastery = 'reproduced'
    reproductionSucceeded = true
  } else if (!answerExposed && !hintUsed && input.dependencyMode !== 'official') {
    mastery = 'independent'
    independentSucceeded = true
  } else if (answerExposed) {
    mastery = 'reproduced'
    reproductionSucceeded = true
  } else mastery = 'guided'

  return {mastery, reproductionAttempts, reproductionSucceeded, independentSucceeded, answerExposed, hintUsed}
}

export type CanonicalStepAssessment = 'matched' | 'guided' | 'unclear'

export function canAdvanceCanonicalGuidedStep(input: {
  assessment?: CanonicalStepAssessment
  responseValid: boolean
  hintLevel: number
}) {
  if (!input.assessment || input.assessment === 'unclear') return false
  if (input.assessment === 'matched') return input.responseValid
  return input.hintLevel >= 3 || input.responseValid
}

export function clampCanonicalStepIndex(index: number, stepCount: number) {
  if (!Number.isInteger(stepCount) || stepCount <= 0) return 0
  const safe = Number.isFinite(index) ? Math.trunc(index) : 0
  return Math.max(0, Math.min(stepCount - 1, safe))
}

export function uniqueOpaqueIds(value: readonly string[]) {
  return [...new Set(value)]
}

export type CanonicalFixedSet = {
  problemIds: string[]
  completedProblemIds: string[]
  retryProblemIds: string[]
  pendingProblemIds: string[]
  requiredCount: number
  status: 'active' | 'completed'
}

export function reconcileCanonicalFixedSet(input: {
  requiredCount: number
  eligibleProblemIds: readonly string[]
  fixedProblemIds: readonly string[]
  completedProblemIds: readonly string[]
  orderedCandidateIds: readonly string[]
  directProblemId?: string | null
  lastProblemId?: string | null
}): CanonicalFixedSet {
  const eligible = new Set(uniqueOpaqueIds(input.eligibleProblemIds))
  const required = Math.max(1, Math.trunc(input.requiredCount) || 1)
  const completed = uniqueOpaqueIds(input.completedProblemIds).filter(id => eligible.has(id))
  const retained = uniqueOpaqueIds(input.fixedProblemIds).filter(id => eligible.has(id) && !completed.includes(id))
  const direct = input.directProblemId && eligible.has(input.directProblemId) && !completed.includes(input.directProblemId) && !retained.includes(input.directProblemId) && !input.lastProblemId
    ? [input.directProblemId]
    : []
  const candidates = uniqueOpaqueIds(input.orderedCandidateIds).filter(id => eligible.has(id) && !completed.includes(id) && !retained.includes(id) && !direct.includes(id) && id !== input.lastProblemId)
  const last = input.lastProblemId && eligible.has(input.lastProblemId) ? [input.lastProblemId] : []
  const problemIds = uniqueOpaqueIds([...completed, ...retained, ...direct, ...candidates, ...last]).slice(0, required)
  const completedProblemIds = completed.filter(id => problemIds.includes(id))
  const status = problemIds.length > 0 && completedProblemIds.length >= problemIds.length ? 'completed' : 'active'
  return {
    problemIds,
    completedProblemIds,
    retryProblemIds: [],
    pendingProblemIds: problemIds.filter(id => !completedProblemIds.includes(id)),
    requiredCount: problemIds.length,
    status
  }
}

export function applyCanonicalFixedSetResult(input: {
  set: CanonicalFixedSet
  problemId: string
  qualifying: boolean
}) {
  const {set, problemId} = input
  if (!set.problemIds.includes(problemId) || set.status === 'completed') return {...set, stale: true}
  const completedProblemIds = input.qualifying
    ? uniqueOpaqueIds([...set.completedProblemIds, problemId])
    : [...set.completedProblemIds]
  const retryProblemIds = input.qualifying
    ? set.retryProblemIds.filter(id => id !== problemId)
    : uniqueOpaqueIds([...set.retryProblemIds.filter(id => id !== problemId), problemId])
  const pendingProblemIds = set.pendingProblemIds.filter(id => id !== problemId)
  const completed = completedProblemIds.length >= set.requiredCount
  return {
    ...set,
    completedProblemIds,
    retryProblemIds,
    pendingProblemIds,
    status: completed ? 'completed' as const : 'active' as const,
    stale: false
  }
}

export function nextCanonicalFixedSetIndex(
  problemIds: readonly string[],
  completedProblemIds: readonly string[],
  currentIndex: number
) {
  if (!problemIds.length) return -1
  const completed = new Set(completedProblemIds)
  for (let offset = 1; offset <= problemIds.length; offset += 1) {
    const index = (clampCanonicalStepIndex(currentIndex, problemIds.length) + offset) % problemIds.length
    if (!completed.has(problemIds[index])) return index
  }
  return -1
}

export function nextCanonicalSequenceIndex(currentIndex: number, length: number) {
  const next = Math.max(0, Math.trunc(currentIndex) || 0) + 1
  return next < length ? next : -1
}
