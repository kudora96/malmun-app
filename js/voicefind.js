// 말로 찾기(대표님 11-19 14:49 · P0-171) — 찾기 칸 🎤 · 앱에 이미 있는 말하기 받아쓰기 길(브라우저 SpeechRecognition · recorder.js getSR 와 같은 것 · 새 유료 서버 없음)을 그대로
//  한국어 먼저 화면이면 ko-KR · 네팔어 먼저 화면이면 ne-NP · 네팔어 인식이 안 되면 한국어로 바꿔 듣고 부드러운 안내 한 줄
//  마이크 규칙은 말하기와 같음: 기억한 마이크가 바뀌었으면 recorder.js guardMic 이 MicChangedError → 안내만 하고 안 듣음
//  받은 글은 곧바로 찾기 칸에 넣어 목록이 걸러짐(말하는 중 중간 글도) · 듣는 동안 단추가 ■ 로 바뀌고 칸 안 글이 「듣는 중이에요…」 로 바뀜(다시 누르면 멈춤)
import { guardMic, micWhy } from "./recorder.js?v=1120.37";
import { t } from "./i18n.js?v=1120.37";

export const VOICE_TX = {
  ko: { voice: "말로 찾기", stop: "그만 듣기", listening: "듣는 중이에요…", nosr: "이 브라우저에서는 말로 찾기가 안 돼요", nene: "이 기기는 네팔어를 못 알아들어서 한국어로 들어요", changed: "마이크가 바뀌었어요 · 마이크를 골라 주세요", nothing: "잘 못 들었어요 · 다시 말해 주세요" },
  ne: { voice: "बोलेर खोज्नुहोस्", stop: "सुन्न रोक्नुहोस्", listening: "सुनिरहेको छु…", nosr: "यो ब्राउजरमा बोलेर खोज्न मिल्दैन", nene: "यो उपकरणले नेपाली बुझ्दैन, त्यसैले कोरियाली सुन्दै छु", changed: "माइक्रोफोन फेरिएको छ · एउटा माइक्रोफोन छान्नुहोस्", nothing: "राम्ररी सुनिएन · फेरि भन्नुहोस्" },
};
const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition; // 부를 때마다 찾음(recorder.js 와 같은 방식 · 점검이 가짜로 바꿔 끼울 수 있게)

// opts: { getKo()→true=한국어 먼저 화면, onText(글, 끝났는지), onNote(글|""), onState(듣는 중?) }
export function makeVoice({ getKo, onText, onNote, onState }) {
  let r = null, on = false;
  const T = () => (getKo() ? VOICE_TX.ko : VOICE_TX.ne);
  const set = v => { on = v; window.__micBusy = v ? 1 : 0; onState?.(v); }; // __micBusy = 듣는 동안 누르는 소리(tick.js) 안 냄
  const stop = () => { const x = r; r = null; if (x) { x.onresult = x.onerror = x.onend = null; try { x.stop(); } catch {} } if (on) set(false); };
  async function begin(lang) {
    const SR = getSR(); if (!SR) { onNote?.(T().nosr); return; }
    let x; try { x = new SR(); } catch { onNote?.(T().nosr); return; }
    r = x; x.lang = lang; x.continuous = false; x.interimResults = true; x.maxAlternatives = 1;
    let got = false, fellBack = false;
    x.onresult = e => { got = true; const s = Array.from(e.results).map(q => q[0]?.transcript || "").join(" ").replace(/\s+/g, " ").trim(); if (s) onText?.(s, !!e.results[e.results.length - 1]?.isFinal); };
    x.onerror = e => {
      const code = e.error || "";
      if (lang === "ne-NP" && (code === "language-not-supported" || code === "service-not-allowed" || code === "bad-grammar")) { fellBack = true; onNote?.(T().nene); r = null; begin("ko-KR"); return; }
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "audio-capture") onNote?.(t(micWhy({ name: code === "not-allowed" ? "NotAllowedError" : "NotFoundError" })));
    };
    x.onend = () => { if (fellBack) return; if (r === x) { r = null; if (!got) onNote?.(T().nothing); set(false); } };
    set(true);
    try { x.start(); } catch { set(false); onNote?.(T().nosr); }
  }
  async function start() {
    if (on) return stop();
    if (!getSR()) { onNote?.(T().nosr); return; }
    try { await guardMic(); } catch (e) { onNote?.(e?.name === "MicChangedError" ? T().changed : t(micWhy(e))); return; }
    begin(getKo() ? "ko-KR" : "ne-NP");
  }
  return { start, stop, active: () => on, toggle: start };
}
