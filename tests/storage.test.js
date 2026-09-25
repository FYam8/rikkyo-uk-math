
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
if(AppStorage.get().schemaVersion!==1||AppStorage.get().contractVersion!==1)throw new Error("schema not canonical v1");
if(!store['rikkyo-uk-math:test:learner-state:v1'])throw new Error("canonical state not written");
if(!store['rikkyoMathFull:test:v3'])throw new Error("v3 compatibility shadow not preserved");
AppStorage.addAttempt({attemptId:"a1",problemId:"P1",submittedAt:new Date().toISOString(),mode:"learning"});
const exp=AppStorage.exportJson();
AppStorage.importJson(exp);
if(AppStorage.get().attempts.filter(x=>x.attemptId==="a1").length!==1)throw new Error("dedupe failed");
let bad=JSON.parse(exp);bad.learnerState.activityRecords.push({attemptId:"x",id:"x",kind:"problem-attempt",problemId:"UNKNOWN",submittedAt:new Date().toISOString(),at:new Date().toISOString(),mode:"learning",outcome:"deferred"});
delete bad.checksum;let h=0x811c9dc5,raw=JSON.stringify(bad);for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,0x01000193);}bad.checksum="fnv1a:"+(h>>>0).toString(16).padStart(8,"0");
let threw=false;try{AppStorage.importJson(JSON.stringify(bad));}catch(e){threw=true;}
if(!threw)throw new Error("unknown problemId import accepted");
console.log("PASS storage");

const firstReview=structuredClone(AppStorage.scheduleReview('P1','CALCULATION',true));
for(let i=0;i<3;i++)AppStorage.scheduleReview('P1','CALCULATION',true);
const pendingReview=AppStorage.reviewItem(firstReview.reviewItemId);
if(pendingReview.stage!==0||pendingReview.dueAt!==firstReview.dueAt)throw new Error('unfinished next-day review was postponed by practice');
AppStorage.setReviewStatus(firstReview.reviewItemId,'done');
const advanced=AppStorage.scheduleReview('P1','CALCULATION',true,firstReview.stage);
if(advanced.stage!==1)throw new Error('completed review must advance with explicit prior stage');
console.log('PASS retention reservation: practice cannot postpone unfinished review');
