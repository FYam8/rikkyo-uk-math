const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/engine/todayPlanner.runtime.js'),'utf8'),context);
const planner=context.CanonicalTodayPlanner;
assert.ok(planner,'canonical Today planner browser runtime is missing');
assert.deepEqual(Array.from(planner.orderCanonicalTodayCandidates([
  {lane:'practice',value:'practice'},
  {lane:'past-paper',value:'paper'},
  {lane:'due-review',value:'due'},
  {lane:'reinforcement',value:'reinforce'},
  {lane:'route-resume',value:'resume'}
]),x=>x.value),['resume','reinforce','due','paper','practice']);
assert.equal(planner.nextIncompleteRouteId(['exam-B','exam-A'],new Set(['exam-B'])),'exam-A');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),profile=fs.readFileSync(path.join(root,'src/schools/rikkyo/appProfile.js'),'utf8');
assert.match(app,/CanonicalTodayPlanner\.chooseCanonicalTodayTask\(candidates\)/,'Rikkyo Today does not consume the canonical planner');
assert.match(app,/CanonicalTodayPlanner\.nextIncompleteRouteId\(PROFILE\.pastPaperRouteExamIds,completed\)/,'Rikkyo route does not use the canonical opaque-ID selector');
assert.doesNotMatch(app,/const PAST_PAPER_ROUTE=/,'Rikkyo app still owns a duplicate route constant');
assert.match(profile,/pastPaperRouteExamIds:\["R25-MATH-A","R24-MATH-A","R24-MATH-B","R25-MATH-B","R26-MATH-B","R26-MATH-A"\]/,'Rikkyo school package must own the A/B-aware route order');
console.log('PASS shared Today planner consumer: canonical priority + Rikkyo-owned opaque exam order');
