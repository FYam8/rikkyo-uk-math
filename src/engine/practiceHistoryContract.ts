/**
 * Generic durable practice-history read model.
 *
 * Problem/skill identifiers are opaque. School-specific pool names, labels and
 * selection policy belong in `schoolEvidence`; the shared engine must not infer
 * WaseShibu Level2 semantics from identifier shapes.
 */
export type CanonicalPracticeAttempt = {
  id: string
  problemId: string
  presentationId: string
  sessionId: string | null
  answeredAt: string
  submissionIndex: number
  firstSubmission: boolean
  correct: boolean
  usedHintBeforeAnswer: boolean
  usedExplanationBeforeAnswer: boolean
  revealedAnswerBeforeAnswer: boolean
  contentRevisionAtAttempt: number
  gradingRevisionAtAttempt: number
  skillIdAtAttempt: string
  skillAssignmentRevisionAtAttempt: number
  practiceSkillIdAtAttempt: string | null
  answerText: string
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalPracticeProblemStats = {
  attemptCount: number
  correctCount: number
  qualifyingCorrectCount: number
  lastAttemptAt: string | null
  lastResult: boolean | null
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalPracticePendingAssistance = {
  problemId: string
  usedHint: boolean
  usedExplanation: boolean
  revealedAnswer: boolean
}

export type CanonicalPracticeSession = {
  id: string
  sourceProblemId: string | null
  directProblemId: string | null
  skillId: string
  skillAssignmentRevision: number
  currentStreak: number
  currentStreakProblemIds: string[]
  bestStreak: number
  status: 'active' | 'completed'
  sourceActivityAt?: string
  lastProblemId: string | null
  recentProblemIds: string[]
  remainingProblemIds: string[]
  updatedAt: string
  requiredCount: number
  fixedProblemIds: string[]
  completedProblemIds: string[]
  retryProblemIds: string[]
  pendingAssistance: CanonicalPracticePendingAssistance | null
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalPracticeMasteryEvent = {
  skillId: string
  achievedAt: string
  skillAssignmentRevision: number
  problemIds: string[]
  requiredCount?: number
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalPracticeHistory = {
  attempts: CanonicalPracticeAttempt[]
  problemStatsByProblemId: Record<string, CanonicalPracticeProblemStats>
  sessionsByKey: Record<string, CanonicalPracticeSession>
  masteryEvents: CanonicalPracticeMasteryEvent[]
  schoolEvidence?: Record<string, unknown>
}

export function emptyCanonicalPracticeHistory(): CanonicalPracticeHistory {
  return {
    attempts: [],
    problemStatsByProblemId: {},
    sessionsByKey: {},
    masteryEvents: []
  }
}
