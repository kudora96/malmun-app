// [▶ 내 목소리]·[저장됨 ▶] 재생 — 말 시작 자리부터(본부 10-04 · 녹음 경로는 한 글자도 안 바꿈)
// · <audio> 자리 옮기기(seek)는 쓰지 않는다(webm 을 찾아가며 소리가 깨졌다 — 1004.9)
// · blob 을 decodeAudioData 로 풀어 AudioBufferSourceNode.start(0, lead) · 연결은 source → destination 직결(게인·필터 없음)
//   lead = 말 시작 0.15초 전(같은 버퍼에서 잼) · 끝나면 멈춤 · 풀기 실패하면 <audio> 로 처음부터
import { audioCtx } from "./wake.js?v=1007.6";

// 시작 = 말 시작 0.08초 전(본부 10-04: 0.15 → 0.08 · 앞 잡소리가 끼지 않게)
// 첫 소리가 말보다 작고(최대에서 8dB 넘게 아래) 뒤에 조용한 틈이 있으면 녹음 켜는 순간의 잡소리일 수 있다(앞 소리 꼬리·딸깍 — 투덜이 17:49 녹음: −42dB 잡소리 → −53~−65 틈 → −30 말) →
//   그 소리가 한 번 「조용함」(최대보다 20dB 아래 · 100ms 이상 이어짐)으로 떨어진 뒤의 첫 말 칸부터 · 조용한 틈이 없으면 그대로(바로 말함 = 0 근처)
//   단 앞 소리가 말만큼 크면(최대에서 8dB 안) 진짜 첫 낱말로 보고 건너뛰지 않는다(바로 말하고 낱말 사이에 쉰 경우)
export const FADE_OUT = 0.03; // 끝 30ms 페이드아웃(말 끝 뒤를 자를 때 딸깍 방지)
export const FADE = 0.015; // 시작 15ms 페이드인(딸깍 방지 · 말 시작 0.08초 앞이라 본소리엔 안 닿음)
// 손에 든 마이크의 「툭·부스럭」(본부 10-06 투덜이) — 위 방식은 잡음이 말만큼 크거나 틈이 100ms 안 되면 못 거름 →
//   먼저 「목소리 칸」으로 말 시작을 찾는다: 20ms 칸마다 자기상관(80~400Hz = 지연 2.5~12.5ms) 정규화 최대 ≥ 0.5 이고 에너지 > 문턱인 칸이 3칸(60ms) 이어지는 첫 자리
//   손 잡음(툭·부스럭·쿵)은 주기가 없거나 80Hz 아래라 안 걸림 · 그 앞으로는 문턱 넘는 칸이 이어지는 동안만 늘림(첫 자음 ㅅ·ㅊ·ㅍ 살리기 · 최대 0.25초)
//   찾는 자리 = 옛 방식(아래 leadOld — 앞 잡소리 뒤 조용한 틈)이 건너뛴 자리부터(앞 소리 꼬리처럼 주기 있는 잡소리도 그대로 거름)
//   늘리는 칸 = 문턱의 절반 넘고(ㅎ·ㅅ 처럼 작은 첫 소리) 목소리 칸 크기(중앙값)보다 작을 때만 — 그보다 크면 잡음으로 보고 멈춤(말만큼 큰 부스럭) · 목소리 칸을 못 찾으면 아래 옛 방식 그대로
//   재생 방식·크기(gainOf)·녹음은 그대로 — 시작 숫자만
// 목소리 칸 덩어리(본부 10-06 투덜이 실제 녹음 r2 — 말 끝 0.8초 뒤 말만큼 큰 손 잡음이 자기상관 0.5 를 넘어 「목소리」로 잡힘)
//   조용한 틈(목소리 칸 없음) 0.35초 넘게로 나눔 → [{ a, b, v }] (첫·끝 칸 · 목소리 칸 수)
const GAP = Math.round(0.35 / 0.02);
function clustersOf(n, voiced, f0 = 0) {
  const out = []; let cur = null, gap = 0;
  for (let f = f0; f < n; f++) {
    if (voiced(f)) { if (!cur || gap > GAP) { cur = { a: f, b: f, v: 0 }; out.push(cur); } cur.b = f; cur.v++; gap = 0; }
    else gap++;
  }
  return out;
}
export function voicedOnset(buf, from = 0, floor = from, ref = 0) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), n = Math.floor(d.length / win);
  if (n < 3) return -1;
  const rms = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let k = f * win; k < (f + 1) * win; k++) s += d[k] * d[k]; rms[f] = Math.sqrt(s / win); }
  let peak = 0; for (const v of rms) if (v > peak) peak = v;
  if (peak < 0.003) return -1;
  const th = Math.max(0.006, peak * 0.08), step = Math.max(1, Math.floor(sr / 12000)), sr2 = sr / step; // 12kHz 쯤으로 솎아 셈(빠르게)
  const lo = Math.max(1, Math.floor(sr2 * 0.0025)), hi = Math.ceil(sr2 * 0.0125);
  const voiced = f => {
    if (rms[f] <= th) return false;
    const x = []; for (let k = f * win; k < (f + 1) * win; k += step) x.push(d[k]);
    const m = x.reduce((a, v) => a + v, 0) / x.length; for (let i = 0; i < x.length; i++) x[i] -= m;
    let best = 0;
    for (let L = lo; L <= hi && L < x.length - 8; L++) {
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i + L < x.length; i++) { xy += x[i] * x[i + L]; xx += x[i] * x[i]; yy += x[i + L] * x[i + L]; }
      const r = xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0; if (r > best) best = r;
    }
    return best >= 0.5;
  };
  const memo0 = new Int8Array(n).fill(-1), vz0 = f => (memo0[f] < 0 ? (memo0[f] = voiced(f) ? 1 : 0) : memo0[f]) === 1;
  // 시작 찾기의 「목소리」 = 자기상관 + 가장 큰 말소리에서 18dB 안(본부 10-07 투덜이 r3 — 말 앞 1초 동안 −12~−25dB 숨·옷·손 소리가 자기상관만 넘어 목소리로 잡힘 · 끝 찾기와 같은 조건)
  //   작은 첫 자음(ㅅ·ㅎ·ㅈ)은 아래 앞으로 늘리기가 살림 · 「와!」 같은 짧고 큰 첫 낱말은 18dB 안이라 그대로
  const strong = peak * Math.pow(10, -18 / 20), vz = f => rms[f] > strong && vz0(f);
  // 첫 덩어리가 짧고(목소리 0.12초 미만 · 본보기 길이를 알면 0.25초 미만이고 나머지가 본보기 말의 0.6배 넘음) 뒤에 0.35초 넘는 틈 = 앞 잡음 → 버리고 다음 덩어리부터
  const cl = clustersOf(n, vz, Math.floor((from * sr) / win));
  let dropped = false;
  while (cl.length > 1 && (ref > 0 ? cl[0].v * 0.02 < 0.25 && (cl[cl.length - 1].b - cl[1].a) * 0.02 > 0.6 * ref : cl[0].v * 0.02 < 0.12)) { cl.shift(); dropped = true; }
  let on = -1, run = 0;
  for (let f = cl.length ? cl[0].a : Math.floor((from * sr) / win); f < n; f++) { if (vz(f)) { if (++run >= 3) { on = f - 2; break; } } else run = 0; }
  if (on < 0) return -1;
  const vs = [...rms.slice(on, Math.min(n, on + 10))].sort((a, b) => a - b), vlev = vs[vs.length >> 1], noisy = vlev, soft = Math.min(th * 0.5, vlev * 0.03); // 작은 첫 소리 문턱 = 목소리 크기 기준(−30dB) — 큰 툭 때문에 전체 문턱이 올라가도 ㅈ·ㅅ 살림
  let a = on;
  const f0 = Math.max(Math.floor((floor * sr) / win), dropped ? cl[0].a - 13 : 0); // 앞 덩어리를 버렸으면 그 덩어리 쪽으로는 안 늘림 // 앞으로 늘리는 한계 = 옛 방식이 잡소리를 건너뛴 자리(건너뛰지 않았으면 0)
  for (let f = on - 1; f >= f0 && on - f <= 12 && rms[f] > soft && rms[f] < noisy; f--) a = f; // 12칸 = 0.24초
  if (on - a >= 12 && a - 1 >= f0 && rms[a - 1] > soft) a = Math.max(f0, on - 3); // 0.24초 넘게 끊김 없이 이어진 앞소리 = 첫 자음이 아니라 부스럭(진짜 ㅅ·ㅊ 은 짧고 앞이 조용함) → 목소리 앞 60ms 만 남김(ㅎ·ㅅ 자리)
  return (a * win) / sr;
}
// 말 끝(투덜이 10-06 「앞은 잘 잘려서 좋은데 뒤에 잡음은 남아 있어 — 뒤에도 똑같이」 · 투덜이 허락)
//   끝 = 마지막 「목소리 칸」(시작과 같은 자기상관 판정 · 3칸 이상 이어진 것) → 뒤로 문턱 절반 넘고 · 목소리 칸 크기보다 작고 · 영교차가 낮은(콧소리·ㄹ·「요」 꼬리) 칸만 이어서 늘림(최대 0.3초)
//   조용한 칸이나 쉬— 하는 잡음(영교차 높음 · 받침 끝소리엔 없음)·「툭」(목소리보다 큼)을 만나면 멈춤 → + post(0.12초) · 못 찾으면 녹음 끝(그대로)
export function voicedEnd(buf, post = 0.12, ref = 0) { // ref = 본보기 말 길이(초 · 알면 — 비교 화면)
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), n = Math.floor(d.length / win);
  if (n < 3) return buf.duration;
  const rms = new Float32Array(n), zc = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0, z = 0; for (let k = f * win; k < (f + 1) * win; k++) { s += d[k] * d[k]; if (k > f * win && (d[k] >= 0) !== (d[k - 1] >= 0)) z++; } rms[f] = Math.sqrt(s / win); zc[f] = z / win; }
  let peak = 0; for (const v of rms) if (v > peak) peak = v;
  if (peak < 0.003) return buf.duration;
  const th = Math.max(0.006, peak * 0.08), step = Math.max(1, Math.floor(sr / 12000)), sr2 = sr / step;
  const lo = Math.max(1, Math.floor(sr2 * 0.0025)), hi = Math.ceil(sr2 * 0.0125);
  const voiced = f => {
    if (rms[f] <= th) return false;
    const x = []; for (let k = f * win; k < (f + 1) * win; k += step) x.push(d[k]);
    const m = x.reduce((a, v) => a + v, 0) / x.length; for (let i = 0; i < x.length; i++) x[i] -= m;
    let best = 0;
    for (let L = lo; L <= hi && L < x.length - 8; L++) {
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i + L < x.length; i++) { xy += x[i] * x[i + L]; xx += x[i] * x[i]; yy += x[i + L] * x[i + L]; }
      const r = xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0; if (r > best) best = r;
    }
    return best >= 0.5;
  };
  const memo = new Int8Array(n).fill(-1), vz = f => (memo[f] < 0 ? (memo[f] = voiced(f) ? 1 : 0) : memo[f]) === 1;
  // 마지막 덩어리가 짧고(목소리 0.25초 미만) 앞 덩어리들의 말이 이미 본보기 말의 0.6배 넘으면(본보기 길이를 모르면 짧기만 보고) = 끝 잡음 → 버림(끝에서부터 되풀이)
  // 끝 찾기의 「목소리」 = 자기상관 + 가장 큰 말소리에서 18dB 안(r2: 말 뒤 숨·잡음 칸이 −15~−25dB 로 자기상관만 넘던 것 걸러냄 · 작은 받침 꼬리는 아래 늘리기가 살림)
  const strong = peak * Math.pow(10, -18 / 20), vS = f => rms[f] > strong && vz(f);
  const cl = clustersOf(n, vS);
  while (cl.length > 1 && cl[cl.length - 1].v * 0.02 < 0.25 && (!(ref > 0) || (cl[cl.length - 2].b - cl[0].a) * 0.02 > 0.6 * ref)) cl.pop();
  let last = -1;
  const top = cl.length ? cl[cl.length - 1].b : n - 1;
  for (let f = top; f >= 2; f--) if (vS(f) && vS(f - 1) && vS(f - 2)) { last = f; break; } // 3칸(60ms) 이어진 목소리 — 짧은 「툭」은 안 걸림
  if (last < 0) return buf.duration;
  const vs = [...rms.slice(Math.max(0, last - 9), last + 1)].sort((a, b) => a - b), vlev = vs[vs.length >> 1], soft = Math.min(th * 0.5, vlev * 0.03), zmax = 4000 / sr; // 영교차 초당 4000번 아래(콧소리·모음 꼬리) — 쉬— 잡음은 그보다 훨씬 많음
  let b = last;
  for (let f = last + 1; f < n && f - last <= 15 && rms[f] > soft && rms[f] < vlev && zc[f] < zmax; f++) b = f; // 15칸 = 0.3초
  return Math.min(buf.duration, ((b + 1) * win) / sr + post);
}
export function leadOf(buf, pre = 0.08, ref = 0) { // ref = 본보기 말 길이(초 · 알면)
  const old = leadOld(buf, 0), first = leadOld(buf, 0, false); // 옛 방식(앞 잡소리 → 조용한 틈 → 말)으로 먼저 건너뛴 자리부터 · first = 건너뛰기 없이 첫 소리
  const v = voicedOnset(buf, old, old > first + 1e-9 ? old : 0, ref);
  return Math.max(0, (v >= 0 ? v : old) - pre);
}
function leadOld(buf, pre = 0.08, skip = true) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
  let peak = 0; for (const v of rms) if (v > peak) peak = v;
  if (peak < 0.003) return 0;
  const th = Math.max(0.006, peak * 0.08), quiet = peak * Math.pow(10, -20 / 20), loud = peak * Math.pow(10, -8 / 20), RUN = Math.ceil(0.1 / 0.02);
  let a = rms.findIndex(v => v > th);
  if (a >= 0 && skip) { // 첫 소리 → 조용한 틈(100ms+) 뒤의 말(시각 조건 없음 — 투덜이 17:49: 첫 소리 칸이 0.16초라 0.15초 조건에 걸렸다)
    let run = 0, after = -1, head = 0;
    for (let k = a; k < rms.length; k++) { run = rms[k] < quiet ? run + 1 : 0; if (!run) head = Math.max(head, rms[k]); if (run >= RUN) { after = k + 1; break; } }
    if (head >= loud) after = -1; // 앞 소리가 말만큼 큼 = 진짜 첫 낱말
    if (after > 0) { const b = rms.findIndex((v, k) => k >= after && v > th); if (b >= 0) a = b; }
  }
  return Math.max(0, (a * win) / sr - pre);
}

