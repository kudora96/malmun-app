// [내 목소리] 앞 잡음 자르기 점검(본부 10-06 투덜이 「손에 든 마이크 — 앞 툭·부스럭」) — 앱을 연 채로 실행(소리 안 남)
// 본보기 mp3 를 말소리로 쓰고 앞에 잡음을 붙여 js/playmine.js leadOf 시작점을 본다 · 말 시작 = align.json 첫 음절 s
//  ⓐ 큰 툭(50ms 충격 · 말보다 큼) + 틈 30ms  ⓑ 부스럭(백색 잡음 0.4초 · 말과 같은 크기) 바로 이어 말  ⓒ 잡음 없음(앞 0.3초 조용)
//  ⓓ ㅅ·ㅈ 으로 시작하는 말(ⓒ 꼴) — 첫 자음 안 잘림
// 통과: 시작점 = 말 시작 −0.1초 ±0.05 (= 말 시작 0.05~0.15초 앞)
(async () => {
  const v = document.documentElement.dataset.v, { leadOf, voicedEnd } = await import(`/js/playmine.js?v=${v}`);
  const al = await (await fetch(`/data/L01-00-01/L01-00-01.align.json?${Date.now()}`)).json();
  const SR = 44100, ctx = new OfflineAudioContext(1, SR, SR), res = [];
  const load = async k => { const it = al.items[k]; const ab = await (await fetch(it.file.replace(/^.*?media/, "/media").replace(/\\/g, "/"))).arrayBuffer(); return { it, d: (await ctx.decodeAudioData(ab)).getChannelData(0) }; };
  const buf = arr => ({ sampleRate: SR, duration: arr.length / SR, getChannelData: () => arr });
  const rmsOf = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const peakOf = d => { let p = 0; for (const x of d) p = Math.max(p, Math.abs(x)); return p; };
  const cat = (...parts) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Float32Array(n); let at = 0; for (const p of parts) { o.set(p, at); at += p.length; } return o; };
  const zeros = s => new Float32Array(Math.round(s * SR));
  const thud = (amp) => { const n = Math.round(0.05 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (Math.random() * 2 - 1) * amp * Math.exp(-i / (0.012 * SR)) + Math.sin(i / SR * 2 * Math.PI * 45) * amp * 0.6 * Math.exp(-i / (0.02 * SR)); return o; };
  const rustle = (rms) => { const n = Math.round(0.4 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (Math.random() * 2 - 1) * rms * Math.sqrt(3); return o; };
  const check = (name, arr, truth) => { const l = leadOf(buf(arr)), ok = l >= truth - 0.15 - 1e-6 && l <= truth - 0.05 + 1e-6; res.push(`${ok ? "✓" : "✗"} ${name} → 시작 ${l.toFixed(2)}초 · 말 시작 ${truth.toFixed(2)} · 앞 ${(truth - l).toFixed(2)}초`); };
  for (const k of ["L01-00-01_01_p01", "L01-00-01_13_p02", "L01-00-01_09_p03", "L01-00-01_05_say"]) {
    const { it, d } = await load(k), s0 = it.syl[0].s, cut = Math.max(0, Math.round((s0 - 0.02) * SR)), sp = d.slice(cut);
    const speechRms = rmsOf(d, Math.round(s0 * SR), Math.round(Math.min(it.dur, s0 + 0.6) * SR)), pk = peakOf(d);
    check(`ⓐ 큰 툭+틈 30ms · ${it.text}`, cat(zeros(0.3), thud(Math.min(0.99, pk * 1.6)), zeros(0.03), sp), 0.3 + 0.05 + 0.03 + 0.02);
    check(`ⓑ 부스럭 0.4초(말과 같은 크기) 바로 말 · ${it.text}`, cat(zeros(0.2), rustle(speechRms), sp), 0.2 + 0.4 + 0.02);
    check(`ⓒ 잡음 없음 · ${it.text}`, cat(zeros(0.3), d), 0.3 + s0);
  }
  for (const k of ["L01-00-01_12_p02", "L01-00-01_02_p01", "L01-00-01_10_p02", "L01-00-01_08_p01", "L01-00-01_02_p02", "L01-00-01_14_p01"]) {
    const { it, d } = await load(k);
    check(`ⓓ 첫 자음 ${it.syl[0].ch} · ${it.text}`, cat(zeros(0.3), d), 0.3 + it.syl[0].s);
  }
  // 뒤 잡음(투덜이 10-06) — 끝 = 마지막 음절 끝(e) 뒤 0.05~0.5초 · ⓔ1 말 + 0.5초 뒤 툭 → 툭 앞에서 끝 · ⓔ2 말 끝에 바로 부스럭 0.4초 → 부스럭 대부분 빠짐 · ⓔ3 받침·「요」 꼬리 안 잘림
  const endCheck = (name, arr, eTruth, maxEnd) => { const e = voicedEnd(buf(arr)), ok = e >= eTruth + 0.05 - 1e-6 && e <= Math.min(maxEnd ?? 1e9, eTruth + 0.5); res.push(`${ok ? "✓" : "✗"} ${name} → 끝 ${e.toFixed(2)}초 · 마지막 음절 끝 ${eTruth.toFixed(2)} · 뒤 ${(e - eTruth).toFixed(2)}초`); };
  for (const k of ["L01-00-01_13_p02", "L01-00-01_10_p03", "L01-00-01_01_p02", "L01-00-01_02_p01", "L01-00-01_09_p02", "L01-00-01_07_p02"]) {
    const { it, d } = await load(k), eT = it.syl[it.syl.length - 1].e, pk = peakOf(d);
    const thudAt = d.length / SR + 0.5;
    endCheck(`ⓔ1 말 + 0.5초 뒤 툭 · ${it.text}`, cat(d, zeros(0.5), thud(Math.min(0.99, pk * 1.6)), zeros(0.3)), eT, thudAt - 0.05);
    const cutN = Math.round(Math.min(it.dur, eT + 0.06) * SR), sp = d.slice(0, cutN), rmsS = rmsOf(d, Math.round(it.syl[0].s * SR), Math.round(eT * SR));
    endCheck(`ⓔ2 말 끝에 바로 부스럭 0.4초 · ${it.text}`, cat(sp, rustle(rmsS), zeros(0.3)), eT, eT + 0.06 + 0.2);
    endCheck(`ⓔ3 잡음 없음(끝 안 잘림) · ${it.text}`, cat(d, zeros(0.3)), eT);
  }
  // 투덜이 실제 녹음(13번 2/4 「우리도 읽을 수 있어요」 · tools/_rec — 깃에 안 올림) — r1 그대로 · r2 끝 뒤 말만큼 큰 손 잡음 빠짐 · r3 말 앞 1초 숨·손 잡음 빠짐(본보기 길이 알 때·모를 때)
  { const A = al.items["L01-00-01_13_p02"].syl, ref = A[A.length - 1].e - A[0].s;
    for (const [f, lo, hi, e0, e1] of [["r1", 1.74, 1.94, 3.3, 3.6], ["r2", 1.54, 1.74, 3.15, 3.45], ["r3", 1.90, 2.06, 3.2, 3.6]]) {
      const r = await fetch(`/tools/_rec/${f}.webm`); if (!r.ok) { res.push(`· ${f}.webm 없음(건너뜀)`); continue; }
      const b2 = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(await r.arrayBuffer());
      for (const rf of [ref, 0]) { const l = leadOf(b2, 0.08, rf) + 0.08, e = voicedEnd(b2, 0.12, rf), ok = l >= lo && l <= hi && e >= e0 && e <= e1;
        res.push(`${ok ? "✓" : "✗"} 실제 녹음 ${f}(본보기 길이 ${rf ? "앎" : "모름"}) → 말 시작 ${l.toFixed(2)}(기대 ${lo + 0.1}) · 끝 ${e.toFixed(2)}(기대 ${e0}~${e1})`); }
    }
    // 말 사이 긴 쉼이 있는 본보기(「그럼 우리는요? … 우리도 읽을 수 있어요?」) — 끝 안 잘림
    const { it, d } = await load("L01-00-01_13_line"), eT = it.syl[it.syl.length - 1].e, rf2 = eT - it.syl[0].s;
    for (const rf of [rf2, 0]) endCheck(`ⓔ4 긴 쉼 있는 줄(본보기 길이 ${rf ? "앎" : "모름"}) · ${it.text}`, cat(d, zeros(0.3)), eT); }
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 앞·뒤 잡음 자르기 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
