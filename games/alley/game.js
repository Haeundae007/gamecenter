// 흡연충 뻑치기 — 1인칭. 명학역 1번 출구에서 만안로를 따라 에스키스안양 A동까지.
// 길과 일부 건물은 OpenStreetMap 데이터(map.js)를 그대로 쓴다.
// 화면에 글로 상황을 설명하지 않는다. 생김새·동작·소리·화면 효과로만 보여 준다.
import { submitScore } from '../../js/gc.js';
import { ROUTE, BUILDINGS } from './map.js';

const $ = id => document.getElementById(id);
const T = window.THREE;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches;

/* ================= 길 (만안로) ================= */
const seg = [];
let LEN = 0;
for (let i = 0; i < ROUTE.length - 1; i++) {
  const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1], len = Math.hypot(bx - ax, bz - az);
  seg.push({ ax, az, bx, bz, len, s0: LEN, dx: (bx - ax) / len, dz: (bz - az) / len });
  LEN += len;
}
// 역 앞은 넓고, 만안로는 차 두 대가 겨우 비키는 폭
function halfWidth(s) { return s < 30 ? 7 - s / 15 : 4.6 + Math.sin(s * 0.05) * 0.4; }
const smooth = x => x * x * (3 - 2 * x);
function elev(s) { const k = Math.max(0, Math.min(1, s / LEN)); return 7 * smooth(k) + 0.5 * Math.sin(s * 0.03); }
function nearest(x, z) {
  let best = null;
  for (const g of seg) {
    let t = ((x - g.ax) * g.dx + (z - g.az) * g.dz) / g.len;
    t = Math.max(0, Math.min(1, t));
    const px = g.ax + g.dx * g.len * t, pz = g.az + g.dz * g.len * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, s: g.s0 + g.len * t, lat: (x - px) * -g.dz + (z - pz) * g.dx, g };
  }
  best.hw = halfWidth(best.s);
  return best;
}
function pointAt(s) {
  s = Math.max(0, Math.min(LEN, s));
  for (const g of seg) if (s <= g.s0 + g.len + 1e-6) {
    const t = (s - g.s0) / g.len;
    return { x: g.ax + g.dx * g.len * t, z: g.az + g.dz * g.len * t, dx: g.dx, dz: g.dz, hw: halfWidth(s) };
  }
}

/* ================= 렌더러 ================= */
const canvas = $('view');
const renderer = new T.WebGLRenderer({ canvas, antialias: !mobile });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.75));
const scene = new T.Scene();
const FOG = 0x141824;
scene.background = new T.Color(FOG);
scene.fog = new T.FogExp2(FOG, 0.026);
const camera = new T.PerspectiveCamera(72, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new T.HemisphereLight(0x7a86a8, 0x2a2018, 0.95));
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------- 텍스처 ---------- */
const R = (() => { let s = 90210; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const rr = (a, b) => a + R() * (b - a);
function tex(w, h, paint, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t;
}
function noise(g, w, h, base, amp, n) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (R() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
}
const asphalt = tex(256, 256, (g, w, h) => {
  noise(g, w, h, '#2b2c30', 0.18, 6000);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rr(-30, 30); y += rr(-30, 30); g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(R() * w, R() * h, rr(10, 30), rr(6, 18), R() * 3, 0, 7); g.fill(); }
});
const FACADES = ['#7d4a3a', '#a89a86', '#8a8f93', '#b9ad95', '#5f6266', '#94704f', '#c8c2b4'];
function facadeTex(base) {
  const map = tex(256, 512, (g, w, h) => {
    noise(g, w, h, base, 0.12, 3000);
    if (R() < 0.5) { g.strokeStyle = 'rgba(0,0,0,0.15)'; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    for (let fy = 0; fy < 4; fy++) for (let wx = 0; wx < 3; wx++) { g.fillStyle = '#15171c'; g.fillRect(24 + wx * 76, 40 + fy * 120, 52, 62); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(24 + wx * 76, 40 + fy * 120, 52, 4); }
  });
  const emissive = tex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 4; fy++) for (let wx = 0; wx < 3; wx++) if (R() < 0.35) { g.fillStyle = R() < 0.7 ? '#ffcf8a' : '#cfe3ff'; g.globalAlpha = rr(0.4, 0.9); g.fillRect(26 + wx * 76, 42 + fy * 120, 48, 58); }
    g.globalAlpha = 1;
  });
  return { map, emissive };
}
const facadeSets = FACADES.map(facadeTex);
function facadeMat(w, h) {
  const f = facadeSets[Math.floor(R() * facadeSets.length)];
  const map = f.map.clone(), em = f.emissive.clone(); map.needsUpdate = em.needsUpdate = true;
  map.repeat.set(w, h); em.repeat.set(w, h);
  return new T.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.9 });
}
function signTex(text, bg, fg) {
  return tex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = '900 54px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3);
  });
}
const L = c => new T.MeshLambertMaterial({ color: c });

/* ---------- 땅 ---------- */
(function ground() {
  const pos = [], uv = [], idx = [];
  let row = 0;
  for (let s = 0; s <= LEN + 0.01; s += 1, row++) {
    const p = pointAt(s), y = elev(s), ext = p.hw + 9, nx = -p.dz, nz = p.dx;
    pos.push(p.x - nx * ext, y, p.z - nz * ext, p.x + nx * ext, y, p.z + nz * ext);
    uv.push(-ext / 4, s / 4, ext / 4, s / 4);
    if (row) { const a = (row - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: asphalt, side: T.DoubleSide })));
  // 차선 가운데 노란 선 (닳아서 끊겨 있다)
  const lineMat = new T.MeshBasicMaterial({ color: 0x8a7a2a });
  for (let s = 40; s < LEN - 8; s += rr(3, 7)) {
    const p = pointAt(s), y = elev(s) + 0.02;
    const m = new T.Mesh(new T.PlaneGeometry(0.12, rr(1, 2.6)), lineMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(p.dx, -p.dz); m.position.set(p.x, y, p.z); scene.add(m);
  }
})();

