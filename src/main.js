'use strict';

import { createCanvasLiquidGlass } from './liquid-glass.js';

/* ============================ photo ============================ */
const PHOTO_SRC = '/assets/background.jpg';

/* ============================== setup ============================== */
const glCv = document.getElementById('gl');
const fxCv = document.getElementById('fx');
const fctx = fxCv.getContext('2d');

// Hidden composited source for liquid glass.
// The glass shader samples this canvas, so it must contain every visual layer
// that should be refracted: WebGL water/background + 2D yellow flowers.
const compositeCv = document.createElement('canvas');
const compositeCtx = compositeCv.getContext('2d');

const DPR  = Math.min(window.devicePixelRatio || 1, 2);

let W = 0, H = 0;
const params = { ripple: 1, petals: 8, light: 1 };

/* ===================== water sim (CPU, coarse) ===================== */
const NX = 160;
let NY = 160;
let u, uPrev, simBytes;

function allocSim() {
  NY = Math.max(90, Math.min(288, Math.round(NX * H / W)));
  u        = new Float32Array(NX * NY);
  uPrev    = new Float32Array(NX * NY);
  simBytes = new Uint8Array(NX * NY);
  simBytes.fill(128);
}

function drop(gx, gy, radius, strength) {
  const r2 = radius * radius;
  const x0 = Math.max(1, Math.floor(gx - radius)), x1 = Math.min(NX - 2, Math.ceil(gx + radius));
  const y0 = Math.max(1, Math.floor(gy - radius)), y1 = Math.min(NY - 2, Math.ceil(gy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - gx, dy = y - gy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2) {
        const k = Math.cos((Math.sqrt(d2) / radius) * Math.PI * 0.5);
        u[y * NX + x] += strength * k * k;
      }
    }
  }
}

function stepWater() {
  const damp = 0.979;
  for (let y = 1; y < NY - 1; y++) {
    const row = y * NX;
    for (let x = 1; x < NX - 1; x++) {
      const i = row + x;
      let v = (u[i - 1] + u[i + 1] + u[i - NX] + u[i + NX]) * 0.5 - uPrev[i];
      uPrev[i] = v * damp;
    }
  }
  const t = u; u = uPrev; uPrev = t;
}

function packSim() {
  for (let i = 0; i < u.length; i++) {
    let v = 128 + u[i] * 26;
    simBytes[i] = v < 1 ? 1 : v > 254 ? 254 : v;
  }
}

function gradAt(gx, gy) {
  const x = Math.max(1, Math.min(NX - 2, gx | 0));
  const y = Math.max(1, Math.min(NY - 2, gy | 0));
  const i = y * NX + x;
  return [u[i + 1] - u[i - 1], u[i + NX] - u[i - NX], u[i]];
}

/* ============================== WebGL ============================== */
const gl = glCv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false })
        || glCv.getContext('experimental-webgl', { preserveDrawingBuffer: true });
let prog, texPhoto, texSim, uni = {};
let photoW = 1, photoH = 1;
let glReady = false;

const VSH = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FSH = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform sampler2D uSim;
uniform vec2  uTexel;   // sim texel size
uniform vec2  uFrac;    // cover-crop fractions
uniform float uRefr;
uniform float uLight;
uniform float uTime;
uniform float uAspect;  // photoH / photoW

#define NF 5
uniform vec3 uFl[NF];   // cx, cy, r   (photo uv)
uniform vec4 uFlA[NF];  // rot, offX, offY, scale

float h(vec2 p){ return texture2D(uSim, p).r - 0.5019608; }

