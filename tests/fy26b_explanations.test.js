const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const qs=JSON.parse(fs.readFileSync(path.join(root,'data','questions.json'),'utf8'));
const b=qs.filter(q=>q.examId==='R26-MATH-B');
let err=[];
if(b.length!==25)err.push(`FY26B count ${b.length}`);
for(const q of b){
  if(q.explanationStatus!=='AUTHORED_SOURCE_GROUNDED_V1')err.push(`${q.id}: status`);
  if(!Array.isArray(q.explanationSteps)||q.explanationSteps.length<2)err.push(`${q.id}: steps`);
  if(!q.explanation||q.explanation.length<20)err.push(`${q.id}: explanation`);
  if(!q.sourcePageImage)err.push(`${q.id}: source image`);
}
const allDetailed=qs.filter(q=>q.explanationStatus==='AUTHORED_SOURCE_GROUNDED_V1'||q.explanationStatus==='DETAILED_EXISTING_V0_1');
if(allDetailed.length!==212)err.push(`all detailed count ${allDetailed.length}`);
if(err.length){console.error(err.join('\n'));process.exit(1);}
console.log('PASS FY26B explanations 25/25 and all 212 detailed');
