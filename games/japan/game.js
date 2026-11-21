import { WORDS } from './words.js?v=3';
import { makeKiwon, drawSprite, drawRoom } from './sprite.js?v=3';
import { submitScore } from '../../js/gc.js?v=3';

// ---- 규칙 ---------------------------------------------------------------------
const DAYS = 11;              // 단어 440개 = 하루 40개 x 11일
const WAKE = 7 * 60;          // 07:00 기상
const TEST_AT = 21 * 60;      // 21:00 시험
const LATEST = 25 * 60;       // 새벽 1시 넘으면 기절하듯 잠
const SPEED = 2;              // 현실 1초 = 게임 2분 (하루 ≈ 7분)
const FF = 160;               // 빨리감기: 현실 1초 = 게임 160분
const DAILY_COST = 9000;      // 월세·공과금 하루치
const QUESTIONS = 20;
const SAVE_KEY = 'japan-save-v1';

const ACTIONS = {
  eat: { label: '밥 먹기', mins: 30, money: -7000, full: 55, hp: 4, mind: 4, pose: 'eat', say: '잘 먹겠습니다… 냠.' },
  alba: { label: '편의점 알바', mins: 180, money: 33000, hp: -22, mind: -12, away: true, say: '어서오세요~ (영혼 없음)' },
  nap: { label: '낮잠', mins: 60, hp: 24, full: -3, pose: 'sleep', say: '30분만… 아니 1시간만…' },
  rest: { label: '쉬기', mins: 60, mind: 28, pose: 'happy', say: '한 판만 하고 공부할게.' },
  walk: { label: '산책', mins: 30, mind: 14, hp: -4, away: true, say: '바람 쐬니까 좀 낫다.' },
};

// 아침 이벤트. 하루에 하나 나올 수도, 안 나올 수도.
const EVENTS = [
  { id: 'mom', text: '엄마한테 전화가 왔다.\n"밥은 챙겨 먹고 다니니? 일본 가면 더 못 챙겨 먹을 텐데…"', choices: [
    { label: '받는다 (30분)', mins: 30, mind: 15, say: '엄마 목소리 들으니까 힘난다.' },
    { label: '나중에 건다', mind: -6, say: '…나중에 꼭 전화해야지.' }] },
  { id: 'friend', text: '친구한테 카톡이 왔다.\n"야 오늘 브런치 ㄱ? 내가 쏨 ㅋㅋ"', choices: [
    { label: '간다 (2시간)', mins: 120, mind: 30, full: 40, away: true, say: '공짜 밥은 못 참지.' },
    { label: '공부해야 해서…', mind: -8, say: '…부럽다.' }] },
  { id: 'boss', text: '편의점 사장님 전화.\n"기원아, 오전에 대타 좀 가능? 시급 더 쳐줄게."', choices: [
    { label: '한다 (3시간, +45,000원)', mins: 180, money: 45000, hp: -20, mind: -10, away: true, say: '돈은 벌어야지…' },
    { label: '죄송합니다…', say: '오늘은 공부해야 해요.' }] },
  { id: 'book', text: '택배 도착! 주문했던 JLPT 문제집이다.\n(오늘 시험 제한시간 +4초)', choices: [
    { label: '뜯어본다 (-18,000원)', money: -18000, flag: 'workbook', say: '새 책 냄새 좋다.' },
    { label: '반품한다', say: '돈 아껴야지.' }] },
  { id: 'interview', minDay: 5, text: '메일이 왔다.\n[1차 면접 안내] 일본 IT회사에서 화상 면접 일정을 보내왔다.', choices: [
    { label: '자기소개 연습 (1시간)', mins: 60, mind: -6, flag: 'interview', say: 'はじめまして… 떨린다.' },
    { label: '나중에 준비하자', say: '아직 시간 있겠지…?' }] },
  { id: 'cold', minDay: 3, text: '아침부터 목이 칼칼하다. 감기 기운인가…', choices: [
    { label: '약 사 먹기 (30분, -6,000원)', mins: 30, money: -6000, away: true, say: '약 먹고 버티자.' },
    { label: '그냥 버틴다', hp: -25, say: '콜록… 괜찮아 괜찮아.' }] },
  { id: 'rain', text: '밖에 비가 쏟아진다. 왠지 축 처지는 날.', choices: [
    { label: '창밖 보며 멍 (멘탈 -6)', mind: -6, say: '비 오는 날은 공부도 축축해.' }] },
  { id: 'lucky', text: '옛날 바지 주머니에서 만 원이 나왔다!', choices: [
    { label: '개이득 (+10,000원)', money: 10000, mind: 8, say: '오늘 운 좋다!' }] },
];