/* ---------- 건물: OpenStreetMap 윤곽 + 빈자리 채우기 ---------- */
const realSlots = [];
(function realBuildings() {
  for (const b of BUILDINGS) {
    const sh = new T.Shape(b.f.map(([x, z]) => new T.Vector2(x, -z)));
    const floors = b.lv || Math.round(rr(3, 7));
    const h = floors * 3.1;
    const c = b.f.reduce((a, p) => [a[0] + p[0] / b.f.length, a[1] + p[1] / b.f.length], [0, 0]);
    const n = nearest(c[0], c[1]);
    const geo = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mat = facadeMat(1 / 7, 1 / 12);
    const m = new T.Mesh(geo, mat); m.position.y = elev(n.s) - 1.5; scene.add(m);
    realSlots.push({ x: c[0], z: c[1], r: Math.max(...b.f.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))) });
  }
})();
function nearReal(x, z) { return realSlots.some(r => Math.hypot(x - r.x, z - r.z) < r.r + 3); }
(function fillBuildings() {
  // 서쪽(왼쪽)은 상가 건물이 다닥다닥, 동쪽(오른쪽)은 철길과 듬성듬성한 건물
  for (const side of [-1, 1]) {
    let s = 14;
    while (s < LEN - 4) {
      const w = rr(6, 13), p = pointAt(s + w / 2), nx = -p.dz, nz = p.dx;
      const d = rr(9, 14), off = p.hw + 1.4 + d / 2;
      const cx = p.x + nx * off * side, cz = p.z + nz * off * side;
      if (nearReal(cx, cz)) { s += w; continue; }
      if (R() < 0.12) { s += rr(3, 5); continue; } // 샛길
      if (side > 0 && R() < 0.45) { s += w; continue; } // 철길 쪽은 비어 있는 곳이 많다
      const floors = Math.round(rr(2, 6)), h = floors * 3.1;
      const m = new T.Mesh(new T.BoxGeometry(w, h + 1.5, d), facadeMat(w / 7, (h + 1.5) / 12));
      m.position.set(cx, elev(s + w / 2) - 1.5 + (h + 1.5) / 2, cz); m.rotation.y = Math.atan2(p.dx, p.dz) + rr(-0.06, 0.06); scene.add(m);
      // 1층 가게 간판
      if (side < 0 && R() < 0.6) {
        const words = ['노래방', 'PC방', '부동산', '치킨', '분식', '세탁소', '꽃집', '휴대폰', '김밥', '24시 국밥', '편의점', '미용실', '당구장'];
        const colors = [['#d23b3b', '#fff'], ['#1e3c8c', '#fff'], ['#f2c230', '#111'], ['#111', '#ffef9a'], ['#2a7d4f', '#fff'], ['#ffffff', '#c22']];
        const [bg, fg] = colors[Math.floor(R() * colors.length)];
        const sg = new T.Mesh(new T.PlaneGeometry(Math.min(w * 0.8, 5), 1.1), new T.MeshBasicMaterial({ map: signTex(words[Math.floor(R() * words.length)], bg, fg) }));
        const so = p.hw + 1.35;
        sg.position.set(p.x + nx * so * side, elev(s + w / 2) + 3.2, p.z + nz * so * side); sg.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI / 2 * (side < 0 ? 1 : -1); scene.add(sg);
      }
      s += w + rr(0, 0.8);
    }
  }
})();

/* ---------- 철길 (동쪽) ---------- */
(function rail() {
  const fenceMat = new T.MeshLambertMaterial({ color: 0x3d4a3f }), railMat = L(0x6d6a66), sleeper = L(0x3a3128);
  for (let s = 20; s < LEN - 10; s += 2.5) {
    const p = pointAt(s), nx = -p.dz, nz = p.dx, y = elev(s);
    const fx = p.x + nx * (p.hw + 1.1), fz = p.z + nz * (p.hw + 1.1);
    if (nearReal(fx + nx * 4, fz + nz * 4)) continue;
    const post = new T.Mesh(new T.BoxGeometry(0.08, 2, 0.08), fenceMat); post.position.set(fx, y + 1, fz); scene.add(post);
    for (const k of [0.5, 1.2, 1.9]) { const bar = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 2.5), fenceMat); bar.position.set(fx, y + k, fz); bar.rotation.y = Math.atan2(p.dx, p.dz); scene.add(bar); }
    for (const off of [p.hw + 6, p.hw + 7.4, p.hw + 10, p.hw + 11.4]) { const r = new T.Mesh(new T.BoxGeometry(0.1, 0.12, 2.6), railMat); r.position.set(p.x + nx * off, y - 0.3, p.z + nz * off); r.rotation.y = Math.atan2(p.dx, p.dz); scene.add(r); }
    const sl = new T.Mesh(new T.BoxGeometry(2.6, 0.08, 0.3), sleeper); sl.position.set(p.x + nx * (p.hw + 6.7), y - 0.38, p.z + nz * (p.hw + 6.7)); sl.rotation.y = Math.atan2(p.dx, p.dz); scene.add(sl);
  }
})();

/* ---------- 전봇대, 전선, 가로등 ---------- */
const colliders = [];
(function poles() {
  const poleMat = L(0x55544f), wireMat = new T.LineBasicMaterial({ color: 0x0a0a0a });
  let prev = null, lamps = 0;
  for (let s = 12, i = 0; s < LEN - 4; s += rr(24, 34), i++) {
    const p = pointAt(s), side = -1, nx = -p.dz, nz = p.dx, y = elev(s);
    const x = p.x + nx * (p.hw - 0.4) * side, z = p.z + nz * (p.hw - 0.4) * side;
    const pole = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 9, 7), poleMat); pole.position.set(x, y + 4.5, z); pole.rotation.z = rr(-0.03, 0.03); scene.add(pole);
    colliders.push({ x, z, r: 0.35 });
    if (prev) for (let k = 0; k < 3; k++) {
      const a = new T.Vector3(prev.x, prev.y + 8.2 - k * 0.3, prev.z), b = new T.Vector3(x, y + 8.2 - k * 0.3, z), pts = [];
      for (let q = 0; q <= 12; q++) { const v = a.clone().lerp(b, q / 12); v.y -= Math.sin(Math.PI * q / 12) * (0.9 + k * 0.2); pts.push(v); }
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wireMat));
    }
    prev = { x, y, z };
    const lx = x + nx * 1, lz = z + nz * 1;
    const bulb = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), new T.MeshBasicMaterial({ color: 0xffd89a })); bulb.position.set(lx, y + 6.3, lz); scene.add(bulb);
    if (lamps++ < 9) { const lt = new T.PointLight(0xffc98a, 2.4, 26, 2); lt.position.set(lx, y + 6, lz); scene.add(lt); }
  }
})();

