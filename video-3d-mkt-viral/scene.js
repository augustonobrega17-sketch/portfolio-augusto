// Cena 3D do reel "Seu gancho flopou" (1080x1920, 9:16).
// Tudo é função do tempo: window.renderAt(t) desenha o quadro exato do segundo t,
// então o render quadro a quadro (render.mjs) sai determinístico e sem travadas.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const DURATION = 28.0;
export const CUTS = [0, 2.8, 6.6, 9.7, 12.8, 16.6, 19.7, 23.6, 28.0];

const W = 1080, H = 1920;
const COLORS = { pink: 0xff2d78, cyan: 0x22e4ff, yellow: 0xffd23f, red: 0xff2d55, violet: 0x7b5cff };

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInCubic = t => Math.pow(clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOutBack = t => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutElastic = t => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Fator de entrada/saída de uma cena (0 fora, 1 no meio), com "pop".
function sceneEnv(t, a, b, inDur = 0.45, outDur = 0.28) {
  if (t < a || t >= b) return 0;
  const i = easeOutBack((t - a) / inDur);
  const o = 1 - easeInCubic((t - (b - outDur)) / outDur);
  return Math.min(i, o);
}

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
{
  const g = document.createElement('canvas'); g.width = 4; g.height = 512;
  const ctx = g.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#120a3a'); grad.addColorStop(0.55, '#07061a'); grad.addColorStop(1, '#2a0828');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(g); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
// Objetos ficam no meio-baixo do quadro (texto em cima), centralizados na área segura.
const FOCUS = new THREE.Vector3(-0.35, -1.0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
const rimPink = new THREE.PointLight(COLORS.pink, 60, 30); rimPink.position.set(-5, 1, 3); scene.add(rimPink);
const rimCyan = new THREE.PointLight(COLORS.cyan, 60, 30); rimCyan.position.set(5, -3, 3); scene.add(rimCyan);
const alarm = new THREE.PointLight(COLORS.red, 0, 25); alarm.position.set(0, -1, 4); scene.add(alarm);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.4, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- materiais ----------
const mat = {
  chrome: new THREE.MeshStandardMaterial({ color: 0xb8c2d8, metalness: 1, roughness: 0.28 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.22, emissive: 0x6a4300, emissiveIntensity: 0.4 }),
  pink: new THREE.MeshStandardMaterial({ color: COLORS.pink, metalness: 0.2, roughness: 0.3, emissive: COLORS.pink, emissiveIntensity: 0.12 }),
  cyan: new THREE.MeshStandardMaterial({ color: COLORS.cyan, metalness: 0.2, roughness: 0.3, emissive: COLORS.cyan, emissiveIntensity: 0.1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x16142a, metalness: 0.6, roughness: 0.35 }),
  white: new THREE.MeshStandardMaterial({ color: 0xcfcbe6, metalness: 0.05, roughness: 0.55 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfefff, metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 0.4, transparent: true, opacity: 0.45 }),
  sand: new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xff9a00, emissiveIntensity: 0.6, roughness: 0.8 }),
  irid: new THREE.MeshPhysicalMaterial({ color: 0xa98bff, metalness: 0.8, roughness: 0.18, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 900] }),
  glowCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(3) }),
  glowYellow: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.yellow).multiplyScalar(2.5) }),
  glowRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.red).multiplyScalar(2.5), transparent: true }),
};

// ---------- partículas de fundo ----------
const dust = (() => {
  const N = 420, r = rng(7), pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { seeds.push([r() * 16 - 8, r() * 26 - 13, -r() * 14 - 2, r() * 0.6 + 0.2]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const c = dot.getContext('2d'); const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ size: 0.16, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xb9a8ff, opacity: 0.7 });
  const pts = new THREE.Points(geo, m); scene.add(pts);
  return { update(t) { for (let i = 0; i < N; i++) { const s = seeds[i]; pos[i * 3] = s[0] + Math.sin(t * 0.4 + i) * 0.3; pos[i * 3 + 1] = ((s[1] + t * s[3] + 13) % 26) - 13; pos[i * 3 + 2] = s[2]; } geo.attributes.position.needsUpdate = true; } };
})();

