// 말하기 「तुलना(비교)」 화면(본부 10-06 투덜이) — 본보기와 내 목소리를 파형 두 줄 + 음절 칸으로 견줘 보기
//  · 위 = 본보기(원음) · 아래 = 내 목소리(앞 잡음 자른 lead 부터 · gainOf 크기) · 같은 시간 눈금 · 두 줄 모두 말 시작을 왼쪽 끝에
//  · 본보기 음절 시각 = data/{ep}/{ep}.align.json(본부 강제 정렬) · 내 목소리 음절 = 20ms 칸 특징(로그 에너지 · 고역 에너지 · 영교차 · 변화량) DTW 로 본보기 경계를 옮김
//  · 색 = 점수와 같은 음절 정렬(score.js align) — 맞음 초록 · 틀림/빠짐 빨강 밑줄(말하기 「들린 말」과 같은 색)
//  · 재생: 본보기 → 0.4초 → 내 목소리 · 재생 위치 세로 막대 + 지금 음절 강조 · 파형·음절 칸을 누르면 그 줄 그 음절부터
//  녹음·점수 계산·[내 목소리] 재생(playmine.js playMine)은 그대로 — 여기는 그리기·DTW·비교 화면 안 재생만
//  (본보기는 sfx.play 그대로 · 내 목소리는 playmine 과 같은 방식: decodeAudioData → BufferSource.start(t, offset) → Gain)
import { prepare, rhythmScore, loadAlign, isSyl } from "./rhythm.js?v=1007.12";
import { esc } from "./text.js?v=1007.12";
import { align } from "./score.js?v=1007.12";
import { audioCtx } from "./wake.js?v=1007.12";
import { leadOf, gainOf, FADE, FADE_OUT, voicedEnd } from "./playmine.js?v=1007.12";
import { speechEnd, wavOf } from "./recstore.js?v=1007.12";
import * as sfx from "./sfx.js?v=1007.12";

