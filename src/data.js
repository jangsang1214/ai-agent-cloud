export const stocks = [
  {
    ticker: 'LRCX', status: 'GREEN', statusLabel: 'BUY ZONE', confidence: 86,
    strategy: 'Quality Mean Reversion', price: 241, hold: '10–40일', entry: '$235–245', stop: '< $225',
    targets: ['$265', '$280', '$296'],
    thesis: '강한 반도체 업종 안에서 큰 조정이 나온 뒤 평균회귀 가능성이 커진 상태. 실적 이벤트가 이미 지나갔고 Quality 점수가 높아 단순 낙폭과대보다 구조가 좋다는 가정.',
    scores: { Market:72, Industry:87, Momentum:61, Reversion:92, Catalyst:76, Quality:91, Value:62, Risk:69 }
  },
  {
    ticker: 'IONQ', status: 'RED', statusLabel: 'HELD', confidence: 74,
    strategy: 'High-Beta Momentum / Catalyst', price: 33, hold: '수주–수개월', entry: '보유 중', stop: '사업 논리 훼손',
    targets: ['$40', '$45', '$52'],
    thesis: '양자컴퓨팅·정부계약·기술 로드맵을 촉매로 보는 고변동 성장 포지션. 밸류는 비싸지만 상승 탄력과 이벤트 민감도가 높은 대신 리스크 점수는 낮게 평가.',
    scores: { Market:72, Industry:74, Momentum:88, Reversion:76, Catalyst:91, Quality:44, Value:19, Risk:31 }
  },
  {
    ticker: 'PWR', status: 'PURPLE', statusLabel: 'EVENT', confidence: 82,
    strategy: 'Infrastructure Catalyst', price: 579, hold: '10–35일', entry: '실적 확인 후', stop: '가이던스 훼손',
    targets: ['$620', '$660', '$700'],
    thesis: '전력망·데이터센터 인프라 장기 수요는 강하지만 실적 이벤트가 임박한 상태. 숫자와 가이던스 확인 전에는 이벤트 리스크가 우선.',
    scores: { Market:72, Industry:89, Momentum:67, Reversion:79, Catalyst:88, Quality:86, Value:54, Risk:63 }
  },
  {
    ticker: 'VRT', status: 'PURPLE', statusLabel: 'EVENT', confidence: 80,
    strategy: 'AI Infrastructure Momentum', price: 209, hold: '7–30일', entry: '실적 후 확인', stop: '갭 하락 지속',
    targets: ['$225', '$240', '$255'],
    thesis: 'AI 데이터센터 전력·냉각 테마의 강한 산업 모멘텀 후보. 다만 실적 직전에는 방향성보다 이벤트 리스크를 먼저 평가해야 함.',
    scores: { Market:72, Industry:91, Momentum:81, Reversion:70, Catalyst:90, Quality:78, Value:43, Risk:52 }
  },
  {
    ticker: 'FIX', status: 'BLUE', statusLabel: 'WATCH', confidence: 78,
    strategy: 'Quality Pullback', price: 915, hold: '15–45일', entry: '저점 확인 대기', stop: '추세 재붕괴',
    targets: ['$980', '$1040', '$1100'],
    thesis: '펀더멘털은 강하지만 급락 뒤 즉시 추격하기보다 변동성 진정과 저점 형성을 확인하는 단계. 좋은 회사와 좋은 진입 시점을 분리해서 판단.',
    scores: { Market:72, Industry:88, Momentum:64, Reversion:83, Catalyst:72, Quality:93, Value:48, Risk:58 }
  }
];

export const statusMeta = {
  GREEN: { label: '매수 후보', tone: 'green' },
  BLUE: { label: '하락 관찰', tone: 'blue' },
  PURPLE: { label: '이벤트', tone: 'purple' },
  RED: { label: '보유 중', tone: 'red' }
};
