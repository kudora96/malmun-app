// 홑모음 따라 하기 판정 — 기기 안(서버 0 · 녹음 안 남김 · 나이 상관없이) · 설계 _hq/design_follow_along_interactive.md 2절(대표님 10-21)
//  받아쓰기는 홑모음을 빼먹음 → 목소리 구간(음높이 75~500Hz · 소음보다 12dB 위) + 길이 + F1/F2(LPC 스펙트럼 봉우리) 로 판정
//  기준 F1/F2 = 검사2팀 vowel_check.py REF(소리부 본보기) · 로그 거리 · 처음엔 너그럽게(실제 학습자 녹음으로 문턱 다시 맞춤)
//  결과 = 반응 영상 id(영상2팀 v5 표): G 맞음 · N 안 잡힘 · L 작음 · S 짧음 · A1 「아」 입 작음 · A2 「아」 입술 둥긂 · O1 「오」 입술 안 둥긂 · O2 「오」 끝이 「우」로 · O3 「오」 닫힘 · W1a/W1o 다른 소리
import { audioCtx } from "./wake.js?v=1022.19";
import { getMic } from "./recorder.js?v=1022.19";

export const REF = { 아: [1154, 1557], 어: [607, 997], 오: [448, 901], 우: [381, 981], 으: [400, 1600], 이: [350, 2700], 애: [720, 2150], 에: [520, 2350] };
const SR = 11025, WIN = 0.03, HOP = 0.01, MIN_SEG = 0.06;
const lg = x => Math.log2(Math.max(1, x));
export const dist = (f1, f2, v) => Math.abs(lg(f1) - lg(REF[v][0])) + Math.abs(lg(f2) - lg(REF[v][1]));
export const nearest = (f1, f2, among = Object.keys(REF)) => among.reduce((a, v) => (dist(f1, f2, v) < dist(f1, f2, a) ? v : a), among[0]);
const med = a => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };

// 샘플 → 11025Hz(브라우저가 다시 뽑음)
export async function resample(x, sr) {
  if (sr === SR) return x;
  const oc = new OfflineAudioContext(1, Math.ceil((x.length * SR) / sr), SR), b = oc.createBuffer(1, x.length, sr); b.copyToChannel(x, 0);
  const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(); return (await oc.startRendering()).getChannelData(0);
}

// 한 틀: 크기(dB) · 목소리(자기상관 봉우리) · 포먼트(LPC 12차 스펙트럼 봉우리)
function frameInfo(x, i0, n) {
  let e = 0; for (let i = 0; i < n; i++) e += x[i0 + i] ** 2; const db = 10 * Math.log10(e / n + 1e-12);
  let best = 0; const r0 = e || 1e-12;
  for (let lag = Math.floor(SR / 500); lag <= Math.ceil(SR / 75); lag++) { let r = 0; for (let i = 0; i + lag < n; i++) r += x[i0 + i] * x[i0 + i + lag]; best = Math.max(best, r / r0); }
  return { db, voiced: best > 0.45 };
}
function formants(x, i0, n) {
  const w = new Float64Array(n); for (let i = 0; i < n; i++) w[i] = (x[i0 + i] - (i ? 0.97 * x[i0 + i - 1] : 0)) * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  const p = 12, R = new Float64Array(p + 1); for (let k = 0; k <= p; k++) { let s = 0; for (let i = k; i < n; i++) s += w[i] * w[i - k]; R[k] = s; }
  if (R[0] <= 0) return [NaN, NaN];
  const a = new Float64Array(p + 1); a[0] = 1; let E = R[0];
  for (let i = 1; i <= p; i++) { let acc = R[i]; for (let j = 1; j < i; j++) acc += a[j] * R[i - j]; const k = -acc / E; const t = a.slice(); for (let j = 1; j < i; j++) a[j] = t[j] + k * t[i - j]; a[i] = k; E *= 1 - k * k; if (E <= 0) break; }
  // LPC 다항식 근(Durand–Kerner) → 주파수·대역폭 · 대역폭 < 500Hz 인 것 중 낮은 차례로 F1·F2(봉우리 찾기는 「오·우」 처럼 F1·F2 가 붙으면 하나로 보임)
  const rts = Array.from({ length: p }, (_, k) => ({ re: 0.9 * Math.cos((2 * Math.PI * k) / p + 0.4), im: 0.9 * Math.sin((2 * Math.PI * k) / p + 0.4) }));
  const ev = z => { let re = 1, im = 0; for (let k = 1; k <= p; k++) { const r2 = re * z.re - im * z.im, i2 = re * z.im + im * z.re; re = r2 + a[k]; im = i2; } return { re, im }; }; // z^p + a1 z^(p-1) + … + ap
  for (let it = 0; it < 80; it++) {
    let moved = 0;
    for (let k = 0; k < p; k++) { const z = rts[k], num = ev(z); let dr = 1, di = 0; for (let m = 0; m < p; m++) if (m !== k) { const xr = z.re - rts[m].re, xi = z.im - rts[m].im, r2 = dr * xr - di * xi; di = dr * xi + di * xr; dr = r2; } const den = dr * dr + di * di || 1e-30, qr = (num.re * dr + num.im * di) / den, qi = (num.im * dr - num.re * di) / den; z.re -= qr; z.im -= qi; moved = Math.max(moved, Math.abs(qr) + Math.abs(qi)); }
    if (moved < 1e-10) break;
  }
  const fs = rts.filter(z => z.im > 0).map(z => ({ f: (Math.atan2(z.im, z.re) * SR) / (2 * Math.PI), bw: (-Math.log(Math.hypot(z.re, z.im)) * SR) / Math.PI })).filter(x => x.f > 150 && x.f < SR / 2 - 100 && x.bw < 900).sort((x, y) => x.f - y.f);
  const f1 = fs.find(x => x.bw < 500 && x.f < 1400) || fs[0]; if (!f1) return [NaN, NaN];
  const f2 = fs.find(x => x !== f1 && x.f > f1.f + 120 && x.f < 1600) || fs.find(x => x !== f1 && x.f > f1.f + 120 && x.bw < 500); // 뒷모음(어·오·우)의 낮은 F2 를 먼저(대역폭이 넓게 잡혀도)
  return [f1.f, f2?.f ?? NaN];
}

