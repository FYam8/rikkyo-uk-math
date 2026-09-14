
window.AppStorage = (() => {
  const params=new URLSearchParams(location.search);
  const requested=(params.get("env")||"prod").toLowerCase();
  const NS=["prod","qa","test"].includes(requested)?requested:"prod";
  const KEY=`rikkyoMathFull:${NS}:v3`;
  const LEGACY_KEYS=[`rikkyoMathMvp:${NS}:v2`,`rikkyoMathMvp:${NS}:v1`];
  const MAX_IMPORT=10_000_000;
  const exposureRank={unseen:0,seen:1,practiced:2};
  let knownProblemIds=new Set();

  function uuid(){return crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(36).slice(2);}
  function fresh(){
    return {schemaVersion:3,namespace:NS,attempts:[],reviewItems:[],sessions:{},exposure:{},
      settings:{target:"stable"},device:{deviceId:uuid(),nickname:null,lastSync:null},
      createdAt:new Date().toISOString()};
  }
  function migrate(x,fromKey=null){
    if(!x) return fresh();
    if(x.schemaVersion===3){x.namespace=NS;return x;}
    if([1,2].includes(x.schemaVersion)){
      return {
        schemaVersion:3,namespace:NS,
        attempts:Array.isArray(x.attempts)?x.attempts:[],
        reviewItems:Array.isArray(x.reviewItems)?x.reviewItems:[],
        sessions:{}, // old active session shapes are intentionally not resumed
        exposure:x.exposure||{},
        settings:x.settings||{target:"stable"},
        device:x.device||{deviceId:uuid(),nickname:null,lastSync:null},
        createdAt:x.createdAt||new Date().toISOString(),
        migratedFrom:{schemaVersion:x.schemaVersion,key:fromKey,at:new Date().toISOString()}
      };
    }
    return fresh();
  }
  function load(){
    try{
      const cur=localStorage.getItem(KEY);
      if(cur) return migrate(JSON.parse(cur),KEY);
      for(const k of LEGACY_KEYS){
        const raw=localStorage.getItem(k);
        if(raw){
          const m=migrate(JSON.parse(raw),k);
          localStorage.setItem(KEY,JSON.stringify(m));
          return m;
        }
      }
      return fresh();
    }catch(e){console.warn(e);return fresh();}
  }
  let state=load();
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}
  function get(){return state;}
  function namespace(){return NS;}
  function setKnownProblemIds(ids){knownProblemIds=new Set(ids);}
  function backup(){localStorage.setItem(KEY+":backup:"+Date.now(),JSON.stringify(state));}
  function reset(){backup();state=fresh();save();}
  function addAttempt(a){const item={...a,attemptId:a.attemptId||uuid()};state.attempts.push(item);save();return item;}
  function exposureStatus(id){return state.exposure[id]?.status||"unseen";}
  function setExposure(id,status){
    const cur=state.exposure[id]||{status:"unseen"};
    const final=(exposureRank[status]??0)>(exposureRank[cur.status]??0)?status:cur.status;
    state.exposure[id]={status:final,firstSeenAt:cur.firstSeenAt||new Date().toISOString(),lastSeenAt:new Date().toISOString()};
    save();
  }
  function session(id){return state.sessions[id]||null;}
  function setSession(id,s){state.sessions[id]=s;save();}
  function removeSession(id){delete state.sessions[id];save();}
  function activeSessions(){return Object.values(state.sessions).filter(s=>s&&s.status==="active" && (!s.problemId||knownProblemIds.has(s.problemId)||Array.isArray(s.problemIds)));}
  function scheduleReview(problemId,skill,correct,priorStageOverride=null){
    const existing=state.reviewItems.find(x=>x.problemId===problemId&&x.status==="pending");
    const priorStage=priorStageOverride!==null?priorStageOverride:(existing?.stage??-1);
    const nextStage=correct?Math.min(priorStage+1,2):Math.max(priorStage,0);
    const days=correct?[1,3,7][nextStage]:1;
    const item={reviewItemId:existing?.reviewItemId||uuid(),problemId,skill,stage:nextStage,
      dueAt:new Date(Date.now()+days*86400000).toISOString(),reason:correct?"retention":"weakness",
      status:"pending",updatedAt:new Date().toISOString()};
    if(existing) Object.assign(existing,item); else state.reviewItems.push(item);
    save(); return item;
  }
  function reviewItem(id){return state.reviewItems.find(x=>x.reviewItemId===id)||null;}
  function setReviewStatus(id,status){const r=reviewItem(id);if(r){r.status=status;r.updatedAt=new Date().toISOString();save();}return r;}
  function setTarget(t){if(["minimum","stable","safe"].includes(t)){state.settings.target=t;save();}}
  function setNickname(n){state.device.nickname=String(n||"").slice(0,80)||null;save();}
  function fnv1a(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,"0");}
  function exportJson(){
    const payload={...state,exportedAt:new Date().toISOString()};
    const raw=JSON.stringify(payload);
    return JSON.stringify({...payload,checksum:"fnv1a:"+fnv1a(raw)},null,2);
  }
  function validateAttempt(a){
    if(!a||typeof a!=="object") throw new Error("Attempt形式が不正です");
    for(const k of ["attemptId","problemId","submittedAt","mode"]){if(!a[k])throw new Error(`Attempt必須キー不足: ${k}`);}
    if(knownProblemIds.size&&!knownProblemIds.has(a.problemId)) throw new Error(`未知のproblemId: ${a.problemId}`);
  }
  function importJson(text){
    if(String(text).length>MAX_IMPORT) throw new Error("Importデータが大きすぎます");
    const incoming=JSON.parse(text);
    if(!incoming||![1,2,3].includes(incoming.schemaVersion)||!Array.isArray(incoming.attempts)) throw new Error("互換性のないデータです");
    if(incoming.checksum){
      const clone={...incoming};delete clone.checksum;
      const actual="fnv1a:"+fnv1a(JSON.stringify(clone));
      if(actual!==incoming.checksum) throw new Error("checksumが一致しません");
    }
    const ids=new Set();
    for(const a of incoming.attempts){validateAttempt(a);if(ids.has(a.attemptId))throw new Error("Import内に重複attemptIdがあります");ids.add(a.attemptId);}
    backup();
    const seen=new Set(state.attempts.map(a=>a.attemptId));
    for(const a of incoming.attempts){if(!seen.has(a.attemptId)){state.attempts.push(a);seen.add(a.attemptId);}}
    const reviewMap=new Map(state.reviewItems.map(r=>[r.reviewItemId||r.problemId,r]));
    for(const r of (incoming.reviewItems||[])){const k=r.reviewItemId||r.problemId;if(k&&!reviewMap.has(k))reviewMap.set(k,r);}
    state.reviewItems=[...reviewMap.values()];
    for(const [id,e] of Object.entries(incoming.exposure||{})){
      if(knownProblemIds.size&&!knownProblemIds.has(id)) continue;
      const cur=state.exposure[id]||{status:"unseen"};
      const final=(exposureRank[e.status]??0)>(exposureRank[cur.status]??0)?e.status:cur.status;
      state.exposure[id]={...cur,...e,status:final,firstSeenAt:cur.firstSeenAt||e.firstSeenAt};
    }
    state.settings={...state.settings,...(incoming.settings||{})};
    save();
  }
  return {get,save,reset,addAttempt,exposureStatus,setExposure,session,setSession,removeSession,activeSessions,
    scheduleReview,reviewItem,setReviewStatus,setTarget,setNickname,exportJson,importJson,uuid,setKnownProblemIds,namespace};
})();
