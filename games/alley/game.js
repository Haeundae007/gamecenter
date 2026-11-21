// 흡연충 뻑치기 — 1인칭. 명학역 1번 출구에서 만안로 골목을 따라 에스키스안양 A동까지.
// 길과 일부 건물은 OpenStreetMap 데이터(map.js)를 쓴다.
// 화면에 글로 상황을 설명하지 않는다. 생김새·동작·소리·화면 효과로만 보여 준다.
// 가벼움: 움직이지 않는 물체는 재질별로 한 덩어리로 합쳐서 그리고, 진짜 조명은 플레이어 근처 몇 개만 켠다.
import { submitScore } from '../../js/gc.js?v=3';
import { ROUTE, BUILDINGS } from './map.js?v=3';

const $ = id => document.getElementById(id);
const T = window.THREE;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches;

/* ================= 길 ================= */
const seg = [];
let LEN = 0;
// 실제 구간(540m)은 너무 길어서 앞쪽 절반만 쓴다. 집(에스키스)은 그 끝에 둔다.
const MAX_LEN = 270;
for (let i = 0; i < ROUTE.length - 1 && LEN < MAX_LEN; i++) {
  const [ax, az] = ROUTE[i], [bx0, bz0] = ROUTE[i + 1], full = Math.hypot(bx0 - ax, bz0 - az);
  const len = Math.min(full, MAX_LEN - LEN), k = len / full;
  const bx = ax + (bx0 - ax) * k, bz = az + (bz0 - az) * k;
  seg.push({ ax, az, bx, bz, len, s0: LEN, dx: (bx - ax) / len, dz: (bz - az) / len });
  LEN += len;
}
// 역 앞만 조금 넓고, 그 뒤로는 차 한 대가 겨우 지나가는 상가 골목
function halfWidth(s) { return s < 20 ? 5.5 - s * 0.12 : 3.1 + Math.sin(s * 0.07) * 0.35 + Math.sin(s * 0.023) * 0.25; }
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
  const c = Math.max(0, Math.min(LEN, s));
  for (const g of seg) if (c <= g.s0 + g.len + 1e-6) {
    const t = (c - g.s0) / g.len;
    // 끝 너머는 마지막 방향으로 연장 (전철이 쓴다)
    const extra = s < 0 ? s : s > LEN ? s - LEN : 0;
    const gg = s < 0 ? seg[0] : g;
    return { x: g.ax + g.dx * g.len * t + gg.dx * extra, z: g.az + g.dz * g.len * t + gg.dz * extra, dx: gg.dx, dz: gg.dz, hw: halfWidth(c) };
  }
}

/* ================= 렌더러 ================= */
const canvas = $('view');
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1));
const scene = new T.Scene();
const FOG = 0x161a26;
scene.background = new T.Color(FOG);
scene.fog = new T.FogExp2(FOG, 0.03);
const camera = new T.PerspectiveCamera(72, 1, 0.05, 260);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new T.HemisphereLight(0x8a96b8, 0x2a2018, 1.05));
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------- 텍스처 ---------- */
const R = (() => { let s = 90210; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const rr = (a, b) => a + R() * (b - a);
function tex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}
function noise(g, w, h, base, amp, n) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (R() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
}
function signTex(text, bg, fg, vertical) {
  const w = vertical ? 96 : 256, h = vertical ? 320 : 96;
  return tex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) { const chars = [...text]; const sz = Math.min(64, (h - 30) / chars.length); g.font = `900 ${sz}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`; chars.forEach((c, i) => g.fillText(c, w / 2, 18 + sz / 2 + i * sz)); }
    else { g.font = '900 52px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; g.fillText(text, w / 2, h / 2 + 3); }
  });
}
const L = c => new T.MeshLambertMaterial({ color: c });

// 골목 바닥: 가운데 보도블록, 양 끝 배수로와 맨홀 (u는 폭, v는 4m)
const pavingTex = tex(256, 256, (g, w, h) => {
  noise(g, w, h, '#4a4845', 0.14, 4000);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(26, y); g.lineTo(w - 26, y); g.stroke(); }
  for (let y = 0; y < h; y += 16) for (let x = 26 + ((y / 16) % 2) * 16; x < w - 26; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 8; i++) g.fillRect(rr(30, w - 60), rr(0, h), rr(20, 60), rr(8, 30)); // 덧댄 아스팔트
  for (const x of [0, w - 26]) { g.fillStyle = '#2a2b2d'; g.fillRect(x, 0, 26, h); g.fillStyle = '#1a1b1d'; for (let y = 4; y < h; y += 10) g.fillRect(x + 4, y, 18, 4); }
  g.fillStyle = '#2b2c2e'; g.beginPath(); g.arc(w * 0.62, h * 0.4, 18, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.stroke();
});

