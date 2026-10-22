// 화면 글을 그 자리에서 다른 언어로(본부 10-13 투덜이 지적 ① · 안 A) — 다시 그리지 않음 → 소리·녹음·채점·쓰던 자리 그대로
//  ① 조합한 글(점수 줄 · 「🎤 말하세요」 등) = setTx(el, () => 글) 로 쓴 곳 → 그 함수를 다시 불러 새 언어로
//  ② 글 전체가 t(열쇠) 하나인 글·aria-label·title·data-peek → 바꾸기 전 글로 열쇠를 찾아 새 글로(앞뒤 기호 「🎤 」「▶ 」는 그대로)
//  배우는 한국어·대사 뜻(대사·낱말·설명 본문·학습자 말 뜻)은 건드리지 않음 · 끝에 malmun:uilang 이벤트(말하기·쓰기 창이 상태로 다시 씀)
import { t, uiKeys } from "./i18n.js?v=1022.25";

export const setTx = (el, fn) => { if (!el) return; el.__tx = fn; el.textContent = el.__txv = fn(); }; // 뒤에 다른 글로 바뀌면(textContent = …) 그 함수는 안 씀
export const clearTx = el => { if (el) el.__tx = null; };

// 지금 언어의 앱 글 → 열쇠(같은 글이 둘이면 처음 것)
//  + 앞뒤 기호를 뗀 가운데 글(「? 방법」 → 「방법」 — 단추가 기호와 글을 따로 감싼 곳 · 다국어부 10-14 전수 조사)
//  + {이름} 칸이 있는 글은 틀(정규식)로(「속도 0.9×」 같은 숫자 섞인 글) · 열쇠 → 글(txt)
export function snapshot() {
  const m = new Map(), core = new Map(), tpl = [], txt = new Map();
  for (const k of uiKeys()) {
    const s = String(t(k)).trim(); if (!s) continue;
    if (s.includes("{")) { const names = []; const re = new RegExp("^" + s.split(/(\{\w+\})/).map(x => /^\{\w+\}$/.test(x) ? (names.push(x.slice(1, -1)), /^\{(n|m|s|p)\}$/.test(x) ? "([0-9.,:/]+)" : "(.+?)") : x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$", "u"); if (/\p{L}/u.test(s.replace(/\{\w+\}/g, ""))) tpl.push({ re, k, names }); continue; }
    txt.set(k, s);
    if (!m.has(s)) m.set(s, k);
    const c = coreOf(s); if (c && c !== s && !core.has(c)) core.set(c, k);
  }
  tpl.sort((a, b) => b.re.source.length - a.re.source.length); // 숫자 칸({n}{m}{s}{p})은 숫자만 · 긴 틀 먼저 — 짧은 틀(「{n}句」)이 긴 글(「已看到第15句」)을 잘못 잡던 것(다국어부 10-19 zh)
  m.core = core; m.tpl = tpl; m.txt = txt;
  return m;
}

// 배우는 내용(설명 본문·낱말·대사)은 그대로 · 설명 카드 안 단추(「말해 보세요」·견본·속도·로마자·닫기)는 바꿈(다국어부 10-14 — 전엔 .v9body 통째로 빠져 안 바뀜)
const SKIP = "[lang=ko], .ept, .ut, .kotext, .ko, .v9body :is(p,.pair,.pairln,.glosses,.saybig,.sayrom,.ex,.sn), .glosses, .saybig, .tr, .rom, .mean, .who, .vsub, script, style, textarea, input";
const EDGE = /^([\s\p{S}\p{P}]*?)(\p{L}[\s\S]*?\S|\p{L})([\s\p{S}\p{P}]*)$/u; // 앞뒤 기호·빈칸 / 가운데 글
function coreOf(s) { return EDGE.exec(String(s).trim())?.[2] ?? String(s).trim(); }
// 글 자리(mem)마다 찾은 열쇠를 기억 — 한국어 「닫기」처럼 한 글이 열쇠 둘(close·close_btn)이면, 기억한 열쇠의 「바꾸기 전」 글이 지금 글과 같을 때 그 열쇠로(돌아올 때 엉뚱한 말로 가지 않게)
const swap = (v, before, mem) => {
  if (!v) return null;
  const tv = v.trim(), m = EDGE.exec(v), c = m ? m[2].trim() : tv;
  const memOk = full => mem.k && before.txt.has(mem.k) && (full ? before.txt.get(mem.k) === tv : coreOf(before.txt.get(mem.k)) === c);
  let k = memOk(true) ? mem.k : before.get(tv);
  if (k) { mem.k = k; return v.replace(tv, t(k)); }
  k = memOk(false) ? mem.k : before.get(c) || before.core.get(c);
  if (k && m) { mem.k = k; return m[1] + (before.txt.get(k) === c ? t(k) : coreOf(t(k))) + m[3]; }
  for (const { re, k: tk, names } of before.tpl) { const r = re.exec(tv); if (!r) continue; const vars = Object.fromEntries(names.map((n, i) => [n, /^\d+$/.test(r[i + 1]) ? +r[i + 1] : r[i + 1]])); return v.replace(tv, t(tk.replace(/_(zero|one|two|few|many|other)$/, ""), vars)); } // 복수형 열쇠(n_lines_other 등)는 바탕 열쇠로 — 한국어판엔 복수형 열쇠가 없어 그 말 글이 남던 것(다국어부 10-15 · ur 편 목록)
  const nt = /^([\s\p{S}\p{P}]*)(.*?\p{L}[\p{L}\p{M}]*)(\s*[\d.,:/×%]+.*)$/u.exec(tv); // 글 + 숫자 꼬리(「속도 0.9×」 · 「गति 0.9×」)
  if (nt) { k = before.get(nt[2].trim()) || before.core.get(nt[2].trim()); if (k) return v.replace(tv, nt[1] + coreOf(t(k)) + nt[3]); }
  return null;
};

export function retext(before, root = document.body) {
  for (const el of root.querySelectorAll("*")) if (typeof el.__tx === "function") { if (el.textContent !== el.__txv) { el.__tx = null; continue; } try { el.textContent = el.__txv = el.__tx(); } catch {} }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
    let q = p; while (q && q !== root && !q.__tx) q = q.parentElement; if (q?.__tx) continue; // ①로 이미 씀
    if (p.dataset.k) { const s = String(t(p.dataset.k)); n.nodeValue = p.hasAttribute("data-kcore") ? coreOf(s) : s; continue; } // 열쇠를 적어 둔 글(data-k · 기호와 글을 나눠 그린 단추 등) = 그 열쇠로 바로
    const v = swap(n.nodeValue, before, (n.__tm ||= {})); if (v != null && v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of root.querySelectorAll("[aria-label],[title],[data-peek],[placeholder]")) for (const a of ["aria-label", "title", "data-peek", "placeholder"]) {
    const v = swap(el.getAttribute(a), before, ((el.__tma ||= {})[a] ||= {})); if (v != null) el.setAttribute(a, v);
  }
  window.dispatchEvent(new CustomEvent("malmun:uilang"));
}
