export type MathLearningPhaseRole =
  | 'diagnostic'
  | 'training'
  | 'remediation'
  | 'checkpoint'
  | 'practice'
  | 'transfer'
  | 'retention'
  | 'confirmation'
  | 'evaluation'
  | 'final'

export type MathTargetDefinition = {
  /** Opaque school-defined target identity used by the canonical engine. */
  id: string
  /** Learner-visible label; policy/meaning remains school-owned. */
  label: string
  /** Increasing school-defined ordering for UI/progression comparisons. */
  rank: number
  /** Optional score threshold for schools whose target policy is score-based. */
  scoreThreshold?: number
  /** Existing persisted value, if a school needs compatibility migration. */
  legacyValue?: string | number
}

export type MathLearningPhase = {
  step: number
  title: string
  role: MathLearningPhaseRole
  /**
   * Canonical exam bindings. Generic engine logic must use examId rather than
   * year whenever a phase is tied to one or more concrete exams.
   */
  examIds?: readonly string[]
  /**
   * Optional display/legacy metadata. This must never be the sole generic key
   * for exam-specific progression because another school may have A/B forms in
   * the same year.
   */
  year?: number
}

export type MathAppProfile = {
  id: string
  schoolLabel: string
  brand: {
    title: string
    unofficialLabel: string
    subtitle: string
    footer: string
  }
  supportedYears: readonly number[]
  targets: readonly MathTargetDefinition[]
  learningPhases: readonly MathLearningPhase[]
  runtime: {
    /**
     * Namespace for school-owned browser state. Existing legacy keys remain
     * authoritative and must not be renamed merely by deriving them from this
     * value.
     */
    storageNamespace: string
    /** Backup package identity; also a compatibility boundary between schools. */
    backupAppId: string
    /** Prefix used by school-specific CustomEvent names. */
    eventNamespace: string
    /** BroadcastChannel used to coordinate safe app-version updates. */
    updateChannel: string
    progressSync: {
      /** Origin-scoped IndexedDB name. Must differ for every school app. */
      indexedDbName: string
      /** App/tenant identity carried by cloud progress events. */
      appId: string
      /** Build-time API base variable. The resolved endpoint is school-specific. */
      apiEnv: 'VITE_PROGRESS_API_BASE'
      /** Optional browser override key for the progress API base. */
      windowOverrideKey: string
    }
  }
}
