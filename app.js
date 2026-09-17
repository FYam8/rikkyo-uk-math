
const PROFILE=window.RIKKYO_MATH_PROFILE;
let QUESTIONS=[], BANK=[], ALL_ITEMS=[], EXAMS=[], REGISTRY={},CANONICAL_CONTENT=null;
let activeTimer=null, activeTimerCommit=null;
let currentView="home";

function h(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function stopTimer(){if(!activeTimer)return 0;const ms=activeTimer.stop();if(activeTimerCommit)try{activeTimerCommit(ms);}catch(e){}activeTimer=null;activeTimerCommit=null;return ms;}
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
  document.getElementById("menuBtn").onclick=()=>document.getElementById("nav").scrollIntoView({behavior:"smooth"});
  render("home");
}
function render(view){
  stopTimer();currentView=view;
  if(view==="home")return renderHome();
  if(view==="diagnostic")return renderDiagnostic();
  if(view==="today")return renderToday();
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
function renderHome(){
  const a=attempts(),correct=a.filter(x=>x.correct===true).length,stats=skillStats();
  const due=AppStorage.get().reviewItems.filter(x=>x.status==="pending"&&Date.parse(x.dueAt)<=Date.now()).length;
  const resumable=AppStorage.activeSessions()[0]||null;
  app().innerHTML=`
  <section class="card">
    <h2>212問＋類題Bank</h2>
    <p>FY24–FY26の数学A/B全212問に加え、Level 2 / Clean Transfer / Retention固定類題Bankを扱います。</p>
    <div class="actions"><button onclick="render('today')">今日やること</button>${resumable?'<button class="secondary" onclick="resumeActiveSession()">途中から再開</button>':''}<button class="secondary" onclick="render('diagnostic')">Core Diagnostic</button><button class="secondary" onclick="render('exams')">過去問一覧</button></div>
  </section>
  <section class="grid">
    <div class="stat"><span>過去問</span><strong>${QUESTIONS.length}</strong></div><div class="stat"><span>類題Bank</span><strong>${BANK.length}</strong></div>
    <div class="stat"><span>Attempt</span><strong>${a.length}</strong></div>
    <div class="stat"><span>正答率</span><strong>${a.filter(x=>x.correct!==null).length?Math.round(correct/a.filter(x=>x.correct!==null).length*100):0}%</strong></div>
    <div class="stat"><span>復習期限</span><strong>${due}</strong></div>
  </section>
  <section class="card warn"><strong>公式情報の扱い</strong><br>公式解答は存在しないため、正答は独立解答＋内部QAを基準にします。公式小問配点は不明です。FY26A Q5(3)は内部的にも曖昧性フラグ付きで、自動確定採点から除外します。</section>
  <section class="card"><h3>現在のMastery</h3><p>${stats.filter(s=>s.state==="mastered").length}技能がClean Transfer＋Retention条件まで到達。未実施の技能はunknown/learning相当として扱います。</p></section>
  <section class="card"><h3>学習ルート</h3><ol>${PROFILE.learningPhases.map(p=>`<li><strong>${h(p.title)}</strong> <span class="badge">${h(p.role)}</span></li>`).join("")}</ol><p class="small muted">FY26Bはlearner-unseen評価です。開始前は練習・Hint・解説に表示しません。FY26Aは評価後の確認です。</p></section>`;
}

function resumeActiveSession(){
  const s=AppStorage.activeSessions()[0];if(!s)return render("home");
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
  app().innerHTML=`<section class="card">
    <h2>Core Diagnostic — FY25A</h2>
    ${s.cleanEligible?"":'<div class="warn">この試験には既見問題があります。結果は再受験スコアでありClean Diagnosticではありません。</div>'}
    <div class="progressbar"><div style="width:${pct}%"></div></div>
    <p class="small muted">${s.index+1}/${s.problemIds.length} — ${h(q.label)}</p>
    ${sourceBlock(q,true)}
    ${qInput(q,s.answers[q.id]||{})}
    <div class="actions"><button class="secondary" ${s.index===0?"disabled":""} onclick="sessionMove('${SID}',-1)">前へ</button><button onclick="sessionMove('${SID}',1)">${s.index===s.problemIds.length-1?"終了して採点":"次へ"}</button></div>
    <p class="small muted">診断中は難度・技能・正誤・解説を表示しません。</p>
  </section>`;
  bindDraftSaver(q,ans=>{const cur=AppStorage.session(SID);if(cur){cur.answers[q.id]=ans;AppStorage.setSession(SID,cur);}});
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
  const bySkill={};
  for(const x of s.results){const q=qById(x.problemId);bySkill[q.primarySkill]??={n:0,c:0};bySkill[q.primarySkill].n++;if(x.correct===true)bySkill[q.primarySkill].c++;}
  app().innerHTML=`<section class="card"><h2>${s.mode==="diagnostic"?"診断":"セッション"}結果</h2>
    <div class="grid"><div class="stat"><span>独立正答候補との一致</span><strong>${c}/${n}</strong></div><div class="stat"><span>要確認</span><strong>${r}</strong></div></div>
    <p class="muted">公式配点がないため公式得点には換算しません。${s.cleanEligible===false?" この実施はlearner-unseen評価ではありません。":""}</p>
  </section><section class="card"><h3>分野別</h3><table><tr><th>分野</th><th>一致</th></tr>
    ${Object.entries(bySkill).map(([k,v])=>`<tr><td>${h(k)}</td><td>${v.c}/${v.n}</td></tr>`).join("")}</table>
    <div class="actions"><button onclick="render('today')">次の学習へ</button><button class="secondary" onclick="render('exams')">過去問一覧</button></div></section>`;
}

// ---------- Today / Review ----------
function bankFamilyForSkill(skill){
  const direct=BANK.find(q=>q.primarySkill===skill);
  return direct?.familyId||null;
}
function retentionCandidateFor(q){
  const fam=q.familyId||bankFamilyForSkill(q.primarySkill);
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
  if(unseen[0])return {q:unseen[0],mode:"learning",reason:`${target}目標に必要な未学習`};
  const bankUnseen=BANK.find(q=>q.practiceLevel==="L2"&&AppStorage.exposureStatus(q.id)==="unseen");
  if(bankUnseen)return {q:bankUnseen,mode:"learning",reason:"Level 2補強"};
  return {q:ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)],mode:"learning",reason:"Mixed練習"};
}
function renderToday(){
  const p=chooseToday(),mins=p.q.estimatedMinutesRange||[.5,1.5];
  app().innerHTML=`<section class="card"><h2>今日やること</h2><p><strong>${h(p.reason)}</strong></p>
    <div class="meta-row"><span class="badge">${h(p.q.primarySkillLabel)}</span><span class="badge">${h(targetFor(p.q))}</span><span class="badge">${mins[0]}–${mins[1]}分</span></div>
    <p>${p.q.sourceType==="FIXED_PRACTICE"?h((p.q.practiceLevel||"")+" / "+(p.q.familyId||p.q.primarySkill)):h(p.q.examId+" / "+p.q.label)}</p>
    <div class="actions"><button onclick="openPractice('${p.q.id}','${p.mode}','${p.reviewItemId||""}')">始める</button><button class="secondary" onclick="render('home')">今日は終了</button></div></section>`;
}
function renderReview(){
  const pending=AppStorage.get().reviewItems.filter(r=>r.status==="pending").sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
  app().innerHTML=`<section class="card"><h2>復習</h2><p>${pending.length}件</p>
    ${pending.slice(0,50).map(r=>{const q=qById(r.problemId);if(!q)return"";return `<div class="card"><strong>${q.sourceType==="FIXED_PRACTICE"?h((q.practiceLevel||"")+" / "+(q.familyId||q.primarySkill)):h(q.examId+" "+q.label)} / ${h(q.primarySkillLabel)}</strong><p class="small">期限 ${h(new Date(r.dueAt).toLocaleString())}</p><button onclick="openPractice('${q.id}','retention','${r.reviewItemId}')">復習する</button></div>`}).join("")||'<p class="muted">復習待ちはありません。</p>'}</section>`;
}