// ---------- peças reaproveitadas ----------
function makeHook() {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, -0.9, 0),
    new THREE.Vector3(0.25, -1.55, 0), new THREE.Vector3(0.85, -1.75, 0), new THREE.Vector3(1.35, -1.4, 0),
    new THREE.Vector3(1.45, -0.7, 0),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.14, 24, false), mat.chrome));
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 20, 48), mat.chrome); eye.position.y = 2.9; g.add(eye);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 24), mat.chrome); tip.position.set(1.45, -0.45, 0); g.add(tip);
  const barb = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 16), mat.chrome); barb.position.set(1.3, -0.6, 0); barb.rotation.z = 0.7; g.add(barb);
  return g;
}
function makeFeedCard(color, seed, dim = 1) {
  color = new THREE.Color(color).multiplyScalar(dim);
  const r = rng(seed), g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(2.2, 3.0, 0.12, 4, 0.14), mat.dark));
  const thumb = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.9), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.08, roughness: 0.6 }));
  thumb.position.set(0, 0.38, 0.07); g.add(thumb);
  for (let k = 0; k < 2; k++) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.95 * (0.5 + r() * 0.45), 0.13), mat.white);
    bar.position.set(-0.97 + bar.geometry.parameters.width / 2, -0.85 - k * 0.27, 0.07); g.add(bar);
  }
  return g;
}
function shapeGeo(shape, depth, bevel = 0.06) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  geo.center(); return geo;
}
function starShape(R = 1, r = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath(); return s;
}
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.15, -0.75, -1.1, -0.2, -1.1, 0.35);
  s.bezierCurveTo(-1.1, 0.85, -0.55, 1.05, 0, 0.6);
  s.bezierCurveTo(0.55, 1.05, 1.1, 0.85, 1.1, 0.35);
  s.bezierCurveTo(1.1, -0.2, 0.15, -0.75, 0, -0.9);
  return s;
}

// ---------- cenas ----------
const scenes = [];
function addScene(a, b, build) { const root = new THREE.Group(); root.position.copy(FOCUS); scene.add(root); const s = build(root); s.root = root; s.a = a; s.b = b; scenes.push(s); }

// 0) GANCHO: o anzol (gancho) pendurado, a linha arrebenta e ele despenca.
const SNAP = 1.35;
addScene(CUTS[0], CUTS[1], root => {
  const pivot = new THREE.Group(); pivot.position.y = 6.4; root.add(pivot);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.5, 8), mat.white); line.position.y = -2.25; pivot.add(line);
  const hook = makeHook(); hook.position.y = -7.4; pivot.add(hook);
  const cards = [makeFeedCard(COLORS.violet, 1), makeFeedCard(COLORS.pink, 2), makeFeedCard(COLORS.cyan, 3)];
  cards.forEach((c, i) => { c.position.set((i - 1) * 2.6, -0.8, -4.5); c.rotation.y = (i - 1) * -0.35; root.add(c); });
  const shards = new THREE.Group(); root.add(shards);
  const r = rng(11), sv = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12 + r() * 0.12), mat.glowRed); shards.add(m); sv.push([r() * 2 - 1, r() * 1.4 + 0.2, r() * 2 - 1, r() * 6]); }
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      if (lt < SNAP) {
        pivot.rotation.z = Math.sin(lt * 3.2) * 0.22 * (1 - lt / SNAP * 0.4);
        pivot.position.y = 6.4 - easeOutBack(lt / 0.5) * 0.6 + 0.6;
        line.visible = true; hook.position.y = -7.4; hook.rotation.set(0, Math.sin(lt * 2) * 0.4, 0);
        shards.visible = false;
      } else {
        const ft = lt - SNAP;
        line.visible = false; pivot.rotation.z = 0;
        hook.position.y = -7.4 - 9 * ft * ft; hook.rotation.set(ft * 1.5, ft * 2.5, -ft * 4);
        shards.visible = true;
        shards.children.forEach((m, i) => { const v = sv[i]; m.position.set(v[0] * ft * 5, 1.6 + v[1] * ft * 5 - 6 * ft * ft, v[2] * ft * 2); m.rotation.set(v[3] + ft * 5, ft * 4, 0); m.material.opacity = clamp(1 - ft / 1.2); });
      }
      cards.forEach((c, i) => { c.position.y = -0.8 + Math.sin(t * 1.5 + i) * 0.15 - (lt > SNAP ? easeInCubic((lt - SNAP) / 1.4) * 6 : 0); c.rotation.x = lt > SNAP ? (lt - SNAP) * (i - 1) * 0.6 : 0; });
    },
  };
});

