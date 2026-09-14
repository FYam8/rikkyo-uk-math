const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const qs=JSON.parse(fs.readFileSync(path.join(root,"data","questions.json"),"utf8"));
const a=qs.filter(q=>q.examId==="R26-MATH-A");
let err=[];
if(a.length!==25)err.push(`FY26A count ${a.length}`);
for(const q of a){
  if(q.explanationStatus!=="AUTHORED_SOURCE_GROUNDED_V1")err.push(`${q.id}: status`);
  if(!Array.isArray(q.explanationSteps)||q.explanationSteps.length<2)err.push(`${q.id}: steps`);
  if(!q.explanation||q.explanation.length<20)err.push(`${q.id}: explanation`);
  if(!q.sourcePageImage)err.push(`${q.id}: source image`);
}
const amb=a.find(q=>q.id==="R26-MATH-A-Q5-3");
if(!amb||!String(amb.answerAmbiguityStatus).includes("flagged"))err.push("Q5-3 ambiguity flag missing");
if(err.length){console.error(err.join("\n"));process.exit(1);}
console.log("PASS FY26A explanations 25/25");
