// A 20-node board shaped like the hakwon2 first-experiment journey: two ad entries, a study hub
// that loops through subject and project checks, four exception nodes, and open decisions in
// three stages. The `book` scenario is the primary path and passes `check`.

const node = (id, stage, title, actions, extra = {}) => ({
  id,
  stage,
  title,
  actions: actions.map(([actionId, label, to]) => ({ id: actionId, label, to })),
  ...extra,
});

export function hakwonLikeFlow() {
  return {
    id: 'hakwon-like',
    title: '첫 모집 저니 보드',
    view: 'board',
    start: 'exam',
    entries: ['inquiry'],
    stages: ['광고', '신청', '체험', '이용 의향', '결제'],
    actors: ['학부모', '학생', { name: '운영자(조교)', color: '#148A6E' }, '시스템'],
    primary: 'book',
    screens: [
      node('exam', 0, '기말 대비 광고', [['landing_view', '체험 내용 보기', 'landing']], {
        kind: 'step',
        actor: '학부모',
        body: '취약 단원을 연습하고 다시 확인',
        metrics: ['신규 신청당 광고비'],
        experiments: ['광고 메시지 ①'],
        decisions: ['집행 예산과 모집 지역·회차 정원은?'],
      }),
      node('inquiry', 0, '탐구 보고서 광고', [['landing_view', '체험 내용 보기', 'landing']], {
        kind: 'step',
        actor: '학부모',
        body: '교과에서 탐구 질문과 보고서까지',
        metrics: ['신규 신청당 광고비'],
        experiments: ['광고 메시지 ②'],
      }),
      node('landing', 1, '체험 안내 페이지', [['form_open', '일정 보고 신청하기', 'apply']], {
        actor: '학부모',
        body: '두 광고가 같은 페이지에 도착하고 일정·비용·환경을 공개',
        metrics: ['신규 신청 가구 / 방문자'],
      }),
      node('apply', 1, '학부모 신청', [['apply_saved', '신청 접수 완료', 'notice']], {
        kind: 'step',
        actor: '학부모',
        state: 'APPLIED',
        metrics: ['가구별 중복 제거'],
      }),
      node(
        'notice',
        1,
        '신청 확인 알림',
        [
          ['first_login', '접속코드로 첫 접속', 'study'],
          ['login_missing', '체험 마감까지 미접속', 'absent'],
        ],
        {
          kind: 'message',
          actor: '운영자(조교)',
          body: '조교가 접속코드를 안내',
          notify: ['신청 확인 알림톡'],
        },
      ),
      node('absent', 2, '신청 후 미접속', [['resend', '다음 회차 재안내', 'notice']], {
        kind: 'wait',
        actor: '운영자(조교)',
        exception: 'E01',
        body: '안내 전달·기기·시간을 먼저 확인',
        metrics: ['미접속 학생 / 확정 학생'],
      }),
      node(
        'study',
        2,
        '학생 학습 화면',
        [
          ['subject_start', '교과 시작', 'subject'],
          ['project_start', '탐구 시작', 'project'],
          ['both_done', '두 활동 완료 확인', 'both'],
          ['cycle_50', '50분 수업 완주 기록', 'study'],
        ],
        {
          actor: '학생',
          body: '학생 인증 후 학습을 시작',
          state: 'STUDYING',
          metrics: ['접속 학생 / 확정 학생'],
          decisions: ['실제 교과·탐구 선후 관계는?', '50분 완주 판정 기준은?'],
        },
      ),
      node(
        'subject',
        2,
        '교과 완료 여부',
        [
          ['subject_done', '교과 완료 기록', 'study'],
          ['subject_stalled', '마감 시 미완료', 'unit-stop'],
        ],
        { kind: 'decision', actor: '학생', metrics: ['교과 완료 / 첫 접속'] },
      ),
      node(
        'project',
        2,
        '탐구 완료 여부',
        [
          ['project_done', '탐구 완료 기록', 'study'],
          ['project_stalled', '마감 시 미완료', 'stage-stop'],
        ],
        { kind: 'decision', actor: '학생', metrics: ['탐구 완료 / 첫 접속'] },
      ),
      node('unit-stop', 2, '교과 단원에서 멈춤', [], {
        kind: 'end',
        end: true,
        actor: '운영자(조교)',
        exception: 'E02',
        body: '마지막 문항과 기기 오류 확인',
        metrics: ['문항별 다음 문제 진입률'],
      }),
      node('stage-stop', 2, '탐구 단계에서 멈춤', [], {
        kind: 'end',
        end: true,
        actor: '운영자(조교)',
        exception: 'E03',
        body: '마지막으로 저장한 탐구 단계 확인',
      }),
      node('both', 2, '두 활동 모두 완료', [['survey_open', '의향 확인', 'survey']], {
        kind: 'system',
        actor: '시스템',
        body: '같은 학생·회차의 두 완료를 대조',
      }),
      node(
        'survey',
        3,
        '설문 응답 여부',
        [
          ['survey_start', '각자 응답하기', 'student'],
          ['survey_skip', '바로 결제하기', 'skip'],
        ],
        { kind: 'decision', actor: '학부모' },
      ),
      node(
        'student',
        3,
        '학생 이용 의향',
        [
          ['student_yes', '계속하고 싶어요', 'parent'],
          ['student_no', '계속할 생각이 없어요', 'parent'],
        ],
        { kind: 'step', actor: '학생', metrics: ['학생 긍정 응답률'] },
      ),
      node(
        'parent',
        3,
        '학부모 이용 의향',
        [
          ['parent_hold', '지금은 보류', 'hold'],
          ['parent_yes', '수강 의향 있음', 'reserve'],
          ['payment_settled', '결제 확인', 'paid'],
        ],
        {
          kind: 'step',
          actor: '학부모',
          metrics: ['공동 긍정 / 양측 유효 응답'],
          experiments: ['가격'],
        },
      ),
      node('skip', 4, '설문 건너뛰고 결제', [['payment_settled', '입금 확인', 'paid']], {
        kind: 'step',
        actor: '학부모',
        body: '설문을 넘겨도 결제 가능',
      }),
      node('hold', 4, '학부모 결제 보류', [], {
        kind: 'end',
        end: true,
        actor: '학부모',
        exception: 'E04',
        body: '결과 이해·가격·시간표 이유 구분',
        metrics: ['학생 긍정 · 보호자 보류 가구'],
      }),
      node(
        'reserve',
        4,
        '결제 예약',
        [
          ['payment_settled', '입금 확인', 'paid'],
          ['defer', '예약 만료·보류', 'hold'],
        ],
        {
          kind: 'wait',
          actor: '학부모',
          body: '정규 수강 의향과 예약을 기록',
          state: 'RESERVED',
          decisions: ['정규 수강 가격·결제 방식과 예약 기한은?'],
        },
      ),
      node('paid', 4, '정규 수강 결제', [['receipt_sent', '결제 완료 안내', 'receipt']], {
        kind: 'system',
        actor: '시스템',
        state: 'PAID',
        metrics: ['광고비 / 신규 유료 가구'],
        notify: ['결제 성공 알림톡'],
      }),
      node('receipt', 4, '결제 완료 알림', [], {
        kind: 'message',
        end: true,
        actor: '시스템',
        body: '첫 수업 일정과 준비물 안내',
      }),
    ],
    scenarios: [
      {
        id: 'book',
        title: '기말 광고에서 정규 결제까지',
        steps: [
          { action: 'landing_view', screen: 'landing' },
          { action: 'form_open', screen: 'apply' },
          { action: 'apply_saved', screen: 'notice' },
          { action: 'first_login', screen: 'study' },
          { action: 'subject_start', screen: 'subject' },
          { action: 'subject_done', screen: 'study' },
          { action: 'project_start', screen: 'project' },
          { action: 'project_done', screen: 'study' },
          { action: 'both_done', screen: 'both' },
          { action: 'survey_open', screen: 'survey' },
          { action: 'survey_start', screen: 'student' },
          { action: 'student_yes', screen: 'parent' },
          { action: 'parent_yes', screen: 'reserve' },
          { action: 'payment_settled', screen: 'paid' },
          { action: 'receipt_sent', screen: 'receipt' },
        ],
      },
      {
        id: 'recover',
        title: '미접속 후 재안내',
        start: 'inquiry',
        steps: [
          { action: 'landing_view', screen: 'landing' },
          { action: 'form_open', screen: 'apply' },
          { action: 'apply_saved', screen: 'notice' },
          { action: 'login_missing', screen: 'absent' },
          { action: 'resend', screen: 'notice' },
          { action: 'first_login', screen: 'study' },
        ],
      },
    ],
    events: [
      { id: 'landing_view', type: 'normal', at: ['exam.landing_view', 'inquiry.landing_view'] },
      { id: 'apply_submitted', type: 'normal', at: 'apply.apply_saved' },
      { id: 'trial_absent', type: 'drop', at: 'absent' },
      { id: 'payment_settled', type: 'normal', at: 'paid' },
    ],
  };
}
