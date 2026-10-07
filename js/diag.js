// 진단(화면에 안 보임 · 본부 10-04) — 실패한 녹음을 본부가 직접 재 볼 수 있게
// · 녹음이 끝날 때마다 그 녹음 소리(blob)를 점수와 상관없이 IndexedDB 「malmun_diag」/diag 에 마지막 3개만(키 = at)
// · 그때의 환경: 소리 엔진 샘플레이트·상태 · 🔁 켜짐 · 녹음 시작 때 소리가 나오고 있었는지 · 출력 장치 이름
// 녹음 경로(recorder.js 의 record · speak.js 의 녹음 블록)는 건드리지 않는다 — 끝난 뒤 받은 것만 적는다.
import { audioCtx } from "./wake.js?v=1007.100";

export async function diagEnv() {
  let out = "";
  try {
    const d = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audiooutput");
    out = (d.find(x => x.deviceId === "default") || d[0])?.label || "";
  } catch {}
  let ctxRate = 0, ctxState = "";
  try { const c = audioCtx(); ctxRate = c.sampleRate; ctxState = c.state; } catch {}
  return { ctxRate, ctxState, rep: document.querySelector(".ctrl [data-act=rep]")?.getAttribute("aria-pressed") === "true", out };
}

const open = () => new Promise((res, rej) => {
  const r = indexedDB.open("malmun_diag", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("diag");
  r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); res(d); }; r.onerror = () => rej(r.error); // 지우기·판 올림이 오면 바로 놓아 줌 — 안 놓으면 그 뒤 여는 것이 모두 멈춤(본부 10-04 빈 말하기 창)
});
export async function keepDiag(blob, meta = {}) {
  try {
    const d = await open(), at = new Date().toISOString();
    await new Promise(res => {
      const tx = d.transaction("diag", "readwrite"), s = tx.objectStore("diag");
      s.put({ at, blob, type: blob?.type || "", size: blob?.size || 0, ...meta }, at);
      const k = s.getAllKeys();
      k.onsuccess = () => { const keys = k.result.sort(); keys.slice(0, Math.max(0, keys.length - 3)).forEach(x => s.delete(x)); };
      tx.oncomplete = res; tx.onerror = res;
    });
    d.close();
  } catch {}
}
