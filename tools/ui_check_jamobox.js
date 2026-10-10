// 자모 나눔 점검(본부 10-08 — 11,172자 중 911자가 자모 하나를 통째로 잃어 자판 칠·획순·손글씨 판정이 한 칸씩 밀리던 것) — #/learn/L01-00-01 을 연 채로
// 쓰기 창을 열고 __wr.unitsOf(글자) 가 기본 자모 차례(초성·중성·종성 → 겹자모는 나눠서)와 같은지 · 칸마다 잉크가 있는지(전체 잉크의 1% 이상)
// 표본 1,000자(씨앗 고정) · window.__jamoAll = true 면 11,172자 전부(약 1분 반) · 40자마다 양보
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  try {
    const v = document.documentElement.dataset.v || "", J = await import(`/js/jamobox.js?v=${v}`);
    if (!$(".panel .write")) { document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500); document.querySelector("video")?.pause(); }
    const wr = $(".panel .write")?.parentElement?.__wr; if (!wr) throw new Error("쓰기 창 없음");
    const all = window.__jamoAll === true, list = [];
    if (all) for (let c = 0; c < 11172; c++) list.push(String.fromCharCode(0xac00 + c));
    else { let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); for (const ch of "어서오세요경복궁에온걸환영해대궁굴꿰뛔뽜쐐끼쬐놔뇨귀큉구예조요종게여") list.push(ch); for (const ch of new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, ""))) if (!list.includes(ch)) list.push(ch); /* 1편 글자 전부 */ while (list.length < 1000) list.push(String.fromCharCode(0xac00 + Math.floor(rnd() * 11172))); }
    await document.fonts?.load(wr.font(), list.join("")).catch(() => {});
    const bad = [], thin = [];
    for (let i = 0; i < list.length; i++) {
      const ch = list[i], s = J.split(ch), want = [s.cho, s.jung, s.jong].filter(Boolean).flatMap(J.baseOf).join(""), us = wr.unitsOf(ch), got = us.map(u => u.jamo).join("");
      if (want !== got) bad.push(`${ch}(${want}→${got})`);
      else { const tot = us.reduce((a, u) => a + u.px.length, 0) || 1; const t = us.filter(u => u.px.length < tot * 0.01).map(u => u.jamo); if (t.length) thin.push(`${ch}(${t.join("")})`); }
      if (i % 40 === 39) await W(0);
    }
    ok(!bad.length, `자모 차례 = 기본 자모(빠짐·밀림 0) ${list.length}자`, bad.length ? `${bad.length}자 · ${bad.slice(0, 12).join(" ")}` : "");
    ok(!thin.length, `칸마다 잉크 1% 이상 ${list.length}자`, thin.length ? `${thin.length}자 · ${thin.slice(0, 12).join(" ")}` : "");
    // 획 모양(본부 10-08 「구」「예」) — 가로 모음(ㅗㅛㅜㅠㅡ) 자리에 글자 폭 60%↑ 가로 줄이 2줄 이상 · 세로 모음 기둥 왼쪽 짧은 꼭지(폭 30% 이하)가 초성 몫이 아님
    { const N = 200, H = new Set("ㅗㅛㅜㅠㅡ"), V = new Set("ㅏㅐㅑㅒㅓㅔㅕㅖㅣ"), badH = [], badV = [];
      for (let i = 0; i < list.length; i++) {
        const ch = list[i], us = wr.unitsOf(ch); if (!us.length) continue;
        const own = new Int16Array(N * N).fill(-1); let x0 = N, x1 = -1, y0 = N, y1 = -1;
        us.forEach((u, k) => { for (const q of u.px) { own[q] = k; const x = q % N, y = (q / N) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
        const Wd = x1 - x0 + 1, Hd = y1 - y0 + 1;
        us.forEach((u, k) => {
          if (u.role === "jung" && H.has(u.jamo)) { // 가로 줄 띠(그 모음 칸 폭 60%↑ 잉크 줄 · 모음 자리에 가까운 띠) 중 초성 몫 < 5%
            const r = u.rect, xa = x0 + Math.floor(r[0] * Wd), xb = x0 + Math.ceil(r[2] * Wd) - 1, ry = y => (y - y0 + 0.5) / Hd, bands = []; let cur = null;
            for (let y = y0; y <= y1; y++) { let run = 0, best = null; for (let x = xa; x <= Math.min(x1, xb); x++) { if (own[y * N + x] >= 0) { run++; if (!best || run > best[2]) best = [x - run + 1, x, run]; } else run = 0; }
              if (best && best[2] >= 0.6 * (xb - xa + 1)) { if (cur && cur.y1 === y - 1) { cur.y1 = y; cur.runs.push([y, best[0], best[1]]); } else bands.push((cur = { y0: y, y1: y, runs: [[y, best[0], best[1]]] })); } else cur = null; }
            const tgt = /[ㅗㅛ]/.test(u.jamo) ? r[3] - 0.08 : /[ㅜㅠ]/.test(u.jamo) ? r[1] + 0.08 : (r[1] + r[3]) / 2; let bb = null, bd = Infinity;
            const down = /[ㅜㅠ]/.test(u.jamo), up = /[ㅗㅛ]/.test(u.jamo), stem = b => { let c = 0; for (const [y, xs, xe] of b.runs) for (let x = xs; x <= xe; x++) { for (let t = 1; t <= 3; t++) { const yy = down ? b.y1 + t : up ? b.y0 - t : y; if (yy >= 0 && yy < N && own[yy * N + x] === k) c++; } if (own[y * N + x] === k) c++; } return c; }; let bs = -1;
            for (const b of bands) { const c = (ry(b.y0) + ry(b.y1)) / 2; if (c < r[1] - 0.15 || c > r[3] + 0.15) continue; /* 아래 +0.15(고리 아래 띠 「혹」) */ const sv = stem(b), d = Math.abs(c - tgt); if (sv > bs || (sv === bs && d < bd)) { bs = sv; bd = d; bb = b; } }
            if (!bb) { badH.push(`${ch}(${u.jamo} 띠 없음)`); return; }
            const fw = ([y, xs, xe]) => { let a2 = xs, b2 = xe; while (a2 > 0 && own[y * N + a2 - 1] >= 0) a2--; while (b2 < N - 1 && own[y * N + b2 + 1] >= 0) b2++; return b2 - a2 + 1; }, wm = Math.max(...bb.runs.map(fw)); bb.runs = bb.runs.filter(r2 => fw(r2) >= 0.85 * wm); // 띠 = 가장 넓은 줄의 85%↑(앱 jamobox 와 같은 정의 · 10-10)
            let tot = 0, cho = 0; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { tot++; if (us[own[y * N + x]].role === "cho") cho++; }
            if (cho > tot * 0.05) badH.push(`${ch}(${u.jamo} ${Math.round((100 * cho) / tot)}%)`);
          }
          if (u.role === "jung" && V.has(u.jamo)) { // 기둥 + 왼쪽 꼭지
            const colH = x => { let run = 0, best = 0, top = 0, bt = 0; for (let y = y0; y <= y1; y++) { if (own[y * N + x] === k) { if (!run) top = y; run++; if (run > best) { best = run; bt = top; } } else run = 0; } return [best, bt]; };
            let cx = -1, cy = [0, 0]; { const cs = []; for (let x = x0; x <= x1; x++) cs.push([x, ...colH(x)]); const mx = Math.max(...cs.map(c => c[1])); if (mx >= 0.45 * Hd) { const f = cs.find(c => c[1] >= 0.85 * mx); cx = f[0]; cy = [f[2], f[2] + f[1] - 1]; } } // 기둥 = 가장 긴 세로 줄(앱과 같음 · 10-10)
            if (cx < 0) return;
            let n = 0; for (let y = cy[0]; y <= cy[1]; y++) { const run = []; for (let x = cx - 1; x >= x0 && own[y * N + x] >= 0; x--) { let v = 0; for (let t = y; t >= y0 && own[t * N + x] >= 0; t--) v++; for (let t = y + 1; t <= y1 && own[t * N + x] >= 0; t++) v++; if (v >= 0.2 * Hd) break; if (!run.length) run.v0 = v || 1; if (run.length >= 2 && v > 2.2 * run.v0 && v >= 0.15 * Hd) break; run.push(y * N + x); } /* 꼭지 두께 2.2배 넘는 세로 획에서 멈춤(앱과 같음 · 「경」 ㄱ 세로는 ㄱ 몫) */ if (run.length && run.length <= 0.3 * Wd) n += run.filter(q => us[own[q]].role === "cho").length; }
            if (n > 0) badV.push(`${ch}(${u.jamo} ${n})`);
          }
        });
        if (i % 40 === 39) await W(0);
      }
      const known = new Set("흈흓흕흤"); for (let i = badH.length - 1; i >= 0; i--) if (known.has(badH[i][0])) badH.splice(i, 1); // 알려진 4자(ㅎ+ㅠㅡ+겹받침 — 기본 나눔이 자모를 한 칸씩 밀어 잡음 · 앱 창 10-10 다음 차례)
      ok(!badH.length, `가로 모음 자리에 가로 줄 ${list.length}자`, badH.length ? `${badH.length}자 · ${badH.slice(0, 14).join(" ")}` : "");
      ok(!badV.length, `세로 모음 왼쪽 꼭지가 초성 몫 아님 ${list.length}자`, badV.length ? `${badV.length}자 · ${badV.slice(0, 14).join(" ")}` : ""); }
    // 부스러기·고리·기둥(본부 10-10 확대 확인 — 왕 ㅗ 기둥이 ㅇ 몫 · 했 ㅅ 머리 · 오 테두리 · 부스러기 1,257자)
    //  ⓐ 부스러기 = 자모 몫인데 본체와 안 이어지고 다른 자모에 닿은 조각 · 그 자모 30% 미만은 0 · 30% 넘는 덩어리(ㄲ ㅃ ㅋ + 세로 모음 겹침, 앱 창 10-10 80자)는 전수에서 80 이하(늘면 ✗)
    //  ⓑ 초성·받침 ㅇ ㅎ 는 자기 몫이 구멍을 둘러쌈(고리 통째가 모음 몫이던 「훅」「흑」「혹」 108자)
    //  ⓒ 왕 오 요 호 = ㅗ ㅛ 기둥 칸에서 고리(초성)와 모음이 같이 있는 줄 ≤ 2 · 형 = ㅕ 꼭지 줄에서 ㅎ 와 ㅕ 가 같이 있는 칸 ≤ 2 · 했 = ㅅ 두 개가 ㅎ 와 안 닿음
    { const N = 200, small = [], big = [], noHole = [], comps = (set, px) => { const seen = new Set(), out = []; for (const q0 of px) { if (seen.has(q0)) continue; const c = [], st = [q0]; seen.add(q0); while (st.length) { const q = st.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && set[j] && !seen.has(j)) { seen.add(j); st.push(j); } } out.push(c); } return out.sort((a, b) => b.length - a.length); };
      const hasHole = u => { if (!u.px.length) return false; const set = new Uint8Array(N * N); let a = N, b = N, c = -1, d = -1; for (const q of u.px) { set[q] = 1; const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } a--; b--; c++; d++; const Wd = c - a + 1, seen = new Uint8Array(Wd * (d - b + 1)), st = [], idx = (x, y) => (y - b) * Wd + (x - a); for (let x = a; x <= c; x++) for (const y of [b, d]) { seen[idx(x, y)] = 1; st.push([x, y]); } for (let y = b; y <= d; y++) for (const x of [a, c]) { seen[idx(x, y)] = 1; st.push([x, y]); }
        while (st.length) { const [x, y] = st.pop(); for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < a || ny < b || nx > c || ny > d) continue; const i = idx(nx, ny); if (seen[i]) continue; if (nx >= 0 && ny >= 0 && nx < N && ny < N && set[ny * N + nx]) continue; seen[i] = 1; st.push([nx, ny]); } } let h = 0; for (let y = b + 1; y < d; y++) for (let x = a + 1; x < c; x++) if (!set[y * N + x] && !seen[idx(x, y)]) h++; return h >= 6; };
      for (let i = 0; i < list.length; i++) {
        const ch = list[i], us = wr.unitsOf(ch), own = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) own[q] = k; });
        let s1 = 0, b1 = 0; us.forEach((u, k) => { const set = new Uint8Array(N * N); for (const q of u.px) set[q] = 1; for (const c of comps(set, u.px).slice(1)) { if (!c.some(q => { const x = q % N; return [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N].some(j => j >= 0 && own[j] >= 0 && own[j] !== k); })) continue; if (c.length < u.px.length * 0.3) s1++; else b1++; } });
        if (s1) small.push(ch); if (b1) big.push(ch);
        const ci = Math.floor((ch.charCodeAt(0) - 0xac00) / 588), ji = (ch.charCodeAt(0) - 0xac00) % 28;
        if ((ci === 11 || ci === 18) && !hasHole(us[0])) noHole.push(ch + "초"); if ((ji === 21 || ji === 27) && !hasHole(us[us.length - 1])) noHole.push(ch + "종");
        if (i % 40 === 39) await W(0);
      }
      ok(!small.length, `부스러기(자모 30% 미만 떨어진 조각) 0 · ${list.length}자`, small.length ? `${small.length}자 · ${small.slice(0, 14).join(" ")}` : "");
      ok(all ? big.length <= 80 : true, `떨어진 큰 덩어리(ㄲ ㅃ ㅋ 겹침) ${all ? "≤ 80" : "(표본 — 전수에서 ≤ 80)"} · ${list.length}자`, `${big.length}자${big.length ? " · " + big.slice(0, 10).join(" ") : ""}`);
      ok(!noHole.length, `ㅇ ㅎ 가 자기 고리(구멍) 가짐 · ${list.length}자`, noHole.length ? `${noHole.length}자 · ${noHole.slice(0, 14).join(" ")}` : "");
      const share = (ch, a, b, dir) => { const us = wr.unitsOf(ch), own = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) own[q] = k; }); const vb = us[b].box, lines = new Set();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const q = y * N + x; if (own[q] !== a) continue; for (const j of [q + 1, q - 1, q + N, q - N]) if (j >= 0 && j < N * N && own[j] === b) lines.add(dir === "row" ? y : x); } return lines.size; };
      // 고리 아래(구멍 바닥 + 고리 두께 1.4배 밑)에 초성 몫 잉크 0 = ㅗ ㅛ 기둥·다리는 모음 몫
      const stemBad = []; for (const ch of "왕오요호") { const us = wr.unitsOf(ch), set = new Uint8Array(N * N); for (const q of us[0].px) set[q] = 1; let hy1 = -1, hx1 = -1, bx1 = -1;
        { const seen = new Uint8Array(N * N), st = []; for (let i = 0; i < N; i++) for (const q of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!set[q] && !seen[q]) { seen[q] = 1; st.push(q); } while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && !set[j] && !seen[j]) { seen[j] = 1; st.push(j); } }
          for (let q = 0; q < N * N; q++) { if (set[q]) { bx1 = Math.max(bx1, q % N); continue; } if (!seen[q]) { hy1 = Math.max(hy1, (q / N) | 0); hx1 = Math.max(hx1, q % N); } } }
        const T = Math.max(2, bx1 - hx1), n = us[0].px.filter(q => ((q / N) | 0) > hy1 + 1.4 * T).length; if (hy1 < 0 || n > 0) stemBad.push(`${ch}(고리 아래 초성 ${n})`); }
      { const n = share("형", 0, 1, "col"); if (n > 2) stemBad.push(`형(${n}칸)`); }
      { const us = wr.unitsOf("했"), own = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) own[q] = k; }); let t = 0; for (const q of us[0].px) for (const j of [q + 1, q - 1, q + N, q - N]) if (j >= 0 && j < N * N && us[own[j]]?.jamo === "ㅅ") t++; if (t > 0) stemBad.push(`했(ㅎ·ㅅ 닿음 ${t})`); }
      ok(!stemBad.length, "기둥·꼭지 = 모음 몫(왕 오 요 호 = ㅗ ㅛ 기둥 · 형 = ㅕ 꼭지 · 했 = ㅅ 머리 ㅎ 몫 아님)", stemBad.join(" ")); }
    // 획 자료 맞춤(본부 10-10 — 「복」 ㅂ 아래 가로가 ㅗ 몫인 퇴행을 기계가 잡게) — 자모마다 jamo_strokes 획(그 자모 상자에 맞춘 점 줄)을 1칸 간격으로 따라 점의 85%↑ 가 그 자모 잉크(±3칸) 안 · 다른 자모 잉크에 든 점 < 10%
    { const N = 200, badS = [];
      for (let i = 0; i < list.length; i++) {
        const ch = list[i], us = wr.unitsOf(ch), L = await wr.strokesOf(ch), own = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) own[q] = k; });
        const near = (x, y, k) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N && own[yy * N + xx] === k) return true; } return false; };
        const st = us.map(() => [0, 0, 0]);
        for (const S of L) { const P = S.pts.map(([x, y]) => [x * N, y * N]), k = S.unit; if (k == null || !st[k]) continue; const pts = P.length === 1 ? P : []; for (let a = 1; a < P.length; a++) { const n = Math.max(1, Math.ceil(Math.hypot(P[a][0] - P[a - 1][0], P[a][1] - P[a - 1][1]))); for (let t = 0; t <= n; t++) pts.push([P[a - 1][0] + ((P[a][0] - P[a - 1][0]) * t) / n, P[a - 1][1] + ((P[a][1] - P[a - 1][1]) * t) / n]); }
          for (const [x, y] of pts) { const xi = Math.round(x), yi = Math.round(y); st[k][0]++; if (near(xi, yi, k)) st[k][1]++; else { const o = xi >= 0 && yi >= 0 && xi < N && yi < N ? own[yi * N + xi] : -1; if (o >= 0 && o !== k) st[k][2]++; } } }
        const bad = st.map((v, k) => (v[0] && (v[1] < 0.85 * v[0] || v[2] >= 0.1 * v[0]) ? `${us[k].jamo}${Math.round((100 * v[1]) / v[0])}/${Math.round((100 * v[2]) / v[0])}` : "")).filter(Boolean);
        if (bad.length) badS.push(`${ch}(${bad.join(" ")})`);
        if (i % 40 === 39) await W(0);
      }
      window.__strokeFitBad = badS;
      // 남의 잉크 10%↑ = 나눔 잘못(퇴행 잡기) — 1편 글자 0 · 전수 263 이하(10-10 기준: ㄲ ㅃ ㅆ ㅉ + 겹모음 · 다음 차례) · 표본은 35 이하
      //  제 잉크 85% 미만인데 남의 잉크 < 10% = 획 자료(곧은 선)와 글꼴 곡선 차이(「가」 ㄱ 81%) → 알림만
      const other = badS.filter(x => [...x.matchAll(/(\d+)\/(\d+)/g)].some(m => +m[2] >= 10)), soft = badS.length - other.length;
      const ep = new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, "")), epBad = other.filter(x => ep.has(x[0]));
      ok(!epBad.length && other.length <= (all ? 263 : 35), `획 자료 맞춤 — 남의 잉크 10%↑(나눔 잘못) ${all ? "≤ 263" : "≤ 35(표본)"} · 1편 글자 0 · ${list.length}자`, `${other.length}자${epBad.length ? " · 1편 " + epBad.join(" ") : ""}${other.length ? " · " + other.slice(0, 8).join(" ") : ""} · (알림: 제 잉크 85% 미만만 ${soft}자 — 획 자료 곧은 선 vs 글꼴 곡선)`);
    }
    // 자판 칠(본부 10-08) — 1편 글자 전부 · 한 자모씩 칠할 때 친 자모 잉크 덜 칠 < 2% · 안 친 자모로 넘침 < 1%
    { const chs = [...new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, ""))], badP = []; let wu = 0, wo = 0;
      for (const ch of chs) { const nb = wr.unitsOf(ch).length; for (let k = 1; k <= nb; k++) { const r = wr.paintCheck(ch, k); wu = Math.max(wu, r.under); wo = Math.max(wo, r.over); if (r.under >= 0.02 || r.over >= 0.01) badP.push(`${ch}${k}(${(r.under * 100).toFixed(1)}/${(r.over * 100).toFixed(1)})`); } await W(0); }
      ok(chs.length > 20 && !badP.length, `자판 칠 ${chs.length}자 · 친 자모 덜 칠 < 2% · 넘침 < 1%`, `최대 ${(wu * 100).toFixed(1)}% / ${(wo * 100).toFixed(1)}%${badP.length ? " · " + badP.slice(0, 10).join(" ") : ""}`); }
    $(".panel [data-act=close]")?.click();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 자모 나눔 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
