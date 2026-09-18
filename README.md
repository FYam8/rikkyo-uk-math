# 立教英国学院 数学 — Canonical Engine Candidate

Canonical engine source is pinned in `engine-source.json` at WaseShibu main
`801791fc8e45862e946d920255d67b90d4f273ff`. The original RC2
files remain authoritative migration input and audit evidence; deployment
generates the one-to-one normalized `data/canonical_content.json` runtime
package deterministically.

FY24-FY26 数学A/B 6試験の過去問212問と、Learning Design Freeze v1.0の目標量を満たす固定類題Bank 411問を統合したRelease Candidate。

## 現在のコンテンツ
- 過去問: **212問**
- 過去問の完全段階解説: **212/212問** (`AUTHORED_SOURCE_GROUNDED_V1`)
- 固定類題Bank: **411問**
  - L1: 100問
  - L2: 168問
  - Clean Transfer: 77問
  - Retention: 66問
- 合計: **623 Problem IDs**
- 原本PDF参照ページ画像: 31枚（212問すべて原本ページへリンク）
- テキスト転記prompt: 26問。その他は原本ページ画像を問題文の基準にする。

## 学習フロー
- FY25A Core Diagnosticまたは各年度の過去問を解く
- 採点後、誤答した元問題を1問ずつ解き直す
- 元問題の明示的な `primarySkill` と一致するL1・L2固定類題へ進む
- 改善後は同じ技能のlearner-unseenなClean Transferへ進む
- 正解した固定類題と同じ `familyId` のRetention itemで翌日以降に定着確認
- 類題Authorityがない元問題は推測で割り当てず、元問題の解き直しのみ行う
- 補強途中の状態はResume／今日の学習から再開する
- FY24A/B Training
- FY25B Intermediate Transfer
- FY26B final learner-unseen evaluation
- FY26A parallel-form confirmation

## Answer Authority
この学校について公式解答はありません。
正答は **原本PDF + 独立解答 + 数学的別検算 + 自動採点回帰 + 精査ループ** を内部Authorityとする。
FY26A Q5(3)は、D=Cも形式的に等積条件を満たすため `REVIEW_REQUIRED` とし、自動Mastery集計から除外する。
公式小問配点・公式部分点は不明なので、Official Scoreは推定しない。

## 実装
- deterministic safe parser/scorer
- Diagnostic / Learning / Transfer / Retention / Exam
- Today
- Hint ladder / Retry
- Clean Transfer eligibility (near-duplicate / section motif / FY26 parallel form)
- Mastery = accuracy + Clean Transfer + Retention
- canonical learner-state contract v1 under Rikkyo-only identities
- Full v3 remains as a non-destructive compatibility shadow and rollback source
- exact device-local restore points before migration/import/reset
- no-loss Import: same-ID/different-evidence conflicts fail closed
- device identity is excluded from portable backup while record provenance remains
- FY26B learner-unseen content is excluded from learning/Hint/explanation UX; FY26A unlocks after FY26B
- noindex / mobile-first

## 起動
`python -m http.server 8000` などでこのフォルダをHTTP配信する。

## テスト
- `node --check app.js scoring.js storage.js`
- `node tests/content.test.js`
- `node tests/scoring_all.test.js`
- `node tests/storage.test.js`
- `node tests/canonical_content.test.js`
- `node tests/canonical_migration.test.js`
- `node tests/holdout_isolation.test.js`
- `node tests/shared_today_planner.test.js`
- `node tests/shared_learning_flow.test.js`
- `node tests/shared_engine_ownership.test.js`
- `node scripts/run-regression.mjs` (release gate)
- `node tests/release_invariants.test.js`
- `python tests/source_page_verify.py`
- `python tests/bank_math_verify.py`
- `python tests/fy24a_math_verify.py`
- `python tests/fy24b_math_verify.py`
- `python tests/fy25a_full_math_verify.py`
- `python tests/fy25b_math_verify.py`
- `python tests/fy26a_math_verify.py`
- `python tests/fy26b_math_verify.py`

## Canonical engine update flow

`.github/workflows/sync-engine-candidate.yml` accepts an immutable
WaseShibu commit SHA, copies only the declared `src/engine/**` files, updates
the hash pin, and runs the full Rikkyo regression suite. It opens a candidate
PR only on green; it never updates or deploys Rikkyo production directly.
Rikkyo-owned school profile, content, assets, scoring, and persistence files
are excluded from propagation.
- `python tests/browser_inmemory_smoke.py`
- `python tests/bank_mastery_smoke.py`

