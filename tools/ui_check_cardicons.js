// 줄 카드 단추 = 그림만 다섯(쓰기부 · 대표님 10-20 B) — #/learn/L01-00-01 · ne·ur·en(지금 언어 그대로 + ne·ur)
//  ⓐ 다섯 개 한 줄 · 같은 폭·높이 · 이름(aria) 있음 · 카드 밖으로 안 나감 ⓑ ⇄ 전후 카드 높이·카드 안 단추 자리 0px ⓒ 처음 한 번 차례 풍선말 1/5 → 5/5 → 끝(기억) · 그 누름은 단추로 안 감
//  ⓓ 길게 누르기 = 그 단추 이름 풍선말 · 그 단추 일(창 열기)은 안 함 ⓔ 🎮 게임 열면 배경음악 hold · 닫으면 풀림
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; const i18n = await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`), ui = await import(`/js/ui.js?v=${document.documentElement.dataset.v}`);
  const keep = { lang: localStorage.getItem("malmun.lang"), tip: localStorage.getItem("malmun.actstip") };
  const cur = () => $(".line.cur"), btns = () => [...(cur()?.querySelectorAll(".acts [data-tipk]") || [])];
  const R = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 2) / 2); };
  const bad = { a: [], b: [] };
  for (const lg of ["ne", "ur", "en"]) { localStorage.setItem("malmun.lang", lg); await i18n.setLang(lg); await i18n.setUiKo(false); location.hash = "#/list"; await W(300); location.hash = "#/learn/L01-00-01"; await W(2200);
    for (const li of [0, 3, 9]) { const L = document.querySelectorAll(".line")[li]; L?.click(); await W(500); $(".panel [data-act=close]")?.click(); await W(300);
      const bs = btns(), c = cur(); if (bs.length !== 5) { bad.a.push(`${lg}#${li} 단추 ${bs.length}`); continue; } const rs = bs.map(R), cr = c.getBoundingClientRect();
      if (Math.max(...rs.map(r => r[2])) - Math.min(...rs.map(r => r[2])) > 1 || new Set(rs.map(r => r[3])).size > 1 || new Set(rs.map(r => r[1])).size > 1 || bs.some(b => !b.getAttribute("aria-label")) || rs.some(r => r[0] < cr.left - 0.5 || r[0] + r[2] > cr.right + 0.5)) bad.a.push(`${lg}#${li} 카드 ${Math.round(cr.left)}~${Math.round(cr.right)} 단추 ${rs[0][0]}~${rs[4][0] + rs[4][2]} 높이 ${[...new Set(rs.map(r => r[3]))]} 위 ${[...new Set(rs.map(r => r[1]))]}`);
      if (i18n.KO_UI.includes(lg)) { const rel = () => { const c2 = cur(), q = c2.getBoundingClientRect(); return [Math.round(q.height * 2) / 2, ...btns().map(e => { const r = e.getBoundingClientRect(); return [Math.round((document.documentElement.dir === "rtl" ? q.right - r.right : r.left - q.left) * 2) / 2, Math.round((r.top - q.top) * 2) / 2, r.width, r.height]; })]; }; /* 카드 높이 + 카드 안 단추 자리(카드 자체 위치·폭은 배우기 화면 몫) */ const p0 = rel(); await ui.switchUiKo(true); await W(500); const p1 = rel(); await ui.switchUiKo(false); await W(400); if (JSON.stringify(p0) !== JSON.stringify(p1)) bad.b.push(`${lg}#${li} ${JSON.stringify(p0.slice(0, 2))}→${JSON.stringify(p1.slice(0, 2))}`); } } }
  ok(!bad.a.length, "ⓐ 줄 카드 단추 다섯 · 한 줄 · 같은 폭·높이 · 이름 · 카드 안(ne·ur·en × 줄 셋)", bad.a.slice(0, 4).join(" · "));
  ok(!bad.b.length, "ⓑ ⇄ 전후 카드 높이·카드 안 단추 자리 0px", bad.b.join(" · "));
  // ⓒ 차례 풍선말
  { localStorage.removeItem("malmun.actstip"); window.__actsTip = 1; const app = $("#app") || document.body, start = [...document.querySelectorAll("*")].find(e => e.__actsTip)?.__actsTip; start?.(); await W(200);
    const seq = []; for (let k = 0; k < 6; k++) { const t0 = $(".actstip"); seq.push(t0 ? (t0.querySelector("i")?.textContent || "?") : "-"); if (t0) { t0.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })); t0.click(); } await W(150); }
    ok(seq.join(",") === "1/5,2/5,3/5,4/5,5/5,-" && localStorage.getItem("malmun.actstip") === "1", "ⓒ 처음 한 번 차례 풍선말 — 풍선말을 누르면 1/5 → 5/5 → 끝 · 기억", seq.join(","));
    localStorage.removeItem("malmun.actstip"); start?.(); await W(200); const had = !!$(".actstip"), wb = btns().find(x => x.dataset.act === "write"); wb.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })); wb.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); wb.click(); await W(1500);
    ok(had && !$(".actstip") && !!$(".panel .write") && localStorage.getItem("malmun.actstip") === "1", "ⓒ 풍선말이 떠 있어도 다른 곳(✎ 쓰기) 누름 = 그대로 통과(쓰기 창 열림) · 풍선말 닫힘", `떠 있음 ${had} · 쓰기 창 ${!!$(".panel .write")}`); $(".panel [data-act=close]")?.click(); await W(400);
    delete window.__actsTip; }
  // ⓓ 길게 누르기
  { const b = btns().find(x => x.dataset.act === "write"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "touch" })); await W(650); const t0 = $(".actstip")?.querySelector("b")?.textContent; b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); b.click(); await W(500);
    ok(t0 === b.getAttribute("aria-label") && !$(".panel .write"), "ⓓ 길게 누르면 이름 풍선말 · 쓰기 창은 안 열림", `${t0} · 창 ${!!$(".panel .write")}`); await W(1900); ok(!$(".actstip"), "ⓓ 이름 풍선말은 잠깐 뒤 사라짐"); }
  // ⓔ 게임 = 배경음악 hold
  { const bgm = await import(`/js/bgm.js?v=${document.documentElement.dataset.v}`); const h0 = bgm.bgmState().holds; btns().find(x => x.dataset.act === "game")?.click(); await W(1200); const h1 = bgm.bgmState().holds; history.back(); await W(1200); const h2 = bgm.bgmState().holds;
    ok(h1 === h0 + 1 && h2 === h0 && !$(".gamewrap"), "ⓔ 🎮 게임 열면 배경음악 멈춤(hold) · 닫으면 풀림", `${h0}→${h1}→${h2}`); }
  localStorage.setItem("malmun.lang", keep.lang || "en"); await i18n.setLang(keep.lang || "en"); keep.tip == null ? localStorage.removeItem("malmun.actstip") : localStorage.setItem("malmun.actstip", keep.tip);
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 줄 카드 단추 ${res.length - nb}/${res.length}\n` + res.join("\n"); console.log(out); return out;
})();
