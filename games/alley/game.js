// 골목 뒤통수 — 1인칭. 역에서 학원까지 굽은 오르막 골목을 지나며 흡연자 뒤통수를 치고 도망친다.
import { submitScore } from '../../js/gc.js';

const $ = id => document.getElementById(id);
const T = window.THREE;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches;

/* ================= 골목 길 ================= */
// 반듯하지 않게: 꺾이고, 폭이 들쭉날쭉하고, 계속 오르막이다.
const PATH = [[0, 0], [0.5, -36], [7, -62], [9.5, -100], [-4, -132], [-7, -166], [2.5, -194], [4, -214]];
const WIDTH = [7.5, 6, 5.2, 7, 4.8, 6.2, 8.5, 9];
const seg = [];
let LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az);
  seg.push({ ax, az, bx, bz, len, s0: LEN, dx: (bx - ax) / len, dz: (bz - az) / len, w0: WIDTH[i], w1: WIDTH[i + 1] });
  LEN += len;
}
const smooth = x => x * x * (3 - 2 * x);
function elev(s) { const k = Math.max(0, Math.min(1, s / LEN)); return 10 * smooth(k) + 0.7 * Math.sin(s * 0.07) + 0.3 * Math.sin(s * 0.19); }
function nearest(x, z) {
  let best = null;
  for (const g of seg) {
    let t = ((x - g.ax) * g.dx + (z - g.az) * g.dz) / g.len;
    t = Math.max(0, Math.min(1, t));
    const px = g.ax + g.dx * g.len * t, pz = g.az + g.dz * g.len * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) {
      const lat = (x - px) * -g.dz + (z - pz) * g.dx;
      best = { d, s: g.s0 + g.len * t, px, pz, lat, hw: (g.w0 + (g.w1 - g.w0) * t) / 2, g };
    }
  }
  return best;
}
function pointAt(s) {
  for (const g of seg) if (s <= g.s0 + g.len || g === seg[seg.length - 1]) {
    const t = Math.max(0, Math.min(1, (s - g.s0) / g.len));
    return { x: g.ax + g.dx * g.len * t, z: g.az + g.dz * g.len * t, dx: g.dx, dz: g.dz, hw: (g.w0 + (g.w1 - g.w0) * t) / 2 };
  }
}

/* ================= 렌더러 ================= */
const canvas = $('view');
const renderer = new T.WebGLRenderer({ canvas, antialias: !mobile });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.75));
const scene = new T.Scene();
const FOG = 0x10131d;
scene.background = new T.Color(FOG);
scene.fog = new T.FogExp2(FOG, 0.032);
const camera = new T.PerspectiveCamera(72, 1, 0.05, 400);
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
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, h - 30, w, 30);
  });
  const emissive = tex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 4; fy++) for (let wx = 0; wx < 3; wx++) if (R() < 0.35) { g.fillStyle = R() < 0.7 ? '#ffcf8a' : '#cfe3ff'; g.globalAlpha = rr(0.4, 0.9); g.fillRect(26 + wx * 76, 42 + fy * 120, 48, 58); }
    g.globalAlpha = 1;
  });
  return new T.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: emissive, emissiveIntensity: 0.9 });
}
const facadeMats = FACADES.map(facadeTex);
function signTex(text, bg, fg) {
  return tex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = '900 54px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3);
  });
}

/* ---------- 땅 ---------- */
(function ground() {
  const pos = [], uv = [], idx = [], step = 1;
  let row = 0;
  for (let s = 0; s <= LEN + 0.01; s += step, row++) {
    const p = pointAt(Math.min(s, LEN)), y = elev(s), ext = p.hw + 7;
    const nx = -p.dz, nz = p.dx;
    pos.push(p.x - nx * ext, y, p.z - nz * ext, p.x + nx * ext, y, p.z + nz * ext);
    uv.push(-ext / 4, s / 4, ext / 4, s / 4);
    if (row) { const a = (row - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: asphalt, side: T.DoubleSide })));
  // 출발 쪽과 끝 쪽을 덮는 큰 바닥
  const base = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshLambertMaterial({ color: 0x16171b }));
  base.rotation.x = -Math.PI / 2; base.position.set(0, -0.6, -100); scene.add(base);
})();

