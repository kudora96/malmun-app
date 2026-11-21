// 내 단어장 찾기·편 묶음 (도우미 E · 11-18) — vocab.js 가 불러 붙임. 이 파일은 다른 파일을 건드리지 않음.
// 항목 모양: { w:단어, mean:뜻(네팔어), ep:편 ID, n/order/…:편 안 순서 } · 발음(데바나가리)은 vocab.js 의 devOf 가 줌

import { vocabMatch } from "./search.js?v=1121.7"; // 찾기 규칙(초성·네팔어·로마자 · 대표님 11-19)
import { makeKeypad, HK_TX } from "./hankey.js?v=1121.7"; // 앱 안 자판(한/ने)
import { makeVoice, VOICE_TX } from "./voicefind.js?v=1121.7"; // 말로 찾기 🎤

// 새 글(네팔어 = Claude 도우미 2명 교차 · 11-18)
export const FIND_TX = {
  ko: { find: "찾기", clear: "지우기", nofound: "찾는 단어가 없어요", ep: n => `${n}편`, lesson: (l, n) => `${l}과 ${n}편` },
  ne: { find: "खोज्नुहोस्", clear: "मेट्नुहोस्", nofound: "खोजेको शब्द भेटिएन", ep: n => `भाग ${n}`, lesson: (l, n) => `पाठ ${l}, भाग ${n}` },
};
const T = ko => (ko ? FIND_TX.ko : FIND_TX.ne);
export const findTx = (k, ko) => T(ko)[k];

// ── 찾기 — 쓰는 대로 바로 · 단어·뜻·발음 어디든 들어 있으면 남김 + 한국어 초성(ㅇㄴ) · 네팔 글자 느슨 맞춤 · 로마자(anny) — 규칙은 search.js vocabMatch (1만 개도 몇 ms)
export function filterItems(items, q, devOf) {
  q = String(q || "").trim();
  if (!q) return items;
  const out = [];
  for (let i = 0; i < items.length; i++) { const x = items[i]; if (vocabMatch(q, x, devOf ? devOf(x) || "" : undefined)) out.push(x); }
  return out;
}

