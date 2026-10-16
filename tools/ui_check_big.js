// ⛶ 크게 보기 점검(대표님 10-16) — 겉 틀만 · 끄면 지금 화면과 같음 · 기본 꺼짐
// 창(설명·말하기·쓰기)마다: ⛶ 칩이 그 창 머리 줄 ♪ 앞 · 누르면 .big(줄 목록·재생 막대·아래 단추 줄 숨김 · 창이 화면 가득 · 넘침 0 · 화면 밖 0)
//  · 크게 연 채 ⇄ = 그대로 · 다시 누르면(작게) 창 크기·자리가 들어가기 전과 같음(±1px) · 창을 닫으면 .big 없음 · 떠 있는 ⛶ 알약 없음
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const R = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v)); };
  const learn = () => document.querySelector(".scr.learn"), panel = () => document.querySelector(".panel"), vis = el => el && el.offsetParent && el.getBoundingClientRect().width > 0;
  const land = matchMedia("(orientation: landscape) and (max-height: 500px)").matches; // 폰 가로 = 창 열면 저절로 크게(작게 누르면 왼쪽 기둥 안 창)
  for (const kind of ["explain", "speak", "write"]) {
    location.hash = "#/list"; await W(500); location.hash = "#/learn/L01-00-01"; await W(2200);
    const l = document.querySelectorAll(".line")[0]; l.click(); await W(400); l.querySelector(`[data-act=${kind}]`).click(); await W(2600);
    document.querySelector(".helpbox:not([hidden])")?.click(); await W(200);
    const b = document.querySelector(".bigb"), inHead = !!b && vis(b) && !!panel()?.contains(b) && b.nextElementSibling?.classList.contains("bgmb");
    ok(inHead && learn().classList.contains("big") === land, `${kind} · ⛶ 칩 = 창 머리 줄 ♪ 앞 · ${land ? "가로 = 저절로 크게" : "기본 꺼짐"}`, b ? `${b.parentElement?.className}` : "없음");
    if (land) { b.click(); await W(1200); } // 가로: 먼저 작게(기준 자리)
    const before = R(panel()), sw0 = document.documentElement.scrollWidth;
    b.click(); await W(1200);
    const P = panel(), hid = [".lines", ".ctrl", ".seek"].every(s => !vis(document.querySelector(s)));
    const pr = R(P), full = pr[2] >= innerWidth - 2 && pr[3] >= innerHeight * 0.8;
    const out = [...P.querySelectorAll("button,.chip")].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1; }).length;
    ok(learn().classList.contains("big") && hid && full && P.scrollHeight <= P.clientHeight + 1 && !out && b.getAttribute("aria-pressed") === "true", `${kind} · 크게 = 창 화면 가득 · 줄 목록·막대 숨김 · 넘침 0 · 화면 밖 단추 0`, `창 ${pr.join("/")} · 넘침 ${P.scrollHeight - P.clientHeight} · 밖 ${out}`);
    const u = [...document.querySelectorAll("[data-act=uiko]")].find(vis); if (u) { u.click(); await W(700); u.click(); await W(700); }
    ok(learn().classList.contains("big"), `${kind} · 크게 연 채 ⇄ 왕복 = 그대로`);
    document.querySelector(".bigb").click(); await W(1200);
    const after = R(panel()), same = before.every((v, k) => Math.abs(v - after[k]) <= 1);
    ok(!learn().classList.contains("big") && same && document.documentElement.scrollWidth === sw0, `${kind} · 작게 = 창 크기·자리 들어가기 전과 같음(±1px)`, `${before.join("/")} → ${after.join("/")}`);
    document.querySelector(".bigb").click(); await W(800); panel().querySelector("[data-act=close], [data-x=close], .closex")?.click(); await W(900);
    ok(!learn().classList.contains("big") && !document.documentElement.classList.contains("bigview"), `${kind} · 크게 연 채 창 닫기 = 크게 끝`);
  }
  const fl = [...document.querySelectorAll(".bigb")].filter(vis).length;
  ok(fl === 0, "창이 없을 때 ⛶ 안 보임(떠 있는 알약 없음)", String(fl));
  return res.join("\n");
})();