/* ---------- 주차된 차, 쓰레기 봉투, 오토바이 ---------- */
(function clutter() {
  const carColors = [0xd8d8d4, 0x1d1f24, 0x6b1d1d, 0x3c4a5c, 0x8a8a80, 0xf0f0ea];
  for (let s = 45; s < LEN - 20; s += rr(30, 55)) {
    const p = pointAt(s), side = R() < 0.7 ? -1 : 1, nx = -p.dz, nz = p.dx, y = elev(s);
    const off = p.hw - 1.05, x = p.x + nx * off * side, z = p.z + nz * off * side, rot = Math.atan2(p.dx, p.dz) + rr(-0.06, 0.06);
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.75, 0.75, 4.3), L(carColors[Math.floor(R() * carColors.length)])); body.position.y = 0.6; g.add(body);
    const cab = new T.Mesh(new T.BoxGeometry(1.55, 0.6, 2.2), L(0x20242c)); cab.position.set(0, 1.25, -0.2); g.add(cab);
    for (const wx of [-0.8, 0.8]) for (const wz of [-1.3, 1.3]) { const w = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.2, 10), L(0x0c0c0c)); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); g.add(w); }
    g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
    colliders.push({ x: x + p.dx * 1.2, z: z + p.dz * 1.2, r: 1.05 }, { x: x - p.dx * 1.2, z: z - p.dz * 1.2, r: 1.05 });
  }
  for (let s = 8; s < LEN - 10; s += rr(10, 20)) {
    const p = pointAt(s), side = R() < 0.6 ? -1 : 1, nx = -p.dz, nz = p.dx, y = elev(s);
    for (let k = 0; k < 2 + Math.floor(R() * 4); k++) {
      const b = new T.Mesh(new T.SphereGeometry(rr(0.28, 0.45), 8, 6), L(k % 3 ? 0x15161a : 0xdedbd0));
      b.scale.y = 0.75; b.position.set(p.x + nx * (p.hw - 0.35) * side + rr(-0.5, 0.5), y + 0.25, p.z + nz * (p.hw - 0.35) * side + rr(-0.5, 0.5)); scene.add(b);
    }
  }
})();

/* ---------- 출발: 명학역 1번 출구 / 도착: 에스키스 ---------- */
(function landmarks() {
  // 지하철 출구 캐노피 (등 뒤)
  const y0 = elev(0), p0 = pointAt(0);
  const canopy = new T.Group();
  const glass = new T.MeshLambertMaterial({ color: 0x9fb4c4, transparent: true, opacity: 0.45 });
  const roof = new T.Mesh(new T.BoxGeometry(4.2, 0.2, 6), L(0x3b4752)); roof.position.y = 3.1; canopy.add(roof);
  for (const sx of [-2, 2]) { const wall = new T.Mesh(new T.BoxGeometry(0.08, 3, 6), glass); wall.position.set(sx, 1.5, 0); canopy.add(wall); }
  const sign = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map: signTex('1', '#1b4fa3', '#ffffff') })); sign.position.set(1.4, 2.4, -3.05); sign.rotation.y = Math.PI; canopy.add(sign);
  canopy.position.set(p0.x - p0.dx * 4, y0, p0.z - p0.dz * 4); canopy.rotation.y = Math.atan2(p0.dx, p0.dz); scene.add(canopy);
})();
const GOAL = (() => {
  const p = pointAt(LEN), y = elev(LEN), nx = -p.dz, nz = p.dx;
  // 에스키스는 길 서쪽(왼쪽)
  const gx = p.x - nx * (p.hw + 0.2), gz = p.z - nz * (p.hw + 0.2);
  const bld = new T.Mesh(new T.BoxGeometry(14, 30, 12), facadeMat(2, 2.5));
  bld.position.set(gx - nx * 6.5, y + 14, gz - nz * 6.5); bld.rotation.y = Math.atan2(p.dx, p.dz); scene.add(bld);
  const door = new T.Mesh(new T.PlaneGeometry(2.6, 2.7), new T.MeshBasicMaterial({ color: 0xfff3d6 }));
  door.position.set(gx + nx * 0.05, y + 1.35, gz + nz * 0.05); door.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI / 2 * -1; scene.add(door);
  const sign = new T.Mesh(new T.PlaneGeometry(4.5, 1.2), new T.MeshBasicMaterial({ map: signTex('에스키스', '#111111', '#ffffff') }));
  sign.position.set(gx + nx * 0.06, y + 3.6, gz + nz * 0.06); sign.rotation.y = door.rotation.y; scene.add(sign);
  const lt = new T.PointLight(0xfff0d0, 1.5, 14, 2); lt.position.set(gx + nx * 2, y + 3, gz + nz * 2); scene.add(lt);
  // 편의점 (관장님 자리)
  const cs = pointAt(LEN - 40), cy = elev(LEN - 40), cnx = -cs.dz, cnz = cs.dx;
  const store = new T.Mesh(new T.PlaneGeometry(6, 2.6), new T.MeshBasicMaterial({ color: 0xd9f2ff }));
  store.position.set(cs.x - cnx * (cs.hw + 1.3), cy + 1.4, cs.z - cnz * (cs.hw + 1.3)); store.rotation.y = Math.atan2(cs.dx, cs.dz) + Math.PI / 2; scene.add(store);
  const ssign = new T.Mesh(new T.PlaneGeometry(5, 0.9), new T.MeshBasicMaterial({ map: signTex('24시 편의점', '#1d63c9', '#ffffff') }));
  ssign.position.set(store.position.x, cy + 3.2, store.position.z); ssign.rotation.y = store.rotation.y; scene.add(ssign);
  const cl = new T.PointLight(0xcfe8ff, 1.6, 16, 2); cl.position.set(cs.x - cnx * (cs.hw - 1.5), cy + 2.5, cs.z - cnz * (cs.hw - 1.5)); scene.add(cl);
  return { x: gx, z: gz };
})();

