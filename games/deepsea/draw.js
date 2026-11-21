// 심해 생물 그리기. 파라미터 하나(p)로 몸·가시·촉수·눈·발광·특수 기관·무늬를 조합한다.
// 좌표는 중심 (0,0), 대략 반지름 100 안팎을 기준으로 그리고 캔버스 크기에 맞춰 늘린다.

export const DEFAULT = {
  body: 'jelly', size: 0.9, hue: 200, sat: 35, lit: 78, alpha: 0.3, hue2: null, rainbow: 0,
  spikes: 'none', limbs: 'none', eyes: 'none', glowAt: 'none', glow: 0, glowHue: 190, glowRainbow: 0,
  special: 'none', pattern: 'none', move: 'float', seed: 1,
};

const TAU = Math.PI * 2;
function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;

// ---------- 몸 윤곽 ----------
function ellipse(cx, cy, rx, ry, n, wob = 0, R = Math.random, a0 = 0, a1 = TAU) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * i / n, k = 1 + (R() - 0.5) * wob;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}
function shape(p, R, t) {
  const g = { rim: [], eye: [0, -10], front: [0, -60], back: [0, 60], top: [0, -60], bottom: [0, 60], center: [0, 0], down: Math.PI / 2 };
  switch (p.body) {
    case 'jelly': {
      const pts = [], pulse = 1 + Math.sin(t * 2.2) * 0.05;
      for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; pts.push([Math.cos(a) * 72 * pulse, -18 + Math.sin(a) * 62]); }
      for (let i = 24; i >= 0; i--) { const x = -72 * pulse + 144 * pulse * i / 24; pts.push([x * 0.98, -14 + Math.sin(i * 1.3) * 4]); }
      g.outline = pts.reverse();
      for (let i = 0; i < 12; i++) g.rim.push([-64 * pulse + 128 * pulse * i / 11, -10]);
      g.eye = [0, -40]; g.top = [0, -80]; g.bottom = [0, -10]; g.center = [0, -38];
      break;
    }
    case 'siphon': {
      g.bells = [];
      for (let i = 0; i < 6; i++) { const r = 26 - i * 2.2, y = -90 + i * 34; g.bells.push([Math.sin(t * 1.3 + i * 0.8) * 6, y, r]); }
      g.outline = ellipse(0, -10, 34, 110, 24, 0, R);
      const last = g.bells[5];
      for (let i = 0; i < 8; i++) g.rim.push([last[0] - 14 + i * 4, last[1] + 16]);
      g.eye = [0, -96]; g.top = [0, -118]; g.bottom = [0, 100]; g.center = [0, -10];
      break;
    }
    case 'zoea': {
      g.outline = ellipse(0, 0, 44, 40, 28, 0.06, R);
      for (let i = 0; i < 6; i++) g.rim.push([-24 + i * 9, 34]);
      g.eye = [-30, 4]; g.front = [-44, 0]; g.top = [0, -40]; g.bottom = [0, 40]; g.back = [40, 10];
      g.tail = true;
      break;
    }
    case 'amphipod': {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const a = -2.4 + 3.6 * i / 20; pts.push([Math.cos(a) * 70, Math.sin(a) * 60 + 10]); }
      for (let i = 20; i >= 0; i--) { const a = -2.4 + 3.6 * i / 20; pts.push([Math.cos(a) * 40, Math.sin(a) * 32 + 10]); }
      g.outline = pts;
      for (let i = 1; i < 10; i++) { const a = -2.4 + 3.6 * i / 10; g.rim.push([Math.cos(a) * 42, Math.sin(a) * 34 + 10]); }
      g.segments = 9; g.arc = [-2.4, 1.2, 55, 46, 10];
      g.eye = [Math.cos(-2.4) * 58, Math.sin(-2.4) * 50 + 10]; g.front = g.eye; g.center = [0, -20]; g.down = 0;
      break;
    }
    case 'shrimp': {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const x = -80 + 160 * i / 20, w = 26 * Math.sin(Math.PI * (i / 20) * 0.9 + 0.2); pts.push([x, -w + Math.pow((x + 80) / 160, 2) * 22]); }
      for (let i = 20; i >= 0; i--) { const x = -80 + 160 * i / 20, w = 22 * Math.sin(Math.PI * (i / 20) * 0.9 + 0.2); pts.push([x, w + Math.pow((x + 80) / 160, 2) * 22]); }
      g.outline = pts;
      for (let i = 0; i < 8; i++) g.rim.push([-50 + i * 13, 18 + i * 1.6]);
      g.eye = [-66, -8]; g.front = [-80, -4]; g.back = [80, 24]; g.segments = 6; g.fan = true; g.antenna = true;
      break;
    }
    case 'cucumber': {
      const pts = [];
      for (let i = 0; i < 32; i++) { const a = TAU * i / 32; pts.push([Math.cos(a) * 92, Math.sin(a) * (Math.sin(a) > 0 ? 30 : 44) + Math.sin(a * 3 + t) * 2]); }
      g.outline = pts;
      for (let i = 0; i < 10; i++) g.rim.push([-74 + i * 16.5, 28]);
      g.eye = [-80, -6]; g.front = [-92, 0]; g.top = [0, -44]; g.papillae = true;
      break;
    }
    case 'squid': {
      const pts = [];
      for (let i = 0; i < 30; i++) { const a = TAU * i / 30; pts.push([Math.cos(a) * 40, -30 + Math.sin(a) * (Math.sin(a) < 0 ? 70 : 34)]); }
      g.outline = pts;
      for (let i = 0; i < 8; i++) g.rim.push([-30 + i * 8.5, 2]);
      g.eye = [0, -6]; g.top = [0, -100]; g.bottom = [0, 4]; g.center = [0, -40]; g.fins = true; g.web = true;
      break;
    }
    case 'angler': {
      const pts = [];
      for (let i = 0; i < 32; i++) { const a = TAU * i / 32; pts.push([Math.cos(a) * 74, Math.sin(a) * 56 * (Math.cos(a) < 0 ? 1 : 0.8)]); }
      g.outline = pts;
      for (let i = 0; i < 4; i++) g.rim.push([-10 + i * 16, 48]);
      g.eye = [-36, -24]; g.front = [-74, 0]; g.back = [74, 0]; g.top = [-30, -54]; g.tailFin = true; g.mouth = true;
      break;
    }
    case 'worm': {
      const pts = [], n = 22, wave = i => Math.sin(i * 0.5 + t * 2) * 12;
      for (let i = 0; i <= n; i++) { const x = -110 + 220 * i / n; pts.push([x, wave(i) - 14 * (1 - Math.abs(i / n - 0.5))]); }
      for (let i = n; i >= 0; i--) { const x = -110 + 220 * i / n; pts.push([x, wave(i) + 14 * (1 - Math.abs(i / n - 0.5))]); }
      g.outline = pts; g.segments = 12; g.wave = wave; g.n = n;
      for (let i = 1; i < n; i += 2) g.rim.push([-110 + 220 * i / n, wave(i)]);
      g.eye = [-104, wave(0) - 2]; g.front = [-110, wave(0)]; g.down = Math.PI / 2; g.bristle = true;
      break;
    }
    case 'crinoid': {
      g.outline = ellipse(0, -40, 18, 14, 18, 0.1, R);
      for (let i = 0; i < 10; i++) { const a = -Math.PI + Math.PI * i / 9; g.rim.push([Math.cos(a) * 16, -40 + Math.sin(a) * 12]); }
      g.eye = [0, -40]; g.top = [0, -54]; g.bottom = [0, -26]; g.center = [0, -40]; g.stalk = true; g.down = -Math.PI / 2;
      break;
    }
    case 'comb': {
      g.outline = ellipse(0, 0, 50, 76, 32, 0.03, R);
      for (let i = 0; i < 6; i++) g.rim.push([-20 + i * 8, 70]);
      g.eye = [0, -50]; g.top = [0, -76]; g.bottom = [0, 76]; g.combRows = true;
      break;
    }
    case 'isopod': {
      g.outline = ellipse(0, 0, 58, 86, 32, 0, R);
      for (let i = 0; i < 7; i++) { g.rim.push([-56, -50 + i * 16]); g.rim.push([56, -50 + i * 16]); }
      g.eye = [0, -74]; g.front = [0, -86]; g.plates = true; g.down = 0; g.sideways = true;
      break;
    }
    case 'lepto': {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const x = -110 + 220 * i / 20, w = 34 * Math.sin(Math.PI * i / 20) * (1 - i / 40); pts.push([x, -w]); }
      for (let i = 20; i >= 0; i--) { const x = -110 + 220 * i / 20, w = 34 * Math.sin(Math.PI * i / 20) * (1 - i / 40); pts.push([x, w]); }
      g.outline = pts; g.chev = true;
      for (let i = 0; i < 6; i++) g.rim.push([-60 + i * 22, 24]);
      g.eye = [-100, -2]; g.front = [-110, 0]; g.back = [110, 0];
      break;
    }
    case 'spider': {
      g.outline = ellipse(0, 0, 10, 32, 16, 0, R);
      for (let i = 0; i < 4; i++) { g.rim.push([-8, -20 + i * 13]); g.rim.push([8, -20 + i * 13]); }
      g.eye = [0, -26]; g.front = [0, -32]; g.legs8 = true; g.sideways = true;
      break;
    }
    default: g.outline = ellipse(0, 0, 60, 60, 24, 0, R);
  }
  return g;
}

