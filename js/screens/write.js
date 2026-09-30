// 쓰기 — 옛 앱 쓰기 연습 형태 그대로(문장 → 단어 → 글자 · 자모 칸 · 자모 자판)
// + 글자 반복 듣기: 문장 위 글자를 누르면 그 소리가 계속 반복, 다시 누르면 멈춤
import { t, lang } from "../i18n.js";
import { esc, glossCards, toJamo, compose, vowelLen, JAMO_AUDIO } from "../text.js";
import { episode, chars } from "../data.js";
import { paths } from "../paths.js";
import { Sequence, Looper, blip } from "../audio.js";
import { I } from "../ui.js";

const CONS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"], DBL = [..."ㄲㄸㅃㅆㅉ"], VOW = [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"];

export default async function write(app, ep, id) {
  const [d, idx] = await Promise.all([episode(ep, lang), chars()]);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const cards = glossCards(line.glossLine);
  const words = line.ko.split(/\s+/).map(w => {
    const text = w.replace(/[^가-힣]/g, "");
    const card = cards.find(c => c.ko.replace(/[^가-힣]/g, "") === text);
    return { text, rom: card?.rom || "", mean: card?.mean || "", chars: [...text].map(ch => ({ ch, jamo: toJamo(ch), file: idx[ch] || null })) };
  }).filter(w => w.text);
  const st = { w: 0, c: 0, k: 0, typed: [], busy: false };
  const loop = new Looper(), seq = new Sequence();
  const missing = [...new Set(words.flatMap(w => w.chars.filter(c => !c.file).map(c => c.ch)))];
  if (missing.length) console.info("[쓰기] 글자 음성 없음:", missing.join(" "));

  app.innerHTML = `<section class="scr write">
    <div class="bar"><a class="iconbtn" href="#/learn/${ep}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("write"))}</div><div class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></div></div>
      <a class="iconbtn" href="#/write/${ep}/${d.lines[Math.max(0, li - 1)].id}" aria-label="${esc(t("previous"))}">${I.prev}</a>
      <a class="iconbtn" href="#/write/${ep}/${d.lines[Math.min(d.lines.length - 1, li + 1)].id}" aria-label="${esc(t("next"))}">${I.next}</a></div>
    <div class="sent" lang="ko">${words.map((w, wi) => `<span class="w" data-w="${wi}">${w.chars.map((c, ci) =>
      `<button class="c ko ${c.file ? "" : "noaudio"}" data-w="${wi}" data-c="${ci}" ${c.file ? "" : `aria-disabled="true"`}>${esc(c.ch)}</button>`).join("")}</span>`).join("")}</div>
    <div class="loopnote" aria-live="polite"></div>
    <div class="work"></div>
    <div class="wbtns"><button data-act="word">${esc(t("listen_word"))}</button><button data-act="sent">${esc(t("listen_sentence"))}</button><button data-act="auto">${esc(t("autofill"))}</button></div>
  </section>`;

  const note = app.querySelector(".loopnote"), work = app.querySelector(".work");
  const cbtn = (w, c) => app.querySelector(`.c[data-w="${w}"][data-c="${c}"]`);
  note.textContent = t("loop_hint");

  function render() {
    app.querySelectorAll(".w").forEach(el => el.classList.toggle("on", +el.dataset.w === st.w));
    app.querySelectorAll(".sent .c").forEach(el => {
      const w = +el.dataset.w, c = +el.dataset.c;
      el.classList.toggle("done", w < st.w || (w === st.w && c < st.c));
    });
    if (st.w >= words.length) {
      work.innerHTML = `<div class="done-card"><span class="big ko" lang="ko">${esc(line.ko)}</span>${line.tr ? `<span class="tr">${esc(line.tr)}</span>` : ""}
        <span>${esc(t("sentence_done"))}</span><button class="chip" data-act="retry" style="justify-self:center">${esc(t("retry_writing"))}</button></div>`;
      app.querySelector(".kb")?.remove();
      return;
    }
    const w = words[st.w], c = w.chars[st.c], jam = c.jamo;
    work.innerHTML = `<div class="stage"><div class="box"><span class="target ko" lang="ko">${esc(c.ch)}</span><span class="typed ko" lang="ko">${esc(compose(st.typed, vowelLen(c.ch)))}</span></div>
      <div><div class="word ko" lang="ko">${w.chars.map((x, i) => (i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch))).join("")}</div>
      ${w.rom ? `<div class="rom">${esc(w.rom)}</div>` : ""}${w.mean ? `<div class="mean tr" style="color:var(--hi)">${esc(w.mean)}</div>` : ""}
      <div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}</div></div></div>
      <div class="kb" lang="ko"><span class="lab">${esc(t("consonants"))}</span>${CONS.map(j => `<button data-j="${j}">${j}</button>`).join("")}
      <span class="lab">${esc(t("double_consonants"))}</span>${DBL.map(j => `<button data-j="${j}">${j}</button>`).join("")}
      <span class="lab">${esc(t("vowels"))}</span>${VOW.map(j => `<button class="v" data-j="${j}">${j}</button>`).join("")}</div>`;
  }

  function charDone() {
    const w = words[st.w], c = w.chars[st.c];
    st.busy = true;
    if (c.file && !loop.src) blip(paths.char(c.file));
    setTimeout(() => {
      st.busy = false; st.c++; st.k = 0; st.typed = [];
      if (st.c >= w.chars.length) { st.w++; st.c = 0; }
      render();
    }, 650);
  }
  function press(j) {
    if (st.busy || st.w >= words.length) return;
    const c = words[st.w].chars[st.c];
    if (JAMO_AUDIO[j] && !loop.src) blip(paths.jamo(JAMO_AUDIO[j]));
    if (c.jamo[st.k] !== j) { const s = work.querySelector(".slot.current"); s?.classList.remove("shake"); void s?.offsetWidth; s?.classList.add("shake"); return; }
    st.typed.push(j); st.k++;
    render();
    if (st.k >= c.jamo.length) charDone();
  }

  app.querySelector(".scr").onclick = e => {
    const k = e.target.closest("[data-j]");
    if (k) return press(k.dataset.j);
    const cb = e.target.closest(".sent .c");
    if (cb) {
      const c = words[+cb.dataset.w].chars[+cb.dataset.c];
      if (!c.file) { note.textContent = t("no_char_audio", { c: c.ch }); return; }
      app.querySelectorAll(".sent .c.loop").forEach(x => x.classList.remove("loop"));
      const on = loop.toggle(paths.char(c.file));
      cb.classList.toggle("loop", on);
      note.textContent = on ? t("loop_on", { c: c.ch }) : t("loop_hint");
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "word" && st.w < words.length) { loop.stop(); resetLoopUi(); seq.play(words[st.w].chars.filter(c => c.file).map(c => ({ src: paths.char(c.file) }))); }
    if (a === "sent" && line.lineAudio) { loop.stop(); resetLoopUi(); seq.play([{ src: paths.audio(ep, line.lineAudio) }]); }
    if (a === "auto" && st.w < words.length && !st.busy) { const c = words[st.w].chars[st.c]; st.typed = [...c.jamo]; st.k = c.jamo.length; render(); charDone(); }
    if (a === "retry") { Object.assign(st, { w: 0, c: 0, k: 0, typed: [] }); render(); }
  };
  function resetLoopUi() { app.querySelectorAll(".sent .c.loop").forEach(x => x.classList.remove("loop")); note.textContent = t("loop_hint"); }

  render();
  return () => { loop.stop(); seq.stop(); };
}