/* ---------- 건물 ---------- */
const colliders = []; // 원 {x,z,r}
function block(x, y, z, w, h, d, rotY, mat) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = rotY;
  const t = mat.map; if (t) { m.geometry.attributes.uv.array.forEach((v, i, a) => { /* 비율 맞춤 */ }); }
  scene.add(m); return m;
}
(function buildings() {
  for (const side of [-1, 1]) {
    let s = side < 0 ? 0 : 3;
    while (s < LEN - 6) {
      const w = rr(5, 11), p = pointAt(s + w / 2), y0 = elev(s + w / 2) - 2;
      if (R() < 0.13) { s += rr(2.5, 4); continue; } // 좁은 샛길
      const h = rr(7, 21), d = rr(8, 12);
      const nx = -p.dz, nz = p.dx, off = p.hw + d / 2 + rr(0, 0.8);
      const mat = facadeMats[Math.floor(R() * facadeMats.length)].clone();
      mat.map = mat.map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(w / 7, (h + 2) / 13);
      mat.emissiveMap = mat.emissiveMap.clone(); mat.emissiveMap.needsUpdate = true; mat.emissiveMap.repeat.copy(mat.map.repeat);
      const rot = Math.atan2(p.dx, p.dz) + rr(-0.05, 0.05);
      block(p.x + nx * off * side, y0, p.z + nz * off * side, w, h + 2, d, rot, mat);
      // 에어컨 실외기, 간판
      if (R() < 0.5) { const ac = new T.Mesh(new T.BoxGeometry(0.9, 0.7, 0.5), new T.MeshLambertMaterial({ color: 0xc9c9c2 })); ac.position.set(p.x + nx * (p.hw + 0.25) * side, elev(s + w / 2) + rr(2.4, 6), p.z + nz * (p.hw + 0.25) * side); ac.rotation.y = rot; scene.add(ac); }
      if (R() < 0.42) {
        const words = ['노래방', 'PC방', '부동산', '치킨', '분식', '당구장', '세탁소', '꽃집', '고시원', '수학학원'];
        const colors = [['#d23b3b', '#fff'], ['#1e3c8c', '#fff'], ['#f2c230', '#111'], ['#111', '#ffef9a'], ['#2a7d4f', '#fff']];
        const [bg, fg] = colors[Math.floor(R() * colors.length)];
        const sg = new T.Mesh(new T.BoxGeometry(0.25, 0.9, 2.4), [0, 1, 2, 3, 4, 5].map(i => (i === 0 || i === 1) ? new T.MeshBasicMaterial({ map: signTex(words[Math.floor(R() * words.length)], bg, fg) }) : new T.MeshLambertMaterial({ color: 0x222222 })));
        sg.position.set(p.x + nx * (p.hw + 0.9) * side, elev(s + w / 2) + rr(3.2, 5.5), p.z + nz * (p.hw + 0.9) * side);
        sg.rotation.y = rot + Math.PI / 2; scene.add(sg);
      }
      s += w + rr(0, 0.6);
    }
  }
})();

/* ---------- 전봇대, 전선, 가로등 ---------- */
const lamps = [];
(function poles() {
  const poleMat = new T.MeshLambertMaterial({ color: 0x55544f });
  const wireMat = new T.LineBasicMaterial({ color: 0x0a0a0a });
  let prev = null;
  for (let s = 8, i = 0; s < LEN - 4; s += rr(17, 26), i++) {
    const p = pointAt(s), side = i % 2 ? 1 : -1, nx = -p.dz, nz = p.dx, y = elev(s);
    const x = p.x + nx * (p.hw - 0.35) * side, z = p.z + nz * (p.hw - 0.35) * side;
    const pole = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 9, 7), poleMat); pole.position.set(x, y + 4.5, z); pole.rotation.z = rr(-0.03, 0.03); scene.add(pole);
    const arm = new T.Mesh(new T.BoxGeometry(1.6, 0.12, 0.12), poleMat); arm.position.set(x, y + 8.2, z); arm.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI / 2; scene.add(arm);
    colliders.push({ x, z, r: 0.35 });
    if (prev) for (let k = 0; k < 3; k++) {
      const a = new T.Vector3(prev.x, prev.y + 8.2 - k * 0.3, prev.z), b = new T.Vector3(x, y + 8.2 - k * 0.3, z), pts = [];
      for (let q = 0; q <= 12; q++) { const v = a.clone().lerp(b, q / 12); v.y -= Math.sin(Math.PI * q / 12) * (0.9 + k * 0.2); pts.push(v); }
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wireMat));
    }
    prev = { x, y, z };
    // 가로등 (몇 개만 진짜 빛을 낸다)
    const bulb = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), new T.MeshBasicMaterial({ color: 0xffd89a }));
    const lx = x - nx * side * 0.9, lz = z - nz * side * 0.9; bulb.position.set(lx, y + 6.3, lz); scene.add(bulb);
    const lampArm = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 1), poleMat); lampArm.position.set((x + lx) / 2, y + 6.45, (z + lz) / 2); lampArm.lookAt(lx, y + 6.45, lz); scene.add(lampArm);
    if (lamps.length < 8) { const L = new T.PointLight(0xffc98a, 2.4, 26, 2); L.position.set(lx, y + 6, lz); scene.add(L); lamps.push(L); }
  }
})();

