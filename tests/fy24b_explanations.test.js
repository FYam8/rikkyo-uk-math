const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const qs=JSON.parse(fs.readFileSync(path.join(root,"data","questions.json"),"utf8"));
const b=qs.filter(q=>q.examId==="R24-MATH-B");
let err=[];
if(b.length!==39)err.push(`FY24B count ${b.length}`);
for(const q of b){
  if(q.explanationStatus!=="AUTHORED_SOURCE_GROUNDED_V1")err.push(`${q.id}: status`);
  if(!Array.isArray(q.explanationSteps)||q.explanationSteps.length<2)err.push(`${q.id}: steps`);
  if(!q.explanation||q.explanation.length<20)err.push(`${q.id}: explanation`);
  if(!q.sourcePageImage)err.push(`${q.id}: source image`);
}
if(err.length){console.error(err.join("\n"));process.exit(1);}
console.log("PASS FY24B explanations 39/39");
