// 손글씨 따라 쓰기 1단계 점검(본부 10-07 투덜이 「ㅇ」) — #/learn/L01-00-01 을 연 채로 크기마다 실행 · 소리는 아주 작게
// ⓐ 모드 단추 ⌨/✍ (단추 모양 · 고른 것 기억) ⓑ 손글씨 칸 = 정사각 · 창 안 · 스크롤 0 · 자판 없음 · 다른 칸과 안 겹침
// ⓒ 글자 모양 그대로 따라 그린 획(마스크 가로 훑기 · 진짜 pointer 이벤트) + ✓ → 「n% ★」 통과 · 머묾 · 다음 ▶ ⓓ 엉뚱한 낙서 → 실패 · 같은 글자
// ⓗ 엄한 판정(본부 10-07): 정확히 ≥95 · 한쪽 획 빼먹음 실패 · 펜 굵기만큼 비낌 <80 · 대충 동그라미+막대 실패 · 가운데 선 점수 참고
// ⓔ 한 획 되돌리기 · 지우기 ⓕ 손 뗀 채 1.2초 → 저절로 판정 ⓖ 그리는 동안 화면·창 안 움직임(touch-action none · 스크롤 0)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  try {
    localStorage.removeItem("malmun.wmode");
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500);
    const P = () => document.querySelector(".panel"), $ = s => P().querySelector(s), wr = () => P().querySelector(".write")?.parentElement?.__wr;
    const mb = [...P().querySelectorAll("[data-mode]")];
    ok(mb.length === 2 && mb.every(b => b.tagName === "BUTTON" && /\p{L}/u.test(b.textContent)) && $("[data-mode=kb]").getAttribute("aria-pressed") === "true" && $(".kb"), "ⓐ 모드 단추 둘(글자 있는 단추) · 처음 = ⌨ 자판", mb.map(b => b.textContent).join(" / "));
    $("[data-mode=hand]").click(); await W(500);
    const hb = $(".hbox"), hr = hb?.getBoundingClientRect();
    ok($(".hand") && !$(".kb") && localStorage.getItem("malmun.wmode") === "hand" && $("[data-mode=hand]").getAttribute("aria-pressed") === "true", "ⓐ ✍ 누름 → 손글씨 칸 · 자판 없음 · 기억(malmun.wmode)");
    const p = P(), pr = p.getBoundingClientRect(), boxes = [".whead", ".segrow", ".stage", ".hbox", ".hbtns"].map(s => [s, $(s)?.getBoundingClientRect()]).filter(x => x[1] && x[1].height);
    const ov = []; for (let i = 0; i < boxes.length; i++) for (let k = i + 1; k < boxes.length; k++) if (hit(boxes[i][1], boxes[k][1]) && !(boxes[i][0] === ".hbox" && boxes[k][0] === ".hbtns" ? false : false)) ov.push(boxes[i][0] + "×" + boxes[k][0]);
    const inside = boxes.every(([, r]) => r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1 && r.left >= pr.left - 1 && r.right <= pr.right + 1);
    const sc = p.querySelector(".write"), noScroll = sc.scrollHeight <= sc.clientHeight + 1 && p.scrollHeight <= p.clientHeight + 1;
    ok(hr && Math.abs(hr.width - hr.height) <= 1 && hr.width >= 120 && inside && !ov.length && noScroll, "ⓑ 손글씨 칸 = 정사각 · 창 안 · 겹침 0 · 스크롤 0", `${Math.round(hr?.width)}×${Math.round(hr?.height)} · 겹침 ${ov.join(",") || 0} · 창 안 ${inside}`);
    const iv = $(".hink"), H0 = wr().hand(), ch0 = H0.ch;
    const draw = async strokes => { const iv = $(".hink"), r = iv.getBoundingClientRect(); let id = 7; // 글자마다 칸을 새로 그리므로 매번 찾음
      for (const S of strokes) { const pts = []; for (let i = 0; i < S.length; i++) { pts.push(S[i]); if (i < S.length - 1) for (let q = 1; q < 6; q++) pts.push([S[i][0] + ((S[i + 1][0] - S[i][0]) * q) / 6, S[i][1] + ((S[i + 1][1] - S[i][1]) * q) / 6]); }
        const ev = (type, [x, y]) => iv.dispatchEvent(new PointerEvent(type, { pointerId: id, bubbles: true, cancelable: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerType: "touch", isPrimary: true }));
        ev("pointerdown", pts[0]); for (const q of pts.slice(1)) ev("pointermove", q); ev("pointerup", pts[pts.length - 1]); id++; } };
    // ⓖ 그리는 동안 안 움직임
    const y0 = [window.scrollY, p.scrollTop, sc.scrollTop, document.querySelector(".learn")?.scrollTop ?? 0].join(",");
    const ta = getComputedStyle(iv).touchAction;
    // ⓓ 낙서 → 실패 · 칸 위 점수(80 아래 = 빨강 · 별 없음)
    const zig = [Array.from({ length: 14 }, (_, i) => [0.05 + 0.065 * i, i % 2 ? 0.08 : 0.2]), Array.from({ length: 14 }, (_, i) => [0.05 + 0.065 * i, i % 2 ? 0.9 : 0.78])];
    await draw(zig); $("[data-act=hdone]").click(); await W(700);
    const sc1 = wr().hand().last?.pct ?? -1, lab1 = $(".hscore")?.textContent || "";
    ok(sc1 >= 0 && sc1 < 80 && wr().hand().ch === ch0 && !wr().hand().passed && /^\d+%$/.test(lab1) && $(".hscore").classList.contains("bad"), "ⓓ 엉뚱한 낙서 → 실패 · 칸 위 「n%」(빨강·별 없음) · 같은 글자", `「${lab1}」`);
    const y1 = [window.scrollY, p.scrollTop, sc.scrollTop, document.querySelector(".learn")?.scrollTop ?? 0].join(",");
    ok(ta === "none" && y0 === y1, "ⓖ 그리는 동안 화면·창 안 움직임(touch-action none)", `${ta} · ${y0} → ${y1}`);
    // ⓔ 되돌리기·지우기
    $("[data-act=hclear]").click(); await draw([[[0.2, 0.2], [0.8, 0.2]], [[0.2, 0.5], [0.8, 0.5]]]); await W(100);
    const n2 = wr().hand().strokes.length; $("[data-act=hundo]").click(); const n1 = wr().hand().strokes.length; $("[data-act=hclear]").click(); const n0 = wr().hand().strokes.length;
    ok(n2 === 2 && n1 === 1 && n0 === 0, "ⓔ 한 획 되돌리기 2→1 · 지우기 → 0", `${n2}→${n1}→${n0}`);
    // ⓗ 엄한 판정(본부 10-07) — 점수만 계산(화면 그대로) · 지금 글자로
    { const s = wr().hand().s, tr0 = wr().traceOf(ch0), sc = S => wr().handScore(ch0, S, s);
      const full = sc(tr0), cen = sc(wr().centerOf(ch0));
      const half = sc(tr0.map(S => S.filter(([x]) => x < 0.5)).filter(S => S.length)); // 오른쪽 획 빼먹음
      const shift = sc(tr0.map(S => S.map(([x, y]) => [x + 0.06, y]))); // 펜 굵기만큼 비껴
      const circ = sc([Array.from({ length: 41 }, (_, i) => [0.3 + 0.24 * Math.cos(i * Math.PI / 20), 0.5 + 0.34 * Math.sin(i * Math.PI / 20)]), [[0.75, 0.1], [0.75, 0.9]]]); // 대충 큰 동그라미 + 막대
      { const tl = ["pencil", "pen", "brush"].map(tk => sc(wr().centerOf(ch0).map(S => Object.assign(S.slice(), { tool: tk, w: { pencil: 0.04, pen: 0.07, brush: 0.12 }[tk] }))).pct); // 투덜이 10-08 — 가는 도구도 가운데를 따라 그리면 100 가까이
        ok(tl.every(v => v >= 95) && Math.max(...tl) - Math.min(...tl) <= 2, "ⓗ 연필·펜·붓으로 가운데 따라 그림 → 모두 95 이상 · 도구 차이 없음", tl.join("/")); }
      ok(full.pct >= 95, "ⓗ 정확히 따라 그림 → 95 이상(★)", `${full.pct}% · 덩어리 ${full.comps.map(v => Math.round(v * 100)).join("/")}`);
      ok(!half.ok && half.pct < 80, "ⓗ 오른쪽 획 빼먹고 왼쪽만 → 실패", `${half.pct}% · 덩어리 ${half.comps.map(v => Math.round(v * 100)).join("/")}`);
      ok(shift.pct < 80, "ⓗ 펜 굵기만큼 옆으로 비껴 그림 → 80 아래", `${shift.pct}% · 벗어남 ${Math.round(shift.outside * 100)}%`);
      ok(circ.pct < 80, "ⓗ 대충 큰 동그라미 + 막대 → 실패", `${circ.pct}%`);
      res.push(`· 참고: 글자 가운데 선만 따라 그림(조심스러운 학습자) → ${cen.pct}% · 덩어리 ${cen.comps.map(v => Math.round(v * 100)).join("/")} · 벗어남 ${Math.round(cen.outside * 100)}%`); }
    // ⓒ 따라 그리기 → 통과(★ · 초록 점수 · 효과) → 그 자리 머묾(다시 쓰기 가능) · 위 글자 줄에 최고 점수 · 「다음 ▶」→ 다음 글자
    await W(1300);
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100);
    const tr = wr().traceOf(ch0);
    await draw(tr); $("[data-act=hdone]").click(); await W(400);
    const lab2 = $(".hscore")?.textContent || "", fxOn = $(".hbox .fx")?.classList.contains("on"), stay = wr().hand() === H0 && H0.passed, nextB = $("[data-act=hnext]");
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100);
    const best = String(Object.values(JSON.parse(localStorage.getItem("malmun.hbest") || "{}")).pop() ?? ""); // 최고 점수 = 기억만(위 글자 줄엔 안 보임 · 투덜이 10-07)
    ok(/^\d+% ★$/.test(lab2) && fxOn && stay && !!nextB && best === lab2.replace(/% .*/, "") && !P().querySelector(".sent .hb"), "ⓒ 따라 그림 → 「n% ★」 + 효과 · 그 글자에 머묾 · 「다음 ▶」 · 최고 점수 기억(글자 줄엔 숫자 안 보임)", `「${lab2}」 · 효과 ${fxOn} · 최고 ${best}`);
    // 다시 쓰기 — 그리기 시작하면 통과 풀림(점수 숨김) · 낮게 써도 최고 점수 그대로
    await draw(zig); const re = !H0.passed && $(".hscore").hidden; $("[data-act=hdone]").click(); await W(500);
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100);
    const best2 = String(Object.values(JSON.parse(localStorage.getItem("malmun.hbest") || "{}")).pop() ?? "");
    ok(re && best2 === best, "ⓒ 통과 뒤 다시 그리면 = 다시 쓰기 · 더 낮게 써도 최고 점수 그대로", `최고 ${best2}`);
    $("[data-act=hclear]").click(); await draw(tr); $("[data-act=hdone]").click(); await W(400); for (let k = 0; k < 60 && wr().busy(); k++) await W(100); // 실패한 획은 남아 있음(빠진 획만 더 그릴 수 있게) → 지우고 다시
    $("[data-act=hnext]")?.click(); for (let k = 0; k < 80 && wr().hand() === H0; k++) await W(100);
    const H1 = wr().hand();
    ok(H1 !== H0 && H1?.ch !== undefined, "ⓒ 「다음 ▶」 → 다음 글자", `「${ch0}」 → 「${H1?.ch}」`);
    // ⓕ 손 뗀 채 1.2초 → 저절로 판정(통과면 머묾 → 다음 ▶)
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100);
    const ch1 = H1.ch; await draw(wr().traceOf(ch1)); for (let k = 0; k < 40 && !H1.passed; k++) await W(100);
    const auto = H1.passed; for (let k = 0; k < 60 && wr().busy(); k++) await W(100); $("[data-act=hnext]")?.click(); for (let k = 0; k < 80 && wr().hand() === H1; k++) await W(100);
    ok(auto && wr().hand() !== H1, "ⓕ 다 그리고 손 뗀 채 1.2초 → 저절로 판정(통과) → 다음 ▶", `「${ch1}」 → 「${wr().hand()?.ch}」`);
    // ⓘ 획순(본부 10-07 2단계) — 세·종·왕·읽·이: 자료 획 차례대로 = 알림 0 · 중성 먼저 = 순서 알림 · 가로획 거꾸로 = 방향 알림 · 자료 점이 글꼴 획에서 많이 벗어난 자모 보고
    { const fitBad = [], rows = [];
      for (const ch of ["세", "종", "왕", "읽", "이"]) {
        const list = await wr().strokesOf(ch), us = wr().unitsOf(ch), hint = S => wr().strokeHint(Hf, S); let Hf;
        Hf = { ch }; const n0 = list.map(S => hint(S.pts)).filter(Boolean);
        Hf = { ch }; const sw = [...list.filter(S => S.role !== "cho"), ...list.filter(S => S.role === "cho")].map(S => hint(S.pts)).filter(Boolean);
        const hi = list.findIndex(S => { const a = S.pts[0], b = S.pts[S.pts.length - 1]; return Math.abs(b[0] - a[0]) > 2 * Math.abs(b[1] - a[1]) && Math.hypot(b[0] - a[0], b[1] - a[1]) >= 0.12; });
        Hf = { ch }; const rv = list.map((S, i) => hint(i === hi ? [...S.pts].reverse() : S.pts)).filter(Boolean);
        rows.push({ ch, n0, sw, rv, hi });
        // 맞춤 확인: 획 위 점(촘촘히)이 그 자모 잉크(3px 너그럽게) 안에 든 비율
        us.forEach((u, ui) => { const set = new Set(u.px), UN = 200, inU = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (set.has(Math.round(y * UN + dy) * UN + Math.round(x * UN + dx))) return true; return false; };
          let n = 0, k = 0; for (const S of list.filter(S => S.unit === ui)) for (let i = 1; i < S.pts.length; i++) for (let t = 0; t <= 1; t += 0.1) { const x = S.pts[i - 1][0] + (S.pts[i][0] - S.pts[i - 1][0]) * t, y = S.pts[i - 1][1] + (S.pts[i][1] - S.pts[i - 1][1]) * t; n++; if (inU(x, y)) k++; }
          if (n && k / n < 0.7) fitBad.push(`${ch}의 ${u.jamo} ${Math.round((100 * k) / n)}%`); }); }
      ok(rows.every(r => !r.n0.length), "ⓘ 자료 획 차례대로 그림 → 알림 0(세·종·왕·읽·이)", rows.map(r => `${r.ch}${r.n0.length ? "✗" + r.n0.join("/") : ""}`).join(" "));
      ok(rows.every(r => r.sw.some(x => /पहिले|먼저|first/.test(x))), "ⓘ 중성부터 그림 → 「क्रम मिलेन: पहिले …」", rows.map(r => `${r.ch}:${r.sw[0] || "없음"}`).join(" · "));
      ok(rows.every(r => r.hi < 0 || r.rv.some(x => /बायाँ|왼쪽|left/.test(x))), "ⓘ 가로획 오른쪽→왼쪽 → 「दिशा: बायाँबाट दायाँ」", rows.map(r => `${r.ch}:${r.hi < 0 ? "가로획 없음" : r.rv[0] || "없음"}`).join(" · "));
      res.push(`· 자료 점 맞춤(획 위 점이 그 자모 잉크 안 70% 미만): ${fitBad.join(" · ") || "없음"}`);
      // 획 붙이기 뒤 자모별 표(본부 10-07) — 24자모 × 세·종·왕·읽·이·했·싶·글·한·국 + 자모가 다 나오게 몇 음절 더
      const tbl = {}; for (const ch of ["세", "종", "왕", "읽", "이", "했", "싶", "글", "한", "국", "뭐", "책", "토", "퓨", "랴", "벼", "끝", "쿄", "의", "됐", "뷔"]) for (const r of await wr().strokeFit(ch)) if (r.fit != null) (tbl[r.jamo] ||= []).push(`${ch}${Math.round(r.fit * 100)}`);
      const low = Object.entries(tbl).filter(([, v]) => v.some(x => +x.replace(/\D/g, "") < 70));
      res.push(`· 자모별 잉크 안 비율(획 붙이기 뒤): ${Object.entries(tbl).map(([j, v]) => `${j}[${v.join(" ")}]`).join(" ")}`);
      ok(true, `ⓘ 획 붙이기 뒤 70% 아래 자모 ${low.length}개`, low.map(([j, v]) => `${j}: ${v.filter(x => +x.replace(/\D/g, "") < 70).join(" ")}`).join(" · ") || "없음"); }
    // ⓘ 화면: 「क्रम」 누르면 획을 하나씩 그림(중간 장면 = 주황 획 일부) · 다 그린 뒤 지움 · 중성부터 그리면 말풍선
    { $("[data-act=horder]").click(); await W(700); const gv = $(".hguide"), gx = gv.getContext("2d"), d = gx.getImageData(0, 0, gv.width, gv.height).data; let org = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] > 80 && d[i + 1] < 130 && d[i + 2] < 60) org++;
      ok(org > 50, "ⓘ 「क्रम」 → 회색 글자 위에 주황 획을 하나씩 그림(0.7초 장면)", `주황 픽셀 ${org}`);
      // 다 그린 장면(획 수 × 0.5초 뒤): 주황 획 가운데 줄 픽셀이 회색 글자 잉크(획 굵기 절반 너그럽게) 안에 든 비율 ≥ 70%(본부 10-07 — 그려진 픽셀 기준)
      const nS = (await wr().strokesOf(wr().hand().ch)).length; await W(nS * 500 + 100 - 700);
      const d2 = gx.getImageData(0, 0, gv.width, gv.height).data, n = gv.width, gl = document.createElement("canvas"); gl.width = gl.height = n; const glx = gl.getContext("2d");
      const g0 = wr().unitsOf(wr().hand().ch), UN = 200, k = UN / n, inkSet = new Set(g0.flatMap(u => u.px)); let o2 = 0, on = 0, r = Math.round(0.03 * UN);
      for (let y = 0; y < n; y += 2) for (let x = 0; x < n; x += 2) { const i = (y * n + x) * 4; if (d2[i] > 180 && d2[i + 1] > 80 && d2[i + 1] < 130 && d2[i + 2] < 60) { o2++; const cx = Math.round(x * k), cy = Math.round(y * k); let hit = false; for (let dy = -r; dy <= r && !hit; dy += 2) for (let dx = -r; dx <= r && !hit; dx += 2) if (inkSet.has((cy + dy) * UN + cx + dx)) hit = true; if (hit) on++; } }
      ok(o2 > 50 && on / o2 >= 0.7, `ⓘ 「क्रम」 다 그린 장면: 주황 획이 회색 글자 위(${innerWidth}×${innerHeight} · dpr ${devicePixelRatio})`, `${Math.round((100 * on) / Math.max(1, o2))}% · 주황 ${o2}`); }
    // ⓙ 다시 쓰기 점수 같음(본부 10-10 「100 뒤 다시 쓰면 68」) — 통과 → 바로(글자 소리 중) 지우기 → 같은 글씨 = 같은 점수 · 통과 소리 중 바로 그리기 · 꽝 → 자동 지우기 기다리는 중에 지우고 다시 그림 = 새 글씨 안 지워짐
    { if (!$("[data-act=hclear]")) { localStorage.setItem("malmun.wmode", "hand"); if (P()?.querySelector(".write")) document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(), await W(600); document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1600); document.querySelector("video")?.pause(); }
      for (let k = 0; k < 40 && wr()?.busy(); k++) await W(100);
      const H = wr().hand(), ch = H.ch, L = await wr().strokesOf(ch), good = L.map(S => wr().brushPath(ch, S).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 20)) === 0).map(q => [q.x, q.y]));
      const judge = async () => { $("[data-act=hdone]").click(); await W(300); return wr().hand().last?.pct ?? -1; };
      $("[data-act=hclear]").click(); await draw(good); const s1 = await judge(); // 통과 → 글자 소리 중
      $("[data-act=hclear]").click(); await W(50); await draw(good); const s2 = await judge();
      for (let k = 0; k < 40 && wr().busy(); k++) await W(100); await W(200); await draw(good.slice(0, 1)); const s3 = wr().hand().strokes.length; // 통과 뒤(소리 중) 바로 그리기 = 첫 획 받음
      $("[data-act=hclear]").click(); await draw(good.slice(0, 1)); const bad = await judge(); // 꽝 → 1.2초 뒤 자동 지우기 예정
      $("[data-act=hclear]").click(); await W(100); await draw(good); await W(1500); const kept = wr().hand().strokes.length; const s4 = wr().hand().passed ? wr().hand().last?.pct ?? -1 : await judge(); // 손 뗀 뒤 1.2초 자동 채점
      ok(s1 >= 95 && s2 === s1 && s3 >= 1 && bad < 80 && kept === good.length && s4 >= 95, "ⓙ 통과 → 지우기 → 같은 글씨 = 같은 점수 · 통과 소리 중 첫 획 받음 · 꽝 뒤 자동 지우기가 새 글씨 안 지움", `${s1}→${s2} · 소리 중 획 ${s3} · 꽝 ${bad} · 남은 획 ${kept}/${good.length} → ${s4}`);
      $("[data-act=hclear]").click(); await W(200); for (let k = 0; k < 40 && wr().busy(); k++) await W(100); }
    // ⓐ 기억 — 다른 줄 쓰기를 열어도 손글씨 그대로 · 마지막에 자판으로 돌려 둠
    document.querySelectorAll(".line")[1].querySelector("[data-act=write]").click(); await W(1500);
    ok(!!P().querySelector(".hand"), "ⓐ 다시 열어도 손글씨 그대로(기억)");
    P().querySelector("[data-mode=kb]").click(); await W(300);
    ok(!!P().querySelector(".kb") && localStorage.getItem("malmun.wmode") === "kb", "ⓐ ⌨ 누름 → 자판으로");
    document.querySelectorAll(".line")[1].querySelector("[data-act=write]").click(); await W(600); // 닫기(같은 단추 다시)
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " · " + String(e.stack || "").split(String.fromCharCode(10)).slice(1, 3).join(" ").replace(/ +/g, " ").slice(0, 160)); }
  localStorage.removeItem("malmun.wmode"); localStorage.removeItem("malmun.hbest");
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} ${innerWidth}x${innerHeight} 손글씨 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
