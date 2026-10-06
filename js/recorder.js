// 짧은 녹음 + 알아듣기 — 설명 카드 안 「이제 말해 보세요」(v9 · 카드를 떠나지 않음)
// 10-04 되돌림(투덜이 「처음 말하기 만들었을 때처럼 · 그때는 너무 잘 됐다」): 녹음 경로는 10-01 잘 되던 판(a9e13f9 screens/speak.js) 그대로 —
//   마이크 = 고른·기억한 장치 → 크롬 기본 → 나머지 차례 · 녹음 중 1.5초 신호가 아예 0 이면 다음 마이크로 바꿔 다시 녹음 · getUserMedia 는 장치만 고름(다른 제약 없음)
//   · MediaRecorder 원본(webm/opus) 그대로 · 인식은 그 트랙으로 한 번(continuous + 중간 결과) · 말이 끝나고 1초 조용하면 멈춤 · 길어도 8초
//   · 마이크는 카드가 열려 있는 동안 쥐고 있다가 카드를 닫을 때 닫음(그때처럼)
// 시간·인식(본부 10-04 투덜이 승인): 말 사이 쉼 2초 · 🎤 뒤 6초 말 없으면 끝 · 최대 길이 = 문장 길이에 맞춤 · 인식이 혼자 끝나면 같은 트랙으로 다시
// 그때와 다른 점(본부 10-04 「남긴 차이」): ① 윈도우 별칭 장치 「default」「communications」는 절대 안 고름(통신 장치를 열면 윈도우가 다른 소리를 줄임)
//   ② 「준비 중 → 녹음 중」 표시(첫 소리가 들어오면) ③ 인식 오류 까닭을 돌려줌(onerror 를 삼키지 않음) ④ 진단 기록(이벤트만 듣고 소리 경로는 안 건드림)
import { audioCtx } from "./wake.js?v=1006.49";

// 시간 규칙(본부 10-04 · 투덜이 「빨리 안 하면 바로 닫힘」): 말 사이 쉼 2초 · 🎤 뒤 6초 안에 말 없으면 끝 · 최대 길이는 부르는 쪽이 정함(문장 길이)
const QUIET_MS = 2000, START_MS = 6000;
const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition; // 부를 때마다 찾는다(점검이 가짜로 바꿔 끼울 수 있게)
export const canScore = () => !!getSR();
export const ALIAS = id => id === "default" || id === "communications";
const pref = v => {
  try {
    if (v === undefined) { const p = localStorage.getItem("malmun.mic"); return p && !ALIAS(p) ? p : null; }
    if (v && !ALIAS(v)) localStorage.setItem("malmun.mic", v); else if (!v) localStorage.removeItem("malmun.mic");
  } catch { return null; }
};
const dead = new Set();
let stream = null;
const devId = s => s?.getAudioTracks()[0]?.getSettings().deviceId || "";
// 날소리로 녹음(본부 10-04) — 크롬 기본값(에코 제거·잡음 억제·자동 크기)이 말 도중 소리를 뚝뚝 끊었다 · 말하기 연습 녹음은 날소리가 맞다(녹음 중엔 앱이 소리를 안 틂)
const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
const openOne = c => Promise.race([navigator.mediaDevices.getUserMedia({ audio: { ...(c === true ? {} : c), ...RAW } }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 8000))]);

