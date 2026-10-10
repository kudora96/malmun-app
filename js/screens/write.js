// 쓰기 — 말문 앱 방식(투덜이 10-01 「너가 만든 거로 · 예전 것 절대 쓰지 말고」)
//
// 학습자가 누르면 무엇이 되나
//  W1 위 토막의 글자 누르기 = 그 글자 소리 반복 ⇄ 멈춤(한 번에 한 글자) · 소리 없는 글자는 흐리게
//  W2 자판 — 맞으면 「딩동」 → 그 자모 소리 · 틀리면 칸이 흔들리고 귀여운 「뿅뿅↘」 → 그래도 그 자모 소리(공부니까 · 10-01)
//  W3 글자를 다 치면 「딩동」 → 마지막 자모 소리 → 0.6초 쉼 → 다음 글자 · 완성된 글자를 읽어 주는 소리는 없다(10-01 투덜이 「굳이 필요 없다」)
//     소리가 나는 동안은 자판을 받지 않는다(소리가 잘리지 않게)
//  W4 [단어 듣기] = 지금 낱말 통째 · 낱말 칸의 글자(글 · 자 · 가)를 누르면 그 글자 하나 소리(10-01) · [이 부분 듣기] = 지금 토막(다시 누르면 멈춤) — 본부가 일레븐랩스로 따로 만든 소리(05_audio/{ep}/units/{id}.mp3 ·
//     앞뒤 여유 문장으로 읽혀 그 말만 남김) · 아직 없으면 대사 원음을 잘라서(words.json cs/ce) · 글자 소리 이어 붙이기·줄 전체는 쓰지 않는다
//     [자동 완성] = 지금 토막의 남은 글자를 앱이 한 자모씩 대신 쳐 준다 — 자음·모음 소리만(글자·단어·문장 소리 없음 · 10-01) · 다시 누르거나 자판을 누르면 멈춤
//     글자·자모 소리 = 공용 아나운서 목소리(05_audio/_chars_f · data/chars_f.json) · 아직 없는 글자는 지금 글자 소리
//     토막 = data/{ep}/{ep}.units.json 으로 고정(tools/writing_units.py) — 좁은 화면은 글자를 줄여 맞춘다
//  W5 소리는 언제나 하나만 · 새 일을 하면 앞 소리는 멈춘다
//  W6 영상 창 안(embedded): 창 안에서 스크롤 없이 다 보이게 — 긴 문장은 토막으로(◀ 1/3 ▶) ·
//     토막을 다 쓰면 자동으로 다음 토막 · 줄을 다 쓰면 대사를 듣고 자동으로 다음 줄 쓰기 · 아래 ▶ = 이 부분 듣기
import { t, lang } from "../i18n.js?v=1010.19";
import { esc, glossCards, toJamoW, jamoParts, compose, vowelLen, JAMO_AUDIO } from "../text.js?v=1010.19";
import { episode, chars, charsF } from "../data.js?v=1010.19";
import { paths } from "../paths.js?v=1010.19";
import { I, spkHtml } from "../ui.js?v=1010.19";
import { audioCtx, hold } from "../wake.js?v=1010.19";
import * as sfx from "../sfx.js?v=1010.19";
import { scoreFx } from "../scorefx.js?v=1010.19";
import { units as jamoUnits, baseOf, shapeFix } from "../jamobox.js?v=1010.19"; // 자모 자리 나누기(획순 · 자판 덧칠 · 손글씨 덩어리 — 본부 10-07) // 손글씨 점수 효과 = 말하기와 같은 규칙(본부 10-07)

const KEYS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ"], VOW = [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"];
const VOW2 = [..."ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ"]; // 겹모음 줄(본부 10-06) — 칸 하나 · ㅓ+ㅣ 처럼 나눠 쳐도 받음
// 자판 줄(본부 10-06 투덜이 「단추가 제각각」) — 모든 단추 같은 모양·같은 너비(10칸 줄 기준) · 칸이 모자란 줄은 가운데
const KB_ROWS = [KEYS.slice(0, 10), KEYS.slice(10), VOW, VOW2.slice(0, 6), VOW2.slice(6)];
const GAP_NEXT = 600;     // 글자 소리 → 다음 글자 사이

// ── 소리(W5) — 한 번에 하나 · 차례 재생 · 취소 ── 짧은 소리는 전부 미리 풀어 둔 버퍼로(js/sfx.js)
let actx, token = 0, loopUrl = null, loopTimer = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
function hush() { token++; clearTimeout(loopTimer); loopUrl = null; sfx.stopAll(); }
// 한 글자 소리 반복(W1) — 끝나면 0.6초 쉬고 다시
function startLoop(url) {
  hush(); loopUrl = url;
  const again = async () => {
    if (loopUrl !== url) return;
    await sfx.play(url);
    if (loopUrl === url) loopTimer = setTimeout(again, 600);
  };
  again();
}
function tone(kind) { // 딩동(맞음) · 뿅뿅↘(틀림 — 귀엽게)
  try {
    actx = audioCtx(); // 깨워 둔 장치와 같은 것
    if (kind === "ok") {
      for (const [f, at] of [[880, 0], [1320, 0.09]]) {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + at;
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.2);
      }
    } else { // 뿅뿅↘ — 높은 데서 미끄러져 내려오는 짧은 두 번(장난감 소리처럼)
      for (const [f0, f1, at] of [[720, 520, 0], [560, 360, 0.12]]) {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + at;
        o.type = "triangle"; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + 0.1);
        g.gain.setValueAtTime(0.2, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.14);
      }
    }
  } catch {}
  return wait(kind === "ok" ? 260 : 300);
}
// steps: "ok" | "bad" | number(쉼 ms) | 소리 주소 — 앞 것을 끊고 차례로
async function run(steps) {
  hush(); const my = token;
  for (const s of steps) {
    if (my !== token) return false;
    if (s === "ok" || s === "bad") await tone(s);
    else if (typeof s === "number") await wait(s);
    else if (s && s.clip) await sfx.play(s.clip, { offset: s.start, dur: s.end - s.start, fade: 0.03 }); // 원음 한 토막(앞뒤 0.03초 페이드)
    else if (s && s.unit) { // 따로 만든 소리 · 파일이 정말 없을 때만 원음으로
      if (!(await sfx.play(s.unit)) && s.fallback && my === token) await (s.fallback.clip ? sfx.play(s.fallback.clip, { offset: s.fallback.start, dur: s.fallback.end - s.fallback.start, fade: 0.03 }) : sfx.play(s.fallback));
    } else if (s) await sfx.play(s);
  }
  return my === token;
}

