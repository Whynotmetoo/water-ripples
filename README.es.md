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
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>Español</b> · <a href="README.ko.md">한국어</a>
</p>

Una página web interactiva con simulación realista de ondas de agua mediante WebGL, flores de plumeria amarillas flotando sobre las olas, y un elegante panel de configuración estilo vidrio líquido sin bordes que refracta y deforma las ondas subyacentes en tiempo real.
![demo](./public/demo.gif)

<p align="center">
  <a href="#características-principales">Características principales</a> • <a href="#desarrollo">Desarrollo</a>
</p>

## Demostración en vivo
Visita la demo en: [https://ripple.carsonye.com/](https://ripple.carsonye.com/)

## Características principales

- **Simulación realista de agua**: Simulación CPU de malla gruesa mapeada a un shader WebGL con iluminación difusa, reflejos especulares y animación ambiental automática de ondas.
- **Interfaz de vidrio líquido**: Un panel de configuración premium estilizado como vidrio líquido transparente, con refracción de lente WebGL en tiempo real que deforma las ondas subyacentes, desvaneciéndose suavemente al desenfocar el panel.
- **Plumerias procedurales**: Flores de plumeria de 5 pétalos dibujadas dinámicamente en canvas con centros de color naranja yema vibrante y contornos blancos nítidos.
- **Cursor circular responsivo**: Puntero con escalado suave que genera ondas al hacer clic o al moverse.
- **Localización automática**: Detecta el idioma del navegador para traducir dinámicamente los controles de la interfaz entre chino e inglés.
- **Adaptado para móviles**: Dimensiones de panel responsivas y un listener de redimensionamiento inteligente que ignora cambios menores de altura (por ejemplo, al mostrar/ocultar la barra de direcciones en Safari/Chrome móvil) para evitar reinicios de la simulación física.

## Desarrollo

### Instalación
```bash
npm install
```

### Servidor de desarrollo
```bash
npm run dev
```

### Compilación para producción
```bash
npm run build
```
