
const PROFILE=window.RIKKYO_MATH_PROFILE;
let QUESTIONS=[], BANK=[], ALL_ITEMS=[], EXAMS=[], REGISTRY={},CANONICAL_CONTENT=null;
let activeTimer=null,activeTimerCommit=null,activeTimerUi=null;
let currentView="home";
let answerDockOpen=window.innerWidth>700;

function h(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function presentationLabel(group,id,fallback=id){return PROFILE.presentationLabels?.[group]?.[id]||fallback||"";}
function skillLabel(id){return presentationLabel("skills",id,id);}
function practiceLevelLabel(id){return presentationLabel("practiceLevels",id,id||"類題");}
function familyLabel(id){return presentationLabel("families",id,id);}
function modeLabel(id){return presentationLabel("modes",id,id);}
function masteryStateLabel(id){return presentationLabel("masteryStates",id,id);}
function examRoleLabel(id){return presentationLabel("examRoles",id,"過去問");}
function exposureLabel(id){return presentationLabel("exposure",id,id);}
function targetRelevanceLabel(id){return presentationLabel("targetRelevance",id,id);}
function difficultyLabel(id){return presentationLabel("difficulty",id,id);}
function fixedPracticeTitle(q){return `${practiceLevelLabel(q.practiceLevel)}｜${familyLabel(q.familyId||q.primarySkill)}`;}
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
function targetForId(q,targetId){return q.targetRelevance?.[targetId]||"SHOULD";}
function targetIncludes(q,targetId){const relevance=targetForId(q,targetId);return relevance==="MUST"||(targetId!=="minimum"&&relevance==="SHOULD")||(targetId==="safe"&&relevance!=="DEFER");}
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
function cleanTransferEligible(q,exposureBefore=AppStorage.exposureStatus(problemIdOf(q))){
  if(exposureBefore!=="unseen")return false;
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
function weaknessTopics(){
  const latest=new Map();
  for(const attempt of attempts())if(attempt.correct===true||attempt.correct===false)latest.set(attempt.problemId,attempt);
  const grouped={};
  for(const attempt of latest.values()){
    if(attempt.correct!==false)continue;
    const q=qById(attempt.problemId),skill=attempt.skill||q?.primarySkill||"OTHER";
    if(!grouped[skill])grouped[skill]=[];
    grouped[skill].push(attempt);
  }
  const stats=new Map(skillStats().map(item=>[item.skill,item]));
  return Object.entries(grouped).map(([skill,items])=>({skill,items,stat:stats.get(skill)}))
    .sort((a,b)=>b.items.length-a.items.length||(a.stat?.acc||0)-(b.stat?.acc||0)||a.skill.localeCompare(b.skill));
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
function reinforcementStageLabel(s){const stage=s.flow?.stageByProblemId?.[s.problemId];return stage==="source-review"?"元問題の解き直し":stage==="l1"?practiceLevelLabel("L1"):stage==="l2"?practiceLevelLabel("L2"):stage==="transfer"?practiceLevelLabel("TRANSFER"):"弱点補強";}
function advanceReinforcement(session,renderNext){
  if(session.flow?.type==="weakness-set")return advanceWeaknessSet(session,renderNext);
  const next=CanonicalLearningFlow.nextCanonicalSequenceIndex(session.flow.index||0,session.flow.problemIds.length);
  if(next<0){session.status="finished";session.flow.index=session.flow.problemIds.length;session.flow.completedAt=new Date().toISOString();AppStorage.setSession(session.sessionId,session);return renderReinforcementComplete(session);}
  const nextId=session.flow.problemIds[next],q=qById(nextId);session.flow.index=next;session.flow.sourceReviewView="choose";session.problemId=nextId;session.mode=modeForPractice(q);session.answerDraft={};session.startedAt=new Date().toISOString();session.activeMs=0;session.retryCount=0;session.hintLevel=0;session.hintEvents=[];session.exposureBefore=AppStorage.exposureStatus(nextId);session.problemCompleted=false;session.status="active";AppStorage.setSession(session.sessionId,session);
  renderNext?renderPracticeQuestion(q,session):render("home");
}
function renderReinforcementComplete(session){
  const flow=session.flow||session;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">補強完了</span><h1>過去問からの弱点補強が完了</h1><p class="muted">元問題の解き直し、固定類題、初見問題での確認まで完了しました。</p></div></div><section class="card"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="done"><b>2</b><span>元問題を直す</span></div><div class="done"><b>3</b><span>固定類題</span></div><div class="done"><b>4</b><span>初見・翌日</span></div></div><h2>翌日の定着確認へつなぎました</h2><p>正解した類題は復習予約に入り、期限が来ると「今日の学習」に表示されます。</p><div class="actions"><button onclick="render('home')">ホームへ</button><button class="secondary" onclick="render('exams')">次の過去問</button></div></section>`;
}
function weaknessFlowSessions(skill){
  return Object.values(AppStorage.get().sessions).filter(s=>s?.flow?.type==="weakness-set"&&s.flow.skill===skill)
    .sort((a,b)=>String(b.flow?.createdAt||b.startedAt).localeCompare(String(a.flow?.createdAt||a.startedAt)));
}
function weaknessSetQuestions(skill){
  const size=PROFILE.practicePolicy?.weaknessSetSize||4,used=new Set(),picked=[];
  for(const level of ["L1","L2"]){
    const all=BANK.filter(q=>q.primarySkill===skill&&q.practiceLevel===level),unseen=all.filter(q=>AppStorage.exposureStatus(problemIdOf(q))==="unseen"),pool=unseen.length?unseen:all;
    picked.push(...deterministicBankPick(pool,`${skill}:${level}:weakness-set`,Math.ceil(size/2),used));
  }
  if(picked.length<size){
    const all=BANK.filter(q=>q.primarySkill===skill&&["L1","L2"].includes(q.practiceLevel)),unseen=all.filter(q=>AppStorage.exposureStatus(problemIdOf(q))==="unseen"),pool=unseen.length?unseen:all;
    picked.push(...deterministicBankPick(pool,`${skill}:weakness-set:fallback`,size-picked.length,used));
  }
  return picked.slice(0,size);
}
function applyWeaknessSetResult(session,problemId,qualifying){
  const flow=session.flow||{},ids=flow.problemIds||[],completed=flow.completedQuestionIds||[];
  const set={problemIds:ids,completedProblemIds:completed,retryProblemIds:flow.retryProblemIds||[],pendingProblemIds:flow.pendingProblemIds||ids.filter(id=>!completed.includes(id)),requiredCount:ids.length,status:ids.length&&completed.length>=ids.length?"completed":"active"};
  const next=CanonicalLearningFlow.applyCanonicalFixedSetResult({set,problemId,qualifying});
  if(next.stale)return;
  flow.completedQuestionIds=next.completedProblemIds;
  flow.retryProblemIds=next.retryProblemIds;
  flow.pendingProblemIds=next.pendingProblemIds;
}
function startWeaknessSet(skill){
  const existing=weaknessFlowSessions(skill).find(s=>s.status==="active");
  if(existing)return renderPracticeQuestion(qById(existing.problemId),existing);
  const selected=weaknessSetQuestions(skill);
  if(!selected.length)return render("practice");
  const ids=selected.map(problemIdOf),first=selected[0],sid=`weakness-${stableNumber(skill)}-${AppStorage.uuid()}`;
  const fixed=CanonicalLearningFlow.reconcileCanonicalFixedSet({requiredCount:ids.length,eligibleProblemIds:ids,fixedProblemIds:ids,completedProblemIds:[],orderedCandidateIds:ids});
  const flow={type:"weakness-set",skill,problemIds:fixed.problemIds,completedQuestionIds:fixed.completedProblemIds,retryProblemIds:fixed.retryProblemIds,pendingProblemIds:fixed.pendingProblemIds,index:0,createdAt:new Date().toISOString()};
  const session={sessionId:sid,mode:modeForPractice(first),problemId:problemIdOf(first),answerDraft:{},startedAt:new Date().toISOString(),activeMs:0,retryCount:0,hintLevel:0,hintEvents:[],exposureBefore:AppStorage.exposureStatus(problemIdOf(first)),status:"active",flow};
  AppStorage.setSession(sid,session);renderPracticeQuestion(first,session);
}
function advanceWeaknessSet(session,renderNext){
  const completed=new Set(session.flow.completedQuestionIds||[]),ids=session.flow.problemIds||[];
  if(ids.length&&ids.every(id=>completed.has(id))){
    session.status="finished";session.flow.completedAt=new Date().toISOString();AppStorage.setSession(session.sessionId,session);
    return renderWeaknessSetComplete(session);
  }
  const next=CanonicalLearningFlow.nextCanonicalFixedSetIndex(ids,[...completed],session.flow.index||0);
  if(next<0)return renderWeaknessSetComplete(session);
  const nextId=ids[next],q=qById(nextId);session.flow.index=next;session.flow.sourceReviewView="choose";session.problemId=nextId;session.mode=modeForPractice(q);session.answerDraft={};session.startedAt=new Date().toISOString();session.activeMs=0;session.retryCount=0;session.hintLevel=0;session.hintEvents=[];session.exposureBefore=AppStorage.exposureStatus(nextId);session.problemCompleted=false;session.status="active";AppStorage.setSession(session.sessionId,session);
  renderNext?renderPracticeQuestion(q,session):render("home");
}
function renderWeaknessSetComplete(session){
  const count=session.flow?.problemIds?.length||0,skill=session.flow?.skill||"弱点分野";
  app().innerHTML=`<section class="card mastery-card"><span class="eyebrow">今回のセット完了</span><h1>${count}/${count}問完了</h1><p><b>${h(skillLabel(skill))}</b>は、いったん克服しました。開始時に固定した${count}問すべてに自力で正解した履歴を保存しています。</p><p class="muted">正解済み問題は維持し、未正解問題だけを周回しました。異なる設定への応用力は、次の未見問題で別に確認します。</p><div class="actions"><button onclick="render('practice')">次の弱点へ</button><button class="secondary" onclick="startWeaknessSet('${h(skill)}')">新しいセットで再練習</button><button class="secondary" onclick="render('home')">ホームへ</button></div></section>`;
}

// ---------- source / input ----------
function sourceBlock(q,open=true){
  const prompt=q.promptText?`<div class="prompt-text">${h(q.promptText)}</div>`:"";
  if(q.sourceType==="FIXED_PRACTICE" || !q.sourcePageImage){
    return `${prompt}<p class="small muted">固定類題｜${h(practiceLevelLabel(q.practiceLevel))}｜${h(familyLabel(q.familyId||q.primarySkill))}</p>`;
  }
  return `${prompt}<details class="source-wrap" ${open?"open":""}>
    <summary>原本 ${h(q.sourceDocument)} / PDF ${q.sourcePdfPage}ページ / ${h(q.label)}</summary>
    <a class="source-link" href="${h(q.sourcePageImage)}" target="_blank" rel="noopener">
      <img class="source-page" loading="lazy" src="${h(q.sourcePageImage)}" alt="${h(q.examId+" "+q.label+" 原本ページ")}">
    </a>
    <p class="small muted">現在の設問は <strong>${h(q.label)}</strong>。画像をタップすると別タブで拡大できます。</p>
  </details>`;
}
function qInput(q,draft={},answerFor=""){
  const owner=answerFor?` data-answer-for="${h(answerFor)}"`:"";
  const t=q.answerSpec?.type;
  if(t==="multi_response"){
    return `<div class="multi-input">${q.responseSlots.map(k=>`<label>${h(k)}<input data-slot="${h(k)}"${owner} type="text" value="${h(draft[k]||"")}"></label>`).join("")}</div>`;
  }
  if(t==="coordinate"){
    return `<div class="multi-input"><label>x<input data-slot="x"${owner} type="text" value="${h(draft.x||"")}"></label><label>y<input data-slot="y"${owner} type="text" value="${h(draft.y||"")}"></label></div>`;
  }
  if(t==="coordinate_set"){
    return `<div class="multi-input">${q.responseSlots.map((k,i)=>`<label>点${i+1} (x,y)<input data-slot="${h(k)}"${owner} type="text" value="${h(draft[k]||"")}"></label>`).join("")}</div>`;
  }
  const ph=t==="solution_set"?"例: 2,-3 または 2±√6":t==="ratio"?"例: 2:3":"";
  return `<label>解答<input data-slot="value"${owner} type="text" placeholder="${h(ph)}" value="${h(draft.value||"")}" autocomplete="off"></label>`;
}
function answerInputs(answerFor=""){
  return document.querySelectorAll(answerFor?`[data-slot][data-answer-for="${answerFor}"]`:"[data-slot]");
}
function readAnswer(q,answerFor=""){
  const out={};answerInputs(answerFor).forEach(x=>out[x.dataset.slot]=x.value);
  return out;
}
function bindDraftSaver(q,cb,answerFor=""){
  answerInputs(answerFor).forEach(x=>x.addEventListener("input",()=>cb(readAnswer(q,answerFor))));
}
function mathKeypad(){
  const keys=CanonicalMathInput.canonicalMathKeys.map(({label,text})=>[label,text]);
  return `<p class="math-help">分数は /、累乗は ^、複数解はカンマで入力できます。</p><div class="math-keypad" aria-label="数式入力補助">${keys.map(([label,value])=>`<button type="button" data-math-key="${h(value)}">${h(label)}</button>`).join("")}<button type="button" data-math-action="backspace">⌫</button><button type="button" data-math-action="clear">クリア</button></div>`;
}
function bindMathKeypad(){
  let focused=document.querySelector("[data-slot]");
  document.querySelectorAll("[data-slot]").forEach(input=>input.addEventListener("focus",()=>focused=input));
  document.querySelectorAll("[data-math-key],[data-math-action]").forEach(button=>button.addEventListener("pointerdown",event=>event.preventDefault()));
  document.querySelectorAll("[data-math-key]").forEach(button=>button.onclick=()=>{
    if(!focused)return;const start=focused.selectionStart??focused.value.length,end=focused.selectionEnd??start,value=button.dataset.mathKey;
    const edit=CanonicalMathInput.insertCanonicalMathText(focused.value,{start,end},value);
    focused.value=edit.value;focused.focus();focused.setSelectionRange(edit.position,edit.position);focused.dispatchEvent(new Event("input",{bubbles:true}));
  });
  document.querySelector('[data-math-action="backspace"]')?.addEventListener("click",()=>{
    if(!focused)return;const start=focused.selectionStart??focused.value.length,end=focused.selectionEnd??start;const edit=CanonicalMathInput.deleteCanonicalMathText(focused.value,{start,end});
    focused.value=edit.value;focused.focus();focused.setSelectionRange(edit.position,edit.position);focused.dispatchEvent(new Event("input",{bubbles:true}));
  });
  document.querySelector('[data-math-action="clear"]')?.addEventListener("click",()=>{if(focused){focused.value="";focused.focus();focused.dispatchEvent(new Event("input",{bubbles:true}));}});
}
function answerDisplay(q){return q.answerCandidate??q.answerSpec?.expected??"—";}

function answerProvided(answer){
  return !!answer&&Object.values(answer).some(value=>String(value??"").trim()!=="");
}
function sessionAnsweredCount(session){
  return session.problemIds.filter(id=>answerProvided(session.answers?.[id])).length;
}
function sessionMajorItems(session){
  const current=qById(session.problemIds[session.index]),major=current?.majorQuestion;
  return session.problemIds.map((id,index)=>({q:qById(id),index})).filter(item=>item.q?.majorQuestion===major);
}
function saveCurrentSessionAnswers(session){
  for(const {q} of sessionMajorItems(session)){
    const id=problemIdOf(q);if(answerInputs(id).length)session.answers[id]=readAnswer(q,id);
  }
}
function sessionJump(sid,index){
  const session=AppStorage.session(sid);if(!session)return;
  saveCurrentSessionAnswers(session);session.index=Math.max(0,Math.min(session.problemIds.length-1,index));
  AppStorage.setSession(sid,session);window.scrollTo({top:0,behavior:"smooth"});
  session.mode==="diagnostic"?renderDiagnostic():renderExamSession(sid);
}
function sessionNavigator(session,sid){
  const questions=session.problemIds.map((id,index)=>({q:qById(id),index})).filter(item=>item.q);
  const majors=[...new Set(questions.map(item=>item.q.majorQuestion))];
  const active=questions.find(item=>item.index===session.index),activeMajor=active?.q.majorQuestion;
  const majorTabs=majors.map(major=>{const items=questions.filter(item=>item.q.majorQuestion===major),done=items.filter(item=>answerProvided(session.answers?.[problemIdOf(item.q)])).length;return `<button class="${major===activeMajor?"active":""}" onclick="sessionJump('${sid}',${items[0].index})">大問${h(major)}<small>${done}/${items.length}</small></button>`;}).join("");
  return `<div class="major-tabs" aria-label="大問選択">${majorTabs}</div>`;
}
function majorProblemBlock(items){
  const questions=items.map(item=>item.q),images=[...new Map(questions.filter(q=>q.sourcePageImage).map(q=>[q.sourcePageImage,q])).entries()];
  if(images.length)return `<p class="muted">本番演習中は、実際の試験と同じように問題ページ全体を表示します。</p><div class="exam-images">${images.map(([src,q])=>`<img src="${h(src)}" alt="${h(q.examId+" 大問"+q.majorQuestion+" 問題ページ")}" loading="eager">`).join("")}</div>`;
  return `<div class="major-prompt-list">${questions.map(q=>`<article><b>${h(q.label)}</b>${q.promptText?`<div class="prompt-text">${h(q.promptText)}</div>`:""}</article>`).join("")}</div>`;
}
function bindSessionDrafts(session,sid,items){
  for(const {q} of items){const id=problemIdOf(q);bindDraftSaver(q,ans=>{const current=AppStorage.session(sid);if(current){current.answers[id]=ans;AppStorage.setSession(sid,current);const total=document.querySelector("[data-total-entered]"),major=document.querySelector("[data-major-entered]");if(total)total.textContent=String(sessionAnsweredCount(current));if(major)major.textContent=String(items.filter(item=>answerProvided(current.answers[problemIdOf(item.q)])).length);}},id);}
}
function sessionMoveMajor(sid,dir){
  const session=AppStorage.session(sid);if(!session)return;saveCurrentSessionAnswers(session);
  const all=session.problemIds.map((id,index)=>({q:qById(id),index})).filter(item=>item.q),majors=[...new Set(all.map(item=>item.q.majorQuestion))],activeMajor=qById(session.problemIds[session.index])?.majorQuestion,majorIndex=majors.indexOf(activeMajor),next=majorIndex+dir;
  if(next>=0&&next<majors.length){session.index=all.find(item=>item.q.majorQuestion===majors[next]).index;AppStorage.setSession(sid,session);return session.mode==="diagnostic"?renderDiagnostic():renderExamSession(sid);}
  if(dir>0){AppStorage.setSession(sid,session);return finishClosedSession(sid);}
}
function toggleAnswerDock(){
  answerDockOpen=!answerDockOpen;const dock=document.querySelector(".answer-dock");if(!dock)return;
  dock.classList.toggle("open",answerDockOpen);dock.classList.toggle("closed",!answerDockOpen);
  const toggle=dock.querySelector(".answer-dock-toggle"),state=dock.querySelector(".answer-dock-state");
  if(toggle)toggle.setAttribute("aria-expanded",String(answerDockOpen));if(state)state.textContent=answerDockOpen?"閉じる":"開く";
}

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
    environment:AppStorage.namespace(),skill:q.primarySkill,difficulty:q.difficulty,examId:q.examId,
    ...(meta.guidedEvidence?{guidedEvidence:meta.guidedEvidence}:{})
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
  if(s.mode==="diagnostic")return"FY25A診断の続き";
  if(Array.isArray(s.problemIds))return`${examById(s.examId)?.label||"過去問"} ${Math.min((s.index||0)+1,s.problemIds.length)}/${s.problemIds.length}から再開`;
  const q=qById(s.problemId);return`${q?.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(q):(q?.examId||"問題")} ${q?.label||""}の続き`;
}
function preferredActiveSession(){
  const priority=s=>s.flow?.sourceSessionId?4:s.mode==="diagnostic"?3:Array.isArray(s.problemIds)?2:s.problemId?1:0;
  return AppStorage.activeSessions().sort((a,b)=>priority(b)-priority(a)||String(b.updatedAt||b.startedAt||"").localeCompare(String(a.updatedAt||a.startedAt||"")))[0]||null;
}
function examCompletedForRoute(examId){
  const required=examQuestions(examId).length;
  if(!required)return false;
  const finished=Object.values(AppStorage.get().sessions).some(s=>s?.examId===examId&&s.status==="finished"&&Array.isArray(s.results)&&new Set(s.results.map(r=>r.problemId)).size>=required);
  return finished||examExposure(examId)==="practiced";
}
function nextPastPaperTask(){
  const completed=new Set(PROFILE.pastPaperRouteExamIds.filter(examCompletedForRoute));
  const examId=CanonicalTodayPlanner.nextIncompleteRouteId(PROFILE.pastPaperRouteExamIds,completed);
  if(!examId)return null;
  const exam=examById(examId),count=examQuestions(examId).length;
  return {examId,exam,count,isDiagnostic:examId===DIAG_EXAM};
}
function startPastPaperTask(examId){return examId===DIAG_EXAM?render("diagnostic"):startExam(examId);}
function isRouteSession(s){return !!(s&&(s.flow?.sourceSessionId||s.mode==="diagnostic"||Array.isArray(s.problemIds)));}
function canonicalTodayDecision(){
  const anyResumable=preferredActiveSession(),pendingSource=pendingReinforcementSource(),today=chooseToday(),pastPaper=nextPastPaperTask(),candidates=[];
  if(anyResumable)candidates.push({lane:isRouteSession(anyResumable)||!pastPaper?"route-resume":"optional-resume",value:anyResumable});
  if(pendingSource)candidates.push({lane:"reinforcement",value:pendingSource});
  if(today.reviewItemId)candidates.push({lane:"due-review",value:today});
  if(pastPaper)candidates.push({lane:"past-paper",value:pastPaper});
  candidates.push({lane:"practice",value:today});
  return {decision:CanonicalTodayPlanner.chooseCanonicalTodayTask(candidates),anyResumable,pendingSource,today,pastPaper};
}
function todaySessionTaskId(s){
  if(s.flow?.sourceSessionId)return `reinforce:${s.flow.sourceSessionId}`;
  if(s.examId&&Array.isArray(s.problemIds))return `paper:${s.examId}`;
  if(s.flow?.type==="weakness-set")return `fixed-set:${s.sessionId}`;
  if(s.reviewItemId)return `review:${s.reviewItemId}`;
  if(s.problemId)return `practice:${s.problemId}`;
  return `resume:${s.sessionId}`;
}
function canonicalTodayQueue(limit=10){
  const st=AppStorage.get(),anyResumable=preferredActiveSession(),pendingSource=pendingReinforcementSource(),pastPaper=nextPastPaperTask(),candidates=[];
  const resumeTask=anyResumable?{id:todaySessionTaskId(anyResumable),title:"中断した学習を続ける",detail:resumeLabel(anyResumable),action:"resumeActiveSession()",button:"途中から再開"}:null;
  if(resumeTask)candidates.push({lane:isRouteSession(anyResumable)||!pastPaper?"route-resume":"optional-resume",value:resumeTask});
  if(pendingSource&&!anyResumable?.flow?.sourceSessionId)candidates.push({lane:"reinforcement",value:{id:`reinforce:${pendingSource.sessionId}`,title:"過去問の誤答を直して類題で補強",detail:`${examById(pendingSource.examId)?.label||pendingSource.examId}・誤答 ${sourceWrongResults(pendingSource).length}問`,action:`startReinforcement('${pendingSource.sessionId}')`,button:"補強を始める"}});
  const due=st.reviewItems.filter(item=>item.status==="pending"&&Date.parse(item.dueAt)<=Date.now()).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  for(const item of due){const q=qById(item.problemId);if(!q)continue;candidates.push({lane:"due-review",priority:-Date.parse(item.dueAt),value:{id:`review:${item.reviewItemId}`,title:"期限が来た問題を復習",detail:q.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(q):`${q.examId} ${q.label}`,action:`openPractice('${h(q.id)}','retention','${h(item.reviewItemId)}')`,button:"復習する"}});}
  if(pastPaper)candidates.push({lane:"past-paper",value:{id:`paper:${pastPaper.examId}`,title:pastPaper.isDiagnostic?"まず過去問一式で現在地を確認":"次の過去問一式に挑戦",detail:`${pastPaper.exam.label}・全${pastPaper.count}問`,action:`startPastPaperTask('${pastPaper.examId}')`,button:"過去問を始める"}});
  const ordinary=chooseToday();
  if(!ordinary.reviewItemId&&!pastPaper&&!pendingSource)candidates.push({lane:"practice",value:{id:`practice:${ordinary.q.id}`,title:ordinary.reason,detail:ordinary.q.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(ordinary.q):`${ordinary.q.examId} ${ordinary.q.label}`,action:`openPractice('${h(ordinary.q.id)}','${h(ordinary.mode)}','')`,button:"今これをやる"}});
  return CanonicalTodayPlanner.uniqueCanonicalTodayCandidates(candidates,value=>value.id).slice(0,limit).map(item=>resumeTask?.id===item.value.id?resumeTask:item.value);
}
function setHomeTarget(id){AppStorage.setTarget(id);render("home");}
function renderHome(){
  const st=AppStorage.get(),target=st.settings.target||"stable",a=attempts(),graded=a.filter(x=>x.correct===true||x.correct===false),correct=graded.filter(x=>x.correct===true).length,stats=skillStats();
  const pending=st.reviewItems.filter(x=>x.status==="pending"),due=pending.filter(x=>Date.parse(x.dueAt)<=Date.now()).length;
  const {decision,anyResumable,today}=canonicalTodayDecision(),lane=decision.lane,selected=decision.value,resumable=lane==="route-resume"?selected:null,pendingSource=lane==="reinforcement"?selected:null,dueToday=lane==="due-review"?selected:null,pastPaper=lane==="past-paper"?selected:null,deferredResumable=anyResumable&&selected!==anyResumable?anyResumable:null,todayQueue=canonicalTodayQueue(),route=routeSnapshot(),weak=stats.filter(s=>s.state==="weak").sort((x,y)=>x.acc-y.acc).slice(0,3);
  const todaySource=resumable?resumeLabel(resumable):pendingSource?`${examById(pendingSource.examId)?.label||pendingSource.examId}・誤答 ${sourceWrongResults(pendingSource).length}問`:dueToday?(dueToday.q.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(dueToday.q):`${dueToday.q.examId} ${dueToday.q.label}`):pastPaper?`${pastPaper.exam.label}・全${pastPaper.count}問`:today.q.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(today.q):`${today.q.examId} ${today.q.label}`;
  const todayReason=resumable?"中断した学習を続ける":pendingSource?"過去問の誤答を直して類題で補強":dueToday?dueToday.reason:pastPaper?(pastPaper.isDiagnostic?"まず過去問一式で現在地を確認":"次の過去問一式に挑戦"):today.reason;
  const todayAction=resumable?"resumeActiveSession()":pendingSource?`startReinforcement('${pendingSource.sessionId}')`:dueToday?"render('today')":pastPaper?`startPastPaperTask('${pastPaper.examId}')`:"render('today')";
  const todayButton=resumable?"途中から再開":pendingSource?"補強を始める":dueToday?"復習する":pastPaper?"過去問を始める":"今これをやる";
  const goalEstimates=PROFILE.targets.map(goal=>{const remaining=QUESTIONS.filter(q=>PROFILE.pastPaperRouteExamIds.includes(q.examId)&&targetIncludes(q,goal.id)&&AppStorage.exposureStatus(problemIdOf(q))!=="practiced").length;return {...goal,remaining,days:Math.ceil(remaining/10)};});
  const finished=Object.values(st.sessions).filter(s=>s?.status==="finished"&&Array.isArray(s.results)&&s.examId).sort((x,y)=>String(y.finishedAt||"").localeCompare(String(x.finishedAt||"")))[0],finishedCorrect=finished?.results?.filter(result=>result.correct===true).length||0,finishedWrong=finished?.results?.filter(result=>result.correct===false).length||0;
  app().innerHTML=`
  <section class="card today-hero">
    <div class="today-head"><div><span class="eyebrow">TODAY · MAX 10 TASKS</span><h1>今日やること</h1><p>上から順に進めれば大丈夫です。過去問、元問題の直し、固定類題、翌日定着を学習履歴から自動でつなぎます。</p></div>
    <div class="goal-block"><span>学習目標</span><strong>${h(targetLabel(target))}</strong><small>得点換算ではなく学習優先度</small></div></div>
    <div class="target-row"><span>目標を変更</span>${PROFILE.targets.map(t=>`<button class="target-chip ${target===t.id?"selected":""}" onclick="setHomeTarget('${t.id}')">${h(t.label)}</button>`).join("")}</div>
    <div class="goal-eta">${goalEstimates.map(goal=>`<article class="${target===goal.id?"selected":""}"><div><b>${h(goal.label)}</b><small>残り ${goal.remaining}問｜1日10問ペース</small></div><strong>${goal.remaining?`あと${goal.days}日`:"本線完了"}</strong></article>`).join("")}</div>
    <p class="goal-eta-note">過去問本線の未完了問を表示しています。公式得点には換算しません。</p>
    <div class="today-list">${todayQueue.map((task,index)=>`<article><span>${index+1}</span><div><b>${h(task.title)}</b><small>${h(task.detail)}</small></div><button class="${index===0?"primary":"secondary"}" onclick="${task.action}">${h(index===0?task.button:"開く")}</button></article>`).join("")}</div>
    <div class="today-more"><span>まず今日の必須課題を終えます。追加演習は完了後に表示します。</span></div>
  </section>
  ${deferredResumable?`<section class="card resume-card"><div><span class="eyebrow">SAVED · OPTIONAL</span><h2>以前の単問学習も保存されています</h2><p class="muted">${h(resumeLabel(deferredResumable))}</p></div><button class="secondary" onclick="resumeActiveSession()">以前の学習を再開</button></section>`:""}
  <section class="grid three">
    <div class="card stat"><strong>${finished?`${finishedCorrect}/${finished.results.length}`:"--"}</strong><span>${finished?`${h(examById(finished.examId)?.label||finished.examId)}の一致数`:"過去問未実施"}</span></div>
    <div class="card stat"><strong>${h(targetLabel(target))}</strong><span>現在の学習目標</span></div>
    <div class="card stat"><strong>${finished?finishedWrong:"--"}</strong><span>最新過去問の未解決</span></div>
  </section>
  <section class="card current-status"><div class="section-head"><div><span class="eyebrow">CURRENT STATUS</span><h2>現在の到達状況</h2></div><b>${finished?`${finishedCorrect}/${finished.results.length}`:"未診断"}</b></div><p>${finished?`${h(examById(finished.examId)?.label||finished.examId)}の結果から、誤答の元問題と固定類題を優先します。`:"まずFY25Aを一式解き、小問別に現在地を確認します。"}</p><p class="muted">最低ライン・安定圏・安全圏は学習優先度です。目標を変えても、正誤・解説・類題履歴は消えません。</p></section>
  <section class="card"><div class="section-head"><div><span class="eyebrow">WEAKNESS → ACTION</span><h2>いま直す弱点</h2></div><button class="secondary" onclick="render('review')">復習一覧</button></div>
    ${weak.length?`<div class="weak-action-grid">${weak.map(s=>`<article><div><b>${h(skillLabel(s.skill))}</b><small>正答率 ${Math.round(s.acc*100)}%・${s.n}回の履歴</small></div><button class="primary" onclick="openSkillPractice('${h(s.skill)}')">この弱点を直す</button></article>`).join("")}</div>`:`<div class="empty-state"><b>集計できる弱点はまだありません</b><p>まずFY25A診断または今日の課題から始めます。</p></div>`}
  </section>
  <section class="card learning-route compact-route"><div class="section-head"><div><span class="eyebrow">PAST PAPER CYCLE</span><h2>FY25A診断 → FY24A/B改善 → 類題・転移・定着 → FY25B → FY26B/A</h2></div><strong>${route.complete?"完了":`PHASE ${route.active+1}/8`}</strong></div>
    <div class="compact-phase-list">${route.items.map((p,i)=>`<article class="${p.done?"done":i===route.active?"active":i>route.active?"locked":""}"><span>${p.done?"✓":i+1}</span><div><b>${h(p.title)}</b><small>${p.done?"完了":i===route.active?"現在の推奨":"次の段階"}</small></div></article>`).join("")}</div>
    <p class="small muted">FY26Bは学習者が事前に見ない最終評価です。開始前は練習・ヒント・解説に表示しません。FY26Aはその後に別日程で確認します。</p>
  </section>
  <section class="card authority-note"><strong>公式情報の扱い</strong><p>公式解答・公式小問配点はありません。原本、独立解答、数学的再検算、自動採点回帰と精査をAnswer Authorityとします。FY26A Q5(3)は自動確定採点から除外します。</p></section>
  <section class="card home-secondary"><div><h2>演習・学習履歴・データ</h2><p class="muted">過去問、弱点別練習、学習記録、バックアップへ移動できます。</p></div><div class="actions"><button onclick="render('library')">演習ライブラリ</button><button class="secondary" onclick="render('progress')">学習記録</button><button class="secondary" onclick="render('data')">データ管理</button></div></section>`;
}

function openSkillPractice(skill){startWeaknessSet(skill);}

function renderLibrary(selectedExamId=""){
  const next=nextPastPaperTask(),examId=selectedExamId||next?.examId||EXAMS[0]?.examId,current=examById(examId)||EXAMS[0],questions=examQuestions(current.examId),locked=current.role==="confirmation"&&examExposure("R26-MATH-B")!=="practiced",holdout=current.role==="evaluation"&&examExposure(current.examId)==="unseen",majors=[...new Set(questions.map(q=>q.majorQuestion))];
  const start= current.examId===DIAG_EXAM?`render('diagnostic')`:`startExam('${current.examId}')`;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">PRACTICE LIBRARY</span><h1>演習ライブラリ</h1></div><select onchange="renderLibrary(this.value)">${EXAMS.map(exam=>`<option value="${h(exam.examId)}" ${exam.examId===current.examId?"selected":""}>${h(exam.label)}</option>`).join("")}</select></div>
    <div class="notice">A日程・B日程の学習記録はそれぞれ保存されます。現在は<b>${h(targetLabel(AppStorage.get().settings.target||"stable"))}</b>方針。公式小問配点がないため100点換算は行いません。</div>
    <section class="year-summary card"><strong>${h(current.label)}</strong><span>${h(examRoleLabel(current.role))} ・ ${questions.length}小問 ・ ${h(exposureLabel(examExposure(current.examId)))}</span></section>
    <div class="actions library-actions"><button ${locked?"disabled":""} onclick="${start}">${h(current.label)}を1試験分解く</button><button class="secondary" onclick="render('practice')">弱点別・固定類題を見る</button><button class="secondary" onclick="render('review')">間違いを復習</button></div>
    ${locked?'<section class="card warning-card"><h2>FY26B評価後に開放します</h2><p>別日程での確認を正確に行うため、問題情報も表示しません。</p></section>':holdout?'<section class="card warning-card"><span class="eyebrow">最終・未見評価</span><h2>開始前は問題内容を表示しません</h2><p>FY26Bは最終評価です。事前の練習・ヒント・解説には表示しません。</p></section>':`<section class="card selection-plan"><div class="section-head"><div><span class="eyebrow">問題構成</span><h2>${h(current.label)}の問題構成</h2></div></div><div class="question-list">${majors.map(major=>{const items=questions.filter(q=>q.majorQuestion===major),firstIndex=questions.findIndex(q=>q.majorQuestion===major);return `<article class="question-card"><div class="qtop"><div><span class="qnum">大問 ${h(major)}</span><h3>${items.length}小問</h3></div></div><div class="subqs">${items.map(q=>`<div class="subq"><b>${h(q.label)}</b><span>${h(skillLabel(q.primarySkill))}</span><em class="mini">${h(difficultyLabel(q.difficulty))}</em></div>`).join("")}</div><button class="secondary" onclick="${start};setTimeout(()=>sessionJump('${current.examId===DIAG_EXAM?"diag-R25-MATH-A-full-v3":`exam-${current.examId}-v3`}',${firstIndex}),0)">この大問を開く</button></article>`}).join("")}</div></section>`}`;
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
  const q=qById(s.problemIds[s.index]),items=sessionMajorItems(s),majors=[...new Set(s.problemIds.map(id=>qById(id)?.majorQuestion))],majorIndex=majors.indexOf(q.majorQuestion);items.forEach(item=>AppStorage.setExposure(problemIdOf(item.q),"seen"));
  const pct=Math.round((majorIndex+1)/majors.length*100),entered=sessionAnsweredCount(s),majorEntered=items.filter(item=>answerProvided(s.answers[problemIdOf(item.q)])).length;
  app().innerHTML=`<div class="exam-compact-head"><div><span class="eyebrow">STEP 過去問を解く</span><h1>FY25 数学A｜現在地を確認</h1></div><div><b>入力 <span data-total-entered>${entered}</span>/${s.problemIds.length}</b><button class="text-button" onclick="render('library')">演習一覧</button></div></div>
    ${sessionNavigator(s,SID)}
    <div class="exam-workspace ${answerDockOpen?"answer-open":""}">
      <section class="problem-pane card"><div class="section-head"><div><span class="eyebrow">PROBLEM · EXAM MODE</span><h2>大問${h(q.majorQuestion)}</h2></div><b>${items.length}小問</b></div>
        ${s.cleanEligible?"":'<div class="warn">この試験には既見問題があります。結果は再受験の記録です。</div>'}
        <div class="progressbar"><div style="width:${pct}%"></div></div>${majorProblemBlock(items)}
      </section>
      <aside class="answer-dock card ${answerDockOpen?"open":"closed"}"><button class="answer-dock-toggle" onclick="toggleAnswerDock()" aria-expanded="${answerDockOpen}">解答欄 <b><span data-major-entered>${majorEntered}</span>/${items.length}</b><span class="answer-dock-state">${answerDockOpen?"閉じる":"開く"}</span></button><div class="answer-dock-body">
        <p class="dock-note">診断中は難度・技能・ヒント・正答・解説を表示しません。入力は自動保存されます。</p><div class="dock-scroll">${items.map(({q:item})=>{const id=problemIdOf(item);return `<div class="dock-question"><div class="dock-qhead"><b>${h(item.label)}</b><span>答えを入力</span></div>${qInput(item,s.answers[id]||{},id)}</div>`}).join("")}</div>
        <div class="dock-keypad">${mathKeypad()}</div><div class="major-nav"><button class="secondary" ${majorIndex===0?"disabled":""} onclick="sessionMoveMajor('${SID}',-1)">← 前の大問</button><button onclick="sessionMoveMajor('${SID}',1)">${majorIndex===majors.length-1?"解答を終了して自動採点":"次の大問 →"}</button></div>
      </div></aside>
    </div>`;
  bindSessionDrafts(s,SID,items);
  bindMathKeypad();
}
function sessionMove(sid,dir){
  const s=AppStorage.session(sid);if(!s)return;
  saveCurrentSessionAnswers(s);
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
    <div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="${wrong.length?"current":"done"}"><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>固定類題</span></div><div><b>4</b><span>初見・翌日</span></div></div>
    ${wrong.length?`<p>誤答 ${wrong.length}問を元問題から解き直し、同じ技能の基礎・入試レベル類題 ${l12Count}問${transferCount?`、初見応用 ${transferCount}問`:""}へ自動でつなぎます。</p><div class="source-review-list">${wrong.map(x=>{const q=qById(x.problemId),mapped=preview.mappingBySourceProblemId[x.problemId]?.practiceProblemIds||[];return `<article><div><b>${h(q.examId)} ${h(q.label)}</b><small>${h(skillLabel(q.primarySkill))}</small></div><span>${mapped.length?`対応類題 ${mapped.length}問`:`元問題の解き直しのみ`}</span></article>`}).join("")}</div><div class="actions"><button onclick="startReinforcement('${s.sessionId}')">${existingFlow?.status==="active"?"弱点補強を続ける":"誤答の解き直し・類題を始める"}</button></div>`:`<div class="actions"><button onclick="render('exams')">次の過去問へ</button></div>`}
    ${preview.unmappedSourceProblemIds.length?`<p class="small warn">${preview.unmappedSourceProblemIds.map(id=>h(qById(id)?.label||id)).join("、")} は、対応する固定類題が監査済みデータにないため、推測で割り当てず元問題の解き直しだけを行います。</p>`:""}
  </section><section class="card">
    <p class="muted">公式配点がないため公式得点には換算しません。${s.cleanEligible===false?" この実施は初見評価ではありません。":""}</p>
  </section><section class="card"><h2>分野別</h2><div class="table-wrap"><table><tr><th>分野</th><th>一致</th></tr>
    ${Object.entries(bySkill).map(([k,v])=>`<tr><td>${h(skillLabel(k))}</td><td>${v.c}/${v.n}</td></tr>`).join("")}</table>
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
    if(c[0])return {q:c[0],mode:"learning",reason:`${practiceLevelLabel(preferred)}：${skillLabel(weak[0].skill)}`};
    const fallback=BANK.filter(q=>q.practiceLevel==="L2"&&q.primarySkill===weak[0].skill&&AppStorage.exposureStatus(q.id)==="unseen");
    if(fallback[0])return {q:fallback[0],mode:"learning",reason:`${practiceLevelLabel("L2")}：${skillLabel(weak[0].skill)}`};
  }
  const improving=stats.filter(s=>s.state==="improving").sort((a,b)=>b.acc-a.acc);
  for(const stt of improving){
    const tr=BANK.find(q=>q.practiceLevel==="TRANSFER"&&q.primarySkill===stt.skill&&cleanTransferEligible(q));
    if(tr)return {q:tr,mode:"transfer",reason:`初見問題で応用確認：${skillLabel(stt.skill)}`};
  }
  const wrong=[...attempts()].reverse().find(a=>a.mode==="diagnostic"&&a.correct===false);
  if(wrong){
    const baseq=qById(wrong.problemId);
    const c=BANK.find(q=>q.practiceLevel==="L2"&&q.primarySkill===baseq?.primarySkill&&AppStorage.exposureStatus(q.id)==="unseen");
    if(c)return {q:c,mode:"learning",reason:"診断で間違えた分野を入試レベルで補強"};
    if(baseq)return {q:baseq,mode:"learning",reason:"診断誤答"};
  }
  const unseen=QUESTIONS.filter(q=>q.role==="training"&&AppStorage.exposureStatus(q.id)==="unseen")
    .sort((a,b)=>targetRank(targetFor(b))-targetRank(targetFor(a)));
  if(unseen[0])return {q:unseen[0],mode:"learning",reason:`${targetLabel(target)}に必要な未学習`};
  const bankUnseen=BANK.find(q=>q.practiceLevel==="L2"&&AppStorage.exposureStatus(q.id)==="unseen");
  if(bankUnseen)return {q:bankUnseen,mode:"learning",reason:"入試レベルの固定類題で補強"};
  return {q:ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)],mode:"learning",reason:"Mixed練習"};
}
function renderToday(){
  const {decision,today}=canonicalTodayDecision(),lane=decision.lane,selected=decision.value,resumable=lane==="route-resume"?selected:null;
  if(resumable)return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · RESUME</span><h1>中断した学習を続ける</h1><p class="muted">保存した位置から、そのまま再開できます。</p></div></div><section class="card"><h2>${h(resumeLabel(resumable))}</h2><div class="actions"><button onclick="resumeActiveSession()">途中から再開</button></div></section>`;
  const pendingSource=lane==="reinforcement"?selected:null;
  if(pendingSource){const existing=reinforcementForSource(pendingSource.sessionId);return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · PAST PAPER FOLLOW-UP</span><h1>過去問の弱点を補強</h1><p class="muted">次の過去問へ進む前に、誤答を元問題→固定類題の順で直します。</p></div></div><section class="card"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="current"><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>固定類題</span></div><div><b>4</b><span>初見・翌日</span></div></div><h2>${h(examById(pendingSource.examId)?.label||pendingSource.examId)}の補強</h2><p>誤答 ${sourceWrongResults(pendingSource).length}問。途中で閉じてもホームの「続きから再開」から戻れます。</p><div class="actions"><button onclick="startReinforcement('${pendingSource.sessionId}')">${existing?.status==="active"?"続きから再開":"補強を始める"}</button></div></section>`;}
  const pastPaper=lane==="past-paper"?selected:null;
  if(pastPaper)return app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY · PAST PAPER FIRST</span><h1>まず過去問から始める</h1><p class="muted">過去問を一式解き、結果に応じて誤答の解き直しと対応類題へ進みます。</p></div></div><section class="card today-hero"><div class="workflow-strip"><div class="current"><b>1</b><span>過去問</span></div><div><b>2</b><span>元問題を直す</span></div><div><b>3</b><span>固定類題</span></div><div><b>4</b><span>初見・翌日</span></div></div><div class="today-head"><div><span class="eyebrow">次の過去問</span><h2>${h(pastPaper.exam.label)}</h2><p>${pastPaper.isDiagnostic?"現在地を確認する診断として一式解きます。":"前の補強を終えたので、次の過去問へ進みます。"}</p></div><div class="goal-block"><span>問題数</span><strong>${pastPaper.count}問</strong><small>一式で実施</small></div></div><div class="actions"><button onclick="startPastPaperTask('${pastPaper.examId}')">過去問を始める</button><button class="secondary" onclick="render('exams')">過去問一覧</button></div></section>`;
  const p=lane==="due-review"||lane==="practice"?selected:today,mins=p.q.estimatedMinutesRange||[.5,1.5];
  const target=AppStorage.get().settings.target||"stable",source=p.q.sourceType==="FIXED_PRACTICE"?fixedPracticeTitle(p.q):`${p.q.examId} / ${p.q.label}`;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">TODAY</span><h1>今日の学習</h1><p class="muted">学習履歴から、いま一番効果の高い課題を1つ選んでいます。</p></div><span class="route-status">${h(targetLabel(target))}</span></div>
    <section class="card today-hero"><div class="today-head"><div><span class="eyebrow">NEXT TASK</span><h2>${h(p.reason)}</h2><p>${h(source)}</p></div><div class="goal-block"><span>目安時間</span><strong>${mins[0]}–${mins[1]}分</strong><small>解答中だけ計測</small></div></div>
    <div class="meta-row"><span class="badge">${h(skillLabel(p.q.primarySkill))}</span><span class="badge">${h(targetRelevanceLabel(targetFor(p.q)))}</span><span class="badge">${h(modeLabel(p.mode))}</span></div>
    <div class="actions"><button onclick="openPractice('${p.q.id}','${p.mode}','${p.reviewItemId||""}')">この課題を始める</button><button class="secondary" onclick="render('review')">復習一覧</button></div></section>
    <section class="card"><h2>今日の進め方</h2><div class="compact-phase-list"><article class="active"><span>1</span><div><b>1問に集中</b><small>まず自力で解答</small></div></article><article><span>2</span><div><b>必要ならヒント</b><small>着眼点 → 進め方 → 解説</small></div></article><article><span>3</span><div><b>誤答を復習予約</b><small>履歴へ自動保存</small></div></article><article><span>4</span><div><b>翌日に定着確認</b><small>翌日の課題へ接続</small></div></article></div></section>`;
}
function renderReview(){
  const pending=AppStorage.get().reviewItems.filter(r=>r.status==="pending").sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">MISTAKE REVIEW</span><h1>間違い・定着復習</h1><p class="muted">誤答と翌日定着を期限順に並べています。</p></div><span class="route-status">${pending.length}件</span></div><section class="card"><div class="review-list">
    ${pending.slice(0,50).map(r=>{const q=qById(r.problemId);if(!q)return"";const overdue=Date.parse(r.dueAt)<=Date.now();return `<article class="review-row ${overdue?"overdue":""}"><div><strong>${q.sourceType==="FIXED_PRACTICE"?h(fixedPracticeTitle(q)):h(q.examId+" "+q.label)}</strong><div class="meta-row"><span class="badge">${h(skillLabel(q.primarySkill))}</span><span class="badge">${overdue?"期限到来":"予約済み"}</span></div><p class="small muted">期限 ${h(new Date(r.dueAt).toLocaleString())}</p></div><button onclick="openPractice('${q.id}','retention','${r.reviewItemId}')">復習する</button></article>`}).join("")||'<div class="empty-state"><b>復習待ちはありません</b><p>今日の課題や診断を進めると、必要な問題だけここに追加されます。</p></div>'}</div></section>`;
}

// ---------- Practice ----------
function renderPractice(){
  const examOptions=['<option value="">全ソース</option>','<option value="PRACTICE-BANK">類題Bank</option>',...EXAMS.filter(e=>e.role!=="evaluation"&&e.role!=="confirmation").map(e=>`<option value="${h(e.examId)}">${h(e.label)}</option>`)].join("");
  const skills=[...new Set(ALL_ITEMS.map(q=>q.primarySkill))].sort();
  const topics=weaknessTopics(),limit=PROFILE.practicePolicy?.weaknessDisplayLimit||3,visible=topics.slice(0,limit),unresolved=topics.reduce((sum,item)=>sum+item.items.length,0),top=topics[0]?skillLabel(topics[0].skill):"--";
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">MISTAKE REVIEW</span><h1>弱点・固定類題</h1><p class="muted">過去問と学習履歴の未解決問題から、いま直す弱点を絞ります。</p></div><button class="secondary" onclick="render('library')">演習一覧へ</button></div>
  <section class="grid three"><article class="card stat"><b>${unresolved}</b><span>未解決設問</span></article><article class="card stat"><b>${topics.length}</b><span>いま直す弱点分野</span></article><article class="card stat"><b>${h(top)}</b><span>最多の弱点</span></article></section>
  <section class="card"><h2>直す順番</h2><p class="muted">元問題の誤答を確認し、対応する基礎・入試レベルの固定類題を開始時に固定して、未正解の問題だけ周回します。</p><div class="review-order"><div><b>1</b><span>元問題を確認</span><small>過去問の誤答から弱点を特定</small></div><div><b>2</b><span>固定類題セット</span><small>開始時に4問を固定</small></div><div><b>3</b><span>未正解だけ再挑戦</span><small>正解済みは維持して定着へ</small></div></div></section>
  ${visible.length?`<section class="review-topics">${visible.map(({skill,items,stat},index)=>{const sessions=weaknessFlowSessions(skill),active=sessions.find(s=>s.status==="active"),latest=sessions[0],required=active?.flow?.problemIds?.length||latest?.flow?.problemIds?.length||PROFILE.practicePolicy?.weaknessSetSize||4,completed=active?.flow?.completedQuestionIds?.length||latest?.flow?.completedQuestionIds?.length||0,priority=index===0?"A":index===1?"B":"C",displaySkill=skillLabel(skill);return `<article class="card"><div class="section-head"><div><span class="eyebrow">補強優先度 ${priority}・${priority==="A"?"当日":priority==="B"?"翌日":"軽く確認"}</span><h3>${h(displaySkill)}</h3></div><b>${items.length}問</b></div><p><b>${h(displaySkill)}</b>の固定類題。開始したセットの完了状態を独立して管理します。</p><div class="progress-track"><i style="width:${required?Math.min(100,completed/required*100):0}%"></i></div><div class="actions"><button class="${active?"":"primary"}" onclick="startWeaknessSet('${h(skill)}')">${active?`固定類題を続ける ${completed}/${required}`:"固定類題セットで克服する"}</button></div><p class="muted">誤答しても必要問題数は増えません。正解済み問題は維持し、未正解問題だけを再挑戦します。</p>${stat?`<p class="small muted">学習履歴 ${stat.n}回・正答率 ${Math.round(stat.acc*100)}%</p>`:""}</article>`;}).join("")}</section>`:`<section class="card source-review-gate"><span class="eyebrow">過去問診断が必要です</span><h2>まず過去問を解いて弱点を見つけます</h2><p>全小問を採点すると、未解決問題と対応する固定類題セットをここに表示します。</p><div class="actions"><button onclick="render('exams')">過去問を解く</button><button class="secondary" onclick="render('home')">ホームへ戻る</button></div></section>`}
  <details class="card optional-practice"><summary><b>固定類題を分野・Levelから探す</b><span>任意練習</span></summary><p class="muted">本線は上の弱点別固定セットです。必要な場合だけ411問Bankを直接絞り込みます。</p><div class="filter-grid">
    <label>ソース<select id="pfExam">${examOptions}</select></label>
    <label>分野<select id="pfSkill"><option value="">全分野</option>${skills.map(s=>`<option value="${h(s)}">${h(skillLabel(s))}</option>`).join("")}</select></label>
    <label>難度<select id="pfDiff"><option value="">A/B/Cすべて</option><option>A</option><option>B</option><option>C</option></select></label>
    <label>学習段階<select id="pfLevel"><option value="">すべて</option><option value="L1">基礎を固める</option><option value="L2">入試レベルで練習</option><option value="TRANSFER">初見問題で確認</option><option value="RETENTION">翌日の定着確認</option></select></label>
    <label>表示<select id="pfSeen"><option value="">すべて</option><option value="unseen">未見のみ</option><option value="wrong">誤答あり</option></select></label>
    </div><div class="actions"><button id="pfApply">絞り込む</button></div><div id="practiceList" class="practice-list"></div></details>`;
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
    const title=q.sourceType==="FIXED_PRACTICE"?h(fixedPracticeTitle(q)):`${h(q.examId)} ${h(q.label)}`;
    return `<article class="practice-row"><div><strong>${title}</strong><div class="meta-row"><span class="badge ${q.difficulty.toLowerCase()}">${h(difficultyLabel(q.difficulty))}</span><span class="badge">${h(skillLabel(q.primarySkill))}</span>${q.practiceLevel?`<span class="badge">${h(practiceLevelLabel(q.practiceLevel))}</span>`:""}<span class="badge">${h(exposureLabel(AppStorage.exposureStatus(q.id)))}</span></div></div><button onclick="openPractice('${q.id}','${mode}','')">解く</button></article>`;
  }).join("")||'<p class="muted">該当なし</p>';
}
function openPractice(id,mode="learning",reviewItemId=""){
  const q=qById(id);if(!q)return;
  const prior=AppStorage.exposureStatus(id);
  const s={sessionId:`practice-${AppStorage.uuid()}`,mode,problemId:id,answerDraft:{},startedAt:new Date().toISOString(),activeMs:0,
    retryCount:0,hintLevel:0,hintEvents:[],reviewItemId,exposureBefore:prior,status:"active"};
  AppStorage.setSession(s.sessionId,s);renderPracticeQuestion(q,s);
}
function sourceReviewSession(s){return s?.flow?.stageByProblemId?.[s.problemId]==="source-review";}
function markSourceReviewHelp(sid,level){
  const s=AppStorage.session(sid);if(!s)return;
  s.hintLevel=Math.max(s.hintLevel||0,level);s.hintEvents=[...(s.hintEvents||[]),{level,at:new Date().toISOString()}];AppStorage.setSession(sid,s);
}
function renderSourceReviewChoice(q,s){
  s.flow.sourceReviewView="choose";AppStorage.setSession(s.sessionId,s);
  AppStorage.setExposure(q.id,"seen");
  const title=`${q.examId} ${q.label}`,steps=Array.isArray(q.explanationSteps)?q.explanationSteps:[];
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">元問題を1問ずつ直す</span><h1>${h(title)}</h1><p class="muted">この1問だけに集中し、理解してから固定類題へ進みます。</p></div><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断して戻る</button></div>
    <div class="one-question-banner"><b>今はこの1問だけ</b><span>ほかの問題の正答は表示しません。</span><em>${h(skillLabel(q.primarySkill))}</em></div>
    <div class="guided-review-grid"><section class="card guided-problem"><div class="section-head"><div><span class="eyebrow">元問題</span><h2>${h(title)}</h2></div></div>${sourceBlock(q,true)}</section>
    <section class="card guided-panel"><h2>この1問をどう直しますか？</h2><p class="muted">理解のしかたを選んでから、最後に自力で解き直します。</p><div class="guided-choice">
      ${steps.length?`<button onclick="renderSourceReviewGuide('${s.sessionId}')">問題専用STEPで理解する</button>`:""}
      <button class="secondary" onclick="renderSourceReviewRetry('${s.sessionId}')">もう一度自力で解く</button>
      <button class="secondary" onclick="renderSourceReviewExplanation('${s.sessionId}')">この1問の答え・解説を見る</button>
    </div></section></div>`;
}
function sourceStepProgress(s){
  s.flow.stepProgressByProblemId??={};
  return s.flow.stepProgressByProblemId[s.problemId]??={index:0,steps:{}};
}
function sourceStepCanAdvance(step){
  // Authored prose has no response validator: only explicit understanding
  // after viewing the explanation can advance, never a claimed matched answer.
  return CanonicalLearningFlow.canAdvanceCanonicalGuidedStep({assessment:step?.assessment,responseValid:false,hintLevel:3});
}
function saveSourceStepNote(sid,index,value){
  const s=AppStorage.session(sid);if(!s||!sourceReviewSession(s))return;
  const progress=sourceStepProgress(s),old=progress.steps[index]||{};
  progress.steps[index]={...old,note:value};AppStorage.setSession(sid,s);
}
function assessSourceStep(sid,index,assessment){
  const s=AppStorage.session(sid);if(!s||!sourceReviewSession(s)||!["guided","unclear"].includes(assessment))return;
  const progress=sourceStepProgress(s);
  progress.steps[index]={...(progress.steps[index]||{}),assessment,assessedAt:new Date().toISOString()};
  AppStorage.setSession(sid,s);renderSourceReviewGuide(sid,index);
}
function advanceSourceStep(sid,index){
  const s=AppStorage.session(sid),q=s&&qById(s.problemId);if(!s||!q)return;
  const progress=sourceStepProgress(s),step=progress.steps[index];
  if(!sourceStepCanAdvance(step))return;
  step.completedAt=new Date().toISOString();AppStorage.setSession(sid,s);
  if(index<q.explanationSteps.length-1)return renderSourceReviewGuide(sid,index+1);
  return renderSourceReviewRetry(sid);
}
function renderSourceReviewGuide(sid,index){
  const s=AppStorage.session(sid),q=s&&qById(s.problemId);if(!s||!q)return render("home");
  const steps=Array.isArray(q.explanationSteps)?q.explanationSteps:[];if(!steps.length)return renderSourceReviewExplanation(sid);
  const progress=sourceStepProgress(s),step=CanonicalLearningFlow.clampCanonicalStepIndex(index??progress.index,steps.length);
  progress.index=step;s.flow.sourceReviewView="guided";AppStorage.setSession(sid,s);
  markSourceReviewHelp(sid,3);
  const saved=progress.steps[step]||{},canAdvance=sourceStepCanAdvance(saved);
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">問題専用STEP</span><h1>${h(q.examId)} ${h(q.label)}</h1><p class="muted">解き方を順に確認し、最後に解説を閉じて自分で解き直します。</p></div><div class="actions"><button class="secondary" onclick="renderSourceReviewChoice(qById('${h(q.id)}'),AppStorage.session('${sid}'))">学び方を選び直す</button><button class="secondary" onclick="finishPractice('${sid}',false)">中断して戻る</button></div></div>
    <div class="guided-review-grid"><section class="card guided-problem">${sourceBlock(q,true)}</section><section class="card guided-panel"><div class="guided-progress">${steps.map((_,i)=>`<button class="${i<=step?"active":""}" onclick="renderSourceReviewGuide('${sid}',${i})">${i+1}</button>`).join("")}</div>
      <div class="guided-step"><span class="eyebrow">STEP ${step+1} / ${steps.length}</span><h2>${step===0?"着眼点を確認":"解き方をつなぐ"}</h2><p>${h(steps[step])}</p><textarea id="sourceStepNote" rows="4" placeholder="自分の途中式・考え方を記録（任意）">${h(saved.note||"")}</textarea><p class="muted">メモは自動保存します。途中式の正誤は自動判定しません。</p>
      <p role="status">${saved.assessment==="unclear"?"まだ分からないところを確認しましょう。答え・解説を読むか、前のSTEPへ戻れます。":saved.assessment==="guided"?"理解したことを記録しました。最後に自力で解き直して確認します。":"このSTEPの理解度を選んでください。"}</p><div class="actions">
      <button class="${saved.assessment==="guided"?"primary":"secondary"}" onclick="assessSourceStep('${sid}',${step},'guided')">ヒント・確認を見て分かった</button>
      <button class="${saved.assessment==="unclear"?"primary":"secondary"}" onclick="assessSourceStep('${sid}',${step},'unclear')">まだ分からない</button>
      ${step>0?`<button class="secondary" onclick="renderSourceReviewGuide('${sid}',${step-1})">前のSTEP</button>`:""}
      <button id="sourceStepNext" ${canAdvance?"":"disabled"} onclick="advanceSourceStep('${sid}',${step})">${step<steps.length-1?"次のSTEPへ":"解説を閉じて自力再現へ"}</button>
      <button class="secondary" onclick="renderSourceReviewExplanation('${sid}')">この1問の答えを見る</button></div></div></section></div>`;
  document.getElementById("sourceStepNote").addEventListener("input",event=>saveSourceStepNote(sid,step,event.target.value));
}
function renderSourceReviewExplanation(sid){
  const s=AppStorage.session(sid),q=s&&qById(s.problemId);if(!s||!q)return render("home");markSourceReviewHelp(sid,3);
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">この1問の答えと完全解説</span><h1>${h(q.examId)} ${h(q.label)}</h1></div><button class="secondary" onclick="finishPractice('${sid}',false)">中断して戻る</button></div><div class="guided-review-grid"><section class="card guided-problem">${sourceBlock(q,true)}</section><section class="card guided-panel"><div class="answer-reveal"><span>この小問の解答候補</span><strong>${h(answerDisplay(q))}</strong></div>${explanationHtml(q)}<p class="muted">答えを見たこと自体は習得扱いになりません。閉じて自力で再現してください。</p><div class="actions"><button onclick="renderSourceReviewRetry('${sid}')">答えを閉じて自力再現</button><button class="secondary" onclick="renderSourceReviewGuide('${sid}',0)">STEPを確認する</button></div></section></div>`;
}
function renderSourceReviewRetry(sid){
  const s=AppStorage.session(sid),q=s&&qById(s.problemId);if(!s||!q)return render("home");AppStorage.setExposure(q.id,"seen");
  s.flow.sourceReviewView="retry";AppStorage.setSession(sid,s);
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">自力再現</span><h1>${h(q.examId)} ${h(q.label)}</h1><p class="muted">STEP・解説を閉じました。最初から自力で解いて採点します。</p></div><button class="secondary" onclick="finishPractice('${sid}',false)">中断して戻る</button></div><article class="card practice-card wase-practice"><div class="qtop"><div><span class="eyebrow">元問題の解き直し</span><h2>${h(skillLabel(q.primarySkill))}</h2></div><span class="progress-pill">${Math.min((s.flow?.index||0)+1,s.flow?.problemIds?.length||1)} / ${s.flow?.problemIds?.length||1}</span></div>${sourceBlock(q,true)}<div class="practice-answer"><h3>解答</h3>${qInput(q,s.answerDraft||{})}<div class="math-keypad-wrap">${mathKeypad()}</div><div id="feedback"></div><div class="actions practice-actions"><button id="submitPractice">この1問を採点する</button><button class="secondary" onclick="renderSourceReviewGuide('${sid}',0)">問題専用STEP</button><button class="secondary" onclick="renderSourceReviewExplanation('${sid}')">答え・解説</button></div></div></article>`;
  activeTimer=createActiveTimer(s.activeMs||0);activeTimerCommit=ms=>{const c=AppStorage.session(sid);if(c){c.activeMs=ms;AppStorage.setSession(sid,c);}};mountFloatingTimer();
  bindDraftSaver(q,ans=>{const c=AppStorage.session(sid);if(c){c.answerDraft=ans;c.activeMs=activeTimer?activeTimer.ms():c.activeMs;AppStorage.setSession(sid,c);}});bindMathKeypad();document.getElementById("submitPractice").onclick=()=>submitPractice(sid,q);
}
function renderPracticeQuestion(q,s){
  if(s.flow?.type==="weakness-set")return renderWeaknessSetQuestion(q,s);
  if(sourceReviewSession(s)){
    if(s.flow.sourceReviewView==="guided")return renderSourceReviewGuide(s.sessionId);
    if(s.flow.sourceReviewView==="retry")return renderSourceReviewRetry(s.sessionId);
    return renderSourceReviewChoice(q,s);
  }
  AppStorage.setExposure(q.id,"seen");
  const flow=s.flow,flowIndex=flow?.index||0;
  const title=q.sourceType==="FIXED_PRACTICE"?h(fixedPracticeTitle(q)):h(q.examId+" "+q.label);
  app().innerHTML=`<div class="exam-compact-head"><div><span class="eyebrow">${flow?"PAST PAPER → FIXED PRACTICE":"GUIDED PRACTICE"}</span><h1>${flow?h(reinforcementStageLabel(s)):"問題を解く"}</h1></div><div>${flow?`<b>${flowIndex+1}/${flow.problemIds.length}</b>`:""}<button class="text-button" onclick="finishPractice('${s.sessionId}',false)">中断して戻る</button></div></div>
    ${flow?`<section class="card reinforcement-progress"><div class="workflow-strip"><div class="done"><b>1</b><span>過去問</span></div><div class="${reinforcementStageLabel(s).includes("元問題")?"current":flowIndex>0?"done":""}"><b>2</b><span>元問題を直す</span></div><div class="${["l1","l2"].includes(flow.stageByProblemId[s.problemId])?"current":flow.stageByProblemId[s.problemId]==="transfer"?"done":""}"><b>3</b><span>固定類題</span></div><div class="${flow.stageByProblemId[s.problemId]==="transfer"?"current":""}"><b>4</b><span>初見・翌日</span></div></div><div class="question-progress"><strong>${h(reinforcementStageLabel(s))}</strong><span>${flowIndex+1} / ${flow.problemIds.length}</span></div><div class="progressbar"><div style="width:${Math.round((flowIndex+1)/flow.problemIds.length*100)}%"></div></div></section>`:""}
    <div class="exam-workspace study-workspace ${answerDockOpen?"answer-open":""}">
      <section class="problem-pane card"><div class="section-head"><div><span class="eyebrow">問題</span><h2>${title}</h2></div>${flow?`<b>${h(reinforcementStageLabel(s))}</b>`:""}</div><div class="meta-row"><span class="badge">${h(modeLabel(s.mode))}</span><span class="badge ${q.difficulty.toLowerCase()}">${h(difficultyLabel(q.difficulty))}</span><span class="badge">${h(skillLabel(q.primarySkill))}</span><span class="badge">${h(targetRelevanceLabel(targetFor(q)))}</span></div>${sourceBlock(q,true)}</section>
      <aside class="answer-dock card ${answerDockOpen?"open":"closed"}"><button class="answer-dock-toggle" onclick="toggleAnswerDock()" aria-expanded="${answerDockOpen}">解答欄 ${answerProvided(s.answerDraft)?"1/1":"0/1"}<span class="answer-dock-state">${answerDockOpen?"閉じる":"開く"}</span></button><div class="answer-dock-body">
        <p class="dock-note">まず自力で解答。必要なときだけH1→H2→完全解説の順で開きます。</p><div class="dock-scroll"><div class="dock-question"><div class="dock-qhead"><b>解答</b><span>${title}</span></div>${qInput(q,s.answerDraft||{})}<div id="feedback"></div></div></div>
        <div class="dock-keypad">${mathKeypad()}</div><div class="major-nav"><button id="submitPractice">採点する</button><button class="secondary" id="hint1Btn">H1 着眼点</button><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断</button></div>
      </div></aside>
    </div>`;
  activeTimer=createActiveTimer(s.activeMs||0);activeTimerCommit=ms=>{const c=AppStorage.session(s.sessionId);if(c){c.activeMs=ms;AppStorage.setSession(s.sessionId,c);}};
  mountFloatingTimer();
  bindDraftSaver(q,ans=>{const c=AppStorage.session(s.sessionId);if(c){c.answerDraft=ans;c.activeMs=activeTimer?activeTimer.ms():c.activeMs;AppStorage.setSession(s.sessionId,c);}});
  bindMathKeypad();
  document.getElementById("hint1Btn").onclick=()=>showHint(s.sessionId,q,1);
  document.getElementById("submitPractice").onclick=()=>submitPractice(s.sessionId,q);
}
function renderWeaknessSetQuestion(q,s){
  AppStorage.setExposure(q.id,"seen");
  const completed=new Set(s.flow.completedQuestionIds||[]),required=s.flow.problemIds.length,done=completed.size,title=h(fixedPracticeTitle(q));
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">弱点の固定類題</span><h1>${h(skillLabel(s.flow.skill))}</h1><p class="muted">開始時に固定した${required}問を、未正解の問題だけ周回します。</p></div><div class="streak-badge">完了 ${done}/${required}</div></div><div class="progress-track"><i style="width:${required?done/required*100:0}%"></i></div>
    <article class="card practice-card wase-practice"><div class="qtop"><div><span class="eyebrow">${h(practiceLevelLabel(q.practiceLevel))}</span><h2>${title}</h2></div><span class="progress-pill">完了 ${done}/${required}</span></div>${sourceBlock(q,true)}<div class="practice-answer"><h3>解答</h3>${qInput(q,s.answerDraft||{})}<div class="math-keypad-wrap">${mathKeypad()}</div><div id="feedback"></div><div class="actions practice-actions"><button id="submitPractice">採点する</button><button class="secondary" id="hint1Btn">ヒント</button><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断</button></div></div></article>
    <section class="card"><h2>${required}問完了のルール</h2><p>開始時に固定した${required}問すべてに自力で正解すると「いったん克服」です。誤答があっても正解済み問題は維持し、未正解問題だけを周回します。</p><p class="muted">このセットは同型練習の確認用です。応用できるかは、次の初見問題と未見過去問で別に確認します。</p></section>`;
  activeTimer=createActiveTimer(s.activeMs||0);activeTimerCommit=ms=>{const c=AppStorage.session(s.sessionId);if(c){c.activeMs=ms;AppStorage.setSession(s.sessionId,c);}};mountFloatingTimer();
  bindDraftSaver(q,ans=>{const c=AppStorage.session(s.sessionId);if(c){c.answerDraft=ans;c.activeMs=activeTimer?activeTimer.ms():c.activeMs;AppStorage.setSession(s.sessionId,c);}});bindMathKeypad();
  document.getElementById("hint1Btn").onclick=()=>showHint(s.sessionId,q,1);document.getElementById("submitPractice").onclick=()=>submitPractice(s.sessionId,q);
}
function showHint(sid,q,level){
  const s=AppStorage.session(sid);if(!s)return;s.hintLevel=Math.max(s.hintLevel,level);s.hintEvents.push({level,at:new Date().toISOString()});AppStorage.setSession(sid,s);
  const f=document.getElementById("feedback");f.className="notice";
  if(level===1)f.innerHTML=`<strong>H1</strong> ${h(q.hint1)} <div class="actions"><button class="secondary" onclick="showHint('${sid}',qById('${q.id}'),2)">H2</button></div>`;
  else if(level===2)f.innerHTML=`<strong>H2</strong> ${h(q.hint2)} <div class="actions"><button class="secondary" onclick="showHint('${sid}',qById('${q.id}'),3)">完全解説</button></div>`;
  else f.innerHTML=`${explanationHtml(q)}<p>独立解答候補: <strong>${h(answerDisplay(q))}</strong></p>`;
}
function deriveSourceReviewEvidence(s,g){
  if(!sourceReviewSession(s)||g.reviewRequired)return null;
  const previous=s.flow.guidedByProblemId?.[s.problemId]||{};
  return CanonicalLearningFlow.deriveCanonicalGuidedFinal({
    currentMastery:previous.mastery||"unseen",correct:g.correct===true,mode:"retry",
    finalAnswerSeen:(s.hintLevel||0)>=3,
    stepHintLevels:(s.hintEvents||[]).map(event=>event.level),
    reproductionAttempts:previous.reproductionAttempts||0,
    reproductionSucceeded:previous.reproductionSucceeded||false,
    independentSucceeded:previous.independentSucceeded||false
  });
}
function submitPractice(sid,q){
  const s=AppStorage.session(sid);if(!s)return;
  const ans=readAnswer(q),g=MathScoring.grade(q,ans),now=new Date().toISOString();s.answerDraft=ans;s.activeMs=stopTimer();
  const eligible=cleanTransferEligible(q,s.exposureBefore||"seen")&&["transfer","evaluation"].includes(s.mode)&&(s.retryCount||0)===0&&(s.hintLevel||0)===0&&!(s.hintEvents||[]).length;
  const guidedEvidence=deriveSourceReviewEvidence(s,g);
  if(guidedEvidence){s.flow.guidedByProblemId={...(s.flow.guidedByProblemId||{}),[s.problemId]:guidedEvidence};}
  const qualifiesForSet=g.correct===true&&!g.reviewRequired&&(s.retryCount||0)===0&&(s.hintLevel||0)===0&&!(s.hintEvents||[]).some(event=>event.level>0);
  recordAttempt(q,ans,g,{startedAt:s.startedAt,activeDurationMs:s.activeMs,hintEvents:[...s.hintEvents],retryCount:s.retryCount,mode:s.mode,
    exposureBefore:s.exposureBefore,transferEligible:eligible,sessionId:sid,guidedEvidence});
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
    if(s.flow?.type==="weakness-set")applyWeaknessSetResult(s,problemIdOf(q),qualifiesForSet);
    s.problemCompleted=true;s.status=s.flow?.problemIds?"active":"finished";AppStorage.setSession(sid,s);
    const evidenceMessage=guidedEvidence?.mastery==="reproduced"?"解説後の自力再現に成功しました。初見の自力正解とは分けて記録します。":guidedEvidence?.mastery==="independent"?"ヒントなしで自力正解しました。":s.flow?.type==="weakness-set"&&!qualifiesForSet?"正解です。ヒント使用または解き直しのため、セット完了には数えず、後でもう一度自力で確認します。":"正解。";
    f.className="ok";f.innerHTML=`${evidenceMessage}${explanationHtml(q)}<div class="actions"><button onclick="finishPractice('${sid}',true)">次のおすすめ</button><button class="secondary" onclick="finishPractice('${sid}',false)">終了</button></div>`;
    document.getElementById("submitPractice").disabled=true;const hintButton=document.getElementById("hint1Btn");if(hintButton)hintButton.disabled=true;return;
  }
  AppStorage.scheduleReview(q.id,q.primarySkill,false);if(s.flow?.type==="weakness-set")applyWeaknessSetResult(s,problemIdOf(q),false);s.retryCount++;s.activeMs=0;s.startedAt=now;AppStorage.setSession(sid,s);
  f.className="ng";f.innerHTML=(s.retryCount===1?"不正解。答えはまだ表示しません。条件・符号・図を見直してください。":"まだ一致しません。H1/H2を使うか、もう一度自力で修正できます。")+(s.flow?.type==="weakness-set"?`<div class="actions"><button class="secondary" onclick="finishPractice('${sid}',true)">次の問題へ</button></div>`:"");
  activeTimer=createActiveTimer(0);activeTimerCommit=ms=>{const c=AppStorage.session(sid);if(c){c.activeMs=ms;AppStorage.setSession(sid,c);}};
  mountFloatingTimer();
}
function finishPractice(sid,next){
  const s=AppStorage.session(sid);if(!s)return render("home");
  if(s.flow?.type==="weakness-set"){
    if(next)return advanceWeaknessSet(s,true);
    s.status="active";s.activeMs=stopTimer();AppStorage.setSession(sid,s);return render("practice");
  }
  if(s.flow?.sourceSessionId){
    if(s.problemCompleted)return advanceReinforcement(s,next);
    s.status="active";s.activeMs=stopTimer();AppStorage.setSession(sid,s);return render("home");
  }
  s.status="finished";AppStorage.setSession(sid,s);next?render("today"):render("home");
}

// ---------- Past exams / exam mode ----------
function renderExams(){
  const confirmationUnlocked=examExposure("R26-MATH-B")==="practiced";
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">PAST PAPERS</span><h1>過去問</h1><p class="muted">A/Bを別試験として管理し、最終評価の未見性を保護します。</p></div><button class="secondary" onclick="render('library')">演習一覧へ</button></div><section class="card"><div class="notice">公式制限時間・小問配点は提供資料から確認できていないため、経過時間だけを記録します。</div>
    ${EXAMS.map(e=>{const exposure=examExposure(e.examId),mate=parallelMateExposed(e),locked=e.role==="confirmation"&&!confirmationUnlocked;return `<div class="card exam-card"><div><strong>${h(e.label)}</strong><p>${h(examRoleLabel(e.role))}・${e.questionCount}問・${h(exposureLabel(exposure))}${mate?"・別日程の問題を確認済み":""}</p>${e.role==="evaluation"?'<p class="small warn">最終・未見評価：開始前は練習・ヒント・解説に表示しません。</p>':''}${locked?'<p class="small muted">FY26B評価後に開放します。</p>':''}</div><div class="actions">${e.role==="diagnostic"?`<button onclick="render('diagnostic')">診断</button>`:`<button ${locked?'disabled':''} onclick="startExam('${e.examId}')">本番形式</button>`}${["evaluation","confirmation"].includes(e.role)?'':`<button class="secondary" onclick="practiceExam('${e.examId}')">学習</button>`}</div></div>`}).join("")}</section>`;
}
function practiceExam(examId){render("practice");document.getElementById("pfExam").value=examId;renderPracticeList();}
function startExam(examId){
  const e=examById(examId);if(e.role==="confirmation"&&examExposure("R26-MATH-B")!=="practiced")return;
  if(e.role==="evaluation"&&examExposure(examId)==="unseen"&&!confirm("FY26Bは最終・未見評価です。開始すると問題を確認済みとして記録します。開始しますか？"))return;
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
  const q=qById(s.problemIds[s.index]),items=sessionMajorItems(s),majors=[...new Set(s.problemIds.map(id=>qById(id)?.majorQuestion))],majorIndex=majors.indexOf(q.majorQuestion);items.forEach(item=>AppStorage.setExposure(problemIdOf(item.q),"seen"));
  const pct=Math.round((majorIndex+1)/majors.length*100),entered=sessionAnsweredCount(s),majorEntered=items.filter(item=>answerProvided(s.answers[problemIdOf(item.q)])).length,exam=examById(s.examId);
  app().innerHTML=`<div class="exam-compact-head"><div><span class="eyebrow">STEP 過去問を解く</span><h1>${h(exam.label)}｜${h(examRoleLabel(exam.role))}</h1></div><div><b>入力 <span data-total-entered>${entered}</span>/${s.problemIds.length}</b><button class="text-button" onclick="render('exams')">演習一覧</button></div></div>
    ${sessionNavigator(s,sid)}
    <div class="exam-workspace ${answerDockOpen?"answer-open":""}">
      <section class="problem-pane card"><div class="section-head"><div><span class="eyebrow">PROBLEM · EXAM MODE</span><h2>大問${h(q.majorQuestion)}</h2></div><b>${items.length}小問</b></div>
        ${s.cleanEligible?"":'<div class="warn">この実施は初見評価ではありません。</div>'}<div class="progressbar"><div style="width:${pct}%"></div></div>${majorProblemBlock(items)}
      </section>
      <aside class="answer-dock card ${answerDockOpen?"open":"closed"}"><button class="answer-dock-toggle" onclick="toggleAnswerDock()" aria-expanded="${answerDockOpen}">解答欄 <b><span data-major-entered>${majorEntered}</span>/${items.length}</b><span class="answer-dock-state">${answerDockOpen?"閉じる":"開く"}</span></button><div class="answer-dock-body">
        <p class="dock-note">提出前は難度・技能・ヒント・正答・解説を表示しません。入力は自動保存されます。</p><div class="dock-scroll">${items.map(({q:item})=>{const id=problemIdOf(item);return `<div class="dock-question"><div class="dock-qhead"><b>${h(item.label)}</b><span>答えを入力</span></div>${qInput(item,s.answers[id]||{},id)}</div>`}).join("")}</div>
        <div class="dock-keypad">${mathKeypad()}</div><div class="major-nav"><button class="secondary" ${majorIndex===0?"disabled":""} onclick="sessionMoveMajor('${sid}',-1)">← 前の大問</button><button onclick="sessionMoveMajor('${sid}',1)">${majorIndex===majors.length-1?"解答を終了して自動採点":"次の大問 →"}</button></div>
      </div></aside>
    </div>`;
  bindSessionDrafts(s,sid,items);
  bindMathKeypad();
}

// ---------- progress ----------
function renderProgress(){
  const stats=skillStats(),modes=["learning","retention","diagnostic","transfer","evaluation","exam","confirmation"];
  const graded=attempts().filter(a=>a.correct===true||a.correct===false),correct=graded.filter(a=>a.correct).length,mastered=stats.filter(s=>s.state==="mastered").length;
  app().innerHTML=`<div class="page-head"><div><span class="eyebrow">LEARNING REPORT</span><h1>学習記録</h1><p class="muted">正答・初見問題・翌日定着を分けて確認します。公式得点がないため100点換算はしません。</p></div></div><section class="grid three"><div class="card stat"><strong>${attempts().length}</strong><span>解答回数</span></div><div class="card stat"><strong>${graded.length?Math.round(correct/graded.length*100):0}%</strong><span>正答率</span></div><div class="card stat"><strong>${mastered}</strong><span>定着した技能</span></div></section><section class="card"><h2>技能別</h2><div class="table-wrap"><table><tr><th>技能</th><th>解答回数</th><th>正答率</th><th>初見問題</th><th>翌日定着</th><th>状態</th></tr>
    ${stats.map(s=>`<tr><td>${h(skillLabel(s.skill))}</td><td>${s.n}</td><td>${Math.round(s.acc*100)}%</td><td>${s.trC}/${s.trN}</td><td>${s.retC}/${s.retN}</td><td>${h(masteryStateLabel(s.state))}</td></tr>`).join("")||'<tr><td colspan="6">履歴なし</td></tr>'}</table></div></section>
    <section class="card"><h2>学習方法別</h2><div class="grid four">${modes.map(m=>{const x=modeStats(m);return `<div class="stat"><span>${h(modeLabel(m))}</span><strong>${x.n?Math.round(x.c/x.n*100):0}%</strong><span>${x.c}/${x.n}</span></div>`}).join("")}</div></section>
    <section class="card"><h2>過去問の実施状態</h2><div class="table-wrap"><table><tr><th>試験</th><th>状態</th></tr>${EXAMS.map(e=>`<tr><td>${h(e.label)}</td><td>${h(exposureLabel(examExposure(e.examId)))}</td></tr>`).join("")}</table></div></section>`;
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
