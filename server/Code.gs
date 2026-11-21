/** @OnlyCurrentDoc */
// 배기원의 게임센터 랭킹 서버 (Google Apps Script)
// 구글 시트에 붙여서 웹 앱으로 배포하면 됨. 순서는 DEPLOY.md 참고.
// 시트 이름 'scores', 열: game | nick | score | at
//
// 안전장치
// - 이 스크립트는 자기가 붙은 시트 하나만 읽고 쓴다. 다른 구글 데이터는 건드리지 않는다.
// - 시트에 쓰는 글자는 수식으로 실행되지 않게 막는다 (= + - @ 로 시작 금지).
// - 점수는 게임마다 실제로 나올 수 있는 범위만 받는다.
// - 닉네임별 5초, 서버 전체 분당 60번으로 보내기를 제한하고, 시트가 끝없이 늘지 않게 상한을 둔다.
// - 오류 내용은 밖으로 내보내지 않는다.

// js/games.js 와 맞춰야 함. max는 게임에서 실제로 나올 수 있는 최고점 근처로.
var GAMES = {
  reaction: { order: 'asc', min: 80, max: 2000 },
  japan: { order: 'desc', min: 0, max: 99999 },
  deepsea: { order: 'desc', min: 0, max: 3200 },
  alley: { order: 'desc', min: 0, max: 7000 },
};
var MAX_SCORE_ROWS = 3000;
var MAX_COMMENT_ROWS = 3000;
var MAX_WORD_ROWS = 5000;
var GLOBAL_PER_MIN = 60;

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('scores');
  if (!sh) {
    sh = ss.insertSheet('scores');
    sh.appendRow(['game', 'nick', 'score', 'at']);
  }
  return sh;
}

function out_(data, cb) {
  var json = JSON.stringify(data);
  if (cb && /^[\w.]{1,60}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// 시트가 수식으로 해석하지 않게: 위험한 첫 글자를 떼고, 꺾쇠·따옴표를 지운다
function safeText_(s, maxLen) {
  s = String(s || '').replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim();
  while (/^[=+\-@\t\r]/.test(s)) s = s.slice(1).trim();
  return s.slice(0, maxLen);
}

// 서버 전체 분당 요청 수 제한 (닉네임을 바꿔 가며 도배하는 것 막기)
function globalLimit_() {
  var cache = CacheService.getScriptCache();
  var key = 'g_' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0);
  if (n >= GLOBAL_PER_MIN) return false;
  cache.put(key, String(n + 1), 120);
  return true;
}

function readAll_() {
  var values = sheet_().getDataRange().getValues();
  var data = {};
  for (var g in GAMES) data[g] = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    if (data[v[0]]) data[v[0]].push({ nick: String(v[1]), score: Number(v[2]), at: Number(v[3]) });
  }
  return data;
}

function sorted_(game, rows) {
  var asc = GAMES[game].order === 'asc';
  return rows.slice().sort(function (a, b) { return (asc ? a.score - b.score : b.score - a.score) || a.at - b.at; });
}

function cleanNick_(n) {
  n = safeText_(n, 10).replace(/=/g, '');
  return n.length >= 2 ? n : '';
}

function submit_(p) {
  var g = GAMES[p.game];
  var nick = cleanNick_(p.nick);
  var score = Number(p.score);
  if (!g) return { error: '없는 게임' };
  if (!nick) return { error: '닉네임은 2~10자' };
  if (!isFinite(score) || score < g.min || score > g.max || Math.round(score) !== score) return { error: '기록이 이상함' };

  var cache = CacheService.getScriptCache();
  var key = 'last_' + p.game + '_' + nick;
  if (cache.get(key)) return { error: '잠깐 있다가 다시' };
  if (!globalLimit_()) return { error: '지금 요청이 많아요. 잠시 후 다시' };
  cache.put(key, '1', 5);

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var sh = sheet_();
    var values = sh.getDataRange().getValues();
    var row = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === p.game && String(values[i][1]) === nick) { row = i; break; }
    }
    var improved = true;
    if (row < 0) {
      if (values.length - 1 >= MAX_SCORE_ROWS) return { error: '랭킹이 가득 찼어요' };
      sh.appendRow([p.game, nick, score, Date.now()]);
    } else {
      var old = Number(values[row][2]);
      var better = g.order === 'asc' ? score < old : score > old;
      if (better) sh.getRange(row + 1, 3, 1, 2).setValues([[score, Date.now()]]);
      else improved = false;
    }
  } finally {
    lock.releaseLock();
  }
  var list = sorted_(p.game, readAll_()[p.game]);
  var rank = 0, best = score;
  for (var j = 0; j < list.length; j++) {
    if (list[j].nick === nick) { rank = j + 1; best = list[j].score; break; }
  }
  return { improved: improved, rank: rank, best: best };
}

