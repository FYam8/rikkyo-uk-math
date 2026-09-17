
from playwright.sync_api import sync_playwright
import json, os, pathlib, re

root=pathlib.Path(__file__).resolve().parent.parent
html=(root/"index.html").read_text(encoding="utf-8")
html=re.sub(r'<script src="[^"]+"></script>',"",html)
canonical=json.loads((root/"data/canonical_content.json").read_text(encoding="utf-8"))
registry=json.loads((root/"data/registry.json").read_text(encoding="utf-8"))

with sync_playwright() as p:
    executable=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH",p.chromium.executable_path)
    if not pathlib.Path(executable).is_file():
        shells=sorted(pathlib.Path.home().glob(".cache/ms-playwright/chromium_headless_shell-*/chrome-linux*/headless_shell"))
        executable=str(shells[-1] if shells else sorted(pathlib.Path.home().glob(".cache/ms-playwright/chromium-*/chrome-linux*/chrome"))[-1])
    browser=p.chromium.launch(headless=True,executable_path=executable,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":390,"height":844})
    page_errors=[]
    page.on("pageerror",lambda error: page_errors.append(str(error)))
    page.set_content(html)
    page.add_style_tag(path=str(root/"styles.css"))
    page.evaluate("""([c,r])=>{
      const store={};
      Object.defineProperty(window,'localStorage',{value:{
        getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
        setItem:(k,v)=>store[k]=String(v),
        removeItem:k=>delete store[k]
      },configurable:true});
      store['rikkyoMathFull:prod:v3']=JSON.stringify({schemaVersion:3,namespace:'prod',attempts:[{attemptId:'seed',problemId:'R24-MATH-A-Q1-1',submittedAt:'2026-09-01T00:00:00.000Z',mode:'learning',correct:false}],reviewItems:[],sessions:{resume:{sessionId:'resume',problemId:'R24-MATH-A-Q1-1',status:'active'}},exposure:{'R24-MATH-A-Q1-1':{status:'seen',firstSeenAt:'2026-09-01T00:00:00.000Z',lastSeenAt:'2026-09-01T00:00:00.000Z'}},settings:{target:'stable'},device:{deviceId:'seed-device',nickname:'Seed',lastSync:null},createdAt:'2026-09-01T00:00:00.000Z'});
      window.fetch=async(url)=>({json:async()=>url.includes('canonical_content')?c:r});
    }""",[canonical,registry])
    page.add_script_tag(path=str(root/"src/schools/rikkyo/appProfile.js"))
    page.add_script_tag(path=str(root/"scoring.js"))
    page.add_script_tag(path=str(root/"storage.js"))
    page.add_script_tag(path=str(root/"app.js"))
    page.wait_for_timeout(300)

    # WaseShibu-parity shell: same five primary destinations and Today-first home.
    assert page.locator("#nav button").all_inner_texts()==["ホーム","学習する","演習ライブラリ","学習記録","データ管理"]
    assert "TODAY · ONE CLEAR NEXT STEP" in page.locator("#app").inner_text()
    assert "今日やること" in page.locator("#app").inner_text()
    assert "学習履歴を保護中" in page.locator(".local-badge").inner_text()
    assert page.locator(".target-chip").count()==3
    assert page.evaluate("AppStorage.migrationReport().status")=="migrated"
    assert page.evaluate("AppStorage.get().attempts.length")==1
    assert page.evaluate("localStorage.getItem('rikkyoMathFull:prod:v3')!==null")
    assert "まず過去問一式で現在地を確認" in page.locator("#app").inner_text()
    assert "以前の単問学習も保存されています" in page.locator("#app").inner_text()

    # Fresh learner starts with the full FY25A past paper, never an isolated
    # FY24 training item. The next paper appears only after its reinforcement.
    page.evaluate("AppStorage.reset(); render('home')")
    home_text=page.locator("#app").inner_text()
    assert "まず過去問一式で現在地を確認" in home_text
    assert "FY25 数学A・全" in home_text
    assert "R24-MATH-A 1(1)" not in home_text
    page.get_by_role("button",name="過去問を始める").click()
    assert "CORE DIAGNOSTIC" in page.locator("#app").inner_text()
    assert page.locator("#app .badge").count()==0
    assert page.evaluate("AppStorage.session('diag-R25-MATH-A-full-v3').problemIds.length")==page.evaluate("examQuestions('R25-MATH-A').length")
    page.evaluate("""()=>{const ids=examQuestions('R25-MATH-A').map(q=>q.id),results=ids.map((id,i)=>({problemId:id,correct:i!==0,reviewRequired:false}));ids.forEach(id=>AppStorage.setExposure(id,'practiced'));AppStorage.setSession('diag-R25-MATH-A-full-v3',{sessionId:'diag-R25-MATH-A-full-v3',mode:'diagnostic',examId:'R25-MATH-A',problemIds:ids,index:ids.length-1,answers:{},results,startedAt:'2026-09-01T00:00:00.000Z',finishedAt:'2026-09-01T00:30:00.000Z',status:'finished'});render('home')}""")
    assert "過去問の誤答を直して類題で補強" in page.locator("#app").inner_text()
    page.evaluate("""()=>{const source=AppStorage.session('diag-R25-MATH-A-full-v3'),flow=buildReinforcementSpec(source);AppStorage.setSession('reinforce-diag-R25-MATH-A-full-v3',{sessionId:'reinforce-diag-R25-MATH-A-full-v3',status:'finished',flow:{...flow,index:flow.problemIds.length}});render('home')}""")
    home_text=page.locator("#app").inner_text()
    assert "次の過去問一式に挑戦" in home_text
    assert "FY24 数学A・全" in home_text

    # WaseShibu-style route: a wrong past-paper item must lead to source review,
    # explicit-primarySkill L1/L2 practice, and clean transfer in one resumable flow.
    page.evaluate("""()=>AppStorage.setSession('flow-source',{sessionId:'flow-source',mode:'exam',examId:'R24-MATH-A',problemIds:['R24-MATH-A-Q1-1'],answers:{},results:[{problemId:'R24-MATH-A-Q1-1',correct:false,reviewRequired:false}],startedAt:'2026-09-01T00:00:00.000Z',finishedAt:'2026-09-01T00:10:00.000Z',status:'finished'})""")
    source_review_id=page.evaluate("AppStorage.scheduleReview('R24-MATH-A-Q1-1','CALCULATION',false).reviewItemId")
    flow_spec=page.evaluate("buildReinforcementSpec(AppStorage.session('flow-source'))")
    assert flow_spec["problemIds"][0]=="R24-MATH-A-Q1-1"
    assert flow_spec["mappingBySourceProblemId"]["R24-MATH-A-Q1-1"]["basis"]=="explicit-primarySkill"
    assert len(flow_spec["mappingBySourceProblemId"]["R24-MATH-A-Q1-1"]["practiceProblemIds"])==2
    assert page.evaluate("(ids)=>ids.every(id=>qById(id).primarySkill==='CALCULATION')",flow_spec["mappingBySourceProblemId"]["R24-MATH-A-Q1-1"]["practiceProblemIds"])
    unmapped=page.evaluate("""()=>buildReinforcementSpec({sessionId:'unmapped-source',examId:'R24-MATH-B',results:[{problemId:'R24-MATH-B-Q4-5',correct:false,reviewRequired:false}]}).unmappedSourceProblemIds""")
    assert unmapped==["R24-MATH-B-Q4-5"]
    page.evaluate("renderSessionResult(AppStorage.session('flow-source'))")
    assert "過去問" in page.locator(".workflow-strip").inner_text()
    page.get_by_role("button",name="誤答の解き直し・類題を始める").click()
    assert "元問題の解き直し" in page.locator("#app").inner_text()
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
    page.get_by_role("button",name="中断して戻る").first.click()
    assert "途中から再開" in page.locator("#app").inner_text()
    page.get_by_role("button",name="途中から再開").click()
    assert "元問題の解き直し" in page.locator("#app").inner_text()
    page.locator('[data-slot="value"]').fill("-1")
    page.get_by_role("button",name="採点").click()
    assert page.evaluate("AppStorage.session('reinforce-flow-source').status")=="active"
    page.get_by_role("button",name="次のおすすめ").click()
    assert page.evaluate("AppStorage.session('reinforce-flow-source').flow.index")==1
    assert page.evaluate("qById(AppStorage.session('reinforce-flow-source').problemId).sourceType")=="FIXED_PRACTICE"
    assert page.evaluate("id=>AppStorage.reviewItem(id).status",source_review_id)=="done"
    l1_id=page.evaluate("AppStorage.session('reinforce-flow-source').problemId")
    l1_expected=page.evaluate("id=>String(qById(id).answerCandidate??qById(id).answerSpec.expected)",l1_id)
    page.locator('[data-slot="value"]').fill(l1_expected)
    page.get_by_role("button",name="採点").click()
    page.get_by_role("button",name="次のおすすめ").click()
    assert page.evaluate("AppStorage.session('reinforce-flow-source').flow.index")==2
    assert page.evaluate("""id=>{const source=qById(id),pending=AppStorage.get().reviewItems.find(r=>r.status==='pending'&&qById(r.problemId)?.practiceLevel==='RETENTION');return !!pending&&qById(pending.problemId).familyId===source.familyId}""",l1_id)
    flow_session=page.evaluate("AppStorage.session('reinforce-flow-source')")
    flow_session["status"]="finished"
    page.evaluate("s=>AppStorage.setSession(s.sessionId,s)",flow_session)

    # Practice: wrong answer does not immediately expose final answer.
    page.evaluate("render('practice')")
    page.wait_for_timeout(100)
    page.locator("#practiceList button").first.click()
    page.wait_for_timeout(100)
    assert page.locator(".math-keypad").count()==1
    assert page.locator("#floatingTimer").count()==1
    inp=page.locator('[data-slot="value"]').first
    page.locator('[data-math-key="/"]').click()
    assert inp.input_value()=="/"
    inp.fill("999999")
    page.get_by_role("button",name="採点").click()
    page.wait_for_timeout(50)
    feedback=page.locator("#feedback").inner_text()
    assert "答えはまだ表示しません" in feedback

    # Ambiguity case should return review-required, not forced wrong/correct.
    page.evaluate("openPractice('R26-MATH-A-Q5-3','learning','')")
    page.wait_for_timeout(50)
    page.locator('[data-slot="x"]').fill("2")
    page.locator('[data-slot="y"]').fill("-4")
    page.get_by_role("button",name="採点").click()
    page.wait_for_timeout(50)
    assert "自動確定採点から除外" in page.locator("#feedback").inner_text()

    # Parallel form leakage.
    page.evaluate("AppStorage.setExposure('R26-MATH-A-Q1-1','seen')")
    eligible=page.evaluate("cleanTransferEligible(qById('R26-MATH-B-Q1-1'))")
    assert eligible is False

    # Dedicated Transfer Bank should be clean while unseen and become ineligible after exposure.
    tr_id="PB-FUNCTION_CORE_AND_TRANSFER-TRANSFER-01"
    eligible=page.evaluate("(id)=>cleanTransferEligible(qById(id))", tr_id)
    assert eligible is True
    page.evaluate("(id)=>AppStorage.setExposure(id,'seen')", tr_id)
    eligible=page.evaluate("(id)=>cleanTransferEligible(qById(id))", tr_id)
    assert eligible is False

    # Exam screen must not show metadata badges.
    page.evaluate("startExam('R24-MATH-A')")
    page.wait_for_timeout(50)
    assert page.locator("#app .badge").count()==0

    # Holdout/confirmation UX is enforced in the rendered browser.
    page.evaluate("render('practice')")
    assert "R26-MATH-B" not in page.locator("#app").inner_text()
    page.evaluate("render('exams')")
    confirmation=page.locator(".exam-card").filter(has_text="FY26 数学A").first
    assert confirmation.get_by_role("button",name="本番形式").is_disabled()

    # Portable backup round-trip keeps the Rikkyo identity and same records.
    page.evaluate("render('data')")
    attempt_count_before=page.evaluate("AppStorage.get().attempts.length")
    page.get_by_role("button",name="Export").click()
    exported=page.locator("#io").input_value()
    assert json.loads(exported)["app"]=="rikkyo-uk-math"
    page.get_by_role("button",name="Import").click()
    page.wait_for_timeout(50)
    assert page.evaluate("AppStorage.get().attempts.length")==attempt_count_before

    # Imported/user-derived strings stay escaped in Progress.
    page.evaluate("""()=>AppStorage.addAttempt({attemptId:'xss1',problemId:'R24-MATH-A-Q1-1',contentVersion:1,answerSpecVersion:1,answerSnapshot:{value:'0'},correct:false,officialScore:null,learningScore:0,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),activeDurationMs:1000,hintEvents:[],retryCount:0,mode:'learning',learnerExposureStatusBeforeAttempt:'seen',transferEligibleAtAttempt:false,errorCauseCandidates:[],deviceId:AppStorage.get().device.deviceId,sessionId:null,environment:'test',skill:'<img src=x onerror=window.__xss=1>',difficulty:'A'})""")
    page.evaluate("render('progress')")
    page.wait_for_timeout(50)
    assert page.locator("#app img[src='x']").count()==0
    assert page.evaluate("window.__xss") is None

    # Mobile overflow.
    overflow=page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    assert overflow is False
    assert page_errors==[],page_errors

    print("PASS browser in-memory smoke")
    browser.close()