// 1) 2 SEGUNDOS: cronômetro + feed rolando atrás.
addScene(CUTS[1], CUTS[2], root => {
  const sw = new THREE.Group(); root.add(sw);
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.22, 32, 96), mat.chrome));
  const face = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.22, 64), mat.white); face.rotation.x = Math.PI / 2; sw.add(face);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.45, 24), mat.chrome); crown.position.y = 2.15; sw.add(crown);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 32), mat.pink); btn.position.y = 2.45; sw.add(btn);
  for (let i = 0; i < 12; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.07, i % 3 ? 0.18 : 0.34, 0.06), mat.dark); const a = i / 12 * Math.PI * 2; tk.position.set(Math.sin(a) * 1.42, Math.cos(a) * 1.42, 0.14); tk.rotation.z = -a; sw.add(tk); }
  const arc = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 64, 1, 0, 0.01), mat.glowRed); arc.position.z = 0.13; sw.add(arc);
  const hand = new THREE.Group(); hand.position.z = 0.18; sw.add(hand);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.35, 0.06), new THREE.MeshStandardMaterial({ color: COLORS.red, emissive: COLORS.red, emissiveIntensity: 0.6 })); hm.position.y = 0.55; hand.add(hm);
  hand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24).rotateX(Math.PI / 2), mat.dark));
  const feed = new THREE.Group(); root.add(feed);
  const palette = [COLORS.violet, COLORS.pink, COLORS.cyan, COLORS.yellow];
  for (let i = 0; i < 14; i++) { const c = makeFeedCard(palette[i % 4], 20 + i, 0.35); c.userData = { col: i % 2, row: Math.floor(i / 2) }; feed.add(c); }
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      sw.rotation.y = Math.sin(lt * 1.3) * 0.35; sw.rotation.x = -0.12;
      // 2 segundos = uma volta completa do ponteiro, repetindo.
      const p = (lt % 2) / 2;
      hand.rotation.z = -p * Math.PI * 2;
      arc.geometry.dispose(); arc.geometry = new THREE.RingGeometry(1.1, 1.3, 64, 1, Math.PI / 2 - p * Math.PI * 2, Math.max(0.01, p * Math.PI * 2));
      btn.position.y = 2.45 - (p < 0.06 ? 0.12 : 0);
      feed.children.forEach(c => { const { col, row } = c.userData; c.position.set(col ? 2.6 : -2.6, ((row * 3.3 + lt * 7) % 23) - 11.5, -7); c.rotation.y = col ? -0.3 : 0.3; });
    },
  };
});