/* ---------- 주차된 차, 쓰레기 봉투 ---------- */
(function clutter() {
  const carColors = [0xd8d8d4, 0x1d1f24, 0x6b1d1d, 0x3c4a5c, 0x8a8a80];
  for (let s = 20; s < LEN - 20; s += rr(26, 44)) {
    const p = pointAt(s), side = R() < 0.5 ? -1 : 1, nx = -p.dz, nz = p.dx, y = elev(s);
    const off = p.hw - 1.05, x = p.x + nx * off * side, z = p.z + nz * off * side, rot = Math.atan2(p.dx, p.dz) + rr(-0.06, 0.06);
    const mat = new T.MeshLambertMaterial({ color: carColors[Math.floor(R() * carColors.length)] });
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.75, 0.75, 4.3), mat); body.position.y = 0.6; g.add(body);
    const cab = new T.Mesh(new T.BoxGeometry(1.55, 0.6, 2.2), new T.MeshLambertMaterial({ color: 0x20242c })); cab.position.set(0, 1.25, -0.2); g.add(cab);
    for (const wx of [-0.8, 0.8]) for (const wz of [-1.3, 1.3]) { const w = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.2, 10), new T.MeshLambertMaterial({ color: 0x0c0c0c })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); g.add(w); }
    g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
    colliders.push({ x: x + p.dx * 1.2, z: z + p.dz * 1.2, r: 1.05 }, { x: x - p.dx * 1.2, z: z - p.dz * 1.2, r: 1.05 });
  }
  const bagMat = new T.MeshLambertMaterial({ color: 0x15161a });
  for (let s = 6; s < LEN - 10; s += rr(9, 18)) {
    const p = pointAt(s), side = R() < 0.5 ? -1 : 1, nx = -p.dz, nz = p.dx, y = elev(s);
    for (let k = 0; k < 2 + Math.floor(R() * 4); k++) {
      const b = new T.Mesh(new T.SphereGeometry(rr(0.28, 0.45), 8, 6), k % 3 ? bagMat : new T.MeshLambertMaterial({ color: 0xdedbd0 }));
      b.scale.y = 0.75; b.position.set(p.x + nx * (p.hw - 0.35) * side + rr(-0.5, 0.5), y + 0.25, p.z + nz * (p.hw - 0.35) * side + rr(-0.5, 0.5)); scene.add(b);
    }
  }
})();

/* ---------- 편의점과 학원 정문 ---------- */
const GOAL = (() => {
  const p = pointAt(LEN), y = elev(LEN);
  const wall = new T.Mesh(new T.BoxGeometry(16, 16, 2), facadeMats[6]); wall.position.set(p.x + p.dx * 1.2, y + 7, p.z + p.dz * 1.2); wall.rotation.y = Math.atan2(p.dx, p.dz); scene.add(wall);
  const door = new T.Mesh(new T.PlaneGeometry(2.4, 2.6), new T.MeshBasicMaterial({ color: 0xfff3d6 })); door.position.set(p.x + p.dx * 0.15, y + 1.3, p.z + p.dz * 0.15); door.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI; scene.add(door);
  const sign = new T.Mesh(new T.PlaneGeometry(4, 1.4), new T.MeshBasicMaterial({ map: signTex('학원 정문', '#ffffff', '#111111') })); sign.position.set(p.x + p.dx * 0.12, y + 3.4, p.z + p.dz * 0.12); sign.rotation.y = door.rotation.y; scene.add(sign);
  const L = new T.PointLight(0xfff0d0, 1.4, 14, 2); L.position.set(p.x - p.dx * 2, y + 3, p.z - p.dz * 2); scene.add(L);
  // 편의점 (보스 자리)
  const cs = pointAt(LEN - 14), cy = elev(LEN - 14), nx = -cs.dz, nz = cs.dx;
  const glass = new T.Mesh(new T.PlaneGeometry(6, 2.6), new T.MeshBasicMaterial({ color: 0xd9f2ff })); glass.position.set(cs.x + nx * (cs.hw - 0.02), cy + 1.4, cs.z + nz * (cs.hw - 0.02)); glass.rotation.y = Math.atan2(cs.dx, cs.dz) - Math.PI / 2; scene.add(glass);
  const csign = new T.Mesh(new T.PlaneGeometry(5, 0.9), new T.MeshBasicMaterial({ map: signTex('24시 편의점', '#1d63c9', '#ffffff') })); csign.position.set(glass.position.x, cy + 3.2, glass.position.z); csign.rotation.y = glass.rotation.y; scene.add(csign);
  const cl = new T.PointLight(0xcfe8ff, 1.5, 16, 2); cl.position.set(cs.x + nx * (cs.hw - 2), cy + 2.5, cs.z + nz * (cs.hw - 2)); scene.add(cl);
  return { x: p.x, z: p.z, store: cs };
})();

