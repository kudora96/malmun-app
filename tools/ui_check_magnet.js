// 손글씨 반자동(자석) 점검(본부 10-10 투덜이) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게
// ⓐ 🧲 단추 = 도구 단추 옆 · 한 줄(넘침·겹침 0) · 누르면 켜짐 표시·기억 ⓑ 순서 번호가 먼저 뜸 ⓒ 획 근처를 대충(칸 3% 비껴) 차례대로 그으면 가운데 선으로 붙음 → 다 하면 「✓ 순서 맞음」(% 없음 · 최고 점수 기록 없음)
// ⓓ 순서 틀리면 그 획은 안 붙고 「순서 다시: N번」 ⓔ 아무 데나 그으면 안 붙음 ⓕ 완전 수동으로 돌아가면 % 점수 그대로
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode"), best: localStorage.getItem("malmun.hbest") };
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.removeItem("malmun.hmode"); localStorage.removeItem("malmun.hbest");
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1600); document.querySelector("video")?.pause();
    const wr = () => $(".panel .write")?.parentElement?.__wr;
    const mb = $(".panel [data-hmode]"); if (!mb) throw new Error("🧲 단추 없음");
    // ⓐ
    const row = mb.parentElement, rr = row.getBoundingClientRect(), bs = [...row.querySelectorAll("button")].map(b => b.getBoundingClientRect());
    const oneRow = bs.every(b => Math.abs(b.top - bs[0].top) < 3), inside = bs.every(b => b.right <= rr.right + 1 && b.left >= rr.left - 1) && document.documentElement.scrollWidth <= innerWidth + 1;
    const overlap = bs.some((a, i) => bs.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    mb.click(); await W(1200); const mb2 = $(".panel [data-hmode]");
    ok(oneRow && inside && !overlap && mb2?.getAttribute("aria-pressed") === "true" && localStorage.getItem("malmun.hmode") === "magnet", `ⓐ 🧲 자석 단추 = 도구 옆 한 줄 · 넘침·겹침 0 · 누르면 켜짐·기억 (${innerWidth}×${innerHeight})`, `한 줄 ${oneRow} · 안 ${inside} · 겹침 ${overlap}`);
    // 획 자료
    const H = wr().hand(), ch = H.ch, list = await wr().strokesOf(ch); for (let k = 0; k < 30 && !H.magList; k++) await W(100);
    ok(!!H.magList?.length, "ⓑ 순서 번호(획 자료) 준비", `${ch} 획 ${list.length}`);
    const iv = $(".panel .hink"), r = () => iv.getBoundingClientRect();
    const ev = (t, x, y) => { const R = r(); iv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: "touch", clientX: R.left + x * R.width, clientY: R.top + y * R.height, buttons: 1 })); };
    const draw = async (pts, off = 0.03) => { ev("pointerdown", pts[0].x + off, pts[0].y + off); for (const q of pts) ev("pointermove", q.x + off, q.y + off); ev("pointerup", pts[pts.length - 1].x + off, pts[pts.length - 1].y + off); await W(250); };
    const path = S => wr().brushPath(ch, S).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 25)) === 0);
    // ⓔ 아무 데나
    await draw([{ x: 0.02, y: 0.95 }, { x: 0.1, y: 0.97 }], 0); const bub0 = $(".panel .hbubble")?.textContent || "";
    ok(H.strokes.length === 0 && H.mag === 0, "ⓔ 회색 획과 먼 곳 = 안 붙음", `획 ${H.strokes.length} · 「${bub0}」`);
    // ⓓ 순서 틀림(2번 획을 먼저)
    if (list.length > 1) { await draw(path(list[1])); const bub = $(".panel .hbubble")?.textContent || "";
      ok(H.strokes.length === 0 && H.mag === 0 && /1/.test(bub), "ⓓ 순서 틀림 = 안 붙음 · 「순서 다시: 1번」", `「${bub}」`); }
    // ⓒ 차례대로(칸 3% 비껴)
    for (const S of list) await draw(path(S));
    await W(500); const sc = $(".panel .hscore")?.textContent || "";
    const snapped = H.strokes.every((S, i) => S.length === wr().brushPath(ch, list[i]).length);
    ok(H.passed && /✓/.test(sc) && !/%/.test(sc) && snapped && !localStorage.getItem("malmun.hbest"), "ⓒ 대충 차례대로 = 가운데 선으로 붙음 · 「✓ 순서 맞음」(% 없음 · 최고 점수 기록 없음)", `「${sc}」 · 붙음 ${snapped} · 획 ${H.strokes.length}/${list.length}`);
    // ⓕ 완전 수동으로
    for (let k = 0; k < 40 && wr().busy(); k++) await W(100);
    $(".panel [data-hmode]").click(); await W(1200); const H2 = wr().hand();
    ok($(".panel [data-hmode]")?.getAttribute("aria-pressed") === "false" && !H2.passed && localStorage.getItem("malmun.hmode") === "free", "ⓕ 다시 누르면 완전 수동(처음부터)");
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode], ["malmun.hbest", keep.best]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  $(".panel [data-act=close]")?.click();
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 손글씨 자석 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