// 2) CONFLITO: duas formas colidem, onda de choque e estilhaços.
const HIT = 0.85;
addScene(CUTS[2], CUTS[3], root => {
  const a = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), mat.pink); a.material = a.material.clone(); a.material.flatShading = true; root.add(a);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), mat.cyan); b.material = b.material.clone(); b.material.flatShading = true; root.add(b);
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 16, 96), mat.glowYellow.clone()); wave.material.transparent = true; root.add(wave);
  const wave2 = wave.clone(); wave2.material = wave.material.clone(); wave2.rotation.x = Math.PI / 2; root.add(wave2);
  const bolts = new THREE.Group(); root.add(bolts);
  const r = rng(33), sv = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + r() * 0.14), i % 2 ? mat.glowYellow : mat.glowCyan); bolts.add(m); const th = r() * Math.PI * 2, ph = r() * Math.PI - Math.PI / 2; sv.push([Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph), 2 + r() * 5]); }
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      if (lt < HIT) { const k = easeInCubic(lt / HIT); a.position.x = lerp(-4.5, -1.1, k); b.position.x = lerp(4.5, 1.1, k); }
      else { const k = lt - HIT; const recoil = Math.exp(-k * 4) * Math.sin(k * 18) * 0.35; a.position.x = -1.25 - recoil - k * 0.15; b.position.x = 1.25 + recoil + k * 0.15; }
      a.rotation.set(lt * 1.4, lt * 2.1, 0); b.rotation.set(-lt * 1.6, -lt * 1.8, 0);
      a.position.y = b.position.y = Math.sin(lt * 2) * 0.12;
      const k = lt - HIT;
      [wave, wave2].forEach((w, i) => { const kk = k - i * 0.12; w.visible = kk > 0; w.scale.setScalar(0.2 + easeOutCubic(kk / 0.9) * 4.5); w.material.opacity = clamp(1 - kk / 0.9); });
      bolts.visible = k > 0;
      bolts.children.forEach((m, i) => { const v = sv[i]; const d = easeOutCubic(k / 1.3) * v[3]; m.position.set(v[0] * d, v[1] * d, v[2] * d); m.rotation.set(k * 6 + i, k * 4, 0); m.scale.setScalar(clamp(1.3 - k / 1.5, 0.001)); });
    },
  };
});

// 3) VENDE O DEPOIS: a caixa do produto abre e sai uma estrela brilhando.
addScene(CUTS[3], CUTS[4], root => {
  const box = new THREE.Group(); root.add(box); box.position.y = -1.2;
  const boxMat = new THREE.MeshStandardMaterial({ color: COLORS.violet, metalness: 0.3, roughness: 0.35 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.7, 2.4, 4, 0.08), boxMat); box.add(body);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.72, 2.42), mat.pink); box.add(ribbon);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.85, -1.2); box.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.35, 2.6, 4, 0.08), boxMat); lid.position.set(0, 0.17, 1.2); hinge.add(lid);
  const lidR = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.37, 2.62), mat.pink); lidR.position.copy(lid.position); hinge.add(lidR);
  const star = new THREE.Mesh(shapeGeo(starShape(1, 0.45), 0.35, 0.08), mat.gold); root.add(star);
  const halo = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 48, 1, true), new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  halo.position.y = 1.0; halo.rotation.x = Math.PI; box.add(halo);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), mat.glowYellow); root.add(core);
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      box.rotation.y = -0.6 + lt * 0.35; box.rotation.x = 0.25;
      const open = easeOutElastic((lt - 0.55) / 0.9);
      hinge.rotation.x = -open * 1.9;
      box.position.y = -1.2 + (lt < 0.55 ? Math.abs(Math.sin(lt * 22)) * 0.08 : 0);
      const rise = easeOutBack((lt - 0.8) / 0.9);
      star.position.y = lerp(-1.2, 1.6, rise); star.scale.setScalar(Math.max(0.001, rise * 1.15));
      star.rotation.y = lt * 2.2; core.position.copy(star.position); core.scale.setScalar(Math.max(0.001, rise) * (1 + Math.sin(lt * 8) * 0.1));
      halo.material.opacity = 0.06 * clamp((lt - 0.7) / 0.5);
    },
  };
});

