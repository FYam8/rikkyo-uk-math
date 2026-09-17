const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const qs=JSON.parse(fs.readFileSync(path.join(root,'data','questions.json'),'utf8'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'data','practice_bank.json'),'utf8'));
const summary=JSON.parse(fs.readFileSync(path.join(root,'data','build_summary.json'),'utf8'));
const learning=JSON.parse(fs.readFileSync(path.join(root,'docs','rikkyo_math_learning_design_freeze_v1_0.json'),'utf8'));
require(path.join(root,'src','schools','rikkyo','appProfile.js'));
const labels=globalThis.RIKKYO_MATH_PROFILE.presentationLabels;
let err=[];
if(qs.length!==212) err.push(`past ${qs.length}`);
if(bank.length!==411) err.push(`bank ${bank.length}`);
if(qs.length+bank.length!==623) err.push('total not 623');
for(const q of qs){
  if(q.explanationStatus!=='AUTHORED_SOURCE_GROUNDED_V1') err.push(`${q.id}: legacy explanation status`);
  if(!Array.isArray(q.explanationSteps)||q.explanationSteps.length<2) err.push(`${q.id}: <2 steps`);
  if(!q.sourcePageImage||!fs.existsSync(path.join(root,q.sourcePageImage))) err.push(`${q.id}: source image`);
}
const lc={}; for(const p of bank){const k=`${p.familyId}|${p.practiceLevel}`;lc[k]=(lc[k]||0)+1;}
const map={level1:'L1',level2:'L2',transfer:'TRANSFER',retention:'RETENTION'};
for(const f of learning.practiceFamilies){
  for(const [k,v] of Object.entries(f.bankTarget)){
    const got=lc[`${f.familyId}|${map[k]}`]||0;
    if(got!==v) err.push(`${f.familyId} ${k}: ${got} != ${v}`);
  }
}
const levels={};for(const p of bank)levels[p.practiceLevel]=(levels[p.practiceLevel]||0)+1;
const expected={L1:100,L2:168,TRANSFER:77,RETENTION:66};
for(const [k,v] of Object.entries(expected))if(levels[k]!==v)err.push(`${k}: ${levels[k]} != ${v}`);
for(const skill of new Set([...qs,...bank].map(q=>q.primarySkill)))if(!labels.skills[skill])err.push(`learner skill label missing: ${skill}`);
for(const family of new Set(bank.map(q=>q.familyId)))if(!labels.families[family])err.push(`learner family label missing: ${family}`);
for(const level of new Set(bank.map(q=>q.practiceLevel)))if(!labels.practiceLevels[level])err.push(`learner practice label missing: ${level}`);
if(summary.practiceBankCount!==411||summary.totalProblemIds!==623)err.push('summary counts');
if(summary.fullyAuthoredStepExplanations!==212||summary.remainingPastExamScaffoldQuestions!==0||summary.allPastExamQuestionsDetailed!==true)err.push('summary explanations');
if(summary.releaseCandidate!=='v1.0-rc2')err.push('summary release');
const amb=qs.filter(q=>String(q.answerAmbiguityStatus||'').includes('flagged')).map(q=>q.id);
if(JSON.stringify(amb)!==JSON.stringify(['R26-MATH-A-Q5-3']))err.push(`ambiguity set ${JSON.stringify(amb)}`);
if(err.length){console.error(err.slice(0,80).join('\n'));process.exit(1);}
console.log('PASS release invariants: 212 authored + 411 bank + target counts + ambiguity');