/* ================= 사람들 ================= */
// 생김새와 자세로 누군지 알아보게 만든다. 설명 문구는 없다.
const TYPES = {
  office:  { pts: 100, hp: 1, look: [999, 999], turn: 1.6, chase: 4.0, chaseT: 3, w: 1, h: 1 },
  student: { pts: 150, hp: 1, look: [4, 7], turn: 2.2, chase: 5.2, chaseT: 3.5, w: 1, h: 1 },
  retake:  { pts: 220, hp: 1, look: [1.1, 2.2], turn: 3.2, chase: 6.0, chaseT: 3, w: 0.95, h: 1 },
  grandpa: { pts: 250, hp: 1, look: [3, 6], turn: 0.9, chase: 0, chaseT: 0, w: 0.95, h: 0.92, yell: true },
  thin:    { pts: 320, hp: 1, look: [2, 3.6], turn: 4.5, chase: 7.0, chaseT: 3.4, w: 0.7, h: 1.03, squat: true },
  pig:     { pts: 450, hp: 2, look: [3, 5], turn: 1.1, chase: 4.7, chaseT: 5, w: 1.6, h: 1.0 },
  boss:    { pts: 1000, hp: 3, look: [2.5, 4], turn: 1.5, chase: 7.4, chaseT: 9, w: 1.5, h: 1.12 },
};
function tattooTex(skin) {
  return tex(64, 128, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(20,30,50,0.9)'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(R() * w, R() * h); g.bezierCurveTo(R() * w, R() * h, R() * w, R() * h, R() * w, R() * h); g.stroke(); }
    g.fillStyle = 'rgba(160,30,30,0.75)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(R() * w, R() * h, 5, 0, 7); g.fill(); }
  });
}
const box = (w, h, d, mat, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
function makePerson(type) {
  const ty = TYPES[type], g = new T.Group(), body = new T.Group(), parts = {};
  const SKIN = { office: 0xe0b896, student: 0xe8c3a0, retake: 0xe5bf9b, grandpa: 0xd2a07c, thin: 0xd9ae8a, pig: 0xdcae86, boss: 0xc98f62 }[type];
  const skin = L(SKIN);
  const look = {
    office:  { top: 0x23293a, pants: 0x23293a, arm: L(0x23293a) },
    student: { top: [0x2f5a3c, 0x8a3b2b, 0x2a3f6d, 0xbfa36b][Math.floor(R() * 4)], pants: 0x34404f, arm: null },
    retake:  { top: 0x6c6f75, pants: 0x2b2d33, arm: L(0x6c6f75) },
    grandpa: { top: 0x7a5c3c, pants: 0x55524a, arm: L(0x7a5c3c) },
    thin:    { top: 0x111111, pants: 0x1a1c20, arm: new T.MeshLambertMaterial({ map: tattooTex('#d9ae8a') }) },
    pig:     { top: 0xf2f2f2, pants: 0x1a1c20, arm: new T.MeshLambertMaterial({ map: tattooTex('#dcae86') }) },
    boss:    { top: 0xc0262b, pants: 0x1b1b1f, arm: skin },
  }[type];
  if (!look.arm) look.arm = L(look.top);
  const W = ty.w;
  // 다리
  parts.legs = [];
  for (const sx of [-1, 1]) {
    const hip = new T.Group(); hip.position.set(sx * 0.12 * W, 0.86, 0); body.add(hip);
    const thigh = box(0.17 * Math.max(1, W * 0.8), 0.45, 0.2, L(look.pants), 0, -0.22, 0, hip);
    const knee = new T.Group(); knee.position.y = -0.44; hip.add(knee);
    box(0.16 * Math.max(1, W * 0.8), 0.42, 0.19, L(look.pants), 0, -0.21, 0, knee);
    box(0.17, 0.08, 0.28, L(type === 'office' ? 0x0d0d0d : 0xdedede), 0, -0.45, 0.04, knee);
    parts.legs.push({ hip, knee, thigh });
  }
  // 몸통
  const torsoW = 0.46 * W, torsoD = 0.26 * (type === 'pig' ? 1.7 : type === 'boss' ? 1.3 : 1);
  parts.torso = box(torsoW, 0.62, torsoD, L(look.top), 0, 1.16, 0, body);
  if (type === 'pig') { const belly = new T.Mesh(new T.SphereGeometry(0.33, 10, 8), L(look.top)); belly.scale.set(1.15, 0.9, 0.9); belly.position.set(0, 1.0, 0.14); body.add(belly); const chain = new T.Mesh(new T.TorusGeometry(0.13, 0.018, 6, 16), new T.MeshBasicMaterial({ color: 0xe8c25a })); chain.position.set(0, 1.4, 0.2); chain.rotation.x = 1.2; body.add(chain); }
  if (type === 'boss') { box(torsoW * 1.15, 0.28, torsoD * 1.05, L(look.top), 0, 1.36, 0.02, body); box(torsoW * 1.25, 0.12, 0.3, skin, 0, 1.47, 0, body); }
  if (type === 'office') { box(0.07, 0.4, 0.02, L(0x8a1d2a), 0, 1.22, torsoD / 2 + 0.01, body); box(0.14, 0.12, 0.02, L(0xf2f2f2), 0, 1.42, torsoD / 2 + 0.005, body); }
  if (type === 'grandpa') { box(torsoW + 0.02, 0.62, 0.05, L(0x9a7a50), 0, 1.16, torsoD / 2 + 0.01, body); }
  if (type === 'retake' || (type === 'student' && R() < 0.5)) { box(0.36, 0.44, 0.16, L(0x1f3a5f), 0, 1.16, -torsoD / 2 - 0.08, body); }
  // 팔
  parts.arms = [];
  const armW = type === 'boss' ? 0.2 : type === 'pig' ? 0.17 : type === 'thin' ? 0.09 : 0.13;
  for (const sx of [-1, 1]) {
    const sh = new T.Group(); sh.position.set(sx * (torsoW / 2 + armW / 2 + 0.01), 1.44, 0); body.add(sh);
    box(armW, 0.6, armW + 0.01, look.arm, 0, -0.28, 0, sh);
    box(armW * 0.9, 0.1, armW * 0.9, skin, 0, -0.62, 0, sh);
    parts.arms.push(sh);
  }
  if (type === 'office') { const bag = box(0.4, 0.3, 0.08, L(0x3a2616), 0, -0.75, 0, parts.arms[0]); void bag; }
  // 머리
  const head = new T.Group(); head.position.y = 1.53; body.add(head); parts.head = head;
  box(0.24, 0.27, 0.25, skin, 0, 0.13, 0, head);
  const hairC = type === 'grandpa' ? 0xc8c8c0 : 0x141210;
  if (type === 'thin' || type === 'pig') box(0.25, 0.03, 0.26, L(0x2a2420), 0, 0.27, 0, head); // 반삭
  else if (type === 'boss') { box(0.25, 0.04, 0.26, L(0x2b0d0d), 0, 0.2, 0.01, head); } // 땀 밴드
  else box(0.26, 0.08, 0.27, L(hairC), 0, 0.28, -0.01, head);
  if (type === 'grandpa') { box(0.32, 0.06, 0.36, L(0x3a3229), 0, 0.31, 0.02, head); box(0.24, 0.1, 0.25, L(0x3a3229), 0, 0.36, 0, head); }
  if (type === 'retake') { const hood = box(0.32, 0.34, 0.3, L(look.top), 0, 0.15, -0.04, head); hood.scale.z = 1; box(0.22, 0.2, 0.02, L(0x111111), 0, 0.12, 0.13, head); }
  if (type === 'grandpa') box(0.12, 0.03, 0.02, L(0x222222), 0, 0.16, 0.13, head); // 안경
  // 담배와 불씨
  box(0.02, 0.02, 0.09, new T.MeshBasicMaterial({ color: 0xf2efe6 }), 0.05, 0.06, 0.16, head);
  const ember = new T.Mesh(new T.SphereGeometry(0.016, 6, 4), new T.MeshBasicMaterial({ color: 0xff6a20 })); ember.position.set(0.05, 0.06, 0.21); head.add(ember);
  parts.ember = ember;
  // 자세
  parts.arms[1].rotation.x = -1.9; parts.arms[1].rotation.z = -0.25; // 담배 든 손
  if (type === 'office') { parts.arms[0].rotation.set(-2.3, 0, 0.55); box(0.03, 0.14, 0.07, L(0x111111), -0.15, 0.12, 0.02, head); }
  if (type === 'grandpa') { body.rotation.x = 0.22; head.rotation.x = -0.15; parts.arms[0].rotation.x = 0.4; }
  if (type === 'boss') { parts.arms[0].rotation.z = 0.35; parts.legs.forEach((l, i) => { l.hip.rotation.z = i ? -0.12 : 0.12; }); }
  body.scale.set(1, ty.h, 1);
  g.add(body);
  return { g, body, parts, type, ty };
}
function setSquat(n, on) {
  const k = on ? 1 : 0;
  n.parts.legs.forEach((l, i) => { l.hip.rotation.x = -1.5 * k; l.knee.rotation.x = 2.3 * k; l.hip.rotation.z = (i ? -0.25 : 0.25) * k; });
  n.body.position.y = -0.58 * k;
  n.body.rotation.x = 0.25 * k;
  n.parts.arms[0].rotation.x = on ? -0.9 : 0; // 무릎 위에 팔 걸치기
}

const npcs = [];
function place(type, s, side, faceOff = 0) {
  const p = pointAt(s), nx = -p.dz, nz = p.dx, y = elev(s);
  const off = (p.hw - 0.8) * side;
  const n = makePerson(type);
  const x = p.x + nx * off, z = p.z + nz * off;
  const toward = Math.atan2(-nx * side, -nz * side);
  const yaw = toward + faceOff + rr(-0.9, 0.9);
  n.g.position.set(x, y, z); n.g.rotation.y = yaw; scene.add(n.g);
  Object.assign(n, { home: { x, z, yaw }, yaw, state: 'idle', timer: rr(0.5, 3), hp: n.ty.hp, done: false, s, chaseLeft: 0, walk: 0, group: null, headKick: 0, slump: 0 });
  if (n.ty.squat) setSquat(n, true);
  npcs.push(n);
  return n;
}
function layout() {
  npcs.forEach(n => scene.remove(n.g)); npcs.length = 0;
  place('office', 34, -1, 0.4);
  const g1 = [place('student', 70, -1), place('student', 71.4, -1, 1.2), place('student', 69, -1, -0.8)];
  g1.forEach(n => n.group = g1);
  place('grandpa', 108, 1);
  place('retake', 142, -1, Math.PI);
  place('thin', 176, -1);
  place('office', 210, 1, 2.0);
  place('pig', 246, -1, 0.3);
  const g2 = [place('student', 282, -1, 0.5), place('student', 283.4, -1, 2.6)];
  g2.forEach(n => n.group = g2);
  place('thin', 318, 1);
  place('grandpa', 352, -1, 1.0);
  place('retake', 386, -1);
  place('pig', 420, 1, 2.4);
  place('thin', 455, -1, 0.8);
  place('boss', LEN - 40, -1, 0.2);
}

/* ---------- 담배 연기 ---------- */
const SMOKE = 300, smokePos = new Float32Array(SMOKE * 3), smokeLife = new Float32Array(SMOKE);
const smokeGeo = new T.BufferGeometry(); smokeGeo.setAttribute('position', new T.BufferAttribute(smokePos, 3));
const smokePts = new T.Points(smokeGeo, new T.PointsMaterial({ color: 0xbfc4cc, size: 0.16, transparent: true, opacity: 0.28, depthWrite: false }));
smokePts.frustumCulled = false; scene.add(smokePts);
let smokeI = 0;
const _v = new T.Vector3();
function puff(n) { n.parts.ember.getWorldPosition(_v); for (let k = 0; k < 2; k++) { const i = smokeI++ % SMOKE; smokePos[i * 3] = _v.x; smokePos[i * 3 + 1] = _v.y; smokePos[i * 3 + 2] = _v.z; smokeLife[i] = 2.2 + Math.random(); } }

/* ---------- 1인칭 주먹: 위에서 아래로 내리친다 ---------- */
const fist = new T.Group();
(function buildFist() {
  const skin = L(0xe2b896), knuckle = L(0xd6a882), sleeve = L(0x2b3442);
  box(0.13, 0.13, 0.26, sleeve, 0, -0.02, 0.17, fist);                 // 소매
  box(0.11, 0.1, 0.1, skin, 0, 0, 0.02, fist);                          // 손목
  box(0.13, 0.12, 0.12, skin, 0, 0.01, -0.08, fist);                    // 손등과 손바닥
  for (let i = 0; i < 4; i++) box(0.03, 0.045, 0.05, knuckle, -0.045 + i * 0.03, 0.035, -0.15, fist);   // 첫 마디
  for (let i = 0; i < 4; i++) box(0.03, 0.05, 0.045, skin, -0.045 + i * 0.03, -0.01, -0.165, fist);     // 말아 쥔 손가락
  const thumb = box(0.035, 0.035, 0.08, skin, -0.07, -0.03, -0.1, fist); thumb.rotation.y = 0.5;
})();
const FIST_REST = { x: 0.2, y: -0.22, z: -0.5, rx: 0.1, rz: 0.15 };
fist.scale.setScalar(0.62);
fist.position.set(FIST_REST.x, FIST_REST.y, FIST_REST.z);
camera.add(fist);
let swing = 0;
const SWING = 0.34;

/* ---------- 화면 효과 (글 대신) ---------- */
const flash = document.createElement('div');
flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;transition:opacity .25s';
document.body.appendChild(flash);
function screenFlash(color, a = 0.45) { flash.style.transition = 'none'; flash.style.background = color; flash.style.opacity = a; requestAnimationFrame(() => { flash.style.transition = 'opacity .35s'; flash.style.opacity = 0; }); }
function vignette(color) { flash.style.transition = 'none'; flash.style.background = `radial-gradient(ellipse at center, transparent 45%, ${color} 100%)`; flash.style.opacity = 1; requestAnimationFrame(() => { flash.style.transition = 'opacity .9s'; flash.style.opacity = 0; }); }

/* ================= 플레이어 ================= */
const P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0.02, vx: 0, vz: 0, stamina: 100, lives: 3, score: 0, hits: 0, time: 0, invuln: 0, bob: 0, shake: 0 };
let keys = {}, playing = false, running = false, runBtn = false;
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
function constrain(o, r = 0.35) {
  const n = nearest(o.x, o.z), lim = n.hw - r;
  if (Math.abs(n.lat) > lim) { const k = (Math.abs(n.lat) - lim) * Math.sign(n.lat); o.x -= -n.g.dz * k; o.z -= n.g.dx * k; }
  for (const c of colliders) { const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; } }
  const nn = nearest(o.x, o.z);
  if (nn.s <= 0.01) { const p0 = pointAt(0); const back = (o.x - p0.x) * p0.dx + (o.z - p0.z) * p0.dz; if (back < 0) { o.x -= p0.dx * back; o.z -= p0.dz * back; } }
  return nn;
}

