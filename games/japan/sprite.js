// 기원이 (하얗고 통통한 하늘다람쥐, 동그란 안경 + 남색 넥타이)와 자취방. 저해상도 도트.
// 도형을 32x32 격자에 찍고 외곽선을 자동으로 둘러서 포즈가 바뀌어도 모양이 안 무너지게 함.

const P = {
  outline: '#4a4038', fur: '#f6f2ea', shade: '#dcd5c8', tip: '#b9b2a6', belly: '#fffdf8',
  pink: '#f2a2ad', blush: '#f7b8c0', eye: '#2a2228', shine: '#fff', glass: '#3b4a6b',
  tie: '#2f4b8f', tieDark: '#1f3366', leaf: '#7cc96b', rice: '#fff', nori: '#2e3b2e',
  book: '#d9534f', bookPage: '#fff8e7', sweat: '#8fd3ff', zzz: '#9fb6ff',
};

function grid() { return { w: 32, h: 32, px: new Array(32 * 32).fill(null) }; }
function put(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[y * g.w + x] = c; }
function oval(g, cx, cy, rx, ry, c) {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) put(g, x, y, c);
  }
}
function rect(g, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(g, x, y, c); }
function outline(g) {
  const src = g.px.slice();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (src[y * g.w + x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src[(y + dy) * g.w + (x + dx)] && x + dx >= 0 && x + dx < g.w && y + dy >= 0 && y + dy < g.h)) put(g, x, y, P.outline);
  }
}

function eyes(g, hy, kind) {
  for (const ex of [12, 20]) {
    // 동그란 안경테
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      put(g, ex + 0.5 + Math.cos(t) * 3, hy + Math.sin(t) * 2.6, P.glass);
    }
    if (kind === 'happy') { put(g, ex - 1, hy + 0.5, P.eye); put(g, ex, hy - 0.5, P.eye); put(g, ex + 1, hy - 0.5, P.eye); put(g, ex + 2, hy + 0.5, P.eye); }
    else if (kind === 'closed') rect(g, ex - 1, hy, 4, 1, P.eye);
    else if (kind === 'tired') { rect(g, ex - 1, hy, 4, 1, P.eye); rect(g, ex, hy + 1, 2, 1, P.eye); }
    else if (kind === 'panic') { put(g, ex - 1, hy - 1, P.eye); put(g, ex, hy, P.eye); put(g, ex + 1, hy, P.eye); put(g, ex + 2, hy - 1, P.eye); put(g, ex, hy + 1, P.eye); put(g, ex + 1, hy + 1, P.eye); }
    else { oval(g, ex + 0.5, hy, 1.4, 1.8, P.eye); put(g, ex, hy - 1, P.shine); }
  }
  put(g, 16, hy, P.glass); put(g, 15, hy, P.glass); put(g, 17, hy, P.glass); // 안경 다리
}