// ---- 코멘트 (시트 'comments', 열: game | kind | name | text | at) ----
function commentSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('comments');
  if (!sh) {
    sh = ss.insertSheet('comments');
    sh.appendRow(['game', 'kind', 'name', 'text', 'at']);
  }
  return sh;
}

function comments_(game) {
  if (!GAMES[game]) return { comments: [] };
  var values = commentSheet_().getDataRange().getValues();
  var out = [];
  for (var i = values.length - 1; i >= 1 && out.length < 100; i--) {
    if (values[i][0] === game) out.push({ kind: values[i][1], name: String(values[i][2]), text: String(values[i][3]), at: Number(values[i][4]) });
  }
  return { comments: out };
}

function comment_(p) {
  if (!GAMES[p.game]) return { error: '없는 게임' };
  var kind = { nick: 1, real: 1, anon: 1 }[p.kind] ? p.kind : 'anon';
  var name = safeText_(p.name, 10).replace(/=/g, '');
  var text = safeText_(p.text, 200);
  if (name.length < 2) return { error: '이름은 2자 이상' };
  if (text.length < 2) return { error: '내용을 입력해 주세요' };
  var cache = CacheService.getScriptCache();
  var key = 'cm_' + p.game + '_' + name;
  if (cache.get(key)) return { error: '조금 있다가 다시 남겨 주세요' };
  if (!globalLimit_()) return { error: '지금 요청이 많아요. 잠시 후 다시' };
  cache.put(key, '1', 10);
  var sh = commentSheet_();
  if (sh.getLastRow() - 1 >= MAX_COMMENT_ROWS) return { error: '코멘트가 가득 찼어요' };
  sh.appendRow([p.game, kind, name, text, Date.now()]);
  return { ok: true };
}

// ---- 하고 싶은 말 (시트 'words', 열: 이름 | 하고 싶은 말 | 시간) ----
// 이름과 시각은 시트 주인만 본다. 밖으로는 말 내용만 최근 것부터 내보내서 새들이 띄운다.
function wordSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('words');
  if (!sh) {
    sh = ss.insertSheet('words');
    sh.appendRow(['이름', '하고 싶은 말', '시간']);
  }
  return sh;
}

function words_() {
  var sh = wordSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { words: [] };
  var n = Math.min(80, last - 1);
  var values = sh.getRange(last - n + 1, 2, n, 1).getValues();
  var out = [];
  for (var i = values.length - 1; i >= 0; i--) { var t = String(values[i][0]); if (t) out.push(t); }
  return { words: out };
}

function word_(p) {
  var name = safeText_(p.name, 12).replace(/=/g, '') || '익명';
  var text = safeText_(p.text, 8);
  if (!text) return { error: '내용을 입력해 주세요' };
  var cache = CacheService.getScriptCache();
  var key = 'w_' + name;
  if (cache.get(key)) return { error: '조금 있다가 다시 보내 주세요' };
  if (!globalLimit_()) return { error: '지금 요청이 많아요. 잠시 후 다시' };
  cache.put(key, '1', 5);
  var sh = wordSheet_();
  if (sh.getLastRow() - 1 >= MAX_WORD_ROWS) return { error: '가득 찼어요' };
  sh.appendRow([name, text, Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')]);
  return { ok: true };
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var res;
  try {
    if (p.action === 'submit') res = submit_(p);
    else if (p.action === 'comments') res = comments_(p.game);
    else if (p.action === 'comment') res = comment_(p);
    else if (p.action === 'words') res = words_();
    else if (p.action === 'word') res = word_(p);
    else res = readAll_();
  } catch (err) {
    res = { error: '서버에서 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  }
  return out_(res, p.callback);
}
