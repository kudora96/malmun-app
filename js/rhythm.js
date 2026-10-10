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
import { audioCtx } from "./wake.js?v=1010.19";
import { leadOf, voicedEnd, keepFirstOf } from "./playmine.js?v=1010.19";
import { speechEnd } from "./recstore.js?v=1010.19";
import * as sfx from "./sfx.js?v=1010.19";
import { align } from "./score.js?v=1010.19";

export const FR = 0.02; // 특징 칸 20ms
const alignCache = new Map();
export const loadAlign = ep => { if (!alignCache.has(ep)) alignCache.set(ep, fetch(`data/${ep}/${ep}.align.json?v=${document.documentElement.dataset.v || ""}`).then(r => (r.ok ? r.json() : null)).catch(() => null)); return alignCache.get(ep); };
export const isSyl = ch => /[\p{L}\p{N}]/u.test(ch);
// 녹음 중 따라 읽기 칠(표시만 · 점수와 무관 — 본부 10-07 「칠을 그대로 따라 하면 100이 안 나옴」)
//  글자마다 = 본보기 음절 시작 시각(align.json) × 배수 · 본보기 쉼에서는 칠도 멈춤 · 배수 = 1.15 ÷ 본보기 속도(0.75× 고르면 그만큼 느리게)
//  → { at: 글자(span)마다 켜지는 ms(부호·띄어쓰기는 앞 음절과 같이) , end: 다 읽는 ms(안내선) } · 음절 시각이 없으면 본보기 길이로 고르게
export const PACE_X = 1.15, PACE_L0 = 600; // 배수 · 🎤 뒤 첫 음절까지 여유(ms)
export async function paceOf({ ep, key, text, rate = 1, buf }) {
  const cs = [...String(text)], f = PACE_X / (rate || 1), al = await loadAlign(ep), syl = al?.items?.[key]?.syl, n = cs.filter(isSyl).length;
  let ts = null, end;
  if (syl?.length && syl.length === n) { const s0 = syl[0].s; ts = syl.map(x => PACE_L0 + f * (x.s - s0) * 1000); end = PACE_L0 + f * (syl[n - 1].e - s0) * 1000; }
  else if (buf && n) { const d = buf.duration * 1000 * f; ts = Array.from({ length: n }, (_, k) => PACE_L0 + (d * k) / n); end = PACE_L0 + d; }
  else return null;
  let k = -1; const at = cs.map(ch => { if (isSyl(ch)) k++; return k < 0 ? ts[0] : ts[k]; });
  return { at, end };
}
// 재생 노래방 칠(본부 10-08 투덜이) — 견본 소리 재생 위치(초)를 따라 글자마다 칠(class kar · 녹음 중 칠 pace 와 같은 모양) · 음절 시작 = align.json(소리 파일 안 시각)
export async function sylAt(ep, key, text) {
  const al = await loadAlign(ep), syl = al?.items?.[key]?.syl, cs = [...String(text)], n = cs.filter(isSyl).length;
  if (!syl?.length || syl.length !== n) return null; let k = -1; return cs.map(ch => { if (isSyl(ch)) k++; return k < 0 ? syl[0].s : syl[k].s; });
}
export const paintAt = (els, at, t) => { for (let i = 0; i < els.length; i++) els[i].classList.toggle("kar", !!at && t != null && t >= at[i] - 0.02); };
// getEls() 글자들 · getT() 재생 위치(초) · isOn() 아직 재생 중 → 끝나면 칠 지움
export function karaokeRun(getEls, at, getT, isOn) {
  if (!at) return () => {};
  const id = setInterval(() => { if (!isOn()) { stop(); return; } paintAt(getEls() || [], at, getT()); }, 40);
  const stop = () => { clearInterval(id); paintAt(getEls() || [], null, 0); };
  return stop;
}
export const paintPace = (els, pace, el) => { for (let i = 0; i < els.length; i++) els[i].classList.toggle("pace", !!pace && el >= pace.at[i]); };

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
  map.cost = D[at(n, m)] / (n + m); // 맞춤 비용(칸당) — 시작 후보 고르기용
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
  const ref = Math.max(0, mEnd - mLead0); let yLead = leadOf(ybuf, 0.08, ref, keepFirst); const yStop = Math.max(yLead + 0.1, voicedEnd(ybuf, 0.12, ref));
  const A = feats(mbuf.getChannelData(0), mbuf.sampleRate, mLead, mStop);
  let B = feats(ybuf.getChannelData(0), ybuf.sampleRate, yLead, yStop), map = dtwMap(A, B);
  // 천천히 읽기(투덜이 10-07 허락) — 「짧은 첫 덩어리 = 앞 잡음」이라 버린 시작이 있으면, 첫 소리부터 잡은 시작(keepFirst 방식)과 둘 다 맞춰 보고 본보기와 더 닮은 쪽(칸당 비용 낮은 쪽)
  { const y2 = leadOf(ybuf, 0.08, 0, true); if (y2 < yLead - 0.1) { const B2 = feats(ybuf.getChannelData(0), ybuf.sampleRate, y2, yStop), m2 = dtwMap(A, B2); if (m2.cost < map.cost) { yLead = y2; B = B2; map = m2; } } }
  const toY = s => { const k = Math.max(0, Math.min(A.length - 1, Math.round((s - mLead) / FR))); return yLead + (map[k] ?? 0) * FR; };
  const ysyl0 = msyl.map((x, k) => ({ ch: x.ch, s: toY(x.s), e: k < msyl.length - 1 ? toY(msyl[k + 1].s) : Math.min(yStop, toY(x.e) + 0.02) }));
  const ysyl = minLen(ysyl0, msyl);
  // 낱말 끝 칸이 쉼 위에 놓인 것 당기기(본부 10-07 r7 「글자요.」 — DTW 가 「요」 칸을 마침표 쉼 한가운데에 둠) — 낱말 시작 ~ 다음 낱말 시작 안 마지막 말소리(−30dB) 끝보다
  //  끝 음절 칸이 0.15초 넘게 뒤로 가 있으면 그 낱말 음절 칸들을 [낱말 시작, 말소리 끝] 안에 본보기 길이 비율대로 다시 나눔(비교 화면 칸도 같이)
  { let k0 = 0; const ws = String(text).split(/\s+/).map(w => [...w].filter(isSyl).length).filter(Boolean);
    if (ws.reduce((a, b) => a + b, 0) === W.length) for (let gi = 0; gi < ws.length; gi++) { const f = k0, l = k0 + ws[gi] - 1; k0 += ws[gi];
      const lim = gi < ws.length - 1 ? ysyl[l + 1].s : Math.min(ybuf.duration, ysyl[l].e + 0.3), e1 = speechEndIn(ybuf, ysyl[f].s, lim);
      if (ysyl[l].e - e1 > 0.15 && e1 - ysyl[f].s > 0.04 * (l - f + 1)) { const md = msyl.slice(f, l + 1).map(x => Math.max(0.02, x.e - x.s)), T = md.reduce((a, b) => a + b, 0), span = e1 + 0.02 - ysyl[f].s; let t = ysyl[f].s;
        for (let k = f; k <= l; k++) { const dd = (span * md[k - f]) / T; ysyl[k] = { ch: ysyl[k].ch, s: t, e: t + dd }; t += dd; } } } }
  // 끝 늘임 음절 = 마지막 + 문장부호 바로 앞(본부 10-07)
  const ends = new Set([W.length - 1]); { let k = -1; for (const ch of String(text)) { if (isSyl(ch)) k++; else if (k >= 0 && /[,.?!…~，。？！]/.test(ch)) ends.add(k); } }
  // 낱말(띄어쓰기) 묶음 — 긴 줄 리듬용(본부 10-07)
  const groups = (() => { const g = []; let k = 0; for (const w of String(text).split(/\s+/)) { const m = [...w].filter(isSyl).length; if (!m) continue; g.push({ ks: Array.from({ length: m }, (_, i) => k + i), w: w.replace(/[^\p{L}\p{N}]/gu, "") }); k += m; } return k === W.length ? g : null; })();
  return { W, msyl, ysyl, ends, keepFirst, groups, aligned, mLead, mStop, mEnd, mLead0, ref, yLead, yStop };
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
// 말소리 끝(10ms 칸) — [a, b) 안에서 그 녹음 말소리 최대 −30dB 를 넘는 마지막 칸 끝(−25 는 r5 「누구나가」 부드러운 끝을 자름) · 없으면 a(본부 10-07 r7 — 쉼 속 잡음을 낱말 끝으로 잡던 것)
const loudCache = new WeakMap();
export function speechEndIn(buf, a, b) {
  let L = loudCache.get(buf);
  if (!L) { const d = buf.getChannelData(0), w = Math.max(1, Math.round(buf.sampleRate * 0.01)), r = new Float32Array(Math.floor(d.length / w)); let pk = 0;
    for (let i = 0; i < r.length; i++) { let q = 0; for (let k = i * w; k < (i + 1) * w; k++) q += d[k] * d[k]; r[i] = Math.sqrt(q / w); if (r[i] > pk) pk = r[i]; }
    L = { r, thr: pk * Math.pow(10, -30 / 20) }; loudCache.set(buf, L); }
  const i0 = Math.max(0, Math.floor(a / 0.01)), i1 = Math.min(L.r.length, Math.ceil(b / 0.01));
  for (let i = i1 - 1; i >= i0; i--) if (L.r[i] > L.thr) return (i + 1) * 0.01;
  return a;
}
function tailCut(buf, s, e, pkEnd = e) { // pkEnd = 최대 소리를 찾을 끝(그 음절 안 · 다음 낱말 첫소리를 최대로 잡지 않게)
  const d = buf.getChannelData(0), sr = buf.sampleRate, w = Math.max(1, Math.round(sr * FR)), a = Math.max(0, Math.round(s * sr)), b = Math.min(d.length, Math.round(e * sr)), r = [];
  for (let i = a; i + w <= b; i += w) { let q = 0; for (let k = i; k < i + w; k++) q += d[k] * d[k]; r.push(Math.sqrt(q / w)); }
  if (!r.length) return e;
  let pk = 0, pi = 0; const kp = Math.max(1, Math.ceil((pkEnd - s) / FR)); r.forEach((v, k) => { if (k < kp && v > pk) { pk = v; pi = k; } });
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
export const WORD_MODE_MIN = 13; // 음절이 이만큼 이상이면 리듬을 낱말 단위로(투덜이 10-07 허락 — 긴 줄은 DTW 음절 경계가 최소 길이로 채워져 믿기 어려움)
export function rhythmScore({ msyl, ysyl, mbuf, ybuf, ends, heard, groups }) {
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
  // 쉼 자리(투덜이 10-07 허락) — 내 녹음의 0.25초+ 조용한 틈마다 가장 가까운 낱말 경계(띄어쓰기 · 내 DTW 시각)가 그 틈 안이거나 틈에서 0.3초 안이면 「낱말 사이 쉼」
  //  (음절 칸이 쉼 가운데를 옆 음절에 넣는 DTW 오차를 타지 않게 · 그 쉼은 음절·낱말 길이에서 뺌) · 멀면 「낱말 안 쉼」
  const ov = (g, x) => Math.max(0, Math.min(g.e, x.e) - Math.max(g.s, x.s));
  const wb = groups && groups.length >= 2 ? groups.slice(1).map(g => g.ks[0]) : [], gapAt = new Map(), inGaps = [];
  for (const g of quietRuns(ybuf, ysyl[0].s, ysyl[n - 1].e)) { if (g.e - g.s <= 0.25) continue;
    // 경계까지 거리 = 경계가 틈 안이면 0 · 밖이면 틈 끝까지 · 가장 가까운 음절 경계가 낱말 경계(같은 거리면 낱말 경계 먼저)이고 0.3초 안일 때만 낱말 사이(「있|어요」 낱말 안 쉼을 짧은 「있」 때문에 낱말 사이로 잡지 않게)
    const dist = b => { const t = ysyl[b].s; return t < g.s ? g.s - t : t > g.e ? t - g.e : 0; };
    let dIn = Infinity; for (let b = 1; b < n; b++) if (!wb.includes(b)) dIn = Math.min(dIn, dist(b));
    let kb = -1, dmin = 0.3; for (const b of wb) { const d = dist(b); if (d <= dmin && d <= dIn + 0.02) { dmin = d; kb = b; } }
    // DTW 가 음절 칸을 쉼 속에 넣어 둔 경우(투덜이 r6 「그게 / 세종대왕이」 — 「세」「종」 칸이 0.4초 쉼 안) — 낱말 경계와 쉼 사이 음절 칸이 모두 쉼 빼면 소리가 거의 없으면(기대 길이 60% 아래) 그 음절들은 사실 쉼 건너편 = 낱말 사이 쉼
    if (kb < 0) { const silent = k => { const x = ysyl[k]; return Math.max(0, x.e - x.s - ov(g, x)) < 0.6 * (msyl[k].e - msyl[k].s) * (Q / P); }; // 칸에서 쉼 뺀 소리 < 그 음절 기대 길이의 60%
      for (const b of wb) { if (dist(b) > 0.45) continue; let k = ysyl[b].s < g.e ? b : b - 1, ok = true, m = 0;
        if (ysyl[b].s < g.e) for (; k < n && ysyl[k].s < g.e - 0.05; k++, m++) ok = ok && silent(k); else for (; k >= 0 && ysyl[k].e > g.s + 0.05; k--, m++) ok = ok && silent(k); // 쉼 끝에 살짝 걸친 칸(0.05초)은 셈에서 뺌
        if (ok && m > 0) { kb = b; break; } } }
    if (kb >= 0) { if (!gapAt.has(kb) || g.e - g.s > gapAt.get(kb).e - gapAt.get(kb).s) gapAt.set(kb, g); } else inGaps.push(g); }
  for (const g of gapAt.values()) for (let k = 0; k < n; k++) if (!E.has(k)) Bm[k] = Math.max(0.02, Bm[k] - ov(g, k ? ysyl[k] : { s: yS0, e: ysyl[0].e }));
  const tEnd = (x, k, buf) => (k < n - 1 ? Math.max(x[k].e, x[k + 1].s) : Math.min(buf.duration, x[k].e + 0.3)); // 여운 찾기 = 다음 음절 앞까지(정렬 칸 끝이 소리보다 일찍 끝나는 「요.」)
  for (const k of E) { const ms = st(k, msyl, mS0), ys = st(k, ysyl, yS0); A[k] = tailCut(mbuf, ms, tEnd(msyl, k, mbuf)) - ms; Bm[k] = tailCut(ybuf, ys, tEnd(ysyl, k, ybuf)) - ys; }
  const sc = A.reduce((x, y) => x + y, 0) / (Bm.reduce((x, y) => x + y, 0) || 1), B = Bm.map(v => v * sc), wt = A.map(v => v);
  for (const k of E) if (!(B[k] > 2 * A[k] || B[k] - A[k] > 0.25)) wt[k] *= END_W; // 「나———」 끌기는 완화 없음
  let R = 0, worst = null, worstHit = 0, stumble = false, over = null; // over = 1.7배 넘게 길거나 짧은 곳(가장 심한 것)
  const RATIO = 1.7, overChk = (a, b, mk) => { const r = b / Math.max(1e-6, a); if ((r > RATIO || r < 1 / RATIO) && (!over || Math.abs(Math.log(r)) > Math.abs(Math.log(over.r)))) over = { r, ...mk() }; }; // 투덜이 10-07 허락 — 한 곳이라도 1.7배 넘게 틀리면 최대 99
  if (groups && groups.length >= 2 && n >= WORD_MODE_MIN) {
    // 낱말 단위(본부 10-07) — 낱말 길이 = 첫 음절 시작 ~ 끝 음절 끝(첫 낱말은 소리 시작부터 · 구 끝 낱말은 여운 빼고)
    //  내 낱말 경계 = DTW 경계 ±0.15초 안에 조용한 틈이 있으면 그 틈(가장 긴 것)에 붙임 · 빠르기 맞춤·여유·무게는 음절 때와 같은 식
    const yq = quietRuns(ybuf, ysyl[0].s, ysyl[n - 1].e).filter(x => x.e - x.s >= 0.06), G = groups.length;
    const yb = groups.map((g, i) => { if (!i) return null; const wg = gapAt.get(g.ks[0]); if (wg) return { end: wg.s, start: wg.e }; const t = ysyl[g.ks[0]].s, near = yq.filter(x => x.e > t - 0.15 && x.s < t + 0.15 && x.s <= t + 0.08 && x.e >= t - 0.08); /* ±0.15초 안 · 경계(t)에 걸치거나 아주 가까운 틈만(낱말 안 받침 닫힘 틈을 잘못 잡지 않게) */ if (!near.length) return { end: t, start: t }; const r = near.sort((a, b) => b.e - b.s - (a.e - a.s))[0]; return { end: r.s, start: r.e }; });
    // 낱말 끝 = 끝 음절 시작 ~ 다음 낱말 시작 사이에서 소리가 자기 최대에서 15dB 내려간 곳(본보기·내 것 똑같이 · 쉼·여운 빼고) · 마지막 낱말은 +0.3초까지
    const mLen = (g, gi) => { const f = g.ks[0], l = g.ks[g.ks.length - 1], s0 = gi === 0 ? mS0 : msyl[f].s, ls = l === 0 ? mS0 : Math.max(s0, msyl[l].s), lim = gi < G - 1 ? Math.max(ls + 0.02, msyl[l + 1].s) : Math.min(mbuf.duration, msyl[l].e + 0.3); return Math.max(0.02, tailCut(mbuf, ls, lim, Math.max(ls + 0.02, msyl[l].e)) - s0); };
    const yLen = (g, gi) => { const f = g.ks[0], l = g.ks[g.ks.length - 1], s0 = gi === 0 ? yS0 : yb[gi]?.start ?? ysyl[f].s, ls = l === 0 ? yS0 : Math.max(s0, ysyl[l].s), lim = gi < G - 1 ? Math.max(ls + 0.02, yb[gi + 1]?.start ?? ysyl[l + 1].s) : Math.min(ybuf.duration, ysyl[l].e + 0.3); return Math.max(0.02, tailCut(ybuf, ls, lim, Math.max(ls + 0.02, gi < G - 1 ? yb[gi + 1]?.end ?? ysyl[l].e : ysyl[l].e)) - s0); };
    const Aw = groups.map(mLen), Bwm = groups.map(yLen);
    const scw = Aw.reduce((a, b) => a + b, 0) / (Bwm.reduce((a, b) => a + b, 0) || 1), Bw = Bwm.map(v => v * scw), ww = Aw.slice();
    groups.forEach((g, gi) => { const l = g.ks[g.ks.length - 1]; if (E.has(l) && !(Bw[gi] > 2 * Aw[gi] || Bw[gi] - Aw[gi] > 0.25)) ww[gi] *= END_W; });
    const Ws = ww.reduce((a, b) => a + b, 0) || 1;
    groups.forEach((g, gi) => { const a = Aw[gi], b = Bw[gi], sim = (Math.min(a, b) + TOL) / (Math.max(a, b) + TOL), w = ww[gi] / Ws; R += w * sim;
      const hit = w * (1 - sim); if (hit > worstHit) { worstHit = hit; worst = { k: g.ks[0], ks: g.ks, word: gi, ch: g.w, kind: b > a ? "long" : "short", a, b }; }
      overChk(a, b, () => ({ k: g.ks[0], ks: g.ks, word: gi, ch: g.w, kind: b > a ? "long" : "short", a, b })); }); // 낱말 = 여운 뺀 길이 비율
  } else {
  const Wsum = wt.reduce((x, y) => x + y, 0) || 1;
  for (let k = 0; k < n; k++) {
    const a = A[k], b = B[k];
    const sim = (Math.min(a, b) + TOL) / (Math.max(a, b) + TOL); // 본보기 시간으로 맞춰 견줌 · 칸 크기(20ms) 오차는 너그럽게(±60ms)
    const w = wt[k] / Wsum; R += w * sim;
    const hit = w * (1 - sim); if (hit > worstHit) { worstHit = hit; worst = { k, ch: msyl[k].ch, kind: b > a ? "long" : "short", a, b }; } // a·b = 견준 길이(초 · 내 것은 본보기 빠르기로 맞춤)
    overChk(a + TOL, b + TOL, () => ({ k, ch: msyl[k].ch, kind: b > a ? "long" : "short", a, b })); // 음절 = ±60ms 여유 넣은 뒤 비율
  }
  }
  // 쉼 감점(투덜이 10-07 허락) — 본보기 그 자리에 0.1초+ 틈이 있으면 없음 · 낱말 사이 = 0.6초 넘을 때만 −0.08 · 낱말 안 = 0.25초 넘으면 −0.08(더듬음)
  for (const [kb, g] of gapAt) {
    const m = msyl[kb - 1], modelGap = mq.some(x => x.e - x.s > 0.1 && x.s < Math.max(m.e, msyl[kb].s) + 0.05 && x.e > m.s);
    if (!modelGap && g.e - g.s > 0.6) { R -= 0.08; stumble = true; if (0.08 >= worstHit) { const gw = groups.find(x => x.ks[0] === kb); worstHit = 0.08; worst = { k: kb, ks: gw?.ks, ch: gw?.w || msyl[kb].ch, kind: "pause_word", gap: g.e - g.s }; } }
  }
  for (const g of inGaps) {
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
  if (over && R >= R_FULL - 0.01) { R = R_FULL - 0.01; if (!worst) { const { r, ...o } = over; worst = o; } } // 1.7배 넘는 곳 = 최대 99 · 문구는 가장 많이 깎인 곳 그대로(빠르기 맞춤으로 옆 낱말이 튀어 보이는 것보다 믿을 만함)
  if (stumble) R = Math.min(R, R_FULL - 0.01); // 더듬음·본보기에 없는 쉼이 있으면 100 아님(앱 창 10-07 — −0.08 뒤에도 문턱 위면 깎이지 않던 것)
  return { R: Math.max(0, Math.min(1, R)), worst, p, q, ends: E, yEnd: ysyl[n - 1].e };
}
// 늦음(투덜이 10-08 「노래방 색이 다 칠해지고 한참 뒤 또박또박 읽어도 100점 — 시간은 주되 100점은 안 되게 · 80점쯤」)
//  내 말 끝(녹음 시작부터 · yEnd) − 노래방 칠 끝(본보기 빠르기 · paceEnd) = 늦음 · 여유 = 0.8초 + 칠 길이의 15% · 그 뒤 칠 길이의 50% 더 늦을 때까지 1 → 0.8 로 줄임(최소 0.8)
export function lateFactor(yEnd, paceEnd) {
  if (!(yEnd > 0) || !(paceEnd > 0)) return { f: 1, late: false };
  const over = yEnd - paceEnd - (0.8 + 0.15 * paceEnd); if (over <= 0) return { f: 1, late: false };
  const f = 1 - 0.2 * Math.min(1, over / (0.5 * paceEnd)); return f >= 0.97 ? { f: 1, late: false } : { f, late: true }; // 조금 늦음(−3점 안)은 봐줌
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
    return rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf, ybuf, ends: pr.ends, heard, groups: pr.groups });
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
