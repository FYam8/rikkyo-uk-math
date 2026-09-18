/**
 * School-neutral ordering for the single primary action shown by Today.
 * School adapters own candidate construction, labels, routes, and opaque IDs.
 */
export const CANONICAL_TODAY_LANE_ORDER = [
  'route-resume',
  'reinforcement',
  'due-review',
  'past-paper',
  'practice',
  'optional-resume'
] as const

export type CanonicalTodayLane = typeof CANONICAL_TODAY_LANE_ORDER[number]

export type CanonicalTodayCandidate<T> = {
  lane: CanonicalTodayLane
  value: T
  priority?: number
}

export type CanonicalTodayDecision<T> = {
  lane: CanonicalTodayLane
  value: T
} | null

export function orderCanonicalTodayCandidates<T>(
  candidates: readonly CanonicalTodayCandidate<T>[],
  laneOrder: readonly CanonicalTodayLane[] = CANONICAL_TODAY_LANE_ORDER
): CanonicalTodayCandidate<T>[] {
  const rank = new Map(laneOrder.map((lane, index) => [lane, index]))
  return candidates.map((candidate, index) => ({candidate, index})).sort((a, b) => {
    const lane = (rank.get(a.candidate.lane) ?? laneOrder.length) - (rank.get(b.candidate.lane) ?? laneOrder.length)
    if (lane !== 0) return lane
    const priority = (b.candidate.priority ?? 0) - (a.candidate.priority ?? 0)
    return priority || a.index - b.index
  }).map(item => item.candidate)
}

export function chooseCanonicalTodayTask<T>(
  candidates: readonly CanonicalTodayCandidate<T>[],
  laneOrder: readonly CanonicalTodayLane[] = CANONICAL_TODAY_LANE_ORDER
): CanonicalTodayDecision<T> {
  const first = orderCanonicalTodayCandidates(candidates, laneOrder)[0]
  return first ? {lane: first.lane, value: first.value} : null
}

export function nextIncompleteRouteId(
  orderedIds: readonly string[],
  completedIds: ReadonlySet<string> | readonly string[]
): string | null {
  const completed = completedIds instanceof Set ? completedIds : new Set(completedIds)
  return orderedIds.find(id => !completed.has(id)) ?? null
}

/** Keep the highest-priority action for each school-supplied logical task identity. */
export function uniqueCanonicalTodayCandidates<T>(candidates:readonly CanonicalTodayCandidate<T>[],taskId:(value:T)=>string):CanonicalTodayCandidate<T>[] {
  const seen=new Set<string>()
  return orderCanonicalTodayCandidates(candidates).filter(candidate=>{
    const id=taskId(candidate.value)
    if(!id)throw new Error('logical task identity is required')
    if(seen.has(id))return false
    seen.add(id);return true
  })
}
