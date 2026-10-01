// 쓰기 — 말문 앱 방식(투덜이 10-01 「너가 만든 거로 · 예전 것 절대 쓰지 말고」)
//
// 학습자가 누르면 무엇이 되나
//  W1 위 토막의 글자 누르기 = 그 글자 소리 반복 ⇄ 멈춤(한 번에 한 글자) · 소리 없는 글자는 흐리게
//  W2 자판 — 맞으면 「딩동」 → 그 자모 소리 · 틀리면 칸이 흔들리고 「툭」 → 그래도 그 자모 소리(공부니까 · 10-01)
//  W3 글자를 다 치면 「딩동」 → 마지막 자모 소리 → 0.5초 쉼 → 글자 소리 → 0.6초 쉼 → 다음 글자(ㅅ … ㅓ … 서 — 붙이지 않는다 · 10-01)
//     소리가 나는 동안은 자판을 받지 않는다(소리가 잘리지 않게)
//  W4 [단어 듣기] = 지금 단어의 글자를 차례로 · [문장 듣기] = 대사 한 줄(다시 누르면 멈춤) · [자동 완성] = 지금 글자를 대신 쳐 줌
//  W5 소리는 언제나 하나만 · 새 일을 하면 앞 소리는 멈춘다
//  W6 영상 창 안(embedded): 창 안에서 스크롤 없이 다 보이게 — 긴 문장은 토막으로 나눠 한 토막씩(◀ 1/3 ▶) ·
//     토막을 다 쓰면 자동으로 다음 토막 · 줄을 다 쓰면 대사를 듣고 자동으로 다음 줄 쓰기 · 아래 ▶ = 문장 듣기
import { t, lang } from "../i18n.js";
import { esc, glossCards, toJamo, compose, vowelLen, JAMO_AUDIO } from "../text.js";
import { episode, chars } from "../data.js";
import { paths } from "../paths.js";
import { I } from "../ui.js";

const KEYS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ"], VOW = [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"];
const GAP_JAMO = 500;     // 마지막 자모 소리 → 글자 소리 사이
const GAP_NEXT = 600;     // 글자 소리 → 다음 글자 사이

// ── 소리(W5) — 한 줄로만 · 차례 재생 · 취소 ──
const voice = new Audio();
let actx, token = 0, loopSrc = null, loopTimer = 0;
voice.addEventListener("ended", () => { if (loopSrc) loopTimer = setTimeout(() => { if (loopSrc) voice.play().catch(() => {}); }, 600); });
const wait = ms => new Promise(r => setTimeout(r, ms));
function hush() { token++; clearTimeout(loopTimer); loopSrc = null; voice.pause(); }
function playSrc(src, my) {
  return new Promise(res => {
    if (my !== token) return res();
    const done = () => { voice.removeEventListener("ended", done); voice.removeEventListener("error", done); clearTimeout(guard); res(); };
    voice.addEventListener("ended", done); voice.addEventListener("error", done);
    const guard = setTimeout(done, 4000);
    voice.src = src; voice.currentTime = 0; voice.play().catch(done);
  });
}
function tone(kind) { // 딩동(맞음) · 툭(틀림)
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const notes = kind === "ok" ? [[880, 0], [1320, 0.09]] : [[170, 0]];
    for (const [f, at] of notes) {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + at;
      o.type = kind === "ok" ? "triangle" : "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(kind === "ok" ? 0.18 : 0.28, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + (kind === "ok" ? 0.16 : 0.2));
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.22);
    }
  } catch {}
  return wait(kind === "ok" ? 260 : 230);
}
// steps: "ok" | "bad" | number(쉼 ms) | 소리 주소 — 앞 것을 끊고 차례로
async function run(steps) {
  hush(); const my = token;
  for (const s of steps) {
    if (my !== token) return false;
    if (s === "ok" || s === "bad") await tone(s);
    else if (typeof s === "number") await wait(s);
    else if (s) await playSrc(s, my);
  }
  return my === token;
}

