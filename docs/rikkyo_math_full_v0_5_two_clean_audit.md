# 立教数学 Full v0.5 — 2回連続CLEAN監査

## 今回の到達点
- 過去問: **212問**
- 固定Practice Bank: **411問**
  - L1: 100
  - L2: 168
  - Clean Transfer: 77
  - Retention: 66
- 合計: **623 Problem IDs**
- Learning Design Freeze v1.0のBank targetを**10 familyすべてで充足**

## 生成Bankの精査で実際に修正した点
- 相対度数の表示丸めで人数がずれるケース
- 平方根問題で分母 `n` を未指定のまま出していたケース
- 二等辺三角形の中心角が奇数のとき底角を整数切り捨てしていたケース
- 相似比の「小さい方:大きい方」の大小表現
- 完全平方因数分解でさらに定数因数をくくれるケース

修正後、新規351問を**表示問題文から再parseして別ロジックで再計算し351/351一致**。

## Review 1 — Static / Math / Scoring
**CLEAN**
- JS構文
- 212+411コンテンツ整合
- 623 canonical answer採点
- Storage / Migration / Import
- Bank mastery / Today
- 全family target count

## Review 2 — Browser / Delivery
**CLEAN**
- Chromium機能Smoke
- Diagnostic/Exam情報漏洩防止
- Retry/Hint
- FY26A Q5(3) REVIEW_REQUIRED
- FY26 A/B parallel-form Transfer block
- 390px mobile
- HTTP static delivery

## 次工程
残り186過去問の解説scaffoldを**完全な段階解説**へ引き上げ、
図形Practice Bankにはさらに異なる図variantを追加する。その後、623問で再回帰。
