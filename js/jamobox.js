// 음절 글자 → 자모 자리 나누기(본부 10-07) — 획순 보기 · 자판 모드 덧칠 · 손글씨 덩어리 판정이 같은 나눔을 쓴다
//  1) 틀: 세로 모음(ㅏㅐㅑㅒㅓㅔㅕㅖㅣ) 초성 왼쪽·모음 오른쪽 / 가로 모음(ㅗㅛㅜㅠㅡ) 초성 위·모음 아래 / 섞인 모음(ㅘㅙㅚㅝㅞㅟㅢ) 초성 왼위·가로 부분 아래·세로 부분 오른쪽
//     받침 있으면 위 덩어리 약 58% + 받침 아래 · 겹자모(ㄲ·ㄳ·ㅐ·ㅔ…)는 그 칸을 parts 수로 나눔(자음·세로 모음 = 좌우 · 가로 모음 = 위아래)
//  2) 다듬기: 글꼴 잉크의 이어진 덩어리마다 무게중심이 든 칸(여럿이면 칸 가운데에 가장 가까운)에 통째로 줌 — 「ㅗ」 세로 꼭지처럼 칸 경계를 넘는 획도 안 빠짐
//     덩어리가 두 자모에 걸쳐 붙어 있으면(글꼴이 이어 그린 곳) 그 덩어리만 픽셀마다 가장 가까운 칸으로 나눔
//  → units: [{ role: "cho"|"jung"|"jong", jamo(기본 자모), px: 픽셀 번호들(N×N), box: 잉크 상자 [x0,y0,x1,y1](0~1) }] — 쓰는 차례(초성 → 중성 parts → 종성 parts)
const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"], JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"], JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];
export const PARTS = { ㄲ: ["ㄱ", "ㄱ"], ㄸ: ["ㄷ", "ㄷ"], ㅃ: ["ㅂ", "ㅂ"], ㅆ: ["ㅅ", "ㅅ"], ㅉ: ["ㅈ", "ㅈ"], ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"], ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"], ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"], ㅐ: ["ㅏ", "ㅣ"], ㅒ: ["ㅑ", "ㅣ"], ㅔ: ["ㅓ", "ㅣ"], ㅖ: ["ㅕ", "ㅣ"], ㅘ: ["ㅗ", "ㅏ"], ㅙ: ["ㅗ", "ㅐ"], ㅚ: ["ㅗ", "ㅣ"], ㅝ: ["ㅜ", "ㅓ"], ㅞ: ["ㅜ", "ㅔ"], ㅟ: ["ㅜ", "ㅣ"], ㅢ: ["ㅡ", "ㅣ"] };
export const baseOf = j => (PARTS[j] ? PARTS[j].flatMap(baseOf) : [j]); // ㅙ → ㅗ ㅏ ㅣ
const V = new Set("ㅏㅐㅑㅒㅓㅔㅕㅖㅣ"), H = new Set("ㅗㅛㅜㅠㅡ");
export function split(ch) {
  const c = ch.charCodeAt(0) - 0xac00; if (c < 0 || c >= 11172) return null;
  return { cho: CHO[Math.floor(c / 588)], jung: JUNG[Math.floor((c % 588) / 28)], jong: JONG[c % 28] };
}
const sub = (r, q) => [r[0] + (r[2] - r[0]) * q[0], r[1] + (r[3] - r[1]) * q[1], r[0] + (r[2] - r[0]) * q[2], r[1] + (r[3] - r[1]) * q[3]];
const cutX = (r, n, i) => sub(r, [i / n, 0, (i + 1) / n, 1]), cutY = (r, n, i) => sub(r, [0, i / n, 1, (i + 1) / n]);
// 틀 칸(잉크 상자 기준 0~1) — 기본 자모 하나마다 칸 하나
export function frames(ch) {
  const s = split(ch); if (!s) return [];
  const top = s.jong ? [0, 0, 1, 0.58] : [0, 0, 1, 1], out = [];
  const put = (role, j, r, horiz) => { const ps = PARTS[j]; if (!ps) return out.push({ role, jamo: j, rect: r }); ps.forEach((p, i) => put(role, p, horiz ? cutY(r, ps.length, i) : cutX(r, ps.length, i), H.has(p))); };
  if (V.has(s.jung)) { put("cho", s.cho, sub(top, [0, 0, 0.55, 1])); put("jung", s.jung, sub(top, [0.5, 0, 1, 1])); }
  else if (H.has(s.jung)) { put("cho", s.cho, sub(top, [0, 0, 1, 0.5])); put("jung", s.jung, sub(top, [0, 0.45, 1, 1]), true); }
  else { const [a, b] = PARTS[s.jung]; put("cho", s.cho, sub(top, [0, 0, 0.62, 0.5])); put("jung", a, sub(top, [0, 0.45, 0.7, 1]), true); put("jung", b, sub(top, [0.58, 0, 1, 1])); }
  if (s.jong) put("jong", s.jong, [0, 0.58, 1, 1]);
  return out;
}
// mask = N×N RGBA(글자 잉크 = 알파 > 128) → units(픽셀까지 나눔)
export function units(ch, mask, N) {
  const fr = frames(ch); if (!fr.length) return [];
  const on = i => mask[i * 4 + 3] > 128;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let i = 0; i < N * N; i++) if (on(i)) { const x = i % N, y = (i / N) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return [];
  const W = Math.max(1, x1 - x0 + 1), Hh = Math.max(1, y1 - y0 + 1), rel = (x, y) => [(x - x0 + 0.5) / W, (y - y0 + 0.5) / Hh];
  const inR = (r, p) => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3], ctr = r => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const pick = p => { let best = -1, bd = Infinity; fr.forEach((f, k) => { const inside = inR(f.rect, p), d = d2(p, ctr(f.rect)) * (inside ? 1 : 4); if (d < bd) { bd = d; best = k; } }); return best; };
  // 이어진 덩어리(4방향)
  const lab = new Int32Array(N * N).fill(-1), comps = [];
  for (let i = 0; i < N * N; i++) { if (lab[i] >= 0 || !on(i)) continue; const id = comps.length, st = [i], px = []; lab[i] = id;
    while (st.length) { const q = st.pop(); px.push(q); const x = q % N, y = (q / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (lab[j] < 0 && on(j)) { lab[j] = id; st.push(j); } } }
    comps.push(px); }
  const out = fr.map(f => ({ role: f.role, jamo: f.jamo, rect: f.rect, px: [] }));
  // 덩어리마다 무게중심 칸 먼저(작은 점·티끌 1% 미만은 빼고) — 나누기는 「제 덩어리가 하나도 없는 칸」으로만(본부 10-07 Noto 500 「즈」: ㅈ 다리가 ㅡ 칸까지 내려와 ㅈ이 잘려 ㅡ에 붙던 것 · ㅡ 은 제 막대가 따로 있음)
  const big = comps.reduce((a, px) => Math.max(a, px.length), 0), home = comps.map(px => { let sx = 0, sy = 0; for (const q of px) { sx += q % N; sy += (q / N) | 0; } return pick(rel(sx / px.length, sy / px.length)); });
  const owns = new Set(home.filter((k, i) => comps[i].length >= big * 0.01));
  for (let ci = 0; ci < comps.length; ci++) {
    const px = comps[ci], k = home[ci];
    // 다른 칸에만 든(제 칸과 안 겹치는) 픽셀이 25% 넘으면 = 글꼴이 이어 그린 덩어리 → 픽셀마다 나눔 · 칸 경계에 살짝 걸친 「이」의 ㅇ 같은 건 통째로
    const spans = [k, ...fr.map((f, j) => j).filter(j => { if (j === k || (owns.has(j) && home.filter(h => h === j).length)) return false; let n = 0; for (const q of px) { const p = rel(q % N, (q / N) | 0); if (inR(fr[j].rect, p) && !inR(fr[k].rect, p)) n++; } return n > px.length * 0.25; })];
    if (spans.length > 1) for (const q of px) { const p = rel(q % N, (q / N) | 0); let b = spans[0], bd = Infinity; for (const j of spans) { const d = inR(fr[j].rect, p) ? 0 : d2(p, ctr(fr[j].rect)); if (d < bd) { bd = d; b = j; } } out[b].px.push(q); }
    else out[k].px.push(...px);
  }
  // 빈 칸 금지(본부 10-08 — 11,172자 중 911자가 자모 하나를 통째로 잃어 뒤 자모가 한 칸씩 밀림 · 쌍자음·받침 글자 초성 등)
  //  빈 칸 = 그 칸 안 잉크를 가장 많이 가진 자모에게서, 그 칸 안이고 제 칸 가운데보다 빈 칸 가운데에 더 가까운 픽셀을 받아 옴(쌍자음 한 덩어리 = 좌우 반)
  //  칸 안 잉크가 없으면 칸을 조금씩 넓혀 찾음 · 가져온 쪽이 비게 되면 둘이 픽셀마다 가까운 칸 가운데로 나눔
  { const own = new Int16Array(N * N).fill(-1); out.forEach((u, k) => { for (const q of u.px) own[q] = k; });
    const grow = (r, g) => [r[0] - g, r[1] - g, r[2] + g, r[3] + g];
    for (let pass = 0; pass < fr.length; pass++) {
      const k = out.findIndex(u => !u.px.length); if (k < 0) break;
      let cand = []; for (let g = 0; g <= 0.3 && !cand.length; g += 0.05) { const r = grow(fr[k].rect, g); for (let i = 0; i < N * N; i++) if (own[i] >= 0 && own[i] !== k && inR(r, rel(i % N, (i / N) | 0))) cand.push(i); }
      if (!cand.length) break;
      const cnt = new Map(); for (const i of cand) cnt.set(own[i], (cnt.get(own[i]) || 0) + 1);
      const o = [...cnt].sort((a, b) => b[1] - a[1])[0][0], ck = ctr(fr[k].rect), co = ctr(fr[o].rect), cs = new Set(cand);
      let moved = 0, left = 0; for (const i of out[o].px) { const p = rel(i % N, (i / N) | 0); if (cs.has(i) && d2(p, ck) <= d2(p, co)) { own[i] = k; moved++; } else left++; }
      if (!moved || !left) for (const i of out[o].px) { const p = rel(i % N, (i / N) | 0); own[i] = d2(p, ck) <= d2(p, co) ? k : o; } // 한쪽이 다 가져가면 가까운 칸 가운데로 나눔
      out.forEach(u => (u.px = [])); for (let i = 0; i < N * N; i++) if (own[i] >= 0) out[own[i]].px.push(i);
    } }
  shapeFix(out, mask, N);
  for (const u of out) { // 잉크 상자(0~1 · 캔버스 기준) · 잉크 없으면 틀 칸
    if (!u.px.length) { u.box = [x0 / N + u.rect[0] * W / N, y0 / N + u.rect[1] * Hh / N, x0 / N + u.rect[2] * W / N, y0 / N + u.rect[3] * Hh / N]; continue; }
    let a = N, b = N, c = -1, d = -1; for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
    u.box = [a / N, b / N, (c + 1) / N, (d + 1) / N];
  }
  return out;
}