/** pose: idle | happy | study | eat | tired | panic | sleep ; frame 0..3 */
export function makeKiwon(pose = 'idle', frame = 0) {
  const g = grid();
  const bob = (pose === 'idle' || pose === 'happy') && frame % 2 ? 1 : 0;

  if (pose === 'sleep') {
    // 누워서 자는 모습: 옆으로 길쭉
    oval(g, 8, 24, 5, 4, P.fur); oval(g, 6, 22, 3, 2.5, P.tip);
    oval(g, 17, 24, 10, 6, P.fur); oval(g, 18, 25.5, 7, 3.5, P.belly);
    oval(g, 25, 19, 6, 5.5, P.fur); oval(g, 26, 20.5, 4.2, 3, P.belly);
    oval(g, 23, 14, 1.8, 2.4, P.fur); put(g, 23, 13, P.tip);
    rect(g, 23, 19, 3, 1, P.eye); rect(g, 27, 19, 3, 1, P.eye);
    put(g, 28, 21, P.pink);
    rect(g, 20, 23, 2, 4, P.tie);
    outline(g);
    const z = frame % 2;
    [[21, 9 - z], [24, 6 - z], [27, 3 - z]].forEach(([x, y], i) => { rect(g, x, y, 2 + (i > 0 ? 1 : 0), 1, P.zzz); });
    return g;
  }

  // 꼬리 (넓적, 끝은 회색)
  const tailUp = pose === 'happy' ? -2 : pose === 'tired' ? 4 : 0;
  oval(g, 26, 17 + tailUp + bob, 5.5, 8.5, P.fur);
  oval(g, 27, 11 + tailUp + bob, 3.5, 3.5, P.tip);

  // 통통한 몸
  oval(g, 16, 22 + bob, 10.5, 8.5, P.fur);
  oval(g, 16, 23.5 + bob, 7, 6, P.belly);
  oval(g, 9, 27, 3, 2, P.shade); oval(g, 23, 27, 3, 2, P.shade);

  // 머리 (몸에 거의 붙어 있음)
  const hy = 12 + bob;
  oval(g, 9, hy - 7, 2.6, 3, P.fur); oval(g, 23, hy - 7, 2.6, 3, P.fur);
  put(g, 9, hy - 9, P.tip); put(g, 23, hy - 9, P.tip);
  oval(g, 9, hy - 6.5, 1.1, 1.5, P.pink); oval(g, 23, hy - 6.5, 1.1, 1.5, P.pink);
  oval(g, 16, hy, 10, 7.5, P.fur);
  oval(g, 16, hy + 2.5, 7, 4, P.belly);
  [[16, -5], [15, -4], [16, -4], [17, -4], [16, -3]].forEach(([x, dy]) => put(g, x, hy + dy, P.leaf));

  const eyeKind = { happy: 'happy', tired: 'tired', panic: 'panic', study: 'open', eat: 'happy' }[pose] || (frame === 3 ? 'closed' : 'open');
  eyes(g, hy, eyeKind);
  put(g, 16, hy + 3, P.pink);
  if (pose === 'happy' || pose === 'eat') { put(g, 15, hy + 4, P.outline); put(g, 16, hy + 5, P.pink); put(g, 17, hy + 4, P.outline); }
  else if (pose === 'tired' || pose === 'panic') { put(g, 15, hy + 5, P.outline); put(g, 16, hy + 4, P.outline); put(g, 17, hy + 5, P.outline); }
  else { put(g, 15, hy + 4, P.outline); put(g, 17, hy + 4, P.outline); }
  if (pose !== 'tired') { put(g, 8, hy + 3, P.blush); put(g, 9, hy + 3, P.blush); put(g, 23, hy + 3, P.blush); put(g, 24, hy + 3, P.blush); }

  // 넥타이
  rect(g, 15, 19 + bob, 3, 2, P.tie); rect(g, 15, 21 + bob, 3, 4, P.tie); put(g, 16, 25 + bob, P.tie);
  put(g, 16, 19 + bob, P.tieDark);

  if (pose === 'study') {
    rect(g, 9, 21, 14, 6, P.book); rect(g, 10, 22, 6, 4, P.bookPage); rect(g, 17, 22, 5, 4, P.bookPage); rect(g, 16, 21, 1, 6, P.outline);
  } else if (pose === 'eat') {
    oval(g, 16, 23, 3.5, 3, P.rice); rect(g, 14, 24, 5, 2, P.nori);
  }
  if (pose === 'tired' || pose === 'panic') { put(g, 4, hy - 4, P.sweat); put(g, 4, hy - 3, P.sweat); put(g, 3, hy - 3, P.sweat); }

  outline(g);
  return g;
}

export function drawSprite(ctx, g, x, y) {
  for (let py = 0; py < g.h; py++) for (let px = 0; px < g.w; px++) {
    const c = g.px[py * g.w + px];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x) + px, Math.round(y) + py, 1, 1);
  }
}

// --- 자취방 (160x100) ---------------------------------------------------------

