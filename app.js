
const PROFILE=window.RIKKYO_MATH_PROFILE;
let QUESTIONS=[], BANK=[], ALL_ITEMS=[], EXAMS=[], REGISTRY={},CANONICAL_CONTENT=null;
let activeTimer=null,activeTimerCommit=null,activeTimerUi=null;
let currentView="home";

function h(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function stopTimer(){if(activeTimerUi){clearInterval(activeTimerUi);activeTimerUi=null;}if(!activeTimer)return 0;const ms=activeTimer.stop();if(activeTimerCommit)try{activeTimerCommit(ms);}catch(e){}activeTimer=null;activeTimerCommit=null;return ms;}
function createActiveTimer(initial=0){
  let total=Number(initial)||0,last=Date.now(),running=!document.hidden;
  function pause(){if(running){total+=Date.now()-last;running=false;}}
  function resume(){if(!running){last=Date.now();running=true;}}
  const vis=()=>document.hidden?pause():resume();
  document.addEventListener("visibilitychange",vis);
  return {ms:()=>total+(running?Date.now()-last:0),stop:()=>{pause();document.removeEventListener("visibilitychange",vis);return total;}};
}
function problemIdOf(q){return q?.problemId||q?.id;}
function qById(id){return ALL_ITEMS.find(q=>problemIdOf(q)===id);}
function examById(id){return EXAMS.find(e=>e.examId===id);}
function examQuestions(id){return QUESTIONS.filter(q=>q.examId===id).sort((a,b)=>a.majorQuestion-b.majorQuestion||a.minorQuestion-b.minorQuestion);}
function groupId(q){return `${q.examId}-Q${q.majorQuestion}`;}
function attempts(){return AppStorage.get().attempts;}
function lastAttempt(id){return [...attempts()].reverse().find(a=>a.problemId===id);}
function targetRank(x){return x==="MUST"?3:x==="SHOULD"?2:1;}
function targetFor(q){return q.targetRelevance?.[AppStorage.get().settings.target||"stable"]||"SHOULD";}
function app(){return document.getElementById("app");}
function targetLabel(id){return PROFILE.targets.find(target=>target.id===id)?.label||id;}
function formatElapsed(ms){const total=Math.floor((Number(ms)||0)/1000),m=Math.floor(total/60),s=total%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function mountFloatingTimer(){
  let el=document.getElementById("floatingTimer");
  if(!el){el=document.createElement("div");el.id="floatingTimer";el.className="floating-timer";document.body.appendChild(el);}
  const refresh=()=>{if(el&&activeTimer)el.textContent=`経過 ${formatElapsed(activeTimer.ms())}`;};
  refresh();if(activeTimerUi)clearInterval(activeTimerUi);activeTimerUi=setInterval(refresh,1000);
}
function setActiveNav(view){
  const navView=["home","today","library","progress","data"].includes(view)?view:["diagnostic","practice","review","exams"].includes(view)?"library":currentView==="today"?"today":"library";
  document.querySelectorAll("#nav [data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===navView));
}

async function boot(){
  [CANONICAL_CONTENT,REGISTRY]=await Promise.all([
    fetch("data/canonical_content.json").then(r=>r.json()),
    fetch("data/registry.json").then(r=>r.json())
  ]);
  if(CANONICAL_CONTENT.contractVersion!==1||CANONICAL_CONTENT.schoolId!==PROFILE.id)throw new Error("canonical content identity mismatch");
  const runtimeProblem=p=>({...p.schoolEvidence.sourceRecord,problemId:p.problemId,sourceProblemId:p.sourceProblemId,sourceKind:p.sourceKind,location:p.location,canonicalRole:p.role,canonicalAnswerAuthority:p.answerAuthority,qualityFlags:p.qualityFlags});
  QUESTIONS=CANONICAL_CONTENT.problems.filter(p=>p.sourceKind==="past-paper").map(runtimeProblem);
  BANK=CANONICAL_CONTENT.problems.filter(p=>p.sourceKind==="fixed-practice").map(runtimeProblem);
  EXAMS=CANONICAL_CONTENT.exams.map(e=>({...e.schoolEvidence.sourceRecord,canonicalScoreAuthority:e.scoreAuthority}));
  ALL_ITEMS=[...QUESTIONS,...BANK];
  AppStorage.setKnownProblemIds(ALL_ITEMS.map(problemIdOf));
  document.title=PROFILE.brand.title;
  document.getElementById("brandTitle").textContent=PROFILE.brand.title;
  document.getElementById("brandSubtitle").textContent=PROFILE.brand.subtitle;
  document.getElementById("brandFooter").textContent=PROFILE.brand.footer;
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>render(b.dataset.view));
  render("home");
}
function render(view){
  stopTimer();document.getElementById("floatingTimer")?.remove();currentView=view;setActiveNav(view);
  if(view==="home")return renderHome();
  if(view==="diagnostic")return renderDiagnostic();
  if(view==="today")return renderToday();
  if(view==="library")return renderLibrary();
  if(view==="practice")return renderPractice();
  if(view==="review")return renderReview();
  if(view==="exams")return renderExams();
  if(view==="progress")return renderProgress();
  if(view==="data")return renderData();
}

// ---------- exposure / transfer ----------
function groupExposed(gid){
  return QUESTIONS.filter(q=>`${q.examId}-Q${q.majorQuestion}`===gid).some(q=>AppStorage.exposureStatus(problemIdOf(q))!=="unseen");
}
function parallelMateQuestion(q){
  if(!q.parallelFormFamilyId)return null;
  const fam=(REGISTRY.parallelFormFamilies||[]).find(f=>f.id===q.parallelFormFamilyId);
  if(!fam)return null;
  const slot=(fam.slots||[]).find(s=>s.slot===q.parallelFormSlot);
  if(!slot)return null;
  const mate=slot.aQuestionId===problemIdOf(q)?slot.bQuestionId:slot.aQuestionId;
  return qById(mate);
}
function cleanTransferEligible(q){
  if(AppStorage.exposureStatus(problemIdOf(q))!=="unseen")return false;
  if(q.sourceType==="FIXED_PRACTICE"){
    return q.practiceLevel==="TRANSFER" && q.transferEligibleByDesign===true && !(q.nearDuplicateOf||[]).length;
  }
  const mate=parallelMateQuestion(q);
  if(mate&&AppStorage.exposureStatus(mate.id)!=="unseen")return false;
  const gid=groupId(q);
  for(const r of (REGISTRY.explicitCrossExamRelations||[])){
    if(r.pureTransferEligibleIfExposed!==false)continue;
    if(r.groupA===gid&&groupExposed(r.groupB))return false;
    if(r.groupB===gid&&groupExposed(r.groupA))return false;
  }
  return true;
}
function examExposure(examId){
  const qs=examQuestions(examId),states=qs.map(q=>AppStorage.exposureStatus(problemIdOf(q)));
  if(states.every(s=>s==="unseen"))return "unseen";
  if(states.every(s=>s==="practiced"))return "practiced";
  return "seen";
}
function parallelMateExposed(exam){
  if(!exam.parallelFormFamilyId)return false;
  const fam=(REGISTRY.parallelFormFamilies||[]).find(f=>f.id===exam.parallelFormFamilyId);if(!fam)return false;
  const mate=exam.examId===fam.examA?fam.examB:fam.examA;
  return examExposure(mate)!=="unseen";
}

// ---------- stats ----------
function skillStats(){
  const map={};
  for(const a of attempts()){
    if(a.correct!==true&&a.correct!==false)continue;
    const s=a.skill||qById(a.problemId)?.primarySkill||"OTHER";
    if(!map[s])map[s]={n:0,c:0,retN:0,retC:0,trN:0,trC:0};
    map[s].n++;if(a.correct)map[s].c++;
    if(a.mode==="retention"){map[s].retN++;if(a.correct)map[s].retC++;}
    if(["transfer","evaluation"].includes(a.mode)&&a.transferEligibleAtAttempt){map[s].trN++;if(a.correct)map[s].trC++;}
  }
  return Object.entries(map).map(([skill,x])=>{
    const acc=x.n?x.c/x.n:0;
    let state="learning";
    if(x.n>=2&&acc<.6)state="weak";
    else if(x.n>=2)state="improving";
    if(x.n>=4&&acc>=.8&&x.retC>=1&&x.trC>=1)state="mastered";
    return {skill,...x,acc,state};
  });
}
function modeStats(mode){
  const a=attempts().filter(x=>x.mode===mode&&(x.correct===true||x.correct===false));
  return {n:a.length,c:a.filter(x=>x.correct).length};
}

// ---------- past paper -> source review -> fixed practice ----------
function reinforcementSessionId(sourceSessionId){return `reinforce-${sourceSessionId}`;}
function modeForPractice(q){return q.practiceLevel==="TRANSFER"?"transfer":q.practiceLevel==="RETENTION"?"retention":"learning";}
function stableNumber(value){let n=2166136261;for(const ch of String(value)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function deterministicBankPick(pool,key,count,used){
  const sorted=[...pool].sort((a,b)=>problemIdOf(a).localeCompare(problemIdOf(b))),picked=[];
  if(!sorted.length)return picked;
  const offset=stableNumber(key)%sorted.length;
  for(let i=0;i<sorted.length&&picked.length<count;i++){const q=sorted[(offset+i)%sorted.length],id=problemIdOf(q);if(!used.has(id)){used.add(id);picked.push(q);}}
  return picked;
}
function sourceWrongResults(s){return (s?.results||[]).filter(result=>result.correct===false&&!result.reviewRequired);}
function reinforcementForSource(sourceSessionId){return AppStorage.session(reinforcementSessionId(sourceSessionId));}
function buildReinforcementSpec(sourceSession){
  const wrong=sourceWrongResults(sourceSession),used=new Set(),problemIds=[],mappingBySourceProblemId={},stageByProblemId={},unmappedSourceProblemIds=[];
  for(const result of wrong){
    const source=qById(result.problemId);if(!source)continue;
    problemIds.push(problemIdOf(source));stageByProblemId[problemIdOf(source)]="source-review";
    const matched=[];
    for(const level of ["L1","L2"]){
      const all=BANK.filter(q=>q.primarySkill===source.primarySkill&&q.practiceLevel===level),unseen=all.filter(q=>AppStorage.exposureStatus(problemIdOf(q))==="unseen"),pool=unseen.length?unseen:all;
      for(const q of deterministicBankPick(pool,`${problemIdOf(source)}:${level}`,1,used)){const id=problemIdOf(q);matched.push(id);problemIds.push(id);stageByProblemId[id]=level.toLowerCase();}
    }
    mappingBySourceProblemId[problemIdOf(source)]={basis:"explicit-primarySkill",primarySkill:source.primarySkill,practiceProblemIds:matched};
    if(!matched.length)unmappedSourceProblemIds.push(problemIdOf(source));
  }
  for(const skill of [...new Set(wrong.map(result=>qById(result.problemId)?.primarySkill).filter(Boolean))]){
    const pool=BANK.filter(q=>q.primarySkill===skill&&q.practiceLevel==="TRANSFER"&&cleanTransferEligible(q));
    for(const q of deterministicBankPick(pool,`${sourceSession.sessionId}:${skill}:transfer`,1,used)){const id=problemIdOf(q);problemIds.push(id);stageByProblemId[id]="transfer";}
  }
  return {sourceSessionId:sourceSession.sessionId,sourceExamId:sourceSession.examId,sourceProblemIds:wrong.map(x=>x.problemId),problemIds,mappingBySourceProblemId,stageByProblemId,unmappedSourceProblemIds};
}
function pendingReinforcementSource(){
  return Object.values(AppStorage.get().sessions).filter(s=>s?.status==="finished"&&Array.isArray(s.results)&&sourceWrongResults(s).length)
    .filter(s=>reinforcementForSource(s.sessionId)?.status!=="finished").sort((a,b)=>String(b.finishedAt||b.startedAt).localeCompare(String(a.finishedAt||a.startedAt)))[0]||null;
}
function startReinforcement(sourceSessionId){
  const source=AppStorage.session(sourceSessionId);if(!source)return render("home");
  const sid=reinforcementSessionId(sourceSessionId);let session=AppStorage.session(sid);
  if(!session){
    const flow=buildReinforcementSpec(source);if(!flow.problemIds.length)return renderReinforcementComplete({flow,status:"finished"});
    const first=qById(flow.problemIds[0]);session={sessionId:sid,mode:modeForPractice(first),problemId:problemIdOf(first),answerDraft:{},startedAt:new Date().toISOString(),activeMs:0,retryCount:0,hintLevel:0,hintEvents:[],exposureBefore:AppStorage.exposureStatus(problemIdOf(first)),status:"active",flow:{...flow,index:0}};AppStorage.setSession(sid,session);
  }
  if(session.status==="finished")return renderReinforcementComplete(session);
  if(session.problemCompleted)return advanceReinforcement(session,true);
  renderPracticeQuestion(qById(session.problemId),session);
}
function reinforcementStageLabel(s){const stage=s.flow?.stageByProblemId?.[s.problemId];return stage==="source-review"?"元問題の解き直し":stage==="l1"?"L1 基礎補強":stage==="l2"?"L2 実戦補強":stage==="transfer"?"Clean Transfer":"弱点補強";}
function advanceReinforcement(session,renderNext){
  const next=(session.flow.index||0)+1;
  if(next>=session.flow.problemIds.length){session.status="finished";session.flow.index=next;session.flow.completedAt=new Date().toISOString();AppStorage.setSession(session.sessionId,session);return renderReinforcementComplete(session);}
  const nextId=session.flow.problemIds[next],q=qById(nextId);session.flow.index=next;session.problemId=nextId;session.mode=modeForPractice(q);session.answerDraft={};session.startedAt=new Date().toISOString();session.activeMs=0;session.retryCount=0;session.hintLevel=0;session.hintEvents=[];session.exposureBefore=AppStorage.exposureStatus(nextId);session.problemCompleted=false;session.status="active";AppStorage.setSession(session.sessionId,session);
  renderNext?renderPracticeQuestion(q,session):render("home");
}
function renderReinforcementComplete(session){
  const flow=session.flow||session;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">REINFORCEMENT COMPLETE</span><h1>過去問からの弱点補強が完了</h1><p class="muted">元問題の解き直し、L1/L2類題、Clean Transferまで完了しました。</p></div></div><section class="card"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="done"><b>2</b><span>元問題を直す</span></div><div class="done"><b>3</b><span>L1/L2類題</span></div><div class="done"><b>4</b><span>転移・定着</span></div></div><h2>翌日のRetentionへつなぎました</h2><p>正解した類題は復習予約に入り、期限が来ると「今日の学習」に表示されます。</p><div class="actions"><button onclick="render('home')">ホームへ</button><button class="secondary" onclick="render('exams')">次の過去問</button></div></section>`;
}

// ---------- source / input ----------
function sourceBlock(q,open=true){
  const prompt=q.promptText?`<div class="prompt-text">${h(q.promptText)}</div>`:"";
  if(q.sourceType==="FIXED_PRACTICE" || !q.sourcePageImage){
    return `${prompt}<p class="small muted">固定類題Bank / ${h(q.practiceLevel||"")} / ${h(q.familyId||q.primarySkill||"")}</p>`;
  }
  return `${prompt}<details class="source-wrap" ${open?"open":""}>
    <summary>原本 ${h(q.sourceDocument)} / PDF ${q.sourcePdfPage}ページ / ${h(q.label)}</summary>
    <a class="source-link" href="${h(q.sourcePageImage)}" target="_blank" rel="noopener">
      <img class="source-page" loading="lazy" src="${h(q.sourcePageImage)}" alt="${h(q.examId+" "+q.label+" 原本ページ")}">
    </a>
    <p class="small muted">現在の設問は <strong>${h(q.label)}</strong>。画像をタップすると別タブで拡大できます。</p>
  </details>`;
}
function qInput(q,draft={}){
  const t=q.answerSpec?.type;
  if(t==="multi_response"){
    return `<div class="multi-input">${q.responseSlots.map(k=>`<label>${h(k)}<input data-slot="${h(k)}" type="text" value="${h(draft[k]||"")}"></label>`).join("")}</div>`;
  }
  if(t==="coordinate"){
    return `<div class="multi-input"><label>x<input data-slot="x" type="text" value="${h(draft.x||"")}"></label><label>y<input data-slot="y" type="text" value="${h(draft.y||"")}"></label></div>`;
  }
  if(t==="coordinate_set"){
    return `<div class="multi-input">${q.responseSlots.map((k,i)=>`<label>点${i+1} (x,y)<input data-slot="${h(k)}" type="text" value="${h(draft[k]||"")}"></label>`).join("")}</div>`;
  }
  const ph=t==="solution_set"?"例: 2,-3 または 2±√6":t==="ratio"?"例: 2:3":"";
  return `<label>解答<input data-slot="value" type="text" placeholder="${h(ph)}" value="${h(draft.value||"")}" autocomplete="off"></label>`;
}
function readAnswer(q){
  const out={};document.querySelectorAll("[data-slot]").forEach(x=>out[x.dataset.slot]=x.value);
  return out;
}
function bindDraftSaver(q,cb){
  document.querySelectorAll("[data-slot]").forEach(x=>x.addEventListener("input",()=>cb(readAnswer(q))));
}
function mathKeypad(){
  const keys=[["分数","/"],["√","√()"],["x²","^2"],["( )","()"],["−","-"],["±","±"],["π","π"],["比",":"],[",",","],["≦","≦"],["≧","≧"],["＜","<"],["＞",">"],["＝","="]];
  return `<p class="math-help">分数は /、累乗は ^、複数解はカンマで入力できます。</p><div class="math-keypad" aria-label="数式入力補助">${keys.map(([label,value])=>`<button type="button" data-math-key="${h(value)}">${h(label)}</button>`).join("")}<button type="button" data-math-action="backspace">⌫</button><button type="button" data-math-action="clear">クリア</button></div>`;
}
function bindMathKeypad(){
  let focused=document.querySelector("[data-slot]");
  document.querySelectorAll("[data-slot]").forEach(input=>input.addEventListener("focus",()=>focused=input));
  document.querySelectorAll("[data-math-key],[data-math-action]").forEach(button=>button.addEventListener("pointerdown",event=>event.preventDefault()));
  document.querySelectorAll("[data-math-key]").forEach(button=>button.onclick=()=>{
    if(!focused)return;const start=focused.selectionStart??focused.value.length,end=focused.selectionEnd??start,value=button.dataset.mathKey;
    focused.value=focused.value.slice(0,start)+value+focused.value.slice(end);focused.focus();focused.setSelectionRange(start+value.length,start+value.length);focused.dispatchEvent(new Event("input",{bubbles:true}));
  });
  document.querySelector('[data-math-action="backspace"]')?.addEventListener("click",()=>{
    if(!focused)return;const start=focused.selectionStart??focused.value.length,end=focused.selectionEnd??start,from=start===end?Math.max(0,start-1):start;
    focused.value=focused.value.slice(0,from)+focused.value.slice(end);focused.focus();focused.setSelectionRange(from,from);focused.dispatchEvent(new Event("input",{bubbles:true}));
  });
  document.querySelector('[data-math-action="clear"]')?.addEventListener("click",()=>{if(focused){focused.value="";focused.focus();focused.dispatchEvent(new Event("input",{bubbles:true}));}});
}
function answerDisplay(q){return q.answerCandidate??q.answerSpec?.expected??"—";}

function explanationHtml(q){
  if(Array.isArray(q.explanationSteps)&&q.explanationSteps.length){
    const kp=q.explanationKeyPoint?`<div class="notice"><strong>ポイント</strong><br>${h(q.explanationKeyPoint)}</div>`:"";
    const mistakes=(q.commonMistakes||[]).length?`<div class="warn"><strong>注意</strong><ul>${q.commonMistakes.map(x=>`<li>${h(x)}</li>`).join("")}</ul></div>`:"";
    return `<div class="explanation"><strong>段階解説</strong><ol>${q.explanationSteps.map(x=>`<li>${h(x)}</li>`).join("")}</ol>${kp}${mistakes}</div>`;
  }
  return `<div class="explanation"><strong>解説 scaffold</strong><p>${h(q.explanation)}</p></div>`;
}


// ---------- attempt recording ----------
function recordAttempt(q,ans,g,meta){
  return AppStorage.addAttempt({
    problemId:problemIdOf(q),contentVersion:q.contentVersion||1,answerSpecVersion:q.answerSpecVersion||1,scoreSpecVersion:null,
    answerSnapshot:ans,correct:g.reviewRequired?null:g.correct,requiresReview:!!g.reviewRequired,
    officialScore:null,learningScore:g.correct===true?1:g.correct===false?0:null,
    startedAt:meta.startedAt,submittedAt:new Date().toISOString(),activeDurationMs:meta.activeDurationMs??null,
    hintEvents:meta.hintEvents||[],retryCount:meta.retryCount||0,mode:meta.mode,
    learnerExposureStatusBeforeAttempt:meta.exposureBefore,transferEligibleAtAttempt:!!meta.transferEligible,
    errorCauseCandidates:[],deviceId:AppStorage.get().device.deviceId,sessionId:meta.sessionId||null,
    environment:AppStorage.namespace(),skill:q.primarySkill,difficulty:q.difficulty,examId:q.examId
  });
}

// ---------- home ----------
function phaseDone(role,examIds){
  if(["diagnostic","training","evaluation","confirmation"].includes(role)||(role==="transfer"&&examIds.length)){
    return examIds.length>0&&examIds.every(id=>examExposure(id)==="practiced");
  }
  if(role==="remediation")return attempts().some(a=>a.correct===true&&["L1","L2"].includes(qById(a.problemId)?.practiceLevel));
  if(role==="transfer")return attempts().some(a=>a.correct===true&&a.mode==="transfer"&&a.transferEligibleAtAttempt);
  if(role==="retention")return attempts().some(a=>a.correct===true&&a.mode==="retention");
  return false;
}
function routeSnapshot(){
  const items=PROFILE.learningPhases.map(p=>({...p,done:phaseDone(p.role,p.examIds||[])}));
  const active=Math.max(0,items.findIndex(p=>!p.done));
  return {items,active,complete:items.every(p=>p.done)};
}
function resumeLabel(s){
  if(!s)return"";
  if(s.flow?.sourceSessionId)return`${examById(s.flow.sourceExamId)?.label||"過去問"}の弱点補強 ${Math.min((s.flow.index||0)+1,s.flow.problemIds.length)}/${s.flow.problemIds.length}`;
  if(s.mode==="diagnostic")return"Core Diagnosticの続き";
  if(Array.isArray(s.problemIds))return`${examById(s.examId)?.label||"過去問"} ${Math.min((s.index||0)+1,s.problemIds.length)}/${s.problemIds.length}から再開`;
  const q=qById(s.problemId);return`${q?.sourceType==="FIXED_PRACTICE"?(q.practiceLevel||"類題"):(q?.examId||"問題")} ${q?.label||""}の続き`;
}
function preferredActiveSession(){
  const priority=s=>s.flow?.sourceSessionId?4:s.mode==="diagnostic"?3:Array.isArray(s.problemIds)?2:s.problemId?1:0;
  return AppStorage.activeSessions().sort((a,b)=>priority(b)-priority(a)||String(b.updatedAt||b.startedAt||"").localeCompare(String(a.updatedAt||a.startedAt||"")))[0]||null;
}
const PAST_PAPER_ROUTE=["R25-MATH-A","R24-MATH-A","R24-MATH-B","R25-MATH-B","R26-MATH-B","R26-MATH-A"];
function examCompletedForRoute(examId){
  const required=examQuestions(examId).length;
  if(!required)return false;
  const finished=Object.values(AppStorage.get().sessions).some(s=>s?.examId===examId&&s.status==="finished"&&Array.isArray(s.results)&&new Set(s.results.map(r=>r.problemId)).size>=required);
  return finished||examExposure(examId)==="practiced";
}
function nextPastPaperTask(){
  const examId=PAST_PAPER_ROUTE.find(id=>!examCompletedForRoute(id));
  if(!examId)return null;
  const exam=examById(examId),count=examQuestions(examId).length;
  return {examId,exam,count,isDiagnostic:examId===DIAG_EXAM};
}
function startPastPaperTask(examId){return examId===DIAG_EXAM?render("diagnostic"):startExam(examId);}
function isRouteSession(s){return !!(s&&(s.flow?.sourceSessionId||s.mode==="diagnostic"||Array.isArray(s.problemIds)));}
function setHomeTarget(id){AppStorage.setTarget(id);render("home");}
function renderHome(){
  const st=AppStorage.get(),target=st.settings.target||"stable",a=attempts(),graded=a.filter(x=>x.correct===true||x.correct===false),correct=graded.filter(x=>x.correct===true).length,stats=skillStats();
  const pending=st.reviewItems.filter(x=>x.status==="pending"),due=pending.filter(x=>Date.parse(x.dueAt)<=Date.now()).length;
  const anyResumable=preferredActiveSession(),pendingSource=pendingReinforcementSource(),today=chooseToday(),pastPaper=nextPastPaperTask(),resumable=isRouteSession(anyResumable)||!pastPaper?anyResumable:null,deferredResumable=anyResumable&&!resumable?anyResumable:null,route=routeSnapshot(),weak=stats.filter(s=>s.state==="weak").sort((x,y)=>x.acc-y.acc).slice(0,3);
  const dueToday=today.reviewItemId?today:null;
  const todaySource=resumable?resumeLabel(resumable):pendingSource?`${examById(pendingSource.examId)?.label||pendingSource.examId}・誤答 ${sourceWrongResults(pendingSource).length}問`:dueToday?(dueToday.q.sourceType==="FIXED_PRACTICE"?`${dueToday.q.practiceLevel||"類題"} / ${dueToday.q.familyId||dueToday.q.primarySkill}`:`${dueToday.q.examId} ${dueToday.q.label}`):pastPaper?`${pastPaper.exam.label}・全${pastPaper.count}問`:today.q.sourceType==="FIXED_PRACTICE"?`${today.q.practiceLevel||"類題"} / ${today.q.familyId||today.q.primarySkill}`:`${today.q.examId} ${today.q.label}`;
  const todayReason=resumable?"中断した学習を続ける":pendingSource?"過去問の誤答を直して類題で補強":dueToday?dueToday.reason:pastPaper?(pastPaper.isDiagnostic?"まず過去問一式で現在地を確認":"次の過去問一式に挑戦"):today.reason;
  const todayAction=resumable?"resumeActiveSession()":pendingSource?`startReinforcement('${pendingSource.sessionId}')`:dueToday?"render('today')":pastPaper?`startPastPaperTask('${pastPaper.examId}')`:"render('today')";
  const todayButton=resumable?"途中から再開":pendingSource?"補強を始める":dueToday?"復習する":pastPaper?"過去問を始める":"今これをやる";
  app().innerHTML=`
  <section class="card today-hero">
    <div class="today-head"><div><span class="eyebrow">TODAY · ONE CLEAR NEXT STEP</span><h1>今日やること</h1><p>上から順に進めれば大丈夫です。診断、弱点補強、Clean Transfer、翌日定着を学習履歴から自動でつなぎます。</p></div>
    <div class="goal-block"><span>学習目標</span><strong>${h(targetLabel(target))}</strong><small>得点換算ではなく学習優先度</small></div></div>
    <div class="target-row"><span>目標を変更</span>${PROFILE.targets.map(t=>`<button class="target-chip ${target===t.id?"selected":""}" onclick="setHomeTarget('${t.id}')">${h(t.label)}</button>`).join("")}</div>
    <div class="today-list"><article><span>1</span><div><b>${h(todayReason)}</b><small>${h(todaySource)}${(!resumable&&!pendingSource&&!dueToday&&!pastPaper)?"・"+h(today.q.primarySkillLabel||today.q.primarySkill):""}</small></div><button class="primary" onclick="${todayAction}">${h(todayButton)}</button></article></div>
  </section>
  ${deferredResumable?`<section class="card resume-card"><div><span class="eyebrow">SAVED · OPTIONAL</span><h2>以前の単問学習も保存されています</h2><p class="muted">${h(resumeLabel(deferredResumable))}</p></div><button class="secondary" onclick="resumeActiveSession()">以前の学習を再開</button></section>`:""}
  <section class="grid three">
    <div class="card stat"><strong>${a.length}</strong><span>Attempt</span></div>
    <div class="card stat"><strong>${graded.length?Math.round(correct/graded.length*100):0}%</strong><span>現在の正答率</span></div>
    <div class="card stat"><strong>${due}</strong><span>今日が期限の復習</span></div>
  </section>
  <section class="card"><div class="section-head"><div><span class="eyebrow">WEAKNESS → ACTION</span><h2>いま直す弱点</h2></div><button class="secondary" onclick="render('review')">復習一覧</button></div>
    ${weak.length?`<div class="weak-action-grid">${weak.map(s=>`<article><div><b>${h(s.skill)}</b><small>正答率 ${Math.round(s.acc*100)}%・${s.n}回の履歴</small></div><button class="primary" onclick="openSkillPractice('${h(s.skill)}')">この弱点を直す</button></article>`).join("")}</div>`:`<div class="empty-state"><b>集計できる弱点はまだありません</b><p>まずCore Diagnosticまたは今日の課題から始めます。</p></div>`}
  </section>
  <section class="card"><div class="section-head"><div><span class="eyebrow">LEARNING ROUTE</span><h2>立教英国学院の8段階ルート</h2></div><strong>${route.complete?"完了":`PHASE ${route.active+1}/8`}</strong></div>
    <div class="compact-phase-list">${route.items.map((p,i)=>`<article class="${p.done?"done":i===route.active?"active":i>route.active?"locked":""}"><span>${p.done?"✓":i+1}</span><div><b>${h(p.title)}</b><small>${p.done?"完了":i===route.active?"現在の推奨":"次の段階"}</small></div></article>`).join("")}</div>
    <p class="small muted">FY26Bはlearner-unseen最終評価です。開始前は練習・Hint・解説に表示しません。FY26Aはその後のparallel-form確認です。</p>
  </section>
  <section class="card authority-note"><strong>公式情報の扱い</strong><p>公式解答・公式小問配点はありません。原本、独立解答、数学的再検算、自動採点回帰と精査をAnswer Authorityとします。FY26A Q5(3)は自動確定採点から除外します。</p></section>
  <section class="card home-secondary"><div><h2>演習・学習履歴・データ</h2><p class="muted">過去問、弱点別練習、学習記録、バックアップへ移動できます。</p></div><div class="actions"><button onclick="render('library')">演習ライブラリ</button><button class="secondary" onclick="render('progress')">学習記録</button><button class="secondary" onclick="render('data')">データ管理</button></div></section>`;
}

function openSkillPractice(skill){render("practice");document.getElementById("pfSkill").value=skill;document.getElementById("pfSeen").value="unseen";renderPracticeList();}

function renderLibrary(){
  const pending=AppStorage.get().reviewItems.filter(r=>r.status==="pending").length;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">PRACTICE LIBRARY</span><h1>演習ライブラリ</h1><p class="muted">診断、過去問、弱点別類題、復習を目的別に選べます。</p></div></div>
  <section class="library-grid">
    <article class="card library-card"><span class="library-number">1</span><h2>Core Diagnostic</h2><p>FY25Aで現在地を確認し、弱点補強へつなげます。</p><div class="actions"><button onclick="render('diagnostic')">診断を開く</button></div></article>
    <article class="card library-card"><span class="library-number">2</span><h2>過去問</h2><p>FY24–FY26のA/BをexamId別に扱います。評価・確認formの未見性も保護します。</p><div class="actions"><button onclick="render('exams')">過去問一覧</button></div></article>
    <article class="card library-card"><span class="library-number">3</span><h2>弱点別・固定類題</h2><p>L1、L2、Clean Transfer、Retentionを絞り込んで解けます。</p><div class="actions"><button onclick="render('practice')">練習一覧</button></div></article>
    <article class="card library-card"><span class="library-number">4</span><h2>間違い・定着復習</h2><p>期限付きの復習と、誤答した問題をまとめて確認します。</p><div class="actions"><button onclick="render('review')">復習 ${pending}件</button></div></article>
  </section>`;
}

function resumeActiveSession(){
  const s=preferredActiveSession();if(!s)return render("home");
  if(s.flow?.sourceSessionId)return s.problemCompleted?advanceReinforcement(s,true):renderPracticeQuestion(qById(s.problemId),s);
  if(s.mode==="diagnostic")return renderDiagnostic();
  if(Array.isArray(s.problemIds)&&s.examId)return renderExamSession(s.sessionId);
  if(s.problemId)return renderPracticeQuestion(qById(s.problemId),s);
  render("home");
}

// ---------- diagnostic ----------
const DIAG_EXAM="R25-MATH-A";
function renderDiagnostic(){
  const SID="diag-R25-MATH-A-full-v3";
  let s=AppStorage.session(SID);
  if(!s){
    const ids=examQuestions(DIAG_EXAM).map(q=>q.id);
    const before=Object.fromEntries(ids.map(id=>[id,AppStorage.exposureStatus(id)]));
    s={sessionId:SID,mode:"diagnostic",examId:DIAG_EXAM,problemIds:ids,index:0,answers:{},exposureBefore:before,
      cleanEligible:Object.values(before).every(x=>x==="unseen"),startedAt:new Date().toISOString(),status:"active"};
    AppStorage.setSession(SID,s);
  }
  if(s.status==="finished")return renderSessionResult(s);
  const q=qById(s.problemIds[s.index]);AppStorage.setExposure(q.id,"seen");
  const pct=Math.round(s.index/s.problemIds.length*100);
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">CORE DIAGNOSTIC</span><h1>現在地を確認</h1><p class="muted">解説や技能ラベルを見ずに解き、弱点補強の出発点を作ります。</p></div><button class="secondary" onclick="render('library')">演習一覧へ</button></div><section class="card practice-card">
    <div class="question-progress"><strong>FY25 数学A</strong><span>${s.index+1} / ${s.problemIds.length}</span></div>
    ${s.cleanEligible?"":'<div class="warn">この試験には既見問題があります。結果は再受験スコアでありClean Diagnosticではありません。</div>'}
    <div class="progressbar"><div style="width:${pct}%"></div></div>
    <p class="small muted">${h(q.label)}</p>
    ${sourceBlock(q,true)}
    ${qInput(q,s.answers[q.id]||{})}
    ${mathKeypad()}
    <div class="actions"><button class="secondary" ${s.index===0?"disabled":""} onclick="sessionMove('${SID}',-1)">前へ</button><button onclick="sessionMove('${SID}',1)">${s.index===s.problemIds.length-1?"終了して採点":"次へ"}</button></div>
    <p class="small muted">診断中は難度・技能・正誤・解説を表示しません。</p>
  </section>`;
  bindDraftSaver(q,ans=>{const cur=AppStorage.session(SID);if(cur){cur.answers[q.id]=ans;AppStorage.setSession(SID,cur);}});
  bindMathKeypad();
}
function sessionMove(sid,dir){
  const s=AppStorage.session(sid);if(!s)return;
  const q=qById(s.problemIds[s.index]);s.answers[q.id]=readAnswer(q);
  if(dir<0){s.index=Math.max(0,s.index-1);AppStorage.setSession(sid,s);return s.mode==="diagnostic"?renderDiagnostic():renderExamSession(sid);}
  if(s.index<s.problemIds.length-1){s.index++;AppStorage.setSession(sid,s);return s.mode==="diagnostic"?renderDiagnostic():renderExamSession(sid);}
  finishClosedSession(sid);
}
function finishClosedSession(sid){
  const s=AppStorage.session(sid);if(!s)return;
  s.finishedAt=new Date().toISOString();s.status="finished";s.results=[];
  for(const id of s.problemIds){
    const q=qById(id),ans=s.answers[id]||{},g=MathScoring.grade(q,ans);
    const eligible=(s.transferEligibility||{})[id]??false;
    s.results.push({problemId:id,correct:g.correct,reviewRequired:!!g.reviewRequired,transferEligible:eligible});
    recordAttempt(q,ans,g,{startedAt:s.startedAt,activeDurationMs:null,hintEvents:[],retryCount:0,mode:s.mode,
      exposureBefore:s.exposureBefore?.[id]||"unseen",transferEligible:eligible,sessionId:sid});
    AppStorage.setExposure(id,"practiced");
    if(g.correct===true||g.correct===false)AppStorage.scheduleReview(id,q.primarySkill,g.correct);
  }
  AppStorage.setSession(sid,s);renderSessionResult(s);
}
function renderSessionResult(s){
  const n=s.results.length,c=s.results.filter(x=>x.correct===true).length,r=s.results.filter(x=>x.reviewRequired).length;
  const wrong=sourceWrongResults(s),existingFlow=reinforcementForSource(s.sessionId),preview=buildReinforcementSpec(s);
  const l12Count=preview.problemIds.filter(id=>["l1","l2"].includes(preview.stageByProblemId[id])).length,transferCount=preview.problemIds.filter(id=>preview.stageByProblemId[id]==="transfer").length;
  const bySkill={};
  for(const x of s.results){const q=qById(x.problemId);bySkill[q.primarySkill]??={n:0,c:0};bySkill[q.primarySkill].n++;if(x.correct===true)bySkill[q.primarySkill].c++;}
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">SESSION RESULT</span><h1>${s.mode==="diagnostic"?"診断":"セッション"}結果</h1></div></div><section class="grid three"><div class="card stat"><strong>${c}/${n}</strong><span>独立正答候補との一致</span></div><div class="card stat"><strong>${wrong.length}</strong><span>これから直す問題</span></div><div class="card stat"><strong>${r}</strong><span>要確認</span></div></section><section class="card result-wrong-first">
    <span class="eyebrow">PAST PAPER → PRACTICE</span><h2>${wrong.length?"間違えた問題を直して、対応類題へ進む":"この過去問の必須補強はありません"}</h2>
    <div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="${wrong.length?"current":"done"}"><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>L1/L2類題</span></div><div><b>4</b><span>転移・定着</span></div></div>
    ${wrong.length?`<p>誤答 ${wrong.length}問を元問題から解き直し、明示されたprimarySkillが一致するL1/L2類題 ${l12Count}問${transferCount?`、Clean Transfer ${transferCount}問`:""}へ自動でつなぎます。</p><div class="source-review-list">${wrong.map(x=>{const q=qById(x.problemId),mapped=preview.mappingBySourceProblemId[x.problemId]?.practiceProblemIds||[];return `<article><div><b>${h(q.examId)} ${h(q.label)}</b><small>${h(q.primarySkillLabel||q.primarySkill)}</small></div><span>${mapped.length?`対応類題 ${mapped.length}問`:`元問題の解き直しのみ`}</span></article>`}).join("")}</div><div class="actions"><button onclick="startReinforcement('${s.sessionId}')">${existingFlow?.status==="active"?"弱点補強を続ける":"誤答の解き直し・類題を始める"}</button></div>`:`<div class="actions"><button onclick="render('exams')">次の過去問へ</button></div>`}
    ${preview.unmappedSourceProblemIds.length?`<p class="small warn">${preview.unmappedSourceProblemIds.map(id=>h(qById(id)?.label||id)).join("、")} は、同じprimarySkillの固定類題Authorityがないため推測で割り当てず、元問題の解き直しだけを行います。</p>`:""}
  </section><section class="card">
    <p class="muted">公式配点がないため公式得点には換算しません。${s.cleanEligible===false?" この実施はlearner-unseen評価ではありません。":""}</p>
  </section><section class="card"><h2>分野別</h2><div class="table-wrap"><table><tr><th>分野</th><th>一致</th></tr>
    ${Object.entries(bySkill).map(([k,v])=>`<tr><td>${h(k)}</td><td>${v.c}/${v.n}</td></tr>`).join("")}</table>
    </div><div class="actions"><button onclick="render('today')">次の学習へ</button><button class="secondary" onclick="render('exams')">過去問一覧</button></div></section>`;
}

// ---------- Today / Review ----------
function retentionCandidateFor(q){
  const fam=q.familyId;
  if(!fam)return null;
  return BANK.find(x=>x.practiceLevel==="RETENTION"&&x.familyId===fam&&AppStorage.exposureStatus(x.id)==="unseen")||null;
}
function chooseToday(){
  const st=AppStorage.get(),target=st.settings.target||"stable",now=Date.now();
  const due=st.reviewItems.filter(r=>r.status==="pending"&&Date.parse(r.dueAt)<=now).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  if(due[0]){const q=qById(due[0].problemId);if(q)return {q,mode:"retention",reason:"復習期限",reviewItemId:due[0].reviewItemId};}
  const stats=skillStats();
  const weak=stats.filter(s=>s.state==="weak").sort((a,b)=>a.acc-b.acc);
  if(weak[0]){
    const preferred=weak[0].acc<0.4?"L1":"L2";
    const c=BANK.filter(q=>q.practiceLevel===preferred&&q.primarySkill===weak[0].skill&&AppStorage.exposureStatus(q.id)==="unseen");
    if(c[0])return {q:c[0],mode:"learning",reason:`${preferred}弱点補強: ${weak[0].skill}`};
    const fallback=BANK.filter(q=>q.practiceLevel==="L2"&&q.primarySkill===weak[0].skill&&AppStorage.exposureStatus(q.id)==="unseen");
    if(fallback[0])return {q:fallback[0],mode:"learning",reason:`Level 2弱点補強: ${weak[0].skill}`};
  }
  const improving=stats.filter(s=>s.state==="improving").sort((a,b)=>b.acc-a.acc);
  for(const stt of improving){
    const tr=BANK.find(q=>q.practiceLevel==="TRANSFER"&&q.primarySkill===stt.skill&&cleanTransferEligible(q));
    if(tr)return {q:tr,mode:"transfer",reason:`Clean Transfer確認: ${stt.skill}`};
  }
  const wrong=[...attempts()].reverse().find(a=>a.mode==="diagnostic"&&a.correct===false);
  if(wrong){
    const baseq=qById(wrong.problemId);
    const c=BANK.find(q=>q.practiceLevel==="L2"&&q.primarySkill===baseq?.primarySkill&&AppStorage.exposureStatus(q.id)==="unseen");
    if(c)return {q:c,mode:"learning",reason:"診断誤答→Level 2"};
    if(baseq)return {q:baseq,mode:"learning",reason:"診断誤答"};
  }
  const unseen=QUESTIONS.filter(q=>q.role==="training"&&AppStorage.exposureStatus(q.id)==="unseen")
    .sort((a,b)=>targetRank(targetFor(b))-targetRank(targetFor(a)));
  if(unseen[0])return {q:unseen[0],mode:"learning",reason:`${targetLabel(target)}に必要な未学習`};
  const bankUnseen=BANK.find(q=>q.practiceLevel==="L2"&&AppStorage.exposureStatus(q.id)==="unseen");
  if(bankUnseen)return {q:bankUnseen,mode:"learning",reason:"Level 2補強"};
  return {q:ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)],mode:"learning",reason:"Mixed練習"};
}
function renderToday(){
  const pastPaper=nextPastPaperTask(),candidate=preferredActiveSession(),resumable=isRouteSession(candidate)||!pastPaper?candidate:null;
  if(resumable)return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · RESUME</span><h1>中断した学習を続ける</h1><p class="muted">保存した位置から、そのまま再開できます。</p></div></div><section class="card"><h2>${h(resumeLabel(resumable))}</h2><div class="actions"><button onclick="resumeActiveSession()">途中から再開</button></div></section>`;
  const pendingSource=pendingReinforcementSource();
  if(pendingSource){const existing=reinforcementForSource(pendingSource.sessionId);return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · PAST PAPER FOLLOW-UP</span><h1>過去問の弱点を補強</h1><p class="muted">次の過去問へ進む前に、誤答を元問題→固定類題の順で直します。</p></div></div><section class="card"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="current"><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>L1/L2類題</span></div><div><b>4</b><span>転移・定着</span></div></div><h2>${h(examById(pendingSource.examId)?.label||pendingSource.examId)}の補強</h2><p>誤答 ${sourceWrongResults(pendingSource).length}問。途中で閉じてもホームのResumeから続けられます。</p><div class="actions"><button onclick="startReinforcement('${pendingSource.sessionId}')">${existing?.status==="active"?"続きから再開":"補強を始める"}</button></div></section>`;}
  const p=chooseToday(),mins=p.q.estimatedMinutesRange||[.5,1.5];
  if(!p.reviewItemId&&pastPaper)return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · PAST PAPER FIRST</span><h1>まず過去問から始める</h1><p class="muted">過去問を一式解き、結果に応じて誤答の解き直しと対応類題へ進みます。</p></div></div><section class="card today-hero"><div class="workflow-strip"><div class="current"><b>1</b><span>過去問</span></div><div><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>L1/L2類題</span></div><div><b>4</b><span>転移・定着</span></div></div><div class="today-head"><div><span class="eyebrow">NEXT PAST PAPER</span><h2>${h(pastPaper.exam.label)}</h2><p>${pastPaper.isDiagnostic?"Core Diagnosticとして現在地を確認します。":"前の補強を終えたので、次の過去問へ進みます。"}</p></div><div class="goal-block"><span>問題数</span><strong>${pastPaper.count}問</strong><small>一式で実施</small></div></div><div class="actions"><button onclick="startPastPaperTask('${pastPaper.examId}')">過去問を始める</button><button class="secondary" onclick="render('exams')">過去問一覧</button></div></section>`;
  const target=AppStorage.get().settings.target||"stable",source=p.q.sourceType==="FIXED_PRACTICE"?`${p.q.practiceLevel||"類題"} / ${p.q.familyId||p.q.primarySkill}`:`${p.q.examId} / ${p.q.label}`;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY</span><h1>今日の学習</h1><p class="muted">学習履歴から、いま一番効果の高い課題を1つ選んでいます。</p></div><span class="route-status">${h(targetLabel(target))}</span></div>
    <section class="card today-hero"><div class="today-head"><div><span class="eyebrow">NEXT TASK</span><h2>${h(p.reason)}</h2><p>${h(source)}</p></div><div class="goal-block"><span>目安時間</span><strong>${mins[0]}–${mins[1]}分</strong><small>解答中だけ計測</small></div></div>
    <div class="meta-row"><span class="badge">${h(p.q.primarySkillLabel||p.q.primarySkill)}</span><span class="badge">${h(targetFor(p.q))}</span><span class="badge">${h(p.mode)}</span></div>
    <div class="actions"><button onclick="openPractice('${p.q.id}','${p.mode}','${p.reviewItemId||""}')">この課題を始める</button><button class="secondary" onclick="render('review')">復習一覧</button></div></section>
    <section class="card"><h2>今日の進め方</h2><div class="compact-phase-list"><article class="active"><span>1</span><div><b>1問に集中</b><small>まず自力で解答</small></div></article><article><span>2</span><div><b>必要ならHint</b><small>H1 → H2 → 解説</small></div></article><article><span>3</span><div><b>誤答を復習予約</b><small>履歴へ自動保存</small></div></article><article><span>4</span><div><b>翌日に定着確認</b><small>Retentionへ接続</small></div></article></div></section>`;
}
function renderReview(){
  const pending=AppStorage.get().reviewItems.filter(r=>r.status==="pending").sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">MISTAKE REVIEW</span><h1>間違い・定着復習</h1><p class="muted">誤答と翌日定着を期限順に並べています。</p></div><span class="route-status">${pending.length}件</span></div><section class="card"><div class="review-list">
    ${pending.slice(0,50).map(r=>{const q=qById(r.problemId);if(!q)return"";const overdue=Date.parse(r.dueAt)<=Date.now();return `<article class="review-row ${overdue?"overdue":""}"><div><strong>${q.sourceType==="FIXED_PRACTICE"?h((q.practiceLevel||"")+" / "+(q.familyId||q.primarySkill)):h(q.examId+" "+q.label)}</strong><div class="meta-row"><span class="badge">${h(q.primarySkillLabel||q.primarySkill)}</span><span class="badge">${overdue?"期限到来":"予約済み"}</span></div><p class="small muted">期限 ${h(new Date(r.dueAt).toLocaleString())}</p></div><button onclick="openPractice('${q.id}','retention','${r.reviewItemId}')">復習する</button></article>`}).join("")||'<div class="empty-state"><b>復習待ちはありません</b><p>今日の課題や診断を進めると、必要な問題だけここに追加されます。</p></div>'}</div></section>`;
}

// ---------- Practice ----------
function renderPractice(){
  const examOptions=['<option value="">全ソース</option>','<option value="PRACTICE-BANK">類題Bank</option>',...EXAMS.filter(e=>e.role!=="evaluation"&&e.role!=="confirmation").map(e=>`<option value="${h(e.examId)}">${h(e.label)}</option>`)].join("");
  const skills=[...new Set(ALL_ITEMS.map(q=>q.primarySkill))].sort();
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">FILTERED PRACTICE</span><h1>弱点別・固定類題</h1><p class="muted">分野、難度、学習段階、未見状態から絞り込めます。</p></div><button class="secondary" onclick="render('library')">演習一覧へ</button></div><section class="card"><div class="filter-grid">
    <label>ソース<select id="pfExam">${examOptions}</select></label>
    <label>分野<select id="pfSkill"><option value="">全分野</option>${skills.map(s=>`<option>${h(s)}</option>`).join("")}</select></label>
    <label>難度<select id="pfDiff"><option value="">A/B/Cすべて</option><option>A</option><option>B</option><option>C</option></select></label>
    <label>Level<select id="pfLevel"><option value="">すべて</option><option value="L1">L1</option><option value="L2">L2</option><option value="TRANSFER">Transfer</option><option value="RETENTION">Retention</option></select></label>
    <label>表示<select id="pfSeen"><option value="">すべて</option><option value="unseen">未見のみ</option><option value="wrong">誤答あり</option></select></label>
    </div><div class="actions"><button id="pfApply">絞り込む</button></div><div id="practiceList" class="practice-list"></div></section>`;
  document.getElementById("pfApply").onclick=renderPracticeList;renderPracticeList();
}
function renderPracticeList(){
  const exam=document.getElementById("pfExam")?.value||"",skill=document.getElementById("pfSkill")?.value||"",diff=document.getElementById("pfDiff")?.value||"",level=document.getElementById("pfLevel")?.value||"",seen=document.getElementById("pfSeen")?.value||"";
  let list=ALL_ITEMS.filter(q=>q.role!=="evaluation"&&q.role!=="confirmation").filter(q=>(!exam||q.examId===exam)&&(!skill||q.primarySkill===skill)&&(!diff||q.difficulty===diff)&&(!level||q.practiceLevel===level));
  if(seen==="unseen")list=list.filter(q=>AppStorage.exposureStatus(q.id)==="unseen");
  if(seen==="wrong")list=list.filter(q=>attempts().some(a=>a.problemId===q.id&&a.correct===false));
  list=list.sort((a,b)=>(a.sourceType==="FIXED_PRACTICE"?0:1)-(b.sourceType==="FIXED_PRACTICE"?0:1)||String(a.examId).localeCompare(String(b.examId))||(a.majorQuestion||0)-(b.majorQuestion||0)||(a.minorQuestion||0)-(b.minorQuestion||0)).slice(0,100);
  document.getElementById("practiceList").innerHTML=list.map(q=>{
    const mode=q.practiceLevel==="TRANSFER"?"transfer":q.practiceLevel==="RETENTION"?"retention":"learning";
    const title=q.sourceType==="FIXED_PRACTICE"?`${h(q.practiceLevel)} / ${h(q.familyId)}`:`${h(q.examId)} ${h(q.label)}`;
    return `<article class="practice-row"><div><strong>${title}</strong><div class="meta-row"><span class="badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span><span class="badge">${h(q.primarySkillLabel||q.primarySkill)}</span>${q.practiceLevel?`<span class="badge">${h(q.practiceLevel)}</span>`:""}<span class="badge">${h(AppStorage.exposureStatus(q.id))}</span></div></div><button onclick="openPractice('${q.id}','${mode}','')">解く</button></article>`;
  }).join("")||'<p class="muted">該当なし</p>';
}
function openPractice(id,mode="learning",reviewItemId=""){
  const q=qById(id);if(!q)return;
  const prior=AppStorage.exposureStatus(id);
  const s={sessionId:`practice-${AppStorage.uuid()}`,mode,problemId:id,answerDraft:{},startedAt:new Date().toISOString(),activeMs:0,
    retryCount:0,hintLevel:0,hintEvents:[],reviewItemId,exposureBefore:prior,status:"active"};
  AppStorage.setSession(s.sessionId,s);renderPracticeQuestion(q,s);
}
function renderPracticeQuestion(q,s){
  AppStorage.setExposure(q.id,"seen");
  const flow=s.flow,flowIndex=flow?.index||0;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">${flow?"PAST PAPER REINFORCEMENT":"GUIDED PRACTICE"}</span><h1>${flow?h(reinforcementStageLabel(s)):"問題を解く"}</h1>${flow?`<p class="muted">過去問の誤答から、元問題→L1/L2類題→Clean Transferの順で進みます。</p>`:""}</div><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断して戻る</button></div>${flow?`<section class="card reinforcement-progress"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="${reinforcementStageLabel(s).includes("元問題")?"current":flowIndex>0?"done":""}"><b>2</b><span>元問題を直す</span></div><div class="${["l1","l2"].includes(flow.stageByProblemId[s.problemId])?"current":flow.stageByProblemId[s.problemId]==="transfer"?"done":""}"><b>3</b><span>L1/L2類題</span></div><div class="${flow.stageByProblemId[s.problemId]==="transfer"?"current":""}"><b>4</b><span>転移・定着</span></div></div><div class="question-progress"><strong>${h(reinforcementStageLabel(s))}</strong><span>${flowIndex+1} / ${flow.problemIds.length}</span></div><div class="progressbar"><div style="width:${Math.round(flowIndex/flow.problemIds.length*100)}%"></div></div></section>`:""}<section class="card practice-card">
    <div class="meta-row"><span class="badge">${h(s.mode)}</span><span class="badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span><span class="badge">${h(q.primarySkillLabel)}</span><span class="badge">${h(targetFor(q))}</span></div>
    <div class="question-title">${q.sourceType==="FIXED_PRACTICE"?h((q.practiceLevel||"")+" / "+(q.familyId||q.primarySkill)):h(q.examId+" "+q.label)}</div>
    ${sourceBlock(q,true)}${qInput(q,s.answerDraft||{})}${mathKeypad()}
    <div id="feedback"></div>
    <div class="actions"><button id="submitPractice">採点</button><button class="secondary" id="hint1Btn">H1 着眼点</button><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断</button></div>
  </section>`;
  activeTimer=createActiveTimer(s.activeMs||0);activeTimerCommit=ms=>{const c=AppStorage.session(s.sessionId);if(c){c.activeMs=ms;AppStorage.setSession(s.sessionId,c);}};
  mountFloatingTimer();
  bindDraftSaver(q,ans=>{const c=AppStorage.session(s.sessionId);if(c){c.answerDraft=ans;c.activeMs=activeTimer?activeTimer.ms():c.activeMs;AppStorage.setSession(s.sessionId,c);}});
  bindMathKeypad();
  document.getElementById("hint1Btn").onclick=()=>showHint(s.sessionId,q,1);
  document.getElementById("submitPractice").onclick=()=>submitPractice(s.sessionId,q);
}
function showHint(sid,q,level){
  const s=AppStorage.session(sid);if(!s)return;s.hintLevel=Math.max(s.hintLevel,level);s.hintEvents.push({level,at:new Date().toISOString()});AppStorage.setSession(sid,s);
  const f=document.getElementById("feedback");f.className="notice";
  if(level===1)f.innerHTML=`<strong>H1</strong> ${h(q.hint1)} <div class="actions"><button class="secondary" onclick="showHint('${sid}',qById('${q.id}'),2)">H2</button></div>`;
  else if(level===2)f.innerHTML=`<strong>H2</strong> ${h(q.hint2)} <div class="actions"><button class="secondary" onclick="showHint('${sid}',qById('${q.id}'),3)">完全解説</button></div>`;
  else f.innerHTML=`${explanationHtml(q)}<p>独立解答候補: <strong>${h(answerDisplay(q))}</strong></p>`;
}
function submitPractice(sid,q){
  const s=AppStorage.session(sid);if(!s)return;
  const ans=readAnswer(q),g=MathScoring.grade(q,ans),now=new Date().toISOString();s.answerDraft=ans;s.activeMs=stopTimer();
  const eligible=cleanTransferEligible(q)&&["transfer","evaluation"].includes(s.mode);
  recordAttempt(q,ans,g,{startedAt:s.startedAt,activeDurationMs:s.activeMs,hintEvents:[...s.hintEvents],retryCount:s.retryCount,mode:s.mode,
    exposureBefore:s.exposureBefore,transferEligible:eligible,sessionId:sid});
  AppStorage.setExposure(q.id,"practiced");const f=document.getElementById("feedback");
  if(g.reviewRequired){
    s.status="finished";AppStorage.setSession(sid,s);f.className="warn";
    f.innerHTML=`数学的には条件を満たす候補です。ただしこの問題は内部的にも点の一致条件に曖昧性があるため、自動確定採点から除外しています。<p>独立解答候補: ${h(answerDisplay(q))}</p><div class="actions"><button onclick="finishPractice('${sid}',true)">次へ</button></div>`;
    return;
  }
  if(g.correct){
    let prior=null;if(s.reviewItemId){const ri=AppStorage.reviewItem(s.reviewItemId);prior=ri?.stage??0;AppStorage.setReviewStatus(s.reviewItemId,"done");}
    const isSourceReview=s.flow?.stageByProblemId?.[problemIdOf(q)]==="source-review";
    if(isSourceReview){const pending=AppStorage.get().reviewItems.find(item=>item.problemId===problemIdOf(q)&&item.status==="pending");if(pending)AppStorage.setReviewStatus(pending.reviewItemId,"done");}
    else if(q.practiceLevel!=="RETENTION"){
      const rq=retentionCandidateFor(q);
      AppStorage.scheduleReview(rq?.id||q.id,rq?.primarySkill||q.primarySkill,true,prior);
    }
    s.problemCompleted=true;s.status=s.flow?.sourceSessionId?"active":"finished";AppStorage.setSession(sid,s);
    f.className="ok";f.innerHTML=`正解。${explanationHtml(q)}<div class="actions"><button onclick="finishPractice('${sid}',true)">次のおすすめ</button><button class="secondary" onclick="finishPractice('${sid}',false)">終了</button></div>`;
    document.getElementById("submitPractice").disabled=true;document.getElementById("hint1Btn").disabled=true;return;
  }
  AppStorage.scheduleReview(q.id,q.primarySkill,false);s.retryCount++;s.activeMs=0;s.startedAt=now;AppStorage.setSession(sid,s);
  f.className="ng";f.innerHTML=s.retryCount===1?"不正解。答えはまだ表示しません。条件・符号・図を見直して再挑戦してください。":"まだ一致しません。H1/H2を使うか、もう一度自力で修正できます。";
  activeTimer=createActiveTimer(0);activeTimerCommit=ms=>{const c=AppStorage.session(sid);if(c){c.activeMs=ms;AppStorage.setSession(sid,c);}};
  mountFloatingTimer();
}
function finishPractice(sid,next){
  const s=AppStorage.session(sid);if(!s)return render("home");
  if(s.flow?.sourceSessionId){
    if(s.problemCompleted)return advanceReinforcement(s,next);
    s.status="active";s.activeMs=stopTimer();AppStorage.setSession(sid,s);return render("home");
  }
  s.status="finished";AppStorage.setSession(sid,s);next?render("today"):render("home");
}

// ---------- Past exams / exam mode ----------
function renderExams(){
  const confirmationUnlocked=examExposure("R26-MATH-B")==="practiced";
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">PAST PAPERS</span><h1>過去問</h1><p class="muted">A/BをexamId別に管理し、learner-unseen評価の未見性を保護します。</p></div><button class="secondary" onclick="render('library')">演習一覧へ</button></div><section class="card"><div class="notice">公式制限時間・小問配点は提供資料から確認できていないため、Exam Modeは経過時間のみ記録します。</div>
    ${EXAMS.map(e=>{const exposure=examExposure(e.examId),mate=parallelMateExposed(e),locked=e.role==="confirmation"&&!confirmationUnlocked;return `<div class="card exam-card"><div><strong>${h(e.label)}</strong><p>${h(e.roleLabel)} / ${e.questionCount}問 / exposure=${h(exposure)}${mate?" / parallel mate既見":""}</p>${e.role==="evaluation"?'<p class="small warn">learner-unseen評価：開始前は練習・Hint・解説に露出しません。</p>':''}${locked?'<p class="small muted">FY26B評価後に開放します。</p>':''}</div><div class="actions">${e.role==="diagnostic"?`<button onclick="render('diagnostic')">診断</button>`:`<button ${locked?'disabled':''} onclick="startExam('${e.examId}')">本番形式</button>`}${["evaluation","confirmation"].includes(e.role)?'':`<button class="secondary" onclick="practiceExam('${e.examId}')">学習</button>`}</div></div>`}).join("")}</section>`;
}
function practiceExam(examId){render("practice");document.getElementById("pfExam").value=examId;renderPracticeList();}
function startExam(examId){
  const e=examById(examId);if(e.role==="confirmation"&&examExposure("R26-MATH-B")!=="practiced")return;
  if(e.role==="evaluation"&&examExposure(examId)==="unseen"&&!confirm("FY26Bは最終learner-unseen評価です。開始すると問題が既見になります。開始しますか？"))return;
  const ids=examQuestions(examId).map(problemIdOf),before=Object.fromEntries(ids.map(id=>[id,AppStorage.exposureStatus(id)]));
  const transfer=Object.fromEntries(ids.map(id=>[id,cleanTransferEligible(qById(id))]));
  let mode=e.role==="transfer"?"transfer":e.role==="evaluation"?"evaluation":e.role==="confirmation"?"confirmation":"exam";
  const sid=`exam-${examId}-v3`;
  const s={sessionId:sid,mode,examId,problemIds:ids,index:0,answers:{},exposureBefore:before,transferEligibility:transfer,
    cleanEligible:Object.values(before).every(x=>x==="unseen")&&!parallelMateExposed(e),startedAt:new Date().toISOString(),status:"active"};
  AppStorage.setSession(sid,s);renderExamSession(sid);
}
function renderExamSession(sid){
  const s=AppStorage.session(sid);if(!s)return render("exams");if(s.status==="finished")return renderSessionResult(s);
  const q=qById(s.problemIds[s.index]);AppStorage.setExposure(q.id,"seen");
  const pct=Math.round(s.index/s.problemIds.length*100);
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">EXAM MODE</span><h1>${h(examById(s.examId).label)}</h1><p class="muted">提出まではHint・正答・解説を表示しません。</p></div></div><section class="card practice-card">
    ${s.cleanEligible?"":'<div class="warn">この実施はlearner-unseenのClean評価ではありません。</div>'}
    <div class="progressbar"><div style="width:${pct}%"></div></div><p class="small muted">${s.index+1}/${s.problemIds.length} — ${h(q.label)}</p>
    ${sourceBlock(q,true)}${qInput(q,s.answers[q.id]||{})}${mathKeypad()}
    <div class="actions"><button class="secondary" ${s.index===0?"disabled":""} onclick="sessionMove('${sid}',-1)">前へ</button><button onclick="sessionMove('${sid}',1)">${s.index===s.problemIds.length-1?"終了して採点":"次へ"}</button></div>
    <p class="small muted">提出前は難度・技能・Hint・正答・解説を表示しません。</p></section>`;
  bindDraftSaver(q,ans=>{const c=AppStorage.session(sid);if(c){c.answers[q.id]=ans;AppStorage.setSession(sid,c);}});
  bindMathKeypad();
}

// ---------- progress ----------
function renderProgress(){
  const stats=skillStats(),modes=["learning","retention","diagnostic","transfer","evaluation","exam","confirmation"];
  const graded=attempts().filter(a=>a.correct===true||a.correct===false),correct=graded.filter(a=>a.correct).length,mastered=stats.filter(s=>s.state==="mastered").length;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">LEARNING REPORT</span><h1>学習記録</h1><p class="muted">正答・転移・定着を分けて確認します。公式得点がないため100点換算はしません。</p></div></div><section class="grid three"><div class="card stat"><strong>${attempts().length}</strong><span>Attempt</span></div><div class="card stat"><strong>${graded.length?Math.round(correct/graded.length*100):0}%</strong><span>正答率</span></div><div class="card stat"><strong>${mastered}</strong><span>定着した技能</span></div></section><section class="card"><h2>技能別</h2><div class="table-wrap"><table><tr><th>技能</th><th>Attempt</th><th>正答率</th><th>Clean Transfer</th><th>Retention</th><th>状態</th></tr>
    ${stats.map(s=>`<tr><td>${h(s.skill)}</td><td>${s.n}</td><td>${Math.round(s.acc*100)}%</td><td>${s.trC}/${s.trN}</td><td>${s.retC}/${s.retN}</td><td>${h(s.state)}</td></tr>`).join("")||'<tr><td colspan="6">履歴なし</td></tr>'}</table></div></section>
    <section class="card"><h2>モード別</h2><div class="grid four">${modes.map(m=>{const x=modeStats(m);return `<div class="stat"><span>${h(m)}</span><strong>${x.n?Math.round(x.c/x.n*100):0}%</strong><span>${x.c}/${x.n}</span></div>`}).join("")}</div></section>
    <section class="card"><h2>試験Exposure</h2><div class="table-wrap"><table><tr><th>試験</th><th>状態</th></tr>${EXAMS.map(e=>`<tr><td>${h(e.label)}</td><td>${h(examExposure(e.examId))}</td></tr>`).join("")}</table></div></section>`;
}

// ---------- data ----------
function renderData(){
  const st=AppStorage.get();
  const migration=AppStorage.migrationReport(),restorePoints=AppStorage.listRestorePoints();
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">LOCAL DATA</span><h1>データ管理</h1><p class="muted">学習履歴はこの端末のRikkyo専用領域に保存します。機種変更前にはJSONバックアップを書き出してください。</p></div></div>
    <section class="card"><h2>保存状態</h2><div class="data-status"><span>Namespace<b>${h(AppStorage.namespace())}</b></span><span>Migration<b>${h(migration.status)}</b></span><span>復元ポイント<b>${restorePoints.length}件</b></span></div><p class="small muted">Device ${h(st.device.deviceId)} / canonical learner-state v1</p></section>
    <section class="card"><h2>学習設定</h2><div class="data-grid"><label>学習目標<select id="targetSel"><option value="minimum">最低ライン</option><option value="stable">安定圏</option><option value="safe">安全圏</option></select></label><label>端末名<input id="nick" type="text" value="${h(st.device.nickname||"")}"></label></div><div class="actions"><button id="saveSettings">設定を保存</button></div></section>
    <section class="card"><h2>バックアップ / 復元</h2><p class="muted">ExportしたJSONを安全な場所へ保存し、復元時は内容を貼り付けてImportします。</p><div class="actions"><button id="exportBtn">Export</button><button class="secondary" id="importBtn">Import</button>${restorePoints.length?'<button id="restoreLatest" class="secondary">最新の復元ポイントへ戻す</button>':''}</div><textarea id="io" rows="14" placeholder="Export / Import JSON"></textarea><p class="small muted">旧MVP v1/v2およびFull v3は削除しません。Import前に端末内復元ポイントを作り、checksum・attemptId・problemId・same-ID conflictを検証します。</p></section>
    <section class="card danger-zone"><h2>この端末のデータを初期化</h2><p class="muted">現在の学習履歴を端末内復元ポイントへ退避してから初期化します。</p><div class="actions"><button class="danger" id="resetBtn">学習データを初期化</button></div></section>`;
  document.getElementById("targetSel").value=st.settings.target||"stable";
  document.getElementById("saveSettings").onclick=()=>{AppStorage.setTarget(document.getElementById("targetSel").value);AppStorage.setNickname(document.getElementById("nick").value);alert("保存しました");};
  document.getElementById("exportBtn").onclick=()=>document.getElementById("io").value=AppStorage.exportJson();
  document.getElementById("importBtn").onclick=()=>{try{AppStorage.importJson(document.getElementById("io").value);alert("Importしました");render("progress");}catch(e){alert(e.message);}};
  document.getElementById("resetBtn").onclick=()=>{if(confirm("全学習データを初期化しますか？バックアップは自動保存されます。")){AppStorage.reset();render("home");}};
  if(restorePoints.length)document.getElementById("restoreLatest").onclick=()=>{if(confirm("最新の端末内復元ポイントへ戻しますか？")){AppStorage.restorePoint(restorePoints[0].id);render("home");}};
}

boot();
