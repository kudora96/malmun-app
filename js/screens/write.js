// 쓰기 — 말문 앱 방식(투덜이 10-01 「너가 만든 거로 · 예전 것 절대 쓰지 말고」)
//
// 학습자가 누르면 무엇이 되나
//  W1 위 문장의 글자 누르기 = 그 글자 소리 반복 ⇄ 멈춤(한 번에 한 글자) · 소리 없는 글자는 흐리게
//  W2 자판 누르기 — 맞으면 그 자모 소리 + 칸이 채워짐 · 틀리면 칸이 흔들리고 낮은 「툭」 소리만(자모 소리 없음)
//  W3 글자를 다 치면(마지막 낱자는 자모 소리 없이) 그 글자 소리 → 0.65초 뒤 다음 글자 · 문장을 다 치면 완성 카드 + 문장 소리 한 번
//  W4 [단어 듣기] = 지금 단어의 글자를 차례로 · [문장 듣기] = 대사 한 줄(다시 누르면 멈춤) · [자동 완성] = 지금 글자를 대신 쳐 줌
//  W5 소리는 언제나 하나만 — 새 소리가 나면 앞 소리는 멈춘다 · 자판을 치면 글자 반복은 멈춘다
//  W6 영상 창 안(embedded)에서는 머리줄·화살표·닫기 없음 — 줄 이동·닫기는 학습 화면(아래 막대 · 줄 단추)이 한다 · 아래 ▶ = 문장 듣기
import { t, lang } from "../i18n.js";
import { esc, glossCards, toJamo, compose, vowelLen, JAMO_AUDIO } from "../text.js";
import { episode, chars } from "../data.js";
import { paths } from "../paths.js";
import { I } from "../ui.js";

const CONS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"], DBL = [..."ㄲㄸㅃㅆㅉ"], VOW = [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"];

// 소리 한 줄(W5) — 쓰기 화면의 모든 소리는 이 하나로만 난다
const voice = new Audio();
let loopSrc = null, loopTimer = 0, onVoiceEnd = null;
voice.addEventListener("ended", () => {
  if (loopSrc) { loopTimer = setTimeout(() => { if (loopSrc) voice.play().catch(() => {}); }, 600); return; }
  const f = onVoiceEnd; onVoiceEnd = null; f?.();
});
function say(src, then) {
  clearTimeout(loopTimer); loopSrc = null; onVoiceEnd = then || null;
  voice.pause(); voice.src = src; voice.currentTime = 0; voice.play().catch(() => {});
}
function sayLoop(src) { say(src); loopSrc = src; }
function hush() { clearTimeout(loopTimer); loopSrc = null; onVoiceEnd = null; voice.pause(); }
let actx;
function thud() { // 틀렸을 때 낮고 짧은 소리(W2)
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine"; o.frequency.value = 160;
    g.gain.setValueAtTime(0.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.2);
  } catch {}
}

