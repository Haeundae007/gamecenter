import { GAMES, gameById } from './games.js';
import { store, isLocal, overall } from './store.js';
import { myNick } from './gc.js';

const view = document.getElementById('view');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('ko-KR');

async function gamesPage() {
  const all = await store.all().catch(() => ({}));
  const me = myNick();
  const cards = GAMES.map(g => {
    const list = all[g.id] || [];
    const i = me ? list.findIndex(r => r.nick === me) : -1;
    const best = i >= 0 ? `내 최고 ${fmt(list[i].score)}${g.unit} · ${i + 1}위` : '';
    const play = g.url
      ? `<a class="btn" href="${g.url}">플레이</a>`
      : `<a class="btn" aria-disabled="true">준비 중</a>`;
    return `<article class="card">
      <div class="thumb" style="background:${g.color}">${esc(g.badge)}</div>
      <div class="card-body">
        <div class="card-title">${esc(g.title)}</div>
        <div class="card-desc">${esc(g.desc)}</div>
        <div class="card-best">${esc(best)}</div>
        <div class="card-actions">${play}<a class="btn sub" href="#/rank/${g.id}">랭킹</a></div>
      </div>
    </article>`;
  }).join('');
  view.innerHTML = `<h1 class="page-title">게임</h1><p class="page-sub">기록을 등록하고 랭킹에 도전해 보세요.</p><div class="games">${cards}</div>`;
}

function chips(active) {
  const list = [['', '종합'], ...GAMES.map(g => [g.id, g.title])];
  return `<div class="chips">${list.map(([id, name]) =>
    `<a href="#/rank${id ? '/' + id : ''}" class="${id === active ? 'on' : ''}">${esc(name)}</a>`).join('')}</div>`;
}

function rankBadge(i) {
  return `<span class="rank ${i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</span>`;
}

async function rankPage(gameId = '') {
  const head = `<h1 class="page-title">랭킹</h1><p class="page-sub">${gameId ? '게임별 최고 기록 순위예요.' : '모든 게임 순위를 합산한 종합 순위예요.'}</p>${chips(gameId)}`;
  view.innerHTML = `${head}<div class="board"><div class="empty">불러오는 중…</div></div>`;
  let all;
  try {
    all = await store.all();
  } catch (e) {
    view.querySelector('.empty').textContent = '랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    return;
  }
  const me = myNick();
  let rows = '';
  if (!gameId) {
    rows = overall(all).map((r, i) => `<div class="row ${r.nick === me ? 'me' : ''}">
      ${rankBadge(i)}
      <div class="who"><div class="name">${esc(r.nick)}</div><div class="meta">${
        Object.entries(r.parts).map(([id, rank]) => `${esc(gameById(id).title)} ${rank}위`).join(' · ')}</div></div>
      <span class="score">${fmt(r.points)}점</span>
    </div>`).join('');
  } else {
    const g = gameById(gameId);
    rows = (all[gameId] || []).slice(0, 50).map((r, i) => {
      const d = new Date(r.at);
      return `<div class="row ${r.nick === me ? 'me' : ''}">
        ${rankBadge(i)}
        <div class="who"><div class="name">${esc(r.nick)}</div><div class="meta">${d.getMonth() + 1}월 ${d.getDate()}일</div></div>
        <span class="score">${fmt(r.score)}${esc(g.unit)}</span>
      </div>`;
    }).join('');
  }
  const note = gameId ? '' : '<p class="note">게임별 1위 10점부터 10위 1점까지 받아 합산해요.</p>';
  view.innerHTML = `${head}<div class="board">${rows || '<div class="empty">아직 등록된 기록이 없어요.</div>'}</div>${note}`;
}

function route() {
  const [, page, id] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (page === 'rank' ? 'rank' : 'games')));
  if (page === 'rank') rankPage(gameById(id) ? id : '');
  else gamesPage();
  scrollTo(0, 0);
}

document.getElementById('mode').textContent = isLocal ? '지금은 기록이 이 기기에만 저장돼요.' : '';
addEventListener('hashchange', route);
route();
