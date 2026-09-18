# 共通エンジン利用監査

監査基準: WaseShibu canonical master `8c66bb6859646759bbe30b47f1218ef0e720626d`

## 結論

立教は canonical contract、Todayの優先順位、段階解説と固定類題の状態遷移を、固定SHAから取り込んで実行している。ただし、学習エンジン全体が共通化済みとは判定しない。日次計画の固定、学校別の問題選択、復習予約、回答UIと採点実装には学校アプリ側の実装が残る。

## 共通化済みで実行時にも使用

- `todayPlanner`: 再開、過去問後の補強、期限復習、次の過去問、通常練習の優先順位
- `learningFlow`: STEP位置、解説後の自力再現判定、固定セットの正解済み維持、未正解再周回、順次進行
- opaque `examId` の学習ルート選択
- canonical content / exam / learner-state / remediation / practice-history contract
- no-loss transport、candidate write、local restore、external sync boundary contract

上記ファイルは `engine-source.json` にSHA-256を記録し、`verify-engine-pin.mjs` が改変を拒否する。立教本番が早稲田 main の更新で即時に変わる構造にはしていない。

## 学校パッケージに残すべきもの

- A/Bを含む試験順序と各試験の役割
- minimum / stable / safe の意味
- 623問の内容、解答Authority、説明、画像、`REVIEW_REQUIRED`
- Rikkyo専用の保存・backup・event・sync identity
- 学習者向け日本語ラベル
- 公式配点がないという採点方針

## まだ共通化されていない実行ロジック

以下は「共通化済み」と表示してはならない。

1. 1日最大10件の計画を日付単位で固定し、完了・先取りを保存する仕組み
2. 元問題・固定類題・初見確認・翌日定着へ割り当てる学校別コンテンツ選択
3. 段階解説での自己評価UIと回答検証付きSTEP進行（立教で接続済みなのはSTEP位置と最終再現判定）
4. 固定セット候補の学校別選択（正解済み維持と未正解再周回は共通化済み）
5. 復習間隔と翌日定着予約の共通スケジューラ
6. answer input と deterministic grading の共通UIアダプタ

今回、立教UXは早稲田の学習方法へ合わせ、共通化できる状態遷移は WaseShibu 側で純粋関数として抽出し、parity確認後の固定SHAから取り込んだ。未抽出ロジックを立教独自コードのまま「共通エンジン」とは扱わない。

## 今回確認する境界

- generic engine は `year`、targetの数値、problemId文字列を解釈しない
- Rikkyo runtime は `waseshibu-math-*` を読み書きしない
- FY26Bは練習・ヒント・解説から除外する
- FY26A Q5(3)は `REVIEW_REQUIRED` を維持する
- score欠損を0点にしない
- Today優先順位は vendored runtime を呼び、立教内に別の優先順位表を持たない
- STEP位置、最終再現判定と固定類題の再周回は vendored runtime を呼ぶ。回答検証付きSTEP進行はまだ未接続。

## 自力再現の実接続

`deriveSourceReviewEvidence` は共通 `deriveCanonicalGuidedFinal` を呼び、新規attemptの `guidedEvidence` とセッション内の問題別記録に保存する。既存attemptの再分類はしない。段階解説は答えを含むため閲覧をlevel 3として記録し、解説後の正解を初見自力正解と混同しない。REVIEW_REQUIREDは判定対象外。

固定類題は初回・ヒントなし正解のみ新たな完了へ加算する。ヒント後・同一提示内の誤答後正解は再周回する。既存の完了記録は取り消さない。
