// 누르는 「톡」 소리(대표님 11-19 16:13 타격감 · P0-171) — 새 파일·유료 소리 없이 Web Audio 로 20~40ms 짧은 사인 틱을 합성
//  · 소리는 하나 규칙(onesound.js claim)·sfx.js 를 거치지 않는다 = 학습 소리를 멈추거나 낮추지 않음(그냥 위에 얹힘 · malmun:snd 도 안 보냄)
//  · 녹음(말하기·말로 찾기) 중에는 안 냄 · 마이크 단추 자체도 안 냄 · 연달아 누르면 60ms 안은 건너뜀
//  · 켜고 끄는 단추(aria-pressed/aria-selected/탭/⇄)는 올라가는 두 음, 보통 단추는 내려가는 한 음
//  · 숨은 설정: localStorage["malmun.tick"]="0" (또는 window.__tickOff) 이면 끔 · 소리 크기는 window.__sfxVolume 따름(점검은 크롬 --mute-audio 로 조용히)
//  · 블루투스 깨우기(wake.hold)는 안 씀 — 맨 첫 틱이 먹혀도 괜찮음
import { audioCtx, isQuiet } from "./wake.js?v=1121.7";

const SEL = 'button,[role=button],[role=tab],[role=option],.chip,[data-v],[data-act],summary,a.btn,label.sw,input[type=checkbox],input[type=radio]';
const NO = '.mic,.vp-mic,[data-x=rec],[data-act=rec],[data-act=mic],[data-notick]'; // 마이크 시작 단추는 소리 없이
const TOGGLE = '[aria-pressed],[aria-selected],[role=tab],.hk-tab,.chip.uiko,input[type=checkbox]';
const GAP = 60; // ms
let last = 0;

export const tickEnabled = () => { try { return localStorage.getItem("malmun.tick") !== "0" && !window.__tickOff; } catch { return !window.__tickOff; } };
const recording = () => { try { return isQuiet() || !!window.__micBusy || !!document.querySelector(".mic.on,.vp-mic.on,.vp-find .mic.on"); } catch { return false; } };

// kind: "press"(보통 단추) · "toggle"(켜고 끄는 것)
export function tick(kind = "press") {
  try {
    const now = performance.now(); if (now - last < GAP) return false;
    if (!tickEnabled() || recording()) return false;
    const vol = Math.max(0, Math.min(1, window.__sfxVolume ?? 1)); if (vol <= 0) return false;
    last = now;
    const c = audioCtx(), t0 = c.currentTime + 0.005, g = c.createGain(), o = c.createOscillator();
    o.type = "sine"; g.connect(c.destination); o.connect(g);
    const peak = 0.07 * vol; // 아주 작게(학습 소리보다 훨씬 작음)
    if (kind === "toggle") { o.frequency.setValueAtTime(620, t0); o.frequency.setValueAtTime(930, t0 + 0.016); var dur = 0.036; }
    else { o.frequency.setValueAtTime(880, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 0.024); dur = 0.026; }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.01);
    (window.__tickLog ||= []).push({ t: Math.round(now), kind });
    return true;
  } catch { return false; }
}

const target = e => { const el = e.target && e.target.closest ? e.target.closest(SEL) : null; if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest(NO)) return null; return el; };
const kindOf = el => (el.matches(TOGGLE) ? "toggle" : "press");
addEventListener("pointerdown", e => { if (e.button > 0) return; const el = target(e); if (el) tick(kindOf(el)); }, true);
addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { const el = target(e); if (el && /^(BUTTON|SUMMARY)$/.test(el.tagName) || el?.getAttribute?.("role") === "button") tick(kindOf(el)); } }, true);
