# 端末クリッカー PWA

GitHub Pagesへそのまま公開できるPWA版です。

## 公開手順

1. 新しいGitHubリポジトリを作成します。
2. このフォルダ内のファイルと `icons` フォルダを、リポジトリのルートへアップロードします。
3. GitHubの `Settings` → `Pages` を開きます。
4. `Deploy from a branch` を選び、`main` / `(root)` を公開元に設定します。
5. 公開後、表示されたHTTPSのURLへアクセスします。

URLは相対指定なので、リポジトリ名を変更してもそのまま動作します。

## インストール

- Android／Chrome: ブラウザメニューまたはアドレスバーの「アプリをインストール」
- iPhone／iPad: Safariの共有メニューから「ホーム画面に追加」
- PC版Chrome／Edge: アドレスバーのインストールアイコン

初回アクセス後は、ゲーム本体とアイコンがキャッシュされ、オフラインでも起動できます。

## 更新時の注意

ゲームや画像を更新したときは、`service-worker.js` の次の値を変更してください。

```js
const CACHE_NAME = 'gadget-clicker-pwa-v2';
```

キャッシュ名を更新すると、次回アクセス時に古いキャッシュが削除されます。

## ローカル確認

`file://` から直接開くとService Workerは動作しません。簡易サーバーで確認します。

```bash
python3 -m http.server 8080
```

その後 `http://localhost:8080/` を開いてください。