function path(ctx, pts) {
  ctx.beginPath();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const c = pts[i], nx = mid(c, pts[(i + 1) % n]); ctx.quadraticCurveTo(c[0], c[1], nx[0], nx[1]); }
  ctx.closePath();
}
function normalAt(pts, i) {
  const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
  let nx = b[1] - a[1], ny = -(b[0] - a[0]);
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  const c = pts[i];
  if (nx * c[0] + ny * c[1] < 0) { nx = -nx; ny = -ny; }
  return [nx, ny];
}

// ---------- 촉수 한 가닥 ----------
function strand(ctx, x, y, ang, len, w, t, ph, sway, color, tips, curl = 0) {
  const seg = 14, pts = [[x, y]];
  let a = ang, cx = x, cy = y;
  for (let i = 1; i <= seg; i++) {
    a += Math.sin(t * 1.6 + ph + i * 0.45) * sway * 0.12 + curl * (i / seg) * 0.5;
    cx += Math.cos(a) * len / seg; cy += Math.sin(a) * len / seg;
    pts.push([cx, cy]);
  }
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = Math.max(0.4, w * (1 - i / pts.length));
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
  }
  tips.push(pts[pts.length - 1]);
  return pts;
}

// ---------- 그리기 ----------
export function drawCreature(ctx, p0, t, W, H, opts = {}) {
  const p = { ...DEFAULT, ...p0 };
  const R = rng(p.seed);
  const hue = p.rainbow ? p.hue + t * 40 : p.hue;
  const body = hsl(hue, p.sat, p.lit, p.alpha);
  const bodyHi = hsl(p.hue2 ?? hue, p.sat, Math.min(96, p.lit + 14), Math.min(1, p.alpha + 0.35));
  const line = hsl(hue, Math.min(100, p.sat + 10), Math.min(95, p.lit + 18), 0.85);
  const gHue = p.glowRainbow ? p.glowHue + t * 90 : p.glowHue;
  const glowC = hsl(gHue, 95, 62, 1);
  const pulse = p.move === 'blink' ? (Math.sin(t * 3) > 0.2 ? 1 : 0.15) : 0.75 + Math.sin(t * 2.4) * 0.25;
  const tips = [];

  ctx.save();
  ctx.translate(W / 2, H / 2);
  const S = Math.min(W, H) / 300 * (0.72 + (p.size - 0.55) * 0.55) * (opts.zoom || 1);
  ctx.scale(S, S);
  // 움직임
  switch (p.move) {
    case 'float': ctx.translate(Math.sin(t * 0.7) * 6, Math.sin(t * 1.1) * 8); break;
    case 'wiggle': ctx.rotate(Math.sin(t * 2.3) * 0.08); break;
    case 'spin': ctx.rotate(t * 0.5); break;
    case 'hop': ctx.translate(0, -Math.abs(Math.sin(t * 2)) * 18 + 8); break;
    case 'glide': ctx.translate(Math.sin(t * 0.5) * 22, 0); ctx.rotate(Math.sin(t * 0.5) * 0.05); break;
    case 'upside': ctx.rotate(Math.PI + Math.sin(t) * 0.06); break;
    case 'blink': ctx.translate(0, Math.sin(t * 0.8) * 4); break;
    default: break;
  }
  const g = shape(p, R, t);
  const glowAll = p.glowAt === 'all' ? p.glow : 0;
  ctx.shadowColor = glowC;
  ctx.shadowBlur = glowAll * 18 * pulse;

  // 줄기 (바다나리)
  if (g.stalk) {
    ctx.strokeStyle = line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -26);
    for (let i = 1; i <= 10; i++) ctx.lineTo(Math.sin(t * 0.8 + i * 0.4) * 3, -26 + i * 14);
    ctx.stroke();
    ctx.fillStyle = hsl(0, 85, 55, 0.9);
    ctx.beginPath(); ctx.ellipse(Math.sin(t * 0.8 + 4) * 3, 118, 9, 11, 0, 0, TAU); ctx.fill();
  }

  // ---------- 촉수와 다리 ----------
  const limbColor = hsl(hue, p.sat, Math.min(92, p.lit + 6), Math.min(0.9, p.alpha + 0.3));
  const rim = g.rim.length ? g.rim : [g.bottom];
  const down = g.down;
  const dirFor = (pt, i) => {
    if (g.sideways) return pt[0] < 0 ? Math.PI + (i % 2 ? 0.3 : -0.3) * 0.5 : (i % 2 ? 0.3 : -0.3) * 0.5;
    if (p.body === 'crinoid') return -Math.PI / 2 + (pt[0] / 16) * 1.3;
    if (p.body === 'amphipod') return Math.atan2(pt[1] - 10, pt[0]) + Math.PI;
    if (p.body === 'worm') return down + (i % 2 ? 0 : Math.PI);
    return down + (pt[0] / 80) * 0.5;
  };
  const L = p.limbs;
  if (L !== 'none' || g.legs8 || p.body === 'crinoid') {
    const style = L === 'none' ? (g.legs8 ? 'spider' : 'feathers') : L;
    const count = { whiskers: 8, threads: 16, feathers: 7, spider: 8, paddles: 6, ribbons: 4, curls: 8, hairy: 28, single: 1 }[style] || 6;
    for (let i = 0; i < count; i++) {
      const pt = rim[Math.floor(i * rim.length / count) % rim.length];
      const a = dirFor(pt, i), ph = i * 1.7;
      if (style === 'whiskers') strand(ctx, pt[0], pt[1], a, 34, 2, t, ph, 1, limbColor, tips, 0.3);
      else if (style === 'threads') strand(ctx, pt[0] + (R() - .5) * 6, pt[1], a, 150 + R() * 80, 1.1, t, ph, 2.2, hsl(hue, p.sat, p.lit + 10, 0.55), tips);
      else if (style === 'feathers' || p.body === 'crinoid') {
        const pts = strand(ctx, pt[0], pt[1], a, p.body === 'crinoid' ? 110 : 80, 2.2, t, ph, 0.8, limbColor, tips, p.body === 'crinoid' ? 0.6 : 0);
        ctx.lineWidth = 0.8;
        for (let k = 2; k < pts.length; k++) {
          const [x, y] = pts[k], [px, py] = pts[k - 1], ang = Math.atan2(y - py, x - px);
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang + s * 1.1) * 9, y + Math.sin(ang + s * 1.1) * 9); ctx.stroke(); }
        }
      } else if (style === 'spider') {
        const side = pt[0] < 0 ? -1 : 1, kx = pt[0] + side * (48 + R() * 20), ky = pt[1] - 30 + Math.sin(t * 1.5 + ph) * 6;
        ctx.strokeStyle = limbColor; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.lineTo(kx, ky);
        const fx = kx + side * (30 + R() * 30), fy = ky + 90 + Math.sin(t * 1.5 + ph + 1) * 8;
        ctx.lineTo(fx, fy); ctx.stroke(); tips.push([fx, fy]);
      } else if (style === 'paddles') {
        const pts = strand(ctx, pt[0], pt[1], a, 40, 3, t, ph, 1.4, limbColor, tips);
        const e = pts[pts.length - 1]; ctx.fillStyle = hsl(hue, p.sat, p.lit, p.alpha + 0.2);
        ctx.beginPath(); ctx.ellipse(e[0], e[1], 12, 5, a + Math.sin(t * 3 + ph) * 0.5, 0, TAU); ctx.fill();
      } else if (style === 'ribbons') {
        const pts = [];
        for (let k = 0; k <= 16; k++) pts.push([pt[0] + Math.sin(t * 1.4 + ph + k * 0.5) * 12 * (k / 16), pt[1] + k * 10]);
        ctx.fillStyle = hsl(hue + 20, p.sat, p.lit, Math.max(0.15, p.alpha * 0.8));
        ctx.beginPath(); pts.forEach(([x, y], k) => ctx.lineTo(x - 6 * (1 - k / 20), y));
        for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0] + 6 * (1 - k / 20), pts[k][1]);
        ctx.fill(); tips.push(pts[pts.length - 1]);
      } else if (style === 'curls') strand(ctx, pt[0], pt[1], a, 70, 2, t, ph, 0.6, limbColor, tips, 4);
      else if (style === 'hairy') strand(ctx, pt[0] + (R() - .5) * 10, pt[1], a + (R() - .5) * 0.8, 18 + R() * 14, 1, t, ph, 1.5, limbColor, tips);
      else if (style === 'single') strand(ctx, g.bottom[0], g.bottom[1], down, 320, 1.6, t, 0, 1.4, limbColor, tips);
    }
  }
  // 오징어 막
  if (g.web && (L === 'none' || L === 'ribbons')) {
    ctx.fillStyle = hsl(hue, p.sat, p.lit - 10, p.alpha + 0.2);
    ctx.beginPath(); ctx.moveTo(-34, 0);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-40 + i * 10, 60 + Math.sin(t * 2 + i) * 6 + (i % 2) * 10);
    ctx.lineTo(34, 0); ctx.fill();
  }
  // 망토 (특수)
  if (p.special === 'cape') {
    // 몸 아래로 늘어지는 반투명 막. 끝으로 갈수록 옅어지고 가장자리가 물결친다.
    const cy = g.center[1], wdt = 70, len = 90;
    const gr = ctx.createLinearGradient(0, cy, 0, cy + len);
    gr.addColorStop(0, hsl(hue + 30, p.sat, p.lit, 0.32)); gr.addColorStop(1, hsl(hue + 30, p.sat, p.lit, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-wdt * 0.5, cy);
    ctx.quadraticCurveTo(-wdt * 1.1, cy + len * 0.5, -wdt * 0.8 + Math.sin(t * 1.6) * 8, cy + len);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-wdt * 0.8 + i * wdt * 0.2, cy + len + Math.sin(t * 1.6 + i * 0.9) * 10);
    ctx.quadraticCurveTo(wdt * 1.1, cy + len * 0.5, wdt * 0.5, cy); ctx.closePath(); ctx.fill();
  }

  // ---------- 몸 ----------
  if (g.bells) {
    g.bells.forEach(([x, y, r], i) => {
      const gr = ctx.createRadialGradient(x, y - r * 0.3, 1, x, y, r * 1.2);
      gr.addColorStop(0, bodyHi); gr.addColorStop(1, body);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, Math.PI, TAU); ctx.lineTo(x + r, y + 6); ctx.lineTo(x - r, y + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.stroke();
      if (i < 5) { ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(g.bells[i + 1][0], g.bells[i + 1][1] - 18); ctx.stroke(); }
    });
  } else {
    if (g.segments && p.body === 'amphipod') {
      const [a0, a1, rx, ry, cy] = g.arc;
      for (let i = 0; i < g.segments; i++) {
        const a = a0 + (a1 - a0) * (i + 0.5) / g.segments, r = 17 - i * 0.6;
        const gr = ctx.createRadialGradient(Math.cos(a) * rx, Math.sin(a) * ry + cy, 1, Math.cos(a) * rx, Math.sin(a) * ry + cy, r * 1.4);
        gr.addColorStop(0, bodyHi); gr.addColorStop(1, body); ctx.fillStyle = gr;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * rx, Math.sin(a) * ry + cy, r, r * 0.8, a + Math.PI / 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
      }
    } else {
      const c = g.center;
      const gr = ctx.createRadialGradient(c[0] - 10, c[1] - 14, 2, c[0], c[1], 110);
      gr.addColorStop(0, bodyHi); gr.addColorStop(0.55, body); gr.addColorStop(1, hsl(p.hue2 ?? hue, p.sat, p.lit - 12, p.alpha));
      ctx.fillStyle = gr; path(ctx, g.outline); ctx.fill();
      ctx.save(); ctx.shadowBlur = p.glowAt === 'edge' ? 22 * p.glow * pulse : ctx.shadowBlur;
      ctx.strokeStyle = p.glowAt === 'edge' ? glowC : line; ctx.lineWidth = p.glowAt === 'edge' ? 2 : 1.4; ctx.stroke(); ctx.restore();
    }
    // 무늬 (몸 안쪽에만)
    ctx.save(); path(ctx, g.outline); ctx.clip();
    drawPattern(ctx, p, hue, R, t);
    if (g.segments && p.body !== 'amphipod') {
      ctx.strokeStyle = hsl(hue, p.sat, p.lit - 25, 0.35); ctx.lineWidth = 1.2;
      for (let i = 1; i < g.segments; i++) { const x = -110 + 220 * i / g.segments; ctx.beginPath(); ctx.moveTo(x, -60); ctx.lineTo(x + 6, 60); ctx.stroke(); }
    }
    if (g.plates) { ctx.strokeStyle = hsl(hue, p.sat, p.lit - 25, 0.6); ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(0, -60 + i * 18, 60, 12, 0, 0, Math.PI); ctx.stroke(); } }
    if (g.chev) { ctx.strokeStyle = hsl(hue, p.sat, p.lit - 20, 0.35); ctx.lineWidth = 1; for (let i = 0; i < 22; i++) { const x = -96 + i * 9; ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x + 6, 0); ctx.lineTo(x, 30); ctx.stroke(); } }
    if (p.special === 'guts') {
      ctx.fillStyle = hsl(15, 80, 45, 0.75); ctx.beginPath(); ctx.ellipse(g.center[0] + 4, g.center[1] + 4, 16, 10, 0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = hsl(30, 80, 50, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.center[0] - 40, g.center[1]); ctx.quadraticCurveTo(g.center[0], g.center[1] + 30, g.center[0] + 40, g.center[1] - 10); ctx.stroke();
    }
    ctx.restore();
  }
  // 몸 세부
  if (g.fins) { ctx.fillStyle = body; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 40, -80, 22, 10, s * 0.6 + Math.sin(t * 3) * 0.2 * s, 0, TAU); ctx.fill(); ctx.strokeStyle = line; ctx.stroke(); } }
  if (g.tailFin || p.special === 'fin') {
    const bx = g.back[0], by = g.back[1];
    ctx.fillStyle = hsl(hue, p.sat, p.lit, Math.max(0.2, p.alpha)); ctx.beginPath(); ctx.moveTo(bx - 6, by);
    ctx.quadraticCurveTo(bx + 40, by - 40 + Math.sin(t * 3) * 8, bx + 46, by - 30); ctx.quadraticCurveTo(bx + 30, by, bx + 46, by + 30 + Math.sin(t * 3) * 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
  }
  if (g.fan) { ctx.fillStyle = bodyHi; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(g.back[0] + 14, g.back[1] + i * 6, 16, 4, i * 0.3, 0, TAU); ctx.fill(); } }
  if (g.antenna) { for (const s of [0, 1]) strand(ctx, g.front[0], g.front[1], Math.PI + (s ? -0.25 : -0.05), 200, 1.2, t, s * 2, 1, line, tips, s ? 0.3 : -0.2); }
  if (g.tail) {
    ctx.strokeStyle = line; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(30, 24);
    ctx.quadraticCurveTo(60, 60, 40 + Math.sin(t * 2) * 6, 96); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = body; ctx.stroke();
  }
  if (g.combRows || p.special === 'combs') {
    for (let r = 0; r < 8; r++) {
      const ox = (r - 3.5) * 11;
      for (let k = 0; k < 14; k++) {
        const y = -66 + k * 10, hh = (k * 25 + t * 220 + r * 40) % 360;
        ctx.fillStyle = hsl(hh, 95, 65, 0.85); ctx.fillRect(ox * Math.cos((y / 80) * 1.1) - 1.5, y, 3, 5);
      }
    }
  }
  if (g.papillae) { ctx.strokeStyle = limbColor; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { const x = -50 + i * 25; ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x + Math.sin(t + i) * 4, -62 - (i % 2) * 8); ctx.stroke(); } }
  if (g.bristle) {
    ctx.strokeStyle = hsl(45, 70, 75, 0.7); ctx.lineWidth = 0.8;
    for (let i = 1; i < g.n; i++) { const x = -110 + 220 * i / g.n, y = g.wave(i); for (const s of [-1, 1]) for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, y + s * 12); ctx.lineTo(x + k * 3, y + s * (26 + Math.abs(k) * 2)); ctx.stroke(); } }
  }
  if (g.mouth || p.special === 'teeth') {
    const [mx, my] = g.front;
    ctx.fillStyle = 'rgba(10,6,8,0.9)'; ctx.beginPath(); ctx.ellipse(mx + 18, my + 12, 22, 12, 0.2, 0, TAU); ctx.fill();
    if (p.special === 'teeth' || g.mouth) {
      ctx.fillStyle = 'rgba(240,235,220,0.95)';
      for (let i = 0; i < 7; i++) { const x = mx + 2 + i * 5.5; ctx.beginPath(); ctx.moveTo(x, my + 2); ctx.lineTo(x + 2, my + 2 + (p.special === 'teeth' ? 22 : 10) + (i % 2) * 6); ctx.lineTo(x + 4, my + 2); ctx.fill(); }
    }
  }

  // ---------- 가시 ----------
  drawSpikes(ctx, p, g, R, line, hue, t);

  // ---------- 눈 ----------
  drawEyes(ctx, p, g, R, t, glowC, pulse);

  // ---------- 특수 기관 ----------
  if (p.special === 'eggs') {
    const ex = g.center[0] + 70, ey = g.center[1] + 10;
    ctx.strokeStyle = 'rgba(220,230,240,0.35)'; ctx.fillStyle = 'rgba(200,215,230,0.08)';
    ctx.beginPath(); ctx.arc(ex, ey, 46, 0, TAU); ctx.fill(); ctx.stroke();
    const R2 = rng(p.seed + 7);
    for (let i = 0; i < 70; i++) { const a = R2() * TAU, r = Math.sqrt(R2()) * 40; ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * r, ey + Math.sin(a) * r, 2 + R2() * 1.6, 0, TAU); ctx.fill(); }
  }
  if (p.special === 'lure' || p.body === 'angler') {
    const [tx, ty] = g.top;
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty);
    const lx = tx - 40 + Math.sin(t * 1.2) * 8, ly = ty - 60;
    ctx.quadraticCurveTo(tx - 10, ty - 70, lx, ly); ctx.stroke();
    ctx.save(); ctx.shadowColor = glowC; ctx.shadowBlur = 30 * pulse; ctx.fillStyle = p.glow > 0 ? glowC : hsl(55, 90, 70, 1);
    ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TAU); ctx.fill(); ctx.restore();
  }
  if (p.special === 'sail') {
    ctx.fillStyle = hsl(hue + 180, 60, 60, 0.35); ctx.beginPath(); ctx.moveTo(-40, g.top[1] + 6);
    ctx.quadraticCurveTo(0, g.top[1] - 70 + Math.sin(t) * 6, 40, g.top[1] + 6); ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 10, g.top[1] + 6); ctx.lineTo(i * 8, g.top[1] - 50 + Math.abs(i) * 7); ctx.stroke(); }
  }
  if (p.special === 'frills') {
    ctx.strokeStyle = hsl(hue + 40, p.sat, p.lit + 10, 0.7); ctx.lineWidth = 1.5;
    g.outline.forEach((pt, i) => { if (i % 2) return; const [nx, ny] = normalAt(g.outline, i); ctx.beginPath(); ctx.arc(pt[0] + nx * 5, pt[1] + ny * 5, 5 + Math.sin(t * 2 + i) * 1.5, 0, Math.PI); ctx.stroke(); });
  }
  if (p.special === 'crown') {
    for (let i = 0; i < 9; i++) strand(ctx, g.top[0] - 24 + i * 6, g.top[1] + 4, -Math.PI / 2 + (i - 4) * 0.2, 40, 2, t, i, 1, hsl(hue + 60, 80, 65, 0.9), tips, 0);
  }
  if (p.special === 'bubbles') {
    ctx.strokeStyle = 'rgba(220,240,255,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const ph = (t * 0.4 + i / 9) % 1; ctx.beginPath(); ctx.arc(g.top[0] + Math.sin(i * 3 + t) * 16, g.top[1] - ph * 140, 2 + i % 3 * 1.5, 0, TAU); ctx.stroke(); }
  }

  // ---------- 발광 ----------
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = glowC; ctx.shadowBlur = 16;
  const glowDot = (x, y, r, a) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hsl(gHue, 100, 75, a)); gr.addColorStop(1, hsl(gHue, 100, 50, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  if (p.glow > 0) {
    if (p.glowAt === 'tips' || p.glowAt === 'all') tips.forEach(([x, y], i) => glowDot(x, y, 7, p.glow * pulse * (0.6 + 0.4 * Math.sin(t * 4 + i))));
    if (p.glowAt === 'spots' || p.glowAt === 'all') { const R3 = rng(p.seed + 3); for (let i = 0; i < 16; i++) { const pt = g.outline[Math.floor(R3() * g.outline.length)]; glowDot(pt[0] * 0.7, pt[1] * 0.7 + g.center[1] * 0.3, 5, p.glow * pulse); } }
    if (p.glowAt === 'core') glowDot(g.center[0], g.center[1], 50, p.glow * pulse * 0.8);
    if (p.glowAt === 'belly') { for (let i = 0; i < 9; i++) glowDot(-60 + i * 15, (g.bottom[1] || 30) - 6, 6, p.glow * pulse); }
  }
  ctx.restore();
  ctx.restore();
}

function drawPattern(ctx, p, hue, R, t) {
  const c = hsl(hue + 20, Math.min(100, p.sat + 20), Math.max(10, p.lit - 30), 0.45);
  ctx.fillStyle = c; ctx.strokeStyle = c;
  const R2 = rng(p.seed + 11);
  switch (p.pattern) {
    case 'dots': for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(R2() * 240 - 120, R2() * 240 - 120, 3 + R2() * 4, 0, TAU); ctx.fill(); } break;
    case 'stripes': ctx.lineWidth = 5; for (let y = -120; y < 120; y += 16) { ctx.beginPath(); ctx.moveTo(-130, y); ctx.lineTo(130, y + 8); ctx.stroke(); } break;
    case 'rings': ctx.lineWidth = 2; for (let r = 10; r < 130; r += 14) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, TAU); ctx.stroke(); } break;
    case 'veins': ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { let x = 0, y = 0, a = R2() * TAU; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (R2() - 0.5) * 0.9; x += Math.cos(a) * 14; y += Math.sin(a) * 14; ctx.lineTo(x, y); } ctx.stroke(); } break;
    case 'spots': ctx.lineWidth = 2.5; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(R2() * 220 - 110, R2() * 220 - 110, 5 + R2() * 5, R2() * 2, R2() * 2 + 4.5); ctx.stroke(); } break;
    case 'chevrons': ctx.lineWidth = 3; for (let y = -120; y < 120; y += 18) { ctx.beginPath(); ctx.moveTo(-130, y + 20); ctx.lineTo(0, y); ctx.lineTo(130, y + 20); ctx.stroke(); } break;
    case 'speckle': for (let i = 0; i < 300; i++) ctx.fillRect(R2() * 240 - 120, R2() * 240 - 120, 1.4, 1.4); break;
    case 'zigzag': ctx.lineWidth = 3; for (let y = -120; y < 120; y += 26) { ctx.beginPath(); for (let x = -130; x <= 130; x += 14) ctx.lineTo(x, y + ((x / 14) % 2 ? 9 : -9)); ctx.stroke(); } break;
    default: break;
  }
}

