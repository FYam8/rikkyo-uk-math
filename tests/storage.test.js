
const fs=require("fs"),vm=require("vm"),path=require("path");
const store={};
global.window=global;
global.location={search:"?env=test"};
global.localStorage={
 getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
 setItem:(k,v)=>{store[k]=String(v)},
 removeItem:k=>{delete store[k]}
};
vm.runInThisContext(fs.readFileSync(path.join(__dirname,"..","storage.js"),"utf8"));
AppStorage.setKnownProblemIds(["P1","P2"]);
if(AppStorage.get().schemaVersion!==3)throw new Error("schema not v3");
AppStorage.addAttempt({attemptId:"a1",problemId:"P1",submittedAt:new Date().toISOString(),mode:"learning"});
const exp=AppStorage.exportJson();
AppStorage.importJson(exp);
if(AppStorage.get().attempts.filter(x=>x.attemptId==="a1").length!==1)throw new Error("dedupe failed");
let bad=JSON.parse(exp);bad.attempts.push({attemptId:"x",problemId:"UNKNOWN",submittedAt:new Date().toISOString(),mode:"learning"});
delete bad.checksum;
let threw=false;try{AppStorage.importJson(JSON.stringify(bad));}catch(e){threw=true;}
if(!threw)throw new Error("unknown problemId import accepted");
console.log("PASS storage");
