// 게임 페이지에서 불러다 쓰는 공용 코드.
//   import { submitScore } from '../../js/gc.js';
//   submitScore('reaction', 213);   // 끝나면 이거 한 줄
import { store, validScore, cleanNick } from './store.js';
import { gameById } from './games.js';

const NICK_KEY = 'gc_nick';

export function myNick() {
  try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; }
}

function rememberNick(n) {
  try { localStorage.setItem(NICK_KEY, n); } catch { /* 무시 */ }
}

// 닉네임 물어보고 등록. 결과 문구를 돌려줌.
export async function submitScore(gameId, score) {
  const g = gameById(gameId);
  if (!validScore(gameId, score)) return '기록이 이상해서 등록 안 됨';
  const nick = await askNick(`${score}${g.unit}`);
  if (!nick) return '등록 안 함';
  rememberNick(nick);
  try {
    const r = await store.submit(gameId, nick, score);
    return r.improved ? `${nick} · ${r.rank}등으로 등록!` : `${nick} · 최고 기록(${r.best}${g.unit})이 더 좋아서 그대로 ${r.rank}등`;
  } catch (e) {
    return '등록 실패: ' + e.message;
  }
}

function askNick(scoreText) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'gc-ask';
    box.innerHTML = `
      <form>
        <p>기록 <b></b></p>
        <label>닉네임 <input name="nick" maxlength="10" autocomplete="off"></label>
        <div class="gc-ask-btns"><button type="submit">등록</button><button type="button" data-skip>안 할래</button></div>
        <small>2~10자</small>
      </form>`;
    box.querySelector('b').textContent = scoreText;
    const input = box.querySelector('input');
    input.value = myNick();
    const close = v => { box.remove(); resolve(v); };
    box.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const n = cleanNick(input.value);
      if (n) close(n);
      else input.focus();
    });
    box.querySelector('[data-skip]').addEventListener('click', () => close(''));
    document.body.appendChild(box);
    input.focus();
    input.select();
  });
}