// host 안에 그린다 → { close() } · o = { ep, key, url(본보기), text(본보기 글), blob(내 녹음), heard(들은 말 글자 · 없으면 색 없음), t(문구) }
// 속도 단계(본부 10-07 · 투덜이 「견본에도 각각」) — 줄마다 자기 속도 · 누를 때마다 1 → 0.9 → 0.75 → 0.6 → 0.5 → 1 · 0.5 아래는 늘이기가 끊겨 뺌 · 고른 값 기억
export const RATES = [1, 0.9, 0.75, 0.6, 0.5];
const rateKey = k => `malmun.rate.${k}`;
export const getRate = k => { try { const v = parseFloat(localStorage.getItem(rateKey(k))); return RATES.includes(v) ? v : 1; } catch { return 1; } };
const setRate = (k, v) => { try { localStorage.setItem(rateKey(k), String(v)); } catch {} };
let rateWord = ""; // 「गति」 — 단추엔 글자가 꼭 있게(아이콘만 단추 없음 원칙)
const rateTxt = v => `${rateWord ? rateWord + " " : ""}${v}×`;
// 본보기 느리게 틀기(투덜이 10-07 허락 — 말하기 화면·설명 말해보기 「▶ नमुना」 도 본보기 속도) · 음높이 그대로 · 1× 일 땐 쓰지 않음(원래 재생 그대로)
export function playSlow(url, rate) {
  const el = new Audio(url); el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = true; el.playbackRate = rate; el.volume = Math.min(1, window.__sfxVolume ?? 1);
  let resolve; const done = new Promise(r => (resolve = r)), end = () => resolve(true);
  el.onended = el.onerror = end; el.play().catch(end);
  return { el, done, pause() { el.pause(); end(); }, get playing() { return !el.paused && !el.ended; } };
}
export const rateLabel = v => rateTxt(v);
export const setRateWord = w => { rateWord = w || ""; };
export const nextRate = k => { const nv = RATES[(RATES.indexOf(getRate(k)) + 1) % RATES.length]; setRate(k, nv); return nv; };
export async function openCompare(host, o) {
  const { t } = o, ctx = audioCtx(), st = { alive: true, raf: 0, src: null, timer: 0 };
  setRateWord(t("speed"));
  host.innerHTML = `<div class="cmpw"><p class="cmpmsg">…</p></div>`;
  const [al, mbuf, ybuf] = await Promise.all([loadAlign(o.ep), sfx.load(o.url), o.blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).catch(() => null)]);
  if (!st.alive) return { close() {} };
  if (!mbuf || !ybuf) { host.innerHTML = `<div class="cmpw"><p class="cmpmsg">${esc(t("cmp_none"))}</p></div>`; return { close() { st.alive = false; } }; }
  // 본보기 음절(정렬 파일 · 없으면 말 구간을 고르게 나눈 임시 칸)
  // 음절 칸 = 리듬 점수와 같은 함수(js/rhythm.js prepare) · 본보기 = align.json · 내 목소리 = DTW
  const { W, msyl, ysyl, mLead, mStop, mEnd, mLead0, ref, yLead, yStop } = prepare({ al, key: o.key, text: o.text, mbuf, ybuf }), yGain = gainOf(ybuf);
  const rh = rhythmScore({ msyl, ysyl, mbuf, ybuf }); // 리듬이 가장 많이 깎인 음절 = 두 줄 그 칸에 주황 테두리
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
  const cell = (x, k, lead, mine) => `<span data-k="${k}" class="cel ${marks[k]}${rh.worst && rh.worst.k === k && rh.R < 0.9 ? " rworst" : ""}" style="${pos(x.s, x.e, lead)}"><span class="tx">${mine && marks[k] === "bad" && heardCh[k] ? `<small class="want">${esc(x.ch)}</small><span class="got">${esc(heardCh[k])}</span>` : esc(x.ch)}</span></span>`;
  const extras = (syl, lead) => extra.map(x => { const at = x.after >= 0 ? syl[x.after].e : syl[0].s, [a0, a1] = x.after >= 0 ? [at - 0.03, at + 0.05] : [Math.max(lead, at - 0.08), at]; return `<span class="add" style="${pos(a0, a1, lead)}">${esc(x.ch)}</span>`; }).join("");
  const rkey = c => (c === "m" ? "m" : "y");
  const row = (cls, lab, syl, lead) => `<div class="crow ${cls}"><div class="clab"><button class="cplay" data-play="${cls}">▶ ${esc(lab)}</button><button class="crate" data-rate="${cls}" aria-pressed="${getRate(rkey(cls)) !== 1}" aria-label="${esc(t("speed"))}">${rateTxt(getRate(rkey(cls)))}</button></div><div class="cwave"><canvas></canvas><i class="cbar" hidden></i></div><div class="csyl ko" lang="ko">${syl.map((x, k) => cell(x, k, lead, cls === "y")).join("")}${cls === "y" ? extras(syl, lead) : ""}</div></div>`;
  const ticks = []; for (let s = 0; s <= span + 1e-6; s += span > 3 ? 1 : 0.5) ticks.push(`<span style="left:${(100 * s) / span}%">${s.toFixed(1)}</span>`);
  host.innerHTML = `<div class="cmpw">${row("m", t("model"), msyl, mLead)}${row("y", t("my_voice"), ysyl, yLead)}<div class="cruler">${ticks.join("")}</div><div class="cfoot"><button class="craw" data-raw title="lead ${yLead.toFixed(2)} · end ${yStop.toFixed(2)} · ${ybuf.duration.toFixed(2)}s">⬇ ${esc(t("raw_dl"))}</button></div></div>`;
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
  const stopPlay = () => { cancelAnimationFrame(st.raf); clearTimeout(st.timer); sfx.stopAll(); try { st.src?.stop(); } catch {} st.src = null; if (st.el) { st.el.onended = st.el.ontimeupdate = null; st.el.pause(); st.elDone?.(); st.el = null; } rows.forEach(r => { r.querySelector(".cbar").hidden = true; r.querySelectorAll(".csyl .cel").forEach(b => b.classList.remove("now")); r.classList.remove("on"); }); host.classList.remove("playing"); };
  const follow = (ri, lead, syl, from, t0, posOf) => { // 재생 위치 막대 + 지금 음절 · posOf = 느리게(<audio>)일 때 지금 자리
    const r = rows[ri], bar = r.querySelector(".cbar"), bs = [...r.querySelectorAll(".csyl .cel")];
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
    const rate = getRate(ri ? "y" : "m");
    if (rate !== 1) { // 느리게(투덜이 10-06 허락 · 10-07 단계 늘림) — 비교 화면 안에서만(투덜이 10-06 허락) — 비교 화면 안에서만 · 음높이 그대로(<audio>.preservesPitch) · 본보기 = 그 mp3 · 내 목소리 = WAV(내려받기와 같은 함수 · gainOf 크기)
      const url = ri ? (st.wavUrl ||= URL.createObjectURL(wavOf(ybuf, 0, ybuf.duration, yGain))) : o.url, end = to ?? (ri ? yStop : mStop);
      const el = (st.el = new Audio(url)); el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = true; el.playbackRate = rate; el.volume = Math.min(1, window.__sfxVolume ?? 1);
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
  // 파형 위 자리 → 그 줄 시각(그 자리 음절의 첫머리로 맞춤 — 말 중간부터 시작하지 않게)
  const waveAt = (r, x) => { const ri = rows.indexOf(r), lead = ri ? yLead : mLead, syl = ri ? ysyl : msyl, w = r.querySelector(".cwave").getBoundingClientRect(); let t = lead + span * Math.max(0, Math.min(1, (x - w.left) / w.width)); const k = syl.findIndex(s => t < s.e); if (k >= 0) t = Math.min(t, syl[k].s); return Math.max(lead, t); };
  // 미리 보기(본부 10-07 「파형 = 누르고 싶게」) — 마우스를 올리면(폰은 손가락 닿는 동안) 그 자리에 세로 막대 + 시각 · 칸 살짝 밝아짐
  const hov = (r, x) => { const wv = r.querySelector(".cwave"); let h = wv.querySelector(".chov"); if (!h) { h = document.createElement("i"); h.className = "chov"; h.innerHTML = "<b></b>"; wv.append(h); } const ri = rows.indexOf(r), lead = ri ? yLead : mLead, t = waveAt(r, x); h.style.left = `${(100 * (t - lead)) / span}%`; h.firstChild.textContent = `${(t - lead).toFixed(2)}s`; h.hidden = false; wv.classList.add("hov"); };
  const unhov = r => { const wv = r.querySelector(".cwave"); wv.classList.remove("hov"); const h = wv.querySelector(".chov"); if (h) h.hidden = true; };
  rows.forEach(r => { const wv = r.querySelector(".cwave");
    wv.addEventListener("pointermove", e => hov(r, e.clientX)); wv.addEventListener("pointerdown", e => hov(r, e.clientX));
    wv.addEventListener("pointerleave", () => unhov(r)); wv.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") setTimeout(() => unhov(r), 300); }); });
  host.onclick = e => { // 음절 칸 · 파형 누르기 = 그 줄 그 자리부터
    const rb = e.target.closest("[data-rate]");
    if (rb) { const k = rb.dataset.rate === "m" ? "m" : "y", nv = RATES[(RATES.indexOf(getRate(k)) + 1) % RATES.length]; setRate(k, nv); rb.textContent = rateTxt(nv); rb.setAttribute("aria-pressed", String(nv !== 1)); stopPlay(); o.onRate?.(k, nv); return; } // 줄 속도 바꾸기(다음 재생부터 · 기억)
    if (e.target.closest("[data-raw]")) { // 진단(본부 10-06): 내 녹음 원본 그대로(webm · 자르기·크기 맞춤 없음) 내려받기 — 실제 녹음에서 앞·뒤 자르기가 왜 안 먹는지 본부가 직접 봄
      const u = URL.createObjectURL(o.blob), a = document.createElement("a"), ext = (o.blob.type.match(/audio\/(\w+)/) || [, "webm"])[1];
      a.href = u; a.download = `malmun_raw_${o.key}_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
      return;
    }
    const pb = e.target.closest("[data-play]");
    if (pb) { const ri = pb.dataset.play === "m" ? 0 : 1, on = rows[ri].classList.contains("on"); stopPlay(); if (!on) playRow(ri, ri ? yLead : mLead).then(() => host.classList.remove("playing")); return; } // ▶ 그 줄 전체(그 줄 속도) · 다시 누르면 멈춤
    const r = e.target.closest(".crow"); if (!r) return;
    const ri = rows.indexOf(r), lead = ri ? yLead : mLead, syl = ri ? ysyl : msyl;
    let from = lead, to;
    if (e.target.closest(".csyl")) return; // 음절 칸 = 표시만(투덜이 10-07 「한 글자씩 듣기 포기」)
    if (!e.target.closest(".cwave")) return;
    from = waveAt(r, e.clientX);
    stopPlay(); playRow(ri, Math.max(0, from), to).then(() => host.classList.remove("playing")); // 파형 = 거기(그 음절 첫머리)부터 그 줄 속도로 끝까지
  };
  playBoth();
  window.__cmp = { st, stopPlay, rh, msyl, ysyl, marks, heardCh, extra, span, mLead, yLead, yStop, ybuf, playBoth, playRow }; // 점검 도구용
  return { close() { st.alive = false; stopPlay(); if (st.wavUrl) URL.revokeObjectURL(st.wavUrl); ro.disconnect(); host.onclick = null; host.innerHTML = ""; }, replay: playBoth };
}
