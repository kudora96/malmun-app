// [▶ 내 목소리]·[저장됨 ▶] 재생 — 말 시작 자리부터(본부 10-04 · 녹음 경로는 한 글자도 안 바꿈)
// · <audio> 자리 옮기기(seek)는 쓰지 않는다(webm 을 찾아가며 소리가 깨졌다 — 1004.9)
// · blob 을 decodeAudioData 로 풀어 AudioBufferSourceNode.start(0, lead) · 연결은 source → destination 직결(게인·필터 없음)
//   lead = 말 시작 0.15초 전(같은 버퍼에서 잼) · 끝나면 멈춤 · 풀기 실패하면 <audio> 로 처음부터
import { audioCtx } from "./wake.js?v=1005.14";

// 시작 = 말 시작 0.08초 전(본부 10-04: 0.15 → 0.08 · 앞 잡소리가 끼지 않게)
// 첫 소리가 말보다 작고(최대에서 8dB 넘게 아래) 뒤에 조용한 틈이 있으면 녹음 켜는 순간의 잡소리일 수 있다(앞 소리 꼬리·딸깍 — 투덜이 17:49 녹음: −42dB 잡소리 → −53~−65 틈 → −30 말) →
//   그 소리가 한 번 「조용함」(최대보다 20dB 아래 · 100ms 이상 이어짐)으로 떨어진 뒤의 첫 말 칸부터 · 조용한 틈이 없으면 그대로(바로 말함 = 0 근처)
//   단 앞 소리가 말만큼 크면(최대에서 8dB 안) 진짜 첫 낱말로 보고 건너뛰지 않는다(바로 말하고 낱말 사이에 쉰 경우)
export const FADE = 0.015; // 시작 15ms 페이드인(딸깍 방지 · 말 시작 0.08초 앞이라 본소리엔 안 닿음)
export function leadOf(buf, pre = 0.08) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
  let peak = 0; for (const v of rms) if (v > peak) peak = v;
  if (peak < 0.003) return 0;
  const th = Math.max(0.006, peak * 0.08), quiet = peak * Math.pow(10, -20 / 20), loud = peak * Math.pow(10, -8 / 20), RUN = Math.ceil(0.1 / 0.02);
  let a = rms.findIndex(v => v > th);
  if (a >= 0) { // 첫 소리 → 조용한 틈(100ms+) 뒤의 말(시각 조건 없음 — 투덜이 17:49: 첫 소리 칸이 0.16초라 0.15초 조건에 걸렸다)
    let run = 0, after = -1, head = 0;
    for (let k = a; k < rms.length; k++) { run = rms[k] < quiet ? run + 1 : 0; if (!run) head = Math.max(head, rms[k]); if (run >= RUN) { after = k + 1; break; } }
    if (head >= loud) after = -1; // 앞 소리가 말만큼 큼 = 진짜 첫 낱말
    if (after > 0) { const b = rms.findIndex((v, k) => k >= after && v > th); if (b >= 0) a = b; }
  }
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
  if (!(20 * Math.log10(rms) >= -45)) return 1; // 말이 없던 녹음(말소리 −45dB 아래 = 바탕 소리뿐)은 키우지 않음 — 「쉬—」 잡음만 커진다(본부 10-04)
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
    const g = ctx.createGain(), G = gain * (window.__sfxVolume ?? 1); // 곱하기만(압축·필터 없음) · 점검에서만 작게
    const t0 = ctx.currentTime + 0.01; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(G, t0 + FADE); // 시작 15ms 페이드인
    src.connect(g); g.connect(ctx.destination);
    src.onended = () => resolve();
    src.start(t0, lead);
    (window.__mineLog ||= []).push({ lead: Math.round(lead * 100) / 100, dur: Math.round(buf.duration * 100) / 100, gain: Math.round(gain * 100) / 100 });
  }).catch(viaAudio);
  h.paused = false; done.then(() => { h.paused = true; });
  return h;
}