/* ================= 사람들 ================= */
const TYPES = {
  office:  { name: '회사원', pts: 100, hp: 1, look: [999, 999], turn: 1.6, chase: 4.0, chaseT: 3, shirt: 0x24304a, pants: 0x1d1f26, skin: 0xe0b896, w: 1, h: 1, phone: true },
  student: { name: '대학생', pts: 150, hp: 1, look: [4, 7], turn: 2.2, chase: 5.2, chaseT: 3.5, shirt: null, pants: 0x34404f, skin: 0xe8c3a0, w: 1, h: 1 },
  retake:  { name: '재수생', pts: 220, hp: 1, look: [1.1, 2.2], turn: 3.2, chase: 6.0, chaseT: 3, shirt: 0x6c6f75, pants: 0x2b2d33, skin: 0xe5bf9b, w: 0.95, h: 1, hood: true, bag: true },
  grandpa: { name: '할아버지', pts: 250, hp: 1, look: [3, 6], turn: 0.9, chase: 0, chaseT: 0, shirt: 0x6b5236, pants: 0x4a4740, skin: 0xd6a882, w: 0.95, h: 0.93, cap: true, hunch: true, yell: true },
  thin:    { name: '문신 멸치', pts: 320, hp: 1, look: [2, 3.6], turn: 4.5, chase: 7.0, chaseT: 3.4, shirt: 0x121212, pants: 0x1a1c20, skin: 0xd9ae8a, w: 0.72, h: 1.03, tattoo: true },
  pig:     { name: '문신 돼지', pts: 450, hp: 2, look: [3, 5], turn: 1.1, chase: 4.7, chaseT: 5, shirt: 0xf2f2f2, pants: 0x1a1c20, skin: 0xdcae86, w: 1.55, h: 1.0, tattoo: true },
  boss:    { name: '헬스장 관장님', pts: 1000, hp: 3, look: [2.5, 4], turn: 1.5, chase: 7.4, chaseT: 9, shirt: 0xc0262b, pants: 0x1b1b1f, skin: 0xc98f62, w: 1.45, h: 1.12, tank: true, tattoo: false },
};
const JACKETS = [0x2f5a3c, 0x8a3b2b, 0x2a3f6d, 0xbfa36b, 0x5a2f5e];
function tattooTex(skin) {
  return tex(64, 128, (g, w, h) => {
    g.fillStyle = '#' + skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(20,30,50,0.85)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(R() * w, R() * h); g.bezierCurveTo(R() * w, R() * h, R() * w, R() * h, R() * w, R() * h); g.stroke(); }
    g.fillStyle = 'rgba(150,30,30,0.7)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(R() * w, R() * h, 5, 0, 7); g.fill(); }
  });
}
function makePerson(type) {
  const ty = TYPES[type], g = new T.Group(), body = new T.Group();
  const L = c => new T.MeshLambertMaterial({ color: c });
  const shirt = ty.shirt ?? JACKETS[Math.floor(R() * JACKETS.length)];
  const armMat = ty.tattoo ? new T.MeshLambertMaterial({ map: tattooTex(ty.skin) }) : (ty.tank ? L(ty.skin) : L(shirt));
  const W = ty.w, H = ty.h;
  const legs = [];
  for (const sx of [-0.13, 0.13]) { const leg = new T.Mesh(new T.BoxGeometry(0.17 * W, 0.85, 0.2), L(ty.pants)); leg.geometry.translate(0, -0.425, 0); leg.position.set(sx * W, 0.85, 0); body.add(leg); legs.push(leg); }
  const torso = new T.Mesh(new T.BoxGeometry(0.46 * W, 0.62, 0.26 * Math.max(1, W * 0.85)), L(shirt)); torso.position.y = 1.16; body.add(torso);
  const arms = [];
  for (const sx of [-1, 1]) { const arm = new T.Mesh(new T.BoxGeometry(0.13 * Math.max(1, W * 0.9), 0.6, 0.14), armMat); arm.geometry.translate(0, -0.28, 0); arm.position.set(sx * (0.23 * W + 0.07), 1.44, 0); body.add(arm); arms.push(arm); }
  const head = new T.Group(); head.position.y = 1.47 + 0.06;
  const skull = new T.Mesh(new T.BoxGeometry(0.24, 0.27, 0.25), L(ty.skin)); skull.position.y = 0.13; head.add(skull);
  const hair = new T.Mesh(new T.BoxGeometry(0.26, 0.08, 0.27), L(type === 'grandpa' ? 0xbbbbb4 : 0x141210)); hair.position.set(0, 0.28, -0.01); head.add(hair);
  if (ty.cap) { const cap = new T.Mesh(new T.BoxGeometry(0.28, 0.07, 0.34), L(0x4a4033)); cap.position.set(0, 0.3, 0.03); head.add(cap); }
  if (ty.hood) { const hood = new T.Mesh(new T.BoxGeometry(0.3, 0.32, 0.28), L(shirt)); hood.position.set(0, 0.14, -0.05); head.add(hood); }
  if (ty.bag) { const bag = new T.Mesh(new T.BoxGeometry(0.34, 0.42, 0.16), L(0x1f3a5f)); bag.position.set(0, 1.18, -0.22); body.add(bag); }
  body.add(head);
  // 담배 (오른손 입가), 회사원은 왼손에 전화기
  const cig = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.09), new T.MeshBasicMaterial({ color: 0xf2efe6 })); cig.position.set(0.05, 0.08, 0.15); head.add(cig);
  const ember = new T.Mesh(new T.SphereGeometry(0.014, 6, 4), new T.MeshBasicMaterial({ color: 0xff6a20 })); ember.position.set(0.05, 0.08, 0.2); head.add(ember);
  arms[1].rotation.x = -1.9; arms[1].rotation.z = -0.25;
  if (ty.phone) { const ph = new T.Mesh(new T.BoxGeometry(0.03, 0.14, 0.07), L(0x111111)); ph.position.set(-0.14, 0.12, 0.02); head.add(ph); arms[0].rotation.x = -2.2; arms[0].rotation.z = 0.5; }
  if (ty.hunch) { body.rotation.x = 0.18; }
  body.scale.set(1, H, 1);
  g.add(body);
  // 머리 위 표시
  const mark = new T.Sprite(new T.SpriteMaterial({ map: signTex('!', '#ffffff', '#111111'), depthTest: false }));
  mark.scale.set(0.5, 0.2, 1); mark.position.y = 2.15 * H; mark.visible = false; g.add(mark);
  return { g, body, head, legs, arms, ember, mark, type, ty };
}