const ENDINGS = {
  best: { good: true, title: '도쿄 IT회사 최종 합격', text: '면접관: "日本語、お上手ですね。"\n기원이는 꼬리를 한껏 부풀리며 웃었다.\n3주 뒤, 공항에 내린 하얀 다람쥐 한 마리. 새 넥타이가 잘 어울린다.' },
  good: { good: true, title: '아슬아슬 합격', text: '몇 번 말이 막혔지만 끝까지 웃으며 대답했다.\n합격 메일에 「内定」 두 글자가 보이자, 기원이는 그대로 침대에 쓰러졌다.\n이번엔 기뻐서.' },
  burnout: { title: '면접 날 쓰러짐', text: '단어는 머릿속에 가득했는데 몸이 따라주지 않았다.\n면접 10분 전, 화면이 빙글빙글…\n다음엔 밥이랑 잠도 공부만큼 챙기자.' },
  lang: { title: '질문을 못 알아들음', text: '"志望動機を教えてください。"\n…しぼう? 머릿속이 하얘졌다.\n생활은 완벽했는데 단어가 모자랐다. 한 번만 더.' },
  broke: { title: '통장 잔고 0원', text: '면접은 봤는데 비행기표 살 돈이 없다.\n편의점 사장님이 묻는다. "정직원 할래?"\n…일단 알바부터 다시.' },
  chaos: { title: '총체적 난국', text: '단어도, 몸도, 마음도 다 무너졌다.\n이불 속에서 기원이가 중얼거렸다.\n"…일본은 다음 생에."' },
};

// ---- 상태 ---------------------------------------------------------------------
const $ = s => document.querySelector(s);
const clamp = v => Math.max(0, Math.min(100, v));
const won = n => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const wid = w => `${w.r}-${w.n}`;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function fresh() {
  return {
    day: 1, min: WAKE, hp: 85, full: 70, mind: 75, money: 120000,
    tested: false, known: {}, tests: [], collapses: 0, burnouts: 0, debtDays: 0,
    flags: {}, seenEvents: [], interview: 0, ending: null,
  };
}

let s = null;
let mode = 'title';       // title | room | study | test | ff | modal | end
let paused = false;
let ff = null;            // { left, pose, away, done }
let pose = 'idle';
let bubbleUntil = 0;

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 저장 불가 */ } }
function loadSave() { try { const v = JSON.parse(localStorage.getItem(SAVE_KEY)); return v && v.day ? v : null; } catch { return null; } }

const dayWords = d => WORDS.filter(w => w.r === d * 2 - 1 || w.r === d * 2);

// ---- 시간과 생활 ----------------------------------------------------------------
function decay(mins, studying) {
  const h = mins / 60;
  s.full = clamp(s.full - (studying ? 7 : 6) * h);
  const hungry = s.full <= 0 ? 2.5 : 1;
  s.hp = clamp(s.hp - (studying ? 6 : 3.5) * hungry * h);
  s.mind = clamp(s.mind - (studying ? 6 : 2) * h);
}

function advance(mins, studying) {
  s.min += mins;
  decay(mins, studying);
  checks();
}

function checks() {
  if (mode !== 'room' && mode !== 'study') return;
  if (!s.tested && s.min >= TEST_AT) return startTest();
  if (s.hp <= 0) return collapse();
  if (s.mind <= 0) return burnout();
  if (s.tested && s.min >= LATEST) { say('새벽 1시… 기절하듯 잠들었다.', 3000); return endDay(); }
  if (!s.tested && TEST_AT - s.min <= 60 && TEST_AT - s.min > 59) say('시험 1시간 전!!', 3000);
}

