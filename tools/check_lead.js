// [내 목소리] 시작점(js/playmine.js leadOf) 점검 — node tools/check_lead.js
// 합성한 녹음 꼴마다 시작점이 맞는지(본부 10-04 투덜이 17:49 녹음 포락선 포함)
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "js", "playmine.js"), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const leadOf = new Function(src + "; return leadOf;")();
const sr = 44100;
const fromEnv = env => { // 50ms 칸마다 그 dB 의 소리(z 잡소리 480Hz · n 잡음 · s 말 220Hz)
  const w = Math.round(sr * 0.05), d = new Float32Array(w * env.length);
  env.forEach(([db, kind], j) => { const a = Math.pow(10, db / 20); for (let i = 0; i < w; i++) { const t = (j * w + i) / sr; d[j * w + i] = kind === "n" ? (Math.random() * 2 - 1) * a * Math.sqrt(3) : Math.sin(t * 2 * Math.PI * (kind === "z" ? 480 : 220)) * a * Math.SQRT2; } });
  return { sampleRate: sr, getChannelData: () => d };
};
const mk = f => { const d = new Float32Array(sr * 4); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = f(t) + (Math.random() * 2 - 1) * 0.0003; } return { sampleRate: sr, getChannelData: () => d }; };
const speech = (t, at, dur = 1.5) => (t >= at && t < at + dur ? Math.sin(t * 2 * Math.PI * 220) * 0.08 : 0);
const tail = t => (t < 0.35 ? Math.sin(t * 2 * Math.PI * 360) * 0.03 * Math.exp(-t * 8) : 0);
const real = [...[-45, -50, -47, -42, -42, -46].map(x => [x, "z"]),
  ...[-49, -53, -54, -57, -61, -60, -63, -64, -65, -64, -63, -61, -61, -60, -64, -62, -59, -57, -57, -59, -63, -65, -62, -63, -61, -56, -57, -54].map(x => [x, "n"]),
  ...[-34, -35, -41, -39, -47, -42, -32, -33, -32, -30, -31, -33, -36, -38, -35, -33, -34, -40, -45, -55, -62, -63, -64, -63].map(x => [x, "s"])];
const cases = [
  ["투덜이 17:49 녹음 포락선(잡소리 −42 → 틈 −53~−65 → 말 1.70)", fromEnv(real), 1.62],
  ["잡소리 → 조용 → 말 1.20", mk(t => tail(t) + speech(t, 1.2)), 1.12],
  ["무음 → 말 2.20(17:37 꼴)", mk(t => speech(t, 2.2)), 2.12],
  ["0초부터 바로 말", mk(t => speech(t, 0)), 0],
  ["잡소리 바로 뒤 말(틈 없음)", mk(t => tail(t) + speech(t, 0.15)), 0],
  ["바로 말하고 낱말 사이 0.25초 쉼(첫 낱말 건너뛰지 않음)", mk(t => speech(t, 0, 0.6) + speech(t, 0.85, 1.0)), 0],
];
let bad = 0;
for (const [name, buf, want] of cases) { const got = leadOf(buf); const ok = Math.abs(got - want) <= 0.03; if (!ok) bad++; console.log(`${ok ? "✓" : "✗"} ${name} → ${got.toFixed(2)}초(기대 ${want})`); }
process.exit(bad ? 1 : 0);
