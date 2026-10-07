// 오류 기록(본부 10-07 폰 진단) — 화면에 안 보임 · localStorage malmun.errlog 에 최근 20개 · 진단 화면(#/diag)이 보여 줌
//  window 오류 · 처리 안 된 약속 거절 · fetch 실패(주소 + 상태) · 소리 풀기 실패(sfx) — 앱 동작은 그대로(기록만)
const KEY = "malmun.errlog";
export function logErr(kind, msg, extra = {}) {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    a.push({ at: new Date().toISOString().slice(11, 19), kind, msg: String(msg).slice(0, 200), ...extra });
    localStorage.setItem(KEY, JSON.stringify(a.slice(-20)));
  } catch {}
}
export const errLog = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export const clearErr = () => { try { localStorage.removeItem(KEY); } catch {} };
const short = u => String(u).replace(/^https?:\/\/[^/]+\//, "").split("?")[0].slice(-80);
if (!window.__errlogOn) {
  window.__errlogOn = true;
  window.addEventListener("error", e => logErr("error", e.message || e.type, { src: short(e.filename || e.target?.src || ""), line: e.lineno || 0 }), true);
  window.addEventListener("unhandledrejection", e => logErr("reject", e.reason?.message || e.reason || "?"));
  const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    try { const r = await f0(u, o); if (!r.ok && !/version\.json/.test(String(u))) logErr("fetch", r.status, { url: short(u?.url || u) }); return r; }
    catch (e) { logErr("fetch", e.message || "failed", { url: short(u?.url || u) }); throw e; }
  };
}
