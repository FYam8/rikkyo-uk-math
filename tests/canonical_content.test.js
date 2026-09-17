const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),canonical=JSON.parse(fs.readFileSync(path.join(root,'data','canonical_content.json'),'utf8'));
const questions=JSON.parse(fs.readFileSync(path.join(root,'data','questions.json'),'utf8'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'data','practice_bank.json'),'utf8'));
const exams=JSON.parse(fs.readFileSync(path.join(root,'data','exams.json'),'utf8'));
assert.equal(canonical.contractVersion,1);assert.equal(canonical.schoolId,'rikkyo-uk');
assert.equal(canonical.exams.length,6);assert.equal(canonical.problems.length,623);
const ids=canonical.problems.map(p=>p.problemId),sourceIds=canonical.problems.map(p=>p.sourceProblemId);
assert.equal(new Set(ids).size,623);assert.equal(new Set(sourceIds).size,623);
assert.deepEqual(new Set(sourceIds),new Set([...questions,...bank].map(x=>x.id)));
for(const p of canonical.problems){
  assert.equal(p.problemId,p.sourceProblemId);assert.deepEqual(p.schoolEvidence.sourceRecord,[...questions,...bank].find(x=>x.id===p.sourceProblemId));
  assert.equal(p.answerAuthority.scoreAuthority,'not-available');assert.ok(!('score' in p));assert.ok(!('maxScore' in p));
  if(p.sourceKind==='past-paper'){assert.ok(p.examId);assert.ok(Number.isInteger(p.location.major));assert.ok(Number.isInteger(p.location.minor));}
}
assert.deepEqual(canonical.exams.map(e=>[e.examId,e.year,e.form]),exams.map(e=>[e.examId,e.year,e.examType]));
assert.equal(canonical.exams.find(e=>e.examId==='R25-MATH-A').role,'diagnostic');
assert.equal(canonical.exams.find(e=>e.examId==='R25-MATH-B').role,'transfer');
assert.equal(canonical.exams.find(e=>e.examId==='R26-MATH-B').role,'evaluation');
assert.equal(canonical.exams.find(e=>e.examId==='R26-MATH-A').role,'confirmation');
assert.deepEqual(canonical.problems.filter(p=>p.qualityFlags.includes('REVIEW_REQUIRED')).map(p=>p.problemId),['R26-MATH-A-Q5-3']);
assert.equal(canonical.problems.filter(p=>p.sourceKind==='past-paper'&&p.explanationSteps.length>=2).length,212);
console.log('PASS canonical content: 623/623 lineage, 212/212 explanations, A/B isolation, optional score, REVIEW_REQUIRED');
