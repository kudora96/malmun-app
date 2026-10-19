// 배경음악·음악 상자 뺌 점검(대표님 10-19 「음악 메뉴는 전체적으로 지우자」) — 첫 화면·목록·배우기(설명·말하기·쓰기 창): ♪ 칩·🎵 음악 상자 없음 · bgm 파일 안 받음 · ⛶ 칩은 창 머리 줄에 그대로
//  (옛 점검 = tools/_off_ui_check_bgm.js · 음악을 다시 켜면(bgm.js MUSIC_ON) 되살림)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const got = []; const of = window.fetch; window.fetch = (u, o) => { if (/\/bgm\//.test(String(u))) got.push(String(u)); return of(u, o); };
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
  const music = () => [...document.querySelectorAll("[data-act=bgm], [data-act=musicbox], .chip.bgmb, .sheet.mbox")].filter(vis).length;
  for (const h of ["#/", "#/list"]) { location.hash = h; await W(1500); document.body.click(); await W(300); ok(!music() && document.documentElement.scrollWidth <= innerWidth + 1, `${h} ♪·음악 상자 없음 · 가로 넘침 0`); }
  location.hash = "#/learn/L01-00-01"; await W(2200);
  for (const kind of ["explain", "speak", "write"]) {
    const l = document.querySelectorAll(".line")[0]; l.click(); await W(400); l.querySelector(`[data-act=${kind}]`).click(); await W(2500);
    const b = [...document.querySelectorAll(".bigb")].find(vis), P = document.querySelector(".panel");
    const out = [...P.querySelectorAll("button,.chip")].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length;
    ok(!music() && !!b && P.contains(b) && !out, `${kind} 창: ♪ 없음 · ⛶ 칩 머리 줄에 있음 · 화면 밖 단추 0`);
    P.querySelector("[data-act=close], .closex")?.click(); await W(700);
  }
  ok(!got.length, "배경음악 파일 안 받음", got.slice(0, 2).join(" "));
  window.fetch = of;
  return res.join("\n");
})();
