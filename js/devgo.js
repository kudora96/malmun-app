// 대표님 확인용 바로가기(본부 10-23 · 로컬판에서만 · 공개판엔 아무 일 없음)
//  ?go=L01-00-01&line=5&win=explain|speak|write|game|big&t=44  (line=end = 목록 맨 아래 「끝」 줄 · ?fresh=1·?lang=ne 와 함께 써도 됨)
//  처음 실행 단계(언어·태어난 해)는 건너뜀 · 잘못된 값이면 편 목록으로 · 화면 틀·앱 코드는 안 바꾸고 학습자가 누르는 단추를 대신 누름
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname);
const W = ms => new Promise(r => setTimeout(r, ms));
const wait = async (f, ms = 10000) => { for (let n = 0; n < ms / 100; n++) { const x = f(); if (x) return x; await W(100); } return null; };
let job = null;

// main.js 가 첫 route() 전에 부름 — 갈 주소(hash)를 정하고 할 일을 적어 둠
export async function devgoPrep() {
  if (!LOCAL) return;
  const q = new URLSearchParams(location.search), ep = (q.get("go") || "").toUpperCase();
  if (!ep) return;
  const line = (q.get("line") || "").toLowerCase(), win = (q.get("win") || "").toLowerCase(), tt = q.get("t");
  ["go", "line", "win", "t"].forEach(k => q.delete(k)); // 다시 열기·새로 고침 때 또 하지 않게 주소에서 지움
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + "#/list");
  try { localStorage.setItem("malmun.started", "1"); if (localStorage.getItem("malmun.birth") == null) localStorage.setItem("malmun.birth", "1990"); if (!localStorage.getItem("malmun.country")) localStorage.setItem("malmun.country", "KR"); } catch {}
  const to = h => history.replaceState(null, "", location.pathname + location.search + h); // hashchange 없이(첫 route() 가 바로 읽음)
  const bad = () => to("#/list");
  if (!/^[A-Z0-9-]+$/.test(ep)) return bad();
  let L = null; try { const r = await fetch(`data/${ep}/${ep}.json?t=${Date.now()}`, { cache: "no-store" }); if (r.ok) L = (await r.json()).subtitles; } catch {}
  if (!Array.isArray(L) || !L.length) return bad();
  const WINS = ["", "explain", "speak", "write", "game", "big"];
  if (!WINS.includes(win)) return bad();
  let t = null; if (tt != null && tt !== "") { t = Number(tt); if (!Number.isFinite(t) || t < 0) return bad(); }
  let k = -1, end = false;
  if (line === "end") end = true;
  else if (line) { k = L.findIndex(l => String(l.id) === line); if (k < 0) return bad(); }
  else if (t != null) { k = Math.max(0, L.findIndex((l, i) => t >= l.start && (i === L.length - 1 || t < L[i + 1].start))); }
  else k = 0;
  if (!end && (win === "explain" || win === "speak" || win === "write" || win === "game") && k < 0) return bad();
  job = { ep, k, end, win, t };
  to(`#/learn/${ep}` + (k >= 0 ? `/${L[k].id}` : ""));
}

// 첫 route() 뒤 — 학습 화면이 다 그려지면 그 창·그 초
export async function devgoRun() {
  if (!job) return; const { k, end, win, t } = job; job = null;
  const sc = await wait(() => document.querySelector(".scr.learn .lines .line")); if (!sc) return;
  await W(1200); // 첫 자리 잡기(settle) 다음에
  const v = document.querySelector("#vwrap video");
  if (end) { document.querySelector(".lend[data-end=end]")?.click(); await W(300); v?.pause(); return; }
  const li = document.querySelector(`.scr.learn .lines .line[data-i="${k}"]`);
  if (win === "explain" || win === "speak" || win === "write" || win === "game") { li?.querySelector(`[data-act=${win}]`)?.click(); return; }
  if (t != null && v) { const seek = () => { try { v.currentTime = t; } catch {} }; if (v.readyState >= 1) seek(); else v.addEventListener("loadedmetadata", seek, { once: true }); }
  if (win === "big") {
    const fs = document.querySelector("[data-act=fs]"); if (!fs) return;
    const tryFs = () => fs.click();
    tryFs(); await W(400);
    if (!document.fullscreenElement) { // 전체 화면은 손으로 한 번 눌러야 열리는 브라우저가 많음 → 첫 누름에 크게 보기
      const once = e => { document.removeEventListener("pointerdown", once, true); if (!document.fullscreenElement) { e.preventDefault(); e.stopPropagation(); tryFs(); } };
      document.addEventListener("pointerdown", once, true);
    }
  }
}
