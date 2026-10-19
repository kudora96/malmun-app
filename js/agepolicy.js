// 기능별 최소 나이 — 정본 = 기획부 08_business/ai_features/age_policy.md 9장(대표님 확정 10-19) · 숫자는 이 파일 한 곳만 · 모든 화면은 allowed(기능) 만 본다
//  나이 = 스토어 나이 신호 · 「태어난 해」 중 더 어린 쪽 · 둘 다 없으면 「모름」 = 0세 기능만(보기·듣기)
//  나라 = 스토어 계정 나라 → 없으면(웹) 첫 실행 때 고른 나라 → 그래도 없으면 가장 엄한 쪽(대표님 10-19)
//  ⚠ 첫 실행 나이 화면이 생기기 전에는 나이를 모르는 학습자를 막지 않음(지금 앱 그대로) — 시험 스위치나 태어난 해가 있을 때만 판정
//  시험 스위치(대표님이 직접 보기): 주소 ?age=15&country=NP · ?age=off 로 끔 · 기기 기억 · #/diag 에 「지금 나이·나라 · 켜진/막힌 기능」
export const POLICY = {
  version: "2026-10-19",
  cols: ["KR", "US", "GB", "EU", "NP", "IN", "TH", "VN", "PH", "ID", "OTHER"],
  features: {
    view:           [0, 0, 0, 0, 0, 0, 0, 0, 0, "hold", 0],
    recordLocal:    [0, 0, 0, 0, 0, 0, 0, 0, 0, "hold", 0],
    scoreOnDevice:  [0, 0, 0, 0, 0, 0, 0, 0, 0, "hold", 0],
    sttServer:      [14, 13, 13, 16, 18, 18, 20, 18, 18, "hold", 18],
    serverProgress: [14, 13, 13, 16, 18, 18, 20, 18, 18, "hold", 18],
    aiExplain:      [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
    aiAskLine:      [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
    aiFixSentence:  [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
    aiRoleplay:     [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
    reportTap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, "hold", 0],
    reportText:     [14, 13, 13, 16, 18, 18, 20, 18, 18, "hold", 18],
    checkCard:      [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
    faq:            [0, 0, 0, 0, 0, 0, 0, 0, 0, "hold", 0],
    inquiryHuman:   [14, 13, 13, 16, 18, 18, 20, 18, 18, "hold", 18],
    inquiryAI:      [18, 18, 18, 18, 18, 18, 20, 18, 18, "hold", 18],
  },
  EU: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"],
};
// 진단 화면 이름(한국어 · 대표님 확인용)
export const FEATURE_KO = { view: "보기·듣기(영상·설명·글자 소리)", recordLocal: "말하기 녹음·다시 듣기(기기 안)", scoreOnDevice: "기기 안 받아쓰기 채점", sttServer: "서버 받아쓰기(녹음 업로드)",
  serverProgress: "진도·점수 서버 기록·계정·보상", aiExplain: "AI 설명(왜 틀렸어요?)", aiAskLine: "이 줄 물어보기(AI)", aiFixSentence: "내 문장 고쳐 주기(AI)", aiRoleplay: "역할극 대화(AI)",
  reportTap: "신고 — 종류만", reportText: "신고 — 글·기기 ID", checkCard: "확인 카드", faq: "자주 묻는 것", inquiryHuman: "문의 — 글 보내기", inquiryAI: "문의 — AI 답" };

const K = { age: "malmun.age.test", ctry: "malmun.country.test", birth: "malmun.birth", home: "malmun.country" };
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
try { // 시험 스위치
  const q = new URLSearchParams(location.search), a = q.get("age"), c = q.get("country");
  if (a === "off") { localStorage.removeItem(K.age); localStorage.removeItem(K.ctry); }
  else { if (a != null && /^\d{1,3}$/.test(a)) localStorage.setItem(K.age, a); if (c && /^[A-Za-z]{2,5}$/.test(c)) localStorage.setItem(K.ctry, c.toUpperCase()); }
} catch {}

export const testMode = () => get(K.age) != null;
// 나이(만) · 모르면 null
export function age() {
  const xs = [];
  const t = get(K.age); if (t != null) xs.push(+t);
  const by = +get(K.birth); if (by > 1900) xs.push(new Date().getFullYear() - by - 1); // 생일 모름 → 더 어린 쪽(올해 생일 전으로 셈)
  const s = window.__storeAge; if (Number.isFinite(s)) xs.push(s); // 스토어 나이 신호(앱판 · 나중)
  return xs.length ? Math.min(...xs) : null;
}
export const country = () => window.__storeCountry || get(K.ctry) || get(K.home) || null; // 스토어 → 시험 → 웹에서 고른 나라
export const col = c => (!c ? null : POLICY.EU.includes(c) || c === "EU" ? "EU" : POLICY.cols.includes(c) ? c : "OTHER");
// 판정을 켜는 때: 시험 스위치 · 태어난 해 · 스토어 신호가 있을 때만(나이 화면 전에는 지금 앱 그대로)
export const gateOn = () => testMode() || get(K.birth) != null || Number.isFinite(window.__storeAge);
// 그 기능 최소 나이(나라 모름 = 가장 엄한 숫자 · 「보류」 = 막힘)
export function minAge(f, c = col(country())) {
  const row = POLICY.features[f]; if (!row) return Infinity;
  if (c) { const v = row[POLICY.cols.indexOf(c)]; return v === "hold" ? Infinity : v; }
  return Math.max(...row.filter(v => v !== "hold"));
}
export function allowed(f) {
  if (!gateOn()) return true;
  const a = age(), m = minAge(f);
  return a == null ? m === 0 : a >= m;
}
export const table = () => Object.keys(POLICY.features).map(f => ({ f, ko: FEATURE_KO[f] || f, min: minAge(f), ok: allowed(f) }));

// 18세 미만 등 「서버 받아쓰기」가 막힌 학습자: 브라우저 받아쓰기(기본 = 구글·애플 서버)도 막음 → 기기 안(processLocally) 한국어가 「available」일 때만 그것으로 채점
//  그 밖에는 받아쓰기 없음(앱은 채점 없이 녹음·내 목소리·견주기만) · 자동으로 서버로 넘어가지 않음(age_policy 7-2)
export let onDeviceKo = "?";
(function guardSR() {
  if (!gateOn() || allowed("sttServer")) return;
  const Orig = window.SpeechRecognition || window.webkitSpeechRecognition;
  const off = () => { try { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; } catch {} };
  off();
  if (!Orig?.available || !allowed("scoreOnDevice")) { onDeviceKo = Orig ? "기능 없음" : "받아쓰기 없음"; return; }
  Orig.available({ langs: ["ko-KR"], processLocally: true }).then(s => {
    onDeviceKo = s;
    if (s !== "available") return; // downloadable = 언어 팩 받은 뒤(받기는 나중에 학습자 허락으로)
    class LocalSR extends Orig { constructor() { super(); this.processLocally = true; } }
    window.SpeechRecognition = window.webkitSpeechRecognition = LocalSR;
  }).catch(() => { onDeviceKo = "확인 실패"; });
})();

// 채점이 안 될 때 안내 열쇠 — 나이 때문이면 「18세부터 점수 · 지금은 녹음·견주기」 · 아니면 지금 안내(브라우저 탓)
export const noScoreKey = () => (gateOn() && !allowed("sttServer") && onDeviceKo !== "available" ? "age_noscore" : "speak_hint_noscore");
