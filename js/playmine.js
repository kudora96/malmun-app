// [▶ 내 목소리]·[저장됨 ▶] 재생 — 말 시작 자리부터(본부 10-04 · 녹음 경로는 한 글자도 안 바꿈)
// · <audio> 자리 옮기기(seek)는 쓰지 않는다(webm 을 찾아가며 소리가 깨졌다 — 1004.9)
// · blob 을 decodeAudioData 로 풀어 AudioBufferSourceNode.start(0, lead) · 연결은 source → destination 직결(게인·필터 없음)
//   lead = 말 시작 0.15초 전(같은 버퍼에서 잼) · 끝나면 멈춤 · 풀기 실패하면 <audio> 로 처음부터
import { audioCtx } from "./wake.js?v=1004.18";

export function leadOf(buf, pre = 0.15) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
  const peak = Math.max(0, ...rms); if (peak < 0.003) return 0;
  const th = Math.max(0.006, peak * 0.08), a = rms.findIndex(v => v > th);
  return Math.max(0, (a * win) / sr - pre);
}

// 말소리 크기 맞추기(본부 10-04: 날소리 녹음이 본보기보다 18dB 작음 — 녹음은 그대로 두고 틀 때·내려받을 때 곱하기만)
// 말소리 RMS = 20ms 칸 중 에너지가 최대 칸의 5% 넘는 칸만 평균 → g = 10^((−16 − 말소리dB)/20) · 최대 표본 × g ≤ 0.89(−1dBFS) · 1~16배
export function gainOf(buf, target = -16) {
  const d = buf.getChannelData(0), win = Math.max(1, Math.round(buf.sampleRate * 0.02)), ms = [];
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; ms.push(s / win); }
  const top = Math.max(0, ...ms); if (!(top > 0) || !(peak > 0)) return 1;
  const sp = ms.filter(e => e > top * 0.05), rms = Math.sqrt(sp.reduce((a, e) => a + e, 0) / sp.length);
  let g = Math.pow(10, (target - 20 * Math.log10(rms)) / 20);
  g = Math.min(g, 0.89 / peak);
  return Math.max(1, Math.min(16, g));
}

// → { pause(), done: Promise } — pause() 는 멈춤(같은 단추 다시 = 처음부터 한 번)
export function playMine(blob) {
  let src = null, el = null, stopped = false, resolve;
  const done = new Promise(r => (resolve = r));
  const h = { pause() { stopped = true; try { src?.stop(); } catch {} el?.pause(); resolve(); }, done };
  const viaAudio = () => { // 풀기 실패 → 1004.6 그대로(<audio> 처음부터)
    if (stopped) return;
    el = new Audio(URL.createObjectURL(blob));
    el.onended = el.onerror = () => { URL.revokeObjectURL(el.src); resolve(); };
    el.play().catch(() => resolve());
  };
  const ctx = audioCtx();
  blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
    if (stopped) return resolve();
    const lead = leadOf(buf), gain = gainOf(buf);
    src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain * (window.__sfxVolume ?? 1); // 곱하기만(압축·필터 없음) · 점검에서만 작게
    src.connect(g); g.connect(ctx.destination);
    src.onended = () => resolve();
    src.start(0, lead);
    (window.__mineLog ||= []).push({ lead: Math.round(lead * 100) / 100, dur: Math.round(buf.duration * 100) / 100, gain: Math.round(gain * 100) / 100 });
  }).catch(viaAudio);
  h.paused = false; done.then(() => { h.paused = true; });
  return h;
}