// 4) PROVA SOCIAL: corações subindo + 5 estrelas acendendo uma a uma.
addScene(CUTS[4], CUTS[5], root => {
  const hearts = new THREE.Group(); root.add(hearts);
  const hg = shapeGeo(heartShape(), 0.35, 0.08), r = rng(44), hv = [];
  const hm = [mat.pink, new THREE.MeshStandardMaterial({ color: COLORS.red, emissive: COLORS.red, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.3 })];
  for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(hg, hm[i % 2]); hearts.add(m); hv.push([r() * 6 - 3, r() * 3, -2 - r() * 3, 0.35 + r() * 0.45, r() * 6]); }
  const stars = new THREE.Group(); stars.position.y = -1.0; root.add(stars);
  const sg = shapeGeo(starShape(0.62, 0.27), 0.22, 0.05);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(sg, mat.gold.clone()); s.position.x = (i - 2) * 1.35; stars.add(s); }
  const big = new THREE.Mesh(hg, hm[0]); big.position.set(0, 1.25, 0.5); root.add(big);
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      hearts.children.forEach((m, i) => { const v = hv[i]; const y = ((v[1] + lt * 1.8 + v[4]) % 9) - 4.5; m.position.set(v[0] + Math.sin(lt * 2 + i) * 0.3, y, v[2] - 1); m.scale.setScalar(v[3]); m.rotation.set(0, Math.sin(lt * 2 + i) * 0.6, Math.sin(lt + i) * 0.2); });
      stars.children.forEach((s, i) => { const p = easeOutBack((lt - 0.3 - i * 0.22) / 0.4); s.scale.setScalar(Math.max(0.001, p)); s.rotation.y = (1 - clamp(p)) * Math.PI * 2 + Math.sin(lt * 2 + i) * 0.2; s.material.emissiveIntensity = p > 0.9 ? 0.9 + Math.sin(lt * 6 + i) * 0.3 : 0.2; });
      const beat = Math.pow(Math.abs(Math.sin(lt * Math.PI * 2)), 8);
      big.scale.setScalar(1.25 * easeOutBack(lt / 0.5) + beat * 0.18); big.rotation.y = Math.sin(lt * 1.5) * 0.4;
    },
  };
});

// 5) ESCASSEZ: ampulheta girando, areia acabando, luz de alarme.
addScene(CUTS[5], CUTS[6], root => {
  const hg = new THREE.Group(); root.add(hg);
  const capT = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.3, 48), mat.gold); capT.position.y = 2.15; hg.add(capT);
  const capB = capT.clone(); capB.position.y = -2.15; hg.add(capB);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.3, 12), mat.gold); p.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25); hg.add(p); }
  const pts = []; for (let i = 0; i <= 40; i++) { const y = -2 + i / 40 * 4; pts.push(new THREE.Vector2(0.12 + Math.pow(Math.abs(y) / 2, 1.4) * 0.95, y)); }
  hg.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat.glass));
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 48), mat.sand); top.rotation.x = Math.PI; hg.add(top);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 48), mat.sand); hg.add(bot);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2, 8), mat.sand); hg.add(stream);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 12, 96), mat.glowRed); ring.rotation.x = Math.PI / 2.4; root.add(ring);
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a, dur = this.b - this.a;
      hg.rotation.y = lt * 0.8; hg.rotation.z = Math.sin(lt * 1.2) * 0.08; hg.scale.setScalar(0.85);
      const p = clamp(lt / (dur - 0.3));
      const ts = Math.max(0.02, 1 - p), bs = Math.max(0.02, 0.15 + p * 0.85);
      top.scale.set(ts, ts, ts); top.position.y = 0.15 + 1.7 * ts / 2 + (1 - ts) * 0.2;
      bot.scale.set(bs, bs, bs); bot.position.y = -1.85 + 1.7 * bs / 2;
      stream.position.y = -0.8; stream.visible = p < 0.98;
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(lt * Math.PI * 4), 2);
      ring.material.opacity = 0.3 + pulse * 0.7; ring.rotation.z = lt; ring.scale.setScalar(1 + pulse * 0.05);
      alarm.intensity = env > 0.01 ? pulse * 120 : 0;
    },
  };
});

