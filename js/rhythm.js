// 리듬 점수(투덜이 10-06 직접 허락 — 「있」을 더듬어 시간이 안 맞는데 100점이면 믿음이 깨짐)
//  · 음절 칸 = 비교 화면과 같은 것: 본보기 = data/{ep}/{ep}.align.json · 내 목소리 = 20ms 칸 특징 DTW 로 본보기 경계를 옮김
//  · 리듬 R(0~1) = Σ p_i · (min + 0.04초)/(max + 0.04초)  (p·q = 음절 길이 / 말 전체 → 본보기 시간으로 · 전체 빠르기 차이는 비율이라 상관없음 · 20ms 칸 오차 너그럽게)
//      − 0.08 × (내 말 안의 0.25초 넘는 조용한 틈인데 본보기 그 음절엔 0.1초 넘는 틈이 없는 것)
//      − 0.05 (말 전체 길이가 본보기의 0.6배 아래 · 1.8배 위)
//  · 최종 점수 = 글자 점수(score.js) × f(R): R ≥ 0.90 → 1 · 0.5 ≤ R < 0.9 → 0.90 + 0.10 × (R − 0.5)/0.4 · R < 0.5 → 0.88
//  녹음·재생은 그대로 — 받은 녹음(blob)을 풀어 재기만
import { audioCtx } from "./wake.js?v=1007.6";
import { leadOf, voicedEnd } from "./playmine.js?v=1007.6";
import { speechEnd } from "./recstore.js?v=1007.6";
import * as sfx from "./sfx.js?v=1007.6";

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

