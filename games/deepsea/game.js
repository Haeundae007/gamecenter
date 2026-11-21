import { submitScore, myNick } from '../../js/gc.js';
import { mountComments } from '../../js/comments.js';
import { PARTS, MIND, BODIES, TEMPER, NAME_FRONT, SCI_A, SCI_B } from './data.js';
import { drawCreature, DEFAULT } from './draw.js';

mountComments(document.getElementById('comments'), 'deepsea');

const $ = id => document.getElementById(id);
const stage = $('stage'), msg = $('msg');
const cv = $('cv'), ctx = cv.getContext('2d');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 저장 ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } };
let seen = new Set(load('ds_seen', []));          // 본 질문 기록 (다 볼 때까지 안 겹치게)
let dex = load('ds_dex', []);

/* ---------- 상황 문장 (질문 앞에 붙어 매번 다른 장면을 만든다) ---------- */
const SCENES = [
  '탐사 첫날, 수심계가 막 1,000m를 넘었습니다.', '잠수정 창문에 바다눈이 소복이 쌓입니다.', '조명을 켜자 무언가 휙 숨었습니다.',
  '음파 탐지기에 정체 모를 점이 찍혔습니다.', '로봇 팔이 진흙을 한 줌 퍼 올렸습니다.', '산소 잔량 62%. 아직 시간이 있습니다.',
  '고래 뼈 근처에서 작은 움직임이 보입니다.', '열수구에서 뜨거운 물이 뿜어져 나옵니다.', '해구 벽에 붙은 무언가가 꿈틀거립니다.',
  '카메라 렌즈에 무언가 부딪혔습니다.', '조명을 끄자 주변이 반짝이기 시작합니다.', '표본 병 안의 녀석이 우리를 쳐다봅니다.',
  '심해 2일째, 연구원이 커피를 쏟았습니다.', '해류가 바뀌어 잠수정이 조금 밀렸습니다.', '작은 생물 떼가 창문을 스치고 지나갑니다.',
  '수온 2도, 바깥은 고요합니다.', '갑자기 무전이 끊겼다가 다시 연결됩니다.', '바닥 모래 위에 이상한 발자국이 있습니다.',
  '선장이 "저거 뭐야?"라고 외칩니다.', '표본 채집 그물이 무겁게 올라옵니다.', '심해 3일째, 아무도 말이 없습니다.',
  '수심 4,000m, 창밖이 완전히 깜깜합니다.', '탐사 마지막 날 새벽입니다.', '난파선 갑판 위를 지나는 중입니다.',
];

/* ---------- 질문 뽑기 ---------- */
function pickFresh(list, keyOf) {
  const fresh = list.filter(x => !seen.has(keyOf(x)));
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildRun() {
  const steps = PARTS.map(part => ({ type: 'part', part }));
  // 성격 질문 6개를 몸 질문 사이사이에 섞는다 (첫 질문은 늘 몸)
  const dims = shuffle(['EI', 'SN', 'TF', 'JP', 'EI', 'SN', 'TF', 'JP']).slice(0, 6);
  const used = new Set();
  dims.forEach(dim => {
    const pool = MIND.filter(m => m.id.startsWith(dim.toLowerCase()) && !used.has(m.id));
    const m = pickFresh(pool, x => 'm:' + x.id);
    used.add(m.id);
    const at = 1 + Math.floor(Math.random() * (steps.length - 1));
    steps.splice(at, 0, { type: 'mind', mind: m, dim });
  });
  return steps;
}

/* ---------- 상태 ---------- */
let player = myNick() || '';
let run = null, stepIdx = 0, p = { ...DEFAULT }, picks = {}, votes = {}, rarity = 0, result = null;

/* ---------- 바다 그리기 ---------- */
let snow = [];
function sizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  snow = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3, v: Math.random() * 0.02 + 0.006, d: Math.random() }));
}
function seaColor(depth = 1000) {
  const k = Math.min(1, Math.log10(Math.max(200, depth) / 200) / Math.log10(55));
  const top = [8 + (1 - k) * 22, 18 + (1 - k) * 40, 34 + (1 - k) * 60], bot = [2, 3, 8];
  return [top, bot];
}
let last = performance.now(), t = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  t += calm ? dt * 0.3 : dt;
  const W = cv.width, H = cv.height;
  const [top, bot] = seaColor(p.depth);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgb(${top.map(Math.round)})`); gr.addColorStop(1, `rgb(${bot})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // 바다눈
  for (const s of snow) {
    s.y += s.v * dt; s.x += Math.sin(t * 0.3 + s.d * 9) * 0.0004;
    if (s.y > 1) { s.y = 0; s.x = Math.random(); }
    ctx.fillStyle = `rgba(210,220,235,${0.25 + s.d * 0.4})`;
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * (W / 700 + 0.6), 0, Math.PI * 2); ctx.fill();
  }
  drawCreature(ctx, p, t, W, H, { zoom: result ? 1.05 : 0.95 });
}

