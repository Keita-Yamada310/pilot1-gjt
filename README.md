# Pilot 1 Binary GJT

## 必須ファイル
- index.html
- config.js
- stimuli.js
- experiment.js
- style.css

## 最初に行うこと
1. OSFでプロジェクトを作成する。
2. DataPipeにOSFアカウントでサインインする。
3. DataPipeで新しいExperimentを作成する。
4. DataPipeのExperiment IDをコピーする。
5. `config.js` の `PASTE_YOUR_DATAPIPE_EXPERIMENT_ID_HERE` を実際のIDに置き換える。
6. 5ファイルをGitHubの同じリポジトリ直下へアップロードする。
7. GitHubの Settings → Pages → Deploy from a branch → main / root を選ぶ。
8. GitHub Pages URLを開いて、自分で最後まで1回実施する。
9. OSFのDataPipe用componentにCSVが保存されたことを確認する。

## 重要
- 氏名は入力させず、匿名の参加者IDだけを使ってください。
- 本番前にDataPipeのdata collectionを有効化してください。
- 動作確認後はOSFにできたテストCSVを本番データと混同しないよう、削除またはtest用フォルダへ移してください。
