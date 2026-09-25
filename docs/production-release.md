# v1.0.0 Production Release

判定: **PRODUCTION RELEASE APPROVED**。URLを知る学習者向けの正式な非公式学習版です。検索掲載を意味しません。`noindex,nofollow,noarchive` を維持します。

公開URL: https://fyam8.github.io/rikkyo-uk-math/

## 監査対象と証跡

Runtime監査基準: `e61437bb8ba67a3f2fe66180f0ef53585482aafa`。

- Verify canonical Rikkyo candidate: [36180530891 — SUCCESS](https://github.com/FYam8/rikkyo-uk-math/actions/runs/36180530891)
- Pages + 公開後CLEANループ1・2: [36180530820 — SUCCESS](https://github.com/FYam8/rikkyo-uk-math/actions/runs/36180530820)
- 両ループで全29回帰コマンド、公開60ファイルのhash照合、fresh desktop 1280px/mobile 390pxの実HTTPブラウザ監査を実行。修正事項0件。JS/console/network error 0件。
- 最終metadata merge後も同じgateを実行。tagはその時点の最終mainにのみ作成し、最終SHA・Verify・Pagesのrun URLはGitHub Releaseへ追記する。

RC2 `release_manifest.json` は変更していません。SHA-256: `30f0d3f8b5944d0875512e82dc169c945e4c9f05cfd6985e1c4bae4f6a605648`。`release_manifest_canonical_v1.json` は修正したruntimeのhash gateとして維持し、正式公開状態は `release.json` で別管理します。

## 確認事項

| 項目 | 結果 |
|---|---|
| 過去問・段階解説 | 212問 / 212解説 |
| Fixed Practice Bank | 411問（L1 100、L2 168、Transfer 77、Retention 66） |
| stable Problem IDs | 623 |
| 原本画像 | 31枚。原本PDFのfresh renderと31/31一致、最大RMS 1.823 |
| FY26A Q5(3) | `R26-MATH-A-Q5-3` は `REVIEW_REQUIRED`。通常Masteryから除外 |
| FY26B | 学習・Hint・解説から隔離。開始前の内容表示なし |
| 学習導線 | 過去問→意図的誤答→元問題STEP→自力再現→L1→L2→Transfer→翌日Retention |
| Resume | タブを閉じて再開し、問題・STEP・メモ・理解度を保持 |
| Today | 開始と再開の同一課題を重複表示しない |
| 入力 | 数字・負号・分数・√・x/y・カーソル移動・途中挿入・削除 |
| Backup | Export/Importで設定・活動・復習・セッション・露出履歴を保持。device情報はportable backupから除外 |
| データ保護 | reset/local restore、旧state migration、同一ID異evidenceのfail-closedを検証 |
| 表示 | desktop/mobile、原本図の表示・対応・原寸拡大導線 |
| Shared Engine | 16 files、pin `801791fc8e45862e946d920255d67b90d4f273ff` 一致 |

## 監査中の修正

- 学習者向け試験役割・露出状態の日本語ラベルとmobile選択欄幅。
- Transferの初見判定をセッション開始時の露出状態で行う。ヒント・再挑戦・旧状態不明は初見正解にしない。既存evidenceは再分類しない。
- 未完了の翌日Retention予約を、追加練習によって3日後・7日後へ先送りしない。
- 共通mathInputファイルをpin同期対象に含める。
- 試験画面の原本図を別タブで原寸表示できるようにする。
- PRと公開後の実HTTPブラウザ監査を継続的gateに追加。

## Authorityと制約

公式解答・公式小問配点が存在するとは主張しません。Answer Authorityは原本PDF + 独立解答 + 数学的再検算 + 自動採点回帰 + 精査です。数学内容・正答・stable ID・学校別storage/scoringを早稲田データで上書きしていません。

共通Today優先順位・learningFlow・mathInput runtimeを使用しています。学校別の問題選択・採点・保存、日次計画の固定保存、復習scheduler、DOM描画には学校側実装が残ります。全体が「データ差だけ」になったとは主張しません。詳細は [shared_engine_consumption_audit.md](shared_engine_consumption_audit.md)。未検証の共通化を最終公開時に広げず、学校Authorityとpin契約を維持します。

mobile検証はChromiumの390pxタッチ相当とCloud Browserの390px表示幅です。実機iOS/Safari・OSキーボード固有挙動は未検証。翌日Retentionはブラウザ時計を進めて実操作検証し、実時間24時間の経過は待っていません。STEP数は原本準拠の既存解説に従い、2STEPの問題もあります。途中式の数学的正誤は自動判定しません。

FY26Bの隔離は学習UX上のlearner-unseen保護です。静的公開assetsを直接調査する利用者への秘密保持機構ではありません。学習履歴は端末内保存のため、機種変更にはExport/Importが必要です。