const npcs = [];
function place(type, s, side, faceOff = 0) {
  const p = pointAt(s), nx = -p.dz, nz = p.dx, y = elev(s);
  const off = (p.hw - 0.7) * side;
  const n = makePerson(type);
  const x = p.x + nx * off, z = p.z + nz * off;
  // 기본은 벽을 등지거나 골목 안쪽을 보며 피운다. 방향은 제각각.
  const toward = Math.atan2(-nx * side, -nz * side);
  const yaw = toward + faceOff + rr(-0.9, 0.9);
  n.g.position.set(x, y, z); n.g.rotation.y = yaw; scene.add(n.g);
  Object.assign(n, { home: { x, z, yaw }, yaw, state: 'idle', timer: rr(0.5, 3), hp: n.ty.hp, done: false, s, look: 0, chaseLeft: 0, walk: 0, group: null });
  npcs.push(n);
  return n;
}
function layout() {
  npcs.forEach(n => scene.remove(n.g)); npcs.length = 0;
  place('office', 18, 1, 0.4);
  const g1 = [place('student', 34, -1), place('student', 35.3, -1, 1.2), place('student', 33, -1, -0.8)];
  g1.forEach(n => n.group = g1);
  place('grandpa', 52, 1);
  place('retake', 68, -1, Math.PI);
  place('thin', 84, 1);
  place('office', 99, -1, 2.0);
  place('pig', 116, 1, 0.3);
  const g2 = [place('student', 132, -1, 0.5), place('student', 133.4, -1, 2.6)];
  g2.forEach(n => n.group = g2);
  place('thin', 147, -1);
  place('grandpa', 158, 1, 1.0);
  place('retake', 171, 1);
  place('pig', 184, -1, 2.4);
  // 보스는 편의점 앞
  const bs = LEN - 14, bp = pointAt(bs);
  const boss = place('boss', bs, 1, 0.2);
  void bp;
  return boss;
}

/* ---------- 담배 연기 ---------- */
const SMOKE = 260, smokePos = new Float32Array(SMOKE * 3), smokeLife = new Float32Array(SMOKE);
const smokeGeo = new T.BufferGeometry(); smokeGeo.setAttribute('position', new T.BufferAttribute(smokePos, 3));
const smokePts = new T.Points(smokeGeo, new T.PointsMaterial({ color: 0xbfc4cc, size: 0.16, transparent: true, opacity: 0.28, depthWrite: false }));
smokePts.frustumCulled = false; scene.add(smokePts);
let smokeI = 0;
const _v = new T.Vector3();
function puff(n) { n.ember.getWorldPosition(_v); for (let k = 0; k < 2; k++) { const i = smokeI++ % SMOKE; smokePos[i * 3] = _v.x; smokePos[i * 3 + 1] = _v.y; smokePos[i * 3 + 2] = _v.z; smokeLife[i] = 2.2 + Math.random(); } }

/* ---------- 1인칭 팔 ---------- */
const fist = new T.Group();
const armMesh = new T.Mesh(new T.BoxGeometry(0.07, 0.07, 0.32), new T.MeshLambertMaterial({ color: 0x2b3442 }));
armMesh.position.z = -0.16; fist.add(armMesh);
const hand = new T.Mesh(new T.BoxGeometry(0.085, 0.08, 0.085), new T.MeshLambertMaterial({ color: 0xe2b896 })); hand.position.z = -0.34; fist.add(hand);
fist.position.set(0.3, -0.34, -0.3); camera.add(fist);
let swing = 0;