// 마이크 열기 — 고른 마이크 → 기본 → 나머지 차례로(하나가 안 열려도 다음 것으로) · 별칭 장치는 건너뜀
async function openMic() {
  if (stream?.getAudioTracks()[0]?.readyState === "live") return stream;
  stream = null;
  let last = null, devs = [];
  try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId && !ALIAS(x.deviceId)).map(x => x.deviceId); } catch {}
  for (const c of [...new Set([pref() || true, true, ...devs])]) {
    if (dead.has(c)) continue;
    try {
      const s = await openOne(c === true ? true : { deviceId: { exact: c } });
      if (dead.has(devId(s)) || (c === true && ALIAS(devId(s)) && devs.length)) { s.getTracks().forEach(x => x.stop()); continue; } // 같은 마이크 · 별칭이면 실제 장치로
      s.req = c;
      return (stream = s);
    } catch (e) {
      last = e;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") break; // 허락을 안 한 것 — 다른 장치로 해도 같다
    }
  }
  dead.clear();
  throw last || Object.assign(new Error("silent"), { name: "SilentError" }); // 열리는 마이크마다 소리가 0
}
export function closeMic() { stream?.getTracks().forEach(x => x.stop()); stream = null; }
// 장치 이름에서 학습자에게 소음인 것 빼기 — 끝의 「(1b3f:2008)」 장치 번호 · 「2- 」 같은 앞번호(본부 10-04)
export const niceLabel = l => String(l || "").replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "").replace(/(^|\()\s*\d+-\s*/g, "$1").trim();
export const micLabel = () => niceLabel(stream?.getAudioTracks()[0]?.label);
export async function listMics() { try { return (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId && !ALIAS(x.deviceId)); } catch { return []; } }
export function chooseMic(id) { pref(id || ""); dead.clear(); closeMic(); }
// 음성 인식이 아무것도 못 알아들었을 때 까닭 → 글자 열쇠
export const srWhy = err => ({ "audio-capture": "sr_audio", network: "sr_network", "not-allowed": "sr_denied", "service-not-allowed": "sr_denied" })[err] || "sr_none";
// 안 될 때 까닭 → 글자 열쇠(lang/*.json)
export const micWhy = e => (e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "mic_denied" : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "mic_none" : e?.name === "SilentError" ? "mic_silent" : "mic_busy");

// ── 진단 기록(화면에 안 보임 · 본부 10-04) — 녹음이 끝날 때마다 localStorage malmun.lastrec 에 마지막 5개 ──
export function srWatch(sr, t0, ev = []) {
  if (typeof sr.addEventListener !== "function") return ev; // 가짜 인식기(점검) 등
  for (const n of ["start", "audiostart", "soundstart", "speechstart", "speechend", "soundend", "audioend", "result", "nomatch", "error", "end"])
    sr.addEventListener(n, e => ev.push(`${n === "error" ? "error:" + (e.error || "?") : n}@${Math.round(performance.now() - t0)}`));
  return ev;
}
export function logRec(entry) {
  try {
    const a = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]");
    a.push({ at: new Date().toISOString(), ...entry });
    localStorage.setItem("malmun.lastrec", JSON.stringify(a.slice(-5)));
  } catch {}
}
export const dB = x => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);

