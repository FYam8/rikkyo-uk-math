
const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const qs=JSON.parse(fs.readFileSync(path.join(root,"data","questions.json"),"utf8"));
const bank=JSON.parse(fs.readFileSync(path.join(root,"data","practice_bank.json"),"utf8"));
const exams=JSON.parse(fs.readFileSync(path.join(root,"data","exams.json"),"utf8"));
let err=[];
if(qs.length!==212)err.push(`question count ${qs.length}`);
if(new Set(qs.map(q=>q.id)).size!==212)err.push("duplicate IDs");
if(exams.length!==6)err.push(`exam count ${exams.length}`);
if(bank.length!==411)err.push(`bank count ${bank.length}`);
if(new Set(bank.map(q=>q.id)).size!==411)err.push("duplicate bank IDs");
if(bank.filter(q=>q.practiceLevel==="L1").length!==100)err.push("L1 bank count mismatch");
if(bank.filter(q=>q.practiceLevel==="L2").length!==168)err.push("L2 bank count mismatch");
if(bank.filter(q=>q.practiceLevel==="TRANSFER").length!==77)err.push("transfer bank count mismatch");
if(bank.filter(q=>q.practiceLevel==="RETENTION").length!==66)err.push("retention bank count mismatch");
for(const q of qs){
  if(!fs.existsSync(path.join(root,q.sourcePageImage)))err.push(`missing image ${q.id}`);
  if(!q.answerSpec||!q.answerSpec.type)err.push(`missing answerSpec ${q.id}`);
  if(!q.explanation)err.push(`missing explanation scaffold ${q.id}`);
}
if(err.length){console.error(err.slice(0,50).join("\n"));process.exit(1);}
for(const q of bank){if(!q.answerSpec||!q.answerSpec.type)err.push(`missing bank answerSpec ${q.id}`);if(!q.promptText||!q.explanation)err.push(`missing bank text ${q.id}`);}
if(err.length){console.error(err.slice(0,50).join("\n"));process.exit(1);}
console.log("PASS content 212 past + 411 bank = 623 problem IDs");
