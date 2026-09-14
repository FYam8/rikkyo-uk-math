# 数学 Fixed Practice Bank v0.2 監査

- 合計: **411問**
- L1: **100**
- L2: **168**
- Clean Transfer: **77**
- Retention: **66**
- Learning Design Freeze v1.0 のBank target: **全10 familyで一致**

## QA
既存60問はv0.1で独立検算済み。今回追加した351問は、generatorの保存答えをそのまま信頼せず、
**表示問題文を再parseして別ロジックで再計算し351/351一致**を確認した。

拡張中に、相対度数の丸め、平方根問題の未指定変数、二等辺三角形の角度丸め、
相似比の大小表現、完全平方因数分解の完全因数化に修正が入り、修正後はCLEAN。

アプリのdeterministic graderでも、過去問212＋Bank411＝**623 canonical answers**を回帰対象とする。
