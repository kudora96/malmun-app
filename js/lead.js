// [내 목소리]를 말 시작 자리부터 — 녹음 경로는 건드리지 않는다(본부 10-04 「판 1004.6 소리가 좋다 · 녹음 경로 절대 손대지 말 것」)
// · findLead: 녹음이 끝난 blob 의 복사본을 분석용으로만 풀어(decodeAudioData · 재생엔 안 씀) 「말 시작 0.15초 전」 초를 구한다
// · playAt: 재생은 <audio>(같은 blob URL · 원본 그대로) — 시작 위치만 옮긴다. MediaRecorder webm 은 길이가 Infinity 라
//   먼저 currentTime=1e101 로 끝을 찾게 한 뒤(durationchange) 그 초로 되돌린다 · 1.5초 안에 안 되면 처음부터(소리 품질 우선)
import { audioCtx } from "./wake.js?v=1004.9";

export async function findLead(blob, pre = 0.15) {
  try {
    const buf = await audioCtx().decodeAudioData(await blob.slice(0).arrayBuffer());
    const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
    for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
    const peak = Math.max(0, ...rms); if (peak < 0.003) return 0;
    const th = Math.max(0.006, peak * 0.08), a = rms.findIndex(v => v > th);
    return Math.max(0, Math.round(((a * win) / sr - pre) * 100) / 100);
  } catch { return 0; }
}

export function playAt(blob, lead = 0) {
  const url = URL.createObjectURL(blob), a = new Audio(url);
  let started = false;
  const go = () => {
    if (started) return; started = true;
    (window.__mineLog ||= []).push({ lead, at: Math.round(a.currentTime * 100) / 100 });
    a.play().catch(() => {});
  };
  a.addEventListener("ended", () => URL.revokeObjectURL(url));
  a.addEventListener("error", () => { URL.revokeObjectURL(url); go(); });
  if (!(lead > 0.05)) { go(); return a; }
  a.preload = "auto";
  const toLead = () => { a.addEventListener("seeked", () => go(), { once: true }); a.currentTime = lead; };
  a.addEventListener("loadedmetadata", () => {
    if (isFinite(a.duration)) return toLead();
    const dc = () => { if (!isFinite(a.duration)) return; a.removeEventListener("durationchange", dc); toLead(); };
    a.addEventListener("durationchange", dc);
    a.currentTime = 1e101; // 끝을 찾게 해 길이를 알아낸다
  }, { once: true });
  setTimeout(() => { if (!started) { try { a.currentTime = 0; } catch {} go(); } }, 1500); // 안 되면 처음부터
  return a;
}
