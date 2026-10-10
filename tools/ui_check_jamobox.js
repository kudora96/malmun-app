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
    else { let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); for (const ch of "어서오세요경복궁에온걸환영해대궁굴꿰뛔뽜쐐끼쬐놔뇨귀큉구예조요종게여") list.push(ch); while (list.length < 1000) list.push(String.fromCharCode(0xac00 + Math.floor(rnd() * 11172))); }
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
            for (const b of bands) { const c = (ry(b.y0) + ry(b.y1)) / 2; if (c < r[1] - 0.15 || c > r[3] + 0.02) continue; const sv = stem(b), d = Math.abs(c - tgt); if (sv > bs || (sv === bs && d < bd)) { bs = sv; bd = d; bb = b; } }
            if (!bb) { badH.push(`${ch}(${u.jamo} 띠 없음)`); return; }
            let tot = 0, cho = 0; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { tot++; if (us[own[y * N + x]].role === "cho") cho++; }
            if (cho > tot * 0.05) badH.push(`${ch}(${u.jamo} ${Math.round((100 * cho) / tot)}%)`);
          }
          if (u.role === "jung" && V.has(u.jamo)) { // 기둥 + 왼쪽 꼭지
            const colH = x => { let run = 0, best = 0, top = 0, bt = 0; for (let y = y0; y <= y1; y++) { if (own[y * N + x] === k) { if (!run) top = y; run++; if (run > best) { best = run; bt = top; } } else run = 0; } return [best, bt]; };
            let cx = -1, cy = [0, 0]; for (let x = x0; x <= x1; x++) { const [b, t] = colH(x); if (b >= 0.45 * Hd) { cx = x; cy = [t, t + b - 1]; break; } }
            if (cx < 0) return;
            let n = 0; for (let y = cy[0]; y <= cy[1]; y++) { const run = []; for (let x = cx - 1; x >= x0 && own[y * N + x] >= 0; x--) { let v = 0; for (let t = y; t >= y0 && own[t * N + x] >= 0; t--) v++; for (let t = y + 1; t <= y1 && own[t * N + x] >= 0; t++) v++; if (v >= 0.2 * Hd) break; run.push(y * N + x); } if (run.length && run.length <= 0.3 * Wd) n += run.filter(q => us[own[q]].role === "cho").length; }
            if (n > 0) badV.push(`${ch}(${u.jamo} ${n})`);
          }
        });
        if (i % 40 === 39) await W(0);
      }
      ok(!badH.length, `가로 모음 자리에 가로 줄 ${list.length}자`, badH.length ? `${badH.length}자 · ${badH.slice(0, 14).join(" ")}` : "");
      ok(!badV.length, `세로 모음 왼쪽 꼭지가 초성 몫 아님 ${list.length}자`, badV.length ? `${badV.length}자 · ${badV.slice(0, 14).join(" ")}` : ""); }
    // 자판 칠(본부 10-08) — 1편 글자 전부 · 한 자모씩 칠할 때 친 자모 잉크 덜 칠 < 2% · 안 친 자모로 넘침 < 1%
    { const chs = [...new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, ""))], badP = []; let wu = 0, wo = 0;
      for (const ch of chs) { const nb = wr.unitsOf(ch).length; for (let k = 1; k <= nb; k++) { const r = wr.paintCheck(ch, k); wu = Math.max(wu, r.under); wo = Math.max(wo, r.over); if (r.under >= 0.02 || r.over >= 0.01) badP.push(`${ch}${k}(${(r.under * 100).toFixed(1)}/${(r.over * 100).toFixed(1)})`); } await W(0); }
      ok(chs.length > 20 && !badP.length, `자판 칠 ${chs.length}자 · 친 자모 덜 칠 < 2% · 넘침 < 1%`, `최대 ${(wu * 100).toFixed(1)}% / ${(wo * 100).toFixed(1)}%${badP.length ? " · " + badP.slice(0, 10).join(" ") : ""}`); }
    $(".panel [data-act=close]")?.click();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 자모 나눔 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
