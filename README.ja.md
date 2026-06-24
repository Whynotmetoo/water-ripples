<div align="center">
  <img src="public/favicon.svg" alt="Water Ripples Icon" width="96" height="96">
  <h1>Water Ripples</h1>
</div>

<p align="center">
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.1.0-646cff?logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"><img src="https://img.shields.io/badge/WebGL-1.0-red?logo=webgl&logoColor=white" alt="WebGL"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/Vanilla%20JS-ES6-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JS"></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-%3E%3D10-cb3837?logo=npm&logoColor=white" alt="npm >=10"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.es.md">Español</a> · <a href="README.ko.md">한국어</a>
</p>

リアルな WebGL 水波物理シミュレーション、波に浮かぶ鮮やかな黄色のプルメリアの花、そしてリアルタイムで水面を屈折・歪曲させるプレミアムなボーダーレス液体ガラス設定パネルを備えた、高度にインタラクティブな Web ページです。
![demo](./public/demo.gif)

<p align="center">
  <a href="#主な特徴">主な特徴</a> • <a href="#開発ガイド">開発ガイド</a>
</p>

## ライブデモ
デモはこちら: [https://ripple.carsonye.com/](https://ripple.carsonye.com/)

## 主な特徴

- **リアルな水波シミュレーション**：CPU の粗グリッドシミュレーションを WebGL シェーダーパスにマッピングし、拡散照明、スペキュラーハイライト、自動的な環境水波アニメーションを実現。
- **液体ガラスインターフェース**：透明な液体ガラスとしてスタイリングされたプレミアム設定パネル。WebGL レンズ屈折でリアルタイムに背景の波を歪ませ、パネルのブラー時にはスムーズにフェードアウト。
- **プロシージャルプルメリア**：Canvas 上に動的に描画される 5 枚花弁のプルメリア。鮮やかな卵黄オレンジのグラデーション中心と、くっきりとした白い輪郭線。
- **レスポンシブ円形カーソル**：クリックや移動時に波紋を生成するスムーズスケーリングポインター。
- **自動ローカライゼーション**：ブラウザのロケールを検出し、UI コントロールを中国語と英語で動的に切り替え。
- **モバイル対応**：レスポンシブなパネルサイズと、モバイル Safari/Chrome のアドレスバー切り替えによる軽微な高さ変更を無視するスマートリサイズリスナーにより、物理演算のリセットを防止。

## 開発ガイド

### インストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

### プロダクションビルド
```bash
npm run build
```
