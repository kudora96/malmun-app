// 음절 글자 → 자모 자리 나누기(본부 10-07) — 획순 보기 · 자판 모드 덧칠 · 손글씨 덩어리 판정이 같은 나눔을 쓴다
//  1) 틀: 세로 모음(ㅏㅐㅑㅒㅓㅔㅕㅖㅣ) 초성 왼쪽·모음 오른쪽 / 가로 모음(ㅗㅛㅜㅠㅡ) 초성 위·모음 아래 / 섞인 모음(ㅘㅙㅚㅝㅞㅟㅢ) 초성 왼위·가로 부분 아래·세로 부분 오른쪽
//     받침 있으면 위 덩어리 약 58% + 받침 아래 · 겹자모(ㄲ·ㄳ·ㅐ·ㅔ…)는 그 칸을 parts 수로 나눔(자음·세로 모음 = 좌우 · 가로 모음 = 위아래)
//  2) 다듬기: 글꼴 잉크의 이어진 덩어리마다 무게중심이 든 칸(여럿이면 칸 가운데에 가장 가까운)에 통째로 줌 — 「ㅗ」 세로 꼭지처럼 칸 경계를 넘는 획도 안 빠짐
//     덩어리가 두 자모에 걸쳐 붙어 있으면(글꼴이 이어 그린 곳) 그 덩어리만 픽셀마다 가장 가까운 칸으로 나눔
//  → units: [{ role: "cho"|"jung"|"jong", jamo(기본 자모), px: 픽셀 번호들(N×N), box: 잉크 상자 [x0,y0,x1,y1](0~1) }] — 쓰는 차례(초성 → 중성 parts → 종성 parts)
// 글자별 대체 표(본부 10-11) — 이 글자만 1010.96 획 모양 다듬기(shapeFix96)를 씀 · 지금 규칙으로 고치면 다른 글자가 깨지던 것
//  뚫 쿯 줋 굻 = ㅜ 기둥 아랫변이 받침 ㄹ 몫 · 뀺 = ㅂ 이 ㅠ 오른다리를 통째로 · 굷 = 받침 윗변이 ㄹ 몫 (1011-23)
//  (1011-25) 눓 풇 욿 숧 굸 굾 뭃 꾻 훓 = ㅜ 다리 끝 띠가 받침 몫 · 쿬 꿄 쿣 훐 훇 붏 뿛 뚼 = ㅜ 다리 밑을 받침이 먹음 · 퓞 뜂 뮚 쉾 쥢 쮮 뷦 쀲 웂 = ㅜ 색이 ㅄ 의 ㅂ 오른기둥 안으로
//  뼢 퀫 퀭 휺 = 낱개 1px 실선 · (wip 판정) 귥 귬 쥾 늆 = ㅠ 오른다리 끝이 받침 몫 · 둟 쑳 쭓 춣 = ㅜ 기둥 끝·밑이 받침 몫 · 툔 룐 = ㅛ 통째가 받침 ㄴ 몫 · 볊 볋 튼 픤 = 낱개 — 자세히는 D:\malmun_work\qa\jamo_fix\override_list.md
export const OLD96 = new Set([..."뚫쿯줋굻뀺굷" + "눓풇욿숧굸굾뭃" + "붏뿛" /* 퓞뜂뮚쉾쥢쮮뷦쀲웂(Q4) · 뼢퀫퀭(Q6) = 10-12 규칙으로 고쳐 표에서 뺌 · 꾻훓(Q2) 쿬꿄쿣훐훇뚼(Q3) 휺(Q6) = 글자부 10-12 「ㅜ ㅠ 띠에 닿는 곳 곧게」 규칙으로 고쳐 뺌 */ + "귥귬쥾늆둟쑳쭓춣툔룐볊볋튼픤"]);
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
  shapeFix(out, mask, N, ch);
  for (const u of out) { // 잉크 상자(0~1 · 캔버스 기준) · 잉크 없으면 틀 칸
    if (!u.px.length) { u.box = [x0 / N + u.rect[0] * W / N, y0 / N + u.rect[1] * Hh / N, x0 / N + u.rect[2] * W / N, y0 / N + u.rect[3] * Hh / N]; continue; }
    let a = N, b = N, c = -1, d = -1; for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
    u.box = [a / N, b / N, (c + 1) / N, (d + 1) / N];
  }
  return out;
}

