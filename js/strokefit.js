// 글자부 10-12 — 자석·자동 완성 획 길을 회색 안내(도구별 글꼴 모양) 안에 맞추기
// fitToGuide(Q, mask, M, r, others) — Q = brushPath 점([{x,y}] 0~1) · mask = 회색 알파(M×M RGBA) · r = 도구 반 굵기(0~1) · others = 다른 획 길들(같은 꼴)
//  ① 점마다 획에 수직으로 회색 거리 능선(가장 깊은 곳)으로 옮김 ② 다른 획 몸통 안으로 들어간 끝 = 그 획 가운데에서 멈춤(「게」 ㅓ 가로)
//  ③ 끝을 능선 따라 늘임(둥근 끝이 회색 안에 들어가는 데까지 · 다른 획 몸통 앞에서 멈춤) ④ 둥근 끝이 나가는 끝 점은 깎음
//  → 반환 [{x,y}] · 이 길을 굵기 2r 둥근 붓으로 그리면 회색 밖 0
function edt(mask, M) { // 회색 안 점마다 회색 밖까지 거리(칸) — 펠젠스왈브 정확 거리 변환
  const INF = 1e12, f = new Float64Array(M * M); for (let i = 0; i < M * M; i++) f[i] = mask[i] > 128 ? INF : 0; // mask = 알파 M×M · 안 = 128 넘음(앱 판정과 같음 · 가로 가장자리 알파가 꼭 128 인 줄이 있음)
  const d1 = (g, n) => { const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1); let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) { let s; while (true) { s = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break; } k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + g[v[k]]; } return d; };
  const row = new Float64Array(M); for (let x = 0; x < M; x++) { for (let y = 0; y < M; y++) row[y] = f[y * M + x]; const d = d1(row, M); for (let y = 0; y < M; y++) f[y * M + x] = d[y]; }
  for (let y = 0; y < M; y++) { const d = d1(f.subarray(y * M, y * M + M), M); for (let x = 0; x < M; x++) f[y * M + x] = Math.sqrt(d[x]); }
  return f;
}
function fitCore(Q, D, M, r, others) {
  if (!Q.length) return Q;
  const at = (x, y) => { // 거리(0~1 칸 비율) · 두 칸 사이 고르게
    const fx = x * M - 0.5, fy = y * M - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, g = (a, b) => (a < 0 || b < 0 || a >= M || b >= M ? 0 : D[b * M + a]);
    return ((g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty) / M; };
  const segD = (P, x, y) => { let b = Infinity; for (let i = 1; i < P.length; i++) { const a = P[i - 1], c = P[i], dx = c.x - a.x, dy = c.y - a.y, l = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)); b = Math.min(b, Math.hypot(x - a.x - dx * t, y - a.y - dy * t)); } return P.length === 1 ? Math.hypot(x - P[0].x, y - P[0].y) : b; };
  const st = 0.5 / M, eps = 1.6 / M; // 여유 = 회색 밖 칸 가운데까지 거리 − 칸 경계 0.5 − 가장자리 흐림 0.5 − 0.6
  if (Q.length === 1) { let p = { x: Q[0].x, y: Q[0].y }; for (let k = 0; k < 40; k++) { let b = p, bv = at(p.x, p.y); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = at(p.x + dx * st, p.y + dy * st); if (v > bv) { bv = v; b = { x: p.x + dx * st, y: p.y + dy * st }; } } if (b === p) break; p = b; } return [p]; }
  // ① 능선으로(수직 방향 ±3r 안 가장 깊은 곳 · 같으면 덜 옮긴 쪽)
  let P = Q.map((q, i) => { const a = Q[Math.max(0, i - 2)], c = Q[Math.min(Q.length - 1, i + 2)], L = Math.hypot(c.x - a.x, c.y - a.y) || 1, nx = -(c.y - a.y) / L, ny = (c.x - a.x) / L;
    let bo = 0, bv = at(q.x, q.y); for (let o = st; o <= 3 * r; o += st) for (const s of [1, -1]) { const v = at(q.x + nx * o * s, q.y + ny * o * s); if (v > bv + 1e-9) { bv = v; bo = o * s; } }
    // 가장 깊은 곳까지 사이가 회색 밖이면(다른 획으로 건너뜀) 안 옮김
    for (let o = 0; Math.abs(o) < Math.abs(bo); o += Math.sign(bo) * st) if (at(q.x + nx * o, q.y + ny * o) <= 0) { bo = 0; break; }
    return { x: q.x + nx * bo, y: q.y + ny * bo }; });
  for (let k = 0; k < 2; k++) for (let i = 1; i < P.length - 1; i++) P[i] = { x: (P[i - 1].x + 2 * P[i].x + P[i + 1].x) / 4, y: (P[i - 1].y + 2 * P[i].y + P[i + 1].y) / 4 };
  const closed = Math.hypot(P[0].x - P[P.length - 1].x, P[0].y - P[P.length - 1].y) < 0.02;
  if (!closed) {
    // ② 다른 획 몸통 안에서 끝남 = 그 획 가운데(가장 가까운 점)에서 자름
    const cut = rev => { const A = rev ? P.slice().reverse() : P; for (const O of others) { if (O.length < 2) continue; const hw = Math.max(r, at(A[0].x, A[0].y)) * 1.1; if (segD(O, A[0].x, A[0].y) > hw) continue;
        let bi = 0, bd = Infinity; for (let i = 0; i < A.length; i++) { const d = segD(O, A[i].x, A[i].y); if (d > hw * 1.5 && i > 0) break; if (d < bd) { bd = d; bi = i; } } if (bi > 0 && bi < A.length - 1) A.splice(0, bi); }
      return rev ? A.reverse() : A; };
    P = cut(false); P = cut(true);
    // ③ 끝 늘이기 — 획 방향 ±50° 부채꼴에서 가장 깊은 다음 점 · 깊이 r 미만이면 멈춤 · 다른 획 가운데로 들어가면 멈춤
    const grow = rev => { const A = rev ? P.slice().reverse() : P; if (A.length < 2) return A; let p = A[0], q = A[Math.min(3, A.length - 1)], dx = p.x - q.x, dy = p.y - q.y, L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const add = [];
      for (let k = 0; k < 400; k++) { let best = null, bv = -1; for (let a = -50; a <= 50; a += 10) { const t = (a * Math.PI) / 180, ux = dx * Math.cos(t) - dy * Math.sin(t), uy = dx * Math.sin(t) + dy * Math.cos(t), x = p.x + ux * 2 * st, y = p.y + uy * 2 * st, v = at(x, y) - Math.abs(a) * 1e-5; if (v > bv) { bv = v; best = { x, y, ux, uy }; } }
        if (!best || at(best.x, best.y) < r + eps || others.some(O => segD(O, best.x, best.y) < Math.max(r, at(best.x, best.y)) * 1.05)) break;
        add.push({ x: best.x, y: best.y }); p = best; dx = dx * 0.6 + best.ux * 0.4; dy = dy * 0.6 + best.uy * 0.4; const l2 = Math.hypot(dx, dy) || 1; dx /= l2; dy /= l2; }
      const B = add.reverse().concat(A); return rev ? B.reverse() : B; };
    P = grow(false); P = grow(true);
    // ④ 둥근 끝이 나가는 끝 점 깎기(회색이 붓보다 가는 획 = 그 획 능선 깊이 중앙값 85% 기준)
    const ds = P.map(q => at(q.x, q.y)).sort((a, b) => a - b), rr = Math.min(r + eps, ds[ds.length >> 1] * 0.85);
    while (P.length > 2 && at(P[0].x, P[0].y) < rr) P.shift();
    while (P.length > 2 && at(P[P.length - 1].x, P[P.length - 1].y) < rr) P.pop();
  }
  // ⑤ 1/200 간격으로 채우고 · 깊이가 r 모자란 점(모서리·가는 곳)은 더 깊은 쪽으로 오름(최대 r) → 점마다 그 자리 깊이 d
  const R = []; for (let i = 0; i < P.length; i++) { if (i) { const a = P[i - 1], b = P[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 200); for (let k = 1; k < n; k++) R.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); } R.push({ x: P[i].x, y: P[i].y }); }
  for (const q of R) { let moved = 0; while (moved < r && at(q.x, q.y) < r + eps) { let b = null, bv = at(q.x, q.y); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]]) { const v = at(q.x + dx * st, q.y + dy * st); if (v > bv + 1e-9) { bv = v; b = [dx, dy]; } } if (!b) break; q.x += b[0] * st; q.y += b[1] * st; moved += st; } q.d = at(q.x, q.y); }
  return R; // 오르고도 회색 가장자리·밖인 점 = 굵기 0.4칸(거의 안 보임 · 길은 이어짐)
}

