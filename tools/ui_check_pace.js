// 따라 읽기 칠 점검(본부 10-07 「칠을 그대로 따라 하면 100이 안 나옴」) — 앱을 연 채로 실행 · 소리 안 남
// 모든 토막: 본보기 소리를 칠 시각(rhythm.js paceOf — 음절 시작 = 본보기 시각 × 배수)대로 늘인 가짜 녹음 → R ≥ 0.9 · 100점
//  배수 = 1.15(기본 · 통과 조건) · 1.15/0.75 ≈ 1.53(본보기 속도 0.75× · 보고만 — 아주 느리면 첫 음절 시작 잡기가 점수 쪽 문제 · 고치려면 투덜이 허락) · 대조: 옛 칠(글자마다 고른 길이)대로 → 몇 토막은 100 아님(원인 확인용 · 보고만)
//  늘이기 = WSOLA(음높이·목소리 결 그대로) — 칠 시각을 마디로 한 구간별 직선 시각 대응
(async () => {
  const v = document.documentElement.dataset.v, { prepare, rhythmScore, withRhythm, loadAlign, paceOf, PACE_L0 } = await import(`/js/rhythm.js?v=${v}`);
  const res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const ep = "L01-00-01", al = await loadAlign(ep), ctx = new OfflineAudioContext(1, 44100, 44100), dec = async u => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
  const R = (ybuf, mb, k2) => { const pr = prepare({ al, key: k2, text: al.items[k2].text, mbuf: mb, ybuf }); return rhythmScore({ msyl: pr.msyl, ysyl: pr.ysyl, mbuf: mb, ybuf, ends: pr.ends, groups: pr.groups }); };
  // 마디 [입력 초, 출력 초] → 겹쳐 더하기로 늘인 소리
  const stretch = (mb, knots) => {
    const sr = mb.sampleRate, x = mb.getChannelData(0), N = 1024, H = 256, last = knots[knots.length - 1], outDur = last[1] + (mb.duration - last[0]);
    const inv = t => { if (t <= knots[0][1]) return t - knots[0][1] + knots[0][0]; for (let i = 1; i < knots.length; i++) if (t <= knots[i][1]) { const [a0, b0] = knots[i - 1], [a1, b1] = knots[i]; return a0 + ((a1 - a0) * (t - b0)) / Math.max(1e-6, b1 - b0); } return last[0] + (t - last[1]); };
    const L = Math.ceil(outDur * sr) + N, y = new Float32Array(L), ws = new Float32Array(L), w = Float32Array.from({ length: N }, (_, j) => 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
    // WSOLA — 목표 자리 ±10ms 안에서 앞 조각의 자연스러운 이음(prev + H)과 가장 닮은 곳을 골라 붙임(목소리 주기 살림 · 그냥 OLA 는 목소리 판정이 깨짐)
    const D = Math.round(0.01 * sr), at = i => (i >= 0 && i < x.length ? x[i] : 0); let prev = -1;
    for (let o = 0; o + N < L; o += H) { let ip = Math.round(inv((o + N / 2) / sr) * sr) - N / 2;
      if (prev >= 0) { const nat = prev + H; let best = -Infinity, bd = 0; for (let dl = -D; dl <= D; dl += 2) { let c = 0; for (let j = 0; j < N; j += 4) c += at(ip + dl + j) * at(nat + j); if (c > best) { best = c; bd = dl; } } ip += bd; }
      prev = ip; for (let j = 0; j < N; j++) { const q = ip + j; if (q >= 0 && q < x.length) y[o + j] += w[j] * x[q]; ws[o + j] += w[j]; } }
    const nb = ctx.createBuffer(1, L, sr), z = nb.getChannelData(0); for (let i = 0; i < L; i++) z[i] = y[i] / Math.max(ws[i], 1e-3); return nb;
  };
  const items = Object.entries(al.items).filter(([, it]) => it.syl && it.syl.length >= 2 && it.file), bufs = {};
  for (const [k2, it] of items) { try { bufs[k2] = await dec(it.file.replace(/^.*?media/, "/media").split(String.fromCharCode(92)).join("/")); } catch {} }
  for (const rate of [1, 0.75]) {
    const bad = [], old = [], low = []; let n = 0, minR = 1;
    for (const [k2, it] of items) { const mb = bufs[k2]; if (!mb) continue;
      const pc = await paceOf({ ep, key: k2, text: it.text, rate, buf: mb }); if (!pc) { bad.push(`${k2} 칠 없음`); continue; }
      const syl = it.syl, s0 = syl[0].s, cs = [...String(it.text)], isS = ch => /[\p{L}\p{N}]/u.test(ch), sAt = cs.map((ch, i) => (isS(ch) ? pc.at[i] : null)).filter(t => t != null);
      const outOf = ms => s0 + (ms - PACE_L0) / 1000; // 칠 시각(ms · 🎤 기준) → 가짜 녹음 안 시각(본보기 첫 음절 자리에 맞춤)
      const knots = [[s0, s0], ...syl.slice(1).map((x, k) => [x.s, outOf(sAt[k + 1])]), [syl[syl.length - 1].e, outOf(pc.end)]];
      const r = R(stretch(mb, knots), mb, k2); n++; minR = Math.min(minR, r.R);
      if (withRhythm(100, r.R) < 100) bad.push(`${k2} R ${r.R.toFixed(3)} → ${withRhythm(100, r.R)} ${r.worst?.kind} 「${r.worst?.ch}」`); else if (r.R < 0.9) low.push(`${k2} ${r.R.toFixed(3)}`);
      if (rate === 1) { const D = (syl[syl.length - 1].e - s0) * 1.15, m = syl.length; // 옛 칠 = 글자마다 고른 길이
        const r0 = R(stretch(mb, [[s0, s0], ...syl.slice(1).map((x, k) => [x.s, s0 + (D * (k + 1)) / m]), [syl[m - 1].e, s0 + D]]), mb, k2); if (withRhythm(100, r0.R) < 100) old.push(`${k2} ${withRhythm(100, r0.R)}`); }
    }
    (rate === 1 ? ok : (c, m, x) => res.push(`· ${m}${x ? " · " + x : ""}`))(n > 50 && !bad.length, `칠대로 따라 읽기(본보기 속도 ${rate}× · 배수 ${(1.15 / rate).toFixed(2)}) → 모든 토막 100점(${n}토막)`, bad.join(" · ") || `가장 낮은 R ${minR.toFixed(3)} · R 0.9 아래(100점이지만) ${low.length}토막${low.length ? ": " + low.join(" · ") : ""}`);
    if (rate === 1) res.push(`· 대조: 옛 칠(글자마다 고른 길이)대로 → 100 아닌 토막 ${old.length}/${n}${old.length ? " · " + old.slice(0, 6).join(" · ") : ""}`);
  }
  { const it = al.items["L01-00-01_15_p02"] ? ["L01-00-01_15_p02", al.items["L01-00-01_15_p02"]] : items[0], pc = await paceOf({ ep, key: it[0], text: it[1].text, rate: 1 });
    ok(pc && pc.at.every((t, i) => !i || t >= pc.at[i - 1]) && pc.end > pc.at[pc.at.length - 1], "칠 시각 차례대로 · 안내선 = 끝", `${it[1].text} · ${pc?.at.map(t => (t / 1000).toFixed(2)).join(" ")} → ${(pc?.end / 1000).toFixed(2)}초`); }
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 칠 ${res.filter(x => x.startsWith("✓")).length}/${res.filter(x => /^[✓✗]/.test(x)).length}\n` + res.join("\n");
  console.log(out); return out;
})();
