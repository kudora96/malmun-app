// ⇄(모국어 ⇄ 한국어)로 바꿔도 단추·알약·머리 줄의 크기·자리가 1px 도 안 바뀌게(본부 10-15 투덜이 원칙 · 다국어부)
//  새로 그려진 단추마다: 지금 말 글과 반대쪽 말 글(i18n.tAlt)로 폭·높이를 재서 → 둘 중 큰 쪽으로 고정(min-width·min-height)
//  고정하면 줄이 넘치는 자리(좁은 폰 머리 줄 등)는 → 폭은 지금 그대로 고정하고, 더 긴 말일 때 글자 크기만 줄임(모드별 배율 · ⇄ 때 바꿈)
//  쓰기 화면(.write)은 쓰기부가 따로 함 · 배우는 내용(대사·낱말·설명 본문)은 건드리지 않음
import { t, tAlt, uiKoOn, koReady, preloadKoUi, lang, KO_UI } from "./i18n.js?v=1015.2.1";
import { snapshot } from "./retext.js?v=1015.2.1";

const TARGET = "button, a[href], .chip, [role=button], .modeb, .whead > b, .whead > .sub, .bar .t, .bar .sub, .vtitle .tt > b, .exhead > b, .v9bar > span";
const SKIP = ".write, [lang=ko]:not(button):not(.chip), .kotext, .ko, .v9body :is(p,.pair,.pairln,.glosses,.saybig,.sayrom,.ex,.sn), .glosses, .saybig, .tr, .rom, .mean, .who, .vsub, .chip.uiko, [data-lang], [data-act=lang], .kb, .slot, .lines .line > p, svg, script, style, textarea, input";
const EDGE = /^([\s\p{S}\p{P}]*?)(\p{L}[\s\S]*?\S|\p{L})([\s\p{S}\p{P}]*)$/u;
const coreOf = s => EDGE.exec(String(s).trim())?.[2] ?? String(s).trim();
const MIN_SCALE = 0.72; // 글자는 이보다 작게 안 줄임(읽기)

// 글 한 덩이의 반대쪽 말 글(없으면 null) — retext 와 같은 찾기(통째 · 가운데 글 · 숫자 꼬리 · data-k)
function altOf(node, snap) {
  const v = node.nodeValue, tv = v.trim(); if (!tv || !/\p{L}/u.test(tv)) return null;
  const p = node.parentElement;
  if (p?.dataset.k) { const a = tAlt(p.dataset.k); return a == null ? null : (p.hasAttribute("data-kcore") ? coreOf(a) : a); }
  let k = snap.get(tv); if (k) { const a = tAlt(k); return a == null ? null : v.replace(tv, a); }
  const m = EDGE.exec(v), c = m?.[2].trim();
  k = c && (snap.get(c) || snap.core.get(c)); if (k) { const a = tAlt(k); return a == null ? null : m[1] + (snap.txt.get(k) === c ? a : coreOf(a)) + m[3]; }
  for (const { re, k: tk, names } of snap.tpl) { const r = re.exec(tv); if (!r) continue; let a = tAlt(tk); if (a == null) return null; names.forEach((n, i) => { a = a.replace(`{${n}}`, r[i + 1]); }); return v.replace(tv, a); } // {칸} 틀 글(「31편」 · 「5 / 15」)
  const nt = /^([\s\p{S}\p{P}]*)(.*?\p{L}[\p{L}\p{M}]*)(\s*[\d.,:/×%]+.*)$/u.exec(tv);
  if (nt) { k = snap.get(nt[2].trim()) || snap.core.get(nt[2].trim()); if (k) { const a = tAlt(k); return a == null ? null : v.replace(tv, nt[1] + coreOf(a) + nt[3]); } }
  return null;
}

const mode = () => (uiKoOn() ? "K" : "L");
const fitted = new Set();
function applyScale(el) { const f = el.__lf; if (!f) return; const s = f.scale[mode()] || 1; el.style.fontSize = s === 1 ? f.fs0 : `calc(${f.fs0} * ${s.toFixed(3)})`; }

