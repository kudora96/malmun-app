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
  for (const px of comps) {
    let sx = 0, sy = 0; for (const q of px) { sx += q % N; sy += (q / N) | 0; }
    const c = rel(sx / px.length, sy / px.length), k = pick(c);
    // 다른 칸에만 든(제 칸과 안 겹치는) 픽셀이 25% 넘으면 = 글꼴이 이어 그린 덩어리 → 픽셀마다 나눔 · 칸 경계에 살짝 걸친 「이」의 ㅇ 같은 건 통째로
    const spans = [k, ...fr.map((f, j) => j).filter(j => { if (j === k) return false; let n = 0; for (const q of px) { const p = rel(q % N, (q / N) | 0); if (inR(fr[j].rect, p) && !inR(fr[k].rect, p)) n++; } return n > px.length * 0.25; })];
    if (spans.length > 1) for (const q of px) { const p = rel(q % N, (q / N) | 0); let b = spans[0], bd = Infinity; for (const j of spans) { const d = inR(fr[j].rect, p) ? 0 : d2(p, ctr(fr[j].rect)); if (d < bd) { bd = d; b = j; } } out[b].px.push(q); }
    else out[k].px.push(...px);
  }
  for (const u of out) { // 잉크 상자(0~1 · 캔버스 기준) · 잉크 없으면 틀 칸
    if (!u.px.length) { u.box = [x0 / N + u.rect[0] * W / N, y0 / N + u.rect[1] * Hh / N, x0 / N + u.rect[2] * W / N, y0 / N + u.rect[3] * Hh / N]; continue; }
    let a = N, b = N, c = -1, d = -1; for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
    u.box = [a / N, b / N, (c + 1) / N, (d + 1) / N];
  }
  return out;
}
