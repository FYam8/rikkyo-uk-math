
from playwright.sync_api import sync_playwright
import json, pathlib, re

root=pathlib.Path(__file__).resolve().parent.parent
html=(root/"index.html").read_text(encoding="utf-8")
html=re.sub(r'<script src="[^"]+"></script>',"",html)
questions=json.loads((root/"data/questions.json").read_text(encoding="utf-8"))
exams=json.loads((root/"data/exams.json").read_text(encoding="utf-8"))
registry=json.loads((root/"data/registry.json").read_text(encoding="utf-8"))
bank=json.loads((root/"data/practice_bank.json").read_text(encoding="utf-8"))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path="/usr/bin/chromium",args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":390,"height":844})
    page.set_content(html)
    page.add_style_tag(path=str(root/"styles.css"))
    page.evaluate("""([q,b,e,r])=>{
      const store={};
      Object.defineProperty(window,'localStorage',{value:{
        getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
        setItem:(k,v)=>store[k]=String(v),
        removeItem:k=>delete store[k]
      },configurable:true});
      window.fetch=async(url)=>({json:async()=>url.includes('practice_bank')?b:url.includes('questions')?q:url.includes('exams')?e:r});
    }""",[questions,bank,exams,registry])
    page.add_script_tag(path=str(root/"scoring.js"))
    page.add_script_tag(path=str(root/"storage.js"))
    page.add_script_tag(path=str(root/"app.js"))
    page.wait_for_timeout(300)

    assert "212問＋類題Bank" in page.locator("#app").inner_text()

    # Diagnostic: no metadata badges before submit.
    page.get_by_role("button",name="診断").click()
    page.wait_for_timeout(100)
    assert "Core Diagnostic" in page.locator("#app").inner_text()
    assert page.locator("#app .badge").count()==0

    # Practice: wrong answer does not immediately expose final answer.
    page.get_by_role("button",name="練習").click()
    page.wait_for_timeout(100)
    page.locator("#practiceList button").first.click()
    page.wait_for_timeout(100)
    inp=page.locator('[data-slot="value"]').first
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

    # Imported/user-derived strings stay escaped in Progress.
    page.evaluate("""()=>AppStorage.addAttempt({attemptId:'xss1',problemId:'R24-MATH-A-Q1-1',contentVersion:1,answerSpecVersion:1,answerSnapshot:{value:'0'},correct:false,officialScore:null,learningScore:0,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),activeDurationMs:1000,hintEvents:[],retryCount:0,mode:'learning',learnerExposureStatusBeforeAttempt:'seen',transferEligibleAtAttempt:false,errorCauseCandidates:[],deviceId:AppStorage.get().device.deviceId,sessionId:null,environment:'test',skill:'<img src=x onerror=window.__xss=1>',difficulty:'A'})""")
    page.evaluate("render('progress')")
    page.wait_for_timeout(50)
    assert page.locator("#app img[src='x']").count()==0
    assert page.evaluate("window.__xss") is None

    # Mobile overflow.
    overflow=page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    assert overflow is False

    print("PASS browser in-memory smoke")
    browser.close()
