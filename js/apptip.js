// 앱 공용 작은 도움말 상자(11-18 · 대표님 「도움말은 위로 · 아래로 뜨면 마우스와 겹침」)
// title="…" 은 브라우저 기본 말풍선(아래로 뜸) 대신 data-tip 으로 옮겨, 단추 위쪽에 .vl-tip 모양 상자로 보여 준다.
// 마우스일 때만(휴대폰·터치는 없음) · 마우스를 떼면 사라짐 · 글은 뜰 때마다 지금 값(⇄ 하면 따라감).
import { lang, uiKoOn } from "./i18n.js?v=1120.29";
import { starChip } from "./vocab.js?v=1120.29"; // ⭐ 단추 이름은 문구표(vocab.js)에서 뜰 때마다 다시 읽음(⇄ 뒤 새 말)
const TIP_CLASS = "vl-tip";
let tip = null, cur = null;
const hide = () => { tip?.remove(); tip = null; cur = null; };
const conv = el => { if (el.nodeType !== 1 || !el.hasAttribute("title") || el.tagName === "IFRAME") return; const v = el.getAttribute("title"); el.removeAttribute("title"); if (v) { el.dataset.tip = v; el.dataset.tipa = el.getAttribute("aria-label") || ""; if (!el.hasAttribute("aria-label") && !el.textContent.trim()) el.setAttribute("aria-label", v); } else delete el.dataset.tip; };
const sweep = root => { if (root.nodeType !== 1) return; conv(root); root.querySelectorAll?.("[title]").forEach(conv); };
// 뜰 때마다 그 단추의 지금 이름: ⭐ = 문구표 · 그 밖엔 ⇄(retext)가 바꾼 aria-label 이 처음 것과 다르면 그것 · 아니면 data-tip
const fresh = el => {
  let v = null;
  if (el.classList.contains("vkstar")) { const d = document.createElement("div"); d.innerHTML = starChip(); v = d.firstElementChild?.getAttribute("aria-label") || null; if (v) el.setAttribute("aria-label", v); }
  else { const a = el.getAttribute("aria-label"); if (a && a !== (el.dataset.tipa || "")) v = a; }
  if (v) { el.dataset.tip = v; el.dataset.tipa = el.getAttribute("aria-label") || ""; }
  return el.dataset.tip;
};
// 11-20 대표님 「X표 모르는 사람 없잖아 · 도움말 풍선은 진짜 필요할 때만 · 풍선은 이름 되풀이 말고 「누르면 무슨 일이 일어나는지」 한 문장」.
// ① 단추에 글이 보이면 풍선 없음 ② 누구나 아는 기호(✕ ▶ ⏸ ‹ ›) 풍선 없음 ③ 남기는 것 = 아래 SENT 설명 문장(그 화면 말 ⇄ 따라감: 한국어 / 네팔어) · 예외 표시 data-notip(안 띄움)
// title/aria-label 은 그대로(화면 낭독용) — 풍선만 안 뜸. 두 말·자동·⭐ 단어장은 글이 보여도 뜻이 낯설어 예외로 설명 풍선(본부안 11-20).
const TIP_KEEP = ".vp-han,.vkstar,[data-vk=star]"; // 이름 풍선 그대로 남김(자판 한/ने · ⭐ 단어장 단추)
const SENT = { // 네팔어 = Claude 서브에이전트 3명 블라인드 다수결(11-20)
  star_add: ["누르면 내 단어장에 담겨요", "थिचेपछि मेरो शब्दसूचीमा थपिन्छ"], star_has: ["내 단어장에 있어요 · 누르면 빠져요", "मेरो शब्दसूचीमा छ · थिचेपछि हटिन्छ"],
  full: ["전체 화면으로 봐요", "पूरा स्क्रिनमा हेर्नुहोस्"], mic: ["말로 찾아요", "बोलेर खोज्नुहोस्"], bin: ["단어장에서 지워요", "शब्दसूचीबाट हटाउनुहोस्"],
  two: ["두 말: 한 마디씩 두 말로 번갈아 읽어요", "दुई भाषा: एक-एक वाक्यांश दुवै भाषामा पालैपालो पढ्नुहोस्"], auto: ["자동: 끝나면 다음으로 넘어가요", "स्वचालित: सकिएपछि अर्कोमा जान्छ"],
  prev: ["이전 카드", "अघिल्लो कार्ड"], next: ["다음 카드", "अर्को कार्ड"] };
export const SENT_SEL = ".vk-star,.bigb,.vfs,.vp-mic,.vk-two,[data-act=exauto],.vk-prev,.vk-next";
const sentKey = el => el.matches(".vk-star") ? (el.dataset.on === "1" ? "star_has" : "star_add") : el.matches(".bigb,.vfs") ? "full" : el.matches(".vp-mic") ? "mic" : el.matches(".vl-bin") ? "bin" : el.matches(".vk-two") ? "two" : el.matches("[data-act=exauto]") ? "auto" : el.matches(".vk-prev") ? "prev" : el.matches(".vk-next") ? "next" : null;
// 뜰 풍선 글(없으면 null = 안 뜸)
export function tipText(el, v) {
  if (el.hasAttribute("data-notip")) return null;
  const k = el.matches(SENT_SEL) ? sentKey(el) : null;
  if (k) { if (k !== "two" && k !== "auto" && !k.startsWith("star") && /\p{L}/u.test(el.innerText || "")) return null; // 글이 보이면 풍선 없음(좁은 폭에서 글이 숨겨진 때만)
    if (SENT[k]) return uiKoOn() ? SENT[k][0] : (lang === "ne" ? SENT[k][1] : null); }
  v = (v || "").trim(); if (!v || !el.matches(TIP_KEEP)) return null;
  return v;
}
export const sentText = k => (uiKoOn() ? SENT[k][0] : lang === "ne" ? SENT[k][1] : null);
window.__sentText = sentText;
export const tipNeeded = (el, v) => !!tipText(el, v);
export function showTip(el, text) {
  text = tipText(el, text); hide(); if (!text) return; cur = el;
  tip = document.createElement("div"); tip.className = TIP_CLASS; tip.setAttribute("role", "tooltip"); tip.textContent = text;
  (el.closest(".vstage") || document.fullscreenElement || document.body).append(tip);
  const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  tip.style.left = Math.round(Math.max(4, Math.min(vw - t.width - 4, r.left + r.width / 2 - t.width / 2))) + "px"; 
  if (r.top - t.height - 6 >= 4) tip.style.top = Math.round(r.top - t.height - 6) + "px"; // 단추 위쪽
  else { tip.style.top = Math.round(r.bottom + 22) + "px"; tip.style.left = Math.round(Math.max(4, Math.min(vw - t.width - 4, r.left + r.width / 2 + 10))) + "px"; } // 위에 자리 없음 → 단추 아래쪽·오른쪽으로 비켜서(마우스 손 아래 겹침 없이 · 단추와 안 겹침)
}
export function initAppTip() {
  if (window.__appTip) return; window.__appTip = true;
  sweep(document.body);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === "attributes") conv(m.target); else m.addedNodes.forEach(sweep); } }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
  document.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const el = e.target.closest?.("[data-tip],"+SENT_SEL); if (el && el !== cur && !el.closest(".vl-row")) showTip(el, fresh(el)); else if (!el) hide(); }, true);
  document.addEventListener("pointerout", e => { if (cur && !cur.contains(e.relatedTarget)) hide(); }, true);
  document.addEventListener("pointerdown", hide, true); document.addEventListener("scroll", hide, true);
}
