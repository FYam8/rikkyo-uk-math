const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const questions=JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'),'utf8'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/practice_bank.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');

const unmapped=[];
for(const source of questions){
  const sameSkill=bank.filter(item=>item.primarySkill===source.primarySkill);
  if(!sameSkill.length){unmapped.push(source.id);continue;}
  assert.ok(sameSkill.some(item=>item.practiceLevel==='L1'),`${source.id}: explicit primarySkill has no L1`);
  assert.ok(sameSkill.some(item=>item.practiceLevel==='L2'),`${source.id}: explicit primarySkill has no L2`);
}
assert.deepEqual(unmapped,['R24-MATH-B-Q4-5'],'only the audited mixture word problem may remain without a guessed practice mapping');
assert.match(app,/q\.primarySkill===source\.primarySkill&&q\.practiceLevel===level/,'L1/L2 selection must use the explicit primarySkill field');
assert.match(app,/unmappedSourceProblemIds\.push\(problemIdOf\(source\)\)/,'missing mappings must remain explicit');
assert.match(app,/stageByProblemId\[problemIdOf\(source\)\]="source-review"/,'the original wrong problem must be corrected before fixed practice');
assert.match(app,/q\.primarySkill===skill&&q\.practiceLevel==="TRANSFER"&&cleanTransferEligible\(q\)/,'clean transfer must follow same-skill practice without holdout leakage');
const mappingBody=app.slice(app.indexOf('function buildReinforcementSpec'),app.indexOf('function pendingReinforcementSource'));
assert.doesNotMatch(mappingBody,/problemIdOf\(source\).*\.(?:split|match)\(/,'generic reinforcement mapping must not parse problemId');
console.log('PASS reinforcement mapping: 211 explicit-primarySkill mappings + 1 fail-closed source review');
