# 배기원의 게임센터

지금은 뼈대만. 디자인은 `css/base.css` 맨 위 변수부터 바꾸면 됨.

## 로컬에서 보기

```
python -m http.server 8130
```
→ http://localhost:8130

## 구조

```
index.html          메인 (게임 목록 / 랭킹, 주소 #/ #/rank #/rank/게임id)
css/base.css        스타일
js/games.js         게임 목록 ← 게임 추가는 여기
js/store.js         점수 저장소 + 종합 랭킹 계산
js/gc.js            게임 페이지가 쓰는 점수 등록 (닉네임 창)
js/app.js           메인 화면
games/<id>/         게임 하나당 폴더 하나
server/Code.gs      구글 시트 랭킹 서버 (아직 연결 안 함)
```

## 게임 추가하기

1. `games/<id>/index.html` 만들기
2. `js/games.js`에 한 줄 추가 (`order`, `min`, `max` 잘 정하기)
3. 게임 끝날 때:
   ```js
   import { submitScore } from '../../js/gc.js';
   const text = await submitScore('<id>', 점수);
   ```
4. `server/Code.gs`의 `GAMES`에도 같은 줄 추가

## 종합 랭킹

게임마다 1등 10점, 2등 9점 … 10등 1점. 전부 더해서 줄 세움.

## 랭킹 서버 연결 (나중에)

지금은 점수가 그 브라우저에만 저장됨. 친구들 점수를 한곳에 모으려면:

1. 구글 드라이브에서 새 스프레드시트 만들기
2. 확장 프로그램 → Apps Script → `server/Code.gs` 내용 통째로 붙여넣기 → 저장
3. 배포 → 새 배포 → 유형: 웹 앱
   - 실행 사용자: 나
   - 액세스 권한: 모든 사용자
4. 나온 주소(`https://script.google.com/macros/s/.../exec`)를 `js/store.js`의 `SERVER_URL`에 넣기

`server/Code.gs`를 고치면 "배포 관리 → 수정 → 새 버전"으로 다시 배포해야 반영됨.
