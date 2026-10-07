// 리듬 점수 점검(본부 10-06 · 투덜이 허락) — 앱을 연 채로 실행 · 소리 안 남
// 본보기(13번 2/4 「우리도 읽을 수 있어요」)를 내 목소리로: ⓐ 그대로 → R ≥ 0.97 · ⓑ 0.8배·1.25배 빠르기 → R ≥ 0.9 · ⓒ 「있」 앞에 0.4초 틈 → R 0.7~0.88(쉼으로 짚음)
// ⓓ 투덜이 실제 녹음 r1~r3(tools/_rec · 깃에 안 올림) 값 보고 · ⓔ 배수 식(내림 · 글자 100 · 문턱 0.85(10-07) · R 0.8 → 98 · 0.7 → 95 · 0.6 → 92 · 0.849 → 99 · 0.85 → 100 · 0.3 → 88)
// ⓖ 더듬음 놓치지 않기(본부 10-07) — 「나」를 본보기의 2.5배로 끌기 → 감점(「나」 길다) · 「이이있어요」(들은 말) → 「있」 더듬음 문구 · 100 아님
// ⓕ 끝 늘임(본부 10-07 투덜이 「본보기가 끝을 끌면 100 을 못 넘음」) — 본보기 그대로인데 마지막 음절만 여운을 잘라 짧게 → 100 · ⓒ 「있」 앞 0.4초 멈춤 → 여전히 깎임(93~97)
(async () => {
  const v = document.documentElement.dataset.v, { prepare, rhythmScore, withRhythm, loadAlign } = await import(`/js/rhythm.js?v=${v}`);
  const res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const al = await loadAlign("L01-00-01"), key = "L01-00-01_13_p02", it = al.items[key], text = it.text;
  const ctx = new OfflineAudioContext(1, 44100, 44100), dec = async u => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
  const mbuf = await dec("/media/audio/L01-00-01/units/L01-00-01_13_p02.mp3"), sr = mbuf.sampleRate;
  const R = (ybuf, mb = mbuf, k2 = key, heard) => { const pr = prepare({ al, key: k2, text: al.items[k2].text, mbuf: mb, ybuf }); return { ...rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf: mb, ybuf, ends: pr.ends, heard, groups: pr.groups }), pr }; };
  const speed = async r => { const oc = new OfflineAudioContext(1, Math.ceil((mbuf.length / r)) + 10, sr), s = oc.createBufferSource(); s.buffer = mbuf; s.playbackRate.value = r; s.connect(oc.destination); s.start(); return oc.startRendering(); };
  const a = R(mbuf); ok(a.R >= 0.97, "ⓐ 본보기 = 내 목소리 → R ≥ 0.97", `R ${a.R.toFixed(3)}`);
  for (const r of [0.8, 1.25]) { const b = R(await speed(r)); ok(b.R >= 0.9, `ⓑ ${r}배 빠르기 → R ≥ 0.9`, `R ${b.R.toFixed(3)}`); }
  { const k = it.syl.findIndex(x => x.ch === "있"), at = Math.round(it.syl[k].s * sr), d = mbuf.getChannelData(0), gap = Math.round(0.4 * sr);
    const nb = ctx.createBuffer(1, d.length + gap, sr), x = nb.getChannelData(0); x.set(d.subarray(0, at), 0); x.set(d.subarray(at), at + gap);
    const c = R(nb), sc = withRhythm(100, c.R); ok(sc < 100 && c.worst?.kind === "pause", "ⓒ 「있」 앞 0.4초 틈 → 100 아님 · 쉼으로 짚음", `R ${c.R.toFixed(3)} · ${sc}점 · ${c.worst?.kind} 「${c.worst?.ch}」`); }
  // ⓕ 끝을 끄는 본보기(15번 2/8 「하고 싶었던 거구나」 · 13번 2/4) — 내 것 = 본보기에서 마지막 음절 여운만 자름(음절 길이 45%에서 30ms 줄여 끝냄)
  for (const k2 of ["L01-00-01_15_p02", key]) {
    const it2 = al.items[k2]; if (!it2) { res.push(`· ${k2} 정렬 없음(건너뜀)`); continue; }
    const mb = k2 === key ? mbuf : await dec(`/media/audio/L01-00-01/units/${k2}.mp3`), L = it2.syl[it2.syl.length - 1], cut = Math.round((L.s + 0.45 * (L.e - L.s)) * mb.sampleRate), f = Math.round(0.03 * mb.sampleRate);
    const nb = ctx.createBuffer(1, cut + Math.round(0.3 * mb.sampleRate), mb.sampleRate), x = nb.getChannelData(0), d = mb.getChannelData(0); for (let i = 0; i < cut; i++) x[i] = d[i] * Math.min(1, (cut - i) / f);
    const a0 = R(mb, mb, k2), b0 = R(nb, mb, k2);
    if (k2 !== key) { // ⓖ 「나」 2.5배 끌기 — 모음 가운데 조각을 되풀이해 늘임
      const sr2 = mb.sampleRate, s0 = Math.round((L.s + 0.35 * (L.e - L.s)) * sr2), s1 = Math.round((L.s + 0.6 * (L.e - L.s)) * sr2), add = Math.round(1.5 * (L.e - L.s) * sr2), e0 = Math.round(L.e * sr2);
      const lb = ctx.createBuffer(1, d.length + add, sr2), y = lb.getChannelData(0); y.set(d.subarray(0, s1), 0); for (let i = 0; i < add; i++) y[s1 + i] = d[s0 + (i % (s1 - s0))]; y.set(d.subarray(s1), s1 + add);
      const g = R(lb, mb, k2); ok(withRhythm(100, g.R) < 100 && g.worst?.k === it2.syl.length - 1 && g.worst?.kind === "long", `ⓖ 「${L.ch}」 2.5배 끌기 → 감점(「${L.ch}」 길다)`, `R ${g.R.toFixed(3)} → ${withRhythm(100, g.R)}점 · ${g.worst?.kind} 「${g.worst?.ch}」 ${g.worst?.a?.toFixed(2)}→${g.worst?.b?.toFixed(2)}초`);
    } ok(withRhythm(100, b0.R) === 100, `ⓕ 끝 짧게(본보기 끝 길게) · ${it2.text} → 100`, `그대로 R ${a0.R.toFixed(3)} · 끝 짧게 R ${b0.R.toFixed(3)} → ${withRhythm(100, b0.R)}점 · 끝 「${L.ch}」 ${(L.e - L.s).toFixed(2)}초 → ${(0.45 * (L.e - L.s)).toFixed(2)}초`);
  }
  for (const f of ["r1", "r2", "r3"]) {
    const r = await fetch(`/tools/_rec/${f}.webm`); if (!r.ok) { res.push(`· ${f}.webm 없음(건너뜀)`); continue; }
    const yb = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r.arrayBuffer()), d = R(yb);
    res.push(`· 실제 녹음 ${f}: R ${d.R.toFixed(3)} · 배수 ${(withRhythm(100, d.R))}/100 · 가장 많이 깎인 곳 ${d.worst ? `${d.worst.kind} 「${d.worst.ch}」` : "없음"} · 내 음절 ${d.pr.ysyl.map(x => x.ch + x.s.toFixed(2)).join(" ")} · 가장 짧은 칸 ${Math.min(...d.pr.ysyl.map(x => x.e - x.s)).toFixed(3)}초`);
  }
  { const h = R(mbuf, mbuf, key, "우리도 읽을 수 이이있어요"), h2 = R(mbuf, mbuf, key, "우리도 읽을 수 있어요"); ok(h.worst?.kind === "stutter" && h.worst?.ch === "있" && withRhythm(100, h.R) < 100 && withRhythm(100, h2.R) === 100, "ⓖ 「이이있어요」 → 「있」 더듬음 · 100 아님(같은 녹음 · 들은 말 바르면 100)", `R ${h.R.toFixed(3)} → ${withRhythm(100, h.R)}점 · ${h.worst?.kind} 「${h.worst?.ch}」 · 바른 말 ${withRhythm(100, h2.R)}`); }
  { // ⓗ 모든 토막: 본보기를 내 목소리로 → 100점(10-07 — 「거구나」 뒤 본보기 쉼을 더듬음으로 잡던 것)
    const bad = []; let n = 0;
    for (const [k2, it2] of Object.entries(al.items)) { if (!it2.syl || it2.syl.length < 2 || !it2.file) continue;
      let mb; try { mb = await dec(it2.file.replace(/^.*?media/, "/media").split(String.fromCharCode(92)).join("/")); } catch { continue; }
      const r2 = R(mb, mb, k2, it2.text); n++; if (withRhythm(100, r2.R) < 100) bad.push(`${k2} R ${r2.R.toFixed(3)} ${r2.worst?.kind} 「${r2.worst?.ch}」`); }
    ok(n > 50 && !bad.length, `ⓗ 모든 토막 본보기 = 내 목소리 → 100점(${n}토막)`, bad.slice(0, 5).join(" · ") || "모두 100"); }
  { // ⓙ 긴 줄 = 낱말 단위 리듬(본부 10-07 · 투덜이 허락) — 15번 줄 전체
    const k3 = "L01-00-01_15_line", it3 = al.items[k3], mb3 = await dec(it3.file.replace(/^.*?media/, "/media").split(String.fromCharCode(92)).join("/")), sr3 = mb3.sampleRate;
    const self = R(mb3, mb3, k3); ok(withRhythm(100, self.R) === 100, "ⓙ 긴 줄 본보기 = 내 목소리 → 100(낱말 단위)", `R ${self.R.toFixed(3)}`);
    // 「세종대왕이」만 2배 길게(그 구간을 0.5배 빠르기로) → 그 낱말이 가장 나쁨(주황)
    const sy = it3.syl, w0 = sy.findIndex(x => x.ch === "세"), w1 = w0 + 4, a0 = Math.round(sy[w0].s * sr3), a1 = Math.round(sy[w1].e * sr3), d3 = mb3.getChannelData(0);
    const seg = ctx.createBuffer(1, a1 - a0, sr3); seg.getChannelData(0).set(d3.subarray(a0, a1));
    const oc = new OfflineAudioContext(1, (a1 - a0) * 2 + 10, sr3), so = oc.createBufferSource(); so.buffer = seg; so.playbackRate.value = 0.5; so.connect(oc.destination); so.start(); const slow = (await oc.startRendering()).getChannelData(0);
    const nb3 = ctx.createBuffer(1, d3.length - (a1 - a0) + slow.length, sr3), y3 = nb3.getChannelData(0); y3.set(d3.subarray(0, a0), 0); y3.set(slow, a0); y3.set(d3.subarray(a1), a0 + slow.length);
    const st3 = R(nb3, mb3, k3); ok(st3.worst?.ch === "세종대왕이" && st3.worst?.kind === "long", "ⓙ 「세종대왕이」만 2배 길게 → 그 낱말이 가장 나쁨(길다)", `R ${st3.R.toFixed(3)} → ${withRhythm(100, st3.R)}점 · ${st3.worst?.kind} 「${st3.worst?.ch}」 ${st3.worst?.a?.toFixed(2)}→${st3.worst?.b?.toFixed(2)}초`);
    const r4 = await fetch("/tools/_rec/r4.webm"); if (r4.ok) { const yb4 = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r4.arrayBuffer()), d4 = R(yb4, mb3, k3);
      res.push(`· 투덜이 r4(15번 줄): R ${d4.R.toFixed(3)} → ${withRhythm(100, d4.R)}점 · 가장 나쁜 낱말 ${d4.worst ? `${d4.worst.kind} 「${d4.worst.ch}」 ${d4.worst.a?.toFixed(2)}→${d4.worst.b?.toFixed(2)}초` : "없음"}`); } else res.push("· r4.webm 없음"); }
  ok(withRhythm(100, 0.8) === 98 && withRhythm(100, 0.7) === 95 && withRhythm(100, 0.6) === 92 && withRhythm(100, 0.849) === 99 && withRhythm(100, 0.85) === 100 && withRhythm(100, 0.95) === 100 && withRhythm(100, 0.3) === 88 && withRhythm(80, 0.95) === 80, "ⓔ 배수 식(내림: 100·0.8→98 · 0.7→95 · 0.6→92 · 0.849→99 · ≥0.85→그대로 · <0.5→88)", [0.8, 0.7, 0.6, 0.849, 0.85].map(r => withRhythm(100, r)).join(","));
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 리듬 ${res.filter(x => x.startsWith("✓")).length}/${res.filter(x => /^[✓✗]/.test(x)).length}\n` + res.join("\n");
  console.log(out); return out;
})();
