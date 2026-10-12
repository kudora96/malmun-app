// 손글씨 회색 = 글꼴 모양 · 획 방향 점검(본부 10-12 투덜이) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게
// ⓐ 회색 = 글꼴 글자 모양(도구마다 고르게 불리거나 깎음) — 1편 글자들 회색 마스크 vs 글꼴 마스크 겹침(IoU)·포함·둘레 비 · 칸에 칠한 회색 = 같은 모양(도구 바꾸면 다시 칠함)
// ⓑ 자료 획 따라 바른 방향 = 연필·펜·붓 모두 ≥95 ⓒ 완전 수동: 거꾸로 그은 ㅣ·ㅡ·ㄱ → 80 아래 + 그 획 방향 문구 · 화면에서도(점수 빨강 · 아래 글 = 방향 문구)
// ⓓ ㅇ: 위에서 시계 반대(자료 방향) 통과 · 시계 방향 실패 · 아래에서 시작 실패 ⓔ 자석: 거꾸로 = 안 붙음 + 방향 문구 · 바른 방향 = 붙음 → 「✓ 순서 맞음」(ㄱ·ㅡ·ㄹ·ㅈ·ㅏ · ㅇ·ㅓ)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode"), best: localStorage.getItem("malmun.hbest"), tool: localStorage.getItem("malmun.htool") };
  const TW = { pencil: 0.04, pen: 0.07, brush: 0.12 };
  const L = {}; for (const k of ["ne", "en", "ko", "ne.ko"]) { try { L[k] = await (await fetch(`/lang/${k}.json?` + Date.now())).json(); } catch {} }
  const isKey = (txt, key) => !!txt && Object.values(L).some(o => o?.[key] === txt);
  const open = async li => { document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(1600); document.querySelector("video")?.pause(); };
  const wr = () => $(".panel .write")?.parentElement?.__wr;
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.removeItem("malmun.hmode"); localStorage.removeItem("malmun.hbest"); localStorage.removeItem("malmun.htool");
    await open(2);
    const A = d => d.getContext("2d").getImageData(0, 0, d.width, d.height).data;
    // ⓐ 회색 모양
    { const chars = [..."어서오세요경복궁에온걸환영해선생님저글자만들었이건그림아니왜약속다같읽을수있야"], rows = {}, bad = [];
      for (const tk of ["pencil", "pen", "brush"]) { const w = wr().guideW(tk); let si = 0, sc = 0, sp = 0, mi = 1, n = 0;
        for (const ch of chars) { const g = A(wr().glyphCv(ch, 200)), q = A(wr().guideCv(ch, w, 200)); let a = 0, b = 0, both = 0, pa = 0, pb = 0;
          const on = (d, i) => d[i * 4 + 3] > 128, edge = (d, i) => { const x = i % 200, y = (i / 200) | 0; return !x || !y || x === 199 || y === 199 || !on(d, i - 1) || !on(d, i + 1) || !on(d, i - 200) || !on(d, i + 200); };
          for (let i = 0; i < 40000; i++) { const ga = on(g, i), qa = on(q, i); if (ga) a++; if (qa) b++; if (ga && qa) both++; if (ga && edge(g, i)) pa++; if (qa && edge(q, i)) pb++; }
          const iou = both / Math.max(1, a + b - both), cont = both / Math.max(1, Math.min(a, b)), per = pb / Math.max(1, pa); /* 포함 = 작은 쪽이 큰 쪽 안에 든 비율(깎으면 회색 ⊂ 글꼴 · 불리면 글꼴 ⊂ 회색) */
          si += iou; sc += cont; sp += per; mi = Math.min(mi, iou); n++; if (cont < 0.98 || per < 0.8 || per > 1.25) bad.push(`${tk}:${ch} 포함 ${Math.round(cont * 100)}% 둘레비 ${per.toFixed(2)}`); }
        rows[tk] = { w: w.toFixed(3), iou: (si / n).toFixed(2), min: mi.toFixed(2), cont: (sc / n * 100).toFixed(1), per: (sp / n).toFixed(2) }; }
      const w0s = chars.slice(0, 8).map(ch => wr().glyphW0(ch).toFixed(3));
      const capped = chars.filter(ch => { const w = wr().guideW("brush"), g = Math.round((w - wr().glyphW0(ch)) * 1000) / 1000; return wr().guideGrow(ch, w) < g; });
      res.push(`· 참고: 붓 회색을 글자 틈이 메워지기 전까지만 불린 글자 ${capped.length}/${chars.length}: ${capped.join("") || "없음"}`);
      ok(!bad.length, `ⓐ 회색 = 글꼴 글자 모양(1편 ${chars.length}자 · 고르게 불림/깎음 · 포함 ≥98% · 둘레비 0.8~1.25)`, (bad.length ? "어긋남 " + bad.slice(0, 6).join(", ") + " · " : "") + Object.entries(rows).map(([k, r]) => `${k} 굵기 ${r.w} IoU 평균 ${r.iou}(최소 ${r.min}) 포함 ${r.cont}% 둘레비 ${r.per}`).join(" · "));
      res.push(`· 참고: 글꼴 획 굵기 w0(칸 비율) ${chars.slice(0, 8).map((ch, i) => ch + w0s[i]).join(" ")}`); }
    // ⓐ 칸에 칠한 회색 = guideCv 모양 · 도구 바꾸면 다시
    { const out = [];
      for (const tk of ["pencil", "pen", "brush"]) { $(`.panel [data-tool=${tk}]`).click(); await W(200);
        const gv = $(".panel .hguide"), n = gv.width, d = A(gv), m = A(wr().guideCv(wr().hand().ch, wr().guideW(tk), n)); let mk = 0, hit = 0, ex = 0, top = 0; for (let i = 0; i < n * n; i++) if (m[i * 4 + 3] > 250) top = Math.max(top, d[i * 4 + 3]); /* 회색 색의 진하기(반투명이면 낮음) */
        for (let i = 0; i < n * n; i++) { const x = i % n, y = (i / n) | 0, cross = Math.abs(x - n / 2) < n / 100 + 2 || Math.abs(y - n / 2) < n / 100 + 2; if (m[i * 4 + 3] > 128) { mk++; if (d[i * 4 + 3] >= top * 0.4) hit++; } else if (!cross && m[i * 4 + 3] < 10 && d[i * 4 + 3] >= top * 0.6) ex++; }
        out.push({ tk, fill: hit / Math.max(1, mk), ex: ex / Math.max(1, mk) }); }
      ok(out.every(o => o.fill >= 0.95 && o.ex <= 0.02), "ⓐ 칸 회색 = 그 도구 굵기 글꼴 모양(도구 단추 누르면 다시 칠함)", out.map(o => `${o.tk} 채움 ${Math.round(o.fill * 100)}% 밖 ${(o.ex * 100).toFixed(1)}%`).join(" · ")); }
    // 자료 획 길(바른 방향) · 거꾸로
    const pathOf = (ch, S) => wr().brushPath(ch, S).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 25)) === 0 || i === a.length - 1).map(q => [q.x, q.y]);
    const mk = (P, tk) => Object.assign(P.map(p => [p[0], p[1]]), { tool: tk, w: TW[tk] });
    const jamoOf = async (ch, S) => wr().unitsOf(ch)[S.unit]?.jamo;
    const keyOf = (ch, S) => { const Q = wr().brushPath(ch, S), a = Q[0], tot = Q.tot ?? Q[Q.length - 1].t, b = Q.find(q => q.t >= tot * 0.4) || Q[Q.length - 1], dx = b.x - a.x, dy = b.y - a.y; /* 앱과 같게 처음 40% 방향(1012.8 — 꺾인 획 ㄱ·ㅈ·ㄹ) */ return Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? "h_dir_down" : "h_dir_up") : dx > 0 ? "h_dir_right" : "h_dir_left"; };
    // ⓑ 바른 방향 = 연필·펜·붓 ≥95
    { const out = []; let fine = true;
      for (const ch of ["이", "으", "기", "글", "자", "어", "세", "왕", "읽", "했"]) { const list = await wr().strokesOf(ch); const v = ["pencil", "pen", "brush"].map(tk => wr().handScore(ch, list.map(S => mk(pathOf(ch, S), tk))));
        if (v.some(r => r.pct < 95 || r.dir)) fine = false; out.push(`${ch}${v.map(r => r.pct).join("/")}`); }
      ok(fine, "ⓑ 자료 획 따라 바른 방향 → 연필·펜·붓 모두 ≥95 · 방향 문구 없음", out.join(" ")); }
    // ⓒ 완전 수동 — 거꾸로 그은 ㅣ·ㅡ·ㄱ
    { const out = []; let fine = true;
      for (const [ch, jm] of [["이", "ㅣ"], ["으", "ㅡ"], ["기", "ㄱ"], ["기", "ㅣ"], ["글", "ㄱ"], ["글", "ㅡ"]]) { const list = await wr().strokesOf(ch); let ri = -1; for (let i = 0; i < list.length; i++) if (await jamoOf(ch, list[i]) === jm) { ri = i; break; }
        if (ri < 0) { fine = false; out.push(`${ch}의 ${jm} 획 없음`); continue; }
        for (const tk of ["pencil", "pen", "brush"]) { const r = wr().handScore(ch, list.map((S, i) => mk(i === ri ? pathOf(ch, S).reverse() : pathOf(ch, S), tk))), want = keyOf(ch, list[ri]);
          const good = r.pct < 80 && !r.ok && isKey(r.dir, want); if (!good) fine = false; if (tk === "pen" || !good) out.push(`${ch}의 ${jm}(${tk}) ${r.pct}% 「${r.dir}」${good ? "" : " ✗ 기대 " + want}`); }
        const Hf = { ch }, hint = list.map((S, i) => wr().strokeHint(Hf, i === ri ? [...S.pts].reverse() : S.pts)).filter(Boolean); if (!hint.some(x => isKey(x, keyOf(ch, list[ri])))) { fine = false; out.push(`${ch} 말풍선 「${hint.join("/")}」`); } }
      ok(fine, "ⓒ 완전 수동: 거꾸로 그은 ㅣ·ㅡ·ㄱ → 80 아래(실패) + 그 획 방향 문구(점수·말풍선)", out.join(" · ")); }
    // ⓓ ㅇ — 위에서 시계 반대(자료) 통과 · 시계 방향 실패 · 아래에서 시작 실패
    { const out = []; let fine = true;
      for (const ch of ["이", "어", "오", "왕"]) { const list = await wr().strokesOf(ch); let oi = -1; for (let i = 0; i < list.length; i++) if (await jamoOf(ch, list[i]) === "ㅇ") { oi = i; break; } if (oi < 0) { fine = false; out.push(`${ch} ㅇ 없음`); continue; }
        const P = pathOf(ch, list[oi]), ar = P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2, low = P.reduce((b, p, i) => (p[1] > P[b][1] ? i : b), 0);
        const sc = alt => wr().handScore(ch, list.map((S, i) => mk(i === oi ? alt : pathOf(ch, S), "pen")));
        const fw = sc(P), cw = sc([...P].reverse()), bot = sc(P.slice(low).concat(P.slice(1, low + 1))), wantK = ar < 0 ? "h_dir_ccw" : "h_dir_cw";
        const g = ar < 0 && fw.pct >= 95 && !fw.dir && cw.pct < 80 && isKey(cw.dir, wantK) && bot.pct < 80 && isKey(bot.dir, wantK); if (!g) fine = false;
        out.push(`${ch}: 자료 ${ar < 0 ? "시계 반대" : "시계"} · 시작 y ${P[0][1].toFixed(2)} · 바른 ${fw.pct} · 시계 ${cw.pct}「${cw.dir}」 · 아래서 시작 ${bot.pct}`); }
      ok(fine, "ⓓ ㅇ: 위에서 시계 반대 = 통과 · 시계 방향 = 실패 + 「…घडीको उल्टो…」 · 아래에서 시작 = 실패", out.join(" · ")); }
    // ⓒ 화면 — 「글」 ㄱ 을 거꾸로 그어 채점 → 빨강 점수 · 아래 글 = 방향 문구 · 말풍선
    { const H = wr().hand(), ch = H.ch, list = await wr().strokesOf(ch), iv = $(".panel .hink"), R = iv.getBoundingClientRect(); let id = 30;
      const draw = async strokes => { for (const S of strokes) { const ev = (t, [x, y]) => iv.dispatchEvent(new PointerEvent(t, { pointerId: id, bubbles: true, cancelable: true, clientX: R.left + x * R.width, clientY: R.top + y * R.height, pointerType: "touch", isPrimary: true })); ev("pointerdown", S[0]); for (const q of S.slice(1)) ev("pointermove", q); ev("pointerup", S[S.length - 1]); id++; await W(30); } };
      $(".panel [data-act=hclear]")?.click(); await W(100);
      await draw(list.map((S, i) => (i === 0 ? pathOf(ch, S).reverse() : pathOf(ch, S)))); $(".panel [data-act=hdone]").click(); await W(400);
      const sc = $(".panel .hscore"), note = $(".panel .loopnote")?.textContent || "", bub = $(".panel .hbubble")?.textContent || "", want = keyOf(ch, list[0]), r = H.last;
      ok(sc && !sc.hidden && sc.classList.contains("bad") && r?.pct < 80 && isKey(r?.dir, want) && isKey(bub, want), `ⓒ 화면: 「${ch}」 첫 획 거꾸로 → 빨강 점수 + 방향 말풍선`, `「${sc?.textContent}」 · 말풍선 「${bub}」 · 아래 글 「${note.slice(0, 40)}」`);
      await W(1400); $(".panel [data-act=hclear]").click(); await W(100);
      await draw(list.map(S => pathOf(ch, S))); $(".panel [data-act=hdone]").click(); await W(400);
      ok(H.last?.pct >= 95 && H.passed, `ⓑ 화면: 「${ch}」 바른 방향 → 통과(≥95)`, `${H.last?.pct}%`); for (let k = 0; k < 60 && wr().busy(); k++) await W(100); }
    // ⓔ 자석 — 획마다 거꾸로 먼저(안 붙음 + 문구) → 바르게(붙음)
    localStorage.setItem("malmun.hmode", "magnet");
    for (const [li, nCh] of [[2, 2], [0, 1]]) { await open(li); const out = []; let fine = true;
      for (let c = 0; c < nCh; c++) { const H = wr().hand(), ch = H.ch; for (let k = 0; k < 30 && !H.magList; k++) await W(100); const list = H.magList || [];
        const iv = $(".panel .hink"), R = () => iv.getBoundingClientRect(), ev = (t, x, y) => { const r = R(); iv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: "touch", clientX: r.left + x * r.width, clientY: r.top + y * r.height, buttons: 1 })); };
        const draw = async P => { ev("pointerdown", ...P[0]); for (const q of P) ev("pointermove", ...q); ev("pointerup", ...P[P.length - 1]); await W(250); };
        for (let i = 0; i < list.length; i++) { const jm = await jamoOf(ch, list[i]), P = pathOf(ch, list[i]), m0 = H.mag; const bb = $(".panel .hbubble"); if (bb) bb.textContent = "";
          await draw([...P].reverse()); const bub = $(".panel .hbubble")?.textContent || "", Q = wr().brushPath(ch, list[i]), closed = Math.hypot(Q[0].x - Q[Q.length - 1].x, Q[0].y - Q[Q.length - 1].y) < 0.15 * Q.tot;
          const want = closed ? null : keyOf(ch, list[i]), refused = H.mag === m0 && (closed ? isKey(bub, "h_dir_ccw") || isKey(bub, "h_dir_cw") : isKey(bub, want));
          await draw(P); const took = H.mag === m0 + 1; if (!refused || !took) fine = false; out.push(`${ch}${i + 1}${jm}${refused ? "" : "✗거꾸로「" + bub + "」"}${took ? "" : "✗안붙음"}`); }
        await W(400); const sc = $(".panel .hscore")?.textContent || ""; if (!H.passed || !/✓/.test(sc)) { fine = false; out.push(`${ch} 「${sc}」`); }
        for (let k = 0; k < 60 && wr().busy(); k++) await W(100); if (c < nCh - 1) { $(".panel [data-act=hnext]")?.click(); for (let k = 0; k < 80 && wr().hand() === H; k++) await W(100); await W(300); } }
      ok(fine, `ⓔ 자석(${li + 1}줄): 거꾸로 = 안 붙음 + 방향 문구 · 바르게 = 붙음 → 「✓ 순서 맞음」`, out.join(" ")); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " · " + String(e.stack || "").split("\n").slice(1, 3).join(" ").replace(/ +/g, " ").slice(0, 160)); }
  for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode], ["malmun.hbest", keep.best], ["malmun.htool", keep.tool]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 손글씨 회색·방향 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