// 말소리 크기 맞추기(본부 10-04: 날소리 녹음이 본보기보다 18dB 작음 — 녹음은 그대로 두고 틀 때·내려받을 때 곱하기만)
// 말소리 RMS = 20ms 칸 중 에너지가 최대 칸의 5% 넘는 칸만 평균 → g = 10^((−16 − 말소리dB)/20) · 최대 표본 × g ≤ 0.89(−1dBFS) · 1~16배
export function gainOf(buf, target = -16) {
  const d = buf.getChannelData(0), win = Math.max(1, Math.round(buf.sampleRate * 0.02)), ms = [];
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; ms.push(s / win); }
  const top = Math.max(0, ...ms); if (!(top > 0) || !(peak > 0)) return 1;
  const sp = ms.filter(e => e > top * 0.05), rms = Math.sqrt(sp.reduce((a, e) => a + e, 0) / sp.length);
  if (!(20 * Math.log10(rms) >= -45)) return 1; // 말이 없던 녹음(말소리 −45dB 아래 = 바탕 소리뿐)은 키우지 않음 — 「쉬—」 잡음만 커진다(본부 10-04)
  let g = Math.pow(10, (target - 20 * Math.log10(rms)) / 20);
  g = Math.min(g, 0.89 / peak);
  return Math.max(1, Math.min(16, g));
}

