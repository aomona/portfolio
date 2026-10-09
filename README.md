# Portfolio

Astro 7.3.5 の公式 Minimal テンプレートをベースにしたプロジェクトです。
TypeScript の strict 設定を使用しています。

## 必要な環境

- Node.js 22.12.0 以上（クラウド環境では 24.19.0 で検証）
- npm 9.6.5 以上

## セットアップ

リポジトリのルートで実行します。

```sh
npm ci
npm run dev
```

クラウド環境では、書き込み可能な npm キャッシュを指定します。

```sh
cd /workspace/portfolio
export ASTRO_TELEMETRY_DISABLED=1
npm ci --cache /workspace/.npm-cache
npm run dev -- --host 0.0.0.0 --port 4321
```

追加のサービス、環境変数、認証情報は不要です。

## 検証

```sh
npm run check
npm run build
```

`npm run check` は Astro と TypeScript の診断を実行します。
ビルド結果は `dist/` に出力され、`npm run preview` で確認できます。

## ディレクトリ

- `src/pages/`: ページとルーティング
- `public/`: そのまま配信する静的ファイル
- `astro.config.mjs`: Astro 設定
- `tsconfig.json`: TypeScript 設定

依存関係のバージョンは `package-lock.json` で固定しています。

## スクロール演出

トップページは、写真の左腰から垂れるケーブルを中心に、スクロールで最大9倍まで拡大します。
写真は最初に画面全体を覆い、スクロール区間の前半65%でズームを完了します。
続く25%で写真の周囲に枠とヘッダーを表示し、最後の10%でその状態を保ってから下のコンテンツへ進みます。
`src/scripts/zoom.ts` の `focus` は元画像上の位置（横・縦ともに 0〜1）です。
写真を差し替える場合は `src/pages/index.astro` の画像パスと、この位置を合わせてください。

アニメーションは `requestAnimationFrame` と時間ベースの補間を使い、スクロール停止後も滑らかに追従します。
端末の「視差効果を減らす」設定ではズームを無効にします。
フォントはローカル配信するため、外部フォントサービスへの接続は不要です。

写真は `public/images/FP002119.JPG` の原本（6000 × 3376）を使用しています。
`<picture>` で同解像度の AVIF → WebP → 原本 JPEG の順に、ブラウザが対応する形式を選びます。
変換画像は `public/images/FP002119.avif` と `public/images/FP002119.webp`、JPEG は `public/images/FP002119.JPG` です。
本体の写真は生成・拡大補間・トリミングを行っていません。ズーム位置はこの原本のケーブルに合わせています。

## マウスに追従するレイヤー

マウス操作できる端末では、背景・建物・周囲の人々・本人の4層が、控えめにマウスへ追従します。
左右の倉庫は同じ層として動かし、地面は背景にまとめています。
縦方向は全層を一緒に動かして境界のずれを抑え、揺り戻しのない補間を使います。
本人は中心から左右それぞれ最大9.6px動き、背景・建物・人々は奥行きに応じた小さい移動幅で追従します。
画像読み込み直後には拡大せず、追従中に必要な分だけ端の余白を広げます。

本人の切り抜きは BiRefNet、周囲の人々は検出とセグメンテーション、建物は原本の色を使った GrabCut を基に調整しました。
髪・脚の間・ケーブル・屋根の境界を見直し、ケーブルには原本に沿った手動マスクも使用しています。
本人の不透明な画素は原本の RGB を保ち、半透明の輪郭では背景色のにじみを除去しています。
顔や服を生成し直していません。Qwen は使用していません。
隠れる背景は OpenCV の非生成型インペイントで近隣画素から補います。
建物には人だけを除いた別の補完画像を使い、壁の中に人物の穴を開けずに人々を独立させています。
補完はごく小さな移動で見える部分向けです。

レイヤーは最初のマウス入力でのみ読み込み、すべての画像がデコードできた時に表示します。
追加画像は WebP → PNG のフォールバックです。本人と補完パッチの WebP はロスレス、建物と人々は品質92で圧縮しています。
各画像は必要な領域だけを保存し、本体写真の `object-fit: cover` と同じ座標に配置します。
本人は原寸、建物と人々は拡大前の表示用に半分の解像度で出力します。ケーブルの拡大表示には本体写真を使います。
タッチ端末・動きを減らす設定・読み込み失敗時は本体写真を表示します。
ズーム中は移動量を減らし、2倍に達する前に動きを収束させ、2倍以降は本体写真に戻します。
停止後・画面外・タブ非表示ではアニメーションを停止します。

調整済みマスクと隠れる部分の補完画像は `assets/photo-*-mask.png`、`assets/photo-*-fill.webp` です。
切り出し座標と奥行きは `assets/photo-layer-layout.json` を画像作成スクリプトとページで共有します。
原本と保存済みマスク・補完画像から追加画像を再作成できます。
Astro の依存関係に含まれる Sharp を使用し、通常のビルドや実行時に画像処理モデルは不要です。

```sh
npm ci
node scripts/create-photo-layers.mjs assets/photo-person-mask.png
```

マスクを編集して補完画像も更新する場合だけ、任意の Python 環境に `opencv-python-headless`、`numpy`、`Pillow` を入れ、先に `python scripts/prepare-photo-background.py` を実行します。
マスク作成時のモデルと補正方法は [assets/photo-mask-notes.md](assets/photo-mask-notes.md) に記録しています。

## 配信とアニメーションの最適化

欧文フォントは使用する Latin の文字セットに絞っています。日本語は端末のフォントで表示します。
`public/_headers` はハッシュ付きの `/_astro/` アセットだけを1年間キャッシュします。
HTML と固定名の写真はこの長期キャッシュ設定の対象外です。

スクロール時の位置計算はキャッシュした寸法を使い、画像読み込み・画面リサイズ時に寸法を更新します。
スタイルや進捗表示は値が変化した場合だけ更新し、停止後は `will-change` を解除します。

## Cloudflare Workers へのデプロイ

Cloudflare 公式の `cf` CLI（`1.0.0-beta.12`）を開発依存関係として固定しています。
`npm ci` でインストールされ、`npm exec -- cf --version` で確認できます。

`main` への push で GitHub Actions が型チェック、静的ビルド、Workers へのデプロイを実行します。
GitHub リポジトリの Settings → Secrets and variables → Actions → Repository secrets に登録してください。

- `CLOUDFLARE_API_TOKEN`: 対象アカウントの Workers Scripts を編集できる API トークン
- `CLOUDFLARE_ACCOUNT_ID`: 対象の Cloudflare アカウント ID

Environment secrets は使用しません。トークンをファイルに書いたりコミットしたりしないでください。

Worker 名は `cloudflare.config.ts` の `aomona-portfolio` です。
Astro の `dist/` を `cf` の Build Output Specification に変換し、静的アセットのみ配信します。
SSR アダプターや Worker の JavaScript は使用しません。

```sh
npm run check
npm run cf:build
npm run deploy -- --dry-run
# 認証済みの環境で本番にデプロイ
npm run deploy
```

`cf:build` は `.cloudflare/output/` を毎回生成し直します。
`deploy` は `cf deploy --prebuilt` で検証済みビルドを公開します。
GitHub Actions の「Run workflow」から `main` を指定して手動実行することもできます。
機能ブランチを選んで手動実行すると、別の `aomona-portfolio-preview` Worker にデプロイします。
テストURLは実行結果に表示されます。同じテスト用Workerを次のプレビューで更新します。
