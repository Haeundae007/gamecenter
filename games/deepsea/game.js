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
let seen = new Set(load('ds_seen2', []));   // 본 질문은 다 볼 때까지 다시 안 낸다
let dex = load('ds_dex', []);

/* ---------- 질문 순서 ---------- */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function freshPick(list, keyOf) {
  const fresh = list.filter(x => !seen.has(keyOf(x)));
  if (!fresh.length) { list.forEach(x => seen.delete(keyOf(x))); return list[Math.floor(Math.random() * list.length)]; }
  return fresh[Math.floor(Math.random() * fresh.length)];
}
function buildRun() {
  // 몸 질문은 순서를 섞되 '몸'은 앞쪽에. 성격 질문 4개를 사이사이에.
  const parts = [PARTS[0], ...shuffle(PARTS.slice(1))];
  const steps = parts.map(part => {
    const qi = freshPick(part.qs.map((_, i) => i), i => `q:${part.key}:${i}`);
    return { type: 'part', part, q: part.qs[qi], key: `q:${part.key}:${qi}` };
  });
  const dims = shuffle(['EI', 'SN', 'TF', 'JP']);
  dims.forEach(dim => {
    const m = freshPick(MIND.filter(x => x.id.startsWith(dim.toLowerCase())), x => 'm:' + x.id);
    steps.splice(2 + Math.floor(Math.random() * (steps.length - 2)), 0, { type: 'mind', mind: m, key: 'm:' + m.id });
  });
  return steps;
}

/* ---------- 상태 ---------- */
let player = myNick() || '';
let run = null, stepIdx = 0, p = { ...DEFAULT }, picks = {}, votes = {}, rarity = 0, result = null;
let phase = 'intro', revealT = 0;

/* ---------- 바다 ---------- */
let snow = [], motes = [];
function sizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  snow = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3, v: Math.random() * 0.02 + 0.006, d: Math.random() }));
  motes = Array.from({ length: 9 }, () => ({ x: Math.random(), y: Math.random(), h: 170 + Math.random() * 60, ph: Math.random() * 7 }));
}
function seaColor(depth) {
  const k = depth ? Math.min(1, Math.log10(Math.max(200, depth) / 200) / Math.log10(55)) : 0.6;
  return [[8 + (1 - k) * 22, 18 + (1 - k) * 40, 34 + (1 - k) * 60], [2, 3, 8]];
}
let last = performance.now(), t = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  t += calm ? dt * 0.3 : dt;
  const W = cv.width, H = cv.height;
  const [top, bot] = seaColor(phase === 'result' ? p.depth : 0);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgb(${top.map(Math.round)})`); gr.addColorStop(1, `rgb(${bot})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  for (const s of snow) {
    s.y += s.v * dt; s.x += Math.sin(t * 0.3 + s.d * 9) * 0.0004;
    if (s.y > 1) { s.y = 0; s.x = Math.random(); }
    ctx.fillStyle = `rgba(210,220,235,${0.25 + s.d * 0.4})`;
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * (W / 700 + 0.6), 0, Math.PI * 2); ctx.fill();
  }
  // 먼 곳에서 깜빡이는 다른 생물들의 빛
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    const a = Math.max(0, Math.sin(t * 0.7 + m.ph)) * 0.35;
    const g2 = ctx.createRadialGradient(m.x * W, m.y * H, 0, m.x * W, m.y * H, 14);
    g2.addColorStop(0, `hsla(${m.h},90%,70%,${a})`); g2.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = g2; ctx.fillRect(m.x * W - 14, m.y * H - 14, 28, 28);
    m.x += Math.sin(t * 0.2 + m.ph) * 0.0003;
  }
  ctx.restore();

  if (phase === 'forming') {
    // 아직 정체를 모르는 희미한 형체
    const k = run ? stepIdx / run.length : 0;
    ctx.save();
    ctx.filter = `blur(${Math.round(14 - k * 8)}px) brightness(${0.35 + k * 0.25})`;
    ctx.globalAlpha = 0.35 + k * 0.25;
    drawCreature(ctx, p, t, W, H, { zoom: 0.95 });
    ctx.restore();
  } else if (phase === 'reveal' || phase === 'result') {
    let k = 1;
    if (phase === 'reveal') { revealT += dt; k = Math.min(1, revealT / 2.4); if (k >= 1) { phase = 'result'; } }
    const e = 1 - Math.pow(1 - k, 3);
    ctx.save();
    if (k < 1) { ctx.filter = `blur(${Math.round((1 - e) * 10)}px)`; ctx.globalAlpha = 0.5 + e * 0.5; }
    drawCreature(ctx, p, t, W, H, { zoom: 0.8 + e * 0.25 });
    ctx.restore();
    if (k < 1) { // 빛이 번지며 드러난다
      const g3 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * (0.2 + e * 0.6));
      g3.addColorStop(0, `rgba(200,235,255,${(1 - e) * 0.55})`); g3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
    }
  }
}

