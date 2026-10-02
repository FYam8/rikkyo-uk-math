(function(root){
 'use strict';
 const iso=v=>typeof v==='string'&&Date.parse(v)>0?new Date(v).toISOString():null;
 const time=row=>[row?.submittedAt,row?.at,row?.finishedAt,row?.startedAt].map(iso).filter(Boolean).sort().at(-1)||null;
 const examId=id=>{const m=/^R(24|25|26)-MATH-([AB])$/.exec(id||'');return m?'FY'+m[1]+m[2]:null;};
 const examFields=id=>({examId:id,year:'20'+id.slice(2,4),session:id.at(-1)});
 const exams=['FY24A','FY24B','FY25A','FY25B','FY26A','FY26B'];
 function records(state){
  if(!state)return[];const now=new Date().toISOString(),activity=state.activityRecords||[],sessions=Object.values(state.sessionsById||{}),reviews=state.reviewItems||[];
  const active=sessions.filter(x=>x.status==='active'),last=[...activity,...sessions].map(time).filter(Boolean).sort().at(-1),latestByProblem=new Map();
  for(const a of activity)if(typeof a.correct==='boolean')latestByProblem.set(a.problemId,a);
  const summary={progressVersion:2,total:activity.length+active.length,kind:'target-'+state.preferences?.targetId,completed:false,weaknessCount:[...latestByProblem.values()].filter(x=>x.correct===false).length,masteredCount:(state.skillMetrics||[]).filter(x=>x.state==='mastered').length,practiceCount:activity.filter(x=>['learning','retry','retention','transfer'].includes(x.mode)).length,retentionPending:reviews.filter(x=>x.status==='pending'&&x.reason==='retention').length,...(last?{lastLearningAt:last}:{})};
  const out=[{sourceRecordId:'state:summary',eventType:'progress_state',occurredAt:now,payload:summary}];
  for(const id of exams){const related=sessions.filter(x=>examId(x.examId)===id),complete=related.some(x=>x.status==='finished'),started=related.length>0||activity.some(x=>examId(x.examId)===id),holdout=(state.holdoutExamIds||[]).some(x=>examId(x)===id);out.push({sourceRecordId:'state:exam:'+id,eventType:'exam_state',occurredAt:now,payload:{progressVersion:2,...examFields(id),examStatus:complete?'done':started?'started':holdout?'holdout':'notstarted',completed:complete}});}
  const latest=sessions.filter(x=>x.status==='finished'&&examId(x.examId)).sort((a,b)=>String(time(b)||'').localeCompare(String(time(a)||'')))[0];
  const scored=(latest?.results||[]).filter(x=>!x.reviewRequired&&typeof x.correct==='boolean'),correct=scored.filter(x=>x.correct).length,at=time(latest);
  out.push({sourceRecordId:'state:latest-exam',eventType:scored.length?'exam_completed':'exam_state',occurredAt:at||(latest?'1970-01-01T00:00:00.000Z':now),payload:scored.length?{progressVersion:2,...examFields(examId(latest.examId)),correct,total:scored.length,referenceAccuracy:correct/scored.length*100,completed:true,...(at?{lastLearningAt:at}:{clockUnknown:true})}:{completed:false}});
  return out;
 }
 function occurrences(state){return (state?.activityRecords||[]).map(a=>({sourceRecordId:'history:'+String(a.attemptId||a.id),eventType:'problem_attempt',occurredAt:time(a)||'1970-01-01T00:00:00.000Z',payload:{kind:String(a.mode||'practice').slice(0,80),correct:a.correct===true?1:0,total:typeof a.correct==='boolean'?1:0,completed:true,...(time(a)?{lastLearningAt:time(a)}:{clockUnknown:true}),...(examId(a.examId)?{progressVersion:2,...examFields(examId(a.examId))}:{})}}));}
 function baseline(state){const rows=state?.activityRecords||[],years={};for(const a of rows){const id=examId(a.examId);if(id){const year=examFields(id).year;years[year]=(years[year]||0)+1;}}return {baseline:true,eventCount:rows.length,eventsByYear:years,capturedAt:new Date().toISOString(),progressLabel:'数学の学習記録'};}
 root.RIKKYO_MATH_PROGRESS_PROJECTION=Object.freeze({buildStateRecords:records,buildOccurrenceRecords:occurrences,buildBaseline:baseline});
})(typeof window!=='undefined'?window:globalThis);