/* ---------- 입력: WASD, Shift, 왼쪽 클릭 ---------- */
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { keys = {}; });
const turn = (dx, dy, s) => { P.yaw -= dx * s; P.pitch = Math.max(-1.3, Math.min(1.3, P.pitch - dy * s)); };
document.addEventListener('mousemove', e => { if (playing && document.pointerLockElement === canvas) turn(e.movementX, e.movementY, 0.0023); });
function lock() { if (mobile || !canvas.requestPointerLock) return; try { const q = canvas.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch { /* 무시 */ } }
canvas.addEventListener('pointerdown', e => {
  if (!playing) return;
  if (e.pointerType === 'touch') {
    if (e.clientX < innerWidth * 0.45 && stick.id === null) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; }
    else if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
  } else if (e.button === 0) {
    if (document.pointerLockElement === canvas) hit(); else { lock(); look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
  }
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId === stick.id) { const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1; stick.x = dx * k / 50; stick.y = dy * k / 50; $('nub').style.transform = `translate(${stick.x * 34}px,${stick.y * 34}px)`; }
  else if (e.pointerId === look.id) { turn(e.clientX - look.x, e.clientY - look.y, e.pointerType === 'touch' ? 0.005 : 0.004); look.x = e.clientX; look.y = e.clientY; }
});
const release = e => { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; $('nub').style.transform = ''; } if (e.pointerId === look.id) look.id = null; };
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
document.addEventListener('contextmenu', e => { if (playing) e.preventDefault(); });
$('hitBtn').addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
$('runBtn').addEventListener('pointerdown', e => { e.preventDefault(); runBtn = !runBtn; $('runBtn').setAttribute('aria-pressed', runBtn); });

