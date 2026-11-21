// 게임 목록. 여기만 고치면 메인/랭킹에 다 반영됨.
// order: 'desc' = 점수 높을수록 좋음, 'asc' = 낮을수록 좋음 (시간 같은 거)
// min/max: 이 범위 밖 점수는 등록 안 받음
// noRank: true면 랭킹 탭에 안 나옴 (점수 없는 페이지)
// color/badge: 썸네일 이미지 생기기 전까지 쓰는 색 블록
export const GAMES = [
  {
    id: 'reaction',
    title: '반응속도 테스트',
    url: 'games/reaction/',
    order: 'asc',
    unit: 'ms',
    min: 80,
    max: 2000,
    color: '#20c997',
    badge: 'REACTION',
  },
  {
    id: 'deepsea',
    title: '심해 생물 만들기',
    url: 'games/deepsea/',
    order: 'desc',
    unit: '점',
    min: 0,
    max: 3200,
    color: '#0b1a33',
    badge: 'DEEP',
  },
  {
    id: 'alley',
    title: '흡연충뻑치기게임',
    url: 'games/alley/',
    order: 'desc',
    unit: '점',
    min: 0,
    max: 7000,
    color: '#1b1f2b',
    badge: 'ALLEY',
  },
  {
    id: 'words',
    title: '하고 싶은 말',
    url: 'games/words/',
    noRank: true,
    order: 'desc',
    unit: '',
    min: 0,
    max: 0,
    color: '#c4ccd3',
    badge: 'WORDS',
  },
];

export const gameById = id => GAMES.find(g => g.id === id);
