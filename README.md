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