// ---------- Practice ----------
function renderPractice(){
  const examOptions=['<option value="">全ソース</option>','<option value="PRACTICE-BANK">類題Bank</option>',...EXAMS.filter(e=>e.role!=="evaluation"&&e.role!=="confirmation").map(e=>`<option value="${h(e.examId)}">${h(e.label)}</option>`)].join("");
  const skills=[...new Set(ALL_ITEMS.map(q=>q.primarySkill))].sort();
  app().innerHTML=`<section class="card"><h2>練習</h2><div class="filter-grid">
    <label>ソース<select id="pfExam">${examOptions}</select></label>
    <label>分野<select id="pfSkill"><option value="">全分野</option>${skills.map(s=>`<option>${h(s)}</option>`).join("")}</select></label>
    <label>難度<select id="pfDiff"><option value="">A/B/Cすべて</option><option>A</option><option>B</option><option>C</option></select></label>
    <label>Level<select id="pfLevel"><option value="">すべて</option><option value="L1">L1</option><option value="L2">L2</option><option value="TRANSFER">Transfer</option><option value="RETENTION">Retention</option></select></label>
    <label>表示<select id="pfSeen"><option value="">すべて</option><option value="unseen">未見のみ</option><option value="wrong">誤答あり</option></select></label>
    </div><div class="actions"><button id="pfApply">絞り込む</button></div><div id="practiceList"></div></section>`;
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
    return `<div class="card exam-card"><div><strong>${title}</strong><div class="meta-row"><span class="badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span><span class="badge">${h(q.primarySkillLabel||q.primarySkill)}</span>${q.practiceLevel?`<span class="badge">${h(q.practiceLevel)}</span>`:""}<span class="badge">${h(AppStorage.exposureStatus(q.id))}</span></div></div><button onclick="openPractice('${q.id}','${mode}','')">解く</button></div>`;
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
  app().innerHTML=`<section class="card">
    <div class="meta-row"><span class="badge">${h(s.mode)}</span><span class="badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span><span class="badge">${h(q.primarySkillLabel)}</span><span class="badge">${h(targetFor(q))}</span></div>
    <div class="question-title">${q.sourceType==="FIXED_PRACTICE"?h((q.practiceLevel||"")+" / "+(q.familyId||q.primarySkill)):h(q.examId+" "+q.label)}</div>
    ${sourceBlock(q,true)}${qInput(q,s.answerDraft||{})}
    <div id="feedback"></div>
    <div class="actions"><button id="submitPractice">採点</button><button class="secondary" id="hint1Btn">H1 着眼点</button><button class="secondary" onclick="finishPractice('${s.sessionId}',false)">中断</button></div>
  </section>`;
  activeTimer=createActiveTimer(s.activeMs||0);activeTimerCommit=ms=>{const c=AppStorage.session(s.sessionId);if(c){c.activeMs=ms;AppStorage.setSession(s.sessionId,c);}};
  bindDraftSaver(q,ans=>{const c=AppStorage.session(s.sessionId);if(c){c.answerDraft=ans;c.activeMs=activeTimer?activeTimer.ms():c.activeMs;AppStorage.setSession(s.sessionId,c);}});
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
    if(q.practiceLevel!=="RETENTION"){
      const rq=retentionCandidateFor(q);
      AppStorage.scheduleReview(rq?.id||q.id,rq?.primarySkill||q.primarySkill,true,prior);
    }
    s.status="finished";AppStorage.setSession(sid,s);
    f.className="ok";f.innerHTML=`正解。${explanationHtml(q)}<div class="actions"><button onclick="finishPractice('${sid}',true)">次のおすすめ</button><button class="secondary" onclick="finishPractice('${sid}',false)">終了</button></div>`;
    document.getElementById("submitPractice").disabled=true;document.getElementById("hint1Btn").disabled=true;return;
  }
  AppStorage.scheduleReview(q.id,q.primarySkill,false);s.retryCount++;s.activeMs=0;s.startedAt=now;AppStorage.setSession(sid,s);
  f.className="ng";f.innerHTML=s.retryCount===1?"不正解。答えはまだ表示しません。条件・符号・図を見直して再挑戦してください。":"まだ一致しません。H1/H2を使うか、もう一度自力で修正できます。";
  activeTimer=createActiveTimer(0);activeTimerCommit=ms=>{const c=AppStorage.session(sid);if(c){c.activeMs=ms;AppStorage.setSession(sid,c);}};
}
function finishPractice(sid,next){const s=AppStorage.session(sid);if(s){s.status="finished";AppStorage.setSession(sid,s);}next?render("today"):render("home");}