void main(){
  vec2 e = uTexel;
  float hl = h(vUv - vec2(e.x, 0.0));
  float hr = h(vUv + vec2(e.x, 0.0));
  float ht = h(vUv - vec2(0.0, e.y));
  float hb = h(vUv + vec2(0.0, e.y));
  vec2 grad = vec2(hr - hl, hb - ht);

  vec2 puv = (vUv - 0.5) * uFrac + 0.5;

  // floating blossoms: local swirl around each flower in the photo
  for (int i = 0; i < NF; i++) {
    vec2 d = puv - uFl[i].xy;
    vec2 dw = vec2(d.x, d.y * uAspect);
    float dist = length(dw);
    float r = uFl[i].z;
    if (dist < r) {
      float f = smoothstep(r, r * 0.3, dist);
      float ang = uFlA[i].x * f;
      float cs = cos(ang), sn = sin(ang);
      vec2 rotd = vec2(dw.x * cs - dw.y * sn, dw.x * sn + dw.y * cs);
      rotd *= mix(1.0, uFlA[i].w, f);
      puv = uFl[i].xy + vec2(rotd.x, rotd.y / uAspect) + uFlA[i].yz * f;
    }
  }

  puv += grad * uRefr;
  puv = clamp(puv, 0.002, 0.998);
  vec3 col = texture2D(uPhoto, puv).rgb;

  // diffuse ripple shading (sun upper-left)
  float light = (grad.x + grad.y) * 2.4;
  col += light * vec3(1.0, 0.98, 0.92);

  // specular glints on crests
  float spec = max(0.0, light - 0.045) * 5.5;
  col += spec * vec3(1.0, 1.0, 0.96);

  // slow drifting sun band
  float band = sin(dot(vUv, vec2(1.3, 1.0)) * 2.6 - uTime * 0.2);
  col += min(0.2, smoothstep(0.78, 1.0, band) * 0.065 * uLight);

  // wandering pool of sunlight
  vec2 sc = vec2(0.5 + 0.22 * cos(uTime * 0.07), 0.36 + 0.18 * sin(uTime * 0.09));
  float pool = 1.0 - smoothstep(0.0, 0.55, distance(vUv * vec2(1.0, 1.35), sc * vec2(1.0, 1.35)));
  col += pool * 0.055 * uLight;

  gl_FragColor = vec4(col, 1.0);
}`;

function makeShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s));
  }
  return s;
}

function initGL() {
  prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VSH));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FSH));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  for (const n of ['uPhoto','uSim','uTexel','uFrac','uRefr','uLight','uTime','uAspect','uFl','uFlA']) {
    uni[n] = gl.getUniformLocation(prog, n);
  }
  gl.uniform1i(uni.uPhoto, 0);
  gl.uniform1i(uni.uSim, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
}

function setupPhotoTexture(img) {
  photoW = img.naturalWidth; photoH = img.naturalHeight;
  texPhoto = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texPhoto);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function setupSimTexture() {
  if (texSim) gl.deleteTexture(texSim);
  texSim = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texSim);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, NX, NY, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, simBytes);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

let coverFx = 1, coverFy = 1;
function updateCover() {
  const s = Math.max(W / photoW, H / photoH);
  coverFx = W / (s * photoW);
  coverFy = H / (s * photoH);
  gl.uniform2f(uni.uFrac, coverFx, coverFy);
  gl.uniform2f(uni.uTexel, 1 / NX, 1 / NY);
  gl.uniform1f(uni.uAspect, photoH / photoW);
}

/* ============== photo blossoms: sway / breathe / ripple-kick ============== */
const FLOWERS = [
  { cx: 0.28, cy: 0.21, r: 0.27, phase: 0.0, speed: 0.34, kick: 0 },
  { cx: 0.73, cy: 0.47, r: 0.28, phase: 2.1, speed: 0.27, kick: 0 },
  { cx: 0.20, cy: 0.70, r: 0.30, phase: 4.0, speed: 0.31, kick: 0 },
  { cx: 0.83, cy: 0.92, r: 0.30, phase: 1.2, speed: 0.24, kick: 0 },
  { cx: 0.92, cy: 0.05, r: 0.22, phase: 5.3, speed: 0.29, kick: 0 }
];
const flArr  = new Float32Array(FLOWERS.length * 3);
const flAArr = new Float32Array(FLOWERS.length * 4);

function updateFlowerAnim(t) {
  for (let i = 0; i < FLOWERS.length; i++) {
    const f = FLOWERS[i];
    const su = (f.cx - 0.5) / coverFx + 0.5;
    const sv = (f.cy - 0.5) / coverFy + 0.5;
    const [dx, dy] = gradAt(su * NX, sv * NY);
    f.kick += ((dx + dy) * 0.5 - f.kick) * 0.08;
    const kick = Math.max(-0.12, Math.min(0.12, f.kick));
    const rot = Math.sin(t * f.speed + f.phase) * 0.05
              + Math.sin(t * f.speed * 1.7 + f.phase * 2.0) * 0.018
              + kick;
    const ox = Math.sin(t * 0.2 + f.phase) * 0.0042 + dx * 0.02;
    const oy = Math.cos(t * 0.17 + f.phase * 1.6) * 0.0038 + dy * 0.02;
    const sc = 1 + Math.sin(t * 0.45 + f.phase) * 0.013;
    flArr[i * 3]     = f.cx;
    flArr[i * 3 + 1] = f.cy;
    flArr[i * 3 + 2] = f.r;
    flAArr[i * 4]     = rot;
    flAArr[i * 4 + 1] = ox;
    flAArr[i * 4 + 2] = oy;
    flAArr[i * 4 + 3] = sc;
  }
  gl.uniform3fv(uni.uFl, flArr);
  gl.uniform4fv(uni.uFlA, flAArr);
}

/* =================== overlay petals (procedural) =================== */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Vivid yolk yellows for plumeria flowers - highly saturated vivid yellows
const PALETTES = [
  { center: '#ff5500', mid: '#ffd600', midLight: '#ffea00', edge: '#ffee33' }, // Vivid lemon yellow
  { center: '#e64c00', mid: '#ffcc00', midLight: '#ffdd00', edge: '#ffea33' }, // Vibrant sunflower yellow
  { center: '#ff6600', mid: '#ffe600', midLight: '#ffea00', edge: '#ffee44' }, // Radiant dandelion yellow
  { center: '#e64c00', mid: '#ffd600', midLight: '#ffee00', edge: '#ffeb33' }  // Golden plumeria yellow
];

function makePetalSprite(px, pal, seed) {
  const R = mulberry32(seed);
  const S = Math.ceil(px * 2.6);
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.translate(S / 2, S / 2);
  c.rotate(R() * Math.PI * 2);
  c.globalAlpha = 0.9;

  // Draw 5 plumeria petals in a spiral layout
  for (let i = 0; i < 5; i++) {
    c.save();
    c.rotate(i * (Math.PI * 2 / 5));
    
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-px * 0.35, -px * 0.25, -px * 0.45, -px * 0.75, 0, -px * 0.95);
    c.bezierCurveTo(px * 0.35, -px * 0.75, px * 0.3, -px * 0.25, 0, 0);
    
    const g = c.createRadialGradient(0, 0, px * 0.1, 0, -px * 0.55, px * 0.55);
    g.addColorStop(0, pal.mid);
    g.addColorStop(0.35, pal.mid);
    g.addColorStop(0.6, pal.midLight);
    g.addColorStop(0.95, pal.edge);
    c.fillStyle = g;
    c.fill();
    
    c.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    c.lineWidth = Math.max(1.0, px * 0.045);
    c.stroke();
    
    c.restore();
  }

  const centerGlow = c.createRadialGradient(0, 0, 0, 0, 0, px * 0.32);
  centerGlow.addColorStop(0, pal.center);
  centerGlow.addColorStop(0.5, 'rgba(230, 126, 34, 0.45)');
  centerGlow.addColorStop(1, 'rgba(230, 126, 34, 0)');
  c.fillStyle = centerGlow;
  c.beginPath();
  c.arc(0, 0, px * 0.32, 0, Math.PI * 2);
  c.fill();

  return cv;
}

let petalsArr = [];
let seedBase = 11;

function makePetal(i) {
  const R = mulberry32(seedBase + i * 13);
  const frac = (0.024 + R() * 0.022) * 0.375; // 50% larger than 0.25 radius
  const px = frac * Math.min(W, H);
  return {
    nx: 0.08 + ((i * 0.41 + R() * 0.3) % 0.84),
    ny: 0.1 + ((i * 0.59 + R() * 0.3) % 0.8),
    vx: 0, vy: 0,
    rot: R() * Math.PI * 2,
    vr: (R() - 0.5) * 0.0022,
    phase: R() * Math.PI * 2,
    px,
    sprite: makePetalSprite(px * DPR, PALETTES[(R() * PALETTES.length) | 0], seedBase + i * 7)
  };
}
function syncPetals() {
  while (petalsArr.length < params.petals) petalsArr.push(makePetal(petalsArr.length));
  if (petalsArr.length > params.petals) petalsArr.length = params.petals;
}

function updatePetals(dt, t) {
  for (const p of petalsArr) {
    const [dx, dy] = gradAt(p.nx * NX, p.ny * NY);
    p.vx += dx * 0.0017;
    p.vy += dy * 0.0017;
    p.vx += Math.sin(t * 0.18 + p.phase) * 0.0000065;
    p.vy += Math.cos(t * 0.14 + p.phase * 1.7) * 0.0000065;
    const pad = 0.05;
    if (p.nx < pad) p.vx += (pad - p.nx) * 0.0007;
    if (p.nx > 1 - pad) p.vx -= (p.nx - (1 - pad)) * 0.0007;
    if (p.ny < pad) p.vy += (pad - p.ny) * 0.0007;
    if (p.ny > 1 - pad) p.vy -= (p.ny - (1 - pad)) * 0.0007;
    p.vx *= 0.984; p.vy *= 0.984;
    p.nx += p.vx * dt * 60;
    p.ny += p.vy * dt * 60;
    p.rot += p.vr + dx * 0.012;
  }
}

function drawPetals(t) {
  for (const p of petalsArr) {
    const h = gradAt(p.nx * NX, p.ny * NY)[2];
    const x = p.nx * W;
    const y = p.ny * H + h * 3;
    const sc = 1 + h * 0.15;
    const sw = p.sprite.width / DPR;
    
    fctx.save();
    fctx.translate(x + p.px * 0.16, y + p.px * 0.26);
    fctx.rotate(p.rot);
    fctx.globalAlpha = 0.18;
    fctx.fillStyle = 'rgba(95,125,155,0.55)';
    fctx.beginPath();
    fctx.ellipse(0, 0, p.px * 0.8, p.px * 0.55, 0, 0, Math.PI * 2);
    fctx.fill();
    fctx.restore();
    
    fctx.save();
    fctx.translate(x, y);
    fctx.rotate(p.rot + Math.sin(t * 1.1 + p.phase) * 0.04);
    fctx.scale(sc, sc);
    fctx.drawImage(p.sprite, -sw / 2, -sw / 2, sw, sw);
    fctx.restore();
  }
}

function updateCompositeSource() {
  // Use raw backing-store pixels here. Both source canvases are DPR-sized.
  compositeCtx.setTransform(1, 0, 0, 1, 0, 0);
  compositeCtx.clearRect(0, 0, compositeCv.width, compositeCv.height);
  compositeCtx.drawImage(glCv, 0, 0);
  compositeCtx.drawImage(fxCv, 0, 0);
}

// Sparkles logic removed

/* ============================== layout ============================== */
let liquidGlass;

let prevW = 0, prevH = 0;
function layout() {
  const newW = window.innerWidth;
  const newH = window.innerHeight;
  if (newW === prevW && Math.abs(newH - prevH) < 120) {
    return;
  }
  prevW = newW;
  prevH = newH;
  W = newW;
  H = newH;
  glCv.width = W * DPR;  glCv.height = H * DPR;
  fxCv.width = W * DPR;  fxCv.height = H * DPR;
  compositeCv.width = glCv.width; compositeCv.height = glCv.height;
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  allocSim();
  if (glReady) {
    gl.viewport(0, 0, glCv.width, glCv.height);
    setupSimTexture();
    updateCover();
  }
  petalsArr = [];
  syncPetals();
  if (liquidGlass) {
    liquidGlass.resize();
  }
}
window.addEventListener('resize', layout);

/* ============================== input ============================== */
const cursorEl = document.getElementById('cursor');
let lastMx = -1, lastMy = -1;

function touchWater(px, py, big) {
  const gx = (px / W) * NX, gy = (py / H) * NY;
  if (big) {
    drop(gx, gy, 6, 2.2 * params.ripple);
  } else {
    drop(gx, gy, 2.4, 0.45 * params.ripple);
  }
}

const stage = document.getElementById('stage');
stage.addEventListener('pointermove', (e) => {
  cursorEl.style.opacity = 1;
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top = e.clientY + 'px';
  if (lastMx >= 0) {
    const dist = Math.hypot(e.clientX - lastMx, e.clientY - lastMy);
    if (dist > 2) touchWater(e.clientX, e.clientY, false);
  }
  lastMx = e.clientX; lastMy = e.clientY;
});

stage.addEventListener('pointerdown', (e) => {
  cursorEl.classList.add('ripple-stage__cursor--active');
  touchWater(e.clientX, e.clientY, true);
});

window.addEventListener('pointerup', () => {
  cursorEl.classList.remove('ripple-stage__cursor--active');
});

stage.addEventListener('pointerleave', () => { 
  cursorEl.style.opacity = 0; 
  lastMx = -1; 
  cursorEl.classList.remove('ripple-stage__cursor--active');
});

/* ============================ localization ============================ */
const LOCALIZATION = {
  zh: {
    ripple: "水波强度",
    leaves: "小黄花数量",
    light: "阳光强弱",
    reset: "重置",
    save: "保存图片"
  },
  en: {
    ripple: "ripple",
    leaves: "yellow flowers",
    light: "light",
    reset: "reset",
    save: "save image"
  }
};

function localizeUI() {
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  const isZh = lang.startsWith('zh');
  const texts = LOCALIZATION.zh;
  
  document.querySelector('label[for=rRipple]').textContent = texts.ripple;
  document.querySelector('label[for=rPetals]').textContent = texts.leaves;
  document.querySelector('label[for=rLight]').textContent = texts.light;
  
  document.getElementById('btnReset').title = texts.reset;
  document.getElementById('btnSave').title = texts.save;
}

/* ============================ controls ============================ */
const $ = (id) => document.getElementById(id);
$('rRipple').addEventListener('input', e => params.ripple = +e.target.value);
$('rLight').addEventListener('input', e => params.light = +e.target.value);
$('rPetals').addEventListener('input', e => { params.petals = +e.target.value; syncPetals(); });

const panelEl = $('panel');
const panelToggle = $('panelToggle');

panelToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isActive = panelEl.classList.toggle('settings-panel--active');
  if (isActive) {
    panelEl.setAttribute('tabindex', '-1');
    panelEl.focus();
  }
});

// Auto-close when clicking outside
window.addEventListener('pointerdown', (e) => {
  if (panelEl.classList.contains('settings-panel--active') && !panelEl.contains(e.target) && !panelToggle.contains(e.target)) {
    panelEl.classList.remove('settings-panel--active');
  }
});

// Auto-close on focusout (loss of focus)
panelEl.addEventListener('focusout', (e) => {
  setTimeout(() => {
    if (panelEl.classList.contains('settings-panel--active') && !panelEl.contains(document.activeElement) && document.activeElement !== panelToggle) {
      panelEl.classList.remove('settings-panel--active');
    }
  }, 50);
});

$('btnReset').addEventListener('click', () => {
  u.fill(0); uPrev.fill(0);
  seedBase = (Math.random() * 1000) | 0;
  petalsArr = [];
  syncPetals();
});

$('btnSave').addEventListener('click', async () => {
  const out = document.createElement('canvas');
  out.width = glCv.width; out.height = glCv.height;
  const oc = out.getContext('2d');
  oc.drawImage(glCv, 0, 0);
  oc.drawImage(fxCv, 0, 0);
  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'water-ripples.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (e) { /* Cancelled */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'water-ripples.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

/* ============================ main loop ============================ */
let lastT = performance.now();
let breathT = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const t = now / 1000;

  breathT -= dt;
  if (breathT <= 0) {
    breathT = 0.4 + Math.random() * 1.3;
    drop(2 + Math.random() * (NX - 4), 2 + Math.random() * (NY - 4), 2, 0.14);
  }

  stepWater();
  packSim();

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texSim);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.LUMINANCE, gl.UNSIGNED_BYTE, simBytes);
  gl.uniform1f(uni.uRefr, 0.42);
  gl.uniform1f(uni.uLight, params.light);
  gl.uniform1f(uni.uTime, t);
  updateFlowerAnim(t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  fctx.clearRect(0, 0, W, H);
  updatePetals(dt, t);
  drawPetals(t);

  // Liquid glass must sample after all background layers are rendered.
  // Otherwise the glass only sees glCv and covers/hides fxCv flowers.
  updateCompositeSource();
  if (liquidGlass) {
    liquidGlass.tick();
  }

  requestAnimationFrame(frame);
}

/* ============================== boot ============================== */
const img = new Image();
img.onload = () => {
  initGL();
  setupPhotoTexture(img);
  glReady = true;
  layout();
  gl.viewport(0, 0, glCv.width, glCv.height);
  
  localizeUI();
  
  liquidGlass = createCanvasLiquidGlass({
    source: compositeCv,
    container: document.getElementById('stage'),
    dpr: DPR
  });

  liquidGlass.registerLens(panelEl, {
    radius: 28,
    depth: 60,
    feather: 16,
    curve: 1.5,
    chroma: 0.08,
    tint: [1, 1, 1, 0.02],
    glint: 0.35
  });

  liquidGlass.registerLens(panelToggle, {
    radius: 29,
    depth: 60,
    feather: 12,
    curve: 1.5,
    chroma: 0.08,
    tint: [1, 1, 1, 0.02],
    glint: 0.35
  });

  // Do not call liquidGlass.start(). The main frame loop manually ticks it
  // after glCv + fxCv are composited, keeping source order deterministic.
  
  requestAnimationFrame(frame);
};
img.onerror = (err) => {
  console.error("Failed to load background image:", img.src);
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '100px';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.background = 'orange';
  div.style.color = 'black';
  div.style.zIndex = '99999';
  div.style.padding = '20px';
  div.style.fontFamily = 'monospace';
  div.textContent = 'Failed to load background image: ' + img.src + ' (verify if this file exists in public/assets/)';
  document.body.appendChild(div);
};
img.src = PHOTO_SRC;
