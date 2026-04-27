# 1-Year Schedule Planner ソフトウェア設計書

本ドキュメントは、AIアシスタントや開発者が本プロジェクトの構造を迅速に理解し、機能追加やメンテナンスを効率的に行うための設計仕様書です。

## 1. システム概要
本アプリは、1画面で1年間の予定を俯瞰管理できるシングルページアプリケーション（SPA）です。外部ライブラリへの依存を最小限に抑え、Vanilla JSとCSSのみで構築されています。

## 2. 技術スタック
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Storage**: Browser LocalStorage
- **External APIs**:
  - [Holidays JP API](https://holidays-jp.github.io/api/v1/date.json) (祝日取得)
  - Google Calendar API / Google Identity Services (予定同期)
- **Deployment**: GitHub Pages (PWA対応)

## 3. データモデル

### 3.1 予定データ構造 (Schedule Object)
本アプリでは「ローカル予定」と「Google予定」の2種類を扱います。

```javascript
{
  id: "string",        // ローカルはタイムスタンプ、Googleは 'gapi_' + GoogleID
  title: "string",     // 予定名
  start: "YYYY-MM-DD", // 開始日
  end: "YYYY-MM-DD",   // 終了日
  color: "bg-XXXX",    // 表示色（CSSクラス名: bg-blue, bg-pink等）
  isGoogle: boolean,   // Google連携予定かどうか
  htmlLink: "string"   // (Googleのみ) カレンダーへのリンク
}
```

### 3.2 永続化 (Storage)
- `yearSchedules`: ローカル予定の配列（JSON文字列）
- `gapi_key`, `gapi_client_id`, `gapi_calendar_id`: Google API設定
- `appTheme`: 現在のテーマ名 (`dark`, `light`, `aurora`)
- `ultraCompact`: 超圧縮モードのON/OFF状態
- `stackHorizontal`: 横並び表示モードのON/OFF状態
- `gapi_token`: (sessionStorage) Googleアクセストークン（有効期間内のみ保持）
- **Security Note**: APIキーとクライアントIDは `localStorage` に保存されます。これはPWAとしての利便性を優先した設計であり、公共の端末での利用は推奨されません。個人利用を想定しています。

## 4. 主要コンポーネント・ロジック

### 4.1 カレンダー描画 (`renderCalendar`)
- 12ヶ月分をループで生成。
- 各月の `month-col` (Flex/Grid) として描画。
- 31日分の `day-row` を生成し、祝日・今日・過去日の判定を行いクラスを付与。
- **予定の重複対応**: 
  - `stack-horizontal` クラス未付与時：`schedule-area` 内で予定（`event`）を `position: relative` でフロー表示。CSS Flexboxにより縦に並びます。
  - `stack-horizontal` モード時（PCのみ）：`body.stack-horizontal` クラスが付与されると、`schedule-area` が `flex-direction: row` になり、予定が横に並びます。予定数に応じて `flex: 1` で等幅分割されます。
- **UI特殊機能**:
  - **今日へ移動**: 「今日」ボタンクリックで、今日の行を一時的にハイライトします。
  - **アプリ更新**: 「↻」ボタンでページをリロードし、PWAのキャッシュ更新を確実に行います。
- **描画最適化**: 予定名が空の場合、非表示にならないよう `\u00A0` (NBSP) を挿入して高さを確保します。

### 4.2 Google API連携
- **認証**: Google Identity Services (GIS) を使用。アクセストークンは `sessionStorage` に保持し、F5更新時の再ログインを抑制。
  - **401エラー対応**: トークン期限切れ時は自動的に `sessionStorage` をクリアし、再認証を促します。
- **初期化安全策**: アプリ起動時にAPIライブラリのロード完了を待ち合わせてから初期化を実行します。初期化に失敗した場合は、設定モーダルを自動的に開きます。
- **同期**: `fetchGoogleEvents` で期間指定（実年）して取得。
- **色マッピング**: `googleColorToAppColor` / `appColorToGoogleColor` により、Googleの `colorId` とアプリの `bg-xxxx` クラスを相互変換。

### 4.3 レスポンシブ設計
- **モバイル**: 画面幅768px以下で `calendar-grid` が横スクロールに切り替わる。
- **超圧縮モード**: `body.ultra-compact` クラスが付与されると、CSS Gridの `minmax(0, 1fr)` により全31行をビューポート内に強制収容。

## 5. UI/UX 仕様

### 5.1 カラーパレット
- `bg-blue`: Blueberry (ID: 9)
- `bg-pink`: Flamingo (ID: 4)
- `bg-green`: Basil (ID: 10)
- `bg-purple`: Grape (ID: 3)
- `bg-orange`: Tangerine (ID: 6)

### 5.2 特別な表示
- **連日予定**: `multi-start`, `multi-middle`, `multi-end` クラスを付与。
  - `ultra-compact` 時は、`multi-middle/end` の文字を `transparent` にして重複表示を回避。
- **過去日**: 背景を暗くし、不透明度を下げて視認性を調整。

## 6. ディレクトリ構成
```text
/
├── index.html       # エントリポイント・メインレイアウト・モーダル
├── style.css        # 全デザイン・テーマ・レスポンシブ定義
├── app.js           # メインロジック・CRUD・API連携
├── manifest.json    # PWA設定
├── sw.js            # Service Worker (キャッシュ制御)
└── DESIGN.md        # 本ドキュメント
```
