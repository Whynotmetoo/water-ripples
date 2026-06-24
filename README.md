<div align="center">
  <img src="public/logo.svg" alt="Water Ripples Icon" width="96" height="96">
  <h1>Water Ripples</h1>
</div>

<p align="center">
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.1.0-646cff?logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"><img src="https://img.shields.io/badge/WebGL-1.0-red?logo=webgl&logoColor=white" alt="WebGL"></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/Vanilla%20JS-ES6-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JS"></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-%3E%3D10-cb3837?logo=npm&logoColor=white" alt="npm >=10"></a>
</p>

<p align="center">
  <b>English</b> · <a href="README.zh-CN.md">简体中文</a>
</p>

Water Ripples is an interactive web page featuring realistic WebGL water ripple physics, floating yolk-yellow plumeria blossoms, and a premium borderless liquid-glass settings card that warps the underlying ripples in real-time.

<p align="center">
  <a href="#features">Key Features</a> • <a href="#development">Development</a>
</p>

## Live Demo
To view the demo, visit: [https://ripple.carsonye.com/](https://ripple.carsonye.com/)

## Key Features

- **Realistic Water Simulation**: A coarse grid CPU simulation mapped onto a WebGL shader pass with diffuse lighting, specular glints, and automatic ambient water breathing.
- **Liquid-Glass Interface**: A premium settings panel styled as transparent liquid glass, with real-time WebGL lens refraction that warps underlying waves, fading out smoothly on panel blur.
- **Procedural Plumeria Flowers**: Dynamic 5-petal yellow plumerias drawn on canvas with vivid yolk-orange centers and crisp white outlines.
- **Responsive Circular Cursor**: Smooth scaling pointer that drops ripples on click/move.
- **Auto-Localization**: Detects browser locale to dynamically translate UI controls between Chinese and English.
- **Mobile Adapted**: Responsive panel dimensions and a smart resize listener that ignores minor height shifts (e.g. mobile Safari/Chrome address bars toggling) to prevent physics resets.

## Development

### Installation
```bash
npm install
```

### Run Dev Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
