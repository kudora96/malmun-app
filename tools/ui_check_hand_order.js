// 손글씨 획순 칠 · 자동 손글씨 · 자동 멈춤 점검(본부 10-07 투덜이 「구」「나」 사진) — #/learn/L01-00-01 을 연 채로 · 소리는 아주 작게
// ⓐ 획순 칠(revealOrder) 「구·나·세·왕·읽·싶·했」: 회색 글자 잉크 밖 주황 0 · 획마다 새로 칠한 면적 > 0(「나」 ㅏ 짧은 획 포함) · 다 칠하면 글자 대부분 덮음
// ⓑ 손글씨 자동: 한 토막 끝까지 저절로(글자마다 획 칠 → 소리 → 다음) · 자동으로 쓴 글자는 위 줄 「직접 씀」 초록 아님
// ⓒ 자동 중 다시 누름 = 바로 멈춤(손글씨 · 자판 둘 다) — 멈춘 뒤 글자가 더 안 넘어감 · 단추 글 「स्वतः पूरा」로
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  try {
    const P = () => document.querySelector(".panel"), $ = s => P().querySelector(s), wr = () => P().querySelector(".write")?.parentElement?.__wr;
    // ⓓ 쓰기 창 막 연 직후 바로 「क्रम」(본부 10-07 1280×720 — 주황 글자가 칸 왼쪽 위에 작게) → 다 칠한 장면(지우기 전) 주황 테두리 상자 = 회색 글자 테두리 상자 ±5%
    { localStorage.setItem("malmun.wmode", "hand"); const L = document.querySelectorAll(".line"), li = L.length - 1;
      L[li].querySelector("[data-act=write]").click(); await W(60); for (let k = 0; k < 40 && !wr(); k++) await W(25);
      P().querySelector("[data-seg=\"1\"]")?.click(); await W(30); { const gv0 = $(".hguide"); gv0.width = gv0.height = 60; } // 창이 아직 자리 잡기 전(칸 60px)에 잰 상태를 흉내
      P().querySelector("[data-act=horder]")?.click(); await W(120); wr().hand().fit(); await W(100); // 그 뒤 칸이 제 크기로(ResizeObserver)
      await W(1400); for (let k = 0; k < 120 && !wr().hand().orderShown; k++) await W(25); // 1.6초 장면(크기) → 다 그린 바로 그 장면(1초 뒤 지우기 전)
      const gv = $(".hguide"), n = gv.width, d = gv.getContext("2d").getImageData(0, 0, n, n).data, ch = wr().hand().ch, g = wr().glyphCv(ch, n).getContext("2d").getImageData(0, 0, n, n).data;
      const bb = test => { let x0 = n, y0 = n, x1 = -1, y1 = -1; for (let i = 0; i < n * n; i++) if (test(i * 4)) { const x = i % n, y = (i / n) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
      const ob = bb(i => d[i] > 150 && d[i + 1] < 140 && d[i + 2] < 90 && d[i + 3] > 200), gb = bb(i => g[i + 3] > 128), off = Math.max(...ob.map((v, k) => Math.abs(v - gb[k]))) / n;
      ok(ob[2] > 0 && off <= 0.05 && n > 100, `ⓓ 쓰기 창 연 직후 바로 획순 → 주황이 회색 글자와 같은 자리·크기(${innerWidth}×${innerHeight} · dpr ${devicePixelRatio} · 「${ch}」)`, `주황 ${ob.join(",")} · 회색 ${gb.join(",")} · 칸 ${n}px · 어긋남 ${(off * 100).toFixed(1)}%`);
      L[li].querySelector("[data-act=write]").click(); await W(600); }
    localStorage.removeItem("malmun.wmode");
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500);
    $("[data-mode=hand]").click(); await W(800);
    // ⓐ
    const alphaOf = cv => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    const rows = [], bads = [];
    for (const ch of ["구", "나", "세", "왕", "읽", "싶", "했"]) {
      const { list, at } = await wr().reveal(ch, 200), g = alphaOf(wr().glyphCv(ch, 200));
      if (!list.length) { bads.push(`${ch} 획 자료 없음`); continue; }
      let prev = 0, out = 0, gN = 0; const areas = [];
      for (let k = 0; k < list.length; k++) { const a = alphaOf(at(k).cv); let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] > 40) n++; areas.push(n - prev); prev = n;
        if (k === list.length - 1) for (let i = 3; i < a.length; i += 4) { if (g[i] > 40) gN++; if (a[i] > 40 && g[i] <= 40) out++; } }
      const cover = gN ? prev / gN : 0;
      if (out || areas.some(v => v <= 0) || cover < 0.97) bads.push(`${ch} 밖 ${out} · 획 면적 ${areas.join("/")} · 덮음 ${(cover * 100).toFixed(0)}%`);
      rows.push(`${ch} ${list.map(S => S.jamo).join("")} ${areas.join("/")} · ${(cover * 100).toFixed(0)}%`);
    }
    ok(!bads.length, "ⓐ 획순 칠 = 글자 잉크 안만 · 획마다 칠 > 0 · 다 칠하면 97%+ 덮음(빠짐없이)", bads.join(" · ") || rows.join(" | "));
    // ⓑ 손글씨 자동 — 지금 토막 끝까지
    const S0 = wr().st(), seg = S0.s, n0 = $(".sent").querySelectorAll(".c").length;
    $("[data-act=auto]").click(); await W(400);
    const autoTxt = $("[data-act=auto]").textContent; let painted = false;
    for (let i = 0; i < 400 && wr()?.st().auto; i++) { await W(100); if (!painted && wr().hand()) { const gv = $(".hguide"), d = gv.getContext("2d").getImageData(0, 0, gv.width, gv.height).data; for (let k = 0; k < d.length; k += 16) if (d[k] > 150 && d[k + 1] < 140 && d[k + 2] < 90 && d[k + 3] > 200) { painted = true; break; } } }
    const S1 = wr().st();
    ok(/⏹/.test(autoTxt) && painted && (S1.s > seg || !S1.auto) && S1.wrote.size === 0, "ⓑ 손글씨 자동 → 획 주황 칠 보임 · 토막 끝까지 · 자동으로 쓴 글자는 초록 아님", `단추 「${autoTxt}」 · 칠 ${painted} · 토막 ${seg}→${S1.s} · 글자 ${n0} · 직접 씀 ${S1.wrote.size}`);
    // ⓒ 멈춤 — 손글씨
    await W(1500);
    { const a0 = wr().st(); $("[data-act=auto]").click(); await W(900); const before = `${a0.s}.${wr().st().w}.${wr().st().c}`;
      $("[data-act=auto]").click(); const now = wr().st().auto; await W(2500); const after = `${wr().st().s}.${wr().st().w}.${wr().st().c}`;
      ok(!now && before === after && !/⏹/.test($("[data-act=auto]").textContent), "ⓒ 손글씨 자동 중 다시 누름 → 바로 멈춤 · 글자 안 넘어감", `${before} → ${after} · 단추 「${$("[data-act=auto]").textContent}」`); }
    // ⓒ 멈춤 — 자판
    $("[data-mode=kb]").click(); await W(600);
    { $("[data-act=auto]").click(); await W(700); const b = `${wr().st().w}.${wr().st().c}.${wr().st().k}`;
      $("[data-act=auto]").click(); const now = wr().st().auto; await W(2000); const a = `${wr().st().w}.${wr().st().c}.${wr().st().k}`;
      ok(!now && a === b && !/⏹/.test($("[data-act=auto]").textContent), "ⓒ 자판 자동 중 다시 누름 → 바로 멈춤 · 더 안 침", `${b} → ${a}`); }
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(600);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  localStorage.removeItem("malmun.wmode"); localStorage.removeItem("malmun.hbest");
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} ${innerWidth}x${innerHeight} 획순·자동 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