## 既知の非ブロッカー
- 公式解答・公式小問配点は存在/入手しない前提
- FY26A Q5(3)は点一致の曖昧性により `REVIEW_REQUIRED`
- Cloud sync / IndexedDBは後段
- 図形Practice Bankは将来さらにdiagram variantを増やせる

## 変更履歴

## v0.5
Learning Design Freeze v1.0で予定していた固定Practice Bankの規模まで拡張。

- L1: 100
- L2: 168
- Clean Transfer: 77
- Retention: 66
- 合計: 411
- 過去問212と合わせて623 Problem IDs

新規351問は、generatorの計算結果だけに依存せず、問題文から数値を再抽出して別ロジックで再計算する独立QAを実施。
生成時に見つかった相対度数の丸め誤差・平方根問題の変数未指定・二等辺三角形角度の整数化・相似比の大小表現を修正後、351/351 CLEAN。


## v0.6 — 過去問の完全段階解説 Batch 1
FY24数学A 39問について、原本PDFを再確認し、独立解答をもとに**段階解説を1問ずつ執筆**。

- 追加: 39問
- 既存の詳細解説: FY25A前半26問
- 詳細解説合計: 65/212
- 残りscaffold: 147問

図形Q5〜Q9は、原図の条件を再確認し、補助線・相似・中点連結・円すい展開などを含む具体的な解法へ更新。


FY24数学A 段階解説 Batch 1 QA: 2回連続CLEAN。詳細解説は65/212問。


## v0.7 — 過去問の完全段階解説 Batch 2
FY24数学B 39問を原本PDFから再確認し、全問を段階解説化。

- 今回追加: 39問
- 詳細解説累計: **104/212問**
- 残りscaffold: **108問**

Q5〜Q9では、平行線と円周角、斜辺への高さ、二重相似、放物線と回転体、
相似の連鎖、正四角錐表面積まで原図に即した具体解法を追加。


## v0.8 — FY25数学A 解説完成
FY25数学Aの未完全だったQ5〜Q9・19問を原本から段階解説化。既存Q1〜Q4・26問と合わせ、FY25Aは45/45問が詳細解説。全体進捗は123/212、残り89問。


## v0.9 — FY25数学B 39問 段階解説
FY25数学Bの全39問を原本PDF 3〜7ページから再確認し、段階解説化。

- 今回追加: 39問
- 詳細解説累計: **162/212問**
- 残りscaffold: **50問**

Q5〜Q9では、平行線・円・中点連結、半円内の角の二等分線、
放物線と平行四辺形、円すい展開図、立方体内の移動点まで原図に即した解法を追加。


FY25数学B Batch QA: 2回連続CLEAN。詳細解説は162/212問、残り50問。


## v0.10 — FY26数学A 25問 段階解説
FY26数学Aの全25問を原本PDF 3〜7ページから再確認し、段階解説化。

- 今回追加: 25問
- 詳細解説累計: **187/212問**
- 残りscaffold: **25問**

Q3(10)の正五角形スターは黄金比の相似、Q4は直方体の空間対角線と三角形AFGの面積、
Q5は放物線上の座標・面積まで段階化。
Q5(3)はD=Cも形式的に成立する曖昧性を明示し、通常想定解(-1,-1)と区別。


FY26数学A Batch QA: 2回連続CLEAN。詳細解説は187/212問、残り25問。


## v0.11 — FY26数学B 25問 段階解説 / 212問解説完成
FY26数学Bの全25問を原本PDF 3〜7ページから再確認し、段階解説化。

- 今回追加: 25問
- 過去問詳細解説: **212/212問**
- 残りscaffold: **0問**

Q3(5)の円周角・弧、Q3(10)の平行四辺形比、Q4の四面体、
Q5の放物線・平行四辺形・等積条件まで原図に即した具体解法へ更新。


## v1.0 RC1
Release Candidate gate.

- 過去問: 212/212
- 過去問段階解説: 212/212
- Fixed Practice Bank: 411/411
- Total Problem IDs: 623
- Official answer key: なし（完成条件から除外済み）
- Answer authority: 原本 + 独立解答 + 数学的再検算
- FY26A Q5(3): 曖昧性フラグ / REVIEW_REQUIREDを維持

最終厳格監査で、FY25A前半26問が従来の短いlegacy explanationのままで
「完全段階解説」と数えられていたことを検出し、全26問を原本ベースの複数step解説へ更新した。
これにより現在は212/212問すべてが `AUTHORED_SOURCE_GROUNDED_V1`。