/* ================= 플레이어 ================= */
const P = { x: 0, z: 2, y: 0, yaw: Math.PI, pitch: 0.02, vx: 0, vz: 0, stamina: 100, lives: 3, score: 0, hits: 0, time: 0, invuln: 0, bob: 0, shake: 0 };
let keys = {}, playing = false, running = false, runBtn = false;
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
function constrain(o, r = 0.35) {
  const n = nearest(o.x, o.z), lim = n.hw - r;
  if (Math.abs(n.lat) > lim) { const k = (Math.abs(n.lat) - lim) * Math.sign(n.lat); o.x -= -n.g.dz * k; o.z -= n.g.dx * k; }
  for (const c of colliders) { const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; } }
  // 골목 밖(출발 뒤쪽, 정문 뒤쪽)으로 못 나간다
  const nn = nearest(o.x, o.z);
  if (nn.s <= 0.01 && o.z > 3) o.z = 3;
  return nn;
}

/* ---------- 입력 ---------- */
addEventListener('keydown', e => { keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); if (e.code === 'Space' && playing) hit(); });
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
  } else {
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
$('hitBtn').addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
$('runBtn').addEventListener('pointerdown', e => { e.preventDefault(); runBtn = !runBtn; $('runBtn').setAttribute('aria-pressed', runBtn); });

/* ---------- 효과음 (기본은 꺼짐) ---------- */
let ac = null, soundOn = false, noiseBuf = null, amb = null;
function audioInit() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ac = new AC(); } catch { return null; }
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
  amb = ac.createGain(); amb.gain.value = 0.05; s.connect(f); f.connect(amb); amb.connect(ac.destination); s.start();
  return ac;
}
function nz(type, freq, q, vol, dur) {
  if (!soundOn) return; const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
function tone(freq, dur, type = 'sine', vol = 0.1, to = freq) {
  if (!soundOn) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  slap: () => { nz('highpass', 1800, 0.7, 0.5, 0.07); tone(140, 0.12, 'sine', 0.35, 60); },
  whiff: () => nz('bandpass', 900, 1.5, 0.15, 0.18),
  yell: () => { tone(220, 0.5, 'sawtooth', 0.06, 160); setTimeout(() => tone(260, 0.4, 'sawtooth', 0.06, 190), 220); },
  grunt: () => tone(110, 0.3, 'sawtooth', 0.08, 70),
  caught: () => { tone(90, 0.4, 'square', 0.12, 40); nz('lowpass', 400, 0.5, 0.4, 0.3); },
  step: () => nz('lowpass', 700 + Math.random() * 300, 0.6, 0.12, 0.08),
  win: () => { tone(660, 0.25, 'triangle', 0.12); setTimeout(() => tone(990, 0.4, 'triangle', 0.12), 180); },
  alert: () => tone(880, 0.12, 'square', 0.04, 700),
};
$('snd').addEventListener('click', () => {
  if (!audioInit()) { $('snd').textContent = '소리 없음'; return; }
  soundOn = !soundOn; if (soundOn) ac.resume(); else ac.suspend();
  $('snd').setAttribute('aria-pressed', soundOn); $('snd').textContent = soundOn ? '소리 끄기' : '소리 켜기';
});
document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else if (soundOn) ac.resume(); } });

/* ---------- 알림 ---------- */
let toastT = 0;
function toast(t) { $('toast').textContent = t; $('toast').style.opacity = 1; toastT = 1.6; }

