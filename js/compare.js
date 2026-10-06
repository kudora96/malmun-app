// 말하기 「तुलना(비교)」 화면(본부 10-06 투덜이) — 본보기와 내 목소리를 파형 두 줄 + 음절 칸으로 견줘 보기
//  · 위 = 본보기(원음) · 아래 = 내 목소리(앞 잡음 자른 lead 부터 · gainOf 크기) · 같은 시간 눈금 · 두 줄 모두 말 시작을 왼쪽 끝에
//  · 본보기 음절 시각 = data/{ep}/{ep}.align.json(본부 강제 정렬) · 내 목소리 음절 = 20ms 칸 특징(로그 에너지 · 고역 에너지 · 영교차 · 변화량) DTW 로 본보기 경계를 옮김
//  · 색 = 점수와 같은 음절 정렬(score.js align) — 맞음 초록 · 틀림/빠짐 빨강 밑줄(말하기 「들린 말」과 같은 색)
//  · 재생: 본보기 → 0.4초 → 내 목소리 · 재생 위치 세로 막대 + 지금 음절 강조 · 파형·음절 칸을 누르면 그 줄 그 음절부터
//  녹음·점수 계산·[내 목소리] 재생(playmine.js playMine)은 그대로 — 여기는 그리기·DTW·비교 화면 안 재생만
//  (본보기는 sfx.play 그대로 · 내 목소리는 playmine 과 같은 방식: decodeAudioData → BufferSource.start(t, offset) → Gain)
import { esc } from "./text.js?v=1006.81";
import { align } from "./score.js?v=1006.81";
import { audioCtx } from "./wake.js?v=1006.81";
import { leadOf, gainOf, FADE, FADE_OUT, voicedEnd } from "./playmine.js?v=1006.81";
import { speechEnd, wavOf } from "./recstore.js?v=1006.81";
import * as sfx from "./sfx.js?v=1006.81";

const FR = 0.02; // 특징 칸 20ms
const alignCache = new Map();
export const loadAlign = ep => { if (!alignCache.has(ep)) alignCache.set(ep, fetch(`data/${ep}/${ep}.align.json?v=${document.documentElement.dataset.v || ""}`).then(r => (r.ok ? r.json() : null)).catch(() => null)); return alignCache.get(ep); };
const isSyl = ch => /[\p{L}\p{N}]/u.test(ch);

// 20ms 칸 특징 — [로그 에너지, 고역(차분) 로그 에너지, 영교차율, 로그 에너지 변화] · 신호마다 평균 0 · 분산 1 로 맞춤
function feats(d, sr, t0, t1) {
  const w = Math.max(1, Math.round(sr * FR)), a = Math.max(0, Math.round(t0 * sr)), b = Math.min(d.length, Math.round(t1 * sr)), F = [];
  for (let i = a; i + w <= b; i += w) {
    let e = 0, h = 0, z = 0;
    for (let k = i; k < i + w; k++) { e += d[k] * d[k]; const df = k > 0 ? d[k] - d[k - 1] : 0; h += df * df; if (k > i && (d[k] >= 0) !== (d[k - 1] >= 0)) z++; }
    F.push([Math.log(e / w + 1e-9), Math.log(h / w + 1e-9), z / w]);
  }
  F.forEach((f, k) => f.push(k ? f[0] - F[k - 1][0] : 0));
  for (let j = 0; j < 4; j++) {
    const m = F.reduce((s, f) => s + f[j], 0) / Math.max(1, F.length), sd = Math.sqrt(F.reduce((s, f) => s + (f[j] - m) ** 2, 0) / Math.max(1, F.length)) || 1;
    F.forEach(f => { f[j] = (f[j] - m) / sd; });
  }
  return F;
}
// DTW → 본보기 칸 k 에 맞는 내 칸(처음 맞은 것)
function dtwMap(A, B) {
  const n = A.length, m = B.length; if (!n || !m) return A.map(() => 0);
  const D = new Float32Array((n + 1) * (m + 1)).fill(Infinity), at = (i, j) => i * (m + 1) + j;
  D[0] = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const a = A[i - 1], b = B[j - 1]; let c = 0; for (let q = 0; q < 4; q++) c += (a[q] - b[q]) ** 2;
    D[at(i, j)] = Math.sqrt(c) + Math.min(D[at(i - 1, j - 1)], D[at(i - 1, j)], D[at(i, j - 1)]);
  }
  const map = new Array(n).fill(-1); let i = n, j = m;
  while (i > 0 && j > 0) {
    map[i - 1] = j - 1;
    const d = D[at(i - 1, j - 1)], u = D[at(i - 1, j)], l = D[at(i, j - 1)];
    if (d <= u && d <= l) { i--; j--; } else if (u <= l) i--; else j--;
  }
  for (let k = 0; k < n; k++) if (map[k] < 0) map[k] = k ? map[k - 1] : 0;
  return map;
}