// record() → { stop(discard), done: Promise<{ blob, heard[], srErr, diag } | { error } | { cancelled }> }
// onLevel(0~1) 소리 크기 · onReady() 첫 소리가 들어옴 · onStop() 녹음 끝(결과 기다리는 중) · onSwitch() 소리 0 인 마이크를 버리고 다른 마이크로 다시
export function record({ onLevel = () => {}, onSwitch = () => {}, onReady = () => {}, onStop = () => {}, onTick = () => {}, maxMs = 8000 } = {}) {
  let stopNow = () => {}, cancelled = false;
  const ctl = { stop: discard => { if (discard) cancelled = true; stopNow({ why: "stop" }); } }; // ■ = 멈춤(안내 없음)
  ctl.done = (async () => {
    for (let k = 0; k < 6; k++) {
      let s;
      try { s = await openMic(); } catch (e) { return { error: e }; }
      if (cancelled) return { cancelled: true };
      const r = await once(s, k > 0);
      if (r.dead) { dead.add(s.req); if (devId(s)) dead.add(devId(s)); closeMic(); onSwitch(); continue; }
      return cancelled ? { cancelled: true } : r;
    }
    return { error: Object.assign(new Error("silent"), { name: "SilentError" }) };
  })();
  function once(s, switched) {
    return new Promise(res => {
      const rec = new MediaRecorder(s), chunks = [], heard = [], t0 = performance.now(), srEv = [];
      let sr = null, srErr = null, trackPassed = false, maxRms = 0, over = false, src = null, meter = 0, maxT = 0;
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.start();
      // 음성 인식 — continuous + 중간 결과 · 녹음하는 바로 그 트랙으로 · 녹음이 끝날 때까지 혼자 end 되면 같은 트랙으로 다시(진단 restart@ · 본부 10-04)
      let srOff = false, srAt = 0;
      const startSR = () => {
        if (over || srOff) return;
        const SR = getSR(); if (!SR) return;
        let r; try { r = new SR(); } catch { return; }
        r.lang = "ko-KR"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
        r.onresult = e => {
          const rs = Array.from(e.results, x => Array.from(x));
          for (const x of rs) for (const a of x) heard.push(a.transcript);
          if (rs.length > 1) heard.push(rs.map(x => x[0].transcript).join(" "));
        };
        r.onerror = e => { srErr = e.error || "error"; if (/not-allowed|audio-capture/.test(srErr)) srOff = true; };
        r.onend = () => { if (over || srOff || sr !== r) return; srEv.push(`restart@${Math.round(performance.now() - t0)}`); setTimeout(startSR, performance.now() - srAt < 1000 ? 200 : 0); };
        srWatch(r, t0, srEv);
        sr = r; srAt = performance.now();
        try { r.start(s.getAudioTracks()[0]); trackPassed = true; } catch { try { r.start(); } catch {} }
      };
      startSR();
      const finish = (extra = {}) => {
        if (over) return; over = true;
        clearInterval(meter); clearTimeout(maxT); onLevel(0);
        if (!extra.dead && !cancelled) onStop();
        try { src?.disconnect(); } catch {}
        try { sr?.stop(); } catch {}
        rec.onstop = async () => {
          if (sr && !extra.dead && !cancelled) for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100)); // 인식 결과는 조금 늦게 온다
          res({ blob: new Blob(chunks, { type: rec.mimeType || "audio/webm" }), heard, srErr, why: extra.why || "stop", ...extra,
            diag: { mic: s.getAudioTracks()[0]?.label || "", track: trackPassed, sr: srEv, sec: Math.round(performance.now() - t0) / 1000, maxDb: dB(maxRms), dead: !!extra.dead, cancelled } });
        };
        try { rec.state !== "inactive" ? rec.stop() : rec.onstop(); } catch { rec.onstop(); }
      };
      stopNow = x => finish(x);
      try {
        const ctx = audioCtx(), an = ctx.createAnalyser(); src = ctx.createMediaStreamSource(s);
        an.fftSize = 1024; src.connect(an);
        const buf = new Float32Array(an.fftSize), DEAD_MS = switched ? 2500 : 1500;
        let ready = false, spoke = false, quietAt = 0, peak = 0, liveMs = 0, lastT = ctx.currentTime, lastAt = Date.now(), kept = false;
        meter = setInterval(() => {
          const now = Date.now(); // 소리 엔진이 실제로 돈 시간만 센다(멈춰 있으면 산 마이크도 0 으로 보인다)
          if (ctx.state === "running" && ctx.currentTime > lastT) liveMs += now - lastAt; else if (ctx.state !== "running") ctx.resume().catch(() => {});
          lastT = ctx.currentTime; lastAt = now;
          an.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
          peak = Math.max(peak, rms); maxRms = Math.max(maxRms, rms); onLevel(Math.min(1, rms * 5));
          if (!ready && rms > 0) { ready = true; onReady(); } // 「준비 중」 → 「녹음 중」
          if (switched && !kept && peak >= 0.0002 && liveMs > DEAD_MS) { kept = true; pref(devId(s) || (s.req !== true && s.req) || ""); }
          if (rms > 0.02 && !spoke) pref(devId(s) || (s.req !== true && s.req) || ""); // 소리가 들어온 마이크를 기억
          if (rms > 0.02) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= now; if (now - quietAt > QUIET_MS) finish({ why: "pause" }); }
          if (!spoke && performance.now() - t0 > START_MS) finish({ why: "nospeech" }); // 🎤 뒤 6초 동안 말 없음
          onTick(performance.now() - t0, maxMs);
          if (!spoke && peak < 0.0002 && liveMs > DEAD_MS) finish({ dead: true }); // 1.5초 신호가 아예 0 → 다음 마이크로
        }, 60);
      } catch {}
      maxT = setTimeout(() => finish({ why: "time" }), maxMs);
    });
  }
  return ctl;
}
