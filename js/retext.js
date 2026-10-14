// 화면 글을 그 자리에서 다른 언어로(본부 10-13 투덜이 지적 ① · 안 A) — 다시 그리지 않음 → 소리·녹음·채점·쓰던 자리 그대로
//  ① 조합한 글(점수 줄 · 「🎤 말하세요」 등) = setTx(el, () => 글) 로 쓴 곳 → 그 함수를 다시 불러 새 언어로
//  ② 글 전체가 t(열쇠) 하나인 글·aria-label·title·data-peek → 바꾸기 전 글로 열쇠를 찾아 새 글로(앞뒤 기호 「🎤 」「▶ 」는 그대로)
//  배우는 한국어·대사 뜻(대사·낱말·설명 본문·학습자 말 뜻)은 건드리지 않음 · 끝에 malmun:uilang 이벤트(말하기·쓰기 창이 상태로 다시 씀)
import { t, uiKeys } from "./i18n.js?v=1014.2";

export const setTx = (el, fn) => { if (!el) return; el.__tx = fn; el.textContent = el.__txv = fn(); }; // 뒤에 다른 글로 바뀌면(textContent = …) 그 함수는 안 씀
export const clearTx = el => { if (el) el.__tx = null; };

// 지금 언어의 앱 글 → 열쇠({이름} 칸이 있는 글은 빼고 · 같은 글이 둘이면 처음 것)
export function snapshot() {
  const m = new Map();
  for (const k of uiKeys()) { const s = String(t(k)).trim(); if (s && !s.includes("{") && !m.has(s)) m.set(s, k); }
  return m;
}

const SKIP = "[lang=ko], .kotext, .ko, .v9body, .glosses, .saybig, .tr, .rom, .mean, .who, .vsub, script, style, textarea, input";
const EDGE = /^([\s\p{S}\p{P}]*?)(\p{L}[\s\S]*?\S|\p{L})([\s\p{S}\p{P}]*)$/u; // 앞뒤 기호·빈칸 / 가운데 글
const swap = (v, before) => {
  if (!v) return null;
  const k0 = before.get(v.trim()); if (k0) return v.replace(v.trim(), t(k0));
  const m = EDGE.exec(v); const k = m && before.get(m[2].trim());
  return k ? m[1] + t(k) + m[3] : null;
};

export function retext(before, root = document.body) {
  for (const el of root.querySelectorAll("*")) if (typeof el.__tx === "function") { if (el.textContent !== el.__txv) { el.__tx = null; continue; } try { el.textContent = el.__txv = el.__tx(); } catch {} }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
    let q = p; while (q && q !== root && !q.__tx) q = q.parentElement; if (q?.__tx) continue; // ①로 이미 씀
    const v = swap(n.nodeValue, before); if (v != null && v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of root.querySelectorAll("[aria-label],[title],[data-peek],[placeholder]")) for (const a of ["aria-label", "title", "data-peek", "placeholder"]) {
    const v = swap(el.getAttribute(a), before); if (v != null) el.setAttribute(a, v);
  }
  window.dispatchEvent(new CustomEvent("malmun:uilang"));
}
