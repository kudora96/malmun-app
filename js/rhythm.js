// 리듬 점수(투덜이 10-06 직접 허락 — 「있」을 더듬어 시간이 안 맞는데 100점이면 믿음이 깨짐)
//  · 음절 칸 = 비교 화면과 같은 것: 본보기 = data/{ep}/{ep}.align.json · 내 목소리 = 20ms 칸 특징 DTW 로 본보기 경계를 옮김
//  · 리듬 R(0~1) = Σ p_i · (min + 0.04초)/(max + 0.04초)  (p·q = 음절 길이 / 말 전체 → 본보기 시간으로 · 전체 빠르기 차이는 비율이라 상관없음 · 20ms 칸 오차 너그럽게)
//      − 0.08 × (내 말 안의 0.25초 넘는 조용한 틈인데 본보기 그 음절엔 0.1초 넘는 틈이 없는 것)
//      − 0.05 (말 전체 길이가 본보기의 0.6배 아래 · 1.8배 위)
//  · 끝 늘임(투덜이 10-07 직접 허락 — 본보기가 끝을 길게 끌면 100 을 못 넘음): 구 끝 음절 = 마지막 음절 · 문장부호(, . ? !) 바로 앞 · 본보기에서 뒤에 0.15초 넘는 쉼이 오는 음절 —
//      무게 절반 + 길이 = 그 음절 시작 ~ 그 음절 소리가 자기 최대에서 15dB 내려간 곳(본보기·내 것 둘 다) — 끄는 여운은 리듬으로 치지 않음
//  · 더듬음은 놓치지 않게(투덜이 10-07 직접 허락 「더듬는 소리 잡아내는 게 정말 중요」):
//      구 끝이라도 내 길이가 본보기의 2배 넘거나 0.25초 넘게 길면(「나———」 끌기) 완화 없이 무게 1 · 본보기에 없는 0.25초+ 쉼은 그대로 −0.08
//      같은 음절 되풀이(「이…있어요」「거구구나」 — 들은 말에 더 들어간 음절이 옆 음절과 같거나 첫소리+모음이 같음)도 −0.08(「더듬음」)
//  · 최종 점수 = 글자 점수(score.js) × f(R): R ≥ 0.85 → 1 · 0.5 ≤ R < 0.85 → 0.90 + 0.10 × (R − 0.5)/0.35 · R < 0.5 → 0.88
//  녹음·재생은 그대로 — 받은 녹음(blob)을 풀어 재기만
import { audioCtx } from "./wake.js?v=1007.51";
import { leadOf, voicedEnd, keepFirstOf } from "./playmine.js?v=1007.51";
import { speechEnd } from "./recstore.js?v=1007.51";
import * as sfx from "./sfx.js?v=1007.51";
import { align } from "./score.js?v=1007.51";

export const FR = 0.02; // 특징 칸 20ms
const alignCache = new Map();
export const loadAlign = ep => { if (!alignCache.has(ep)) alignCache.set(ep, fetch(`data/${ep}/${ep}.align.json?v=${document.documentElement.dataset.v || ""}`).then(r => (r.ok ? r.json() : null)).catch(() => null)); return alignCache.get(ep); };
export const isSyl = ch => /[\p{L}\p{N}]/u.test(ch);