function drawSpikes(ctx, p, g, R, line, hue, t) {
  const o = g.outline, n = o.length;
  const spike = (i, len, w, col) => {
    const pt = o[((i % n) + n) % n], [nx, ny] = normalAt(o, ((i % n) + n) % n);
    ctx.fillStyle = col || line; ctx.beginPath();
    ctx.moveTo(pt[0] - ny * w, pt[1] + nx * w); ctx.lineTo(pt[0] + nx * len, pt[1] + ny * len); ctx.lineTo(pt[0] + ny * w, pt[1] - nx * w); ctx.fill();
  };
  const R2 = rng(p.seed + 5);
  switch (p.spikes) {
    case 'twin': {
      const top = g.top, bot = g.bottom[1] > 50 ? g.bottom : [g.bottom[0], g.bottom[1] + 20];
      for (const [pt, dir] of [[top, -1], [bot, 1]]) {
        const len = 150;
        const gr = ctx.createLinearGradient(pt[0], pt[1], pt[0] + dir * 10, pt[1] + dir * len);
        gr.addColorStop(0, line); gr.addColorStop(0.85, line); gr.addColorStop(1, hsl(0, 85, 55, 0.95));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(pt[0] - 4, pt[1]); ctx.lineTo(pt[0] + dir * 14, pt[1] + dir * len); ctx.lineTo(pt[0] + 4, pt[1]); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 10; k++) ctx.fillRect(pt[0] + dir * k * 1.3, pt[1] + dir * (14 + k * 12), 1.5, 1.5);
      }
      break;
    }
    case 'radial': for (let i = 0; i < 16; i++) spike(Math.round(i * n / 16), 32, 3); break;
    case 'fuzz': for (let i = 0; i < n * 3; i++) spike(Math.floor(i / 3), 6 + R2() * 4, 0.8); break;
    case 'crown': for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.28, [tx, ty] = g.top; ctx.fillStyle = line; ctx.beginPath(); ctx.moveTo(tx - 4 + (i - 3) * 6, ty + 4); ctx.lineTo(tx + Math.cos(a) * 44 + (i - 3) * 6, ty + Math.sin(a) * 44); ctx.lineTo(tx + 4 + (i - 3) * 6, ty + 4); ctx.fill(); } break;
    case 'tail': { const [bx, by] = g.back; ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 100, by + Math.sin(t) * 10); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 50, by - 20); ctx.moveTo(bx, by); ctx.lineTo(bx + 50, by + 20); ctx.stroke(); break; }
    case 'saw': for (let i = 0; i < n; i++) { const pt = o[i]; if (pt[1] < (g.center[1] || 0)) spike(i, 14, 5); } break;
    case 'needles': ctx.globalAlpha = 0.8; for (let i = 0; i < 120; i++) spike(Math.floor(R2() * n), 14 + R2() * 30, 0.6, 'rgba(230,240,255,0.7)'); ctx.globalAlpha = 1; break;
    case 'hooks': ctx.strokeStyle = line; ctx.lineWidth = 2.5; for (let i = 0; i < 8; i++) { const k = Math.round(i * n / 8), pt = o[k], [nx, ny] = normalAt(o, k); ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.quadraticCurveTo(pt[0] + nx * 26, pt[1] + ny * 26, pt[0] + nx * 22 - ny * 12, pt[1] + ny * 22 + nx * 12); ctx.stroke(); } break;
    case 'redtip': for (let i = 0; i < 12; i++) { const k = Math.round(i * n / 12); spike(k, 40, 2.5); const pt = o[k], [nx, ny] = normalAt(o, k); ctx.fillStyle = hsl(0, 90, 55, 1); ctx.beginPath(); ctx.arc(pt[0] + nx * 40, pt[1] + ny * 40, 3, 0, TAU); ctx.fill(); } break;
    default: break;
  }
}

