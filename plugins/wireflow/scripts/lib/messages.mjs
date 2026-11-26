// Human-readable text for scenario failures and check findings, in Korean (default) and English.

const MSG = {
  en: {
    notOn: (a, s) => `action "${a}" is not on screen "${s}"`,
    guard: (w, s, v) => `condition ${w} not met on "${s}" (vars ${v})`,
    noDest: (s, a) => `action "${s}.${a}" has no destination (missing link)`,
    unknownDest: (s, a, t) => `action "${s}.${a}" points to unknown screen "${t}"`,
    wrongScreen: (e, g) => `expected screen "${e}", got "${g}"`,
    wrongVar: (k, e, g) => `expected ${k}=${e}, got ${g}`,
    missing: (l) => `"${l}" has no destination yet`,
    broken: (l, t) => `"${l}" points to unknown screen "${t}"`,
    unreachable: (t) => `no path from the start leads to "${t}"`,
    trapped: (t) => `"${t}" has no way back to the start or to an end screen`,
    step: (n, r) => `step ${n}: ${r}`,
    uncovered: (t) => `requirement "${t}" is not checked by any scenario`,
    branches: (t, n) => `decision "${t}" has ${n} branch(es); a decision needs at least two`,
  },
  ko: {
    notOn: (a, s) => `"${s}" 화면에 "${a}" 버튼이 없음`,
    guard: (w, s, v) => `"${s}"에서 조건 ${w} 불충족 (현재 상태 ${v})`,
    noDest: (s, a) => `"${s}.${a}" 버튼에 연결된 화면이 없음`,
    unknownDest: (s, a, t) => `"${s}.${a}" 버튼이 없는 화면 "${t}"를 가리킴`,
    wrongScreen: (e, g) => `"${e}" 화면이어야 하는데 "${g}"에 도착`,
    wrongVar: (k, e, g) => `${k}=${e} 이어야 하는데 ${g}`,
    missing: (l) => `"${l}" 버튼이 아직 어디에도 연결되지 않음`,
    broken: (l, t) => `"${l}" 버튼이 없는 화면 "${t}"를 가리킴`,
    unreachable: (t) => `시작 화면에서 "${t}"로 가는 경로가 없음`,
    trapped: (t) => `"${t}"에서 처음이나 종료 화면으로 돌아갈 방법이 없음`,
    step: (n, r) => `${n}단계: ${r}`,
    uncovered: (t) => `요구사항 "${t}"를 확인하는 시나리오가 없음`,
    branches: (t, n) => `분기 "${t}"의 갈래가 ${n}개뿐임 (2개 이상 필요)`,
  },
};

export function messages(flow) {
  return MSG[flow.locale === 'en' ? 'en' : 'ko'];
}
