
const fs=require("fs"),vm=require("vm"),path=require("path");
global.window=global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname,"..","scoring.js"),"utf8"));
const qs=[...JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","questions.json"),"utf8")),...JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","practice_bank.json"),"utf8"))];

function answerFor(q){
  const s=q.answerSpec,t=s.type;
  if(t==="multi_response") return {...s.expected};
  if(t==="coordinate") return {x:String(s.expected.x),y:String(s.expected.y)};
  if(t==="coordinate_set"){
    const out={};
    (q.responseSlots||[]).forEach((slot,i)=>{
      const p=s.expected[i];out[slot]=`(${p.x},${p.y})`;
    });
    return out;
  }
  if(t==="solution_set") return {value:(s.solutions||[]).join(",")};
  if(t==="integer_set") return {value:(s.expected||[]).join(",")};
  if(t==="ratio") return {value:(s.expected||[]).join(":")};
  if(t==="rational") return {value:String((s.accepted||[])[0])};
  if(t==="label") return {value:String(s.expected)};
  return {value:String(s.expected)};
}
let failures=[];
for(const q of qs){
  const g=MathScoring.grade(q,answerFor(q));
  if(q.answerAmbiguityStatus && q.answerAmbiguityStatus!=="none_detected_in_independent_review"){
    if(!g.reviewRequired) failures.push(`${q.id}: ambiguity should return reviewRequired`);
  }else if(g.correct!==true){
    failures.push(`${q.id}: canonical expected answer did not grade true (${q.answerSpec.type})`);
  }
}
// Some wrong-answer controls.
for(const id of ["R25-MATH-A-Q1-1","R24-MATH-A-Q4-3","R26-MATH-B-Q3-5"]){
  const q=qs.find(x=>x.id===id);const g=MathScoring.grade(q,{value:"999999"});
  if(g.correct===true)failures.push(`${id}: obvious wrong answer graded true`);
}
// Equivalence/form checks.
let q=qs.find(x=>x.id==="R25-MATH-A-Q2-1");
if(MathScoring.grade(q,{value:"x^2-x-20"}).correct) failures.push("factorized-form requirement not enforced");
q=qs.find(x=>x.id==="R26-MATH-A-Q1-2");
if(MathScoring.grade(q,{value:"-2(4x+5)-1"}).correct) failures.push("expanded-form requirement not enforced");
q=qs.find(x=>x.id==="R25-MATH-A-Q4-4");
if(!MathScoring.grade(q,{value:"x-5y+10=0"}).correct) failures.push("equivalent linear equation not accepted");

if(failures.length){
  console.error(failures.join("\n"));process.exit(1);
}
console.log(`PASS: ${qs.length} canonical answers + controls`);
