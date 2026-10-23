// ⇄(모국어 ⇄ 한국어)로 바꿔도 단추·알약·머리 줄의 크기·자리가 1px 도 안 바뀌게(본부 10-15 투덜이 원칙 · 다국어부)
//  새로 그려진 단추마다: 지금 말 글과 반대쪽 말 글(i18n.tAlt)로 폭·높이를 재서 → 둘 중 큰 쪽으로 고정(min-width·min-height)
//  고정하면 줄이 넘치는 자리(좁은 폰 머리 줄 등)는 → 폭은 지금 그대로 고정하고, 더 긴 말일 때 글자 크기만 줄임(모드별 배율 · ⇄ 때 바꿈)
//  쓰기 화면(.write)은 쓰기부가 따로 함 · 배우는 내용(대사·낱말·설명 본문)은 건드리지 않음
import { tFor, tAltFor, uiKoOn, uiKoIn, koReady, preloadKoUi, lang, uiKeys, KO_UI } from "./i18n.js?v=1023.13";
import { snapshot } from "./retext.js?v=1023.13";

const TARGET = "button, a[href], .chip, [role=button], .modeb, .sheet > p, .sheet h2, .eps .st, .hero .meta, .whead > b, .whead > .sub, .bar .t, .bar .sub, .vtitle .tt > b, .exhead > b, .v9bar > span";
const SHRINK = ".whead > *, .bar > *, .bar .t, .bar .sub, .vtitle .tt > *, .hbt > *, .eps .st"; // 한 줄을 나눠 쓰는 머리 줄 — 넓히지 않고 글자만 줄임
const SKIP = ".write, [lang=ko]:not(button):not(.chip), .kotext, .ko, .v9body :is(p,.pair,.pairln,.glosses,.saybig,.sayrom,.ex,.sn), .glosses, .saybig, .tr, .rom, .mean, .who, .vsub, .chip.uiko, [data-act=lang], .kb, .slot, .lines .line > p, svg, script, style, textarea, input";
const EDGE = /^([\s\p{S}\p{P}]*?)(\p{L}[\s\S]*?\S|\p{L})([\s\p{S}\p{P}]*)$/u;
const coreOf = s => EDGE.exec(String(s).trim())?.[2] ?? String(s).trim();
const MIN_SCALE = 0.72; // 글자는 이보다 작게 안 줄임(읽기)

// 글 한 덩이의 반대쪽 말 글(없으면 null) — retext 와 같은 찾기(통째 · 가운데 글 · 숫자 꼬리 · data-k)
function altOf(node, snapFor) { // 창 범위 ⇄(10-23): 그 글이 든 창 상태 기준의 반대 말
  const v = node.nodeValue, tv = v.trim(); if (!tv || !/\p{L}/u.test(tv)) return null;
  const p = node.parentElement, on = uiKoIn(p), snap = snapFor(on), tAlt = k => tAltFor(on, k);
  if (p?.dataset.k) { const a = tAlt(p.dataset.k); return a == null ? null : (p.hasAttribute("data-kcore") ? coreOf(a) : a); }
  const ks = multi(on).get(tv); if (ks?.length > 1) { const as = ks.map(tAlt).filter(a => a != null); if (as.length) return as.map(a => v.replace(tv, a)); } // 한 글 = 열쇠 여럿(「듣기」·「닫기」) → 반대쪽 글 후보 전부(가장 긴 것으로 잼)
  let k = snap.get(tv); if (k) { const a = tAlt(k); return a == null ? null : v.replace(tv, a); }
  const m = EDGE.exec(v), c = m?.[2].trim();
  k = c && (snap.get(c) || snap.core.get(c)); if (k) { const a = tAlt(k); return a == null ? null : m[1] + (snap.txt.get(k) === c ? a : coreOf(a)) + m[3]; }
  for (const { re, k: tk0, names } of snap.tpl) { const r = re.exec(tv); if (!r) continue; const tk = tk0.replace(/_(zero|one|two|few|many|other)$/, ""); const ni = names.indexOf("n"), pk = ni >= 0 && on ? `${tk}_${new Intl.PluralRules(lang).select(+String(r[ni + 1]).replace(/[^0-9.]/g, ""))}` : null; /* 한국어 화면에서 학습자 말 쪽 = 그 말 복수형 열쇠(n_episodes_other 등) — 전엔 바탕 열쇠가 없어 한국어로 재서 tl 320 ⇄ 때 18.6px(10-20) */ let a = on ? ((pk && tAlt(pk)) ?? tAlt(tk0) ?? tAlt(tk)) : tAlt(tk); /* 한국어판엔 복수형 열쇠가 없음 → 한국어 쪽은 바탕 열쇠 */ if (a == null) return null; names.forEach((n, i) => { a = a.replace(`{${n}}`, r[i + 1]); }); return v.replace(tv, a); } // {칸} 틀 글(「31편」 · 「5 / 15」)
  const nt = /^([\s\p{S}\p{P}]*)(.*?\p{L}[\p{L}\p{M}]*)(\s*[\d.,:/×%]+.*)$/u.exec(tv);
  if (nt) { k = snap.get(nt[2].trim()) || snap.core.get(nt[2].trim()); if (k) { const a = tAlt(k); return a == null ? null : v.replace(tv, nt[1] + coreOf(a) + nt[3]); } }
  return null;
}

