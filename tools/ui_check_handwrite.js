// 손글씨 따라 쓰기 1단계 점검(본부 10-07 투덜이 「ㅇ」) — #/learn/L01-00-01 을 연 채로 크기마다 실행 · 소리는 아주 작게
// ⓐ 모드 단추 ⌨/✍ (단추 모양 · 고른 것 기억) ⓑ 손글씨 칸 = 정사각 · 창 안 · 스크롤 0 · 자판 없음 · 다른 칸과 안 겹침
// ⓒ 글자 모양 그대로 따라 그린 획(마스크 가로 훑기 · 진짜 pointer 이벤트) + ✓ → 통과 · 다음 글자 ⓓ 엉뚱한 낙서 → 실패 · 「다시」 · 같은 글자
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
    // ⓓ 낙서 → 실패
    const zig = [Array.from({ length: 14 }, (_, i) => [0.05 + 0.065 * i, i % 2 ? 0.08 : 0.2]), Array.from({ length: 14 }, (_, i) => [0.05 + 0.065 * i, i % 2 ? 0.9 : 0.78])];
    await draw(zig); $("[data-act=hdone]").click(); await W(700);
    const sc1 = wr().hand().last?.score ?? -1, noteTxt = P().querySelector(".loopnote")?.textContent || "";
    ok(sc1 >= 0 && sc1 < 0.7 && wr().hand().ch === ch0 && /\d+%/.test(noteTxt), "ⓓ 엉뚱한 낙서 → 실패 · 「다시」 문구 · 같은 글자", `점수 ${Math.round(sc1 * 100)}% · 「${noteTxt}」`);
    const y1 = [window.scrollY, p.scrollTop, sc.scrollTop, document.querySelector(".learn")?.scrollTop ?? 0].join(",");
    ok(ta === "none" && y0 === y1, "ⓖ 그리는 동안 화면·창 안 움직임(touch-action none)", `${ta} · ${y0} → ${y1}`);
    // ⓔ 되돌리기·지우기
    $("[data-act=hclear]").click(); await draw([[[0.2, 0.2], [0.8, 0.2]], [[0.2, 0.5], [0.8, 0.5]]]); await W(100);
    const n2 = wr().hand().strokes.length; $("[data-act=hundo]").click(); const n1 = wr().hand().strokes.length; $("[data-act=hclear]").click(); const n0 = wr().hand().strokes.length;
    ok(n2 === 2 && n1 === 1 && n0 === 0, "ⓔ 한 획 되돌리기 2→1 · 지우기 → 0", `${n2}→${n1}→${n0}`);
    // ⓒ 따라 그리기 → 통과 · 다음 글자
    await W(1300);
    const tr = wr().traceOf(ch0), sTr = wr().handScore(ch0, tr).score;
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100);
    await draw(tr); $("[data-act=hdone]").click(); for (let k = 0; k < 80 && wr().hand() === H0; k++) await W(100);
    const H1 = wr().hand();
    ok(sTr >= 0.7 && H1 !== H0 && H1.ch !== undefined, "ⓒ 글자 모양 따라 그림 → 통과 → 다음 글자", `「${ch0}」 ${Math.round(sTr * 100)}% → 다음 「${H1.ch}」`);
    // ⓕ 손 뗀 채 1.2초 → 저절로
    for (let k = 0; k < 60 && wr().busy(); k++) await W(100); // 앞 글자 소리 끝날 때까지(소리 중엔 그리기 안 받음)
    const ch1 = H1.ch; await draw(wr().traceOf(ch1)); for (let k = 0; k < 100 && wr().hand() === H1; k++) await W(100); // 1.2초 뒤 판정 → 글자 소리 → 다음(최대 10초)
    ok(wr().hand() !== H1, "ⓕ 다 그리고 손 뗀 채 1.2초 → 저절로 판정 · 다음으로", `「${ch1}」 → 「${wr().hand()?.ch}」`);
    // ⓐ 기억 — 다른 줄 쓰기를 열어도 손글씨 그대로 · 마지막에 자판으로 돌려 둠
    document.querySelectorAll(".line")[1].querySelector("[data-act=write]").click(); await W(1500);
    ok(!!P().querySelector(".hand"), "ⓐ 다시 열어도 손글씨 그대로(기억)");
    P().querySelector("[data-mode=kb]").click(); await W(300);
    ok(!!P().querySelector(".kb") && localStorage.getItem("malmun.wmode") === "kb", "ⓐ ⌨ 누름 → 자판으로");
    document.querySelectorAll(".line")[1].querySelector("[data-act=write]").click(); await W(600); // 닫기(같은 단추 다시)
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  localStorage.removeItem("malmun.wmode");
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} ${innerWidth}x${innerHeight} 손글씨 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
