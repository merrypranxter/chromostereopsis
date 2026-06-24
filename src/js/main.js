// main.js
// ─────────────────────────────────────────────────────────────────────
// chromostereopsis — WebGL2 renderer.
//
// Red floats. Blue sinks. Your own eyeball does the 3D. No glasses.
//
// Pipeline (per repo_seed.txt):
//   1. pick a mode shader → assign depth → map to red↔blue axis
//   2. render max-saturation pure primaries on a controlled background
//   3. optional CA enhancement pass (FBO ping-pong)
//   4. minimal post — the effect lives in the eye, not the shader
//
// Controls (see index.html overlay):
//   1..5      select mode (deep_field, glyphs, polarity, breathing, type)
//   scroll    push global depth (red↔blue bias)
//   click     swap background black ↔ white
//   c         toggle CA enhancement pass
//   space     pause / resume animation
// ─────────────────────────────────────────────────────────────────────

const SHADER_BASE = new URL('../shaders/', import.meta.url);
const DATA_BASE = new URL('../data/', import.meta.url);

// Mode index → fragment shader file. Order matches the 1..5 keys.
const MODE_SHADERS = [
  'redblue-field.frag',  // 1 deep_field
  'depth-from-hue.frag', // 2 floating_glyphs
  'polarity-flip.frag',  // 3 polarity_demo
  'breathing.frag',      // 4 breathing_layers
  'edge-tuning.frag',    // 5 type_pops
];

// ── tiny GL helpers ──────────────────────────────────────────────────

async function loadText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return res.text();
}

function compileShader(gl, type, source, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile error (${label}):\n${log}`);
  }
  return sh;
}

function linkProgram(gl, vertSrc, fragSrc, label) {
  const prog = gl.createProgram();
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc, `${label}.vert`);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, `${label}.frag`);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    throw new Error(`program link error (${label}):\n${log}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Cache uniform locations lazily.
  const cache = new Map();
  const uniform = (name) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
    return cache.get(name);
  };
  return { prog, uniform };
}

/** Create an RGBA8 framebuffer + texture sized to the canvas. */
function createFBO(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, w, h };
}

// ── app state ────────────────────────────────────────────────────────

const state = {
  mode: 0,
  depth: 0.5,         // global red↔blue push, driven by scroll
  bgWhite: false,     // click swaps background
  caEnabled: false,   // 'c' toggles
  caAmount: 0.004,
  paused: false,
  density: 1.0,
  edge: 0.08,
  rate: 0.1,
};

async function main() {
  const canvas = document.getElementById('gl');
  const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: false });
  if (!gl) {
    document.body.innerHTML =
      '<p style="color:#fff;font-family:monospace;padding:1rem">' +
      'WebGL2 is required and not available in this browser.</p>';
    return;
  }

  // Load all sources up front.
  const vertSrc = await loadText(new URL('fullscreen.vert', SHADER_BASE));
  const modePrograms = await Promise.all(
    MODE_SHADERS.map(async (file) => {
      const src = await loadText(new URL(file, SHADER_BASE));
      return linkProgram(gl, vertSrc, src, file);
    }),
  );
  const caSrc = await loadText(new URL('ca-enhance.frag', SHADER_BASE));
  const caProgram = linkProgram(gl, vertSrc, caSrc, 'ca-enhance.frag');

  // Presets are optional polish; ignore if missing.
  let presets = null;
  try {
    presets = await (await fetch(new URL('presets.json', DATA_BASE))).json();
  } catch { /* presets are optional */ }

  // Empty VAO — the fullscreen triangle is generated from gl_VertexID.
  const vao = gl.createVertexArray();

  let sceneFBO = null;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    if (sceneFBO) {
      gl.deleteFramebuffer(sceneFBO.fbo);
      gl.deleteTexture(sceneFBO.tex);
    }
    sceneFBO = createFBO(gl, w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  function bg() {
    return state.bgWhite ? [1, 1, 1] : [0, 0, 0];
  }

  const start = performance.now();
  let lastTime = 0;

  function render(now) {
    if (!state.paused) lastTime = (now - start) / 1000;
    const t = lastTime;
    const w = canvas.width;
    const h = canvas.height;

    // ── Pass 1: render the active mode into the scene FBO (or screen). ──
    const target = state.caEnabled ? sceneFBO.fbo : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, w, h);

    const { prog, uniform } = modePrograms[state.mode];
    gl.useProgram(prog);
    gl.bindVertexArray(vao);

    gl.uniform2f(uniform('u_resolution'), w, h);
    gl.uniform1f(uniform('u_time'), t);
    gl.uniform1f(uniform('u_depth'), state.depth);
    gl.uniform3fv(uniform('u_bg'), bg());
    gl.uniform1f(uniform('u_density'), state.density);
    gl.uniform1f(uniform('u_edge'), state.edge);
    gl.uniform1f(uniform('u_rate'), state.rate);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ── Pass 2 (optional): CA enhancement to the screen. ──
    if (state.caEnabled) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(caProgram.prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
      gl.uniform1i(caProgram.uniform('u_scene'), 0);
      gl.uniform2f(caProgram.uniform('u_resolution'), w, h);
      gl.uniform1f(caProgram.uniform('u_amount'), state.caAmount);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // ── input ──────────────────────────────────────────────────────────

  window.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '5') {
      state.mode = Number(e.key) - 1;
      applyPreset(presets, state.mode);
    } else if (e.key === 'c' || e.key === 'C') {
      state.caEnabled = !state.caEnabled;
    } else if (e.key === ' ') {
      state.paused = !state.paused;
      e.preventDefault();
    }
  });

  window.addEventListener('wheel', (e) => {
    state.depth = Math.min(1, Math.max(0, state.depth + Math.sign(e.deltaY) * 0.02));
  }, { passive: true });

  canvas.addEventListener('click', () => {
    state.bgWhite = !state.bgWhite;
  });
}

/** Pull per-mode tunables from presets.json if present. */
function applyPreset(presets, mode) {
  if (!presets || !Array.isArray(presets.modes)) return;
  const p = presets.modes[mode];
  if (!p) return;
  if (typeof p.density === 'number') state.density = p.density;
  if (typeof p.edge === 'number') state.edge = p.edge;
  if (typeof p.rate === 'number') state.rate = p.rate;
  if (typeof p.ca_enhance === 'number') state.caAmount = p.ca_enhance;
  if (typeof p.background === 'string') state.bgWhite = p.background === 'white';
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="color:#f44;font-family:monospace;padding:1rem;white-space:pre-wrap">${err.message}</pre>`,
  );
});
