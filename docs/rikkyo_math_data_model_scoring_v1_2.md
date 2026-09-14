# 立教英国学院 数学 正式データモデル＋採点仕様 v1.2

上流: Strategy Freeze v1.0 / Learning Design Freeze v1.0 / 212問 normalized records v2.0。

## 1. Source of Truth
- 問題・試験・Assetのマスターデータ
- **Attemptイベント**
- Version付きAnswerSpec / ScoreSpec
- Accuracy / Mastery / Weakness / SkillStateは派生値であり、履歴の真実ではない。

## 2. コアEntity
- **Exam**
- **QuestionGroup**
- **SharedContext**
- **Question**
- **Asset**
- **AnswerSpec**
- **ScoreSpec**
- **Attempt**
- **GradeResult**
- **SkillEvidence**
- **SkillStateCache**
- **ReviewItem**
- **Session**
- **LearnerExposure**
- **StorageEnvelope**

## 3. 採点
- 現行212問は deterministic grader を標準とし、MVPでAI採点は不要。
- 分数・根号・π・式・方程式・解集合・比・座標・区間を型別に安全に判定。
- `eval`は禁止。許可文法だけをparseし、入力長・AST量を制限する。
- 因数分解指定・展開指定は数学的同値だけでなく**指定形式**も採点する。
- OfficialScoreとLearningScoreを分離。公式部分点が不明な問題に推定部分点を公式得点として付けない。
- FY26A Q5(3)は `REVIEW_REQUIRED` を返せる曖昧問題として保持。

## 4. Attempt
- contentVersion / answerSpecVersion / scoreSpecVersionを回答時点の値で保存。
- startedAt / submittedAt / activeDuration / hint / retry / mode / exposure / transferEligibleを保存。
- 自動生成問題はgeneratorVersion / generationSeed / generatedParamsまたはsnapshotを保存。
- Attemptはimmutable event。採点基準変更で過去履歴を黙って書き換えない。

## 5. Version / Migration
- 軽微修正: stable ID維持＋contentVersion更新。
- 採点のみ変更: answerSpecVersion / scoreSpecVersion更新。
- 重大修正: requiresReevaluation＋旧Attempt互換ルール。
- retiredでもIDを削除・再利用しない。
- Import前に自動バックアップ、attemptIdで重複排除、SkillStateは再計算。

## 6. MVP
- Numeric / rational / radical / π / expression / factorized form / equation / solution set / multi-response / probability / angle / interval / ratio / coordinate を必須対応。
- Learning / Diagnostic / Exam / Today / Review / Progress / Export-Import / Resume / mobile math input を含む。
- Proof/Explanation AI採点、Graph/Construction完全自動採点、cloud syncは後段。

## 7. 未解決の外部確認
- 212問の公式解答
- 公式配点・部分点
- FY26A Q5(3)の学校側想定解

## 8. 次工程
この仕様を基に、次はMVPの実装構成・Storage namespace・Validation/CI・画面遷移を確定し、その後実装へ進む。

## v1.1 QA修正
- `AnswerSpec.kind` を `AnswerSpec.type` に統一し、212問の正規化レコードと一致させた。
- 現在の212問で実際に使われる `parameter_value` と `ratio_value` を採点型へ追加した。
- 分析用v2.0レコードの `Asset.id / SharedContext.id / embedded answerSpec` を、runtime schemaへ取り込むAdapter規則を追加した。
- MVP v0.1の旧localStorageキーからv0.2へ移行する際、旧キーを探して前方Migrationする規則を明記した。


## v1.2 Answer Authority方針
- この学校について**公式解答は存在しない**ため、公式解答照合を公開ブロッカーにしない。
- 正答の内部Authorityは「原本照合 + 独立解答 + 自動検証 + 最後の修正後2回連続CLEAN」。
- `officialAnswerVerification` は通常 `not_available`、内部確認済みは別の `answerAuthority` で追跡する。
- FY26A Q5(3)のような内部的に曖昧な問題は、公式解答待ちではなく `REVIEW_REQUIRED` のまま正答率・Masteryから除外する。
- 公式配点・公式部分点は依然不明なので、Official Scoreを推定で埋めない。