/* ---------- 소리 ---------- */
let ac = null, sfxOn = false, musicOn = false, music = null;
function audio() {
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ac = new AC(); } catch { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function blip(freq = 520, dur = 0.18, type = 'sine', vol = 0.06, slide = 1.8) {
  if (!sfxOn || !ac) return;
  const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const bubble = () => { blip(300 + Math.random() * 300, 0.14, 'sine', 0.07, 2.6); setTimeout(() => blip(500 + Math.random() * 300, 0.1, 'sine', 0.04, 2.2), 70); };
const sonar = () => { blip(1180, 1.2, 'sine', 0.06, 0.98); setTimeout(() => blip(1180, 0.9, 'sine', 0.025, 0.98), 420); };
const rise = () => { blip(180, 2.2, 'triangle', 0.05, 3); };

// 배경음악: 깊은 바다의 느린 화음, 아주 낮은 웅웅거림, 가끔 고래 소리와 음파 신호. 파일 없이 합성한다.
function startMusic() {
  const a = audio(); if (!a) return null;
  const out = a.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(0.55, a.currentTime + 4);
  const comp = a.createDynamicsCompressor(); out.connect(comp); comp.connect(a.destination);
  // 물속 울림 (피드백 딜레이)
  const delay = a.createDelay(2); delay.delayTime.value = 0.42;
  const fb = a.createGain(); fb.gain.value = 0.45; const wet = a.createGain(); wet.gain.value = 0.5;
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1400;
  delay.connect(tone); tone.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
  const send = node => { node.connect(out); node.connect(delay); };
  // 바닥 웅웅거림
  const drone = a.createOscillator(); drone.frequency.value = 55; const dg = a.createGain(); dg.gain.value = 0.06; drone.connect(dg); dg.connect(out); drone.start();
  const pad = a.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = 650; pad.Q.value = 0.7; send(pad);
  const lfo = a.createOscillator(); lfo.frequency.value = 0.05; const lg = a.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(pad.frequency); lfo.start();
  const CHORDS = [[110, 164.8, 261.6], [87.3, 130.8, 220], [73.4, 110, 174.6], [82.4, 123.5, 196]]; // Am F Dm Em
  let ci = 0;
  const voices = [];
  function chord() {
    const now = a.currentTime;
    voices.splice(0).forEach(v => { v.g.gain.cancelScheduledValues(now); v.g.gain.setValueAtTime(v.g.gain.value, now); v.g.gain.linearRampToValueAtTime(0, now + 4); v.o.forEach(o => o.stop(now + 4.2)); });
    CHORDS[ci++ % CHORDS.length].forEach((f, i) => {
      const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06 - i * 0.012, now + 4); g.connect(pad);
      const o1 = a.createOscillator(), o2 = a.createOscillator(); o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.value = f; o2.frequency.value = f * 1.004; o1.connect(g); o2.connect(g); o1.start(now); o2.start(now);
      voices.push({ g, o: [o1, o2] });
    });
  }
  function whale() {
    const now = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(170, now); o.frequency.linearRampToValueAtTime(310, now + 1.6); o.frequency.linearRampToValueAtTime(140, now + 4);
    const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 5; vg.gain.value = 6; vib.connect(vg); vg.connect(o.frequency); vib.start(now); vib.stop(now + 4.2);
    f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 1.2;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.05, now + 1); g.gain.linearRampToValueAtTime(0, now + 4);
    o.connect(f); f.connect(g); send(g); o.start(now); o.stop(now + 4.2);
  }
  function ping() {
    const now = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 1320; g.gain.setValueAtTime(0.025, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    o.connect(g); send(g); o.start(now); o.stop(now + 1.5);
  }
  chord();
  const timers = [setInterval(chord, 9000), setInterval(() => { if (Math.random() < 0.6) whale(); }, 14000), setInterval(ping, 11000)];
  return { stop() { out.gain.linearRampToValueAtTime(0, a.currentTime + 1.5); timers.forEach(clearInterval); setTimeout(() => { try { drone.stop(); lfo.stop(); voices.forEach(v => v.o.forEach(o => o.stop())); } catch { /* 이미 멈춤 */ } }, 1700); } };
}
$('bgm').addEventListener('click', () => {
  if (!audio()) return;
  musicOn = !musicOn;
  if (musicOn) music = startMusic(); else if (music) { music.stop(); music = null; }
  $('bgm').setAttribute('aria-pressed', musicOn); $('bgm').textContent = musicOn ? '음악 끄기' : '음악 켜기';
});
$('snd').addEventListener('click', () => {
  if (!audio()) return;
  sfxOn = !sfxOn;
  $('snd').setAttribute('aria-pressed', sfxOn); $('snd').textContent = sfxOn ? '효과음 끄기' : '효과음 켜기';
});
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (musicOn || sfxOn) ac.resume(); });