function fastForward(mins, opts, done) {
  if (mode === 'study') closeStudy();
  mode = 'ff';
  ff = { left: mins, pose: opts.pose || 'idle', away: !!opts.away, label: opts.label || '', done };
  render();
}

function stepFF(dt) {
  const step = Math.min(ff.left, FF * dt);
  ff.left -= step;
  s.min += step;
  decay(step, false);
  $('#ff').hidden = false;
  $('#ff').textContent = `${ff.label} … ${hhmm(s.min)}`;
  if (ff.left <= 0) {
    const done = ff.done;
    ff = null;
    $('#ff').hidden = true;
    mode = 'room';
    done?.();
    save();
    render();
    checks();
  }
}

function apply(e) {
  if (e.hp) s.hp = clamp(s.hp + e.hp);
  if (e.full) s.full = clamp(s.full + e.full);
  if (e.mind) s.mind = clamp(s.mind + e.mind);
  if (e.money) s.money += e.money;
  if (e.flag === 'workbook') s.flags.workbook = s.day;
  if (e.flag === 'interview') s.interview++;
}

function doAction(key) {
  if (mode !== 'room') return;
  const a = ACTIONS[key];
  if (!s.tested && s.min + a.mins > TEST_AT) return say(`시험(21:00) 전에 못 끝내요.`, 2500);
  if (a.money < 0 && s.money + a.money < 0) return say('돈이 모자라요…', 2500);
  say(a.say, 2500);
  fastForward(a.mins, { pose: a.pose, away: a.away, label: a.label }, () => apply(a));
}

function collapse() {
  s.collapses++;
  say('쓰러졌다… (3시간 기절)', 3500);
  fastForward(180, { pose: 'sleep', label: '기절 중' }, () => { s.hp = 35; s.full = clamp(s.full + 10); });
}

function burnout() {
  s.burnouts++;
  say('멍… 아무것도 머리에 안 들어온다 (2시간)', 3500);
  fastForward(120, { pose: 'tired', label: '멍때리는 중' }, () => { s.mind = 30; });
}

function endDay() {
  const slept = 24 * 60 + WAKE - s.min;
  fastForward(Math.max(slept, 0), { pose: 'sleep', label: '쿨쿨' }, () => {
    s.hp = clamp(s.hp + (slept / 60) * 11);
    s.mind = clamp(s.mind + 8);
    s.full = clamp(s.full - 12);
    s.money -= DAILY_COST;
    if (s.money < 0) s.debtDays++;
    if (s.day >= DAYS) return finishGame();
    s.day++;
    s.min = WAKE;
    s.tested = false;
    save();
    morning();
  });
}

// ---- 아침 이벤트 ------------------------------------------------------------------
function morning() {
  const pool = EVENTS.filter(e => (e.minDay || 1) <= s.day && !s.seenEvents.slice(-4).includes(e.id));
  if (s.day === 1 || Math.random() > 0.65 || !pool.length) {
    say(s.day === 1 ? '오늘부터 하루 40개! 할 수 있다!' : pick(['오늘도 힘내자.', '일어나… 일어나야 해…', '오늘 단어 40개. 후…']), 3000);
    return render();
  }
  const ev = pick(pool);
  s.seenEvents.push(ev.id);
  showModal(`${s.day}일차 아침`, ev.text, ev.choices.map(c => ({
    label: c.label,
    run: () => {
      say(c.say, 3000);
      if (c.mins) {
        if (!s.tested && s.min + c.mins > TEST_AT) c.mins = Math.max(0, TEST_AT - s.min - 1);
        fastForward(c.mins, { pose: c.away ? 'idle' : 'happy', away: c.away, label: '이벤트' }, () => apply(c));
      } else {
        apply(c);
        render();
      }
    },
  })));
}

