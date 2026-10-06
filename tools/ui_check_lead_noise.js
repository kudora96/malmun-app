// [내 목소리] 앞 잡음 자르기 점검(본부 10-06 투덜이 「손에 든 마이크 — 앞 툭·부스럭」) — 앱을 연 채로 실행(소리 안 남)
// 본보기 mp3 를 말소리로 쓰고 앞에 잡음을 붙여 js/playmine.js leadOf 시작점을 본다 · 말 시작 = align.json 첫 음절 s
//  ⓐ 큰 툭(50ms 충격 · 말보다 큼) + 틈 30ms  ⓑ 부스럭(백색 잡음 0.4초 · 말과 같은 크기) 바로 이어 말  ⓒ 잡음 없음(앞 0.3초 조용)
//  ⓓ ㅅ·ㅈ 으로 시작하는 말(ⓒ 꼴) — 첫 자음 안 잘림
// 통과: 시작점 = 말 시작 −0.1초 ±0.05 (= 말 시작 0.05~0.15초 앞)
(async () => {
  const v = document.documentElement.dataset.v, { leadOf } = await import(`/js/playmine.js?v=${v}`);
  const al = await (await fetch(`/data/L01-00-01/L01-00-01.align.json?${Date.now()}`)).json();
  const SR = 44100, ctx = new OfflineAudioContext(1, SR, SR), res = [];
  const load = async k => { const it = al.items[k]; const ab = await (await fetch(it.file.replace(/^.*?media/, "/media").replace(/\\/g, "/"))).arrayBuffer(); return { it, d: (await ctx.decodeAudioData(ab)).getChannelData(0) }; };
  const buf = arr => ({ sampleRate: SR, getChannelData: () => arr });
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
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 앞 잡음 자르기 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
