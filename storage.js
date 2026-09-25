window.AppStorage = (() => {
  const profile=window.RIKKYO_MATH_PROFILE||{runtime:{backupAppId:"rikkyo-uk-math",updateChannel:"rikkyo-uk-math-updates",progressSync:{indexedDbName:"rikkyo-uk-math-progress-sync",appId:"rikkyo-uk-math"}}};
  const params=new URLSearchParams(location.search),requested=(params.get("env")||"prod").toLowerCase();
  const NS=["prod","qa","test"].includes(requested)?requested:"prod";
  const CANONICAL_KEY=`rikkyo-uk-math:${NS}:learner-state:v1`,LEGACY_KEY=`rikkyoMathFull:${NS}:v3`;
  const LEGACY_KEYS=[`rikkyoMathMvp:${NS}:v2`,`rikkyoMathMvp:${NS}:v1`];
  const DEVICE_KEY=`rikkyo-uk-math:${NS}:device-id`,DEVICE_META_KEY=`rikkyo-uk-math:${NS}:device-meta:v1`,RESTORE_KEY=`rikkyo-uk-math:${NS}:restore-points:v1`;
  const MAX_IMPORT=10_000_000,MAX_RESTORE_POINTS=5,exposureRank={unseen:0,seen:1,practiced:2};
  let knownProblemIds=new Set(),lastMigrationReport={status:"not-run",issues:[]};

  function uuid(){return crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(36).slice(2);}
  function now(){return new Date().toISOString();}
  function parse(raw,fallback=null){try{return raw===null?fallback:JSON.parse(raw);}catch(_){return fallback;}}
  function isObject(x){return !!x&&typeof x==="object"&&!Array.isArray(x);}
  function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id=uuid();localStorage.setItem(DEVICE_KEY,id);}return id;}
  function deviceMeta(){return parse(localStorage.getItem(DEVICE_META_KEY),{nickname:null,lastSync:null});}
  function setDeviceMeta(meta){localStorage.setItem(DEVICE_META_KEY,JSON.stringify(meta));}
  function fresh(){const at=now();return {contractVersion:1,schemaVersion:1,appId:profile.runtime.backupAppId,namespace:NS,preferences:{targetId:"stable",nickname:null,updatedAt:at},activityRecords:[],reviewItems:[],sessionsById:{},exposureByProblemId:{},createdAt:at,updatedAt:at,migration:null};}
  function validateCanonical(x){
    if(!isObject(x)||x.contractVersion!==1||x.schemaVersion!==1||x.appId!=="rikkyo-uk-math"||x.namespace!==NS)throw new Error("canonical learner state identity mismatch");
    if(!Array.isArray(x.activityRecords)||!Array.isArray(x.reviewItems)||!isObject(x.sessionsById)||!isObject(x.exposureByProblemId))throw new Error("canonical learner state shape mismatch");
    if(!isObject(x.preferences)||!["minimum","stable","safe"].includes(x.preferences.targetId))throw new Error("canonical targetId mismatch");
    const ids=new Set();for(const a of x.activityRecords){const id=a.attemptId||a.id;if(!id||ids.has(id))throw new Error("duplicate canonical activity identity");if(!a.problemId)throw new Error(`canonical activity problemId missing: ${id}`);if(!a.submittedAt&&!a.at)throw new Error(`canonical activity timestamp missing: ${id}`);if(!a.deviceId)throw new Error(`canonical activity provenance missing: ${id}`);ids.add(id);}
    return x;
  }
  function legacySource(){const cur=parse(localStorage.getItem(LEGACY_KEY));if(cur)return {state:cur,key:LEGACY_KEY};for(const key of LEGACY_KEYS){const value=parse(localStorage.getItem(key));if(value)return {state:value,key};}return null;}
  function normalizeLegacy(x,fromKey){
    if(!isObject(x)||![1,2,3].includes(x.schemaVersion))throw new Error("unsupported Rikkyo legacy schema");
    const at=now(),attempts=Array.isArray(x.attempts)?x.attempts:[],seen=new Set(),sourceDeviceId=x.device?.deviceId?String(x.device.deviceId):null;
    if(attempts.some(a=>!a.deviceId)&&!sourceDeviceId)throw new Error("legacy attempt provenance cannot be derived losslessly");
    const activityRecords=attempts.map(a=>{const id=a.attemptId||a.id;if(!id||seen.has(id))throw new Error("legacy attempt identity is missing or duplicated");seen.add(id);const submittedAt=a.submittedAt||a.at;if(!submittedAt)throw new Error(`legacy attempt timestamp missing: ${id}`);if(!a.problemId)throw new Error(`legacy problemId missing: ${id}`);return {...a,kind:"problem-attempt",id,attemptId:id,at:submittedAt,submittedAt,deviceId:a.deviceId||sourceDeviceId,outcome:a.correct===true?"correct":a.correct===false?"wrong":"deferred"};});
    const target=x.settings?.target||"stable";if(!["minimum","stable","safe"].includes(target))throw new Error("legacy target is unsupported");
    return validateCanonical({contractVersion:1,schemaVersion:1,appId:"rikkyo-uk-math",namespace:NS,preferences:{targetId:target,nickname:x.device?.nickname||null,updatedAt:x.updatedAt||at},activityRecords,reviewItems:Array.isArray(x.reviewItems)?structuredClone(x.reviewItems):[],sessionsById:isObject(x.sessions)?structuredClone(x.sessions):{},exposureByProblemId:isObject(x.exposure)?structuredClone(x.exposure):{},createdAt:x.createdAt||at,updatedAt:at,migration:{sourceKey:fromKey,sourceSchemaVersion:x.schemaVersion,migratedAt:at}});
  }
  function exactSnapshot(){return {canonical:localStorage.getItem(CANONICAL_KEY),legacy:localStorage.getItem(LEGACY_KEY),device:localStorage.getItem(DEVICE_KEY),deviceMeta:localStorage.getItem(DEVICE_META_KEY)};}
  function restoreExact(snapshot){for(const [key,value] of [[CANONICAL_KEY,snapshot.canonical],[LEGACY_KEY,snapshot.legacy],[DEVICE_KEY,snapshot.device],[DEVICE_META_KEY,snapshot.deviceMeta]]){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}
  function createRestorePoint(reason){const points=parse(localStorage.getItem(RESTORE_KEY),[]),point={id:uuid(),reason,createdAt:now(),snapshot:exactSnapshot()};localStorage.setItem(RESTORE_KEY,JSON.stringify([point,...(Array.isArray(points)?points:[])].slice(0,MAX_RESTORE_POINTS)));return point;}
  function legacyFromCanonical(c){const meta=deviceMeta();return {schemaVersion:3,namespace:NS,attempts:c.activityRecords.map(a=>{const copy={...a};delete copy.kind;delete copy.outcome;delete copy.at;delete copy.id;return copy;}),reviewItems:structuredClone(c.reviewItems),sessions:structuredClone(c.sessionsById),exposure:structuredClone(c.exposureByProblemId),settings:{target:c.preferences.targetId},device:{deviceId:deviceId(),nickname:c.preferences.nickname??meta.nickname??null,lastSync:meta.lastSync??null},createdAt:c.createdAt,canonicalShadow:{contractVersion:1,key:CANONICAL_KEY,updatedAt:c.updatedAt}};}
  function commit(next){validateCanonical(next);next.updatedAt=now();const before=exactSnapshot(),canonicalRaw=JSON.stringify(next),legacyRaw=JSON.stringify(legacyFromCanonical(next));try{localStorage.setItem(CANONICAL_KEY,canonicalRaw);localStorage.setItem(LEGACY_KEY,legacyRaw);if(localStorage.getItem(CANONICAL_KEY)!==canonicalRaw||localStorage.getItem(LEGACY_KEY)!==legacyRaw)throw new Error("post-write parity failed");}catch(error){restoreExact(before);throw error;}}
  function load(){
    const raw=localStorage.getItem(CANONICAL_KEY);if(raw){const loaded=validateCanonical(JSON.parse(raw));lastMigrationReport={status:"canonical",issues:[]};return loaded;}
    const source=legacySource();if(!source){const state=fresh();commit(state);lastMigrationReport={status:"fresh",issues:[]};return state;}
    const before=exactSnapshot(),candidate=normalizeLegacy(source.state,source.key);createRestorePoint("canonical-migration-v1");
    try{if(!localStorage.getItem(DEVICE_KEY)&&source.state.device?.deviceId)localStorage.setItem(DEVICE_KEY,String(source.state.device.deviceId));if(source.state.device)setDeviceMeta({nickname:source.state.device.nickname??null,lastSync:source.state.device.lastSync??null});commit(candidate);const reread=validateCanonical(JSON.parse(localStorage.getItem(CANONICAL_KEY)));if(reread.activityRecords.length!==(source.state.attempts||[]).length)throw new Error("attempt parity failed");lastMigrationReport={status:"migrated",sourceKey:source.key,issues:[]};return reread;}
    catch(error){restoreExact(before);lastMigrationReport={status:"blocked",sourceKey:source.key,issues:[String(error?.message||error)]};throw error;}
  }
  let state=load();
  function view(){const meta=deviceMeta();return {schemaVersion:1,contractVersion:1,namespace:NS,attempts:state.activityRecords,reviewItems:state.reviewItems,sessions:state.sessionsById,exposure:state.exposureByProblemId,settings:{target:state.preferences.targetId},device:{deviceId:deviceId(),nickname:state.preferences.nickname??meta.nickname??null,lastSync:meta.lastSync??null},createdAt:state.createdAt};}
  function save(){commit(state);}function get(){return view();}function namespace(){return NS;}function setKnownProblemIds(ids){knownProblemIds=new Set(ids);}function backup(){return createRestorePoint("manual-backup");}
  function reset(){createRestorePoint("before-reset");state=fresh();commit(state);}
  function addAttempt(a){const id=a.attemptId||uuid(),submittedAt=a.submittedAt||now();if(state.activityRecords.some(x=>(x.attemptId||x.id)===id))throw new Error("attemptId conflict");const item={...a,kind:"problem-attempt",id,attemptId:id,at:submittedAt,submittedAt,deviceId:a.deviceId||deviceId(),outcome:a.correct===true?"correct":a.correct===false?"wrong":"deferred"};state.activityRecords.push(item);save();return item;}
  function exposureStatus(id){return state.exposureByProblemId[id]?.status||"unseen";}
  function setExposure(id,status){const cur=state.exposureByProblemId[id]||{status:"unseen"},final=(exposureRank[status]??0)>(exposureRank[cur.status]??0)?status:cur.status;state.exposureByProblemId[id]={status:final,firstSeenAt:cur.firstSeenAt||now(),lastSeenAt:now()};save();}
  function session(id){return state.sessionsById[id]||null;}function setSession(id,s){state.sessionsById[id]=s;save();}function removeSession(id){delete state.sessionsById[id];save();}
  function activeSessions(){return Object.values(state.sessionsById).filter(s=>s&&s.status==="active"&&(!s.problemId||knownProblemIds.has(s.problemId)||Array.isArray(s.problemIds)));}
  function scheduleReview(problemId,skill,correct,priorStageOverride=null){
    const existing=state.reviewItems.find(x=>x.problemId===problemId&&x.status==="pending");
    // More practice is not evidence that the pending retention check was done.
    const pendingAgain=correct&&existing&&priorStageOverride===null;
    const priorStage=priorStageOverride!==null?priorStageOverride:(existing?.stage??-1);
    const nextStage=pendingAgain?existing.stage:correct?Math.min(priorStage+1,2):Math.max(priorStage,0);
    const days=correct?[1,3,7][nextStage]:1;
    const proposed=Date.now()+days*86400000;
    const due=pendingAgain?Math.min(Date.parse(existing.dueAt)||proposed,proposed):proposed;
    const item={reviewItemId:existing?.reviewItemId||uuid(),problemId,skill,stage:nextStage,dueAt:new Date(due).toISOString(),reason:correct?"retention":"weakness",status:"pending",updatedAt:now()};
    if(existing)Object.assign(existing,item);else state.reviewItems.push(item);save();return item;
  }
  function reviewItem(id){return state.reviewItems.find(x=>x.reviewItemId===id)||null;}function setReviewStatus(id,status){const r=reviewItem(id);if(r){r.status=status;r.updatedAt=now();save();}return r;}
  function setTarget(targetId){if(["minimum","stable","safe"].includes(targetId)){state.preferences.targetId=targetId;state.preferences.updatedAt=now();save();}}
  function setNickname(value){const nickname=String(value||"").slice(0,80)||null;state.preferences.nickname=nickname;setDeviceMeta({...deviceMeta(),nickname});save();}
  function fnv1a(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,"0");}
  function portableState(){return {preferences:structuredClone(state.preferences),activityRecords:structuredClone(state.activityRecords),reviewItems:structuredClone(state.reviewItems),sessionsById:structuredClone(state.sessionsById),exposureByProblemId:structuredClone(state.exposureByProblemId),createdAt:state.createdAt,updatedAt:state.updatedAt};}
  function exportJson(){const payload={app:"rikkyo-uk-math",backupSchemaVersion:1,contractVersion:1,namespace:NS,exportedAt:now(),learnerState:portableState()},raw=JSON.stringify(payload);return JSON.stringify({...payload,checksum:"fnv1a:"+fnv1a(raw)},null,2);}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function mergeRecords(name,local,incoming,idOf){const out=[...local],map=new Map(local.map(x=>[idOf(x),x]));for(const item of incoming){const id=idOf(item);if(!id)throw new Error(`${name} identity missing`);const cur=map.get(id);if(cur&&!same(cur,item))throw new Error(`${name} conflict: ${id}`);if(!cur){map.set(id,item);out.push(item);}}return out;}
  function mergeMaps(name,local,incoming){const out={...local};for(const [key,value] of Object.entries(incoming||{})){if(key in out&&!same(out[key],value))throw new Error(`${name} conflict: ${key}`);if(!(key in out))out[key]=value;}return out;}
  function mergeExposure(local,incoming){const out=structuredClone(local);for(const [id,e] of Object.entries(incoming||{})){if(knownProblemIds.size&&!knownProblemIds.has(id))throw new Error(`unknown exposure problemId: ${id}`);const cur=out[id];if(!cur){out[id]=e;continue;}for(const key of new Set([...Object.keys(cur),...Object.keys(e)])){if(["status","firstSeenAt","lastSeenAt"].includes(key))continue;if(key in cur&&key in e&&!same(cur[key],e[key]))throw new Error(`exposure conflict: ${id}.${key}`);}out[id]={...cur,...e,status:(exposureRank[e.status]??0)>(exposureRank[cur.status]??0)?e.status:cur.status,firstSeenAt:[cur.firstSeenAt,e.firstSeenAt].filter(Boolean).sort()[0],lastSeenAt:[cur.lastSeenAt,e.lastSeenAt].filter(Boolean).sort().at(-1)};}return out;}
  function portableFromCanonical(c){return {preferences:c.preferences,activityRecords:c.activityRecords,reviewItems:c.reviewItems,sessionsById:c.sessionsById,exposureByProblemId:c.exposureByProblemId,createdAt:c.createdAt,updatedAt:c.updatedAt};}
  function validatePortable(p){if(!isObject(p)||!isObject(p.preferences)||!["minimum","stable","safe"].includes(p.preferences.targetId)||!Array.isArray(p.activityRecords)||!Array.isArray(p.reviewItems)||!isObject(p.sessionsById)||!isObject(p.exposureByProblemId))throw new Error("portable learner state shape mismatch");const ids=new Set();for(const a of p.activityRecords){const id=a.attemptId||a.id;if(!id||ids.has(id))throw new Error("duplicate portable activity identity");if(!a.problemId)throw new Error(`portable activity problemId missing: ${id}`);if(!a.submittedAt&&!a.at)throw new Error(`portable activity timestamp missing: ${id}`);if(!a.deviceId)throw new Error(`portable activity provenance missing: ${id}`);ids.add(id);}return p;}
  function canonicalFromImport(incoming){if(incoming?.app==="rikkyo-uk-math"&&incoming.backupSchemaVersion===1&&incoming.contractVersion===1){const clone={...incoming};delete clone.checksum;if(incoming.checksum!=="fnv1a:"+fnv1a(JSON.stringify(clone)))throw new Error("checksumが一致しません");return validatePortable(incoming.learnerState);}if([1,2,3].includes(incoming?.schemaVersion))return validatePortable(portableFromCanonical(normalizeLegacy(incoming,"portable-legacy-import")));throw new Error("互換性のないデータです");}
  function importJson(text){
    if(String(text).length>MAX_IMPORT)throw new Error("Importデータが大きすぎます");const incoming=canonicalFromImport(JSON.parse(text)),incomingTarget=incoming.preferences?.targetId||"stable",isFresh=state.activityRecords.length===0&&state.reviewItems.length===0&&Object.keys(state.sessionsById).length===0&&Object.keys(state.exposureByProblemId).length===0;
    const localDefault=isFresh&&state.preferences.targetId==="stable"&&!state.preferences.nickname;
    if(!localDefault&&(incomingTarget!==state.preferences.targetId||(incoming.preferences.nickname??null)!==(state.preferences.nickname??null)))throw new Error("preferences conflict: replace/merge policy selection is required");
    const preferences=localDefault?structuredClone(incoming.preferences):{...state.preferences,updatedAt:[state.preferences.updatedAt,incoming.preferences.updatedAt].filter(Boolean).sort().at(-1)};
    const candidate={...state,preferences,activityRecords:mergeRecords("activity",state.activityRecords,incoming.activityRecords||[],x=>x.attemptId||x.id),reviewItems:mergeRecords("review",state.reviewItems,incoming.reviewItems||[],x=>x.reviewItemId||x.problemId),sessionsById:mergeMaps("session",state.sessionsById,incoming.sessionsById||{}),exposureByProblemId:mergeExposure(state.exposureByProblemId,incoming.exposureByProblemId||{})};
    for(const a of candidate.activityRecords){if(knownProblemIds.size&&!knownProblemIds.has(a.problemId))throw new Error(`未知のproblemId: ${a.problemId}`);}createRestorePoint("before-import");commit(candidate);state=candidate;
  }
  function listRestorePoints(){const points=parse(localStorage.getItem(RESTORE_KEY),[]);return Array.isArray(points)?points.map(({id,reason,createdAt})=>({id,reason,createdAt})):[];}
  function restorePoint(id){const points=parse(localStorage.getItem(RESTORE_KEY),[]),point=(Array.isArray(points)?points:[]).find(x=>x.id===id);if(!point)throw new Error("復元ポイントが見つかりません");const before=exactSnapshot();try{restoreExact(point.snapshot);state=load();}catch(error){restoreExact(before);state=load();throw error;}}
  function migrationReport(){return structuredClone(lastMigrationReport);}
  function identities(){return {canonicalKey:CANONICAL_KEY,legacyKey:LEGACY_KEY,deviceKey:DEVICE_KEY,restoreKey:RESTORE_KEY,updateChannel:profile.runtime.updateChannel,indexedDbName:profile.runtime.progressSync.indexedDbName,cloudAppId:profile.runtime.progressSync.appId};}
  return {get,save,reset,addAttempt,exposureStatus,setExposure,session,setSession,removeSession,activeSessions,scheduleReview,reviewItem,setReviewStatus,setTarget,setNickname,exportJson,importJson,uuid,setKnownProblemIds,namespace,listRestorePoints,restorePoint,migrationReport,identities};
})();
