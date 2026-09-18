var CanonicalTodayPlanner = (() => {
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

  // src/engine/todayPlanner.ts
  var todayPlanner_exports = {};
  __export(todayPlanner_exports, {
    CANONICAL_TODAY_LANE_ORDER: () => CANONICAL_TODAY_LANE_ORDER,
    chooseCanonicalTodayTask: () => chooseCanonicalTodayTask,
    nextIncompleteRouteId: () => nextIncompleteRouteId,
    orderCanonicalTodayCandidates: () => orderCanonicalTodayCandidates,
    uniqueCanonicalTodayCandidates: () => uniqueCanonicalTodayCandidates
  });
  var CANONICAL_TODAY_LANE_ORDER = [
    "route-resume",
    "reinforcement",
    "due-review",
    "past-paper",
    "practice",
    "optional-resume"
  ];
  function orderCanonicalTodayCandidates(candidates, laneOrder = CANONICAL_TODAY_LANE_ORDER) {
    const rank = new Map(laneOrder.map((lane, index) => [lane, index]));
    return candidates.map((candidate, index) => ({ candidate, index })).sort((a, b) => {
      const lane = (rank.get(a.candidate.lane) ?? laneOrder.length) - (rank.get(b.candidate.lane) ?? laneOrder.length);
      if (lane !== 0) return lane;
      const priority = (b.candidate.priority ?? 0) - (a.candidate.priority ?? 0);
      return priority || a.index - b.index;
    }).map((item) => item.candidate);
  }
  function chooseCanonicalTodayTask(candidates, laneOrder = CANONICAL_TODAY_LANE_ORDER) {
    const first = orderCanonicalTodayCandidates(candidates, laneOrder)[0];
    return first ? { lane: first.lane, value: first.value } : null;
  }
  function nextIncompleteRouteId(orderedIds, completedIds) {
    const completed = completedIds instanceof Set ? completedIds : new Set(completedIds);
    return orderedIds.find((id) => !completed.has(id)) ?? null;
  }
  function uniqueCanonicalTodayCandidates(candidates, taskId) {
    const seen = /* @__PURE__ */ new Set();
    return orderCanonicalTodayCandidates(candidates).filter((candidate) => {
      const id = taskId(candidate.value);
      if (!id) throw new Error("logical task identity is required");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return __toCommonJS(todayPlanner_exports);
})();
