import type { MathLearningPhaseRole } from './appProfile'
import type { ScoreAuthority } from './examContract'

export const CANONICAL_MATH_CONTRACT_VERSION = 1 as const

export type CanonicalProblemSourceKind = 'past-paper' | 'fixed-practice'

export type CanonicalProblemLocation = {
  year?: number
  form?: string
  major?: number
  minor?: number
  label: string
}

/**
 * One engine-facing leaf problem. IDs are opaque: generic code must use the
 * explicit location and policy fields instead of parsing `problemId`.
 */
export type CanonicalLeafProblem = {
  problemId: string
  sourceProblemId: string
  sourceKind: CanonicalProblemSourceKind
  examId?: string
  location: CanonicalProblemLocation
  role: MathLearningPhaseRole
  fieldId: string
  topicIds: string[]
  difficultyId: string
  targetRelevance: Record<string, string>
  answerSpec: Record<string, unknown>
  responseSlots: string[]
  promptText?: string | null
  sourcePageImage?: string | null
  hints: string[]
  explanationSteps: string[]
  answerAuthority: {
    scoreAuthority: ScoreAuthority
    model: string
    verificationStatus: string
  }
  qualityFlags: string[]
  contentVersion: number
  gradingVersion: number
  schoolEvidence?: Record<string, unknown>
}

export type CanonicalMathContentPackage = {
  contractVersion: typeof CANONICAL_MATH_CONTRACT_VERSION
  schoolId: string
  exams: Array<{
    examId: string
    year: number
    form?: string
    label: string
    role: MathLearningPhaseRole
    scoreAuthority: ScoreAuthority
    schoolEvidence?: Record<string, unknown>
  }>
  problems: CanonicalLeafProblem[]
}

export type CanonicalContentIssue = { surface: string; message: string }

export function auditCanonicalMathContent(content: CanonicalMathContentPackage) {
  const issues: CanonicalContentIssue[] = []
  if (content.contractVersion !== CANONICAL_MATH_CONTRACT_VERSION) {
    issues.push({ surface: 'package', message: `unsupported contractVersion: ${content.contractVersion}` })
  }
  if (!content.schoolId) issues.push({ surface: 'package', message: 'schoolId is required' })

  const examIds = new Set<string>()
  for (const exam of content.exams) {
    if (!exam.examId) issues.push({ surface: 'exams', message: 'examId is required' })
    if (examIds.has(exam.examId)) issues.push({ surface: 'exams', message: `duplicate examId: ${exam.examId}` })
    examIds.add(exam.examId)
    if (!Number.isInteger(exam.year)) issues.push({ surface: `exam:${exam.examId}`, message: 'integer year is required' })
  }

  const problemIds = new Set<string>()
  const sourceIds = new Set<string>()
  for (const problem of content.problems) {
    const surface = `problem:${problem.problemId || '<missing>'}`
    if (!problem.problemId) issues.push({ surface, message: 'problemId is required' })
    if (!problem.sourceProblemId) issues.push({ surface, message: 'sourceProblemId is required' })
    if (problemIds.has(problem.problemId)) issues.push({ surface, message: `duplicate problemId: ${problem.problemId}` })
    if (sourceIds.has(problem.sourceProblemId)) issues.push({ surface, message: `duplicate sourceProblemId: ${problem.sourceProblemId}` })
    problemIds.add(problem.problemId)
    sourceIds.add(problem.sourceProblemId)
    if (problem.sourceKind === 'past-paper') {
      if (!problem.examId || !examIds.has(problem.examId)) issues.push({ surface, message: `unknown examId: ${problem.examId ?? '<missing>'}` })
      if (!Number.isInteger(problem.location.year)) issues.push({ surface, message: 'past-paper year is required' })
      if (!Number.isInteger(problem.location.major) || !Number.isInteger(problem.location.minor)) {
        issues.push({ surface, message: 'past-paper major/minor location is required' })
      }
    }
    if (!problem.location.label) issues.push({ surface, message: 'location label is required' })
    if (!problem.fieldId) issues.push({ surface, message: 'fieldId is required' })
    if (!problem.answerSpec || typeof problem.answerSpec !== 'object') issues.push({ surface, message: 'answerSpec is required' })
    if (!Number.isInteger(problem.contentVersion) || problem.contentVersion < 1) issues.push({ surface, message: 'contentVersion must be positive' })
    if (!Number.isInteger(problem.gradingVersion) || problem.gradingVersion < 1) issues.push({ surface, message: 'gradingVersion must be positive' })
  }

  return { ready: issues.length === 0, issues }
}