const FACADES = ['#7d4a3a', '#a89a86', '#8a8f93', '#b9ad95', '#5f6266', '#94704f'];
const facadeMats = FACADES.map(base => {
  const map = tex(256, 512, (g, w, h) => {
    noise(g, w, h, base, 0.12, 3000);
    if (R() < 0.5) { g.strokeStyle = 'rgba(0,0,0,0.15)'; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    for (let fy = 0; fy < 4; fy++) for (let wx = 0; wx < 3; wx++) { g.fillStyle = '#15171c'; g.fillRect(24 + wx * 76, 40 + fy * 120, 52, 62); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 6; i++) g.fillRect(rr(0, w), rr(0, h), 3, rr(30, 120)); // 빗물 자국
  });
  const emissiveMap = tex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 4; fy++) for (let wx = 0; wx < 3; wx++) if (R() < 0.4) { g.fillStyle = R() < 0.7 ? '#ffcf8a' : '#cfe3ff'; g.globalAlpha = rr(0.4, 0.95); g.fillRect(26 + wx * 76, 42 + fy * 120, 48, 58); }
  });
  return new T.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap, emissiveIntensity: 0.85 });
});
// 1층 가게 앞면: 불 켜진 유리, 내려간 셔터, 밝은 편의점
const shopMats = [
  (() => { const map = tex(256, 128, (g, w, h) => { g.fillStyle = '#d9c7a4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${rr(0, 360)},50%,${rr(30, 60)}%)`; g.fillRect(rr(0, w), rr(40, h), rr(6, 20), rr(10, 30)); } g.fillStyle = '#333'; g.fillRect(0, 0, w, 6); for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 4, h); }); return new T.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3 }); })(),
  (() => { const map = tex(256, 128, (g, w, h) => { noise(g, w, h, '#8f9499', 0.1, 800); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(30,30,30,0.7)'; g.font = 'bold 30px sans-serif'; g.fillText(['임대', 'X', '♡', '24', ''][Math.floor(R() * 5)], rr(20, 180), rr(40, 110)); }); return new T.MeshLambertMaterial({ map }); })(),
  (() => { const map = tex(256, 128, (g, w, h) => { g.fillStyle = '#cfdbe6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = '#9fb0bf'; g.fillRect(10 + i * 62, 30, 50, 90); for (let k = 0; k < 6; k++) { g.fillStyle = `hsl(${rr(0, 360)},30%,50%)`; g.fillRect(14 + i * 62, 36 + k * 14, 42, 8); } } }); return new T.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.35 }); })(),
];
const darkMat = L(0x2a2c31), poleMat = L(0x55544f), acMat = L(0xc9c9c2), metalMat = L(0x6d6a66), sleeperMat = L(0x3a3128), fenceMat = L(0x3d4a3f);
const awningMats = [0xb3262b, 0x1f5a9b, 0x2a7d4f, 0xd99a1c, 0x444444].map(L);

/* ---------- 합치기 ---------- */
const batches = new Map();
function addGeo(geo, mat, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (matrix) g.applyMatrix4(matrix);
  if (!batches.has(mat)) batches.set(mat, []);
  batches.get(mat).push(g);
}
function boxGeo(w, h, d, tile) {
  const g = new T.BoxGeometry(w, h, d);
  if (tile) {
    const uv = g.attributes.uv, f = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) { const s = f[Math.floor(i / 4)]; uv.setXY(i, uv.getX(i) * s[0] / tile[0], uv.getY(i) * s[1] / tile[1]); }
  }
  return g;
}
const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S1 = new T.Vector3(1, 1, 1);
function at(x, y, z, ry = 0, rx = 0, rz = 0) { E.set(rx, ry, rz); Q.setFromEuler(E); return M4.compose(V.set(x, y, z), Q, S1).clone(); }
function addBox(w, h, d, mat, x, y, z, ry, tile, rx, rz) { addGeo(boxGeo(w, h, d, tile), mat, at(x, y, z, ry, rx, rz)); }
function flush() {
  for (const [mat, list] of batches) {
    const names = ['position', 'normal', 'uv'], arrays = {};
    names.forEach(n => { let len = 0; list.forEach(g => len += g.attributes[n] ? g.attributes[n].array.length : g.attributes.position.count * (n === 'uv' ? 2 : 3)); arrays[n] = new Float32Array(len); });
    const off = { position: 0, normal: 0, uv: 0 };
    list.forEach(g => names.forEach(n => { const a = g.attributes[n]; if (a) arrays[n].set(a.array, off[n]); off[n] += a ? a.array.length : g.attributes.position.count * (n === 'uv' ? 2 : 3); }));
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(arrays.position, 3));
    geo.setAttribute('normal', new T.BufferAttribute(arrays.normal, 3));
    geo.setAttribute('uv', new T.BufferAttribute(arrays.uv, 2));
    const m = new T.Mesh(geo, mat); m.matrixAutoUpdate = false; scene.add(m);
  }
  batches.clear();
}
const frame3 = s => { const p = pointAt(s); return { p, nx: -p.dz, nz: p.dx, rot: Math.atan2(p.dx, p.dz), y: elev(s) }; };

/* ---------- 바닥 ---------- */
(function ground() {
  const pos = [], uv = [], idx = [];
  let row = 0;
  for (let s = 0; s <= LEN + 0.01; s += 1, row++) {
    const { p, nx, nz, y } = frame3(Math.min(s, LEN)), hw = p.hw;
    pos.push(p.x - nx * hw, y, p.z - nz * hw, p.x + nx * hw, y, p.z + nz * hw);
    uv.push(0, s / 4, 1, s / 4);
    if (row) { const a = (row - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: pavingTex, side: T.DoubleSide })));
  const base = new T.Mesh(new T.PlaneGeometry(900, 900), L(0x1a1b1f)); base.rotation.x = -Math.PI / 2; base.position.set(-90, -1.2, -250); scene.add(base);
})();

/* ---------- 건물 ---------- */
const realSlots = [];
(function realBuildings() {
  for (const b of BUILDINGS) {
    const sh = new T.Shape(b.f.map(([x, z]) => new T.Vector2(x, -z)));
    const h = (b.lv || Math.round(rr(3, 7))) * 3.1;
    const c = b.f.reduce((a, q) => [a[0] + q[0] / b.f.length, a[1] + q[1] / b.f.length], [0, 0]);
    const nb = nearest(c[0], c[1]);
    if (nb.lat > 0 || nb.s > LEN + 10) continue; // 동쪽(철길 쪽)과 줄인 구간 밖은 비운다
    const geo = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 7, uv.getY(i) / 12);
    addGeo(geo, facadeMats[Math.floor(R() * facadeMats.length)], at(0, elev(nearest(c[0], c[1]).s) - 1.5, 0));
    realSlots.push({ x: c[0], z: c[1], r: Math.max(...b.f.map(q => Math.hypot(q[0] - c[0], q[1] - c[1]))) });
  }
})();
const nearReal = (x, z) => realSlots.some(r => Math.hypot(x - r.x, z - r.z) < r.r + 2);
const SHOP_WORDS = ['노래방', 'PC방', '부동산', '치킨', '분식', '세탁', '꽃집', '휴대폰', '김밥', '국밥', '미용실', '당구', '호프', '약국', '한의원', '고시원', '마트', '족발', '보쌈', '카페', '인쇄', '열쇠'];
const SIGN_COLORS = [['#d23b3b', '#fff'], ['#1e3c8c', '#fff'], ['#f2c230', '#111'], ['#111', '#ffef9a'], ['#2a7d4f', '#fff'], ['#ffffff', '#c22'], ['#6a2a8a', '#fff']];
const signs = [];
(function streetBuildings() {
  for (const side of [-1]) { // 건물은 서쪽에만. 동쪽은 가림막과 철길
    let s = 16;
    while (s < LEN - 10) {
      const w = rr(5, 11), mid = s + w / 2, { p, nx, nz, rot, y } = frame3(mid);
      const d = rr(9, 14), off = p.hw + d / 2;
      const cx = p.x + nx * off * side, cz = p.z + nz * off * side;
      if (nearReal(cx, cz)) { s += w; continue; }
      if (R() < 0.05) { s += rr(1.6, 2.2); continue; } // 사람 하나 지나갈 좁은 틈
      const floors = Math.round(rr(3, 6)), h = floors * 3.1 + 3.2;
      const r = rot + rr(-0.03, 0.03);
      addBox(w, h + 1.5, d, facadeMats[Math.floor(R() * facadeMats.length)], cx, y - 1.5 + (h + 1.5) / 2, cz, r, [7, 12]);
      // 1층 가게 (골목 쪽 면)
      const fx = p.x + nx * (p.hw + 0.06) * side, fz = p.z + nz * (p.hw + 0.06) * side;
      addBox(w - 0.3, 2.9, 0.1, shopMats[Math.floor(R() * shopMats.length)], fx, y + 1.45, fz, r + Math.PI / 2, null);
      addBox(w, 0.35, 0.3, darkMat, fx, y + 3.1, fz, r + Math.PI / 2);
      // 차양
      if (R() < 0.55) addBox(w * 0.9, 0.06, 1.1, awningMats[Math.floor(R() * awningMats.length)], p.x + nx * (p.hw - 0.45) * side, y + 2.85, p.z + nz * (p.hw - 0.45) * side, r + Math.PI / 2, null, side * 0.25, 0);
      // 에어컨 실외기, 가스 배관
      for (let k = 0; k < floors; k++) if (R() < 0.35) addBox(0.85, 0.65, 0.45, acMat, p.x + nx * (p.hw + 0.25) * side + p.dx * rr(-w / 3, w / 3), y + 4.5 + k * 3.1, p.z + nz * (p.hw + 0.25) * side + p.dz * rr(-w / 3, w / 3), r);
      if (R() < 0.5) addBox(0.06, h, 0.06, metalMat, fx + p.dx * rr(-w / 2.2, w / 2.2), y + h / 2, fz + p.dz * rr(-w / 2.2, w / 2.2), 0);
      // 튀어나온 세로 간판
      if (R() < 0.7) signs.push({ s: mid + rr(-w / 3, w / 3), side, y: y + rr(4.2, 7.5), text: SHOP_WORDS[Math.floor(R() * SHOP_WORDS.length)], col: SIGN_COLORS[Math.floor(R() * SIGN_COLORS.length)] });
      s += w + rr(0, 0.3);
    }
  }
  // 뒷줄: 서쪽 건물 뒤로 더 높은 건물을 빽빽하게 세워 하늘 빈틈을 막는다
  for (let s = -30; s < LEN + 40; s += rr(8, 14)) {
    const { p, nx, nz, rot, y } = frame3(s), w = rr(9, 15), d = rr(10, 16), h = rr(14, 30);
    const off = p.hw + 15 + d / 2 + rr(0, 4);
    addBox(w, h, d, facadeMats[Math.floor(R() * facadeMats.length)], p.x - nx * off, y - 1.5 + h / 2, p.z - nz * off, rot + rr(-0.08, 0.08), [7, 12]);
  }
  // 철길 건너편: 아파트와 상가가 길게 이어진 스카이라인
  for (let s = -60; s < LEN + 60; s += rr(10, 18)) {
    const { p, nx, nz, rot, y } = frame3(s), w = rr(12, 22), d = rr(12, 18), h = rr(10, 38);
    const off = p.hw + 26 + d / 2 + rr(0, 10);
    addBox(w, h, d, facadeMats[Math.floor(R() * facadeMats.length)], p.x + nx * off, y - 2 + h / 2, p.z + nz * off, rot + rr(-0.1, 0.1), [7, 12]);
  }
  // 세로 간판은 글자가 달라서 따로 그린다 (수십 개)
  for (const sg of signs) {
    const { p, nx, nz, rot } = frame3(sg.s);
    const mat = new T.MeshBasicMaterial({ map: signTex(sg.text, sg.col[0], sg.col[1], true) });
    const m = new T.Mesh(new T.BoxGeometry(0.18, 2.2, 0.75), [mat, mat, darkMat, darkMat, darkMat, darkMat]);
    m.position.set(p.x + nx * (p.hw - 0.4) * sg.side, sg.y, p.z + nz * (p.hw - 0.4) * sg.side); m.rotation.y = rot;
    m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m);
  }
})();

/* ---------- 전봇대, 전선, 가로등 ---------- */
const colliders = [], lampSpots = [];
(function poles() {
  let prev = null;
  const wirePts = [];
  for (let s = 22, i = 0; s < LEN - 4; s += rr(20, 30), i++) {
    const side = i % 3 === 2 ? 1 : -1, { p, nx, nz, y } = frame3(s);
    const x = p.x + nx * (p.hw - 0.3) * side, z = p.z + nz * (p.hw - 0.3) * side;
    addGeo(new T.CylinderGeometry(0.14, 0.18, 9, 6), poleMat, at(x, y + 4.5, z, 0, 0, rr(-0.03, 0.03)));
    addBox(1.5, 0.12, 0.12, poleMat, x, y + 8.2, z, Math.atan2(p.dx, p.dz) + Math.PI / 2);
    addBox(0.7, 0.9, 0.5, poleMat, x - nx * side * 0.3, y + 6.8, z - nz * side * 0.3, 0); // 변압기
    colliders.push({ x, z, r: 0.35 });
    if (prev) for (let k = 0; k < 4; k++) {
      const a = new T.Vector3(prev.x, prev.y + 8.2 - k * 0.25, prev.z), b = new T.Vector3(x, y + 8.2 - k * 0.25, z);
      for (let q = 0; q < 10; q++) { const v1 = a.clone().lerp(b, q / 10), v2 = a.clone().lerp(b, (q + 1) / 10); v1.y -= Math.sin(Math.PI * q / 10) * (0.8 + k * 0.2); v2.y -= Math.sin(Math.PI * (q + 1) / 10) * (0.8 + k * 0.2); wirePts.push(v1, v2); }
    }
    prev = { x, y, z };
    const lx = x - nx * side * 0.9, lz = z - nz * side * 0.9;
    addGeo(new T.SphereGeometry(0.16, 6, 4), new T.MeshBasicMaterial({ color: 0xffd89a }), at(lx, y + 6.2, lz));
    lampSpots.push({ x: lx, y: y + 6, z: lz });
  }
  scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wirePts), new T.LineBasicMaterial({ color: 0x0a0a0a })));
  // 가로등 아래 빛 웅덩이 (가짜 조명, 아주 가볍다)
  const poolTex = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,140,0.55)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const poolMat = new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  lampSpots.forEach(l => { const g = new T.PlaneGeometry(9, 9); g.rotateX(-Math.PI / 2); addGeo(g, poolMat, at(l.x, l.y - 5.95, l.z)); });
})();
// 진짜 빛은 3개뿐. 플레이어 가까운 가로등으로 옮겨 다닌다.
const liveLights = [0, 1, 2].map(() => { const lt = new T.PointLight(0xffc98a, 2.2, 20, 2); scene.add(lt); return lt; });
function updateLights(px, pz) {
  const near = lampSpots.map(l => ({ l, d: Math.hypot(l.x - px, l.z - pz) })).sort((a, b) => a.d - b.d).slice(0, 3);
  near.forEach((n, i) => liveLights[i].position.set(n.l.x, n.l.y, n.l.z));
}

/* ---------- 주차된 차, 오토바이, 쓰레기, 화분 ---------- */
(function clutter() {
  const carMats = [0xd8d8d4, 0x1d1f24, 0x6b1d1d, 0x3c4a5c, 0xf0f0ea].map(L), tire = L(0x0c0c0c), glass = L(0x20242c);
  for (let s = 60; s < LEN - 30; s += rr(55, 90)) {
    const side = R() < 0.7 ? -1 : 1, { p, nx, nz, rot, y } = frame3(s);
    const off = p.hw - 0.95, x = p.x + nx * off * side, z = p.z + nz * off * side, r = rot + rr(-0.05, 0.05);
    const mat = carMats[Math.floor(R() * carMats.length)];
    addBox(1.7, 0.75, 4.2, mat, x, y + 0.6, z, r);
    addBox(1.5, 0.6, 2.1, glass, x - p.dx * 0.2, y + 1.25, z - p.dz * 0.2, r);
    colliders.push({ x: x + p.dx * 1.2, z: z + p.dz * 1.2, r: 1.0 }, { x: x - p.dx * 1.2, z: z - p.dz * 1.2, r: 1.0 });
    void tire;
  }
  const bag = L(0x15161a), white = L(0xdedbd0), pot = L(0x7a4a2a), leaf = L(0x2f5a2c), scoot = L(0xb32626);
  for (let s = 18; s < LEN - 8; s += rr(7, 15)) {
    const side = R() < 0.6 ? -1 : 1, { p, nx, nz, y } = frame3(s), ex = p.x + nx * (p.hw - 0.35) * side, ez = p.z + nz * (p.hw - 0.35) * side;
    const pick = R();
    if (pick < 0.45) for (let k = 0; k < 2 + Math.floor(R() * 4); k++) { const g = new T.SphereGeometry(rr(0.25, 0.42), 6, 5); g.scale(1, 0.75, 1); addGeo(g, k % 3 ? bag : white, at(ex + rr(-0.5, 0.5), y + 0.22, ez + rr(-0.5, 0.5))); }
    else if (pick < 0.75) { addGeo(new T.CylinderGeometry(0.28, 0.22, 0.45, 8), pot, at(ex, y + 0.22, ez)); addGeo(new T.SphereGeometry(0.42, 6, 5), leaf, at(ex, y + 0.75, ez)); }
    else { const r = Math.atan2(p.dx, p.dz); addBox(0.35, 0.5, 1.5, scoot, ex, y + 0.55, ez, r); addBox(0.5, 0.08, 0.6, darkMat, ex, y + 0.85, ez - p.dz * 0.2, r); colliders.push({ x: ex, z: ez, r: 0.55 }); }
  }
})();

/* ---------- 명학역, 철길, 지나가는 전철 ---------- */
const RAIL_OFF = 8.5; // 골목 동쪽 가림막 바로 너머
(function station() {
  const { p, nx, nz, rot, y } = frame3(0);
  // 역 건물: 출구 등 뒤 (골목 시작점을 막는다)
  const sx = p.x - p.dx * 13 - nx * 2, sz = p.z - p.dz * 13 - nz * 2;
  addBox(18, 7, 14, L(0x9a9a92), sx, y + 3.5, sz, rot);
  addBox(19, 0.5, 15, L(0x2b3a4a), sx, y + 7.2, sz, rot);
  const nameM = new T.Mesh(new T.PlaneGeometry(7, 1.6), new T.MeshBasicMaterial({ map: signTex('명학역', '#1b4fa3', '#ffffff') }));
  nameM.position.set(sx + p.dx * 7.1, y + 5.6, sz + p.dz * 7.1); nameM.rotation.y = rot; scene.add(nameM);
  // 승강장 지붕 (철길 위, 역 옆으로 길게)
  for (let k = -60; k < 6; k += 6) {
    const q = pointAt(k), qx = -q.dz, qz = q.dx, qy = elev(0), qr = Math.atan2(q.dx, q.dz);
    addBox(9, 0.3, 6.2, L(0x3b4752), q.x + qx * (RAIL_OFF + 2.5), qy + 4.4, q.z + qz * (RAIL_OFF + 2.5), qr);
    addBox(3, 0.9, 6.2, L(0x8a8a84), q.x + qx * (RAIL_OFF + 2.5), qy + 0.45, q.z + qz * (RAIL_OFF + 2.5), qr); // 승강장
    addBox(0.2, 4, 0.2, metalMat, q.x + qx * (RAIL_OFF + 2.5), qy + 2.4, q.z + qz * (RAIL_OFF + 2.5), 0);
  }
  // 1번 출구 캐노피
  const cx = p.x - p.dx * 3.5, cz = p.z - p.dz * 3.5;
  const glass = new T.MeshLambertMaterial({ color: 0x9fb4c4, transparent: true, opacity: 0.45 });
  addBox(4.4, 0.25, 6.5, L(0x3b4752), cx, y + 3.2, cz, rot);
  for (const sgn of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(0.08, 3, 6.5), glass); m.position.set(cx + nx * 2.1 * sgn, y + 1.5, cz + nz * 2.1 * sgn); m.rotation.y = rot; scene.add(m); }
  const ex = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), new T.MeshBasicMaterial({ map: signTex('1', '#1b4fa3', '#ffffff') }));
  ex.position.set(cx + p.dx * 3.3 + nx * 1.4, y + 2.6, cz + p.dz * 3.3 + nz * 1.4); ex.rotation.y = rot + Math.PI; scene.add(ex);
  // 계단 입구 (어두운 구멍)
  addBox(3.6, 0.05, 5, L(0x0a0b0e), cx, y + 0.03, cz - p.dz * 0.4, rot);
})();
const meshMat = new T.MeshLambertMaterial({
  map: tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(70,90,80,1)'; g.lineWidth = 2; for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } g.fillStyle = 'rgba(60,80,70,1)'; g.fillRect(0, 0, w, 3); }),
  transparent: true, alphaTest: 0.4, side: T.DoubleSide,
});
meshMat.map.repeat.set(3, 2);
(function rails() {
  for (let s = -120; s < LEN + 60; s += 3) {
    const p = pointAt(s), nx = -p.dz, nz = p.dx, y = elev(Math.max(0, Math.min(LEN, s))), rot = Math.atan2(p.dx, p.dz);
    for (const o of [RAIL_OFF - 0.75, RAIL_OFF + 0.75, RAIL_OFF + 4.25, RAIL_OFF + 5.75]) addBox(0.1, 0.14, 3.05, metalMat, p.x + nx * o, y - 0.25, p.z + nz * o, rot);
    addBox(2.6, 0.08, 0.3, sleeperMat, p.x + nx * RAIL_OFF, y - 0.33, p.z + nz * RAIL_OFF, rot);
    addBox(2.6, 0.08, 0.3, sleeperMat, p.x + nx * (RAIL_OFF + 5), y - 0.33, p.z + nz * (RAIL_OFF + 5), rot);
    // 골목과 철길 사이 가림막: 아래는 콘크리트 턱, 위는 철망
    if (s >= 2 && s <= LEN) {
      addBox(0.25, 0.5, 3.02, L(0x7a7a74), p.x + nx * (p.hw + 0.15), y + 0.25, p.z + nz * (p.hw + 0.15), rot);
      addBox(0.08, 2.4, 0.08, fenceMat, p.x + nx * (p.hw + 0.15), y + 1.7, p.z + nz * (p.hw + 0.15), 0);
      const g = new T.PlaneGeometry(3.02, 1.9); g.rotateY(Math.PI / 2);
      addGeo(g, meshMat, at(p.x + nx * (p.hw + 0.15), y + 1.45, p.z + nz * (p.hw + 0.15), rot));
    }
    // 전차선 기둥
    if (((s % 45) + 45) % 45 < 3) { addBox(0.25, 7, 0.25, metalMat, p.x + nx * (RAIL_OFF + 8), y + 3.5, p.z + nz * (RAIL_OFF + 8), 0); addBox(9, 0.15, 0.15, metalMat, p.x + nx * (RAIL_OFF + 3.5), y + 6.6, p.z + nz * (RAIL_OFF + 3.5), rot + Math.PI / 2); }
  }
})();
const train = (() => {
  const g = new T.Group(), body = L(0xc9ccd2), stripe = L(0x1b4fa3);
  const winTex = tex(256, 64, (c, w, h) => { c.fillStyle = '#1a1c22'; c.fillRect(0, 0, w, h); for (let x = 10; x < w; x += 42) { c.fillStyle = '#fff1cf'; c.fillRect(x, 12, 30, 30); } });
  const win = new T.MeshBasicMaterial({ map: winTex });
  for (let i = 0; i < 6; i++) {
    const car = new T.Group();
    const b = new T.Mesh(new T.BoxGeometry(3, 3.4, 19.5), body); b.position.y = 1.9; car.add(b);
    for (const sx of [-1.52, 1.52]) { const w = new T.Mesh(new T.PlaneGeometry(18, 1.1), win); w.position.set(sx, 2.4, 0); w.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; car.add(w); const st = new T.Mesh(new T.BoxGeometry(0.02, 0.3, 19.5), stripe); st.position.set(sx * 1.01, 1.4, 0); car.add(st); }
    car.userData.i = i; g.add(car);
  }
  const light = new T.PointLight(0xfff1cf, 1.4, 18, 2); g.add(light);
  scene.add(g);
  return { g, s: -400, dir: 1, wait: 6 };
})();
function updateTrain(dt) {
  train.wait -= dt;
  if (train.wait > 0) { train.g.visible = false; return; }
  train.g.visible = true;
  train.s += train.dir * 17 * dt;
  if (train.s > LEN + 260 || train.s < -380) { train.dir *= -1; train.wait = 18 + Math.random() * 14; train.s = train.dir > 0 ? -380 : LEN + 260; }
  const track = train.dir > 0 ? RAIL_OFF : RAIL_OFF + 5;
  train.g.children.forEach(ch => {
    if (!ch.userData || ch.userData.i == null) return;
    const s = train.s - train.dir * ch.userData.i * 20, p = pointAt(s), nx = -p.dz, nz = p.dx;
    ch.position.set(p.x + nx * track, elev(Math.max(0, Math.min(LEN, s))) - 0.2, p.z + nz * track);
    ch.rotation.y = Math.atan2(p.dx, p.dz);
  });
  const head = train.g.children[0]; train.g.children[train.g.children.length - 1].position.copy(head.position).y += 2;
  if (soundOn && ac && railGain) { const d = Math.hypot(head.position.x - P.x, head.position.z - P.z); railGain.gain.setTargetAtTime(Math.max(0, 1 - d / 120) * 0.35, ac.currentTime, 0.2); }
}

