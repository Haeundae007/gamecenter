// 점수 저장소.
// 지금은 LocalStore(이 브라우저에만 저장). 구글 시트 붙이면 SERVER_URL만 채우면 됨.
import { GAMES, gameById } from './games.js?v=3';

export const SERVER_URL = 'https://script.google.com/macros/s/AKfycbwrGVJVSbxfMIp1Nn4qYQ-gjljjbBdLn41hGGuMDfW1cV3jHCj_RbUFq6Q-YeGb0zZirw/exec'; // Apps Script 배포 주소 (server/Code.gs 참고)

const better = (g, a, b) => (g.order === 'asc' ? a < b : a > b);

function sortRows(g, rows) {
  return rows.slice().sort((a, b) => (g.order === 'asc' ? a.score - b.score : b.score - a.score) || a.at - b.at);
}

export function validScore(gameId, score) {
  const g = gameById(gameId);
  return !!g && Number.isFinite(score) && score >= g.min && score <= g.max;
}

export function cleanNick(nick) {
  const n = String(nick || '').replace(/[<>"'`]/g, '').trim().slice(0, 10);
  return n.length >= 2 ? n : '';
}

// ---- 브라우저 저장 ----
class LocalStore {
  constructor() { this.key = 'gc_scores'; }

  _read() {
    try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; }
  }

  _write(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch { /* 저장 불가 */ }
  }

  async top(gameId, n = 50) {
    const g = gameById(gameId);
    return sortRows(g, this._read()[gameId] || []).slice(0, n);
  }

  async all() {
    const data = this._read();
    const out = {};
    for (const g of GAMES) out[g.id] = sortRows(g, data[g.id] || []);
    return out;
  }

  // 닉네임당 최고 기록 하나만 남김
  async submit(gameId, nick, score) {
    const g = gameById(gameId);
    const data = this._read();
    const rows = data[gameId] || [];
    const mine = rows.find(r => r.nick === nick);
    let improved = true;
    if (!mine) rows.push({ nick, score, at: Date.now() });
    else if (better(g, score, mine.score)) Object.assign(mine, { score, at: Date.now() });
    else improved = false;
    data[gameId] = rows;
    this._write(data);
    const sorted = sortRows(g, rows);
    return { improved, rank: sorted.findIndex(r => r.nick === nick) + 1, best: sorted.find(r => r.nick === nick).score };
  }
}

// ---- 구글 시트 (Apps Script) ----
// 읽기/쓰기 둘 다 JSONP. Apps Script가 CORS를 까다롭게 굴어서 이게 제일 덜 귀찮음.
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = 'gc_cb_' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const done = v => { delete window[cb]; s.remove(); v instanceof Error ? reject(v) : resolve(v); };
    window[cb] = d => done(d);
    s.onerror = () => done(new Error('서버 연결 실패'));
    s.src = `${SERVER_URL}?${new URLSearchParams({ ...params, callback: cb, t: Date.now() })}`;
    document.head.appendChild(s);
    setTimeout(() => window[cb] && done(new Error('서버 응답 없음')), 10000);
  });
}

class SheetStore {
  constructor() { this.cache = null; this.cacheAt = 0; }

  async all() {
    if (this.cache && Date.now() - this.cacheAt < 30000) return this.cache;
    const d = await jsonp({ action: 'all' });
    const out = {};
    for (const g of GAMES) out[g.id] = sortRows(g, d[g.id] || []);
    this.cache = out;
    this.cacheAt = Date.now();
    return out;
  }

  async top(gameId, n = 50) {
    return (await this.all())[gameId].slice(0, n);
  }

  async submit(gameId, nick, score) {
    this.cache = null;
    const r = await jsonp({ action: 'submit', game: gameId, nick, score });
    if (r.error) throw new Error(r.error);
    return r;
  }
}

export const store = SERVER_URL ? new SheetStore() : new LocalStore();
export const isLocal = !SERVER_URL;

// ---- 종합 랭킹 ----
// 게임마다 1등 10점, 2등 9점 ... 10등 1점. 다 더해서 줄 세움.
export function overall(allRows) {
  const table = new Map();
  for (const g of GAMES) {
    (allRows[g.id] || []).slice(0, 10).forEach((r, i) => {
      const row = table.get(r.nick) || { nick: r.nick, points: 0, parts: {} };
      row.points += 10 - i;
      row.parts[g.id] = i + 1;
      table.set(r.nick, row);
    });
  }
  return [...table.values()].sort((a, b) => b.points - a.points || Object.keys(b.parts).length - Object.keys(a.parts).length);
}
