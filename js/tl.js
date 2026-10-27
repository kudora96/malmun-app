// 지금 「배울 말」(다국어부 10-27 · 작전표 004 F) — 앱 전체에서 한국어를 코드에 박지 않고 여기서 읽음 · 1단계 = 늘 ko(지금과 똑같이)
//  LEARN = 배울 말 코드(ko·en·ta …) · 개발 주소에서만 ?learn=xx 로 시험(ready 아닌 말도) · 공개는 ready 인 말만(기억 malmun.learn)
import { LEARN_INFO } from "./learnlangs.js?v=1023.27";
export { LEARN_INFO };

const DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
function pick() {
  try {
    const m = /[?&]learn=([a-z]{2,3})(&|$)/.exec(location.search);
    if (m && DEV && LEARN_INFO[m[1]]) return m[1];
    const s = localStorage.getItem("malmun.learn");
    if (s && LEARN_INFO[s]?.ready) return s;
  } catch {}
  return "ko";
}
export const LEARN = pick();
export const learnInfo = LEARN_INFO[LEARN];
// 편 자료 길 — ko = 옛 길 data/<편>/ 그대로(본부 10-27 · 옮기기는 개발1팀이 도구 6~7개 고칠 때 이 상수 하나) · 나머지 = data/<말>/<편>/
export const KO_LEGACY_PATH = true;
export const dataBase = LEARN === "ko" && KO_LEGACY_PATH ? "data" : `data/${LEARN}`;

document.documentElement.dataset.learn = LEARN;
if (learnInfo.font && !document.querySelector(`link[data-font="${LEARN}"]`)) { // 그 말 글꼴(기본 글꼴에 없는 글자 체계)만 · ko 는 해당 없음
  document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?family=${learnInfo.font.replace(/ /g, "+")}:wght@400;700&display=swap` }));
  document.head.lastElementChild.dataset.font = LEARN;
}
if (learnInfo.lh) document.documentElement.style.setProperty("--learn-lh", String(learnInfo.lh));