// 6) LOOP: nó infinito iridescente com uma luz correndo por ele.
addScene(CUTS[6], CUTS[7], root => {
  const P = 2, Q = 3, R = 1.45, TUBE = 0.36;
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(R, TUBE, 320, 40, P, Q), mat.irid); root.add(knot);
  const runners = new THREE.Group(); knot.add(runners);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42 - i * 0.035, 20, 14), i % 3 === 2 ? mat.glowYellow : mat.glowCyan); runners.add(m); }
  const knotPoint = (u, out) => { const cu = Math.cos(u), su = Math.sin(u), qp = Q / P * u, cs = Math.cos(qp); return out.set(R * (2 + cs) * 0.5 * cu, R * (2 + cs) * su * 0.5, R * Math.sin(qp) * 0.5); };
  const v = new THREE.Vector3();
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      knot.rotation.set(0.5 + Math.sin(lt * 0.6) * 0.2, lt * 0.7, 0);
      runners.children.forEach((m, i) => { knotPoint(lt * 2.2 - i * 0.07, v); m.position.copy(v).multiplyScalar(1.0); m.position.z += 0; });
      knot.scale.setScalar(1.05);
    },
  };
});

// 7) CTA: marcador "salvar" pulsando e o gancho voltando (fecha o loop com a abertura).
addScene(CUTS[7], CUTS[8] + 0.01, root => {
  const s = new THREE.Shape(); s.moveTo(-0.9, 1.3); s.lineTo(0.9, 1.3); s.lineTo(0.9, -1.3); s.lineTo(0, -0.6); s.lineTo(-0.9, -1.3); s.closePath();
  const bm = new THREE.Mesh(shapeGeo(s, 0.35, 0.1), mat.gold); root.add(bm);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.05, 12, 96), mat.glowYellow); root.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.04, 12, 96), mat.glowCyan); root.add(ring2);
  const pivot = new THREE.Group(); pivot.position.set(1.9, 6.6, -1.2); root.add(pivot);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.5, 8), mat.white); line.position.y = -2.25; pivot.add(line);
  const hook = makeHook(); hook.position.y = -7.4; hook.scale.setScalar(0.7); pivot.add(hook);
  return {
    update(t, env) {
      root.scale.setScalar(Math.max(0.001, env));
      const lt = t - this.a;
      const tap = (lt > 0.9 && lt < 1.25) ? Math.sin((lt - 0.9) / 0.35 * Math.PI) * 0.25 : 0;
      bm.rotation.y = Math.sin(lt * 1.6) * 0.5; bm.position.x = -0.6; bm.position.y = 0.2;
      bm.scale.setScalar(1.1 - tap + Math.pow(Math.abs(Math.sin(lt * Math.PI)), 6) * 0.08);
      bm.material.emissiveIntensity = lt > 1.1 ? 0.9 : 0.4;
      [ring, ring2].forEach((r, i) => { const k = ((lt * 0.9 + i * 0.5) % 1); r.position.set(-0.6, 0.2, 0); r.scale.setScalar(0.6 + k * 1.4); r.material.transparent = true; r.material.opacity = 1 - k; r.rotation.y = i * 0.4; });
      const drop = easeOutBack((lt - 1.4) / 0.8);
      pivot.position.y = lerp(9.5, 5.6, drop); pivot.rotation.z = Math.sin(lt * 3) * 0.18;
    },
  };
});

// ---------- texto (HTML por cima do canvas) ----------
const cards = [...document.querySelectorAll('.card')].map(el => {
  el.querySelectorAll('.h').forEach(h => {
    // quebra os títulos em palavras para animar uma por uma
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(w => { if (!w.trim()) return; const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w; frag.appendChild(sp); }); n.replaceWith(frag); }
      else if (n.nodeType === 1 && !n.classList.contains('w')) { if (n.childNodes.length === 1 && n.firstChild.nodeType === 3 && !/\s/.test(n.textContent.trim())) n.classList.add('w'); else walk(n); }
    });
    walk(h);
  });
  return { el, a: +el.dataset.in, b: +el.dataset.out, words: [...el.querySelectorAll('.w')], extras: [...el.querySelectorAll('.badge, .s')] };
});
const bar = document.querySelector('#progress i');
const flash = document.getElementById('flash');
const redflash = document.getElementById('redflash');

