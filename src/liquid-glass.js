// liquid-glass.js
// Custom WebGL glass refraction filter mapping DOM elements onto canvas coordinates.

const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform vec4 u_lensRect;    // x, y, width, height (in pixels)
uniform vec4 u_lensParams1; // radius, depth, feather, curve
uniform vec4 u_lensParams2; // chroma, glint, unused, unused
uniform vec4 u_lensTint;    // r, g, b, a

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + vec2(r);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

vec2 getNormal(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + vec2(r);
  if (d.x <= 0.0 && d.y <= 0.0) return vec2(0.0);
  return sign(p) * normalize(max(d, 0.0));
}

void main() {
  vec2 fragCoord = v_uv * u_resolution;
  float glY = u_resolution.y - fragCoord.y;
  vec2 pxCoords = vec2(fragCoord.x, glY);
  vec2 lensCenter = u_lensRect.xy + u_lensRect.zw * 0.5;
  vec2 p = pxCoords - lensCenter;
  vec2 b = u_lensRect.zw * 0.5;
  
  float radius = u_lensParams1.x;
  float depth = u_lensParams1.y;
  float feather = u_lensParams1.z;
  float curve = u_lensParams1.w;
  float chroma = u_lensParams2.x;
  float glint = u_lensParams2.y;

  float dist = sdRoundRect(p, b, radius);
  if (dist > 0.0) {
    discard;
  }

  float edge = clamp((dist + feather) / feather, 0.0, 1.0);
  float amount = pow(edge, curve);
  vec2 normal = getNormal(p, b, radius);
  vec2 uvOffset = vec2(normal.x, -normal.y) * amount * (depth / u_resolution);
  vec2 sampleUv = v_uv - uvOffset;

  vec4 color;
  if (chroma > 0.0) {
    float cOffset = chroma * amount;
    vec2 offsetR = vec2(normal.x, -normal.y) * amount * ((depth + cOffset) / u_resolution);
    vec2 offsetG = uvOffset;
    vec2 offsetB = vec2(normal.x, -normal.y) * amount * ((depth - cOffset) / u_resolution);
    
    float rColor = texture2D(u_source, v_uv - offsetR).r;
    float gColor = texture2D(u_source, v_uv - offsetG).g;
    float bColor = texture2D(u_source, v_uv - offsetB).b;
    float aColor = texture2D(u_source, sampleUv).a;
    color = vec4(rColor, gColor, bColor, aColor);
  } else {
    color = texture2D(u_source, sampleUv);
  }

  color.rgb = mix(color.rgb, u_lensTint.rgb, u_lensTint.a);
  vec2 lightDir = normalize(vec2(-1.0, -1.0));
  float specular = max(dot(normal, lightDir), 0.0);
  specular = pow(specular, 4.0) * amount;
  color.rgb += vec3(specular * glint);

  gl_FragColor = color;
}
`;

function createContext(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true }) 
          || canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
  if (!gl) throw new Error('WebGL not supported');
  return gl;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }
  return shader;
}

function createProgram(gl, vertSource, fragSource) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create program');
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

function createQuad(gl, program) {
  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Could not create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const ext = gl.getExtension('OES_vertex_array_object');
  let vao = null;
  const positionLocation = gl.getAttribLocation(program, 'a_position');

  if (ext) {
    vao = ext.createVertexArrayOES();
    ext.bindVertexArrayOES(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    ext.bindVertexArrayOES(null);
  }

  const draw = () => {
    if (ext && vao) {
      ext.bindVertexArrayOES(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      ext.bindVertexArrayOES(null);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  const destroy = () => {
    gl.deleteBuffer(buffer);
    if (ext && vao) ext.deleteVertexArrayOES(vao);
  };

  return { buffer, vao, draw, destroy };
}

class TextureSource {
  constructor(gl) {
    this.gl = gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Could not create texture');
    this.texture = tex;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  update(source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  getTexture() { return this.texture; }
  destroy() { this.gl.deleteTexture(this.texture); }
}

class LiquidGlassPass {
  constructor(gl) {
    this.gl = gl;
    this.program = createProgram(gl, vertexShader, fragmentShader);
    this.quad = createQuad(gl, this.program);
    this.locations = {
      u_source: gl.getUniformLocation(this.program, 'u_source'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_lensRect: gl.getUniformLocation(this.program, 'u_lensRect'),
      u_lensParams1: gl.getUniformLocation(this.program, 'u_lensParams1'),
      u_lensParams2: gl.getUniformLocation(this.program, 'u_lensParams2'),
      u_lensTint: gl.getUniformLocation(this.program, 'u_lensTint'),
    };
  }
  render(options) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.viewport(0, 0, options.resolution[0], options.resolution[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, options.sourceTexture);
    if (this.locations.u_source) gl.uniform1i(this.locations.u_source, 0);
    if (this.locations.u_resolution) {
      gl.uniform2f(this.locations.u_resolution, options.resolution[0], options.resolution[1]);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    for (const lens of options.lenses) {
      if (this.locations.u_lensRect) {
        gl.uniform4f(this.locations.u_lensRect, lens.x, lens.y, lens.width, lens.height);
      }
      if (this.locations.u_lensParams1) {
        gl.uniform4f(this.locations.u_lensParams1, lens.radius, lens.depth, lens.feather, lens.curve);
      }
      if (this.locations.u_lensParams2) {
        gl.uniform4f(this.locations.u_lensParams2, lens.chroma, lens.glint, 0, 0);
      }
      if (this.locations.u_lensTint) {
        gl.uniform4f(this.locations.u_lensTint, lens.tint[0], lens.tint[1], lens.tint[2], lens.tint[3]);
      }
      this.quad.draw();
    }
    gl.disable(gl.BLEND);
  }
  destroy() {
    this.quad.destroy();
    this.gl.deleteProgram(this.program);
  }
}

const DEFAULT_LENS_OPTIONS = {
  radius: 16,
  depth: 50,
  feather: 16,
  curve: 2,
  chroma: 0,
  tint: [1, 1, 1, 0.05],
  glint: 0.2,
};

function measureElement(element, container) {
  const elRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: elRect.left - containerRect.left,
    y: elRect.top - containerRect.top,
    width: elRect.width,
    height: elRect.height
  };
}

function parseColor(color) {
  if (Array.isArray(color)) return color;
  const div = document.createElement('div');
  div.style.color = color;
  div.style.display = 'none';
  document.body.appendChild(div);
  const rgb = getComputedStyle(div).color;
  document.body.removeChild(div);
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (match) {
    return [
      parseInt(match[1], 10) / 255,
      parseInt(match[2], 10) / 255,
      parseInt(match[3], 10) / 255,
      match[4] !== undefined ? parseFloat(match[4]) : 1.0
    ];
  }
  return [1, 1, 1, 1];
}

class LensRegistry {
  constructor() {
    this.elementLenses = new Map();
    this.rectLenses = new Map();
  }
  registerElement(element, options) {
    this.elementLenses.set(element, { ...DEFAULT_LENS_OPTIONS, ...options });
  }
  registerRect(rect) {
    const sym = Symbol();
    const opts = { ...DEFAULT_LENS_OPTIONS, ...rect };
    this.rectLenses.set(sym, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      radius: opts.radius,
      depth: opts.depth,
      feather: opts.feather,
      curve: opts.curve,
      chroma: opts.chroma,
      tint: parseColor(opts.tint),
      glint: opts.glint,
    });
    return sym;
  }
  unregister(target) {
    if (typeof target === 'symbol') {
      this.rectLenses.delete(target);
    } else {
      this.elementLenses.delete(target);
    }
  }
  update(target, options) {
    if (typeof target === 'symbol') {
      const existing = this.rectLenses.get(target);
      if (existing) {
        const newTint = options.tint ? parseColor(options.tint) : existing.tint;
        this.rectLenses.set(target, { ...existing, ...options, tint: newTint });
      }
    } else {
      const existing = this.elementLenses.get(target);
      if (existing) {
        this.elementLenses.set(target, { ...existing, ...options });
      }
    }
  }
  getActiveLenses(container) {
    const lenses = [];
    for (const [el, opts] of this.elementLenses.entries()) {
      const opacity = parseFloat(window.getComputedStyle(el).opacity ?? '1');
      if (opacity <= 0.001) continue;
      
      const rect = measureElement(el, container);
      const tint = parseColor(opts.tint);
      lenses.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        radius: opts.radius,
        depth: opts.depth * opacity,
        feather: opts.feather,
        curve: opts.curve,
        chroma: opts.chroma,
        tint: [tint[0], tint[1], tint[2], tint[3] * opacity],
        glint: opts.glint * opacity,
      });
    }
    for (const def of this.rectLenses.values()) {
      lenses.push(def);
    }
    return lenses;
  }
}

export class LiquidGlassRenderer {
  constructor(options) {
    this.source = options.source;
    this.container = options.container;
    this.dpr = options.dpr || 'auto';
    this.overlay = document.createElement('canvas');
    this.overlay.className = 'liquid-glass-overlay';
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '5'; // sit behind UI but above background canvas
    
    const computed = getComputedStyle(this.container);
    if (computed.position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.overlay);

    this.gl = createContext(this.overlay);
    this.textureSource = new TextureSource(this.gl);
    this.pass = new LiquidGlassPass(this.gl);
    this.registry = new LensRegistry();

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = this.dpr === 'auto' ? window.devicePixelRatio || 1 : this.dpr;
    this.overlay.width = rect.width * dpr;
    this.overlay.height = rect.height * dpr;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  }

  registerLens(target, options) {
    this.registry.registerElement(target, options);
  }

  registerRectLens(rect, options) {
    return this.registry.registerRect({ ...rect, ...options });
  }

  unregisterLens(target) {
    this.registry.unregister(target);
  }

  updateLens(target, options) {
    this.registry.update(target, options);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      this.tick();
      if (this.isRunning) {
        this.rafId = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
  }

  tick() {
    const lenses = this.registry.getActiveLenses(this.container);
    if (lenses.length === 0) {
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      return;
    }
    this.textureSource.update(this.source);
    const dpr = this.dpr === 'auto' ? window.devicePixelRatio || 1 : this.dpr;
    const scaledLenses = lenses.map(l => ({
      ...l,
      x: l.x * dpr,
      y: l.y * dpr,
      width: l.width * dpr,
      height: l.height * dpr,
      radius: l.radius * dpr,
      feather: l.feather * dpr,
      depth: l.depth * dpr,
    }));
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.pass.render({
      sourceTexture: this.textureSource.getTexture(),
      resolution: [this.overlay.width, this.overlay.height],
      lenses: scaledLenses,
    });
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.pass.destroy();
    this.textureSource.destroy();
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

export function createCanvasLiquidGlass(options) {
  return new LiquidGlassRenderer(options);
}
