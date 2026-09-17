const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
assert.match(app,/filter\(e=>e\.role!=="evaluation"&&e\.role!=="confirmation"\)/);
assert.match(app,/q\.role!=="evaluation"&&q\.role!=="confirmation"/);
assert.match(app,/最終・未見評価：開始前は練習・ヒント・解説に表示しません/);
assert.match(app,/e\.role==="confirmation"&&examExposure\("R26-MATH-B"\)!=="practiced"/);
assert.match(app,/\["evaluation","confirmation"\]\.includes\(e\.role\)\?'':/);
console.log('PASS holdout isolation: FY26B hidden from learning UX and FY26A locked until evaluation completion');