// 획 모양으로 다듬기(본부 10-08 「구」「예」) — units() 끝과 write.js 의 ㅇ 고리 보정 뒤에 한 번 더(고리 넓히기가 꼭지 뿌리를 다시 가져가지 않게)
//  out = units(px·rect·role·jamo) · 바꾼 것만 px 를 고침(상자는 부른 쪽이 다시 계산)
export function shapeFix(out, mask, N) {
  const on = i => mask[i * 4 + 3] > 128;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (const u of out) for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return false;
  const W = Math.max(1, x1 - x0 + 1), Hh = Math.max(1, y1 - y0 + 1);
  { const own = new Int16Array(N * N).fill(-1); out.forEach((u, k) => { for (const q of u.px) own[q] = k; });
    const ry = y => (y - y0 + 0.5) / Hh; let moved = false;
    const vr = new Uint16Array(N * N); for (let x = x0; x <= x1; x++) { let y = y0; while (y <= y1) { if (!on(y * N + x)) { y++; continue; } let e = y; while (e <= y1 && on(e * N + x)) e++; for (let t = y; t < e; t++) vr[t * N + x] = e - y; y = e; } } // 세로로 이어진 잉크 길이(초성 세로 기둥에서 꼭지 따라가기 멈춤)
    out.forEach((u, k) => {
      if (u.role !== "jung") return;
      const r = u.rect;
      if (H.has(u.jamo)) {
        const xa = x0 + Math.floor(r[0] * W), xb = x0 + Math.ceil(r[2] * W) - 1, bands = []; let cur = null;
        for (let y = y0; y <= y1; y++) { let run = 0, best = null; for (let x = xa; x <= Math.min(x1, xb); x++) { if (on(y * N + x)) { run++; if (!best || run > best[2]) best = [x - run + 1, x, run]; } else run = 0; }
          if (best && best[2] >= 0.6 * (xb - xa + 1)) { if (cur && cur.y1 === y - 1) { cur.y1 = y; cur.runs.push([y, best[0], best[1]]); } else bands.push((cur = { y0: y, y1: y, runs: [[y, best[0], best[1]]] })); } else cur = null; }
        const tgt = /[ㅗㅛ]/.test(u.jamo) ? r[3] - 0.08 : /[ㅜㅠ]/.test(u.jamo) ? r[1] + 0.08 : (r[1] + r[3]) / 2;
        const down = /[ㅜㅠ]/.test(u.jamo), up = /[ㅗㅛ]/.test(u.jamo), stem = b => { let c = 0; for (const [y, xs, xe] of b.runs) for (let x = xs; x <= xe; x++) { for (let t = 1; t <= 3; t++) { const yy = down ? b.y1 + t : up ? b.y0 - t : y; if (yy >= 0 && yy < N && own[yy * N + x] === k) c++; } if (own[y * N + x] === k) c++; } return c; };
        let bb = null, bs = -1, bd = Infinity; for (const b of bands) { const c = (ry(b.y0) + ry(b.y1)) / 2; if (c < r[1] - 0.15 || c > r[3] + 0.02) continue; const sv = stem(b), d = Math.abs(c - tgt); if (sv > bs || (sv === bs && d < bd)) { bs = sv; bd = d; bb = b; } }
        if (bb) for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x, o = own[q]; if (o >= 0 && o !== k && out[o].role === "cho") { own[q] = k; moved = true; } }
      } else if (V.has(u.jamo)) {
        const ya = y0 + Math.floor(r[1] * Hh), yb = Math.min(y1, y0 + Math.ceil(r[3] * Hh) - 1), xa = x0 + Math.floor(Math.max(0, r[0] - 0.1) * W), xb = Math.min(x1, x0 + Math.ceil(r[2] * W) - 1);
        let cx = -1, ct = 0, cb = 0;
        for (let x = xa; x <= xb && cx < 0; x++) { let run = 0, top = 0; for (let y = ya; y <= yb; y++) { if (own[y * N + x] === k) { if (!run) top = y; run++; if (run >= 0.45 * (yb - ya + 1)) { cx = x; ct = top; cb = top + run - 1; let yy = y + 1; while (yy <= yb && own[yy * N + x] === k) yy++; cb = yy - 1; break; } } else run = 0; } }
        if (cx < 0) return;
        for (let y = ct; y <= cb; y++) { const run = []; for (let x = cx - 1; x >= x0 && on(y * N + x) && vr[y * N + x] < 0.2 * Hh; x--) run.push(y * N + x); if (run.length && run.length <= 0.3 * W) for (const q of run) if (own[q] >= 0 && out[own[q]].role === "cho") { own[q] = k; moved = true; } }
      }
    });
    if (moved) { const keep = out.map(u => u.px); out.forEach(u => (u.px = [])); for (let i = 0; i < N * N; i++) if (own[i] >= 0) out[own[i]].px.push(i); out.forEach((u, k) => { if (!u.px.length) u.px = keep[k]; }); }
  }
  return true;
}