/* ================= 치기 ================= */
function facingDot(n, x, z) { const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), dx = x - n.g.position.x, dz = z - n.g.position.z, d = Math.hypot(dx, dz) || 1; return (fx * dx + fz * dz) / d; }
function target() {
  let best = null;
  const lx = -Math.sin(P.yaw), lz = -Math.cos(P.yaw);
  for (const n of npcs) {
    if (n.done && n.state !== 'chase') continue;
    const dx = n.g.position.x - P.x, dz = n.g.position.z - P.z, d = Math.hypot(dx, dz);
    if (d > 1.9) continue;
    const aim = (dx * lx + dz * lz) / (d || 1);
    if (aim < 0.6) continue;
    if (!best || d < best.d) best = { n, d };
  }
  return best && best.n;
}
function hit() {
  if (!playing || swing > 0) return;
  swing = 0.28;
  const n = target();
  if (!n || n.done) { sfx.whiff(); return; }
  const behind = facingDot(n, P.x, P.z) < -0.2 && n.state !== 'look';
  if (!behind) {
    // 앞에서 들켰다
    sfx.grunt(); toast(`${n.ty.name}한테 들켰어요! 뒤에서 쳐야 해요`);
    hurt(n);
    n.state = 'look'; n.timer = 2; n.mark.visible = true;
    return;
  }
  sfx.slap(); P.shake = 0.25;
  n.hp--;
  n.headKick = 0.4;
  if (n.hp > 0) {
    toast(`퍽! ${n.ty.name} (${n.ty.hp - n.hp}/${n.ty.hp})`);
    n.state = 'turnTo'; n.timer = 0.6; n.mark.visible = true;
    return;
  }
  P.score += n.ty.pts; P.hits++;
  n.done = true;
  toast(`퍽! ${n.ty.name} +${n.ty.pts}`);
  if (n.ty.yell) {
    sfx.yell(); toast(`${n.ty.name}: "이놈!" 골목 사람들이 돌아봐요`);
    for (const o of npcs) if (o !== n && !o.done && Math.hypot(o.g.position.x - n.g.position.x, o.g.position.z - n.g.position.z) < 16) { o.state = 'look'; o.timer = 3.5; o.mark.visible = true; }
    n.state = 'idle';
  } else if (n.ty.chase > 0) {
    n.state = 'stun'; n.timer = n.type === 'thin' ? 0.45 : 0.8; n.chaseLeft = n.ty.chaseT; n.mark.visible = true;
  }
  if (n.group) for (const o of n.group) if (o !== n && !o.done) { o.state = 'look'; o.timer = 2.5; o.mark.visible = true; }
}
function hurt(n) {
  if (P.invuln > 0) return;
  P.lives--; P.invuln = 1.6; P.shake = 0.5; sfx.caught();
  // 조금 밀려난다
  const dx = P.x - n.g.position.x, dz = P.z - n.g.position.z, d = Math.hypot(dx, dz) || 1;
  P.x += dx / d * 2.2; P.z += dz / d * 2.2; constrain(P);
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
  switch (n.state) {
    case 'idle': {
      if (!n.done && n.timer <= 0) {
        const glanceBack = n.type === 'retake' && Math.random() < 0.5;
        n.wantYaw = n.home.yaw + (glanceBack ? Math.PI + rr(-0.6, 0.6) : rr(-1.2, 1.2));
        n.timer = rr(n.ty.look[0], n.ty.look[1]);
      }
      if (n.wantYaw != null) turnToward(n, n.wantYaw, n.ty.turn, dt);
      // 앞에서 가까이 다가오면 수상하게 쳐다본다
      if (!n.done && pd < 3.2 && facingDot(n, P.x, P.z) > 0.55 && n.type !== 'office') { n.state = 'look'; n.timer = 1.6; n.mark.visible = true; sfx.alert(); }
      if (Math.random() < dt * 0.8) puff(n);
      break;
    }
    case 'look': turnToward(n, angleTo(n, P.x, P.z), n.ty.turn * 1.4, dt); if (n.timer <= 0) { n.state = 'idle'; n.mark.visible = false; n.wantYaw = n.home.yaw; n.timer = rr(1, 3); } break;
    case 'turnTo': {
      if (n.timer > 0) break;
      const left = turnToward(n, angleTo(n, P.x, P.z), n.ty.turn, dt);
      if (left < 0.4) { n.state = 'chase'; n.chaseLeft = n.ty.chaseT; sfx.grunt(); }
      break;
    }
    case 'stun': if (n.timer <= 0) { n.state = 'chase'; sfx.grunt(); } break;
    case 'chase': {
      n.chaseLeft -= dt;
      turnToward(n, angleTo(n, P.x, P.z), 6, dt);
      const sp = n.ty.chase * dt;
      const o = { x: n.g.position.x + Math.sin(n.yaw) * sp, z: n.g.position.z + Math.cos(n.yaw) * sp };
      constrain(o, 0.3 * n.ty.w + 0.1);
      n.g.position.x = o.x; n.g.position.z = o.z; n.walk += sp * 3;
      if (pd < 0.85) { hurt(n); n.state = 'back'; n.mark.visible = false; toast(`${n.ty.name}한테 잡혔어요!`); }
      else if (n.chaseLeft <= 0) { n.state = 'back'; n.mark.visible = false; }
      break;
    }
    case 'back': {
      const dx = n.home.x - n.g.position.x, dz = n.home.z - n.g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { n.state = 'idle'; n.wantYaw = n.home.yaw; n.timer = 2; break; }
      turnToward(n, Math.atan2(dx, dz), 4, dt);
      const sp = Math.min(d, 1.6 * dt); n.g.position.x += Math.sin(n.yaw) * sp; n.g.position.z += Math.cos(n.yaw) * sp; n.walk += sp * 3;
      break;
    }
    default: break;
  }
  n.g.position.y = elev(nearest(n.g.position.x, n.g.position.z).s);
  n.g.rotation.y = n.yaw;
  const sw = Math.sin(n.walk) * 0.6 * (n.state === 'chase' || n.state === 'back' ? 1 : 0);
  n.legs[0].rotation.x = sw; n.legs[1].rotation.x = -sw;
  if (n.headKick > 0) { n.headKick -= dt; n.head.rotation.x = Math.sin(n.headKick * 20) * 0.35; } else n.head.rotation.x = n.done && n.state === 'idle' ? 0.35 : 0;
  n.ember.material.color.setHSL(0.05, 1, 0.45 + Math.random() * 0.15);
}

