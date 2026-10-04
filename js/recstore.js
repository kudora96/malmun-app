// 저장한 내 녹음 관리 — 지우기 · 이 편 모두 지우기 · 내려받기 · 오래 남게(본부 10-04 · 투덜이 승인)
// 녹음·재생·점수 경로는 건드리지 않는다 — IndexedDB 「malmun」/rec(말하기 창 recGet·recPut 과 같은 곳)만 다룬다
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open("malmun", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("rec");
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
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

// 원본 blob 그대로 파일로(다시 굽지 않음) — 확장자는 그 형식대로(아이폰 녹음 = mp4)
const EXT = t => (/webm/.test(t) ? "webm" : /mp4|m4a|aac/.test(t) ? "mp4" : /ogg/.test(t) ? "ogg" : /wav/.test(t) ? "wav" : /mpeg/.test(t) ? "mp3" : "webm");
export function downloadRec(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = `${name}.${EXT(blob.type || "")}`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  return a.download;
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