// ---- 공부 -----------------------------------------------------------------------
let queue = [];
let flipped = false;

function openStudy() {
  if (mode !== 'room') return;
  const words = dayWords(s.day);
  const left = words.filter(w => !s.known[wid(w)]);
  queue = (left.length ? left : words).slice();
  flipped = false;
  mode = 'study';
  render();
}

function closeStudy() {
  mode = 'room';
  render();
}

function studyAnswer(knew) {
  const w = queue.shift();
  if (knew) s.known[wid(w)] = true;
  else queue.splice(Math.min(queue.length, 5), 0, w);
  if (!queue.length) {
    say('오늘 단어 다 외웠다!!', 3000);
    queue = dayWords(s.day).slice();
  }
  flipped = false;
  save();
  render();
}

function ruby(s) {
  return s.replace(/([々一-鿿]+)\(([ぁ-ヿ]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
}

// ---- 시험 -----------------------------------------------------------------------
let test = null;

function buildQuestions(words) {
  return shuffle(words).slice(0, QUESTIONS).map(w => {
    const others = shuffle(words.filter(o => o !== w));
    const blankable = w.plain.includes(w.kanji);
    const type = blankable && Math.random() < 0.34 ? 'blank' : Math.random() < 0.5 ? 'mean' : 'yomi';
    if (type === 'mean') {
      return { w, type, ask: '뜻은?', big: w.kanji, answer: w.mean, opts: shuffle([w.mean, ...uniq(others.map(o => o.mean), w.mean).slice(0, 3)]) };
    }
    if (type === 'yomi') {
      return { w, type, ask: '읽는 법은?', big: w.kanji, answer: w.yomi, jp: true, opts: shuffle([w.yomi, ...uniq(others.map(o => o.yomi), w.yomi).slice(0, 3)]) };
    }
    return { w, type, ask: '빈칸에 들어갈 단어는?', sent: w.plain.replace(w.kanji, '＿＿＿'), ko: w.ko, answer: w.kanji, jp: true,
      opts: shuffle([w.kanji, ...uniq(others.map(o => o.kanji), w.kanji).slice(0, 3)]) };
  });
}

function uniq(list, exclude) {
  return [...new Set(list)].filter(x => x !== exclude);
}

function startTest() {
  if (mode === 'study') closeStudy();
  const limit = (s.hp < 30 ? 8 : 12) + (s.flags.workbook === s.day ? 4 : 0);
  test = { qs: buildQuestions(dayWords(s.day)), i: 0, correct: 0, wrong: [], limit, left: limit, locked: false, sleepy: s.hp < 30 };
  mode = 'test';
  say(test.sleepy ? '졸려… 글자가 흔들려…' : '시험이다! 집중!', 3000);
  render();
}

function answer(opt) {
  if (!test || test.locked) return;
  const q = test.qs[test.i];
  const ok = opt === q.answer;
  test.locked = true;
  if (ok) test.correct++;
  else test.wrong.push(q.w);
  document.querySelectorAll('.opts button').forEach(b => {
    if (b.dataset.v === q.answer) b.classList.add('right');
    else if (b.dataset.v === opt) b.classList.add('wrong');
  });
  setTimeout(() => {
    test.i++;
    test.locked = false;
    test.left = test.limit;
    if (test.i >= test.qs.length) finishTest();
    else render();
  }, ok ? 450 : 1100);
}

function finishTest() {
  const t = test;
  test = null;
  s.tests.push({ day: s.day, correct: t.correct, total: t.qs.length });
  s.tested = true;
  s.min = Math.max(s.min, TEST_AT) + 60;
  save();
  const pct = Math.round((t.correct / t.qs.length) * 100);
  const comment = pct >= 90 ? '완벽해! 오늘의 기원이 최고!' : pct >= 70 ? '합격선 통과!' : pct >= 50 ? '아슬아슬… 내일은 더 외우자.' : '망했다… 단어들이 도망갔어.';
  const wrongs = t.wrong.length
    ? `<ul class="wrongs">${t.wrong.map(w => `<li><span class="jp">${w.kanji}</span> (<span class="jp">${w.yomi}</span>) ${w.mean}</li>`).join('')}</ul>`
    : '틀린 단어 없음!';
  mode = 'modal';
  showModal(`${s.day}일차 시험 결과: ${t.correct} / ${t.qs.length}`, `${comment}\n\n틀린 단어\n${wrongs}`, [
    { label: '확인', primary: true, run: () => { say('이제 쉬다가 자자.', 3000); render(); } },
  ], true);
}

// ---- 엔딩 -----------------------------------------------------------------------
function finishGame() {
  const total = s.tests.reduce((a, t) => a + t.correct, 0);
  const max = s.tests.reduce((a, t) => a + t.total, 0) || 1;
  const avg = (total / max) * 100;
  const issues = s.collapses + s.burnouts;
  let key;
  if (s.money < 0 || s.debtDays >= 3) key = 'broke';
  else if (avg >= 80 && issues <= 2) key = 'best';
  else if (avg >= 65 && issues <= 4) key = 'good';
  else if (avg >= 65) key = 'burnout';
  else if (issues <= 4) key = 'lang';
  else key = 'chaos';
  const bonus = { best: 2000, good: 1200 }[key] || 300;
  const score = Math.max(0, total * 30 + bonus + s.interview * 100 - issues * 40 - s.debtDays * 50);
  s.ending = { key, score, avg: Math.round(avg), total, max, issues };
  save();
  showEnding();
}

function showEnding() {
  const e = ENDINGS[s.ending.key];
  mode = 'end';
  pose = e.good ? 'happy' : 'tired';
  const st = s.ending;
  showModal(`${e.good ? '해피 엔딩' : '배드 엔딩'} · ${e.title}`,
    `${e.text}\n\n시험 평균 ${st.avg}% (${st.total}/${st.max})\n쓰러짐·멍때림 ${st.issues}번 · 잔고 ${won(s.money)}\n\n최종 점수 ${st.score.toLocaleString('ko-KR')}점`, [
      { label: '랭킹에 등록하기', primary: true, keep: true, run: async btn => {
        btn.disabled = true;
        btn.textContent = (await submitScore('japan', st.score)) || '등록 안 함';
      } },
      { label: '처음부터 다시', run: () => { s = fresh(); save(); startDay(); } },
    ], true);
}

// ---- 화면 -----------------------------------------------------------------------
function say(text, ms = 2500) {
  const b = $('#bubble');
  b.textContent = text;
  b.hidden = false;
  bubbleUntil = performance.now() + ms;
}

function showModal(title, html, choices, isHtml = false) {
  const prev = mode;
  mode = 'modal';
  $('#m-title').textContent = title;
  if (isHtml) $('#m-text').innerHTML = html; else $('#m-text').textContent = html;
  const box = $('#m-choices');
  box.replaceChildren(...choices.map(c => {
    const b = document.createElement('button');
    b.textContent = c.label;
    if (c.primary) b.className = 'primary';
    b.onclick = () => {
      if (!c.keep) { $('#modal').hidden = true; if (mode === 'modal') mode = prev === 'test' || prev === 'modal' || prev === 'title' ? 'room' : prev; }
      c.run(b);
    };
    return b;
  }));
  $('#modal').hidden = false;
}

function renderHud() {
  const left = DAYS - s.day + 1;
  $('#dday').textContent = left === 1 ? 'D-DAY' : `D-${left - 1}`;
  $('#dayn').textContent = `${s.day}일차 / ${DAYS}`;
  $('#clock').textContent = hhmm(s.min);
  $('#clock').classList.toggle('hurry', !s.tested && TEST_AT - s.min <= 90);
  for (const k of ['hp', 'full', 'mind']) {
    $(`#b-${k}`).style.width = `${s[k]}%`;
    $(`#b-${k}`).parentElement.parentElement.classList.toggle('low', s[k] < 25);
  }
  $('#money').textContent = won(s.money);
  $('#money').classList.toggle('minus', s.money < 0);
}

function renderPanel() {
  const p = $('#panel');
  if (mode === 'study') return renderStudy(p);
  if (mode === 'test' && test) return renderTest(p);
  if (mode === 'ff') { p.innerHTML = `<div class="status">${ff.label}…</div>`; return; }
  const words = dayWords(s.day);
  const known = words.filter(w => s.known[wid(w)]).length;
  const status = s.tested
    ? `오늘 시험 끝 (<b>${s.tests.at(-1).correct}/${s.tests.at(-1).total}</b>). 쉬다가 자요. 새벽 1시 넘으면 기절해요.`
    : `오늘 단어 <b>${known}/${words.length}</b> 외움 · 시험까지 <b>${hhmm(Math.max(0, TEST_AT - s.min))}</b>`;
  const act = (key) => {
    const a = ACTIONS[key];
    const fx = [a.mins >= 60 ? `${a.mins / 60}시간` : `${a.mins}분`, a.money ? won(a.money) : ''].filter(Boolean).join(' · ');
    return `<button class="act" data-act="${key}">${a.label}<small>${fx}</small></button>`;
  };
  p.innerHTML = `<div class="status">${status}</div>
    <div class="acts">
      <button class="act main" data-study>단어 공부하기<small>${s.tested ? '복습' : '외운 만큼 시험이 쉬워져요'}</small></button>
      ${['eat', 'alba', 'nap', 'rest', 'walk'].map(act).join('')}
      ${s.tested ? '<button class="act sleep" data-sleep>잠자기<small>내일 07:00 기상</small></button>' : ''}
    </div>`;
  p.querySelector('[data-study]').onclick = openStudy;
  p.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => doAction(b.dataset.act); });
  p.querySelector('[data-sleep]')?.addEventListener('click', () => { if (mode === 'room') endDay(); });
}

function renderStudy(p) {
  const words = dayWords(s.day);
  const known = words.filter(w => s.known[wid(w)]).length;
  const w = queue[0];
  p.innerHTML = `<div class="study-top"><span>외운 단어 <b>${known} / ${words.length}</b></span><button data-close>그만하기</button></div>
    <div class="wcard" data-flip>
      ${w.star ? '<div class="star">★ 중요</div>' : ''}
      <div class="kanji">${w.kanji}</div>
      ${flipped ? `<div class="yomi">${w.yomi} <small>[${w.hg}]</small></div>
        <div class="mean">${w.mean}</div>
        <div class="ex">${ruby(w.s)}</div>
        <div class="ko">${w.ko}</div>` : '<div class="hint">눌러서 뜻 보기 (스페이스)</div>'}
    </div>
    ${flipped ? '<div class="row2"><button data-no>다시 볼래 (1)</button><button class="yes" data-yes>외웠어 (2)</button></div>' : ''}`;
  p.querySelector('[data-close]').onclick = closeStudy;
  p.querySelector('[data-flip]').onclick = () => { if (!flipped) { flipped = true; render(); } };
  p.querySelector('[data-no]')?.addEventListener('click', () => studyAnswer(false));
  p.querySelector('[data-yes]')?.addEventListener('click', () => studyAnswer(true));
}

function renderTest(p) {
  const q = test.qs[test.i];
  p.classList.toggle('sleepy', test.sleepy);
  p.innerHTML = `<div class="test-top"><span>${s.day}일차 시험</span><span>${test.i + 1} / ${test.qs.length} · 맞힘 ${test.correct}</span></div>
    <div class="timer"><i style="width:${(test.left / test.limit) * 100}%"></i></div>
    <div class="q"><div class="ask">${q.ask}</div>${q.big ? `<div class="big">${q.big}</div>` : `<div class="sent">${q.sent}</div><div class="sentko">${q.ko}</div>`}</div>
    <div class="opts">${q.opts.map((o, i) => `<button class="${q.jp ? 'jp' : ''}" data-v="${o.replace(/"/g, '&quot;')}">${i + 1}. ${o}</button>`).join('')}</div>`;
  p.querySelectorAll('.opts button').forEach(b => { b.onclick = () => answer(b.dataset.v); });
}

