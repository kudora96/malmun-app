// 자동 이어 듣기 공용 엔진(대표님 11-19 14:11) — 설명 읽기·단어 카드·조각 카드가 한 코드 · 「자동」 상태 하나(localStorage malmun.exauto)
// 바깥 시험용 손잡이 = window.__auto { on, kind, idx, paused, next() } · 끝 카드 = .endcard.autoend
const KEY = "malmun.exauto";
export const AUTO_GAP = 1000; // 소리가 끝나고 다음까지 1.0초
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
export const autoOn = () => pref(KEY) === "1";
export const setAuto = on => { pref(KEY, on ? "1" : "0"); markAuto(); };
let timer = 0, kind = "", idx = -1, held = false, nextFn = null, labelFn = () => "자동";
export const autoPending = () => !!timer;
export const autoCancel = () => { clearTimeout(timer); timer = 0; };
export function autoSchedule(fn, ms = AUTO_GAP) { autoCancel(); timer = setTimeout(() => { timer = 0; fn(); }, ms); return timer; } // 기다리는 1.0초
export const autoHold = v => { held = !!v; }; // 사용자가 톡으로 멈춘 상태(▶ 로 풀림)
export const autoHeld = () => held;
export function autoAt(k, i, fn) { kind = k; idx = i; if (fn) nextFn = fn; } // 지금 어디(설명·카드·조각 · 몇 번째) + 「다음」 손잡이
export function markAuto(label) { // 모든 「자동」 단추의 눌림·글을 지금 상태로
  if (label) labelFn = typeof label === "function" ? label : () => label;
  const on = autoOn(), w = labelFn();
  document.querySelectorAll("[data-act=exauto]").forEach(b => { if (b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on)); const c = b.querySelector(".cc") || b; if (w && c.textContent !== w) { c.textContent = w; b.setAttribute("aria-label", w); } });
}
export function hideAutoEnd() { document.querySelectorAll(".endcard.autoend, .toast.exend").forEach(e => e.remove()); }
let endRenderer = null; export const useEndCard = f => { endRenderer = f; }; // ui.js 의 endCard(공용)를 배우는 화면이 등록(순환 import 피함)
// 끝 카드 — 공용 endCard 가 있으면 그것으로 · 「처음부터 다시」「닫기」
export function showAutoEnd(k, host, { title, again, close, onAgain, onClose } = {}) {
  hideAutoEnd(); autoCancel(); kind = k || kind;
  if (endRenderer) endRenderer(host, { title, again, close, onAgain: () => { hideAutoEnd(); onAgain?.(); }, onClose: () => { hideAutoEnd(); onClose?.(); } });
  else {
    const d = document.createElement("div"); d.className = "endcard"; d.setAttribute("role", "status");
    d.innerHTML = `<div class="ec-t"><i aria-hidden="true">✓</i><b></b></div><div class="ec-b"><button type="button" class="ec-go"></button><button type="button" class="ec-x"></button></div>`;
    d.querySelector("b").textContent = title || ""; const g = d.querySelector(".ec-go"), x = d.querySelector(".ec-x"); g.textContent = `↺ ${again || ""}`.trim(); x.textContent = close || "✕";
    g.onclick = () => { d.remove(); onAgain?.(); }; x.onclick = () => { d.remove(); onClose?.(); };
    (host || document.body).append(d);
  }
  document.querySelectorAll(".endcard").forEach(e => e.classList.add("autoend"));
}
Object.defineProperty(window, "__auto", { configurable: true, value: { get on() { return autoOn(); }, get kind() { return kind; }, get idx() { return idx; }, get paused() { return held; }, get pending() { return !!timer; }, next() { autoCancel(); return nextFn?.(); } } });
