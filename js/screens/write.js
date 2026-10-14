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
import { t, lang } from "../i18n.js?v=1014.4";
import { esc, glossCards, toJamoW, jamoParts, compose, vowelLen, JAMO_AUDIO, koq } from "../text.js?v=1014.4";
import { episode, chars, charsF } from "../data.js?v=1014.4";
import { paths } from "../paths.js?v=1014.4";
import { I, spkHtml, uiKoBtn } from "../ui.js?v=1014.4";
import { audioCtx, hold } from "../wake.js?v=1014.4";
import * as sfx from "../sfx.js?v=1014.4";
import { scoreFx } from "../scorefx.js?v=1014.4";
import { units as jamoUnits, baseOf, shapeFix } from "../jamobox.js?v=1014.4"; // 자모 자리 나누기(획순 · 자판 덧칠 · 손글씨 덩어리 — 본부 10-07) // 손글씨 점수 효과 = 말하기와 같은 규칙(본부 10-07)
import { createStrokes } from "../strokes.js?v=1014.4"; // 획 자료·획순 칠(글자부)
import { fitToGuide } from "../strokefit.js?v=1014.4"; // 자석 따라오는 획 길 = 회색 가운데(글자부 10-12)

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

let autoAllNext = null; // 전체 자동 완성이 다음 줄로 넘어갈 때 { ep, id, t } — 새 쓰기 화면이 이어받아 바로 자동
const helpHtml = () => [1, 2, 3, 4, 5, 6, 7].map(k => "help_wr_" + k).filter(k => t(k) !== k).map(k => `<p>${esc(t(k))}</p>`).join("") + `<p class="x">${esc(t("help_close"))}</p>`; // 7 = 🔊 이 줄 듣기(10-13 · 열쇠가 있을 때만)
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
  if (opts.pos && Number.isInteger(opts.pos.s) && opts.pos.s < segs.length) { const ws = segs[opts.pos.s] || []; st.s = opts.pos.s; st.w = Math.min(opts.pos.w || 0, Math.max(0, ws.length - 1)); st.c = Math.min(opts.pos.c || 0, Math.max(0, (ws[st.w]?.chars.length || 1) - 1)); (opts.pos.wrote || []).forEach(k => st.wrote.add(k));
    const jm = ws[st.w]?.chars[st.c]?.jamo || []; if (Number.isInteger(opts.pos.k) && opts.pos.k > 0 && opts.pos.k < jm.length) { st.k = opts.pos.k; st.typed = jm.slice(0, st.k); } /* 반쯤 친 글자의 자모도 그대로(검사부 10-11 토글 뒤 k=0) */
    else if (opts.pos.k === jm.length && jm.length) { if (st.c + 1 < ws[st.w].chars.length) st.c++; else if (st.w + 1 < ws.length) { st.w++; st.c = 0; } else { st.k = jm.length; st.typed = jm.slice(); } } } /* 다 친 직후 토글 = 다음 글자로(토막 끝 글자면 다 친 채로) */ // ने⇄한 토글 뒤 같은 토막·글자(본부 10-08)
  // 쓰기 방법(본부 10-07 투덜이 「ㅇ」) — ⌨ 자판 / ✍ 손글씨 · 고른 것 기억
  const modeBtns = () => `<span class="wmode" role="group">${[["kb", "⌨", t("w_kb")], ["hand", "✍", t("w_hand")]].map(([m, ic, l]) => `<button data-mode="${m}" aria-pressed="${st.mode === m}" aria-label="${esc(l)}">${ic}<span class="ml"> ${esc(l)}</span></button>`).join("")}</span>`;
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  hush();

  app.innerHTML = `<section class="scr write ${opts.embedded ? "embedded" : ""}">
    ${opts.embedded
      ? `<div class="whead"><b>${esc(t("write"))}</b><span class="sub"><span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span></span>${modeBtns()}${uiKoBtn()}<button class="whelp" data-act="help" aria-label="${esc(t("help"))}">${esc(t("help_btn"))}</button><button class="whelp wclose" data-act="close" aria-label="${esc(t("close_btn"))}">✕<span class="lt">${esc(String(t("close_btn")).replace(/^✕\s*/, " "))}</span></button><span class="loopnote" aria-live="polite"></span></div>`
      : `<div class="bar"><a class="iconbtn" href="#/learn/${ep}/${line.id}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("write"))}</div><div class="sub"><span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span></div></div>${modeBtns()}${uiKoBtn()}<button class="whelp" data-act="help" aria-label="${esc(t("help"))}">${esc(t("help_btn"))}</button></div><div class="loopnote" aria-live="polite"></div>`}
    <div class="segrow"><div class="sent" lang="ko"></div><div class="segnav"></div><div class="wtip" hidden></div></div>
    <div class="work"></div>
    <div class="helpbox" hidden>${helpHtml()}</div>
    <div class="wbtns"><button data-act="hearch">${esc(t("w_hear_char"))}</button><button data-act="auto">${esc(t("autofill"))}</button><button data-act="autoall">${esc(t("autofill_all"))}</button></div>
  </section>`;

  const $ = s => app.querySelector(s);
  const note = $(".loopnote"), work = $(".work"), sentEl = $(".sent"), segnav = $(".segnav");
  const words = () => segs[st.s] || [];
  function hideLineTip() { clearTimeout(st.tipT); const tip = $(".wtip"); if (tip) tip.hidden = true; sentEl.classList.remove("flash"); }
  const setNote = () => { note.textContent = st.loopAt ? t("loop_on", { c: st.loopAt.ch }) : ""; }; // 처음 안내는 말풍선(본부 10-06)
  // 단어 듣기·이 부분 듣기·자동 완성 = 위 글자 칸 오른쪽에 세로로(본부 10-06 투덜이 — 아래 줄이 자판 마지막 줄과 겹침) · 그릴 때마다 그 자리로 옮김
  const wb = $(".wbtns");
  const markSent = () => sentEl.querySelector("[data-act=line]")?.setAttribute("aria-pressed", String(st.sent)); // 🔊 이 줄 듣기 = 듣는 동안 눌린 모양(투덜이 10-13)
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
  function hearChar() { // [이 글자 듣기](투덜이 10-13 「누를 때마다 소리가 나면 돼 — 켜고 끄는 거 아니야」) — 지금 쓰는 글자(아래 칸) 소리 한 번 · 또 누르면 처음부터 한 번(겹침 없음)
    const c = st.s < segs.length ? words()[st.w]?.chars[st.c] : null; if (!c?.file) return;
    const again = () => { if (st.resumeAuto && st.alive) { st.resumeAuto = false; autoPart(st.autoMode); } };
    const wasAuto = st.auto; if (wasAuto) { st.auto = false; st.jumpTo = null; st.hand?.stopOrder?.(); st.busy = false; st.done = false; st.queue = []; }
    stopLoop(); if (st.sent) { st.sent = false; markSent(); } st.resumeAuto = wasAuto || st.resumeAuto; markAuto();
    const my = (st.sentGen = (st.sentGen || 0) + 1);
    run([c.file]).then(ok => { if (st.sentGen !== my) return; if (ok) again(); else if (st.resumeAuto) { st.resumeAuto = false; markAuto(); } });
  }
  function toggleSentence() { // W4 · 아래 ▶ = 이 부분 듣기 · 자동 중이면 자동 잠깐 멈춤 → 듣기 끝나면 그 글자부터 자동 다시(투덜이 10-10)
    if (!lineSrc || st.s >= segs.length) return;
    const again = () => { if (st.resumeAuto && st.alive) { st.resumeAuto = false; autoPart(st.autoMode); } };
    if (st.sent) { st.sent = false; hush(); markSent(); return again(); }
    const wasAuto = st.auto; if (wasAuto) { st.auto = false; st.jumpTo = null; st.hand?.stopOrder?.(); st.busy = false; st.done = false; st.queue = []; }
    stopLoop(); st.sent = true; markSent(); st.resumeAuto = wasAuto || st.resumeAuto; markAuto();
    const my = (st.sentGen = (st.sentGen || 0) + 1);
    run([partStep()]).then(ok => { if (st.sentGen !== my) return; st.sent = false; markSent(); if (ok) again(); else if (st.resumeAuto) { st.resumeAuto = false; markAuto(); } }); // 다른 걸 눌러 끊기면 자동 다시 안 함
  }
  app.__wr = { owners: async ch => { await stkReady; const list = strokesOf(ch); return { list, ...inkOwners(ch, list), GN }; }, font: () => `${glyphWeight()} ${glyphFont()}`, reveal: async (ch, n = 200) => { await stkReady; await document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, ch).catch(() => {}); const list = strokesOf(ch); return { list, at: (k, f = 1) => revealOrder(ch, n, list, k, f) }; }, glyphCv: (ch, n = 200) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; glyph(cv.getContext("2d"), n, ch, "#000"); return cv; }, guideCv: (ch, w, n = 200) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; guideGlyph(cv.getContext("2d"), n, ch, w, "#000"); return cv; }, glyphW0: ch => glyphW0(ch), snapCv: async (ch, k, tk) => (await stkReady, snapMask(ch, k, tk)), guideGrow: (ch, w) => guideGrow(ch, w), guideW: tk => guideW(tk), st: () => st, hand: () => st.hand, traceOf: ch => traceOf(ch), centerOf: ch => centerOf(ch), unitsOf: ch => unitsOf(ch), unitSteps: ch => { const m = pix(UN, x => glyph(x, UN, ch, "#000")), cp = us => us.map(u => ({ jamo: u.jamo, role: u.role, n: u.px.length, px: u.px.slice() })), a = jamoUnits(ch, m, UN), r = ringFix(a, m), s0 = cp(r); shapeFix(r, m, UN, ch); const s1 = cp(r); deCrumb(r); return { raw: cp(a), ring: s0, shape: s1, crumb: cp(r) }; }, strokesOf: async ch => (await stkReady, strokesOf(ch)), strokeHint: (H, S) => strokeHint(H, S), strokeFit: async ch => { await stkReady; const us = unitsOf(ch), L = strokesOf(ch); return us.map((u, ui) => { const P = L.filter(S => S.unit === ui); let n = 0, k = 0; for (const S of P) { const f = fitOf(u, S.pts), m = S.pts.length - 1; n += m; k += f * m; } return { jamo: u.jamo, fit: n ? k / n : null }; }); }, handScore: (ch, S) => handScore(ch, S), fitPath: async (ch, i, tk) => { await stkReady; return fitPath(ch, strokesOf(ch), i, tk); }, handJudge: () => handJudge(), toggle: toggleSentence, brushPath: (ch, S) => brushPath(ch, S), paintCheck: (ch, k, n) => paintCheck(ch, k, n), busy: () => st.busy || st.done || st.queue.length > 0 || st.sent || st.auto || sfx.playing() }; // busy = 점검 도구가 소리 끝을 기다릴 때

  function paintSent() {
    sentEl.innerHTML = `<button class="spk spkb" data-act="line" aria-label="${esc(t("w_line"))}" aria-pressed="${st.sent}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12"/></svg></button>` + (segs[Math.min(st.s, segs.length - 1)] || []).map((w, wi) => `<span class="w ${wi === st.w ? "on" : ""}">${w.chars.map((c, ci) =>
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
    sentEl.querySelectorAll(".w").forEach(w => { w.style.gap = ""; }); segnav.closest(".segrow")?.classList.remove("st1");
    const over = () => sentEl.scrollWidth > sentEl.clientWidth + 1;
    for (let fs = parseFloat(getComputedStyle(cs[0]).fontSize) - 1; over() && fs >= 12; fs -= 1) {
      cs.forEach(c => { c.style.fontSize = fs + "px"; c.style.padding = fs < 21 ? "0 2px" : ""; });
      sentEl.style.columnGap = fs < 21 ? "6px" : ""; if (fs < 17) sentEl.querySelectorAll(".w").forEach(w => { w.style.gap = "1px"; });
    }
    // 12px 로도 넘치면(320 폭 · 8글자 토막 「그럼 그 약속은 누가」 41px 넘침 · ur 은 글자가 창 밖 · 10-12 언어별 점검) — 🔊 표시 숨김 · 낱말 묶음 여백·글자 단추 여백 줄임 · ◀ ▶ 좁게(st1) → 그래도 넘치면 10px 까지
    if (!over()) return; segnav.closest(".segrow")?.classList.add("st1"); sentEl.style.columnGap = "3px";
    for (let fs = 11; over() && fs >= 10; fs -= 1) cs.forEach(c => { c.style.fontSize = fs + "px"; });
  }
  // 세 단추 자리(10-06 투덜이 「게 옆으로 가로로」) — 넓은 쓰기 창(440px↑) = 낱말 단추 바로 옆(모자라면 그 아래 줄로 꺾임) · 좁은 창(폰) = 글자 칸 아래 한 줄
  function placeBtns() { // 세 단추 = 자모 칸(ㄱ □) 오른쪽 같은 줄(투덜이 10-06 「여기다 · 그럼 더 많이 줄어」) — 글자 칸이 두 줄(로마자·뜻 / 자모 칸+단추)로 · 안 들어가면 단추 글 작게 → 두 줄로 좁게 → 자모 칸 작게 · 그래도 안 되면 아래 줄
    const stg = work.querySelector(".stage"), row = stg?.querySelector(".slotrow"); if (!row) return;
    row.append(wb); stg.classList.add("btns-in");
    const sl = row.querySelector(".slots"), bs = [...wb.querySelectorAll("button")];
    const wrapped = () => row.scrollWidth > row.clientWidth + 1 || wb.getBoundingClientRect().right > stg.getBoundingClientRect().right + 1 /* 줄은 맞아도 글자 칸(.stage · 넘침 숨김) 밖으로 나감(10-12 en 320 손글씨 「Auto-fill al」) */ || bs.some(b => Math.abs(b.getBoundingClientRect().top - bs[0].getBoundingClientRect().top) > 2);
    stg.classList.remove("c1", "c2", "c3", "c4");
    if (wrapped()) { stg.after(wb); stg.classList.remove("btns-in"); wb.classList.add("below"); fitStageH(); fitHandBox(); return fitKb(); } // 같은 줄에 보통 크기로 안 들어가면 글자 칸 아래 한 줄로(글씨를 줄이지 않음 · 본부 10-12 「작고 두 줄로 꺾임」)
    wb.classList.remove("below"); fitStageH(); fitHandBox(); fitKb();
  }
  // 낱말 칸 글자 단추 = 한 줄 · 넘치면 글자 크기·안쪽 여백을 같이 줄임(위 글자 줄과 같은 방식) · 로마자는 아래 줄 따로
  // 로마자·뜻 줄(투덜이 10-07 「단어 듣기」 빈자리) — 크게(로마자 15 · 뜻 17px)에서 칸 폭에 들어갈 때까지 줄임(최소 11px)
  function fitSub2() {
    const r = work.querySelector(".info .sub2"); if (!r || !r.clientWidth) return; const xs = [...r.querySelectorAll(".rom, .mean")]; xs.forEach(x => x.style.removeProperty("font-size"));
    for (let k = 0; k < 8 && r.scrollWidth > r.clientWidth + 1; k++) xs.forEach(x => { const f = parseFloat(getComputedStyle(x).fontSize); if (f > 11) x.style.fontSize = f - 1 + "px"; });
    if (work.classList.contains("handmode")) { /* 손글씨 = 뜻 줄이 두 줄로 꺾이면(「"세종대왕" ले」 + 도구 단추) 한 줄이 될 때까지 줄임(본부 10-12 토막마다 배치 같게) */
      const wrapped = () => { const k = [...r.children].filter(x => x.offsetWidth), t0 = k[0]?.getBoundingClientRect(); return !!t0 && k.some(x => x.getBoundingClientRect().top >= t0.bottom - 2); };
      for (let k = 0; k < 8 && wrapped(); k++) { let moved = false; xs.forEach(x => { const f = parseFloat(getComputedStyle(x).fontSize); if (f > 11) { x.style.fontSize = f - 1 + "px"; moved = true; } }); if (!moved) break; } }
    // 낮은 창(본부 10-07 660×560 — 단추 줄이 자판을 2px 덮음) — 단추 줄과 자판 사이 4px 이 될 때까지 더 줄임(최소 11px)
    const bt = work.querySelector(".wbtns"), kb = work.querySelector(".kb"), gap = () => (bt && kb ? kb.getBoundingClientRect().top - bt.getBoundingClientRect().bottom : 99);
    for (let k = 0; k < 8 && gap() < 4; k++) { let moved = false; xs.forEach(x => { const f = parseFloat(getComputedStyle(x).fontSize); if (f > 11) { x.style.fontSize = f - 1 + "px"; moved = true; } }); if (!moved) break; }
  }
  // 자판이 창 아래로 잘림(다국어부 10-12 320×640 — 아래 단추 줄이 두 줄로 꺾여 자판 마지막 줄 ㅚㅝㅞㅟㅢ 가 24~70px 잘림) — 넘칠 때만 차례로:
  //  ① 아래 단추 셋을 한 줄로(글 작게 · 단추 안에서 두 줄) ② 자판 줄 높이를 30 → 22px 까지 1px 씩
  // 손글씨 칸이 작으면(10-12 en·ur 320×640 = 88·92px — 아래 단추 셋 두 줄 + 손글씨 단추 넷 글이 옆을 차지) 차례로: ① 아래 단추 셋 한 줄(wt1) ② 도구 단추 그림만 ③ 손글씨 단추 넷 그림만 · 목표 칸 150px
  function fitHandBox() {
    const wr = work.closest(".write"), hand = work.querySelector(".hand"), H = st.hand; if (!wr || !hand || !H?.fit) return;
    wr.classList.remove("wt1", "hcomp"); hand.classList.remove("hic"); work.querySelector(".htools")?.classList.remove("ic2"); H.fit(); stageFix();
    const small = () => (H.s || 0) < 150;
    if (small() && wb.classList.contains("below")) { wr.classList.add("wt1"); stageFix(); H.fit(); }
    if (small()) { work.querySelector(".htools")?.classList.add("ic2"); stageFix(); H.fit(); }
    if (small()) { hand.classList.add("hic"); H.fit(); }
    if (small()) { wr.classList.add("hcomp"); fitStageH(); H.fit(); } // ④ 그래도 작으면(ur 320 나스탈리크 — 머리 줄·뜻 줄이 높아 129px · 본부 10-14) 뜻 줄 한 줄·글자 조금 작게·머리 줄 줄간격 좁게
    // 칸을 맞춘 뒤 글자 칸 줄이 좁아져 세 단추가 잘리면(넘침 숨김) = 아래 줄로 옮기고 한 번 더(되부름 없이 한 번만)
    const row = wb.parentElement?.classList.contains("slotrow") ? wb.parentElement : null, stg = work.querySelector(".stage");
    if (row && stg && (row.scrollWidth > row.clientWidth + 1 || wb.getBoundingClientRect().right > stg.getBoundingClientRect().right + 1)) { stg.after(wb); stg.classList.remove("btns-in"); wb.classList.add("below"); fitStageH(); if (!fitHandBox.again) { fitHandBox.again = true; try { fitHandBox(); } finally { fitHandBox.again = false; } } }
  }
  function stageFix() { if (typeof fitStageH === "function") fitStageH(); }
  function fitKb() {
    const wr = work.closest(".write"), kb = work.querySelector(".kb"); if (!wr || !kb) return; wr.classList.remove("wt1", "wt2"); wr.style.removeProperty("--krmin");
    const last = kb.querySelector(".kr:last-child button:last-child"); if (!last || !wr.clientHeight) return;
    const over = () => last.getBoundingClientRect().bottom - wr.getBoundingClientRect().bottom > 0.5 || wr.scrollHeight > wr.clientHeight + 1;
    if (!over()) return; if (wb.classList.contains("below")) wr.classList.add("wt1"); if (!over()) return;
    wr.classList.add("wt2"); for (let h = 29; h >= 20 && (wr.style.setProperty("--krmin", h + "px"), over()); h--); // ur 320 나스탈리크 머리 줄·뜻 줄이 높아 22px 로도 4px 넘치던 것(10-14) → 20px 까지
  }
  function fitStageH() { // 손글씨 = 위 칸(뜻 줄·단추 줄)이 정해진 높이를 넘치면 그만큼 키움 → 아래 손글씨 칸이 줄어듦(본부 10-12 — 넘친 단추 줄을 손글씨 칸이 덮던 것)
    const stg = work.querySelector(".stage"); if (!stg) return; stg.style.height = ""; if (!work.classList.contains("handmode")) return;
    const sr = stg.getBoundingClientRect(), pb = parseFloat(getComputedStyle(stg).paddingBottom) || 0, low = Math.max(...[...stg.querySelectorAll(".info, .wbtns")].map(x => x.getBoundingClientRect().bottom));
    if (low > sr.bottom - pb + 1) stg.style.height = Math.ceil(sr.height + low - (sr.bottom - pb)) + "px";
  }
  // 머리 줄 한 줄 유지(본부 10-07) — 넘치면 ✕ 닫기 글을 숨기고 ✕ 만
  // 따로 연 쓰기(#/write) 머리 줄(.bar) — 넘치면 차례로: ⌨✍ 그림만 → 「?」 만 → 화자 숨김 → 「쓰기」 제목 숨김(번호는 한 줄) · 검사부 10-14 th 320 19px 넘쳐 「?」 화면 밖
  function fitBarW() { const b = app.querySelector(".scr.write > .bar"); if (!b) return; const hp = b.querySelector("[data-act=help]"); if (hp) hp.textContent = t("help_btn"); const over = () => b.scrollWidth > b.clientWidth + 1 || [...b.children].some(e => e.getBoundingClientRect().right > b.getBoundingClientRect().right + 1) || [...b.querySelectorAll(".grow .t, .grow .sub")].some(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1); /* 제목·번호가 줄임표로 잘려도 넘침(가운데 칸이 줄어 「ฝ…」「2.」만 보이던 것) */ b.classList.remove("b1", "b2", "b3", "b4"); for (const c of ["b1", "b2", "b3", "b4"]) { if (!over()) break; b.classList.add(c); if (c === "b2" && hp) hp.textContent = "?"; } }
  function fitHeadW() { const h = work.closest(".write")?.querySelector(".whead") || app.querySelector(".whead"); if (!h) return; const sb = h.querySelector(".sub"), over = () => h.scrollWidth > h.clientWidth + 1 || (sb && sb.scrollWidth > sb.clientWidth + 1); /* 번호 칸이 말줄임으로 잘려도 넘침(ur 「3 / 1…」) */ const hp = h.querySelector("[data-act=help]"); if (hp) hp.textContent = t("help_btn"); h.classList.remove("narrow", "n2", "n3", "n3b", "n3c", "n3d", "n4"); for (const c of ["narrow", "n2", "n3", "n3b", "n3c", "n3d", "n4"]) { if (!over()) break; h.classList.add(c); if (c === "n3c" && hp) hp.textContent = "?"; /* 두 줄로 꺾기 전 ? 방법 = 「?」 만(이름은 aria-label · 10-14 모국어⇄한 단추가 들어와 폰에서 두 줄이 되던 것) */ } } // 머리 줄이 넘치면 차례로: ✕ 글 숨김 → 「쓰기」 제목 숨김 → 화자 이름 숨김 → 두 줄로(닫기 단추가 화면 밖으로 밀리지 않게 · 검사부 10-12 vi 375)
  // 손글씨 도구 단추(연필·펜·붓·자석)가 창 밖으로 나가면(10-12 vi 320 「🧲 Nam châm」 31px) = 그림만(이름은 aria-label)
  function fitTools() { const ht = work.querySelector(".htools"); if (!ht) return; ht.classList.remove("ic"); const wr = work.closest(".write"); if (!wr) return; const R = wr.getBoundingClientRect(); if ([...ht.querySelectorAll("button")].some(b => { const r = b.getBoundingClientRect(); return r.right > R.right + 0.5 || r.left < R.left - 0.5; }) || ht.scrollWidth > ht.clientWidth + 1) ht.classList.add("ic"); }
  function fitWord() {
    fitTools(); fitSub2(); fitHeadW(); fitBarW(); fitStageH();
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
      <div class="info">${w.rom || w.mean || st.mode === "hand" ? `<div class="sub2">${w.chars.length > 1 ? `<span class="wko ko" lang="ko">${w.chars.map((x, i) => i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch)).join("")}</span>` : ""}${w.rom ? `<span class="rom">${romMark(w.rom, w.chars.length, st.c)}</span>` : ""}${w.mean ? `<span class="mean tr">${esc(w.mean)}</span>` : ""}${st.mode === "hand" ? `<span class="htools" role="group">${Object.entries(TOOLS).map(([k, v]) => `<button data-tool="${k}" aria-pressed="${toolKey() === k}" aria-label="${esc(t("h_" + k))}">${v.icon}<span class="ml"> ${esc(t("h_" + k))}</span></button>`).join("")}<button class="hmag" data-hmode aria-pressed="${magnetOn()}" aria-label="${esc(t("h_magnet"))}">🧲<span class="ml"> ${esc(t("h_magnet"))}</span></button></span>` : ""}</div>` : ""}
      <div class="slotrow"><div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}</div></div></div></div>
      ${st.mode === "hand" ? `<div class="hand"><div class="hbox"><canvas class="hguide" aria-hidden="true"></canvas><canvas class="hink" aria-label="${esc(t("w_hand"))}"></canvas><span class="fx" aria-hidden="true"></span></div><div class="hbtns"><span class="hslot"><b class="hscore" hidden></b><span class="htime" aria-hidden="true"><i></i><b></b></span></span><button data-act="hdone" aria-label="${esc(t("h_done"))}">✓<span class="ml"> ${esc(t("h_done"))}</span></button><button data-act="hnext" aria-label="${esc(t("next_btn"))}">▶<span class="ml"> ${esc(String(t("next_btn")).replace(/\s*▶\s*$/, ""))}</span></button><button data-act="horder" aria-label="${esc(t("h_order"))}">✎<span class="ml"> ${esc(t("h_order"))}</span></button><button data-act="hundo" aria-label="${esc(t("h_undo"))}">↶<span class="ml"> ${esc(t("h_undo"))}</span></button><button data-act="hclear" aria-label="${esc(t("h_clear"))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 3.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H6.6l-3-3a2 2 0 0 1 0-2.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 9.8l5 5M6.6 18H21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="ml"> ${esc(t("h_clear"))}</span></button></div></div>`
        : `<div class="kb" lang="ko">${KB_ROWS.map(r => `<div class="kr">${r.map(j => `<button data-j="${j}">${j}</button>`).join("")}</div>`).join("")}</div>`}`;
    paintBox(c); if (st.lineEnd) { work.querySelector(".box")?.classList.add("ok"); paintBox(c, true); } // 줄 끝 = 마지막 글자 완성 표시 그대로 // 자판 칸 = 회색 글자 위에 친 자모 자리만 진하게(본부 10-07 · 글자가 따로 그려져 어긋나던 것)
    work.classList.toggle("handmode", st.mode === "hand"); // 손글씨 = 위 작은 글자 상자·자모 칸 숨기고 큰 칸을 키움(본부 10-07)
    if (st.mode === "hand") setupHand(c);
    fitWord(); placeBtns();
    fitWord(); setTimeout(fitWord, 30); // 낱말 글자 단추 = 한 줄(본부 10-06 — 세 단추 때문에 좁아져 꺾이던 것)
  }
  function goSeg(s) { st.segEnd = false; st.auto = false; st.resumeAuto = false; st.allNext = false; markAuto(); resetSounds(); st.busy = false; Object.assign(st, { s, w: 0, c: 0, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false }); render(); }

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
    if (grow > 0) { x.lineWidth = grow; x.lineJoin = "round"; x.strokeText(ch, cx, cy); }
    else if (grow < 0) { /* 음수 = 고르게 깎음(본부 10-12 회색 = 글꼴 모양 · 가는 도구) — 둥근 붓(반지름 -grow/2)으로 깎기 = 둘레 여러 방향으로 옮긴 글자와 겹친 곳만(strokeText 로 깎으면 글꼴 윤곽이 겹친 이음매까지 파임) */
      const r = -grow / 2, tc = document.createElement("canvas"); tc.width = x.canvas.width; tc.height = x.canvas.height; const tx = tc.getContext("2d"); tx.font = x.font; tx.fillStyle = color; tx.textBaseline = "alphabetic"; tx.textAlign = "left"; tx.fillText(ch, cx, cy);
      x.save(); x.globalCompositeOperation = "destination-in"; for (const [k, m] of [[r, 40], [r * 0.5, 20]]) for (let i = 0; i < m; i++) { const a = (i / m) * 2 * Math.PI; x.drawImage(tc, k * Math.cos(a), k * Math.sin(a)); } x.restore(); }
    return w >= 1 && h >= 1; // 글자 상자를 못 재면(글꼴 아직) 거짓
  }
  // 쓰기 도구(본부 10-07 투덜이 「더 실감 나고 재미있게」) — 연필 4% · 펜 7% · 붓 12%(빠르면 가늘고 천천히·꾹 누르면 굵게 0.5~1.2배 · 끝은 가늘게) · 고른 것 기억
  const TOOLS = { pencil: { w: 0.04, color: "#4a4a50", icon: "✏️" }, pen: { w: 0.07, color: "#1f2a5c", icon: "🖊" }, brush: { w: 0.12, color: "#161616", icon: "🖌" } };
  const magnetOn = () => { try { return localStorage.getItem("malmun.hmode") === "magnet"; } catch { return false; } }; // 손글씨 쓰기 방식(기억) — 완전 수동 / 반자동(자석)
  const toolKey = () => { try { const k = localStorage.getItem("malmun.htool"); return TOOLS[k] ? k : "pen"; } catch { return "pen"; } };
  // 획 그리기 — S.w = 그 획 도구 굵기(칸 비율 · 없으면 PEN) × 점마다 굵기 배수(p[2]) · extra = 더 붙일 굵기(px · 판정 「덮음」용) · look = 눈에 보이는 그림(연필 결·붓 끝)
  const smoothPts = S => { if (S.length < 3) return S.map(p => [p[0], p[1], p[2] ?? 1]); let P = S.map(p => [p[0], p[1], p[2] ?? 1]);
    for (let r = 0; r < 2; r++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2] * 0.75 + b[2] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2] * 0.25 + b[2] * 0.75]); } Q.push(P[P.length - 1]); P = Q; } return P; }; // 꺾임 없이(차이킨 2번)
  function smoothLook(x, n, S, base, col) { // 보이는 선 — 붓 = 윤곽 다각형 채우기 · 연필·펜 = 부드러운 곡선 한 줄
    const P = smoothPts(S), L = P.length; x.fillStyle = x.strokeStyle = col; x.lineCap = x.lineJoin = "round";
    if (S.tool !== "brush") { x.lineWidth = base; x.beginPath(); x.moveTo(P[0][0] * n, P[0][1] * n); for (let i = 1; i < L; i++) x.lineTo(P[i][0] * n, P[i][1] * n); x.stroke(); return; }
    const tot = P.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0) || 1e-6; let acc = 0;
    const W = P.map((p, i) => { if (i) acc += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]); const t = acc / tot, head = 1 + 0.08 * Math.max(0, 1 - t / 0.1), tail = Math.min(1, 0.3 + (0.7 * (1 - t)) / 0.25); return (base * p[2] * head * Math.min(1, tail)) / 2; }); // 시작 살짝 굵게 · 끝 25% 가늘게 빠짐
    const left = [], right = []; for (let i = 0; i < L; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(L - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; left.push([P[i][0] * n - dy * W[i], P[i][1] * n + dx * W[i]]); right.push([P[i][0] * n + dy * W[i], P[i][1] * n - dx * W[i]]); }
    x.beginPath(); x.moveTo(...left[0]); for (let i = 1; i < L; i++) x.lineTo(...left[i]); for (let i = L - 1; i >= 0; i--) x.lineTo(...right[i]); x.closePath(); x.fill();
    for (const i of [0, L - 1]) { x.beginPath(); x.arc(P[i][0] * n, P[i][1] * n, W[i], 0, Math.PI * 2); x.fill(); } // 둥근 끝
  }
  function inkPath(x, n, strokes, extra = 0, color = "#000", look = false) {
    x.lineCap = x.lineJoin = "round";
    for (let S of strokes) { if (!S.length) continue;
      const base = (S.w ?? PEN) * n, f = i => S[i]?.[2] ?? 1, col = look && S.tool && !color ? TOOLS[S.tool].color : color || "#000";
      x.strokeStyle = x.fillStyle = col;
      if (S.length === 1) { x.beginPath(); x.arc(S[0][0] * n, S[0][1] * n, (base * f(0) + extra) / 2, 0, Math.PI * 2); x.fill(); continue; }
      if (look && !extra && S.tool !== "pencil") { smoothLook(x, n, S, base, col); continue; } // 보이는 붓·펜 = 부드러운 선(본부 10-10)
      if (look && !extra && S.tool === "pencil" && S.length > 2) S = Object.assign(smoothPts(S).map(p => [p[0], p[1]]), { tool: S.tool, w: S.w }); // 연필 = 부드러운 점으로 아래 그대로(결 포함)
      const L = S.length, taper = i => (look && S.tool === "brush" ? Math.min(1, 0.35 + (0.65 * (L - 1 - i)) / Math.min(4, L - 1)) : 1); // 붓 끝 가늘게(마지막 4점)
      if (S.tool === "brush" || S.some(p => p[2] != null)) for (let i = 1; i < L; i++) { x.lineWidth = base * ((f(i - 1) + f(i)) / 2) * taper(i) + extra; x.beginPath(); x.moveTo(S[i - 1][0] * n, S[i - 1][1] * n); x.lineTo(S[i][0] * n, S[i][1] * n); x.stroke(); }
      else { x.lineWidth = base + extra; x.beginPath(); x.moveTo(S[0][0] * n, S[0][1] * n); for (const [a, b] of S.slice(1)) x.lineTo(a * n, b * n); x.stroke();
        if (look && S.tool === "pencil") { x.save(); x.globalAlpha = 0.35; x.lineWidth = Math.max(1, base * 0.25); for (const o of [-0.32, 0.32]) { x.beginPath(); S.forEach(([a, b], i) => { const j = ((i * 7919) % 5) / 5 - 0.4; (i ? x.lineTo : x.moveTo).call(x, a * n + o * base + j, b * n - o * base * 0.5 + j); }); x.stroke(); } x.restore(); } } // 연필 결
    }
  }
  const GUIDE_K = 1.3; // 회색 길 굵기 = 고른 도구 굵기 × 1.3(본부 10-11)
  const guideW = (tk = toolKey()) => TOOLS[tk].w * GUIDE_K; // 칸 비율
  // 회색 = 글꼴 글자 모양 그대로(본부 10-12 투덜이 「붓이든 펜이든 자판 글씨처럼 정확한 글자 모양」) · 굵기만 도구 따라(10-10) — 글자 획 굵기 w0 → 목표 w 로 고르게 불리거나 깎음(둥근 이음 · 모서리·곡선 글꼴 그대로)
  const w0Cache = new Map();
  function glyphW0(ch) { // 글자 획 굵기(칸 비율) = 2 × 넓이 / 둘레
    const key = ch + "|" + hfontKey(); if (w0Cache.has(key)) return w0Cache.get(key);
    const d = glyphImg(ch).getContext("2d").getImageData(0, 0, GN, GN).data, on = q => d[q * 4 + 3] > 128; let area = 0, edge = 0;
    for (let q = 0; q < GN * GN; q++) { if (!on(q)) continue; area++; const x0 = q % GN, y0 = (q / GN) | 0; if (!x0 || !y0 || x0 === GN - 1 || y0 === GN - 1 || !on(q - 1) || !on(q + 1) || !on(q - GN) || !on(q + GN)) edge++; }
    const w = edge ? (2 * area) / edge / GN : PEN; if (gCache.has(ch + "|0|" + hfontKey())) w0Cache.set(key, w); return w;
  }
  const edgeN = img => { const M = 120, c = document.createElement("canvas"); c.width = c.height = M; const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0, M, M); /* 작은 칸(120)에서 잼 = 칸에서 보일 만한 틈만 틈으로 */
    const d = cx.getImageData(0, 0, M, M).data, on = q => d[q * 4 + 3] > 128; let e = 0; for (let q = M + 1; q < M * M - M - 1; q++) if (on(q) && (!on(q - 1) || !on(q + 1) || !on(q - M) || !on(q + M))) e++; return e; };
  const growCache = new Map();
  function guideGrow(ch, w, cap = true) { // 칸 비율 · 0.001 단위(캐시 열쇠) · cap = 불려서 글자 틈이 메워지면(둘레가 글꼴의 85% 아래 — 붓 「들」「을」 ㄹ) 틈이 남는 만큼까지만
    const g = Math.round((w - glyphW0(ch)) * 1000) / 1000; if (!cap || g <= 0) return g;
    const key = ch + "|" + hfontKey() + "|" + g; if (growCache.has(key)) return growCache.get(key);
    const e0 = edgeN(glyphImg(ch)), fine = v => { const cv = document.createElement("canvas"); cv.width = cv.height = GN; glyphRaw(cv.getContext("2d"), GN, ch, "#000", v * GN); return edgeN(cv) >= e0 * 0.85; }; /* 시험 그림은 캐시에 안 넣음 */ let r = g;
    if (!fine(g)) { let lo = 0, hi = g; for (let k = 0; k < 6; k++) { const mid = Math.round(((lo + hi) / 2) * 1000) / 1000; if (fine(mid)) lo = mid; else hi = mid; } r = lo; }
    if (gCache.has(ch + "|0|" + hfontKey())) growCache.set(key, r); return r;
  }
  function guideGlyph(x, n, ch, w, color, cap = true) { glyph(x, n, ch, color, guideGrow(ch, w, cap)); }
  // 자석 따라오는 획 길(글자부 js/strokefit.js 10-12) — 붓 길(brushPath)을 회색(그 도구 굵기) 거리 능선으로 옮기고 다른 획을 뚫지 않게 · 마스크 = 화면 회색과 같은 그림(같은 배열을 다시 써야 거리 변환 캐시가 맞음)
  const gMaskCache = new Map();
  function guideMask(ch, tk) {
    const key = ch + "|" + tk + "|" + hfontKey(); if (gMaskCache.has(key)) return gMaskCache.get(key);
    const d = pix(GN, x => guideGlyph(x, GN, ch, guideW(tk), "#000")), m = new Uint8Array(GN * GN); for (let i = 0; i < GN * GN; i++) m[i] = d[i * 4 + 3];
    if (gCache.has(ch + "|0|" + hfontKey())) { if (gMaskCache.size > 60) gMaskCache.clear(); gMaskCache.set(key, m); } return m;
  }
  function fitPath(ch, list, i, tk) { const Qs = list.map(S => brushPath(ch, S)); if (!Qs[i]?.length) return Qs[i] || []; const F = fitToGuide({ Q: Qs[i], ch, toolW: TOOLS[tk]?.w ?? PEN, guide: guideMask(ch, tk), N: GN, others: Qs.filter((_, j) => j !== i) });
    return F?.length && F.tot <= Qs[i].tot * 1.3 + 0.05 ? F : Qs[i]; } // 맞춘 길이 자료 길보다 훨씬 길면(닫힌 ㅇ 을 끝 늘이기가 여러 바퀴 돎 · 붓 「생·정·성」 받침 ㅇ 2.0 ↔ 0.6) = 자료 길 그대로(글자부에 알림 10-12)
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
  // 새 점수(투덜이 10-10 「회색 안에 들어가면 무조건 맞는 걸로」 · 10-11 회색 = 획 가운데 선 × 도구 굵기 1.3 — 덮음 허용·벗어남 모두 그 회색 길 기준) — 글자 획(자료 획)마다 그 길이의 70% 이상을 학습자 선이 지나갔으면(그 자리 잉크 폭 절반 + 칸 1.2% 안 = 회색 안) 100
  //  · 회색 밖으로 나간 선(가까이 삐져나온 건 봐줌)만큼만 깎음(× 2) · 한 획이라도 70% 아래 = 79 까지(실패) · 연필·펜·붓 같은 결과(선 굵기 안 씀) · 획 자료 없으면 옛 방식
  // 획 방향(본부 10-12 투덜이 — 1·2·3 순서만이 아니라 시작 → 끝까지) · 학습자 획 S([x, y, …] 점) ↔ 자료 획 T
  const polyD = (P, x, y) => { if (P.length === 1) return Math.hypot(x - P[0][0], y - P[0][1]); let b = Infinity; for (let i = 1; i < P.length; i++) { const a = P[i - 1], c = P[i], dx = c[0] - a[0], dy = c[1] - a[1], l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)); b = Math.min(b, Math.hypot(x - a[0] - dx * r, y - a[1] - dy * r)); } return b; };
  function matchData(ch, S, list, tol) { // S 가 가장 많이 덮은 자료 획 번호(자료 획 30%↑ 덮음 · 서로 겹친 정도로 고름) · 없으면 -1
    if (!S || S.length < 2) return -1; let best = -1, bs = 0; const P = S.map(p => [p[0], p[1]]), stP = Math.max(1, Math.floor(P.length / 40));
    list.forEach((T, j) => { const Q = brushPath(ch, T); if (!Q.length) return; const QP = Q.map(q => [q.x, q.y]), st = Math.max(1, Math.floor(Q.length / 40)); let n = 0, k = 0, m = 0, h = 0;
      for (let i = 0; i < Q.length; i += st) { n++; if (polyD(P, Q[i].x, Q[i].y) <= tol) k++; }
      for (let i = 0; i < P.length; i += stP) { m++; if (polyD(QP, P[i][0], P[i][1]) <= tol) h++; }
      const sc = (k / n) * (h / m); if (k / n >= 0.3 && sc > bs) { bs = sc; best = j; } });
    return best;
  }
  function strokeDir(ch, S, T) { // rev = 거꾸로 그음 · msg = 그 획 방향 알림(자료 획 시작 → 끝 큰 방향 · 닫힌 획(ㅇ) = 위에서 시작 + 도는 방향)
    const Q = brushPath(ch, T); if (Q.length < 2 || !S || S.length < 2) return { rev: false, msg: "" };
    const a = Q[0], b = Q[Q.length - 1], area = P => { let v = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; v += p[0] * q[1] - q[0] * p[1]; } return v / 2; };
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.15 * Q.tot) { const aQ = area(Q.map(q => [q.x, q.y])), aS = area(S), msg = t(aQ < 0 ? "h_dir_ccw" : "h_dir_cw"); /* 화면 좌표(아래로 +) = 음수가 시계 반대 */
      if (Math.abs(aS) < 0.3 * Math.abs(aQ)) return { rev: false, msg }; /* 고리 모양이 아니면 방향은 안 봄(덮음이 가름) */
      return { rev: Math.sign(aS) !== Math.sign(aQ) || Math.hypot(S[0][0] - a.x, S[0][1] - a.y) > 0.15, msg }; }
    const tOf = p => { let bi = 0, bd = Infinity; Q.forEach((q, i) => { const d = Math.hypot(q.x - p[0], q.y - p[1]); if (d < bd) { bd = d; bi = i; } }); return Q[bi].t / Q.tot; };
    const b1 = Q.find(q => q.t >= Q.tot * 0.4) || b /* 처음 40% 방향 = 꺾인 획(ㄱ)은 첫 꺾기 전 방향 · 검사부 10-12 */, dx = b1.x - a.x, dy = b1.y - a.y, key = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? "h_dir_down" : "h_dir_up") : dx > 0 ? "h_dir_right" : "h_dir_left";
    return { rev: tOf(S[0]) - tOf(S[S.length - 1]) > 0.25, msg: t(key) };
  }
  // 회색(그 도구 굵기) ∪ 글자 모양 밖까지 거리(칸 비율) — 200 칸 거리 지도(둘레 3-4 거리) · 글자·도구·글꼴마다 한 번
  const outCache = new Map();
  function outDist(ch, tk) {
    const key = ch + "|" + tk + "|" + hfontKey(); if (outCache.has(key)) return outCache.get(key);
    const M = 200, g = pix(M, x => { guideGlyph(x, M, ch, guideW(tk), "#000"); glyph(x, M, ch, "#000"); }), D = new Float32Array(M * M), s2 = Math.SQRT2;
    for (let i = 0; i < M * M; i++) D[i] = g[i * 4 + 3] > 128 ? 0 : 1e9;
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { const i = y * M + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - M] + 1); if (x && y) D[i] = Math.min(D[i], D[i - M - 1] + s2); if (y && x < M - 1) D[i] = Math.min(D[i], D[i - M + 1] + s2); }
    for (let y = M - 1; y >= 0; y--) for (let x = M - 1; x >= 0; x--) { const i = y * M + x; if (x < M - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < M - 1) D[i] = Math.min(D[i], D[i + M] + 1); if (x < M - 1 && y < M - 1) D[i] = Math.min(D[i], D[i + M + 1] + s2); if (y < M - 1 && x) D[i] = Math.min(D[i], D[i + M - 1] + s2); }
    const f = (x, y) => D[Math.max(0, Math.min(M - 1, Math.round(y * M - 0.5))) * M + Math.max(0, Math.min(M - 1, Math.round(x * M - 0.5)))] / M;
    if (gCache.has(ch + "|0|" + hfontKey())) { if (outCache.size > 60) outCache.clear(); outCache.set(key, f); } return f;
  }
  // 손 떨림 고르기(검사부 10-13 — 점마다 ±0.75% 떨면 길이가 2~3배로 부풀어 「덧칠·밖」 벌점 · 바르게 썼는데 60점) — 이동 평균(창 = 칸의 약 2% 를 실제로 나아가는 점 수) 두 번
  function smoothS(S) {
    const n = S.length; if (n < 5) return S.map(p => [p[0], p[1]]); const k = 5, adv = []; for (let i = 0; i < n; i++) { const a = S[Math.max(0, i - k)], b = S[Math.min(n - 1, i + k)], m = Math.min(n - 1, i + k) - Math.max(0, i - k); adv.push(m ? Math.hypot(b[0] - a[0], b[1] - a[1]) / m : 0); }
    const med = adv.slice().sort((x, y) => x - y)[n >> 1] || 0.005, w = Math.max(1, Math.min(12, Math.round(0.02 / Math.max(med, 0.0015))));
    let P = S.map(p => [p[0], p[1]]); for (let r = 0; r < 2; r++) P = P.map((p, i) => { if (i === 0 || i === n - 1) return p; const lo = Math.max(0, i - w), hi = Math.min(n - 1, i + w); let x = 0, y = 0; for (let j = lo; j <= hi; j++) { x += P[j][0]; y += P[j][1]; } return [x / (hi - lo + 1), y / (hi - lo + 1)]; });
    return P;
  }
  // 모양 벌점 — 고른 학습자 선으로: ① 회색∪글자 밖 거리·나간 길이 ② 가운데 어긋남(바른 길 = 회색 가운데 길 ∪ 자료 길에서 칸 4.5% 넘게 · 도구 굵기와 상관없음 → 붓으로 휘어 그어도 연필·펜처럼 깎임 · 검사부 10-13) ③ 덧칠(길이 비율)
  const cenCache = new Map(); // 글자 가운데 선(글꼴 잉크 능선) = 바른 길에 넣음 — 이 글꼴 ㄱ 꼬리처럼 자료 길과 4.5% 넘게 다른 곳도 회색 가운데를 따라 쓰면 바름
  const cenPaths = ch => { const key = ch + "|" + hfontKey(); if (cenCache.has(key)) return cenCache.get(key); const v = centerOf(ch).map(S => S.map(p => ({ x: p[0], y: p[1] }))); if (gCache.has(ch + "|0|" + hfontKey())) { if (cenCache.size > 60) cenCache.clear(); cenCache.set(key, v); } return v; };
  function shapeOf(ch, strokes, tk, flen, paths = []) {
    const dO = outDist(ch, tk), tol = 0.012, cTol = 0.045; let maxE = 0, stray = 0, tot = 0, maxC = 0, strayC = 0;
    const cd = (x, y) => { let b = Infinity; for (const Q of paths) { if (Q.length === 1) { const d = Math.hypot(x - Q[0].x, y - Q[0].y); if (d < b) b = d; } } for (const Q of paths) for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], c = Q[i], dx = c.x - a.x, dy = c.y - a.y, l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)); const d = Math.hypot(x - a.x - dx * r, y - a.y - dy * r); if (d < b) b = d; } return b; };
    for (const S0 of strokes) { const S = smoothS(S0); for (let i = 0; i < S.length; i++) { const p = S[i], ds = i ? Math.hypot(p[0] - S[i - 1][0], p[1] - S[i - 1][1]) : 0; tot += ds; const e = dO(p[0], p[1]) - tol; if (e > 0) { stray += ds; maxE = Math.max(maxE, e); }
      if (paths.length && i % 2 === 0) { const c = cd(p[0], p[1]) - cTol; if (c > 0) { strayC += ds * 2; maxC = Math.max(maxC, c); } } } }
    const lr = tot / (flen || 1), sf = stray / (tot || 1), sc = Math.min(1, strayC / (tot || 1));
    return { pen: 4 * maxE + 2 * sf + 0.5 * Math.max(0, lr - 1.3) + 3 * maxC + 1.5 * sc, maxE, stray: sf, lr, maxC, strayC: sc };
  }
  function handScore(ch, strokes, boxPx = st.hand?.s || 260) {
    const list = SK.STK ? strokesOf(ch) : []; if (!list.length) return handScoreOld(ch, strokes, boxPx);
    const tw = Math.max(...strokes.map(S => S.w ?? TOOLS[toolKey()].w), TOOLS[toolKey()].w * (strokes.length ? 0 : 1)), gw = tw * GUIDE_K; // 그은 도구 굵기(섞이면 가장 굵은 것) · 회색 길 굵기
    const N = 160, maskD = pix(N, x => guideGlyph(x, N, ch, Math.max(gw, glyphW0(ch)) + tw + 0.02, "#000", false)), ink = pix(N, x => inkPath(x, N, strokes, 0)); // 벗어남 = 회색 글자(+ 도구 굵기 · 칸 1%) 밖 잉크(본부 10-12 회색 = 글꼴 모양) · 연필처럼 회색이 글꼴보다 가늘어도 채점 구역은 글꼴 굵기 아래로 안 줄임(바른 획 점수 그대로 · 검사부 10-12)
    const segs = []; for (const S of strokes) { if (S.length === 1) segs.push([S[0], S[0]]); for (let i = 1; i < S.length; i++) segs.push([S[i - 1], S[i]]); }
    const dist = (x, y) => { let b = Infinity; for (const [a, c] of segs) { const dx = c[0] - a[0], dy = c[1] - a[1], l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)); b = Math.min(b, Math.hypot(x - a[0] - dx * r, y - a[1] - dy * r)); } return b; };
    // 거꾸로 그은 획 = 그 자료 획 안 덮은 것(본부 10-12) — 학습자 획마다 가장 많이 덮은 자료 획과 방향 견줌 · 같은 자료 획을 바른 방향으로도 그었으면 봐줌
    const dirBad = new Set(), dirN = new Map(); let dir = "";
    for (const S of strokes) { const j = matchData(ch, S, list, gw / 2 + 0.008); if (j < 0) continue; const d = strokeDir(ch, S, list[j]), o = dirN.get(j) || { f: 0, r: 0, msg: d.msg }; if (d.rev) o.r++; else o.f++; dirN.set(j, o); }
    for (const [j, o] of dirN) if (o.r && !o.f) { dirBad.add(j); dir ||= o.msg; }
    // 덮음 기준 = 화면 회색 가운데 길(글자부 strokefit · 그 도구 굵기 · 본부 10-12 「ㄱ·ㅈ+ㅓ 바른 획 96~99」) — 회색을 따라 그은 학습자는 이 길을 지나감 · 옛 붓 길(brushPath)은 끝이 다른 획 속·회색 밖까지 가서 「안 덮음」이 되던 것
    const stk = Object.keys(TOOLS).find(k => Math.abs(TOOLS[k].w - tw) < 1e-6) || toolKey();
    const miss = [], cov = list.map((S, si) => { const Q = fitPath(ch, list, si, stk), step = Math.max(1, Math.floor(Q.length / 40)), bad = dirBad.has(si); let n = 0, k = 0;
      for (let i = 0; i < Q.length; i += step) { k++; const q = Q[i]; if (!bad && dist(q.x, q.y) <= gw / 2 + 0.008) n++; /* 회색 안(본부 10-11) */ else miss.push(Math.min(N - 1, Math.floor(q.y * N)) * N + Math.min(N - 1, Math.floor(q.x * N))); }
      return k ? n / k : 0; });
    let p = 0, out = 0; for (let i = 3; i < ink.length; i += 4) if (ink[i] > 128) { p++; if (maskD[i] <= 128) out++; }
    const low = Math.min(...cov), avg = cov.reduce((a, b) => a + b, 0) / cov.length, outside = p ? out / p : 1, ok = low >= COMP_MIN; /* 덩어리마다 75%(위 규칙 · 10-12 「은」 펜 비껴 그림 70% 로 통과하던 것) */
    const keep = Math.max(0, 1 - 2 * Math.max(0, outside - 0.02)); /* 잉크 2% 까지 벗어남은 봐줌 = 획 끝 둥근 펜 끝이 글자 끝을 살짝 넘는 것(「전」 연필 1.6% → 96) · 펜 굵기만큼 비껴 그림은 그대로 실패 */
    // 모양(투덜이 10-13 「나」 비뚤고 굵은데 99 · 「누」 100 — 「좋은 점수가 나올 게 아닌데」) — 학습자 획 가운데 선이 회색(∪ 글자 모양) 밖으로 얼마나 나갔나
    //  벌점 = 4 × 가장 멀리 나간 거리(칸 비율 · 1.2% 봐줌) + 2 × 밖으로 나간 길이 비율 + 0.5 × (그은 길이 ÷ 회색 길 길이 − 1.3 · 덧칠·여러 번 그음) · 0.22 까지는 봐줌(바른 획 100 그대로 · 「전」 연필 자료 길 0.21) → 모양 = 1 − 1.5 × 넘은 만큼
    const fps = list.map((S, si) => fitPath(ch, list, si, stk)), flen = fps.reduce((a, Q) => a + (Q.tot || 0), 0), sh = shapeOf(ch, strokes, stk, flen, fps.concat(list.map(S => brushPath(ch, S)), cenPaths(ch))), shape = Math.max(0, Math.min(1, 1 - 1.5 * Math.max(0, sh.pen - 0.22)));
    const pct = Math.max(0, Math.min(100, Math.floor((ok ? 1 : avg) * keep * shape * 100 + 1e-9)));
    return { score: pct / 100, pct: ok ? pct : Math.min(pct, 79), ok, comps: cov, low, avg, cover: avg, outside, shape, sh, miss, N, T: 0, dir: dirBad.size ? dir : "" };
  }
  function handScoreOld(ch, strokes, boxPx = st.hand?.s || 260) {
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
  // 획 자료·자모 칸·획순 칠 = 글자부 js/strokes.js(10-12 떼어 냄) — 이 화면의 글꼴 그림·마스크를 넘겨 같은 픽셀로
  const SK = createStrokes({ glyph, glyphImg, pix, hfontKey, gCache, compsOf, PEN, GN });
  const { centerOf, traceOf, UN, uCache, deCrumb, ringFix, unitsOf, stkReady, strokesOf, fitOf, snap, OR_MARK, ownCache, unitMaskCache, pathCache, brushPath, brushStroke, revPrev, revealOrder } = SK;
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
    if (!H.orderTold) { const need = us.find(u => ROLE[u.role] < role && !H.roles.has(ROLE[u.role])); if (need) { H.orderTold = true; H.roles.add(role); return t("h_order_first", { j: koq(need.jamo) }); } }
    H.roles.add(role);
    { const list = SK.STK ? strokesOf(H.ch) : []; if (list.length) { const j = matchData(H.ch, S, list, ((S.w ?? TOOLS[toolKey()].w) * GUIDE_K) / 2 + 0.008); if (j < 0) return ""; const d = strokeDir(H.ch, S, list[j]); return d.rev ? d.msg : ""; } } /* 방향 = 덮은 자료 획의 시작 → 끝(본부 10-12) · 자료 없으면 아래 옛 어림 */
    const [ex, ey] = S[S.length - 1], dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy);
    if (len >= 0.12 && Math.abs(dx) > 2 * Math.abs(dy) && dx < 0) return t("h_dir_lr");
    if (len >= 0.12 && Math.abs(dy) > 2 * Math.abs(dx) && dy < 0) return t("h_dir_tb");
    return "";
  }
  // 자석으로 붙은 획 = 회색(글꼴 모양) 안의 바른 획으로 「착」(본부 10-12 투덜이 「최종적으로 회색 안에 예쁘게 다 들어가야」)
  //  0~k 번 획 칠(revealOrder · 글꼴 잉크)을 씨앗으로, 회색이 글자보다 굵은 곳은 가장 가까운 글자 잉크 몫으로 넓힘 · 회색 밖 0 · 굵기 = 회색 굵기
  const snapCache = new Map();
  function snapMask(ch, k, tk) {
    const key = ch + "|" + hfontKey() + "|" + k + "|" + tk; if (snapCache.has(key)) return snapCache.get(key);
    const N = GN, list = strokesOf(ch), R = revealOrder(ch, N, list, k, 1).cv.getContext("2d").getImageData(0, 0, N, N).data, G = glyphImg(ch).getContext("2d").getImageData(0, 0, N, N).data;
    const gc = document.createElement("canvas"); gc.width = gc.height = N; const gx = gc.getContext("2d"); guideGlyph(gx, N, ch, guideW(tk), "#000"); const gi = gx.getImageData(0, 0, N, N), D = gi.data;
    const lab = new Int8Array(N * N).fill(-1), q = new Int32Array(N * N); let h = 0, e = 0;
    for (let i = 0; i < N * N; i++) if (G[i * 4 + 3] > 128) { lab[i] = R[i * 4 + 3] > 128 ? 1 : 0; q[e++] = i; }
    while (h < e) { const i = q[h++], x = i % N; for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]) if (j >= 0 && j < N * N && lab[j] < 0 && D[j * 4 + 3] > 0) { lab[j] = lab[i]; q[e++] = j; } }
    for (let i = 0; i < N * N; i++) if (lab[i] !== 1) D[i * 4 + 3] = 0;
    gx.putImageData(gi, 0, 0);
    if (snapCache.size > 80) snapCache.clear(); if (gCache.has(ch + "|0|" + hfontKey())) snapCache.set(key, gc); return gc;
  }
  // 「스윽」(본부 10-12) — 자석·자동 완성으로 획이 그려질 때만(손으로 그을 땐 없음) · 흰소음 + 대역 필터 · 연필 = 높고 사각 · 펜 = 중간 · 붓 = 낮고 넓게 · 획 길이만큼 짧게(최대 0.3초) · __sfxLog 시작/끝
  // 연필 = 결이 있는 소리(흰소음을 불규칙하게 끊었다 이음 → 사각사각) · 펜 = 고른 흰소음(매끈) · 붓 = 낮고 넓게
  //  tok = 자석이 획을 착 붙일 때 「스윽」 끝에 짧은 「톡」(흰소음 15ms · 낮은 통과 · 딩동보다 훨씬 작게 — 오실레이터를 안 써서 딩동 세기와 섞이지 않음)
  const noiseBufs = {};
  function noiseOf(ctx, kind) {
    if (noiseBufs[kind]) return noiseBufs[kind]; const sr = ctx.sampleRate, b = ctx.createBuffer(1, sr, sr), a = b.getChannelData(0);
    let gate = 1; for (let i = 0; i < a.length; i++) { if (kind === "grain" && i % Math.round(sr / 90) === 0) gate = 0.25 + 0.75 * Math.random(); a[i] = (Math.random() * 2 - 1) * (kind === "grain" ? gate : 1); }
    return (noiseBufs[kind] = b);
  }
  let drawSnd = null;
  function drawStart(tk) { drawEnd(); try { const ctx = audioCtx(); if (ctx.state !== "running") ctx.resume().catch(() => {}); /* 잠든·끊긴(아이폰 interrupted) 소리 장치 = 획 시작마다 깨움(본부 10-14) */ const vol = window.__sfxVolume ?? 1, P = { pencil: [3400, 1.1, 0.22], pen: [2400, 0.9, 0.16], brush: [850, 0.55, 0.2] }[tk] || [2400, 0.9, 0.16];
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseOf(ctx, tk === "pencil" ? "grain" : "plain"); src.loop = true; bp.type = "bandpass"; bp.frequency.value = P[0]; bp.Q.value = P[1]; g.gain.value = 0.0001; src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
      drawSnd = { src, g, ctx, peak: P[2] * vol, quiet: 0 }; window.__sfxLog?.push({ t: Math.round(performance.now()), ev: "효과음", name: "draw/" + tk }); } catch {} }
  function drawMove(speed) { const d = drawSnd; if (!d) return; try { d.g.gain.setTargetAtTime(Math.max(0.0001, d.peak * Math.min(1, 0.2 + speed / 1.2)), d.ctx.currentTime, 0.03); clearTimeout(d.quiet); d.quiet = setTimeout(() => { try { d.g.gain.setTargetAtTime(0.0001, d.ctx.currentTime, 0.05); } catch {} }, 90); } catch {} }
  function drawEnd() { const d = drawSnd; if (!d) return; drawSnd = null; clearTimeout(d.quiet); try { d.g.gain.setTargetAtTime(0.0001, d.ctx.currentTime, 0.03); } catch {} setTimeout(() => { try { d.src.stop(); } catch {} }, 180); }
  // 획의 마지막 꺾임 자리(길이 t · 칸 비율) — 앞뒤 칸 2.5% 방향이 60° 넘게(둥근 ㅇ 은 꺾임 아님) 바뀌는 곳 · 없으면 0 · 자석 「나머지 채움」은 이 꺾임을 지난 뒤에만(꺾인 뒤 30% 까지 그음)
  function cornerT(Q) { if (Q.lc != null) return Q.lc; let lc = 0; const tot = Q.tot || (Q.length ? Q[Q.length - 1].t : 0), at = t0 => { let i = 0; while (i < Q.length - 1 && Q[i].t < t0) i++; return Q[i]; };
    for (let i = 0; i < Q.length; i++) { const t0 = Q[i].t; if (t0 < Math.max(0.025, tot * 0.15) || t0 > Math.min(tot - 0.025, tot * 0.85)) continue; /* 획 끝 갈고리(ㅅ 끝 93%)는 꺾임으로 안 셈 */ const a = at(t0 - 0.025), b = Q[i], c2 = at(t0 + 0.025), d1 = Math.atan2(b.y - a.y, b.x - a.x), d2 = Math.atan2(c2.y - b.y, c2.x - b.x); let dd = Math.abs(d2 - d1); if (dd > Math.PI) dd = 2 * Math.PI - dd; if (dd > (60 * Math.PI) / 180) lc = t0; }
    Q.lc = lc; return lc; }
  const pastCorner = (Q, t0) => { const lc = cornerT(Q), tot = Q.tot || Q[Q.length - 1].t; return !lc || t0 >= lc + 0.3 * (tot - lc); };
  function swish(len = 0.3, tk = toolKey(), tok = false) {
    try { const ctx = audioCtx(), vol = window.__sfxVolume ?? 1, d = Math.min(0.3, 0.12 + 0.3 * len);
      const P = { pencil: [3400, 1.1, 0.3], pen: [2600, 1.0, 0.2], brush: [900, 0.5, 0.24] }[tk] || [2600, 1, 0.2] /* 연필 = 5200Hz·0.16 이라 PC 스피커에서 안 들리던 것(투덜이 10-14) → 3400Hz·0.3 */, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t0 = ctx.currentTime + 0.005;
      src.buffer = noiseOf(ctx, tk === "pencil" ? "grain" : "plain"); bp.type = "bandpass"; bp.frequency.value = P[0]; bp.Q.value = P[1]; src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(P[2] * vol, t0 + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t0 + d);
      const name = "swish/" + tk; window.__sfxLog?.push({ t: Math.round(performance.now()), ev: "시작", name }); src.onended = () => window.__sfxLog?.push({ t: Math.round(performance.now()), ev: "끝", name });
      src.start(t0, Math.random() * 0.6, d);
      if (tok) { const s2 = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g2 = ctx.createGain(), t1 = t0 + d; s2.buffer = noiseOf(ctx, "plain"); lp.type = "lowpass"; lp.frequency.value = 1800; s2.connect(lp); lp.connect(g2); g2.connect(ctx.destination);
        g2.gain.setValueAtTime(0.35 * vol, t1); g2.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.015 + 0.03);
        s2.onended = () => window.__sfxLog?.push({ t: Math.round(performance.now()), ev: "끝", name: "tok" }); setTimeout(() => window.__sfxLog?.push({ t: Math.round(performance.now()), ev: "시작", name: "tok" }), d * 1000); s2.start(t1, 0, 0.05); }
    } catch {}
  }
  function setupHand(c) {
    const hand = work.querySelector(".hand"), box = hand.querySelector(".hbox"), gv = box.querySelector(".hguide"), iv = box.querySelector(".hink"), bt = hand.querySelector(".hbtns");
    const H = (st.hand = { ch: c.ch, strokes: [], cur: null, timer: 0, s: 0 });
    const col = v => { const e = document.createElement("i"); e.style.color = `var(${v})`; box.append(e); const c2 = getComputedStyle(e).color; e.remove(); return c2; }; // 칸 색 낱말 → 실제 색(밝은·어두운 판 따라)
    const paintGuide = (missN) => { const x = gv.getContext("2d"), n = gv.width; x.clearRect(0, 0, n, n);
      x.strokeStyle = col("--hguide-line"); x.lineWidth = Math.max(1, n / 300); x.setLineDash([n / 60, n / 60]);
      x.beginPath(); x.moveTo(n / 2, 0); x.lineTo(n / 2, n); x.moveTo(0, n / 2); x.lineTo(n, n / 2); x.stroke(); x.setLineDash([]); // 십자 보조선(흐리게)
      guideGlyph(x, n, c.ch, guideW(), col("--hguide-ink")); // 회색 = 글꼴 글자 모양 · 굵기 = 도구 굵기 × 1.3(본부 10-12)
      if (missN) { const { miss, N } = missN, k = n / N; x.fillStyle = "#e08a1e"; for (const i of miss) x.fillRect((i % N) * k, Math.floor(i / N) * k, k + 0.5, k + 0.5); } // 덜 덮은 곳 주황
      else H.magMarks?.(); }; // 자석 = 다음 획 번호(회색 판을 다시 그릴 때마다 · 칸 크기 맞춤에도 남게)
    const paintInk = (color) => { const x = iv.getContext("2d"), n = iv.width; x.clearRect(0, 0, n, n); const F = H.follow;
      const list = (F ? H.strokes.filter(S => S !== H.cur) : H.strokes).filter(S => !S.snap);
      const sn = H.strokes.filter(S => S.snap); if (sn.length && SK.STK) { const tc = document.createElement("canvas"); tc.width = tc.height = n; const tx = tc.getContext("2d"); tx.drawImage(snapMask(c.ch, sn.length - 1, toolKey()), 0, 0, n, n); tx.globalCompositeOperation = "source-in"; tx.fillStyle = color || (H.passed ? col("--okc") : TOOLS[sn[sn.length - 1].tool]?.color || "#000"); tx.fillRect(0, 0, n, n); x.drawImage(tc, 0, 0); } /* 자석으로 붙은 획 = 회색 안 바른 획(본부 10-12) */
      inkPath(x, n, list, 0, color || (H.passed ? col("--okc") : null), true);
      if (F && F.prog >= 0) { const tc = document.createElement("canvas"); tc.width = tc.height = n; const tx = tc.getContext("2d"); inkPath(tx, n, [Object.assign(F.Q.slice(0, F.prog + 1).map(q => [q.x, q.y, Math.min(1, (q.w ?? F.w) / F.w)]), { tool: F.tool, w: F.w })], 0, color || null, true); tx.globalCompositeOperation = "destination-in"; guideGlyph(tx, n, c.ch, guideW(F.tool), "#000"); x.drawImage(tc, 0, 0); } /* 자석 따라오는 획 = 회색 안만(글자부 권고 10-12 · 길은 strokefit) */
      if (F && F.finger && F.prog >= 0 && !F.lost) { const q = F.Q[F.prog]; x.save(); x.strokeStyle = OR_MARK; x.globalAlpha = 0.8; x.lineWidth = Math.max(1, n / 250); x.setLineDash([n / 70, n / 90]); x.beginPath(); x.moveTo(F.finger[0] * n, F.finger[1] * n); x.lineTo(q.x * n, q.y * n); x.stroke(); x.restore(); } }; // 자석 따라오는 중 = 붙은 만큼만 획 + 손가락까지 가는 점선(본부 10-11) // 도구마다 제 색 · 통과 = 초록 // 통과 = 초록(다시 그려도)
    const fit = () => { if (!hand.isConnected) return; const cs = getComputedStyle(hand), px = v => parseFloat(cs[v]) || 0, gap = px("columnGap") || 10; // 칸 크기 = 안쪽 여백 빼고(본부 10-07 왼쪽 끝 3px 에 붙던 것)
      const iw = hand.clientWidth - px("paddingLeft") - px("paddingRight"), ih = hand.clientHeight - px("paddingTop") - px("paddingBottom");
      // 단추 자리 = 오른쪽 한 줄 · 오른쪽 두 줄 · 칸 아래 중 단추가 다 들어가고 칸이 가장 큰 것(도구 3 + 단추 4 = 7개 · 375×667 에서 한 줄이면 넘침)
      const lay = [["", c2 => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["two", () => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["stack", () => Math.min(ih - bt.offsetHeight - (px("rowGap") || 8), iw), () => bt.offsetWidth <= iw + 1]];
      let best = null; for (const [k, sz, fits] of lay) { hand.classList.remove("stack", "two"); if (k) hand.classList.add(k); const v = sz(), f = fits(); if (f && (!best || v > best[1])) best = [k, v]; }
      if (!best) best = ["stack", Math.min(ih - bt.offsetHeight - 8, iw)];
      hand.classList.remove("stack", "two"); if (best[0]) hand.classList.add(best[0]);
      const s = Math.max(60, Math.floor(best[1])), dpr = window.devicePixelRatio || 1;
      box.style.width = box.style.height = s + "px"; for (const cv of [gv, iv]) cv.width = cv.height = Math.round(s * dpr); H.s = s; paintGuide(); paintInk(); };
    fit(); H.ro?.disconnect(); H.ro = new ResizeObserver(() => fit()); H.ro.observe(hand); stkReady.then(() => { if (st.hand === H) paintGuide(); }); // 획 자료가 오면 회색 길로
    document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, c.ch).catch(() => {}).then(() => document.fonts.ready).then(() => { if (st.hand !== H) return; gCache.clear(); uCache.clear(); revPrev.clear(); pathCache.clear(); unitMaskCache.clear(); ownCache.clear(); fit(); }); /* 앞 장면·붓 길·자모 틀도 함께 비움 */ // 글꼴이 늦게 오면 글자 그림 다시
    const at = e => { const r = iv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    // 점 = [x, y, 굵기 배수] — 붓만: 진짜 펜이면 누르는 힘 · 아니면 빠르기(칸/초 · 빠를수록 가늘게) · 앞 점과 부드럽게 이어 붙임
    const pt = (e, S) => { const p = at(e); if (toolKey() !== "brush" && !(S && S.tool === "brush")) return p; const now = e.timeStamp || performance.now();
      let f; if (e.pointerType === "pen" && e.pressure > 0) f = 0.5 + 0.7 * Math.min(1, e.pressure);
      else if (!S || !S.length) f = 1; else { const q = S[S.length - 1], dt = Math.max(1, now - (S.t || now - 16)), v = Math.hypot(p[0] - q[0], p[1] - q[1]) / (dt / 1000); f = 1.2 - 0.7 * Math.min(1, v / 2.5); }
      if (S && S.length) f = S[S.length - 1][2] * 0.6 + f * 0.4; if (S) S.t = now; return [p[0], p[1], Math.max(0.5, Math.min(1.2, f))]; };
    iv.addEventListener("pointerdown", e => { if (st.auto) return; if (st.busy) { if (!H.passSnd) return; hush(); st.busy = false; H.passSnd = false; } H.drawGen = (H.drawGen || 0) + 1; /* 통과 글자 소리 중에 다시 쓰기 = 소리 끊고 첫 획부터 받음(본부 10-10 「100 뒤 다시 쓰면 첫 획이 빠져 68」) */ if (H.cur) up(); /* 손 뗌을 못 받은 채 남은 획 = 먼저 마무리 */ e.preventDefault(); try { iv.setPointerCapture(e.pointerId); } catch {} clearTimeout(H.timer); stopLoop(); // 투덜이 10-14 PC 마우스 「자석이 갑자기 안 먹음」 — 이 줄이 앞 // 주석에 묻혀 손 뗌 잡기(setPointerCapture)가 없었음 → 칸 밖에서 놓으면 획이 안 끝나 자석이 안 붙고 그대로 남음
      if (H.ordPlaying || H.ordAt) { H.stopOrder(); paintGuide(); } // 획순 보는 중·멈춘 채 쓰기 시작 = 획순 그만(회색으로)
      if (H.passed) { H.passed = false; H.strokes = []; H.roles = null; H.orderTold = false; H.mag = 0; markHand(); if (magnetOn()) { paintGuide(); H.magMarks?.(); } } // 통과 뒤 다시 그리면 = 다시 쓰기(더 높은 점수 · 자석은 처음 획부터)
      clearTimeout(H.clr); { const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; } // 새로 쓰기 시작 = 점수 지움
      const tk = toolKey(); H.cur = Object.assign([pt(e, null)], { tool: tk, w: TOOLS[tk].w }); H.strokes.push(H.cur); paintInk(); drawStart(tk); H.lastMv = [e.clientX, e.clientY, e.timeStamp || performance.now()]; if (!magnetOn()) startTimer(H); });
    iv.addEventListener("pointermove", e => { if (!H.cur) return; e.preventDefault(); { const now = e.timeStamp || performance.now(), L = H.lastMv; if (L) { const r = iv.getBoundingClientRect(), dt = Math.max(1, now - L[2]); drawMove(Math.hypot(e.clientX - L[0], e.clientY - L[1]) / Math.max(1, r.width) / (dt / 1000)); } H.lastMv = [e.clientX, e.clientY, now]; } const evs = e.getCoalescedEvents?.() || []; for (const ev of evs.length ? evs : [e]) H.cur.push(pt(ev, H.cur)); if (magnetOn()) magFollow(H.cur[H.cur.length - 1]); paintInk(); });
    // 실시간 자석(본부 10-11 「포토샵 마그네틱 올가미처럼」) — 지금 차례 획 위에서 손가락과 가장 가까운 점이 앞으로만 따라옴 · 칸 12% 넘게 떨어지면 따라오기 멈춤
    const magFollow = p => { const T = H.magList?.[H.mag]; if (!T) return; let F = H.follow; if (!F) { const Q = fitPath(c.ch, H.magList, H.mag, H.cur.tool); if (!Q.length) return; F = H.follow = { Q, prog: -1, lost: false, tool: H.cur.tool, w: H.cur.w }; }
      F.finger = [p[0], p[1]]; if (F.lost) return; let bi = -1, bd = Infinity; for (let i = Math.max(0, F.prog); i < F.Q.length; i++) { if (F.prog >= 0 && F.Q[i].t - F.Q[F.prog].t > 0.2) break; /* 앞으로 칸 20% 안만(ㅇ 을 거꾸로 돌면 끝 쪽으로 건너뛰던 것 · 본부 10-12) */ const d = Math.hypot(F.Q[i].x - p[0], F.Q[i].y - p[1]); if (d < bd) { bd = d; bi = i; } }
      if (bd > 0.12) { if (F.prog >= 0) F.lost = true; return; } if (F.prog < 0 && bi > F.Q.length * 0.3) return;
      if (F.prog >= 0) { const t0 = F.Q[F.prog].t; let kb = Infinity, kt = t0; for (let i = F.prog - 1; i >= 0 && t0 - F.Q[i].t <= 0.25; i--) { const d = Math.hypot(F.Q[i].x - p[0], F.Q[i].y - p[1]); if (d < kb) { kb = d; kt = F.Q[i].t; } }
        if (kb < bd - 0.02 && t0 - kt > 0.04) { F.lost = true; return; } } /* 손가락이 지나온 쪽(뒤 25%)에 더 가까움 = 거꾸로 감 → 따라오기 그만(쓰기부 10-12 「자」 ㅈ 거꾸로가 50% 넘게 따라와 붙던 것) */
      F.prog = Math.max(F.prog, bi); };
    const up = () => { if (!H.cur) return; drawEnd(); const S = H.cur; H.cur = null; clearTimeout(H.timer); const F = H.follow; H.follow = null; if (H.tDue) { H.tDue = false; setTimeout(() => st.hand === H && !H.cur && !H.passed && handJudge(), 50); }
      if (magnetOn()) { if (F && F.prog >= F.Q.length * 0.5 && pastCorner(F.Q, F.Q[F.prog].t)) return magnetUp(S, true); return magnetUp(S); } /* 절반(50%↑) 따라왔으면 나머지 채움(본부 10-12 · 전 85%) · 그 획 완성 */ H.timer = setTimeout(() => st.hand === H && !H.cur && readyToJudge(H) && handJudge(), 1200); jamoSay(H);
      const msg = strokeHint(H, S); if (msg) bubble(msg); }; // 획순·방향 알림(짧은 말풍선)
    const bubble = msg => { let b = box.querySelector(".hbubble"); if (!b) { b = document.createElement("b"); b.className = "hbubble"; box.append(b); } b.textContent = msg; b.hidden = false; H.hints = (H.hints || []).concat(msg); clearTimeout(H.bt); H.bt = setTimeout(() => (b.hidden = true), 2500); };
    // 획순 보기(본부 10-07) — 회색 글자를 획 차례대로 주황으로 칠해 드러냄(획 0.5초 · revealOrder) · 시작점 번호 원 · 끝에 작은 화살촉(글자 안) → 다 칠하면 1초 뒤 회색으로
    //  keep = 자동 손글씨(다 칠한 채로 남음 = 「써진」 상태) · 다시 누르거나 멈추면 그 자리에서 그침 → true = 끝까지 칠함
    const clipG = cv => { const n = cv.width, k = c.ch + "|" + n + "|" + toolKey() + "|" + hfontKey(); if (H.gk !== k) { H.gk = k; H.gm = document.createElement("canvas"); H.gm.width = H.gm.height = n; guideGlyph(H.gm.getContext("2d"), n, c.ch, guideW(), "#000"); } const cx = cv.getContext("2d"); cx.save(); cx.globalCompositeOperation = "destination-in"; cx.drawImage(H.gm, 0, 0); cx.restore(); return cv; }; /* 획순·자동 완성 칠 = 회색 모양 안으로(본부 10-12) */
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
        const t0 = performance.now() - (from && i === i0 ? from.f * 500 : 0); if (!(from && i === i0 && from.f > 0.05)) swish(brushPath(c.ch, list[i]).tot); /* 자동 완성·획순 보기 = 획마다 「스윽」(투덜이 10-14 「손·자동·순서 모두 쓰는 효과음」) */
        await new Promise(res => { const step = () => { if (H.anim !== my || st.hand !== H) return res(); const f = Math.min(1, (performance.now() - t0) / 500); H.ordAt = { i, f }; const R = revealOrder(c.ch, gv.width, list, i, f); paintGuide(); x.drawImage(clipG(R.cv), 0, 0); marks(R.ends, i, f);
          if (R.tip) { const n = gv.width; x.fillStyle = OR_MARK; x.beginPath(); x.arc(R.tip[0] * n, R.tip[1] * n, PEN * n * 0.28, 0, Math.PI * 2); x.fill(); } /* 칠 앞머리 = 작은 둥근 붓끝 점 */ if (f >= 1) return res(); setTimeout(step, 16); }; step(); }); // 60번/초(rAF 는 창이 가려지면 멈춤)
        if (H.anim !== my || st.hand !== H) return false;
      }
      H.ordAt = null; H.ordPlaying = false; markOrder();
      H.orderShown = list.length;
      if (!keep && c.file && st.hand === H && !st.auto) run([c.file]); // 다 그리면 그 글자 소리(「고」) 한 번(투덜이 10-08) · 자동 쓰기는 따로 소리
      if (keep) { paintGuide(); x.drawImage(clipG(revealOrder(c.ch, gv.width, list, list.length, 1).cv), 0, 0); return true; } // 자동 = 다 칠한 글자로 남김(번호·화살 없이)
      await new Promise(r => setTimeout(r, 1000)); if (H.anim === my && st.hand === H) paintGuide(); return true;
    };
    H.stopOrder = (pause = false) => { H.anim = (H.anim || 0) + 1; H.ordPlaying = false; if (!pause) { H.ordAt = null; } markOrder(); }; // pause = 그 자리에 칠한 채로 멈춤(다시 누르면 이어서)
    // ✎ 획순 단추 = 그리기 ⇄ 멈춤 ⇄ 이어서(투덜이 10-08 — 다시 누르면 처음부터 다시 그리던 것)
    H.toggleOrder = () => { if (H.ordPlaying) return H.stopOrder(true); const at = H.ordAt; H.showOrder(at ? { from: at } : {}); };
    iv.addEventListener("pointerup", up); iv.addEventListener("pointercancel", up); iv.addEventListener("lostpointercapture", up); H.up = up; // 칸 밖에서 놓아도 끝냄(창 전체 손 뗌도 아래 onWinUp)
    // 반자동(자석) — 순서 번호·시작점이 먼저 떠서 기다림 → 회색 획 근처를 대충 그으면 그 획 가운데 선으로 빨려 들어가 그려짐(굵기 = 고른 도구) · 순서가 틀리면 안 붙고 「순서 다시: N번」
    H.mag = 0; H.magList = null;
    const magMarks = () => { if (!magnetOn() || !H.magList || st.hand !== H) return; const x = gv.getContext("2d"), n = gv.width, lw = PEN * n;
      H.magList.forEach((S, i) => { if (i < H.mag) return; const q = brushPath(c.ch, S)[0]; if (!q) return; const nx = i === H.mag, pu = nx && H.magPulse ? Math.min(1, (performance.now() - H.magPulse) / 700) : 1, r = lw * 0.62 * (nx && H.magPulse ? 1 + 0.5 * Math.sin(Math.PI * pu) : 1); // 다음 번호 = 획을 붙인 직후 잠깐 커졌다 돌아옴
        x.globalAlpha = nx ? 1 : 0.45; x.fillStyle = OR_MARK; x.beginPath(); x.arc(q.x * n, q.y * n, r, 0, Math.PI * 2); x.fill(); x.fillStyle = "#fff"; x.font = `700 ${Math.round(r * 1.3)}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i + 1), q.x * n, q.y * n + 0.5); x.globalAlpha = 1; }); };
    H.magMarks = magMarks;
    if (magnetOn()) stkReady.then(() => { if (st.hand !== H) return; H.magList = strokesOf(c.ch); paintGuide(); magMarks(); });
    const magnetUp = (S, followed = false) => {
      if (!H.magList?.length) { H.strokes.pop(); paintInk(); return; }
      if (followed) { H.strokes.pop(); const Q = brushPath(c.ch, H.magList[H.mag]); H.strokes.push(Object.assign(Q.map(q => [q.x, q.y, 1]), { tool: S.tool, w: S.w, snap: true })); swish(Q.tot, S.tool, true); H.mag++; paintInk(); paintGuide(); return magDone(); } // 실시간으로 다 따라온 획
      const segD = (Q, x, y) => { let b = Infinity; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], c2 = Q[i], dx = c2.x - a.x, dy = c2.y - a.y, l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)); b = Math.min(b, Math.hypot(x - a.x - dx * r, y - a.y - dy * r)); } return Q.length === 1 ? Math.hypot(x - Q[0].x, y - Q[0].y) : b; };
      const lineD = (x, y) => { let b = Infinity; for (let i = 0; i < S.length; i++) { const a = S[Math.max(0, i - 1)], c2 = S[i], dx = c2[0] - a[0], dy = c2[1] - a[1], l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)); b = Math.min(b, Math.hypot(x - a[0] - dx * r, y - a[1] - dy * r)); } return b; };
      let best = -1, bs = Infinity; H.magList.forEach((T, j) => { const Q = brushPath(c.ch, T); if (!Q.length) return; const md = S.reduce((a, p) => a + segD(Q, p[0], p[1]), 0) / S.length, step = Math.max(1, Math.floor(Q.length / 30)); let k = 0, n = 0; for (let i = 0; i < Q.length; i += step) { n++; if (lineD(Q[i].x, Q[i].y) < 0.12) k++; }
        const sc = md + (n ? 0.1 * (1 - k / n) : 0.1); if (md < 0.1 && k / n >= 0.45 && sc < bs) { bs = sc; best = j; } }); // 선이 그 획 가까이(평균 칸 10% 안) + 그 획 길이 45% 넘게 지나감
      H.strokes.pop();
      if (best < 0) { paintInk(); paintGuide(); magMarks(); bubble(t("h_magnet_miss")); return; }
      if (best !== H.mag) { paintInk(); paintGuide(); magMarks(); bubble(t("h_order_again", { n: H.mag + 1 })); H.magWrong = (H.magWrong || 0) + 1; return; } // 순서 다시(그 획 번호)
      { const dv = strokeDir(c.ch, S, H.magList[best]); if (dv.rev) { paintInk(); paintGuide(); magMarks(); bubble(dv.msg); H.magWrong = (H.magWrong || 0) + 1; return; } } /* 거꾸로 그은 획 = 안 붙음 + 방향 알림(본부 10-12) */
      { const Qb = brushPath(c.ch, H.magList[best]), lc = cornerT(Qb); if (lc > 0) { const tail = Qb.filter(q => q.t > lc + 0.03); if (tail.length && tail.filter(q => lineD(q.x, q.y) < 0.12).length / tail.length < 0.5) { paintInk(); paintGuide(); magMarks(); bubble(t("h_magnet_miss")); return; } } } /* 꺾이는 획(ㅈ 첫 획 = 가로 + 왼쪽 아래 삐침 · ㄱ ㄴ ㄹ …) = 마지막 꺾임 뒤까지 그어야 붙음(투덜이 10-14 「자」 가로만 그었는데 삐침까지 칠해짐) */
      const Q = brushPath(c.ch, H.magList[best]); H.strokes.push(Object.assign(Q.map(q => [q.x, q.y, 1]), { tool: S.tool, w: S.w, snap: true })); swish(Q.tot, S.tool, true); H.mag++; paintInk(); paintGuide(); magDone();
    };
    const magDone = () => { // 획 하나 붙은 뒤 — 다음 번호 강조(잠깐 크게) · 다 붙으면 「✓ 순서 맞음」
      if (H.mag < (H.magList?.length || 0)) setTimeout(() => st.hand === H && jamoSay(H), 300); // 자모 하나가 다 붙으면 그 자모 소리(스윽 뒤)
      if (H.mag < H.magList.length) { H.magPulse = performance.now(); const my = H.magPulse; const tick = () => { if (H.magPulse !== my || st.hand !== H) return; paintGuide(); if (performance.now() - my < 700) setTimeout(tick, 33); else { H.magPulse = 0; paintGuide(); } }; tick(); }
      if (H.mag >= H.magList.length) { H.passed = true; paintInk(); markHand(); const sc = work.querySelector(".hscore"); if (sc) { sc.textContent = t("h_order_ok"); sc.className = "hscore ok"; fitScore(sc); sc.hidden = false; } note.textContent = ""; // 「✓ 순서 맞음」 · 점수·최고 기록·효과음 없음
        st.busy = true; run([400, c.file || jamoSrc(c.jamo[c.jamo.length - 1])]).then(() => { st.busy = false; }); }
    };
    H.paintInk = paintInk; H.paintGuide = paintGuide; H.col = col; H.fit = fit; H.bubble = bubble; // fit = 점검용(칸 크기 다시)
  }
  // 점수(본부 10-07 투덜이) — 칸 위 「87% ☆」 + 말하기와 같은 효과음 · 통과해도 그 자리에서 다시 쓰면 더 높은 점수 노림(그 글자 최고 점수 기억 · 위 글자 줄 아래 작은 숫자) · 「다음 ▶」으로 넘어감
  const bestKey = (w, c) => `${ep}/${line.id}/${st.s}.${w}.${c}`;
  const bestGet = (w, c) => { try { return JSON.parse(localStorage.getItem("malmun.hbest") || "{}")[bestKey(w, c)] ?? null; } catch { return null; } };
  const bestPut = (w, c, v) => { try { const o = JSON.parse(localStorage.getItem("malmun.hbest") || "{}"), k = bestKey(w, c); if (!(o[k] >= v)) { o[k] = v; localStorage.setItem("malmun.hbest", JSON.stringify(o)); } } catch {} };
  // 자모 하나의 획을 다 맞게 그음 = 그 자모 소리(투덜이 10-13 「손으로 쓸 때도 소리」 · 자동 완성과 같은 소리) — 자모마다 한 번 · 자석으로 붙여도 같음
  // 자료 획마다 「다 맞게 그었나」(그 획 회색 가운데 길의 75%↑ 를 학습자 획이 덮음) — 자모 소리·자동 채점이 함께 씀
  function strokesDone(H, lenient = true) {
    if (!H || !SK.STK || !H.strokes.length) return null; const ch = H.ch, list = strokesOf(ch); if (!list.length) return null;
    const tw = Math.max(...H.strokes.map(S => S.w ?? TOOLS[toolKey()].w)), gw = tw * GUIDE_K, stk = Object.keys(TOOLS).find(k => Math.abs(TOOLS[k].w - tw) < 1e-6) || toolKey();
    const segs = []; for (const S of H.strokes) { if (S.length === 1) segs.push([S[0], S[0]]); for (let i = 1; i < S.length; i++) segs.push([S[i - 1], S[i]]); }
    const near = (x, y) => segs.some(([a, c]) => { const dx = c[0] - a[0], dy = c[1] - a[1], l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)); return Math.hypot(x - a[0] - dx * r, y - a[1] - dy * r) <= tol; }), tol = lenient ? Math.max(gw / 2 + 0.008, 0.08) : gw / 2 + 0.008; /* 자모 소리·자동 채점 = 칸 8% 까지(점수는 따로 엄하게) 너그럽게(투덜이 10-14 「이응 소리가 날 때도 안 날 때도」 — 연필은 회색이 좁아 손으로 그린 ㅇ 고리가 75% 를 자주 못 넘음) */
    return { list, done: list.map((S, si) => { const Q = fitPath(ch, list, si, stk), step = Math.max(1, Math.floor(Q.length / 30)); let n = 0, k = 0; for (let i = 0; i < Q.length; i += step) { k++; if (near(Q[i].x, Q[i].y)) n++; } return k > 0 && n / k >= COMP_MIN; }) };
  }
  // 자모 하나의 획을 다 맞게 그음 = 그 자모 소리(투덜이 10-13 「손으로 쓸 때도 소리」 · 자동 완성과 같은 소리) — 자모마다 한 번 · 자석으로 붙여도 같음
  function jamoSay(H) {
    if (!H || st.auto || H.passed) return; const r = strokesDone(H); if (!r) return; const us = unitsOf(H.ch); if (!us.length) return;
    H.said ||= new Set(); let say = null;
    us.forEach((u, ui) => { if (H.said.has(ui)) return; const mine = r.list.map((S, si) => [S, si]).filter(([S]) => S.unit === ui); if (mine.length && mine.every(([, si]) => r.done[si])) { H.said.add(ui); say = u.jamo; } });
    if (!say) return; const src = jamoSrc(say); if (src && !H.passSnd) run([src]); /* 다른 소리 중이어도 냄(그 소리를 끊고) */
  }
  // 손 뗀 뒤 자동 채점 = 모든 획을 다 그었을 때만(투덜이 10-14 「쓰는 도중에 갑자기 꽝」 — 획 사이에 1.2초 넘게 생각하면 덜 쓴 글자를 채점하던 것) · 덜 썼으면 ✓ 채점 단추로만
  const readyToJudge = H => { const r = strokesDone(H); return !!r && r.done.every(Boolean); };
  // 점수 칸 글 = 한 줄 · 칸 폭에 맞춰 글자 줄임(아이폰 390 「✓ 순서 맞음」이 두 줄이 되어 위가 잘리던 것 · 투덜이 10-14) → 단추 줄 다시 맞춤
  function fitScore(sc) { if (!sc) return; sc.style.removeProperty("font-size"); for (let f = parseFloat(getComputedStyle(sc).fontSize) - 1; f >= 9 && sc.scrollWidth > sc.clientWidth + 1; f--) sc.style.fontSize = f + "px"; } // 칸 다시 맞추지 않음(채점 때 화면 안 흔들림 · 자리는 css 로 미리 잡음)
  function startTimer(H) {
    if (!H || H.tStart || st.auto || H.passed || magnetOn() || !SK.STK) return; const n = strokesOf(H.ch).length || 3; H.tLimit = (4 + 2.5 * n) * 1000; H.tStart = performance.now();
    const bar = work.querySelector(".htime"); bar?.classList.add("on"); clearInterval(H.tInt);
    const tick = () => { if (!st.alive || st.hand !== H || !H.tStart) return clearInterval(H.tInt); const left = Math.max(0, H.tLimit - (performance.now() - H.tStart)); if (bar) { bar.querySelector("i").style.width = (100 * left / H.tLimit).toFixed(1) + "%"; bar.querySelector("b").textContent = Math.ceil(left / 1000); bar.classList.toggle("low", left < 3000); }
      if (left <= 0) { stopTimer(H); if (H.cur) H.tDue = true; else if (H.strokes.length && !H.passed) handJudge(); } };
    tick(); H.tInt = setInterval(tick, 100);
  }
  function stopTimer(H) { if (!H) return; clearInterval(H.tInt); H.tStart = null; H.tDue = false; work.querySelector(".htime")?.classList.remove("on", "low"); }
  async function handJudge() {
    const H = st.hand; if (!st.alive || !H || !H.strokes.length || st.busy || st.s >= segs.length || st.lineEnd || H.passed || magnetOn()) return; // 자석 = 점수 없음(순서만) · 닫힌 창 = 채점 없음(검사부 10-14 덜 쓴 채 닫고 다시 열면 꽝)
    stopTimer(H);
    clearTimeout(H.timer);
    const c = words()[st.w].chars[st.c], r = handScore(c.ch, H.strokes, H.s); H.last = r;
    const star = r.pct >= 95 ? "★" : r.pct >= 80 ? "☆" : "", sc = work.querySelector(".hscore");
    if (sc) { sc.textContent = `${r.pct}%${star ? " " + star : ""}`; sc.className = "hscore " + (r.pct >= 80 ? "ok" : "bad"); sc.hidden = false; fitScore(sc); }
    scoreFx(work.querySelector(".hbox .fx"), r.pct);
    if (r.pct >= 80) { // 통과 — 초록 + 그 글자 소리 · 최고 점수 기억 · 「다음 ▶」/다시 쓰기
      bestPut(st.w, st.c, r.pct); paintSent();
      note.textContent = ""; H.passed = true; H.paintInk(); markHand();
      st.busy = true; H.passSnd = true; const okSnd = await run(["ok", 150, c.file || jamoSrc(c.jamo[c.jamo.length - 1])]); if (H.passSnd) { st.busy = false; H.passSnd = false; if (okSnd && st.hand === H && H.passed && !H.cur && st.alive) H.adv = setTimeout(() => { if (st.hand === H && H.passed && !H.cur) handNext(true); }, 500); } /* 통과 = 딩동 → 글자 소리 → 다음 글자(투덜이 10-14 · 읽는 중에 다시 쓰기 시작하면 머묾) */ // 통과 = 딩동 → 그 글자 소리(투덜이 10-13 · 자동 완성과 같은 차례)
      return;
    }
    note.textContent = r.dir || t("h_again"); if (r.dir) H.bubble?.(r.dir); /* 거꾸로 그은 획 = 방향 알림(본부 10-12) */
    H.paintGuide(r);
    setTimeout(() => { if (st.hand === H) H.paintGuide(); }, 900);
    // 꽝(80% 아래)이면 덜 덮은 곳 주황 깜빡 뒤 1.2초에 내 획을 저절로 지움 — 바로 다시 쓰게(투덜이 10-07) · 점수는 남김(새로 쓰기 시작하면 지움)
    const n0 = H.strokes.length, g0 = H.drawGen; clearTimeout(H.clr); H.clr = setTimeout(() => { if (st.hand !== H || H.passed || H.cur || H.strokes.length !== n0 || H.drawGen !== g0) return; H.strokes = []; H.roles = null; H.orderTold = false; H.paintInk(); }, 1200);
  }
  function handNext(wrote = false) { // 「다음 ▶」 = 강제로 넘기기(투덜이 10-14) — 아무것도 읽지 않고 바로 다음 글자 · 늘 누를 수 있음 · wrote = 통과해서 넘어감(위 글자 줄 초록)
    const H = st.hand; if (!H || st.s >= segs.length) return; if (st.auto) stopAuto(); hush(); stopLoop(); H.stopOrder?.(); clearTimeout(H.timer); clearTimeout(H.clr); clearTimeout(H.adv); stopTimer(H); st.busy = false; st.done = false; H.passSnd = false;
    const c = words()[st.w].chars[st.c];
    st.typed = c.jamo.slice(); st.k = c.jamo.length; st.part = "";
    return finishChar(c.jamo[c.jamo.length - 1], c, 0, { silent: true, wrote });
  }
  function markOrder() { const b = work.querySelector("[data-act=horder]"); if (b) b.setAttribute("aria-pressed", String(!!st.hand?.ordPlaying)); } // ✎ 획순 = 그리는 동안 눌린 모양
  function markHand() { // ✓ 채점 · ▶ 다음 = 늘 두 단추(투덜이 10-14 「다음은 막지 말고 늘」) — 글만 그 언어로
    const d0 = work.querySelector("[data-act=hdone]"), n0 = work.querySelector("[data-act=hnext]");
    if (d0) { d0.innerHTML = `✓<span class="ml"> ${esc(t("h_done"))}</span>`; d0.setAttribute("aria-label", t("h_done")); }
    if (n0) { n0.innerHTML = `▶<span class="ml"> ${esc(String(t("next_btn")).replace(/\s*▶\s*$/, ""))}</span>`; n0.setAttribute("aria-label", t("next_btn")); } // 「다음 ▶」 은 늘 글까지(통과 뒤 누를 단추)
  }

  function paintBox(c, ok) {
    const box = work.querySelector(".box"), cv = box?.querySelector(".tcv"); if (!cv) return;
    // 그 글자 글꼴 조각이 아직 안 왔으면(구글 글꼴은 글자 묶음마다 따로 옴) 온 뒤 다시 그림(투덜이 10-08 — 「왕」 친 ㅇ 이 덜 칠해짐)
    const fk = `${glyphWeight()} 100px ${glyphFont()}`;
    if (document.fonts && !document.fonts.check(fk, c.ch)) document.fonts.load(fk, c.ch).catch(() => {}).then(() => { if (!document.fonts.check(fk, c.ch) || cv !== work.querySelector(".tcv")) return; for (const m of [gCache, uCache, ownCache, revPrev, pathCache, unitMaskCache]) for (const k of [...m.keys()]) if (k.startsWith(c.ch)) m.delete(k); paintBox(c, work.querySelector(".box.ok") != null); });
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

  async function finishChar(j, c, src = jamoSrc(j), { silent = false, wrote = null } = {}) { // W3 · 손글씨는 글자 소리(src) · silent = 읽지 않고 넘김(손글씨 ▶ 다음 · 통과 뒤 넘김)
    if (!st.alive) return; // 닫힌 창 = 소리 없음
    st.busy = true; st.done = true; st.silentNext = silent && !wrote;
    work.querySelector(".box")?.classList.add("ok"); paintBox(c, true);
    // 글자 완성 = 딩동 → 마지막 자모 → 그 글자 소리 → 다음 글자(투덜이 10-08 — 자판·자동 완성도 · 손글씨는 이미 글자 소리 · 한 번 되돌렸다가 「나쁘지 않아, 지금처럼」으로 유지)
    const ok = silent ? st.alive : await run(c.file && src !== c.file ? ["ok", src, 120, c.file, GAP_NEXT] : ["ok", src, GAP_NEXT]);
    st.done = false;
    if (!ok || !st.alive) { st.busy = false; st.queue = []; return; }
    if (wrote ?? !st.auto) st.wrote.add(wkey(st.s, st.w, st.c)); // 직접 써서 마친 글자(자동으로 쓴 것은 빼고)(위 글자 줄 초록 — 순서가 아니라 실제로 쓴 것만 · 본부 10-07)
    st.busy = false; st.c++; st.k = 0; st.typed = []; st.part = "";
    const w = words()[st.w];
    if (st.c >= w.chars.length) { st.w++; st.c = 0; }
    if (st.w >= words().length) { // 토막 끝 → 다음 토막(자동)
      if (st.auto && st.autoMode === "line") { st.w = words().length - 1; st.c = words()[st.w].chars.length - 1; st.k = c.jamo.length; st.typed = c.jamo.slice(); st.part = ""; st.segEnd = true; st.lineEnd = st.s + 1 >= segs.length; st.done = true; st.queue = []; return segDone(); } // [자동 완성] = 지금 토막 끝에서 멈춤(투덜이 「그 단락」 = 토막 · 본부 10-12)
      // 줄 끝 = 마지막 토막·마지막 글자에 머묾(완성 표시) — 「문장 완성!」 카드 없음 · 토막 번호 넘침(7/6) 없음(투덜이 10-08·10-10 「분명히 없애기로 했어」)
      if (st.s + 1 >= segs.length) { st.w = words().length - 1; st.c = words()[st.w].chars.length - 1; st.k = c.jamo.length; st.typed = c.jamo.slice(); st.part = ""; st.lineEnd = true; st.done = true; st.queue = []; return lineDone(); }
      st.s++; st.w = 0;
    }
    render();
    const q = st.queue.splice(0); q.forEach(k => press(k)); // 축하 중에 누른 키 — 차례대로(또 글자가 끝나면 다시 기억됨)
  }
  async function segDone() { // [자동 완성] 토막 끝 — 그 토막 소리 한 번 · 그 자리에 머묾(다음 토막·다음 줄로 안 감) · 자판을 누르면 다음 토막부터
    st.auto = false; markAuto(); render(); st.sent = true; markSent(); await run([partStep()]); st.sent = false; markSent(); st.done = false;
  }
  async function lineDone() { // 줄 끝 → 대사 듣고 → 다음 줄(자동) · 자동 완성으로 끝냈으면 대사 소리 없이(W4 · 투덜이 10-08 「멈추는 카드 없애자 · 끊김 싫다」로 원래대로) · 마지막 줄은 그 자리에 머묾
    const wasAuto = st.auto, mode = st.autoMode; st.auto = false;
    if (wasAuto && mode === "line") { markAuto(); render(); st.sent = true; markSent(); await run([lineSrc]); st.sent = false; markSent(); return; } // [자동 완성] = 대사 한 번 듣고 이 줄에 머묾 · W6 자동 넘김 없음(본부 10-12)
    const all = wasAuto && mode === "all" && li < d.lines.length - 1; st.allNext = all; markAuto(); render(); // [전체] = 대사 듣고 다음 줄로 이어서(마지막 줄이면 멈춤)
    if (st.silentNext && !wasAuto) { st.silentNext = false; if (st.alive && li < d.lines.length - 1) { if (opts.embedded) opts.onNext?.(li + 1); else location.hash = `#/write/${ep}/${d.lines[li + 1].id}`; } return; } // 손글씨 ▶ 다음으로 줄 끝 = 대사 안 읽고 바로 다음 줄(투덜이 10-14)
    st.sent = true; markSent();
    const ok = await run([lineSrc, 900]);
    st.sent = false; markSent();
    const go = all ? st.allNext : !wasAuto; st.allNext = false; markAuto();
    if (ok && go && st.alive && li < d.lines.length - 1) {
      if (all) autoAllNext = { ep, id: d.lines[li + 1].id, t: Date.now() };
      if (opts.embedded) opts.onNext?.(li + 1);
      else location.hash = `#/write/${ep}/${d.lines[li + 1].id}`;
    }
  }
  // 자동 완성(W4) — 지금 토막의 남은 글자를 한 자모씩(손으로 칠 때와 같은 소리·쉼) · 토막이 끝나면 멈춤
  const markAuto = () => { const on = !!(st.auto || st.resumeAuto); for (const [act, mode, lab] of [["auto", "line", "autofill"], ["autoall", "all", "autofill_all"]]) { const b = wb.querySelector(`[data-act=${act}]`), me = (on && st.autoMode === mode) || (mode === "all" && st.allNext); b.setAttribute("aria-pressed", String(me)); b.textContent = me ? "⏹ " + t("btn_stop") : t(lab); } if (wb.isConnected) placeBtns(); }; // 글 길이가 바뀌면 단추 줄 다시 맞춤
  const flashKey = j => { const k = work.querySelector(`[data-j="${j}"]`); if (!k) return; k.classList.remove("right"); void k.offsetWidth; k.classList.add("right"); setTimeout(() => k.classList.remove("right"), 400); };
  // 자동 멈춤(본부 10-07 투덜이 「⏹ 다시 눌러도 안 멈춤」) — 누르면 바로: 진행 중 소리·획 칠도 그침 · 하던 글자는 안 끝낸 채(다음 글자로 안 넘어감)
  // 자동을 멈춘 순간 글자가 다 쳐져 있으면(마지막 자모 소리 중) = 그 글자는 끝난 것 → 다음 글자로(투덜이 10-08 폰 「있었거든요」의 「거」:
  //  다 친 글자에 머물러 다음 자모가 없어 자판을 눌러도 오류로 소리가 안 나던 것)
  const stopAuto = () => { st.autoGen = (st.autoGen || 0) + 1; st.auto = false; st.resumeAuto = false; st.allNext = false; st.jumpTo = null; st.hand?.stopOrder?.(!!st.hand?.ordKeep); /* 손글씨 자동 = 칠하던 자리 그대로 멈춤(다시 누르면 이어서 · 투덜이 10-14) */ hush(); st.busy = false; st.done = false; st.queue = []; markAuto(); }; // 누르는 즉시 그 글자에서 멈춤(투덜이 10-10 「넘어가 버림」 — 다 친 글자에 머물면 자판 누를 때 다음 글자부터)
  function nextChar() { // 다음 글자(토막 끝이면 다음 토막 · 줄 끝이면 끝 카드) — 자동으로 친 것은 「직접 씀」 아님
    st.segEnd = false;
    st.c++; st.k = 0; st.typed = []; st.part = "";
    if (st.c >= words()[st.w].chars.length) { st.w++; st.c = 0; }
    if (st.w >= words().length) { st.s++; st.w = 0; }
    render();
  }
  async function autoPart(mode = "line") {
    resetSounds(); if (st.segEnd && mode === "line") { Object.assign(st, { w: 0, c: 0, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false, segEnd: false }); render(); } /* 토막 끝에서 다시 [자동 완성] = 같은 토막 처음부터 */ else if (st.lineEnd) { Object.assign(st, { s: 0, w: 0, c: 0, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false, segEnd: false }); render(); }
    st.segEnd = false; // 줄 끝에서 자동 = 그 줄 처음부터(본부 10-11)
    const gen = (st.autoGen = (st.autoGen || 0) + 1); // 번호표(투덜이 10-12 「띵띵」) — 멈추거나 다른 자동 단추로 바뀌면 옛 고리는 깨어나도 바로 끝남(두 고리가 같이 치던 것)
    st.auto = true; st.autoMode = mode; st.resumeAuto = false; st.allNext = false; markAuto();
    while (st.auto && st.autoGen === gen && st.alive && st.s < segs.length && !st.lineEnd && !st.segEnd) { // 줄 끝까지(본부 10-11 — 토막 끝에서 안 멈춤) · 줄 끝은 lineDone(한 줄 = 멈춤 · 전체 = 다음 줄)
      if (st.jumpTo) { Object.assign(st, { w: st.jumpTo.w, c: st.jumpTo.c, k: 0, typed: [], part: "", done: false, queue: [], busy: false }); st.jumpTo = null; render(); } // 위 글자 줄에서 고른 글자부터 이어서
      const c = words()[st.w].chars[st.c];
      if (st.mode !== "hand" && st.k >= c.jamo.length) { await finishChar(c.jamo[c.jamo.length - 1], c); continue; } // 다 친 글자에서 시작(손으로 친 뒤 · 멈춘 자리) = 마무리하고 다음 글자부터
      if (st.mode === "hand") { // 손글씨 자동(본부 10-07) — 그 글자를 획순 칠로 한 획씩 써 주고(획 0.5초) → 글자 소리 → 다음 글자 · 자동으로 쓴 글자는 「직접 씀」 초록 아님
        const H = st.hand; if (!H?.showOrder) break;
        const at = H.ordKeep && H.ordAt ? H.ordAt : null; /* 멈춘 자리부터(「있」 ㅇ·ㅣ 뒤 → ㅆ 부터 · 투덜이 10-14) */ st.busy = true; const done = await H.showOrder({ keep: true, from: at }); st.busy = false;
        if (!st.alive || st.autoGen !== gen) break; /* 창을 닫는 사이 끝난 획순 = 글자 소리 없이 끝(앱개발부 10-12 막 누르기 소리 겹침) */ if (!done || !st.auto || st.jumpTo) continue;
        const last = c.jamo[c.jamo.length - 1]; st.typed = c.jamo.slice(); st.k = c.jamo.length; st.part = "";
        await finishChar(last, c, c.file || jamoSrc(last)); continue;
      }
      const j = c.jamo[st.k];
      st.typed.push(j); st.k++; render(); flashKey(j);
      if (st.k >= c.jamo.length) await finishChar(j, c);
      else { st.busy = true; await run(["ok", jamoSrc(j), 150]); if (st.autoGen === gen) st.busy = false; }
    }
    if (st.autoGen !== gen) return; // 새 고리가 이어받음 — 그 고리 표시를 건드리지 않음
    st.auto = false; if (st.alive) markAuto();
  }
  async function press(j) { // W2
    if (st.resumeAuto) { st.resumeAuto = false; markAuto(); } const key0 = j; // 실제로 누른 자판(겹모음을 나눠 쳐 완성하면 j 는 겹모음으로 바뀜)
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
      if (st.auto) { st.jumpTo = { w, c: ci }; cb.blur(); hush(); st.hand?.stopOrder?.(); Object.assign(st, { w, c: ci, k: 0, typed: [], part: "", done: false, queue: [], lineEnd: false, segEnd: false }); render(); return; } // 자동 완성 중 위 글자 누름 = 그 글자로 옮겨 거기부터 자동 이어서(본부 10-06 투덜이) · 앞 글자는 초록 · 지금 테두리 · 뒤는 기본
      // 누른 글자로 바로 가서 쓰기(본부 10-07 투덜이 — 자판·손글씨 둘 다 · 건너뛴 글자는 「안 씀」 그대로 · 나중에 눌러 돌아와 씀) + 그 글자 소리 한 번
      cb.blur(); hush(); stopLoop(); st.sent = false; markSent();
      Object.assign(st, { w, c: ci, k: 0, typed: [], part: "", done: false, queue: [], busy: false, lineEnd: false, segEnd: false }); render();
      if (st.mode === "hand") st.hand?.showOrder?.(); // 손글씨 = 글자를 누르면 획순이 바로 그려지고 다 그리면 글자 소리(투덜이 10-08)
      else if (c.file) run([c.file]); else note.textContent = t("no_char_audio", { c: c.ch });
      return;
    }
    const hm = e.target.closest("[data-hmode]");
    if (hm) { try { localStorage.setItem("malmun.hmode", magnetOn() ? "free" : "magnet"); } catch {} hush(); st.hand?.stopOrder?.(); render(); return; } // 반자동 ⇄ 완전 수동(같은 글자 처음부터)
    const tb = e.target.closest("[data-tool]");
    if (tb) { const same = tb.dataset.tool === toolKey(); try { localStorage.setItem("malmun.htool", tb.dataset.tool); } catch {} app.querySelectorAll("[data-tool]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tool === tb.dataset.tool)));
      const H = st.hand; if (!H || same) return;
      // 다른 도구 = 그 글자 칸에 쓴 획을 지우고 처음부터(투덜이 10-12 「다른 도구를 고르면 기존 것을 자동으로 지우는 게 좋아」 · 본부) — 점수·자석 차례·통과 표시도 처음으로 · 회색은 새 도구 굵기 · 같은 도구 = 그대로
      clearTimeout(H.timer); clearTimeout(H.clr); H.follow = null; H.drawGen = (H.drawGen || 0) + 1; if (H.passSnd) { hush(); st.busy = false; H.passSnd = false; }
      if (!st.auto && (H.ordPlaying || H.ordAt)) H.stopOrder?.();
      H.strokes = []; H.roles = null; H.orderTold = false; H.mag = 0; H.magWrong = 0; H.said = null; if (H.passed) { H.passed = false; markHand(); }
      const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; note.textContent = ""; H.paintGuide?.(); H.paintInk?.(); return; }
    const mb = e.target.closest("[data-mode]");
    if (mb) { if (st.mode !== mb.dataset.mode) { if (st.auto || st.resumeAuto) stopAuto(); st.hand?.stopOrder?.(); hush(); stopLoop(); st.busy = false; st.done = false; st.queue = []; st.mode = mb.dataset.mode; /* 모드 바꾸기 = 돌던 것(자동·획순·소리) 먼저 멈춤 — 본부 10-08 투덜이: 자판 자동 켠 채 손글씨로 바꾸면 저 혼자 계속 씀 */ try { localStorage.setItem("malmun.wmode", st.mode); } catch {} app.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === st.mode))); st.typed = []; st.k = 0; st.part = ""; st.segEnd = false; render(); } return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "close") { hush(); stopLoop(); return opts.onClose?.(); } // ✕ 닫기(본부 10-07 — 말하기·설명 창과 같게 · 폰 뒤로도 같은 동작)
    if (a === "hdone") return handJudge();
    if (a === "hnext") return handNext();
    if (a === "horder") return st.hand?.toggleOrder?.();
    if (a === "hundo" || a === "hclear") { const H = st.hand; if (!H) return; H.follow = null; clearTimeout(H.timer); clearTimeout(H.clr); H.drawGen = (H.drawGen || 0) + 1; if (H.passSnd) { hush(); st.busy = false; H.passSnd = false; } if (a === "hundo") H.strokes.pop(); else { H.strokes = []; H.roles = null; H.orderTold = false; } H.said = null; H.mag = Math.min(H.mag || 0, H.strokes.length); if (magnetOn()) { H.paintGuide?.(); } /* 자석 = 남은 획부터 다시(본부 10-10 「딱 한 번만 됨」 — 지워도 차례가 앞으로 가 있던 것) */ if (H.passed) { H.passed = false; markHand(); } const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; H.paintInk(); note.textContent = ""; return; }
    if (a === "line") { hideLineTip(); toggleSentence(); }
    else if (a === "hearch") hearChar();
    else if (a === "word" && st.s < segs.length && !st.busy) { // W4 — 원음에서 이 낱말만
      stopLoop(); st.sent = false; markSent();
      run([wordStep(words()[st.w])]);
    } else if (a === "auto" || a === "autoall") { // 자동 2종(본부 10-11) — 같은 단추 = 멈춤 · 다른 단추 = 먼저 것 멈추고 새 것
      const mode = a === "auto" ? "line" : "all", mine = st.autoMode === mode;
      if (st.allNext) { st.allNext = false; st.sent = false; hush(); markSent(); markAuto(); return; } // 줄 끝 대사 중(다음 줄로 넘어가기 전) = 넘어가지 않고 멈춤(어느 단추든) // 줄 끝 대사 중(다음 줄로 넘어가기 전) = 넘어가지 않음
      else if (st.auto) { stopAuto(); if (mine) return; }
      else if (st.resumeAuto) { st.resumeAuto = false; st.sent = false; hush(); markSent(); markAuto(); if (mine) return; } // 듣기 중(자동이 잠깐 멈춤) 같은 단추 = 자동 끔 · 듣기도 멈춤
      if (st.s < segs.length) { if (st.busy || st.done) { hush(); st.busy = false; st.done = false; st.queue = []; } autoPart(mode); } // 소리 중이어도 바로(투덜이 10-10 「친 뒤 누르면 바로 중지」)
    } else if (a === "retry") { goSeg(0); }
  };

  setNote(); render();
  if (autoAllNext && autoAllNext.ep === ep && String(autoAllNext.id) === String(id) && Date.now() - autoAllNext.t < 8000) { autoAllNext = null; setTimeout(() => { if (st.alive && !st.auto) autoPart("all"); }, 300); } else autoAllNext = null; // 전체 자동 완성 이어서(본부 10-11)
  try { const nTip = +(localStorage.getItem("malmun.wlinetip") || 0); if (nTip < 2) { localStorage.setItem("malmun.wlinetip", String(nTip + 1)); const tip = $(".wtip"); tip.textContent = t("w_line_tip"); tip.hidden = false; sentEl.classList.add("flash"); requestAnimationFrame(() => { const sp = sentEl.querySelector(".spkb"), row = tip.parentElement; if (!sp || !row) return; const r = sp.getBoundingClientRect(), rr = row.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(rr.width - tip.offsetWidth - 4, r.left + r.width / 2 - rr.left - 24)) + "px"; tip.style.right = "auto"; }); /* 말풍선 꼬리 = 🔊 단추 위치(ur 오른쪽→왼쪽에서 ◀▶ 를 가리키던 것 · 10-14) */ st.tipT = setTimeout(hideLineTip, 4000); } } catch {} // 🔊 = 이 줄 듣기 말풍선 처음 2번(투덜이 10-13)
  const release = hold();
  // 이 줄에서 쓸 소리를 미리 받아 풀어 둔다(대사 · 낱말·토막 · 글자 · 자판 자모) — 누르는 순간 바로 나오게
  sfx.preload([lineSrc, ...allWords.map(w => unitSrc(w.unit)), ...segs.map(g => unitSrc(g.unit)),
    ...allWords.flatMap(w => w.chars.map(c => c.file)), ...[...KEYS, ...VOW, ...VOW2].map(jamoSrc)]);
  // 앱 글 언어가 바뀜(앱개발부 10-13 안 A · 「malmun:uilang」) — 화면을 다시 그리지 않고 쓰기 창 안 앱 글만 그 자리에서 바꿈 · 자동·손글씨 칠·소리·쓰던 자리·획 그대로
  function retext() {
    if (!st.alive) return; const L = k => t(k), span = (el, k) => { if (!el) return; el.setAttribute("aria-label", L(k)); const m = el.querySelector(".ml"); if (m) m.textContent = " " + L(k); };
    const h = app.querySelector(".whead"), bar = app.querySelector(".bar");
    if (h) { const b = h.querySelector(":scope > b"); if (b) b.textContent = L("write"); const sb = h.querySelector(".sub"); if (sb) sb.innerHTML = `<span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span>`; }
    if (bar) { const tt = bar.querySelector(".t"), sb = bar.querySelector(".sub"), bk = bar.querySelector(".iconbtn"); if (tt) tt.textContent = L("write"); if (sb) sb.innerHTML = `<span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span>`; bk?.setAttribute("aria-label", L("back")); }
    app.querySelectorAll("[data-mode]").forEach(x => span(x, x.dataset.mode === "kb" ? "w_kb" : "w_hand"));
    app.querySelectorAll("[data-act=help]").forEach(x => { x.textContent = L("help_btn"); x.setAttribute("aria-label", L("help")); });
    app.querySelectorAll("[data-act=close]").forEach(x => { x.setAttribute("aria-label", L("close_btn")); x.innerHTML = `✕<span class="lt">${esc(String(L("close_btn")).replace(/^✕\s*/, " "))}</span>`; });
    const hb = $(".helpbox"); if (hb) hb.innerHTML = helpHtml();
    const hc = wb.querySelector("[data-act=hearch]"); if (hc) hc.textContent = L("w_hear_char"); markAuto();
    paintSent(); /* 위 글자 줄 · ◀ ▶ 이름 · 🔊 이름 */ const tip = $(".wtip"); if (tip && !tip.hidden) tip.textContent = L("w_line_tip");
    work.querySelectorAll("[data-tool]").forEach(x => span(x, "h_" + x.dataset.tool)); span(work.querySelector("[data-hmode]"), "h_magnet");
    for (const [a, k] of [["horder", "h_order"], ["hundo", "h_undo"], ["hclear", "h_clear"]]) span(work.querySelector(`[data-act=${a}]`), k);
    work.querySelector(".stage .box")?.setAttribute("aria-label", L("listen_char") || "▶"); work.querySelector(".hink")?.setAttribute("aria-label", L("w_hand"));
    markHand(); markOrder(); setNote();
    const sc = work.querySelector(".hscore"); if (sc && !sc.hidden && st.hand?.passed && magnetOn()) { sc.textContent = L("h_order_ok"); fitScore(sc); }
    fitHeadW(); placeBtns(); fitWord();
  }
  const onUiLang = () => retext(); window.addEventListener("malmun:uilang", onUiLang);
  const onVis = () => { if (document.visibilityState === "visible") { try { const c = audioCtx(); if (c.state !== "running") c.resume().catch(() => {}); } catch {} } }; document.addEventListener("visibilitychange", onVis); // 앱으로 돌아오면 소리 장치 깨움(폰에서 다른 앱 갔다 오면 잠들어 쓰는 소리가 안 나던 것 · 본부 10-14)
  const onWinUp = () => { if (st.hand?.cur) st.hand.up?.(); }; window.addEventListener("pointerup", onWinUp, true); window.addEventListener("pointercancel", onWinUp, true); // 손글씨 획 = 창 어디에서 놓아도 끝남(투덜이 10-14)
  return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("malmun:uilang", onUiLang); window.removeEventListener("pointerup", onWinUp, true); window.removeEventListener("pointercancel", onWinUp, true); release(); st.alive = false; { const H0 = st.hand; if (H0) { clearInterval(H0.tInt); H0.tStart = null; H0.tDue = false; clearTimeout(H0.timer); clearTimeout(H0.clr); clearTimeout(H0.adv); } } drawEnd(); /* 닫을 때 시간 막대·채점 예약·넘김 예약·쓰는 소리 모두 멈춤(검사부 10-14 「있」 ㅇ 만 쓰고 닫았다 다시 열면 15초 안에 꽝) */ st.autoGen = (st.autoGen || 0) + 1; st.auto = false; st.resumeAuto = false; st.allNext = false; st.hand?.stopOrder?.(); hush(); st.hand?.ro?.disconnect(); clearTimeout(st.hand?.timer); delete app.__wr; };
}
