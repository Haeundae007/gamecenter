// 게임 목록. 여기만 고치면 메인/랭킹에 다 반영됨.
// order: 'desc' = 점수 높을수록 좋음, 'asc' = 낮을수록 좋음 (시간 같은 거)
// min/max: 이 범위 밖 점수는 등록 안 받음
// color/badge: 썸네일 이미지 생기기 전까지 쓰는 색 블록
export const GAMES = [
  {
    id: 'reaction',
    title: '반응속도 테스트',
    desc: '초록색으로 바뀌는 순간을 잡아보세요.',
    url: 'games/reaction/',
    order: 'asc',
    unit: 'ms',
    min: 80,
    max: 2000,
    color: '#20c997',
    badge: 'REACTION',
  },
  {
    id: 'popo',
    title: '포포 키우기',
    desc: '하늘다람쥐에게 30일 동안 무엇을 가르칠까요?',
    url: null,
    order: 'desc',
    unit: '점',
    min: 0,
    max: 999,
    color: '#845ef7',
    badge: 'POPO',
  },
  {
    id: 'velvet',
    title: 'VELVET HOUR',
    desc: '네온 클럽을 정리하는 1인칭 슈팅',
    url: null,
    order: 'desc',
    unit: '점',
    min: 0,
    max: 999999,
    color: '#f03e6e',
    badge: 'VELVET',
  },
];

export const gameById = id => GAMES.find(g => g.id === id);