// 소리 → 목소리 덩어리들 { t0, t1, dur, db, f1, f2, f1Tail } · noiseDb
export function analyze(x) {
  const n = Math.round(WIN * SR), h = Math.round(HOP * SR), fr = [];
  for (let i = 0; i + n <= x.length; i += h) fr.push(frameInfo(x, i, n));
  if (!fr.length) return { segs: [], noiseDb: -100, peakDb: -100 };
  const dbs = fr.map(f => f.db).sort((a, b) => a - b), noiseDb = dbs[Math.floor(dbs.length * 0.1)], peakDb = dbs[dbs.length - 1];
  const on = fr.map(f => f.voiced && f.db > noiseDb + 12);
  for (let i = 1; i < on.length - 2; i++) if (!on[i] && on[i - 1] && (on[i + 1] || on[i + 2])) on[i] = true; // 1~2틀 끊김은 이음
  const segs = [];
  for (let i = 0; i < on.length; i++) { if (!on[i]) continue; let j = i; while (j + 1 < on.length && on[j + 1]) j++; const t0 = i * HOP, t1 = j * HOP + WIN; if (t1 - t0 >= MIN_SEG) segs.push({ i, j, t0, t1, dur: t1 - t0 }); i = j; }
  for (const s of segs) {
    const len = s.j - s.i + 1, mid = [], tail = [];
    for (let k = s.i + Math.floor(len * 0.3); k <= s.i + Math.floor(len * 0.7); k++) mid.push(formants(x, k * h, n));
    for (let k = s.i + Math.floor(len * 0.7); k <= s.j; k++) tail.push(formants(x, k * h, n));
    s.f1 = med(mid.map(f => f[0])); s.f2 = med(mid.map(f => f[1])); s.f1Tail = med(tail.map(f => f[0])); s.f2Tail = med(tail.map(f => f[1]));
    s.db = med(fr.slice(s.i, s.j + 1).map(f => f.db));
  }
  return { segs, noiseDb, peakDb, x };
}