// 20ms 칸 특징 = MFCC 13개(말소리 맞춤의 표준 — 다른 사람 목소리끼리도 같은 음절을 잘 맞춤) · 말마다 평균 빼고 분산 1(CMVN)
//  16kHz 근처로 솎음 → 25ms 창(해밍) → FFT 512 → 멜 필터 26개 → 로그 → DCT 13
const NMEL = 26, NCEP = 13, NFFT = 512;
function fft(re, im) { // 제자리 · 길이 2의 거듭제곱
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
const melBank = new Map();
function bankFor(fs) {
  const key = Math.round(fs); if (melBank.has(key)) return melBank.get(key);
  const mel = f => 2595 * Math.log10(1 + f / 700), inv = m => 700 * (10 ** (m / 2595) - 1), lo = mel(80), hi = mel(Math.min(7600, fs / 2));
  const pts = Array.from({ length: NMEL + 2 }, (_, k) => Math.floor(((NFFT + 1) * inv(lo + ((hi - lo) * k) / (NMEL + 1))) / fs));
  const bank = Array.from({ length: NMEL }, (_, m) => { const w = new Float32Array(NFFT / 2 + 1); for (let k = pts[m]; k < pts[m + 1]; k++) w[k] = (k - pts[m]) / Math.max(1, pts[m + 1] - pts[m]); for (let k = pts[m + 1]; k < pts[m + 2]; k++) w[k] = (pts[m + 2] - k) / Math.max(1, pts[m + 2] - pts[m + 1]); return w; });
  melBank.set(key, bank); return bank;
}
export function feats(d, sr, t0, t1) {
  const step = Math.max(1, Math.round(sr / 16000)), fs = sr / step, hop = Math.round(fs * FR), wl = Math.min(NFFT, Math.round(fs * 0.025));
  const a = Math.max(0, Math.round(t0 * sr)), b = Math.min(d.length, Math.round(t1 * sr)), x = [];
  for (let i = a; i < b; i += step) x.push(d[i]);
  for (let i = x.length - 1; i > 0; i--) x[i] -= 0.97 * x[i - 1]; // 앞 강조
  const bank = bankFor(fs), ham = Float32Array.from({ length: wl }, (_, k) => 0.54 - 0.46 * Math.cos((2 * Math.PI * k) / (wl - 1))), F = [];
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT), mel = new Float32Array(NMEL);
  for (let i = 0; i + hop <= x.length; i += hop) {
    re.fill(0); im.fill(0); for (let k = 0; k < wl && i + k < x.length; k++) re[k] = x[i + k] * ham[k];
    fft(re, im);
    for (let m = 0; m < NMEL; m++) { let e = 0; const w = bank[m]; for (let k = 0; k <= NFFT / 2; k++) if (w[k]) e += w[k] * (re[k] * re[k] + im[k] * im[k]); mel[m] = Math.log(e + 1e-10); }
    const c = []; for (let q = 0; q < NCEP; q++) { let s = 0; for (let m = 0; m < NMEL; m++) s += mel[m] * Math.cos((Math.PI * q * (m + 0.5)) / NMEL); c.push(s); }
    F.push(c);
  }
  for (let j = 0; j < NCEP; j++) {
    const m = F.reduce((s, f) => s + f[j], 0) / Math.max(1, F.length), sd = Math.sqrt(F.reduce((s, f) => s + (f[j] - m) ** 2, 0) / Math.max(1, F.length)) || 1;
    F.forEach(f => { f[j] = (f[j] - m) / sd; });
  }
  return F;
}
// DTW → 본보기 칸 k 에 맞는 내 칸(처음 맞은 것)
const STEP = 0.4; // DTW 옆·아래 걸음 벌점(특징 거리 단위)
export function dtwMap(A, B) {
  const n = A.length, m = B.length; if (!n || !m) return A.map(() => 0);
  const D = new Float32Array((n + 1) * (m + 1)).fill(Infinity), at = (i, j) => i * (m + 1) + j;
  D[0] = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const a = A[i - 1], b = B[j - 1]; let c = 0; for (let q = 0; q < a.length; q++) c += (a[q] - b[q]) ** 2;
    const cc = Math.sqrt(c); D[at(i, j)] = cc + Math.min(D[at(i - 1, j - 1)], D[at(i - 1, j)] + STEP, D[at(i, j - 1)] + STEP); // 옆·아래 걸음에 벌점 — 한 칸에 여러 음절이 몰리는(0.02초 음절) 비뚤어진 맞춤을 막음
  }
  const map = new Array(n).fill(-1); let i = n, j = m;
  while (i > 0 && j > 0) {
    map[i - 1] = j - 1;
    const d = D[at(i - 1, j - 1)], u = D[at(i - 1, j)] + STEP, l = D[at(i, j - 1)] + STEP;
    if (d <= u && d <= l) { i--; j--; } else if (u <= l) i--; else j--;
  }
  for (let k = 0; k < n; k++) if (map[k] < 0) map[k] = k ? map[k - 1] : 0;
  return map;
}

