// 손글씨 바른 획 점수 전수(본부 10-12 「ㄱ·ㅈ+ㅓ 계열 바른 획 96~99」) — #/learn/L01-00-01 을 연 채로 · 편의 모든 글자 × 연필·펜·붓
// ⓐ 자료 획 길(brushPath) 그대로 그음 = 100 ⓑ 회색 가운데 길(글자부 strokefit · 앱 fitPath) 그대로 = 100 ⓒ 글자 가운데 선(centerOf · 조심스러운 학습자) = 100
// ⓓ 펜 굵기만큼 옆으로 비껴 그음(연필·펜) = 거의 다 80 아래(글자 모양상 가로획이 많아 겹치는 몇 자만 예외 · 5% 이하) ⓔ 투덜이 10-13 비뚤고 넘친 「나」「누」 = 80 아래
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode") };
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", "free");
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(2500);
    const wr = $(".panel .write")?.parentElement?.__wr; if (!wr) throw new Error("쓰기 창 없음");
    const ep = (location.hash.match(/learn\/([^/?]+)/) || [])[1] || "L01-00-01";
    const j = await (await fetch(`/data/${ep}/${ep}.json?` + Date.now())).json();
    const chars = [...new Set(((j.subtitles || []).map(l => l.ko).join("") + (window.__handChars || "전접경거기건겠쿼")).replace(/[^가-힣]/g, ""))]; // 편 대사 글자 전부 + 본부 결함 목록(10-12)
    const TW = { pencil: 0.04, pen: 0.07, brush: 0.12 }, T = Object.keys(TW), bad = { a: [], b: [], c: [] }, shiftPass = { pencil: [], pen: [] }; let n = 0;
    for (const ch of chars) {
      const list = await wr.strokesOf(ch); if (!list.length) continue; n++;
      const Qs = list.map(S => wr.brushPath(ch, S)), cen = wr.centerOf(ch);
      for (const tk of T) {
        const mk = P => Object.assign(P, { tool: tk, w: TW[tk] });
        const a = wr.handScore(ch, Qs.map(Q => mk(Q.map(q => [q.x, q.y])))).pct;
        const F = []; for (let i = 0; i < list.length; i++) F.push(await wr.fitPath(ch, i, tk));
        const b = wr.handScore(ch, F.map(Q => mk(Q.map(q => [q.x, q.y])))).pct;
        const c = wr.handScore(ch, cen.map(S => mk(S.map(p => [p[0], p[1]])))).pct;
        if (a < 100) bad.a.push(`${ch}(${tk} ${a})`); if (b < 100) bad.b.push(`${ch}(${tk} ${b})`); if (c < 100) bad.c.push(`${ch}(${tk} ${c})`);
        if (tk !== "brush" && wr.handScore(ch, Qs.map(Q => mk(Q.map(q => [q.x + TW.pen, q.y])))).pct >= 80) shiftPass[tk].push(ch);
      }
      if (n % 10 === 0) await W(0); // 화면 숨 돌림
    }
    // ⓔ 투덜이 10-13 폰 그림 재현(D:\malmun_work\hq_inboxA3_투덜이·3.png) — 비뚤고 넘친 「나」(붓 · 그때 99) · 「누」(펜 · 그때 100) = 80 아래(통과 못 함)
    const dens = P => { const o = []; for (let i = 1; i < P.length; i++) { const k = Math.ceil(Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) * 100); for (let m = 0; m < k; m++) o.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * m / k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * m / k]); } o.push(P[P.length - 1]); return o; };
    const ugly = [["나", "brush", [[[0.188, 0.19], [0.177, 0.661], [0.67, 0.626]], [[0.681, 0.156], [0.624, 0.993]], [[0.658, 0.443], [0.99, 0.443]]]], ["누", "pen", [[[0.302, 0.167], [0.302, 0.388], [0.826, 0.395]], [[0.105, 0.558], [0.884, 0.535]], [[0.535, 0.574], [0.547, 0.749], [0.488, 1.0]]]]];
    const bs = []; for (const [ch, tk, S] of ugly) { await wr.strokesOf(ch); bs.push([ch, wr.handScore(ch, S.map(P => Object.assign(dens(P), { tool: tk, w: TW[tk] }))).pct]); }
    ok(bs.every(([, v]) => v < 80), "ⓔ 비뚤고 넘친 글씨(투덜이 그림 재현) = 80 아래", bs.map(([c, v]) => `${c} ${v}`).join(" · "));
    // ⓕ 검사부 10-13(qa_hand_sloppy) — 바른 획 + 손 떨림(점마다 ±0.75% · 씨앗 7) = 95 이상 · 획마다 끝을 10% 휨 = 80 아래(붓 포함) · 13자 × 도구 3
    let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296) - 0.5; const jitLow = [], bendHigh = [];
    for (const ch of "나누가오이글자세종왕읽을웠") { const L = await wr.strokesOf(ch), P = L.map(S => wr.brushPath(ch, S));
      const dn = Q => { const o = []; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], k = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.003)); for (let m = 0; m < k; m++) o.push({ x: a.x + (b.x - a.x) * m / k, y: a.y + (b.y - a.y) * m / k }); } o.push(Q.at(-1)); return o; }; // 손가락처럼 촘촘한 점(0.3%)
      for (const tk of T) { const jr = wr.handScore(ch, P.map(Q => Object.assign(dn(Q).map(q => [q.x + rnd() * 0.015, q.y + rnd() * 0.015, 1]), { tool: tk, w: TW[tk] })), 300), j = jr.pct, jl = jr.lineP, sm = wr.handScore(ch, P.map(Q => Object.assign(dn(Q).map(q => [q.x, q.y, 1]), { tool: tk, w: TW[tk] })), 300).lineP;
        const b = wr.handScore(ch, P.map((Q, i) => Object.assign(Q.map((q, k) => { const r = k / Math.max(1, Q.length - 1); return [q.x + (i % 2 ? 0.1 : -0.1) * r, q.y + (i % 2 ? -0.06 : 0.06) * r, 1]; }), { tool: tk, w: TW[tk] }))).pct;
        if (!(j >= 80 && jl < 95 && jl >= 60 && sm >= 98)) jitLow.push(`${ch}(${tk} 모양 ${j} 선 ${jl} · 바른 선 ${sm})`); if (b >= 80) bendHigh.push(`${ch}(${tk} ${b})`); } }
    ok(!jitLow.length, "ⓕ 바르게 + 손 떨림(점마다 ±0.75% · 대표님 10-15 매끄러움) = 통과지만 선 95 아래(★ 없음) · 같은 획 떨림 없으면 선 98↑", jitLow.join(" "));
    ok(!bendHigh.length, "ⓕ 획 끝 10% 휨 = 80 아래(붓도)", bendHigh.join(" "));
    ok(n >= 90, `글자 ${n}자 × 도구 3 잼`, `${chars.length}자 중 획 자료 있는 것`);
    ok(!bad.a.length, "ⓐ 자료 획 길 그대로 = 100", bad.a.join(" "));
    ok(!bad.b.length, "ⓑ 회색 가운데 길 그대로 = 100", bad.b.join(" "));
    ok(!bad.c.length, "ⓒ 글자 가운데 선 = 100", bad.c.join(" "));
    ok(shiftPass.pencil.length <= n * 0.05 && shiftPass.pen.length <= n * 0.05, "ⓓ 펜 굵기만큼 비껴 그음(연필·펜) = 거의 다 80 아래", `통과한 글자 연필 ${shiftPass.pencil.join("") || "없음"} · 펜 ${shiftPass.pen.join("") || "없음"}`);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  try { for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
  $(".panel [data-act=close]")?.click();
  return res.join("\n");
})();
