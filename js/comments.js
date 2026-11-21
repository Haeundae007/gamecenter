// 게임별 코멘트. 실명 / 닉네임 / 익명 중에 골라서 남김.
//   import { mountComments } from '../../js/comments.js';
//   mountComments(document.getElementById('comments'), 'japan');
// 저장은 store.js랑 같은 규칙: SERVER_URL 비어 있으면 이 브라우저에만, 있으면 구글 시트.
import { SERVER_URL } from './store.js?v=5';

const LOCAL_KEY = 'gc_comments';
const KINDS = { nick: '닉네임', real: '실명', anon: '익명' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readLocal() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; } }
function writeLocal(d) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch { /* 저장 불가 */ } }

function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = 'gc_cm_' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const done = v => { delete window[cb]; s.remove(); v instanceof Error ? reject(v) : resolve(v); };
    window[cb] = d => done(d);
    s.onerror = () => done(new Error('서버 연결 실패'));
    s.src = `${SERVER_URL}?${new URLSearchParams({ ...params, callback: cb, t: Date.now() })}`;
    document.head.appendChild(s);
    setTimeout(() => window[cb] && done(new Error('서버 응답 없음')), 10000);
  });
}

async function list(game) {
  if (SERVER_URL) return (await jsonp({ action: 'comments', game })).comments || [];
  return (readLocal()[game] || []).slice().reverse();
}

async function add(game, kind, name, text) {
  if (SERVER_URL) {
    const r = await jsonp({ action: 'comment', game, kind, name, text });
    if (r.error) throw new Error(r.error);
    return;
  }
  const d = readLocal();
  (d[game] = d[game] || []).push({ kind, name, text, at: Date.now() });
  writeLocal(d);
}

function anonName() {
  return '익명' + Math.floor(1000 + Math.random() * 9000);
}

function savedNick() { try { return localStorage.getItem('gc_nick') || ''; } catch { return ''; } }

export function mountComments(root, game) {
  root.classList.add('gc-cm');
  root.innerHTML = `
    <h3>코멘트</h3>
    <form class="gc-cm-form">
      <div class="gc-cm-kinds">
        ${Object.entries(KINDS).map(([k, v], i) => `<label><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''}> ${v}</label>`).join('')}
      </div>
      <input class="gc-cm-name" maxlength="10" placeholder="닉네임">
      <textarea maxlength="200" rows="2" placeholder="한마디 남겨 주세요 (200자까지)"></textarea>
      <div class="gc-cm-row"><span class="gc-cm-msg"></span><button type="submit">남기기</button></div>
    </form>
    <ul class="gc-cm-list"><li class="gc-cm-empty">불러오는 중…</li></ul>`;

  const form = root.querySelector('form');
  const nameInput = root.querySelector('.gc-cm-name');
  const text = root.querySelector('textarea');
  const msg = root.querySelector('.gc-cm-msg');
  const listEl = root.querySelector('.gc-cm-list');

  const syncKind = () => {
    const kind = form.kind.value;
    nameInput.hidden = kind === 'anon';
    nameInput.placeholder = kind === 'real' ? '이름' : '닉네임';
    if (kind === 'nick' && !nameInput.value) nameInput.value = savedNick();
  };
  form.addEventListener('change', syncKind);
  syncKind();

  async function refresh() {
    try {
      const rows = await list(game);
      listEl.innerHTML = rows.length
        ? rows.map(c => {
          const d = new Date(c.at);
          return `<li><div class="gc-cm-who"><b>${esc(c.name)}</b> <span class="gc-cm-tag">${esc(KINDS[c.kind] || '')}</span> <span class="gc-cm-date">${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span></div><p>${esc(c.text)}</p></li>`;
        }).join('')
        : '<li class="gc-cm-empty">아직 코멘트가 없어요. 첫 코멘트를 남겨 보세요.</li>';
    } catch {
      listEl.innerHTML = '<li class="gc-cm-empty">코멘트를 불러오지 못했어요.</li>';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const kind = form.kind.value;
    const body = text.value.replace(/\s+/g, ' ').trim();
    let name = kind === 'anon' ? anonName() : nameInput.value.replace(/[<>"'`]/g, '').trim();
    if (kind !== 'anon' && name.length < 2) { msg.textContent = '이름은 2자 이상 입력해 주세요.'; return; }
    if (body.length < 2) { msg.textContent = '내용을 입력해 주세요.'; return; }
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await add(game, kind, name, body);
      text.value = '';
      msg.textContent = '';
      await refresh();
    } catch (err) {
      msg.textContent = err.message || '남기지 못했어요.';
    }
    btn.disabled = false;
  });

  refresh();
}
