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
`src/scripts/zoom.ts` の `focus` は元画像上の位置（横・縦ともに 0〜1）です。
写真を差し替える場合は `src/pages/index.astro` の画像パスと、この位置を合わせてください。

アニメーションは `requestAnimationFrame` と時間ベースの補間を使い、スクロール停止後も滑らかに追従します。
端末の「視差効果を減らす」設定ではズームを無効にします。
フォントはローカル配信するため、外部フォントサービスへの接続は不要です。

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