function render() {
  if (!s) return;
  renderHud();
  if (mode !== 'test') $('#panel').classList.remove('sleepy');
  renderPanel();
}

// ---- 루프 -----------------------------------------------------------------------
const ctx = $('#room').getContext('2d');
let last = performance.now();
let lastHud = 0;

function scenePose() {
  if (mode === 'ff') return ff.away ? null : ff.pose;
  if (mode === 'study') return 'study';
  if (mode === 'end') return pose;
  if (mode === 'test') return test?.sleepy ? 'tired' : 'panic';
  if (s.hp < 25 || s.mind < 25 || s.full < 15) return 'tired';
  if (!s.tested && TEST_AT - s.min < 60) return 'panic';
  return 'idle';
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (s && !paused) {
    if (mode === 'ff') stepFF(dt);
    else if (mode === 'room' || mode === 'study') advance(dt * SPEED, mode === 'study');
    if (mode === 'test' && test && !test.locked) {
      test.left -= dt;
      const bar = document.querySelector('.timer i');
      if (bar) bar.style.width = `${Math.max(0, test.left / test.limit) * 100}%`;
      if (test.left <= 0) answer(null);
    }
  }
  if (s) {
    const t = now / 1000;
    const pz = scenePose();
    drawRoom(ctx, s.min, t, { awayNote: pz === null });
    if (pz) {
      const step = Math.floor(t * 2.5) % 4;
      const [x, y] = pz === 'sleep' ? [10, 34] : pz === 'study' ? [110, 50] : [64, 53];
      drawSprite(ctx, makeKiwon(pz, step), x, y);
    }
    if (now - lastHud > 250) { renderHud(); lastHud = now; }
    if (now > bubbleUntil) $('#bubble').hidden = true;
  }
  requestAnimationFrame(frame);
}

