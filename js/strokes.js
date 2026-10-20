// 획 자료·자모 칸·획순 칠 — 글자부 파일(10-12 쓰기부가 js/screens/write.js 에서 떼어 냄 · 본부 「획순 칠·획 자료 처리는 글자부 몫」)
//  createStrokes(ctx) = 쓰기 화면 하나마다 한 번 · 글꼴 그림(glyph·glyphImg)·마스크(pix)·덩어리(compsOf)는 쓰기 화면이 넘겨 줌(회색 안내·판정과 픽셀까지 같은 그림)
//  돌려주는 것: 자모 칸(unitsOf · ringFix · deCrumb) · 획 자료(STK · stkReady · strokesOf · snap · fitOf) · 칠(inkOwners · brushPath · brushStroke · revealOrder) · 점검용(centerOf · traceOf) · 캐시(글꼴이 늦게 오면 쓰기 화면이 비움)
import { units as jamoUnits, shapeFix } from "./jamobox.js?v=1016.92";

export function createStrokes({ glyph, glyphImg, pix, hfontKey, gCache, compsOf, PEN, GN }) {
  // 점검 도구용 — 글자 가운데 선(거리 변환 능선 점들) = 조심스럽게 가운데를 따라 그린 사람
  const centerOf = ch => { const N = 160, mask = pix(N, x => glyph(x, N, ch, "#000")), on = i => mask[i * 4 + 3] > 128, d = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) d[i] = on(i) ? 1e9 : 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!d[i]) continue; if (x) d[i] = Math.min(d[i], d[i - 1] + 1); if (y) d[i] = Math.min(d[i], d[i - N] + 1); }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!d[i]) continue; if (x < N - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < N - 1) d[i] = Math.min(d[i], d[i + N] + 1); }
    const out = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; if (d[i] < 2) continue; let top = true; for (const j of [i - 1, i + 1, i - N, i + N]) if (d[j] > d[i]) top = false; if (top) out.push([[(x + 0.5) / N, (y + 0.5) / N]]); }
    return out; };
  // 점검 도구용 — 글자 마스크를 가로줄로 훑은 획(정규화 0~1)
  const traceOf = ch => { const N = 160, mask = pix(N, x => glyph(x, N, ch, "#000")), step = Math.max(2, Math.round(PEN * N * 0.8)), out = [];
    for (let y = Math.floor(step / 2); y < N; y += step) { let x0 = -1; for (let x = 0; x <= N; x++) { const on = x < N && mask[(y * N + x) * 4 + 3] > 128; if (on && x0 < 0) x0 = x; if (!on && x0 >= 0) { out.push([[(x0 + 0.5) / N, (y + 0.5) / N], [(x - 0.5) / N, (y + 0.5) / N]]); x0 = -1; } } }
    return out; };
  // 자모 자리(js/jamobox.js) — 같은 글꼴 마스크로 · 글꼴이 바뀌면 다시
  const UN = 200, uCache = new Map();
  // ㅇ 고리 바로잡기(투덜이 10-08 「왕」) — 글꼴이 ㅇ 아래와 ㅗ 꼭지를 이어 그리면 자모 나누기가 ㅇ 아래 반을 ㅗ 에 줌 → 획순이 ㅇ 위 → 아래 두 번
  //  ㅇ 자모마다 가장 가까운 「구멍」(글자 밖과 이어지지 않은 빈 곳)을 찾아, 그 구멍에서 획 굵기만큼 안의 잉크 = ㅇ 몫으로 되돌림
  // 부스러기 정리(본부 10-10 전수 1,257자) — 자모 안에서 본체와 안 이어진 작은 조각(< max(40칸, 그 자모 30%)) = 가장 많이 맞닿은 이웃 자모 몫 · 바뀌면 true
  function deCrumb(us) {
    const N = UN, own = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) own[q] = k; }); let changed = false;
    for (let pass = 0; pass < 3; pass++) { let moved = false;
      us.forEach((u, k) => { const seen = new Set(), comps = [];
        for (const q0 of u.px) { if (seen.has(q0) || own[q0] !== k) continue; const c = [], st = [q0]; seen.add(q0); while (st.length) { const q = st.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && !seen.has(j)) { seen.add(j); st.push(j); } } comps.push(c); }
        if (comps.length < 2) return; comps.sort((a, b) => b.length - a.length); const lim = Math.max(40, u.px.length * 0.3);
        for (const c of comps.slice(1)) { if (c.length >= lim) { // 큰 떨어진 덩어리(ㅎ 빼고 · 자음) — 가운데가 제 칸 밖 · 다른 자음 칸 안이면 그 자음(「흃」 받침 ㅎ 꼭지·가로대가 ㄹ 몫이던 것)
            if (u.jamo === "ㅎ" || u.role === "jung") continue; let sx = 0, sy = 0; for (const q of c) { sx += q % N; sy += (q / N) | 0; } sx /= c.length; sy /= c.length;
            let gx0 = N, gy0 = N, gx1 = 0, gy1 = 0; for (const v of us) for (const q of v.px) { const x = q % N, y = (q / N) | 0; if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; }
            const rx = (sx - gx0 + 0.5) / (gx1 - gx0 + 1), ry2 = (sy - gy0 + 0.5) / (gy1 - gy0 + 1), inR = v => v.rect && rx >= v.rect[0] && rx <= v.rect[2] && ry2 >= v.rect[1] && ry2 <= v.rect[3];
            if (inR(u)) continue; const hits = us.map((v, j) => j).filter(j => j !== k && us[j].role !== "jung" && inR(us[j])); if (hits.length !== 1) continue;
            for (const q of c) own[q] = hits[0]; moved = true; continue; } const cnt = new Map(); for (const q of c) { const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N, x > 0 ? q - N - 1 : -1, x < N - 1 ? q - N + 1 : -1, x > 0 ? q + N - 1 : -1, x < N - 1 ? q + N + 1 : -1]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k) cnt.set(o, (cnt.get(o) || 0) + 1); } }
          if (!cnt.size) continue; const to = [...cnt].sort((a, b) => b[1] - a[1])[0][0]; for (const q of c) own[q] = to; moved = true; } });
      if (!moved) break; changed = true; us.forEach(u => (u.px = [])); for (let i = 0; i < N * N; i++) if (own[i] >= 0) us[own[i]].px.push(i); }
    return changed;
  }
  const HV = new Set("ㅗㅛㅜㅠㅡ");
  function ringFix(us, m) {
    const N = UN, on = i => m[i * 4 + 3] > 128, idx = us.map((u, k) => (u.jamo === "ㅇ" || u.jamo === "ㅎ" ? k : -1)).filter(k => k >= 0); // ㅎ 도 동그라미(「호」 — ㅎ 고리가 ㅗ 몫이 되던 것) if (!idx.length) return us;
    const outside = new Uint8Array(N * N), st0 = [];
    for (let i = 0; i < N; i++) for (const q of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!on(q) && !outside[q]) { outside[q] = 1; st0.push(q); }
    while (st0.length) { const q = st0.pop(), x = q % N, y = (q / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (!outside[j] && !on(j)) { outside[j] = 1; st0.push(j); } } }
    const hole = new Int32Array(N * N).fill(-1), holes = [];
    for (let q = 0; q < N * N; q++) { if (on(q) || outside[q] || hole[q] >= 0) continue; const id = holes.length, px = [], s = [q]; hole[q] = id;
      while (s.length) { const p = s.pop(); px.push(p); const x = p % N, y = (p / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (hole[j] < 0 && !on(j) && !outside[j]) { hole[j] = id; s.push(j); } } }
      if (px.length >= 6) { let sx = 0, sy = 0; for (const p of px) { sx += p % N; sy += (p / N) | 0; } holes.push({ id, px, cx: sx / px.length / N, cy: sy / px.length / N }); } }
    if (!holes.length) return us;
    let area = 0, edge = 0; for (let q = 0; q < N * N; q++) { if (!on(q)) continue; area++; const x = q % N, y = (q / N) | 0; if (!x || !y || x === N - 1 || y === N - 1 || !on(q - 1) || !on(q + 1) || !on(q - N) || !on(q + N)) edge++; }
    const D = Math.ceil(((2 * area) / Math.max(1, edge)) * 1.05), owner = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) owner[q] = k; });
    const used = new Set(), ringSet = new Map(), holeOf = new Map();
    for (const k of idx) { const u = us[k]; let sx = 0, sy = 0; for (const q of u.px) { sx += q % N; sy += (q / N) | 0; } const ux = sx / u.px.length / N, uy = sy / u.px.length / N;
      let hb = null, bd = Infinity; for (const h of holes) { if (used.has(h.id)) continue; const d = Math.hypot(h.cx - ux, h.cy - uy); if (d < bd) { bd = d; hb = h; } }
      if (u.jamo === "ㅎ") { hb = null; bd = Infinity; for (const h of holes) { if (used.has(h.id) || h.cy < uy - 0.02) continue; const d = Math.hypot(h.cx - ux, h.cy - uy); if (d < bd) { bd = d; hb = h; } } } // ㅎ 동그라미 = 꼭지·가로 아래
      if (!hb || bd > (u.jamo === "ㅎ" ? 0.4 : 0.25)) continue; used.add(hb.id); holeOf.set(k, hb.px[0]);
      // 고리 = 구멍에서 실제(유클리드) 거리 ≤ 그 고리 두께(고리 바깥 가장자리까지 거리의 중앙값) + 0.5칸(본부 10-10 투덜이 「요」 — 걸음 수·글자 평균 굵기로 잡아 ㅛ 꼭지 머리가 ㅇ 몫이 되던 것)
      const bnd = hb.px.filter(p => [p - 1, p + 1, p - N, p + N].some(j => j >= 0 && j < N * N && on(j))).map(p => [p % N, (p / N) | 0]);
      let hx0 = N, hx1 = 0, hy0 = N, hy1 = 0; for (const [x, y] of bnd) { if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; if (y < hy0) hy0 = y; if (y > hy1) hy1 = y; }
      const R = 3 * D, dist = new Float32Array(N * N).fill(-1), cand = [];
      for (let y = Math.max(0, hy0 - R); y <= Math.min(N - 1, hy1 + R); y++) for (let x = Math.max(0, hx0 - R); x <= Math.min(N - 1, hx1 + R); x++) { const q = y * N + x; if (!on(q)) continue; let b2 = Infinity; for (const [bx, by] of bnd) { const d2 = (bx - x) ** 2 + (by - y) ** 2; if (d2 < b2) b2 = d2; } dist[q] = Math.sqrt(b2); cand.push(q); }
      const outerD = cand.filter(q => dist[q] <= 2.5 * D && [q - 1, q + 1, q - N, q + N].some(j => j >= 0 && j < N * N && outside[j])).map(q => dist[q]).sort((p, q) => p - q);
      const thick = (outerD.length ? outerD[outerD.length >> 1] : D) + 0.5;
      // 고리 바깥 타원(본부 10-10 「왕」「호」「오」 — 고리 = 바깥 타원 안 띠만 · 기둥은 모음 몫) = 구멍 가운데서 사방 180줄로 나가 잉크가 끝나는 곳 · 기둥·가로획으로 길게 빠진 줄(중앙값 1.25배 넘음)은 빼고 타원 맞춤(최소제곱 Ax²+Cy²+Dx+Ey=1)
      const ecx = (hx0 + hx1) / 2, ecy = (hy0 + hy1) / 2, rays = [];
      for (let a = 0; a < 180; a++) { const t = (a / 180) * 2 * Math.PI, dx = Math.cos(t), dy = Math.sin(t); let inInk = false, r = 0, hit = -1; for (; r < N; r += 0.5) { const x = Math.round(ecx + dx * r), y = Math.round(ecy + dy * r); if (x < 0 || y < 0 || x >= N || y >= N) break; const o = on(y * N + x); if (o) inInk = true; else if (inInk) { hit = r; break; } } if (hit > 0) rays.push([dx, dy, hit]); }
      const rm = rays.map(r => r[2]).sort((p, q) => p - q)[rays.length >> 1] || 0, pts = rays.filter(r => r[2] <= rm * 1.25).map(([dx, dy, r]) => [dx * r, dy * r]);
      let inEll = () => true, eTop = hy0 - thick;
      if (pts.length >= 40) { const M = Array.from({ length: 4 }, () => new Float64Array(5)); for (const [x, y] of pts) { const v = [x * x, y * y, x, y]; for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[r][c] += v[r] * v[c]; M[r][4] += v[r]; } }
        for (let c = 0; c < 4; c++) { let pv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r; [M[c], M[pv]] = [M[pv], M[c]]; for (let r = 0; r < 4; r++) if (r !== c && M[c][c]) { const f = M[r][c] / M[c][c]; for (let k2 = c; k2 < 5; k2++) M[r][k2] -= f * M[c][k2]; } }
        const [A, C, Dx, Ey] = M.map((r, i) => r[4] / r[i]);
        if (A > 0 && C > 0) { const x0 = -Dx / (2 * A), y0 = -Ey / (2 * C), G = 1 + A * x0 * x0 + C * y0 * y0, ax = Math.sqrt(G / A) + 0.3, ay = Math.sqrt(G / C) + 0.3;
          inEll = q => ((q % N - ecx - x0) / ax) ** 2 + ((((q / N) | 0) - ecy - y0) / ay) ** 2 <= 1; eTop = ecy + y0 - ay; } }
      const rs = new Set(); for (const q of cand) if (dist[q] <= thick && inEll(q)) { owner[q] = k; rs.add(q); } ringSet.set(k, rs);
      // 고리 밖인데 이 ㅇ 몫인 잉크(꼭지 머리 등) = 붙어 있는 이웃 자모에게 돌려줌
      { let moved = true; for (let it = 0; it < 3 * D && moved; it++) { moved = false; const chg = [];
          for (const q of cand) { if (owner[q] !== k || (dist[q] <= thick + 1 && inEll(q)) || (u.jamo === "ㅎ" && (q / N | 0) < eTop)) continue; /* ㅎ 꼭지·가로(고리 위)는 ㅎ 몫 그대로(「혹」) */ const cnt = new Map(); for (const j of [q - 1, q + 1, q - N, q + N, q - N - 1, q - N + 1, q + N - 1, q + N + 1]) { const o = j >= 0 && j < N * N ? owner[j] : -1; if (o >= 0 && o !== k) cnt.set(o, (cnt.get(o) || 0) + 1); } if (cnt.size) chg.push([q, [...cnt].sort((p, r) => r[1] - p[1])[0][0]]); }
          for (const [q, o] of chg) { owner[q] = o; moved = true; } } } }
    const out = us.map(u => ({ ...u, px: [] })); for (let q = 0; q < N * N; q++) if (owner[q] >= 0) out[owner[q]].px.push(q);
    // 고리 넓히기가 다른 자모를 80% 넘게 먹으면 그 자모는 원래대로(본부 10-08 「흑」 — ㅎ 동그라미 바로 아래 ㅡ 가 1% 만 남던 것 · 10-10 「호」 고리 통째가 ㅗ 몫이면 절반 넘게 넘어가는 게 맞음)
    out.forEach((u, k) => { if (u.px.length < us[k].px.length * 0.2 && !(u.role === "jung" && HV.has(u.jamo))) { const keep = new Set(us[k].px); out.forEach((v, j) => { if (j !== k) v.px = v.px.filter(q => !keep.has(q)); }); u.px = us[k].px.slice(); } });
    for (const u of out) { if (!u.px.length) continue; let a = N, b = N, c = -1, d = -1; for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } u.box = [a / N, b / N, (c + 1) / N, (d + 1) / N]; }
    for (const [k, rs] of ringSet) { out[k].ring = new Set([...rs].filter(q => owner[q] === k)); out[k].hole = holeOf.get(k); } // 고리 픽셀 · 고리 안 구멍 한 칸(shapeFix 가 「고리 위아래 줄」 가릴 때)
    return out.map((u, k) => (u.px.length || (u.role === "jung" && HV.has(u.jamo)) ? u : us[k])); // 가로 모음은 비어도 됨(뒤 shapeFix 가 띠·기둥을 찾아 줌 · 「훅」) · 자모 칸은 빼지 않음(빼면 뒤 자모가 한 칸씩 밀림 · 본부 10-08)
  }
  const unitsOf = ch => { const k = ch + "|" + hfontKey(); if (uCache.has(k)) return uCache.get(k); const m = pix(UN, x => glyph(x, UN, ch, "#000")), us = ringFix(jamoUnits(ch, m, UN), m); if ((shapeFix(us, m, UN, ch) | deCrumb(us))) us.forEach(u => { if (!u.px.length) return; let a = UN, b = UN, c = -1, d = -1; for (const q of u.px) { const x = q % UN, y = (q / UN) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } u.box = [a / UN, b / UN, (c + 1) / UN, (d + 1) / UN]; delete u.set; delete u.half; }); /* ㅇ 고리 보정 뒤 획 모양 한 번 더(「어」「예」 ㅓㅕ 꼭지 뿌리) */ if (gCache.has(ch + "|0|" + hfontKey())) uCache.set(k, us); return us; }; // 글꼴 그림이 저장된(= 글꼴 온) 뒤에만 기억
  // 획순 자료(data/jamo_strokes.json · 본부) → 이 글자 획(0~1 · 쓰는 차례) = 자모 획 점을 그 자모 잉크 상자에 늘려 맞춤
  let STK = null; const stkReady = fetch(`data/jamo_strokes.json?v=${document.documentElement.dataset.v || ""}`).then(r => r.json()).then(d => (STK = d)).catch(() => null);
  // 획 끝 늘이기(투덜이 10-08 「대」 — ㅐ 의 ㅏ 가로획 자료가 0.04 길이라 가로획 잉크 대부분이 다음 ㅣ 몫이 되어 4번째 획이 안 칠해짐)
  //  열린 획의 두 끝을 그 방향으로 글자 잉크가 이어지는 데까지 늘임 · 다른 획 몸통(굵기 절반 90% 안)에 닿으면 거기서 멈춤
  const segDist = (P, x, y) => { let bd = Infinity; for (let a = 1; a < P.length; a++) { const ax = P[a - 1][0], ay = P[a - 1][1], dx = P[a][0] - ax, dy = P[a][1] - ay, ll = dx * dx + dy * dy || 1e-9, r = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / ll)); bd = Math.min(bd, Math.hypot(x - ax - dx * r, y - ay - dy * r)); } return P.length === 1 ? Math.hypot(x - P[0][0], y - P[0][1]) : bd; };
  // 세로 끝이 나중 가로 가운데 쪽에 꽂힘(본부 10-12 획순 칠 「풲」 — ㅍ 세로 끝이 처음부터 아랫가로 몸통 안이라 멈춤 기준에서 빠져 아랫가로 밑변까지 늘어나 아랫가로 왼쪽을 미리 칠하던 것)
  //  = T 가 S 보다 나중 획 · S 끝 방향이 세로(|dy| > 2|dx|) · 끝에서 가장 가까운 T 토막이 가로(|Δx| > 2|Δy|) · 그 토막 양 끝(자료 점)에서 둘 다 두 획 굵기 절반(halfOf) 큰 쪽보다 멀리 떨어짐(ㅁ ㅂ ㄷ ㄹ 모서리 = 가로 끝에 붙은 세로는 아님)
  //  · 한 자모 안에서 S 반대 끝(늘이기 전)이 먼저 그은 획 몸통 안 = 두 가로를 잇는 세로(ㅍ) 만 · T 도 같은 자모 · ㅗ ㅛ 꼭지(반대 끝이 비었거나 ㅇ·앞 자음)·ㅜ ㅠ 다리(끝이 받침 가로에 닿음)는 그대로(늘이기 안 하면 꼭지 끝이 가로 안에서 둥글게 끊겨 보임 · 미리 칠 점검도 통과하던 것)
  const midBar = (list, S, T, q, dx, dy, o) => { const iS = list.indexOf(S); if (list.indexOf(T) < iS || T.unit !== S.unit || Math.abs(dy) <= 2 * Math.abs(dx)) return false; const P = T.pts; if (P.length < 2) return false;
    if (!list.some((T0, j) => j < iS && T0.unit === S.unit && segDist(T0.pts, o[0], o[1]) < 0.9 * halfOf(T0))) return false;
    let bd = Infinity, bs = -1, br = 0; for (let a = 1; a < P.length; a++) { const ax = P[a - 1][0], ay = P[a - 1][1], ex = P[a][0] - ax, ey = P[a][1] - ay, ll = ex * ex + ey * ey || 1e-9, r = Math.max(0, Math.min(1, ((q[0] - ax) * ex + (q[1] - ay) * ey) / ll)), d = Math.hypot(q[0] - ax - ex * r, q[1] - ay - ey * r); if (d < bd) { bd = d; bs = a; br = r; } }
    const ex = P[bs][0] - P[bs - 1][0], ey = P[bs][1] - P[bs - 1][1], len = Math.hypot(ex, ey), m = Math.max(halfOf(S), halfOf(T)); return Math.abs(ex) > 2 * Math.abs(ey) && br * len > m && (1 - br) * len > m; };
  function extendEnds(list, us) {
    const ownU = new Int16Array(UN * UN).fill(-1); us.forEach((u, k) => { for (const q of u.px) ownU[q] = k; });
    const at = (x, y) => { const cx = Math.round(x * UN - 0.5), cy = Math.round(y * UN - 0.5); return cx >= 0 && cy >= 0 && cx < UN && cy < UN ? ownU[cy * UN + cx] : -1; };
    for (const S of list) { const P = S.pts; if (P.length < 2) continue; const a0 = P[0], z = P[P.length - 1]; if (Math.hypot(a0[0] - z[0], a0[1] - z[1]) < 0.02) continue; // 닫힌 획(ㅇ) 제외
      const E0 = [P[0], P[P.length - 1]]; // 늘이기 전 두 끝(midBar 반대 끝 보기)
      for (const end of [0, P.length - 1]) { const q = P[end], prev = P[end === 0 ? 1 : P.length - 2], L = Math.hypot(q[0] - prev[0], q[1] - prev[1]); if (L < 1e-6) continue;
        const dx = (q[0] - prev[0]) / L, dy = (q[1] - prev[1]) / L, step = 0.5 / UN; let best = q;
        const near0 = new Set(list.filter(T => { if (T === S || segDist(T.pts, q[0], q[1]) >= 0.9 * halfOf(T)) return false; if (midBar(list, S, T, q, dx, dy, E0[end === 0 ? 1 : 0])) { (S.midT ||= []).push(T); return false; } return true; })); // 늘이기 시작할 때 이미 몸통 안인 획(「대」 ㅏ 짧은 가로 = ㅏ 세로에 붙어 시작)은 멈춤 기준에서 뺌 · 단 세로 끝이 나중 가로의 가운데 쪽에 꽂힌 것(ㅍ 세로 → 아랫가로 · 「풲」)은 빼지 않음 = 그 가로 몸통에서 멈춤
        for (let k = 1; k < UN; k++) { const x = q[0] + dx * step * k, y = q[1] + dy * step * k, o = at(x, y); if (o < 0 || o < S.unit) break; // 잉크 끝 · 먼저 쓴 자모(ㅗ 꼭지가 ㅇ 안으로) 에선 멈춤
          if (list.some(T => T !== S && !near0.has(T) && segDist(T.pts, x, y) < 0.9 * halfOf(T))) break; best = [x, y]; }
        P[end] = best; } }
  }
  function strokesOf(ch) {
    if (!STK) return [];
    const out = [];
    unitsOf(ch).forEach((u, ui) => { const base = STK.base?.[u.jamo]; if (!base) return;
      const pts = base.flat(), bx0 = Math.min(...pts.map(p => p[0])), bx1 = Math.max(...pts.map(p => p[0])), by0 = Math.min(...pts.map(p => p[1])), by1 = Math.max(...pts.map(p => p[1]));
      // 자료 점 = 획 가운데 선 → 잉크 상자를 획 굵기 절반만큼 안으로(굵기 ≈ 2 × 넓이 / 둘레)
      u.set ||= new Set(u.px); let edge = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) edge++;
      const half = Math.min(0.06, u.px.length / Math.max(1, edge) / UN), b0 = u.box, bw = b0[2] - b0[0], bh = b0[3] - b0[1];
      const x0 = b0[0] + Math.min(half, bw / 3), x1 = b0[2] - Math.min(half, bw / 3), y0 = b0[1] + Math.min(half, bh / 3), y1 = b0[3] - Math.min(half, bh / 3), mx = v => (bx1 - bx0 < 0.05 ? (x0 + x1) / 2 : x0 + ((v - bx0) / (bx1 - bx0)) * (x1 - x0)), my = v => (by1 - by0 < 0.05 ? (y0 + y1) / 2 : y0 + ((v - by0) / (by1 - by0)) * (y1 - y0));
      for (const S of base) out.push({ unit: ui, u, role: u.role, jamo: u.jamo, pts: snap(u, S.map(([x, y]) => [mx(x), my(y)])) }); });
    // ㅝ ㅞ 의 ㅓ 짧은 가로(본부 10-12 획순 칠 ②) — 글꼴이 짧은 가로를 세로 아래쪽(ㅜ 가로 높이)에 그려 자료(세로 가운데)와 어긋남 → 실제 ㅓ 잉크 중 세로 왼편 잉크의 높이·왼끝에 맞춤
    const fixV = []; { const us = unitsOf(ch); us.forEach((u, ui) => { if (u.jamo !== "ㅓ" || ui === 0 || us[ui - 1].jamo !== "ㅜ" || us[ui - 1].role !== "jung") return;
        const mine = out.filter(S => S.unit === ui), bar = mine[0], vert = mine[1]; if (!bar || !vert || bar.pts.length !== 2) return;
        u.set ||= new Set(u.px); let edge = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) edge++; const th = (2 * u.px.length) / Math.max(1, edge) / UN;
        const vx = vert.pts[0][0], ys = [], xs = []; for (const q of u.px) { const x = (q % UN + 0.5) / UN, y = (((q / UN) | 0) + 0.5) / UN; if (x < vx - th) { xs.push(x); ys.push(y); } }
        if (xs.length < 20) return; ys.sort((p2, q2) => p2 - q2); const by = ys[ys.length >> 1], xa = Math.min(...xs) + th / 2; if (vx - xa < th) return;
        bar.pts = [[xa, by], [vx, by]]; fixV.push([vert, u, vx, th]); }); }
    { const us = unitsOf(ch); us.forEach((u, ui) => { if (u.role !== "jung" || !/[ㅕㅖ]/.test(u.jamo)) return; /* ㅕ ㅖ 두 가로 = 실제 잉크 띠 높이로(본부 10-12 획순 칠 ③ 「혤」 — 자료 둘째 가로가 두 띠 사이 빈 줄에 놓여 붓이 첫 가로 위로 가던 것) */
        const mine = out.filter(S => S.unit === ui), vert = mine.find(S => S.pts.length === 2 && Math.abs(S.pts[1][1] - S.pts[0][1]) > 3 * Math.abs(S.pts[1][0] - S.pts[0][0])), bars = mine.filter(S => S.pts.length === 2 && Math.abs(S.pts[1][0] - S.pts[0][0]) > 3 * Math.abs(S.pts[1][1] - S.pts[0][1])); if (!vert || bars.length !== 2) return;
        u.set ||= new Set(u.px); const vx = Math.floor(vert.pts[0][0] * UN), bands = []; let cur = null;
        let ve = -1; for (let y = 0; y < UN; y++) { if (!u.set.has(y * UN + vx)) continue; let x = vx; while (x > 0 && u.set.has(y * UN + x - 1)) x--; if (x > ve) ve = x; } if (ve < 0) return; /* 세로 왼끝 = 줄마다 왼끝 중 가장 오른쪽(가로 없는 줄) */
        for (let y = 0; y < UN; y++) { let n = 0; for (let x = ve - 1; x >= Math.max(0, ve - 40); x--) { if (u.set.has(y * UN + x)) n++; else break; } if (n >= 6) { if (cur && cur[1] === y - 1) cur[1] = y; else bands.push((cur = [y, y])); } else cur = null; }
        if (bands.length !== 2) return; bars.sort((p2, q2) => p2.pts[0][1] - q2.pts[0][1]);
        bars.forEach((S, i) => { const [a, b] = bands[i], yy = S.pts[0][1] * UN; if (yy >= a - 0.5 && yy <= b + 1.5) return; const c = (a + b + 1) / 2 / UN; S.pts = S.pts.map(p2 => [p2[0], c]); }); }); }
    extendEnds(out, unitsOf(ch));
    out.forEach((bar, i) => { const left = out[i + 1]; if (!left || left.unit !== bar.unit || bar.pts.length !== 2 || i !== out.findIndex(S => S.unit === bar.unit) + (bar.jamo === "ㅊ" ? 1 : 0) || !/[ㅈㅊ]/.test(bar.jamo)) return; /* ㅈ ㅊ 왼삐침 = 가로 아래 가장자리에서 시작(검사부 10-15 「종」「잦」 받침 — 넓적한 ㅈ 은 가로가 두꺼워 시작점이 가로 몸통 안 → 늘이기가 가로 위 가장자리까지 올라가 자석 2번 원이 가로 위에 뜨던 것) · 줄기 왼편 열에서 가로 잉크 아래 끝을 잼 */
      const u = bar.u; u.set ||= new Set(u.px); const P = left.pts, x = P[0][0] - 2.5 * halfOf(bar), on = y => u.set.has(Math.floor(y * UN) * UN + Math.floor(x * UN)); let y = bar.pts[0][1]; if (!on(y)) return; while (y < 1 && on(y + 0.5 / UN)) y += 0.5 / UN;
      if (P[0][1] >= y) return; let k = 0; while (k < P.length - 1 && P[k][1] < y) k++; left.pts = [[P[0][0], y], ...P.slice(k)]; });
    { const us = unitsOf(ch); if (us[0]?.jamo === "ㅈ" && us[1]?.jamo === "ㅈ" && us[0].role === "cho" && us[1].role === "cho") { /* ㅉ 첫 ㅈ 오른다리(2획) 붓은 가로대 아래에서 시작(본부 10-12 ① 「찃」 — 맞닿은 가로대 칸을 세로로 지나며 셋째 획을 둘로 가르던 것 · 맞닿은 칸은 둘째 ㅈ 차례) */
        const L0 = out.filter(S => S.unit === 0), bar = L0[0], leg = L0[L0.length - 1]; /* 오른다리 = 마지막 획(10-15 ㅈ 3획) */ if (bar && leg && leg.pts.length >= 2) { const u = us[0]; u.set ||= new Set(u.px); let edge = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) edge++; const th = (2 * u.px.length) / Math.max(1, edge) / UN;
          { const B = bar.pts; if (B.length >= 3) { const c = B[1], cs = new Set([...us[0].px, ...us[1].px]), on2 = (x, y) => cs.has(Math.floor(y * UN) * UN + Math.floor(x * UN)); let x = c[0]; while (x < 1 && on2(x + 0.5 / UN, c[1])) x += 0.5 / UN; if (x - c[0] > th * 0.5) bar.pts = [B[0], [x - th / 2, c[1]], c, ...B.slice(2)]; } } /* 가로대가 꺾는 곳 너머로 이어진 끝까지 갔다가 돌아와 꺾음(첫 ㅈ 가로대 오른끝 · 「찃」) */
          const yb = bar.pts[0][1] + th, P = leg.pts; if (P[0][1] < yb && P[P.length - 1][1] > yb) { let k = 1; while (k < P.length && P[k][1] < yb) k++; const a0 = P[k - 1], b0 = P[k], r = (yb - a0[1]) / Math.max(1e-6, b0[1] - a0[1]); leg.pts = [[a0[0] + (b0[0] - a0[0]) * r, yb], ...P.slice(k)]; } } } }
    for (const [vert, u, vx, th] of fixV) { let yMax = 0, yMin = 1; for (const q of u.px) { const x = (q % UN + 0.5) / UN, y = (((q / UN) | 0) + 0.5) / UN; if (Math.abs(x - vx) < th / 2) { if (y > yMax) yMax = y; if (y < yMin) yMin = y; } } const P = vert.pts, d = P[P.length - 1][1] > P[0][1]; if (yMax > 0) { if (d) { P[P.length - 1] = [P[P.length - 1][0], Math.max(P[P.length - 1][1], yMax - th / 2)]; } } } /* 세로는 아래 끝까지(짧은 가로가 세로 아래에 붙어 늘이기가 가로에서 멈추던 것 · 「눯」) */
    if (OWN_PTS[ch] && useOwn(ch)) { for (const [k, P] of Object.entries(OWN_PTS[ch])) if (out[k]) out[k].pts = P.map(p => p.slice()); // 획 점 바로잡기(도우미 K)
      const m = pix(UN, x => glyph(x, UN, ch, "#000")), px = []; let a = UN, b = UN, c = -1, d = -1; for (let q = 0; q < UN * UN; q++) if (m[q * 4 + 3] > 128) { px.push(q); const x = q % UN, y = (q / UN) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
      const all = { jamo: "*", role: "all", px, box: [a / UN, b / UN, (c + 1) / UN, (d + 1) / UN] }; for (const S of out) S.u = all; } // 붓 길 = 글자 잉크 전체 가운데로(자모 칸이 이웃 잉크를 잘못 잡은 글자라 칸으로 자르지 않음)
    return out;
  }
  // 획 붙이기(본부 10-07) — 상자 맞춤 뒤 획을 자기 방향에 수직으로 ±12%(상자 기준) 안에서 옮겨 보며 잉크와 가장 많이 겹치는 자리로
  //  가로획 = 위아래 · 세로획 = 좌우 · 비스듬·꺾인·둥근 획 = 두 방향 모두 · 같으면 덜 옮긴 쪽
  const inkIn = (u, x, y) => { u.set ||= new Set(u.px); const cx = Math.round(x * UN), cy = Math.round(y * UN); for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (u.set.has((cy + dy) * UN + cx + dx)) return true; return false; };
  const fitOf = (u, P) => { let n = 0, k = 0; for (let i = 1; i < P.length; i++) for (let f = 0; f <= 1; f += 0.125) { n++; if (inkIn(u, P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f)) k++; } return n ? k / n : 0; };
  function snap(u, P) {
    if (P.length < 2) return P;
    const bw = u.box[2] - u.box[0], bh = u.box[3] - u.box[1], dx = P[P.length - 1][0] - P[0][0], dy = P[P.length - 1][1] - P[0][1];
    const horiz = P.length === 2 && Math.abs(dx) > 3 * Math.abs(dy), vert = P.length === 2 && Math.abs(dy) > 3 * Math.abs(dx);
    const xs = horiz ? [0] : Array.from({ length: 13 }, (_, i) => (i - 6) * 0.02 * bw), ys = vert ? [0] : Array.from({ length: 13 }, (_, i) => (i - 6) * 0.02 * bh);
    let best = [0, 0], bf = fitOf(u, P) + 1e-9;
    for (const ox of xs) for (const oy of ys) { if (!ox && !oy) continue; const f = fitOf(u, P.map(([x, y]) => [x + ox, y + oy])); if (f > bf + 1e-6 || (Math.abs(f - bf) < 1e-6 && Math.hypot(ox, oy) < Math.hypot(...best))) { bf = f; best = [ox, oy]; } }
    return P.map(([x, y]) => [x + best[0], y + best[1]]);
  }
  // 획순 칠(본부 10-07 투덜이 「획 그림이 회색 글자와 어긋남」) — 주황 선을 따로 긋지 않고 회색 글자 자체를 그 획 차례대로 주황으로 드러냄
  //  그 자모 잉크(jamobox 덩어리)만 · 글꼴 잉크로 자름 → 모양은 늘 글꼴과 같음 · 옆 자모는 안 건드림
  //  upto = 다 칠한 획 수 · f = 지금 획 진행(0~1) → { cv: 주황 칠 캔버스(n×n), ends: 획마다 { a: 시작 잉크 점, b: 끝 잉크 점, dir } (0~1) }
  const OR_FILL = "#c8641a", OR_MARK = "#7a3410";
  const nearInk = (u, [px, py]) => { let bd = Infinity, best = [px, py]; for (let i = 0; i < u.px.length; i++) { const q = u.px[i], x = (q % UN + 0.5) / UN, y = (Math.floor(q / UN) + 0.5) / UN, d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = [x, y]; } } return best; };
  //  잉크 나누기(본부 10-07 「칠하는 중 톱니·빈틈」) — 글자 그림(400px · 글꼴 그대로 부드러운 가장자리)의 잉크 점마다 그 자모(jamobox) 획 중 가장 가까운 획 + 그 획 위 자리(0~1)
  //  칠 = 글꼴 잉크 알파 × 진행 앞머리 부드럽게(획 길이 4%) → 빈틈·톱니 없음 · 한 획이 끝나면 그 획 몫 잉크 전부
  const ownCache = new Map(), SOFT = 0.04;
  const halfOf = S => { const u = S.u; if (!u) return 0; if (u.half == null) { u.set ||= new Set(u.px); let e = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) e++; u.half = u.px.length / Math.max(1, e) / UN; } return u.half * 1.15; }; // 그 자모 획 굵기 절반(0~1) · 조금 넉넉히
  function inkOwners(ch, list) {
    const k = ch + "|" + hfontKey() + "|" + list.length; if (ownCache.has(k)) return ownCache.get(k);
    const us = unitsOf(ch), img = glyphImg(ch), ga = img.getContext("2d").getImageData(0, 0, GN, GN).data, own = new Int16Array(GN * GN).fill(-1), pos = new Float32Array(GN * GN), alpha = new Uint8ClampedArray(GN * GN);
    const u200 = new Int16Array(UN * UN).fill(-1); us.forEach((u, ui) => { for (const q of u.px) u200[q] = ui; });
    const unitAt = (x, y) => { const cx = Math.min(UN - 1, (x * UN / GN) | 0), cy = Math.min(UN - 1, (y * UN / GN) | 0); for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < UN && Y < UN && u200[Y * UN + X] >= 0) return u200[Y * UN + X]; } return -1; };
    const segs = list.map(S => { const P = S.pts, L = [0]; for (let q = 1; q < P.length; q++) L.push(L[q - 1] + Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1])); return { P, L, tot: L[L.length - 1] || 1 }; });
    const byUnit = us.map((u, ui) => list.map((S, si) => (S.unit === ui ? si : -1)).filter(v => v >= 0));
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) { const q = y * GN + x, a = ga[q * 4 + 3]; if (a < 8) continue; alpha[q] = a;
      const ui = unitAt(x, y), mine = ui >= 0 ? byUnit[ui] : []; const cand = mine.length ? mine : list.map((_, si) => si); // 자모를 못 찾은 가장자리 점 = 모든 획 중 가까운 것
      const px = (x + 0.5) / GN, py = (y + 0.5) / GN; let bd = Infinity, bs = -1, bt = 0, es = -1, et = 0;
      // 겹치는 곳(ㅏ 의 ㅣ·짧은 가로 만나는 자리 등) = 먼저 긋는 획 몫(투덜이 10-08 — 가장 가까운 획으로만 나누면 ㅣ 안에 회색 삼각형이 남음)
      // 가장 가까운 획 = 그 자모 획 중에서 · 「먼저 긋는 획 몸통 안」 = 모든 획에서(투덜이 10-08 「왕」 — 글꼴이 ㅇ 아래와 ㅗ 꼭지를 이어 그려 ㅇ 아랫부분이 ㅗ 자모 몫이 되어 ㅇ 을 위 → 아래 두 번에 칠함)
      const inCand = new Set(cand);
      for (let si = 0; si < list.length; si++) { const { P, L, tot } = segs[si], hw = halfOf(list[si]), mineS = inCand.has(si);
        if (P.length === 1) { const d = Math.hypot(px - P[0][0], py - P[0][1]); if (mineS && d < bd) { bd = d; bs = si; bt = 0; } if (d <= hw && (es < 0 || si < es)) { es = si; et = 0; } continue; }
        for (let a2 = 1; a2 < P.length; a2++) { const ax = P[a2 - 1][0], ay = P[a2 - 1][1], dx = P[a2][0] - ax, dy = P[a2][1] - ay, ll = dx * dx + dy * dy || 1e-9, r0 = ((px - ax) * dx + (py - ay) * dy) / ll, r = Math.max(0, Math.min(1, r0)), d = Math.hypot(px - ax - dx * r, py - ay - dy * r), tt = (L[a2 - 1] + r * Math.sqrt(ll)) / tot;
          if (mineS && d < bd - 1e-9) { bd = d; bs = si; bt = tt; }
          const body = (a2 > 1 || r0 >= 0) && (a2 < P.length - 1 || r0 <= 1); // 획 몸통 안(둥근 끝 제외 — 끝이 옆 획을 파먹지 않게)
          if (body && d <= hw && (es < 0 || si < es)) { es = si; et = tt; } } }
      if (es >= 0) { bs = es; bt = et; }
      own[q] = bs; pos[q] = bt; }
    // 닫힌 획(ㅇ · ㅎ 의 동그라미) = 가운데를 도는 각도로 칠 자리(투덜이 10-08 「왕」 — 가장 가까운 변으로 나누면 위 반 → 아래 반으로 칠해짐)
    list.forEach((S, si) => { const P = S.pts; if (P.length < 5 || Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) > 0.02) return;
      const xs = P.map(p => p[0]), ys = P.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rx = Math.max(1e-3, (Math.max(...xs) - Math.min(...xs)) / 2), ry = Math.max(1e-3, (Math.max(...ys) - Math.min(...ys)) / 2);
      const ang = (x, y) => Math.atan2((y - cy) / ry, (x - cx) / rx), T2 = Math.PI * 2, mod = v => ((v % T2) + T2) % T2, a0 = ang(...P[0]), dec = mod(a0 - ang(...P[1])) < Math.PI; // 자료가 도는 방향
      for (let q = 0; q < GN * GN; q++) if (own[q] === si) { const t = ang((q % GN + 0.5) / GN, (Math.floor(q / GN) + 0.5) / GN); pos[q] = (dec ? mod(a0 - t) : mod(t - a0)) / T2; } });
    const o = { own, pos, alpha }; if (gCache.has(ch + "|0|" + hfontKey())) ownCache.set(k, o); return o; // 글꼴 온 뒤에만 기억
  }
  // 칠 앞머리 자리(0~1 좌표) — 획 점 줄 위 f 지점(붓끝 점)
  const pointAt = (S, f) => { const P = S.pts; if (P.length < 2) return P[0]; let tot = 0; const L = []; for (let k = 1; k < P.length; k++) { const d = Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); L.push(d); tot += d; } let left = tot * f;
    for (let k = 1; k < P.length; k++) { if (left <= L[k - 1]) { const r = L[k - 1] ? left / L[k - 1] : 0; return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * r, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * r]; } left -= L[k - 1]; } return P[P.length - 1]; };
  // 획순 칠 = 붓 그리기(본부 10-08 투덜이 「요」 — 잉크 점마다 주인 정하기는 획이 붙는 곳마다 모호 → 「폴리곤으로 다 칠해야」)
  //  획마다 획 가운데 선을 따라 둥근 붓(굵기 = 그 자모 획 굵기 × 1.3)으로 진행만큼 그림 → 제 자모 잉크(+2칸)로 자르고 → 글꼴 잉크로 잘라 주황
  //  한 번 칠한 곳은 계속 주황(겹친 곳 = 먼저 지나간 획) · 마지막 획이 끝나면 글자 잉크 전부 주황(회색 0) · 자판 칠·손글씨 점수는 지금 나눔 그대로
  const unitMaskCache = new Map();
  function unitMask(ch, ui) { // 그 자모 잉크 + 둘레 2칸(UN 기준) → GN 캔버스
    const k = ch + "|" + hfontKey() + "|" + ui; if (unitMaskCache.has(k)) return unitMaskCache.get(k);
    const us = unitsOf(ch), role = us[ui]?.role, m = document.createElement("canvas"); m.width = m.height = UN; const mx = m.getContext("2d"), id = mx.createImageData(UN, UN);
    for (const u of us) if (u.role === role) for (const q of u.px) id.data[q * 4 + 3] = 255; mx.putImageData(id, 0, 0); // 같은 자리 자모 모두(겹모음 ㅐ = ㅏ+ㅣ)
    const out = document.createElement("canvas"); out.width = out.height = GN; const ox = out.getContext("2d"), d = GN / UN;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) ox.drawImage(m, dx * d, dy * d, GN, GN);
    { const me = us[ui], tw = us.find((u, j) => j !== ui && u.role === role && u.jamo === me?.jamo && /[ㄱㄷㅂㅅ]/.test(u.jamo) && Math.abs(j - ui) === 1) || (role === "jong" && me?.jamo === "ㅅ" && us[ui - 1]?.role === "jong" && /[ㄱㅂ]/.test(us[ui - 1].jamo) ? us[ui - 1] : null); /* 받침 ㄳ ㅄ 의 ㅅ = 앞 ㄱ ㅂ 잉크도 빼냄(본부 10-12 s9 자모 「헋」「렧」 — ㅅ 왼획 붓 끝이 둘레 2칸으로 ㄱ 기둥 아래 귀퉁이를 따로 떨어진 조각으로 칠하던 것) */ /* 쌍자음(ㅃ 등) = 짝 자모 잉크는 빼냄(본부 10-12 획순 칠 ③ 「뼷」 — 첫 ㅂ 가운데 가로 붓 끝이 둘레 2칸으로 둘째 ㅂ 왼기둥 가장자리를 칠하던 것 · ㅉ 은 따로 다룸) */
      if (tw) { const t = document.createElement("canvas"); t.width = t.height = UN; const tx = t.getContext("2d"), td = tx.createImageData(UN, UN); for (const q of tw.px) td.data[q * 4 + 3] = 255; tx.putImageData(td, 0, 0); ox.globalCompositeOperation = "destination-out"; ox.imageSmoothingEnabled = false; ox.drawImage(t, 0, 0, GN, GN); ox.globalCompositeOperation = "source-over"; } }
    if (gCache.has(ch + "|0|" + hfontKey())) unitMaskCache.set(k, out); return out;
  }
  // 붓 길(본부 10-08) — 자료 선을 그 자리 잉크 한가운데로 옮기고(선에 수직으로 제 자모 잉크 폭을 재어 가운데) · 붓 굵기 = 그 자리 잉크 폭 × 1.15(획 굵기 3배 넘으면 = 다른 획과 겹친 곳 → 획 굵기로)
  const pathCache = new Map();
  function brushPath(ch, S) {
    const key = ch + "|" + hfontKey() + "|" + S.unit + "|" + S.pts.map(p => p.map(v => v.toFixed(3)).join(",")).join(";"); if (pathCache.has(key)) return pathCache.get(key);
    const u = S.u; halfOf(S); u.set ||= new Set(u.px); const hw = u.half || 0.03, P = S.pts, raw = [];
    const inU = (x, y) => { const X = Math.floor(x * UN), Y = Math.floor(y * UN); return X >= 0 && Y >= 0 && X < UN && Y < UN && u.set.has(Y * UN + X); };
    const st = 0.5 / UN, lim = 4 * hw, span = (x, y, nx, ny) => { let a = 0, b = 0; while (a < lim && inU(x - nx * (a + st), y - ny * (a + st))) a += st; while (b < lim && inU(x + nx * (b + st), y + ny * (b + st))) b += st; return [a, b]; };
    if (P.length < 2) raw.push({ x: P[0][0], y: P[0][1], nx: 0, ny: 0, off: 0, wd: 2 * hw });
    else for (let k = 1; k < P.length; k++) { const ax = P[k - 1][0], ay = P[k - 1][1], dx = P[k][0] - ax, dy = P[k][1] - ay, L = Math.hypot(dx, dy); if (L < 1e-6) continue; const nx = -dy / L, ny = dx / L, steps = Math.max(1, Math.ceil(L * UN));
      for (let i = 0; i <= steps; i++) { if (k > 1 && i === 0) continue; const px = ax + dx * (i / steps), py = ay + dy * (i / steps), r = { x: px, y: py, nx, ny, off: null, wd: null };
        if (inU(px, py)) { const [a, b] = span(px, py, nx, ny); r.off = (b - a) / 2; r.wd = a + b; }
        else { for (let d = st; d < 2 * hw && r.off == null; d += st) for (const sg of [1, -1]) { const qx = px + nx * d * sg, qy = py + ny * d * sg; if (r.off == null && inU(qx, qy)) { const [a, b] = span(qx, qy, nx, ny); r.off = d * sg + (b - a) / 2; r.wd = a + b; } } } // 선이 잉크 밖 = 가까운 쪽 잉크로
        raw.push(r); } }
    // 보통 굵기 = 잰 폭의 중앙값 · 다른 획과 만나는 곳(폭이 보통의 1.5배 넘음)·잉크 밖은 가운데를 옮기지 않고 앞뒤 자리를 이어 씀(「대」 ㅣ 붓 길이 가로대 쪽으로 휘어 가로대 끝을 가리던 것)
    const ws = raw.filter(r => r.wd != null).map(r => r.wd).sort((p, q) => p - q), med = Math.min(ws[ws.length >> 1] || 2 * hw, 2 * hw * 1.6), good = r => r.wd != null && r.wd <= med * 1.5; // 보통 굵기 상한 = 그 자모 획 굵기 × 1.6(「예」 짧은 꼭지는 세로획 안 표본이 많아 중앙값이 세로 길이가 되던 것)
    let last = null; for (const r of raw) { if (good(r)) last = r.off; else r.off2 = last; } last = null; for (let i = raw.length - 1; i >= 0; i--) { const r = raw[i]; if (good(r)) last = r.off; else r.off = r.off2 ?? last ?? 0; }
    const out = raw.map(r => ({ x: r.x + r.nx * (r.off || 0), y: r.y + r.ny * (r.off || 0), w: Math.max(2 * hw, Math.min(r.wd ?? med, med)) * 1.15 }));
    { const ws2 = out.map(q => q.w).sort((p, q) => p - q), m2 = ws2[ws2.length >> 1] || 2 * hw * 1.15; const m4 = ws2[ws2.length >> 2] || m2; out.forEach(q => (q.w = u.role === "all" ? m4 : Math.min(q.w, m2 * 1.3))); } // 주인 지도 글자(도우미 K · 칸 = 글자 잉크 전체) = 획 굵기 하나 = 아래 1/4 값(만나는 곳에서 굵어진 폭이 이웃 획을 먹지 않게)
    for (let r = 0; r < 2; r++) for (let i = 1; i < out.length - 1; i++) { out[i].x = (out[i - 1].x + 2 * out[i].x + out[i + 1].x) / 4; out[i].y = (out[i - 1].y + 2 * out[i].y + out[i + 1].y) / 4; } // 부드럽게
    let tot = 0; out.forEach((q, i) => { if (i) tot += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y); q.t = tot; }); out.tot = tot || 1e-6;
    if (gCache.has(ch + "|0|" + hfontKey())) pathCache.set(key, out); return out;
  }
  function brushStroke(ctx, ch, S, f, k = 1) { // 획 앞쪽 f 만큼 · 자리마다 그 자리 굵기 둥근 붓(제 자모 잉크로 잘리니 겉모양은 글꼴 그대로) · k = 굵기 배수(1/1.15 = 실제 잉크 폭)
    const Q = brushPath(ch, S); if (!Q.length) return; const lim = Q.tot * Math.max(0, Math.min(1, f));
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ctx.fillStyle = "#000";
    if (Q.length === 1) { ctx.beginPath(); ctx.arc(Q[0].x * GN, Q[0].y * GN, (Q[0].w * k * GN) / 2, 0, Math.PI * 2); ctx.fill(); return; }
    for (let i = 1; i < Q.length && Q[i - 1].t <= lim; i++) { const A = Q[i - 1], B = Q[i], r = B.t > lim ? (lim - A.t) / Math.max(1e-9, B.t - A.t) : 1;
      ctx.beginPath(); ctx.lineWidth = Math.max(A.w, B.w) * k * GN; ctx.moveTo(A.x * GN, A.y * GN); ctx.lineTo((A.x + (B.x - A.x) * r) * GN + 0.01, (A.y + (B.y - A.y) * r) * GN); ctx.stroke(); }
  }
  // 글자별 손질 표(본부 10-13 「규칙으로 고치지 말고 그 글자들만」 · 글자부 도우미 I) — 글자 → 획 차례(0부터)들: 그 차례 장면에서 새로 칠한 곳 중 가장 큰 덩어리만 남기고 떨어진 조각은 다음 획으로 미룸
  //  좌표 없음(덩어리 크기만 봄) → 글꼴 지문 필요 없음 · 받침 ㅄ 의 ㅂ 아랫가로 차례에 ㅅ 왼획 발끝 조각(괎 괪 귒 긦 꽚 꾒 없 엾) · 「뺎」 첫 ㅂ 가운데 가로 둥근 끝이 둘째 ㅂ 왼기둥에 묻은 조각
  const REV_DEFER = { "괎": [8], "괪": [9], "귒": [7], "긦": [6], "꽚": [9], "꾒": [8], "없": [6], "엾": [7], "뺎": [2] };
  const NO_FILL = new Set([..."끝명춤"]); // 글자별 손질 표(본부 10-14 검사부 지적 · 도우미 J) — 획 끝 메움을 끔: 「끝」 획 자료에 ㅡ 가 없어 ㅡ 잉크를 ㄱ 몫으로 미리 칠함 · 「명」 ㅁ 오른쪽 메움이 ㅕ 가로 자리로 들쭉날쭉 번짐 · 「춤」 획 자료가 비뚤어 ㅊ 꼭지 왼가에 가는 줄
  const FILL_FU = new Set([..."까깐깨께짜쪽경랐와겠견결겼곁끝놀랬별병왔"]); // 글자별 손질 표(본부 10-14 · 글자부 도우미 J) — 쌍자음 첫 ㄱ·ㅈ 꺾인 귀퉁이 · 다른 자모 다음 획 둥근 끝에 걸친 앞 자모 가장자리(「결」 ㄱ 꺾인 곳 · 「와」 ㅇ 아래)가 앱이 남긴 안 그은 자리(fuD)에 막혀 늦게 칠해지던 것 → 이 글자들만 fuD 막음을 같은 칸 남은 획에만(점검 (c)·(b) 지키는 것 확인한 글자만)
  const revPrev = new Map(); // 획순 칠 앞 장면(글자|글꼴|획 수|획 번호 → 칠한 칸) — 한 덩어리 거르기용
  // 주인 지도 덮개(본부 10-14 · 글자부 도우미 K) — 아래 글자만: 글꼴 잉크 픽셀마다 주인 획을 정한 지도로 칠함(획 k 끝 장면 = 주인 ≤ k 잉크 전부 · 진행 중 = 그 획 몫을 붓 길 따라)
  //  주인 = 그 점과 같은 잉크 덩어리를 지나는 획 중 획 몸통(붓 길 · 실제 잉크 폭 · 끝 반듯)이 가장 가까운 획(획 끝 메움·측정과 같은 기준) · 기본 글꼴(gothic500)일 때만 · 다른 글꼴은 원래 칠
  const OWN_MAP = new Set([..."명끝춤머며트통배베같환혼"]), ownMapCache = new Map();
  // 글꼴 지문(기본 글꼴 gothic500 · 400px 잉크 상자 x0 y0 x1 y1 · 잉크 넓이) — 상자 ±2px · 넓이 ±2% 안일 때만 덮개(다른 글꼴·다른 그림이면 원래 칠)
  const OWN_FP = { "명": [71, 37, 329, 363, 41158], "끝": [41, 31, 358, 365, 48205], "춤": [49, 36, 350, 365, 44964], "머": [70, 36, 329, 364, 34859], "며": [70, 36, 329, 364, 37027], "트": [32, 51, 368, 347, 41492], "통": [49, 34, 355, 363, 47136], "배": [68, 37, 336, 364, 41867], "베": [68, 37, 336, 364, 41886], "같": [47, 37, 353, 365, 39566], "환": [43, 35, 358, 369, 44678], "혼": [46, 34, 352, 369, 42107] }, fpCache = new Map();
  const useOwn = ch => { if (!OWN_MAP.has(ch) || hfontKey() !== "gothic500") return false; const k = ch + "|" + hfontKey(); if (fpCache.has(k)) return fpCache.get(k);
    const G = img2a(glyphImg(ch)), F = OWN_FP[ch]; let x0 = GN, y0 = GN, x1 = -1, y1 = -1, n = 0; for (let i = 0; i < GN * GN; i++) if (G[i] >= 128) { n++; const x = i % GN, y = (i / GN) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const ok = !!F && Math.abs(x0 - F[0]) <= 2 && Math.abs(y0 - F[1]) <= 2 && Math.abs(x1 + 1 - F[2]) <= 2 && Math.abs(y1 + 1 - F[3]) <= 2 && Math.abs(n - F[4]) <= F[4] * 0.02;
    if (gCache.has(ch + "|0|" + hfontKey())) fpCache.set(k, ok); return ok; };
  // 획 점 바로잡기(글자 지문이 맞을 때만 · 0~1 · 획 차례 0부터) — 자모 칸이 이웃 자모 잉크까지 잡아 자료 점이 어긋난 것 · 나중 획 시작 = 앞 획 잉크 가장자리(둥근 끝이 앞 획 귀퉁이를 파먹지 않고 · 앞 획 몫과 반듯하게 갈림)
  const OWN_PTS = {
    "명": { 1: [[0.18, 0.189], [0.51, 0.189], [0.51, 0.5175]], 2: [[0.18, 0.4825], [0.51, 0.4825]], 3: [[0.5575, 0.254], [0.7275, 0.254]], 4: [[0.5575, 0.416], [0.7275, 0.416]] }, // ㅁ 칸이 ㅕ 가로 잉크까지 잡아 ㅁ 오른세로·아랫가로 자료가 ㅕ 자리로 늘어나 있던 것
    "머": { 3: [[0.5525, 0.421], [0.7275, 0.421]] }, "며": { 3: [[0.5525, 0.321], [0.7275, 0.321]], 4: [[0.5525, 0.541], [0.7275, 0.541]] }, // ㅓ ㅕ 가로 = ㅁ 오른세로 가장자리 → 세로 왼가(세로 칸은 세로 몫)
    "끝": { 0: [[0.175, 0.1175], [0.415, 0.1175], [0.3775, 0.375]], 1: [[0.5175, 0.1175], [0.752, 0.1175], [0.7225, 0.375]], 2: [[0.1025, 0.416], [0.8925, 0.416]], 3: [[0.2025, 0.57], [0.8, 0.57]], 4: [[0.3, 0.7215], [0.7775, 0.7215]], 5: [[0.251, 0.5325], [0.251, 0.8725], [0.805, 0.8725]] }, // ㅡ 자료가 ㅌ 윗가로에 · ㅌ 가운데 가로 둘 · ㄲ 둘째 ㄱ 비뚤
    "춤": { 0: [[0.496, 0.09], [0.496, 0.17]], 1: [[0.2, 0.206], [0.795, 0.206]], 2: [[0.4975, 0.23], [0.4975, 0.26], [0.45, 0.31], [0.4, 0.356], [0.35, 0.3825], [0.3, 0.399], [0.225, 0.414], [0.18, 0.41]], 3: [[0.5, 0.27], [0.55, 0.31], [0.6, 0.361], [0.65, 0.385], [0.7, 0.4], [0.775, 0.415], [0.82, 0.403]], 5: [[0.496, 0.575], [0.496, 0.655]], 6: [[0.2575, 0.655], [0.2575, 0.91]], 7: [[0.2125, 0.69], [0.735, 0.69], [0.735, 0.91]], 8: [[0.2125, 0.875], [0.78, 0.875]] }, // ㅊ 꼭지 자료가 가로대를 따라 비뚤 · ㅅ 굽은 획 · ㅜ 다리 = 가로 아래~ㅁ 위 · (10-15 ㅊ 4획 = 가로·왼삐침 따로 · 차례 하나씩 밀림)
    "트": { 1: [[0.2875, 0.3725], [0.795, 0.3725]], 2: [[0.235, 0.1275], [0.235, 0.584], [0.8225, 0.584]] }, // ㅌ 가운데 가로 = 세로 오른가에서 시작
    "통": { 1: [[0.315, 0.2575], [0.775, 0.2575]], 2: [[0.2675, 0.085], [0.2675, 0.3975], [0.8, 0.3975]], 3: [[0.5025, 0.435], [0.5025, 0.505]] }, // ㅗ 꼭지 = ㅌ 아래~ㅗ 가로 위
    "배": { 2: [[0.255, 0.395], [0.4, 0.395]], 3: [[0.255, 0.671], [0.4, 0.671]], 5: [[0.6575, 0.446], [0.7525, 0.446]] }, // ㅂ 가로 = 두 세로 사이 · ㅏ 가로 = 세로 오른가에서
    "베": { 2: [[0.255, 0.399], [0.4, 0.399]], 3: [[0.255, 0.67], [0.4, 0.67]], 4: [[0.485, 0.434], [0.5875, 0.434]] }, // ㅓ 가로 = ㅂ 오른가에서
    "같": { 0: [[0.1525, 0.186], [0.5, 0.186], [0.4825, 0.25], [0.4625, 0.3], [0.43, 0.35], [0.3775, 0.4], [0.3175, 0.4375], [0.2375, 0.475], [0.155, 0.5]], 2: [[0.7625, 0.3125], [0.88, 0.3125]], 3: [[0.2325, 0.601], [0.765, 0.601]], 4: [[0.325, 0.7375], [0.7575, 0.7375]], 5: [[0.279, 0.5675], [0.279, 0.876], [0.785, 0.876]] }, // ㄱ 굽은 획 · ㅌ 가운데 가로 = 세로 오른가에서
    "환": { 0: [[0.37, 0.0875], [0.37, 0.165]], 3: [[0.37, 0.52], [0.37, 0.58]], 6: [[0.775, 0.4175], [0.893, 0.4175]] }, // ㅎ 꼭지 자료가 가로대를 따라 · ㅗ 꼭지 = 고리 아래~가로 위
    "혼": { 0: [[0.496, 0.09], [0.496, 0.165]], 3: [[0.496, 0.525], [0.496, 0.585]] }
  };
  function ownMap(ch, list) {
    const key = ch + "|" + hfontKey() + "|" + list.map(S => S.unit + ":" + S.pts.map(p => p.map(v => v.toFixed(3)).join(",")).join(";")).join("/"); if (ownMapCache.has(key)) return ownMapCache.get(key);
    const N = GN, G = img2a(glyphImg(ch)), BP = list.map(S => brushPath(ch, S)), own = new Int16Array(N * N).fill(-1), pos = new Float32Array(N * N);
    const bodyD = (Q, px, py) => { if (Q.length === 1) return Math.hypot(Q[0].x - px, Q[0].y - py) - Q[0].w / 2.3; let b = Infinity;
      for (let s = 1; s < Q.length; s++) { const A = Q[s - 1], B = Q[s], dx = B.x - A.x, dy = B.y - A.y, ll = dx * dx + dy * dy; if (ll < 1e-12) continue; const tc = Math.max(0, Math.min(1, ((px - A.x) * dx + (py - A.y) * dy) / ll)), d = Math.hypot(px - A.x - dx * tc, py - A.y - dy * tc) - (A.w + (B.w - A.w) * tc) / 2.3; if (d < b) b = d; }
      if (Math.hypot(Q[0].x - Q[Q.length - 1].x, Q[0].y - Q[Q.length - 1].y) > Q[0].w || Q.tot < 4 * Q[0].w) for (const [E, F] of [[Q[0], Q.find(q => q.t >= Q[0].t + Q[0].w) || Q[Q.length - 1]], [Q[Q.length - 1], [...Q].reverse().find(q => q.t <= Q[Q.length - 1].t - Q[Q.length - 1].w) || Q[0]]]) { const ex = E.x - F.x, ey = E.y - F.y, el = Math.hypot(ex, ey); if (el < 1e-9) continue; const o = ((px - E.x) * ex + (py - E.y) * ey) / el; if (o > 0) b = Math.max(b, o); } // 닫힌 획(ㅇ 고리)은 끝 없음
      return b; };
    const capD = (Q, px, py) => { if (Q.length === 1) return Math.hypot(Q[0].x - px, Q[0].y - py) - Q[0].w / 2.3; let b = Infinity; for (let s = 1; s < Q.length; s++) { const A = Q[s - 1], B = Q[s], dx = B.x - A.x, dy = B.y - A.y, ll = dx * dx + dy * dy; if (ll < 1e-12) continue; const tc = Math.max(0, Math.min(1, ((px - A.x) * dx + (py - A.y) * dy) / ll)), d = Math.hypot(px - A.x - dx * tc, py - A.y - dy * tc) - (A.w + (B.w - A.w) * tc) / 2.3; if (d < b) b = d; } return b; };
    const tAt = (Q, px, py) => { if (Q.length < 2) return 0; let tm = Infinity, b = Infinity, tb = 0; for (const q of Q) { const d = Math.hypot(q.x - px, q.y - py); if (d <= q.w / 2 && q.t < tm) tm = q.t; if (d < b) { b = d; tb = q.t; } } return (tm < Infinity ? tm : tb) / Math.max(1e-9, Q.tot); }; // 칠 자리 = 붓(둥근 붓 반지름 안)이 그 점에 처음 닿는 때(ㅊ 가로대를 되돌아 내려오는 붓 길 · 「춤」)
    const lab = new Int32Array(N * N); { let nl = 0; for (let i0 = 0; i0 < N * N; i0++) { if (lab[i0] || G[i0] < 128) continue; lab[i0] = ++nl; const st = [i0]; while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && !lab[j] && G[j] >= 128) { lab[j] = nl; st.push(j); } } } }
    const labS = BP.map(Q => { const L2 = new Set(); for (const q of Q) { const x = Math.min(N - 1, Math.max(0, Math.floor(q.x * N))), y = Math.min(N - 1, Math.max(0, Math.floor(q.y * N))); if (lab[y * N + x]) L2.add(lab[y * N + x]); } return L2; });
    const labOf = i => { if (lab[i]) return lab[i]; const x = i % N, y = (i / N) | 0; for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N && lab[Y * N + X]) return lab[Y * N + X]; } return 0; }; // 반투명 가장자리 = 붙은 잉크 덩어리
    const fix = OWN_FIX[ch];
    for (let i = 0; i < N * N; i++) { if (!G[i]) continue; const px = (i % N + 0.5) / N, py = (((i / N) | 0) + 0.5) / N, lb = labOf(i), any = lb && labS.some(S2 => S2.has(lb)); let bd = Infinity, bs = -1;
      for (let si = 0; si < BP.length && bs < 0; si++) if (bodyD(BP[si], px, py) <= 0.6 / N) bs = si; // 먼저 긋는 획 몸통(실제 잉크 폭 · 끝 반듯) 안 = 그 획 몫
      if (bs < 0) BP.forEach((Q, si) => { if (any && !labS[si].has(lb)) return; const d = bodyD(Q, px, py); if (d < bd) { bd = d; bs = si; } }); // 어느 몸통에도 안 든 잉크(꺾인 바깥 귀퉁이 등) = 몸통이 가장 가까운 획
      if (fix) bs = fix(px, py, bs); own[i] = bs; pos[i] = bs >= 0 ? tAt(BP[bs], px, py) : 0; }
    const o = { own, pos, G }; if (gCache.has(ch + "|0|" + hfontKey())) ownMapCache.set(key, o); return o;
  }
  const img2a = cv => { const d = cv.getContext("2d").getImageData(0, 0, GN, GN).data, a = new Uint8Array(GN * GN); for (let i = 0; i < GN * GN; i++) a[i] = d[i * 4 + 3]; return a; };
  const OWN_FIX = { // 글자별 손 경계(필요할 때만) — (x, y, 주인) → 주인 · 좌표 = 기본 글꼴 400px 기준(지문이 맞을 때만 씀)
    "끝": (x, y, o) => (o === 2 && y < 150.5 / 400 ? (x < 0.5 ? 0 : 1) : o) // ㄲ 비스듬한 세로 발끝 = ㅡ 윗변까지 ㄱ 몫(반듯한 끝이 기울어 ㅡ 위에 회색 세모가 남던 것)
  };
  function revealOwn(mx, ch, list, upto, f) {
    const { own, pos, G } = ownMap(ch, list), id = mx.createImageData(GN, GN), D = id.data, SF = 0.03;
    for (let i = 0; i < GN * GN; i++) { const o = own[i]; if (!G[i] || o < 0) continue; let a = 0; if (o < upto || (o === upto && f >= 1)) a = 1; else if (o === upto && f > 0) a = Math.max(0, Math.min(1, (f - pos[i]) / SF + 1)); if (a > 0) D[i * 4 + 3] = Math.round(G[i] * a); }
    mx.putImageData(id, 0, 0);
  }
  function revealOrder(ch, n, list, upto, f) {
    const us = unitsOf(ch), img = glyphImg(ch), all = upto >= list.length || (upto === list.length - 1 && f >= 1);
    const m = document.createElement("canvas"); m.width = m.height = GN; const mx = m.getContext("2d");
    if (all) mx.drawImage(img, 0, 0); // 마지막 획까지 = 글자 잉크 전부
    else if (useOwn(ch)) revealOwn(mx, ch, list, upto, f); // 주인 지도 덮개(도우미 K)
    else {
      const sc = document.createElement("canvas"); sc.width = sc.height = GN; const sx = sc.getContext("2d");
      for (let si = 0; si <= Math.min(upto, list.length - 1); si++) { const fr = si < upto ? 1 : f; if (fr <= 0) continue;
        sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, GN, GN); brushStroke(sx, ch, list[si], fr);
        sx.globalCompositeOperation = "destination-in"; sx.drawImage(unitMask(ch, list[si].unit), 0, 0); // 같은 자리(초성·중성·종성) 자모 잉크 근처만 — 「대」 ㅐ 가로대 끝(나눔에서 ㅣ 몫)은 칠하고 다른 자모로는 안 넘어감
        mx.drawImage(sc, 0, 0); }
      // 아직 안 그은 획 자리(그 획 붓 길 · 실제 잉크 폭)는 칠하지 않음 — 이미 그은 획과 겹치는 곳(만나는 자리)은 그대로(본부 10-08 「요」 ㅇ 이 꼭지 윗부분 · 꼭지가 가로획 안까지 미리 칠하던 것)
      let fuD = null; if (upto + 1 < list.length) { const fu = document.createElement("canvas"); fu.width = fu.height = GN; const fx = fu.getContext("2d"), dn = document.createElement("canvas"); dn.width = dn.height = GN; const dx2 = dn.getContext("2d");
        for (let j = upto + (f > 0 ? 1 : 0); j < list.length; j++) if (j > upto || f <= 0) { if (list[j].midT || (us[list[j].unit]?.role === "jong" && us[list[j].unit].jamo === "ㅅ" && us[list[j].unit - 1]?.role === "jong" && /[ㄱㅂ]/.test(us[list[j].unit - 1].jamo))) { const tc = document.createElement("canvas"); tc.width = tc.height = GN; const tx = tc.getContext("2d"); brushStroke(tx, ch, list[j], 1, 1.1); tx.globalCompositeOperation = "destination-in"; tx.drawImage(unitMask(ch, list[j].unit), 0, 0); fx.drawImage(tc, 0, 0); } else brushStroke(fx, ch, list[j], 1, 1.1); } /* ㅍ 세로(midT) · 받침 ㄳ ㅄ 의 ㅅ(unitMask 가 앞 ㄱ ㅂ 를 빼냄 · s9 「헋」 — ㅅ 왼획 붓 자리가 ㄱ 기둥 아래 귀퉁이를 안 그은 자리로 잡아 ㅅ 차례에 외딴 조각) 안 그은 자리 = 제 자리(초성·중성·종성) 잉크 근처만(「윂」 — 받침 ㅍ 오른세로 윗끝 둥근 붓이 위 ㅓ 세로 아래 끝을 안 그은 자리로 잡아 ㅓ 끝이 외딴 조각으로 남던 것) */ // 안 그은 획 자리 = 붓 폭보다 조금 넓게(가장자리 실선 조각 안 남게)
        for (let i = 0; i <= Math.min(upto, list.length - 1); i++) brushStroke(dx2, ch, list[i], i < upto ? 1 : f, 1 / 1.15);
        /* 붙는 끝(본부 10-12 획순 칠) — 이미 그은 획의 끝이 같은 자모의 안 그은 획 자리 안에 있으면(ㅕ 가로대 끝 → 세로, ㅌ 가운데 가로 끝 → 왼기둥) 그 겹친 곳은 안 그은 획 몫으로 남김(나중 획이 끊기지 않고 한 덩어리로 칠해짐) */
        for (let j = upto + (f > 0 ? 1 : 0); j < list.length; j++) { if (!(j > upto || f <= 0)) continue; let Fj = null;
          for (let i = 0; i <= Math.min(upto, list.length - 1); i++) { if (list[i].unit !== list[j].unit || (i === upto && f < 1)) continue; const Q = brushPath(ch, list[i]); if (Q.length < 2) continue; const midJ = list[i].midT?.includes(list[j]); /* ㅍ 세로 → 나중 아랫가로 가운데(extendEnds midBar · 「풲」「앞」) = 짧아도 겹친 곳은 가로 몫 → 세로 칠이 가로 윗변에서 반듯하게 멈춤 */ if (!midJ) { const Pw = brushPath(ch, list[j]), wj = Pw.map(q => q.w).sort((p2, q2) => p2 - q2)[Pw.length >> 1] / 1.15, hz = P2 => Math.abs(P2[P2.length - 1][0] - P2[0][0]) > Math.abs(P2[P2.length - 1][1] - P2[0][1]); if (!hz(list[i].pts) && hz(list[j].pts) && wj > 0.25 * Q.tot && us[list[i].unit + 1]?.jamo !== us[list[i].unit].jamo) continue; } /* 쌍자음 첫 자모(ㅃ 첫 ㅂ — 아랫가로 끝이 둘째 ㅂ 쪽으로 나옴)는 그대로 */ /* 짧은 세로 끝이 굵은 나중 가로에 닿으면(겹친 곳이 세로 길이 25%↑) 그 겹친 곳은 세로 몫(「뼌」 둘째 ㅂ 오른세로 아래 1/3) */
            const Pj = brushPath(ch, list[j]), hw = Math.max(...Pj.map(q => q.w)) * 1.1 / 2;
            const inJ = (q, q2) => Pj.some((r, ri) => { if (!(Math.hypot(r.x - q.x, r.y - q.y) <= hw && r.t > 0.2 * Pj.tot && r.t < 0.8 * Pj.tot)) return false; const r2 = Pj[Math.min(Pj.length - 1, ri + 1)], r1 = Pj[Math.max(0, ri - 1)], ax = r2.x - r1.x, ay = r2.y - r1.y, bx = q.x - q2.x, by = q.y - q2.y, cs = Math.abs(ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1); return cs < 0.7; }); /* 나중 획 몸통 가운데(양 끝 10% 빼고)에 거의 수직으로 붙은 끝만(「른」 나란히 겹친 ㄹ 획은 아님) */
            const k5 = Math.min(5, Q.length - 1), nearJ = Q.filter(q => Pj.some(r => Math.hypot(r.x - q.x, r.y - q.y) <= hw)).length; const ju = us[list[i].unit], shortOK = ju?.role === "jung" && /[ㅓㅕㅔㅖ]/.test(ju.jamo) && Math.abs(Q[Q.length - 1].x - Q[0].x) > Math.abs(Q[Q.length - 1].y - Q[0].y) && Math.abs(Pj[Pj.length - 1].y - Pj[0].y) > Math.abs(Pj[Pj.length - 1].x - Pj[0].x); /* ㅓ ㅕ 짧은 가로가 세로에 붙는 끝은 짧아도 세로 몫으로(본부 10-12 획순 칠 ③ 「폡」「몣」「쏌」 — 넓은 첫 자음 옆 ㅕ 가로가 짧아 세로를 위아래로 가르던 것) */
            if (!midJ && ((!shortOK && (nearJ > 0.4 * Q.length || Q.tot < 5 * hw)) || (!inJ(Q[0], Q[k5]) && !inJ(Q[Q.length - 1], Q[Q.length - 1 - k5])))) continue; /* 짧은 획(ㅊ ㅎ 꼭지)은 그대로 */
            if (!Fj) { Fj = document.createElement("canvas"); Fj.width = Fj.height = GN; brushStroke(Fj.getContext("2d"), ch, list[j], 1, 1 / 1.15); } /* 나중 획이 실제로 칠할 폭만(「빶」 — 넓게 잡아 둘째 ㅂ 왼아래 귀퉁이가 끝까지 회색) */
            dx2.globalCompositeOperation = "destination-out"; dx2.drawImage(Fj, 0, 0); dx2.globalCompositeOperation = "source-over"; } }
        fx.globalCompositeOperation = "destination-out"; fx.drawImage(dn, 0, 0);
        mx.globalCompositeOperation = "destination-out"; mx.drawImage(fu, 0, 0); mx.globalCompositeOperation = "source-over"; fuD = fx.getImageData(0, 0, GN, GN).data; }
      { const id = mx.getImageData(0, 0, GN, GN), D = id.data; for (let y = 1; y < GN - 1; y++) for (let x = 1; x < GN - 1; x++) { const i = (y * GN + x) * 4 + 3; if (D[i] < 128 && D[i - 4] >= 128 && D[i + 4] >= 128 && D[i - GN * 4] >= 128 && D[i + GN * 4] >= 128) D[i] = 255; } mx.putImageData(id, 0, 0); } // 한 점 바늘구멍 메움
      mx.globalCompositeOperation = "destination-in"; mx.drawImage(img, 0, 0); // 글꼴 잉크로 자름(모양 = 글꼴)
      // 한 획 = 한 덩어리(본부 10-11 ④) — 이번 획에 새로 칠한 곳 중 큰 덩어리와 떨어진 작은 조각(새 넓이 20% 미만)은 지금 안 칠함(마지막 장면에 글자 전부로 칠해짐) · 앞 장면은 기억
      mx.globalCompositeOperation = "source-over";
      if (upto < list.length) { const key = `${ch}|${hfontKey()}|${list.map(S => S.unit + ":" + S.pts.map(p2 => p2.map(v => v.toFixed(3)).join(",")).join(";")).join("/")}|${upto - 1}`; /* 앞 장면 열쇠 = 획 자료 전체(글꼴이 늦게 와 다른 획 자료로 만든 앞 장면을 다시 쓰지 않게 · 본부 10-12 「뼏」 실행마다 다름) */ let prev = upto > 0 ? revPrev.get(key) : null;
        if (upto > 0 && !prev) { const pc = revealOrder(ch, GN, list, upto - 1, 1).cv.getContext("2d").getImageData(0, 0, GN, GN).data; prev = new Uint8Array(GN * GN); prev.a = new Uint8Array(GN * GN); for (let i = 0; i < GN * GN; i++) { prev[i] = pc[i * 4 + 3] >= 128 ? 1 : 0; prev.a[i] = pc[i * 4 + 3]; } if (revPrev.size > 400) revPrev.clear(); if (gCache.has(ch + "|0|" + hfontKey())) revPrev.set(key, prev); } /* 글꼴 온 뒤에만 기억(다른 기억들과 같음) */ /* prev.a = 앞 장면 알파(반투명 가장자리 그대로 두기) */
        const id = mx.getImageData(0, 0, GN, GN), D = id.data;
        const compsOf = A => { const nw = new Int32Array(GN * GN).fill(-1), sizes = []; let tot = 0; for (let i = 0; i < GN * GN; i++) { if (nw[i] >= 0 || A[i * 4 + 3] < 128 || (prev && prev[i])) continue; const id2 = sizes.length, st = [i]; nw[i] = id2; let c = 0; while (st.length) { const q = st.pop(); c++; const x = q % GN; for (const j of [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN]) if (j >= 0 && j < GN * GN && nw[j] < 0 && A[j * 4 + 3] >= 128 && !(prev && prev[j])) { nw[j] = id2; st.push(j); } } sizes.push(c); tot += c; } return { nw, sizes, tot, bigN: sizes.filter(c => c >= tot * 0.2).length }; };
        let addL = 0; { /* 남는 조각(본부 10-12 획순 칠 ①②) — 아직 안 칠한 잉크 덩어리가 이번 획 새 칠에 닿아 있고, 안 그은 획 자리도 아니고, 같은 자리(초성·중성·종성) 잉크면 지금 같이 칠함(나중에 외딴 조각으로 칠해지지 않게 · 「침」 ㅊ 가로대 오른끝 · 「퀎」 ㅝ 의 ㅓ 짧은 가로) */
          const u200 = new Int16Array(UN * UN).fill(-1); us.forEach((u, ui) => { for (const q of u.px) u200[q] = ui; });
          const G = img.getContext("2d").getImageData(0, 0, GN, GN).data, um = unitMask(ch, list[upto].unit).getContext("2d").getImageData(0, 0, GN, GN).data, seen = new Uint8Array(GN * GN); let newN = 0; for (let i = 0; i < GN * GN; i++) if (D[i * 4 + 3] >= 128 && !(prev && prev[i])) newN++;
          const inF = q => fuD && fuD[q * 4 + 3] >= 128, cuJ = list[upto].unit, vorJ = (us[cuJ]?.jamo === "ㅈ" && us[cuJ + 1]?.jamo === "ㅈ" && us[cuJ].role === "cho") ? (() => { const Qc = brushPath(ch, list[upto]), Fs = list.filter((S, j) => j > upto).map(S => brushPath(ch, S)), d = (P, x, y) => { let b = Infinity; for (const q of P) { const e = (q.x - x) ** 2 + (q.y - y) ** 2; if (e < b) b = e; } return b; };
            return q => { const x = (q % GN + 0.5) / GN, y = (((q / GN) | 0) + 0.5) / GN, dc = d(Qc, x, y); return Fs.every(P => d(P, x, y) > dc); }; })() : null; /* ㅉ 첫 ㅈ 차례: 나중 획 길보다 지금 획 길에 가까운 잉크는 「안 그은 획 자리」로 안 셈 · 조각은 그런 잉크와 자리 밖 잉크로만(「찃」 첫 ㅈ 가로대 오른끝) */ /* 안 그은 획 자리는 조각에서 뺌(「침」 ㅊ 가로대 오른끝이 오른다리 자리와 이어져 통째로 빠지던 것) */
          const okV = q => !vorJ || !inF(q) || vorJ(q);
          if (newN) for (let i0 = 0; i0 < GN * GN; i0++) { if (seen[i0] || G[i0 * 4 + 3] < 128 || D[i0 * 4 + 3] >= 128 || (prev && prev[i0]) || !okV(i0)) continue; const c = [], st = [i0]; seen[i0] = 1; let touch = 0, tPrev = 0, fut = 0, outU = 0;
            while (st.length) { const q = st.pop(); c.push(q); if (fuD && fuD[q * 4 + 3] >= 128 && !(vorJ && vorJ(q))) fut++; if (um[q * 4 + 3] < 128) outU++; const x = q % GN; for (const j of [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN]) { if (j < 0 || j >= GN * GN) continue; if (D[j * 4 + 3] >= 128 && !(prev && prev[j])) touch++; else if (prev && prev[j]) tPrev++; if (!seen[j] && G[j * 4 + 3] >= 128 && D[j * 4 + 3] < 128 && !(prev && prev[j]) && okV(j)) { seen[j] = 1; st.push(j); } } }
            if (touch >= 6 && touch >= tPrev && fut < c.length * 0.1 && outU < c.length * 0.1 && c.length < newN * 0.6) { let mine = 0, other = 0; for (const q of c) { const o = u200[Math.min(UN - 1, ((q / GN) | 0) * UN / GN | 0) * UN + Math.min(UN - 1, (q % GN) * UN / GN | 0)]; if (o === list[upto].unit) mine++; else if (o >= 0) other++; } /* 같은 자모 몫 잉크만(「쮁」 — 첫 ㅈ 조각을 둘째 ㅈ 획에 붙이던 것) */ const Qc = brushPath(ch, list[upto]), wq = Math.max(...Qc.map(q => q.w)); let cx2 = 0, cy2 = 0; for (const q of c) { cx2 += (q % GN + 0.5) / GN; cy2 += (((q / GN) | 0) + 0.5) / GN; } cx2 /= c.length; cy2 /= c.length; const dQ = Math.min(...Qc.map(q => Math.hypot(q.x - cx2, q.y - cy2)));
            let dDone = Infinity; for (let i2 = 0; i2 < upto; i2++) if (list[i2].unit !== list[upto].unit) for (const q of brushPath(ch, list[i2])) dDone = Math.min(dDone, Math.hypot(q.x - cx2, q.y - cy2)); /* 다른 자모의 이미 그은 획에 더 가까우면 그 획 남은 것(「눯」 ㅓ 세로 아래 끝) */
            if (mine >= other && (dQ <= 2.5 * wq || (fut === 0 && touch >= 20 && dQ <= 5 * wq)) && dQ <= dDone) { /* 이번 칠에 넓게 붙고 안 그은 획 자리와 안 겹치는 조각은 조금 멀어도(획 길 밖 가로대 끝 · 「침」 ㅊ 가로대 오른끝) */ const C0 = compsOf(D), keep = c.map(q => D[q * 4 + 3]); for (const q of c) D[q * 4 + 3] = G[q * 4 + 3]; const C1 = compsOf(D); if (C1.sizes.length > C0.sizes.length) c.forEach((q, t) => (D[q * 4 + 3] = keep[t])); else addL += c.length; } } } } /* 붙여서 따로 떨어진 조각이 하나 늘면 안 붙임 */
        let C = compsOf(D); const totPre = C.tot - addL; /* 20% 기준 = 이음·남는 조각 붙이기 전 새 칠 넓이(「폠」 ㅕ 세로 가운데 토막이 기준이 커져 빠지던 것) */
        if (C.bigN > 1) { /* 이음(본부 10-12 획순 칠) — 이번 획 붓 길 가운데(실제 잉크 폭)가 다른 자모 잉크를 지나며 조각이 둘로 나뉘면 그 붓 길 잉크도 이번에 칠함(「뼏」 ㅂ 오른기둥 · ㅕ 가로대 자리) · 큰 조각 수가 줄 때만 */
          const bc = document.createElement("canvas"); bc.width = bc.height = GN; const bx = bc.getContext("2d"); brushStroke(bx, ch, list[upto], f, 1 / 1.15); bx.globalCompositeOperation = "destination-in"; bx.drawImage(img, 0, 0);
          const B = bx.getImageData(0, 0, GN, GN).data, D2 = new Uint8ClampedArray(D); for (let i = 0; i < GN * GN; i++) if (B[i * 4 + 3] >= 128 && D2[i * 4 + 3] < 128 && !(fuD && fuD[i * 4 + 3] >= 128)) D2[i * 4 + 3] = B[i * 4 + 3]; /* 안 그은 획 자리는 이어도 안 칠함(「폠」 ㅕ 가로대가 세로 안까지) */
          const C2 = compsOf(D2); if (C2.bigN < C.bigN) { D.set(D2); C = C2; } }
        if (C.sizes.length > 1) { const big = C.sizes.indexOf(Math.max(...C.sizes)), farB = new Uint8Array(C.sizes.length).fill(1), wc = document.createElement("canvas"); wc.width = wc.height = GN; brushStroke(wc.getContext("2d"), ch, list[upto], Math.max(f, 0.01), 1.5); if (list[upto].midT) { const wx = wc.getContext("2d"); wx.globalCompositeOperation = "destination-in"; wx.drawImage(unitMask(ch, list[upto].unit), 0, 0); } /* ㅍ 세로(midT) 붓 자리도 제 자리 잉크 근처만(「뤞」 — 받침 ㅍ 오른세로 윗끝 붓 자리에 위 ㅓ 세로 아래 끝 남은 조각이 걸려 이 차례에 외딴 조각으로 칠해지던 것) */ const WB = wc.getContext("2d").getImageData(0, 0, GN, GN).data;
          for (let i = 0; i < GN * GN; i++) { const g = C.nw[i]; if (g >= 0 && farB[g] && WB[i * 4 + 3] >= 128) farB[g] = 0; } /* 이번 획 붓 자리(1.5배)에 하나도 안 걸친 조각 = 앞 획 남은 조각 → 60% 미만이면 미룸(「폠」 ㅍ 아랫가로 왼끝이 ㅓ 차례에 외딴 조각) */
          const tP = new Uint8Array(C.sizes.length); if (prev) for (let i = 0; i < GN * GN; i++) { const g = C.nw[i]; if (g < 0 || tP[g] || C.sizes[g] < 450) continue; const x = i % GN; for (const j of [x > 0 ? i - 1 : -1, x < GN - 1 ? i + 1 : -1, i - GN, i + GN]) if (j >= 0 && j < GN * GN && prev[j]) { tP[g] = 1; break; } } /* 앞 칠에 붙은 큰 조각(450칸↑)은 지금 칠함(「폠」 ㅍ 아랫가로 왼끝 · 미루면 나중 획에 외딴 조각) */
          for (let i = 0; i < GN * GN; i++) { const g = C.nw[i]; if (g >= 0 && g !== big && (C.sizes[g] < 60 || (!(tP[g] && !farB[g]) && C.sizes[g] < totPre * (farB[g] ? 0.6 : 0.2)))) /* 붙인 남는 조각은 기준에서 뺌(「치」) · 60칸 미만 티끌은 늘 미룸(「쨧」) */ D[i * 4 + 3] = 0; } }
        if (REV_DEFER[ch]?.includes(upto) && f > 0) { const C3 = compsOf(D); if (C3.sizes.length > 1) { const u200 = new Int16Array(UN * UN).fill(-1); us.forEach((u, ui) => { for (const q of u.px) u200[q] = ui; }); const big = C3.sizes.indexOf(Math.max(...C3.sizes)); for (let i = 0; i < GN * GN; i++) { const g = C3.nw[i]; if (g < 0 || g === big) continue; const cx = Math.min(UN - 1, (i % GN) * UN / GN | 0), cy = Math.min(UN - 1, ((i / GN) | 0) * UN / GN | 0); let o = -1; for (let r = 0; r <= 2 && o < 0; r++) for (let dy = -r; dy <= r && o < 0; dy++) for (let dx = -r; dx <= r; dx++) { const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < UN && Y < UN && u200[Y * UN + X] >= 0) { o = u200[Y * UN + X]; break; } } /* 글꼴 가장자리 반투명 점(자모 칸 밖) = 가장 가까운 자모 몫 */ if (o >= 0 && o !== list[upto].unit) D[i * 4 + 3] = 0; } } } /* 글자별 손질 표 — 큰 덩어리 밖 조각 중 다른 자모 몫 잉크(ㅅ 왼획 발끝 · 둘째 ㅂ 왼기둥)만 다음 획으로 · 제 자모 몫(「뺎」 첫 ㅂ 오른기둥 가장자리)은 그대로 */
        for (let i = 0; i < GN * GN; i++) { const al = D[i * 4 + 3]; if (!al || al >= 128 || (prev && (prev[i] || (f <= 0 && prev.a[i])))) continue; const x = i % GN; let ok = false; for (const j of [x > 0 ? i - 1 : -1, x < GN - 1 ? i + 1 : -1, i - GN, i + GN, i - GN - 1, i - GN + 1, i + GN - 1, i + GN + 1]) if (j >= 0 && j < GN * GN && D[j * 4 + 3] >= 128 && !(prev && prev[j])) { ok = true; break; } if (!ok) D[i * 4 + 3] = 0; } /* 새 칠 덩어리에 안 붙은 반투명 가장자리 점은 지움(줄인 그림에서 외딴 점이 되던 것 · 「쨧」) */
        if (f >= 1 && !NO_FILL.has(ch)) { /* 획 끝 메움(본부 10-13 투덜이 「글」 · 글자부 도우미 J) — 한 획이 끝난 장면에 그 획 몫 잉크가 덜 칠해지던 것(붓 길이 꺾인 곳 바깥 귀퉁이·휜 획 가장자리를 못 덮음 · 붓 가장자리 반투명 줄 · 짧은 가로 붙는 곳 옆 가는 띠)
             아직 덜 칠한 글꼴 잉크(글꼴 알파보다 60 넘게 옅음) 중 ① 주인 = 이미 끝난 획 ② 안 그은 획 자리 아님 ③ 지금 칠한 곳(새 칠·앞 칠)에서 잉크로 이어짐 → 글꼴 알파 그대로 칠함
             주인 = 획 몸통(붓 길 · 실제 잉크 폭 · 끝은 둥글지 않고 반듯)까지 거리가 가장 가까운 획 — 자모 칸으로 가르지 않음(「낏」 첫 ㄱ 꺾인 귀퉁이가 둘째 ㄱ 칸으로 잡혀 둘째 ㄱ 차례에 따로 칠해지던 것)
             주인 후보 = 그 점과 같은 글꼴 잉크 덩어리를 지나는 획 · 안 그은 획 자리는 아래 blk(획순 칠 점검 (c) 자리와 겹치지 않게) */
          const G3 = img.getContext("2d").getImageData(0, 0, GN, GN).data, own = new Int16Array(GN * GN).fill(-2), BP = list.map(S => brushPath(ch, S));
          const bodyD = (Q, px, py) => { if (Q.length === 1) return Math.hypot(Q[0].x - px, Q[0].y - py) - Q[0].w / 2.3; let b = Infinity;
            for (let s = 1; s < Q.length; s++) { const A = Q[s - 1], B = Q[s], dx = B.x - A.x, dy = B.y - A.y, ll = dx * dx + dy * dy; if (ll < 1e-12) continue; const tc = Math.max(0, Math.min(1, ((px - A.x) * dx + (py - A.y) * dy) / ll)), d = Math.hypot(px - A.x - dx * tc, py - A.y - dy * tc) - (A.w + (B.w - A.w) * tc) / 2.3; if (d < b) b = d; }
            for (const [E, F] of [[Q[0], Q.find(q => q.t >= Q[0].t + Q[0].w) || Q[Q.length - 1]], [Q[Q.length - 1], [...Q].reverse().find(q => q.t <= Q[Q.length - 1].t - Q[Q.length - 1].w) || Q[0]]]) { const ex = E.x - F.x, ey = E.y - F.y, el = Math.hypot(ex, ey); if (el < 1e-9) continue; const o = ((px - E.x) * ex + (py - E.y) * ey) / el; if (o > 0) b = Math.max(b, o); } /* 끝 = 반듯(끝 너머로 나간 만큼은 멀다) · 끝 방향 = 끝에서 붓 폭만큼 안쪽 점 → 끝 */
            return b; };
          const lab = new Int32Array(GN * GN); { let nl = 0; for (let i0 = 0; i0 < GN * GN; i0++) { if (lab[i0] || G3[i0 * 4 + 3] < 128) continue; lab[i0] = ++nl; const st2 = [i0]; while (st2.length) { const q = st2.pop(), x = q % GN; for (const j of [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN]) if (j >= 0 && j < GN * GN && !lab[j] && G3[j * 4 + 3] >= 128) { lab[j] = nl; st2.push(j); } } } }
          const labS = BP.map(Q => { const L2 = new Set(); for (const q of Q) { const x = Math.min(GN - 1, Math.max(0, Math.floor(q.x * GN))), y = Math.min(GN - 1, Math.max(0, Math.floor(q.y * GN))); if (lab[y * GN + x]) L2.add(lab[y * GN + x]); } return L2; }); /* 획이 지나는 잉크 덩어리들 */
          const ownAt = i => { if (own[i] > -2) return own[i]; const px = (i % GN + 0.5) / GN, py = (((i / GN) | 0) + 0.5) / GN, lb = lab[i], any = lb && labS.some(S2 => S2.has(lb)); let bd = Infinity, bs = -1; BP.forEach((Q, si) => { if (any && !labS[si].has(lb)) return; const d = bodyD(Q, px, py); if (d < bd) { bd = d; bs = si; } }); return (own[i] = bs); }; /* 주인 후보 = 그 점과 같은 잉크 덩어리를 지나는 획(「낏」 첫 ㄱ 오른위 귀퉁이 — 둘째 ㄱ 과 떨어진 잉크인데 거리로는 비김) */
          const mkA = dr => { const c = document.createElement("canvas"); c.width = c.height = GN; dr(c.getContext("2d")); return c.getContext("2d").getImageData(0, 0, GN, GN).data; };
          const butt = (c, Q, k) => { c.lineCap = "butt"; c.lineJoin = "round"; c.strokeStyle = c.fillStyle = "#000"; if (Q.length === 1) { c.beginPath(); c.arc(Q[0].x * GN, Q[0].y * GN, Q[0].w * k * GN / 2, 0, 7); c.fill(); return; } for (let s = 1; s < Q.length; s++) { const A = Q[s - 1], B = Q[s], r = Math.max(A.w, B.w) * k / 2; c.beginPath(); c.lineWidth = 2 * r * GN; c.moveTo(A.x * GN, A.y * GN); c.lineTo(B.x * GN + 0.01, B.y * GN); c.stroke(); if (s > 1 && A.t - Q[0].t >= r && Q[Q.length - 1].t - A.t >= r) { c.beginPath(); c.arc(A.x * GN, A.y * GN, r * GN, 0, 7); c.fill(); } } }; /* 반듯한 끝 붓(꺾인 곳만 둥글게) */
          const more = upto + 1 < list.length, done1 = c => { c.globalCompositeOperation = "destination-out"; for (let i = 0; i <= upto; i++) brushStroke(c, ch, list[i], 1, 1); };
          const nearB = more ? mkA(c => { for (let j = upto + 1; j < list.length; j++) butt(c, BP[j], 1 / 1.15); done1(c); }) : null, nearR = more ? mkA(c => { for (let j = upto + 1; j < list.length; j++) brushStroke(c, ch, list[j], 1, 1 / 1.15); }) : null, fuU = new Map();
          const fuOf = u => { if (!fuU.has(u)) fuU.set(u, mkA(c => { for (let j = upto + 1; j < list.length; j++) if (list[j].unit === u) brushStroke(c, ch, list[j], 1, 1 / 1.15); done1(c); })); return fuU.get(u); };
          const fuR = new Map(), fuOfR = u => { if (!fuR.has(u)) fuR.set(u, mkA(c => { for (let j = upto + 1; j < list.length; j++) if (list[j].unit === u) brushStroke(c, ch, list[j], 1, 1 / 1.15); })); return fuR.get(u); }; /* FILL_FU 글자: fuD 막음을 주인과 같은 칸(unit) 남은 획에만 */
          const blk = i => more && (nearB[i * 4 + 3] >= 128 || fuOf(list[ownAt(i)].unit)[i * 4 + 3] >= 128 || (fuD && fuD[i * 4 + 3] >= 128 && (FILL_FU.has(ch) ? fuOfR(list[ownAt(i)].unit) : nearR)[i * 4 + 3] >= 128)); /* 안 그은 획 자리 = 남은 획 몸통(실제 잉크 폭 · 반듯한 끝) + 주인과 같은 자모의 남은 획은 둥근 끝까지(「정」 ㅈ 오른다리 윗끝) — 둘 다 이미 그은 획 붓 자리는 뺌 · + 앱이 남긴 자리(fuD) 중 남은 획 실제 잉크 폭 안(「쎹」 ㅌ 가운데 가로 왼끝 X 모양) · 다른 자모 획의 둥근 끝은 안 막음(「낏」 첫 ㄱ 꺾인 귀퉁이 · 「었」 첫 ㅅ 오른다리 발끝) */
          const okF = i => G3[i * 4 + 3] >= 128 && D[i * 4 + 3] < G3[i * 4 + 3] - 60 && !(prev && prev[i]) && ownAt(i) >= 0 && ownAt(i) <= upto && !blk(i), st = [], add = [];
          for (let i = 0; i < GN * GN; i++) if (D[i * 4 + 3] >= 128 || (prev && prev[i])) st.push(i); /* 앞 칠에 붙은 곳도(「한」 ㅏ — 세로 왼가장자리 가는 띠가 세로 차례엔 짧은 가로 자리라 남던 것) */
          const seenF = new Uint8Array(GN * GN); while (st.length) { const q = st.pop(), x = q % GN; for (const j of [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN]) if (j >= 0 && j < GN * GN && !seenF[j] && okF(j)) { seenF[j] = 1; add.push(j); st.push(j); } }
          { /* 앞 칠에만 붙은 메움 — 새 칠과 「새 칠 ∪ 메움 ∪ 이번 획 자리 안 앞 칠」로 이어지지 않는 덩어리는 메우지 않음(따로 떨어진 새 조각 · 「꼛」 첫 ㄱ 귀퉁이를 둘째 ㄱ 차례에 칠하던 것 · 「썡」 한 점 · 그 획 차례나 마지막 장면에 칠해짐) */
            const cz = mkA(c => brushStroke(c, ch, list[upto], 1, 1 / 1.15)), inA = new Uint8Array(GN * GN), reach = new Uint8Array(GN * GN), cmp = new Uint8Array(GN * GN), st3 = []; for (const q of add) inA[q] = 1;
            const nb = q => { const x = q % GN; return [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN]; }, ok2 = q => inA[q] || (D[q * 4 + 3] >= 128 && !(prev && prev[q])) || (prev && prev[q] && cz[q * 4 + 3] >= 128);
            for (let i = 0; i < GN * GN; i++) if (D[i * 4 + 3] >= 128 && !(prev && prev[i])) { reach[i] = 1; st3.push(i); }
            while (st3.length) for (const j of nb(st3.pop())) if (j >= 0 && j < GN * GN && !reach[j] && ok2(j)) { reach[j] = 1; st3.push(j); }
            const keep = []; for (const q0 of add) { if (cmp[q0]) continue; cmp[q0] = 1; if (reach[q0]) { keep.push(q0); continue; } const c = [q0]; for (let t = 0; t < c.length; t++) for (const j of nb(c[t])) if (j >= 0 && j < GN * GN && inA[j] && !reach[j] && !cmp[j]) { cmp[j] = 1; c.push(j); } }
            add.length = 0; add.push(...keep); }
          for (const q of add) D[q * 4 + 3] = G3[q * 4 + 3];
          for (const q of add) { const x = q % GN; for (const j of [x > 0 ? q - 1 : -1, x < GN - 1 ? q + 1 : -1, q - GN, q + GN, q - GN - 1, q - GN + 1, q + GN - 1, q + GN + 1]) if (j >= 0 && j < GN * GN && !seenF[j] && G3[j * 4 + 3] && G3[j * 4 + 3] < 128 && D[j * 4 + 3] < G3[j * 4 + 3] && ownAt(j) >= 0 && ownAt(j) <= upto && !blk(j)) { seenF[j] = 1; D[j * 4 + 3] = G3[j * 4 + 3]; } } } /* 메운 곳 가장자리 반투명 점도 글꼴 그대로 */
        if (prev) { const G2 = img.getContext("2d").getImageData(0, 0, GN, GN).data; for (let i = 0; i < GN * GN; i++) { if (prev[i] && D[i * 4 + 3] < 128) D[i * 4 + 3] = G2[i * 4 + 3]; else if (prev[i] && D[i * 4 + 3] < prev.a[i]) D[i * 4 + 3] = prev.a[i]; /* 앞 장면보다 옅어지지 않게(붓 가장자리가 앞 칠 위에 반투명으로 겹친 곳 · 「글」 J) */ else if (f <= 0 && prev.a[i] > D[i * 4 + 3]) D[i * 4 + 3] = prev.a[i]; } } /* 반투명 가장자리는 「획 시작 전(f=0)」 장면에서만 앞 장면 그대로(hand_order ⓔ) */ /* 앞 장면에 칠한 곳은 그대로(이음·남는 조각으로 더 칠한 곳이 다음 장면에 빠지지 않게 · hand_order ⓔ) */
        mx.putImageData(id, 0, 0); }
    }
    const cv = document.createElement("canvas"); cv.width = cv.height = n; const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high"; cx.drawImage(m, 0, 0, n, n);
    cx.globalCompositeOperation = "source-in"; cx.fillStyle = OR_FILL; cx.fillRect(0, 0, n, n);
    const ends = list.map(S => { const u = us[S.unit], P = S.pts, a = u ? nearInk(u, P[0]) : P[0], b = u ? nearInk(u, P[P.length - 1]) : P[P.length - 1], q = P[Math.max(0, P.length - 2)], z = P[P.length - 1]; return { a, b, dir: [z[0] - q[0], z[1] - q[1]] }; });
    return { cv, ends, tip: upto < list.length && f < 1 ? pointAt(list[upto], f) : null };
  }
  return { centerOf, traceOf, UN, uCache, deCrumb, ringFix, unitsOf, get STK() { return STK; }, stkReady, strokesOf, fitOf, snap, OR_MARK, ownCache, unitMaskCache, pathCache, brushPath, brushStroke, revPrev, revealOrder };
}
