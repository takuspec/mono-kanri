# モノ管理

家の持ち物を「場所の階層・写真・数量・タグ」で管理するスマホ向けアプリ（PWA）。
データはその端末のブラウザ内（IndexedDB）だけに保存され、サーバーには送られない。

## 機能
- 場所の階層（部屋 › 棚 › 箱 …）と、場所ごとのアイテム一覧
- アイテムに写真（長辺1280pxに縮小して保存）・数量（＋/−ボタン）・タグ・メモ
- 名前・メモ・タグ・場所での検索、タグでの絞り込み
- 場所ごとのQRラベル印刷と、アプリ内カメラでの読み取り
- バックアップの書き出し／読み込み（写真込みのJSON）
- オフライン動作、ホーム画面への追加

## PCで試す
```
python -m http.server 5176 --directory mono-kanri
```
http://localhost:5176 を開く。

## スマホで使う
カメラとホーム画面への追加には HTTPS が必要なので、このフォルダを
GitHub Pages などの静的ホスティングに置き、スマホのブラウザで開いて「ホーム画面に追加」する。

ファイルを更新したら、次の番号をそろえて上げる（古いファイルと新しいファイルが混ざって動かなくなるのを防ぐため）。
- `sw.js` の `CACHE`（`mono-kanri-v4` など）
- `index.html` と `app.js` にある `?v=4`

## ファイル
- `index.html` / `styles.css` / `app.js` … 画面
- `db.js` … IndexedDB への保存
- `zip.js` … バックアップ（写真ごと ZIP）の書き出し・読み込み
- `csv.js` … CSV の読み込み（UTF-8 と Excel の Shift_JIS）
- `sw.js` / `manifest.webmanifest` … オフライン対応・インストール
- `vendor/` … QR生成（qrcode-generator 1.4.4）、QR読み取り（jsQR 1.4.0）
- `tools/make_icons.py` … アイコン生成