// 음절 최소 길이(본부 10-07 — DTW 가 「도」 칸을 0 폭 가까이 찌그러뜨리고 옆 칸이 넓어짐 → 리듬도 틀어짐)
//   칸마다 최소 = max(본보기 그 음절 길이의 25%, 40ms) · 모자란 칸은 최소로 늘리고 나머지 칸을 (최소를 넘는 만큼에 비례해) 줄임 · 첫 시작·끝 끝은 그대로
function minLen(ys, ms) {
  const n = ys.length; if (n < 2) return ys;
  const T = ys[n - 1].e - ys[0].s, mins = ms.map(x => Math.max(0.25 * (x.e - x.s), 0.04));
  const sumMin = mins.reduce((a, b) => a + b, 0); if (!(T > sumMin)) return ys;
  let d = ys.map(x => Math.max(0, x.e - x.s));
  for (let it = 0; it < 6; it++) {
    const short = d.map((v, k) => v < mins[k] - 1e-6); if (!short.some(Boolean)) break;
    const need = d.reduce((a, v, k) => a + (short[k] ? mins[k] - v : 0), 0), spare = d.reduce((a, v, k) => a + (short[k] ? 0 : v - mins[k]), 0);
    if (!(spare > 0)) break;
    d = d.map((v, k) => (short[k] ? mins[k] : v - ((v - mins[k]) * need) / spare));
  }
  const out = []; let t = ys[0].s;
  for (let k = 0; k < n; k++) { out.push({ ch: ys[k].ch, s: t, e: t + d[k] }); t += d[k]; }
  out[n - 1].e = ys[n - 1].e;
  return out;
}

// 본보기·내 녹음 → 음절 칸 둘(비교 화면과 리듬 점수가 같은 칸을 씀)
export function prepare({ al, key, text, mbuf, ybuf }) {
  const W = [...String(text)].filter(isSyl);
  let msyl = al?.items?.[key]?.syl;
  const mLead0 = msyl?.length ? msyl[0].s : leadOf(mbuf, 0), mEnd = msyl?.length ? msyl[msyl.length - 1].e : speechEnd(mbuf, 0);
  const aligned = !!(msyl?.length && msyl.length === W.length);
  if (!aligned) msyl = W.map((ch, k) => ({ ch, s: mLead0 + ((mEnd - mLead0) * k) / W.length, e: mLead0 + ((mEnd - mLead0) * (k + 1)) / W.length }));
  const mLead = Math.max(0, mLead0 - 0.08), mStop = Math.min(mbuf.duration, mEnd + 0.15);
  // 첫 낱말 뒤 쉼(본보기에 0.2초 넘는 조용한 틈 · 또는 글에 부호) = 내 첫 낱말을 앞 잡음으로 버리지 않음(10-07 「아, 저 혼자 알면」 본보기끼리도 「아」가 빠지던 것)
  const w1 = [...String(text).trim().split(/\s+/)[0]].filter(isSyl).length;
  const keepFirst = keepFirstOf(text) || (w1 > 0 && w1 < msyl.length && quietRuns(mbuf, msyl[w1 - 1].e - 0.05, msyl[w1].s + 0.05).some(x => x.e - x.s > 0.2));
  const ref = Math.max(0, mEnd - mLead0), yLead = leadOf(ybuf, 0.08, ref, keepFirst), yStop = Math.max(yLead + 0.1, voicedEnd(ybuf, 0.12, ref));
  const A = feats(mbuf.getChannelData(0), mbuf.sampleRate, mLead, mStop), B = feats(ybuf.getChannelData(0), ybuf.sampleRate, yLead, yStop), map = dtwMap(A, B);
  const toY = s => { const k = Math.max(0, Math.min(A.length - 1, Math.round((s - mLead) / FR))); return yLead + (map[k] ?? 0) * FR; };
  const ysyl0 = msyl.map((x, k) => ({ ch: x.ch, s: toY(x.s), e: k < msyl.length - 1 ? toY(msyl[k + 1].s) : Math.min(yStop, toY(x.e) + 0.02) }));
  const ysyl = minLen(ysyl0, msyl);
  // 끝 늘임 음절 = 마지막 + 문장부호 바로 앞(본부 10-07)
  const ends = new Set([W.length - 1]); { let k = -1; for (const ch of String(text)) { if (isSyl(ch)) k++; else if (k >= 0 && /[,.?!…~，。？！]/.test(ch)) ends.add(k); } }
  return { W, msyl, ysyl, ends, keepFirst, aligned, mLead, mStop, mEnd, mLead0, ref, yLead, yStop };
}

