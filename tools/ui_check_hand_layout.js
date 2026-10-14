// 쓰기 창 배치 점검(본부 10-12 투덜이 「세종대왕이」 토막에서 손글씨 칸이 단추 줄을 덮음) — #/learn/L01-00-01 을 연 채로
// 모든 줄 × 모든 토막 × 자판·손글씨: 단추 줄(이 부분 듣기·자동 완성·전체 자동 완성)이 칸·자판·손글씨 단추와 안 겹침 · 단추 세 개가 위·가운데·아래 모두 맨 위에 보임(덮이지 않음)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode") };
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  try {
    const lines = document.querySelectorAll(".line"), bad = [], hb = [], grown = []; let n = 0;
    const look = (li, si, mode) => { const P = $(".panel"), wb = P?.querySelector(".wbtns"); if (!wb) return; n++;
      const wr = wb.getBoundingClientRect(), pr = P.getBoundingClientRect(), others = [".hbox", ".hbtns", ".kb", ".info .sub2"].map(s => [s, P.querySelector(s)?.getBoundingClientRect()]).filter(x => x[1] && x[1].height);
      const ov = others.filter(([, r]) => hit(wr, r)).map(([s]) => s);
      const hid = [...wb.querySelectorAll("button")].filter(b => { const r = b.getBoundingClientRect(); if (!r.height) return true; return [0.2, 0.5, 0.8].some(f => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * f); return !e || !b.contains(e); }); }).map(b => b.dataset.act);
      if (mode === "hand") { const h = P.querySelector(".hbox")?.getBoundingClientRect().height; if (h) hb.push(Math.round(h)); if (P.querySelector(".stage")?.style.height) grown.push(`${li + 1}-${si + 1}`); }
      const out = wr.top < pr.top - 1 || wr.bottom > pr.bottom + 1;
      if (ov.length || hid.length || out) bad.push(`${li + 1}줄 ${si + 1}토막 ${mode}: ${ov.length ? "겹침 " + ov.join(",") : ""}${hid.length ? " 덮임 " + hid.join(",") : ""}${out ? " 창 밖" : ""}`); };
    for (const mode of ["kb", "hand"]) { localStorage.setItem("malmun.wmode", mode);
      for (let li = 0; li < lines.length; li++) { const b = lines[li].querySelector("[data-act=write]"); if (!b) continue; b.click(); await W(900); document.querySelector("video")?.pause();
        for (let si = 0; si < 12; si++) { await W(250); look(li, si, mode); const nx = $(".panel [data-seg=\"1\"]"); if (!nx || nx.disabled) break; nx.click(); }
        $(".panel [data-act=close]")?.click(); await W(300); } }
    ok(n > 20 && !bad.length, `쓰기 창 배치: 단추 줄이 칸·자판과 안 겹치고 다 보임(${innerWidth}×${innerHeight} · 줄×토막×자판·손글씨 ${n}곳)`, bad.slice(0, 8).join(" · ") || "");
    res.push(`· 참고: 손글씨 칸 크기 ${Math.min(...hb)}~${Math.max(...hb)}px · 위 칸을 키운 토막 ${grown.length}곳 ${grown.slice(0, 10).join(" ")}`);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  // 채점 때 화면 고정(투덜이 10-14 「채점할 때 화면이 흔들려 눈이 아파」) — 15번 줄 「나」 · 자석 통과 · 손글씨 통과 · 손글씨 꽝 → 채점 직전 ↔ 직후 손글씨 칸·단추·글자 줄 자리 움직임 0px
  try { const Wt = ms => new Promise(r => setTimeout(r, ms)), $q = s => document.querySelector(s), outs = [];
    for (const [hm, mode] of [["magnet", "pass"], ["free", "pass"], ["free", "fail"]]) {
      localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", hm); localStorage.setItem("malmun.htool", "pen");
      document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await Wt(400); document.querySelectorAll(".line")[14].querySelector("[data-act=write]").click(); await Wt(1800);
      for (let k = 0; k < 6 && ![...document.querySelectorAll(".panel .sent .c")].some(b => b.textContent === "나"); k++) { $q(".panel .segnav [data-seg='1']")?.click(); await Wt(700); }
      [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === "나")?.click(); await Wt(1600); const wr = $q(".panel .write").parentElement.__wr; wr.hand().stopOrder(); await Wt(400); const H = wr.hand(); for (let k = 0; k < 30 && hm === "magnet" && !H.magList; k++) await Wt(100);
      const pos = () => [...document.querySelectorAll(".panel .hbox, .panel .hbtns button, .panel .stage, .panel .sent")].map(e => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round); });
      const iv = $q(".panel .hink"), RR = iv.getBoundingClientRect(), pe = (t, x, y) => iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 4, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: RR.left + x * RR.width, clientY: RR.top + y * RR.height }));
      const L = await wr.strokesOf("나"); let p0 = null;
      for (let i = 0; i < L.length; i++) { const Q = hm === "magnet" ? wr.brushPath("나", H.magList[i]) : await wr.fitPath("나", i, "pen"); const P = mode === "fail" ? Q.map(q => ({ x: q.x + 0.15, y: q.y })) : Q; if (i === L.length - 1) { await Wt(300); p0 = pos(); } pe("pointerdown", P[0].x, P[0].y); P.forEach(q => pe("pointermove", q.x, q.y)); pe("pointerup", P.at(-1).x, P.at(-1).y); await Wt(300); }
      if (mode === "fail") $q(".panel [data-act=hdone]").click(); await Wt(900); const p1 = pos(); let mv = 0; p0.forEach((a, i) => a.forEach((v, k) => { mv = Math.max(mv, Math.abs(v - ((p1[i] || [])[k] ?? 9999))); }));
      outs.push([`${hm === "magnet" ? "자석" : "손글씨"} ${mode === "pass" ? "통과" : "꽝"}`, mv, !$q(".panel .hscore").hidden]); }
    ok(outs.every(([, mv, shown]) => mv === 0 && shown), "채점 때 화면 고정 — 점수가 떠도 손글씨 칸·단추·글자 줄 움직임 0px(자석 통과 · 손글씨 통과 · 꽝)", outs.map(([k, mv, sh]) => `${k} ${mv}px${sh ? "" : " 점수 안 뜸"}`).join(" · ")); } catch (e) { ok(false, "채점 때 화면 고정 점검 오류", e.message); }
  localStorage.removeItem("malmun.hmode");
  keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 쓰기 창 배치 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
