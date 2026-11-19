// 앱 공용 작은 도움말 상자(11-18 · 대표님 「도움말은 위로 · 아래로 뜨면 마우스와 겹침」)
// title="…" 은 브라우저 기본 말풍선(아래로 뜸) 대신 data-tip 으로 옮겨, 단추 위쪽에 .vl-tip 모양 상자로 보여 준다.
// 마우스일 때만(휴대폰·터치는 없음) · 마우스를 떼면 사라짐 · 글은 뜰 때마다 지금 값(⇄ 하면 따라감).
import { starChip } from "./vocab.js?v=1119.36"; // ⭐ 단추 이름은 문구표(vocab.js)에서 뜰 때마다 다시 읽음(⇄ 뒤 새 말)
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
export function showTip(el, text) {
  hide(); if (!text) return; cur = el;
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
  document.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const el = e.target.closest?.("[data-tip]"); if (el && el !== cur && !el.closest(".vl-row")) showTip(el, fresh(el)); else if (!el) hide(); }, true);
  document.addEventListener("pointerout", e => { if (cur && !cur.contains(e.relatedTarget)) hide(); }, true);
  document.addEventListener("pointerdown", hide, true); document.addEventListener("scroll", hide, true);
}