export const ROOM_W = 160, ROOM_H = 100, FLOOR_Y = 82;

function skyFor(min) {
  const h = (min / 60) % 24;
  if (h < 6 || h >= 20) return ['#1d2142', '#2a3060'];
  if (h < 9) return ['#9fd3f5', '#ffd9a8'];
  if (h < 17) return ['#7cc4f2', '#bfe6ff'];
  return ['#f2a36b', '#ffd28a'];
}

export function drawRoom(ctx, min, t, { awayNote = false } = {}) {
  const night = (min / 60) % 24 >= 20 || (min / 60) % 24 < 6;
  // 벽, 바닥
  ctx.fillStyle = night ? '#4b4660' : '#efe4d0'; ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  ctx.fillStyle = night ? '#3f3a52' : '#e3d5bc'; for (let x = 0; x < ROOM_W; x += 8) ctx.fillRect(x, 0, 1, FLOOR_Y);
  ctx.fillStyle = night ? '#5a4a3c' : '#b98d5f'; ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  ctx.fillStyle = night ? '#4c3e33' : '#a67c50'; for (let x = 0; x < ROOM_W; x += 16) ctx.fillRect(x, FLOOR_Y, 1, ROOM_H - FLOOR_Y);

  // 창문
  const [s1, s2] = skyFor(min);
  ctx.fillStyle = '#6b5a48'; ctx.fillRect(58, 10, 40, 30);
  ctx.fillStyle = s1; ctx.fillRect(60, 12, 36, 13); ctx.fillStyle = s2; ctx.fillRect(60, 25, 36, 13);
  ctx.fillStyle = '#6b5a48'; ctx.fillRect(77, 12, 2, 26); ctx.fillRect(60, 24, 36, 2);
  if (night) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(86, 15, 4, 4); ctx.fillStyle = s1; ctx.fillRect(88, 15, 2, 2); }
  else { ctx.fillStyle = '#fff'; ctx.fillRect(64 + (t * 2) % 30, 16, 6, 2); ctx.fillRect(66 + (t * 2) % 30, 15, 3, 1); }

  // 침대 (왼쪽)
  ctx.fillStyle = '#7a5a40'; ctx.fillRect(4, 62, 44, 20); ctx.fillRect(4, 54, 4, 28);
  ctx.fillStyle = '#9fc3e8'; ctx.fillRect(8, 60, 40, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(9, 57, 10, 5);

  // 책상 + 스탠드 (오른쪽)
  ctx.fillStyle = '#8a6a4a'; ctx.fillRect(104, 60, 40, 4); ctx.fillRect(106, 64, 3, 18); ctx.fillRect(139, 64, 3, 18);
  ctx.fillStyle = '#d9534f'; ctx.fillRect(126, 55, 10, 5); ctx.fillStyle = '#5b8def'; ctx.fillRect(127, 51, 8, 4);
  ctx.fillStyle = '#444'; ctx.fillRect(110, 46, 2, 14); ctx.fillRect(110, 46, 8, 2);
  ctx.fillStyle = night ? '#ffe680' : '#bbb'; ctx.fillRect(115, 48, 5, 2);
  if (night) { ctx.fillStyle = 'rgba(255,230,128,0.18)'; ctx.fillRect(104, 48, 40, 34); }

  // 벽 달력, 문
  ctx.fillStyle = '#fff'; ctx.fillRect(108, 16, 16, 18); ctx.fillStyle = '#d9534f'; ctx.fillRect(108, 16, 16, 4);
  ctx.fillStyle = '#7a5a40'; ctx.fillRect(148, 30, 12, 52); ctx.fillStyle = '#d4b04c'; ctx.fillRect(150, 56, 2, 2);
  if (awayNote) { ctx.fillStyle = '#fff59d'; ctx.fillRect(70, 52, 20, 12); ctx.fillStyle = '#555'; ctx.fillRect(73, 56, 14, 1); ctx.fillRect(73, 59, 10, 1); }
}