/* ---------- 효과음 (기본은 꺼짐) ---------- */
let ac = null, soundOn = false;
function audio() {
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ac = new AC(); } catch { return null; } }
  return ac;
}
function blip(freq = 520, dur = 0.18, type = 'sine', vol = 0.06, slide = 1.8) {
  if (!soundOn || !ac) return;
  const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const bubble = () => { blip(300 + Math.random() * 300, 0.14, 'sine', 0.07, 2.6); setTimeout(() => blip(500 + Math.random() * 300, 0.1, 'sine', 0.04, 2.2), 70); };
const sonar = () => { blip(1180, 1.2, 'sine', 0.06, 0.98); setTimeout(() => blip(1180, 0.9, 'sine', 0.025, 0.98), 420); };
$('snd').addEventListener('click', () => {
  if (!audio()) { $('snd').textContent = '소리 없음'; return; }
  soundOn = !soundOn;
  if (soundOn) ac.resume(); else ac.suspend();
  $('snd').setAttribute('aria-pressed', soundOn); $('snd').textContent = soundOn ? '소리 끄기' : '소리 켜기';
});

/* ---------- 화면 ---------- */
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); Object.assign(e, attrs); if (text != null) e.textContent = text; return e; };

function showStart() {
  result = null; run = null;
  p = { ...DEFAULT, body: 'jelly', hue: 300, sat: 60, lit: 72, alpha: 0.3, limbs: 'threads', glowAt: 'tips', glow: 0.8, glowHue: 200, eyes: 'none', seed: 7, depth: 1000 };
  $('sea').classList.remove('big'); sizeCanvas();
  $('tag').textContent = '수심 0m';
  stage.textContent = '';
  const f = el('form', { className: 'start' });
  f.append(el('label', { htmlFor: 'pname' }, '탐사대원 이름'));
  const row = el('div', { className: 'row' });
  const inp = el('input', { id: 'pname', maxLength: 10, placeholder: '이름 (2~10자)', value: player, autocomplete: 'off' });
  row.append(inp, el('button', { type: 'submit' }, '심해로 내려가기'));
  f.append(row);
  const total = PARTS.reduce((m, part) => m * part.opts.length, 1);
  const qTotal = PARTS.reduce((s, part) => s + part.asks.length, 0) * SCENES.length + MIND.length;
  f.append(el('p', { className: 'dim' }, `만들 수 있는 생물 ${Math.round(total / 1e8).toLocaleString('ko-KR')}억 가지 이상. 질문 장면 ${qTotal.toLocaleString('ko-KR')}가지 중 이미 본 장면은 다 볼 때까지 다시 나오지 않아요.`));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const n = inp.value.replace(/[<>"'`]/g, '').trim().slice(0, 10);
    if (n.length < 2) { inp.focus(); msg.textContent = '이름을 2자 이상 적어 주세요.'; return; }
    player = n; try { localStorage.setItem('gc_nick', n); } catch { /* 무시 */ }
    msg.textContent = '';
    startRun();
  });
  stage.append(f);
}