// 덩어리 하나를 반으로(두 모음을 쉬지 않고 이어 말했을 때)
function split(x, s) {
  const h = Math.round(HOP * SR), n = Math.round(WIN * SR), mid = Math.floor((s.i + s.j) / 2), part = (i, j) => {
    const len = j - i + 1, f = []; for (let k = i + Math.floor(len * 0.3); k <= i + Math.floor(len * 0.7); k++) f.push(formants(x, k * h, n));
    return { i, j, t0: i * HOP, t1: j * HOP + WIN, dur: (j - i) * HOP + WIN, f1: med(f.map(q => q[0])), f2: med(f.map(q => q[1])), db: s.db };
  };
  return [part(s.i, mid), part(mid + 1, s.j)];
}
// 판정 하나: 기대 모음 → 반응 id
//  (10-21 소리부 follow_calib 536개 · 21개 말 원어 목소리 여·남·아이로 다시 맞춤) 목소리마다 F1·F2 가 달라 「가장 가까운 모음」 대신 갈림 선:
//   아 ↔ 어 = F2(아 ≥ 1130Hz) · 오 ↔ 어 = F1(어 > 570Hz) · 이 쪽 = F1 < 430 & F2 > 1800 · 둥근 소리(오·우) = F1 < 600 & F2 < 1000 · 오 ↔ 우 = F1 < 365 · F2 가 3번째 봉우리로 잡힌 것(F1 > 550 인데 F2 > 2200)은 F2 를 안 믿음
export const LOUD_MIN = -30; // 목소리 덩어리 크기(dBFS) 이보다 작으면 「조금 더 크게」(L)
export function judgeSeg(s, expect) {
  if (!s) return "N";
  if (s.dur < 0.2) return "S";
  if (Number.isFinite(s.db) && s.db < LOUD_MIN) return "L";
  const f1 = s.f1, f2r = s.f2;
  if (!Number.isFinite(f1)) return "G"; // 못 잼 = 틀렸다고 하지 않음
  const f2 = Number.isFinite(f2r) && !(f1 > 550 && f2r > 2200) ? f2r : NaN;
  const front = f1 < 430 && f2 > 1800, round = f1 < 600 && f2 < 1000;
  if (expect === "아") {
    if (front) return "W1a";
    if (round) return "A2";
    if (Number.isFinite(f2)) return f2 < 1130 ? "A1" : "G";
    return f1 < 700 ? "A1" : "G";
  }
  if (expect === "오") {
    if (front) return "W1o";
    if (f1 > 900 && (!Number.isFinite(f2) || f2 > 1150)) return "W1o"; // 「아」 쪽
    if (f1 > 570) return "O1";
    if (f1 < 365) return "O3";
    if (Number.isFinite(s.f1Tail) && s.f1Tail < 400 && s.f1Tail < f1 * 0.85) return "O2"; // 끝이 「우」로
    return "G";
  }
  return "G";
}
// 차례 판정: expect = ["아"] 또는 ["아","오"](이어서 · 덩어리 차례대로) → { id, segs, why }
export function judge(an, expect) {
  const { segs, noiseDb, peakDb } = an;
  if (!segs.length) return { id: peakDb > noiseDb + 6 && peakDb > -60 ? "L" : "N", segs };
  let pick = [...segs].sort((a, b) => b.dur - a.dur).slice(0, expect.length).sort((a, b) => a.t0 - b.t0); // 가장 긴 덩어리들을 말한 차례대로(짧은 숨·끊김 조각은 빼고)
  if (expect.length === 2 && pick.length === 1 && an.x) pick = split(an.x, pick[0]); // 「아오」를 쉬지 않고 이어 말함 = 가운데에서 둘로
  for (let k = 0; k < expect.length; k++) { const id = judgeSeg(pick[k], expect[k]); if (id !== "G") return { id, segs, at: k }; }
  return { id: "G", segs };
}

// 마이크로 듣기 — 말이 끝나고 0.5초 조용하면 바로 · 최대 maxMs · 소리는 메모리에서만(끝나면 버림)
//  onLevel(0~1) = 듣는 동안 크기(자막 칸 얇은 선) · signal = 멈춤(건너뛰기·화면 떠남)
export async function listen({ maxMs = 4000, quietMs = 500, onLevel, signal } = {}) {
  const stream = await getMic(), ctx = audioCtx(); if (ctx.state !== "running") await ctx.resume().catch(() => {});
  const src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(2048, 1, 1), mute = ctx.createGain(); mute.gain.value = 0;
  const chunks = []; let got = 0, spoke = false, lastLoud = 0, floor = null; const t0 = performance.now();
  return await new Promise(res => {
    const done = async () => { proc.onaudioprocess = null; try { src.disconnect(); proc.disconnect(); mute.disconnect(); } catch {} const x = new Float32Array(got); let o = 0; for (const c of chunks) { x.set(c, o); o += c.length; } chunks.length = 0; res(await resample(x, ctx.sampleRate)); };
    signal?.addEventListener("abort", done, { once: true });
    proc.onaudioprocess = e => {
      const c = new Float32Array(e.inputBuffer.getChannelData(0)); chunks.push(c); got += c.length;
      let s = 0; for (const v of c) s += v * v; const db = 10 * Math.log10(s / c.length + 1e-12), now = performance.now() - t0;
      if (now < 300) floor = floor == null ? db : Math.min(floor, db); // 처음 0.3초 = 소음
      const loud = floor != null && db > floor + 12; if (loud) { spoke = true; lastLoud = now; }
      onLevel?.(Math.max(0, Math.min(1, (db + 60) / 50)));
      if (now >= maxMs || (spoke && now - lastLoud > quietMs)) done();
    };
    src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
  });
}