/* ---------- 효과음 (기본은 꺼짐) ---------- */
let ac = null, soundOn = false, noiseBuf = null;
function audioInit() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ac = new AC(); } catch { return null; }
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 도시 웅웅거림 + 가끔 지나가는 전철
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
  const g = ac.createGain(); g.gain.value = 0.05; s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
  return ac;
}
function nz(type, freq, q, vol, dur, at = 0) {
  if (!soundOn) return; const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
function tone(freq, dur, type = 'sine', vol = 0.1, to = freq, at = 0) {
  if (!soundOn) return; const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function voice(base, dur, vol = 0.07) { // 사람 목소리 비슷한 짧은 소리
  if (!soundOn) return; const t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 0.75, t + dur);
  f.type = 'bandpass'; f.frequency.value = base * 4; f.Q.value = 3;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(f); f.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  swing: () => nz('bandpass', 700, 0.9, 0.22, 0.2),                                                     // 휘익
  punch: () => { nz('lowpass', 900, 0.7, 0.9, 0.12); tone(110, 0.16, 'sine', 0.55, 45); nz('highpass', 2500, 0.5, 0.25, 0.04, 0.005); }, // 퍽
  grunt: (n) => voice(n && n.type === 'pig' ? 95 : n && n.type === 'boss' ? 80 : 140, 0.28),
  yell: () => { voice(210, 0.45, 0.09); voice(250, 0.5, 0.08); },
  caught: () => { tone(80, 0.45, 'square', 0.14, 38); nz('lowpass', 500, 0.5, 0.5, 0.3); },
  step: () => nz('lowpass', 600 + Math.random() * 300, 0.8, 0.16, 0.07),
  chaseStep: () => nz('lowpass', 450, 0.8, 0.12, 0.06),
  turn: () => nz('bandpass', 1400, 2, 0.05, 0.08),
  win: () => { tone(660, 0.25, 'triangle', 0.12); tone(990, 0.4, 'triangle', 0.12, 990, 0.18); },
};
$('snd').addEventListener('click', () => {
  if (!audioInit()) { $('snd').textContent = '소리 없음'; return; }
  soundOn = !soundOn; if (soundOn) ac.resume(); else ac.suspend();
  $('snd').setAttribute('aria-pressed', soundOn); $('snd').textContent = soundOn ? '소리 끄기' : '소리 켜기';
});
document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else if (soundOn) ac.resume(); } });

/* ================= 때리기 ================= */
function facingDot(n, x, z) { const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), dx = x - n.g.position.x, dz = z - n.g.position.z, d = Math.hypot(dx, dz) || 1; return (fx * dx + fz * dz) / d; }
function target() {
  let best = null;
  const lx = -Math.sin(P.yaw), lz = -Math.cos(P.yaw);
  for (const n of npcs) {
    if (n.done) continue;
    const dx = n.g.position.x - P.x, dz = n.g.position.z - P.z, d = Math.hypot(dx, dz);
    if (d > 1.9) continue;
    if ((dx * lx + dz * lz) / (d || 1) < 0.6) continue;
    if (!best || d < best.d) best = { n, d };
  }
  return best && best.n;
}
let pendingHit = null;
function hit() {
  if (!playing || swing > 0) return;
  swing = SWING; sfx.swing();
  pendingHit = target(); // 주먹이 내려꽂히는 순간에 판정
}
function landHit(n) {
  if (!n || n.done) return;
  const behind = facingDot(n, P.x, P.z) < -0.2 && n.state !== 'look';
  if (!behind) { sfx.grunt(n); n.state = 'look'; n.timer = 2; shove(n); return; }
  sfx.punch(); P.shake = 0.3; screenFlash('#fff', 0.18);
  n.hp--; n.headKick = 0.45;
  if (n.ty.squat) setSquat(n, false);
  if (n.hp > 0) { sfx.grunt(n); n.state = 'turnTo'; n.timer = 0.6; return; }
  P.score += n.ty.pts; P.hits++;
  n.done = true; n.dropCig = 1;
  if (n.ty.yell) {
    sfx.yell(); n.state = 'shout'; n.timer = 1.4;
    for (const o of npcs) if (o !== n && !o.done && Math.hypot(o.g.position.x - n.g.position.x, o.g.position.z - n.g.position.z) < 18) { o.state = 'look'; o.timer = 3.5; }
  } else if (n.ty.chase > 0) { n.state = 'stun'; n.timer = n.type === 'thin' ? 0.45 : 0.8; n.chaseLeft = n.ty.chaseT; }
  if (n.group) for (const o of n.group) if (o !== n && !o.done) { o.state = 'look'; o.timer = 2.5; }
}
function shove(n) {
  if (P.invuln > 0) return;
  P.lives--; P.invuln = 1.6; P.shake = 0.55; sfx.caught(); vignette('rgba(180,0,0,0.85)');
  const dx = P.x - n.g.position.x, dz = P.z - n.g.position.z, d = Math.hypot(dx, dz) || 1;
  P.x += dx / d * 2.2; P.z += dz / d * 2.2; constrain(P);
  n.shoveAnim = 0.4;
  if (P.lives <= 0) end(false);
}