// ---------- Past exams / exam mode ----------
function renderExams(){
  const confirmationUnlocked=examExposure("R26-MATH-B")==="practiced";
  app().innerHTML=`<section class="card"><h2>過去問</h2><p class="muted">公式制限時間・小問配点は提供資料から確認できていないため、Exam Modeは経過時間のみ記録します。</p>
    ${EXAMS.map(e=>{const exposure=examExposure(e.examId),mate=parallelMateExposed(e),locked=e.role==="confirmation"&&!confirmationUnlocked;return `<div class="card exam-card"><div><strong>${h(e.label)}</strong><p>${h(e.roleLabel)} / ${e.questionCount}問 / exposure=${h(exposure)}${mate?" / parallel mate既見":""}</p>${e.role==="evaluation"?'<p class="small warn">learner-unseen評価：開始前は練習・Hint・解説に露出しません。</p>':''}${locked?'<p class="small muted">FY26B評価後に開放します。</p>':''}</div><div class="actions">${e.role==="diagnostic"?`<button onclick="render('diagnostic')">診断</button>`:`<button ${locked?'disabled':''} onclick="startExam('${e.examId}')">本番形式</button>`}${["evaluation","confirmation"].includes(e.role)?'':`<button class="secondary" onclick="practiceExam('${e.examId}')">学習</button>`}</div></div>`}).join("")}</section>`;
}
function practiceExam(examId){document.querySelector('[data-view="practice"]').click();setTimeout(()=>{document.getElementById("pfExam").value=examId;renderPracticeList();},0);}
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
  app().innerHTML=`<section class="card"><h2>${h(examById(s.examId).label)} — Exam Mode</h2>
    ${s.cleanEligible?"":'<div class="warn">この実施はlearner-unseenのClean評価ではありません。</div>'}
    <div class="progressbar"><div style="width:${pct}%"></div></div><p class="small muted">${s.index+1}/${s.problemIds.length} — ${h(q.label)}</p>
    ${sourceBlock(q,true)}${qInput(q,s.answers[q.id]||{})}
    <div class="actions"><button class="secondary" ${s.index===0?"disabled":""} onclick="sessionMove('${sid}',-1)">前へ</button><button onclick="sessionMove('${sid}',1)">${s.index===s.problemIds.length-1?"終了して採点":"次へ"}</button></div>
    <p class="small muted">提出前は難度・技能・Hint・正答・解説を表示しません。</p></section>`;
  bindDraftSaver(q,ans=>{const c=AppStorage.session(sid);if(c){c.answers[q.id]=ans;AppStorage.setSession(sid,c);}});
}