let last = performance.now(), boss = null;
function update(dt) {
  P.time += dt;
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz += 1; if (keys.KeyS || keys.ArrowDown) fz -= 1;
  if (keys.KeyD || keys.ArrowRight) fx += 1; if (keys.KeyA || keys.ArrowLeft) fx -= 1;
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
  if (Math.floor(P.bob / 1.9) !== Math.floor((P.bob - moved) / 1.9)) sfx.step();
  if (P.invuln > 0) P.invuln -= dt;
  for (const q of npcs) updateNPC(q, dt);
  // 목표
  if (Math.hypot(P.x - GOAL.x, P.z - GOAL.z) < 2.2) end(true);
  // 연기
  for (let i = 0; i < SMOKE; i++) { if (smokeLife[i] > 0) { smokeLife[i] -= dt; smokePos[i * 3 + 1] += dt * 0.45; smokePos[i * 3] += Math.sin(P.time + i) * dt * 0.08; if (smokeLife[i] <= 0) smokePos[i * 3 + 1] = -99; } }
  smokeGeo.attributes.position.needsUpdate = true;
  // 화면 표시
  const tgt = target();
  const pr = $('prompt');
  if (tgt && !tgt.done) { const behind = facingDot(tgt, P.x, P.z) < -0.2 && tgt.state !== 'look'; pr.hidden = false; pr.textContent = behind ? (mobile ? '치기!' : '치기! (Space·클릭)') : '앞이에요. 뒤로 돌아가세요'; }
  else pr.hidden = true;
  const left = Math.max(0, LEN - n.s);
  $('hud').textContent = `점수 ${P.score.toLocaleString('ko-KR')}  ·  목숨 ${'■'.repeat(P.lives)}${'□'.repeat(3 - P.lives)}  ·  학원까지 ${Math.round(left)}m  ·  숨 ${Math.round(P.stamina)}`;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) update(dt); else { P.yaw += dt * 0.05; }
  // 카메라
  const bob = calm ? 0 : Math.sin(P.bob * Math.PI / 1.9 * 2) * (running ? 0.06 : 0.035);
  let sx = 0, sy = 0; if (P.shake > 0) { P.shake -= dt; sx = (Math.random() - .5) * P.shake * 0.12; sy = (Math.random() - .5) * P.shake * 0.12; }
  camera.position.set(P.x + sx, P.y + 1.62 + bob + sy, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  if (swing > 0) { swing -= dt; const k = Math.sin((1 - swing / 0.28) * Math.PI); fist.position.set(0.3 - k * 0.24, -0.34 + k * 0.16, -0.3 - k * 0.3); fist.rotation.y = k * 0.5; }
  else { fist.position.set(0.3, -0.34 + bob * 0.4, -0.3); fist.rotation.y = 0; }
  renderer.render(scene, camera);
}

/* ================= 시작과 끝 ================= */
function start() {
  boss = layout();
  Object.assign(P, { x: 0, z: 1.5, yaw: Math.PI * 0, pitch: 0.03, vx: 0, vz: 0, stamina: 100, lives: 3, score: 0, hits: 0, time: 0, invuln: 0, shake: 0 });
  P.yaw = 0; // -z 방향(골목 안쪽)을 본다
  playing = true;
  $('startPanel').hidden = true; $('endPanel').hidden = true;
  $('hud').hidden = false; $('cross').hidden = false;
  if (mobile) { $('stick').hidden = false; $('hitBtn').hidden = false; $('runBtn').hidden = false; }
  lock();
  toast('학원까지 가세요. 뒤통수는 뒤에서만!');
}
async function end(win) {
  if (!playing) return;
  playing = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch { /* 무시 */ }
  $('hud').hidden = true; $('cross').hidden = true; $('prompt').hidden = true;
  $('stick').hidden = true; $('hitBtn').hidden = true; $('runBtn').hidden = true;
  const timeBonus = win ? Math.max(0, Math.round((150 - P.time) * 5)) : 0;
  const lifeBonus = win ? P.lives * 200 : 0;
  const total = P.score + timeBonus + lifeBonus;
  if (win) sfx.win();
  $('endTitle').textContent = win ? '학원 도착!' : '골목에서 붙잡혔어요';
  const dl = $('endStats'); dl.textContent = '';
  const row = (k, v) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); };
  row('뒤통수', `${P.hits}명 · ${P.score.toLocaleString('ko-KR')}점`);
  row('걸린 시간', `${Math.round(P.time)}초${win ? ` · 보너스 ${timeBonus}점` : ''}`);
  row('남은 목숨', `${P.lives}개${win ? ` · 보너스 ${lifeBonus}점` : ''}`);
  row('합계', `${total.toLocaleString('ko-KR')}점`);
  $('endMsg').textContent = '';
  $('endPanel').hidden = false;
  $('endMsg').textContent = await submitScore('alley', total);
}
$('go').addEventListener('click', start);
$('again').addEventListener('click', start);
$('home').addEventListener('click', () => { location.href = '../../#/'; });

layout();
P.x = 0; P.z = 1.5; P.y = elev(0); P.yaw = 0;
requestAnimationFrame(frame);
window.__alley = { P, npcs, get playing() { return playing; }, start, hit, nearest, LEN, tp: s => { const p = pointAt(s); P.x = p.x; P.z = p.z; P.yaw = Math.atan2(-p.dx, -p.dz); } };