/* ================= 갱신 ================= */
function angleTo(n, x, z) { return Math.atan2(x - n.g.position.x, z - n.g.position.z); }
function turnToward(n, want, speed, dt) {
  let d = want - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  const step = speed * dt; n.yaw += Math.abs(d) < step ? d : Math.sign(d) * step;
  return Math.abs(d);
}
function updateNPC(n, dt) {
  n.timer -= dt;
  const pd = Math.hypot(P.x - n.g.position.x, P.z - n.g.position.z);
  const moving = n.state === 'chase' || n.state === 'back';
  switch (n.state) {
    case 'idle': {
      if (!n.done && n.timer <= 0) {
        const glanceBack = n.type === 'retake' && Math.random() < 0.55;
        n.wantYaw = n.home.yaw + (glanceBack ? Math.PI + rr(-0.6, 0.6) : rr(-1.2, 1.2));
        n.timer = rr(n.ty.look[0], n.ty.look[1]);
        if (glanceBack && pd < 10) sfx.turn();
      }
      if (n.wantYaw != null) turnToward(n, n.wantYaw, n.ty.turn, dt);
      if (!n.done && pd < 3.2 && facingDot(n, P.x, P.z) > 0.55 && n.type !== 'office') { n.state = 'look'; n.timer = 1.6; }
      if (!n.done && Math.random() < dt * 0.8) puff(n);
      break;
    }
    case 'look': turnToward(n, angleTo(n, P.x, P.z), n.ty.turn * 1.4, dt); if (n.timer <= 0) { n.state = 'idle'; n.wantYaw = n.home.yaw; n.timer = rr(1, 3); } break;
    case 'shout': turnToward(n, angleTo(n, P.x, P.z), 2, dt); if (n.timer <= 0) n.state = 'idle'; break;
    case 'turnTo': {
      if (n.timer > 0) break;
      if (turnToward(n, angleTo(n, P.x, P.z), n.ty.turn, dt) < 0.4) { n.state = 'chase'; n.chaseLeft = n.ty.chaseT; sfx.grunt(n); }
      break;
    }
    case 'stun': if (n.timer <= 0) { n.state = 'chase'; sfx.grunt(n); } break;
    case 'chase': {
      n.chaseLeft -= dt;
      turnToward(n, angleTo(n, P.x, P.z), 6, dt);
      const sp = n.ty.chase * dt;
      const o = { x: n.g.position.x + Math.sin(n.yaw) * sp, z: n.g.position.z + Math.cos(n.yaw) * sp };
      constrain(o, 0.3 * n.ty.w + 0.1);
      n.g.position.x = o.x; n.g.position.z = o.z;
      const before = Math.floor(n.walk / Math.PI); n.walk += sp * 3.2; if (Math.floor(n.walk / Math.PI) !== before && pd < 14) sfx.chaseStep();
      if (pd < 0.85) { shove(n); n.state = 'back'; }
      else if (n.chaseLeft <= 0) n.state = 'back';
      break;
    }
    case 'back': {
      const dx = n.home.x - n.g.position.x, dz = n.home.z - n.g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { n.state = 'idle'; n.wantYaw = n.home.yaw; n.timer = 2; if (n.ty.squat && n.done) setSquat(n, true); break; }
      turnToward(n, Math.atan2(dx, dz), 4, dt);
      const sp = Math.min(d, 1.6 * dt); n.g.position.x += Math.sin(n.yaw) * sp; n.g.position.z += Math.cos(n.yaw) * sp; n.walk += sp * 3;
      break;
    }
    default: break;
  }
  n.g.position.y = elev(nearest(n.g.position.x, n.g.position.z).s);
  n.g.rotation.y = n.yaw;
  // 걷기·뛰기 동작
  if (moving) {
    const sw = Math.sin(n.walk) * (n.state === 'chase' ? 0.9 : 0.5);
    n.parts.legs[0].hip.rotation.x = sw; n.parts.legs[1].hip.rotation.x = -sw;
    n.parts.legs[0].knee.rotation.x = Math.max(0, -sw) * 0.8; n.parts.legs[1].knee.rotation.x = Math.max(0, sw) * 0.8;
    if (n.state === 'chase') { n.parts.arms[0].rotation.x = -sw * 1.2; n.parts.arms[1].rotation.x = sw * 1.2; n.body.rotation.x = 0.18; }
  } else if (!(n.ty.squat && !n.done && n.state === 'idle')) {
    n.parts.legs.forEach(l => { l.hip.rotation.x *= 0.8; l.knee.rotation.x *= 0.8; });
    if (n.state !== 'shout') { n.parts.arms[1].rotation.x = n.done ? 0.1 : -1.9; n.parts.arms[0].rotation.x = n.type === 'office' && !n.done ? -2.3 : (n.done ? -2.6 : 0.2); }
    n.body.rotation.x = n.type === 'grandpa' ? 0.22 : 0;
  }
  // 맞은 뒤: 뒤통수를 감싸 쥔다
  if (n.done && n.state !== 'chase' && n.state !== 'shout') { n.parts.arms[0].rotation.set(-2.9, 0, 0.6); n.parts.head.rotation.x = 0.35; }
  // 할아버지 호통: 팔을 흔들며 몸을 앞으로
  if (n.state === 'shout') { const k = Math.sin(performance.now() / 60); n.parts.arms[0].rotation.set(-2.8 + k * 0.4, 0, 0.3); n.body.rotation.x = 0.35; }
  if (n.headKick > 0) { n.headKick -= dt; n.parts.head.rotation.x = Math.sin(n.headKick * 24) * 0.5 + 0.3; }
  else if (!n.done) n.parts.head.rotation.x = n.type === 'grandpa' ? -0.15 : 0;
  if (n.shoveAnim > 0) { n.shoveAnim -= dt; n.parts.arms.forEach(a => a.rotation.set(-1.5, 0, 0)); }
  n.parts.ember.visible = !n.done;
  n.parts.ember.material.color.setHSL(0.05, 1, 0.45 + Math.random() * 0.15);
}

