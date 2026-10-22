# 層と状態の分担

## ファイルと責務

| 層 | ファイル | 責務 |
| --- | --- | --- |
| 入力・インフラ | `src/infrastructure/InputManager.ts` | キー・ゲームパッド・ポインターを共通ボタン、軸、座標へ変換。現在のゲームモードは知らない |
| 入力・インフラ | `LocalSaveStore.ts` / `SoundPlayer.ts` | ローカル保存／合成効果音 |
| 構築・ライフサイクル | `GameScene.ts` / `main.ts` | Phaser起動、素材ロード、依存関係の接続、入力購読解除 |
| プレゼンテーション制御 | `src/presentation/ScenarioPresenter.ts` | 入力の意味付け、画面モード、文字送り、議論表示の再生位置、照準、装備弾丸、資料選択位置、戻り先を保持 |
| アプリケーション | `src/application/ScenarioApplicationService.ts` | シナリオ開始・会話進行・指摘・成立後の進行を受け付け、ドメインと保存を呼ぶ |
| ドメイン | `src/domain/ScenarioSession.ts` | 現在パート、会話位置、取得済み弾丸の導出、指摘の検証、解決状態、完了状態の正本 |
| ドメイン | `src/domain/schema.ts` | シナリオの型・構造と参照の検証 |
| 表現 | `src/views/*` | Phaserの画像・文字・図形を生成・変更。表示命令に従い、命中した文字のIDなど画面の幾何情報を返す |
| コンテンツ | `src/content/scenario.json` | 台詞、資料、指摘箇所、正解・別解、結論 |

`JudgmentRules` の独立クラスは作らず、現状は `ScenarioSession` 内で正解の組み合わせを評価しています。制御層も現段階では `ScenarioPresenter` にまとめています。データとルールが増えた際に分割できる境界を `ports.ts` とアプリケーション層で保持しています。

## 操作の経路

- 会話の全文表示後の決定：Input → Presenter → Application → Domain → Application → Presenter → View。
- 文字送り中の全文表示：Input → Presenter → View。会話の位置は変わらない。
- 照準・弾丸切替：Input → Presenter → View。MPやゲームの進行のようなドメイン状態はない。
- 発射：PresenterがViewへ照準下の指摘箇所IDを問い合わせる。これは描画した文字の範囲の照会。正誤判定は行わない。
- 指摘：Presenter → Application → Domain。現在の未解決パート、使用可能な弾丸、正解の組み合わせを検証。
- 資料確認：取得済みの資料をPresenterからViewへ渡す。開閉・一覧移動ではドメインを呼ばない。
- 成立結果の確認：Application → Domainで次のパートへ進める。
- 不成立結果から戻る：Presenter → Viewで議論の表示を再開。パートは未解決のまま。

## 再生とゲームの進行は別の状態

会話パートの何番目の台詞まで進んだかは、ドメインが保持します。一方、矛盾指摘パートの発言が今何番目まで流れたかは、何度もループする表現上の状態なのでPresenterが保持します。

文字の見え方・照準・資料の選択位置はセーブしません。パート、会話位置、指摘履歴・成立状態はセーブします。資料を開いている間やタブが非表示になった場合、議論の再生は停止します。成功した直後、次の会話に進む前の状態も再読み込みから復元できます。

## 保守方針

ドメイン・アプリケーション・PresenterはPhaserをimportしません。Viewにパート進行や正誤判定の条件は書きません。Sceneは構築とフレーム更新を接続する役割です。UI変更とシナリオ変更は、それぞれViewとJSONに閉じられる形にしています。

イベントバスは必須ではないため導入していません。呼び出しと返り値でデータの行き先を追える構成です。