/* ---------- 화면 ---------- */
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); Object.assign(e, attrs); if (text != null) e.textContent = text; return e; };

function showIntro() {
  phase = 'intro'; result = null; run = null;
  $('sea').classList.remove('big'); sizeCanvas(); $('tag').textContent = '';
  stage.textContent = '';
  const box = el('section', { className: 'intro' });
  const lines = ['만약 당신이 깊은 바다에서 태어났다면,', '햇빛 한 줄기 닿지 않는 그곳에서', '어떤 모습으로 살고 있을까요?', '평소의 당신에 대해 몇 가지만 물어볼게요. 정답은 없어요.'];
  lines.forEach((l, i) => { const p1 = el('p', { className: 'line' }, l); p1.style.animationDelay = `${i * 0.9}s`; box.append(p1); });
  const f = el('form', { className: 'start' });
  f.style.animationDelay = `${lines.length * 0.9}s`;
  const row = el('div', { className: 'row' });
  const inp = el('input', { id: 'pname', maxLength: 10, placeholder: '당신의 이름', value: player, autocomplete: 'off' });
  row.append(inp, el('button', { type: 'submit' }, '깊은 바다로'));
  f.append(row);
  f.addEventListener('submit', e => {
    e.preventDefault();
    const n = inp.value.replace(/[<>"'`]/g, '').trim().slice(0, 10);
    if (n.length < 2) { inp.focus(); msg.textContent = '이름을 2자 이상 적어 주세요.'; return; }
    player = n; try { localStorage.setItem('gc_nick', n); } catch { /* 무시 */ }
    msg.textContent = '';
    startRun();
  });
  box.append(f);
  stage.append(box);
}

function startRun() {
  run = buildRun(); stepIdx = 0; picks = {}; votes = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }; rarity = 0; result = null;
  p = { ...DEFAULT, seed: Math.floor(Math.random() * 1e9), alpha: 0.25, body: ['jelly', 'squid', 'comb'][Math.floor(Math.random() * 3)], move: 'float' };
  phase = 'forming';
  showStep();
}

function showStep() {
  const step = run[stepIdx];
  stage.textContent = '';
  const bar = el('div', { className: 'bar' });
  const dots = el('span', { className: 'dots' });
  for (let i = 0; i < run.length; i++) dots.append(el('i', { className: i < stepIdx ? 'on' : i === stepIdx ? 'now' : '' }));
  bar.append(dots);
  stage.append(bar);
  const q = el('p', { className: 'q' });
  const opts = el('div', { className: 'opts' });
  seen.add(step.key); save('ds_seen2', [...seen]);
  if (step.type === 'part') {
    q.textContent = step.q.q;
    shuffle([...step.q.a]).forEach(([text, idx]) => {
      const b = el('button', { type: 'button' }, text);
      b.addEventListener('click', () => choosePart(step.part, step.part.opts[idx]));
      opts.append(b);
    });
  } else {
    q.textContent = step.mind.q.replace('이 녀석', '당신');
    shuffle([...step.mind.a]).forEach(([text, pole]) => {
      const b = el('button', { type: 'button' }, text);
      b.addEventListener('click', () => chooseMind(pole));
      opts.append(b);
    });
  }
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
function chooseMind(pole) { votes[pole]++; MIND_TWEAK[pole](p); bubble(); next(); }
function next() { stepIdx++; if (stepIdx >= run.length) finish(); else showStep(); }

/* ---------- 결과 ---------- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function finish() {
  const type = (votes.E >= votes.I ? 'E' : 'I') + (votes.S >= votes.N ? 'S' : 'N') + (votes.T >= votes.F ? 'T' : 'F') + (votes.J >= votes.P ? 'J' : 'P');
  const key = JSON.stringify([p.body, p.spikes, p.limbs, p.eyes, p.glowAt, p.special, p.pattern, p.move, p.hue, p.size, p.depth, type]);
  const h = hashStr(key);
  const name = `${NAME_FRONT[h % NAME_FRONT.length]} ${BODIES[p.body].name}`;
  const sci = `${BODIES[p.body].sci} ${SCI_A[(h >>> 5) % SCI_A.length]}${SCI_B[(h >>> 9) % SCI_B.length]}`;
  const no = (h % 99991) + 1;
  const score = rarity * 37 + (p.depth >= 10000 ? 300 : 0) + (p.size >= 1.3 ? 200 : 0) + (h % 37);
  result = { p: { ...p }, name, sci, no, type, score, picks: { ...picks }, at: Date.now(), player };
  run = null;
  dex.unshift(result); dex = dex.slice(0, 200); save('ds_dex', dex);
  phase = 'reveal'; revealT = 0;
  rise(); setTimeout(sonar, 1800);
  $('sea').classList.add('big'); sizeCanvas();
  stage.textContent = '';
  setTimeout(() => {
    $('tag').textContent = `도감 No.${String(no).padStart(5, '0')} · ${p.depthName || ''}`;
    renderResult(); renderDex();
  }, calm ? 0 : 2400);
}
function renderResult() {
  const r = result;
  stage.textContent = '';
  const card = el('section', { className: 'card' });
  card.append(el('p', { className: 'lead' }, `${r.player}, 깊은 바다의 당신은`), el('h2', {}, r.name), el('p', { className: 'sci' }, r.sci));
  const dl = el('dl');
  const row = (k, v, cls) => { dl.append(el('dt', {}, k)); const d = el('dd', {}, v); if (cls) d.className = cls; dl.append(d); };
  row('성격', `${r.type} · ${TEMPER[r.type]}`);
  row('크기', `${r.picks.size || ''} (${r.p.sizeName || '-'})`);
  row('사는 곳', `${r.p.depthName || '-'} · 수심 ${(r.p.depth || 0).toLocaleString('ko-KR')}m`);
  row('먹이', r.p.food || '-');
  row('생김새', [r.picks.body, r.picks.color, r.picks.spikes, r.picks.limbs, r.picks.eyes].filter(Boolean).join(', '));
  row('특징', [r.picks.glow, r.picks.special, r.picks.pattern, r.picks.move].filter(Boolean).join(', '));
  row('희귀도', `${r.score.toLocaleString('ko-KR')}점`);
  card.append(dl);
  const act = el('div', { className: 'actions' });
  const again = el('button', { type: 'button' }, '다시 태어나기');
  again.addEventListener('click', () => { msg.textContent = ''; $('sea').classList.remove('big'); sizeCanvas(); $('tag').textContent = ''; startRun(); });
  const reg = el('button', { type: 'button' }, '랭킹에 등록하기');
  reg.addEventListener('click', async () => { reg.disabled = true; msg.textContent = await submitScore('deepsea', r.score); });
  act.append(again, reg);
  card.append(act);
  stage.append(card);
}

/* ---------- 도감 ---------- */
function renderDex() {
  const ul = $('dex'); ul.textContent = '';
  $('dexInfo').textContent = dex.length ? `지금까지 ${dex.length}마리. 이 브라우저에만 저장돼요.` : '아직 아무도 없어요.';
  dex.slice(0, 30).forEach(d => {
    const li = el('li');
    const c = el('canvas', { width: 128, height: 128 });
    const g = c.getContext('2d'); g.fillStyle = '#02040a'; g.fillRect(0, 0, 128, 128);
    drawCreature(g, d.p, 1.3, 128, 128, { zoom: 0.8, still: true });
    const meta = el('div', { className: 'meta' });
    meta.append(el('b', {}, `No.${String(d.no).padStart(5, '0')} ${d.name}`), el('span', {}, `${d.type} · ${d.p.depthName || ''} · ${d.score}점 · ${d.player}`));
    li.append(c, meta);
    ul.append(li);
  });
}

addEventListener('resize', sizeCanvas);
sizeCanvas();
renderDex();
showIntro();
requestAnimationFrame(frame);
window.__ds = { get p() { return p; }, get phase() { return phase; }, choose: i => stage.querySelectorAll('.opts button')[i]?.click(), get result() { return result; } };