// 조용한 틈(20ms 칸 · 그 소리 최대에서 30dB 아래) — [t0, t1] 안에서 이어진 구간들 [{ s, e }]
function quietRuns(buf, t0, t1) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, w = Math.max(1, Math.round(sr * FR)), a = Math.max(0, Math.round(t0 * sr)), b = Math.min(d.length, Math.round(t1 * sr)), r = [];
  let pk = 0; for (let i = a; i + w <= b; i += w) { let s = 0; for (let k = i; k < i + w; k++) s += d[k] * d[k]; const v = Math.sqrt(s / w); r.push(v); if (v > pk) pk = v; }
  const q = pk * Math.pow(10, -30 / 20), out = []; let st = -1;
  for (let k = 0; k <= r.length; k++) { const quiet = k < r.length && r[k] < q; if (quiet && st < 0) st = k; if (!quiet && st >= 0) { out.push({ s: t0 + st * FR, e: t0 + k * FR }); st = -1; } }
  return out;
}

// → { R, letterKeep, worst: { k, ch, kind: "long"|"short"|"pause"|"speed" } | null, p, q }
const TOL = 0.06; // 본부 10-07 0.04 → 0.06
const END_W = 0.5, END_DB = 15;
// 그 음절 시작 ~ 소리가 자기 최대에서 15dB 내려간 첫 곳(최대 뒤) — 끄는 여운 빼고
function tailCut(buf, s, e) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, w = Math.max(1, Math.round(sr * FR)), a = Math.max(0, Math.round(s * sr)), b = Math.min(d.length, Math.round(e * sr)), r = [];
  for (let i = a; i + w <= b; i += w) { let q = 0; for (let k = i; k < i + w; k++) q += d[k] * d[k]; r.push(Math.sqrt(q / w)); }
  if (!r.length) return e;
  let pk = 0, pi = 0; r.forEach((v, k) => { if (v > pk) { pk = v; pi = k; } });
  const lim = pk * Math.pow(10, -END_DB / 20); for (let k = pi + 1; k < r.length; k++) if (r[k] < lim) return Math.min(e, s + k * FR);
  return e;
}
const cv = ch => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? Math.floor(c / 28) : ch; }; // 첫소리+모음
// 첫 음절 시작 = 그 음절 소리가 자기 최대에서 15dB 안으로 처음 올라온 곳(조금 앞부터 찾음) — 말 시작점 찾기(정렬·leadOf) 차이로 첫 음절이 짧게 잡히던 것(10-07 본보기끼리도 「글」「아」 짧음)
function headCut(buf, s, e) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, w = Math.max(1, Math.round(sr * FR)), s0 = Math.max(0, s - 0.1), a = Math.round(s0 * sr), b = Math.min(d.length, Math.round(e * sr)), r = [];
  for (let i = a; i + w <= b; i += w) { let q = 0; for (let k = i; k < i + w; k++) q += d[k] * d[k]; r.push(Math.sqrt(q / w)); }
  if (!r.length) return s;
  const pk = Math.max(...r), lim = pk * Math.pow(10, -END_DB / 20), i0 = r.findIndex(v => v >= lim);
  return i0 < 0 ? s : s0 + i0 * FR;
}
export function rhythmScore({ msyl, ysyl, mbuf, ybuf, ends, heard }) {
  const n = msyl.length; if (n < 2) return { R: 1, worst: null };
  const P = msyl[n - 1].e - msyl[0].s, Q = ysyl[n - 1].e - ysyl[0].s;
  if (!(P > 0) || !(Q > 0)) return { R: 1, worst: null };
  const p = msyl.map(x => Math.max(0, x.e - x.s) / P), q = ysyl.map(x => Math.max(0, x.e - x.s) / Q);
  const mq = quietRuns(mbuf, msyl[0].s, msyl[n - 1].e), E = new Set(ends || [n - 1]); E.add(n - 1);
  for (let k = 0; k < n - 1; k++) if (mq.some(x => x.e - x.s > 0.15 && (x.s + x.e) / 2 >= msyl[k].s && (x.s + x.e) / 2 <= msyl[k + 1].s + 0.05)) E.add(k); // 본보기 쉼 앞 = 구 끝
  // 음절 길이(실제 소리) — 첫 음절은 소리 시작부터 · 구 끝 음절은 여운 빼고 · 빠르기 맞춤도 이 길이 합으로(본보기 끝 여운이 전체를 늘려 내 다른 음절이 다 「길게」 되던 것 — 10-07)
  const mS0 = headCut(mbuf, msyl[0].s, msyl[0].e), yS0 = headCut(ybuf, ysyl[0].s, ysyl[0].e), st = (k, x, s0) => (k ? x[k].s : s0);
  const A = msyl.map(x => Math.max(0, x.e - x.s)), Bm = ysyl.map(x => Math.max(0, x.e - x.s));
  A[0] = msyl[0].e - mS0; Bm[0] = ysyl[0].e - yS0;
  const tEnd = (x, k, buf) => (k < n - 1 ? Math.max(x[k].e, x[k + 1].s) : Math.min(buf.duration, x[k].e + 0.3)); // 여운 찾기 = 다음 음절 앞까지(정렬 칸 끝이 소리보다 일찍 끝나는 「요.」)
  for (const k of E) { const ms = st(k, msyl, mS0), ys = st(k, ysyl, yS0); A[k] = tailCut(mbuf, ms, tEnd(msyl, k, mbuf)) - ms; Bm[k] = tailCut(ybuf, ys, tEnd(ysyl, k, ybuf)) - ys; }
  const sc = A.reduce((x, y) => x + y, 0) / (Bm.reduce((x, y) => x + y, 0) || 1), B = Bm.map(v => v * sc), wt = A.map(v => v);
  for (const k of E) if (!(B[k] > 2 * A[k] || B[k] - A[k] > 0.25)) wt[k] *= END_W; // 「나———」 끌기는 완화 없음
  const Wsum = wt.reduce((x, y) => x + y, 0) || 1;
  let R = 0, worst = null, worstHit = 0, stumble = false;
  for (let k = 0; k < n; k++) {
    const a = A[k], b = B[k];
    const sim = (Math.min(a, b) + TOL) / (Math.max(a, b) + TOL); // 본보기 시간으로 맞춰 견줌 · 칸 크기(20ms) 오차는 너그럽게(±60ms)
    const w = wt[k] / Wsum; R += w * sim;
    const hit = w * (1 - sim); if (hit > worstHit) { worstHit = hit; worst = { k, ch: msyl[k].ch, kind: b > a ? "long" : "short", a, b }; } // a·b = 견준 길이(초 · 내 것은 본보기 빠르기로 맞춤)
  }
  // 더듬음·쉼 — 내 말 안의 0.25초 넘는 틈인데 본보기 그 음절엔 0.1초 넘는 틈이 없으면 틈마다 −0.08
  for (const g of quietRuns(ybuf, ysyl[0].s, ysyl[n - 1].e)) {
    if (g.e - g.s <= 0.25) continue;
    const mid = (g.s + g.e) / 2; let k = ysyl.findIndex(x => mid < x.e); if (k < 0) k = n - 1; const m = msyl[k];
    const mE = k < n - 1 ? Math.max(m.e, msyl[k + 1].s) : m.e, modelGap = mq.some(x => x.e - x.s > 0.1 && x.s < mE && x.e > m.s); // 본보기 그 음절 + 다음 음절 앞까지(구 끝 쉼은 음절 칸 밖에 있음 — 10-07 「거구나」 본보기끼리도 더듬음으로 잡던 것)
    if (!modelGap) { R -= 0.08; stumble = true; if (0.08 >= worstHit) { worstHit = 0.08; worst = { k, ch: msyl[k].ch, kind: "pause", gap: g.e - g.s }; } }
  }
  if (heard) { // 같은 음절 되풀이 = 더듬음
    const H = [...String(heard).replace(/500/g, "오백")].filter(isSyl); let k = 0, j = 0;
    for (const x of align(msyl.map(y => y.ch).join(""), heard).ops) {
      if (x.t === "i") { const h = H[j], nx = msyl[k], pv = msyl[k - 1], at = nx && (h === nx.ch || cv(h) === cv(nx.ch)) ? k : pv && (h === pv.ch || cv(h) === cv(pv.ch)) ? k - 1 : -1;
        if (at >= 0) { R -= 0.08; stumble = true; if (0.08 >= worstHit) { worstHit = 0.08; worst = { k: at, ch: msyl[at].ch, kind: "stutter" }; } } j++; }
      else { if (x.t !== "d") j++; k++; }
    }
  }
  if (Q / P < 0.6 || Q / P > 1.8) { R -= 0.05; if (!worst) worst = { k: 0, ch: msyl[0].ch, kind: "speed" }; }
  if (stumble) R = Math.min(R, R_FULL - 0.01); // 더듬음·본보기에 없는 쉼이 있으면 100 아님(앱 창 10-07 — −0.08 뒤에도 문턱 위면 깎이지 않던 것)
  return { R: Math.max(0, Math.min(1, R)), worst, p, q, ends: E };
}
export const R_FULL = 0.85; // 본부 10-07(투덜이 직접 허락) 0.90 → 0.85
export const rhythmFactor = R => (R >= R_FULL ? 1 : R >= 0.5 ? 0.9 + (0.1 * (R - 0.5)) / (R_FULL - 0.5) : 0.88);
// 내림(본부 10-06 — 반올림이면 리듬 89%(R 0.894)인데 100점이 나옴) · 100점 = 글자 100 그리고 R ≥ 0.85 일 때만
export const withRhythm = (letter, R) => (letter == null || R == null ? letter : Math.floor(letter * rhythmFactor(R) + 1e-9));