export default async function write(app, ep, id, opts = {}) {
  const [d, idx, cf] = await Promise.all([episode(ep, lang), chars(), charsF(ep)]);
  // 글자·자모 소리: 공용 아나운서(chars_f) 먼저 · 없으면 지금 글자 소리 · 자모는 옛 jamo 이름
  const charSrc = ch => (cf[ch] ? paths.charF(cf[ch]) : idx[ch] ? paths.char(idx[ch]) : null);
  const jamoSrc = j => (cf[j] ? paths.charF(cf[j]) : JAMO_AUDIO[j] ? paths.jamo(JAMO_AUDIO[j]) : null);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const cards = glossCards(line.glossLine);
  const allWords = line.ko.split(/\s+/).filter(w => /[가-힣]/.test(w)).map((raw, wi) => {
    const text = raw.replace(/[^가-힣]/g, "");
    const pc = (line.v9?.pieces || []).find(p => String(p.ko).replace(/[^가-힣]/g, "") === text); // 10-06: 고유명사 = 한글 그대로(「"세종대왕" ले」)
    const card = pc ? { rom: pc.rom || "", mean: pc.mean || "" } : cards.find(c => c.ko.replace(/[^가-힣]/g, "") === text);
    const tm = line.words?.[wi]?.w === raw ? line.words[wi] : null; // 대사 원음 안 이 낱말의 시각
    return { raw, text, tm, rom: card?.rom || "", mean: card?.mean || "", end: /[.?!…]$/.test(raw), chars: [...text].map(ch => ({ ch, jamo: toJamoW(ch), file: charSrc(ch) })) };
  });
  // 토막(W6) = units.json 고정 목록(없으면 같은 규칙으로 여기서 나눔: 문장 끝 · 8글자 · 기대는 말에서 안 끊음)
  const U = line.units;
  allWords.forEach((w, i) => { w.unit = U?.words?.[i]?.id || null; });
  let segs = U?.parts?.length ? U.parts.map(p => Object.assign(p.words.map(i => allWords[i]).filter(Boolean), { unit: p.id })) : null;
  const SEG_MAX = 8, BOUND = new Set(["수", "것", "거", "줄", "적", "데", "때", "그", "온", "더", "안", "못", "잘"]);
  if (!segs) segs = [];
  let cur = [], n = 0;
  for (const w of U?.parts?.length ? [] : allWords) {
    if (cur.length && n + w.text.length > SEG_MAX && !BOUND.has(cur[cur.length - 1].raw)) { segs.push(cur); cur = []; n = 0; }
    cur.push(w); n += w.text.length;
    if (w.end) { segs.push(cur); cur = []; n = 0; }
  }
  if (cur.length) segs.push(cur);
  const st = { s: 0, w: 0, c: 0, k: 0, typed: [], part: "", busy: false, done: false, queue: [], loopAt: null, sent: false, alive: true, auto: false, wrote: new Set(), mode: (() => { try { return localStorage.getItem("malmun.wmode") === "hand" ? "hand" : "kb"; } catch { return "kb"; } })() };
  const wkey = (s2, w, c) => `${s2}.${w}.${c}`;
  if (opts.pos && Number.isInteger(opts.pos.s) && opts.pos.s < segs.length) { const ws = segs[opts.pos.s] || []; st.s = opts.pos.s; st.w = Math.min(opts.pos.w || 0, Math.max(0, ws.length - 1)); st.c = Math.min(opts.pos.c || 0, Math.max(0, (ws[st.w]?.chars.length || 1) - 1)); (opts.pos.wrote || []).forEach(k => st.wrote.add(k)); } // ने⇄한 토글 뒤 같은 토막·글자(본부 10-08)
  // 쓰기 방법(본부 10-07 투덜이 「ㅇ」) — ⌨ 자판 / ✍ 손글씨 · 고른 것 기억
  const modeBtns = () => `<span class="wmode" role="group">${[["kb", "⌨ " + t("w_kb")], ["hand", "✍ " + t("w_hand")]].map(([m, l]) => `<button data-mode="${m}" aria-pressed="${st.mode === m}">${esc(l)}</button>`).join("")}</span>`;
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  hush();

  app.innerHTML = `<section class="scr write ${opts.embedded ? "embedded" : ""}">
    ${opts.embedded
      ? `<div class="whead"><b>${esc(t("write"))}</b><span class="sub">${li + 1} / ${d.lines.length} · ${spkHtml(line.speaker)}</span>${modeBtns()}<button class="whelp" data-act="help" aria-label="${esc(t("help"))}">${esc(t("help_btn"))}</button><button class="whelp wclose" data-act="close" aria-label="${esc(t("close_btn"))}">✕<span class="lt">${esc(String(t("close_btn")).replace(/^✕\s*/, " "))}</span></button><span class="loopnote" aria-live="polite"></span></div>`
      : `<div class="bar"><a class="iconbtn" href="#/learn/${ep}/${line.id}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("write"))}</div><div class="sub">${li + 1} / ${d.lines.length} · ${spkHtml(line.speaker)}</div></div>${modeBtns()}<button class="whelp" data-act="help" aria-label="${esc(t("help"))}">${esc(t("help_btn"))}</button></div><div class="loopnote" aria-live="polite"></div>`}
    <div class="segrow"><div class="sent" lang="ko"></div><div class="segnav"></div><div class="wtip" hidden>${esc(t("w_tip"))}</div></div>
    <div class="work"></div>
    <div class="helpbox" hidden>${[1, 2, 3, 4, 5, 6].map(k => `<p>${esc(t("help_wr_" + k))}</p>`).join("")}<p class="x">${esc(t("help_close"))}</p></div>
    <div class="wbtns"><button data-act="sent">${esc(t("listen_part"))}</button><button data-act="auto">${esc(t("autofill"))}</button></div>
  </section>`;

  const $ = s => app.querySelector(s);
  const note = $(".loopnote"), work = $(".work"), sentEl = $(".sent"), segnav = $(".segnav");
  const words = () => segs[st.s] || [];
  const setNote = () => { note.textContent = st.loopAt ? t("loop_on", { c: st.loopAt.ch }) : ""; }; // 처음 안내는 말풍선(본부 10-06)
  // 단어 듣기·이 부분 듣기·자동 완성 = 위 글자 칸 오른쪽에 세로로(본부 10-06 투덜이 — 아래 줄이 자판 마지막 줄과 겹침) · 그릴 때마다 그 자리로 옮김
  const wb = $(".wbtns");
  const markSent = () => wb.querySelector("[data-act=sent]").setAttribute("aria-pressed", String(st.sent));
  function stopLoop() { if (!st.loopAt) return; st.loopAt = null; hush(); paintSent(); setNote(); }
  function resetSounds() { stopLoop(); hush(); st.sent = false; markSent(); }

  // 지금 토막의 원음 구간(낱말 시각이 없으면 줄 전체)
  const unitSrc = id => (id ? paths.unit(ep, id) : null);
  const partStep = () => {
    const ws = words(), a = ws[0]?.tm, b = ws[ws.length - 1]?.tm;
    const cut = a && b && lineSrc ? { clip: lineSrc, start: a.start, end: b.end } : lineSrc;
    return ws.unit ? { unit: unitSrc(ws.unit), fallback: cut } : cut;
  };
  const wordStep = w => {
    const cut = w.tm && lineSrc ? { clip: lineSrc, start: w.tm.start, end: w.tm.end } : null;
    return w.unit ? { unit: unitSrc(w.unit), fallback: cut } : cut;
  };
  function toggleSentence() { // W4 · 아래 ▶ = 이 부분 듣기
    if (!lineSrc || st.s >= segs.length) return;
    if (st.sent) { st.sent = false; hush(); return markSent(); }
    stopLoop(); st.sent = true; markSent();
    run([partStep()]).then(() => { st.sent = false; markSent(); });
  }
  app.__wr = { owners: async ch => { await stkReady; const list = strokesOf(ch); return { list, ...inkOwners(ch, list), GN }; }, font: () => `${glyphWeight()} ${glyphFont()}`, reveal: async (ch, n = 200) => { await stkReady; await document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, ch).catch(() => {}); const list = strokesOf(ch); return { list, at: (k, f = 1) => revealOrder(ch, n, list, k, f) }; }, glyphCv: (ch, n = 200) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; glyph(cv.getContext("2d"), n, ch, "#000"); return cv; }, st: () => st, hand: () => st.hand, traceOf: ch => traceOf(ch), centerOf: ch => centerOf(ch), unitsOf: ch => unitsOf(ch), strokesOf: async ch => (await stkReady, strokesOf(ch)), strokeHint: (H, S) => strokeHint(H, S), strokeFit: async ch => { await stkReady; const us = unitsOf(ch), L = strokesOf(ch); return us.map((u, ui) => { const P = L.filter(S => S.unit === ui); let n = 0, k = 0; for (const S of P) { const f = fitOf(u, S.pts), m = S.pts.length - 1; n += m; k += f * m; } return { jamo: u.jamo, fit: n ? k / n : null }; }); }, handScore: (ch, S) => handScore(ch, S), handJudge: () => handJudge(), toggle: toggleSentence, brushPath: (ch, S) => brushPath(ch, S), paintCheck: (ch, k, n) => paintCheck(ch, k, n), busy: () => st.busy || st.done || st.queue.length > 0 || st.sent || st.auto || sfx.playing() }; // busy = 점검 도구가 소리 끝을 기다릴 때

  function paintSent() {
    sentEl.innerHTML = `<svg class="spk" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12"/></svg>` + (segs[Math.min(st.s, segs.length - 1)] || []).map((w, wi) => `<span class="w ${wi === st.w ? "on" : ""}">${w.chars.map((c, ci) =>
      `<button class="c ko ${c.file ? "" : "noaudio"} ${st.wrote.has(wkey(Math.min(st.s, segs.length - 1), wi, ci)) ? "done" : ""} ${st.loopAt && st.loopAt.w === wi && st.loopAt.c === ci ? "loop" : ""} ${wi === st.w && ci === st.c && st.s < segs.length ? "now" : ""}" data-w="${wi}" data-c="${ci}" ${c.file ? "" : 'aria-disabled="true"'}>${esc(c.ch)}</button>`).join("")}</span>`).join("");
    segnav.innerHTML = segs.length > 1
      ? `<button data-seg="-1" ${st.s ? "" : "disabled"} aria-label="${esc(t("previous"))}">◀</button><span>${st.s + 1}/${segs.length}</span><button data-seg="1" ${st.s < segs.length - 1 ? "" : "disabled"} aria-label="${esc(t("next"))}">▶</button>`
      : "";
    fitSent(); // ◀ n/N ▶ 까지 그린 뒤에 잰다(그 전엔 줄이 더 넓게 잡힘)
  }
  // 위 글자 줄 = 한 줄에(본부 10-06 — 단추 테두리까지 잰 폭 · ◀ 1/3 ▶ 와 안 겹치게) · 넘치면 글자 크기·안쪽 여백·낱말 사이를 같이 줄임 · 🔊 는 그대로
  //  창이 아직 그려지기 전이면 폭이 0 이라 못 잰다 → 그려진 뒤·크기가 바뀔 때 다시
  function fitSent() {
    const cs = [...sentEl.querySelectorAll(".c")]; if (!cs.length || !sentEl.clientWidth) return;
    cs.forEach(c => { c.style.fontSize = ""; c.style.padding = ""; }); sentEl.style.columnGap = "";
    sentEl.querySelectorAll(".w").forEach(w => { w.style.gap = ""; });
    const over = () => sentEl.scrollWidth > sentEl.clientWidth + 1;
    for (let fs = parseFloat(getComputedStyle(cs[0]).fontSize) - 1; over() && fs >= 12; fs -= 1) {
      cs.forEach(c => { c.style.fontSize = fs + "px"; c.style.padding = fs < 21 ? "0 2px" : ""; });
      sentEl.style.columnGap = fs < 21 ? "6px" : ""; if (fs < 17) sentEl.querySelectorAll(".w").forEach(w => { w.style.gap = "1px"; });
    }
  }
  // 세 단추 자리(10-06 투덜이 「게 옆으로 가로로」) — 넓은 쓰기 창(440px↑) = 낱말 단추 바로 옆(모자라면 그 아래 줄로 꺾임) · 좁은 창(폰) = 글자 칸 아래 한 줄
  function placeBtns() { // 세 단추 = 자모 칸(ㄱ □) 오른쪽 같은 줄(투덜이 10-06 「여기다 · 그럼 더 많이 줄어」) — 글자 칸이 두 줄(로마자·뜻 / 자모 칸+단추)로 · 안 들어가면 단추 글 작게 → 두 줄로 좁게 → 자모 칸 작게 · 그래도 안 되면 아래 줄
    const stg = work.querySelector(".stage"), row = stg?.querySelector(".slotrow"); if (!row) return;
    row.append(wb); stg.classList.add("btns-in");
    const sl = row.querySelector(".slots"), bs = [...wb.querySelectorAll("button")];
    const wrapped = () => row.scrollWidth > row.clientWidth + 1 || bs.some(b => Math.abs(b.getBoundingClientRect().top - bs[0].getBoundingClientRect().top) > 2);
    stg.classList.remove("c1", "c2", "c3", "c4");
    for (const c of ["c1", "c2", "c3", "c4"]) { if (!wrapped()) break; stg.classList.add(c); } // 줄은 꺾지 않음(글자 칸 높이 고정 · 10-06)
  }
  // 낱말 칸 글자 단추 = 한 줄 · 넘치면 글자 크기·안쪽 여백을 같이 줄임(위 글자 줄과 같은 방식) · 로마자는 아래 줄 따로
  // 로마자·뜻 줄(투덜이 10-07 「단어 듣기」 빈자리) — 크게(로마자 15 · 뜻 17px)에서 칸 폭에 들어갈 때까지 줄임(최소 11px)
  function fitSub2() {
    const r = work.querySelector(".info .sub2"); if (!r || !r.clientWidth) return; const xs = [...r.querySelectorAll(".rom, .mean")]; xs.forEach(x => x.style.removeProperty("font-size"));
    for (let k = 0; k < 8 && r.scrollWidth > r.clientWidth + 1; k++) xs.forEach(x => { const f = parseFloat(getComputedStyle(x).fontSize); if (f > 11) x.style.fontSize = f - 1 + "px"; });
    // 낮은 창(본부 10-07 660×560 — 단추 줄이 자판을 2px 덮음) — 단추 줄과 자판 사이 4px 이 될 때까지 더 줄임(최소 11px)
    const bt = work.querySelector(".wbtns"), kb = work.querySelector(".kb"), gap = () => (bt && kb ? kb.getBoundingClientRect().top - bt.getBoundingClientRect().bottom : 99);
    for (let k = 0; k < 8 && gap() < 4; k++) { let moved = false; xs.forEach(x => { const f = parseFloat(getComputedStyle(x).fontSize); if (f > 11) { x.style.fontSize = f - 1 + "px"; moved = true; } }); if (!moved) break; }
  }
  // 머리 줄 한 줄 유지(본부 10-07) — 넘치면 ✕ 닫기 글을 숨기고 ✕ 만
  function fitHeadW() { const h = work.closest(".write")?.querySelector(".whead") || app.querySelector(".whead"); if (!h) return; h.classList.remove("narrow"); if (h.scrollWidth > h.clientWidth + 1) h.classList.add("narrow"); }
  function fitWord() {
    fitSub2(); fitHeadW();
    const row = work.querySelector(".info .word"); if (!row || !row.clientWidth) return;
    const bs = [...row.querySelectorAll(".wc")]; bs.forEach(b => { b.style.fontSize = ""; b.style.padding = ""; });
    for (let fs = parseFloat(getComputedStyle(bs[0] || row).fontSize) - 1; row.scrollWidth > row.clientWidth + 1 && fs >= 11; fs -= 1) bs.forEach(b => { b.style.fontSize = fs + "px"; b.style.padding = fs < 16 ? "0 2px" : ""; });
  }
  let fitQ = 0; new ResizeObserver(() => { clearTimeout(fitQ); fitQ = setTimeout(() => { fitSent(); placeBtns(); fitWord(); const c0 = st.s < segs.length ? words()[st.w]?.chars[st.c] : null; if (c0) paintBox(c0, work.querySelector(".box.ok") != null); }, 30); }).observe(sentEl);
  // 낱말 묶음 표시(투덜이 10-08 — 위 줄은 「하」「고」 한 글자씩인데 뜻은 「ha-go」 통째라 「고 = गर्न」 처럼 보임)
  //  뜻 줄 앞에 낱말 전체(지금 글자 굵게) · 로마자도 음절 수가 맞으면 지금 음절 굵게 · 위 글자 줄은 같은 낱말 밑에 이음 막대(css)
  const romMark = (rom, n, i) => { const p = String(rom).split("-"); return p.length === n ? p.map((x, k) => (k === i ? `<b>${esc(x)}</b>` : esc(x))).join("-") : esc(rom); };
  function render() {
    paintSent();
    if (st.s >= segs.length) {
      work.innerHTML = `<div class="done-card"><span class="big ko" lang="ko">${esc(line.ko)}</span>${line.tr ? `<span class="tr">${esc(line.tr)}</span>` : ""}
        <span>${esc(t("sentence_done"))}</span><button class="chip" data-act="retry">${esc(t("retry_writing"))}</button></div>`;
      wb.remove(); return;
    }
    const w = words()[st.w], c = w.chars[st.c], jam = c.jamo;
    work.innerHTML = `<div class="stage"><div class="box" role="button" tabindex="0" aria-label="${esc(t("listen_char") || "▶")}"><canvas class="tcv" aria-hidden="true"></canvas><span class="target ko" lang="ko">${esc(c.ch)}</span><span class="typed ko" lang="ko">${esc(compose([...st.typed, st.part].flatMap(jamoParts), vowelLen(c.ch)))}</span></div>
      <div class="info">${w.rom || w.mean || st.mode === "hand" ? `<div class="sub2">${w.chars.length > 1 ? `<span class="wko ko" lang="ko">${w.chars.map((x, i) => i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch)).join("")}</span>` : ""}${w.rom ? `<span class="rom">${romMark(w.rom, w.chars.length, st.c)}</span>` : ""}${w.mean ? `<span class="mean tr">${esc(w.mean)}</span>` : ""}${st.mode === "hand" ? `<span class="htools" role="group">${Object.entries(TOOLS).map(([k, v]) => `<button data-tool="${k}" aria-pressed="${toolKey() === k}">${v.icon} ${esc(t("h_" + k))}</button>`).join("")}</span>` : ""}</div>` : ""}
      <div class="slotrow"><div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}</div></div></div></div>
      ${st.mode === "hand" ? `<div class="hand"><div class="hbox"><canvas class="hguide" aria-hidden="true"></canvas><canvas class="hink" aria-label="${esc(t("w_hand"))}"></canvas><b class="hscore" hidden></b><span class="fx" aria-hidden="true"></span></div><div class="hbtns"><button data-act="hdone">✓ ${esc(t("h_done"))}</button><button data-act="horder">✎ ${esc(t("h_order"))}</button><button data-act="hundo">↶ ${esc(t("h_undo"))}</button><button data-act="hclear"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 3.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H6.6l-3-3a2 2 0 0 1 0-2.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 9.8l5 5M6.6 18H21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> ${esc(t("h_clear"))}</button></div></div>`
        : `<div class="kb" lang="ko">${KB_ROWS.map(r => `<div class="kr">${r.map(j => `<button data-j="${j}">${j}</button>`).join("")}</div>`).join("")}</div>`}`;
    paintBox(c); if (st.lineEnd) { work.querySelector(".box")?.classList.add("ok"); paintBox(c, true); } // 줄 끝 = 마지막 글자 완성 표시 그대로 // 자판 칸 = 회색 글자 위에 친 자모 자리만 진하게(본부 10-07 · 글자가 따로 그려져 어긋나던 것)
    work.classList.toggle("handmode", st.mode === "hand"); // 손글씨 = 위 작은 글자 상자·자모 칸 숨기고 큰 칸을 키움(본부 10-07)
    if (st.mode === "hand") setupHand(c);
    fitWord(); placeBtns();
    fitWord(); setTimeout(fitWord, 30); // 낱말 글자 단추 = 한 줄(본부 10-06 — 세 단추 때문에 좁아져 꺾이던 것)
  }
  function goSeg(s) { st.auto = false; markAuto(); resetSounds(); st.busy = false; Object.assign(st, { s, w: 0, c: 0, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false }); render(); }

  // ── 손글씨 따라 쓰기 1단계(본부 10-07) — 흐린 회색 글자 위에 손가락·마우스·펜으로 · 판정 = 글자 마스크 덮음 × (1 − 벗어남) ≥ 70%
  //  덮음 = 글자 픽셀 중 펜 자국 근처(펜 굵기 2.4배 안)인 것 · 벗어남 = 펜 픽셀 중 글자(펜 굵기만큼 너그럽게 부풀림) 밖인 것 · 다 썼으면 「✓」 또는 1.2초 손 뗀 채면 자동
  // 본보기 글꼴(본부 10-07 시안 → 투덜이 고운바탕) — gothic = 앱 한글 고딕(굵게) · batang = 고운바탕(획 고르고 붓 끝) · myeongjo = 나눔명조 · 진단 스위치 malmun.hfont
  // 손글씨 글꼴(투덜이 10-07 결정 바꿈 「맑은 고딕처럼 일자로 죽 그리는 글씨」) — 모든 기기에서 같은 모양인 Noto Sans KR 500 기본 · 고운바탕·명조·굵은 고딕은 진단 스위치(malmun.hfont)로만
  const HFONT = { gothic500: ["500", () => '"Noto Sans KR", sans-serif'], gothic: ["700", () => getComputedStyle(sentEl).fontFamily], batang: ["700", () => '"Gowun Batang", serif'], myeongjo: ["800", () => '"Nanum Myeongjo", serif'] };
  const hfontKey = () => { try { const k = localStorage.getItem("malmun.hfont"); return HFONT[k] ? k : "gothic500"; } catch { return "gothic500"; } };
  const PEN = 0.06, PASS_H = 0.7, glyphFont = () => HFONT[hfontKey()][1](), glyphWeight = () => HFONT[hfontKey()][0];
  // 글자 그림 = 한 번(400×400)만 그려 두고 크기만 바꿔 씀 — 회색 안내 글자와 판정 마스크가 픽셀까지 같은 자리
  const GN = 400, gCache = new Map();
  function glyphImg(ch, grow = 0) {
    const key = ch + "|" + grow + "|" + hfontKey(); if (gCache.has(key)) return gCache.get(key);
    const cv = document.createElement("canvas"); cv.width = cv.height = GN; const okG = glyphRaw(cv.getContext("2d"), GN, ch, "#000", grow * GN); if (okG && document.fonts?.check?.(`${glyphWeight()} 40px ${glyphFont()}`, ch) !== false) gCache.set(key, cv); return cv; // 글꼴이 아직이면 저장 안 함(본부 10-07 1280×720 — 글꼴 오기 전 모양으로 자모 자리가 틀어져 획순이 구석에 작게)
  }
  function glyph(x, n, ch, color, grow = 0) { // grow = 칸에 대한 비율
    const img = glyphImg(ch, grow), t = document.createElement("canvas"); t.width = t.height = n; const tx = t.getContext("2d");
    tx.drawImage(img, 0, 0, n, n); tx.globalCompositeOperation = "source-in"; tx.fillStyle = color; tx.fillRect(0, 0, n, n);
    x.drawImage(t, 0, 0);
  }
  function glyphRaw(x, n, ch, color, grow = 0) { // n×n 칸 가운데 꽉 차게(글꼴 실제 글자 상자로 맞춤)
    x.font = `${glyphWeight()} ${Math.round(n * 0.8)}px ${glyphFont()}`; const m = x.measureText(ch), w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const f = Math.min((n * 0.84) / Math.max(1, w), (n * 0.84) / Math.max(1, h)); x.font = `${glyphWeight()} ${Math.round(n * 0.8 * f)}px ${glyphFont()}`;
    const m2 = x.measureText(ch), cx = n / 2 + (m2.actualBoundingBoxLeft - m2.actualBoundingBoxRight) / 2, cy = n / 2 + (m2.actualBoundingBoxAscent - m2.actualBoundingBoxDescent) / 2;
    x.fillStyle = x.strokeStyle = color; x.textBaseline = "alphabetic"; x.textAlign = "left"; x.fillText(ch, cx, cy);
    if (grow) { x.lineWidth = grow; x.lineJoin = "round"; x.strokeText(ch, cx, cy); }
    return w >= 1 && h >= 1; // 글자 상자를 못 재면(글꼴 아직) 거짓
  }
  // 쓰기 도구(본부 10-07 투덜이 「더 실감 나고 재미있게」) — 연필 4% · 펜 7% · 붓 12%(빠르면 가늘고 천천히·꾹 누르면 굵게 0.5~1.2배 · 끝은 가늘게) · 고른 것 기억
  const TOOLS = { pencil: { w: 0.04, color: "#4a4a50", icon: "✏️" }, pen: { w: 0.07, color: "#1f2a5c", icon: "🖊" }, brush: { w: 0.12, color: "#161616", icon: "🖌" } };
  const toolKey = () => { try { const k = localStorage.getItem("malmun.htool"); return TOOLS[k] ? k : "pen"; } catch { return "pen"; } };
  // 획 그리기 — S.w = 그 획 도구 굵기(칸 비율 · 없으면 PEN) × 점마다 굵기 배수(p[2]) · extra = 더 붙일 굵기(px · 판정 「덮음」용) · look = 눈에 보이는 그림(연필 결·붓 끝)
  function inkPath(x, n, strokes, extra = 0, color = "#000", look = false) {
    x.lineCap = x.lineJoin = "round";
    for (const S of strokes) { if (!S.length) continue;
      const base = (S.w ?? PEN) * n, f = i => S[i]?.[2] ?? 1, col = look && S.tool && !color ? TOOLS[S.tool].color : color || "#000";
      x.strokeStyle = x.fillStyle = col;
      if (S.length === 1) { x.beginPath(); x.arc(S[0][0] * n, S[0][1] * n, (base * f(0) + extra) / 2, 0, Math.PI * 2); x.fill(); continue; }
      const L = S.length, taper = i => (look && S.tool === "brush" ? Math.min(1, 0.35 + (0.65 * (L - 1 - i)) / Math.min(4, L - 1)) : 1); // 붓 끝 가늘게(마지막 4점)
      if (S.tool === "brush" || S.some(p => p[2] != null)) for (let i = 1; i < L; i++) { x.lineWidth = base * ((f(i - 1) + f(i)) / 2) * taper(i) + extra; x.beginPath(); x.moveTo(S[i - 1][0] * n, S[i - 1][1] * n); x.lineTo(S[i][0] * n, S[i][1] * n); x.stroke(); }
      else { x.lineWidth = base + extra; x.beginPath(); x.moveTo(S[0][0] * n, S[0][1] * n); for (const [a, b] of S.slice(1)) x.lineTo(a * n, b * n); x.stroke();
        if (look && S.tool === "pencil") { x.save(); x.globalAlpha = 0.35; x.lineWidth = Math.max(1, base * 0.25); for (const o of [-0.32, 0.32]) { x.beginPath(); S.forEach(([a, b], i) => { const j = ((i * 7919) % 5) / 5 - 0.4; (i ? x.lineTo : x.moveTo).call(x, a * n + o * base + j, b * n - o * base * 0.5 + j); }); x.stroke(); } x.restore(); } } // 연필 결
    }
  }
  const pix = (n, fn) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; const x = cv.getContext("2d", { willReadFrequently: true }); fn(x); return x.getImageData(0, 0, n, n).data; };
  // 판정(본부 10-07 투덜이 「비슷해도 넘어가 버림」 → 엄하게)
  //  · 글자 = 획 덩어리(이어진 픽셀 — 「이」면 ㅇ·ㅣ)로 나눠 덩어리마다 덮음 ≥ 75% (한 획 빼먹거나 대충 지나가면 실패)
  //  · 덮음 = 펜 자국에서 「펜 굵기 절반 + 2px」 안 · 벗어남 = 글자 밖으로 펜 굵기 하나 넘게 떨어진 펜 픽셀 비율(가까이 삐져나온 건 봐줌)
  //  · 점수 = (덩어리 덮음 가장 낮은 값 0.6 + 평균 0.4) × (1 − 벗어남) · 80% 이상 ☆ 통과 · 95% 이상 ★ · 덩어리 하나라도 75% 아래면 79% 까지
  const COMP_MIN = 0.75;
  function compsOf(mask, N) { // 4방향 이웃 덩어리 · 아주 작은 조각(글자 픽셀 0.5% 미만)은 버림
    const lab = new Int32Array(N * N).fill(-1), comps = []; let total = 0;
    for (let i = 0; i < N * N; i++) if (mask[i * 4 + 3] > 128) total++;
    for (let i = 0; i < N * N; i++) { if (lab[i] >= 0 || mask[i * 4 + 3] <= 128) continue;
      const id = comps.length, list = [i], px = []; lab[i] = id;
      while (list.length) { const q = list.pop(); px.push(q); const x = q % N, y = (q / N) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (lab[j] < 0 && mask[j * 4 + 3] > 128) { lab[j] = id; list.push(j); } } }
      comps.push(px); }
    return comps.filter(c => c.length >= total * 0.005);
  }
  function handScore(ch, strokes, boxPx = st.hand?.s || 260) {
    const N = 160, k = N / boxPx, mask = pix(N, x => glyph(x, N, ch, "#000")), maskD = pix(N, x => glyph(x, N, ch, "#000", PEN * 2));
    // 덮음 = 도구 굵기와 상관없이 「획 가운데를 따라 갔나」(투덜이 10-08 — 가는 펜은 굵은 글자를 다 못 칠해 100 이 안 나옴)
    //  학습자 선을 가는 선으로 보고 글자 획 굵기(T = 2 × 넓이 / 둘레) + 2px 만큼 넓혀 잼 → 연필·펜·붓 같은 결과 · 벗어남 = 도구 굵기 그대로
    let area = 0, edge = 0; for (let q = 0; q < N * N; q++) { if (mask[q * 4 + 3] <= 128) continue; area++; const x0 = q % N, y0 = (q / N) | 0; if (!x0 || !y0 || x0 === N - 1 || y0 === N - 1 || mask[(q - 1) * 4 + 3] <= 128 || mask[(q + 1) * 4 + 3] <= 128 || mask[(q - N) * 4 + 3] <= 128 || mask[(q + N) * 4 + 3] <= 128) edge++; }
    const T = edge ? (2 * area) / edge : PEN * N, thin = strokes.map(S => Object.assign(S.map(q => [q[0], q[1]]), { w: 0 }));
    const near = pix(N, x => inkPath(x, N, thin, T + 4 * k)), ink = pix(N, x => inkPath(x, N, strokes, 0));
    const us = unitsOf(ch), sc = N / UN, tot = us.reduce((a, u) => a + u.px.length, 0);
    const comps = us.length ? us.filter(u => u.px.length >= tot * 0.005).map(u => [...new Set(u.px.map(q => Math.min(N - 1, Math.floor((q % UN) * sc)) + Math.min(N - 1, Math.floor(Math.floor(q / UN) * sc)) * N))].filter(q => mask[q * 4 + 3] > 128)) : compsOf(mask, N), miss = []; // 덩어리 = 자모 자리(자판 덧칠·획순과 같은 나눔)
    const cov = comps.map(c => { let n = 0; for (const q of c) { if (near[q * 4 + 3] > 128) n++; else miss.push(q); } return c.length ? n / c.length : 0; });
    let p = 0, out = 0; for (let i = 3; i < ink.length; i += 4) if (ink[i] > 128) { p++; if (maskD[i] <= 128) out++; }
    const low = cov.length ? Math.min(...cov) : 0, avg = cov.length ? cov.reduce((a, b) => a + b, 0) / cov.length : 0, outside = p ? out / p : 1;
    const ok = cov.length > 0 && low >= COMP_MIN, raw = (0.6 * low + 0.4 * avg) * Math.max(0, 1 - 1.5 * outside); // 벗어남 1.5배(덮음을 굵기와 상관없이 너그럽게 한 만큼 · 10-08)
    const pct = Math.max(0, Math.min(100, Math.floor(raw * 100 + 1e-9)));
    return { score: raw, pct: ok ? pct : Math.min(pct, 79), ok, comps: cov, low, avg, cover: avg, outside, miss, N, T };
  }
  // 점검 도구용 — 글자 가운데 선(거리 변환 능선 점들) = 조심스럽게 가운데를 따라 그린 사람
  const centerOf = ch => { const N = 160, mask = pix(N, x => glyph(x, N, ch, "#000")), on = i => mask[i * 4 + 3] > 128, d = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) d[i] = on(i) ? 1e9 : 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!d[i]) continue; if (x) d[i] = Math.min(d[i], d[i - 1] + 1); if (y) d[i] = Math.min(d[i], d[i - N] + 1); }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!d[i]) continue; if (x < N - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < N - 1) d[i] = Math.min(d[i], d[i + N] + 1); }
    const out = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; if (d[i] < 2) continue; let top = true; for (const j of [i - 1, i + 1, i - N, i + N]) if (d[j] > d[i]) top = false; if (top) out.push([[(x + 0.5) / N, (y + 0.5) / N]]); }
    return out; };
  // 점검 도구용 — 글자 마스크를 가로줄로 훑은 획(정규화 0~1)
  const traceOf = ch => { const N = 160, mask = pix(N, x => glyph(x, N, ch, "#000")), step = Math.max(2, Math.round(PEN * N * 0.8)), out = [];
    for (let y = Math.floor(step / 2); y < N; y += step) { let x0 = -1; for (let x = 0; x <= N; x++) { const on = x < N && mask[(y * N + x) * 4 + 3] > 128; if (on && x0 < 0) x0 = x; if (!on && x0 >= 0) { out.push([[(x0 + 0.5) / N, (y + 0.5) / N], [(x - 0.5) / N, (y + 0.5) / N]]); x0 = -1; } } }
    return out; };
  // 자모 자리(js/jamobox.js) — 같은 글꼴 마스크로 · 글꼴이 바뀌면 다시
  const UN = 200, uCache = new Map();
  // ㅇ 고리 바로잡기(투덜이 10-08 「왕」) — 글꼴이 ㅇ 아래와 ㅗ 꼭지를 이어 그리면 자모 나누기가 ㅇ 아래 반을 ㅗ 에 줌 → 획순이 ㅇ 위 → 아래 두 번
  //  ㅇ 자모마다 가장 가까운 「구멍」(글자 밖과 이어지지 않은 빈 곳)을 찾아, 그 구멍에서 획 굵기만큼 안의 잉크 = ㅇ 몫으로 되돌림
  function ringFix(us, m) {
    const N = UN, on = i => m[i * 4 + 3] > 128, idx = us.map((u, k) => (u.jamo === "ㅇ" || u.jamo === "ㅎ" ? k : -1)).filter(k => k >= 0); // ㅎ 도 동그라미(「호」 — ㅎ 고리가 ㅗ 몫이 되던 것) if (!idx.length) return us;
    const outside = new Uint8Array(N * N), st0 = [];
    for (let i = 0; i < N; i++) for (const q of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!on(q) && !outside[q]) { outside[q] = 1; st0.push(q); }
    while (st0.length) { const q = st0.pop(), x = q % N, y = (q / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (!outside[j] && !on(j)) { outside[j] = 1; st0.push(j); } } }
    const hole = new Int32Array(N * N).fill(-1), holes = [];
    for (let q = 0; q < N * N; q++) { if (on(q) || outside[q] || hole[q] >= 0) continue; const id = holes.length, px = [], s = [q]; hole[q] = id;
      while (s.length) { const p = s.pop(); px.push(p); const x = p % N, y = (p / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (hole[j] < 0 && !on(j) && !outside[j]) { hole[j] = id; s.push(j); } } }
      if (px.length >= 6) { let sx = 0, sy = 0; for (const p of px) { sx += p % N; sy += (p / N) | 0; } holes.push({ id, px, cx: sx / px.length / N, cy: sy / px.length / N }); } }
    if (!holes.length) return us;
    let area = 0, edge = 0; for (let q = 0; q < N * N; q++) { if (!on(q)) continue; area++; const x = q % N, y = (q / N) | 0; if (!x || !y || x === N - 1 || y === N - 1 || !on(q - 1) || !on(q + 1) || !on(q - N) || !on(q + N)) edge++; }
    const D = Math.ceil(((2 * area) / Math.max(1, edge)) * 1.05), owner = new Int16Array(N * N).fill(-1); us.forEach((u, k) => { for (const q of u.px) owner[q] = k; });
    const used = new Set();
    for (const k of idx) { const u = us[k]; let sx = 0, sy = 0; for (const q of u.px) { sx += q % N; sy += (q / N) | 0; } const ux = sx / u.px.length / N, uy = sy / u.px.length / N;
      let hb = null, bd = Infinity; for (const h of holes) { if (used.has(h.id)) continue; const d = Math.hypot(h.cx - ux, h.cy - uy); if (d < bd) { bd = d; hb = h; } }
      if (u.jamo === "ㅎ") { hb = null; bd = Infinity; for (const h of holes) { if (used.has(h.id) || h.cy < uy - 0.02) continue; const d = Math.hypot(h.cx - ux, h.cy - uy); if (d < bd) { bd = d; hb = h; } } } // ㅎ 동그라미 = 꼭지·가로 아래
      if (!hb || bd > (u.jamo === "ㅎ" ? 0.4 : 0.25)) continue; used.add(hb.id);
      const dist = new Int16Array(N * N).fill(-1), qd = []; for (const p of hb.px) { dist[p] = 0; qd.push(p); }
      for (let h = 0; h < qd.length; h++) { const p = qd[h], x = p % N, y = (p / N) | 0; if (dist[p] >= D) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { /* 8방향(대각 쪽 고리 바깥도) */ const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (dist[j] < 0 && on(j)) { dist[j] = dist[p] + 1; qd.push(j); } } }
      for (let q = 0; q < N * N; q++) if (dist[q] > 0 && owner[q] !== k) owner[q] = k; }
    const out = us.map(u => ({ ...u, px: [] })); for (let q = 0; q < N * N; q++) if (owner[q] >= 0) out[owner[q]].px.push(q);
    // 고리 넓히기가 다른 자모를 절반 넘게 먹으면 그 자모는 원래대로(본부 10-08 「흑」 — ㅎ 동그라미 바로 아래 ㅡ 가 1% 만 남던 것)
    out.forEach((u, k) => { if (u.px.length < us[k].px.length * 0.5) { const keep = new Set(us[k].px); out.forEach((v, j) => { if (j !== k) v.px = v.px.filter(q => !keep.has(q)); }); u.px = us[k].px.slice(); } });
    for (const u of out) { if (!u.px.length) continue; let a = N, b = N, c = -1, d = -1; for (const q of u.px) { const x = q % N, y = (q / N) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } u.box = [a / N, b / N, (c + 1) / N, (d + 1) / N]; }
    return out.map((u, k) => (u.px.length ? u : us[k])); // 자모 칸은 빼지 않음(빼면 뒤 자모가 한 칸씩 밀림 · 본부 10-08)
  }
  const unitsOf = ch => { const k = ch + "|" + hfontKey(); if (uCache.has(k)) return uCache.get(k); const m = pix(UN, x => glyph(x, UN, ch, "#000")), us = ringFix(jamoUnits(ch, m, UN), m); if (shapeFix(us, m, UN)) us.forEach(u => { if (!u.px.length) return; let a = UN, b = UN, c = -1, d = -1; for (const q of u.px) { const x = q % UN, y = (q / UN) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } u.box = [a / UN, b / UN, (c + 1) / UN, (d + 1) / UN]; delete u.set; delete u.half; }); /* ㅇ 고리 보정 뒤 획 모양 한 번 더(「어」「예」 ㅓㅕ 꼭지 뿌리) */ if (gCache.has(ch + "|0|" + hfontKey())) uCache.set(k, us); return us; }; // 글꼴 그림이 저장된(= 글꼴 온) 뒤에만 기억
  // 획순 자료(data/jamo_strokes.json · 본부) → 이 글자 획(0~1 · 쓰는 차례) = 자모 획 점을 그 자모 잉크 상자에 늘려 맞춤
  let STK = null; const stkReady = fetch(`data/jamo_strokes.json?v=${document.documentElement.dataset.v || ""}`).then(r => r.json()).then(d => (STK = d)).catch(() => null);
  // 획 끝 늘이기(투덜이 10-08 「대」 — ㅐ 의 ㅏ 가로획 자료가 0.04 길이라 가로획 잉크 대부분이 다음 ㅣ 몫이 되어 4번째 획이 안 칠해짐)
  //  열린 획의 두 끝을 그 방향으로 글자 잉크가 이어지는 데까지 늘임 · 다른 획 몸통(굵기 절반 90% 안)에 닿으면 거기서 멈춤
  const segDist = (P, x, y) => { let bd = Infinity; for (let a = 1; a < P.length; a++) { const ax = P[a - 1][0], ay = P[a - 1][1], dx = P[a][0] - ax, dy = P[a][1] - ay, ll = dx * dx + dy * dy || 1e-9, r = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / ll)); bd = Math.min(bd, Math.hypot(x - ax - dx * r, y - ay - dy * r)); } return P.length === 1 ? Math.hypot(x - P[0][0], y - P[0][1]) : bd; };
  function extendEnds(list, us) {
    const ownU = new Int16Array(UN * UN).fill(-1); us.forEach((u, k) => { for (const q of u.px) ownU[q] = k; });
    const at = (x, y) => { const cx = Math.round(x * UN - 0.5), cy = Math.round(y * UN - 0.5); return cx >= 0 && cy >= 0 && cx < UN && cy < UN ? ownU[cy * UN + cx] : -1; };
    for (const S of list) { const P = S.pts; if (P.length < 2) continue; const a0 = P[0], z = P[P.length - 1]; if (Math.hypot(a0[0] - z[0], a0[1] - z[1]) < 0.02) continue; // 닫힌 획(ㅇ) 제외
      for (const end of [0, P.length - 1]) { const q = P[end], prev = P[end === 0 ? 1 : P.length - 2], L = Math.hypot(q[0] - prev[0], q[1] - prev[1]); if (L < 1e-6) continue;
        const dx = (q[0] - prev[0]) / L, dy = (q[1] - prev[1]) / L, step = 0.5 / UN; let best = q;
        const near0 = new Set(list.filter(T => T !== S && segDist(T.pts, q[0], q[1]) < 0.9 * halfOf(T))); // 늘이기 시작할 때 이미 몸통 안인 획(「대」 ㅏ 짧은 가로 = ㅏ 세로에 붙어 시작)은 멈춤 기준에서 뺌
        for (let k = 1; k < UN; k++) { const x = q[0] + dx * step * k, y = q[1] + dy * step * k, o = at(x, y); if (o < 0 || o < S.unit) break; // 잉크 끝 · 먼저 쓴 자모(ㅗ 꼭지가 ㅇ 안으로) 에선 멈춤
          if (list.some(T => T !== S && !near0.has(T) && segDist(T.pts, x, y) < 0.9 * halfOf(T))) break; best = [x, y]; }
        P[end] = best; } }
  }
  function strokesOf(ch) {
    if (!STK) return [];
    const out = [];
    unitsOf(ch).forEach((u, ui) => { const base = STK.base?.[u.jamo]; if (!base) return;
      const pts = base.flat(), bx0 = Math.min(...pts.map(p => p[0])), bx1 = Math.max(...pts.map(p => p[0])), by0 = Math.min(...pts.map(p => p[1])), by1 = Math.max(...pts.map(p => p[1]));
      // 자료 점 = 획 가운데 선 → 잉크 상자를 획 굵기 절반만큼 안으로(굵기 ≈ 2 × 넓이 / 둘레)
      u.set ||= new Set(u.px); let edge = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) edge++;
      const half = Math.min(0.06, u.px.length / Math.max(1, edge) / UN), b0 = u.box, bw = b0[2] - b0[0], bh = b0[3] - b0[1];
      const x0 = b0[0] + Math.min(half, bw / 3), x1 = b0[2] - Math.min(half, bw / 3), y0 = b0[1] + Math.min(half, bh / 3), y1 = b0[3] - Math.min(half, bh / 3), mx = v => (bx1 - bx0 < 0.05 ? (x0 + x1) / 2 : x0 + ((v - bx0) / (bx1 - bx0)) * (x1 - x0)), my = v => (by1 - by0 < 0.05 ? (y0 + y1) / 2 : y0 + ((v - by0) / (by1 - by0)) * (y1 - y0));
      for (const S of base) out.push({ unit: ui, u, role: u.role, jamo: u.jamo, pts: snap(u, S.map(([x, y]) => [mx(x), my(y)])) }); });
    extendEnds(out, unitsOf(ch));
    return out;
  }
  // 획 붙이기(본부 10-07) — 상자 맞춤 뒤 획을 자기 방향에 수직으로 ±12%(상자 기준) 안에서 옮겨 보며 잉크와 가장 많이 겹치는 자리로
  //  가로획 = 위아래 · 세로획 = 좌우 · 비스듬·꺾인·둥근 획 = 두 방향 모두 · 같으면 덜 옮긴 쪽
  const inkIn = (u, x, y) => { u.set ||= new Set(u.px); const cx = Math.round(x * UN), cy = Math.round(y * UN); for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (u.set.has((cy + dy) * UN + cx + dx)) return true; return false; };
  const fitOf = (u, P) => { let n = 0, k = 0; for (let i = 1; i < P.length; i++) for (let f = 0; f <= 1; f += 0.125) { n++; if (inkIn(u, P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f)) k++; } return n ? k / n : 0; };
  function snap(u, P) {
    if (P.length < 2) return P;
    const bw = u.box[2] - u.box[0], bh = u.box[3] - u.box[1], dx = P[P.length - 1][0] - P[0][0], dy = P[P.length - 1][1] - P[0][1];
    const horiz = P.length === 2 && Math.abs(dx) > 3 * Math.abs(dy), vert = P.length === 2 && Math.abs(dy) > 3 * Math.abs(dx);
    const xs = horiz ? [0] : Array.from({ length: 13 }, (_, i) => (i - 6) * 0.02 * bw), ys = vert ? [0] : Array.from({ length: 13 }, (_, i) => (i - 6) * 0.02 * bh);
    let best = [0, 0], bf = fitOf(u, P) + 1e-9;
    for (const ox of xs) for (const oy of ys) { if (!ox && !oy) continue; const f = fitOf(u, P.map(([x, y]) => [x + ox, y + oy])); if (f > bf + 1e-6 || (Math.abs(f - bf) < 1e-6 && Math.hypot(ox, oy) < Math.hypot(...best))) { bf = f; best = [ox, oy]; } }
    return P.map(([x, y]) => [x + best[0], y + best[1]]);
  }
  // 획순 칠(본부 10-07 투덜이 「획 그림이 회색 글자와 어긋남」) — 주황 선을 따로 긋지 않고 회색 글자 자체를 그 획 차례대로 주황으로 드러냄
  //  그 자모 잉크(jamobox 덩어리)만 · 글꼴 잉크로 자름 → 모양은 늘 글꼴과 같음 · 옆 자모는 안 건드림
  //  upto = 다 칠한 획 수 · f = 지금 획 진행(0~1) → { cv: 주황 칠 캔버스(n×n), ends: 획마다 { a: 시작 잉크 점, b: 끝 잉크 점, dir } (0~1) }
  const OR_FILL = "#c8641a", OR_MARK = "#7a3410";
  const nearInk = (u, [px, py]) => { let bd = Infinity, best = [px, py]; for (let i = 0; i < u.px.length; i++) { const q = u.px[i], x = (q % UN + 0.5) / UN, y = (Math.floor(q / UN) + 0.5) / UN, d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = [x, y]; } } return best; };
  //  잉크 나누기(본부 10-07 「칠하는 중 톱니·빈틈」) — 글자 그림(400px · 글꼴 그대로 부드러운 가장자리)의 잉크 점마다 그 자모(jamobox) 획 중 가장 가까운 획 + 그 획 위 자리(0~1)
  //  칠 = 글꼴 잉크 알파 × 진행 앞머리 부드럽게(획 길이 4%) → 빈틈·톱니 없음 · 한 획이 끝나면 그 획 몫 잉크 전부
  const ownCache = new Map(), SOFT = 0.04;
  const halfOf = S => { const u = S.u; if (!u) return 0; if (u.half == null) { u.set ||= new Set(u.px); let e = 0; for (const q of u.px) if (!u.set.has(q - 1) || !u.set.has(q + 1) || !u.set.has(q - UN) || !u.set.has(q + UN)) e++; u.half = u.px.length / Math.max(1, e) / UN; } return u.half * 1.15; }; // 그 자모 획 굵기 절반(0~1) · 조금 넉넉히
  function inkOwners(ch, list) {
    const k = ch + "|" + hfontKey() + "|" + list.length; if (ownCache.has(k)) return ownCache.get(k);
    const us = unitsOf(ch), img = glyphImg(ch), ga = img.getContext("2d").getImageData(0, 0, GN, GN).data, own = new Int16Array(GN * GN).fill(-1), pos = new Float32Array(GN * GN), alpha = new Uint8ClampedArray(GN * GN);
    const u200 = new Int16Array(UN * UN).fill(-1); us.forEach((u, ui) => { for (const q of u.px) u200[q] = ui; });
    const unitAt = (x, y) => { const cx = Math.min(UN - 1, (x * UN / GN) | 0), cy = Math.min(UN - 1, (y * UN / GN) | 0); for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < UN && Y < UN && u200[Y * UN + X] >= 0) return u200[Y * UN + X]; } return -1; };
    const segs = list.map(S => { const P = S.pts, L = [0]; for (let q = 1; q < P.length; q++) L.push(L[q - 1] + Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1])); return { P, L, tot: L[L.length - 1] || 1 }; });
    const byUnit = us.map((u, ui) => list.map((S, si) => (S.unit === ui ? si : -1)).filter(v => v >= 0));
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) { const q = y * GN + x, a = ga[q * 4 + 3]; if (a < 8) continue; alpha[q] = a;
      const ui = unitAt(x, y), mine = ui >= 0 ? byUnit[ui] : []; const cand = mine.length ? mine : list.map((_, si) => si); // 자모를 못 찾은 가장자리 점 = 모든 획 중 가까운 것
      const px = (x + 0.5) / GN, py = (y + 0.5) / GN; let bd = Infinity, bs = -1, bt = 0, es = -1, et = 0;
      // 겹치는 곳(ㅏ 의 ㅣ·짧은 가로 만나는 자리 등) = 먼저 긋는 획 몫(투덜이 10-08 — 가장 가까운 획으로만 나누면 ㅣ 안에 회색 삼각형이 남음)
      // 가장 가까운 획 = 그 자모 획 중에서 · 「먼저 긋는 획 몸통 안」 = 모든 획에서(투덜이 10-08 「왕」 — 글꼴이 ㅇ 아래와 ㅗ 꼭지를 이어 그려 ㅇ 아랫부분이 ㅗ 자모 몫이 되어 ㅇ 을 위 → 아래 두 번에 칠함)
      const inCand = new Set(cand);
      for (let si = 0; si < list.length; si++) { const { P, L, tot } = segs[si], hw = halfOf(list[si]), mineS = inCand.has(si);
        if (P.length === 1) { const d = Math.hypot(px - P[0][0], py - P[0][1]); if (mineS && d < bd) { bd = d; bs = si; bt = 0; } if (d <= hw && (es < 0 || si < es)) { es = si; et = 0; } continue; }
        for (let a2 = 1; a2 < P.length; a2++) { const ax = P[a2 - 1][0], ay = P[a2 - 1][1], dx = P[a2][0] - ax, dy = P[a2][1] - ay, ll = dx * dx + dy * dy || 1e-9, r0 = ((px - ax) * dx + (py - ay) * dy) / ll, r = Math.max(0, Math.min(1, r0)), d = Math.hypot(px - ax - dx * r, py - ay - dy * r), tt = (L[a2 - 1] + r * Math.sqrt(ll)) / tot;
          if (mineS && d < bd - 1e-9) { bd = d; bs = si; bt = tt; }
          const body = (a2 > 1 || r0 >= 0) && (a2 < P.length - 1 || r0 <= 1); // 획 몸통 안(둥근 끝 제외 — 끝이 옆 획을 파먹지 않게)
          if (body && d <= hw && (es < 0 || si < es)) { es = si; et = tt; } } }
      if (es >= 0) { bs = es; bt = et; }
      own[q] = bs; pos[q] = bt; }
    // 닫힌 획(ㅇ · ㅎ 의 동그라미) = 가운데를 도는 각도로 칠 자리(투덜이 10-08 「왕」 — 가장 가까운 변으로 나누면 위 반 → 아래 반으로 칠해짐)
    list.forEach((S, si) => { const P = S.pts; if (P.length < 5 || Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) > 0.02) return;
      const xs = P.map(p => p[0]), ys = P.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rx = Math.max(1e-3, (Math.max(...xs) - Math.min(...xs)) / 2), ry = Math.max(1e-3, (Math.max(...ys) - Math.min(...ys)) / 2);
      const ang = (x, y) => Math.atan2((y - cy) / ry, (x - cx) / rx), T2 = Math.PI * 2, mod = v => ((v % T2) + T2) % T2, a0 = ang(...P[0]), dec = mod(a0 - ang(...P[1])) < Math.PI; // 자료가 도는 방향
      for (let q = 0; q < GN * GN; q++) if (own[q] === si) { const t = ang((q % GN + 0.5) / GN, (Math.floor(q / GN) + 0.5) / GN); pos[q] = (dec ? mod(a0 - t) : mod(t - a0)) / T2; } });
    const o = { own, pos, alpha }; if (gCache.has(ch + "|0|" + hfontKey())) ownCache.set(k, o); return o; // 글꼴 온 뒤에만 기억
  }
  // 칠 앞머리 자리(0~1 좌표) — 획 점 줄 위 f 지점(붓끝 점)
  const pointAt = (S, f) => { const P = S.pts; if (P.length < 2) return P[0]; let tot = 0; const L = []; for (let k = 1; k < P.length; k++) { const d = Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); L.push(d); tot += d; } let left = tot * f;
    for (let k = 1; k < P.length; k++) { if (left <= L[k - 1]) { const r = L[k - 1] ? left / L[k - 1] : 0; return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * r, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * r]; } left -= L[k - 1]; } return P[P.length - 1]; };
  // 획순 칠 = 붓 그리기(본부 10-08 투덜이 「요」 — 잉크 점마다 주인 정하기는 획이 붙는 곳마다 모호 → 「폴리곤으로 다 칠해야」)
  //  획마다 획 가운데 선을 따라 둥근 붓(굵기 = 그 자모 획 굵기 × 1.3)으로 진행만큼 그림 → 제 자모 잉크(+2칸)로 자르고 → 글꼴 잉크로 잘라 주황
  //  한 번 칠한 곳은 계속 주황(겹친 곳 = 먼저 지나간 획) · 마지막 획이 끝나면 글자 잉크 전부 주황(회색 0) · 자판 칠·손글씨 점수는 지금 나눔 그대로
  const unitMaskCache = new Map();
  function unitMask(ch, ui) { // 그 자모 잉크 + 둘레 2칸(UN 기준) → GN 캔버스
    const k = ch + "|" + hfontKey() + "|" + ui; if (unitMaskCache.has(k)) return unitMaskCache.get(k);
    const us = unitsOf(ch), role = us[ui]?.role, m = document.createElement("canvas"); m.width = m.height = UN; const mx = m.getContext("2d"), id = mx.createImageData(UN, UN);
    for (const u of us) if (u.role === role) for (const q of u.px) id.data[q * 4 + 3] = 255; mx.putImageData(id, 0, 0); // 같은 자리 자모 모두(겹모음 ㅐ = ㅏ+ㅣ)
    const out = document.createElement("canvas"); out.width = out.height = GN; const ox = out.getContext("2d"), d = GN / UN;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) ox.drawImage(m, dx * d, dy * d, GN, GN);
    if (gCache.has(ch + "|0|" + hfontKey())) unitMaskCache.set(k, out); return out;
  }
  // 붓 길(본부 10-08) — 자료 선을 그 자리 잉크 한가운데로 옮기고(선에 수직으로 제 자모 잉크 폭을 재어 가운데) · 붓 굵기 = 그 자리 잉크 폭 × 1.15(획 굵기 3배 넘으면 = 다른 획과 겹친 곳 → 획 굵기로)
  const pathCache = new Map();
  function brushPath(ch, S) {
    const key = ch + "|" + hfontKey() + "|" + S.unit + "|" + S.pts.map(p => p.map(v => v.toFixed(3)).join(",")).join(";"); if (pathCache.has(key)) return pathCache.get(key);
    const u = S.u; halfOf(S); u.set ||= new Set(u.px); const hw = u.half || 0.03, P = S.pts, raw = [];
    const inU = (x, y) => { const X = Math.floor(x * UN), Y = Math.floor(y * UN); return X >= 0 && Y >= 0 && X < UN && Y < UN && u.set.has(Y * UN + X); };
    const st = 0.5 / UN, lim = 4 * hw, span = (x, y, nx, ny) => { let a = 0, b = 0; while (a < lim && inU(x - nx * (a + st), y - ny * (a + st))) a += st; while (b < lim && inU(x + nx * (b + st), y + ny * (b + st))) b += st; return [a, b]; };
    if (P.length < 2) raw.push({ x: P[0][0], y: P[0][1], nx: 0, ny: 0, off: 0, wd: 2 * hw });
    else for (let k = 1; k < P.length; k++) { const ax = P[k - 1][0], ay = P[k - 1][1], dx = P[k][0] - ax, dy = P[k][1] - ay, L = Math.hypot(dx, dy); if (L < 1e-6) continue; const nx = -dy / L, ny = dx / L, steps = Math.max(1, Math.ceil(L * UN));
      for (let i = 0; i <= steps; i++) { if (k > 1 && i === 0) continue; const px = ax + dx * (i / steps), py = ay + dy * (i / steps), r = { x: px, y: py, nx, ny, off: null, wd: null };
        if (inU(px, py)) { const [a, b] = span(px, py, nx, ny); r.off = (b - a) / 2; r.wd = a + b; }
        else { for (let d = st; d < 2 * hw && r.off == null; d += st) for (const sg of [1, -1]) { const qx = px + nx * d * sg, qy = py + ny * d * sg; if (r.off == null && inU(qx, qy)) { const [a, b] = span(qx, qy, nx, ny); r.off = d * sg + (b - a) / 2; r.wd = a + b; } } } // 선이 잉크 밖 = 가까운 쪽 잉크로
        raw.push(r); } }
    // 보통 굵기 = 잰 폭의 중앙값 · 다른 획과 만나는 곳(폭이 보통의 1.5배 넘음)·잉크 밖은 가운데를 옮기지 않고 앞뒤 자리를 이어 씀(「대」 ㅣ 붓 길이 가로대 쪽으로 휘어 가로대 끝을 가리던 것)
    const ws = raw.filter(r => r.wd != null).map(r => r.wd).sort((p, q) => p - q), med = Math.min(ws[ws.length >> 1] || 2 * hw, 2 * hw * 1.6), good = r => r.wd != null && r.wd <= med * 1.5; // 보통 굵기 상한 = 그 자모 획 굵기 × 1.6(「예」 짧은 꼭지는 세로획 안 표본이 많아 중앙값이 세로 길이가 되던 것)
    let last = null; for (const r of raw) { if (good(r)) last = r.off; else r.off2 = last; } last = null; for (let i = raw.length - 1; i >= 0; i--) { const r = raw[i]; if (good(r)) last = r.off; else r.off = r.off2 ?? last ?? 0; }
    const out = raw.map(r => ({ x: r.x + r.nx * (r.off || 0), y: r.y + r.ny * (r.off || 0), w: Math.max(2 * hw, Math.min(r.wd ?? med, med)) * 1.15 }));
    { const ws2 = out.map(q => q.w).sort((p, q) => p - q), m2 = ws2[ws2.length >> 1] || 2 * hw * 1.15; out.forEach(q => (q.w = Math.min(q.w, m2 * 1.3))); }
    for (let r = 0; r < 2; r++) for (let i = 1; i < out.length - 1; i++) { out[i].x = (out[i - 1].x + 2 * out[i].x + out[i + 1].x) / 4; out[i].y = (out[i - 1].y + 2 * out[i].y + out[i + 1].y) / 4; } // 부드럽게
    let tot = 0; out.forEach((q, i) => { if (i) tot += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y); q.t = tot; }); out.tot = tot || 1e-6;
    if (gCache.has(ch + "|0|" + hfontKey())) pathCache.set(key, out); return out;
  }
  function brushStroke(ctx, ch, S, f, k = 1) { // 획 앞쪽 f 만큼 · 자리마다 그 자리 굵기 둥근 붓(제 자모 잉크로 잘리니 겉모양은 글꼴 그대로) · k = 굵기 배수(1/1.15 = 실제 잉크 폭)
    const Q = brushPath(ch, S); if (!Q.length) return; const lim = Q.tot * Math.max(0, Math.min(1, f));
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ctx.fillStyle = "#000";
    if (Q.length === 1) { ctx.beginPath(); ctx.arc(Q[0].x * GN, Q[0].y * GN, (Q[0].w * k * GN) / 2, 0, Math.PI * 2); ctx.fill(); return; }
    for (let i = 1; i < Q.length && Q[i - 1].t <= lim; i++) { const A = Q[i - 1], B = Q[i], r = B.t > lim ? (lim - A.t) / Math.max(1e-9, B.t - A.t) : 1;
      ctx.beginPath(); ctx.lineWidth = Math.max(A.w, B.w) * k * GN; ctx.moveTo(A.x * GN, A.y * GN); ctx.lineTo((A.x + (B.x - A.x) * r) * GN + 0.01, (A.y + (B.y - A.y) * r) * GN); ctx.stroke(); }
  }
  function revealOrder(ch, n, list, upto, f) {
    const us = unitsOf(ch), img = glyphImg(ch), all = upto >= list.length || (upto === list.length - 1 && f >= 1);
    const m = document.createElement("canvas"); m.width = m.height = GN; const mx = m.getContext("2d");
    if (all) mx.drawImage(img, 0, 0); // 마지막 획까지 = 글자 잉크 전부
    else {
      const sc = document.createElement("canvas"); sc.width = sc.height = GN; const sx = sc.getContext("2d");
      for (let si = 0; si <= Math.min(upto, list.length - 1); si++) { const fr = si < upto ? 1 : f; if (fr <= 0) continue;
        sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, GN, GN); brushStroke(sx, ch, list[si], fr);
        sx.globalCompositeOperation = "destination-in"; sx.drawImage(unitMask(ch, list[si].unit), 0, 0); // 같은 자리(초성·중성·종성) 자모 잉크 근처만 — 「대」 ㅐ 가로대 끝(나눔에서 ㅣ 몫)은 칠하고 다른 자모로는 안 넘어감
        mx.drawImage(sc, 0, 0); }
      // 아직 안 그은 획 자리(그 획 붓 길 · 실제 잉크 폭)는 칠하지 않음 — 이미 그은 획과 겹치는 곳(만나는 자리)은 그대로(본부 10-08 「요」 ㅇ 이 꼭지 윗부분 · 꼭지가 가로획 안까지 미리 칠하던 것)
      if (upto + 1 < list.length) { const fu = document.createElement("canvas"); fu.width = fu.height = GN; const fx = fu.getContext("2d"), dn = document.createElement("canvas"); dn.width = dn.height = GN; const dx2 = dn.getContext("2d");
        for (let j = upto + (f > 0 ? 1 : 0); j < list.length; j++) if (j > upto || f <= 0) brushStroke(fx, ch, list[j], 1, 1.1); // 안 그은 획 자리 = 붓 폭보다 조금 넓게(가장자리 실선 조각 안 남게)
        for (let i = 0; i <= Math.min(upto, list.length - 1); i++) brushStroke(dx2, ch, list[i], i < upto ? 1 : f, 1 / 1.15);
        fx.globalCompositeOperation = "destination-out"; fx.drawImage(dn, 0, 0);
        mx.globalCompositeOperation = "destination-out"; mx.drawImage(fu, 0, 0); mx.globalCompositeOperation = "source-over"; }
      { const id = mx.getImageData(0, 0, GN, GN), D = id.data; for (let y = 1; y < GN - 1; y++) for (let x = 1; x < GN - 1; x++) { const i = (y * GN + x) * 4 + 3; if (D[i] < 128 && D[i - 4] >= 128 && D[i + 4] >= 128 && D[i - GN * 4] >= 128 && D[i + GN * 4] >= 128) D[i] = 255; } mx.putImageData(id, 0, 0); } // 한 점 바늘구멍 메움
      mx.globalCompositeOperation = "destination-in"; mx.drawImage(img, 0, 0); // 글꼴 잉크로 자름(모양 = 글꼴)
    }
    const cv = document.createElement("canvas"); cv.width = cv.height = n; const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high"; cx.drawImage(m, 0, 0, n, n);
    cx.globalCompositeOperation = "source-in"; cx.fillStyle = OR_FILL; cx.fillRect(0, 0, n, n);
    const ends = list.map(S => { const u = us[S.unit], P = S.pts, a = u ? nearInk(u, P[0]) : P[0], b = u ? nearInk(u, P[P.length - 1]) : P[P.length - 1], q = P[Math.max(0, P.length - 2)], z = P[P.length - 1]; return { a, b, dir: [z[0] - q[0], z[1] - q[1]] }; });
    return { cv, ends, tip: upto < list.length && f < 1 ? pointAt(list[upto], f) : null };
  }
  const ROLE = { cho: 0, jung: 1, jong: 2 };
  // 학습자 획 하나 → 순서·방향 알림(점수와 별개 · 깎지 않음 · 본부 10-07)
  function strokeHint(H, S) {
    if (!S || S.length < 2) return "";
    const us = unitsOf(H.ch); if (!us.length) return "";
    const [sx, sy] = S[0];
    // 이 획의 자모 = 획 위 점들이 가장 많이 지나간 자모 잉크(4px 너그럽게) · 하나도 안 지나가면 시작점에 가장 가까운 자모 상자
    us.forEach(u => (u.set ||= new Set(u.px)));
    const hitU = (x, y) => { const cx = Math.round(x * UN), cy = Math.round(y * UN); for (let r = 0; r <= 4; r += 2) for (let k = 0; k < us.length; k++) for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (us[k].set.has((cy + dy) * UN + cx + dx)) return k; return -1; };
    const votes = new Array(us.length).fill(0); for (let i = 1; i < S.length; i++) for (let f = 0; f < 1; f += 0.25) { const k = hitU(S[i - 1][0] + (S[i][0] - S[i - 1][0]) * f, S[i - 1][1] + (S[i][1] - S[i - 1][1]) * f); if (k >= 0) votes[k]++; }
    const nS = Math.max(1, (S.length - 1) * 4), mxv = Math.max(...votes); let ui = votes.indexOf(mxv);
    if (mxv < nS * 0.5) { const mid = S[Math.floor(S.length / 2)], m2 = S.length > 1 ? [(S[0][0] + S[S.length - 1][0]) / 2, (S[0][1] + S[S.length - 1][1]) / 2] : mid; let bd = Infinity; us.forEach((u, k) => { let d = Infinity; for (let i = 0; i < u.px.length; i += 3) { const q = u.px[i], e = Math.hypot(m2[0] - (q % UN) / UN, m2[1] - Math.floor(q / UN) / UN); if (e < d) d = e; } if (d < bd) { bd = d; ui = k; } }); } // 잉크를 절반도 안 지나가면 = 획 가운데에 가장 가까운 자모 잉크
    const role = ROLE[us[ui].role]; H.roles ||= new Set();
    if (!H.orderTold) { const need = us.find(u => ROLE[u.role] < role && !H.roles.has(ROLE[u.role])); if (need) { H.orderTold = true; H.roles.add(role); return t("h_order_first", { j: `「${need.jamo}」` }); } }
    H.roles.add(role);
    const [ex, ey] = S[S.length - 1], dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy);
    if (len >= 0.12 && Math.abs(dx) > 2 * Math.abs(dy) && dx < 0) return t("h_dir_lr");
    if (len >= 0.12 && Math.abs(dy) > 2 * Math.abs(dx) && dy < 0) return t("h_dir_tb");
    return "";
  }
  function setupHand(c) {
    const hand = work.querySelector(".hand"), box = hand.querySelector(".hbox"), gv = box.querySelector(".hguide"), iv = box.querySelector(".hink"), bt = hand.querySelector(".hbtns");
    const H = (st.hand = { ch: c.ch, strokes: [], cur: null, timer: 0, s: 0 });
    const col = v => { const e = document.createElement("i"); e.style.color = `var(${v})`; box.append(e); const c2 = getComputedStyle(e).color; e.remove(); return c2; }; // 칸 색 낱말 → 실제 색(밝은·어두운 판 따라)
    const paintGuide = (missN) => { const x = gv.getContext("2d"), n = gv.width; x.clearRect(0, 0, n, n);
      x.strokeStyle = col("--hguide-line"); x.lineWidth = Math.max(1, n / 300); x.setLineDash([n / 60, n / 60]);
      x.beginPath(); x.moveTo(n / 2, 0); x.lineTo(n / 2, n); x.moveTo(0, n / 2); x.lineTo(n, n / 2); x.stroke(); x.setLineDash([]); // 십자 보조선(흐리게)
      glyph(x, n, c.ch, col("--hguide-ink"));
      if (missN) { const { miss, N } = missN, k = n / N; x.fillStyle = "#e08a1e"; for (const i of miss) x.fillRect((i % N) * k, Math.floor(i / N) * k, k + 0.5, k + 0.5); } }; // 덜 덮은 곳 주황
    const paintInk = (color) => { const x = iv.getContext("2d"), n = iv.width; x.clearRect(0, 0, n, n); inkPath(x, n, H.strokes, 0, color || (H.passed ? col("--okc") : null), true); }; // 도구마다 제 색 · 통과 = 초록 // 통과 = 초록(다시 그려도)
    const fit = () => { if (!hand.isConnected) return; const cs = getComputedStyle(hand), px = v => parseFloat(cs[v]) || 0, gap = px("columnGap") || 10; // 칸 크기 = 안쪽 여백 빼고(본부 10-07 왼쪽 끝 3px 에 붙던 것)
      const iw = hand.clientWidth - px("paddingLeft") - px("paddingRight"), ih = hand.clientHeight - px("paddingTop") - px("paddingBottom");
      // 단추 자리 = 오른쪽 한 줄 · 오른쪽 두 줄 · 칸 아래 중 단추가 다 들어가고 칸이 가장 큰 것(도구 3 + 단추 4 = 7개 · 375×667 에서 한 줄이면 넘침)
      const lay = [["", c2 => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["two", () => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["stack", () => Math.min(ih - bt.offsetHeight - (px("rowGap") || 8), iw), () => bt.offsetWidth <= iw + 1]];
      let best = null; for (const [k, sz, fits] of lay) { hand.classList.remove("stack", "two"); if (k) hand.classList.add(k); const v = sz(), f = fits(); if (f && (!best || v > best[1])) best = [k, v]; }
      if (!best) best = ["stack", Math.min(ih - bt.offsetHeight - 8, iw)];
      hand.classList.remove("stack", "two"); if (best[0]) hand.classList.add(best[0]);
      const s = Math.max(60, Math.floor(best[1])), dpr = window.devicePixelRatio || 1;
      box.style.width = box.style.height = s + "px"; for (const cv of [gv, iv]) cv.width = cv.height = Math.round(s * dpr); H.s = s; paintGuide(); paintInk(); };
    fit(); H.ro?.disconnect(); H.ro = new ResizeObserver(() => fit()); H.ro.observe(hand);
    document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, c.ch).catch(() => {}).then(() => document.fonts.ready).then(() => { if (st.hand !== H) return; gCache.clear(); uCache.clear(); fit(); }); // 글꼴이 늦게 오면 글자 그림 다시
    const at = e => { const r = iv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    // 점 = [x, y, 굵기 배수] — 붓만: 진짜 펜이면 누르는 힘 · 아니면 빠르기(칸/초 · 빠를수록 가늘게) · 앞 점과 부드럽게 이어 붙임
    const pt = (e, S) => { const p = at(e); if (toolKey() !== "brush" && !(S && S.tool === "brush")) return p; const now = e.timeStamp || performance.now();
      let f; if (e.pointerType === "pen" && e.pressure > 0) f = 0.5 + 0.7 * Math.min(1, e.pressure);
      else if (!S || !S.length) f = 1; else { const q = S[S.length - 1], dt = Math.max(1, now - (S.t || now - 16)), v = Math.hypot(p[0] - q[0], p[1] - q[1]) / (dt / 1000); f = 1.2 - 0.7 * Math.min(1, v / 2.5); }
      if (S && S.length) f = S[S.length - 1][2] * 0.6 + f * 0.4; if (S) S.t = now; return [p[0], p[1], Math.max(0.5, Math.min(1.2, f))]; };
    iv.addEventListener("pointerdown", e => { if (st.busy || st.auto) return; e.preventDefault(); try { iv.setPointerCapture(e.pointerId); } catch {} clearTimeout(H.timer); stopLoop();
      if (H.ordPlaying || H.ordAt) { H.stopOrder(); paintGuide(); } // 획순 보는 중·멈춘 채 쓰기 시작 = 획순 그만(회색으로)
      if (H.passed) { H.passed = false; H.strokes = []; H.roles = null; H.orderTold = false; markHand(); } // 통과 뒤 다시 그리면 = 다시 쓰기(더 높은 점수)
      clearTimeout(H.clr); { const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; } // 새로 쓰기 시작 = 점수 지움
      const tk = toolKey(); H.cur = Object.assign([pt(e, null)], { tool: tk, w: TOOLS[tk].w }); H.strokes.push(H.cur); paintInk(); });
    iv.addEventListener("pointermove", e => { if (!H.cur) return; e.preventDefault(); const evs = e.getCoalescedEvents?.() || []; for (const ev of evs.length ? evs : [e]) H.cur.push(pt(ev, H.cur)); paintInk(); });
    const up = () => { if (!H.cur) return; const S = H.cur; H.cur = null; clearTimeout(H.timer); H.timer = setTimeout(() => st.hand === H && handJudge(), 1200);
      const msg = strokeHint(H, S); if (msg) bubble(msg); }; // 획순·방향 알림(짧은 말풍선)
    const bubble = msg => { let b = box.querySelector(".hbubble"); if (!b) { b = document.createElement("b"); b.className = "hbubble"; box.append(b); } b.textContent = msg; b.hidden = false; H.hints = (H.hints || []).concat(msg); clearTimeout(H.bt); H.bt = setTimeout(() => (b.hidden = true), 2500); };
    // 획순 보기(본부 10-07) — 회색 글자를 획 차례대로 주황으로 칠해 드러냄(획 0.5초 · revealOrder) · 시작점 번호 원 · 끝에 작은 화살촉(글자 안) → 다 칠하면 1초 뒤 회색으로
    //  keep = 자동 손글씨(다 칠한 채로 남음 = 「써진」 상태) · 다시 누르거나 멈추면 그 자리에서 그침 → true = 끝까지 칠함
    H.showOrder = async ({ keep = false, from = null } = {}) => { // from = { i, f } 멈춘 자리부터 이어서(투덜이 10-08)
      H.ordPlaying = true; H.ordKeep = keep; markOrder();
      if (!keep && !from && H.strokes.length) { clearTimeout(H.timer); clearTimeout(H.clr); H.strokes = []; H.roles = null; H.orderTold = false; if (H.passed) { H.passed = false; markHand(); } const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; paintInk(); } // 획순 보기 = 내가 그린 것 지움(투덜이 10-08)
      await stkReady; await document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, c.ch).catch(() => {}); const list = strokesOf(c.ch); if (!list.length) return false;
      const my = (H.anim = (H.anim || 0) + 1), x = gv.getContext("2d");
      // 칸 크기 = 그릴 때마다 다시 잼(본부 10-07 1280×720 — 쓰기 창 막 연 직후 누르면 칸이 아직 작을 때 크기로 굳어 주황 글자가 왼쪽 위에 작게)
      const marks = (ends, k, f) => { const n = gv.width, lw = PEN * n; // 번호 원(시작 잉크 점) · 화살촉(끝 잉크 점 · 글자 잉크 안으로 자름)
        const ar = document.createElement("canvas"); ar.width = ar.height = n; const ax = ar.getContext("2d"); ax.fillStyle = OR_MARK;
        for (let i = 0; i <= k && i < ends.length; i++) { if (i !== (f < 1 ? k - 1 : k)) continue; const { b, dir } = ends[i], a = Math.atan2(dir[1], dir[0]), h = lw * 0.9, tip = [b[0] * n, b[1] * n];
          ax.beginPath(); ax.moveTo(...tip); ax.lineTo(tip[0] - Math.cos(a - 0.5) * h, tip[1] - Math.sin(a - 0.5) * h); ax.lineTo(tip[0] - Math.cos(a + 0.5) * h, tip[1] - Math.sin(a + 0.5) * h); ax.closePath(); ax.fill(); }
        ax.globalCompositeOperation = "destination-in"; glyph(ax, n, c.ch, "#000"); x.drawImage(ar, 0, 0);
        for (let i = 0; i <= k && i < ends.length; i++) { const [px, py] = [ends[i].a[0] * n, ends[i].a[1] * n], r = lw * 0.62;
          x.fillStyle = OR_MARK; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); x.fillStyle = "#fff"; x.font = `700 ${Math.round(r * 1.3)}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i + 1), px, py + 0.5); } };
      const i0 = from ? Math.min(from.i, list.length - 1) : 0;
      for (let i = i0; i < list.length; i++) {
        const t0 = performance.now() - (from && i === i0 ? from.f * 500 : 0);
        await new Promise(res => { const step = () => { if (H.anim !== my || st.hand !== H) return res(); const f = Math.min(1, (performance.now() - t0) / 500); H.ordAt = { i, f }; const R = revealOrder(c.ch, gv.width, list, i, f); paintGuide(); x.drawImage(R.cv, 0, 0); marks(R.ends, i, f);
          if (R.tip) { const n = gv.width; x.fillStyle = OR_MARK; x.beginPath(); x.arc(R.tip[0] * n, R.tip[1] * n, PEN * n * 0.28, 0, Math.PI * 2); x.fill(); } /* 칠 앞머리 = 작은 둥근 붓끝 점 */ if (f >= 1) return res(); setTimeout(step, 16); }; step(); }); // 60번/초(rAF 는 창이 가려지면 멈춤)
        if (H.anim !== my || st.hand !== H) return false;
      }
      H.ordAt = null; H.ordPlaying = false; markOrder();
      H.orderShown = list.length;
      if (!keep && c.file && st.hand === H && !st.auto) run([c.file]); // 다 그리면 그 글자 소리(「고」) 한 번(투덜이 10-08) · 자동 쓰기는 따로 소리
      if (keep) { paintGuide(); x.drawImage(revealOrder(c.ch, gv.width, list, list.length, 1).cv, 0, 0); return true; } // 자동 = 다 칠한 글자로 남김(번호·화살 없이)
      await new Promise(r => setTimeout(r, 1000)); if (H.anim === my && st.hand === H) paintGuide(); return true;
    };
    H.stopOrder = (pause = false) => { H.anim = (H.anim || 0) + 1; H.ordPlaying = false; if (!pause) { H.ordAt = null; } markOrder(); }; // pause = 그 자리에 칠한 채로 멈춤(다시 누르면 이어서)
    // ✎ 획순 단추 = 그리기 ⇄ 멈춤 ⇄ 이어서(투덜이 10-08 — 다시 누르면 처음부터 다시 그리던 것)
    H.toggleOrder = () => { if (H.ordPlaying) return H.stopOrder(true); const at = H.ordAt; H.showOrder(at ? { from: at } : {}); };
    iv.addEventListener("pointerup", up); iv.addEventListener("pointercancel", up);
    H.paintInk = paintInk; H.paintGuide = paintGuide; H.col = col; H.fit = fit; // fit = 점검용(칸 크기 다시)
  }
  // 점수(본부 10-07 투덜이) — 칸 위 「87% ☆」 + 말하기와 같은 효과음 · 통과해도 그 자리에서 다시 쓰면 더 높은 점수 노림(그 글자 최고 점수 기억 · 위 글자 줄 아래 작은 숫자) · 「다음 ▶」으로 넘어감
  const bestKey = (w, c) => `${ep}/${line.id}/${st.s}.${w}.${c}`;
  const bestGet = (w, c) => { try { return JSON.parse(localStorage.getItem("malmun.hbest") || "{}")[bestKey(w, c)] ?? null; } catch { return null; } };
  const bestPut = (w, c, v) => { try { const o = JSON.parse(localStorage.getItem("malmun.hbest") || "{}"), k = bestKey(w, c); if (!(o[k] >= v)) { o[k] = v; localStorage.setItem("malmun.hbest", JSON.stringify(o)); } } catch {} };
  async function handJudge() {
    const H = st.hand; if (!H || !H.strokes.length || st.busy || st.s >= segs.length || st.lineEnd || H.passed) return;
    clearTimeout(H.timer);
    const c = words()[st.w].chars[st.c], r = handScore(c.ch, H.strokes, H.s); H.last = r;
    const star = r.pct >= 95 ? "★" : r.pct >= 80 ? "☆" : "", sc = work.querySelector(".hscore");
    if (sc) { sc.textContent = `${r.pct}%${star ? " " + star : ""}`; sc.className = "hscore " + (r.pct >= 80 ? "ok" : "bad"); sc.hidden = false; }
    scoreFx(work.querySelector(".hbox .fx"), r.pct);
    if (r.pct >= 80) { // 통과 — 초록 + 그 글자 소리 · 최고 점수 기억 · 「다음 ▶」/다시 쓰기
      bestPut(st.w, st.c, r.pct); paintSent();
      note.textContent = ""; H.passed = true; H.paintInk(); markHand();
      st.busy = true; await run([700, c.file || jamoSrc(c.jamo[c.jamo.length - 1])]); st.busy = false;
      return;
    }
    note.textContent = t("h_again");
    H.paintGuide(r);
    setTimeout(() => { if (st.hand === H) H.paintGuide(); }, 900);
    // 꽝(80% 아래)이면 덜 덮은 곳 주황 깜빡 뒤 1.2초에 내 획을 저절로 지움 — 바로 다시 쓰게(투덜이 10-07) · 점수는 남김(새로 쓰기 시작하면 지움)
    const n0 = H.strokes.length; clearTimeout(H.clr); H.clr = setTimeout(() => { if (st.hand !== H || H.passed || H.cur || H.strokes.length !== n0) return; H.strokes = []; H.roles = null; H.orderTold = false; H.paintInk(); }, 1200);
  }
  function handNext() { // 「다음 ▶」
    const H = st.hand; if (!H?.passed || st.busy) return;
    const c = words()[st.w].chars[st.c];
    st.typed = c.jamo.slice(); st.k = c.jamo.length; st.part = "";
    return finishChar(c.jamo[c.jamo.length - 1], c, 0);
  }
  function markOrder() { const b = work.querySelector("[data-act=horder]"); if (b) b.setAttribute("aria-pressed", String(!!st.hand?.ordPlaying)); } // ✎ 획순 = 그리는 동안 눌린 모양
  function markHand() { // 통과하면 ✓ 단추 → 「다음 ▶」
    const H = st.hand, b = work.querySelector("[data-act=hdone],[data-act=hnext]"); if (!b) return;
    b.dataset.act = H?.passed ? "hnext" : "hdone"; b.textContent = H?.passed ? t("next_btn") : "✓ " + t("h_done");
  }

  function paintBox(c, ok) {
    const box = work.querySelector(".box"), cv = box?.querySelector(".tcv"); if (!cv) return;
    // 그 글자 글꼴 조각이 아직 안 왔으면(구글 글꼴은 글자 묶음마다 따로 옴) 온 뒤 다시 그림(투덜이 10-08 — 「왕」 친 ㅇ 이 덜 칠해짐)
    const fk = `${glyphWeight()} 100px ${glyphFont()}`;
    if (document.fonts && !document.fonts.check(fk, c.ch)) document.fonts.load(fk, c.ch).catch(() => {}).then(() => { if (!document.fonts.check(fk, c.ch) || cv !== work.querySelector(".tcv")) return; for (const m of [gCache, uCache, ownCache]) for (const k of [...m.keys()]) if (k.startsWith(c.ch)) m.delete(k); paintBox(c, work.querySelector(".box.ok") != null); });
    const n0 = Math.round(Math.min(box.clientWidth, box.clientHeight)), dpr = window.devicePixelRatio || 1, n = Math.max(20, Math.round(n0 * dpr)); cv.width = cv.height = n;
    const x = cv.getContext("2d"), cs = getComputedStyle(box), ink = cs.color || "#17302a";
    x.globalAlpha = 0.16; glyph(x, n, c.ch, ink); x.globalAlpha = 1;
    const bases = [...st.typed, ...[...(st.part || "")]].flatMap(j => baseOf(j)).length, us = unitsOf(c.ch).slice(0, ok ? 99 : bases); if (!us.length) return;
    x.drawImage(darkOf(c.ch, us, n, ok ? getComputedStyle(work).getPropertyValue("--hi").trim() || ink : ink), 0, 0);
  }
  // 친 자모만 진하게 = 글자를 진하게 그린 뒤 친 자모 픽셀(UN 칸) 마스크로 오려 냄
  function darkOf(ch, us, n, color) {
    const dark = document.createElement("canvas"); dark.width = dark.height = n; const dx = dark.getContext("2d");
    glyph(dx, n, ch, color);
    const m = document.createElement("canvas"); m.width = m.height = UN; const mx = m.getContext("2d"), id = mx.createImageData(UN, UN);
    for (const u of us) for (const q of u.px) id.data[q * 4 + 3] = 255;
    mx.putImageData(id, 0, 0);
    // 칸 경계 한 칸 너그럽게(획 가장자리 안 잘리게) = 마스크를 ±1칸 5번 「합쳐」 그린 뒤 한 번만 오려 냄(본부 10-08 — destination-in 으로 5번 그려 교집합이 되어 친 자모 가장자리 6~10% 덜 칠해지던 것)
    const mm = document.createElement("canvas"); mm.width = mm.height = n; const mmx = mm.getContext("2d"); mmx.imageSmoothingEnabled = true;
    const k = n / UN; for (const [ox, oy] of [[0, 0], [k, 0], [-k, 0], [0, k], [0, -k]]) mmx.drawImage(m, ox, oy, n, n);
    dx.globalCompositeOperation = "destination-in"; dx.drawImage(mm, 0, 0);
    return dark;
  }
  // 점검용(본부 10-08 판별식) — 앞 k 자모를 친 칠 · 친 자모 잉크(알파 ≥200) 중 덜 칠한 비율 · 안 친 자모 잉크(친 자모에서 2칸 넘게 떨어진 것) 중 칠한 비율
  function paintCheck(ch, k, n = 240) {
    const us = unitsOf(ch), d = darkOf(ch, us.slice(0, k), n, "#000").getContext("2d").getImageData(0, 0, n, n).data;
    const g = document.createElement("canvas"); g.width = g.height = n; const gx = g.getContext("2d"); glyph(gx, n, ch, "#000"); const gd = gx.getImageData(0, 0, n, n).data;
    const own = new Int16Array(UN * UN).fill(-1); us.forEach((u, j) => { for (const q of u.px) own[q] = j; });
    const near = (X, Y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = X + dx, y = Y + dy; if (x >= 0 && y >= 0 && x < UN && y < UN && own[y * UN + x] >= 0 && own[y * UN + x] < k) return true; } return false; };
    let inT = 0, under = 0, inU = 0, over = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (gd[i * 4 + 3] < 200) continue; const X = Math.floor(x * UN / n), Y = Math.floor(y * UN / n), o = own[Y * UN + X];
      if (o >= 0 && o < k) { inT++; if (d[i * 4 + 3] < 200) under++; } else if (o >= k && !near(X, Y, 2)) { inU++; if (d[i * 4 + 3] >= 200) over++; } }
    return { under: inT ? under / inT : 0, over: inU ? over / inU : 0 };
  }

  async function finishChar(j, c, src = jamoSrc(j)) { // W3 · 손글씨는 글자 소리(src)
    st.busy = true; st.done = true;
    work.querySelector(".box")?.classList.add("ok"); paintBox(c, true);
    // 글자 완성 = 딩동 → 마지막 자모 → 그 글자 소리 → 다음 글자(투덜이 10-08 — 자판·자동 완성도 · 손글씨는 이미 글자 소리 · 한 번 되돌렸다가 「나쁘지 않아, 지금처럼」으로 유지)
    const ok = await run(c.file && src !== c.file ? ["ok", src, 120, c.file, GAP_NEXT] : ["ok", src, GAP_NEXT]);
    st.done = false;
    if (!ok || !st.alive) { st.busy = false; st.queue = []; return; }
    if (!st.auto) st.wrote.add(wkey(st.s, st.w, st.c)); // 직접 써서 마친 글자(자동으로 쓴 것은 빼고)(위 글자 줄 초록 — 순서가 아니라 실제로 쓴 것만 · 본부 10-07)
    st.busy = false; st.c++; st.k = 0; st.typed = []; st.part = "";
    const w = words()[st.w];
    if (st.c >= w.chars.length) { st.w++; st.c = 0; }
    if (st.w >= words().length) { // 토막 끝 → 다음 토막(자동)
      // 줄 끝 = 마지막 토막·마지막 글자에 머묾(완성 표시) — 「문장 완성!」 카드 없음 · 토막 번호 넘침(7/6) 없음(투덜이 10-08·10-10 「분명히 없애기로 했어」)
      if (st.s + 1 >= segs.length) { st.w = words().length - 1; st.c = words()[st.w].chars.length - 1; st.k = c.jamo.length; st.typed = c.jamo.slice(); st.part = ""; st.lineEnd = true; st.done = true; st.queue = []; return lineDone(); }
      st.s++; st.w = 0;
    }
    render();
    const q = st.queue.splice(0); q.forEach(k => press(k)); // 축하 중에 누른 키 — 차례대로(또 글자가 끝나면 다시 기억됨)
  }
  async function lineDone() { // 줄 끝 → 대사 듣고 → 다음 줄(자동) · 자동 완성으로 끝냈으면 대사 소리 없이(W4 · 투덜이 10-08 「멈추는 카드 없애자 · 끊김 싫다」로 원래대로) · 마지막 줄은 그 자리에 머묾
    const wasAuto = st.auto; st.auto = false; markAuto(); render();
    st.sent = !wasAuto; markSent();
    const ok = await run(wasAuto ? [900] : [lineSrc, 900]);
    st.sent = false; markSent();
    if (ok && st.alive && li < d.lines.length - 1) {
      if (opts.embedded) opts.onNext?.(li + 1);
      else location.hash = `#/write/${ep}/${d.lines[li + 1].id}`;
    }
  }
  // 자동 완성(W4) — 지금 토막의 남은 글자를 한 자모씩(손으로 칠 때와 같은 소리·쉼) · 토막이 끝나면 멈춤
  const markAuto = () => { const b = wb.querySelector("[data-act=auto]"); b.setAttribute("aria-pressed", String(!!st.auto)); b.textContent = st.auto ? "⏹ " + t("btn_stop") : t("autofill"); if (b.isConnected) placeBtns(); }; // 글 길이가 바뀌면 단추 줄 다시 맞춤
  const flashKey = j => { const k = work.querySelector(`[data-j="${j}"]`); if (!k) return; k.classList.remove("right"); void k.offsetWidth; k.classList.add("right"); setTimeout(() => k.classList.remove("right"), 400); };
  // 자동 멈춤(본부 10-07 투덜이 「⏹ 다시 눌러도 안 멈춤」) — 누르면 바로: 진행 중 소리·획 칠도 그침 · 하던 글자는 안 끝낸 채(다음 글자로 안 넘어감)
  // 자동을 멈춘 순간 글자가 다 쳐져 있으면(마지막 자모 소리 중) = 그 글자는 끝난 것 → 다음 글자로(투덜이 10-08 폰 「있었거든요」의 「거」:
  //  다 친 글자에 머물러 다음 자모가 없어 자판을 눌러도 오류로 소리가 안 나던 것)
  const stopAuto = () => { st.auto = false; st.jumpTo = null; st.hand?.stopOrder?.(); hush(); st.busy = false; st.done = false; st.queue = []; markAuto();
    const c = st.s < segs.length ? words()[st.w]?.chars[st.c] : null; if (c && st.mode !== "hand" && st.k >= c.jamo.length) nextChar(); };
  function nextChar() { // 다음 글자(토막 끝이면 다음 토막 · 줄 끝이면 끝 카드) — 자동으로 친 것은 「직접 씀」 아님
    st.c++; st.k = 0; st.typed = []; st.part = "";
    if (st.c >= words()[st.w].chars.length) { st.w++; st.c = 0; }
    if (st.w >= words().length) { st.s++; st.w = 0; }
    render();
  }
  async function autoPart() {
    resetSounds(); if (st.lineEnd) { Object.assign(st, { w: 0, c: 0, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false }); render(); } // 줄 끝에서 자동 = 마지막 토막 처음부터
    st.auto = true; markAuto();
    const part = st.s;
    while (st.auto && st.alive && st.s === part && st.s < segs.length) {
      if (st.jumpTo) { Object.assign(st, { w: st.jumpTo.w, c: st.jumpTo.c, k: 0, typed: [], part: "", done: false, queue: [], busy: false }); st.jumpTo = null; render(); } // 위 글자 줄에서 고른 글자부터 이어서
      const c = words()[st.w].chars[st.c];
      if (st.mode === "hand") { // 손글씨 자동(본부 10-07) — 그 글자를 획순 칠로 한 획씩 써 주고(획 0.5초) → 글자 소리 → 다음 글자 · 자동으로 쓴 글자는 「직접 씀」 초록 아님
        const H = st.hand; if (!H?.showOrder) break;
        st.busy = true; const done = await H.showOrder({ keep: true }); st.busy = false;
        if (!done || !st.auto || st.jumpTo) continue;
        const last = c.jamo[c.jamo.length - 1]; st.typed = c.jamo.slice(); st.k = c.jamo.length; st.part = "";
        await finishChar(last, c, c.file || jamoSrc(last)); continue;
      }
      const j = c.jamo[st.k];
      st.typed.push(j); st.k++; render(); flashKey(j);
      if (st.k >= c.jamo.length) await finishChar(j, c);
      else { st.busy = true; await run(["ok", jamoSrc(j), 150]); st.busy = false; }
    }
    st.auto = false; if (st.alive) markAuto();
  }
  async function press(j) { // W2
    const key0 = j; // 실제로 누른 자판(겹모음을 나눠 쳐 완성하면 j 는 겹모음으로 바뀜)
    if (st.auto) return stopAuto(); // 자동 완성 중 자판 = 멈춤
    if (st.s >= segs.length || st.lineEnd) return; // 줄 끝(마지막 줄에 머묾) = 자판 안 받음 · 위 글자·토막·[다시 연습]으로 다시 씀
    if (st.done) { st.queue.push(j); return; } // 글자 완성 축하 중 = 기억해 두기
    stopLoop(); st.sent = false; markSent();
    let c = words()[st.w].chars[st.c];
    if (st.k >= c.jamo.length) { nextChar(); if (st.s >= segs.length) return; c = words()[st.w].chars[st.c]; } // 다 친 글자에 머문 채면 다음 글자부터(안전장치)
    let voiceSrc = jamoSrc(j);
    const need = c.jamo[st.k], needX = jamoParts(need).join("");
    if (need !== j && needX.length > 1) { // 겹모음을 나눠 침(ㅓ 다음 ㅣ = ㅔ) — 앞부분이면 받아 두고, 다 맞으면 그 겹모음으로
      const tryX = st.part + jamoParts(j).join("");
      if (tryX === needX) { j = need; voiceSrc = jamoSrc(need); }
      else if (needX.startsWith(tryX)) { st.part = tryX; render(); flashKey(j); st.busy = true; await run(["ok", voiceSrc]); st.busy = false; return; }
    }
    if (need !== j) {
      st.part = "";
      const s = work.querySelector(".slot.current"); s?.classList.remove("shake"); void s?.offsetWidth; s?.classList.add("shake");
      const k = work.querySelector(`[data-j="${j}"]`); k?.classList.add("wrong"); setTimeout(() => k?.classList.remove("wrong"), 500);
      st.busy = true; await run(["bad", voiceSrc]); st.busy = false;
      return;
    }
    st.typed.push(j); st.k++; st.part = "";
    render(); flashKey(key0); // 실제로 누른 자판만 초록
    if (st.k >= c.jamo.length) return finishChar(j, c);
    st.busy = true; await run(["ok", voiceSrc]); st.busy = false;
  }

  app.querySelector(".scr").addEventListener("pointerdown", e => { const k = e.target.closest("[data-j]"); if (!k) return; k.classList.add("pr"); setTimeout(() => k.classList.remove("pr"), 160); });
  // 도움말(본부 10-07 — 말하기와 같은 모양·자리 · 칸 안 스크롤 0 = 글 크기로 맞춤)
  const fitHelp = () => { const hb = $(".helpbox"); if (!hb || hb.hidden) return; const ps = [...hb.children]; ps.forEach(x => x.style.removeProperty("zoom")); for (let z = 0.95; z >= 0.55 && hb.scrollHeight > hb.clientHeight; z -= 0.05) ps.forEach(x => (x.style.zoom = z.toFixed(2))); };
  new ResizeObserver(() => fitHelp()).observe($(".helpbox"));
  app.querySelector(".scr").onclick = e => {
    const hb = $(".helpbox");
    if (!hb.hidden) { hb.hidden = true; if (e.target.closest("[data-act=help], .helpbox")) return; } // 아무 데나 누르면 닫힘
    if (e.target.closest("[data-act=help]")) { hush(); stopLoop(); hb.hidden = false; fitHelp(); return; }
    const k = e.target.closest("[data-j]");
    if (k) return press(k.dataset.j);
    const bx = e.target.closest(".stage .box"); // 왼쪽 위 글자 칸 = 그 글자 소리 한 번(투덜이 10-08 · 단추 모양) · 자판 누르면 바로 끊고 자판 처리(run 이 앞 소리를 끊음)
    if (bx) { const c = st.s < segs.length ? words()[st.w]?.chars[st.c] : null; if (c?.file && !st.done && !st.auto && !st.busy) { stopLoop(); st.sent = false; markSent(); run([c.file]); } return; }
    const wc = e.target.closest("[data-wc]");
    if (wc) { // 글자 하나 소리(W4)
      if (st.busy || st.auto) return;
      const c = words()[st.w].chars[+wc.dataset.wc];
      if (c.file) { stopLoop(); st.sent = false; markSent(); run([c.file]); }
      return;
    }
    const sg = e.target.closest("[data-seg]");
    if (sg) return goSeg(Math.max(0, Math.min(segs.length - 1, st.s + +sg.dataset.seg)));
    const cb = e.target.closest(".sent .c");
    if (cb) { // W1
      if (st.s >= segs.length) { hush(); st.s = segs.length - 1; } // 줄 끝 카드에서 위 글자 = 마지막 토막 그 글자로(본부 10-08)
      const w = +cb.dataset.w, ci = +cb.dataset.c, c = words()[w].chars[ci];
      if (st.auto) { st.jumpTo = { w, c: ci }; cb.blur(); hush(); st.hand?.stopOrder?.(); Object.assign(st, { w, c: ci, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false }); render(); return; } // 자동 완성 중 위 글자 누름 = 그 글자로 옮겨 거기부터 자동 이어서(본부 10-06 투덜이) · 앞 글자는 초록 · 지금 테두리 · 뒤는 기본
      // 누른 글자로 바로 가서 쓰기(본부 10-07 투덜이 — 자판·손글씨 둘 다 · 건너뛴 글자는 「안 씀」 그대로 · 나중에 눌러 돌아와 씀) + 그 글자 소리 한 번
      cb.blur(); hush(); stopLoop(); st.sent = false; markSent();
      Object.assign(st, { w, c: ci, k: 0, typed: [], part: "", done: false, queue: [], busy: false, lineEnd: false }); render();
      if (st.mode === "hand") st.hand?.showOrder?.(); // 손글씨 = 글자를 누르면 획순이 바로 그려지고 다 그리면 글자 소리(투덜이 10-08)
      else if (c.file) run([c.file]); else note.textContent = t("no_char_audio", { c: c.ch });
      return;
    }
    const tb = e.target.closest("[data-tool]");
    if (tb) { try { localStorage.setItem("malmun.htool", tb.dataset.tool); } catch {} app.querySelectorAll("[data-tool]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tool === tb.dataset.tool))); return; } // 도구 고르기(기억) · 이미 그린 획은 그 도구 그대로
    const mb = e.target.closest("[data-mode]");
    if (mb) { if (st.mode !== mb.dataset.mode) { if (st.auto) stopAuto(); st.hand?.stopOrder?.(); hush(); stopLoop(); st.busy = false; st.done = false; st.queue = []; st.mode = mb.dataset.mode; /* 모드 바꾸기 = 돌던 것(자동·획순·소리) 먼저 멈춤 — 본부 10-08 투덜이: 자판 자동 켠 채 손글씨로 바꾸면 저 혼자 계속 씀 */ try { localStorage.setItem("malmun.wmode", st.mode); } catch {} app.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === st.mode))); st.typed = []; st.k = 0; st.part = ""; render(); } return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "close") { hush(); stopLoop(); return opts.onClose?.(); } // ✕ 닫기(본부 10-07 — 말하기·설명 창과 같게 · 폰 뒤로도 같은 동작)
    if (a === "hdone") return handJudge();
    if (a === "hnext") return handNext();
    if (a === "horder") return st.hand?.toggleOrder?.();
    if (a === "hundo" || a === "hclear") { const H = st.hand; if (!H) return; clearTimeout(H.timer); if (a === "hundo") H.strokes.pop(); else { H.strokes = []; H.roles = null; H.orderTold = false; } if (H.passed) { H.passed = false; markHand(); } const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; H.paintInk(); note.textContent = ""; return; }
    if (a === "sent") toggleSentence();
    else if (a === "word" && st.s < segs.length && !st.busy) { // W4 — 원음에서 이 낱말만
      stopLoop(); st.sent = false; markSent();
      run([wordStep(words()[st.w])]);
    } else if (a === "auto") {
      if (st.auto) return stopAuto();
      if (st.s < segs.length && !st.busy) autoPart();
    } else if (a === "retry") { goSeg(0); }
  };

  setNote(); render();
  try { if (localStorage.getItem("malmun.wtip") !== "1") { localStorage.setItem("malmun.wtip", "1"); const tip = $(".wtip"); tip.hidden = false; sentEl.classList.add("flash"); setTimeout(() => { tip.hidden = true; sentEl.classList.remove("flash"); }, 3500); } } catch {}
  const release = hold();
  // 이 줄에서 쓸 소리를 미리 받아 풀어 둔다(대사 · 낱말·토막 · 글자 · 자판 자모) — 누르는 순간 바로 나오게
  sfx.preload([lineSrc, ...allWords.map(w => unitSrc(w.unit)), ...segs.map(g => unitSrc(g.unit)),
    ...allWords.flatMap(w => w.chars.map(c => c.file)), ...[...KEYS, ...VOW, ...VOW2].map(jamoSrc)]);
  return () => { release(); st.alive = false; hush(); st.hand?.ro?.disconnect(); clearTimeout(st.hand?.timer); delete app.__wr; };
}