// → { pause(), done: Promise } — pause() 는 멈춤(같은 단추 다시 = 처음부터 한 번)
export function playMine(blob) {
  let src = null, el = null, stopped = false, resolve;
  const done = new Promise(r => (resolve = r));
  const h = { pause() { stopped = true; try { src?.stop(); } catch {} el?.pause(); resolve(); }, done };
  const viaAudio = () => { // 풀기 실패 → 1004.6 그대로(<audio> 처음부터)
    if (stopped) return;
    el = new Audio(URL.createObjectURL(blob));
    el.onended = el.onerror = () => { URL.revokeObjectURL(el.src); resolve(); };
    el.play().catch(() => resolve());
  };
  const ctx = audioCtx();
  blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
    if (stopped) return resolve();
    const lead = leadOf(buf), gain = gainOf(buf), end = Math.max(lead + 0.1, voicedEnd(buf)); // 끝 = 말 끝(뒤 잡음 빼기 · 투덜이 10-06)
    src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(), G = gain * (window.__sfxVolume ?? 1); // 곱하기만(압축·필터 없음) · 점검에서만 작게
    const t0 = ctx.currentTime + 0.01, len = end - lead; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(G, t0 + FADE); // 시작 15ms 페이드인
    g.gain.setValueAtTime(G, t0 + Math.max(FADE, len - FADE_OUT)); g.gain.linearRampToValueAtTime(0, t0 + len); // 끝 30ms 페이드아웃
    src.connect(g); g.connect(ctx.destination);
    src.onended = () => resolve();
    src.start(t0, lead, len);
    (window.__mineLog ||= []).push({ lead: Math.round(lead * 100) / 100, end: Math.round(end * 100) / 100, dur: Math.round(buf.duration * 100) / 100, gain: Math.round(gain * 100) / 100 });
  }).catch(viaAudio);
  h.paused = false; done.then(() => { h.paused = true; });
  return h;
}
