const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const root=path.join(__dirname,'..');
const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src','engine','learningFlow.runtime.js'),'utf8'),context);
const flow=context.CanonicalLearningFlow;
assert.ok(flow,'CanonicalLearningFlow runtime must load');

const initial=flow.reconcileCanonicalFixedSet({
  requiredCount:4,
  eligibleProblemIds:['p1','p2','p3','p4'],
  fixedProblemIds:['p1','p2','p3','p4'],
  completedProblemIds:[],
  orderedCandidateIds:['p1','p2','p3','p4']
});
assert.deepEqual([...initial.problemIds],['p1','p2','p3','p4']);
const wrong=flow.applyCanonicalFixedSetResult({set:initial,problemId:'p1',qualifying:false});
assert.deepEqual([...wrong.completedProblemIds],[]);
assert.deepEqual([...wrong.retryProblemIds],['p1']);
const p2=flow.nextCanonicalFixedSetIndex(wrong.problemIds,wrong.completedProblemIds,0);
assert.equal(p2,1);
const correct=flow.applyCanonicalFixedSetResult({set:wrong,problemId:'p1',qualifying:true});
assert.deepEqual([...correct.completedProblemIds],['p1']);
assert.deepEqual([...correct.retryProblemIds],[]);
assert.equal(flow.nextCanonicalSequenceIndex(1,3),2);
assert.equal(flow.nextCanonicalSequenceIndex(2,3),-1);
assert.equal(flow.clampCanonicalStepIndex(99,3),2);
console.log('PASS shared learning flow: guided steps and fixed-set retry use canonical runtime');