export default async function write(app, ep, id, opts = {}) {
  const [d, idx] = await Promise.all([episode(ep, lang), chars()]);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const cards = glossCards(line.glossLine);
  const allWords = line.ko.split(/\s+/).filter(w => /[가-힣]/.test(w)).map(raw => {
    const text = raw.replace(/[^가-힣]/g, "");
    const card = cards.find(c => c.ko.replace(/[^가-힣]/g, "") === text);
    return { raw, text, rom: card?.rom || "", mean: card?.mean || "", end: /[.?!…]$/.test(raw), chars: [...text].map(ch => ({ ch, jamo: toJamo(ch), file: idx[ch] || null })) };
  });
  // 토막 나누기(W6) — 문장 끝(. ? !)에서 끊고, 그래도 길면 낱말 단위로 한 줄에 들어가는 글자 수 안
  // 한 줄에 들어가는 글자 수 = (창 너비 − 양옆 여백 − ◀ 1/5 ▶) ÷ 글자 하나 너비(약 30px · 낱말 사이 포함)
  const SEG_MAX = Math.max(5, Math.min(12, Math.floor(((app.clientWidth || 360) - 28 - 110) / 31)));
  const segs = [];
  let cur = [], n = 0;
  for (const w of allWords) {
    if (cur.length && n + w.text.length > SEG_MAX) { segs.push(cur); cur = []; n = 0; }
    cur.push(w); n += w.text.length;
    if (w.end) { segs.push(cur); cur = []; n = 0; }
  }
  if (cur.length) segs.push(cur);
  const st = { s: 0, w: 0, c: 0, k: 0, typed: [], busy: false, loopAt: null, sent: false, alive: true };
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  hush();

  app.innerHTML = `<section class="scr write ${opts.embedded ? "embedded" : ""}">
    ${opts.embedded
      ? `<div class="whead"><b>${esc(t("write"))}</b><span class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></span><span class="loopnote" aria-live="polite"></span></div>`
      : `<div class="bar"><a class="iconbtn" href="#/learn/${ep}/${line.id}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("write"))}</div><div class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></div></div></div><div class="loopnote" aria-live="polite"></div>`}
    <div class="segrow"><div class="sent" lang="ko"></div><div class="segnav"></div></div>
    <div class="work"></div>
    <div class="wbtns"><button data-act="word">${esc(t("listen_word"))}</button><button data-act="sent">${esc(t("listen_sentence"))}</button><button data-act="auto">${esc(t("autofill"))}</button></div>
  </section>`;

  const $ = s => app.querySelector(s);
  const note = $(".loopnote"), work = $(".work"), sentEl = $(".sent"), segnav = $(".segnav");
  const words = () => segs[st.s] || [];
  const setNote = () => { note.textContent = st.loopAt ? t("loop_on", { c: st.loopAt.ch }) : t("loop_hint"); };
  const markSent = () => $("[data-act=sent]").setAttribute("aria-pressed", String(st.sent));
  function stopLoop() { if (!st.loopAt) return; st.loopAt = null; hush(); paintSent(); setNote(); }
  function resetSounds() { stopLoop(); hush(); st.sent = false; markSent(); }

  function toggleSentence() { // W4 · 아래 ▶
    if (!lineSrc) return;
    if (st.sent) { st.sent = false; hush(); return markSent(); }
    stopLoop(); st.sent = true; markSent();
    run([lineSrc]).then(() => { st.sent = false; markSent(); });
  }
  app.__wr = { toggle: toggleSentence, busy: () => st.busy || st.sent || !voice.paused }; // busy = 점검 도구가 소리 끝을 기다릴 때

  function paintSent() {
    sentEl.innerHTML = words().map((w, wi) => `<span class="w ${wi === st.w ? "on" : ""}">${w.chars.map((c, ci) =>
      `<button class="c ko ${c.file ? "" : "noaudio"} ${wi < st.w || (wi === st.w && ci < st.c) ? "done" : ""} ${st.loopAt && st.loopAt.w === wi && st.loopAt.c === ci ? "loop" : ""}" data-w="${wi}" data-c="${ci}" ${c.file ? "" : 'aria-disabled="true"'}>${esc(c.ch)}</button>`).join("")}</span>`).join("");
    // 그래도 넘치면(아주 긴 낱말) 글자를 조금씩 줄여 한 줄에 맞춘다
    sentEl.style.fontSize = "";
    for (let fs = 22; sentEl.scrollWidth > sentEl.clientWidth + 1 && fs >= 14; fs -= 2) sentEl.querySelectorAll(".c").forEach(c => { c.style.fontSize = fs + "px"; });
    segnav.innerHTML = segs.length > 1
      ? `<button data-seg="-1" ${st.s ? "" : "disabled"} aria-label="${esc(t("previous"))}">◀</button><span>${st.s + 1}/${segs.length}</span><button data-seg="1" ${st.s < segs.length - 1 ? "" : "disabled"} aria-label="${esc(t("next"))}">▶</button>`
      : "";
  }
  function render() {
    paintSent();
    if (st.s >= segs.length) {
      work.innerHTML = `<div class="done-card"><span class="big ko" lang="ko">${esc(line.ko)}</span>${line.tr ? `<span class="tr">${esc(line.tr)}</span>` : ""}
        <span>${esc(t("sentence_done"))}</span><button class="chip" data-act="retry">${esc(t("retry_writing"))}</button></div>`;
      return;
    }
    const w = words()[st.w], c = w.chars[st.c], jam = c.jamo;
    work.innerHTML = `<div class="stage"><div class="box"><span class="target ko" lang="ko">${esc(c.ch)}</span><span class="typed ko" lang="ko">${esc(compose(st.typed, vowelLen(c.ch)))}</span></div>
      <div class="info"><div class="word ko" lang="ko">${w.chars.map((x, i) => (i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch))).join("")}${w.rom ? ` <span class="rom">${esc(w.rom)}</span>` : ""}</div>
      ${w.mean ? `<div class="mean tr">${esc(w.mean)}</div>` : ""}
      <div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}</div></div></div>
      <div class="kb" lang="ko">${KEYS.map((j, i) => `<button class="${i >= 14 ? "dbl" : ""}" data-j="${j}">${j}</button>`).join("")}<span></span>${VOW.map(j => `<button class="v" data-j="${j}">${j}</button>`).join("")}</div>`;
  }
  function goSeg(s) { resetSounds(); st.busy = false; Object.assign(st, { s, w: 0, c: 0, k: 0, typed: [] }); render(); }

  async function finishChar(j, c) { // W3
    st.busy = true;
    work.querySelector(".box")?.classList.add("ok");
    const ok = await run(["ok", JAMO_AUDIO[j] && paths.jamo(JAMO_AUDIO[j]), GAP_JAMO, c.file && paths.char(c.file), GAP_NEXT]);
    if (!ok || !st.alive) { st.busy = false; return; }
    st.busy = false; st.c++; st.k = 0; st.typed = [];
    const w = words()[st.w];
    if (st.c >= w.chars.length) { st.w++; st.c = 0; }
    if (st.w >= words().length) { // 토막 끝 → 다음 토막(자동)
      st.s++; st.w = 0;
      if (st.s >= segs.length) return lineDone();
    }
    render();
  }
  async function lineDone() { // 줄 끝 → 대사 듣고 → 다음 줄(자동)
    render();
    st.sent = true; markSent();
    const ok = await run([lineSrc, 900]);
    st.sent = false; markSent();
    if (ok && st.alive && li < d.lines.length - 1) {
      if (opts.embedded) opts.onNext?.(li + 1);
      else location.hash = `#/write/${ep}/${d.lines[li + 1].id}`;
    }
  }
  async function press(j) { // W2
    if (st.busy || st.s >= segs.length) return;
    stopLoop(); st.sent = false; markSent();
    const c = words()[st.w].chars[st.c];
    const voiceSrc = JAMO_AUDIO[j] && paths.jamo(JAMO_AUDIO[j]);
    if (c.jamo[st.k] !== j) {
      const s = work.querySelector(".slot.current"); s?.classList.remove("shake"); void s?.offsetWidth; s?.classList.add("shake");
      const k = work.querySelector(`[data-j="${j}"]`); k?.classList.add("wrong"); setTimeout(() => k?.classList.remove("wrong"), 500);
      st.busy = true; await run(["bad", voiceSrc]); st.busy = false;
      return;
    }
    st.typed.push(j); st.k++;
    render();
    if (st.k >= c.jamo.length) return finishChar(j, c);
    st.busy = true; await run(["ok", voiceSrc]); st.busy = false;
  }

  app.querySelector(".scr").onclick = e => {
    const k = e.target.closest("[data-j]");
    if (k) return press(k.dataset.j);
    const sg = e.target.closest("[data-seg]");
    if (sg) return goSeg(Math.max(0, Math.min(segs.length - 1, st.s + +sg.dataset.seg)));
    const cb = e.target.closest(".sent .c");
    if (cb) { // W1
      const w = +cb.dataset.w, ci = +cb.dataset.c, c = words()[w].chars[ci];
      if (!c.file) { note.textContent = t("no_char_audio", { c: c.ch }); return; }
      if (st.busy) return;
      st.sent = false; markSent();
      if (st.loopAt && st.loopAt.w === w && st.loopAt.c === ci) return stopLoop();
      hush(); st.loopAt = { w, c: ci, ch: c.ch };
      voice.src = paths.char(c.file); voice.currentTime = 0; loopSrc = voice.src; voice.play().catch(() => {});
      paintSent(); setNote();
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "sent") toggleSentence();
    else if (a === "word" && st.s < segs.length && !st.busy) { // W4 — 글자를 차례로(사이 0.25초)
      stopLoop(); st.sent = false; markSent();
      run(words()[st.w].chars.filter(c => c.file).flatMap(c => [paths.char(c.file), 250]));
    } else if (a === "auto" && st.s < segs.length && !st.busy) {
      stopLoop(); const c = words()[st.w].chars[st.c];
      st.typed = [...c.jamo]; st.k = c.jamo.length; render(); finishChar(c.jamo[c.jamo.length - 1], c);
    } else if (a === "retry") { goSeg(0); }
  };

  setNote(); render();
  return () => { st.alive = false; hush(); delete app.__wr; };
}
