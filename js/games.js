// 게임 목록. 여기만 고치면 메인/랭킹에 다 반영됨.
// order: 'desc' = 점수 높을수록 좋음, 'asc' = 낮을수록 좋음 (시간 같은 거)
// min/max: 이 범위 밖 점수는 등록 안 받음
// noRank: true면 랭킹 탭에 안 나옴 (점수 없는 페이지)
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
    id: 'deepsea',
    title: '심해 생물 만들기',
    desc: '질문에 답할수록 생물이 자라나요. 성격까지 정해지는 나만의 심해 생물 도감.',
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
    desc: '명학역 1번 출구에서 에스키스까지, 만안로 1인칭.',
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
    desc: '안개 낀 갈대밭 위 찌르레기 떼에게 말을 남기면, 새들이 가끔 그 말을 하늘에 띄워요.',
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
