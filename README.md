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

マウス操作できる端末では、空と遠景・左の倉庫・右の倉庫・地面・人物の5層が、控えめにマウスへ追従します。
人物と地面は同じ移動量にして足元を保ち、縦方向は全層を一緒に動かして境界のずれを抑えます。
揺り戻しのない補間を使い、画像読み込み直後には拡大せず、追従中に必要な分だけ端の余白を広げます。
人物は `u2net_human_seg` のマスクとアルファマッティングで切り抜き、髪・脚の間・ケーブルを調整しました。
人物の RGB は原本から取得し、顔や服を生成し直していません。Qwen は使用していません。
隠れた人物の位置は同じ高さの左右の画素で補い、倉庫の背景は同じ高さの近隣画素で補います。
地面には人物を除いた写真を使用し、二重に人物が現れるのを防いでいます。移動幅は小さく抑えています。
広い移動や大きな視点変更に使う背景復元ではありません。

レイヤーは最初のマウス入力でのみ読み込み、すべての画像がデコードできた時に表示します。
追加画像は WebP → PNG のフォールバックです。人物と補完パッチの WebP はロスレス、倉庫と地面は品質92で圧縮しています。
各画像は必要な領域だけを保存し、本体写真の `object-fit: cover` と同じ座標に配置します。
人物は原寸、倉庫と地面は拡大前の表示用に半分の解像度で出力します。ケーブルの拡大表示には本体写真を使います。
タッチ端末・動きを減らす設定・読み込み失敗時は本体写真を表示します。
ズーム中は移動量を減らし、2倍に達する前に動きを収束させ、2倍以降は本体写真に戻します。
停止後・画面外・タブ非表示ではアニメーションを停止します。

調整済み人物マスクは `assets/photo-person-mask.png`、倉庫の範囲は `assets/photo-architecture-masks.json` です。
切り出し座標と奥行きは `assets/photo-layer-layout.json` を画像作成スクリプトとページで共有します。
原本とマスクから追加画像を再作成できます。
Astro の依存関係に含まれる Sharp を使用し、通常のビルドや実行時に画像処理モデルは不要です。

```sh
npm ci
node scripts/create-photo-layers.mjs assets/photo-person-mask.png
```

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
