import { GAMES, gameById } from './games.js';
import { store, isLocal, overall } from './store.js';
import { myNick } from './gc.js';

const view = document.getElementById('view');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');

async function gamesPage() {
  const all = await store.all().catch(() => ({}));
  const me = myNick();
  const rows = GAMES.map((g, i) => {
    const mine = me ? (all[g.id] || []).findIndex(r => r.nick === me) : -1;
    const best = mine >= 0 ? `내 기록 ${all[g.id][mine].score}${g.unit} · ${mine + 1}등` : '';
    const play = g.url
      ? `<a class="btn" href="${g.url}">하기</a>`
      : `<a class="btn" aria-disabled="true">준비중</a>`;
    return `<li>
      <span class="no">${pad(i + 1)}</span>
      <div class="info"><div class="name">${esc(g.title)}</div><div class="desc">${esc(g.desc)}</div></div>
      <span class="best">${esc(best)}</span>
      ${play}
    </li>`;
  }).join('');
  view.innerHTML = `<h1>게임</h1><ul class="games">${rows}</ul>`;
}

function tabs(active) {
  const list = [['', '종합'], ...GAMES.map(g => [g.id, g.title])];
  return `<div class="tabs">${list.map(([id, name]) =>
    `<a href="#/rank${id ? '/' + id : ''}" class="${id === active ? 'on' : ''}">${esc(name)}</a>`).join('')}</div>`;
}

async function rankPage(gameId = '') {
  view.innerHTML = `<h1>랭킹</h1>${tabs(gameId)}<div class="empty">불러오는 중</div>`;
  let all;
  try {
    all = await store.all();
  } catch (e) {
    view.querySelector('.empty').textContent = '랭킹을 못 불러옴: ' + e.message;
    return;
  }
  const me = myNick();
  let body;
  if (!gameId) {
    const rows = overall(all);
    body = rows.length
      ? `<table><thead><tr><th class="num">#</th><th>닉네임</th><th class="num">점수</th><th>게임별 등수</th></tr></thead><tbody>${
        rows.map((r, i) => `<tr class="${r.nick === me ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(r.nick)}</td><td class="num">${r.points}</td><td class="dim">${
          Object.entries(r.parts).map(([id, rank]) => `${esc(gameById(id).title)} ${rank}등`).join(', ')}</td></tr>`).join('')
      }</tbody></table><p class="dim">게임마다 1등 10점 ~ 10등 1점, 전부 더한 점수</p>`
      : '<div class="empty">아직 아무도 없음</div>';
  } else {
    const g = gameById(gameId);
    const rows = all[gameId] || [];
    body = rows.length
      ? `<table><thead><tr><th class="num">#</th><th>닉네임</th><th class="num">기록</th><th class="num">날짜</th></tr></thead><tbody>${
        rows.slice(0, 50).map((r, i) => {
          const d = new Date(r.at);
          return `<tr class="${r.nick === me ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(r.nick)}</td><td class="num">${r.score}${esc(g.unit)}</td><td class="num dim">${pad(d.getMonth() + 1)}.${pad(d.getDate())}</td></tr>`;
        }).join('')
      }</tbody></table>`
      : '<div class="empty">아직 아무도 없음</div>';
  }
  view.innerHTML = `<h1>랭킹</h1>${tabs(gameId)}${body}`;
}

function route() {
  const [, page, id] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (page === 'rank' ? 'rank' : 'games')));
  if (page === 'rank') rankPage(gameById(id) ? id : '');
  else gamesPage();
}

document.getElementById('mode').textContent = isLocal ? '랭킹: 이 브라우저에만 저장 중 (서버 연결 전)' : '';
addEventListener('hashchange', route);
route();
