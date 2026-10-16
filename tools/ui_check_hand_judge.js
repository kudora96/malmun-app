// 손글씨 채점 설명 점검(투덜이 10-15 안 · 판정 상자) — #/learn/L01-00-01 을 연 채로
// 글자마다 바른 획(회색 가운데 길)을 일부러 틀리게 만들어 채점 → 판정 상자 첫 줄이 그 잘못을 짚는지(빠짐·방향·순서·짧음·자리·크기·남는 선·시간·완벽)
// + 실제 화면: 꽝 뒤 판정 상자 글이 상자 밖으로 안 넘침 · 점수 배지가 손글씨 칸(회색 글자)과 안 겹침 · 주황 점선이 칸에 그려짐
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hm: localStorage.getItem("malmun.hmode") };
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", "free"); localStorage.setItem("malmun.htool", "pen");
    document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(400);
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1800);
    const wr = $(".panel .write").parentElement.__wr; wr.hand()?.stopOrder?.(); await W(300);
    { const g = $(".panel .hjudge"), t0 = g?.querySelector("p")?.textContent || ""; ok(g?.classList.contains("guide") && t0.includes(wr.hand().ch) && t0.includes("①") && (g.scrollHeight <= g.clientHeight + 1 || !!g.querySelector(".jmore")), "채점 전 판정 상자 = 안내(글자 · 획 수 · ① 자모 · 쓰는 법)", g?.innerText.replace(/\s+/g, " ").slice(0, 80)); }
    const keys = j => j.L.map(o => o.k || "raw"), bad = [];
    for (const ch of ["나", "세", "어", "을", "왕"]) {
      const L = await wr.strokesOf(ch), N = L.length, fp = []; for (let i = 0; i < N; i++) fp.push((await wr.fitPath(ch, i, "pen")).map(q => [q.x, q.y, 1]));
      const cut = (S, f) => S.slice(0, Math.max(2, Math.round(S.length * f))), all = () => fp.map(S => S.slice());
      const len = S => S.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - S[i - 1][0], p[1] - S[i - 1][1]) : 0), 0), lk = fp.map(len).reduce((b, v, i, A) => (v > A[b] ? i : b), 0); // 가장 긴 획(짧은 획은 이웃 획 회색에 덮여 빠져도 「짧음」)
      const plen = S => S.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - S[i - 1][0], p[1] - S[i - 1][1]) : 0), 0), norm = S => 0.35 + 1.1 * plen(S);
      const timed = (S, k, stop = 0) => { const T = norm(S) * 1000 * k, o = S.map(p => p.slice()); const m = Math.floor(S.length / 2); o.ts = S.map((p, q) => 1000 + (q / Math.max(1, S.length - 1)) * T + (stop && q >= m ? stop : 0)); if (stop) { o.splice(m, 0, o[m - 1].slice()); o.ts.splice(m, 0, o.ts[m - 1] + stop); } return o; };
      let sd2 = 11; const rn = () => ((sd2 = (sd2 * 1103515245 + 12345) >>> 0) / 4294967296) - 0.5;
      const dens = S => { const o = []; for (let q = 1; q < S.length; q++) { const a = S[q - 1], b = S[q], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.003)); for (let m = 0; m < k; m++) o.push([a[0] + (b[0] - a[0]) * m / k, a[1] + (b[1] - a[1]) * m / k, 1]); } o.push(S.at(-1)); return o; };
      const shake = S => dens(S).map(p => [p[0] + rn() * 0.03, p[1] + rn() * 0.03, 1]); // 점마다 ±1.5% 떨림(대표님 10-15)
      const bow = (S, a) => { const dx = S.at(-1)[0] - S[0][0], dy = S.at(-1)[1] - S[0][1], h = Math.abs(dx) >= Math.abs(dy); return S.map((p, q) => { const f = Math.sin(Math.PI * q / Math.max(1, S.length - 1)) * a; return h ? [p[0], p[1] - f, 1] : [p[0] - f, p[1], 1]; }); };
      const bb = fp.flat(), cx = (Math.min(...bb.map(p => p[0])) + Math.max(...bb.map(p => p[0]))) / 2, cy = (Math.min(...bb.map(p => p[1])) + Math.max(...bb.map(p => p[1]))) / 2;
      const cases = [
        ["완벽", all(), j => j.pct >= 80 && /wx_perfect|wx_good/.test(j.L[0]?.k)],
        ["빠짐", fp.filter((S, i) => i !== lk), j => j.L.some(o => o.k === "wx_missing" && o.v.n === lk + 1)],
        ["방향", [fp[0].slice().reverse(), ...fp.slice(1)], j => j.L.some(o => o.k === "wx_dir" && o.v.n === 1)],
        ["순서", [fp[1], fp[0], ...fp.slice(2)], j => j.L.some(o => o.k === "wx_order")],
        ["짧음", fp.map((S, i) => (i === lk ? cut(S, 0.45) : S)), j => j.L.some(o => o.k === "wx_short" && o.v.n === lk + 1)],
        ["자리", all().map(S => S.map(p => [p[0] + 0.2, p[1], 1])), j => /wx_pos_right/.test(j.L[0]?.k)],
        ["크기", all().map(S => S.map(p => [cx + (p[0] - cx) * 0.5, cy + (p[1] - cy) * 0.5, 1])), j => j.L[0]?.k === "wx_small"],
        ["남는 선", [...all(), [[0.04, 0.95, 1], [0.12, 0.96, 1], [0.22, 0.97, 1]]], j => j.L.some(o => o.k === "wx_extra")],
        ["시간", all().slice(0, N - 1), j => j.L.at(-1)?.k === "wx_time", true],
        // 세 기준(10-15 안 A) — ② 선: 가장 긴 획 가운데를 위(가로획)·왼쪽(세로획)으로 7% 휨 → [선] 줄 · 그 획 번호 · 「많이」 ③ 빠르기: 점마다 시각을 붙여 견본의 3배 느림 / 0.2배 빠름 / 가운데 0.8초 멈춤
        ["선", fp.map((S, i) => (i === lk ? bow(S, 0.07) : S)), j => j.L.some(o => o.k === "wx_line" && o.v.n === lk + 1 && o.v.a === "wx_a_lot")],
        ["떨림", fp.map((S, i) => (i === lk ? shake(S) : dens(S))), j => j.L.some(o => o.k === "wx_shake" && o.v.n === lk + 1)],
        ["느림", fp.map((S, i) => timed(S, i === lk ? 3 : 1)), j => j.L.some(o => o.k === "wx_slow" && o.v.n === lk + 1) && j.pct >= 80],
        ["빠름", fp.map((S, i) => timed(S, i === lk ? 0.2 : 1)), j => j.L.some(o => o.k === "wx_fast" && o.v.n === lk + 1)],
        ["멈춤", fp.map((S, i) => timed(S, 1, i === lk ? 800 : 0)), j => j.L.some(o => o.k === "wx_pause" && o.v.n === lk + 1)],
      ];
      for (const [nm, S, want, tu] of cases) { const j = await wr.judge(ch, S, !!tu); if (!want(j)) bad.push(`${ch} ${nm}: ${j.pct}% ${keys(j).join(",")}`);
        if (j.L.length > 4) bad.push(`${ch} ${nm}: ${j.L.length}줄(4줄 넘음)`); }
    }
    // 통과 규칙 — 모양 80↑ 이어도 선 60 아래면 꽝 · 빠르기는 조언(느려도 통과) · 배지 세 칸
    { const ch = "나", L = await wr.strokesOf(ch), F = []; for (let i = 0; i < L.length; i++) F.push((await wr.fitPath(ch, i, "pen")).map(q => [q.x, q.y, 1]));
      const bw = (S, a) => { const h = Math.abs(S.at(-1)[0] - S[0][0]) >= Math.abs(S.at(-1)[1] - S[0][1]); return S.map((p, q) => { const f = Math.sin(Math.PI * q / Math.max(1, S.length - 1)) * a; return h ? [p[0], p[1] - f, 1] : [p[0] - f, p[1], 1]; }); }, r1 = wr.handScore(ch, F.map(S => bw(S, 0.08))), r2 = wr.handScore(ch, F);
      ok(r2.pass && r2.shapeP >= 95 && r2.lineP >= 95 && r2.speedP == null, "바른 획 = 모양·선 95↑ · 빠르기 잴 수 없음(–)", `모양 ${r2.shapeP} 선 ${r2.lineP} 빠르기 ${r2.speedP}`);
      ok(!r1.pass && r1.pct < 80 && r1.lineP < 60, "획마다 가운데를 8% 휘어 그음 = 꽝(선·모양)", `모양 ${r1.shapeP} 선 ${r1.lineP}`); }
    ok(!bad.length, "채점 설명이 잘못을 짚음(나·세·어·을·왕 × 완벽·빠짐·방향·순서·짧음·자리·크기·남는 선·시간·선 휨·느림·빠름·멈춤 · 4줄 이하)", bad.slice(0, 8).join(" · "));
    // 실제 화면 — 「어」 왼쪽 한 획만 그어 채점(꽝)
    const iv = $(".panel .hink"), R = iv.getBoundingClientRect(), pe = (t, x, y) => iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: R.left + x * R.width, clientY: R.top + y * R.height }));
    const ch0 = wr.hand().ch, Q = await wr.fitPath(ch0, 0, "pen"); pe("pointerdown", Q[0].x, Q[0].y); Q.forEach(q => pe("pointermove", q.x, q.y)); pe("pointerup", Q.at(-1).x, Q.at(-1).y); await W(300);
    $(".panel [data-act=hdone]").click(); await W(700);
    const jb = $(".panel .hjudge"), ps = [...jb.querySelectorAll("p")].filter(p => !p.hidden), jr = jb.getBoundingClientRect(), last = ps.at(-1)?.getBoundingClientRect();
    ok(ps.length >= 1 && jb.scrollHeight <= jb.clientHeight + 1 && (!last || last.bottom <= jr.bottom + 1), `꽝 뒤 판정 상자 ${ps.length}줄 · 상자 밖으로 안 넘침(${innerWidth}×${innerHeight})`, `${jb.scrollHeight}/${jb.clientHeight} · ${jb.innerText.slice(0, 60)}`);
    const sr = $(".panel .hslot").getBoundingClientRect(), br = $(".panel .hbox").getBoundingClientRect(), btn = [...document.querySelectorAll(".panel .hbtns > button")].map(b => b.getBoundingClientRect());
    const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
    ok(sr.bottom <= br.top + 0.5 && !$(".panel .hscore").hidden, "점수 배지 = 손글씨 칸 바깥 왼쪽 위(칸·회색 글자와 겹침 0px)", `배지 아래 ${Math.round(sr.bottom)} · 칸 위 ${Math.round(br.top)}`);
    ok(!btn.some(b => hit(b, jr)) && !hit(jr, br), "판정 상자가 단추·손글씨 칸을 안 덮음");
    ok(br.width >= 100 && !$(".panel .hand").classList.contains("stack"), "판정 상자가 있어도 손글씨 칸 100px↑ · 칸 아래로 안 밀림(검사부 10-15 320 59px)", `${Math.round(br.width)}px · ${$(".panel .hand").className}`);
    { const mb = $(".panel .jmore"); if (mb) { mb.click(); await W(200); const f = $(".panel .hjfull"), fr = f?.getBoundingClientRect(); ok(!!f && fr.width <= br.width + 1 && fr.height <= br.height + 1 && f.innerText.replace(/\s/g, "").length >= jb.innerText.replace(/[\s⋯]/g, "").length - 2, "잘린 판정 글 「⋯」 → 손글씨 칸 위에 전체 글 · 누르면 닫힘"); f?.click(); await W(100); ok(!$(".panel .hjfull"), "전체 글 닫힘"); } else res.push("· 참고: 판정 글이 다 보여 「⋯」 없음"); }
    { const parts = [...document.querySelectorAll(".panel .hscore i[data-k]")].map(i => i.dataset.k).join(","); ok(parts === "wx_s_shape,wx_s_line,wx_s_speed", "점수 배지 세 칸(모양 · 선 · 빠르기)", parts + " · " + $(".panel .hscore").textContent); }
    const fx = $(".panel .hfix"), d = fx.getContext("2d").getImageData(0, 0, fx.width, fx.height).data; let px = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) px++;
    ok(px > 50, "꽝 뒤 칸에 맞는 획 주황 점선·번호가 그려짐", `${px}px`);
    await W(2300); const d2 = fx.getContext("2d").getImageData(0, 0, fx.width, fx.height).data; let px2 = 0; for (let i = 3; i < d2.length; i += 4) if (d2[i] > 0) px2++;
    ok(px2 === 0 && ps.length === [...jb.querySelectorAll("p")].filter(p => !p.hidden).length, "2초 뒤 점선은 사라지고 판정 글은 남음", `${px2}px`);
    // 자모 소리 다시(본부 10-15 「틀린 뒤 다시 쓰면 ㅅ·ㅣ 소리가 안 남」) — 첫 자모 획을 다 그으면 소리 · 지우기 뒤 · 꽝 자동 지움 뒤 다시 그어도 소리
    { const w3 = $(".panel .write").parentElement.__wr, H3 = w3.hand(), ch = H3.ch, L = await w3.strokesOf(ch), u0 = L.map((S, i) => [S, i]).filter(([S]) => S.unit === 0).map(([, i]) => i), iv = $(".panel .hink"), R = iv.getBoundingClientRect(), pe = (t, x, y) => iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 8, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: R.left + x * R.width, clientY: R.top + y * R.height }));
      const drawU = async () => { for (const i of u0) { const Q = await w3.fitPath(ch, i, "pen"); pe("pointerdown", Q[0].x, Q[0].y); Q.forEach(q => pe("pointermove", q.x, q.y)); pe("pointerup", Q.at(-1).x, Q.at(-1).y); await W(150); } await W(500); };
      let at0 = 0; const said = () => (window.__sfxLog ||= []).slice(at0).filter(e => /\.mp3/.test(e.name || "") && e.ev !== "끝").length;
      $(".panel [data-act=hclear]").click(); await W(200); at0 = (window.__sfxLog ||= []).length; await drawU(); const a1 = said();
      $(".panel [data-act=hclear]").click(); await W(200); at0 = (window.__sfxLog ||= []).length; await drawU(); const a2 = said();
      $(".panel [data-act=hdone]").click(); await W(1700); at0 = (window.__sfxLog ||= []).length; await drawU(); const a3 = said(); /* 꽝 → 1.2초 자동 지움 뒤 다시 */
      ok(a1 > 0 && a2 > 0 && a3 > 0, "첫 자모 획을 다 그으면 자모 소리 — 처음 · 지우기 뒤 · 꽝 뒤 다시 쓰기 모두", `${a1}/${a2}/${a3}`); $(".panel [data-act=hclear]").click(); await W(200); }
    // 간직하기(대표님 10-15) — 🎉 100점일 때만 ⭐·📄 단추 · 이 기기에 그 글씨 모음 · 📄 → A4 미리보기(그려짐) · 100점 아니면 단추 없음
    { localStorage.removeItem("malmun.keep"); localStorage.setItem("malmun.hmode", "free"); document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1600);
      const w4 = $(".panel .write").parentElement.__wr, H4 = w4.hand(), ch = H4.ch, L = await w4.strokesOf(ch), iv = $(".panel .hink"), R = iv.getBoundingClientRect(); let id = 70;
      for (let i = 0; i < L.length; i++) { const Q0 = await w4.fitPath(ch, i, "pen"), Q = Q0.filter((q, k) => k % 2 === 0 || k === Q0.length - 1), T = (0.35 + 1.1 * Q0.tot) * 1000, ev = (t, q) => iv.dispatchEvent(new PointerEvent(t, { pointerId: id, bubbles: true, cancelable: true, clientX: R.left + q.x * R.width, clientY: R.top + q.y * R.height, pointerType: "touch", isPrimary: true }));
        const t0 = performance.now(); ev("pointerdown", Q[0]); for (let k = 1; k < Q.length; k++) { const wt = t0 + k * T / Q.length - performance.now(); if (wt > 1) await W(wt); ev("pointermove", Q[k]); } ev("pointerup", Q.at(-1)); id++; await W(150); }
      $(".panel [data-act=hdone]")?.click(); await W(900); const r = H4.last, row = !!$(".panel .keeprow"), saved = (JSON.parse(localStorage.getItem("malmun.keep") || "{}")[ch]?.list || []).length;
      $(".panel [data-act=keepsheet]")?.click(); await W(120); const fxGone = !document.querySelector(".fxfull"); await W(780); const ov = document.querySelector(".keepov"), cv = ov?.querySelector("canvas"); let ink = 0; if (cv) { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; for (let i = 0; i < d.length; i += 64) if (d[i] + d[i + 1] + d[i + 2] < 240) ink++; } /* 먹(어두운 점) */
      ov?.querySelector("[data-kact=close]")?.click(); await W(200);
      ok(r?.shapeP === 100 && r?.lineP === 100 && (r?.speedP ?? 0) >= 95 && row && saved === 1 && !!cv && ink > 50 && fxGone && !document.querySelector(".keepov"), "간직하기: 견본 빠르기로 바르게 = 🎉 100점 → ⭐·📄 단추 · 그 글씨 모음 · 📄 누르면 🎉 덮개 바로 치움 · A4 미리보기에 내 획 · 닫힘", `${r?.shapeP}/${r?.lineP}/${r?.speedP} · 단추 ${row} · 모음 ${saved} · 덮개 치움 ${fxGone} · 먹 ${ink}`);
      $(".panel [data-act=hclear]")?.click(); await W(200); const Q = await w4.fitPath(ch, 0, "pen"); const ev2 = (t, q) => iv.dispatchEvent(new PointerEvent(t, { pointerId: 90, bubbles: true, cancelable: true, clientX: R.left + q.x * R.width, clientY: R.top + q.y * R.height, pointerType: "touch", isPrimary: true })); ev2("pointerdown", Q[0]); Q.forEach(q => ev2("pointermove", q)); ev2("pointerup", Q.at(-1)); await W(150);
      $(".panel [data-act=hdone]")?.click(); await W(600); ok(!$(".panel .keeprow"), "100점 아니면 간직 단추 없음", `${w4.hand().last?.pct}`); localStorage.removeItem("malmun.keep"); }
    // 👣 따라 쓰기 — 켜면 견본 붓(주황)이 칸에 그려짐 · 자석은 꺼짐 · 획을 다 쓰면 견본 사라짐 · 끄면 그대로 손글씨
    { localStorage.setItem("malmun.hmode", "magnet"); document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500);
      $(".panel [data-hfollow]").click(); await W(1200); const fb = $(".panel [data-hfollow]"), mg = $(".panel [data-hmode]"), px = () => { const c = $(".panel .hpace"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) k++; return k; };
      const p0 = px(), w2 = $(".panel .write").parentElement.__wr, ch = w2.hand().ch, L = await w2.strokesOf(ch), iv = $(".panel .hink"), R = iv.getBoundingClientRect(), pe = (t, x, y) => iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 6, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: R.left + x * R.width, clientY: R.top + y * R.height }));
      for (let i = 0; i < L.length; i++) { const Q = await w2.fitPath(ch, i, "pen"); pe("pointerdown", Q[0].x, Q[0].y); for (const q of Q) { pe("pointermove", q.x, q.y); await W(8); } pe("pointerup", Q.at(-1).x, Q.at(-1).y); await W(200); }
      await W(150); const p1 = px(), r = w2.hand().last || w2.handScore(ch, w2.hand().strokes);
      ok(fb.getAttribute("aria-pressed") === "true" && mg.getAttribute("aria-pressed") === "false" && p0 > 30 && p1 === 0, "👣 따라 쓰기: 켜면 자석 꺼짐 · 견본 붓이 칸에 그려짐 · 다 쓰면 사라짐", `견본 ${p0}px → ${p1}px`);
      ok(r.speedP != null, "따라 쓰기로 그은 획 = 빠르기 잼", `모양 ${r.shapeP} · 선 ${r.lineP} · 빠르기 ${r.speedP}`);
      $(".panel [data-hfollow]").click(); await W(300); localStorage.setItem("malmun.hfollow", "0"); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  localStorage.removeItem("malmun.hfollow");
  keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode);
  keep.hm == null ? localStorage.removeItem("malmun.hmode") : localStorage.setItem("malmun.hmode", keep.hm);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 채점 설명 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