// 점수 낼 때 — 정렬 파일·본보기 소리·내 녹음 → { R, worst } · 못 재면 null(그땐 글자 점수 그대로)
export async function rhythmOf({ ep, key, url, text, blob, heard }) {
  if (window.__noRhythm) return null; // 점검 도구(가짜 마이크 소리)용 — 글자 점수만 보는 점검에서 끔
  try {
    const [al, mbuf, ybuf] = await Promise.all([loadAlign(ep), sfx.load(url), blob.arrayBuffer().then(ab => audioCtx().decodeAudioData(ab))]);
    if (!mbuf || !ybuf) return null;
    const pr = prepare({ al, key, text, mbuf, ybuf });
    if (!pr.aligned) return null; // 본보기 음절 시각이 없으면 리듬은 재지 않음
    return rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf, ybuf, ends: pr.ends, heard });
  } catch { return null; }
}

// 결과 줄 근거 — 「글자 100% · 리듬 78%」 + 리듬이 85% 아래면 가장 많이 깎인 곳 한 곳
export const rhyText = (h, t) => `${t("rhythm_line", { l: h.L, r: Math.floor(h.R * 100 + 1e-9) })}${h.R < R_FULL && h.worst ? " · " + t("rhy_" + h.worst.kind, { s: `「${h.worst.ch}」` }) : ""}`;