// ---- 시작 -----------------------------------------------------------------------
function startDay() {
  mode = 'room';
  render();
  morning();
}

function title() {
  const saved = loadSave();
  s = saved && !saved.ending ? saved : fresh();
  mode = 'title';
  render();
  const choices = [{ label: '새로 시작', primary: !saved || !!saved.ending, run: () => { s = fresh(); save(); startDay(); } }];
  if (saved && !saved.ending) choices.unshift({ label: `이어하기 (${saved.day}일차 ${hhmm(saved.min)})`, primary: true, run: () => { s = saved; mode = 'room'; render(); say('다시 힘내자!', 2500); } });
  showModal('배기원 일본 취업 성공시키기',
    '하얀 하늘다람쥐 기원이의 일본 회사 면접까지 11일.\n\n· 매일 단어 40개를 외우고 21:00 시험을 봐요.\n· 밥, 잠, 멘탈, 돈도 챙겨야 해요. 체력이나 멘탈이 바닥나면 시간을 날려요.\n· 시간은 계속 흘러요. (현실 1초 = 2분)\n\n공부도 생활도 잘해야 합격!', choices);
}

$('#pause').onclick = () => {
  if (!s || mode === 'title' || mode === 'end') return;
  paused = !paused;
  $('#pause').textContent = paused ? '▶' : 'II';
  if (paused) say('일시정지', 600000); else $('#bubble').hidden = true;
};

addEventListener('keydown', e => {
  if (mode === 'study') {
    if (e.code === 'Space') { e.preventDefault(); if (!flipped) { flipped = true; render(); } }
    else if (flipped && e.key === '1') studyAnswer(false);
    else if (flipped && e.key === '2') studyAnswer(true);
    else if (e.key === 'Escape') closeStudy();
  } else if (mode === 'test' && test && /^[1-4]$/.test(e.key)) {
    const q = test.qs[test.i];
    answer(q.opts[Number(e.key) - 1]);
  }
});

title();
requestAnimationFrame(frame);

if (new URLSearchParams(location.search).has('debug')) {
  window.jp = { get s() { return s; }, set(v) { Object.assign(s, v); render(); }, startTest, endDay, finishGame, get mode() { return mode; } };
}
