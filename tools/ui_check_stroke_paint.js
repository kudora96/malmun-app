// 획순 칠(붓 그리기) 점검(본부 10-08 투덜이 「요」) — #/learn/L01-00-01 을 연 채로 · 1편 글자 전부 + 표본 300자(window.__strokeN 으로 바꿈)
// 획마다 끝 장면: (a) 주황 ⊂ 글자 잉크 (b) 이번 획에 새로 칠한 곳 = 이어진 한 덩어리(마지막 장면 = 남은 잉크 전부라 뺌) (c) 아직 안 그은 획 자리(가운데 선 둘레 굵기 절반 · 앞 획 자리 뺌)에 미리 주황 < 3% (d) 마지막 장면 회색 0
// window.__strokeSheet = true 면 1편 글자들의 획마다 장면을 화면 위 판으로 띄움(본부 눈 확인용 · 다시 부르면 닫힘)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const n = 200;
  try {
    if (!$(".panel .write")) { document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500); document.querySelector("video")?.pause(); }
    const wr = $(".panel .write")?.parentElement?.__wr; if (!wr) throw new Error("쓰기 창 없음");
    const ep = [...new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, ""))];
    let sd = 11; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296), more = [];
    while (more.length < (window.__strokeN ?? 300)) more.push(String.fromCharCode(0xac00 + Math.floor(rnd() * 11172)));
    const list = [...new Set([...ep, ...more])];
    await document.fonts?.load(wr.font(), list.join("")).catch(() => {});
    const alphaOf = cv => { const d = cv.getContext("2d").getImageData(0, 0, n, n).data, a = new Uint8Array(n * n); for (let i = 0; i < n * n; i++) a[i] = d[i * 4 + 3]; return a; };
    const segD = (P, x, y) => { if (P.length === 1) return Math.hypot(x - P[0][0], y - P[0][1]); let b = Infinity; for (let i = 1; i < P.length; i++) { const ax = P[i - 1][0], ay = P[i - 1][1], dx = P[i][0] - ax, dy = P[i][1] - ay, l = dx * dx + dy * dy || 1e-9, r = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)); b = Math.min(b, Math.hypot(x - ax - dx * r, y - ay - dy * r)); } return b; };
    const bad = { a: [], b: [], c: [], d: [] }; let worstC = 0, scenes = 0;
    const sheet = []; // [ch, [cv...]]
    for (let ci = 0; ci < list.length; ci++) {
      const ch = list[ci], R = await wr.reveal(ch, n), L = R.list; if (!L.length) continue;
      const G = alphaOf(wr.glyphCv(ch, n)), ink = i => G[i] >= 128;
      // 획 자리 = 앱의 붓 길(잉크 가운데로 옮긴 선) 둘레 실제 잉크 폭 절반
      const mk = f => L.map(S => { const m = new Uint8Array(n * n); for (const q of wr.brushPath(ch, S)) { const r = (q.w * f / 2) * n, cx = q.x * n, cy = q.y * n; for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(n - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(n - 1, Math.ceil(cx + r)); x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r && ink(y * n + x)) m[y * n + x] = 1; } return m; }), near = mk(1 / 1.15), wide = mk(1); // near = 그 획 실제 잉크 폭 · wide = 앱 붓 폭(이미 그은 획이 정당하게 칠한 곳)
      let prev = new Uint8Array(n * n), cvs = [];
      for (let k = 0; k < L.length; k++) {
        const sc = R.at(k, 1), O = alphaOf(sc.cv); scenes++; if (ci < ep.length) cvs.push(sc.cv);
        let out = 0, inkN = 0; for (let i = 0; i < n * n; i++) { if (ink(i)) inkN++; if (O[i] >= 128 && G[i] < 32) out++; } if (out > inkN * 0.002) bad.a.push(`${ch}${k + 1}`);
        // (b) 새로 칠한 곳 덩어리 수
        const nw = new Uint8Array(n * n); let nN = 0; for (let i = 0; i < n * n; i++) if (O[i] >= 128 && !prev[i]) { nw[i] = 1; nN++; }
        const seen = new Uint8Array(n * n); let comps = 0; for (let i = 0; i < n * n; i++) { if (!nw[i] || seen[i]) continue; let sz = 0; const st = [i]; seen[i] = 1; while (st.length) { const q = st.pop(); sz++; const x = q % n, y = (q / n) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if ((nw[j] || (prev[j] && near[k][j])) && !seen[j]) { seen[j] = 1; st.push(j); } } } if (sz >= Math.max(30, nN * (k === L.length - 1 ? 0.03 : 0.02))) comps++; /* 30px(200칸 기준)·새로 칠한 곳 2% 미만 실선 조각은 덩어리로 안 셈(10-10) */ }
        if (nN && comps !== 1 && k < L.length - 1) bad.b.push(`${ch}${k + 1}(${comps})`);
        // (c) 아직 안 그은 획 자리 미리 주황
        if (k < L.length - 1) for (let j = k + 1; j < L.length; j++) { let tot = 0, pre = 0; for (let i = 0; i < n * n; i++) { if (!near[j][i]) continue; let done = false; for (let t = 0; t <= k; t++) if (wide[t][i]) { done = true; break; } if (done) continue; tot++; if (O[i] >= 128) pre++; } const r = tot ? pre / tot : 0; worstC = Math.max(worstC, r); if (tot > 20 && r >= 0.03) bad.c.push(`${ch}${k + 1}→${j + 1}(${Math.round(r * 100)}%)`); }
        // (d) 마지막 장면 회색 0
        if (k === L.length - 1) { let gray = 0; for (let i = 0; i < n * n; i++) if (ink(i) && O[i] < 128) gray++; if (gray) bad.d.push(`${ch}(${gray})`); }
        prev = new Uint8Array(n * n); for (let i = 0; i < n * n; i++) if (O[i] >= 128) prev[i] = 1;
      }
      if (cvs.length) sheet.push([ch, cvs]);
      if (ci % 10 === 9) await W(0);
    }
    ok(!bad.a.length, `(a) 주황 ⊂ 글자 잉크 ${list.length}자 ${scenes}장면`, bad.a.slice(0, 10).join(" "));
    ok(!bad.b.length, "(b) 획마다 새로 칠한 곳 = 한 덩어리", `${bad.b.length}곳 ${bad.b.slice(0, 12).join(" ")}`);
    ok(!bad.c.length, "(c) 아직 안 그은 획 자리 미리 주황 < 3%", `최대 ${(worstC * 100).toFixed(1)}% · ${bad.c.length}곳 ${bad.c.slice(0, 12).join(" ")}`);
    ok(!bad.d.length, "(d) 마지막 장면 회색 0", bad.d.slice(0, 10).join(" "));
    if (window.__strokeSheet) { // 눈 확인 판
      document.getElementById("__sheet")?.remove(); const d = document.createElement("div"); d.id = "__sheet";
      d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;padding:6px;display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start";
      for (const [ch, cvs] of sheet) { const row = document.createElement("div"); row.style.cssText = "display:flex;gap:1px;border:1px solid #ccc;padding:2px;align-items:center"; row.append(Object.assign(document.createElement("b"), { textContent: ch, style: "font-size:14px;width:16px" }));
        for (const cv of cvs) { const c2 = document.createElement("canvas"); c2.width = c2.height = 52; const x = c2.getContext("2d"); x.globalAlpha = 0.22; x.drawImage(wr.glyphCv(ch, 52), 0, 0); x.globalAlpha = 1; x.drawImage(cv, 0, 0, 52, 52); row.append(c2); }
        d.append(row); }
      document.body.append(d); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 획순 칠 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