// 본보기·내 녹음 → 음절 칸 둘(비교 화면과 리듬 점수가 같은 칸을 씀)
export function prepare({ al, key, text, mbuf, ybuf }) {
  const W = [...String(text)].filter(isSyl);
  let msyl = al?.items?.[key]?.syl;
  const mLead0 = msyl?.length ? msyl[0].s : leadOf(mbuf, 0), mEnd = msyl?.length ? msyl[msyl.length - 1].e : speechEnd(mbuf, 0);
  const aligned = !!(msyl?.length && msyl.length === W.length);
  if (!aligned) msyl = W.map((ch, k) => ({ ch, s: mLead0 + ((mEnd - mLead0) * k) / W.length, e: mLead0 + ((mEnd - mLead0) * (k + 1)) / W.length }));
  const mLead = Math.max(0, mLead0 - 0.08), mStop = Math.min(mbuf.duration, mEnd + 0.15);
  const ref = Math.max(0, mEnd - mLead0), yLead = leadOf(ybuf, 0.08, ref), yStop = Math.max(yLead + 0.1, voicedEnd(ybuf, 0.12, ref));
  const A = feats(mbuf.getChannelData(0), mbuf.sampleRate, mLead, mStop), B = feats(ybuf.getChannelData(0), ybuf.sampleRate, yLead, yStop), map = dtwMap(A, B);
  const toY = s => { const k = Math.max(0, Math.min(A.length - 1, Math.round((s - mLead) / FR))); return yLead + (map[k] ?? 0) * FR; };
  const ysyl = msyl.map((x, k) => ({ ch: x.ch, s: toY(x.s), e: k < msyl.length - 1 ? toY(msyl[k + 1].s) : Math.min(yStop, toY(x.e) + 0.02) }));
  return { W, msyl, ysyl, aligned, mLead, mStop, mEnd, mLead0, ref, yLead, yStop };
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
const TOL = 0.04;
export function rhythmScore({ msyl, ysyl, mbuf, ybuf }) {
  const n = msyl.length; if (n < 2) return { R: 1, worst: null };
  const P = msyl[n - 1].e - msyl[0].s, Q = ysyl[n - 1].e - ysyl[0].s;
  if (!(P > 0) || !(Q > 0)) return { R: 1, worst: null };
  const p = msyl.map(x => Math.max(0, x.e - x.s) / P), q = ysyl.map(x => Math.max(0, x.e - x.s) / Q);
  let R = 0, worst = null, worstHit = 0;
  for (let k = 0; k < n; k++) {
    const a = p[k] * P, b = q[k] * P, sim = (Math.min(a, b) + TOL) / (Math.max(a, b) + TOL); // 본보기 시간으로 맞춰 견줌 · 칸 크기(20ms) 오차는 너그럽게(±40ms)
    R += p[k] * sim;
    const hit = p[k] * (1 - sim); if (hit > worstHit) { worstHit = hit; worst = { k, ch: msyl[k].ch, kind: q[k] > p[k] ? "long" : "short" }; }
  }
  // 더듬음·쉼 — 내 말 안의 0.25초 넘는 틈인데 본보기 그 음절엔 0.1초 넘는 틈이 없으면 틈마다 −0.08
  const mq = quietRuns(mbuf, msyl[0].s, msyl[n - 1].e);
  for (const g of quietRuns(ybuf, ysyl[0].s, ysyl[n - 1].e)) {
    if (g.e - g.s <= 0.25) continue;
    const mid = (g.s + g.e) / 2; let k = ysyl.findIndex(x => mid < x.e); if (k < 0) k = n - 1; const m = msyl[k];
    const modelGap = mq.some(x => x.e - x.s > 0.1 && x.s < m.e && x.e > m.s);
    if (!modelGap) { R -= 0.08; if (0.08 >= worstHit) { worstHit = 0.08; worst = { k, ch: msyl[k].ch, kind: "pause" }; } }
  }
  if (Q / P < 0.6 || Q / P > 1.8) { R -= 0.05; if (!worst) worst = { k: 0, ch: msyl[0].ch, kind: "speed" }; }
  return { R: Math.max(0, Math.min(1, R)), worst, p, q };
}
export const rhythmFactor = R => (R >= 0.9 ? 1 : R >= 0.5 ? 0.9 + (0.1 * (R - 0.5)) / 0.4 : 0.88);
// 내림(본부 10-06 — 반올림이면 리듬 89%(R 0.894)인데 100점이 나옴) · 100점 = 글자 100 그리고 R ≥ 0.9 일 때만
export const withRhythm = (letter, R) => (letter == null || R == null ? letter : Math.floor(letter * rhythmFactor(R) + 1e-9));

// 점수 낼 때 — 정렬 파일·본보기 소리·내 녹음 → { R, worst } · 못 재면 null(그땐 글자 점수 그대로)
export async function rhythmOf({ ep, key, url, text, blob }) {
  if (window.__noRhythm) return null; // 점검 도구(가짜 마이크 소리)용 — 글자 점수만 보는 점검에서 끔
  try {
    const [al, mbuf, ybuf] = await Promise.all([loadAlign(ep), sfx.load(url), blob.arrayBuffer().then(ab => audioCtx().decodeAudioData(ab))]);
    if (!mbuf || !ybuf) return null;
    const pr = prepare({ al, key, text, mbuf, ybuf });
    if (!pr.aligned) return null; // 본보기 음절 시각이 없으면 리듬은 재지 않음
    return rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf, ybuf });
  } catch { return null; }
}

// 결과 줄 근거 — 「글자 100% · 리듬 78%」 + 리듬이 90% 아래면 가장 많이 깎인 곳 한 곳
export const rhyText = (h, t) => `${t("rhythm_line", { l: h.L, r: Math.floor(h.R * 100 + 1e-9) })}${h.R < 0.9 && h.worst ? " · " + t("rhy_" + h.worst.kind, { s: `「${h.worst.ch}」` }) : ""}`;

// 저장본 점수 판(본부 10-06 — 리듬 넣기 전에 저장한 100점이 남아 새 녹음(96)을 「앞 저장본이 더 높음」으로 밀어냄)
//  scoreV 2 = 글자 × f(R) 내림 · 옛 판 저장본은 열 때 그 저장된 소리로 리듬을 다시 재 새 점수로 바꿔 저장(옛 값은 score0 에 그대로)
//  다시 못 재면(본보기 음절 시각 없음 등) old 표시 — 흐리게 보이고 다음 녹음이 덮을 수 있음
export const SCORE_V = 2;
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
