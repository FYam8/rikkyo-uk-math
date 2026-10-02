(function(root){
 'use strict';
 const p=root.RIKKYO_SYNC_PROFILE,projection=root.RIKKYO_MATH_PROGRESS_PROJECTION;
 if(!p||!projection||!root.SHARED_PROGRESS_TRANSPORT||root.RIKKYO_MATH_PROFILE?.runtime.progressSync.enabled===false)return;
 if(location.origin!=='https://fyam8.github.io'&&!Object.hasOwn(root,p.browserApiOverrideKey))return;
 function loadState(){
  // QA/test learner namespaces never create production Cloud registrations.
  if(root.AppStorage?.namespace()!=='prod')return null;
  try{const state=JSON.parse(localStorage.getItem('rikkyo-uk-math:prod:learner-state:v1')||'null');if(!state)return null;let skillMetrics=[];try{skillMetrics=root.skillStats?.()||[];}catch{}return {...state,skillMetrics,holdoutExamIds:root.RIKKYO_MATH_PROFILE.contentPolicy.learnerUnseenExamIds};}catch{return null;}
 }
 if(root.AppStorage?.namespace()!=='prod')return;
 const transport=root.SHARED_PROGRESS_TRANSPORT.createTransport({schoolId:p.schoolId,appId:p.appId,dbName:p.localDatabaseName,dbVersion:p.localDatabaseVersion,endpoint:()=>root[p.browserApiOverrideKey]||p.deploymentApiBase,legacyDatabases:[{name:'rikkyo-uk-kokugo-progress-sync',schoolId:p.schoolId,appIds:['rikkyo-uk-kokugo']}],loadState,...projection,occurrenceSignature:s=>JSON.stringify(projection.buildOccurrenceRecords(s))});
 async function report(){const s=await transport.status();let el=document.getElementById('cloud-migration-notice');if(s.migrationBlocked){if(!el){el=document.createElement('aside');el.id='cloud-migration-notice';el.setAttribute('role','status');el.className='card';document.body.prepend(el);}el.textContent='Cloud同期を保留しています。以前の登録の接続先、または共有先の登録との競合を確認してください。既存の登録と学習履歴は保持しており、学習は続けられます。';}else el?.remove();return s;}
 root.__RIKKYO_MATH_PROGRESS__={sync:async()=>{await transport.sync();return report()},status:transport.status};
 transport.start();setTimeout(()=>void report().catch(()=>{}),2000);root.addEventListener('online',()=>void report().catch(()=>{}));
})(window);
