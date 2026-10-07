// 「말하는 중에 끊김」 점검(투덜이 10-07 — 마이크 최대 −31~−34dB 에서 3~4초에 끊김) — 앱을 연 채로 실행 · 소리 안 남
// 녹음 r1~r3(tools/_rec) 을 그대로 + 투덜이 그날 마이크 크기(진단 maxDb −31~−34 = 60ms 칸 rms 최대 0.025·0.019)로 줄여 넣고 60ms 마다 1024 샘플 rms → 옛 규칙(0.02 고정)·새 규칙(방 소음 3배 · 0.004~0.02)으로 「2초 조용 → 끝」 시각을 셈
// 통과: 새 규칙은 말 끝(voicedEnd) 전에 끊지 않음 · 너무 오래 붙잡지 않음(옛 규칙 끝 또는 말 끝+2초 에서 1.5초 안)
// ⓩ 투덜이 그날 경우 재현: 앞 구(rms 최대 0.025) + 0.5초 쉼 + 뒤 구를 작게(rms 최대 0.015) — 옛 규칙은 뒤 구 중간에 끊음 · 새 규칙은 끝까지
(async () => {
  const v = document.documentElement.dataset.v, { voicedEnd } = await import(`/js/playmine.js?v=${v}`), res = [];
  const sim = (d, sr, g, rule) => { const N = 1024, step = Math.round(0.06 * sr); let spoke = false, quietAt = 0, noise = 0, t0 = -1;
    for (let i = 0; i + N <= d.length; i += step) { let s = 0; for (let k = i; k < i + N; k++) s += (d[k] * g) ** 2; const rms = Math.sqrt(s / N), t = i / sr;
      if (!spoke && rms < 0.02) noise = noise ? noise * 0.9 + rms * 0.1 : rms;
      const thr = rule === "old" ? 0.02 : Math.min(0.02, Math.max(0.004, noise * 3));
      if (rms > thr) { if (!spoke) t0 = t; spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= t; if (t - quietAt > 2) return { stop: t, t0 }; } }
    return { stop: d.length / sr, t0, never: true }; };
  for (const f of ["r1", "r2", "r3"]) {
    const r = await fetch(`/tools/_rec/${f}.webm`); if (!r.ok) { res.push(`· ${f} 없음`); continue; }
    const b = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r.arrayBuffer()), sr = b.sampleRate, d0 = b.getChannelData(0), end = voicedEnd(b, 0.12);
    const d = new Float32Array(d0.length + Math.round(4 * sr)); d.set(d0); // 뒤에 4초 조용
    let pk = 0; for (let i = 0; i + 1024 <= d0.length; i += 512) { let s = 0; for (let k = i; k < i + 1024; k++) s += d0[k] ** 2; pk = Math.max(pk, Math.sqrt(s / 1024)); }
    for (const g of [1, 0.025 / pk, 0.019 / pk]) { const o = sim(d, sr, g, "old"), n = sim(d, sr, g, "new"), ok = n.stop >= end && n.stop <= Math.max(o.stop, end + 2) + 1.5;
      res.push(`${ok ? "✓" : "✗"} ${f} rms 최대 ${(20 * Math.log10(pk * g)).toFixed(1)}dB · 말 끝 ${end.toFixed(2)}초 → 옛 규칙 끝 ${o.stop.toFixed(2)}${o.stop < end ? "(말 중 끊김)" : ""} · 새 규칙 끝 ${n.stop.toFixed(2)}`); }
  }
  { const r = await fetch(`/tools/_rec/r1.webm`); if (r.ok) {
    const b = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r.arrayBuffer()), sr = b.sampleRate, d0 = b.getChannelData(0), s0 = Math.round(1.7 * sr), s1 = Math.round(3.6 * sr), sp = d0.subarray(s0, s1);
    let pk = 0; for (let i = 0; i + 1024 <= sp.length; i += 512) { let s = 0; for (let k = i; k < i + 1024; k++) s += sp[k] ** 2; pk = Math.max(pk, Math.sqrt(s / 1024)); }
    const parts = [[0.5, 0], [0.025, 1], [0.5, 0], [0.015, 1], [0.5, 0], [0.015, 1], [4, 0]], L = parts.reduce((a, [x, k]) => a + (k ? sp.length : Math.round(x * sr)), 0), d = new Float32Array(L); let at = 0, end = 0;
    for (const [x, k] of parts) { if (k) { for (let i = 0; i < sp.length; i++) d[at + i] = sp[i] * (x / pk); at += sp.length; end = at / sr; } else at += Math.round(x * sr); }
    const o = sim(d, sr, 1, "old"), n = sim(d, sr, 1, "new"), ok = o.stop < end && n.stop >= end && n.stop <= end + 2.5;
    res.push(`${ok ? "✓" : "✗"} ⓩ 앞 구 크게 + 뒤 두 구 작게(rms 최대 −36.5dB) · 말 끝 ${end.toFixed(2)}초 → 옛 규칙 끝 ${o.stop.toFixed(2)}${o.stop < end ? "(말 중 끊김)" : ""} · 새 규칙 끝 ${n.stop.toFixed(2)}`); } }
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 말하는 중 안 끊김 ${res.length - bad}/${res.length}\n` + res.join("\n"); console.log(out); return out;
})();
