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
    const keys = j => j.L.map(o => o.k || "raw"), bad = [];
    for (const ch of ["나", "세", "어", "을", "왕"]) {
      const L = await wr.strokesOf(ch), N = L.length, fp = []; for (let i = 0; i < N; i++) fp.push((await wr.fitPath(ch, i, "pen")).map(q => [q.x, q.y, 1]));
      const cut = (S, f) => S.slice(0, Math.max(2, Math.round(S.length * f))), all = () => fp.map(S => S.slice());
      const len = S => S.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - S[i - 1][0], p[1] - S[i - 1][1]) : 0), 0), lk = fp.map(len).reduce((b, v, i, A) => (v > A[b] ? i : b), 0); // 가장 긴 획(짧은 획은 이웃 획 회색에 덮여 빠져도 「짧음」)
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
      ];
      for (const [nm, S, want, tu] of cases) { const j = await wr.judge(ch, S, !!tu); if (!want(j)) bad.push(`${ch} ${nm}: ${j.pct}% ${keys(j).join(",")}`);
        if (j.L.length > 3) bad.push(`${ch} ${nm}: ${j.L.length}줄(3줄 넘음)`); }
    }
    ok(!bad.length, "채점 설명이 잘못을 짚음(나·세·어·을·왕 × 완벽·빠짐·방향·순서·짧음·자리·크기·남는 선·시간 · 3줄 이하)", bad.slice(0, 8).join(" · "));
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
    const fx = $(".panel .hfix"), d = fx.getContext("2d").getImageData(0, 0, fx.width, fx.height).data; let px = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) px++;
    ok(px > 50, "꽝 뒤 칸에 맞는 획 주황 점선·번호가 그려짐", `${px}px`);
    await W(2300); const d2 = fx.getContext("2d").getImageData(0, 0, fx.width, fx.height).data; let px2 = 0; for (let i = 3; i < d2.length; i += 4) if (d2[i] > 0) px2++;
    ok(px2 === 0 && ps.length === [...jb.querySelectorAll("p")].filter(p => !p.hidden).length, "2초 뒤 점선은 사라지고 판정 글은 남음", `${px2}px`);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode);
  keep.hm == null ? localStorage.removeItem("malmun.hmode") : localStorage.setItem("malmun.hmode", keep.hm);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 채점 설명 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
