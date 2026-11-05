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
    const list = all[g.id] || [];
    const mine = me ? list.findIndex(r => r.nick === me) : -1;
    const best = mine >= 0 ? `내 최고 ${list[mine].score}${g.unit} · ${mine + 1}위` : '';
    const play = g.url
      ? `<a class="btn" href="${g.url}">플레이</a>`
      : `<a class="btn" aria-disabled="true">준비 중</a>`;
    return `<li>
      <span class="no">${pad(i + 1)}</span>
      <div class="info"><div class="name">${esc(g.title)}</div><div class="desc">${esc(g.desc)}</div></div>
      <span class="best">${esc(best)}</span>
      ${play}
    </li>`;
  }).join('');
  view.innerHTML = `<h1>게임</h1><p class="dim">기록을 등록하고 랭킹에 도전해 보세요.</p><ul class="games">${rows}</ul>`;
}

function tabs(active) {
  const list = [['', '종합'], ...GAMES.map(g => [g.id, g.title])];
  return `<div class="tabs">${list.map(([id, name]) =>
    `<a href="#/rank${id ? '/' + id : ''}" class="${id === active ? 'on' : ''}">${esc(name)}</a>`).join('')}</div>`;
}

async function rankPage(gameId = '') {
  view.innerHTML = `<h1>랭킹</h1>${tabs(gameId)}<div class="empty">불러오는 중…</div>`;
  let all;
  try {
    all = await store.all();
  } catch (e) {
    view.querySelector('.empty').textContent = '랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    return;
  }
  const me = myNick();
  let body;
  if (!gameId) {
    const rows = overall(all);
    body = rows.length
      ? `<table><thead><tr><th class="num">#</th><th>닉네임</th><th class="num">점수</th><th>게임별 순위</th></tr></thead><tbody>${
        rows.map((r, i) => `<tr class="${r.nick === me ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(r.nick)}</td><td class="num">${r.points}</td><td class="dim">${
          Object.entries(r.parts).map(([id, rank]) => `${esc(gameById(id).title)} ${rank}위`).join(', ')}</td></tr>`).join('')
      }</tbody></table><p class="dim">게임별 1위 10점부터 10위 1점까지 받아 합산해요.</p>`
      : '<div class="empty">아직 등록된 기록이 없어요.</div>';
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
      : '<div class="empty">아직 등록된 기록이 없어요.</div>';
  }
  view.innerHTML = `<h1>랭킹</h1>${tabs(gameId)}${body}`;
}

function route() {
  const [, page, id] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (page === 'rank' ? 'rank' : 'games')));
  if (page === 'rank') rankPage(gameById(id) ? id : '');
  else gamesPage();
}

document.getElementById('mode').textContent = isLocal ? '지금은 기록이 이 기기에만 저장돼요.' : '';
addEventListener('hashchange', route);
route();
