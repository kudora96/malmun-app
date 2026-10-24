// 손글씨 자석 「착」·도구 바꿈·「스윽」 점검(본부 10-12 투덜이 PC 지적) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게
// ⓐ 자석 결과 = 회색 안: 1편 글자 × 연필·펜·붓 붙은 획 그림(snapMask)이 회색 밖 0 · 회색을 거의 다 채움 / 화면: 「그·게」「어·서」를 자석으로 써서 잉크가 회색 밖으로 나간 비율 ~0
// ⓑ 획 절반(55%)만 따라 그어도 나머지를 채워 붙음 ⓒ 한 번 쓰고 도구를 바꿔도 쓴 것이 남음(그 도구 모양 그대로) · 꽝 뒤 바꿔도 남음
// ⓓ 「스윽」: 자석 = 획 수만큼 · 손으로 그음 = 0 · 자동 완성 = 그린 획 수만큼 · 소리 둘이 0.3초 넘게 겹침 0
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode"), best: localStorage.getItem("malmun.hbest"), tool: localStorage.getItem("malmun.htool") };
  const wr = () => $(".panel .write")?.parentElement?.__wr, A = cv => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  const open = async li => { document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(1600); document.querySelector("video")?.pause(); };
  const swishes = () => (window.__sfxLog || []).filter(e => e.ev === "시작" && /^swish/.test(e.name)).length;
  const overlaps = log => { const iv = [], openS = new Map(); for (const e of log) { if (e.ev === "시작") (openS.get(e.name) || openS.set(e.name, []).get(e.name)).push(e.t); else { const a = openS.get(e.name)?.shift(); if (a != null) iv.push([a, e.t, e.name]); } }
    let n = 0; const ex = []; for (let i = 0; i < iv.length; i++) for (let j = i + 1; j < iv.length; j++) { const o = Math.min(iv[i][1], iv[j][1]) - Math.max(iv[i][0], iv[j][0]); if (o > 300) { n++; ex.push(`${iv[i][2]}×${iv[j][2]} ${o}ms`); } } return { n, ex }; };
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.removeItem("malmun.hbest"); localStorage.removeItem("malmun.htool"); localStorage.setItem("malmun.hmode", "magnet");
    await open(Math.min(14, document.querySelectorAll(".line").length - 1));
    // ⓐ 계산 — 1편 글자 × 도구 3
    { const chars = [..."어서오세요경복궁에온걸환영해선생님저글자만들었이건그림아니왜약속다같읽을수있야그게"], rows = [];
      for (const tk of ["pencil", "pen", "brush"]) { let out = 0, fill = 0, n = 0, worst = 0;
        for (const ch of chars) { const list = await wr().strokesOf(ch); if (!list.length) continue; const m = A(await wr().snapCv(ch, list.length - 1, tk)), g = A(wr().guideCv(ch, wr().guideW(tk), 400)); let a = 0, o = 0, gg = 0, f = 0;
          for (let i = 3; i < m.length; i += 4) { if (g[i] > 128) gg++; if (m[i] > 128) { a++; if (g[i] < 128) o++; } if (g[i] > 128 && m[i] > 128) f++; }
          out += a ? o / a : 0; fill += gg ? f / gg : 0; worst = Math.max(worst, a ? o / a : 0); n++; }
        rows.push({ tk, out: out / n, worst, fill: fill / n }); }
      ok(rows.every(r => r.worst < 0.001 && r.fill > 0.9), `ⓐ 자석 붙은 획 = 회색 안(1편 ${chars.length}자 × 도구 3 · 회색 밖 0 · 회색 채움)`, rows.map(r => `${r.tk} 밖 ${(r.out * 100).toFixed(2)}%(최대 ${(r.worst * 100).toFixed(2)}%) 채움 ${Math.round(r.fill * 100)}%`).join(" · ")); }
    // ⓐ·ⓑ·ⓓ 화면 — 도구마다 「그·게」(14줄)「어·서」(1줄)를 자석으로
    { const out = [], sw = []; let fine = true, half = null;
      for (const tk of ["pencil", "pen", "brush"]) for (const li of [Math.min(14, document.querySelectorAll(".line").length - 1), 0]) { localStorage.setItem("malmun.htool", tk); await open(li);
        for (let c = 0; c < 2; c++) { const H = wr().hand(), ch = H.ch; for (let k = 0; k < 30 && !H.magList; k++) await W(100); const list = H.magList || [];
          const iv = $(".panel .hink"), ev = (t, x, y) => { const r = iv.getBoundingClientRect(); iv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: "touch", clientX: r.left + x * r.width, clientY: r.top + y * r.height, buttons: 1 })); };
          const draw = async P => { ev("pointerdown", ...P[0]); for (const q of P) ev("pointermove", ...q); ev("pointerup", ...P[P.length - 1]); await W(250); };
          window.__sfxLog = []; const s0 = 0;
          for (let i = 0; i < list.length; i++) { const P = wr().brushPath(ch, list[i]).map(q => [q.x + 0.02, q.y + 0.02]), m0 = H.mag; if (i === 0 && tk === "pen" && li !== 0 && c === 0) { await draw(P.slice(0, Math.ceil(P.length * 0.55))); half = H.mag === m0 + 1; } else await draw(P.filter((_, j) => j % 3 === 0 || j === P.length - 1)); }
          await W(300); const nSw = swishes() - s0; sw.push(nSw === list.length);
          const n = iv.width, d = A(iv), g = A(wr().guideCv(ch, wr().guideW(tk), n)); let ink = 0, o = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { ink++; if (g[i] < 20) o++; }
          const r = ink ? o / ink : 1; if (!H.passed || r > 0.005 || nSw !== list.length) fine = false; out.push(`${tk}·${ch} 밖 ${(r * 100).toFixed(2)}% 스윽 ${nSw}/${list.length}${H.passed ? "" : " ✗안끝남"}`);
          for (let k = 0; k < 60 && wr().busy(); k++) await W(100); if (c === 0) { $(".panel [data-act=hnext]")?.click(); for (let k = 0; k < 80 && wr().hand() === H; k++) await W(100); await W(300); } } }
      ok(fine, "ⓐ 화면 자석 결과가 회색 안(연필·펜·붓 × 그·게·어·서 · 회색 밖 ≤0.5%) · ⓓ 획마다 「스윽」 한 번", out.join(" · "));
      ok(half === true, "ⓑ 자석: 획 절반(55%)까지 따라 그으면 나머지를 채워 붙음", String(half)); }
    // ⓒ 도구 바꿈 = 쓴 것 남음 (완전 수동)
    localStorage.setItem("malmun.hmode", "free"); localStorage.setItem("malmun.htool", "pen"); await open(Math.min(14, document.querySelectorAll(".line").length - 1));
    { const H = wr().hand(), ch = H.ch, list = await wr().strokesOf(ch), iv = $(".panel .hink"); let id = 40;
      const ev = (t, [x, y]) => { const r = iv.getBoundingClientRect(); iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height })); };
      const draw = async P => { ev("pointerdown", P[0]); for (const q of P) ev("pointermove", q); ev("pointerup", P[P.length - 1]); id++; await W(30); };
      const inkN = () => { const d = A(iv); let k = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 60) k++; return k; };
      window.__sfxLog = [];
      // ⓒ 도구 바꿈 = 쓴 획 지움(투덜이 10-12 「다른 도구를 고르면 기존 것을 자동으로 지우는 게 좋아」 · 본부) · 같은 도구 = 그대로 · 쓴 것 없으면 그대로 · 점수 칸 비움 · 회색 = 새 도구 굵기
      await draw(wr().brushPath(ch, list[0]).map(q => [q.x, q.y])); await W(300); const k0 = inkN();
      $(".panel [data-tool=pen]").click(); await W(400); const same = H.strokes.length === 1 && inkN() >= k0 * 0.95; // 같은 도구 다시 = 안 지움
      $(".panel [data-act=hdone]").click(); await W(300); const scored = !$(".panel .hscore").hidden;
      const g0 = A($(".panel .hguide")); let gp = 0; for (let i = 3; i < g0.length; i += 16) if (g0[i] > 60) gp++;
      $(".panel [data-tool=brush]").click(); await W(300);
      const g1 = A($(".panel .hguide")); let gb = 0; for (let i = 3; i < g1.length; i += 16) if (g1[i] > 60) gb++;
      const cleared = H.strokes.length === 0 && inkN() === 0 && $(".panel .hscore").hidden && !H.passed;
      await W(2600); const stay = H.strokes.length === 0; // 꽝 뒤 1.2초 자동 지우기·채점이 늦게 와도 다시 생기지 않음
      $(".panel [data-tool=pencil]").click(); await W(300); const empty = H.strokes.length === 0; // 쓴 것 없을 때 바꿈 = 그대로(오류 없음)
      await draw(wr().brushPath(ch, list[0]).map(q => [q.x, q.y])); await W(300); const again = H.strokes.length === 1 && H.strokes[0].tool === "pencil";
      ok(same && scored && cleared && stay && empty && again && gb > gp, "ⓒ 도구 바꿈 = 쓴 획 0 · 점수 칸 비움 · 회색 굵기 = 새 도구 · 같은 도구 = 그대로 · 바꾼 뒤 새 도구로 다시 씀", `같은 도구 ${same} · 점수 ${scored} · 지움 ${cleared} · 3초 뒤 ${stay} · 빈 칸 바꿈 ${empty} · 다시 ${again} · 회색 펜 ${gp} → 붓 ${gb}`);
      ok(swishes() === 0, "ⓓ 손으로 직접 그을 땐 「스윽」 없음", `${swishes()}`);
      $(".panel [data-act=hclear]")?.click(); await W(200); for (let k = 0; k < 40 && wr().busy(); k++) await W(100); }
    // ⓓ 자동 완성 = 그린 획 수만큼 「스윽」 · 겹침
    { await open(Math.min(14, document.querySelectorAll(".line").length - 1)); window.__sfxLog = []; const st = wr().st(), seen = [];
      $(".panel [data-act=auto]").click(); const t0 = performance.now();
      while (performance.now() - t0 < 9000) { const H = wr().hand(); if (H && !seen.includes(H)) seen.push(H); await W(50); }
      $(".panel [data-act=auto]").click(); await W(800);
      let full = 0, part = 0; for (const H of seen) { const n = (await wr().strokesOf(H.ch)).length; if (H === seen[seen.length - 1]) part = n; else full += n; }
      const n = swishes(), ov = overlaps(window.__sfxLog);
      ok(seen.length >= 2 && n >= full && n <= full + part, "ⓓ 자동 완성 = 획마다 「스윽」 한 번", `글자 ${seen.map(H => H.ch).join("")} · 스윽 ${n} (다 쓴 글자 획 ${full} + 마지막 글자 ≤${part})`);
      ok(ov.n === 0, "ⓓ 소리 둘이 0.3초 넘게 겹침 0(자동 완성 · 글자 소리 포함)", ov.ex.slice(0, 4).join(" · ") || `기록 ${window.__sfxLog.length}건`); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " · " + String(e.stack || "").split("\n").slice(1, 3).join(" ").replace(/ +/g, " ").slice(0, 160)); }
  for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode], ["malmun.hbest", keep.best], ["malmun.htool", keep.tool]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 손글씨 자석 착·도구·스윽 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