function drawEyes(ctx, p, g, R, t, glowC, pulse) {
  const [ex, ey] = g.eye;
  const blinkLid = (Math.sin(t * 0.9 + p.seed) > 0.985) ? 0.15 : 1;
  const eye = (x, y, r, iris = 'rgba(15,10,10,0.95)', ring = 'rgba(255,255,255,0.65)') => {
    ctx.fillStyle = ring; ctx.beginPath(); ctx.ellipse(x, y, r, r * blinkLid, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y, r * 0.62, r * 0.62 * blinkLid, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.18, 0, TAU); ctx.fill();
  };
  const glowEyes = p.glowAt === 'eyes' && p.glow > 0;
  ctx.save();
  if (glowEyes) { ctx.shadowColor = glowC; ctx.shadowBlur = 24 * pulse; }
  const red = p.eyes === 'red' || glowEyes;
  const iris = red ? 'rgba(220,20,30,0.95)' : undefined;
  switch (p.eyes) {
    case 'two': eye(ex - 12, ey, 9, iris); eye(ex + 12, ey, 9, iris); break;
    case 'tele': for (const s of [-1, 1]) { ctx.fillStyle = 'rgba(240,240,255,0.5)'; ctx.fillRect(ex + s * 10 - 5, ey - 26, 10, 26); eye(ex + s * 10, ey - 28, 7, iris); } break;
    case 'cyclops': eye(ex, ey, 18, iris); break;
    case 'eight': for (let i = 0; i < 8; i++) eye(ex - 21 + (i % 4) * 14, ey - 6 + Math.floor(i / 4) * 12, 4.5, iris); break;
    case 'stalks': for (const s of [-1, 1]) { const tx = ex + s * 26, ty = ey - 30 + Math.sin(t * 2 + s) * 4; ctx.strokeStyle = 'rgba(230,230,240,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex + s * 6, ey); ctx.lineTo(tx, ty); ctx.stroke(); eye(tx, ty, 7, iris); } break;
    case 'spots': { const R2 = rng(p.seed + 9); for (let i = 0; i < 14; i++) { const pt = g.outline[Math.floor(R2() * g.outline.length)]; eye(pt[0] * 0.8, pt[1] * 0.8 + g.center[1] * 0.2, 3, iris); } break; }
    case 'inner': ctx.globalAlpha = 0.85; eye(ex, ey + 10, 12, iris || 'rgba(40,200,120,0.9)', 'rgba(120,255,180,0.35)'); ctx.globalAlpha = 1; break;
    case 'red': eye(ex - 11, ey, 8, 'rgba(220,20,30,0.95)'); eye(ex + 11, ey, 8, 'rgba(220,20,30,0.95)'); break;
    case 'sparkle': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t; ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 6 + i)})`; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 10, ey + Math.sin(a) * 6, 2.5, 0, TAU); ctx.fill(); } eye(ex, ey, 6, iris); break;
    default: break;
  }
  ctx.restore();
}