// 단추 글이 다른 열쇠 글로 바뀌면(「설명」 → 「▶ 영상 전체」 같은 상태 바뀜) 폭을 풀고 다시 잼 — ⇄ 로 바뀐 글(두 말 중 하나)은 그대로
function refitIfChanged(el) {
  const f = el.__lf; if (!f || f.sig.has(el.textContent)) return;
  el.__lf = null; fitted.delete(el); el.style.minWidth = el.style.maxWidth = el.style.minHeight = el.style.fontSize = el.style.whiteSpace = "";
}
function fit(el, snap) {
  refitIfChanged(el);
  if (el.__lf || !el.isConnected || el.closest(SKIP) || !el.getClientRects().length) return;
  const nodes = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const p = n.parentElement; if (p.closest(SKIP) && !el.matches(".chip.uiko")) continue; const a = altOf(n, snap); if (a != null && a !== n.nodeValue) nodes.push([n, n.nodeValue, a]); }
  if (!nodes.length) return;
  const bs0 = el.style.boxSizing; el.style.boxSizing = "border-box"; // 잴 때부터 테두리까지 한 폭(min-width 와 같은 기준)
  const box = () => { const c = getComputedStyle(el); return { width: parseFloat(c.width) || el.offsetWidth, height: parseFloat(c.height) || el.offsetHeight }; }; // 레이아웃 px 소수까지(설명 창처럼 통째로 줄여 보이는(scale) 곳도 · 반올림 0.5px 흔들림 없게)
  const r0 = box();
  nodes.forEach(([n, , a]) => { n.nodeValue = a; });
  const r1 = box();
  nodes.forEach(([n, v]) => { n.nodeValue = v; });
  const cur = mode(), alt = cur === "K" ? "L" : "K";
  const sig0 = el.textContent; nodes.forEach(([n, , a]) => { n.nodeValue = a; }); const sig1 = el.textContent; nodes.forEach(([n, v]) => { n.nodeValue = v; });
  el.__lf = { fs0: getComputedStyle(el).fontSize, scale: { L: 1, K: 1 }, sig: new Set([sig0, sig1]) }; fitted.add(el);
  if (Math.abs(r1.width - r0.width) < 0.05 && Math.abs(r1.height - r0.height) < 0.05) { el.style.boxSizing = bs0; return; } // 두 말 폭이 같음
  const W = Math.max(r0.width, r1.width), H = Math.max(r0.height, r1.height);
  el.style.boxSizing = "border-box"; el.style.minHeight = `${H}px`;
  if (r1.width <= r0.width) { el.style.minWidth = `${r0.width}px`; return; } // 지금 말이 더 긺 = 지금 폭이 기준
  el.style.minWidth = `${W}px`;
  // 넓혀서 줄·화면이 넘치면 → 폭은 지금 그대로 고정 + 반대쪽(더 긴) 말일 때 글자만 줄임
  const row = el.parentElement, over = () => (row && row.scrollWidth > row.clientWidth + 1) || el.getBoundingClientRect().right > innerWidth + 0.5;
  if (over()) {
    el.style.minWidth = el.style.maxWidth = `${r0.width}px`; el.style.whiteSpace = "nowrap";
    el.__lf.scale[alt] = Math.max(MIN_SCALE, (r0.width - 2) / r1.width);
  }
}

let snapCache = null, snapMode = null, queued = false;
function run(root = document.body) {
  queued = false;
  if (!KO_UI.includes(lang)) return; // ⇄ 없는 언어(en·hi 등) = 할 일 없음 — 한국어판이 없어 koReady 가 늘 거짓 → 끝없이 다시 돌며 앱이 멈추던 것(쓰기부 10-15 긴급)
  if (!koReady(lang)) { preloadKoUi().then(() => run(root)); return; }
  if (!snapCache || snapMode !== mode() + lang) { snapCache = snapshot(); snapMode = mode() + lang; }
  root.querySelectorAll(TARGET).forEach(el => fit(el, snapCache));
}
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(() => run()); } };

if (!window.__langfitWired) {
  window.__langfitWired = true;
  new MutationObserver(queue).observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "open", "aria-expanded"] }); // 숨었다 나타나는 창(hidden·class)도 — 보일 때 잼
  // ⇄ 직후(retext 가 글을 바꾼 같은 순간) — 모드별 글자 배율만 바꿈(폭은 이미 고정) · 사라진 단추는 잊음
  window.addEventListener("malmun:uilang", () => { snapCache = null; for (const el of fitted) { if (!el.isConnected) { fitted.delete(el); continue; } applyScale(el); } });
  // 언어 자체를 바꾸면(지구 단추) 다시 잼
  window.addEventListener("malmun:langset", () => { for (const el of fitted) { el.__lf = null; el.style.minWidth = el.style.maxWidth = el.style.minHeight = el.style.fontSize = ""; } fitted.clear(); snapCache = null; queue(); });
  queue();
}
export const langfitRun = run;
