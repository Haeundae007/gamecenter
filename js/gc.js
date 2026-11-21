// 게임 페이지에서 불러다 쓰는 공용 코드.
//   import { submitScore } from '../../js/gc.js';
//   submitScore('reaction', 213);   // 끝나면 이거 한 줄
import { store, validScore, cleanNick } from './store.js?v=4';
import { gameById } from './games.js?v=4';

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
  if (!validScore(gameId, score)) return '기록을 확인할 수 없어 등록하지 못했어요.';
  const nick = await askNick(`${score.toLocaleString('ko-KR')}${g.unit}`);
  if (!nick) return '';
  rememberNick(nick);
  try {
    const r = await store.submit(gameId, nick, score);
    return r.improved
      ? `${nick}님, ${r.rank}위로 등록됐어요!`
      : `기존 최고 기록(${r.best.toLocaleString('ko-KR')}${g.unit})이 더 좋아서 ${r.rank}위가 유지돼요.`;
  } catch (e) {
    return '등록하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

function askNick(scoreText) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'gc-ask';
    box.innerHTML = `
      <form>
        <h3>기록 등록</h3>
        <p>이번 기록은 <b></b>예요.</p>
        <input name="nick" maxlength="10" autocomplete="off" placeholder="닉네임">
        <small>2~10자로 입력해 주세요.</small>
        <div class="gc-ask-btns"><button type="button" class="sub" data-skip>건너뛰기</button><button type="submit">등록하기</button></div>
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
