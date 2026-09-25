"""Real HTTP application audit, using disposable QA browser contexts.

Unlike browser_inmemory_smoke, this does not replace fetch, storage or application
scripts. Answers come from the audited repository; learning actions use the UI.
"""
import argparse, json, os, pathlib, re, datetime, hashlib, urllib.request, concurrent.futures
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parent.parent
ITEMS = {q['id']: q for f in ('questions.json', 'practice_bank.json') for q in json.loads((ROOT/'data'/f).read_text())}
KEY = 'rikkyo-uk-math:qa:learner-state:v1'

def verify_public_files(base):
    manifest=json.loads((ROOT/'release_manifest_canonical_v1.json').read_text())
    def check(item):
        path, expected=item
        with urllib.request.urlopen(base.rstrip('/')+'/'+path,timeout=30) as response:
            assert response.status==200,path
            assert hashlib.sha256(response.read()).hexdigest()==expected, 'deployed hash mismatch: '+path
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(check,manifest['fileChecksums'].items()))
    with urllib.request.urlopen(base.rstrip('/')+'/',timeout=30) as response:
        assert 'noindex,nofollow,noarchive' in response.read().decode()
    print('PASS deployed hashes: 60 files; noindex retained',flush=True)

def state(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def semantic(s):
    return {k:s[k] for k in ('preferences','activityRecords','reviewItems','sessionsById','exposureByProblemId')}

def answer(q):
    spec=q['answerSpec']; typ=spec['type']; v=spec.get('expected')
    if typ in ('coordinate','multi_response'): return {k:str(x) for k,x in v.items()}
    if typ=='coordinate_set': return {k:f"{x['x']},{x['y']}" for k,x in zip(q['responseSlots'],v)}
    if typ=='solution_set': v=','.join(map(str,spec['solutions']))
    elif typ=='ratio': v=':'.join(map(str,v))
    elif isinstance(v,list): v=','.join(map(str,v))
    if v is None: v=spec['accepted'][0]
    return {'value':str(v)}

def fill_answer(page,q,exam=False):
    for slot,v in answer(q).items():
        selector=f'[data-slot="{slot}"]'+(f'[data-answer-for="{q["id"]}"]' if exam else '')
        if not page.locator(selector).is_visible() and page.locator('.answer-dock-toggle').count():
            page.locator('.answer-dock-toggle').click()
        page.locator(selector).fill(v)

def data_export(page):
    page.locator('#nav').get_by_role('button',name='データ管理',exact=True).click()
    page.get_by_role('button',name='Export',exact=True).click()
    return page.locator('#io').input_value()

def run(browser,base,width,out):
    context=browser.new_context(viewport={'width':width,'height':844 if width==390 else 950},has_touch=width==390,is_mobile=width==390)
    page=context.new_page(); errors=[]; bad=[]; dialogs=[]
    def attach(p):
        p.on('pageerror',lambda e: errors.append(str(e)))
        p.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
        p.on('response',lambda r: bad.append([r.status,r.url]) if r.status>=400 else None)
        p.on('requestfailed',lambda r: bad.append(['failed',r.url,r.failure]))
        p.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
    attach(page)
    url=base.rstrip('/')+'/?env=qa'
    page.goto(url); expect(page.get_by_role('button',name='過去問を始める',exact=True)).to_be_visible()
    assert not state(page)['activityRecords'] and not state(page)['sessionsById']
    assert page.locator('.today-list article').count()==1
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
    page.screenshot(path=str(out/f'home-{width}.png'),full_page=True)
    page.locator('#nav').get_by_role('button',name='演習ライブラリ',exact=True).click()
    page.locator('.page-head select').select_option(label='FY26 数学B')
    expect(page.get_by_text('開始前は問題内容を表示しません',exact=True)).to_be_visible()
    assert page.locator('.selection-plan').count()==0
    assert page.locator('#app img').count()==0
    page.locator('.page-head select').select_option(label='FY26 数学A')
    expect(page.get_by_role('button',name='FY26 数学Aを1試験分解く')).to_be_disabled()
    page.locator('#nav').get_by_role('button',name='ホーム',exact=True).click()
    page.get_by_role('button',name='過去問を始める',exact=True).click()
    # Solve the full diagnostic, with exactly one deliberate wrong answer.
    qs=[q for q in ITEMS.values() if q.get('examId')=='R25-MATH-A']
    for major in sorted(set(q['majorQuestion'] for q in qs)):
        page.locator('.major-tabs button').nth(major-1).click()
        dock=page.locator('.answer-dock')
        if not page.locator('[data-slot]').first.is_visible(): dock.locator('.answer-dock-toggle').click()
        for q in [q for q in qs if q['majorQuestion']==major]: fill_answer(page,q,True)
        if major==1: page.locator('[data-answer-for="R25-MATH-A-Q1-1"][data-slot="value"]').fill('999')
        for img in page.locator('.exam-images img').all():
            expect(img).to_be_visible(); assert img.evaluate('i=>i.complete&&i.naturalWidth>0')
    page.get_by_role('button',name='解答を終了して自動採点',exact=True).click()
    source=state(page)['sessionsById']['diag-R25-MATH-A-full-v3']
    assert sum(r['correct'] is True for r in source['results'])==44
    assert sum(r['correct'] is False for r in source['results'])==1
    page.get_by_role('button',name='誤答の解き直し・類題を始める',exact=True).click()
    page.get_by_role('button',name='問題専用STEPで理解する',exact=True).click()
    page.locator('#sourceStepNote').fill('監査メモ：符号を確認 <保存>')
    page.get_by_role('button',name='まだ分からない',exact=True).click()
    expect(page.locator('#sourceStepNext')).to_be_disabled()
    before=state(page); page.close(); page=context.new_page(); attach(page); page.goto(url)
    page.get_by_role('button',name='途中から再開',exact=True).click()
    expect(page.locator('#sourceStepNote')).to_have_value('監査メモ：符号を確認 <保存>')
    expect(page.locator('#sourceStepNext')).to_be_disabled()
    while True:
        page.get_by_role('button',name='ヒント・確認を見て分かった',exact=True).click()
        if page.get_by_role('button',name='次のSTEPへ',exact=True).count(): page.get_by_role('button',name='次のSTEPへ',exact=True).click()
        else: break
    page.get_by_role('button',name='解説を閉じて自力再現へ',exact=True).click()
    inp=page.locator('[data-slot="value"]')
    inp.fill('12xy');inp.press('ArrowLeft');page.get_by_role('button',name='√',exact=True).click()
    expect(inp).to_have_value('12x√()y'); inp.press('9');page.get_by_role('button',name='⌫',exact=True).click()
    expect(inp).to_have_value('12x√()y');page.get_by_role('button',name='分数 a/b',exact=True).click()
    expect(inp).to_have_value('12x√(/)y');page.get_by_role('button',name='クリア',exact=True).click()
    page.get_by_role('button',name='−',exact=True).click();inp.press('3')
    expect(inp).to_have_value('-3');page.get_by_role('button',name='この1問を採点する',exact=True).click()
    assert state(page)['activityRecords'][-1]['guidedEvidence']['mastery']=='reproduced'
    page.screenshot(path=str(out/f'reproduction-{width}.png'),full_page=True)
    page.get_by_role('button',name='次のおすすめ',exact=True).click()
    sid='reinforce-diag-R25-MATH-A-full-v3'; flow=state(page)['sessionsById'][sid]['flow']
    mapping=flow['mappingBySourceProblemId']['R25-MATH-A-Q1-1']
    assert mapping['basis']=='explicit-primarySkill'
    levels=[]
    while state(page)['sessionsById'][sid]['status']=='active':
        s=state(page)['sessionsById'][sid]; q=ITEMS[s['problemId']];levels.append(q['practiceLevel'])
        assert q['primarySkill']=='CALCULATION'
        fill_answer(page,q);page.get_by_role('button',name='採点する',exact=True).click()
        assert state(page)['activityRecords'][-1]['correct'] is True
        page.get_by_role('button',name='次のおすすめ',exact=True).click()
    assert levels==['L1','L2','TRANSFER'],levels
    assert any(a.get('transferEligibleAtAttempt') for a in state(page)['activityRecords'])
    pending=[r for r in state(page)['reviewItems'] if r['status']=='pending' and ITEMS[r['problemId']].get('practiceLevel')=='RETENTION']
    assert pending
    assert all(r["stage"]==0 for r in pending),pending
    assert all((datetime.datetime.fromisoformat(r["dueAt"].replace("Z","+00:00"))-datetime.datetime.now(datetime.timezone.utc)).total_seconds()<=86401 for r in pending)
    # Export/import, reset and exact local restore use visible controls.
    saved=data_export(page); original=semantic(state(page))
    assert 'device' not in json.loads(saved)['learnerState']
    page.get_by_role('button',name='Import',exact=True).click()
    assert dialogs[-1]=='Importしました'
    assert semantic(state(page))==original
    data_export(page);page.get_by_role('button',name='学習データを初期化',exact=True).click()
    assert not state(page)['activityRecords']
    data_export(page);page.get_by_role('button',name='最新の復元ポイントへ戻す',exact=True).click()
    assert semantic(state(page))==original
    # Advance browser time, rather than editing review records, to exercise due retention.
    due=max(datetime.datetime.fromisoformat(r['dueAt'].replace('Z','+00:00')) for r in pending)+datetime.timedelta(seconds=5)
    page.clock.install(time=due);page.reload()
    page.locator('#nav').get_by_role('button',name='ホーム',exact=True).click()
    due_row=page.locator('.today-list article').filter(has_text='期限が来た問題を復習').first
    expect(due_row).to_be_visible();due_row.get_by_role('button').click()
    active=[s for s in state(page)['sessionsById'].values() if s.get('status')=='active' and s.get('reviewItemId')][-1]
    fill_answer(page,ITEMS[active['problemId']]);page.get_by_role('button',name='採点する',exact=True).click()
    assert state(page)['activityRecords'][-1]['mode']=='retention'
    assert state(page)['activityRecords'][-1]['correct'] is True
    assert not errors,errors
    assert not bad,bad
    page.screenshot(path=str(out/f'retention-{width}.png'),full_page=True)
    context.close()
    return {'width':width,'fresh':True,'diagnostic':'44/45','flow':levels+['RETENTION'],'resume':True,'exportImport':True,'resetRestore':True,'errors':errors,'failedRequests':bad}

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--url',required=True);a.add_argument('--out',default='/tmp/rikkyo-production-audit');args=a.parse_args()
    out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
    verify_public_files(args.url)
    with sync_playwright() as p:
        options={'headless':True,'args':['--no-sandbox']}
        if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'):options['executable_path']=os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
        browser=p.chromium.launch(**options)
        results=[run(browser,args.url,w,out) for w in (1280,390)]
        browser.close();(out/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