// 찾기 칸 — 앱 칩 모양(둥근 알약 · 돋보기 · 오른쪽 ✕). 한 번 만들어 두고 다시 그릴 때도 같은 칸을 씀(글·초점 유지)
// 돌려줌 = <div class="vp-find"> (d.value() · d.setLang(ko) · d.clear())
export function makeFindBox(onInput, ko = true) {
  const d = document.createElement("label"); d.className = "vp-find"; let curKo = ko;
  d.innerHTML = `<svg class="vp-mag" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.2 15.2L20 20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const inp = document.createElement("input"); inp.type = "text"; inp.className = "vp-q"; inp.setAttribute("enterkeyhint", "search"); inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("autocapitalize", "off");
  const x = document.createElement("button"); x.type = "button"; x.className = "vp-clr"; x.hidden = true;
  x.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>`;
  const mic = document.createElement("button"); mic.type = "button"; mic.className = "vp-mic"; // 말로 찾기 🎤 (듣는 동안 ■)
  mic.innerHTML = `<svg class="vp-mic-i" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><svg class="vp-mic-s" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/></svg>`;
  const han = document.createElement("button"); han.type = "button"; han.className = "vp-han"; han.textContent = "한"; han.lang = "ko"; // 앱 안 한글 자판
  const note = document.createElement("span"); note.className = "vp-note"; note.hidden = true; note.setAttribute("role", "status");
  d.append(inp, x, mic, han, note);
  const hold = { kp: null, nt: 0, poll: 0 };
  const say = s => { clearTimeout(hold.nt); note.textContent = s || ""; note.hidden = !s; if (s) hold.nt = setTimeout(() => { note.hidden = true; }, 4500); };
  const fire = () => { x.hidden = !inp.value; onInput?.(inp.value); };
  const voice = makeVoice({ getKo: () => curKo, onText: s => { inp.value = s; fire(); }, onNote: say, onState: on => { mic.classList.toggle("on", on); inp.placeholder = on ? (curKo ? VOICE_TX.ko : VOICE_TX.ne).listening : T(curKo).find; mic.setAttribute("aria-label", (curKo ? VOICE_TX.ko : VOICE_TX.ne)[on ? "stop" : "voice"]); mic.setAttribute("aria-pressed", on ? "true" : "false"); } });
  const closeKp = () => { clearInterval(hold.poll); const k = hold.kp; hold.kp = null; k?.remove(); han.classList.remove("on"); inp.removeAttribute("inputmode"); };
  const openKp = () => {
    const k = (hold.kp = makeKeypad({ input: inp, ui: curKo, host: d, lang: curKo ? "ko" : "ne", onClose: closeKp })); // 한국어 먼저 화면 = 한글 자판 · 네팔어 먼저 화면 = 네팔 글자 자판(위 「한/ने」 로 바꿈)
    inp.setAttribute("inputmode", "none"); han.classList.add("on"); k.place();
    hold.poll = setInterval(() => { if (!d.isConnected) return closeKp(); if (!k.isConnected) k.place(); }, 300); // 목록이 다시 그려지거나 닫히면 따라감
  };
  const lab = k => { curKo = k; const t = T(k); inp.placeholder = t.find; inp.setAttribute("aria-label", t.find); x.setAttribute("aria-label", t.clear); inp.lang = k ? "ko" : "ne";
    const H = k ? HK_TX.ko : HK_TX.ne, V = k ? VOICE_TX.ko : VOICE_TX.ne; han.textContent = k ? "한" : "ने"; han.lang = k ? "ko" : "ne"; const hn = k ? H.han : H.ne; han.setAttribute("aria-label", hn); han.setAttribute("data-tip", hn); mic.setAttribute("aria-label", V[voice.active() ? "stop" : "voice"]); hold.kp?.setUi(k); };
  lab(ko); // 단추 글자 = ⇄ 따라감(한국어 먼저=한 · 네팔어 먼저=ने)
  inp.addEventListener("input", fire); // 쳐는 즉시
  x.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); inp.value = ""; x.hidden = true; onInput?.(""); inp.focus(); });
  mic.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); voice.toggle(); });
  han.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); hold.kp ? closeKp() : openKp(); });
  inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") inp.blur(); }); // 글자·Esc 가 앞 화면 단축키로 새지 않게
  d.value = () => inp.value; d.setLang = lab; d.clear = () => { inp.value = ""; x.hidden = true; }; d.closeKeypad = closeKp; d.voice = voice;
  return d;
}

// ── 편 묶음 — 편 순서일 때 쪽 안 항목을 편마다 묶음 제목 줄(.vp-grp)로 · 제목 줄은 sticky(css)
const nums = ep => String(ep ?? "").match(/\d+/g)?.map(Number) || [];
export function epLabel(ep, ko, multiLesson) {
  const a = nums(ep); if (!a.length) return "";
  const t = T(ko), n = a.length >= 3 ? a[2] : a.at(-1);
  return multiLesson && a.length >= 3 ? t.lesson(a[0], n) : t.ep(n);
}
// pageItems → [{head:'1편'|null, x}] (같은 편이 이어지는 동안 한 번만 제목) · allItems = 과 구분이 필요한지 보려고(없으면 pageItems)
export function groupByEp(pageItems, ko, allItems) {
  const ls = new Set((allItems || pageItems).map(x => (nums(x.ep).length >= 3 ? nums(x.ep)[0] : -1))), multi = ls.size > 1;
  const one = new Set((allItems || pageItems).map(x => x.ep ?? "")).size < 2; // 편이 하나뿐이면 제목 줄·구분선 없음(11-19)
  let prev = Symbol(); const out = [];
  for (const x of pageItems) { if (one) { out.push({ head: null, x }); continue; } const k = x.ep ?? ""; out.push({ head: k !== prev ? epLabel(x.ep, ko, multi) || null : null, x }); prev = k; }
  return out;
}
