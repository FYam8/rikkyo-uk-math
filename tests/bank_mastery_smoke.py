from playwright.sync_api import sync_playwright
import json,pathlib,re,datetime
root=pathlib.Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<script src="[^"]+"></script>','',html)
questions=json.loads((root/'data/questions.json').read_text())
bank=json.loads((root/'data/practice_bank.json').read_text())
exams=json.loads((root/'data/exams.json').read_text())
registry=json.loads((root/'data/registry.json').read_text())
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=b.new_page()
    page.set_content(html)
    page.add_style_tag(path=str(root/"styles.css"))
    page.evaluate("""([q,b,e,r])=>{
      const store={};
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},configurable:true});
      window.fetch=async(url)=>({json:async()=>url.includes('practice_bank')?b:url.includes('questions')?q:url.includes('exams')?e:r});
    }""",[questions,bank,exams,registry])
    page.add_script_tag(path=str(root/'scoring.js'));page.add_script_tag(path=str(root/'storage.js'));page.add_script_tag(path=str(root/'app.js'));page.wait_for_timeout(150)
    # mastery path: 2 learning + 1 transfer + 1 retention, all correct
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    ids=['PB-CALCULATION_FLUENCY-L2-01','PB-CALCULATION_FLUENCY-L2-02','PB-CALCULATION_FLUENCY-TRANSFER-01','PB-CALCULATION_FLUENCY-RETENTION-01']
    modes=['learning','learning','transfer','retention']
    for id,mode in zip(ids,modes):
        page.evaluate("""([id,mode,now])=>AppStorage.addAttempt({problemId:id,contentVersion:1,answerSpecVersion:1,answerSnapshot:{value:'x'},correct:true,officialScore:null,learningScore:1,startedAt:now,submittedAt:now,activeDurationMs:1000,hintEvents:[],retryCount:0,mode,learnerExposureStatusBeforeAttempt:'unseen',transferEligibleAtAttempt:mode==='transfer',errorCauseCandidates:[],deviceId:AppStorage.get().device.deviceId,sessionId:null,environment:'test',skill:'CALCULATION',difficulty:'A'})""",[id,mode,now])
    state=page.evaluate("skillStats().find(x=>x.skill==='CALCULATION').state")
    assert state=='mastered',state
    # weakness should route to unseen L2 bank
    for i in range(2):
        page.evaluate("""(now)=>AppStorage.addAttempt({problemId:'R24-MATH-A-Q1-4',contentVersion:1,answerSpecVersion:1,answerSnapshot:{value:'x'},correct:false,officialScore:null,learningScore:0,startedAt:now,submittedAt:now,activeDurationMs:1000,hintEvents:[],retryCount:0,mode:'learning',learnerExposureStatusBeforeAttempt:'seen',transferEligibleAtAttempt:false,errorCauseCandidates:[],deviceId:AppStorage.get().device.deviceId,sessionId:null,environment:'test',skill:'ALGEBRA',difficulty:'A'})""",now)
    pick=page.evaluate("chooseToday()")
    assert pick['q']['sourceType']=='FIXED_PRACTICE' and pick['q']['practiceLevel']=='L1',pick
    ret=page.evaluate("retentionCandidateFor(qById('PB-ALGEBRA_MANIPULATION-L2-01'))")
    assert ret and ret['practiceLevel']=='RETENTION' and ret['familyId']=='ALGEBRA_MANIPULATION',ret
    print('PASS bank mastery/today')
    b.close()