// 쓰기부 부르는 법(10-12 약속): fitToGuide({ Q, ch, toolW, guide, N, others }) → [{x,y,w,t}…] + .tot
//  guide = 회색 알파 Uint8Array N×N · others = 같은 글자 다른 획 Q 들 · 돌려준 길을 반지름 toolW/2 둥근 붓으로 그리면 회색 밖 0 · 점 간격 ≤ 1/200
const dtCache = new WeakMap(), fitCache = new Map();
export function fitToGuide({ Q, ch, toolW, guide, N = 400, others = [] }) {
  if (!Q || !Q.length || !guide) return Q;
  let D = dtCache.get(guide); if (!D) { D = edt(guide, N); dtCache.set(guide, D); }
  const key = ch + "|" + toolW + "|" + N + "|" + Q.length + "|" + Q[0].x.toFixed(4) + "," + Q[0].y.toFixed(4) + "|" + Q[Q.length - 1].x.toFixed(4) + "," + Q[Q.length - 1].y.toFixed(4);
  const hit = fitCache.get(key); if (hit && hit.D === D) return hit.out;
  // w = 그 점에서 그릴 굵기(칸 비율) = min(도구 굵기, 2 × (회색 깊이 − 0.8칸)) — 회색이 붓보다 가는 곳·모서리만 가늘어짐 · 그리는 쪽은 점마다 [x, y, w / toolW]
  const out = fitCore(Q, D, N, toolW / 2, others.filter(O => O !== Q)).map(q => ({ x: q.x, y: q.y, w: Math.max(0.4 / N, Math.min(toolW, 2 * (q.d - 1.6 / N))) }));
  for (let k = 0; k < 2; k++) for (let i = 1; i < out.length - 1; i++) out[i].w = Math.min(out[i].w, (out[i - 1].w + 2 * out[i].w + out[i + 1].w) / 4 + 0.0); // 굵기 튐 줄임(늘리지는 않음)
  let t = 0; out.forEach((q, i) => { if (i) t += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y); q.t = t; }); out.tot = t || 1e-6;
  if (fitCache.size > 2000) fitCache.clear(); fitCache.set(key, { D, out }); return out;
}
