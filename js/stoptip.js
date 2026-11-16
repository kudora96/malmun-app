// 「멈추기」 풍선 도움말(대표님 11-16) — 녹음이 시작되면 멈추기 단추 곁에 「다 말했으면 눌러요 · 바로 판정해요」(한국어 + 학습자 말 같은 크기)
//  처음 3번(녹음 시작 3번)만 보이고 그 뒤로는 안 보임 · 지금은 네팔어(ne)만 · 풍선만 더함(단추·틀·소리·점수는 그대로)
import { lang } from "./i18n.js?v=1116.5";
const KEY = "malmun.stoptip", MAX = 3;
const TXT = { ne: { ko: "다 말했으면 눌러요 · 바로 판정해요", tr: "बोलिसकेपछि थिच्नुहोस् · तुरुन्तै नतिजा आउँछ" } };
let el = null, shownFor = null;
const count = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return 0; } };
export function hideStopTip() { if (el) { el.remove(); el = null; } }
// anchor = 멈추기 단추 · key = 이번 녹음 표시(같은 녹음에서 다시 그려도 한 번으로 셈)
export function showStopTip(anchor, key) {
  const x = TXT[lang]; if (!x || !anchor?.isConnected) return;
  if (el && shownFor === key) return; // 이미 떠 있음
  if (shownFor === key) return; // 이번 녹음에서는 이미 보였음(끝난 뒤 다시 안 띄움)
  if (count() >= MAX) return;
  shownFor = key; try { localStorage.setItem(KEY, String(count() + 1)); } catch {}
  hideStopTip();
  el = document.createElement("div"); el.className = "stoptip"; el.setAttribute("role", "status");
  el.innerHTML = `<span lang="ko">${x.ko}</span><span lang="${lang}">${x.tr}</span>`;
  document.body.append(el);
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  el.style.top = (r.top - h - 10 >= 4 ? r.top - h - 10 : r.bottom + 10) + "px"; // 위가 모자라면 아래
}
