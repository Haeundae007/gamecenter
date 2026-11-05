// 배기원의 게임센터 랭킹 서버 (Google Apps Script)
// 구글 시트에 붙여서 웹 앱으로 배포하면 됨. 순서는 README 참고.
// 시트 이름 'scores', 열: game | nick | score | at

// js/games.js 랑 맞춰야 함
var GAMES = {
  reaction: { order: 'asc', min: 80, max: 2000 },
  popo: { order: 'desc', min: 0, max: 999 },
  velvet: { order: 'desc', min: 0, max: 999999 },
};

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
  if (cb && /^[\w.]+$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
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
  n = String(n || '').replace(/[<>"'`=]/g, '').trim().slice(0, 10);
  return n.length >= 2 ? n : '';
}

function submit_(p) {
  var g = GAMES[p.game];
  var nick = cleanNick_(p.nick);
  var score = Number(p.score);
  if (!g) return { error: '없는 게임' };
  if (!nick) return { error: '닉네임은 2~10자' };
  if (!isFinite(score) || score < g.min || score > g.max) return { error: '기록이 이상함' };

  // 같은 사람이 너무 자주 못 보내게 (5초)
  var cache = CacheService.getScriptCache();
  var key = 'last_' + p.game + '_' + nick;
  if (cache.get(key)) return { error: '잠깐 있다가 다시' };
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

function doGet(e) {
  var p = e.parameter || {};
  var res;
  try {
    if (p.action === 'submit') res = submit_(p);
    else res = readAll_();
  } catch (err) {
    res = { error: String(err) };
  }
  return out_(res, p.callback);
}