// host 안에 그린다 → { close() } · o = { ep, key, url(본보기), text(본보기 글), blob(내 녹음), heard(들은 말 글자 · 없으면 색 없음), t(문구) }
export async function openCompare(host, o) {
  const { t } = o, ctx = audioCtx(), st = { alive: true, raf: 0, src: null, timer: 0 };
  host.innerHTML = `<div class="cmpw"><p class="cmpmsg">…</p></div>`;
  const [al, mbuf, ybuf] = await Promise.all([loadAlign(o.ep), sfx.load(o.url), o.blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).catch(() => null)]);
  if (!st.alive) return { close() {} };
  if (!mbuf || !ybuf) { host.innerHTML = `<div class="cmpw"><p class="cmpmsg">${esc(t("cmp_none"))}</p></div>`; return { close() { st.alive = false; } }; }
  // 본보기 음절(정렬 파일 · 없으면 말 구간을 고르게 나눈 임시 칸)
  const W = [...String(o.text)].filter(isSyl);
  let msyl = al?.items?.[o.key]?.syl;
  const mLead0 = msyl?.length ? msyl[0].s : leadOf(mbuf, 0), mEnd = msyl?.length ? msyl[msyl.length - 1].e : speechEnd(mbuf, 0);
  if (!msyl?.length || msyl.length !== W.length) msyl = W.map((ch, k) => ({ ch, s: mLead0 + ((mEnd - mLead0) * k) / W.length, e: mLead0 + ((mEnd - mLead0) * (k + 1)) / W.length }));
  const mLead = Math.max(0, mLead0 - 0.08), mStop = Math.min(mbuf.duration, mEnd + 0.15);
  const ref = Math.max(0, mEnd - mLead0), yLead = leadOf(ybuf, 0.08, ref), yStop = Math.max(yLead + 0.1, voicedEnd(ybuf, 0.12, ref)), yGain = gainOf(ybuf); // 끝 = 말 끝(뒤 잡음 빼기 · [내 목소리]와 같은 함수)
  // 내 목소리 음절 = DTW 로 본보기 경계를 옮김
  const A = feats(mbuf.getChannelData(0), mbuf.sampleRate, mLead, mStop), B = feats(ybuf.getChannelData(0), ybuf.sampleRate, yLead, yStop), map = dtwMap(A, B);
  const toY = s => { const k = Math.max(0, Math.min(A.length - 1, Math.round((s - mLead) / FR))); return yLead + (map[k] ?? 0) * FR; };
  const ysyl = msyl.map((x, k) => ({ ch: x.ch, s: toY(x.s), e: k < msyl.length - 1 ? toY(msyl[k + 1].s) : Math.min(yStop, toY(x.e) + 0.02) }));
  // 맞음/틀림 — 점수와 같은 정렬(본보기 음절마다 m 맞음 · s 바뀜 · d 빠짐)
  // 내 목소리 칸에는 「들은 글자」(본부 10-06): 바뀜 = 큰 빨강 들은 글자 + 위 작게 흐린 본보기 글자 · 빠짐 = 흐린 점선 칸 · 덧붙은 소리 = 회색 작은 칸(앞 음절 끝에)
  let marks = W.map(() => ""), heardCh = W.map(() => null), extra = [];
  if (o.heard) {
    const H = [...String(o.heard).replace(/500/g, "오백")].filter(isSyl), ops = align(o.text, o.heard).ops; let k = 0, j = 0;
    for (const x of ops) {
      if (x.t === "m") { marks[k] = "ok"; heardCh[k] = H[j]; k++; j++; }
      else if (x.t === "s") { marks[k] = "bad"; heardCh[k] = H[j]; k++; j++; }
      else if (x.t === "d") { marks[k] = "miss"; k++; }
      else { extra.push({ after: k - 1, ch: H[j] }); j++; }
    }
  }
  const span = Math.max(mStop - mLead, yStop - yLead, 0.5);
  const pos = (s, e, lead) => `left:${(100 * (s - lead)) / span}%;width:${(100 * Math.max(0.02, e - s)) / span}%`;
  const cell = (x, k, lead, mine) => `<button data-k="${k}" class="${marks[k]}" style="${pos(x.s, x.e, lead)}"><span class="tx">${mine && marks[k] === "bad" && heardCh[k] ? `<small class="want">${esc(x.ch)}</small><span class="got">${esc(heardCh[k])}</span>` : esc(x.ch)}</span></button>`;
  const extras = (syl, lead) => extra.map(x => { const at = x.after >= 0 ? syl[x.after].e : syl[0].s, [a0, a1] = x.after >= 0 ? [at - 0.03, at + 0.05] : [Math.max(lead, at - 0.08), at]; return `<span class="add" style="${pos(a0, a1, lead)}">${esc(x.ch)}</span>`; }).join("");
  const row = (cls, lab, syl, lead) => `<div class="crow ${cls}"><div class="clab">${esc(lab)}</div><div class="cwave"><canvas></canvas><i class="cbar" hidden></i></div><div class="csyl ko" lang="ko">${syl.map((x, k) => cell(x, k, lead, cls === "y")).join("")}${cls === "y" ? extras(syl, lead) : ""}</div></div>`;
  const ticks = []; for (let s = 0; s <= span + 1e-6; s += span > 3 ? 1 : 0.5) ticks.push(`<span style="left:${(100 * s) / span}%">${s.toFixed(1)}</span>`);
  host.innerHTML = `<div class="cmpw">${row("m", t("model"), msyl, mLead)}${row("y", t("my_voice"), ysyl, yLead)}<div class="cruler">${ticks.join("")}</div><div class="cfoot"><button class="cslow" data-slow aria-pressed="false">0.75×</button><button class="craw" data-raw title="lead ${yLead.toFixed(2)} · end ${yStop.toFixed(2)} · ${ybuf.duration.toFixed(2)}s">⬇ ${esc(t("raw_dl"))}</button></div></div>`;
  const rows = [...host.querySelectorAll(".crow")];
  // 음절 글자 = 두 줄 모두 한 크기(본부 10-06 투덜이) · 칸이 글보다 좁으면 글을 칸 가운데 위·아래 두 층으로 번갈아(가는 선으로 칸과 이음) — 겹치지 않게
  const tight = () => host.querySelectorAll(".csyl").forEach(row => { // 차례대로 놓되 가운데 → 위 → 아래 중 이미 놓인 글자와 안 겹치는 첫 자리(실제 크기로 잼)
    const placed = [], hit = (a, b) => a.right > b.left + 2 && b.right > a.left + 2 && a.bottom > b.top + 2 && b.bottom > a.top + 2; // 2px 닿는 것까지는 겹침 아님
    row.querySelectorAll("button").forEach(b => {
      const tx = b.querySelector(".tx"); if (!tx) return;
      b.classList.remove("up", "dn", "narrow"); const narrow = tx.offsetWidth > b.clientWidth - 2;
      let best = null;
      for (const c of ["", "up", "dn"]) { b.classList.remove("up", "dn"); if (c) b.classList.add(c); const r = tx.getBoundingClientRect(); if (!placed.some(p => hit(r, p))) { best = c; break; } }
      b.classList.remove("up", "dn"); if (best === null) best = "up"; if (best) b.classList.add(best);
      if (narrow || best) b.classList.add("narrow");
      placed.push(tx.getBoundingClientRect());
    });
  });
  tight(); document.fonts?.ready.then(() => st.alive && tight()); setTimeout(() => st.alive && tight(), 120); // 글꼴이 늦게 와 글자 폭이 바뀌어도 다시
  // 파형 — 20ms 보다 잘게(가로 픽셀마다 최대 크기) · 내 목소리는 gainOf 크기로
  const draw = (cv, buf, lead, g, stop = Infinity) => { // stop 뒤(말 끝 뒤 잡음)는 그리지 않음
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, W2 = Math.max(1, Math.round(r.width * dpr)), H2 = Math.max(1, Math.round(r.height * dpr));
    cv.width = W2; cv.height = H2; const c = cv.getContext("2d"), d = buf.getChannelData(0), sr = buf.sampleRate;
    c.fillStyle = getComputedStyle(cv).color; c.clearRect(0, 0, W2, H2);
    for (let x = 0; x < W2; x++) {
      const a = Math.round((lead + (span * x) / W2) * sr), b = Math.round((lead + (span * (x + 1)) / W2) * sr); let pk = 0;
      for (let i = Math.max(0, a); i < Math.min(d.length, b, Math.round(stop * sr)); i++) pk = Math.max(pk, Math.abs(d[i]));
      const h = Math.max(1, Math.min(1, pk * g) * H2 * 0.95); c.fillRect(x, (H2 - h) / 2, 1, h);
    }
  };
  const paintWaves = () => { draw(rows[0].querySelector("canvas"), mbuf, mLead, 1, mStop); draw(rows[1].querySelector("canvas"), ybuf, yLead, yGain, yStop); }; // 내 목소리 = [lead, end] 안만(앞·뒤 자른 그대로)
  paintWaves();
  const ro = new ResizeObserver(() => { paintWaves(); tight(); }); ro.observe(host);
  // 재생 — 본보기 = sfx.play(같은 버퍼 · offset) · 내 목소리 = BufferSource.start(t, offset) + Gain(playmine 과 같은 방식)
  const stopPlay = () => { cancelAnimationFrame(st.raf); clearTimeout(st.timer); sfx.stopAll(); try { st.src?.stop(); } catch {} st.src = null; if (st.el) { st.el.onended = st.el.ontimeupdate = null; st.el.pause(); st.elDone?.(); st.el = null; } rows.forEach(r => { r.querySelector(".cbar").hidden = true; r.querySelectorAll(".csyl button").forEach(b => b.classList.remove("now")); r.classList.remove("on"); }); host.classList.remove("playing"); };
  const follow = (ri, lead, syl, from, t0, posOf) => { // 재생 위치 막대 + 지금 음절 · posOf = 느리게(<audio>)일 때 지금 자리
    const r = rows[ri], bar = r.querySelector(".cbar"), bs = [...r.querySelectorAll(".csyl button")];
    r.classList.add("on"); bar.hidden = false;
    const step = () => {
      const pos = posOf ? posOf() : from + Math.max(0, ctx.currentTime - t0);
      bar.style.left = `${Math.min(100, (100 * (pos - lead)) / span)}%`;
      bs.forEach((b, k) => b.classList.toggle("now", pos >= syl[k].s && pos < syl[k].e));
      if (st.alive) st.raf = requestAnimationFrame(step);
    };
    step();
  };
  const playRow = (ri, from, to) => new Promise(res => { // to = 끝(없으면 말 끝까지) — 음절 칸을 누르면 그 음절만(앞뒤 0.03초)
    if (!st.alive) return res(false);
    if (window.__cmp) window.__cmp.lastPlay = { ri, from, to }; // 점검 도구용(그림 칸과 트는 구간이 같은 기준인지)
    host.classList.add("playing");
    if (st.slow) { // 0.75× 느리게(투덜이 10-06 허락) — 비교 화면 안에서만 · 음높이 그대로(<audio>.preservesPitch) · 본보기 = 그 mp3 · 내 목소리 = WAV(내려받기와 같은 함수 · gainOf 크기)
      const url = ri ? (st.wavUrl ||= URL.createObjectURL(wavOf(ybuf, 0, ybuf.duration, yGain))) : o.url, end = to ?? (ri ? yStop : mStop);
      const el = (st.el = new Audio(url)); el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = true; el.playbackRate = 0.75; el.volume = Math.min(1, window.__sfxVolume ?? 1);
      const done = () => { if (st.el === el) { st.el = null; el.pause(); } st.elDone = null; cancelAnimationFrame(st.raf); rows[ri].classList.remove("on"); rows[ri].querySelector(".cbar").hidden = true; res(true); };
      st.elDone = done;
      el.ontimeupdate = () => { if (el.currentTime >= end) done(); };
      el.onended = done;
      const go = () => { el.currentTime = from; el.play().then(() => follow(ri, ri ? yLead : mLead, ri ? ysyl : msyl, from, 0, () => { if (el.currentTime >= end) done(); return el.currentTime; })).catch(done); };
      el.readyState >= 1 ? go() : el.addEventListener("loadedmetadata", go, { once: true });
      return;
    }
    if (ri === 0) {
      const t0 = ctx.currentTime + 0.01;
      follow(0, mLead, msyl, from, t0);
      sfx.play(o.url, { offset: from, dur: Math.max(0.05, (to ?? mStop) - from), fade: 0.01 }).then(() => { cancelAnimationFrame(st.raf); rows[0].classList.remove("on"); rows[0].querySelector(".cbar").hidden = true; res(true); });
    } else {
      const src = ctx.createBufferSource(), g = ctx.createGain(), G = yGain * (window.__sfxVolume ?? 1), t0 = ctx.currentTime + 0.01;
      src.buffer = ybuf; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(G, t0 + FADE);
      src.connect(g); g.connect(ctx.destination); st.src = src;
      src.onended = () => { if (st.src === src) st.src = null; cancelAnimationFrame(st.raf); rows[1].classList.remove("on"); rows[1].querySelector(".cbar").hidden = true; res(true); };
      const len = Math.max(0.05, (to ?? yStop) - from); g.gain.setValueAtTime(G, t0 + Math.max(FADE, len - FADE_OUT)); g.gain.linearRampToValueAtTime(0, t0 + len); // 끝 30ms 페이드아웃
      src.start(t0, from, len);
      follow(1, yLead, ysyl, from, t0);
    }
  });
  const playBoth = async () => {
    stopPlay();
    await playRow(0, mLead); if (!st.alive || !host.classList.contains("playing")) return;
    await new Promise(r => (st.timer = setTimeout(r, 400))); if (!st.alive || !host.classList.contains("playing")) return;
    await playRow(1, yLead); host.classList.remove("playing");
  };
  host.onclick = e => { // 음절 칸 · 파형 누르기 = 그 줄 그 자리부터
    const sl = e.target.closest("[data-slow]");
    if (sl) { st.slow = !st.slow; sl.setAttribute("aria-pressed", String(st.slow)); stopPlay(); return; } // 0.75× 켜고 끄기(다음 재생부터)
    if (e.target.closest("[data-raw]")) { // 진단(본부 10-06): 내 녹음 원본 그대로(webm · 자르기·크기 맞춤 없음) 내려받기 — 실제 녹음에서 앞·뒤 자르기가 왜 안 먹는지 본부가 직접 봄
      const u = URL.createObjectURL(o.blob), a = document.createElement("a"), ext = (o.blob.type.match(/audio\/(\w+)/) || [, "webm"])[1];
      a.href = u; a.download = `malmun_raw_${o.key}_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
      return;
    }
    const r = e.target.closest(".crow"); if (!r) return;
    const ri = rows.indexOf(r), lead = ri ? yLead : mLead, syl = ri ? ysyl : msyl;
    let from = lead, to;
    const b = e.target.closest(".csyl button");
    if (b) { const x = syl[+b.dataset.k]; from = Math.max(0, x.s - 0.03); to = x.e + 0.03; } // 그 음절만
    else { const w = r.querySelector(".cwave").getBoundingClientRect(); from = lead + (span * Math.max(0, Math.min(1, (e.clientX - w.left) / w.width))); const k = syl.findIndex(x => from < x.e); if (k >= 0) from = Math.min(from, syl[k].s); }
    stopPlay(); playRow(ri, Math.max(0, from), to).then(() => host.classList.remove("playing"));
  };
  playBoth();
  window.__cmp = { st, msyl, ysyl, marks, heardCh, extra, span, mLead, yLead, yStop, ybuf, playBoth, playRow }; // 점검 도구용
  return { close() { st.alive = false; stopPlay(); if (st.wavUrl) URL.revokeObjectURL(st.wavUrl); ro.disconnect(); host.onclick = null; host.innerHTML = ""; }, replay: playBoth };
}
