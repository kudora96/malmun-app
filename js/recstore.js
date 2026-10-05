// 저장한 내 녹음 관리 — 지우기 · 이 편 모두 지우기 · 내려받기 · 오래 남게(본부 10-04 · 투덜이 승인)
import { audioCtx } from "./wake.js?v=1005.19";
import { leadOf, gainOf, FADE } from "./playmine.js?v=1005.19";
// 녹음·재생·점수 경로는 건드리지 않는다 — IndexedDB 「malmun」/rec(말하기 창 recGet·recPut 과 같은 곳)만 다룬다
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open("malmun", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("rec");
  r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); res(d); }; r.onerror = () => rej(r.error); // 지우기·판 올림이 오면 바로 놓아 줌 — 안 놓으면 그 뒤 여는 것이 모두 멈춤(본부 10-04 빈 말하기 창)
});
const tx = (fn) => open().then(d => new Promise(res => { const t = d.transaction("rec", "readwrite"); fn(t.objectStore("rec")); t.oncomplete = t.onerror = () => { d.close(); res(); }; })).catch(() => {});

export const recDel = key => tx(s => s.delete(key));
// 이 편(ep) 녹음 전부 — 키가 「ep/」로 시작하는 것 · 진단 녹음(malmun_diag)도 같이 비움
export async function recDelEpisode(ep) {
  let n = 0;
  await tx(s => { const q = s.getAllKeys(); q.onsuccess = () => q.result.filter(k => String(k).startsWith(ep + "/")).forEach(k => { s.delete(k); n++; }); });
  await new Promise(res => { const q = indexedDB.deleteDatabase("malmun_diag"); q.onsuccess = q.onerror = q.onblocked = res; });
  return n;
}
export async function recCount(ep) {
  let n = 0;
  await tx(s => { const q = s.getAllKeys(); q.onsuccess = () => { n = q.result.filter(k => String(k).startsWith(ep + "/")).length; }; });
  return n;
}

// 내려받기 — 말 앞뒤 빈 곳·잡소리를 잘라 WAV 로(본부 10-04: 「파일 앞에 뭔가 있고 주된 소리가 나중에 나온다」 · 앞 0.4초 웅 + 무음)
// 저장한 blob·재생·녹음은 그대로 — 내려받는 파일만. 시작 = playmine.js 와 같은 leadOf(말 시작 0.15초 전) · 끝 = 같은 문턱의 말 끝 0.25초 뒤
// 16bit PCM · 풀린 표본율 그대로 · 모노(첫 채널) · 크기는 재생과 같은 곱하기(gainOf · 넘침 없음) · 필터 없음 · 풀기 실패하면 원본 그대로
const EXT = t => (/webm/.test(t) ? "webm" : /mp4|m4a|aac/.test(t) ? "mp4" : /ogg/.test(t) ? "ogg" : /wav/.test(t) ? "wav" : /mpeg/.test(t) ? "mp3" : "webm");
const save = (blob, file) => {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = file;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  return file;
};
export function speechEnd(buf, post = 0.25) { // leadOf 와 같은 문턱(20ms 창 · max(0.006, 최대×0.08))
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
  const peak = Math.max(0, ...rms); if (peak < 0.003) return buf.duration;
  const th = Math.max(0.006, peak * 0.08); let b = rms.length - 1; while (b > 0 && !(rms[b] > th)) b--;
  return Math.min(buf.duration, ((b + 1) * win) / sr + post);
}
export function wavOf(buf, t0, t1, g = 1) {
  const sr = buf.sampleRate, s0 = Math.max(0, Math.round(t0 * sr)), s1 = Math.min(buf.length, Math.round(t1 * sr));
  const pcm = buf.getChannelData(0).subarray(s0, s1), v = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length * 2, true);
  const fade = Math.round(FADE * sr); // 재생과 같은 시작 15ms 페이드인
  for (let i = 0; i < pcm.length; i++) { const x = Math.max(-1, Math.min(1, pcm[i] * g * (i < fade ? i / fade : 1))); v.setInt16(44 + i * 2, Math.round(x < 0 ? x * 0x8000 : x * 0x7fff), true); }
  return new Blob([v], { type: "audio/wav" });
}
export async function downloadRec(blob, name) {
  try {
    const buf = await audioCtx().decodeAudioData(await blob.slice(0).arrayBuffer());
    return save(wavOf(buf, leadOf(buf), speechEnd(buf), gainOf(buf)), `${name}.wav`); // 재생과 같은 크기(gainOf)
  } catch { return save(blob, `${name}.${EXT(blob.type || "")}`); } // 풀기 실패 → 원본 그대로
}

// 처음 저장할 때 오래 남게 요청 — 묻는 창 없이 되는 브라우저에서만(파이어폭스는 창을 띄워서 건너뜀) · 실패해도 조용히 · 결과는 진단에만
export async function askPersist() {
  try {
    if (!navigator.storage?.persist || /firefox/i.test(navigator.userAgent)) return;
    if (await navigator.storage.persisted()) return;
    const ok = await navigator.storage.persist();
    localStorage.setItem("malmun.persist", JSON.stringify({ at: new Date().toISOString(), ok }));
  } catch {}
}
