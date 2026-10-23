// 배경음악 켜기·끄기 점검(대표님 10-20 「🔇/🔊 · 처음 꺼짐 · ⇄ 왼쪽 · 틀 0px」 · 옛 「음악 없음」 점검을 바꿈) — 첫 화면·목록에서 켜기·끄기 · 배우기·설명·말하기·쓰기 창엔 없음(대표님 10-23)
//  처음 = 꺼짐(🔇 · bgm 파일 안 받음) · 누르면 켜짐(🔊 · aria-pressed) · 다시 누르면 꺼짐 · 누를 때 ⇄·⛶ 자리 0px · 단추가 ⇄ 바로 왼쪽 · 화면 밖 단추 0
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; const keep = localStorage.getItem("malmun.bgm"); localStorage.removeItem("malmun.bgm");
  const got = []; const of = window.fetch; window.fetch = (u, o) => { if (/\/bgm\//.test(String(u))) got.push(String(u)); return of(u, o); };
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
  const tog = (root = document) => [...root.querySelectorAll("[data-act=bgmtog]")].find(vis);
  const rects = root => [...root.querySelectorAll("[data-act=uiko], .bigb, [data-act=bgmtog]")].filter(vis).map(e => JSON.stringify(e.getBoundingClientRect())).join("|");
  const leftOfUiko = b => { const u = b?.parentElement?.querySelector("[data-act=uiko]"); if (!u) return true; const r = b.getBoundingClientRect(), q = u.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - (q.top + q.height / 2)) < 6 && (document.documentElement.dir === "rtl" ? r.left >= q.right - 1 : r.right <= q.left + 1); };
  const flip = async (root, where) => { const b = tog(root); if (!b) return ok(false, `${where}: 🔇/🔊 단추 있음`); const r0 = rects(root), off0 = b.dataset.on === "false" && b.getAttribute("aria-pressed") === "false";
    b.click(); await W(250); const on1 = b.dataset.on === "true" && b.getAttribute("aria-pressed") === "true", r1 = rects(root); b.click(); await W(250); const off2 = b.dataset.on === "false", r2 = rects(root);
    ok(off0 && on1 && off2 && r0 === r1 && r1 === r2 && leftOfUiko(b), `${where}: 처음 꺼짐 → 누르면 켜짐 → 다시 꺼짐 · ⇄·⛶ 자리 0px · ⇄ 바로 왼쪽`, `${off0}/${on1}/${off2} · 틀 ${r0 === r1 && r1 === r2} · 왼쪽 ${leftOfUiko(b)}`); };
  for (const h of ["#/", "#/list"]) { location.hash = h; await W(1500); ok(document.documentElement.scrollWidth <= innerWidth + 1, `${h} 가로 넘침 0`); await flip(document, h); }
  // 대표님 10-23: 🔇 는 첫 화면·목록에만 — 배우기·설명·말하기·쓰기 창 머리 줄엔 없음 · 목록에서 켠 상태가 창 안(숨은 칩)에도 그대로
  location.hash = "#/list"; await W(1200); tog()?.click(); await W(250); const onList = tog()?.dataset.on;
  location.hash = "#/learn/L01-00-01"; await W(2200); { const L = document.querySelector(".learn"); ok(!tog(L), "배우기 머리 줄: 🔇 없음"); ok([...L.querySelectorAll("[data-act=bgmtog]")].every(b => b.dataset.on === onList) && onList === "true", "목록에서 켠 소리 상태 = 배우기에서도 그대로", `목록 ${onList}`); }
  location.hash = "#/list"; await W(1200); tog()?.click(); await W(250); location.hash = "#/learn/L01-00-01"; await W(2200);
  for (const kind of ["explain", "speak", "write"]) {
    const l = document.querySelectorAll(".line")[0]; l.click(); await W(400); l.querySelector(`[data-act=${kind}]`).click(); await W(2500);
    const P = document.querySelector(".panel"), out = [...P.querySelectorAll("button,.chip")].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length;
    ok(!out, `${kind} 창: 화면 밖 단추 0`); ok(!tog(P), `${kind} 창: 🔇 없음(첫 화면·목록에만)`);
    P.querySelector("[data-act=close], .closex")?.click(); await W(700);
  }
  ok(!got.length, "꺼짐 = 배경음악 파일 안 받음(점검 소리 끔)", got.slice(0, 2).join(" "));
  window.fetch = of; keep == null ? localStorage.removeItem("malmun.bgm") : localStorage.setItem("malmun.bgm", keep);
  return res.join("\n");
})();
