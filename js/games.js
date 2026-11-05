// 게임 목록. 여기만 고치면 메인/랭킹에 다 반영됨.
// order: 'desc' = 점수 높을수록 좋음, 'asc' = 낮을수록 좋음 (시간 같은 거)
// min/max: 이 범위 밖 점수는 등록 안 받음
export const GAMES = [
  {
    id: 'reaction',
    title: '반응속도',
    desc: '화면 바뀌면 바로 눌러',
    url: 'games/reaction/',
    order: 'asc',
    unit: 'ms',
    min: 80,
    max: 2000,
  },
  {
    id: 'popo',
    title: '포포 키우기',
    desc: '하늘다람쥐 30일 키우기',
    url: null, // 아직 안 붙임
    order: 'desc',
    unit: '점',
    min: 0,
    max: 999,
  },
  {
    id: 'velvet',
    title: 'VELVET HOUR',
    desc: '네온 클럽 1인칭 슈팅',
    url: null,
    order: 'desc',
    unit: '점',
    min: 0,
    max: 999999,
  },
];

export const gameById = id => GAMES.find(g => g.id === id);