// 획 모양으로 다듬기(본부 10-08 「구」「예」) — units() 끝과 write.js 의 ㅇ 고리 보정 뒤에 한 번 더(고리 넓히기가 꼭지 뿌리를 다시 가져가지 않게)
//  out = units(px·rect·role·jamo) · 바꾼 것만 px 를 고침(상자는 부른 쪽이 다시 계산)
export function shapeFix(out, mask, N, ch = "") {
  if (OLD96.has(ch)) return shapeFix96(out, mask, N);
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
    // 쌍자음(ㄲ ㄸ ㅃ ㅆ ㅉ · 같은 자모 두 칸 나란히) — 두 칸 잉크 사이에 빈 세로줄이 있으면 그 줄이 경계(「꿔」 첫 ㄱ 세로획 오른쪽 반이 둘째 ㄱ 몫이던 것) · 빈 줄 없으면 그대로
    let reDbl = false; const dbl = (re = false) => { /* 글자부 D 10-12: 쌍자음 가름을 함수로(세로 모음이 둘째 자음을 통째로 가졌다 돌려준 뒤 다시 가름 · 「뻛」) */
    for (let k = 0; k + 1 < out.length; k++) { const a = out[k], b = out[k + 1]; if (a.jamo !== b.jamo || a.role !== b.role || a.role === "jung") continue;
      const cnt = new Int32Array(N); let ax = 0, an = 0, bx = 0, bn = 0; for (let q = 0; q < N * N; q++) { const o = own[q]; if (o === k || o === k + 1) { cnt[q % N]++; if (o === k) { ax += q % N; an++; } else { bx += q % N; bn++; } } }
      if (!an || !bn) continue; ax /= an; bx /= bn; if (bx <= ax) continue; let gap = -1, cut = null; for (let x = Math.round(ax); x <= Math.round(bx); x++) if (!cnt[x]) { gap = x; break; }
      if (gap < 0 && /[ㅅㅈ]/.test(a.jamo) && (an < 0.45 * bn || (a.jamo === "ㅈ" && a.role === "cho" && (an < bn || re)))) { /* (글자부 G 10-12: 쮟 쮮 쮲 예외 없앰 — 아래 「홈 가운데」 가름 + 다시 가름 re 로) */ /* 글자부 D 10-12: ㅉ 은 45% 넘어도(「찌」「쩍」「짠」 — 두 ㅈ 다리가 아래에서 붙어 빈 세로줄이 없고 첫 ㅈ 가로 오른끝·오른다리가 둘째 ㅈ 몫) · 45%↑ 이면 첫 ㅈ 몫을 되찾는 쪽일 때만(아래) */ /* 첫 자음 몫이 둘째의 45% 미만(본부 10-12 「쬔」 — 첫 ㅈ 두 다리가 통째로 둘째 ㅈ 몫) = 두 자음 윗부분(위 30% 줄) 사이 빈 세로줄로 아래까지 가름 */
        let ya = N, yb = -1; for (let q = 0; q < N * N; q++) if (own[q] === k || own[q] === k + 1) { const y = (q / N) | 0; if (y < ya) ya = y; if (y > yb) yb = y; }
        const yt = ya + Math.floor(0.3 * (yb - ya + 1)), c2 = new Int32Array(N); for (let q = ya * N; q <= yt * N + N - 1; q++) if (own[q] === k || own[q] === k + 1) c2[q % N]++;
        for (let x = Math.round(ax); x <= Math.round(bx); x++) if (!c2[x]) { gap = x; break; }
        if (gap >= 0 && a.jamo === "ㅈ") { /* 글자부 G 10-12: ㅉ 가름 = 두 ㅈ 사이 빈 홈(위 가로 사이 빈 세로줄에서 아래로 이어지는, 양옆이 ㅉ 잉크로 막힌 빈칸)의 줄마다 가운데 · 홈 맨 아래(꼭짓점)보다 아래는 꼭짓점 가운데 세로줄(ㅆ V 가름과 같은 꼴 · 가운데가 한 칸이면 그 줄은 그대로) — 위 가로 사이 빈 줄은 V 꼭짓점보다 1.5~3.5px 왼쪽(「찌」 첫 ㅈ 오른다리 안쪽 파랑 띠) */
          const io = q => on(q) && (own[q] === k || own[q] === k + 1); let l = gap, r = gap; const tr = [];
          for (let y = yt + 1; y <= yb; y++) { let nl = -1, nr = -1; for (let x = l; x <= r; x++) if (!io(y * N + x)) { nl = x; nr = x; while (nl - 1 >= x0 && !io(y * N + nl - 1)) nl--; while (nr + 1 <= x1 && !io(y * N + nr + 1)) nr++; break; }
            if (nl <= x0 || nr >= x1) break; l = nl; r = nr; tr.push([y, (l + r) / 2]); }
          if (tr.length) { const [yA, cA] = tr.at(-1); if (cA > ax && cA < bx) { cut = new Float64Array(N).fill(gap); for (const [y, c] of tr) cut[y] = c; for (let y = yA + 1; y < N; y++) cut[y] = cA; gap = Math.floor(cA); } } }
        if (gap >= 0 && an >= 0.45 * bn) { let m10 = 0, m01 = 0; for (let q = 0; q < N * N; q++) { const x = q % N, side = cut ? Math.sign(x - cut[(q / N) | 0]) : Math.sign(x - gap); if (own[q] === k && side > 0) m01++; else if (own[q] === k + 1 && side < 0) m10++; } if (!(m10 > 0 && m10 >= 3 * m01) && !(re && a.jamo === "ㅈ" && m01 > 0 && m01 >= 3 * m10)) gap = -1; } } /* 글자부 G 10-12: 모음 몫 덩어리를 쌍자음에 픽셀마다 나눠 준 뒤 다시 가를 때(re · 「쮟」) = 첫 ㅈ 이 더 많이 가진 쪽도 홈 가운데로 가름 */
      if (gap < 0 && a.jamo === "ㅅ" && a.role === "cho") { /* ㅆ 빈 세로줄 없음 = 첫 ㅅ 오른 삐침과 둘째 ㅅ 왼 삐침이 아래에서 만나는 「V」(글자부 10-12 「씐」 — 첫 ㅅ 오른 삐침 거의 다 둘째 ㅅ 색) = V 맨 아래 3줄 잉크 가운데 세로줄로 가름 */
        let ya = N, yb = -1; for (let q = 0; q < N * N; q++) if (own[q] === k || own[q] === k + 1) { const y = (q / N) | 0; if (y < ya) ya = y; if (y > yb) yb = y; }
        const yt = ya + Math.floor(0.3 * (yb - ya + 1)), c2 = new Int32Array(N); for (let q = ya * N; q <= yt * N + N - 1; q++) if (own[q] === k || own[q] === k + 1) c2[q % N]++;
        const segs = []; for (let x = x0; x <= x1; x++) if (c2[x]) { if (segs.length && segs.at(-1)[1] === x - 1) segs.at(-1)[1] = x; else segs.push([x, x]); }
        if (segs.length >= 2) { const s1 = segs[0][1], s2 = segs.at(-1)[0]; let yv = -1; for (let y = yt + 1; y <= yb; y++) { let has = false; for (let x = s1 + 1; x < s2; x++) { const q = y * N + x; if (on(q) && (own[q] === k || own[q] === k + 1)) { has = true; break; } } if (has) yv = y; else if (yv >= 0) break; } /* V 맨 아래 = 두 기둥 사이 잉크가 위에서부터 이어지다 끊기는 줄(아래 모음 띠의 떨어진 자음 몫 점은 아님 · 「쒜」) */
          if (yv > yt) { const cs = []; for (let y = yv; y > yv - 3; y--) { let l = -1, r2 = -1; for (let x = s1 + 1; x < s2; x++) if (on(y * N + x)) { if (l < 0) l = x; r2 = x; } if (l >= 0) cs.push((l + r2) / 2); }
            const cx = cs.reduce((p2, v) => p2 + v, 0) / cs.length, g2 = Math.round(cx); let m10 = 0, m01 = 0; for (let q = 0; q < N * N; q++) { const x = q % N; if (own[q] === k && x > g2) m01++; else if (own[q] === k + 1 && x < g2) m10++; }
            if (cx > ax && cx < bx && m10 >= 3 * m01) gap = g2; } } } /* 첫 ㅅ 몫을 되찾는 쪽일 때만(「쑥」 — 이미 첫 ㅅ 오른 삐침이 제 색이면 그대로) */
      if (gap < 0) continue; for (let q = 0; q < N * N; q++) { const x = q % N, side = cut ? Math.sign(x - cut[(q / N) | 0]) : Math.sign(x - gap); if (own[q] === k && side > 0) { own[q] = k + 1; moved = true; } else if (own[q] === k + 1 && side < 0) { own[q] = k; moved = true; } } } };
    dbl();
    // 겹받침(ㄳ ㅄ 등) 앞 받침 오른 세로 끝 2~3열이 뒷 받침 몫인 것 = 앞 받침 몫(본부 10-12 「쬆」「쬢」「쐓」 — ㅂ·ㄱ 오른 기둥 끝 세로 띠가 ㅅ 색)
    for (let k = 0; k + 1 < out.length; k++) { if (out[k].role !== "jong" || out[k + 1].role !== "jong" || out[k].jamo === out[k + 1].jamo) continue;
      let ya = N, yb = -1; for (let q = 0; q < N * N; q++) if (own[q] === k) { const y = (q / N) | 0; if (y < ya) ya = y; if (y > yb) yb = y; } if (yb < 0) continue; const hh = yb - ya + 1, colN = (x, o) => { let c = 0; for (let y = ya; y <= yb; y++) if (own[y * N + x] === o) c++; return c; };
      let xs = -1; for (let x = x0 + 1; x <= x1; x++) if (colN(x - 1, k) >= 0.6 * hh && colN(x, k + 1) >= 0.6 * hh) { xs = x; break; }
      if (xs < 0) continue; let xe = xs; while (xe + 1 <= x1 && xe - xs < 4 && colN(xe + 1, k + 1) >= 0.6 * hh) xe++; if (xe - xs >= 4) continue; /* 5열 이상 = 띠 아님 */
      for (let x = xs; x <= xe; x++) for (let y = ya; y <= yb; y++) { const q = y * N + x; if (own[q] === k + 1) { own[q] = k; moved = true; } } }
    // 글자부 G 10-12: 겹받침 ㄳ ㅄ — 앞 받침(ㄱ ㅂ)은 오른쪽이 받침 높이를 다 채우는 세로 기둥 · 그 기둥 오른변보다 오른쪽 앞 받침 몫 = 뒷 받침 ㅅ 몫(「큢」「귮」 ㅅ 왼획이 ㅂ 기둥에 붙어 통째로 ㅂ 색 · 「툯」「큓」 ㅅ 왼발 끝 쐐기)
    for (let k = 0; k + 1 < out.length; k++) { if (out[k].role !== "jong" || out[k + 1].role !== "jong" || !/[ㄱㅂ]/.test(out[k].jamo) || out[k + 1].jamo !== "ㅅ") continue;
      let ya = N, yb = -1; for (let q = 0; q < N * N; q++) if (own[q] === k) { const y = (q / N) | 0; if (y < ya) ya = y; if (y > yb) yb = y; } if (yb < 0) continue;
      let R = -1; for (let x = x0; x <= x1; x++) { let c = 0; for (let y = ya; y <= yb; y++) if (own[y * N + x] === k) c++; if (c >= 0.6 * (yb - ya + 1)) R = x; } if (R < 0) continue;
      const st = [], yh = ya + Math.ceil(0.4 * (yb - ya)); for (let y = yh; y <= yb; y++) for (let x = R + 1; x <= x1; x++) { const q = y * N + x; if (own[q] === k && (own[q - 1] === k + 1 || own[q + 1] === k + 1 || own[q - N] === k + 1 || own[q + N] === k + 1)) st.push(q); } /* ㅅ 몫에 이어진 것만(기둥 위 모서리·모음 다리 닿는 곳은 그대로 · 「룺」) */
      while (st.length) { const q = st.pop(); if (own[q] !== k) continue; own[q] = k + 1; moved = true; const x = q % N; for (const j of [x > R + 1 ? q - 1 : -1, x < x1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && ((j / N) | 0) >= yh && ((j / N) | 0) <= yb) st.push(j); } } /* 받침 아래 60% 줄만 — ㅅ 왼획·왼발이 기둥에 닿는 곳 · 위쪽은 모음 다리가 내려앉는 곳(「룺」「춦」 — 다리 닿는 기둥 위 모서리 1열을 ㅅ→모음으로 넘겨 1px 이빨) */
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
          for (let t = 1; t <= 8; t++) { const yy = down ? b.y1 + t : b.y0 - t; if (yy < 0 || yy >= N) break; /* 8줄(띠 끝이 비스듬히 좁아지는 줄 넘어 · 「뒝」) */ let n2 = 0, nm = 0; for (let x = xs; x <= xe; x++) if (on(yy * N + x)) { n2++; if (x >= m0 && x <= m1) nm++; } if (n2 && n2 < 0.5 * (xe - xs + 1) && nm >= 0.6 * n2) c += nm; } // 가운데에 몰린 기둥만(「궷」 ㄱ 가로 오른끝 세로가 ㅜ 기둥으로 세어지던 것)
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
        if (up && !okB.filter(b => stem(b) > 0).filter((b, i, a) => !(i === 0 && /[ㅊㅎ]/.test(out.find(v => v.role === "cho")?.jamo || "") && tick(b) && a.length)).length) okB.push(...bands.filter(b => { const c = (ry(b.y0) + ry(b.y1)) / 2; return c > r[3] + 0.02 && c <= r[3] + 0.1 && !touchHole(b) && stem(b) > 0; })); /* 글자부 D 10-12 「롼」: 초성이 키 커서(ㄹ 등) ㅗ 띠가 칸 아래 끝보다 더 내려간 받침 글자 — 칸 안 띠에 기둥이 하나도 없으면 칸 아래 0.1 안 기둥 달린 띠도 후보(ㄹ 가운데 가로를 ㅗ 띠로 잡던 것 · 「촌」 초성 ㅊ ㅎ 의 맨 위 꼭지 달린 띠는 기둥 띠로 안 셈) */
        let cand = okB; if (!up) { const nt = cand.filter(b => !tick(b)); if (nt.length) cand = nt; } else { const nt = cand.filter(b => !tickDown(b)); if (nt.length) cand = nt; }
        let bb = null, bs = -1, bd = Infinity; for (const b of cand) { const c = (ry(b.y0) + ry(b.y1)) / 2; const sv = stem(b), d = Math.abs(c - tgt); if (sv > bs || (sv === bs && d < bd)) { bs = sv; bd = d; bb = b; } }
        if (down) { const ws = cand.filter(b => stem(b) > 0 && (ry(b.y0) + ry(b.y1)) / 2 <= r[3]); if (ws.length > 1) bb = ws.reduce((p2, b) => (b.y0 > p2.y0 ? b : p2)); } // ㅜ ㅠ = 기둥 달린 띠 중 모음 칸 안 맨 아래(「쥔」 — ㅈ 윗가로 밑 꼭짓점을 기둥으로 봐 ㅈ 가로를 ㅜ 띠로 고르던 것)
        if (up) { const ws = cand.filter(b => stem(b) > 0); if (ws.length) bb = ws.reduce((p2, b) => (b.y0 > p2.y0 ? b : p2)); } // ㅗ ㅛ = 기둥 달린 띠 중 맨 아래(초성 ㅊ 가로·꼭지 말고)
        let lim = null, legW = null; const walked = new Set(); // 기둥 x 범위 · 따라간 기둥 픽셀
        if (bb) { // 띠는 초성 몫이면 모음에게 · 모음이 거의 비었으면(고리를 ㅇ ㅎ 에게 돌려줌 — 「훅」「흑」) 받침 몫이어도 모음에게 + 그 받침 몫 기둥(ㅗㅛ 위 · ㅜㅠ 아래, 띠에 이어진 좁은 줄)도
          let mine = 0, bn = 0; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { bn++; if (own[y * N + x] === k) mine++; } const empty = mine < bn * 0.5, from = new Set(); // 띠를 절반도 못 가졌으면 받침 몫이어도 찾아옴(「늄」 — ㅠ 띠·기둥이 ㅁ 몫)
          const fullW = ([y, xs, xe]) => { let a2 = xs, b2 = xe; while (a2 > 0 && on(y * N + a2 - 1)) a2--; while (b2 < N - 1 && on(y * N + b2 + 1)) b2++; return b2 - a2 + 1; }, wmax = Math.max(...bb.runs.map(fullW)); const ob = { y0: bb.y0, y1: bb.y1 }; bb = { runs: bb.runs.filter(r2 => fullW(r2) >= 0.85 * wmax) }; /* 너비 = 모음 칸 밖까지 이어진 실제 줄 길이 */ bb.y0 = bb.runs[0][0]; bb.y1 = bb.runs[bb.runs.length - 1][0]; // 띠 = 가장 넓은 줄의 85%↑ 줄만(「둑」 — 바로 붙은 ㄷ 아래 가로가 ㅜ 띠로 같이 잡히던 것)
          for (const [y, xs0, xe0] of bb.runs.concat(bands.flatMap(b2 => b2.runs).filter(([y]) => (y >= bb.y0 - 2 && y < bb.y0) || (y > bb.y1 && y <= bb.y1 + 2)).filter(([y]) => y >= ob.y0 && y <= ob.y1))) { let xs = xs0, xe = xe0; /* 띠 가장자리 비스듬한 줄 2줄까지도(「꿔」 띠 윗줄 1~2px 이 ㄱ 몫이던 것) */ while (xs > 0 && on(y * N + xs - 1)) xs--; while (xe < N - 1 && on(y * N + xe + 1)) xe++; /* 칸 밖까지 이어진 띠 끝도(「꿔」) */ for (let x = xs; x <= xe; x++) { const q = y * N + x, o = own[q]; if (o >= 0 && o !== k && !prot(o, q) && (out[o].role === "cho" || out[o].role === "jong")) { own[q] = k; moved = true; from.add(o); } } } // 받침 몫이어도(「분」 — ㅜ 띠 아래 절반·기둥이 ㄴ 몫)
          if (up || down) { for (let q = 0; q < N * N; q++) { const o = own[q]; if (o >= 0 && o !== k && out[o].role !== "jung") from.add(o); } /* 초성·받침(겹받침 앞 자모도 · 「륛」 ㅠ 왼다리가 ㄱ 몫) */ const xs = Math.min(...bb.runs.map(r2 => r2[1])), xe = Math.max(...bb.runs.map(r2 => r2[2])), bw = xe - xs + 1; const ys = down ? ob.y1 : ob.y0; let prev = new Set(); for (let x = xs; x <= xe; x++) if (on(ys * N + x)) prev.add(x); /* 띠 끝(85% 로 빼기 전) 줄에서 시작 */
            lim = null; let legs = null; const slantY = u.jamo === "ㅛ" && /[ㅅㅈㅊ]/.test(out.find(v => v.role === "cho")?.jamo || ""); /* ㅅ ㅈ ㅊ 아래 ㅛ = 비스듬한 획 끝에 닿은 다리 첫 줄도 다리 몫(「쵽」「숁」 다리 윗변 실선) */ const rowsW = [], onF = j => on(j) && !(own[j] >= 0 && prot(own[j], j));
            /* 옆에 붙은 잉크가 세로로 긴 획(다리 너비 1.4배↑ · 절반 넘게)이면 나란히 선 것 = 안 멈춤(「눤」 — ㅜ 기둥 끝이 받침 ㄴ 세로 옆에 붙어 멈춰 ㄴ 몫이던 것) · 가로획에 닿으면 그대로 멈춤 */
            const tallBeside = (y, l, r3, g) => { const lw = g[1] - g[0] + 1; let n2 = 0, t2 = 0; for (let x = l; x <= r3; x++) { if (x >= g[0] && x <= g[1]) continue; n2++; if (vr[y * N + x] >= 1.4 * lw) t2++; } return n2 > 0 && t2 > 0.5 * n2; }; for (let t = 1; t <= (legs && legs.some(g => !g.stop) ? 0.6 : 0.3) * Hh; t++) { const y = down ? ys + t : ys - t; if (y < y0 || y > y1) break; const row = []; for (let x = xs; x <= xe; x++) if (on(y * N + x)) row.push(x); if (!row.length || row.length > 0.7 * bw) break;
              const nx = new Set(); for (const x of row) { if (!prev.has(x) && !prev.has(x - 1) && !prev.has(x + 1)) continue; if (lim && (x < lim[0] || x > lim[1])) continue; const q = y * N + x, o = own[q]; if (o >= 0 && prot(o, q)) continue; nx.add(x); }
              if (legs) { // 다리마다 — 이 줄에서 다리가 든 잉크 줄기(가로로 이어진 것)가 다리 너비 1.4배 넘으면 다른 획과 붙은 것 → 그 다리 멈춤(「륛」 ㅠ 다리 ↔ 받침 ㄱ 가로·ㅅ 꼭짓점)
                for (const g of legs) { if (g.stop) continue; let a2 = -1; for (let x = g[0] - 1; x <= g[1] + 1; x++) if (nx.has(x)) { a2 = x; break; } if (a2 < 0 || (g.tallAt && up && [...nx].filter(x => x >= g[0] && x <= g[1]).length < 0.5 * (g[1] - g[0] + 1))) { g.stop = true; g.free = true; if (a2 >= 0) g.tipY = y; continue; } /* 나란히 붙은 다리가 반 넘게 가늘어지면 = 다리 끝(「꾜」) */ g.len = (g.len || 0) + 1; if (g.tallAt && g.len > g.tallAt + (g[1] - g[0] + 1)) { g.stop = true; continue; } /* 나란히 붙은 뒤 다리 너비만큼 안에 안 끝나면 붙은 곳에서 멈춤(「툷」) */ let l = a2, r3 = a2; while (l > 0 && onF(y * N + l - 1)) l--; while (r3 < N - 1 && onF(y * N + r3 + 1)) r3++; /* 고리 픽셀은 줄기 너비에서 뺌(「요」 — ㅛ 다리가 고리 아래에 닿아 멈춰 다리 윗구석이 ㅇ 몫이던 것) */ if (r3 - l + 1 > 1.4 * (g[1] - g[0] + 1)) { if (!tallBeside(y, l, r3, g)) { g.stop = true; g.land = true; if (slantY) { let n3 = 0; for (let x = g[0]; x <= g[1]; x++) if (on(y * N + x)) n3++; if (n3 >= 0.8 * (g[1] - g[0] + 1)) g.landY = y; } } /* 다리 너비가 다 찬 줄만(「춏」 — ㅊ 발끝만 걸친 줄은 아님) */ else g.tallAt ||= g.len; } }
                for (const x of [...nx]) if (!legs.some(g => (!g.stop && x >= g[0] - 1 && x <= g[1] + 1) || (g.landY === y && x >= g[0] && x <= g[1]))) nx.delete(x); }
              if (!nx.size) break;
              rowsW.push([y, [...nx].map(x => [x, legs ? legs.findIndex(g => x >= g[0] - 1 && x <= g[1] + 1) : -1])]);
              prev = nx; if (!legs && nx.size < 0.3 * bw && !(down ? y <= ob.y1 : y >= ob.y0)) { legs = []; for (const x of [...nx].sort((p2, r2) => p2 - r2)) { const g = legs.at(-1); if (g && x <= g[1] + 1) g[1] = x; else legs.push([x, x]); } lim = [Math.min(...nx), Math.max(...nx)]; } }
            if (legs && !legs.some(g => g.tallAt)) legW = Math.min(...legs.map(g => g[1] - g[0] + 1));
            if (legs) for (const g of legs) if (g.tipY != null) { /* 가늘어진 다리 꼬리(띠에서 0.3 높이 안) = 이 모음 몫(「꾜」「꾨」 ㅛ 왼다리 꼬리가 첫 ㄱ 몫이던 것 · 1010.96 과 같은 범위) */
              const lastY = down ? ys + 0.3 * Hh : ys - 0.3 * Hh, inY = yy => (down ? yy <= lastY : yy >= lastY), okQ = j => { const o = own[j]; return on(j) && (o === k || (o >= 0 && from.has(o) && !prot(o, j))); }, st = [];
              for (let x = g[0]; x <= g[1]; x++) { const q = g.tipY * N + x; if (okQ(q) && !walked.has(q)) { walked.add(q); st.push(q); } }
              while (st.length) { const q = st.pop(), x = q % N; if (own[q] !== k) { own[q] = k; moved = true; } for (const j of [x > g[0] ? q - 1 : -1, x < g[1] ? q + 1 : -1, down ? q + N : q - N]) if (j >= 0 && j < N * N && !walked.has(j) && inY((j / N) | 0) && okQ(j)) { walked.add(j); st.push(j); } } }
            if (legs && slantY) legs.forEach((g, gi) => { if (g.landY == null) { let ey = null; for (const [y2, xs2] of rowsW) if (xs2.some(([, g2]) => g2 === gi)) ey = y2; if (ey != null) g.landY = ey; } }); /* 붙은 줄이 tall 로 넘어간 다리도 마지막 다리 줄부터 */
            if (legs && slantY) for (const g of legs) if (g.landY != null) for (let t = 1; t <= 4; t++) { /* 닿은 줄 너머로도 다리 너비가 찬 줄(두 줄 넘게 붙은 다리 머리 · 「숅」)은 4줄까지 다리 몫 */
              const yy = down ? g.landY + t : g.landY - t; if (yy < 0 || yy >= N) break; let n3 = 0; for (let x = g[0]; x <= g[1]; x++) if (on(yy * N + x)) n3++; if (n3 < 0.8 * (g[1] - g[0] + 1)) break;
              for (let x = g[0]; x <= g[1]; x++) { const q = yy * N + x, o = own[q]; if (!on(q) || (o >= 0 && prot(o, q))) continue; walked.add(q); if (o >= 0 && o !== k && from.has(o)) { own[q] = k; moved = true; } } }
            if (legs) for (const g of legs) if (g.tallAt && !g.free) { g.len = g.tallAt; g.land = true; g.maxLen = g.tallAt - 1; } /* 나란히 붙은 다리가 빈칸에서 안 끝남 = 붙은 곳에서 멈춤 */
            // 다리 둘(ㅛ ㅠ) = 길이가 같음 — 빈칸에서 끝난 다리 길이를 넘는 다른 다리 끝은 기둥 아님(「츊」 ㅠ 오른다리가 받침 ㅎ 꼭지까지)
            const cap = /[ㅛㅠ]/.test(u.jamo) && legs && legs.length === 2 && legs.some(g => g.free || g.land) ? Math.min(...legs.filter(g => g.free || g.land).map(g => g.len || 0)) : Infinity, legN = new Map();
            for (const [y, xs2] of rowsW) { const inRow = new Set(xs2.map(([, gi]) => gi).filter(gi => gi >= 0)); for (const gi of inRow) legN.set(gi, (legN.get(gi) || 0) + 1);
              for (const [x, gi] of xs2) { if (gi >= 0 && ((legN.get(gi) > cap && y !== legs[gi].landY) || legN.get(gi) > (legs[gi].maxLen ?? Infinity))) continue; const q = y * N + x, o = own[q]; walked.add(q); if (o >= 0 && o !== k && from.has(o)) { own[q] = k; moved = true; } } } }
          // 띠 위(ㅜ ㅠ ㅡ) · 띠 아래(ㅗ ㅛ)에 남은 이 모음 몫 = 맞닿은 이웃 자모 몫(「눤」「늄」 — ㄴ 아래 가로가 모음 칸에 들어가 모음 몫이던 것) · 바깥부터 한 겹씩
          const bxs = Math.min(...bb.runs.map(r2 => r2[1])), bxe = Math.max(...bb.runs.map(r2 => r2[2])), wideRow = new Map(), isWide = y => { if (!wideRow.has(y)) { let n2 = 0; for (let x = bxs; x <= bxe; x++) if (on(y * N + x)) n2++; wideRow.set(y, n2 > 0.7 * (bxe - bxs + 1)); } return wideRow.get(y); };
          // 띠 반대쪽 전부 + 기둥 쪽이라도 넓은 줄(「복」 ㅂ 아래 가로·두 기둥 = 기둥 아님)은 이 모음 몫 아님
          // 기둥 = 띠에서 기둥 쪽으로 좁은 줄만 따라 이어진 이 모음 몫(넓은 줄에서 멈춤)
          if (legW) { /* 따라간 기둥 줄의 잉크 줄기가 기둥 너비 2배 안이면 그 줄기의 이 모음 몫도 기둥(「쐴」 ㅗ 머리 삼각형 양옆이 ㅅ 몫이던 것) */
            const lw = legW, rowsDone = new Set();
            for (const q of [...walked]) { const y = (q / N) | 0; if (rowsDone.has(y)) continue; rowsDone.add(y);
              for (const q2 of [...walked].filter(q3 => ((q3 / N) | 0) === y)) { let l = q2 % N, r3 = l; while (l > 0 && on(y * N + l - 1)) l--; while (r3 < N - 1 && on(y * N + r3 + 1)) r3++; if (r3 - l + 1 > 2 * lw) continue; for (let x = l; x <= r3; x++) if (own[y * N + x] === k) walked.add(y * N + x); } } }
          const runW = j => { const y = (j / N) | 0; let l = j % N, r3 = l; while (l > 0 && on(y * N + l - 1)) l--; while (r3 < N - 1 && on(y * N + r3 + 1)) r3++; return r3 - l + 1; }; /* ㅗ ㅛ 기둥 위 머리(잉크 줄기가 기둥 너비 2배 안) = 이 모음 몫 그대로(「쐴」 ㅗ 머리 삼각형) */
          const stemSet = new Uint8Array(N * N); { const st = []; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x; if (own[q] === k) { stemSet[q] = 1; st.push(q); } }
            while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) { if (j < 0 || j >= N * N || stemSet[j] || own[j] !== k) continue; const y = (j / N) | 0; if (y >= ob.y0 && y <= ob.y1) { stemSet[j] = 1; st.push(j); continue; } if (!walked.has(j) && !((walked.has(j - 1) && !on(j + 1)) || (walked.has(j + 1) && !on(j - 1)))) continue; /* 띠 밖 = 따라간 기둥만(「륛」) + 그 옆 잉크 끝 1칸(「횹」 — 기둥 너비 밖 가장자리 1px 줄이 ㅎ 몫이던 것) */ /* 85% 로 뺀 띠 가장자리 줄은 기둥 쪽이면 통과 */ stemSet[j] = 1; st.push(j); } } }
          const bad = q => { const y = (q / N) | 0; return !(y >= bb.y0 && y <= bb.y1) && !stemSet[q]; };
          { // 떼어낼 덩어리마다 — 덩어리 가운데가 든 자음 칸이 하나면 그 자음(「흃」 받침 ㅎ 꼭지·가로대가 고리와 떨어져 맞닿음으로는 못 가리던 것) · 아니면 아래 맞닿음
            const relq = q => [((q % N) - x0 + 0.5) / W, (((q / N) | 0) - y0 + 0.5) / Hh], seenB = new Uint8Array(N * N);
            for (let q0 = 0; q0 < N * N; q0++) { if (seenB[q0] || own[q0] !== k || !bad(q0)) continue; const c = [], s2 = [q0]; seenB[q0] = 1; while (s2.length) { const q = s2.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && !seenB[j] && own[j] === k && bad(j)) { seenB[j] = 1; s2.push(j); } }
              if (c.length < 30) continue; let sx = 0, sy = 0; for (const q of c) { const [a2, b2] = relq(q); sx += a2; sy += b2; } sx /= c.length; sy /= c.length;
              const hits = out.map((v, j) => j).filter(j => out[j].role !== "jung" && sx >= out[j].rect[0] && sx <= out[j].rect[2] && sy >= out[j].rect[1] && sy <= out[j].rect[3]);
              const nb = new Set(); for (const q of c) { const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k && out[o].role !== "jung") nb.add(o); } } /* 두 자음 이상에 맞닿은 덩어리는 아래 맞닿음으로 나눔(「쐴」 — ㅅ ㅅ 사이 덩어리가 통째로 둘째 ㅅ 몫이던 것) */
              if (hits.length === 1 && nb.size < 2) { for (const q of c) own[q] = hits[0]; moved = true; } } }
          for (let it = 0; it < N; it++) { let ch = false; for (let q = 0; q < N * N; q++) { if (own[q] !== k || !bad(q)) continue; const x = q % N, cnt = new Map(); for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N, x > 0 ? q - N - 1 : -1, x < N - 1 ? q - N + 1 : -1, x > 0 ? q + N - 1 : -1, x < N - 1 ? q + N + 1 : -1]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k && out[o].role !== "jung") cnt.set(o, (cnt.get(o) || 0) + 1); }
              if (cnt.size) { own[q] = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; ch = true; moved = true; if (out[own[q]].role === "cho" && out.some((v, j) => j !== own[q] && v.role === "cho" && v.jamo === out[own[q]].jamo)) reDbl = true; } } if (!ch) break; } /* 글자부 G 10-12: 쌍자음에 픽셀마다 나눠 줬으면 쌍자음 다시 가름(「쮟」 — 두 ㅈ 다리가 만난 아래 덩어리가 ㅟ 몫이었다가 두 ㅈ 이 번갈아 먹어 첫 ㅈ 이 둘째 ㅈ 다리 아랫변까지) */
          // 띠와 이어지지 않은 이 모음 몫 덩어리 = 가장 많이 맞닿은 이웃(「촥」 — ㅊ 꼭지·가로가 ㅗ 몫)
          { const seen = new Uint8Array(N * N), st = []; for (const [y, xs, xe] of bb.runs) for (let x = xs; x <= xe; x++) { const q = y * N + x; if (own[q] === k && !seen[q]) { seen[q] = 1; st.push(q); } }
            while (st.length) { const q = st.pop(), x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && !seen[j]) { seen[j] = 1; st.push(j); } }
            for (let q0 = 0; q0 < N * N; q0++) { if (own[q0] !== k || seen[q0]) continue; const c = [], s2 = [q0]; seen[q0] = 1; while (s2.length) { const q = s2.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && own[j] === k && !seen[j]) { seen[j] = 1; s2.push(j); } }
              const cnt = new Map(); for (const q of c) { const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k) cnt.set(o, (cnt.get(o) || 0) + 1); } }
              if (cnt.size) { const to = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; for (const q of c) own[q] = to; moved = true; } } } }
      } else if (V.has(u.jamo)) {
        const ya = y0 + Math.floor(r[1] * Hh), yb = Math.min(y1, y0 + Math.ceil(r[3] * Hh) - 1), xa = x0 + Math.floor(Math.max(0, r[0] - 0.1) * W), xb = Math.min(x1, x0 + Math.ceil((r[2] + 0.1) * W) - 1); // 칸 오른끝 +0.1(기둥이 칸 끝에 잘려 좁게 세어지던 것 · 「뺅」)
        let cx = -1, ct = 0, cb = 0;
        // 기둥 = 이 모음 몫 세로 줄이 가장 긴 열(45%↑) 중 왼쪽 첫 열(가장 긴 것의 85%↑) — 「경」 ㄱ 세로가 45%를 겨우 넘어 기둥으로 잡히던 것
        { const runs = []; for (let x = xa; x <= xb; x++) { let run = 0, top = 0, best = 0, bt = 0; for (let y = ya; y <= yb; y++) { if (own[y * N + x] === k) { if (!run) top = y; run++; if (run > best) { best = run; bt = top; } } else run = 0; } runs.push([x, best, bt]); }
          const mx = Math.max(0, ...runs.map(r2 => r2[1])); if (mx >= 0.45 * (yb - ya + 1)) { let g = null, best = null; for (const r2 of runs) { if (r2[1] >= 0.85 * mx) { if (g && g.at(-1)[0] === r2[0] - 1) g.push(r2); else g = [r2]; const mid = x0 + ((r[0] + r[2]) / 2) * W, dist = gg => Math.abs((gg[0][0] + gg.at(-1)[0]) / 2 - mid); if (!best || g.length > best.length || (g.length === best.length && dist(g) < dist(best))) best = g; } else g = null; } const f = best[0]; cx = f[0]; ct = f[2]; cb = f[2] + f[1] - 1; } } // 가장 넓은 「긴 열 묶음」의 첫 열(「뺅」 — 둘째 ㅂ 오른 세로를 ㅏ 기둥으로 잡던 것)
        if (cx < 0) return;
        for (let y = ct; y <= cb; y++) { const run = []; for (let x = cx - 1; x >= x0 && on(y * N + x) && vr[y * N + x] < 0.2 * Hh; x--) run.push(y * N + x); if (run.length && run.length <= 0.3 * W) for (const q of run) if (own[q] >= 0 && out[own[q]].role === "cho" && !prot(own[q], q)) { own[q] = k; moved = true; } } /* ㅇ ㅎ 고리 띠는 안 가져옴(본부 10-12 「었」 고리 오른쪽 가장자리가 ㅓ 몫) */
        // 기둥 왼쪽 이 모음 몫 = 기둥에서 같은 줄로 왼쪽으로 이어진 꼭지만(꼭지 두께의 2.2배 넘는 세로 획에서 멈춤) · 나머지는 맞닿은 이웃(「경」 — ㄱ 오른쪽 위 모서리가 ㅕ 몫)
        { const reach = new Uint8Array(N * N), ringC = out.some(v => v.role === "cho" && v.ring?.size); for (let y = y0; y <= y1; y++) { if (own[y * N + cx] !== k) continue; const v0 = Math.max(vr[y * N + cx - 1] || 0, vr[y * N + cx - 2] || 0) || 1; for (let x = cx - 1; x >= x0; x--) { const q = y * N + x; if (own[q] !== k || (!ringC && x < cx - 2 && vr[q] > 2.2 * v0 && vr[q] >= 0.15 * Hh)) break; reach[q] = 1; } } /* 초성이 ㅇ ㅎ 고리면 세로 길이로 안 멈춤(고리 띠에서 멈춤 · 본부 10-12 「영」「여」 ㅕ 가로 왼끝이 고리 옆 세로줄에 걸려 ㅇ 몫이던 것) */
          for (let it = 0; it < N; it++) { let ch2 = false; for (let y = y0; y <= y1; y++) for (let x = x0; x < cx; x++) { const q = y * N + x; if (own[q] !== k || reach[q]) continue; const cnt = new Map(); for (const j of [x > 0 ? q - 1 : -1, q + 1, q - N, q + N, x > 0 ? q - N - 1 : -1, q - N + 1, x > 0 ? q + N - 1 : -1, q + N + 1]) { const o = j >= 0 && j < N * N ? own[j] : -1; if (o >= 0 && o !== k && out[o].role !== "jung") cnt.set(o, (cnt.get(o) || 0) + 1); }
              if (cnt.size) { own[q] = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0]; ch2 = true; moved = true; } } if (!ch2) break; }
          /* 글자부 D 10-12 「뻛」: 남은 이 모음 몫(기둥 왼쪽 · 꼭지 아님) 덩어리가 자음 몫과 안 맞닿아 못 돌려준 것(ㅃ 둘째 ㅂ 통째가 ㅓ 몫 — 첫 ㅂ 오른기둥만 둘째 ㅂ 몫) = 덩어리 가운데에서 가장 가까운 초성 칸 · 쌍자음이면 가름 다시 */
          if (out[k - 1]?.role === "cho") { /* 초성 바로 뒤 모음만(겹모음 오른쪽 ㅣ 는 아님 — 「빼」 ㅏ 기둥이 아직 ㅣ 몫인 때라 ㅏ 기둥을 초성에게 주던 것) */ const seen = new Uint8Array(N * N); for (let q0 = 0; q0 < N * N; q0++) { const x00 = q0 % N; if (seen[q0] || own[q0] !== k || reach[q0] || x00 >= cx) continue; const c = [], s2 = [q0]; seen[q0] = 1; while (s2.length) { const q = s2.pop(); c.push(q); const x = q % N; for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < N * N && !seen[j] && own[j] === k && !reach[j] && j % N < cx) { seen[j] = 1; s2.push(j); } }
              if (c.length < 0.02 * W * Hh) continue; let sx = 0, sy = 0; for (const q of c) { sx += ((q % N) - x0 + 0.5) / W; sy += (((q / N) | 0) - y0 + 0.5) / Hh; } sx /= c.length; sy /= c.length;
              let to = -1, bd = Infinity; out.forEach((v, j) => { if (v.role !== "cho") return; const f = v.rect, inside = sx >= f[0] && sx <= f[2] && sy >= f[1] && sy <= f[3], d = (((f[0] + f[2]) / 2 - sx) ** 2 + ((f[1] + f[3]) / 2 - sy) ** 2) * (inside ? 1 : 4); if (d < bd) { bd = d; to = j; } });
              if (to >= 0 && sy <= out[to].rect[3] + 0.05) { for (const q of c) own[q] = to; moved = true; reDbl = true; } } } }
        // 가로 왼끝이 초성 비스듬한 획에 닿는 곳 = 그 획 오른쪽 가장자리를 가로 위·아래 줄에서 이어 그은 선으로 가름(본부 10-12 「게」「겠」 ㅓ 가로 왼끝 아래가 ㄱ 몫 · 수직으로 자르던 것)
        { const tb = []; for (let y = y0; y <= y1; y++) { let x = cx; if (own[y * N + x] !== k) { tb.push(null); continue; } while (x > x0 && own[y * N + x - 1] === k) x--; const o = own[y * N + x - 1]; tb.push(x > x0 && on(y * N + x - 1) && o >= 0 && o !== k && out[o].role === "cho" && !prot(o, y * N + x - 1) && x < cx - 2 ? [x, o] : null); }
          const edgeAt = (y, bx, o) => { if (y < y0 || y > y1) return null; for (let x = Math.min(x1, bx + 10); x >= Math.max(x0, bx - 30); x--) { const q = y * N + x; if (on(q) && own[q] === o) return x; } return null; };
          for (let a2 = 0; a2 < tb.length; a2++) { if (!tb[a2]) continue; let b2 = a2; while (b2 + 1 < tb.length && tb[b2 + 1] && tb[b2 + 1][1] === tb[a2][1]) b2++; const o = tb[a2][1], ya2 = y0 + a2, yb2 = y0 + b2;
            if (yb2 - ya2 >= 2) { const eA = edgeAt(ya2 - 1, tb[a2][0], o), eB = edgeAt(yb2 + 1, tb[b2][0], o), runW = (y, x) => { let l = x, r3 = x; while (l > x0 && own[y * N + l - 1] === o) l--; while (r3 < x1 && own[y * N + r3 + 1] === o) r3++; return r3 - l + 1; }, thk = Math.max(3, yb2 - ya2 + 1); const eA2 = edgeAt(ya2 - 4, tb[a2][0], o), eB2 = edgeAt(yb2 + 4, tb[b2][0], o), sl = (eB - eA) / (yb2 - ya2 + 2), slOk = eA2 != null && eB2 != null && Math.abs((eA - eA2) / 3 - sl) <= 0.6 * Math.abs(sl) + 0.4 && Math.abs((eB2 - eB) / 3 - sl) <= 0.6 * Math.abs(sl) + 0.4; /* 위·아래 3줄 더 바깥에서도 같은 기울기 = 곧은 비스듬한 획(ㅂ 아랫가로처럼 꺾인 곳은 아님 · 「뼊」) */
              if (eA != null && eB != null && slOk && !out[o].ring?.size && Math.abs(eA - eB) >= 3 && runW(ya2 - 1, eA) < 2.2 * thk && runW(yb2 + 1, eB) < 2.2 * thk) for (let y = ya2; y <= yb2; y++) { const e = Math.round(eA + ((eB - eA) * (y - ya2 + 1)) / (yb2 - ya2 + 2)), bx = tb[y - y0][0];
                for (let x = Math.max(x0, bx - 12); x <= Math.min(cx - 1, bx + 12); x++) { const q = y * N + x; if (!on(q)) continue; if (x > e && own[q] === o) { own[q] = k; moved = true; } else if (x <= e && own[q] === k) { own[q] = o; moved = true; } } } }
            a2 = b2; } }
        // 고리 옆 가로 줄 = 고리 바깥선(가로 위·아래 줄의 고리 오른쪽 끝을 이은 곡선) 안쪽만 초성 몫(본부 10-12 「옒」「헤」「헬」 — 고리 띠가 가로 줄에서 바깥선보다 3~6칸 나와 빨강 이빨)
        for (let o = 0; o < out.length; o++) { if (out[o].role !== "cho" || !out[o].ring?.size) continue;
          const rt = y => { for (let x = cx - 1; x >= x0; x--) { const q = y * N + x; if (own[q] === o && on(q)) return x; } return null; }, tch = y => { const x = rt(y); return x != null && own[y * N + x + 1] === k; };
          for (let y = y0; y <= y1; y++) { if (!tch(y)) continue; let yb2 = y; while (yb2 + 1 <= y1 && tch(yb2 + 1)) yb2++; const ya2 = y; y = yb2;
            const pts = []; let na = 0, nb2 = 0; for (let t = 4; t <= 11; t++) { /* 가로 바로 위·아래 3줄(어깨)은 곡선 재는 데 안 씀 */ for (const [yy, s] of [[ya2 - t, 0], [yb2 + t, 1]]) { if (yy < y0 || yy > y1 || tch(yy)) continue; const x = rt(yy); if (x == null) continue; pts.push([yy, x]); if (s) nb2++; else na++; } }
            if (na < 3 || nb2 < 3) continue; /* 위·아래 모두 바깥선이 보일 때만 */
            const m0 = (ya2 + yb2) / 2; let S = [0, 0, 0, 0, 0], T = [0, 0, 0]; for (const [yy, x] of pts) { const d = yy - m0; S[0]++; S[1] += d; S[2] += d * d; S[3] += d * d * d; S[4] += d * d * d * d; T[0] += x; T[1] += x * d; T[2] += x * d * d; }
            const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]), D0 = det(A); if (Math.abs(D0) < 1e-9) continue;
            const cf = [0, 1, 2].map(c => det(A.map((row, i) => row.map((v, j) => (j === c ? T[i] : v)))) / D0); /* 2차 곡선 맞춤(크라메르) */
            const capAt = yy => { const d = yy - m0; return Math.floor(cf[0] + cf[1] * d + cf[2] * d * d + 0.5); };
            for (let yy = ya2; yy <= yb2; yy++) { const cap = capAt(yy); for (let x = cap + 1; x < cx; x++) { const q = yy * N + x; if (own[q] === o) { own[q] = k; moved = true; } else if (own[q] === k) break; } }
            for (let t = 1; t <= 3; t++) for (const [yy, dy] of [[ya2 - t, 1], [yb2 + t, -1]]) { if (yy < y0 || yy > y1) continue; const cap = capAt(yy), sh = []; for (let x = cap + 1; x < cx; x++) { const q = yy * N + x; if (own[q] === o && own[q + dy * N] === k) sh.push(q); } if (sh.length >= 2) { for (const q of sh) own[q] = k; moved = true; } } } } /* 어깨 한 줄에 1칸뿐이면 돌기라 안 함(글자부 10-12 「혠」 ㅕ 꼭지 밑 1칸 돌기) */ /* 어깨(본부 10-12 「엥」「엒」 가로 위·아래 모서리 2~3칸) = 같은 곡선 밖이고 가로에서 이어진 칸만 모음 몫 */
      }
    });
    if (reDbl) dbl(true);
    // ㅆ ㅉ + ㅗ ㅘ ㅙ ㅚ 「사발」(본부 10-11) — 두 자음 다리 끝이 만나는 아래 볼록 = 자음 몫(가운데 왼쪽 = 첫 자음 · 오른쪽 = 둘째) · ㅗ 는 사발 아래 기둥만
    //  기둥 = 가로획 위 이 모음 몫 · 사발 = 기둥 위(목이 붙었으면 가장 좁은 목 위 · 떨어진 U 자 글꼴이면 빈 줄 위) 가운데 잉크 줄기 · 가운데 = 사발 맨 아래 3줄 줄기 가운데
    { const chs = out.map((v, j) => j).filter(j => out[j].role === "cho"), vk = out.findIndex(v => v.role === "jung" && v.jamo === "ㅗ");
      if (chs.length === 2 && out[chs[0]].jamo === out[chs[1]].jamo && /[ㅅㅈ]/.test(out[chs[0]].jamo) && vk >= 0) {
        { /* ㅗ 기둥이 통째로 자음 몫인 글꼴(본부 10-12 「쐓」) = ㅗ 몫 바로 위 줄에서 ㅗ 에 닿은 자음 몫 줄기를 위로 따라가며(가로 너비 35% 이하 줄만) ㅗ 몫으로 · 이미 ㅗ 기둥이 있으면 안 함 */
          const r0 = new Map(); for (let q = 0; q < N * N; q++) if (own[q] === vk) { const y = (q / N) | 0; r0.set(y, (r0.get(y) || 0) + 1); }
          const wM = Math.max(0, ...r0.values()), by = [...r0.keys()].sort((a2, b2) => a2 - b2).find(y => r0.get(y) >= 0.8 * wM), upN = by == null ? 0 : [...r0.keys()].filter(y => y < by - 1).reduce((a2, y) => a2 + r0.get(y), 0);
          if (by != null && upN < 40 && wM > 0.3 * (x1 - x0 + 1)) { let cur = new Set(); for (let y = by - 1; y >= by - 3 && y >= y0; y--) for (let x = x0; x <= x1; x++) { const q = y * N + x; if (chs.includes(own[q]) && (own[q + N] === vk || cur.has(q + N))) cur.add(q); }
            const runW = (y, x) => { let l = x, r3 = x; while (l > x0 && on(y * N + l - 1)) l--; while (r3 < x1 && on(y * N + r3 + 1)) r3++; return r3 - l + 1; }; const take = new Set(cur);
            let y = Math.min(...[...cur].map(q => (q / N) | 0)) - 1; let front = [...cur].filter(q => ((q / N) | 0) === y + 1);
            while (front.length && y >= y0) { const nx = []; for (const q of front) { const j = q - N; if (j >= 0 && chs.includes(own[j]) && !take.has(j) && runW(y, j % N) <= 0.35 * wM) { take.add(j); nx.push(j); } } /* 같은 줄 옆으로 이어진 자음 몫(너비 안) */ for (const q of [...nx]) { let x = q % N; for (const d of [-1, 1]) { let xx = x + d; while (xx >= x0 && xx <= x1 && chs.includes(own[y * N + xx]) && !take.has(y * N + xx) && runW(y, xx) <= 0.35 * wM) { take.add(y * N + xx); nx.push(y * N + xx); xx += d; } } } front = nx; y--; }
            if (take.size >= 60) { for (const q of take) own[q] = vk; moved = true; } } }
        const rowsK = new Map(); for (let q = 0; q < N * N; q++) if (own[q] === vk) { const y = (q / N) | 0; if (!rowsK.has(y)) rowsK.set(y, []); rowsK.get(y).push(q % N); }
        const ysK = [...rowsK.keys()].sort((a2, b2) => a2 - b2), wOf = y => rowsK.get(y).length, wMax = Math.max(0, ...ysK.map(wOf)), bandY = ysK.find(y => wOf(y) >= 0.8 * wMax && wMax > 0.3 * (x1 - x0 + 1)); /* 가로획 = 이 모음 몫이 가장 넓은 줄(ㅘ ㅙ 는 글자 너비 절반이 안 됨) */
        const stemYs = bandY == null ? [] : ysK.filter(y => y < bandY - 1);
        if (stemYs.length >= 3) { const ws = stemYs.map(wOf).sort((a2, b2) => a2 - b2)[stemYs.length >> 1], sx = rowsK.get(stemYs[stemYs.length >> 1]), scx = Math.round((Math.min(...sx) + Math.max(...sx)) / 2);
          let top = -1, nw = Infinity; for (const y of stemYs) { const w = wOf(y); if (w < nw && y < bandY - 3) { nw = w; top = y; } }
          if (!(nw < 0.6 * ws)) top = stemYs[0]; /* 목이 없으면 기둥 맨 윗줄 */
          const runAt = (y, x) => { if (!on(y * N + x)) return null; let l = x, r3 = x; while (l > 0 && on(y * N + l - 1)) l--; while (r3 < N - 1 && on(y * N + r3 + 1)) r3++; return [l, r3]; };
          let y = top - 1, gap = 0; while (y >= y0 && !on(y * N + scx) && gap < 10) { y--; gap++; } /* U 자 글꼴 = 기둥과 사발 사이 빈 줄 */
          const bot = []; for (let t = 0; t < 3 && y - t >= y0; t++) { const r = runAt(y - t, scx); if (r) bot.push((r[0] + r[1]) / 2); }
          if (bot.length && (nw < 0.6 * ws || gap > 0)) { let cx = Math.round(bot.sort((a2, b2) => a2 - b2)[bot.length >> 1]); const bw = ws; /* 줄기 너비 상한 = 기둥 너비 3배(사발 맨 아래는 뾰족해서 기준 안 됨) */
            { /* 경계 = 사발 줄 전체 가운데 평균(글자부 C · 「쫏」「쐬」 — 맨 아래 3줄 가운데로 잡아 위 줄들에서 왼쪽이 2~3px 좁던 것) · 평균 치우침 0.75px 미만이면 그대로(홀수 폭 1px 는 반올림 한계) */
              const cs = []; for (let yy = y; yy >= y0; yy--) { const r = runAt(yy, cx); if (!r || r[1] - r[0] + 1 > 3 * bw) break; cs.push((r[0] + r[1] + 1) / 2); }
              if (cs.length >= 3) { const mc = cs.reduce((a2, b2) => a2 + b2, 0) / cs.length; if (Math.abs(cx - mc) >= 0.75) cx = Math.round(mc); } }
            for (let yy = y; yy >= y0; yy--) { const r = runAt(yy, cx); if (!r || r[1] - r[0] + 1 > 3 * bw) break;
              for (let x = r[0]; x <= r[1]; x++) { const q = yy * N + x, o = own[q]; if (o !== vk && !chs.includes(o)) continue; const to = x < cx ? chs[0] : chs[1]; if (o !== to) { own[q] = to; moved = true; } } } } } } }
    // ㄸ + ㅗ ㅘ ㅙ ㅚ — ㅗ 기둥 윗머리(ㄷ 아래 가로 밑으로 나온 1~2줄)가 ㄷ 몫이던 것 = ㅗ 몫(글자부 C · 「뙬」「뙗」「똿」「똰」「뙃」) · ㄸ 아래 가로는 ㄷ 몫 그대로(본부 결정)
    //  기둥 = 가로획 위로 이어진 이 모음 몫 줄 · 기둥 맨 윗줄 위로 4줄까지: 기둥 왼끝(또는 오른끝) 바로 바깥이 빈칸이고 기둥 너비 80%↑ 잉크인 줄 = 기둥 머리
    //  머리 줄에서 그 빈칸 쪽 ㄷ 몫은 ㅗ 몫 · 반대쪽 ㄷ 몫은 바로 위가 빈칸인 것만(맞은편 ㄷ 아래 가로 밑줄은 그대로)
    { const chs = out.map((v, j) => j).filter(j => out[j].role === "cho"), vk = out.findIndex(v => v.role === "jung" && v.jamo === "ㅗ");
      if (chs.length === 2 && out[chs[0]].jamo === "ㄷ" && out[chs[1]].jamo === "ㄷ" && vk >= 0) {
        const rowsK = new Map(); for (let q = 0; q < N * N; q++) if (own[q] === vk) { const y = (q / N) | 0; if (!rowsK.has(y)) rowsK.set(y, []); rowsK.get(y).push(q % N); }
        const ysK = [...rowsK.keys()].sort((a2, b2) => a2 - b2), wOf = y => rowsK.get(y).length, wMax = Math.max(0, ...ysK.map(wOf)), bandY = ysK.find(y => wOf(y) >= 0.8 * wMax && wMax > 0.3 * (x1 - x0 + 1));
        if (bandY != null) { let top = bandY - 1; while (rowsK.has(top - 1)) top--; const stemYs = ysK.filter(y => y >= top && y < bandY - 1);
          if (stemYs.length >= 3) { const sx = rowsK.get(stemYs[stemYs.length >> 1]), sl = Math.min(...sx), sr = Math.max(...sx), sw = sr - sl + 1;
            if (sw < 0.5 * wMax) { const hr = []; for (let y = top - 1; y >= Math.max(y0, top - 4); y--) {
                const eL = on(y * N + sl) && !on(y * N + sl - 1), eR = on(y * N + sr) && !on(y * N + sr + 1); if (!eL && !eR) break;
                let n = 0; for (let x = sl; x <= sr; x++) if (on(y * N + x)) n++; if (n < 0.8 * sw) break; hr.push([y, eL, eR]); }
              if (hr.length) { const yA = hr.at(-1)[0] - 3; let bL = N, rR = -1; for (let x = x0; x <= x1; x++) { const o = own[yA * N + x]; if (o === chs[1] && x < bL) bL = x; if (o === chs[0] && x > rR) rR = x; } /* 머리 2줄 위(이음매 잔 조각 피함)의 둘째 ㄷ 왼끝 · 첫 ㄷ 오른끝 = 맞은편 ㄷ 가로 경계(「똒」 — 둘째 ㄷ 아래 가로 모서리는 그대로) */
                for (const [y, eL, eR] of hr) for (let x = sl; x <= sr; x++) { const q = y * N + x, o = own[q]; if (!on(q) || o === vk || !chs.includes(o)) continue; if ((eL && (o === chs[0] || x < bL)) || (eR && (o === chs[1] || x > rR))) { own[q] = vk; moved = true; } } } } } } } }
    // 겹모음 오른쪽 ㅣ(ㅐㅔㅒㅖㅚㅟㅢ…) 기둥 왼쪽에 붙은 잉크 = 앞 모음 몫(본부 10-10 경계 그림 「대」 — ㅐ 가운데 가로대가 ㅣ 몫이던 것)
    out.forEach((u, k) => {
      if (u.role !== "jung" || u.jamo !== "ㅣ" || k === 0 || out[k - 1].role !== "jung") return;
      const xa = x0 + Math.floor(Math.max(0, u.rect[0] - 0.1) * W), ya = y0 + Math.floor(u.rect[1] * Hh), yb = Math.min(y1, y0 + Math.ceil(u.rect[3] * Hh) - 1);
      let cx = -1; { const rs = []; for (let x = xa; x <= x1; x++) { let run = 0, best = 0; for (let y = ya; y <= yb; y++) { if (own[y * N + x] === k) { run++; if (run > best) best = run; } else run = 0; } rs.push([x, best]); } const mx = Math.max(0, ...rs.map(r2 => r2[1])); if (mx >= 0.45 * (yb - ya + 1)) { let g = null; const gs = []; for (const [x, n] of rs) { if (n >= 0.85 * mx) { if (g && g[1] === x - 1) g[1] = x; else gs.push((g = [x, x])); } else g = null; } const wmax = Math.max(...gs.map(g2 => g2[1] - g2[0] + 1)); cx = gs.filter(g2 => g2[1] - g2[0] + 1 >= 0.6 * wmax).at(-1)[0]; } } // ㅣ 기둥 = 오른쪽 끝 「긴 열 묶음」(넓이 60%↑) 첫 열(「때」 ㅏ 가장자리 · 「빼」 ㅐ 통째가 ㅣ 몫 — ㅣ 는 늘 오른쪽 획) = 가장 긴 세로 열(「때」 — ㅏ 기둥 오른 가장자리 1~2px 를 ㅣ 기둥으로 잡아 ㅏ 가로가 ㅣ 몫이던 것)
      if (cx < 0) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x < cx; x++) { const q = y * N + x; if (own[q] === k) { own[q] = k - 1; moved = true; } }
    });
    // ㅟ ㅝ ㅞ 의 ㅜ 다리가 받침 윗가로에 붙은 글꼴 = 받침 윗가로 위 받침 몫(ㅜ 가로 아랫줄·다리) 중 ㅜ 에 이어진 것은 ㅜ 몫(본부 10-12 획순 칠 「쉼」「윔」「뮘」 — ㅜ 다리가 ㅁ 몫이라 ㅁ 획 자료가 위로 늘어남)
    { const vk = out.findIndex((v, j) => v.role === "jung" && v.jamo === "ㅜ" && out[j + 1]?.role === "jung"), jk = out.findIndex(v => v.role === "jong");
      if (vk >= 0 && jk >= 0 && /^[ㄱㄷㄹㅁㅋㅌㅍ]$/.test(out[jk].jamo) && out[jk + 1]?.role !== "jong") {
        const rowsJ = new Map(); for (let q = 0; q < N * N; q++) if (own[q] === jk) { const y = (q / N) | 0; rowsJ.set(y, (rowsJ.get(y) || 0) + 1); }
        const wMax = Math.max(0, ...rowsJ.values()), yTop = [...rowsJ.keys()].sort((a2, b2) => a2 - b2).find(y => rowsJ.get(y) >= 0.8 * wMax); /* 받침 윗가로 = 받침 몫이 넓이 80%↑ 인 첫 줄 */
        if (yTop != null) { const seen = new Uint8Array(N * N), st = []; for (let q = 0; q < yTop * N; q++) { if (own[q] !== jk) continue; const x = q % N; if ([x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N].some(j => j >= 0 && own[j] === vk)) { seen[q] = 1; st.push(q); } }
          const cc = []; while (st.length) { const q = st.pop(), x = q % N; cc.push(q); for (const j of [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, q - N, q + N]) if (j >= 0 && j < yTop * N && !seen[j] && own[j] === jk) { seen[j] = 1; st.push(j); } }
          const ys = cc.map(q => (q / N) | 0); if (cc.length >= 60 && Math.max(...ys) - Math.min(...ys) >= 6) { for (const q of cc) own[q] = vk; moved = true; } } } } /* 다리 모양(6줄↑ · 60칸↑)일 때만 — 받침 윗줄 한 줄·낱 점은 그대로 */
    // ㅜ ㅠ 기둥 끝이 받침 ㅂ(ㅄ) 오른기둥 안으로 들어간 것 = ㅂ 몫(본부 10-12 대체 표 Q4 「퓞」「쉾」 — ㅜ 색이 ㅂ 오른기둥 안 약 11칸)
    { const vk = out.findIndex(v => v.role === "jung" && /[ㅜㅠ]/.test(v.jamo)), jk = out.findIndex(v => v.role === "jong");
      if (vk >= 0 && jk >= 0 && out[jk].jamo === "ㅂ" && out[jk + 1]?.role === "jong") { let ya = N, xa = N, xb = -1; for (let q = 0; q < N * N; q++) if (own[q] === jk) { const x = q % N, y = (q / N) | 0; if (y < ya) ya = y; if (x < xa) xa = x; if (x > xb) xb = x; }
        if (ya < N) for (let q = (ya + 1) * N; q < N * N; q++) { const x = q % N; if (own[q] === vk && x >= xa && x <= xb + 2) { own[q] = jk; moved = true; } } } }
    // ㅇ ㅎ + ㅓㅔㅕㅖ 고리–가로 맞닿은 곳(글자부 10-12 묶음 A · 검사부 s6 판정) = 고리 바깥 곡선(타원 맞춤) 안만 고리 몫 · 곡선 밖은 가로획 몫
    //  타원 = 가로에 안 닿은 바깥 테두리 점(왼끝·오른끝·위·아래)으로 맞춘 축 나란한 타원 · 고리에서 이어진 잉크 줄만 · 어깨(가로와 안 이어진 줄)는 위·아래가 가로 몫일 때만
    { const sj = split(ch); const o = out.findIndex(v => v.role === "cho" && v.ring?.size && v.hole != null);
      if (sj && /[ㅇㅎ]/.test(sj.cho) && /[ㅓㅔㅕㅖ]/.test(sj.jung) && o >= 0 && hl[out[o].hole] >= 0) {
        const hb = hbox[hl[out[o].hole]], hid = hl[out[o].hole], [hx0, hy0, hx1, hy1] = hb, cyh = (hy0 + hy1) >> 1;
        let T = 0; for (let x = hx0 - 1; x >= 0 && own[cyh * N + x] === o; x--) T++;
        const ry0 = Math.max(0, hy0 - T - 3), ry1 = Math.min(N - 1, hy1 + T + 3), pts = [], runs = new Map();
        const holeRow = y => { let a2 = -1, b2 = -1; for (let x = hx0; x <= hx1; x++) if (hl[y * N + x] === hid) { if (a2 < 0) a2 = x; b2 = x; } return a2 < 0 ? null : [a2, b2]; };
        for (let y = ry0; y <= ry1; y++) { let xl = -1, xr = -1; for (let x = 0; x < Math.min(N, hx1 + T + 8); x++) if (own[y * N + x] === o) { if (xl < 0) xl = x; xr = x; } if (xl < 0) continue;
          if (xl > 0 && !on(y * N + xl - 1)) pts.push([xl, y + 0.5]);
          const hr = holeRow(y); let x; if (hr) x = hr[1] + 1; else { x = -1; for (let xx = xl; xx <= Math.min(xr, hx1 + T + 4); xx++) if (own[y * N + xx] === o) x = xx; if (x < 0) continue; while (x > 0 && on(y * N + x - 1)) x--; }
          if (!on(y * N + x)) continue; const st = x; while (x < N - 1 && on(y * N + x + 1)) x++; runs.set(y, [st, x]);
          if (own[y * N + x] === o && !on(y * N + x + 1)) pts.push([x + 1, y + 0.5]); }
        for (let x = hx0; x <= hx1; x++) { let t = hy0 - 1; while (t >= ry0 && own[t * N + x] === o) t--; if (t < hy0 - 1 && t >= 0 && !on(t * N + x)) pts.push([x + 0.5, t + 1]);
          let b = hy1 + 1; while (b <= ry1 && own[b * N + x] === o) b++; if (b > hy1 + 1 && b < N && !on(b * N + x)) pts.push([x + 0.5, b]); }
        // 최소제곱 a x² + c y² + d x + e y = 1
        const M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], R = [0, 0, 0, 0]; for (const [x, y] of pts) { const f = [x * x, y * y, x, y]; for (let i = 0; i < 4; i++) { R[i] += f[i]; for (let j = 0; j < 4; j++) M[i][j] += f[i] * f[j]; } }
        let sol = null; if (pts.length >= 20) { const A2 = M.map((row, i) => [...row, R[i]]); let okS = true; for (let i = 0; i < 4 && okS; i++) { let p = i; for (let j = i + 1; j < 4; j++) if (Math.abs(A2[j][i]) > Math.abs(A2[p][i])) p = j; if (Math.abs(A2[p][i]) < 1e-12) { okS = false; break; } [A2[i], A2[p]] = [A2[p], A2[i]]; for (let j = 0; j < 4; j++) if (j !== i) { const f = A2[j][i] / A2[i][i]; for (let c = i; c < 5; c++) A2[j][c] -= f * A2[i][c]; } } if (okS) sol = A2.map((row, i) => row[4] / row[i]); }
        const xrAt = y => { const [a2, c2, d2_, e2] = sol, kk = c2 * y * y + e2 * y - 1, disc = d2_ * d2_ - 4 * a2 * kk; return disc < 0 ? null : (-d2_ + Math.sign(a2) * Math.sqrt(disc)) / (2 * a2); }; /* 큰 쪽 근 = 오른쪽 */
        let fitOk = !!sol && sol[0] * sol[1] > 0; if (fitOk) { let s = 0, n = 0; for (const [x, y] of pts) if (x > hx1) { const b = xrAt(y); if (b == null) continue; s += Math.abs(x - b); n++; } fitOk = n >= 6 && s / n <= 1; }
        if (fitOk) { const jIdx = q => { const v = own[q]; return v >= 0 && out[v].role === "jung" ? v : -1; };
          const zone = new Set(); for (const [y, [st, en]] of runs) { let r0 = false, rj = false; for (let x = st; x <= en; x++) { const v = own[y * N + x]; if (v === o) r0 = true; else if (v >= 0) rj = true; } if (r0 && rj) zone.add(y); }
          const cleanR = new Map(); for (const [y, [st, en]] of runs) if (!zone.has(y) && own[y * N + en] === o) cleanR.set(y, en + 1); /* 가로에 안 닿은 줄의 고리 오른끝(경계) */
          const capC = y => { let u = null, d = null; for (let t = 1; t <= 12 && (u == null || d == null); t++) { if (u == null && cleanR.has(y - t)) u = cleanR.get(y - t); if (d == null && cleanR.has(y + t)) d = cleanR.get(y + t); } return u == null || d == null ? Infinity : Math.max(u, d); }; /* 가로 줄 고리 = 위·아래 맨 가까운 고리 끝 중 큰 쪽 넘지 않음(곡선 꼭짓점 볼록 안 만듦 · 「얺」) */
          for (const [y, [st, en]] of runs) { if (!zone.has(y)) continue; const b = xrAt(y + 0.5); if (b == null) continue; let jr = -1; for (let x = en; x >= st; x--) if (jIdx(y * N + x) >= 0) { jr = jIdx(y * N + x); break; } if (jr < 0) continue;
            for (let x = st; x <= en; x++) { const q = y * N + x, v = own[q]; if (x + 1 < b && x + 1 <= capC(y)) { if (v >= 0 && out[v].role === "jung") { own[q] = o; moved = true; } } else if (x + 0.5 >= b && v === o) { own[q] = jr; moved = true; } } /* 가로 → 고리 = 픽셀 가운데가 곡선 안 0.5칸↑일 때만(곡선 꼭짓점 1칸 볼록 안 만듦 · 「억」) */ }
          for (const [y, [st, en]] of runs) { if (!zone.has(y)) continue; const b = xrAt(y + 0.5); if (b == null) continue; /* 오목 홈 메움 = 같은 열 위·아래 4줄 안에 고리가 있고 곡선 밖이 아닌 가로 몫은 고리(「에」 ㅇ 오른끝 열 가운데 4줄 파랑) */
            for (let x = st; x <= en && x + 0.5 < b; x++) { const q = y * N + x; if (own[q] < 0 || out[own[q]].role !== "jung") continue; let up = false, dn = false; for (let t = 1; t <= 4; t++) { if (own[q - t * N] === o) up = true; if (own[q + t * N] === o) dn = true; } if (up && dn) { own[q] = o; moved = true; } } }
          // 어깨 = 가로와 안 이어진 줄의 곡선 밖 고리 픽셀 중 위·아래가 가로 몫인 것(가로에서 바깥쪽으로 3줄까지)
          for (let pass = 0; pass < 3; pass++) for (const [y, [st, en]] of runs) { if (zone.has(y)) continue; const b = xrAt(y + 0.5); if (b == null) continue;
            for (let x = Math.max(st, Math.ceil(b - 0.5)); x <= en; x++) { const q = y * N + x; if (own[q] !== o || x + 0.5 < b) continue; const jv = jIdx(q - N) >= 0 ? jIdx(q - N) : jIdx(q + N); if (jv >= 0) { own[q] = jv; moved = true; } } } } } }
    // ㅜ ㅠ 띠에 닿는 곳 곧게(글자부 10-12) — ① 다리 끝이 받침 획에 내려앉은 곳(「웂」「뜂」「뮚」 다리 밑동 톱니 · 「꾻」「쿬」「훇」 다리 끝을 받침이 먹음)
    //  다리를 따라 내려가다 잉크 줄이 다리보다 2칸↑ 넓어지는 줄(닿는 줄)부터, 다리 너비를 다 못 덮게 되는 줄(받는 획만 남은 줄) 앞까지 = 닿는 곳
    //  닿는 곳 = 받는 획 너비(그 아래 줄) 안은 받침 몫 · 밖으로 나온 다리(3칸↑)는 모음 몫 · 닿는 곳이 다리 너비 60% 넘게 길면(「휺」 ㅎ 꼭지와 나란히) 안 함
    //  ② 초성 세로획 아래끝이 띠 윗변에 붙은 곳(「퀫」「퀭」 — ㅜ 가로 윗가장자리 오른쪽이 ㅋ 색) = 세로획보다 넓어지는 줄부터 띠까지 모음 몫
    { const runsAt = (y, a, b) => { let ra = N, rb = -1; for (let x = Math.max(0, a); x <= Math.min(N - 1, b); x++) if (on(y * N + x)) { let l = x, r3 = x; while (l > 0 && on(y * N + l - 1)) l--; while (r3 < N - 1 && on(y * N + r3 + 1)) r3++; if (l < ra) ra = l; if (r3 > rb) rb = r3; x = r3; } return rb < 0 ? null : [ra, rb]; };
      out.forEach((v, vk) => { if (v.role !== "jung" || !/[ㅜㅠ]/.test(v.jamo)) return;
        const cR = new Map(); for (let q = 0; q < N * N; q++) if (own[q] === vk) { const y = (q / N) | 0; cR.set(y, (cR.get(y) || 0) + 1); }
        const wM = Math.max(0, ...cR.values()); if (wM < 0.3 * W) return; const bTop = [...cR.keys()].sort((a2, b2) => a2 - b2).find(y => cR.get(y) >= 0.6 * wM); let bBot = bTop; while ((cR.get(bBot + 1) || 0) >= 0.6 * wM) bBot++;
        // ① 다리
        let yl = -1, legs = []; for (let y = bBot + 1; y <= Math.min(y1, bBot + 12) && yl < 0; y++) { const rs = []; for (let x = x0; x <= x1; x++) if (own[y * N + x] === vk) { if (rs.length && rs.at(-1)[1] === x - 1) rs.at(-1)[1] = x; else rs.push([x, x]); } if (rs.length && rs.every(r2 => r2[1] - r2[0] + 1 <= 0.35 * wM)) { yl = y; legs = rs.filter(r2 => r2[1] - r2[0] >= 2); } }
        for (const g of legs) { let r0 = runsAt(yl, g[0], g[1]); if (!r0) continue; let [ll, lr] = r0, yj = -1;
          for (let y = yl + 1; y <= y1; y++) { const r2 = runsAt(y, ll - 1, lr + 1); if (!r2) break; if (r2[0] < ll - 1 || r2[1] > lr + 1) { yj = y; break; } if (r2[1] - r2[0] + 1 >= 0.8 * (r0[1] - r0[0] + 1)) [ll, lr] = r2; } /* 다리 끝 모서리가 좁아지는 줄은 다리 너비를 줄이지 않음(「쮮」 — 좁아진 너비로 재 받침 기둥 머리에 다리 색 4칸) */
          if (yj < 0) continue; const lw = lr - ll + 1; let yr = -1, sp = null;
          for (let y = yj; y <= Math.min(y1 + 1, yj + lw); y++) { const r2 = y <= y1 ? runsAt(y, ll, lr) : null; if (!r2) { yr = y; sp = runsAt(y - 1, ll, lr); /* 다리 칸 아래가 빔 = 받침 가로 위에 앉음 · 다만 닿는 줄 옆 받침 기둥이 아래로 이어지면(「눤」 — 다리 끝이 ㄴ 기둥 머리 옆) 그 기둥만 받는 획 */ if (sp && y <= y1) { let pl = N, pr = -1; for (let x = sp[0]; x <= sp[1]; x++) if (on(y * N + x)) { let l = x, r3 = x; while (r3 + 1 <= sp[1] && on(y * N + r3 + 1)) r3++; if (r3 >= ll - 2 && l <= lr + 2 || Math.min(Math.abs(r3 - ll), Math.abs(l - lr)) <= 2) { if (l < pl) pl = l; if (r3 > pr) pr = r3; } x = r3; } if (pr >= 0) sp = [pl, pr]; } break; } if (r2[1] < lr - 1 || r2[0] > ll + 1) { yr = y; sp = r2; break; } }
          if (yr < 0 || !sp || yr - yj > 0.6 * lw) { /* 닿는 곳이 길면(받침 꼭지와 나란히 · 「휺」) = 다리 옆 받침 몫 1~2칸 실선만 모음 몫 */
            for (let y = yj; y <= y1; y++) { let any = false; for (let x = ll; x <= lr; x++) if (own[y * N + x] === vk) { any = true; break; } if (!any) break;
              for (const [x, d] of [[ll - 1, -1], [lr + 1, 1]]) { const w = []; let xx = x; while (own[y * N + xx] === vk && Math.abs(xx - x) < 3) xx += d; for (let t = 0; t < 3 && on(y * N + xx); t++, xx += d) w.push(y * N + xx); if (w.length && w.length <= 2 && w.every(q => own[q] >= 0 && out[own[q]].role === "jong")) { for (const q of w) own[q] = vk; moved = true; } } }
            continue; }
          const cnt = new Map(), ys = Math.min(yr, y1); for (let x = sp[0]; x <= sp[1]; x++) { const o = own[ys * N + x]; if (o >= 0 && o !== vk && out[o].role === "jong") cnt.set(o, (cnt.get(o) || 0) + 1); } if (!cnt.size) continue; const jk = [...cnt].sort((p2, r2) => r2[1] - p2[1])[0][0];
          const jr0 = runsAt(yj, ll, lr), top = out[jk].jamo === "ㅁ" || (jr0 && (jr0[0] < Math.min(ll, sp[0]) - 2 || jr0[1] > Math.max(lr, sp[1]) + 2)); /* 닿는 줄 받침 획이 다리·받는 획 밖으로 더 뻗음 = 다리 밑을 가로지르는 가로획(「췲」 ㄹ 윗가로 — 가운데를 모음 몫으로 하면 왼쪽 토막이 떨어져 나감) */ /* ㅁ 윗가로에 내려앉은 다리 = 닿는 줄 전부 ㅁ 몫(「뀳」 — 윗가로 두께만큼만 닿아 아래 줄로는 가로 끝을 못 잼) */ for (let y = yj; y < Math.max(yr, yj + 1); y++) { let outN = 0; for (let x = ll; x <= lr; x++) if ((x < sp[0] || x > sp[1]) && on(y * N + x)) outN++;
            for (let x = Math.min(ll, sp[0]); x <= Math.max(lr, sp[1]); x++) { const q = y * N + x, o = own[q]; if (!on(q) || (o !== vk && o !== jk)) continue; const to = (x >= sp[0] && x <= sp[1]) || top ? jk : x >= ll && x <= lr ? (outN >= 3 ? vk : jk) : o; if (to !== o) { own[q] = to; moved = true; } } } }
        // ② 초성 세로획
        out.forEach((c, ck) => { if (c.role !== "cho") return; const yv = bTop - 8; if (yv < y0) return;
          const seen = new Set(); for (let x = x0; x <= x1; x++) { const q = yv * N + x; if (own[q] !== ck || seen.has(x)) continue; const r0 = runsAt(yv, x, x); for (let t = r0[0]; t <= r0[1]; t++) seen.add(t); if (r0[1] - r0[0] + 1 > 0.3 * wM) continue;
            let [a, b] = r0, yj = -1, ok = false; for (let y = yv + 1; y < bTop; y++) { const r2 = runsAt(y, a - 1, b + 1); if (!r2) break; if (yj < 0 && (r2[0] < a - 1 || r2[1] > b + 1)) yj = y; if (yj < 0) [a, b] = r2; if (y === bTop - 1) ok = true; }
            if (yj < 0 || !ok || bTop - yj > 6) continue; let touch = 0; { const r2 = runsAt(bTop - 1, a - 1, b + 1); for (let x2 = r2[0]; x2 <= r2[1]; x2++) if (own[bTop * N + x2] === vk) touch++; } if (touch < 3) continue;
            const take = []; for (let y = yj; y < bTop; y++) { const r2 = runsAt(y, a - 1, b + 1); for (let x2 = r2[0]; x2 <= r2[1]; x2++) if (own[y * N + x2] === ck) take.push(y * N + x2); }
            for (const q of take) own[q] = vk; if (take.length) moved = true;
            for (let it = 0; it < 4; it++) { let ch2 = false; for (let y = yj - 4; y < yj; y++) for (let x2 = x0; x2 <= x1; x2++) { const q = y * N + x2; if (own[q] !== ck || (x2 >= a - 1 && x2 <= b + 1)) continue; if (own[q + N] === vk || own[q - 1] === vk || own[q + 1] === vk) { own[q] = vk; ch2 = true; moved = true; } } if (!ch2) break; } } }); }); }
    if (moved) { const keep = out.map(u => u.px);
      // 빈 칸 = 제 칸 자리 잉크를 가장 많이 가진 다른 자음에게서 제 칸 가운데에 더 가까운 픽셀을 받음(「흓」 — ㅡ 가 띠를 찾아가 빈 ㄱ 이 옛 픽셀로 돌아가 ㅡ 와 겹치던 것 · ㄳ 통째가 ㅅ 몫)
      const rel = q => [((q % N) - x0 + 0.5) / W, (((q / N) | 0) - y0 + 0.5) / Hh], ctr = r => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], d2 = (a2, b2) => (a2[0] - b2[0]) ** 2 + (a2[1] - b2[1]) ** 2;
      out.forEach((u, k) => { if (own.some(o => o === k)) return; const r = u.rect, cnt = new Map(); for (let q = 0; q < N * N; q++) { const o = own[q]; if (o < 0 || out[o].role === "jung") continue; const p2 = rel(q); if (p2[0] >= r[0] && p2[0] <= r[2] && p2[1] >= r[1] && p2[1] <= r[3]) cnt.set(o, (cnt.get(o) || 0) + 1); }
        if (!cnt.size) return; const o = [...cnt].sort((a2, b2) => b2[1] - a2[1])[0][0], ck = ctr(r), co = ctr(out[o].rect); let n = 0; for (let q = 0; q < N * N; q++) if (own[q] === o && d2(rel(q), ck) < d2(rel(q), co)) { own[q] = k; n++; } });
      out.forEach(u => (u.px = [])); for (let i = 0; i < N * N; i++) if (own[i] >= 0) out[own[i]].px.push(i); out.forEach((u, k) => { if (!u.px.length) u.px = keep[k]; }); }
  }
  return true;
}

// 1010.96 획 모양 다듬기 그대로(위 OLD96 글자만 · 고치지 말 것)
function shapeFix96(out, mask, N) {
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