/* ---------- 목적지: 에스키스 ---------- */
const GOAL = (() => {
  const { p, nx, nz, rot, y } = frame3(LEN);
  const gx = p.x - nx * (p.hw + 0.05), gz = p.z - nz * (p.hw + 0.05); // 골목 서쪽
  addBox(14, 34, 18, facadeMats[2], gx - nx * 7, y + 16, gz - nz * 7, rot, [7, 12]);
  // 골목 끝을 막는 건물 (여기가 끝)
  addBox(p.hw * 2 + 22, 16, 10, facadeMats[0], p.x + p.dx * 11, y + 7, p.z + p.dz * 11, rot, [7, 12]);
  // 입구 차양과 계단
  addBox(4.5, 0.2, 1.6, L(0x222222), gx + nx * 0.8, y + 3.1, gz + nz * 0.8, rot + Math.PI / 2);
  addBox(4, 0.3, 1.2, L(0x8a8a86), gx + nx * 0.6, y + 0.15, gz + nz * 0.6, rot + Math.PI / 2);
  // 불 켜진 로비 유리문
  const door = new T.Mesh(new T.PlaneGeometry(3.2, 2.8), new T.MeshBasicMaterial({ color: 0xfff3d6 }));
  door.position.set(gx + nx * 0.06, y + 1.4, gz + nz * 0.06); door.rotation.y = rot - Math.PI / 2; scene.add(door);
  // 멀리서도 보이는 세로 간판
  // 골목 쪽으로 튀어나온 세로 간판: 걸어오는 방향에서 정면으로 보인다
  const sg = new T.Mesh(new T.BoxGeometry(1.8, 8, 0.3), (() => { const m = new T.MeshBasicMaterial({ map: signTex('에스키스', '#111111', '#ffffff', true) }); return [darkMat, darkMat, darkMat, darkMat, m, m]; })());
  sg.position.set(gx + nx * 1.2, y + 7.5, gz + nz * 1.2); sg.rotation.y = rot; scene.add(sg);
  const lt = new T.PointLight(0xfff0d0, 1.8, 16, 2); lt.position.set(gx + nx * 2, y + 3, gz + nz * 2); scene.add(lt);
  // 편의점 (관장님 자리)
  const c = frame3(LEN - 40), sx = c.p.x - c.nx * (c.p.hw + 0.07), sz = c.p.z - c.nz * (c.p.hw + 0.07);
  addBox(6, 2.9, 0.1, shopMats[2], sx, c.y + 1.45, sz, c.rot + Math.PI / 2);
  const cs = new T.Mesh(new T.PlaneGeometry(5, 0.9), new T.MeshBasicMaterial({ map: signTex('24시 편의점', '#1d63c9', '#ffffff') }));
  cs.position.set(sx + c.nx * 0.05, c.y + 3.3, sz + c.nz * 0.05); cs.rotation.y = c.rot - Math.PI / 2; scene.add(cs);
  return { x: gx + nx * 1.2, z: gz + nz * 1.2 };
})();
flush();

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
  // 270m 골목에 촘촘히. 가림막 쪽(1)에 기대 피우는 사람도 있다.
  place('office', 22, -1, 0.4);
  const g1 = [place('student', 42, 1), place('student', 43.4, 1, 1.2), place('student', 41, 1, -0.8)];
  g1.forEach(n => n.group = g1);
  place('grandpa', 62, -1);
  place('retake', 80, -1, Math.PI);
  place('thin', 98, 1);
  place('office', 114, -1, 2.0);
  place('pig', 132, -1, 0.3);
  const g2 = [place('student', 150, -1, 0.5), place('student', 151.4, -1, 2.6)];
  g2.forEach(n => n.group = g2);
  place('thin', 168, 1, 0.8);
  place('grandpa', 186, 1, 1.0);
  place('retake', 202, -1);
  place('pig', 220, 1, 2.4);
  place('boss', LEN - 26, -1, 0.2);
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
let ac = null, soundOn = false, noiseBuf = null, railGain = null;
function audioInit() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ac = new AC(); } catch { return null; }
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 도시 웅웅거림 + 가끔 지나가는 전철
  // 전철 지나가는 소리 (가까울수록 크게)
  const rs = ac.createBufferSource(); rs.buffer = noiseBuf; rs.loop = true;
  const rf = ac.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 340;
  railGain = ac.createGain(); railGain.gain.value = 0; rs.connect(rf); rf.connect(railGain); railGain.connect(ac.destination); rs.start();
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
  $('hud').textContent = `${P.score.toLocaleString('ko-KR')}  ${'■'.repeat(P.lives)}${'□'.repeat(3 - P.lives)}  집까지 ${Math.max(0, Math.round(LEN - n.s))}m`;
  $('stam').style.transform = `scaleX(${P.stamina / 100})`;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) update(dt); else { P.yaw += dt * 0.04; }
  updateLights(P.x, P.z);
  updateTrain(dt);
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
  // 목표 안내: 시작할 때 한 번 띄웠다가 사라진다
  const goal = $('goal'); goal.hidden = false; goal.style.opacity = 1;
  clearTimeout(window.__goalT); window.__goalT = setTimeout(() => { goal.style.opacity = 0; setTimeout(() => { goal.hidden = true; }, 700); }, 3200);
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
window.__alley = { P, npcs, info: renderer.info, train, get playing() { return playing; }, start, hit, LEN, tp: s => { const p = pointAt(s); P.x = p.x; P.z = p.z; P.yaw = Math.atan2(-p.dx, -p.dz); } };