function startRun() {
  run = buildRun(); stepIdx = 0; picks = {}; votes = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }; rarity = 0; result = null;
  p = { ...DEFAULT, seed: Math.floor(Math.random() * 1e9), alpha: 0.18, body: 'jelly' };
  showStep();
}

function showStep() {
  const step = run[stepIdx];
  stage.textContent = '';
  $('tag').textContent = `수심 ${(p.depth || Math.round(200 + stepIdx * 260)).toLocaleString('ko-KR')}m`;
  const bar = el('div', { className: 'bar' });
  bar.append(el('span', {}, `${player} 대원 · ${stepIdx + 1} / ${run.length}`), el('span', {}, step.type === 'mind' ? '성격 질문' : step.part.label));
  stage.append(bar);
  const q = el('p', { className: 'q' });
  const opts = el('div', { className: 'opts' });
  if (step.type === 'part') {
    const part = step.part;
    const askI = Math.floor(Math.random() * part.asks.length);
    const sceneI = (() => { // 아직 안 본 (질문, 장면) 조합을 고른다
      const order = shuffle([...SCENES.keys()]);
      return order.find(s => !seen.has(`p:${part.key}:${askI}:${s}`)) ?? order[0];
    })();
    seen.add(`p:${part.key}:${askI}:${sceneI}`);
    q.append(el('small', {}, SCENES[sceneI]), document.createTextNode(part.asks[askI]));
    const shown = shuffle([...part.opts]).slice(0, Math.min(part.pick, part.opts.length));
    shown.forEach(o => {
      const b = el('button', { type: 'button' }, o.t);
      b.addEventListener('click', () => choosePart(part, o));
      opts.append(b);
    });
  } else {
    const m = step.mind;
    seen.add('m:' + m.id);
    q.append(el('small', {}, '이 녀석이라면…'), document.createTextNode(m.q));
    shuffle([...m.a]).forEach(([text, pole]) => {
      const b = el('button', { type: 'button' }, text);
      b.addEventListener('click', () => chooseMind(pole));
      opts.append(b);
    });
  }
  save('ds_seen', [...seen]);
  stage.append(q, opts);
}

function choosePart(part, o) {
  Object.assign(p, o.set);
  picks[part.key] = o.t;
  rarity += o.r;
  bubble();
  next();
}
// 성격 답도 생김새에 조금씩 묻어난다.
const MIND_TWEAK = {
  E: q => { q.glow = Math.min(1, (q.glow || 0) + 0.15); if (q.glowAt === 'none') { q.glowAt = 'spots'; q.glowHue = 170; } },
  I: q => { q.alpha = Math.max(0.12, (q.alpha || 0.4) - 0.06); },
  S: q => { q.sat = Math.max(15, (q.sat || 50) - 8); },
  N: q => { q.hue = ((q.hue || 0) + 25) % 360; },
  T: q => { q.lit = Math.max(20, (q.lit || 60) - 5); },
  F: q => { q.lit = Math.min(90, (q.lit || 60) + 5); },
  J: () => {},
  P: q => { q.seed = (q.seed || 1) + 13; },
};
function chooseMind(pole) {
  votes[pole]++;
  MIND_TWEAK[pole](p);
  bubble();
  next();
}
function next() {
  stepIdx++;
  if (stepIdx >= run.length) finish(); else showStep();
}