export default async function write(app, ep, id, opts = {}) {
  const [d, idx] = await Promise.all([episode(ep, lang), chars()]);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const cards = glossCards(line.glossLine);
  const words = line.ko.split(/\s+/).map(w => {
    const text = w.replace(/[^가-힣]/g, "");
    const card = cards.find(c => c.ko.replace(/[^가-힣]/g, "") === text);
    return { text, rom: card?.rom || "", mean: card?.mean || "", chars: [...text].map(ch => ({ ch, jamo: toJamo(ch), file: idx[ch] || null })) };
  }).filter(w => w.text);
  const st = { w: 0, c: 0, k: 0, typed: [], busy: false, loopAt: null, sent: false };
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  hush();

  app.innerHTML = `<section class="scr write ${opts.embedded ? "embedded" : ""}">
    ${opts.embedded
      ? `<div class="whead"><b>${esc(t("write"))}</b><span class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></span></div>`
      : `<div class="bar"><a class="iconbtn" href="#/learn/${ep}/${line.id}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("write"))}</div><div class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></div></div>
      <a class="iconbtn" href="#/write/${ep}/${d.lines[Math.max(0, li - 1)].id}" aria-label="${esc(t("previous"))}">${I.prev}</a>
      <a class="iconbtn" href="#/write/${ep}/${d.lines[Math.min(d.lines.length - 1, li + 1)].id}" aria-label="${esc(t("next"))}">${I.next}</a></div>`}
    <div class="sent" lang="ko">${words.map((w, wi) => `<span class="w" data-w="${wi}">${w.chars.map((c, ci) =>
      `<button class="c ko ${c.file ? "" : "noaudio"}" data-w="${wi}" data-c="${ci}" ${c.file ? "" : `aria-disabled="true"`}>${esc(c.ch)}</button>`).join("")}</span>`).join("")}</div>
    <div class="loopnote" aria-live="polite"></div>
    <div class="work"></div>
    <div class="wbtns"><button data-act="word">${esc(t("listen_word"))}</button><button data-act="sent">${esc(t("listen_sentence"))}</button><button data-act="auto">${esc(t("autofill"))}</button></div>
  </section>`;

  const note = app.querySelector(".loopnote"), work = app.querySelector(".work");
  const sentBtn = app.querySelector("[data-act=sent]");
  const setNote = () => { note.textContent = st.loopAt ? t("loop_on", { c: st.loopAt.ch }) : t("loop_hint"); };
  const markLoop = () => app.querySelectorAll(".sent .c").forEach(el => el.classList.toggle("loop", !!st.loopAt && +el.dataset.w === st.loopAt.w && +el.dataset.c === st.loopAt.c));
  const markSent = () => { sentBtn.setAttribute("aria-pressed", String(st.sent)); };
  function stopLoop() { if (!st.loopAt) return; st.loopAt = null; hush(); markLoop(); setNote(); }

  function toggleSentence() { // W4 · 아래 ▶
    if (!lineSrc) return;
    if (st.sent) { st.sent = false; hush(); return markSent(); }
    stopLoop(); st.sent = true; markSent();
    say(lineSrc, () => { st.sent = false; markSent(); });
  }
  app.__wr = { toggle: toggleSentence };

  function render() {
    app.querySelectorAll(".w").forEach(el => el.classList.toggle("on", +el.dataset.w === st.w));
    app.querySelectorAll(".sent .c").forEach(el => {
      const w = +el.dataset.w, c = +el.dataset.c;
      el.classList.toggle("done", w < st.w || (w === st.w && c < st.c));
    });
    if (st.w >= words.length) {
      work.innerHTML = `<div class="done-card"><span class="big ko" lang="ko">${esc(line.ko)}</span>${line.tr ? `<span class="tr">${esc(line.tr)}</span>` : ""}
        <span>${esc(t("sentence_done"))}</span><button class="chip" data-act="retry" style="justify-self:center">${esc(t("retry_writing"))}</button></div>`;
      return;
    }
    const w = words[st.w], c = w.chars[st.c], jam = c.jamo;
    work.innerHTML = `<div class="stage"><div class="box"><span class="target ko" lang="ko">${esc(c.ch)}</span><span class="typed ko" lang="ko">${esc(compose(st.typed, vowelLen(c.ch)))}</span></div>
      <div><div class="word ko" lang="ko">${w.chars.map((x, i) => (i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch))).join("")}</div>
      ${w.rom ? `<div class="rom">${esc(w.rom)}</div>` : ""}${w.mean ? `<div class="mean tr">${esc(w.mean)}</div>` : ""}
      <div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}</div></div></div>
      <div class="kb" lang="ko"><span class="lab">${esc(t("consonants"))}</span>${CONS.map(j => `<button data-j="${j}">${j}</button>`).join("")}
      <span class="lab">${esc(t("double_consonants"))}</span>${DBL.map(j => `<button data-j="${j}">${j}</button>`).join("")}
      <span class="lab">${esc(t("vowels"))}</span>${VOW.map(j => `<button class="v" data-j="${j}">${j}</button>`).join("")}</div>`;
  }

  function charDone() { // W3
    const w = words[st.w], c = w.chars[st.c];
    st.busy = true;
    work.querySelector(".box")?.classList.add("ok");
    if (c.file) say(paths.char(c.file));
    setTimeout(() => {
      st.busy = false; st.c++; st.k = 0; st.typed = [];
      if (st.c >= w.chars.length) { st.w++; st.c = 0; }
      render();
      if (st.w >= words.length && lineSrc) { st.sent = true; markSent(); setTimeout(() => say(lineSrc, () => { st.sent = false; markSent(); }), 300); }
    }, 650);
  }
  function press(j) { // W2
    if (st.busy || st.w >= words.length) return;
    stopLoop(); st.sent = false; markSent();
    const c = words[st.w].chars[st.c];
    if (c.jamo[st.k] !== j) {
      hush(); thud();
      const s = work.querySelector(".slot.current"); s?.classList.remove("shake"); void s?.offsetWidth; s?.classList.add("shake");
      return;
    }
    st.typed.push(j); st.k++;
    // 마지막 낱자면 자모 소리 대신 글자 소리 하나만(charDone) — 자모 소리가 시작하자마자 잘리던 문제
    if (st.k < c.jamo.length && JAMO_AUDIO[j]) say(paths.jamo(JAMO_AUDIO[j]));
    render();
    if (st.k >= c.jamo.length) charDone();
  }

  app.querySelector(".scr").onclick = e => {
    const k = e.target.closest("[data-j]");
    if (k) return press(k.dataset.j);
    const cb = e.target.closest(".sent .c");
    if (cb) { // W1
      const w = +cb.dataset.w, ci = +cb.dataset.c, c = words[w].chars[ci];
      if (!c.file) { note.textContent = t("no_char_audio", { c: c.ch }); return; }
      st.sent = false; markSent();
      if (st.loopAt && st.loopAt.w === w && st.loopAt.c === ci) return stopLoop();
      st.loopAt = { w, c: ci, ch: c.ch }; sayLoop(paths.char(c.file)); markLoop(); setNote();
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "sent") toggleSentence();
    else if (a === "word" && st.w < words.length) { // W4 — 글자를 차례로
      stopLoop(); st.sent = false; markSent();
      const list = words[st.w].chars.filter(c => c.file).map(c => paths.char(c.file));
      const next = () => { const s = list.shift(); if (s) say(s, () => setTimeout(next, 150)); };
      next();
    } else if (a === "auto" && st.w < words.length && !st.busy) {
      stopLoop(); const c = words[st.w].chars[st.c];
      st.typed = [...c.jamo]; st.k = c.jamo.length; render(); charDone();
    } else if (a === "retry") { hush(); st.sent = false; markSent(); Object.assign(st, { w: 0, c: 0, k: 0, typed: [] }); render(); }
  };

  setNote(); render();
  return () => { hush(); delete app.__wr; };
}
