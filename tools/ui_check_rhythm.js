// 리듬 점수 점검(본부 10-06 · 투덜이 허락) — 앱을 연 채로 실행 · 소리 안 남
// 본보기(13번 2/4 「우리도 읽을 수 있어요」)를 내 목소리로: ⓐ 그대로 → R ≥ 0.97 · ⓑ 0.8배·1.25배 빠르기 → R ≥ 0.9 · ⓒ 「있」 앞에 0.4초 틈 → R 0.7~0.88(쉼으로 짚음)
// ⓓ 투덜이 실제 녹음 r1·r2(tools/_rec · 깃에 안 올림) 값 보고 · ⓔ 배수 식(내림 · 글자 100 · R 0.8 → 97 · 0.7 → 95 · 0.6 → 92 · 0.899 → 99 · 0.9 → 100 · 0.3 → 88)
(async () => {
  const v = document.documentElement.dataset.v, { prepare, rhythmScore, withRhythm, loadAlign } = await import(`/js/rhythm.js?v=${v}`);
  const res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const al = await loadAlign("L01-00-01"), key = "L01-00-01_13_p02", it = al.items[key], text = it.text;
  const ctx = new OfflineAudioContext(1, 44100, 44100), dec = async u => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
  const mbuf = await dec("/media/audio/L01-00-01/units/L01-00-01_13_p02.mp3"), sr = mbuf.sampleRate;
  const R = ybuf => { const pr = prepare({ al, key, text, mbuf, ybuf }); return { ...rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf, ybuf }), pr }; };
  const speed = async r => { const oc = new OfflineAudioContext(1, Math.ceil((mbuf.length / r)) + 10, sr), s = oc.createBufferSource(); s.buffer = mbuf; s.playbackRate.value = r; s.connect(oc.destination); s.start(); return oc.startRendering(); };
  const a = R(mbuf); ok(a.R >= 0.97, "ⓐ 본보기 = 내 목소리 → R ≥ 0.97", `R ${a.R.toFixed(3)}`);
  for (const r of [0.8, 1.25]) { const b = R(await speed(r)); ok(b.R >= 0.9, `ⓑ ${r}배 빠르기 → R ≥ 0.9`, `R ${b.R.toFixed(3)}`); }
  { const k = it.syl.findIndex(x => x.ch === "있"), at = Math.round(it.syl[k].s * sr), d = mbuf.getChannelData(0), gap = Math.round(0.4 * sr);
    const nb = ctx.createBuffer(1, d.length + gap, sr), x = nb.getChannelData(0); x.set(d.subarray(0, at), 0); x.set(d.subarray(at), at + gap);
    const c = R(nb); ok(c.R >= 0.7 && c.R <= 0.88 && c.worst?.kind === "pause", "ⓒ 「있」 앞 0.4초 틈 → R 0.7~0.88 · 쉼으로 짚음", `R ${c.R.toFixed(3)} · ${c.worst?.kind} 「${c.worst?.ch}」`); }
  for (const f of ["r1", "r2", "r3"]) {
    const r = await fetch(`/tools/_rec/${f}.webm`); if (!r.ok) { res.push(`· ${f}.webm 없음(건너뜀)`); continue; }
    const yb = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r.arrayBuffer()), d = R(yb);
    res.push(`· 실제 녹음 ${f}: R ${d.R.toFixed(3)} · 배수 ${(withRhythm(100, d.R))}/100 · 가장 많이 깎인 곳 ${d.worst ? `${d.worst.kind} 「${d.worst.ch}」` : "없음"} · 내 음절 ${d.pr.ysyl.map(x => x.ch + x.s.toFixed(2)).join(" ")}`);
  }
  ok(withRhythm(100, 0.8) === 97 && withRhythm(100, 0.7) === 95 && withRhythm(100, 0.6) === 92 && withRhythm(100, 0.899) === 99 && withRhythm(100, 0.9) === 100 && withRhythm(100, 0.95) === 100 && withRhythm(100, 0.3) === 88 && withRhythm(80, 0.95) === 80, "ⓔ 배수 식(내림: 100·0.8→97 · 0.7→95 · 0.6→92 · 0.899→99 · ≥0.9→그대로 · <0.5→88)", [0.8, 0.7, 0.6, 0.899, 0.9].map(r => withRhythm(100, r)).join(","));
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 리듬 ${res.filter(x => x.startsWith("✓")).length}/${res.filter(x => /^[✓✗]/.test(x)).length}\n` + res.join("\n");
  console.log(out); return out;
})();
