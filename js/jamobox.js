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
    // 구멍(바깥과 안 이어진 빈칸 · ㅇ ㅎ ㅁ ㅂ 안쪽) — 구멍 바로 위·아래 가로줄은 고리·네모 테두리라 모음 띠 아님(앱 창 10-10 「혹」「윔」 고리 윗줄·아랫줄이 ㅗ ㅜ 띠로 잡히던 것)
    const outs = new Uint8Array(N * N), sq = []; for (let i = 0; i < N; i++) for (const q of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!on(q) && !outs[q]) { outs[q] = 1; sq.push(q); }
    while (sq.length) { const q = sq.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && !outs[j] && !on(j)) { outs[j] = 1; sq.push(j); } }
    // 구멍마다 번호 · ㅛ ㅠ 다리 사이가 받침에 막혀 생긴 납작한 빈칸은 아님(「늄」)
    const hl = new Int32Array(N * N).fill(-1), hbox = []; for (let q = 0; q < N * N; q++) { if (on(q) || outs[q] || hl[q] >= 0) continue; const id = hbox.length, b = [N, N, -1, -1, 0], s2 = [q]; hl[q] = id; while (s2.length) { const p = s2.pop(); b[4]++; const x = p % N, y = (p / N) | 0; if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y; for (const j of [x > 0 ? p - 1 : -1, x < N - 1 ? p + 1 : -1, p - N, p + N]) if (j >= 0 && j < N * N && !on(j) && !outs[j] && hl[j] < 0) { hl[j] = id; s2.push(j); } } hbox.push(b); }
    const ringH = new Set(); for (const u of out) if (u.hole != null && hl[u.hole] >= 0) ringH.add(hl[u.hole]);
    const holeAt = q => q >= 0 && q < N * N && hl[q] >= 0 && ringH.has(hl[q]); // ㅇ ㅎ 고리(ringFix 가 잡은 것) 안 구멍만 — ㅛ ㅠ 다리 사이·ㅁ 안쪽은 아님(「늄」)
    const touchHole = b => { let h = 0; for (const [y, xs, xe] of b.runs) { const m0 = xs + ((xe - xs) >> 2), m1 = xe - ((xe - xs) >> 2); for (let x = m0; x <= m1; x++) for (let t = 1; t <= 2; t++) { if (y === b.y0 && holeAt((y - t) * N + x)) h++; if (y === b.y1 && holeAt((y + t) * N + x)) h++; } } return h >= 3; };
    const prot = (o, q) => !!out[o].ring?.has(q); // 고리 픽셀(ringFix 가 잡은 ㅇ ㅎ 띠)은 안 건드림
    out.forEach((u, k) => {
      if (u.role !== "jung") return;
      const r = u.rect;
      if (H.has(u.jamo)) {
        const xa = x0 + Math.floor(r[0] * W), xb = x0 + Math.ceil(r[2] * W) - 1, bands = []; let cur = null;
        for (let y = y0; y <= y1; y++) { let run = 0, best = null; for (let x = xa; x <= Math.min(x1, xb); x++) { if (on(y * N + x)) { run++; if (!best || run > best[2]) best = [x - run + 1, x, run]; } else run = 0; }
          if (best && best[2] >= 0.6 * (xb - xa + 1)) { if (cur && cur.y1 === y - 1) { cur.y1 = y; cur.runs.push([y, best[0], best[1]]); } else bands.push((cur = { y0: y, y1: y, runs: [[y, best[0], best[1]]] })); } else cur = null; }
        const tgt = /[ㅗㅛ]/.test(u.jamo) ? r[3] - 0.08 : /[ㅜㅠ]/.test(u.jamo) ? r[1] + 0.08 : (r[1] + r[3]) / 2;
        const down = /[ㅜㅠ]/.test(u.jamo), up = /[ㅗㅛ]/.test(u.jamo), stem = b => { let c = 0; // 띠에 매달린 좁은 기둥(ㅗㅛ 위 · ㅜㅠ 아래) 잉크 — 주인과 상관없이(「늄」 — ㄴ 아래 가로가 ㅠ 띠로 뽑히던 것) · ㅡ 는 이 모음 몫 띠
          if (!up && !down) { for (const [y, xs, xe] of b.runs) for (let x = xs; x <= xe; x++) if (own[y * N + x] === k) c++; return c; }
          const xs = Math.min(...b.runs.map(r2 => r2[1])), xe = Math.max(...b.runs.map(r2 => r2[2])), m0 = xs + ((xe - xs) >> 2), m1 = xe - ((xe - xs) >> 2); // 가운데 절반만(「놔」 — ㄴ 세로가 ㅗ 기둥으로 세어지던 것)
          for (let t = 1; t <= 3; t++) { const yy = down ? b.y1 + t : b.y0 - t; if (yy < 0 || yy >= N) break; let n2 = 0, nm = 0; for (let x = xs; x <= xe; x++) if (on(yy * N + x)) { n2++; if (x >= m0 && x <= m1) nm++; } if (n2 && n2 < 0.5 * (xe - xs + 1) && nm >= 0.6 * n2) c += nm; } // 가운데에 몰린 기둥만(「궷」 ㄱ 가로 오른끝 세로가 ㅜ 기둥으로 세어지던 것)
          return c; };
        const okB = bands.filter(b => { const c = (ry(b.y0) + ry(b.y1)) / 2; return !(c < r[1] - 0.15 || c > r[3] + 0.02 || touchHole(b)); });
        // 두 후보 띠 사이에 구멍(고리)이 있으면 위 띠 = ㅎ 가로(「훅」「혹」 — 가로 모음은 늘 초성 고리 아래)
        const holeBetween = (b, b2) => { const xs = Math.max(b.runs[0][1], b2.runs[0][1]), xe = Math.min(b.runs[0][2], b2.runs[0][2]), m0 = xs + ((xe - xs) >> 2), m1 = xe - ((xe - xs) >> 2); for (let y = b.y1 + 1; y < b2.y0; y++) for (let x = m0; x <= m1; x++) if (holeAt(y * N + x)) return true; return false; };
        const nb = bands.filter(b => !touchHole(b)), back = [];
        for (let i = 0; i < okB.length; i++) { const b = okB[i], b2 = nb.find(b2 => b2.y0 > b.y1 && holeBetween(b, b2)); if (b2) { back.push(b); okB[i] = b2; } } // ㅎ 가로 → 고리 아래 띠로 바꿈 · ㅎ 가로는 초성에게 돌려줌
        const ci = out.findIndex(v => v.role === "cho"); if (ci >= 0) for (const b of back) for (const [y, xs, xe] of b.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x; if (own[q] === k) { own[q] = ci; moved = true; } }
        for (const b of back) { const st = []; for (const [y, xs, xe] of b.runs) for (let x = xs; x <= xe; x++) st.push(y * N + x); while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N]) if (j >= 0 && own[j] === k && ((j / N) | 0) < b.y0) { own[j] = ci; st.push(j); } } } // ㅎ 꼭지(가로 위)도
        // 위 가운데에 짧은 꼭지가 달린 띠 = ㅊ ㅎ 가로(「촥」「췍」) — 다른 후보가 있으면 뺌
        const tick = b => { const xs = Math.min(...b.runs.map(r2 => r2[1])), xe = Math.max(...b.runs.map(r2 => r2[2])), m0 = xs + ((xe - xs) >> 2), m1 = xe - ((xe - xs) >> 2); for (let t = 2; t <= 4; t++) { const yy = b.y0 - t; if (yy < 0) return false; let n2 = 0, nm = 0; for (let x = xs; x <= xe; x++) if (on(yy * N + x)) { n2++; if (x >= m0 && x <= m1) nm++; } if (!nm || nm < 0.6 * n2 || n2 > 0.3 * (xe - xs + 1)) return false; } return true; }; // 위 2~4줄이 다 가운데 좁은 잉크
        // 아래 가운데에 좁은 잉크가 달린 띠 = 아래로 꼭지가 내려간 띠(「복」 ㅂ 아래 가로 밑에 ㅗ 꼭지) — ㅗ ㅛ 띠는 꼭지가 위로
        const tickDown = b => { const xs = Math.min(...b.runs.map(r2 => r2[1])), xe = Math.max(...b.runs.map(r2 => r2[2])), m0 = xs + ((xe - xs) >> 2), m1 = xe - ((xe - xs) >> 2); for (let t = 2; t <= 4; t++) { const yy = b.y1 + t; if (yy >= N) return false; let n2 = 0, nm = 0; for (let x = xs; x <= xe; x++) if (on(yy * N + x)) { n2++; if (x >= m0 && x <= m1) nm++; } if (!nm || nm < 0.6 * n2 || n2 > 0.3 * (xe - xs + 1)) return false; } return true; };
        let cand = okB; if (!up) { const nt = cand.filter(b => !tick(b)); if (nt.length) cand = nt; } else { const nt = cand.filter(b => !tickDown(b)); if (nt.length) cand = nt; }
        let bb = null, bs = -1, bd = Infinity; for (const b of cand) { const c = (ry(b.y0) + ry(b.y1)) / 2; const sv = stem(b), d = Math.abs(c - tgt); if (sv > bs || (sv === bs && d < bd)) { bs = sv; bd = d; bb = b; } }
        if (up) { const ws = cand.filter(b => stem(b) > 0); if (ws.length) bb = ws.reduce((p2, b) => (b.y0 > p2.y0 ? b : p2)); } // ㅗ ㅛ = 기둥 달린 띠 중 맨 아래(초성 ㅊ 가로·꼭지 말고)
        let lim = null; // 기둥 x 범위(기둥 따라가기에서 정함)
        if (bb) { // 띠는 초성 몫이면 모음에게 · 모음이 거의 비었으면(고리를 ㅇ ㅎ 에게 돌려줌 — 「훅」「흑」) 받침 몫이어도 모음에게 + 그 받침 몫 기둥(ㅗㅛ 위 · ㅜㅠ 아래, 띠에 이어진 좁은 줄)도
          let mine = 0, bn = 0; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { bn++; if (own[y * N + x] === k) mine++; } const empty = mine < bn * 0.5, from = new Set(); // 띠를 절반도 못 가졌으면 받침 몫이어도 찾아옴(「늄」 — ㅠ 띠·기둥이 ㅁ 몫)
          const fullW = ([y, xs, xe]) => { let a2 = xs, b2 = xe; while (a2 > 0 && on(y * N + a2 - 1)) a2--; while (b2 < N - 1 && on(y * N + b2 + 1)) b2++; return b2 - a2 + 1; }, wmax = Math.max(...bb.runs.map(fullW)); const ob = { y0: bb.y0, y1: bb.y1 }; bb = { runs: bb.runs.filter(r2 => fullW(r2) >= 0.85 * wmax) }; /* 너비 = 모음 칸 밖까지 이어진 실제 줄 길이 */ bb.y0 = bb.runs[0][0]; bb.y1 = bb.runs[bb.runs.length - 1][0]; // 띠 = 가장 넓은 줄의 85%↑ 줄만(「둑」 — 바로 붙은 ㄷ 아래 가로가 ㅜ 띠로 같이 잡히던 것)
          for (const [y, xs0, xe0] of bb.runs) { let xs = xs0, xe = xe0; while (xs > 0 && on(y * N + xs - 1)) xs--; while (xe < N - 1 && on(y * N + xe + 1)) xe++; /* 칸 밖까지 이어진 띠 끝도(「꿔」) */ for (let x = xs; x <= xe; x++) { const q = y * N + x, o = own[q]; if (o >= 0 && o !== k && !prot(o, q) && (out[o].role === "cho" || out[o].role === "jong")) { own[q] = k; moved = true; from.add(o); } } } // 받침 몫이어도(「분」 — ㅜ 띠 아래 절반·기둥이 ㄴ 몫)
          if (up || down) { for (let q = 0; q < N * N; q++) { const o = own[q]; if (o >= 0 && o !== k && out[o].role !== "jung" && (out[o].role === "cho" || empty || o === out.length - 1)) from.add(o); }  const xs = Math.min(...bb.runs.map(r2 => r2[1])), xe = Math.max(...bb.runs.map(r2 => r2[2])), bw = xe - xs + 1; const ys = down ? ob.y1 : ob.y0; let prev = new Set(); for (let x = xs; x <= xe; x++) if (on(ys * N + x)) prev.add(x); /* 띠 끝(85% 로 빼기 전) 줄에서 시작 */
            lim = null; for (let t = 1; t <= 0.3 * Hh; t++) { const y = down ? ys + t : ys - t; if (y < y0 || y > y1) break; const row = []; for (let x = xs; x <= xe; x++) if (on(y * N + x)) row.push(x); if (!row.length || row.length > 0.7 * bw) break;
              const nx = new Set(); for (const x of row) { if (!prev.has(x) && !prev.has(x - 1) && !prev.has(x + 1)) continue; if (lim && (x < lim[0] || x > lim[1])) continue; const q = y * N + x, o = own[q]; if (o >= 0 && prot(o, q)) continue; nx.add(x); if (o >= 0 && o !== k && from.has(o)) { own[q] = k; moved = true; } }
              if (!nx.size) break; prev = nx; if (!lim && nx.size < 0.3 * bw && !(down ? y <= ob.y1 : y >= ob.y0)) lim = [Math.min(...nx), Math.max(...nx)]; } } // 기둥 너비 밖(받침 세로 등)으로는 안 감(「눤」)
          // 띠 위(ㅜ ㅠ ㅡ) · 띠 아래(ㅗ ㅛ)에 남은 이 모음 몫 = 맞닿은 이웃 자모 몫(「눤」「늄」 — ㄴ 아래 가로가 모음 칸에 들어가 모음 몫이던 것) · 바깥부터 한 겹씩
          const bxs = Math.min(...bb.runs.map(r2 => r2[1])), bxe = Math.max(...bb.runs.map(r2 => r2[2])), wideRow = new Map(), isWide = y => { if (!wideRow.has(y)) { let n2 = 0; for (let x = bxs; x <= bxe; x++) if (on(y * N + x)) n2++; wideRow.set(y, n2 > 0.7 * (bxe - bxs + 1)); } return wideRow.get(y); };
          // 띠 반대쪽 전부 + 기둥 쪽이라도 넓은 줄(「복」 ㅂ 아래 가로·두 기둥 = 기둥 아님)은 이 모음 몫 아님
          // 기둥 = 띠에서 기둥 쪽으로 좁은 줄만 따라 이어진 이 모음 몫(넓은 줄에서 멈춤)
          const stemSet = new Uint8Array(N * N); { const st = []; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x; if (own[q] === k) { stemSet[q] = 1; st.push(q); } }
            while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) { if (j < 0 || j >= N * N || stemSet[j] || own[j] !== k) continue; const y = (j / N) | 0; if (y >= bb.y0 && y <= bb.y1) { stemSet[j] = 1; st.push(j); continue; } if ((up && y > bb.y1) || (down && y < bb.y0) || (!up && !down) || (isWide(y) && !(y >= ob.y0 && y <= ob.y1)) || (lim && !(y >= ob.y0 && y <= ob.y1) && ((j % N) < lim[0] - 1 || (j % N) > lim[1] + 1))) continue; /* 85% 로 뺀 띠 가장자리 줄은 기둥 쪽이면 통과 */ stemSet[j] = 1; st.push(j); } } }
          const bad = q => { const y = (q / N) | 0; return !(y >= bb.y0 && y <= bb.y1) && !stemSet[q]; };
          for (let it = 0; it < N; it++) { let ch = false; for (let q = 0; q < N * N; q++) { if (own[q] !== k || !bad(q)) continue; const x = q % N, cnt = new Map(); for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N, x > 0 ? q - N - 1 : -1, x < N - 1 ? q - N + 1 : -1, x > 0 ? q + N - 1 : -1, x < N - 1 ? q + N + 1 : -1]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k && out[o].role !== "jung") cnt.set(o, (cnt.get(o) || 0) + 1); }
              if (cnt.size) { own[q] = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; ch = true; moved = true; } } if (!ch) break; }
          // 띠와 이어지지 않은 이 모음 몫 덩어리 = 가장 많이 맞닿은 이웃(「촥」 — ㅊ 꼭지·가로가 ㅗ 몫)
          { const seen = new Uint8Array(N * N), st = []; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x; if (own[q] === k && !seen[q]) { seen[q] = 1; st.push(q); } }
            while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && !seen[j]) { seen[j] = 1; st.push(j); } }
            for (let q0 = 0; q0 < N * N; q0++) { if (own[q0] !== k || seen[q0]) continue; const c = [], s2 = [q0]; seen[q0] = 1; while (s2.length) { const q = s2.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && !seen[j]) { seen[j] = 1; s2.push(j); } }
              const cnt = new Map(); for (const q of c) { const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k) cnt.set(o, (cnt.get(o) || 0) + 1); } }
              if (cnt.size) { const to = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; for (const q of c) own[q] = to; moved = true; } } } }
      } else if (V.has(u.jamo)) {
        const ya = y0 + Math.floor(r[1] * Hh), yb = Math.min(y1, y0 + Math.ceil(r[3] * Hh) - 1), xa = x0 + Math.floor(Math.max(0, r[0] - 0.1) * W), xb = Math.min(x1, x0 + Math.ceil(r[2] * W) - 1);
        let cx = -1, ct = 0, cb = 0;
        // 기둥 = 이 모음 몫 세로 줄이 가장 긴 열(45%↑) 중 왼쪽 첫 열(가장 긴 것의 85%↑) — 「경」 ㄱ 세로가 45%를 겨우 넘어 기둥으로 잡히던 것
        { const runs = []; for (let x = xa; x <= xb; x++) { let run = 0, top = 0, best = 0, bt = 0; for (let y = ya; y <= yb; y++) { if (own[y * N + x] === k) { if (!run) top = y; run++; if (run > best) { best = run; bt = top; } } else run = 0; } runs.push([x, best, bt]); }
          const mx = Math.max(0, ...runs.map(r2 => r2[1])); if (mx >= 0.45 * (yb - ya + 1)) { const f = runs.find(r2 => r2[1] >= 0.85 * mx); cx = f[0]; ct = f[2]; cb = f[2] + f[1] - 1; } }
        if (cx < 0) return;
        for (let y = ct; y <= cb; y++) { const run = []; for (let x = cx - 1; x >= x0 && on(y * N + x) && vr[y * N + x] < 0.2 * Hh; x--) run.push(y * N + x); if (run.length && run.length <= 0.3 * W) for (const q of run) if (own[q] >= 0 && out[own[q]].role === "cho") { own[q] = k; moved = true; } }
        // 기둥 왼쪽 이 모음 몫 = 기둥에서 같은 줄로 왼쪽으로 이어진 꼭지만(꼭지 두께의 2.2배 넘는 세로 획에서 멈춤) · 나머지는 맞닿은 이웃(「경」 — ㄱ 오른쪽 위 모서리가 ㅕ 몫)
        { const reach = new Uint8Array(N * N); for (let y = y0; y <= y1; y++) { if (own[y * N + cx] !== k) continue; const v0 = Math.max(vr[y * N + cx - 1] || 0, vr[y * N + cx - 2] || 0) || 1; for (let x = cx - 1; x >= x0; x--) { const q = y * N + x; if (own[q] !== k || (x < cx - 2 && vr[q] > 2.2 * v0 && vr[q] >= 0.15 * Hh)) break; reach[q] = 1; } }
          for (let it = 0; it < N; it++) { let ch2 = false; for (let y = y0; y <= y1; y++) for (let x = x0; x < cx; x++) { const q = y * N + x; if (own[q] !== k || reach[q]) continue; const cnt = new Map(); for (const j of [x > 0 ? q - 1 : -1, q + 1, q - N, q + N, x > 0 ? q - N - 1 : -1, q - N + 1, x > 0 ? q + N - 1 : -1, q + N + 1]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k && out[o].role !== "jung") cnt.set(o, (cnt.get(o) || 0) + 1); }
              if (cnt.size) { own[q] = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; ch2 = true; moved = true; } } if (!ch2) break; } }
      }
    });
    // 겹모음 오른쪽 ㅣ(ㅐㅔㅒㅖㅚㅟㅢ…) 기둥 왼쪽에 붙은 잉크 = 앞 모음 몫(본부 10-10 경계 그림 「대」 — ㅐ 가운데 가로대가 ㅣ 몫이던 것)
    out.forEach((u, k) => {
      if (u.role !== "jung" || u.jamo !== "ㅣ" || k === 0 || out[k - 1].role !== "jung") return;
      const xa = x0 + Math.floor(Math.max(0, u.rect[0] - 0.1) * W), ya = y0 + Math.floor(u.rect[1] * Hh), yb = Math.min(y1, y0 + Math.ceil(u.rect[3] * Hh) - 1);
      let cx = -1; { const rs = []; for (let x = xa; x <= x1; x++) { let run = 0, best = 0; for (let y = ya; y <= yb; y++) { if (own[y * N + x] === k) { run++; if (run > best) best = run; } else run = 0; } rs.push([x, best]); } const mx = Math.max(0, ...rs.map(r2 => r2[1])); if (mx >= 0.45 * (yb - ya + 1)) { let g = null, best = null; for (const [x, n] of rs) { if (n >= 0.85 * mx) { if (g && g[1] === x - 1) g[1] = x; else g = [x, x]; if (!best || g[1] - g[0] > best[1] - best[0]) best = g.slice(); } else g = null; } cx = best[0]; } } // 가장 넓은 「긴 열 묶음」의 첫 열 · ㅣ 기둥 = 가장 긴 세로 열(「때」 — ㅏ 기둥 오른 가장자리 1~2px 를 ㅣ 기둥으로 잡아 ㅏ 가로가 ㅣ 몫이던 것)
      if (cx < 0) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x < cx; x++) { const q = y * N + x; if (own[q] === k) { own[q] = k - 1; moved = true; } }
    });
    if (moved) { const keep = out.map(u => u.px); out.forEach(u => (u.px = [])); for (let i = 0; i < N * N; i++) if (own[i] >= 0) out[own[i]].px.push(i); out.forEach((u, k) => { if (!u.px.length) u.px = keep[k]; }); }
  }
  return true;
}
