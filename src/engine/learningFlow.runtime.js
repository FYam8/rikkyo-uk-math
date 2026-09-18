var CanonicalLearningFlow = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/engine/learningFlow.ts
  var learningFlow_exports = {};
  __export(learningFlow_exports, {
    applyCanonicalFixedSetResult: () => applyCanonicalFixedSetResult,
    canAdvanceCanonicalGuidedStep: () => canAdvanceCanonicalGuidedStep,
    clampCanonicalStepIndex: () => clampCanonicalStepIndex,
    deriveCanonicalGuidedFinal: () => deriveCanonicalGuidedFinal,
    nextCanonicalFixedSetIndex: () => nextCanonicalFixedSetIndex,
    nextCanonicalSequenceIndex: () => nextCanonicalSequenceIndex,
    reconcileCanonicalFixedSet: () => reconcileCanonicalFixedSet,
    uniqueOpaqueIds: () => uniqueOpaqueIds
  });
  function deriveCanonicalGuidedFinal(input) {
    const hintUsed = input.stepHintLevels.some((level) => level > 0);
    const answerExposed = input.finalAnswerSeen || input.stepHintLevels.some((level) => level >= 3);
    let mastery = input.currentMastery;
    let reproductionAttempts = input.reproductionAttempts;
    let reproductionSucceeded = input.reproductionSucceeded;
    let independentSucceeded = input.independentSucceeded;
    if (input.mode === "retry") reproductionAttempts += 1;
    if (!input.correct) mastery = "attempted";
    else if (input.currentMastery === "consolidated") mastery = "consolidated";
    else if (input.mode === "retry" && answerExposed) {
      mastery = "reproduced";
      reproductionSucceeded = true;
    } else if (!answerExposed && !hintUsed && input.dependencyMode !== "official") {
      mastery = "independent";
      independentSucceeded = true;
    } else if (answerExposed) {
      mastery = "reproduced";
      reproductionSucceeded = true;
    } else mastery = "guided";
    return { mastery, reproductionAttempts, reproductionSucceeded, independentSucceeded, answerExposed, hintUsed };
  }
  function canAdvanceCanonicalGuidedStep(input) {
    if (!input.assessment || input.assessment === "unclear") return false;
    if (input.assessment === "matched") return input.responseValid;
    return input.hintLevel >= 3 || input.responseValid;
  }
  function clampCanonicalStepIndex(index, stepCount) {
    if (!Number.isInteger(stepCount) || stepCount <= 0) return 0;
    const safe = Number.isFinite(index) ? Math.trunc(index) : 0;
    return Math.max(0, Math.min(stepCount - 1, safe));
  }
  function uniqueOpaqueIds(value) {
    return [...new Set(value)];
  }
  function reconcileCanonicalFixedSet(input) {
    const eligible = new Set(uniqueOpaqueIds(input.eligibleProblemIds));
    const required = Math.max(1, Math.trunc(input.requiredCount) || 1);
    const completed = uniqueOpaqueIds(input.completedProblemIds).filter((id) => eligible.has(id));
    const retained = uniqueOpaqueIds(input.fixedProblemIds).filter((id) => eligible.has(id) && !completed.includes(id));
    const direct = input.directProblemId && eligible.has(input.directProblemId) && !completed.includes(input.directProblemId) && !retained.includes(input.directProblemId) && !input.lastProblemId ? [input.directProblemId] : [];
    const candidates = uniqueOpaqueIds(input.orderedCandidateIds).filter((id) => eligible.has(id) && !completed.includes(id) && !retained.includes(id) && !direct.includes(id) && id !== input.lastProblemId);
    const last = input.lastProblemId && eligible.has(input.lastProblemId) ? [input.lastProblemId] : [];
    const problemIds = uniqueOpaqueIds([...completed, ...retained, ...direct, ...candidates, ...last]).slice(0, required);
    const completedProblemIds = completed.filter((id) => problemIds.includes(id));
    const status = problemIds.length > 0 && completedProblemIds.length >= problemIds.length ? "completed" : "active";
    return {
      problemIds,
      completedProblemIds,
      retryProblemIds: [],
      pendingProblemIds: problemIds.filter((id) => !completedProblemIds.includes(id)),
      requiredCount: problemIds.length,
      status
    };
  }
  function applyCanonicalFixedSetResult(input) {
    const { set, problemId } = input;
    if (!set.problemIds.includes(problemId) || set.status === "completed") return { ...set, stale: true };
    const completedProblemIds = input.qualifying ? uniqueOpaqueIds([...set.completedProblemIds, problemId]) : [...set.completedProblemIds];
    const retryProblemIds = input.qualifying ? set.retryProblemIds.filter((id) => id !== problemId) : uniqueOpaqueIds([...set.retryProblemIds.filter((id) => id !== problemId), problemId]);
    const pendingProblemIds = set.pendingProblemIds.filter((id) => id !== problemId);
    const completed = completedProblemIds.length >= set.requiredCount;
    return {
      ...set,
      completedProblemIds,
      retryProblemIds,
      pendingProblemIds,
      status: completed ? "completed" : "active",
      stale: false
    };
  }
  function nextCanonicalFixedSetIndex(problemIds, completedProblemIds, currentIndex) {
    if (!problemIds.length) return -1;
    const completed = new Set(completedProblemIds);
    for (let offset = 1; offset <= problemIds.length; offset += 1) {
      const index = (clampCanonicalStepIndex(currentIndex, problemIds.length) + offset) % problemIds.length;
      if (!completed.has(problemIds[index])) return index;
    }
    return -1;
  }
  function nextCanonicalSequenceIndex(currentIndex, length) {
    const next = Math.max(0, Math.trunc(currentIndex) || 0) + 1;
    return next < length ? next : -1;
  }
  return __toCommonJS(learningFlow_exports);
})();
