// Read-only characterization of current UI IDs. These are not canonical completion IDs.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'),start=app.indexOf('function todaySessionTaskId('),end=app.indexOf('function setHomeTarget(',start);
assert.ok(start>=0&&end>start);
let active=null,source=null,reviewItems=[];
const paper={examId:'exam-A',exam:{label:'A'},count:2,isDiagnostic:false};
const c={AppStorage:{get:()=>({reviewItems})},preferredActiveSession:()=>active,pendingReinforcementSource:()=>source,nextPastPaperTask:()=>paper,isRouteSession:s=>!!(s.examId||s.flow?.sourceSessionId),resumeLabel:()=> 'resume',examById:()=>({label:'A'}),sourceWrongResults:()=>[{}],chooseToday:()=>({q:{id:'practice',sourceType:'FIXED_PRACTICE'}}),qById:()=>({id:'p',sourceType:'FIXED_PRACTICE'}),fixedPracticeTitle:()=> 'review',h:x=>x,Date};
vm.createContext(c);vm.runInContext(fs.readFileSync('src/engine/todayPlanner.runtime.js','utf8'),c);vm.runInContext(app.slice(start,end),c);
assert.deepEqual(Array.from(c.canonicalTodayQueue(),x=>x.id),['paper:exam-A']);
active={sessionId:'session-A',examId:'exam-A',problemIds:['p'],status:'active'};
assert.deepEqual(Array.from(c.canonicalTodayQueue(),x=>x.id),['paper:exam-A']);
// An unfinished exam has one task; the resume action takes priority.
active=null;source={sessionId:'source-A',examId:'exam-A'};
assert.ok(c.canonicalTodayQueue().some(x=>x.id==='reinforce:source-A'));
active={sessionId:'reinforce-source-A',flow:{sourceSessionId:'source-A'},status:'active'};
const ids=Array.from(c.canonicalTodayQueue(),x=>x.id);
assert.ok(ids.includes('reinforce:source-A'));
assert.ok(!ids.includes('resume:reinforce-source-A'));
assert.equal(active.status,'active');
// The logical reinforcement identity survives the active-session transition.
console.log('PASS stable Today identity: resume replaces start, reinforcement survives UI transition; no completion inferred');

assert.equal(c.todaySessionTaskId({examId:'exam-B',problemIds:['p'],sessionId:'s'}),'paper:exam-B');
assert.equal(c.todaySessionTaskId({reviewItemId:'review-1',problemId:'p',sessionId:'s'}),'review:review-1');
assert.equal(c.todaySessionTaskId({flow:{type:'weakness-set'},problemId:'p',sessionId:'s'}),'fixed-set:s');

source=null;active={sessionId:'review-session',problemId:'p',reviewItemId:'due-1',status:'active'};reviewItems=[{reviewItemId:'due-1',problemId:'p',status:'pending',dueAt:'2000-01-01'}];
const reviewRows=Array.from(c.canonicalTodayQueue()).filter(x=>x.id==='review:due-1');
assert.equal(reviewRows.length,1);assert.equal(reviewRows[0].action,'resumeActiveSession()');
