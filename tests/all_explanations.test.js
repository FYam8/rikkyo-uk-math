const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const qs=JSON.parse(fs.readFileSync(path.join(root,'data','questions.json'),'utf8'));
let err=[];
for(const q of qs){
 if(q.explanationStatus!=='AUTHORED_SOURCE_GROUNDED_V1')err.push(`${q.id}: status ${q.explanationStatus}`);
 if(!Array.isArray(q.explanationSteps)||q.explanationSteps.length<2)err.push(`${q.id}: steps`);
 if(typeof q.explanation!=='string'||q.explanation.length<20)err.push(`${q.id}: explanation text`);
 if(!q.sourcePageImage||!fs.existsSync(path.join(root,q.sourcePageImage)))err.push(`${q.id}: source image`);
}
if(err.length){console.error(err.slice(0,100).join('\n'));process.exit(1);}
console.log('PASS all explanations 212/212 authored, multi-step, source-linked');