let last = performance.now();
function update(dt) {
  P.time += dt;
  let fx = 0, fz = 0;
  if (keys.KeyW) fz += 1; if (keys.KeyS) fz -= 1;
  if (keys.KeyD) fx += 1; if (keys.KeyA) fx -= 1;
  if (stick.id !== null) { fx += stick.x; fz -= stick.y; }
  const m = Math.hypot(fx, fz); if (m > 1) { fx /= m; fz /= m; }
  running = (keys.ShiftLeft || keys.ShiftRight || runBtn) && P.stamina > 1 && m > 0.1;
  P.stamina = Math.max(0, Math.min(100, P.stamina + (running ? -24 : 14) * dt));
  const sp = running ? 6.8 : 4.3, s = Math.sin(P.yaw), c = Math.cos(P.yaw);
  const wx = (fx * c - fz * s) * sp, wz = (-fx * s - fz * c) * sp, k = Math.min(1, 12 * dt);
  P.vx += (wx - P.vx) * k; P.vz += (wz - P.vz) * k;
  P.x += P.vx * dt; P.z += P.vz * dt;
  const n = constrain(P);
  P.y = elev(n.s);
  const moved = Math.hypot(P.vx, P.vz) * dt; P.bob += moved;
  if (Math.floor(P.bob / (running ? 2.2 : 1.6)) !== Math.floor((P.bob - moved) / (running ? 2.2 : 1.6))) sfx.step();
  if (P.invuln > 0) P.invuln -= dt;
  for (const q of npcs) updateNPC(q, dt);
  if (Math.hypot(P.x - GOAL.x, P.z - GOAL.z) < 2.4) end(true);
  for (let i = 0; i < SMOKE; i++) { if (smokeLife[i] > 0) { smokeLife[i] -= dt; smokePos[i * 3 + 1] += dt * 0.45; smokePos[i * 3] += Math.sin(P.time + i) * dt * 0.08; if (smokeLife[i] <= 0) smokePos[i * 3 + 1] = -99; } }
  smokeGeo.attributes.position.needsUpdate = true;
  // 숫자만 작게
  $('hud').textContent = `${P.score.toLocaleString('ko-KR')}  ${'■'.repeat(P.lives)}${'□'.repeat(3 - P.lives)}`;
  $('stam').style.transform = `scaleX(${P.stamina / 100})`;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) update(dt); else { P.yaw += dt * 0.04; }
  const bob = calm ? 0 : Math.sin(P.bob * Math.PI / 1.6 * 2) * (running ? 0.06 : 0.035);
  let sx = 0, sy = 0; if (P.shake > 0) { P.shake -= dt; sx = (Math.random() - .5) * P.shake * 0.14; sy = (Math.random() - .5) * P.shake * 0.14; }
  camera.position.set(P.x + sx, P.y + 1.62 + bob + sy, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  // 주먹: 오른쪽 위로 치켜들었다가 화면 가운데로 내려꽂는다
  if (swing > 0) {
    const prev = swing; swing -= dt;
    const u = 1 - Math.max(0, swing) / SWING;                  // 0→1
    const up = Math.min(1, u / 0.35), down = Math.max(0, (u - 0.35) / 0.65);
    const y = FIST_REST.y + up * 0.32 - down * 0.5, x = FIST_REST.x - down * 0.2, z = FIST_REST.z - down * 0.12;
    fist.position.set(x, y, z);
    fist.rotation.set(FIST_REST.rx + up * 0.9 - down * 1.9, 0, FIST_REST.rz + down * 0.3);
    if (prev / SWING > 0.45 && swing / SWING <= 0.45) { landHit(pendingHit); pendingHit = null; }
  } else {
    fist.position.set(FIST_REST.x, FIST_REST.y + bob * 0.5, FIST_REST.z);
    fist.rotation.set(FIST_REST.rx, 0, FIST_REST.rz);
  }
  renderer.render(scene, camera);
}

/* ================= 시작과 끝 ================= */
function start() {
  layout();
  const p0 = pointAt(1.5);
  Object.assign(P, { x: p0.x, z: p0.z, pitch: 0.03, vx: 0, vz: 0, stamina: 100, lives: 3, score: 0, hits: 0, time: 0, invuln: 0, shake: 0 });
  P.yaw = Math.atan2(-p0.dx, -p0.dz);
  playing = true;
  $('startPanel').hidden = true; $('endPanel').hidden = true;
  $('hud').hidden = false; $('cross').hidden = false; $('stamBar').hidden = false;
  if (mobile) { $('stick').hidden = false; $('hitBtn').hidden = false; $('runBtn').hidden = false; }
  lock();
}
async function end(win) {
  if (!playing) return;
  playing = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch { /* 무시 */ }
  $('hud').hidden = true; $('cross').hidden = true; $('stamBar').hidden = true;
  $('stick').hidden = true; $('hitBtn').hidden = true; $('runBtn').hidden = true;
  const timeBonus = win ? Math.max(0, Math.round((200 - P.time) * 5)) : 0;
  const lifeBonus = win ? P.lives * 200 : 0;
  const total = P.score + timeBonus + lifeBonus;
  if (win) sfx.win();
  $('endTitle').textContent = `${total.toLocaleString('ko-KR')}점`;
  const dl = $('endStats'); dl.textContent = '';
  const row = (k, v) => { const a = document.createElement('dt'); a.textContent = k; const b = document.createElement('dd'); b.textContent = v; dl.append(a, b); };
  row('뻑', `${P.hits}`);
  row('시간', `${Math.round(P.time)}초`);
  row('목숨', `${P.lives}`);
  $('endMsg').textContent = '';
  $('endPanel').hidden = false;
  $('endMsg').textContent = await submitScore('alley', total);
}
$('go').addEventListener('click', start);
$('again').addEventListener('click', start);
$('home').addEventListener('click', () => { location.href = '../../#/'; });

layout();
{ const p0 = pointAt(1.5); P.x = p0.x; P.z = p0.z; P.y = elev(0); P.yaw = Math.atan2(-p0.dx, -p0.dz); }
requestAnimationFrame(frame);
window.__alley = { P, npcs, get playing() { return playing; }, start, hit, LEN, tp: s => { const p = pointAt(s); P.x = p.x; P.z = p.z; P.yaw = Math.atan2(-p.dx, -p.dz); } };