// 저장본 점수 판(본부 10-06 — 리듬 넣기 전에 저장한 100점이 남아 새 녹음(96)을 「앞 저장본이 더 높음」으로 밀어냄)
//  scoreV 2 = 글자 × f(R) 내림 · 옛 판 저장본은 열 때 그 저장된 소리로 리듬을 다시 재 새 점수로 바꿔 저장(옛 값은 score0 에 그대로)
//  다시 못 재면(본보기 음절 시각 없음 등) old 표시 — 흐리게 보이고 다음 녹음이 덮을 수 있음
export const SCORE_V = 3; // 3 = 끝 늘임·여유 0.06·문턱 0.85(10-07)
export async function upgradeSaved(rec, o, put) {
  if (!rec?.blob || rec.scoreV === SCORE_V) return rec;
  const rh = await rhythmOf({ ...o, blob: rec.blob });
  if (!rh) return { ...rec, old: true };
  const up = { ...rec, score0: rec.score, letter: rec.score, R: rh.R, score: withRhythm(rec.score, rh.R), scoreV: SCORE_V };
  put?.(up);
  return up;
}
// 「더 높은 점수 유지」 견주기 — 새 판 점수끼리만(옛 점수는 언제나 덮을 수 있게)
export const keptScore = rec => (rec?.blob && rec.scoreV === SCORE_V ? rec.score ?? 0 : -1);