let multiMap = null, multiMode = "";
function multi(on = uiKoOn()) { const m0 = (on ? "K" : "L") + lang; if (multiMap && multiMode === m0) return multiMap; multiMap = new Map(); multiMode = m0; for (const k of uiKeys()) { const s = String(tFor(on, k)).trim(); if (!s || s.includes("{")) continue; (multiMap.get(s) || multiMap.set(s, []).get(s)).push(k); } return multiMap; }
const mode = el => ((el ? uiKoIn(el) : uiKoOn()) ? "K" : "L"); // el = 그 단추가 든 창 상태(창 범위 ⇄)
const fitted = new Set();
function applyScale(el) { const f = el.__lf; if (!f) return; const s = f.scale[mode(el)] || 1; el.style.fontSize = s === 1 ? f.fs0 : `calc(${f.fs0} * ${s.toFixed(3)})`; }

// 단추 글이 다른 열쇠 글로 바뀌면(「설명」 → 「▶ 영상 전체」 같은 상태 바뀜) 폭을 풀고 다시 잼 — ⇄ 로 바뀐 글(두 말 중 하나)은 그대로
function refitIfChanged(el) {
  const f = el.__lf; if (!f || f.sig.has(el.textContent)) return;
  el.__lf = null; fitted.delete(el); el.style.minWidth = el.style.maxWidth = el.style.minHeight = el.style.maxHeight = el.style.overflow = el.style.fontSize = el.style.whiteSpace = "";
}
// 단추 하나의 바꿀 글 목록(없으면 null) — 이미 잰 단추·숨은 단추·배우는 내용은 빼고
function prep(el, snapFor) {
  refitIfChanged(el);
  if (el.__lf || !el.isConnected || el.closest(SKIP) || !el.getClientRects().length) return null;
  const nodes = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const p = n.parentElement; if (p.closest(SKIP) && !el.matches(".chip.uiko")) continue; let a = altOf(n, snapFor); if (Array.isArray(a)) a = a.reduce((x, y) => (y.length > x.length ? y : x)); if (a != null && a !== n.nodeValue) nodes.push([n, n.nodeValue, a]); }
  return nodes.length ? { el, nodes, bs0: el.style.boxSizing } : null;
}
const boxOf = el => { const c = getComputedStyle(el); return { width: parseFloat(c.width) || el.offsetWidth, height: parseFloat(c.height) || el.offsetHeight }; }; // 레이아웃 px 소수까지(설명 창처럼 통째로 줄여 보이는(scale) 곳도 · 반올림 0.5px 흔들림 없게)
// 한 화면의 새 단추를 「한꺼번에」 두 말로 재기 — 한 줄·한 격자를 나눠 쓰는 단추들은 옆 단추 글 길이로 줄 높이가 바뀜(id 말하기 단추 4칸 · 10-19) → 모두 반대쪽 말로 바꾼 채 한 번 더 잼
function measureAll(list) {
  list.forEach(x => { x.el.style.boxSizing = "border-box"; });
  list.forEach(x => { x.r0 = boxOf(x.el); });
  list.forEach(x => x.nodes.forEach(([n, , a]) => { n.nodeValue = a; }));
  list.forEach(x => { x.r1 = boxOf(x.el); x.sig1 = x.el.textContent; });
  list.forEach(x => x.nodes.forEach(([n, v]) => { n.nodeValue = v; }));
  list.forEach(x => { x.sig0 = x.el.textContent; });
}
function fit({ el, nodes, bs0, r0, r1, sig0, sig1 }) {
  const cur = mode(el), alt = cur === "K" ? "L" : "K";
  el.__lf = { fs0: getComputedStyle(el).fontSize, scale: { L: 1, K: 1 }, sig: new Set([sig0, sig1]) }; fitted.add(el);
  if (Math.abs(r1.width - r0.width) < 0.05 && Math.abs(r1.height - r0.height) < 0.05) { el.style.boxSizing = bs0; return; } // 두 말 폭이 같음
  const W = Math.max(r0.width, r1.width), H = Math.max(r0.height, r1.height);
  // 좁은 머리 줄(.whead·.bar 안 · 다른 단추와 한 줄을 나눠 씀)은 넓히지 않음 — 지금 크기를 그대로 잠그고 긴 말일 때 글자만 줄임(우르두 320 머리 줄이 두 줄로 꺾여 닫기 단추가 밀리던 것 · 10-15)
  const lockNow = () => {
    el.style.minWidth = el.style.maxWidth = `${r0.width}px`; el.style.minHeight = el.style.maxHeight = `${r0.height}px`; el.style.overflow = "hidden";
    nodes.forEach(([n, , a]) => { n.nodeValue = a; }); // 잠근 크기에 반대쪽 말이 들어가려면 몇 배로 줄여야 하는지
    let sc = 1; for (let k = 0; k < 6 && (el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5); k++) { sc *= Math.min(el.clientWidth / el.scrollWidth, el.clientHeight / el.scrollHeight, 0.97); el.style.fontSize = `calc(${el.__lf.fs0} * ${sc.toFixed(3)})`; }
    nodes.forEach(([n, v]) => { n.nodeValue = v; }); el.style.fontSize = "";
    el.__lf.scale[alt] = Math.max(MIN_SCALE, sc);
    el.style.overflow = ""; // 잴 때만 숨김(높이는 잠근 채 · 넘치는 획만 밖으로 보임) — 그대로 두면 미얀마·나스탈리크처럼 글자 상자보다 키 큰 글자가 깎임(10-19 my 편 목록 「곧」) · 크기는 min 과 글자 배율로 지킴
  };
  if (el.matches(SHRINK)) { lockNow(); return; }
  el.style.boxSizing = "border-box"; el.style.minHeight = `${H}px`;
  if (r1.width <= r0.width) { el.style.minWidth = `${r0.width}px`; return; } // 지금 말이 더 긺 = 지금 폭이 기준
  el.style.minWidth = `${W}px`;
  // 넓혀서 줄·화면이 넘치면(오른쪽→왼쪽 언어는 왼쪽 밖) → 지금 크기로 잠그고 긴 말일 때 글자만 줄임
  const row = el.parentElement, over = () => (row && (row.scrollWidth > row.clientWidth + 1 || row.scrollHeight > row.clientHeight + 1)) || [...(row?.children || [el])].some(c => { const r = c.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; });
  if (over()) { el.style.minHeight = ""; lockNow(); }
}