function updateText(t) {
  for (const c of cards) {
    if (t < c.a || t >= c.b) { c.el.style.opacity = 0; continue; }
    const lt = t - c.a, out = clamp((t - (c.b - 0.2)) / 0.2);
    c.el.style.opacity = 1 - out;
    c.el.style.transform = `translateY(${-out * 60}px) scale(${1 + out * 0.06})`;
    // Primeiro quadro já mostra o gancho inteiro (regra: cartela do gancho no quadro 1).
    const instant = c.a === 0;
    c.words.forEach((w, i) => { const p = instant ? 1 : easeOutBack((lt - i * 0.07) / 0.32); w.style.opacity = clamp(p * 3); w.style.transform = `translateY(${(1 - p) * 70}px) scale(${0.6 + 0.4 * p})`; });
    c.extras.forEach((e, i) => { const p = easeOutBack((lt - 0.25 - i * 0.12) / 0.35); e.style.opacity = clamp(p * 2); e.style.transform = `scale(${0.7 + 0.3 * p})`; });
    // "flopou" treme no corte
    if (c.a === SNAP) { const sh = Math.exp(-lt * 6) * 14; c.el.style.transform += ` translate(${Math.sin(lt * 90) * sh}px, ${Math.cos(lt * 70) * sh}px)`; }
  }
  bar.style.width = `${clamp(t / DURATION) * 100}%`;
  // flash rápido em cada corte
  let f = 0; for (const cut of CUTS.slice(1, -1)) { const d = t - cut; if (d >= 0 && d < 0.18) f = Math.max(f, (1 - d / 0.18) * 0.35); }
  flash.style.opacity = f;
  const ds = t - SNAP; redflash.style.opacity = ds >= 0 && ds < 0.6 ? (1 - ds / 0.6) : 0;
}

// ---------- câmera ----------
function updateCamera(t) {
  let shake = 0;
  const hitT = CUTS[2] + HIT; if (t > hitT) shake += Math.exp(-(t - hitT) * 7) * 0.35;
  if (t > SNAP) shake += Math.exp(-(t - SNAP) * 7) * 0.3;
  let punch = 0; for (const cut of CUTS.slice(0, -1)) { const d = t - cut; if (d >= 0 && d < 0.6) punch = Math.max(punch, 1 - easeOutCubic(d / 0.6)); }
  const z = 14 + punch * 2.2;
  camera.position.set(Math.sin(t * 0.5) * 0.6 + Math.sin(t * 53) * shake, Math.cos(t * 0.4) * 0.3 + Math.cos(t * 61) * shake, z);
  camera.lookAt(0, 0, 0);
  camera.fov = 50 + punch * -3; camera.updateProjectionMatrix();
}

// ---------- API do render ----------
window.DURATION = DURATION;
window.renderAt = t => {
  alarm.intensity = 0;
  for (const s of scenes) { const env = sceneEnv(t, s.a, s.b); s.root.visible = env > 0.001; if (s.root.visible) s.update(t, env); }
  dust.update(t);
  rimPink.intensity = 60 + Math.sin(t * 2) * 20; rimCyan.intensity = 60 + Math.cos(t * 2) * 20;
  updateCamera(t);
  updateText(t);
  composer.render();
};
await document.fonts.ready;
window.renderAt(0);
window.READY = true;

// Prévia ao vivo: abra /scene.html?play no navegador.
if (location.search.includes('play')) { const t0 = performance.now(); const loop = () => { window.renderAt(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); }; loop(); }
