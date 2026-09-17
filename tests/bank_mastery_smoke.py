from playwright.sync_api import sync_playwright
import json,os,pathlib,re,datetime
root=pathlib.Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<script src="[^"]+"></script>','',html)
canonical=json.loads((root/'data/canonical_content.json').read_text())
registry=json.loads((root/'data/registry.json').read_text())
with sync_playwright() as p:
    executable=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH",p.chromium.executable_path)
    if not pathlib.Path(executable).is_file():
        shells=sorted(pathlib.Path.home().glob(".cache/ms-playwright/chromium_headless_shell-*/chrome-linux*/headless_shell"))
        executable=str(shells[-1] if shells else sorted(pathlib.Path.home().glob(".cache/ms-playwright/chromium-*/chrome-linux*/chrome"))[-1])
    b=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
    page=b.new_page()
    page.set_content(html)
    page.add_style_tag(path=str(root/"styles.css"))
    page.evaluate("""([c,r])=>{
      const store={};
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},configurable:true});
      window.fetch=async(url)=>({json:async()=>url.includes('canonical_content')?c:r});
    }""",[canonical,registry])
    page.add_script_tag(path=str(root/'src/engine/todayPlanner.runtime.js'));page.add_script_tag(path=str(root/'src/schools/rikkyo/appProfile.js'));page.add_script_tag(path=str(root/'scoring.js'));page.add_script_tag(path=str(root/'storage.js'));page.add_script_tag(path=str(root/'app.js'));page.wait_for_timeout(150)
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