// ---------- progress ----------
function renderProgress(){
  const stats=skillStats(),modes=["learning","retention","diagnostic","transfer","evaluation","exam","confirmation"];
  app().innerHTML=`<section class="card"><h2>進捗</h2><table><tr><th>技能</th><th>Attempt</th><th>正答率</th><th>Clean Transfer</th><th>Retention</th><th>状態</th></tr>
    ${stats.map(s=>`<tr><td>${h(s.skill)}</td><td>${s.n}</td><td>${Math.round(s.acc*100)}%</td><td>${s.trC}/${s.trN}</td><td>${s.retC}/${s.retN}</td><td>${h(s.state)}</td></tr>`).join("")||'<tr><td colspan="6">履歴なし</td></tr>'}</table></section>
    <section class="card"><h3>モード別</h3><div class="grid">${modes.map(m=>{const x=modeStats(m);return `<div class="stat"><span>${h(m)}</span><strong>${x.n?Math.round(x.c/x.n*100):0}%</strong><span>${x.c}/${x.n}</span></div>`}).join("")}</div></section>
    <section class="card"><h3>試験Exposure</h3><table><tr><th>試験</th><th>状態</th></tr>${EXAMS.map(e=>`<tr><td>${h(e.label)}</td><td>${h(examExposure(e.examId))}</td></tr>`).join("")}</table></section>`;
}

// ---------- data ----------
function renderData(){
  const st=AppStorage.get();
  const migration=AppStorage.migrationReport(),restorePoints=AppStorage.listRestorePoints();
  app().innerHTML=`<section class="card"><h2>設定 / Export / Import</h2><p>namespace <strong>${h(AppStorage.namespace())}</strong> / Device ${h(st.device.deviceId)}</p><p class="small">canonical learner-state v1 / migration=${h(migration.status)} / 復元ポイント=${restorePoints.length}</p>
    <label>目標<select id="targetSel"><option value="minimum">最低</option><option value="stable">安定</option><option value="safe">安全</option></select></label>
    <label>端末名<input id="nick" type="text" value="${h(st.device.nickname||"")}"></label>
    <div class="actions"><button id="saveSettings">設定保存</button><button id="exportBtn">Export</button><button class="secondary" id="importBtn">Import</button></div>
    <textarea id="io" rows="14" placeholder="Export / Import JSON"></textarea>
    <div class="actions"><button class="danger" id="resetBtn">学習データを初期化</button>${restorePoints.length?'<button id="restoreLatest" class="secondary">最新の復元ポイントへ戻す</button>':''}</div>
    <p class="small muted">旧MVP v1/v2およびFull v3を削除せずcanonical v1へ移行します。Import前に端末内復元ポイントを作成し、checksum・attemptId・problemId・same-ID conflictを検証します。</p></section>`;
  document.getElementById("targetSel").value=st.settings.target||"stable";
  document.getElementById("saveSettings").onclick=()=>{AppStorage.setTarget(document.getElementById("targetSel").value);AppStorage.setNickname(document.getElementById("nick").value);alert("保存しました");};
  document.getElementById("exportBtn").onclick=()=>document.getElementById("io").value=AppStorage.exportJson();
  document.getElementById("importBtn").onclick=()=>{try{AppStorage.importJson(document.getElementById("io").value);alert("Importしました");render("progress");}catch(e){alert(e.message);}};
  document.getElementById("resetBtn").onclick=()=>{if(confirm("全学習データを初期化しますか？バックアップは自動保存されます。")){AppStorage.reset();render("home");}};
  if(restorePoints.length)document.getElementById("restoreLatest").onclick=()=>{if(confirm("最新の端末内復元ポイントへ戻しますか？")){AppStorage.restorePoint(restorePoints[0].id);render("home");}};
}

boot();