let snapCache = null, snapMode = null, queued = false;
function run(root = document.body) {
  queued = false;
  if (!KO_UI.includes(lang)) return; // ⇄ 없는 언어(en 등) = 맞출 반대쪽 말 없음 — 전엔 koReady 가 늘 false 라 run→then→run 끝없는 고리로 화면이 멈췄음(쓰기부 10-15 긴급)
  if (!koReady(lang)) { if (!run.waiting) { run.waiting = true; preloadKoUi().then(() => { run.waiting = false; if (koReady(lang)) run(root); }); } return; }
  if (snapMode !== lang) { snapCache = {}; snapMode = lang; }
  const snapFor = on => (snapCache[on ? "K" : "L"] ||= snapshot(on)); // 상태마다 하나(앱 전체 · 창 범위 ⇄ 둘 다)
  const n0 = fitted.size, list = [...root.querySelectorAll(TARGET)].map(el => prep(el, snapFor)).filter(Boolean);
  if (list.length) { measureAll(list); list.forEach(fit); }
  if (fitted.size !== n0) window.dispatchEvent(new CustomEvent("malmun:langfit")); // 폭을 새로 고정함 → 머리 줄 줄이기(fitHead 등)가 「두 말 중 긴 쪽」 폭으로 처음부터 다시 재게(⇄ 첫 번째에도 0px)
}
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(() => run()); } };

if (!window.__langfitWired) {
  window.__langfitWired = true;
  new MutationObserver(recs => { if (recs.some(r => !(r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest?.(".ut"))) queue(); }).observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "open", "aria-expanded"] }); // 숨었다 나타나는 창(hidden·class)도 — 보일 때 잼 · 단원 이름(.ut)은 list.js fitUnit 이 혼자 맞춤 → 그 안 바뀜으로 옆 줄을 다시 재지 않음(tl 320 ⇄ 때 18.6px · 10-20)
  // ⇄ 직후(retext 가 글을 바꾼 같은 순간) — 모드별 글자 배율만 바꿈(폭은 이미 고정) · 사라진 단추는 잊음
  window.addEventListener("malmun:uilang", () => { snapCache = {}; for (const el of fitted) { if (!el.isConnected) { fitted.delete(el); continue; } applyScale(el); } });
  // 언어 자체를 바꾸면(지구 단추) 다시 잼
  window.addEventListener("malmun:langset", () => { for (const el of fitted) { el.__lf = null; el.style.minWidth = el.style.maxWidth = el.style.minHeight = el.style.fontSize = ""; } fitted.clear(); snapCache = null; queue(); });
  queue();
}
export const langfitRun = run;
