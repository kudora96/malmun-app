// 짧은 녹음 + 알아듣기 — 설명 카드 안 「이제 말해 보세요」(v9 · 본부 10-03 「카드를 떠나지 않음」)
// 말하기 창(screens/speak.js)과 같은 규칙: 고른·기억한 마이크 → 크롬 기본 → 나머지 · 신호가 아예 0 인 마이크(소리 없는 블루투스)는
// 다음 마이크로 넘어가 다시 녹음 · 소리 들어온 마이크 기억(malmun.mic — 말하기 창과 같은 칸) · 인식은 녹음하는 그 마이크를 끝까지(continuous)
// · 말이 끝나고 1초 조용하면 저절로 멈춤 · 길어도 8초.
// TODO(앱 창): speak.js 의 같은 부분을 이 모듈로 합치기 — 지금은 말하기 창 점검(38)을 깨지 않으려고 따로 둠.
import { audioCtx } from "./wake.js";

const MAX_MS = 8000, QUIET_MS = 1000, DEAD = 0.0002;
const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition; // 부를 때마다 찾는다(점검이 가짜로 바꿔 끼울 수 있게)
export const canScore = () => !!getSR();
const pref = v => { try { if (v === undefined) return localStorage.getItem("malmun.mic"); v ? localStorage.setItem("malmun.mic", v) : localStorage.removeItem("malmun.mic"); } catch { return null; } };
const dead = new Set();
let stream = null;
const devId = s => s?.getAudioTracks()[0]?.getSettings().deviceId || "";
const openOne = c => Promise.race([navigator.mediaDevices.getUserMedia({ audio: c }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 8000))]);

async function openMic() {
  if (stream?.getAudioTracks()[0]?.readyState === "live") return stream;
  stream = null;
  let last = null, devs = [];
  try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId).map(x => x.deviceId); } catch {}
  for (const c of [...new Set([pref() || true, true, ...devs])]) {
    if (dead.has(c)) continue;
    try {
      const s = await openOne(c === true ? true : { deviceId: { exact: c } });
      if (dead.has(devId(s))) { s.getTracks().forEach(x => x.stop()); continue; }
      s.req = c;
      return (stream = s);
    } catch (e) {
      last = e;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") break;
    }
  }
  dead.clear();
  throw last || Object.assign(new Error("silent"), { name: "SilentError" });
}
export function closeMic() { stream?.getTracks().forEach(x => x.stop()); stream = null; }
// 안 될 때 까닭 → 글자 열쇠(lang/*.json)
export const micWhy = e => (e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "mic_denied" : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "mic_none" : e?.name === "SilentError" ? "mic_silent" : "mic_busy");

// record() → { stop(discard), done: Promise<{ blob, heard[] } | { error } | { cancelled }> }
// onLevel(0~1) = 들어오는 소리 크기 · onSwitch() = 소리 0 인 마이크를 버리고 다른 마이크로 다시 시작함
// 앞뒤 무음 잘라내기(본부 10-03 실측: 투덜이 녹음 앞 2.9초가 마이크가 열리는 동안의 빈 소리 −74dB)
// 말 시작 0.15초 전 ~ 끝 0.25초 뒤만 남겨 WAV 로 · 실패하면 원래 녹음 그대로. lead = 원래 녹음에서 말이 시작된 초
export async function trimSilence(blob, { pre = 0.15, post = 0.25 } = {}) {
  try {
    const buf = await audioCtx().decodeAudioData(await blob.arrayBuffer());
    const n = buf.length, sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02));
    const d = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) { const x = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] += x[i] / buf.numberOfChannels; }
    const rms = [];
    for (let i = 0; i + win <= n; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
    const peak = Math.max(0, ...rms);
    if (peak < 0.003) return { blob, lead: 0 }; // 말이 없음 — 그대로
    const th = Math.max(0.006, peak * 0.08);
    const a = rms.findIndex(v => v > th), b = rms.length - 1 - [...rms].reverse().findIndex(v => v > th);
    const s0 = Math.max(0, Math.round(a * win - pre * sr)), s1 = Math.min(n, Math.round((b + 1) * win + post * sr));
    const pcm = d.subarray(s0, s1), out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const w = (o, str) => [...str].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
    w(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return { blob: new Blob([out], { type: "audio/wav" }), lead: (a * win) / sr, kept: (s1 - s0) / sr };
  } catch { return { blob }; }
}
// 마이크를 미리 열어 둔다 — 허락을 이미 받은 경우에만(처음 보는 사람에게 카드 열자마자 허락 창을 띄우지 않게)
export async function warmMic() {
  try { if ((await navigator.permissions.query({ name: "microphone" })).state === "granted") await openMic(); } catch {}
}

export function record({ onLevel = () => {}, onSwitch = () => {}, onReady = () => {} } = {}) {
  let stopNow = () => {}, cancelled = false;
  const ctl = { stop: discard => { if (discard) cancelled = true; stopNow(); } };
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
      const rec = new MediaRecorder(s), chunks = [], heard = [];
      let sr = null, over = false, src = null, meter = 0, maxT = 0;
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.start();
      const SR = getSR();
      if (SR) {
        try {
          sr = new SR(); sr.lang = "ko-KR"; sr.continuous = true; sr.interimResults = true; sr.maxAlternatives = 3;
          sr.onresult = e => {
            const rs = Array.from(e.results, r => Array.from(r));
            for (const r of rs) for (const a of r) heard.push(a.transcript);
            if (rs.length > 1) heard.push(rs.map(r => r[0].transcript).join(" "));
          };
          sr.onerror = () => {};
          try { sr.start(s.getAudioTracks()[0]); } catch { sr.start(); }
        } catch { sr = null; }
      }
      const finish = (extra = {}) => {
        if (over) return; over = true;
        clearInterval(meter); clearTimeout(maxT); onLevel(0);
        try { src?.disconnect(); } catch {}
        try { sr?.stop(); } catch {}
        rec.onstop = async () => {
          if (sr && !extra.dead && !cancelled) for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100)); // 인식 결과는 조금 늦게 온다
          const raw = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          res({ ...(extra.dead || cancelled ? { blob: raw } : await trimSilence(raw)), heard, ...extra });
        };
        try { rec.state !== "inactive" ? rec.stop() : rec.onstop(); } catch { rec.onstop(); }
      };
      stopNow = () => finish();
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
          peak = Math.max(peak, rms); onLevel(Math.min(1, rms * 5));
          if (!ready && rms > 0) { ready = true; onReady(); } // 마이크에서 실제 소리(바닥 소음이라도)가 들어오기 시작함
          if ((rms > 0.02 || (switched && peak >= DEAD && liveMs > DEAD_MS)) && !kept) { kept = true; pref(devId(s) || (s.req !== true && s.req) || ""); }
          if (rms > 0.02) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= now; if (now - quietAt > QUIET_MS) finish(); }
          if (!spoke && peak < DEAD && liveMs > DEAD_MS) finish({ dead: true });
        }, 60);
      } catch {}
      maxT = setTimeout(() => finish(), MAX_MS);
    });
  }
  return ctl;
}