/* ---------- 결과 ---------- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function finish() {
  const type = (votes.E >= votes.I ? 'E' : 'I') + (votes.S >= votes.N ? 'S' : 'N') + (votes.T >= votes.F ? 'T' : 'F') + (votes.J >= votes.P ? 'J' : 'P');
  const key = JSON.stringify([p.body, p.spikes, p.limbs, p.eyes, p.glowAt, p.special, p.pattern, p.move, p.hue, p.size, p.depth, type]);
  const h = hashStr(key);
  const front = NAME_FRONT[h % NAME_FRONT.length];
  const bodyName = BODIES[p.body].name;
  const name = `${front} ${bodyName}`;
  const sci = `${BODIES[p.body].sci} ${SCI_A[(h >>> 5) % SCI_A.length]}${SCI_B[(h >>> 9) % SCI_B.length]}`;
  const no = (h % 99991) + 1;
  const score = rarity * 37 + (p.depth >= 10000 ? 300 : 0) + (p.size >= 1.3 ? 200 : 0) + (h % 37);
  result = { p: { ...p }, name, sci, no, type, score, picks: { ...picks }, at: Date.now(), player };
  run = null;
  dex.unshift(result); dex = dex.slice(0, 200); save('ds_dex', dex);
  sonar();
  $('sea').classList.add('big'); sizeCanvas();
  $('tag').textContent = `도감 No.${String(no).padStart(5, '0')} · 수심 ${(p.depth || 0).toLocaleString('ko-KR')}m`;
  renderResult();
  renderDex();
}
function renderResult() {
  const r = result;
  stage.textContent = '';
  const card = el('section', { className: 'card' });
  card.append(el('h2', {}, r.name), el('p', { className: 'sci' }, r.sci));
  const dl = el('dl');
  const row = (k, v, cls) => { dl.append(el('dt', {}, k)); const d = el('dd', {}, v); if (cls) d.className = cls; dl.append(d); };
  row('발견자', `${r.player} 대원`);
  row('성격', `${r.type}`, 'mbti');
  row('', TEMPER[r.type]);
  row('크기', `${r.picks.size || ''} (${r.p.sizeName || '-'})`);
  row('사는 곳', `${r.p.depthName || '-'} · ${(r.p.depth || 0).toLocaleString('ko-KR')}m`);
  row('먹이', r.p.food || '-');
  row('생김새', [r.picks.color, r.picks.spikes, r.picks.limbs, r.picks.eyes].filter(Boolean).join(', '));
  row('특징', [r.picks.glow, r.picks.special, r.picks.pattern, r.picks.move].filter(Boolean).join(', '));
  row('희귀도', `${r.score.toLocaleString('ko-KR')}점`);
  card.append(dl);
  const act = el('div', { className: 'actions' });
  const reg = el('button', { type: 'button' }, '랭킹에 등록하기');
  reg.addEventListener('click', async () => { reg.disabled = true; msg.textContent = await submitScore('deepsea', r.score); });
  const again = el('button', { type: 'button' }, '다음 생물 만들기');
  again.addEventListener('click', () => { msg.textContent = ''; $('sea').classList.remove('big'); sizeCanvas(); startRun(); });
  const who = el('button', { type: 'button', className: 'sub' }, '대원 이름 바꾸기');
  who.addEventListener('click', () => { msg.textContent = ''; showStart(); });
  act.append(again, reg, who);
  card.append(act);
  stage.append(card);
}

/* ---------- 도감 ---------- */
function renderDex() {
  const ul = $('dex'); ul.textContent = '';
  $('dexInfo').textContent = dex.length ? `지금까지 ${dex.length}마리를 발견했어요. 이 브라우저에만 저장돼요.` : '아직 발견한 생물이 없어요.';
  dex.slice(0, 30).forEach(d => {
    const li = el('li');
    const c = el('canvas', { width: 128, height: 128 });
    const g = c.getContext('2d'); g.fillStyle = '#02040a'; g.fillRect(0, 0, 128, 128);
    drawCreature(g, { ...d.p, move: 'still' }, 1.3, 128, 128, { zoom: 0.8 });
    const meta = el('div', { className: 'meta' });
    meta.append(el('b', {}, `No.${String(d.no).padStart(5, '0')} ${d.name}`), el('span', {}, `${d.type} · ${d.p.depthName || ''} · 희귀도 ${d.score}점 · ${d.player} 대원`));
    li.append(c, meta);
    ul.append(li);
  });
}

addEventListener('resize', sizeCanvas);
sizeCanvas();
renderDex();
showStart();
requestAnimationFrame(frame);
window.__ds = { get p() { return p; }, choose: i => stage.querySelectorAll('.opts button')[i]?.click(), get result() { return result; } };
