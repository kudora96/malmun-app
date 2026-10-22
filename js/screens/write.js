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
import { t, tL, lang, uiKoOn, KO_UI, preloadKoUi } from "../i18n.js?v=1022.16";
import { esc, glossCards, toJamoW, jamoParts, compose, vowelLen, JAMO_AUDIO, koq } from "../text.js?v=1022.16";
import { episode, chars, charsF } from "../data.js?v=1022.16";
import { paths } from "../paths.js?v=1022.16";
import { I, spkHtml, uiKoBtn, uikoChip } from "../ui.js?v=1022.16";
import { audioCtx, hold } from "../wake.js?v=1022.16";
import * as sfx from "../sfx.js?v=1022.16";
import { scoreFx, stopFx } from "../scorefx.js?v=1022.16";
import { units as jamoUnits, baseOf, shapeFix } from "../jamobox.js?v=1022.16"; // 자모 자리 나누기(획순 · 자판 덧칠 · 손글씨 덩어리 — 본부 10-07) // 손글씨 점수 효과 = 말하기와 같은 규칙(본부 10-07)
import { createStrokes } from "../strokes.js?v=1022.16"; // 획 자료·획순 칠(글자부)
import { whyRow } from "../whyask.js?v=1022.16"; // 「왜 틀렸어요?」(개발2팀 · 기본 꺼짐 ?why=1)
let FBV = null; import(`../fbvoice.js?v=${document.documentElement.dataset.v || ""}`).then(m => { FBV = m; }).catch(() => {}); // 안내 소리(개발2팀 · 없으면 소리 없이 지금 그대로)
import { fitToGuide } from "../strokefit.js?v=1022.16"; // 자석 따라오는 획 길 = 회색 가운데(글자부 10-12)

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
const helpHtml = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => "help_wr_" + k).filter(k => t(k) !== k).map(k => `<p>${esc(t(k))}</p>`).join("") + `<p class="x">${esc(t("help_close"))}</p>`; // 7 = 🔊 이 줄 듣기(10-13 · 열쇠가 있을 때만)
export default async function write(app, ep, id, opts = {}) {
  const [d, idx, cf, KOS] = await Promise.all([episode(ep, lang), chars(), charsF(ep), KO_UI.includes(lang) ? preloadKoUi(lang) : null]); // KOS = 한국어 앱 글(⇄) — 단추 폭을 두 언어 중 긴 쪽으로(10-15)
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
  app.__wr = { sheet: (cv, o) => drawSheet(cv, o), owners: async ch => { await stkReady; const list = strokesOf(ch); return { list, ...inkOwners(ch, list), GN }; }, font: () => `${glyphWeight()} ${glyphFont()}`, reveal: async (ch, n = 200) => { await stkReady; await document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, ch).catch(() => {}); const list = strokesOf(ch); return { list, at: (k, f = 1) => revealOrder(ch, n, list, k, f) }; }, glyphCv: (ch, n = 200) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; glyph(cv.getContext("2d"), n, ch, "#000"); return cv; }, guideCv: (ch, w, n = 200) => { const cv = document.createElement("canvas"); cv.width = cv.height = n; guideGlyph(cv.getContext("2d"), n, ch, w, "#000"); return cv; }, glyphW0: ch => glyphW0(ch), snapCv: async (ch, k, tk) => (await stkReady, snapMask(ch, k, tk)), guideGrow: (ch, w) => guideGrow(ch, w), guideW: tk => guideW(tk), st: () => st, hand: () => st.hand, traceOf: ch => traceOf(ch), centerOf: ch => centerOf(ch), unitsOf: ch => unitsOf(ch), unitSteps: ch => { const m = pix(UN, x => glyph(x, UN, ch, "#000")), cp = us => us.map(u => ({ jamo: u.jamo, role: u.role, n: u.px.length, px: u.px.slice() })), a = jamoUnits(ch, m, UN), r = ringFix(a, m), s0 = cp(r); shapeFix(r, m, UN, ch); const s1 = cp(r); deCrumb(r); return { raw: cp(a), ring: s0, shape: s1, crumb: cp(r) }; }, strokesOf: async ch => (await stkReady, strokesOf(ch)), strokeHint: (H, S) => strokeHint(H, S), strokeFit: async ch => { await stkReady; const us = unitsOf(ch), L = strokesOf(ch); return us.map((u, ui) => { const P = L.filter(S => S.unit === ui); let n = 0, k = 0; for (const S of P) { const f = fitOf(u, S.pts), m = S.pts.length - 1; n += m; k += f * m; } return { jamo: u.jamo, fit: n ? k / n : null }; }); }, handScore: (ch, S) => handScore(ch, S), judge: async (ch, S, timeUp = false) => { await stkReady; const r = handScore(ch, S); return { pct: r.pct, ...judgeLines(r, timeUp, ch, S) }; }, fitPath: async (ch, i, tk) => { await stkReady; return fitPath(ch, strokesOf(ch), i, tk); }, handJudge: () => handJudge(), toggle: toggleSentence, brushPath: (ch, S) => brushPath(ch, S), paintCheck: (ch, k, n) => paintCheck(ch, k, n), busy: () => st.busy || st.done || st.queue.length > 0 || st.sent || st.auto || sfx.playing() }; // busy = 점검 도구가 소리 끝을 기다릴 때

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
  // 뜻 줄(투덜이 10-15 「언어를 바꾸거나 글자를 넘겨도 줄 수·높이 절대 안 바뀜」) — 손글씨 = 줄 수는 칸 폭으로만 정함(600px 아래 = 뜻 한 줄 + 도구 한 줄 · 이상 = 한 줄) · 뜻은 한 줄 안에 들 때까지 글자만 줄임(17 → 11px · 그래도 길면 …) · 줄 높이 고정(css)
  function fitSub2() {
    const r = work.querySelector(".info .sub2"); if (!r || !r.clientWidth) return; const xs = [...r.querySelectorAll(".mean")];
    if (work.classList.contains("handmode")) r.classList.toggle("two", r.clientWidth < 600 && innerHeight >= 700); /* 낮은 폰(320×640 등) = 한 줄(도구는 그림만 · 뜻이 줄어듦) → 손글씨 칸 150px↑ · 창 크기로만 정함 */
    xs.forEach(x => x.style.removeProperty("font-size")); const over = x => { if (x.scrollWidth > x.clientWidth + 1) return true; const rg = document.createRange(); rg.selectNodeContents(x); const a = rg.getBoundingClientRect(), b = x.getBoundingClientRect(); return a.width > 0 && a.width > b.width - 3; }; /* 글 폭 = 칸보다 3px 좁게(글꼴 차이 여유 · 앱개발부 10-16 vi 320×640 7px 잘림) */
    const ht = r.querySelector(".htools"); ht?.classList.remove("tight");
    const fit1 = () => { for (const x of xs) for (let f = parseFloat(getComputedStyle(x).fontSize) - 1; f >= 11 && over(x); f--) x.style.fontSize = f + "px"; };
    fit1(); if (ht && xs.some(over)) { ht.classList.add("tight"); xs.forEach(x => x.style.removeProperty("font-size")); fit1(); } /* 11px 로도 안 들면(글꼴이 넓은 PC · 앱개발부 10-17 vi 320×640) 옆 도구 단추 여백을 좁혀 뜻 자리를 넓힘 */
  }
  // 자판이 창 아래로 잘림(다국어부 10-12 320×640 — 아래 단추 줄이 두 줄로 꺾여 자판 마지막 줄 ㅚㅝㅞㅟㅢ 가 24~70px 잘림) — 넘칠 때만 차례로:
  //  ① 아래 단추 셋을 한 줄로(글 작게 · 단추 안에서 두 줄) ② 자판 줄 높이를 30 → 22px 까지 1px 씩
  // 손글씨 칸이 작으면(10-12 en·ur 320×640 = 88·92px — 아래 단추 셋 두 줄 + 손글씨 단추 넷 글이 옆을 차지) 차례로: ① 아래 단추 셋 한 줄(wt1) ② 도구 단추 그림만 ③ 손글씨 단추 넷 그림만 · 목표 칸 150px
  function fitHandBox() {
    const wr = work.closest(".write"), hand = work.querySelector(".hand"), H = st.hand; if (!wr || !hand || !H?.fit) return;
    wr.classList.remove("wt1", "hcomp"); hand.classList.remove("hic"); work.querySelector(".htools")?.classList.remove("ic2"); H.fit(); stageFix(); if (work.classList.contains("bigl")) return; /* 크게 가로 = 칸이 이미 높이 가득 */
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
  // 단추 글 두 겹(투덜이 10-15 「⇄ 로 바꾸면 단추 크기·자리가 미세하게 바뀜」) — 학습자 언어 글과 한국어 글(+ 상태 글 · 「⏹ 멈춤」)을 한 칸에 겹쳐 두고 하나만 보임 → 단추 폭 = 늘 가장 긴 글 · ⇄ = 보이는 글만 바뀜(0px)
  const ltx = k => { const v = tL(k); return v !== k ? v : (WX[lang] || WX.en)[k] ?? v; }, ktx = k => (KOS ? KOS[k] ?? WX.ko[k] ?? ltx(k) : null);
  const dual = (el, keys, f = x => x, pre = "") => { if (!el) return; const L = uiKoOn() ? "k" : "l", st0 = el.closest("[data-st]")?.dataset.st || "", vs = [];
    keys.forEach(([k, s0, p0 = ""]) => { vs.push([p0 + pre + f(ltx(k)), "l", s0 || ""]); const kk = ktx(k); if (kk != null) vs.push([p0 + pre + f(kk), "k", s0 || ""]); });
    const on = vs.find(([, l, s0]) => (l === L || !KOS) && (!s0 || s0 === st0)) || vs[0]; let alt = "", aw = -1;
    if (el.isConnected && el.offsetParent) for (const v of vs) { if (v === on) continue; el.innerHTML = `<span class="dl"><span>${esc(v[0])}</span></span>`; const w = el.firstChild.firstChild.getBoundingClientRect().width; if (w > aw) { aw = w; alt = v[0]; } } else alt = vs.filter(v => v !== on).map(v => v[0]).sort((a, b) => b.length - a.length)[0] || ""; /* 보이지 않는 글 = 실제로 그려 잰 가장 넓은 것 하나(::after · 글 내용(textContent)엔 안 들어감 · ur 나스탈리크도 정확) */
    el.innerHTML = `<span class="dl"${alt ? ` data-alt="${esc(alt)}"` : ""}><span>${esc(on[0])}</span></span>`; };
  const noArrow = x => String(x).replace(/\s*▶\s*$/, ""), noX = x => String(x).replace(/^✕\s*/, "");
  function dualizeAll() {
    app.querySelectorAll("[data-mode] .ml").forEach(m => dual(m, [[m.parentElement.dataset.mode === "kb" ? "w_kb" : "w_hand"]], x => x, " "));
    app.querySelectorAll("[data-act=help]").forEach(b => { if (b.dataset.short !== "1") dual(b, [["help_btn"]]); else b.textContent = "?"; });
    app.querySelectorAll("[data-act=close] .lt").forEach(m => dual(m, [["close_btn"]], noX, " "));
    dual(wb.querySelector("[data-act=hearch]"), [["w_hear_char"]]);
    for (const [a, k] of [["auto", "autofill"], ["autoall", "autofill_all"]]) { const b = wb.querySelector(`[data-act=${a}]`); if (b) { b.dataset.st ||= "idle"; dual(b, [[k, "idle"], ["btn_stop", "run", "⏹ "]]); } }
    work.querySelectorAll("[data-tool] .ml").forEach(m => dual(m, [["h_" + m.parentElement.dataset.tool]], x => x, " ")); dual(work.querySelector("[data-hmode] .ml"), [["h_magnet"]], x => x, " "); dual(work.querySelector("[data-hfollow] .ml"), [["h_follow"]], x => x, " ");
    for (const [a, k, f] of [["hdone", "h_done"], ["hnext", "next_btn", noArrow], ["horder", "h_order"], ["hundo", "h_undo"], ["hclear", "h_clear"]]) dual(work.querySelector(`[data-act=${a}] .ml`), [[k]], f, " ");
    dual(work.querySelector("[data-act=hundo] .ms"), [["h_undo_s"]]); fitHbtn(); /* 두 겹 글을 넣은 뒤 단추 안 맞춤 다시 */
    app.querySelectorAll(".chip.bgmb .lt").forEach(m => { if (!m.offsetParent) return; m.style.display = "inline-block"; m.style.textAlign = "center"; m.style.minWidth = ""; let w = 0; for (const x of [ltx("bgm_short"), ktx("bgm_short")].filter(v => v != null)) { m.textContent = x; w = Math.max(w, m.getBoundingClientRect().width); } m.textContent = t("bgm_short"); m.style.minWidth = Math.ceil(w) + "px"; }); /* ♪ 음악 단추(앱개발부 ui.js) = 두 말 중 긴 쪽 폭으로(⇄ 0px · 10-15) */
  }
  const setHelp = (hp, short) => { if (!hp) return; hp.dataset.short = short ? "1" : ""; if (short) hp.textContent = "?"; else dual(hp, [["help_btn"]]); };
  let barLock = 0; // ⇄ 직후 0.8초 = 따로 연 쓰기 머리 줄(.bar) 줄임 단계 그대로(제목·화자 글 길이가 말마다 달라 단계가 바뀌며 단추가 38px 움직이던 것 · 10-15)
  function fitBarW() { const b = app.querySelector(".scr.write > .bar"); if (!b || performance.now() < barLock) return; const hp = b.querySelector("[data-act=help]"); setHelp(hp, false); const over = () => b.scrollWidth > b.clientWidth + 1 || [...b.children].some(e => e.getBoundingClientRect().right > b.getBoundingClientRect().right + 1) || [...b.querySelectorAll(".grow .t, .grow .sub")].some(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1); /* 제목·번호가 줄임표로 잘려도 넘침(가운데 칸이 줄어 「ฝ…」「2.」만 보이던 것) */ b.classList.remove("b1", "b2", "b3", "b4"); for (const c of ["b1", "b2", "b3", "b4"]) { if (!over()) break; b.classList.add(c); if (c === "b2") setHelp(hp, true); } }
  function fitHeadW() { const h = work.closest(".write")?.querySelector(".whead") || app.querySelector(".whead"); if (!h) return; const sb = h.querySelector(".sub"), over = () => h.scrollWidth > h.clientWidth + 1 || (sb && sb.scrollWidth > sb.clientWidth + 1); /* 번호 칸이 말줄임으로 잘려도 넘침(ur 「3 / 1…」) */ const hp = h.querySelector("[data-act=help]"); setHelp(hp, false); h.classList.remove("narrow", "n2", "n3", "n3b", "n3c", "n3d", "n4"); for (const c of ["narrow", "n2", "n3", "n3b", "n3c", "n3d", "n4"]) { if (!over()) break; h.classList.add(c); if (c === "n3c") setHelp(hp, true); /* 두 줄로 꺾기 전 ? 방법 = 「?」 만(이름은 aria-label · 10-14 모국어⇄한 단추가 들어와 폰에서 두 줄이 되던 것) */ } } // 머리 줄이 넘치면 차례로: ✕ 글 숨김 → 「쓰기」 제목 숨김 → 화자 이름 숨김 → 두 줄로(닫기 단추가 화면 밖으로 밀리지 않게 · 검사부 10-12 vi 375)
  // 손글씨 도구 단추(연필·펜·붓·자석)가 창 밖으로 나가면(10-12 vi 320 「🧲 Nam châm」 31px) = 그림만(이름은 aria-label)
  function fitTools() { const ht = work.querySelector(".htools"); if (!ht) return; ht.classList.remove("ic"); ht.querySelectorAll("button .ml").forEach(m => m.style.removeProperty("font-size")); /* 글이 단추보다 넓으면 그 단추 글만 줄임(9px 까지 · 대표님 10-16 자동 맞춤) */ ht.querySelectorAll("button").forEach(b => { const m = b.querySelector(".ml"); if (!m || !m.offsetWidth) return; for (let f = parseFloat(getComputedStyle(m).fontSize) - 0.5; f >= 9 && b.scrollWidth > b.clientWidth + 1; f -= 0.5) m.style.fontSize = f + "px"; }); const wr = work.closest(".write"); if (!wr) return; const R = wr.getBoundingClientRect(); if ([...ht.querySelectorAll("button")].some(b => { const r = b.getBoundingClientRect(); return r.right > R.right + 0.5 || r.left < R.left - 0.5; }) || ht.scrollWidth > ht.clientWidth + 1) ht.classList.add("ic"); }
  function fitWord() {
    dualizeAll(); fitTools(); fitSub2(); fitHeadW(); fitBarW(); fitStageH();
    const row = work.querySelector(".info .word"); if (!row || !row.clientWidth) return;
    const bs = [...row.querySelectorAll(".wc")]; bs.forEach(b => { b.style.fontSize = ""; b.style.padding = ""; });
    for (let fs = parseFloat(getComputedStyle(bs[0] || row).fontSize) - 1; row.scrollWidth > row.clientWidth + 1 && fs >= 11; fs -= 1) bs.forEach(b => { b.style.fontSize = fs + "px"; b.style.padding = fs < 16 ? "0 2px" : ""; });
  }
  let fitQ = 0; new ResizeObserver(() => { clearTimeout(fitQ); fitQ = setTimeout(() => { fitSent(); placeBtns(); fitWord(); const c0 = st.s < segs.length ? words()[st.w]?.chars[st.c] : null; if (c0) paintBox(c0, work.querySelector(".box.ok") != null); }, 30); }).observe(sentEl);
  // 낱말 묶음 표시(투덜이 10-08 — 위 줄은 「하」「고」 한 글자씩인데 뜻은 「ha-go」 통째라 「고 = गर्न」 처럼 보임)
  //  뜻 줄 앞에 낱말 전체(지금 글자 굵게) · 로마자도 음절 수가 맞으면 지금 음절 굵게 · 위 글자 줄은 같은 낱말 밑에 이음 막대(css)
  function render() {
    paintSent();
    if (st.s >= segs.length) {
      work.innerHTML = `<div class="done-card"><span class="big ko" lang="ko">${esc(line.ko)}</span>${line.tr ? `<span class="tr">${esc(line.tr)}</span>` : ""}
        <span>${esc(t("sentence_done"))}</span><button class="chip" data-act="retry">${esc(t("retry_writing"))}</button></div>`;
      wb.remove(); return;
    }
    const w = words()[st.w], c = w.chars[st.c], jam = c.jamo;
    work.innerHTML = `<div class="stage"><div class="box" role="button" tabindex="0" aria-label="${esc(t("listen_char") || "▶")}"><canvas class="tcv" aria-hidden="true"></canvas><span class="target ko" lang="ko">${esc(c.ch)}</span><span class="typed ko" lang="ko">${esc(compose([...st.typed, st.part].flatMap(jamoParts), vowelLen(c.ch)))}</span></div>
      <div class="info">${w.mean || st.mode === "hand" ? `<div class="sub2">${w.chars.length > 1 ? `<span class="wko ko" lang="ko">${w.chars.map((x, i) => i === st.c ? `<b>${esc(x.ch)}</b>` : esc(x.ch)).join("")}</span>` : ""}${w.mean ? `<span class="mean tr">${esc(meanOf(w.mean))}</span>` : ""}${st.mode === "hand" ? `<span class="htools" role="group">${Object.entries(TOOLS).map(([k, v]) => `<button data-tool="${k}" aria-pressed="${toolKey() === k}" aria-label="${esc(t("h_" + k))}">${v.icon}<span class="ml"> ${esc(t("h_" + k))}</span></button>`).join("")}<button class="hmag" data-hmode aria-pressed="${magnetOn()}" aria-label="${esc(t("h_magnet"))}">🧲<span class="ml"> ${esc(t("h_magnet"))}</span></button><button data-hfollow aria-pressed="${followOn()}" aria-label="${esc(tx("h_follow"))}">👣<span class="ml"> ${esc(tx("h_follow"))}</span></button></span>` : ""}</div>` : ""}
      <div class="slotrow"><div class="slots">${jam.map((j, i) => `<span class="slot ${i < st.k ? "filled" : i === st.k ? "current" : ""}">${i <= st.k ? esc(j) : ""}</span>`).join("")}${"<span class=\"slot slotpad\" aria-hidden=\"true\"></span>".repeat(Math.max(0, 4 - jam.length))}</div></div></div></div>
      ${st.mode === "hand" ? `<div class="hand"><span class="hpal" role="radiogroup" aria-label="${esc(tx("h_ink"))}">${INKS.map(([k, hex]) => `<button data-act="inkset" data-ink="${k}" role="radio" aria-checked="${k === inkKey()}" aria-label="${esc(tx("ink_" + k))}" style="--c:${hex}"></button>`).join("")}</span><div class="hbox"><canvas class="hguide" aria-hidden="true"></canvas><canvas class="hpace" aria-hidden="true"></canvas><canvas class="hink" aria-label="${esc(t("w_hand"))}"></canvas><canvas class="hfix" aria-hidden="true"></canvas><span class="fx" aria-hidden="true"></span><span class="hslot"><b class="hscore" hidden></b><span class="htime" aria-hidden="true"><i></i><b></b></span></span></div><div class="hbtns"><div class="hjudge" aria-live="polite"></div><button data-act="hdone" aria-label="${esc(t("h_done"))}">✓<span class="ml"> ${esc(t("h_done"))}</span></button><button data-act="hnext" aria-label="${esc(t("next_btn"))}">▶<span class="ml"> ${esc(String(t("next_btn")).replace(/\s*▶\s*$/, ""))}</span></button><button data-act="horder" aria-label="${esc(t("h_order"))}">✎<span class="ml"> ${esc(t("h_order"))}</span></button><button data-act="hundo" aria-label="${esc(t("h_undo"))}">↶<span class="ml"> ${esc(t("h_undo"))}</span><span class="ms">${esc(tx("h_undo_s"))}</span></button><button data-act="hclear" aria-label="${esc(t("h_clear"))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 3.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H6.6l-3-3a2 2 0 0 1 0-2.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 9.8l5 5M6.6 18H21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="ml"> ${esc(t("h_clear"))}</span></button></div></div>`
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
  // 먹 색(대표님 10-15 「초록 한 색만」) — 도구 줄 🎨 단추 하나 → 아래로 펼치는 목록 · 고른 색 기억 · 쓰는 획·통과 뒤·간직하기 모두 그 색
  const INKS = [["black", "#161616"], ["blue", "#1d5fbf"], ["sky", "#2b9fd6"], ["green", "#23794a"], ["purple", "#6b3fa0"], ["red", "#c0392b"], ["pink", "#d6457a"], ["orange", "#e0751a"], ["yellow", "#f2b705"], ["brown", "#7a4b12"]]; // 10색(대표님 10-20 「노란색 넣고 · 검정과 비슷한 남색·회색 빼기」 · 금색 → 노랑)
  const inkKey = () => { try { const k = localStorage.getItem("malmun.hink"); return INKS.some(([a]) => a === k) ? k : "black"; } catch { return "black"; } }, inkHex = () => (INKS.find(([a]) => a === inkKey()) || INKS[0])[1];
  const TOOLS = { pencil: { w: 0.04, color: "#4a4a50", icon: "✏️" }, pen: { w: 0.07, color: "#1f2a5c", icon: "🖊" }, brush: { w: 0.12, color: "#161616", icon: "🖌" } };
  const magnetOn = () => { try { return localStorage.getItem("malmun.hmode") === "magnet"; } catch { return false; } };
  const followOn = () => { try { return localStorage.getItem("malmun.hfollow") === "1" && !magnetOn(); } catch { return false; } }; // 👣 따라 쓰기(투덜이 10-15) — 견본 붓이 바른 순서·빠르기로 앞서 감 · 자석과 함께 안 씀 // 손글씨 쓰기 방식(기억) — 완전 수동 / 반자동(자석)
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
      const base = (S.w ?? PEN) * n, f = i => S[i]?.[2] ?? 1, col = color || (look ? S.ink || inkHex() : "#000");
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
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.15 * Q.tot) { const aQ = area(Q.map(q => [q.x, q.y])), aS = area(S), dk = aQ < 0 ? "h_dir_ccw" : "h_dir_cw", msg = t(dk); /* 화면 좌표(아래로 +) = 음수가 시계 반대 */
      if (Math.abs(aS) < 0.3 * Math.abs(aQ)) return { rev: false, msg, dk }; /* 고리 모양이 아니면 방향은 안 봄(덮음이 가름) */
      return { rev: Math.sign(aS) !== Math.sign(aQ) || Math.hypot(S[0][0] - a.x, S[0][1] - a.y) > 0.15, msg, dk }; }
    const tOf = p => { let bi = 0, bd = Infinity; Q.forEach((q, i) => { const d = Math.hypot(q.x - p[0], q.y - p[1]); if (d < bd) { bd = d; bi = i; } }); return Q[bi].t / Q.tot; };
    const b1 = Q.find(q => q.t >= Q.tot * 0.4) || b /* 처음 40% 방향 = 꺾인 획(ㄱ)은 첫 꺾기 전 방향 · 검사부 10-12 */, dx = b1.x - a.x, dy = b1.y - a.y, key = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? "h_dir_down" : "h_dir_up") : dx > 0 ? "h_dir_right" : "h_dir_left";
    return { rev: tOf(S[0]) - tOf(S[S.length - 1]) > 0.25, msg: t(key), dk: key };
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
    const mt = strokes.map(S => matchData(ch, S, list, gw / 2 + 0.008)); // 학습자 획마다 맞춘 자료 획(-1 = 없음 · 채점 설명이 씀)
    strokes.forEach((S, i) => { const j = mt[i]; if (j < 0) return; const d = strokeDir(ch, S, list[j]), o = dirN.get(j) || { f: 0, r: 0, msg: d.msg, dk: d.dk }; if (d.rev) o.r++; else o.f++; dirN.set(j, o); });
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
    // 세 기준(투덜이 10-15 안 A) — ① 모양·순서 = 덮음 × 회색 밖 × 밖으로 나감·덧칠(가운데 어긋남은 ② 로) × 순서 ② 선 따라가기 = 획 가운데 선 ↔ 회색 가운데 선 거리 ③ 빠르기 = 획마다 걸린 시간 ↔ 견본(조언 · 통과에 안 씀)
    //  통과 = 모양 80↑ 그리고 선 60↑ · pct(옛 한 숫자 · 최고 점수·효과) = 통과면 모양, 아니면 79 까지
    const fps = list.map((S, si) => fitPath(ch, list, si, stk)), flen = fps.reduce((a, Q) => a + (Q.tot || 0), 0), paths = fps.concat(list.map(S => brushPath(ch, S)), cenPaths(ch)), sh = shapeOf(ch, strokes, stk, flen, paths);
    const penO = 4 * sh.maxE + 2 * sh.stray + 0.5 * Math.max(0, sh.lr - 1.3), shape = Math.max(0, Math.min(1, 1 - 1.5 * Math.max(0, penO - 0.22)));
    let inv = 0; for (let i = 0; i < mt.length; i++) for (let q = i + 1; q < mt.length; q++) if (mt[i] >= 0 && mt[q] >= 0 && mt[i] > mt[q]) inv++; /* 순서 바뀐 짝 하나마다 5점(최대 15) */
    const sp0 = Math.max(0, Math.min(100, Math.floor((ok ? 1 : avg) * keep * shape * (1 - 0.05 * Math.min(3, inv)) * 100 + 1e-9))), shapeP = ok ? sp0 : Math.min(sp0, 79);
    const ln = lineOf(strokes, mt, paths, boxPx), sp = speedOf(strokes, mt, fps), total = Math.round(0.6 * shapeP + 0.4 * ln.score), pass = ok && total >= 80 && ln.score0 >= 50 && ln.worstD >= 0.7, pct = pass ? total : Math.min(total, 79); /* 점수 하나(대표님 10-16) = 모양 60% + 선 40% · 빠르기는 조언만(점수·100 조건에 안 넣음) · 덩어리가 빠지면(ok 아님) 꽝 */
    return { score: pct / 100, pct, total, pass, shapeP, lineP: ln.score, speedP: sp.score, ok, comps: cov, low, avg, cover: avg, outside, shape, sh, miss, N, T: 0, dir: dirBad.size ? dir : "", ex: { list, mt, dirBad, dirN, fps, stk, flen, inv, ln, sp } };
  }
  // ② 선 따라가기 — 학습자 획(고른 선)마다 점에서 바른 길(회색 가운데 ∪ 자료 길 ∪ 글자 가운데 선)까지 거리 · 평균 1.2%·가장 먼 곳 4% 까지 봐줌
  //  획 점수 = 1 − 12 × (평균 − 0.012) − 6 × (가장 먼 − 0.04) · 검사부 「획 끝 10% 휨」 = 꽝(종 붓 64 → 57 · ㅈ 3획 자료 10-15) · 손 떨림 ±0.75% = 100 · 글자 = 획 길이로 평균 · 가장 먼 곳의 자리(t)와 방향(바른 길 → 내 점)도 남김(설명 「가운데가 위로 많이」)
  const dense = S => { const o = [S[0]]; for (let i = 1; i < S.length; i++) { const a = S[i - 1], c = S[i], k = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.01)); for (let m = 1; m <= k; m++) o.push([a[0] + (c[0] - a[0]) * m / k, a[1] + (c[1] - a[1]) * m / k]); } return o; }; // 점 사이 1% 로 촘촘히(점 둘짜리 선도 잼)
  // 떨림(대표님 10-15 「회색 안에만 들면 삐뚤삐뚤해도 100」) — 화면에 보이는 그 선(차이킨 두 번 = smoothPts)을 0.4% 간격으로 다시 찍고, 앞뒤 ±2% 평균 선과의 거리(잔떨림)를 잼
  //  곧은 획·둥근 획 모두 같은 방식(평균 선이 곡선을 따라감) · 봐주는 크기 = 붓 0.08% · 연필·펜 0.12% + 칸 1px 의 0.3(마우스·작은 칸 계단) · 넘은 만큼 × 130 깎음(점마다 ±0.75% 떨림 = 연필·펜 약 85 · 붓 약 82 · 바른 획 100) · 떨린 곳(봐주는 크기 2배 넘음) 자리 남김(칸에 빨강)
  function jitterOf(S0, boxPx = 260) {
    const P = smoothPts(S0); if (P.length < 4) return { rms: 0, t0: 0.0025, pts: [] }; const R = [[P[0][0], P[0][1]]]; let carry = 0;
    for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = 0.004 - carry; while (t <= d) { R.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); t += 0.004; } carry = d - (t - 0.004); }
    const n = R.length, w = 5; if (n < 2 * w + 3) return { rms: 0, t0: 0.0025, pts: [] }; let sq = 0, m = 0; const t0 = (S0.tool === "brush" ? 0.0014 : 0.0018) + 0.3 / Math.max(60, boxPx) /* 「눈에 띄게 떨릴 때만」(대표님 10-16) */, pts = [];
    for (let i = w; i < n - w; i++) { let x = 0, y = 0; for (let k = i - w; k <= i + w; k++) { x += R[k][0]; y += R[k][1]; } x /= 2 * w + 1; y /= 2 * w + 1; const d = Math.hypot(R[i][0] - x, R[i][1] - y); sq += d * d; m++; if (d > 2 * t0) pts.push(R[i]); }
    return { rms: Math.sqrt(sq / Math.max(1, m)), t0, pts };
  }
  // 손떨림 보정 = 아주 최소(대표님 10-15) — 손가락·마우스 표본이 혼자 튄 점만(앞뒤 점은 가깝고 가운데 점만 1.5% 넘게 떨어짐) 가운데로 · 사람 손 떨림·모양은 그대로(화면 = 채점)
  function despike(S) { const i = S.length - 2; if (i < 1) return; const a = S[i - 1], b = S[i], c = S[i + 1], ac = Math.hypot(c[0] - a[0], c[1] - a[1]), mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, d = Math.hypot(b[0] - mx, b[1] - my); if (d > 0.015 && d > 3 * ac) { b[0] = mx; b[1] = my; } }
  const CEN_D = 0.006, CEN_K = 20; // 가운데 선 봐주는 거리(칸의 0.6% ≈ 300px 칸 2px) · 넘은 만큼 × 20 (밀림 1% ≈ 98 · 2% ≈ 93 · 3% ≈ 87 · 4% ≈ 81)
  function lineOf(strokes, mt, paths, boxPx = 260) {
    const near = (x, y) => { let b = Infinity, nx = x, ny = y; for (const Q of paths) { if (Q.length === 1) { const d = Math.hypot(x - Q[0].x, y - Q[0].y); if (d < b) { b = d; nx = Q[0].x; ny = Q[0].y; } continue; } for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], c = Q[i], dx = c.x - a.x, dy = c.y - a.y, l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)), px = a.x + dx * r, py = a.y + dy * r, d = Math.hypot(x - px, y - py); if (d < b) { b = d; nx = px; ny = py; } } } return [b, nx, ny]; };
    const per = []; let wsum = 0, ssum = 0;
    strokes.forEach((S0, i) => { if (!S0.length) return; if (S0.length < 2) { const [d] = near(S0[0][0], S0[0][1]), sc = Math.max(0, Math.min(1, 1 - 12 * Math.max(0, d - 0.018) - 6 * Math.max(0, d - 0.055))); per.push({ i, j: mt[i], mean: d, M: d, at: null, s: sc, L: 0.004 }); wsum += 0.004; ssum += sc * 0.004; return; } /* 점 하나 = 짧은 무게 */ const S = smoothS(dense(S0)); /* 맞춘 자료 획이 없는 선도 셈(회색 가운데를 따라갔나 · 글자 가운데 선 조각들) */ let L = 0, dsum = 0, M = 0, at = null;
      for (let k = 0; k < S.length; k += 2) { const p = S[k], ds = k ? Math.hypot(p[0] - S[k - 2][0], p[1] - S[k - 2][1]) : 0, [d, nx, ny] = near(p[0], p[1]); L += ds; dsum += d * ds; if (d > M) { M = d; at = { t: k / (S.length - 1), dx: p[0] - nx, dy: p[1] - ny, x: p[0], y: p[1], nx, ny }; } }
      const mean = L ? dsum / L : M, sd0 = Math.max(0, Math.min(1, 1 - 12 * Math.max(0, mean - 0.018) - 6 * Math.max(0, M - 0.055))) /* 통과 기준(꽝 = 크게 휨)은 그대로 */, sd = Math.max(0, Math.min(1, 1 - CEN_K * Math.max(0, mean - CEN_D) - 6 * Math.max(0, M - 0.055))) /* 점수 = 가운데 선에서 벗어난 만큼 조금씩(대표님 10-20 「걸」 회색 안이면 100 → 가운데 기준) */, jt = jitterOf(S0, boxPx), sm = Math.max(0, Math.min(1, 1 - 120 * Math.max(0, jt.rms - jt.t0 - 0.0008))) /* 0.08% 더 봐줌 = 꺾인 획(ㅎ·ㅆ) 모서리의 고른 선 차이 */, sc = sd * sm; per.push({ i, j: mt[i], mean, M, at, s: sc, sd, sd0, sm, jit: jt.rms, shake: jt.pts, L }); /* 선 = 가운데 벗어남 × 매끄러움 */ wsum += L; ssum += sc * L; });
    const worst = per.filter(o => o.L > 0.004).reduce((m, o) => Math.min(m, o.s), 1); /* 글자 = 길이 평균 반 + 가장 나쁜 획 반(한 획만 크게 휘어도 드러나게 · 검사부 「획 끝 10% 휨」 붓 61 → 50) */
    const worstD = per.filter(o => o.L > 0.004).reduce((m, o) => Math.min(m, o.sd0 ?? o.sd ?? o.s), 1);
    const s0 = o => (o.sd0 ?? o.sd ?? o.s) * (o.sm ?? 1), w0 = per.filter(o => o.L > 0.004).reduce((m, o) => Math.min(m, s0(o)), 1), score0 = wsum ? Math.floor((0.5 * per.reduce((a, o) => a + s0(o) * o.L, 0) / wsum + 0.5 * w0) * 100 + 1e-9) : 0; /* 통과 판정용 옛 선 점수(가운데 기준은 점수만 깎음) */
    return { score: wsum ? Math.floor((0.5 * ssum / wsum + 0.5 * worst) * 100 + 1e-9) : 0, score0, per, worstD }; /* worstD = 가장 많이 벗어난 획(떨림 빼고) — 0.7 아래면 꽝(획 끝 10% 휨 등) */
  }
  // ③ 빠르기 — 획마다 펜 대고 ~ 뗄 때까지(초) · 획 안에서 0.25초 넘게 거의 안 움직인 시간(멈춤) · 견본 = 0.35 + 1.1 × 그 획 회색 길 길이(칸 비율 · ㅡ ≈ 1초)
  //  0.4 ~ 2 배 = 좋음 · 2 배 넘으면 4 배에서 0 · 0.4 배 아래면 비례로 깎음 · 멈춤 0.3초 넘는 만큼 40%/초 깎음 · 시각 없는 획(자석·점검 획) = 안 셈(모두 없으면 null)
  const normT = Q => 0.35 + 1.1 * (Q?.tot || 0.5);
  function speedOf(strokes, mt, fps) {
    const per = []; strokes.forEach((S, i) => { const ts = S.ts; if (mt[i] < 0 || !ts || ts.length !== S.length || S.length < 2) return; const dur = (ts[ts.length - 1] - ts[0]) / 1000; let pause = 0, run = 0;
      let an = 0; for (let k = 1; k < S.length; k++) { if (Math.hypot(S[k][0] - S[an][0], S[k][1] - S[an][1]) < 0.006) run = ts[k] - ts[an]; else { if (run >= 250) pause += run; run = 0; an = k; } } if (run >= 250) pause += run; pause /= 1000; /* 멈춤 = 한 자리(0.6% 안)에 0.25초 넘게 · 점 사이가 촘촘해도(천천히 고르게 그음) 멈춤 아님 */
      const norm = normT(fps[mt[i]]), ratio = dur / norm, s = Math.max(0, Math.min(1, (ratio > 2 ? 1 - (ratio - 2) / 2 : ratio < 0.4 ? ratio / 0.4 : 1) - 0.4 * Math.max(0, pause - 0.3))); per.push({ i, j: mt[i], dur, norm, ratio, pause, s }); });
    return { score: per.length ? Math.floor((per.reduce((a, o) => a + o.s, 0) / per.length) * 100 + 1e-9) : null, per };
  }
  // 채점 설명(투덜이 10-15 안 · D:/malmun_work/write_fb/mock.html) — 채점이 이미 아는 것으로 가장 중요한 것부터: 빠짐 → 방향 → 순서 → 짧음 → 김·밖 → 기울기·휨 → 자리·크기 → 남는 선 → 시간
  //  한 줄에 한 가지 · 줄마다 { k, v, j: 자료 획 번호(주황 점선) , s: 학습자 획 번호(빨강) } · 글자 전체가 어긋났으면(획 절반 넘게 빠짐 + 자리·크기 틀림) 자리·크기를 먼저 하고 빠짐·짧음은 안 셈
  function handExplain(ch, strokes, r) {
    const ex = r.ex; if (!ex) return { items: [], rest: false };
    const { list, mt, dirBad, dirN, fps, stk } = ex, jn = j => ({ n: j + 1, j: list[j].jamo || "" }), items = [], seen = new Set(), add = (o, j) => { if (j != null && seen.has(j)) return; if (j != null) seen.add(j); items.push({ cat: "shape", ...o }); }; // cat = ① 모양·순서(shape) ② 선(line) ③ 빠르기(speed)
    const bentJ = new Set((ex.ln?.per || []).filter(o => o.j >= 0 && o.L > 0.004 && o.s < 0.8).map(o => o.j)); /* 그었는데 크게 휘어 덮음이 모자란 획 = 「짧아요」 대신 ② 선 줄로(어디가 얼마나 빠졌는지) */
    const miss = [], short = []; let low0 = 0; r.comps.forEach((c, j) => { if (dirBad.has(j)) return; if (c < COMP_MIN) low0++; if (bentJ.has(j)) return; if (c < 0.3) miss.push(j); else if (c < COMP_MIN) short.push(j); });
    // 자리·크기 — 그은 잉크 상자 ↔ 회색 길 상자(가운데 10% 넘게 · 크기 0.7 아래 / 1.35 위)
    const bb = P => { let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const p of P) { const x = p.x ?? p[0], y = p.y ?? p[1]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
    const A = bb(strokes.flat()), B = bb(fps.flat()), dx = (A[0] + A[2] - B[0] - B[2]) / 2, dy = (A[1] + A[3] - B[1] - B[3]) / 2, sz = Math.max(A[2] - A[0], A[3] - A[1]) / Math.max(0.05, B[2] - B[0], B[3] - B[1]);
    const enough = strokes.length >= Math.max(2, list.length - 1), pos = enough && Math.max(Math.abs(dx), Math.abs(dy)) > 0.1 ? (Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "wx_pos_up" : "wx_pos_down") : dx < 0 ? "wx_pos_left" : "wx_pos_right") : "", size = enough ? (sz < 0.7 ? "wx_small" : sz > 1.35 ? "wx_big" : "") : "";
    const whole = (pos || size) && low0 > list.length / 2; /* 글자 전체 어긋남은 휜 획도 셈 */
    if (whole) { if (size) add({ k: size }); if (pos) add({ k: pos }); }
    else miss.forEach(j => add({ k: "wx_missing", v: jn(j), j }, j));
    for (const j of dirBad) add({ k: "wx_dir", v: { ...jn(j), d: dirN.get(j)?.dk || "" }, j, s: mt.findIndex(x => x === j) }, j); /* {d} = 방향 글 열쇠(그릴 때 그 언어로 · ⇄) */
    { let at = -1; for (let i = 0; i < mt.length && at < 0; i++) for (let q = i + 1; q < mt.length; q++) if (mt[i] >= 0 && mt[q] >= 0 && mt[i] > mt[q]) { at = i; add({ k: "wx_order", v: { n: mt[i] + 1, m: mt[q] + 1 }, j: mt[q] }); break; } }
    if (!whole) short.forEach(j => add({ k: "wx_short", v: jn(j), j }, j));
    const paths = fps.concat(list.map(S => brushPath(ch, S)), cenPaths(ch));
    strokes.forEach((S, i) => { const j = mt[i]; if (j < 0 || seen.has(j)) return; const sh = shapeOf(ch, [S], stk, fps[j]?.tot || 0.1, paths);
      if ((sh.maxE > 0.03 || sh.stray > 0.2) && !bentJ.has(j) || sh.lr > 1.6) return add({ k: "wx_long", v: jn(j), j, s: i }, j); }); /* 가운데가 휘어 밖으로 나간 건 ② 선 줄로 */ /* 기울기·휨 = ② 선 따라가기로(10-15 세 기준) */
    if (!whole) { if (size) add({ k: size }); if (pos && r.pct < 80) add({ k: pos }); }
    { const i = strokes.findIndex((S, q) => mt[q] < 0 && S.length > 1 && Math.hypot(S[S.length - 1][0] - S[0][0], S[S.length - 1][1] - S[0][1]) > 0.04); if (i >= 0) add({ k: "wx_extra", s: i }); }
    // ② 선 — 획 점수 85 아래인 획 · 가장 많이 벗어난 곳(시작·가운데·끝 / 위·아래·왼쪽·오른쪽 / 조금 4~6%·많이 6%↑)
    const lineBad = new Set(), spBad = new Set();
    (ex.ln?.per || []).filter(o => o.j >= 0 && o.L > 0.004 && (o.s < 0.85 || (o.sm ?? 1) < 0.9) && o.at).sort((a, b) => a.s - b.s).forEach(o => { if (lineBad.has(o.j) || seen.has(o.j)) return; lineBad.add(o.j); const a = o.at;
      if ((o.sm ?? 1) < (o.sd ?? 1) && (o.sm ?? 1) < 0.9) return items.push({ cat: "line", k: "wx_shake", v: jn(o.j), j: o.j, s: o.i, shake: o.shake }); /* 떨림이 더 크면 「떨렸어요」 + 떨린 곳 빨강 */
      items.push({ cat: "line", k: "wx_line", v: { ...jn(o.j), w: a.t < 0.3 ? "wx_w_start" : a.t > 0.7 ? "wx_w_end" : "wx_w_mid", d: Math.abs(a.dy) >= Math.abs(a.dx) ? (a.dy < 0 ? "wx_d_up" : "wx_d_down") : a.dx < 0 ? "wx_d_left" : "wx_d_right", a: o.M >= 0.06 ? "wx_a_lot" : "wx_a_bit" }, j: o.j, s: o.i, mk: [a.nx, a.ny, a.x, a.y] }); });
    // ③ 빠르기 — 견본(보통)의 2배 넘게 느림 · 0.4배보다 빠름 · 0.4초 넘게 멈춤
    (ex.sp?.per || []).forEach(o => { if (spBad.has(o.j)) return; const sec = x => String(Math.min(60, Math.round(x))), v = { ...jn(o.j), s: sec(o.dur), m: String(Math.max(1, Math.round(o.norm))), p: String(Math.max(1, Math.round(o.pause))) }; /* 초 = 정수(본부 10-21 · 글·소리 1:1 · 숫자 소리 0~60) */
      const k = o.ratio > 2 ? "wx_slow" : o.ratio < 0.4 ? "wx_fast" : o.pause > 0.4 ? "wx_pause" : ""; if (!k) return; spBad.add(o.j); items.push({ cat: "speed", k, v, j: o.j, s: o.i }); });
    // 잘 쓴 획(✓) — 맞춘 자료 획 중 세 기준 모두 문제없는 것
    const good = [...new Set(mt.filter(j => j >= 0))].filter(j => !seen.has(j) && !lineBad.has(j) && !spBad.has(j)).sort((a, b) => a - b);
    return { items, good: good.length && !whole ? { k: "wx_ok", v: { n: good.map(j => j + 1).join("·"), j: good.map(j => list[j].jamo || "").join("·") }, ok: 1 } : null, rest: seen.size < list.length && !whole };
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
      const sn = H.strokes.filter(S => S.snap); if (sn.length && SK.STK) { const tc = document.createElement("canvas"); tc.width = tc.height = n; const tx = tc.getContext("2d"); tx.drawImage(snapMask(c.ch, sn.length - 1, toolKey()), 0, 0, n, n); tx.globalCompositeOperation = "source-in"; tx.fillStyle = color || sn[sn.length - 1].ink || inkHex(); tx.fillRect(0, 0, n, n); x.drawImage(tc, 0, 0); } /* 자석으로 붙은 획 = 회색 안 바른 획(본부 10-12) */
      inkPath(x, n, list, 0, color || null, true); /* 획마다 제 먹 색(통과 뒤에도 그 색) */
      if (F && F.prog >= 0) { const tc = document.createElement("canvas"); tc.width = tc.height = n; const tx = tc.getContext("2d"); inkPath(tx, n, [Object.assign(F.Q.slice(0, F.prog + 1).map(q => [q.x, q.y, Math.min(1, (q.w ?? F.w) / F.w)]), { tool: F.tool, w: F.w })], 0, color || H.cur?.ink || inkHex(), true); tx.globalCompositeOperation = "destination-in"; guideGlyph(tx, n, c.ch, guideW(F.tool), "#000"); x.drawImage(tc, 0, 0); } /* 자석 따라오는 획 = 회색 안만(글자부 권고 10-12 · 길은 strokefit) */
      if (F && F.finger && F.prog >= 0 && !F.lost) { const q = F.Q[F.prog]; x.save(); x.strokeStyle = OR_MARK; x.globalAlpha = 0.8; x.lineWidth = Math.max(1, n / 250); x.setLineDash([n / 70, n / 90]); x.beginPath(); x.moveTo(F.finger[0] * n, F.finger[1] * n); x.lineTo(q.x * n, q.y * n); x.stroke(); x.restore(); } }; // 자석 따라오는 중 = 붙은 만큼만 획 + 손가락까지 가는 점선(본부 10-11) // 도구마다 제 색 · 통과 = 초록 // 통과 = 초록(다시 그려도)
    const fit = () => { if (!hand.isConnected) return; const cs = getComputedStyle(hand), px = v => parseFloat(cs[v]) || 0, gap = px("columnGap") || 10; // 칸 크기 = 안쪽 여백 빼고(본부 10-07 왼쪽 끝 3px 에 붙던 것)
      const bigOn = !!work.closest(".learn.big"), bigL = bigOn && innerWidth > innerHeight; work.classList.toggle("bigl", bigL); work.classList.toggle("bigp", bigOn && !bigL); // ⛶ 크게 보기(앱개발부 틀 .learn.big · 대표님 10-16) — 가로 = 칸 왼쪽 높이 가득 · 세로 = 칸 폭 가득 + 남는 높이는 판정 상자
      if (bigL) { const wr0 = work.getBoundingClientRect(), pal0 = 26, s0 = Math.max(120, Math.floor(Math.min(work.clientHeight - pal0 - 10, wr0.width * 0.56))), dpr0 = window.devicePixelRatio || 1; hand.classList.remove("stack", "two", "three");
        box.style.width = box.style.height = s0 + "px"; for (const cv of [gv, iv, box.querySelector(".hfix"), box.querySelector(".hpace")]) if (cv) cv.width = cv.height = Math.round(s0 * dpr0); H.s = s0; bt.style.height = ""; fitHbtn(); fitJudge(); paintGuide(); paintInk(); return; }
      const iw = hand.clientWidth - px("paddingLeft") - px("paddingRight"), ih = hand.clientHeight - px("paddingTop") - px("paddingBottom");
      /* 단추 줄 폭 = 칸 폭으로만 정함(투덜이 10-15 「⇄ 언어를 바꿔도 화면이 절대 안 바뀜」 — 단추 글 길이로 폭이 정해져 언어마다 칸이 127px 까지 달라지던 것) · 글은 그 폭 안에서 줄임(fitHbtn) */
      hand.style.setProperty("--hbw1", Math.round(Math.max(104, Math.min(190, iw * 0.3))) + "px"); hand.style.setProperty("--hbw2", Math.round(Math.max(96, Math.min(250, iw * (hand.classList.contains("hic") ? 0.36 : 0.5)))) + "px"); /* 글 단추 = 넓게(글이 읽히게) · 그림+작은 글(hic) = 좁게(칸 크게) */ hand.style.setProperty("--hbw3", Math.round(Math.max(132, Math.min(200, iw * 0.44))) + "px");
      // 단추 자리 = 오른쪽 한 줄 · 오른쪽 두 줄 · 칸 아래 중 단추가 다 들어가고 칸이 가장 큰 것(도구 3 + 단추 4 = 7개 · 375×667 에서 한 줄이면 넘침)
      const lay = [["", c2 => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["two", () => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih], ["three", () => Math.min(ih, iw - bt.offsetWidth - gap), () => bt.offsetHeight <= ih] /* 오른쪽 세 줄(판정 상자 + 단추 3×2) — 320×568 처럼 낮은 폰(검사부 10-15 칸 아래로 밀려 60px) */, ["stack", () => Math.min(ih - bt.offsetHeight - (px("rowGap") || 8), iw), () => bt.offsetWidth <= iw + 1]];
      bt.style.height = ""; let best = null; for (const pass of [0, 1]) { for (const [k, sz, fits] of lay) { if ((k === "three") !== (pass === 1)) continue; hand.classList.remove("stack", "two", "three"); if (k) hand.classList.add(k); const v = sz(), f = fits(); if (f && (!best || v > best[1])) best = [k, v]; } if (best && best[1] >= 120) break; } /* 세 줄(좁은 단추 · 글 잘림)은 다른 배치로 칸이 120px 못 될 때만(10-15) */
      if (!best) best = ["stack", Math.min(ih - bt.offsetHeight - 8, iw)];
      hand.classList.remove("stack", "two", "three"); if (best[0]) hand.classList.add(best[0]); if (best[0] === "three") hand.classList.add("hic"); /* 세 줄 = 좁은 단추 → 그림 아래 글(10-16 ur 360 글이 단추 밖) */
      const s = Math.max(60, Math.floor(best[1])), dpr = window.devicePixelRatio || 1;
      box.style.width = box.style.height = s + "px"; for (const cv of [gv, iv, box.querySelector(".hfix"), box.querySelector(".hpace")]) if (cv) cv.width = cv.height = Math.round(s * dpr); H.s = s;
      bt.style.height = ""; const jb0 = bt.querySelector(".hjudge"); if (jb0) jb0.style.removeProperty("height"); if (best[0] !== "stack") bt.style.height = Math.max(s, ih, bt.offsetHeight) + "px"; else if (bigOn && jb0) { const left = ih - s - (px("rowGap") || 8) - bt.offsetHeight; if (left > 0) jb0.style.height = Math.round(jb0.offsetHeight + left) + "px"; } /* 세로 크게 = 남는 높이를 판정 상자가(빈자리 0 · 본부 10-16) */ /* 오른쪽 줄 = 손글씨 칸 높이 전부(칸이 폭에 막혀 작으면 남는 높이는 판정 상자가 씀 · 본부 10-15 빈자리 100px) */ fitHbtn(); /* 판정 상자 = 단추 줄 남는 높이 전부(칸 높이와 같게 · 글 길이와 상관없이 고정 · 투덜이 10-15) */ fitJudge(); { const pal = hand.querySelector(".hpal"); if (pal) { const hr = hand.getBoundingClientRect(), br = box.getBoundingClientRect(), L = br.left - hr.left + 66, R = hand.clientWidth - px("paddingRight"); pal.style.left = L + "px"; pal.style.width = Math.max(80, R - L) + "px"; pal.style.top = (br.top - hr.top - 24) + "px"; } } /* 팔레트 = 칸 위 점수 옆부터 오른쪽 끝까지(폰에서도 동그라미가 커지게) */ paintGuide(); paintInk(); };
    fit(); H.ro?.disconnect(); H.ro = new ResizeObserver(() => fit()); H.ro.observe(hand); stkReady.then(() => { if (st.hand === H) paintGuide(); }); // 획 자료가 오면 회색 길로
    document.fonts?.load(`${glyphWeight()} 100px ${glyphFont()}`, c.ch).catch(() => {}).then(() => document.fonts.ready).then(() => { if (st.hand !== H) return; gCache.clear(); uCache.clear(); revPrev.clear(); pathCache.clear(); unitMaskCache.clear(); ownCache.clear(); fit(); }); /* 앞 장면·붓 길·자모 틀도 함께 비움 */ // 글꼴이 늦게 오면 글자 그림 다시
    const at = e => { const r = iv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    // 점 = [x, y, 굵기 배수] — 붓만: 진짜 펜이면 누르는 힘 · 아니면 빠르기(칸/초 · 빠를수록 가늘게) · 앞 점과 부드럽게 이어 붙임
    const pt = (e, S) => { const p = at(e); if (toolKey() !== "brush" && !(S && S.tool === "brush")) return p; const now = e.timeStamp || performance.now();
      let f; if (e.pointerType === "pen" && e.pressure > 0) f = 0.5 + 0.7 * Math.min(1, e.pressure);
      else if (!S || !S.length) f = 1; else { const q = S[S.length - 1], dt = Math.max(1, now - (S.t || now - 16)), v = Math.hypot(p[0] - q[0], p[1] - q[1]) / (dt / 1000); f = 1.2 - 0.7 * Math.min(1, v / 2.5); }
      if (S && S.length) f = S[S.length - 1][2] * 0.6 + f * 0.4; if (S) S.t = now; return [p[0], p[1], Math.max(0.5, Math.min(1.2, f))]; };
    iv.addEventListener("pointerdown", e => { if (st.auto || H.timeUp) return; /* 시간 끝 뒤 = 채점 결과 나올 때까지 획 안 받음 */ if (st.busy) { if (!H.passSnd) return; hush(); st.busy = false; H.passSnd = false; } H.drawGen = (H.drawGen || 0) + 1; /* 통과 글자 소리 중에 다시 쓰기 = 소리 끊고 첫 획부터 받음(본부 10-10 「100 뒤 다시 쓰면 첫 획이 빠져 68」) */ if (H.cur) up(); /* 손 뗌을 못 받은 채 남은 획 = 먼저 마무리 */ e.preventDefault(); try { iv.setPointerCapture(e.pointerId); } catch {} clearTimeout(H.timer); stopLoop(); // 투덜이 10-14 PC 마우스 「자석이 갑자기 안 먹음」 — 이 줄이 앞 // 주석에 묻혀 손 뗌 잡기(setPointerCapture)가 없었음 → 칸 밖에서 놓으면 획이 안 끝나 자석이 안 붙고 그대로 남음
      if (H.ordPlaying || H.ordAt) { H.stopOrder(); paintGuide(); } // 획순 보는 중·멈춘 채 쓰기 시작 = 획순 그만(회색으로)
      if (H.passed) { H.passed = false; H.strokes = []; H.said = null; H.roles = null; H.orderTold = false; H.mag = 0; markHand(); if (magnetOn()) { paintGuide(); H.magMarks?.(); } } // 통과 뒤 다시 그리면 = 다시 쓰기(더 높은 점수 · 자석은 처음 획부터)
      clearTimeout(H.clr); clearFix(); judgeFull(false); { const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; } // 새로 쓰기 시작 = 점수 지움
      fbStop(); const tk = toolKey(); H.cur = Object.assign([pt(e, null)], { tool: tk, w: TOOLS[tk].w, ink: inkHex(), ts: [e.timeStamp || performance.now()] }); /* 획마다 그때 고른 먹 색(대표님 10-16 · 바꾸면 다음 획부터) */ H.strokes.push(H.cur); /* ts = 점마다 시각(빠르기 채점 · 10-15) */ paintInk(); drawStart(tk); H.lastMv = [e.clientX, e.clientY, e.timeStamp || performance.now()]; if (!magnetOn()) startTimer(H); });
    iv.addEventListener("pointermove", e => { if (!H.cur) return; e.preventDefault(); { const now = e.timeStamp || performance.now(), L = H.lastMv; if (L) { const r = iv.getBoundingClientRect(), dt = Math.max(1, now - L[2]); drawMove(Math.hypot(e.clientX - L[0], e.clientY - L[1]) / Math.max(1, r.width) / (dt / 1000)); } H.lastMv = [e.clientX, e.clientY, now]; } const evs = e.getCoalescedEvents?.() || []; for (const ev of evs.length ? evs : [e]) { H.cur.push(pt(ev, H.cur)); H.cur.ts?.push(ev.timeStamp || performance.now()); despike(H.cur); } if (magnetOn()) magFollow(H.cur[H.cur.length - 1]); paintInk(); });
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
    const bubble = msg => { const bx = work.querySelector(".hjudge"); H.hints = (H.hints || []).concat(msg); if (!bx) return; H.jx = null; H.guideOn = false; H.hintOn = true; judgeFull(false); bx.className = "hjudge hint"; bx.innerHTML = `<p class="hb">${esc(msg)}</p>`; fitJudge(); }; // 획순·방향 알림 = 판정 상자 한 곳에만(본부 10-15 — 칸 위 말풍선·머리 줄에 같은 글이 … 로 잘려 두 번 더 나오던 것) · 다음 알림·채점이 바꿈
    // 획순 보기(본부 10-07) — 회색 글자를 획 차례대로 주황으로 칠해 드러냄(획 0.5초 · revealOrder) · 시작점 번호 원 · 끝에 작은 화살촉(글자 안) → 다 칠하면 1초 뒤 회색으로
    //  keep = 자동 손글씨(다 칠한 채로 남음 = 「써진」 상태) · 다시 누르거나 멈추면 그 자리에서 그침 → true = 끝까지 칠함
    const clipG = cv => { const n = cv.width, k = c.ch + "|" + n + "|" + toolKey() + "|" + hfontKey(); if (H.gk !== k) { H.gk = k; H.gm = document.createElement("canvas"); H.gm.width = H.gm.height = n; guideGlyph(H.gm.getContext("2d"), n, c.ch, guideW(), "#000"); } const cx = cv.getContext("2d"); cx.save(); cx.globalCompositeOperation = "destination-in"; cx.drawImage(H.gm, 0, 0); cx.restore(); return cv; }; /* 획순·자동 완성 칠 = 회색 모양 안으로(본부 10-12) */
    H.showOrder = async ({ keep = false, from = null } = {}) => { // from = { i, f } 멈춘 자리부터 이어서(투덜이 10-08)
      H.ordPlaying = true; H.ordKeep = keep; markOrder();
      if (!keep && !from && H.strokes.length) { clearTimeout(H.timer); clearTimeout(H.clr); H.strokes = []; H.said = null; H.roles = null; H.orderTold = false; if (H.passed) { H.passed = false; markHand(); } const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; paintInk(); } // 획순 보기 = 내가 그린 것 지움(투덜이 10-08)
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
      if (followed) { H.strokes.pop(); const Q = brushPath(c.ch, H.magList[H.mag]); H.strokes.push(Object.assign(Q.map(q => [q.x, q.y, 1]), { tool: S.tool, w: S.w, ink: S.ink, snap: true })); swish(Q.tot, S.tool, true); H.mag++; paintInk(); paintGuide(); return magDone(); } // 실시간으로 다 따라온 획
      const segD = (Q, x, y) => { let b = Infinity; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], c2 = Q[i], dx = c2.x - a.x, dy = c2.y - a.y, l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)); b = Math.min(b, Math.hypot(x - a.x - dx * r, y - a.y - dy * r)); } return Q.length === 1 ? Math.hypot(x - Q[0].x, y - Q[0].y) : b; };
      const lineD = (x, y) => { let b = Infinity; for (let i = 0; i < S.length; i++) { const a = S[Math.max(0, i - 1)], c2 = S[i], dx = c2[0] - a[0], dy = c2[1] - a[1], l = dx * dx + dy * dy || 1e-12, r = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)); b = Math.min(b, Math.hypot(x - a[0] - dx * r, y - a[1] - dy * r)); } return b; };
      let best = -1, bs = Infinity; H.magList.forEach((T, j) => { const Q = brushPath(c.ch, T); if (!Q.length) return; const md = S.reduce((a, p) => a + segD(Q, p[0], p[1]), 0) / S.length, step = Math.max(1, Math.floor(Q.length / 30)); let k = 0, n = 0; for (let i = 0; i < Q.length; i += step) { n++; if (lineD(Q[i].x, Q[i].y) < 0.12) k++; }
        const sc = md + (n ? 0.1 * (1 - k / n) : 0.1); if (md < 0.1 && k / n >= 0.45 && sc < bs) { bs = sc; best = j; } }); // 선이 그 획 가까이(평균 칸 10% 안) + 그 획 길이 45% 넘게 지나감
      H.strokes.pop();
      if (best < 0) { paintInk(); paintGuide(); magMarks(); bubble(t("h_magnet_miss")); return; }
      if (best !== H.mag) { paintInk(); paintGuide(); magMarks(); bubble(t("h_order_again", { n: H.mag + 1 })); H.magWrong = (H.magWrong || 0) + 1; return; } // 순서 다시(그 획 번호)
      { const dv = strokeDir(c.ch, S, H.magList[best]); if (dv.rev) { paintInk(); paintGuide(); magMarks(); bubble(dv.msg); H.magWrong = (H.magWrong || 0) + 1; return; } } /* 거꾸로 그은 획 = 안 붙음 + 방향 알림(본부 10-12) */
      { const Qb = brushPath(c.ch, H.magList[best]), lc = cornerT(Qb); if (lc > 0) { const tail = Qb.filter(q => q.t > lc + 0.03); if (tail.length && tail.filter(q => lineD(q.x, q.y) < 0.12).length / tail.length < 0.5) { paintInk(); paintGuide(); magMarks(); bubble(t("h_magnet_miss")); return; } } } /* 꺾이는 획(ㅈ 첫 획 = 가로 + 왼쪽 아래 삐침 · ㄱ ㄴ ㄹ …) = 마지막 꺾임 뒤까지 그어야 붙음(투덜이 10-14 「자」 가로만 그었는데 삐침까지 칠해짐) */
      const Q = brushPath(c.ch, H.magList[best]); H.strokes.push(Object.assign(Q.map(q => [q.x, q.y, 1]), { tool: S.tool, w: S.w, ink: S.ink, snap: true })); swish(Q.tot, S.tool, true); H.mag++; paintInk(); paintGuide(); magDone();
    };
    const magDone = () => { // 획 하나 붙은 뒤 — 다음 번호 강조(잠깐 크게) · 다 붙으면 「✓ 순서 맞음」
      if (H.mag < (H.magList?.length || 0)) setTimeout(() => st.hand === H && jamoSay(H), 300); // 자모 하나가 다 붙으면 그 자모 소리(스윽 뒤)
      if (H.mag < H.magList.length) { H.magPulse = performance.now(); const my = H.magPulse; const tick = () => { if (H.magPulse !== my || st.hand !== H) return; paintGuide(); if (performance.now() - my < 700) setTimeout(tick, 33); else { H.magPulse = 0; paintGuide(); } }; tick(); }
      if (H.mag >= H.magList.length) { H.passed = true; paintInk(); markHand(); const sc = work.querySelector(".hscore"); if (sc) { sc.textContent = t("h_order_ok"); sc.className = "hscore ok"; fitScore(sc); sc.hidden = false; } note.textContent = ""; // 「✓ 순서 맞음」 · 점수·최고 기록·효과음 없음
        st.busy = true; run([400, c.file || jamoSrc(c.jamo[c.jamo.length - 1])]).then(() => { st.busy = false; }); }
    };
    // 👣 따라 쓰기 — 지금 차례 획(= 끝낸 획 수)을 견본 빠르기(normT)로 주황 붓 점이 지나감 · 지나간 길은 주황 점선 · 다 가면 0.7초 쉬고 다시(학습자가 긋는 중이면 끝에서 기다림) · 획을 끝내면 0.3초 뒤 다음 획
    const pv = box.querySelector(".hpace"), pace = { k: -1, t0: 0 };
    const paceTick = () => { if (!st.alive || st.hand !== H || !followOn()) { clearInterval(H.paceT); pv?.getContext("2d").clearRect(0, 0, pv.width, pv.height); return; } if (!pv || !SK.STK) return;
      const x = pv.getContext("2d"), n = pv.width; x.clearRect(0, 0, n, n); const list = strokesOf(c.ch), k = H.strokes.length - (H.cur ? 1 : 0), now = performance.now(); if (st.auto || H.passed || H.ordPlaying || k >= list.length) { pace.k = -1; return; }
      if (pace.k !== k) { pace.k = k; pace.t0 = now + 300; } const Q = fitPath(c.ch, list, k, toolKey()); if (Q.length < 2) return; const T = normT(Q) * 1000; let f = (now - pace.t0) / T; if (f > 1 && !H.cur && f > 1 + 700 / T) { pace.t0 = now; f = 0; } f = Math.max(0, Math.min(1, f));
      const lw = Math.max(3, n * 0.022), upto = f * Q.tot; x.lineCap = "round"; x.strokeStyle = "rgba(224,138,30,.28)"; x.lineWidth = lw; x.setLineDash([]); x.beginPath(); Q.forEach((q, i) => (i ? x.lineTo(q.x * n, q.y * n) : x.moveTo(q.x * n, q.y * n))); x.stroke();
      x.strokeStyle = "#e08a1e"; x.setLineDash([lw * 1.3, lw]); x.beginPath(); let hx = Q[0].x, hy = Q[0].y; x.moveTo(hx * n, hy * n); for (const q of Q) { if (q.t > upto) { const a = Q[Math.max(0, Q.indexOf(q) - 1)], r2 = (upto - a.t) / Math.max(1e-6, q.t - a.t); hx = a.x + (q.x - a.x) * r2; hy = a.y + (q.y - a.y) * r2; x.lineTo(hx * n, hy * n); break; } hx = q.x; hy = q.y; x.lineTo(hx * n, hy * n); } x.stroke(); x.setLineDash([]);
      x.fillStyle = "#e08a1e"; x.beginPath(); x.arc(hx * n, hy * n, lw * 1.25, 0, 7); x.fill(); x.strokeStyle = "rgba(224,138,30,.45)"; x.lineWidth = 2; x.beginPath(); x.arc(hx * n, hy * n, lw * 2, 0, 7); x.stroke(); };
    clearInterval(H.paceT); if (followOn()) H.paceT = setInterval(paceTick, 33); H.paceTick = paceTick;
    showGuide(H); stkReady.then(() => showGuide(H)); /* 채점 전 안내(획 자료 오면) */
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
  // 점수 배지 = 「모양 92 · 선 68 · 빠르기 55」 — 칸마다 색(모양 80↑ · 선 60↑ · 빠르기 60↑ = 초록) · 빠르기 잴 수 없으면 「–」 · ★ = 셋 다 95↑ · 옛 채점(획 자료 없음) = 한 칸
  function badgeHtml(r, star) { const v = r.total ?? r.pct; return (star ? '<i class="st">★</i>' : "") + `<i class="${(r.pass ?? v >= 80) ? "ok" : "bad"}">${v}%</i>`; } // 점수 하나(대표님 10-16) · 설명 줄은 [모양]·[선]·[빠르기] 그대로
  function fitScore(sc) { if (!sc) return; sc.style.removeProperty("font-size"); sc.classList.remove("num"); const over = () => sc.scrollWidth > sc.clientWidth + 1; if (over() && sc.querySelector("u")) sc.classList.add("num"); /* 좁으면 숫자만(색으로 구분) */ for (let f = parseFloat(getComputedStyle(sc).fontSize) - 1; f >= 9 && over(); f--) sc.style.fontSize = f + "px"; } // 칸 다시 맞추지 않음(채점 때 화면 안 흔들림 · 자리는 css 로 미리 잡음)
  // 채점 설명 글 — 열쇠가 lang 파일에 아직 없으면 여기 ko·en·ne(다국어부에 열쇠 목록 보냄 · 10-15) · 그 밖 언어 = en · ⇄ 한국어면 ko
  const WX = {
    ko: { "wx_keep_star": "이 글씨 간직", "wx_keep_tip": "100점 글씨를 저장할 수 있어요", "wx_keep": "간직하기", "keep_title": "간직하기", "keep_char": "글자 한 장", "keep_word": "낱말 한 장", "keep_name": "이름", "keep_print": "🖨 인쇄", "keep_pdf": "⬇ PDF", "keep_png": "⬇ 그림", "keep_need": "100점 필요", "keep_mine": "내가 쓴 한글", "keep_word_title": "내가 쓴 낱말", "keep_pdf_tip": "PDF 는 인쇄 창에서 「PDF로 저장」을 고르세요", "h_ink": "먹 색", "ink_black": "먹(검정)", "ink_navy": "남색", "ink_blue": "파랑", "ink_red": "빨강", "ink_green": "초록", "ink_purple": "보라", "ink_brown": "갈색", "ink_gold": "금색", "ink_yellow": "노랑", "wx_shake": "{n}번째 획({j})이 떨렸어요 — 한 번에 쭉 그어요", "wx_g_jcursive": "ㅈ·ㅊ은 손으로는 ス처럼 이어 써도 돼요", "pn_세종대왕": "조선의 임금", "pn_경복궁": "조선의 궁궐", wx_g_strokes: "{c} — {n}획 · {l}", wx_g_how: "회색 선을 따라 순서대로 써 보세요", wx_g_follow: "👣 주황 점을 따라 그어 보세요", wx_g_magnet: "🧲 번호 순서대로 회색 획 가까이 그으면 붙어요", wx_g_time: "⏱ {s}초 안에 · 다 쓰면 바로 채점", wx_s_shape: "모양", wx_s_line: "선", wx_s_speed: "빠르기", wx_line: "{n}번째 획({j}) {w} {d} {a} 빠졌어요 — 회색 가운데 선에 붙어서", wx_w_start: "시작이", wx_w_mid: "가운데가", wx_w_end: "끝이", wx_d_up: "위로", wx_d_down: "아래로", wx_d_left: "왼쪽으로", wx_d_right: "오른쪽으로", wx_a_bit: "조금", wx_a_lot: "많이", wx_slow: "{n}번째 획({j})을 너무 천천히 그었어요({s}초 · 보통 {m}초) — 한 번에 쭉", wx_fast: "{n}번째 획({j})을 너무 빨리 그었어요({s}초 · 보통 {m}초) — 천천히 또박또박", wx_pause: "{n}번째 획({j})을 멈췄다 그었어요({p}초 멈춤) — 쉬지 말고 한 번에", wx_ok: "{n}번째 획({j}) 잘 썼어요", wx_sec: "{s}초", h_follow: "따라 쓰기", wx_missing: "{n}번째 획({j})이 빠졌어요 — 주황 점선을 따라 그어 보세요", wx_dir: "{n}번째 획({j}): {d}", wx_order: "{n}번째 획을 {m}번째 획보다 먼저 그었어요 — ✎ 순서를 보세요", wx_short: "{n}번째 획({j})이 짧아요 — 끝까지 그어요", wx_long: "{n}번째 획({j})이 회색 밖으로 나갔어요 — 끝에서 멈춰요", wx_tilt_h: "{n}번째 획({j})이 비뚤어요 — 가로로 곧게 그어요", wx_tilt_v: "{n}번째 획({j})이 비뚤어요 — 세로로 곧게 그어요", wx_bend: "{n}번째 획({j})이 휘었어요 — 회색 가운데를 따라 그어요", wx_pos_up: "글자가 너무 위에 있어요 — 회색 글자에 맞춰 써요", wx_pos_down: "글자가 너무 아래에 있어요 — 회색 글자에 맞춰 써요", wx_pos_left: "글자가 너무 왼쪽에 있어요 — 회색 글자에 맞춰 써요", wx_pos_right: "글자가 너무 오른쪽에 있어요 — 회색 글자에 맞춰 써요", wx_small: "글자가 너무 작아요 — 회색 글자만큼 크게 써요", wx_big: "글자가 너무 커요 — 회색 글자 안에 써요", wx_extra: "필요 없는 선이 있어요 — 지우고 다시 써 보세요", wx_time: "⏱ 시간이 다 됐어요 — 조금 더 빨리 써 보세요", wx_perfect: "완벽해요!", wx_good: "잘 썼어요!", wx_rest: "나머지는 잘 썼어요", h_undo_s: "한 획" },
    en: { "wx_keep_star": "Keep this one", "wx_keep_tip": "You can save your 100-point writing", "wx_keep": "Keepsake", "keep_title": "Keepsake", "keep_char": "One letter", "keep_word": "Whole word", "keep_name": "Name", "keep_print": "🖨 Print", "keep_pdf": "⬇ PDF", "keep_png": "⬇ Picture", "keep_need": "Needs 100", "keep_mine": "My Hangul", "keep_word_title": "My word", "keep_pdf_tip": "For PDF, choose “Save as PDF” in the print window", "h_ink": "Ink colour", "ink_black": "Black ink", "ink_navy": "Navy", "ink_blue": "Blue", "ink_red": "Red", "ink_green": "Green", "ink_purple": "Purple", "ink_brown": "Brown", "ink_gold": "Gold", "ink_yellow": "Yellow", "wx_shake": "Stroke {n} ({j}) is shaky — draw it in one smooth move", "wx_g_jcursive": "ㅈ·ㅊ: by hand you may join them like ス", "pn_세종대왕": "a king of Joseon", "pn_경복궁": "a Joseon royal palace", wx_g_strokes: "{c} — {n} strokes · {l}", wx_g_how: "Trace the grey lines in order", wx_g_follow: "👣 Follow the orange dot", wx_g_magnet: "🧲 Draw near each grey stroke in number order — it snaps", wx_g_time: "⏱ Within {s}s · checked as soon as you finish", wx_s_shape: "Shape", wx_s_line: "Line", wx_s_speed: "Speed", wx_line: "Stroke {n} ({j}): the {w} drifts {d} {a} — stay on the grey centre line", wx_w_start: "start", wx_w_mid: "middle", wx_w_end: "end", wx_d_up: "up", wx_d_down: "down", wx_d_left: "left", wx_d_right: "right", wx_a_bit: "a little", wx_a_lot: "a lot", wx_slow: "Stroke {n} ({j}) was too slow ({s}s · usual {m}s) — one smooth move", wx_fast: "Stroke {n} ({j}) was too fast ({s}s · usual {m}s) — slow down", wx_pause: "Stroke {n} ({j}) stopped midway ({p}s) — draw it without stopping", wx_ok: "Stroke {n} ({j}) — well done", wx_sec: "{s}s", h_follow: "Follow", wx_missing: "Stroke {n} ({j}) is missing — trace the orange dashes", wx_dir: "Stroke {n} ({j}): {d}", wx_order: "You drew stroke {n} before stroke {m} — see ✎ Order", wx_short: "Stroke {n} ({j}) is too short — draw it to the end", wx_long: "Stroke {n} ({j}) goes outside the grey — stop at the end", wx_tilt_h: "Stroke {n} ({j}) is slanted — draw it straight across", wx_tilt_v: "Stroke {n} ({j}) is slanted — draw it straight down", wx_bend: "Stroke {n} ({j}) wobbles — follow the middle of the grey", wx_pos_up: "The letter is too high — match the grey letter", wx_pos_down: "The letter is too low — match the grey letter", wx_pos_left: "The letter is too far left — match the grey letter", wx_pos_right: "The letter is too far right — match the grey letter", wx_small: "The letter is too small — write it as big as the grey one", wx_big: "The letter is too big — stay inside the grey letter", wx_extra: "There is an extra line — clear it and try again", wx_time: "⏱ Time's up — try writing a little faster", wx_perfect: "Perfect!", wx_good: "Well written!", wx_rest: "The rest is good", h_undo_s: "Undo" },
    ne: { "wx_keep_star": "यो लेखाइ राख्नुहोस्", "wx_keep_tip": "100 अङ्कको लेखाइ सुरक्षित गर्न सक्नुहुन्छ", "wx_keep": "सम्झना", "keep_title": "सम्झना", "keep_char": "एउटा अक्षर", "keep_word": "पूरा शब्द", "keep_name": "नाम", "keep_print": "🖨 छाप्नुहोस्", "keep_pdf": "⬇ PDF", "keep_png": "⬇ चित्र", "keep_need": "100 चाहिन्छ", "keep_mine": "मैले लेखेको हाङ्गुल", "keep_word_title": "मैले लेखेको शब्द", "keep_pdf_tip": "PDF का लागि छाप्ने झ्यालमा \"Save as PDF\" छान्नुहोस्", "h_ink": "मसीको रङ", "ink_black": "कालो मसी", "ink_navy": "गाढा नीलो", "ink_blue": "नीलो", "ink_red": "रातो", "ink_green": "हरियो", "ink_purple": "बैजनी", "ink_brown": "खैरो", "ink_gold": "सुनौलो", "ink_yellow": "पहेँलो", "wx_shake": "{n}औं धर्सो ({j}) काँप्यो — एकै पटक सरर कोर्नुहोस्", "wx_g_jcursive": "ㅈ·ㅊ हातले लेख्दा ス जस्तै जोडेर लेख्न सकिन्छ", "pn_세종대왕": "जोसनका राजा", "pn_경복궁": "जोसनको राजदरबार", wx_g_strokes: "{c} — {n} धर्सो · {l}", wx_g_how: "खरानी रेखा पछ्याउँदै क्रमैसँग लेख्नुहोस्", wx_g_follow: "👣 सुन्तला थोप्लो पछ्याएर कोर्नुहोस्", wx_g_magnet: "🧲 नम्बरको क्रममा खरानी धर्सो नजिक कोर्नुहोस् — टाँसिन्छ", wx_g_time: "⏱ {s} सेकेन्डभित्र · सकिनेबित्तिकै जाँच", wx_s_shape: "आकार", wx_s_line: "रेखा", wx_s_speed: "गति", wx_line: "{n}औं धर्सो ({j}) को {w} {d} {a} सर्क्यो — खरानी बीचको रेखामै कोर्नुहोस्", wx_w_start: "सुरु", wx_w_mid: "बीच", wx_w_end: "अन्त्य", wx_d_up: "माथि", wx_d_down: "तल", wx_d_left: "बायाँ", wx_d_right: "दायाँ", wx_a_bit: "अलिकति", wx_a_lot: "धेरै", wx_slow: "{n}औं धर्सो ({j}) धेरै ढिलो कोर्नुभयो ({s} सेकेन्ड · सामान्य {m}) — एकै पटकमा", wx_fast: "{n}औं धर्सो ({j}) धेरै छिटो कोर्नुभयो ({s} सेकेन्ड · सामान्य {m}) — बिस्तारै", wx_pause: "{n}औं धर्सो ({j}) बीचमा रोकियो ({p} सेकेन्ड) — नरोकी कोर्नुहोस्", wx_ok: "{n}औं धर्सो ({j}) राम्रो भयो", wx_sec: "{s} से.", h_follow: "पछ्याउनुहोस्", wx_missing: "{n}औं धर्सो ({j}) छुट्यो — सुन्तला थोप्ला-रेखा पछ्याएर कोर्नुहोस्", wx_dir: "{n}औं धर्सो ({j}): {d}", wx_order: "तपाईंले धर्सो {m} भन्दा पहिले धर्सो {n} कोर्नुभयो — ✎ क्रम हेर्नुहोस्", wx_short: "{n}औं धर्सो ({j}) छोटो भयो — अन्त्यसम्म कोर्नुहोस्", wx_long: "{n}औं धर्सो ({j}) खरानी रेखा बाहिर गयो — अन्त्यमा रोकिनुहोस्", wx_tilt_h: "{n}औं धर्सो ({j}) बाङ्गो भयो — सिधा तेर्सो कोर्नुहोस्", wx_tilt_v: "{n}औं धर्सो ({j}) बाङ्गो भयो — सिधा ठाडो कोर्नुहोस्", wx_bend: "{n}औं धर्सो ({j}) बाङ्गियो — खरानी रेखाको बीचबाट कोर्नुहोस्", wx_pos_up: "अक्षर धेरै माथि भयो — खरानी अक्षरमा मिलाएर लेख्नुहोस्", wx_pos_down: "अक्षर धेरै तल भयो — खरानी अक्षरमा मिलाएर लेख्नुहोस्", wx_pos_left: "अक्षर धेरै बायाँ भयो — खरानी अक्षरमा मिलाएर लेख्नुहोस्", wx_pos_right: "अक्षर धेरै दायाँ भयो — खरानी अक्षरमा मिलाएर लेख्नुहोस्", wx_small: "अक्षर धेरै सानो भयो — खरानी अक्षर जत्तिकै ठूलो लेख्नुहोस्", wx_big: "अक्षर धेरै ठूलो भयो — खरानी अक्षरभित्र लेख्नुहोस्", wx_extra: "नचाहिने रेखा छ — मेटाएर फेरि लेख्नुहोस्", wx_time: "⏱ समय सकियो — अलि छिटो लेखेर हेर्नुहोस्", wx_perfect: "उत्कृष्ट!", wx_good: "राम्रो लेख्नुभयो!", wx_rest: "बाँकी राम्रो छ", h_undo_s: "फिर्ता" } };
  // 낱말 뜻 줄(투덜이 10-15 「로마자는 빼고 뜻만」) — 고유 명사(뜻 속 「"세종대왕"」 처럼 한글 그대로인 이름) = 짧은 설명(pn_이름 · 고른 언어) · 그 언어 설명이 없으면 원래 뜻 그대로
  const meanOf = m => { const q = String(m || "").match(/"([가-힣]+)"/); if (!q) return m; const k = "pn_" + q[1], v = t(k); if (v !== k) return v; const W2 = WX[uiKoOn() ? "ko" : lang]; return W2?.[k] || m; };
  const tx = (k, v) => { const s0 = t(k, v); if (s0 !== k) return s0; let s1 = (WX[uiKoOn() ? "ko" : lang] || WX.en)[k] ?? WX.en[k] ?? k; if (v) for (const [a, b] of Object.entries(v)) s1 = s1.replace(`{${a}}`, b); return s1; };

  // ── 간직하기(대표님 10-15 · 🎉 100점 글씨만) ── 글자마다 100점 글씨를 이 기기에만 모음(최근 6개) · ⭐ 누른 것 = 그 글자 간직 글씨 · 안 눌렀으면 맨 마지막 100점 글씨
  //  A4 한 장 = 글자 한 장 / 낱말 한 장(낱말 모든 글자에 100점 글씨가 있을 때) · 🖨 인쇄(브라우저 인쇄 창 · PDF 도 거기서) · ⬇ 그림(PNG) · 서버로 안 보냄
  const KEEPK = "malmun.keep";
  const keepAll = () => { try { return JSON.parse(localStorage.getItem(KEEPK) || "{}"); } catch { return {}; } };
  const keepPut = all => { try { localStorage.setItem(KEEPK, JSON.stringify(all)); } catch {} };
  const keepOf = ch => { const k = keepAll()[ch]; if (!k?.list?.length) return null; return k.list.find(e => e.id === k.pick) || k.list[k.list.length - 1]; };
  function keepSave(ch, strokes, r) { const all = keepAll(), k = (all[ch] ||= { list: [], pick: null }), id = Date.now().toString(36);
    k.list.push({ id, t: Date.now(), ink: inkHex(), sc: [r.shapeP, r.lineP, r.speedP], s: strokes.map(S => ({ tool: S.tool, w: S.w, ink: S.ink, p: S.map(q => [+q[0].toFixed(4), +q[1].toFixed(4), +(q[2] ?? 1).toFixed(2)]) })) });
    while (k.list.length > 6) { const old = k.list.shift(); if (k.pick === old.id) k.pick = null; } keepPut(all); return id; }
  const keepStar = (ch, id) => { const all = keepAll(); if (all[ch]) { all[ch].pick = id; keepPut(all); } };
  const entryStrokes = e => e.s.map(o => Object.assign(o.p.map(q => q.slice()), { tool: o.tool, w: o.w, ink: o.ink || e.ink }));
  // A4(세로 · 150dpi 1240×1754) 그리기 — 내 획만(회색 글자 없음) · 테 두 줄(금색) · 아주 옅은 태극 원 · 네 귀 자모 · 낱말·뜻 · 편 이름 · 날짜 · 점수 · 이름 칸
  // 상장 띠 — a: ㄹ 이음(뇌문 · 옛 창살 띠) · b: ㅁ·ㅇ 번갈아(구슬 띠) · c: ㄱ·ㄴ 맞물림(엇갈린 꺾쇠 띠) · 모서리 = ㅁ 안 ㅇ 매듭 · 모두 선 그림(인쇄 깔끔)
  function sheetFrame(x, W, H, kind, corner) {
    const gold = "#c9a46a", soft = "#e3cfa8", m = 50, band = 46, i0 = m + band; x.save(); x.lineCap = "square"; x.lineJoin = "miter";
    x.strokeStyle = gold; x.lineWidth = 4; x.strokeRect(m, m, W - 2 * m, H - 2 * m); x.lineWidth = 2; x.strokeRect(i0, i0, W - 2 * i0, H - 2 * i0);
    const side = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux, u = band * 0.62, n = Math.max(1, Math.round(L / u)), st = L / n, h = band * 0.3;
      const P = (s0, t0) => [ax + ux * s0 + nx * t0, ay + uy * s0 + ny * t0], line = pts => { x.beginPath(); pts.forEach(([s0, t0], k) => { const [px, py] = P(s0, t0); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); };
      x.strokeStyle = gold; x.lineWidth = 2.6;
      for (let k = 0; k < n; k++) { const s0 = k * st, c = s0 + st / 2;
        if (kind === "a") line([[s0 + st * 0.15, h], [s0 + st * 0.85, h], [s0 + st * 0.85, 0], [s0 + st * 0.15, 0], [s0 + st * 0.15, -h], [s0 + st * 0.85, -h]]); /* ㄹ */
        else if (kind === "b") { if (k % 2) { x.beginPath(); const [px, py] = P(c, 0); x.arc(px, py, h * 0.8, 0, Math.PI * 2); x.stroke(); } else { const r = h * 0.75; line([[c - r, -r], [c + r, -r], [c + r, r], [c - r, r], [c - r, -r]]); } } /* ㅁ·ㅇ */
        else { line([[s0 + st * 0.1, -h], [s0 + st * 0.6, -h], [s0 + st * 0.6, h * 0.4]]); line([[s0 + st * 0.4, -h * 0.4], [s0 + st * 0.4, h], [s0 + st * 0.9, h]]); } } }; /* ㄱ·ㄴ 맞물림 */
    const c0 = m + band / 2, c1x = W - c0, c1y = H - c0, g = band * 0.5;
    side(c0 + g, c0, c1x - g, c0); side(c1x, c0 + g, c1x, c1y - g); side(c1x - g, c1y, c0 + g, c1y); side(c0, c1y - g, c0, c0 + g);
    const ck = corner || "o", R0 = band * 1.25; /* 모서리 장식 = 띠 폭 2.5배(대표님 10-20 「상장처럼 네 모서리에」) */
    for (const [cx, cy] of [[c0, c0], [c1x, c0], [c0, c1y], [c1x, c1y]]) { x.fillStyle = "#fffdf7"; x.fillRect(cx - R0, cy - R0, 2 * R0, 2 * R0); x.strokeStyle = gold; x.fillStyle = gold; x.lineWidth = 3;
      if (ck === "k") { /* ㄱ 넷이 바깥을 향해 네 귀를 감싼 사각 매듭 + 겹 ㅁ + 가운데 ㆍ (돌림 무늬 아님) */ const a0 = R0 * 0.92, a1 = R0 * 0.42; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.moveTo(cx + sx * a1, cy + sy * a0); x.lineTo(cx + sx * a0, cy + sy * a0); x.lineTo(cx + sx * a0, cy + sy * a1); x.stroke(); }
        const q = R0 * 0.62; x.strokeRect(cx - q, cy - q, 2 * q, 2 * q); x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); const q2 = R0 * 0.44; x.strokeRect(-q2, -q2, 2 * q2, 2 * q2); x.restore(); x.beginPath(); x.arc(cx, cy, R0 * 0.1, 0, Math.PI * 2); x.fill(); }
      else { /* ㅇ 겹고리 = 가운데 ㅇ + 네 귀 ㅇ 이 겹친 꽃 매듭 + 바깥 ㅁ */ const r = R0 * 0.36, off = R0 * 0.36; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); for (const [sx, sy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { x.beginPath(); x.arc(cx + sx * off, cy + sy * off, r, 0, Math.PI * 2); x.stroke(); } const q = R0 * 0.9; x.strokeRect(cx - q, cy - q, 2 * q, 2 * q); x.beginPath(); x.arc(cx, cy, R0 * 0.09, 0, Math.PI * 2); x.fill(); } }
    x.strokeStyle = soft; x.lineWidth = 1.5; x.strokeRect(i0 + 14, i0 + 14, W - 2 * i0 - 28, H - 2 * i0 - 28); x.restore(); }
  function drawSheet(cv, o) {
    const W = 1240, H = 1754; cv.width = W; cv.height = H; const x = cv.getContext("2d"), gold = "#c9a46a", brown = "#3b2a14", ff = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
    x.fillStyle = "#fffdf7"; x.fillRect(0, 0, W, H);
    sheetFrame(x, W, H, o.frame || "b", o.corner); x.textAlign = "center"; x.textBaseline = "middle"; /* 상장 테두리 = 자모로 짠 이어진 띠(대표님 10-20 「모서리 자모 빼고 상장 문양을 자모로」) · 한 가지 금색 · 햇살 무늬 없음 */
    x.fillStyle = "#9a7b4a"; x.font = `600 30px ${ff}`; x.fillText(o.ep, W / 2, 150); x.fillStyle = brown; x.font = `800 52px ${ff}`; x.fillText(o.title, W / 2, 222);
    const cx = W / 2, cy = 760, R = 470; x.save(); x.globalAlpha = 0.07; x.fillStyle = "#c0392b"; x.beginPath(); x.arc(cx, cy, R, Math.PI, 0); x.arc(cx + R / 2, cy, R / 2, 0, Math.PI, true); x.arc(cx - R / 2, cy, R / 2, 0, Math.PI); x.fill(); x.fillStyle = "#1e3a8a"; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI); x.arc(cx - R / 2, cy, R / 2, Math.PI, 0, true); x.arc(cx + R / 2, cy, R / 2, Math.PI, 0); x.fill(); x.restore();
    x.save(); x.strokeStyle = "#efe2c8"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke(); x.restore();
    const items = o.items, k = items.length, gap = 30, maxW = W - 260, cell = Math.min(k === 1 ? 760 : 520, (maxW - gap * (k - 1)) / k), y0 = cy - cell / 2, x0 = cx - (cell * k + gap * (k - 1)) / 2; // 글자 수에 맞춰 줄임(테 안에 다 · 10-15)
    items.forEach((it, i) => { const ox = x0 + i * (cell + gap); if (!it.e) { x.save(); x.setLineDash([16, 12]); x.strokeStyle = "#c9a46a"; x.lineWidth = 3; x.strokeRect(ox + 8, y0 + 8, cell - 16, cell - 16); x.restore(); x.fillStyle = "#cdbb98"; x.font = `800 ${Math.round(cell * 0.5)}px ${ff}`; x.fillText(it.ch, ox + cell / 2, y0 + cell / 2); x.fillStyle = "#9a7b4a"; x.font = `700 ${Math.max(22, Math.round(cell * 0.08))}px ${ff}`; x.fillText(o.need, ox + cell / 2, y0 + cell - 40); return; }
      x.save(); x.translate(ox, y0); inkPath(x, cell, entryStrokes(it.e), 0, null, true); x.restore(); });
    if (o.word) { x.fillStyle = brown; x.font = `800 64px ${ff}`; x.fillText(o.word, W / 2, 1300); x.fillStyle = "#7a5a2c"; x.font = `500 38px ${ff}`; x.fillText(o.mean || "", W / 2, 1372); } else if (o.mean) { x.fillStyle = "#7a5a2c"; x.font = `600 48px ${ff}`; x.fillText(o.mean, W / 2, 1320); } /* 한글 낱말 되풀이 없음 · 뜻만(대표님 10-20) */
    x.textAlign = "left"; x.fillStyle = "#9a7b4a"; x.font = `600 24px ${ff}`; x.fillText(o.nameLab, 150, 1500); x.strokeStyle = "#b89a6a"; x.lineWidth = 2; x.beginPath(); x.moveTo(150, 1572); x.lineTo(560, 1572); x.stroke(); if (o.name) { x.fillStyle = brown; x.font = `700 40px ${ff}`; x.fillText(o.name, 156, 1550); }
    x.textAlign = "right"; x.fillStyle = "#9a7b4a"; x.font = `600 24px ${ff}`; if (o.dateLab) x.fillText(o.dateLab, W - 150, 1500); x.fillStyle = "#6b5a40"; x.font = `600 34px ${ff}`; x.fillText(o.date, W - 150, 1546); if (o.sc) { x.font = `600 24px ${ff}`; x.fillStyle = "#9a7b4a"; x.fillText(o.sc, W - 150, 1590); }
    x.textAlign = "center"; x.fillStyle = "#b89a6a"; x.font = `600 20px ${ff}`; x.fillText("MALMUN · 한글 손글씨", W / 2, H - 140);
  }
  // 간직 창(대표님 10-20) = A4 그림(잘 쓴 그 글씨 한 장) + 이름 칸 + 아래 아이콘(🖨 인쇄 · 📄 PDF · 🖼 그림) 만 · 위 = ⇄(모든 창 기본) · ✕ · 글자/낱말 고르기·글자 칩·안내 글 없앰 · 아이콘 뜻은 처음 한 번 풍선말
  function keepOpen() {
    document.querySelector(".keepov")?.remove(); const w = words()[st.w], only = w.chars[st.c].ch, e0 = keepOf(only); if (!e0) return;
    const ov = document.createElement("div"); ov.className = "keepov"; ov.setAttribute("role", "dialog");
    const date = new Date().toISOString().slice(0, 10), nm = (() => { try { return localStorage.getItem("malmun.keepname") || ""; } catch { return ""; } })();
    const sv = d0 => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d0}</svg>`;
    const ic = [["print", sv('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'), "keep_print"], ["pdf", sv('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 12v6M9 15l3 3 3-3"/>') + "<b>PDF</b>", "keep_pdf"], ["png", sv('<rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="8" r="1.5"/><path d="M21 13l-5-5-9 9"/><path d="M12 19v3M9.5 20.5 12 22l2.5-1.5"/>'), "keep_png"]], lab = k => tx(k).replace(/^[🖨⬇]️?\s*/u, "");
    ov.innerHTML = `<div class="kp"><div class="kh">${uikoChip()}<button class="kx" data-kact="close">✕</button></div>
      <div class="kcv"><canvas></canvas></div>
      <label class="kname"><span aria-hidden="true">✎</span><input type="text" maxlength="24" value="${esc(nm)}"></label>
      <div class="kbtns">${ic.map(([a, g]) => `<button data-kact="${a}">${g}</button>`).join("")}</div></div>`;
    document.body.append(ov); const cv = ov.querySelector("canvas");
    const retx = () => { ov.setAttribute("aria-label", tx("keep_title")); ov.querySelector(".kx").setAttribute("aria-label", t("close_btn")); const ni = ov.querySelector(".kname input"); ni.setAttribute("placeholder", tx("keep_name")); ni.setAttribute("aria-label", tx("keep_name")); /* 이름 = 칸 안 흐린 글만(⇄ 0px) */
      ic.forEach(([a, , k]) => { const b = ov.querySelector(`[data-kact=${a}]`); b.setAttribute("aria-label", lab(k)); b.title = lab(k); }); ov.querySelectorAll("[data-act=uiko]").forEach(b => b.setAttribute("aria-pressed", String(uiKoOn()))); };
    const draw = () => { const name = ov.querySelector(".kname input").value.trim(); drawSheet(cv, { items: [{ ch: only, e: e0 }], ep: `말문 · ${d.title || ""}`, title: tx("keep_mine"), word: "", mean: w.mean ? meanOf(w.mean) : "", nameLab: tx("keep_name"), name, dateLab: "", date, need: tx("keep_need"), sc: "" }); };
    const onLang = () => { if (!ov.isConnected) return window.removeEventListener("malmun:uilang", onLang); retx(); draw(); }; window.addEventListener("malmun:uilang", onLang); /* ⇄ = 글만 바뀜(창 틀 그대로) */
    const tipOff = () => ov.querySelector(".ktip2")?.remove();
    ov.addEventListener("click", ev => { const t0 = ev.target.closest("button, .keepov"); if (ev.target === ov) return ov.remove(); if (!t0 || t0 === ov) return; tipOff();
      const a2 = t0.dataset.kact; if (a2 === "close") return ov.remove();
      if (a2 === "png") { const aEl = document.createElement("a"); aEl.href = cv.toDataURL("image/png"); aEl.download = `malmun_${only}_${date}.png`; document.body.append(aEl); aEl.click(); aEl.remove(); return; }
      if (a2 === "print" || a2 === "pdf") { document.querySelector(".keepprint")?.remove(); const ps = document.createElement("div"); ps.className = "keepprint"; ps.innerHTML = `<img alt="" src="${cv.toDataURL("image/png")}">`; document.body.append(ps); const done = () => { ps.remove(); window.removeEventListener("afterprint", done); }; window.addEventListener("afterprint", done); setTimeout(() => window.print(), 50); return; } });
    ov.querySelector(".kname input").addEventListener("input", e => { try { localStorage.setItem("malmun.keepname", e.target.value.trim()); } catch {} draw(); });
    retx(); document.fonts?.ready.then(draw); draw();
    let seen = false; try { seen = localStorage.getItem("malmun.keeptip2") === "1"; localStorage.setItem("malmun.keeptip2", "1"); } catch {} /* 아이콘 뜻 = 처음 한 번 풍선말 · 누르면 사라짐 */
    if (!seen) { const tp = document.createElement("div"); tp.className = "ktip2"; tp.setAttribute("role", "status"); tp.innerHTML = ic.map(([, g, k]) => `<span>${g.replace("<b>PDF</b>", "")} ${esc(lab(k))}</span>`).join(""); ov.querySelector(".kbtns").append(tp); setTimeout(tipOff, 6000); }
  }
  // 판정 상자(투덜이 10-15) — 채점 뒤 1~3줄 · 상자 크기는 늘 같음 → 넘치면 글자 줄임(최소 12px) → 그래도 넘치면 뒤 줄부터 뺌
  function judgeLines(r, timeUp, ch = st.hand.ch, S = st.hand.strokes) {
    const ex = handExplain(ch, S, r), it = ex.items, L = [], pass = r.pass ?? r.pct >= 80, star = pass && (r.total ?? r.pct) >= 95;
    const tt = (r.ex?.sp?.per || []).map(o => { const Q = S[o.i]; return Q?.length ? { x: Q[Q.length - 1][0], y: Q[Q.length - 1][1], s: o.dur.toFixed(1), ok: o.ratio <= 2 && o.ratio >= 0.4 && o.pause <= 0.4 } : null; }).filter(Boolean); // 칸에 획마다 걸린 시간(2초)
    if (pass) { L.push({ k: star && !it.length ? "wx_perfect" : "wx_good", ok: 1 }); L.push(...it.slice(0, 2)); return { L, it: L.filter(o => o.j != null || o.s != null), tt }; } // 통과 = 칭찬 + 조언 둘까지(선·빠르기)
    if (ex.good && it.length) L.push(ex.good); L.push(...it.slice(0, timeUp ? 2 : 3)); /* 잘 쓴 획 ✓ 먼저 → 모양 → 선 → 빠르기(가장 중요한 것부터 세 줄) */
    if (!it.length) L.push(r.dir ? { raw: r.dir } : { k: "h_again" }); if (timeUp) L.push({ k: "wx_time" });
    return { L, it: L.filter(o => o.j != null || o.s != null), tt };
  }
  // 안내 소리(대표님 10-21 「쓰기도 다 말을 넣어 주자 · 설명처럼」 · 설계 _hq/design_write_feedback_voice.md) — 개발2팀 fbvoice 를 같이 씀(조각 소리 · 불 · ⇄ 이어 읽기 · 겹침 막기)
  //  쓰기부 몫 = 읽을 차례(열쇠 + 칸 값 → 소리 칸) · 판정 상자에 묶기 · 🎉 덮개가 걷힌 뒤 · 새로 긋기·지우기·다음·글자 바뀜에 멈춤
  const fbSlot = (name, val) => typeof val === "number" ? { n: val } : typeof val === "string" && /^(wx_|h_dir_)/.test(val) ? { sub: [{ key: val, vars: {}, slots: {} }] } : typeof val === "string" && /^\d+$/.test(val) ? { n: +val } : typeof val === "string" && /^[ㄱ-ㆎ\s]+$/.test(val) ? { jamo: val } : typeof val === "string" && /[가-힣]/.test(val) ? { ko: val } : {};
  function fbJudge(jx) { const out = []; if (jx.sc != null) out.push({ num: jx.sc });
    for (const o of jx.L) { if (!o.k || o.raw != null) continue; const vars = {}, slots = {}; for (const [a, b] of Object.entries(o.v || {})) { vars[a] = typeof b === "string" && /^(wx_|h_dir_)/.test(b) ? tx(b) : String(b); slots[a] = fbSlot(a, b); } out.push({ key: o.k, vars, slots }); }
    return out; }
  function fbSay(bx, plan, fresh) { if (!FBV || !bx) return; if (st.fb?.el !== bx) { st.fb?.off(); st.fb = FBV.fbBind(bx, { canPlay: () => st.alive && !document.querySelector(".fxfull") && !st.auto && !(st.hand?.cur) }); st.fb.el = bx; }
    clearTimeout(st.fbWait); const go = () => { if (!st.alive || st.fb?.el !== bx || !bx.isConnected) return; if (fresh && document.querySelector(".fxfull")) { st.fbWait = setTimeout(go, 250); return; } st.fb.set(plan, fresh); }; go(); } /* 🎉 덮개·팡파레가 끝난 뒤 자동 읽기 */
  const fbStop = () => { clearTimeout(st.fbWait); st.fb?.stop(); };
  // 채점 전 안내(투덜이 10-15 「빈 흰 칸이라 허전」) — 「이 — 2획 · ① ㅇ ② ㅣ」 + 쓰는 법(회색 따라 / 👣 주황 점 / 🧲 자석) + ⏱ 시간 · 처음 6글자는 셋 다, 그 뒤엔 획 줄 + 쓰는 법만 · 상자 크기 그대로
  const koEsc = x => esc(x).replace(/[가-힣ㄱ-ㅣ]+/g, m => `<span class="ko" lang="ko">${m}</span>`); // 판정 글 속 배우는 한국어(글자·자모) = lang=ko(학습자 언어 글과 구분)
  function showGuide(H = st.hand) {
    const bx = work.querySelector(".hjudge"); if (!bx || !H || H.jx || H.hintOn || st.hand !== H) return; const list = SK.STK ? strokesOf(H.ch) : []; if (!list.length) return;
    let seen = 0; try { seen = +localStorage.getItem("malmun.wguide") || 0; if (!H.guideCounted) { H.guideCounted = true; localStorage.setItem("malmun.wguide", String(seen + 1)); } } catch {}
    const nums = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳", gl = list.map((S, i) => `${nums[i] || i + 1} ${S.jamo || ""}`).join(" "), how = magnetOn() ? "wx_g_magnet" : followOn() ? "wx_g_follow" : "wx_g_how", L = [tx("wx_g_strokes", { c: H.ch, n: list.length, l: gl }), tx(how)];
    const P = [{ key: "wx_g_strokes", vars: { c: H.ch, n: String(list.length), l: gl }, slots: { c: { ko: H.ch }, n: { n: list.length }, l: { jamo: list.map(S => S.jamo || "").join("") } } }, { key: how, vars: {}, slots: {} }]; /* 소리 차례(글과 1:1) */
    if (list.some(S => /[ㅈㅊㅉ]/.test(S.jamo || ""))) { L.push(tx("wx_g_jcursive")); P.push({ key: "wx_g_jcursive", vars: {}, slots: {} }); } /* 글자부 10-15 ㅈ·ㅊ 자료 = 고딕 3·4획 → 손으로는 ス처럼 이어 써도 됨 */
    if (seen < 6 && !magnetOn()) { const s0 = Math.round(4 + 2.5 * list.length); L.push(tx("wx_g_time", { s: s0 })); P.push({ key: "wx_g_time", vars: { s: String(s0) }, slots: { s: { n: s0 } } }); } /* 시간 = startTimer 와 같은 셈 */
    judgeFull(false); H.guideOn = true; bx.className = "hjudge guide"; bx.innerHTML = L.map((x, i) => `<p${i ? "" : ' class="g1"'}>${koEsc(x)}</p>`).join(""); fitJudge();
    fbSay(bx, P, !H.guideSaid && st.w === 0 && st.c === 0); H.guideSaid = true; /* 채점 전 안내 = 그 줄 첫 글자만 자동(본부 10-21) · 나머지는 상자 눌러 듣기 */
  }
  function showJudge(jx) {
    const bx = work.querySelector(".hjudge"); if (!bx) return; judgeFull(false); st.hand && (st.hand.jx = jx, st.hand.guideOn = false); if (!jx) { bx.innerHTML = ""; bx.className = "hjudge"; return showGuide(); }
    const N = "❶❷❸❹", pass = jx.L[0]?.ok && /wx_good|wx_perfect/.test(jx.L[0].k); bx.className = "hjudge " + (pass ? "ok" : "bad"); let n = 0;
    const vv = v => v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, typeof b === "string" && /^(wx_|h_dir_)/.test(b) ? tx(b) : b])); /* 낱말 열쇠(방향·자리·크기) = 그릴 때 그 언어로(⇄) */
    const keepRow = jx.keep ? `<p class="keeprow"><button data-act="keepsheet" aria-label="${esc(tx("wx_keep_star"))}">💾 <span class="kl">${esc(tx("wx_keep_star"))}</span></button></p>` : ""; /* 100점 = 단추 하나 「💾 이 글씨 간직」 → 이 글씨를 대표로 고르고 바로 A4 저장 창(대표님 10-20 「저장 기능이 안 보여」 · 단추 둘 → 하나) */
    bx.innerHTML = keepRow + jx.L.map(o => `<p${o.ok ? ' class="ok"' : ""}><i>${o.ok ? (o.k === "wx_ok" ? "✓" : "") : N[n++] || ""}</i>${o.cat ? `<b class="tg tg-${o.cat}">${esc(tx("wx_s_" + o.cat))}</b>` : ""}${koEsc(o.raw ?? tx(o.k, vv(o.v)))}</p>`).join(""); fitJudge(); if (jx.keep) keepTip();
    fbSay(bx, fbJudge(jx), jx.fresh); jx.fresh = false; /* 판정 소리로 읽기(대표님 10-21 · 개발2팀 fbvoice) — 점수 → 칭찬 → 줄 ❶❷❸ · ⇄ 다시 그리면 같은 줄부터 그 말로 */
  }
  // 💾 단추 글 = 단추 폭 안에 들 때까지 글자만 줄임(8px 까지 · 그래도 길면 두 줄) · 단추 크기·상자 틀 그대로(21개 언어 가장 긴 글 · 대표님 10-20 잘림)
  function fitKeep() { const b = work.querySelector(".hjudge .keeprow button"), m = b?.querySelector(".kl"); if (!m) return; m.style.removeProperty("font-size"); b.classList.remove("wrap2", "ic"); const over = () => { const br = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b); const r = rg.getBoundingClientRect(); return b.scrollWidth > b.clientWidth + 1 || r.right > br.right - 4 || r.left < br.left + 4 || r.bottom > br.bottom + 1; };
    for (let f = parseFloat(getComputedStyle(m).fontSize) - 0.5; f >= 8 && over(); f -= 0.5) m.style.fontSize = f + "px"; if (over()) { b.classList.add("wrap2"); m.style.removeProperty("font-size"); for (let f = parseFloat(getComputedStyle(m).fontSize) - 0.5; f >= 7.5 && over(); f -= 0.5) m.style.fontSize = f + "px"; }
    const bx = b.closest(".hjudge"); if (bx && b.offsetHeight > bx.clientHeight - 4) { b.classList.remove("wrap2"); m.style.removeProperty("font-size"); b.classList.add("ic"); } } /* 판정 상자가 단추보다 낮으면(320 ur 37px) 💾 그림만(이름은 aria · 처음 풍선말) */
  // 처음 100점 때 한 번 풍선말 「100점 글씨를 저장할 수 있어요」(💾 단추 위 · 누르거나 5초 뒤 사라짐 · 자리 0px = 덮개)
  const keepTipOff = () => { clearTimeout(st.keepTipT); app.querySelector(".keeptip")?.remove(); };
  function keepTip(tries = 0) { let seen = false; try { seen = localStorage.getItem("malmun.keeptip") === "1"; } catch {} if (seen || !st.alive) return; keepTipOff(); const b = work.querySelector(".hjudge .keeprow button"), wr = app.querySelector(".scr.write"); if (!b || !wr) return;
    if (document.querySelector(".fxfull") && tries < 25) { st.keepTipT = setTimeout(() => keepTip(tries + 1), 200); return; } /* 🎉 100점 덮개가 걷힌 뒤에 */ try { localStorage.setItem("malmun.keeptip", "1"); } catch {}
    const t = document.createElement("div"); t.className = "keeptip"; t.setAttribute("role", "status"); t.textContent = tx("wx_keep_tip"); wr.append(t); const R = wr.getBoundingClientRect(), r = b.getBoundingClientRect(), w = Math.min(t.offsetWidth, R.width - 16); t.style.maxWidth = (R.width - 16) + "px";
    t.style.left = Math.round(Math.max(8, Math.min(R.width - w - 8, r.left - R.left + r.width / 2 - w / 2))) + "px"; t.style.top = Math.round(r.top - R.top - t.offsetHeight - 8) + "px"; t.style.setProperty("--ax", Math.round(r.left - R.left + r.width / 2 - parseFloat(t.style.left)) + "px"); t.addEventListener("pointerdown", keepTipOff); st.keepTipT = setTimeout(keepTipOff, 5000); }
  // 손글씨 단추 글 = 정해진 단추 폭 안에 들 때까지 글자만 줄임(12.5 → 9.5px · 그래도 길면 …) · 단추 크기는 그대로
  function fitHbtn() { work.querySelectorAll(".hbtns > button .ml, .hbtns > button .ms").forEach(m => { m.style.removeProperty("font-size"); if (!m.offsetWidth) return; const b = m.parentElement, d = m.querySelector(".dl"), sp = d?.firstElementChild; /* 두 겹 글 = 보이는 글·숨은 긴 글(::after) 중 넓은 쪽이 단추 안에 들 때까지 */
    const out = () => { if (!sp) return false; const br = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(sp); const r = rg.getBoundingClientRect(); return r.width > 0 && (r.left < br.left + 2 || r.right > br.right - 2); }; /* 양쪽 2px 여유(글꼴 차이) */ /* 가운데 맞춘 글이 양쪽으로 넘침(scrollWidth 로는 왼쪽 넘침이 안 잡힘) */
    const over = () => b.scrollWidth > b.clientWidth + 1 || m.scrollWidth > m.clientWidth + 1 || (sp && (sp.scrollWidth > sp.clientWidth + 1 || sp.scrollHeight > sp.clientHeight + 1)) || (d && d.getBoundingClientRect().right > b.getBoundingClientRect().right - 2 && d.scrollWidth > d.clientWidth + 1) || out();
    m.classList.remove("wrap2"); for (let f = parseFloat(getComputedStyle(m).fontSize) - 0.5; f >= 8 && over(); f -= 0.5) m.style.fontSize = f + "px";
    if (over()) { m.classList.add("wrap2"); m.style.removeProperty("font-size"); for (let f = parseFloat(getComputedStyle(m).fontSize) - 0.5; f >= 7.5 && over(); f -= 0.5) m.style.fontSize = f + "px"; } }); } /* 그래도 넘치면 두 줄로 나눠 다시 맞춤(대표님 10-16 「…」 없이) */
  // 먹 색 목록 — 🎨 단추 바로 아래(창 안으로) · 손글씨 칸·판정 상자를 가려도 고르면 바로 닫힘 · 바깥 누르면 닫힘(⇄ 는 안 닫음 · 글만 그 언어로)
  function inkMenu(on) { app.querySelector(".inkmenu")?.remove(); const btn = app.querySelector(".inkb"); btn?.setAttribute("aria-expanded", String(!!on)); if (!on || !btn) return; const wr = app.querySelector(".scr.write"), R = wr.getBoundingClientRect(), r = btn.getBoundingClientRect(), m = document.createElement("div");
    m.className = "inkmenu"; m.setAttribute("role", "listbox"); m.innerHTML = INKS.map(([k, hex]) => `<button data-act="inkset" data-ink="${k}" role="option" aria-selected="${k === inkKey()}"><i class="sw" style="background:${hex}"></i><span>${esc(tx("ink_" + k))}</span></button>`).join(""); wr.append(m);
    const w = m.offsetWidth; m.style.top = Math.round(r.bottom - R.top + 4) + "px"; m.style.left = Math.round(Math.max(4, Math.min(R.width - w - 4, r.right - R.left - w))) + "px"; }
  const onInkOut = e => { const m = app.querySelector(".inkmenu"); if (!m || m.contains(e.target) || e.target.closest?.(".inkb, [data-act=uiko]")) return; inkMenu(false); }; document.addEventListener("pointerdown", onInkOut, true);
  function fitJudge() { const bx = work.querySelector(".hjudge"); if (!bx) return; bx.style.removeProperty("font-size"); bx.querySelectorAll("p").forEach(p => (p.hidden = false)); const over = () => bx.scrollHeight > bx.clientHeight + 1 || bx.scrollWidth > bx.clientWidth + 1;
    for (let f = parseFloat(getComputedStyle(bx).fontSize) - 0.5; f >= 12 && over(); f -= 0.5) bx.style.fontSize = f + "px";
    // 줄 나누기(본부 10-15 「한국어엔 ❶ 하나, 네팔어엔 ❶❷」 — 글이 긴 언어에서 뒤 줄을 통째로 숨기던 것) = 상자에 들어가는 글 줄 수를 설명 줄마다 고르게 나눔(모자라면 줄마다 … ) · 줄 수·순서는 언어와 상관없이 같음 · 한 줄씩도 안 되면 그때만 뒤 줄을 숨김
    fitKeep(); const kr = bx.querySelector("p.keeprow"), krH = kr ? kr.offsetHeight + (parseFloat(getComputedStyle(kr).marginBottom) || 0) : 0; /* 💾 줄은 늘 보이고 줄 나누기에서 뺌 */
    const ps = [...bx.querySelectorAll("p:not(.keeprow)")]; ps.forEach(p => p.style.removeProperty("-webkit-line-clamp"));
    if (over() && ps.length) { const cs = getComputedStyle(bx), lh = parseFloat(getComputedStyle(ps[0]).lineHeight) || 18, mb = parseFloat(getComputedStyle(ps[0]).marginBottom) || 0, inner = bx.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - krH;
      let n = ps.length; while (n > 1 && Math.floor((inner - mb * (n - 1)) / lh) < n) ps[--n].hidden = true; /* 한 줄씩도 안 되는 아주 작은 상자 */
      const avail = Math.max(n, Math.floor((inner - mb * (n - 1)) / lh)), need = ps.slice(0, n).map(p => Math.max(1, Math.round(p.offsetHeight / lh))), give = need.map(() => 1); let left = avail - n;
      for (let more = true; left > 0 && more; ) { more = false; for (let i = 0; i < n && left > 0; i++) if (give[i] < need[i]) { give[i]++; left--; more = true; } }
      ps.slice(0, n).forEach((p, i) => { if (give[i] < need[i]) p.style.setProperty("-webkit-line-clamp", String(give[i])); });
      for (let k = 0; k < 6 && over(); k++) { const i = give.reduce((b, v, j) => (v > give[b] ? j : b), 0); if (give[i] <= 1) break; give[i]--; ps[i].style.setProperty("-webkit-line-clamp", String(give[i])); } } /* ur 처럼 글꼴 키가 줄높이보다 크면 한 줄씩 더 줄임 */
    { const lim = bx.getBoundingClientRect().bottom - (bx.offsetHeight - bx.clientHeight) / 2 - (parseFloat(getComputedStyle(bx).paddingBottom) || 0) + 0.5; /* 마지막 지킴: 반만 보이는 줄이 없게(10-15 375 ❷ 반쪽) */
      for (let i = ps.length - 1; i >= 0; i--) { const q = ps[i]; if (q.hidden) continue; for (let k = 0; k < 6 && q.getBoundingClientRect().bottom > lim; k++) { const g = +q.style.getPropertyValue("-webkit-line-clamp") || Math.max(1, Math.round(q.offsetHeight / (parseFloat(getComputedStyle(q).lineHeight) || 18))); if (g <= 1) break; q.style.setProperty("-webkit-line-clamp", String(g - 1)); } if (i > 0 && q.getBoundingClientRect().bottom > lim) q.hidden = true; } }
    const cut = ps.some(q => q.hidden || (q.style.getPropertyValue("-webkit-line-clamp") && q.scrollHeight > q.clientHeight + 1)); bx.classList.toggle("cut", cut); let mb = bx.querySelector(".jmore"); /* 다 못 보이면 「⋯」 단추 → 누르면 칸 위에 전체 글(검사부 10-15 320 「…」 로 끝까지 못 읽음) */
    ps.forEach(q => q.classList.remove("jm")); if (cut) [...ps].reverse().find(q => !q.hidden)?.classList.add("jm"); /* 「⋯」 단추가 마지막 줄 글을 덮지 않게 그 줄 끝만 비움(대표님 10-19 PC 880 겹침 · 틀 그대로) */ if (cut && !mb) { mb = document.createElement("button"); mb.className = "jmore"; mb.dataset.act = "jmore"; mb.textContent = "⋯"; bx.append(mb); } if (mb) mb.setAttribute("aria-label", "⋯"); /* 이름에 배우는 한국어를 넣지 않음(학습자 언어 글과 섞임 · write_ext ⓑ) */ if (!cut) mb?.remove(); } /* ur 나스탈리크처럼 글꼴 키가 줄높이보다 크면 한 줄 더 줄임 */
  function judgeFull(on) { const box = work.querySelector(".hbox"), bx = work.querySelector(".hjudge"); box?.querySelector(".hjfull")?.remove(); if (!on || !box || !bx) return; const d = document.createElement("div"); d.className = "hjfull"; d.dataset.act = "jfull"; d.innerHTML = [...bx.querySelectorAll("p:not(.keeprow)")].map(p => `<p class="${p.className}">${p.innerHTML}</p>`).join(""); box.append(d); } // 한 줄도 다 안 들어가면 그 줄을 들어가는 만큼만(… 로 끝)
  // 손글씨 칸에 잠깐(2초) — 틀린 내 획 빨강 · 맞는 획 주황 점선 + 번호 + 끝 화살
  function drawFix(r, jx) {
    const H = st.hand, cv = work.querySelector(".hfix"); if (!H || !cv) return; clearTimeout(H.fixT); const x = cv.getContext("2d"), n = cv.width; x.clearRect(0, 0, n, n); if (!(jx?.it.length || jx?.tt?.length) || !r.ex) return;
    const red = getComputedStyle(work).getPropertyValue("--badc").trim() || "#c0392b", okc = getComputedStyle(work).getPropertyValue("--okc").trim() || "#23794a", org = "#e08a1e", S0 = H.strokes.map(S => S.slice());
    x.lineCap = x.lineJoin = "round";
    const vis = [...work.querySelectorAll(".hjudge p")].map(p => !p.hidden); /* 상자에 보이는 줄만 칸에 짚음 */
    jx.L.forEach((o, li) => { if (vis[li] === false || o.cat === "speed") return; /* 빠르기 = 아래 시간 꼬리표로만 */ if (o.s != null && S0[o.s]) { const S = S0[o.s]; x.strokeStyle = red; x.lineWidth = Math.max(3, (H.strokes[o.s].w ?? TOOLS[toolKey()].w) * n); x.setLineDash([]); x.beginPath(); S.forEach((p, i) => (i ? x.lineTo(p[0] * n, p[1] * n) : x.moveTo(p[0] * n, p[1] * n))); x.stroke(); }
      if (o.shake?.length) { x.fillStyle = red; x.globalAlpha = 0.85; const r0 = Math.max(2.5, n * 0.012); for (const [px, py] of o.shake) { x.beginPath(); x.arc(px * n, py * n, r0, 0, 7); x.fill(); } x.globalAlpha = 1; } /* ② 떨린 자리 빨간 점 */
      if (o.mk) { const [ax, ay, bx2, by] = o.mk.map(v => v * n), an = Math.atan2(by - ay, bx2 - ax), h = Math.max(7, n * 0.035); x.strokeStyle = x.fillStyle = red; x.lineWidth = Math.max(2, n * 0.01); x.setLineDash([]); x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx2, by); x.stroke(); x.beginPath(); x.moveTo(bx2, by); x.lineTo(bx2 - Math.cos(an - 0.5) * h, by - Math.sin(an - 0.5) * h); x.lineTo(bx2 - Math.cos(an + 0.5) * h, by - Math.sin(an + 0.5) * h); x.fill(); } /* ② 선 = 바른 길 → 가장 많이 벗어난 내 점 빨간 화살 */
      const Q = o.j != null ? r.ex.fps[o.j] : null; if (!Q || Q.length < 2) return; const lw = Math.max(3, n * 0.028);
      x.strokeStyle = org; x.lineWidth = lw; x.setLineDash([lw * 1.4, lw * 1.1]); x.beginPath(); Q.forEach((q, i) => (i ? x.lineTo(q.x * n, q.y * n) : x.moveTo(q.x * n, q.y * n))); x.stroke(); x.setLineDash([]);
      const b = Q[Q.length - 1], a = Q[Math.max(0, Q.length - 4)], an = Math.atan2(b.y - a.y, b.x - a.x), h = lw * 2.4; x.fillStyle = org; x.beginPath(); x.moveTo(b.x * n + Math.cos(an) * h * 0.6, b.y * n + Math.sin(an) * h * 0.6); x.lineTo(b.x * n + Math.cos(an + 2.5) * h, b.y * n + Math.sin(an + 2.5) * h); x.lineTo(b.x * n + Math.cos(an - 2.5) * h, b.y * n + Math.sin(an - 2.5) * h); x.fill();
      const rr = Math.max(8, n * 0.04); x.fillStyle = "#7a3410"; x.beginPath(); x.arc(Q[0].x * n, Q[0].y * n, rr, 0, 7); x.fill(); x.fillStyle = "#fff"; x.font = `700 ${Math.round(rr * 1.2)}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(o.j + 1), Q[0].x * n, Q[0].y * n + rr * 0.06); });
    (jx.tt || []).forEach(o => { const f = Math.max(10, Math.round(n * 0.045)), lbl = tx("wx_sec", { s: o.s }); x.font = `800 ${f}px sans-serif`; const w = x.measureText(lbl).width + f, px = Math.min(n - w - 2, Math.max(2, o.x * n + f * 0.4)), py = Math.min(n - f * 1.5 - 2, Math.max(2, o.y * n + f * 0.4)); x.fillStyle = o.ok ? "rgba(227,243,232,.95)" : "rgba(251,229,225,.95)"; x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, f * 1.5, f * 0.75); else x.rect(px, py, w, f * 1.5); x.fill(); x.fillStyle = o.ok ? okc : red; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(lbl, px + w / 2, py + f * 0.78); }); /* ③ 빠르기 = 획 끝에 걸린 시간(초록 좋음 · 빨강 너무 느림·빠름·멈춤) */
    H.fixT = setTimeout(() => x.clearRect(0, 0, n, n), 2000);
  }
  function clearFix() { const H = st.hand, cv = work.querySelector(".hfix"); if (H) clearTimeout(H.fixT); cv?.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
  function startTimer(H) {
    if (!H || H.tStart || st.auto || H.passed || magnetOn() || !SK.STK) return; const n = strokesOf(H.ch).length || 3; H.tLimit = (4 + 2.5 * n) * 1000; H.tStart = performance.now();
    const bar = work.querySelector(".htime"); bar?.classList.add("on"); clearInterval(H.tInt);
    const tick = () => { if (!st.alive || st.hand !== H || !H.tStart) return clearInterval(H.tInt); const left = Math.max(0, H.tLimit - (performance.now() - H.tStart)); if (bar) { bar.querySelector("i").style.width = (100 * left / H.tLimit).toFixed(1) + "%"; bar.querySelector("b").textContent = Math.ceil(left / 1000); bar.classList.toggle("low", left < 3000); }
      if (left <= 0) { stopTimer(H); H.timeUp = true; if (H.cur) H.up?.(); /* 긋는 중이면 그 획을 바로 끝냄 */ if (H.strokes.length && !H.passed) handJudge(true); else H.timeUp = false; } /* 시간 끝 = 바로 채점 · 그 뒤 획 입력 막음(투덜이 10-15 「시간이 다 지나도 계속 써져」 — 긋는 중에 시간이 끝나면 손 뗀 뒤 50ms 안에 다음 획을 시작하면 채점을 건너뛰고 새 시간이 시작되던 것) */ };
    tick(); H.tInt = setInterval(tick, 100);
  }
  function stopTimer(H) { if (!H) return; clearInterval(H.tInt); H.tStart = null; H.tDue = false; work.querySelector(".htime")?.classList.remove("on", "low"); }
  async function handJudge(force = false) {
    const H = st.hand; if (force && st.busy && !H?.passSnd) { hush(); st.busy = false; } /* 시간 끝 채점 = 다른 소리 중이어도 */ if (!st.alive || !H || !H.strokes.length || st.busy || st.s >= segs.length || st.lineEnd || H.passed || magnetOn()) { if (H) H.timeUp = false; return; } // 자석 = 점수 없음(순서만) · 닫힌 창 = 채점 없음(검사부 10-14 덜 쓴 채 닫고 다시 열면 꽝)
    stopTimer(H);
    clearTimeout(H.timer);
    const c = words()[st.w].chars[st.c], r = handScore(c.ch, H.strokes, H.s); H.last = r;
    const pass = r.pass ?? r.pct >= 80, star = pass && (r.total ?? r.pct) >= 95, full = pass && (r.total ?? r.pct) >= 100 && r.speedP != null, /* ★ = 점수 95↑ · 🎉 = 점수 100(대표님 10-16 · 빠르기는 조건 아님 · 손으로 쓴 획만) */ sc = work.querySelector(".hscore");
    if (sc) { sc.innerHTML = badgeHtml(r, star); sc.className = "hscore " + (pass ? "ok" : "bad"); sc.hidden = false; fitScore(sc); } /* 세 칸 「모양 · 선 · 빠르기」(투덜이 10-15 안 A) */
    scoreFx(work.querySelector(".hbox .fx"), star ? Math.max(95, r.pct) : pass ? Math.min(94, r.pct) : r.pct, { full }); /* ★ = 셋 다 95↑ · 🎉 = 셋 다 100 */
    let jx = null; try { jx = judgeLines(r, force && H.timeUp); } catch (e) { console.warn("judge", e); } if (jx && full) { const kid = keepSave(c.ch, H.strokes, r); jx.keep = { ch: c.ch, id: kid }; } if (jx) { jx.sc = r.total ?? r.pct; jx.fresh = true; } showJudge(jx); /* 판정 상자(투덜이 10-15) · 🎉 100점 = 간직 후보로 모음 + ⭐·📄 단추 */
    if (pass) { // 통과 — 초록 + 그 글자 소리 · 최고 점수 기억 · 「다음 ▶」/다시 쓰기
      bestPut(st.w, st.c, r.pct); paintSent(); work.querySelector("[data-act=hnext]")?.classList.add("nudge"); /* 통과 = 저절로 안 넘어감(대표님 10-16 설명 볼 틈) · 「다음 ▶」 반짝 */
      note.textContent = ""; H.passed = true; H.paintInk(); markHand();
      st.busy = true; H.passSnd = true; const okSnd = await run(["ok", 150, c.file || jamoSrc(c.jamo[c.jamo.length - 1])]); if (H.passSnd) { st.busy = false; H.passSnd = false; if (false && okSnd) H.adv = setTimeout(() => { if (st.hand === H && H.passed && !H.cur) handNext(true); }, 500); } /* 통과 = 딩동 → 글자 소리 → 다음 글자(투덜이 10-14 · 읽는 중에 다시 쓰기 시작하면 머묾) */ // 통과 = 딩동 → 그 글자 소리(투덜이 10-13 · 자동 완성과 같은 차례)
      return;
    }
    note.textContent = ""; /* 꽝 안내·방향 알림은 판정 상자 한 곳에만(본부 10-15 · 머리 줄 끝에 … 로 잘려 또 나오던 것) */
    if (jx?.it.length) drawFix(r, jx); else H.paintGuide(r); /* 틀린 획 빨강 + 맞는 획 주황 점선 2초 · 짚을 획이 없으면 옛 덜 덮은 곳 깜빡 */
    setTimeout(() => { if (st.hand === H) H.paintGuide(); }, 900);
    // 꽝(80% 아래)이면 덜 덮은 곳 주황 깜빡 뒤 1.2초에 내 획을 저절로 지움 — 바로 다시 쓰게(투덜이 10-07) · 점수는 남김(새로 쓰기 시작하면 지움)
    const n0 = H.strokes.length, g0 = H.drawGen; clearTimeout(H.clr); H.clr = setTimeout(() => { if (H.timeUp) H.timeUp = false; /* 꽝 = 그 글자에 머묾 · 지운 뒤 다시 쓰면 시간 처음부터(그 전에는 획 막음) */ if (st.hand !== H || H.passed || H.cur || H.strokes.length !== n0 || H.drawGen !== g0) return; H.strokes = []; H.said = null; H.roles = null; H.orderTold = false; H.paintInk(); }, 1200);
  }
  function handNext(wrote = false) { work.querySelector("[data-act=hnext]")?.classList.remove("nudge"); // 「다음 ▶」 = 강제로 넘기기(투덜이 10-14) — 아무것도 읽지 않고 바로 다음 글자 · 늘 누를 수 있음 · wrote = 통과해서 넘어감(위 글자 줄 초록)
    const H = st.hand; if (!H || st.s >= segs.length) return; if (st.auto) stopAuto(); hush(); stopLoop(); H.stopOrder?.(); clearTimeout(H.timer); clearTimeout(H.clr); clearTimeout(H.adv); stopTimer(H); st.busy = false; st.done = false; H.passSnd = false;
    const c = words()[st.w].chars[st.c];
    st.typed = c.jamo.slice(); st.k = c.jamo.length; st.part = "";
    return finishChar(c.jamo[c.jamo.length - 1], c, 0, { silent: true, wrote });
  }
  function markOrder() { const b = work.querySelector("[data-act=horder]"); if (b) b.setAttribute("aria-pressed", String(!!st.hand?.ordPlaying)); } // ✎ 획순 = 그리는 동안 눌린 모양
  function markHand() { // ✓ 채점 · ▶ 다음 = 늘 두 단추(투덜이 10-14 「다음은 막지 말고 늘」) — 글만 그 언어로
    const d0 = work.querySelector("[data-act=hdone]"), n0 = work.querySelector("[data-act=hnext]");
    if (d0) { if (!d0.querySelector(".ml")) d0.innerHTML = `✓<span class="ml"></span>`; dual(d0.querySelector(".ml"), [["h_done"]], x => x, " "); d0.setAttribute("aria-label", t("h_done")); }
    if (n0) { if (!n0.querySelector(".ml")) n0.innerHTML = `▶<span class="ml"></span>`; dual(n0.querySelector(".ml"), [["next_btn"]], noArrow, " "); n0.setAttribute("aria-label", t("next_btn")); } // 「다음 ▶」 은 늘 글까지(통과 뒤 누를 단추)
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
    if (wasAuto) { st.allNext = false; markAuto(); render(); st.sent = true; markSent(); await run([lineSrc]); st.sent = false; markSent(); return; } // [한 줄·전체 자동] = 그 줄 글자를 다 쓰면 그 줄 문장 전체 소리 한 번 → 멈춤(투덜이 10-15 「전체인데 일부만」 · 다음 줄로 저절로 넘어가 다음 줄 첫 토막을 읽던 것 · 「세종대왕이요」 가만히 소리 원인)
    const all = false; st.allNext = false; markAuto(); render();
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
  const markAuto = () => { const on = !!(st.auto || st.resumeAuto); for (const [act, mode, lab] of [["auto", "line", "autofill"], ["autoall", "all", "autofill_all"]]) { const b = wb.querySelector(`[data-act=${act}]`), me = (on && st.autoMode === mode) || (mode === "all" && st.allNext); b.setAttribute("aria-pressed", String(me)); b.dataset.st = me ? "run" : "idle"; b.setAttribute("aria-label", me ? "⏹ " + t("btn_stop") : t(lab)); dual(b, [[lab, "idle"], ["btn_stop", "run", "⏹ "]]); } if (wb.isConnected) placeBtns(); }; // 글 길이가 바뀌면 단추 줄 다시 맞춤
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
  // 「왜 틀렸어요?」(본부·개발2팀 10-20) — 자판에서 틀린 자모를 치면 자모 칸 옆 빈자리에 덮개로 단추 하나(틀 0px · 다음에 맞게 치면 화면을 다시 그려 사라짐) · 꺼져 있으면(기본) 아무것도 안 그림
  function whyPut(target, heard, meaning) { const row = work.querySelector(".info .slotrow"); row?.querySelector(":scope > .whyrow")?.remove(); const h = whyRow(target, heard, "write", meaning); if (!row || !h) return;
    row.insertAdjacentHTML("beforeend", h); const w = row.querySelector(":scope > .whyrow"), sl = row.querySelector(".slots"), wb = row.querySelector(".wbtns"), R = row.getBoundingClientRect(), x0 = sl ? sl.getBoundingClientRect().right - R.left + 8 : 0, x1 = wb && wb.offsetWidth ? wb.getBoundingClientRect().left - R.left - 8 : R.width;
    w.classList.add("wwhy"); w.style.left = Math.round(x0) + "px"; w.style.maxWidth = Math.max(40, Math.round(x1 - x0)) + "px"; const b = w.querySelector(".whyb"), H0 = (sl || row).offsetHeight; if (!b) return; b.setAttribute("aria-label", b.textContent.trim()); const over = () => b.scrollWidth > b.clientWidth + 1 || b.offsetHeight > H0 + 2;
    for (let f = 12; f >= 9.5 && over(); f -= 0.5) b.style.fontSize = f + "px"; if (over()) { w.classList.add("two"); for (let f = 12; f >= 9 && over(); f -= 0.5) b.style.fontSize = f + "px"; } if (over()) { w.classList.remove("two"); b.style.removeProperty("font-size"); w.classList.add("ic"); } } /* 글 맞춤: 한 줄 → 두 줄(자모 칸 높이 안) → 그래도 안 되면 💡 만(이름 = aria) */
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
      whyPut(c.ch, compose([...st.typed, j].flatMap(jamoParts), vowelLen(c.ch)), words()[st.w].mean ? meanOf(words()[st.w].mean) : ""); /* 「왜 틀렸어요?」(개발2팀 whyask · ?why=1 일 때만) */
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
  const fitHelp = () => { const hb = $(".helpbox"); if (!hb || hb.hidden) return; const ps = [...hb.children].filter(x => !x.classList.contains("x")); [...hb.children].forEach(x => x.style.removeProperty("zoom")); hb.classList.remove("scroll"); const f0 = Math.min(...ps.map(x => parseFloat(getComputedStyle(x).fontSize) || 13)), zMin = Math.min(1, 12 / f0); /* 닫기 안내(.x)는 줄이지 않음(12px 고정) · 가장 작은 글도 12px 아래로 안 감(검사부 10-15 ur 320 10.9px) */ /* 글은 12px 아래로 안 줄임(검사부 10-15 ur 320 「아주 작고 마지막 줄 잘림」) → 그래도 넘치면 칸 안에서 굴림(말하기 풍선과 같은 방식) */
    for (let z = 0.95; z >= zMin - 1e-6 && hb.scrollHeight > hb.clientHeight; z -= 0.05) ps.forEach(x => (x.style.zoom = Math.max(zMin, z).toFixed(3))); if (hb.scrollHeight > hb.clientHeight + 1) hb.classList.add("scroll"); };
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
    if (hm) { try { const on = !magnetOn(); localStorage.setItem("malmun.hmode", on ? "magnet" : "free"); if (on) localStorage.setItem("malmun.hfollow", "0"); } catch {} hush(); st.hand?.stopOrder?.(); render(); return; }
    if (e.target.closest("[data-hfollow]")) { try { const on = !followOn(); localStorage.setItem("malmun.hfollow", on ? "1" : "0"); if (on) localStorage.setItem("malmun.hmode", "free"); } catch {} hush(); st.hand?.stopOrder?.(); render(); return; } // 따라 쓰기 켬 = 자석 끔(같은 글자 처음부터) // 반자동 ⇄ 완전 수동(같은 글자 처음부터)
    const tb = e.target.closest("[data-tool]");
    if (tb) { const same = tb.dataset.tool === toolKey(); try { localStorage.setItem("malmun.htool", tb.dataset.tool); } catch {} app.querySelectorAll("[data-tool]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tool === tb.dataset.tool)));
      const H = st.hand; if (!H || same) return;
      // 다른 도구 = 그 글자 칸에 쓴 획을 지우고 처음부터(투덜이 10-12 「다른 도구를 고르면 기존 것을 자동으로 지우는 게 좋아」 · 본부) — 점수·자석 차례·통과 표시도 처음으로 · 회색은 새 도구 굵기 · 같은 도구 = 그대로
      clearTimeout(H.timer); clearTimeout(H.clr); H.follow = null; H.drawGen = (H.drawGen || 0) + 1; if (H.passSnd) { hush(); st.busy = false; H.passSnd = false; }
      if (!st.auto && (H.ordPlaying || H.ordAt)) H.stopOrder?.();
      H.strokes = []; H.said = null; H.roles = null; H.orderTold = false; H.mag = 0; H.magWrong = 0; H.said = null; if (H.passed) { H.passed = false; markHand(); }
      const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; note.textContent = ""; H.paintGuide?.(); H.paintInk?.(); return; }
    const mb = e.target.closest("[data-mode]");
    if (mb) { if (st.mode !== mb.dataset.mode) { if (st.auto || st.resumeAuto) stopAuto(); st.hand?.stopOrder?.(); hush(); stopLoop(); st.busy = false; st.done = false; st.queue = []; st.mode = mb.dataset.mode; /* 모드 바꾸기 = 돌던 것(자동·획순·소리) 먼저 멈춤 — 본부 10-08 투덜이: 자판 자동 켠 채 손글씨로 바꾸면 저 혼자 계속 씀 */ try { localStorage.setItem("malmun.wmode", st.mode); } catch {} app.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === st.mode))); st.typed = []; st.k = 0; st.part = ""; st.segEnd = false; render(); } return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act; if (/^(hclear|hnext|horder|hundo|hdone|autoone|autoall|autoline|hear|hearch|next|prev|keepsheet)$/.test(a || "")) fbStop(); /* 안내 소리 = 다른 일 시작하면 멈춤 */
    if (a === "close") { hush(); stopLoop(); return opts.onClose?.(); } // ✕ 닫기(본부 10-07 — 말하기·설명 창과 같게 · 폰 뒤로도 같은 동작)
    if (a === "keepstar") { const k = st.hand?.jx?.keep; if (k) { keepStar(k.ch, k.id); b.setAttribute("aria-pressed", "true"); } return; } if (a === "keepsheet") { const k = st.hand?.jx?.keep; if (k) keepStar(k.ch, k.id); keepTipOff(); stopFx(); return keepOpen(); } /* 🎉 덮개·팡파레가 미리보기 위에 겹치지 않게 바로 치움(검사부 10-15) */ // 간직하기(🎉 100점만)
    if (a === "inkpick") return inkMenu(!app.querySelector(".inkmenu")); if (a === "inkset") { try { localStorage.setItem("malmun.hink", b.dataset.ink); } catch {} app.querySelectorAll(".hpal [data-ink]").forEach(x => x.setAttribute("aria-checked", String(x.dataset.ink === inkKey()))); return; } /* 팔레트 = 다음 획부터 그 색 */ // 먹 색 고르기 → 바로 닫힘 · 그은 획도 그 색
    if (a === "jmore") return judgeFull(!work.querySelector(".hjfull")); if (a === "jfull") return judgeFull(false); // 판정 글 전체 보기 · 누르면 닫힘
    if (a === "hdone") return handJudge();
    if (a === "hnext") return handNext();
    if (a === "horder") return st.hand?.toggleOrder?.();
    if (a === "hundo" || a === "hclear") { const H = st.hand; if (!H) return; clearFix(); H.follow = null; clearTimeout(H.timer); clearTimeout(H.clr); H.drawGen = (H.drawGen || 0) + 1; if (H.passSnd) { hush(); st.busy = false; H.passSnd = false; } if (a === "hundo") H.strokes.pop(); else { H.strokes = []; H.said = null; H.roles = null; H.orderTold = false; stopTimer(H); H.timeUp = false; } H.said = null; /* 지우기 = 시간도 처음부터 */ H.mag = Math.min(H.mag || 0, H.strokes.length); if (magnetOn()) { H.paintGuide?.(); } /* 자석 = 남은 획부터 다시(본부 10-10 「딱 한 번만 됨」 — 지워도 차례가 앞으로 가 있던 것) */ if (H.passed) { H.passed = false; markHand(); } const sc = work.querySelector(".hscore"); if (sc) sc.hidden = true; H.paintInk(); note.textContent = ""; return; }
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
  autoAllNext = null; // 전체 자동 = 그 줄에서 멈춤(10-15 · 다음 줄 이어받기 없음)
  try { const nTip = +(localStorage.getItem("malmun.wlinetip") || 0); if (nTip < 2) { localStorage.setItem("malmun.wlinetip", String(nTip + 1)); const tip = $(".wtip"); tip.textContent = t("w_line_tip"); tip.hidden = false; sentEl.classList.add("flash"); requestAnimationFrame(() => { const sp = sentEl.querySelector(".spkb"), row = tip.parentElement; if (!sp || !row) return; const r = sp.getBoundingClientRect(), rr = row.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(rr.width - tip.offsetWidth - 4, r.left + r.width / 2 - rr.left - 24)) + "px"; tip.style.right = "auto"; }); /* 말풍선 꼬리 = 🔊 단추 위치(ur 오른쪽→왼쪽에서 ◀▶ 를 가리키던 것 · 10-14) */ st.tipT = setTimeout(hideLineTip, 4000); } } catch {} // 🔊 = 이 줄 듣기 말풍선 처음 2번(투덜이 10-13)
  const release = hold();
  // 이 줄에서 쓸 소리를 미리 받아 풀어 둔다(대사 · 낱말·토막 · 글자 · 자판 자모) — 누르는 순간 바로 나오게
  sfx.preload([lineSrc, ...allWords.map(w => unitSrc(w.unit)), ...segs.map(g => unitSrc(g.unit)),
    ...allWords.flatMap(w => w.chars.map(c => c.file)), ...[...KEYS, ...VOW, ...VOW2].map(jamoSrc)]);
  // 앱 글 언어가 바뀜(앱개발부 10-13 안 A · 「malmun:uilang」) — 화면을 다시 그리지 않고 쓰기 창 안 앱 글만 그 자리에서 바꿈 · 자동·손글씨 칠·소리·쓰던 자리·획 그대로
  function retext() {
    if (!st.alive) return; barLock = performance.now() + 800; const L = k => t(k), span = (el, k) => { if (!el) return; el.setAttribute("aria-label", L(k)); }; /* 보이는 글 = dualizeAll(두 겹 중 고른 언어) */
    const h = app.querySelector(".whead"), bar = app.querySelector(".bar");
    if (h) { const b = h.querySelector(":scope > b"); if (b) b.textContent = L("write"); const sb = h.querySelector(".sub"); if (sb) sb.innerHTML = `<span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span>`; }
    if (bar) { const tt = bar.querySelector(".t"), sb = bar.querySelector(".sub"), bk = bar.querySelector(".iconbtn"); if (tt) tt.textContent = L("write"); if (sb) sb.innerHTML = `<span class="ln">${li + 1} / ${d.lines.length}</span><span class="sp"> · ${spkHtml(line.speaker)}</span>`; bk?.setAttribute("aria-label", L("back")); }
    app.querySelectorAll("[data-mode]").forEach(x => span(x, x.dataset.mode === "kb" ? "w_kb" : "w_hand"));
    app.querySelectorAll("[data-act=help]").forEach(x => x.setAttribute("aria-label", L("help")));
    app.querySelectorAll("[data-act=close]").forEach(x => x.setAttribute("aria-label", L("close_btn")));
    const hb = $(".helpbox"); if (hb) hb.innerHTML = helpHtml();
    dualizeAll(); markAuto();
    paintSent(); /* 위 글자 줄 · ◀ ▶ 이름 · 🔊 이름 */ const tip = $(".wtip"); if (tip && !tip.hidden) tip.textContent = L("w_line_tip");
    work.querySelectorAll("[data-tool]").forEach(x => span(x, "h_" + x.dataset.tool)); span(work.querySelector("[data-hmode]"), "h_magnet"); work.querySelector("[data-hfollow]")?.setAttribute("aria-label", tx("h_follow"));
    for (const [a, k] of [["horder", "h_order"], ["hundo", "h_undo"], ["hclear", "h_clear"]]) span(work.querySelector(`[data-act=${a}]`), k);
    const fullOpen = !!work.querySelector(".hjfull"); if (st.hand?.jx) showJudge(st.hand.jx); else if (st.hand?.guideOn) showGuide(st.hand); if (fullOpen) judgeFull(true); app.querySelectorAll(".hpal [data-ink]").forEach(x => x.setAttribute("aria-label", tx("ink_" + x.dataset.ink))); app.querySelector(".hpal")?.setAttribute("aria-label", tx("h_ink")); document.querySelectorAll(".panel .bigb").forEach(b => { b.setAttribute("aria-label", t("big_view")); b.title = t("big_view"); b.querySelectorAll("[data-k]").forEach(x => (x.textContent = t(x.dataset.k))); }); /* ⛶ 칩(앱개발부 · 쓰기 머리 줄 안) 이름도 그 말로(⇄) */ app.querySelectorAll(".chip.bgmb").forEach(b => { const k0 = b.dataset.act === "bgmtog" ? "bgm_short" : "music_box"; b.setAttribute("aria-label", t(k0)); b.title = t(k0); const lt = b.querySelector(".lt"); if (lt) lt.textContent = t("bgm_short"); }); /* ♪ 단추 이름도 그 말로(⇄) */ /* ⇄ = 글만 바꿈 · 펼친 설명은 펼친 채(본부 10-15) */ fitHbtn(); /* 판정 상자 글도 그 언어로(⇄) */
    work.querySelector(".stage .box")?.setAttribute("aria-label", L("listen_char") || "▶"); work.querySelector(".hink")?.setAttribute("aria-label", L("w_hand"));
    markHand(); markOrder(); setNote();
    const sc = work.querySelector(".hscore"); if (sc && !sc.hidden && st.hand?.passed && magnetOn()) { sc.textContent = L("h_order_ok"); fitScore(sc); }
    if (sc) { sc.querySelectorAll("i[data-k] u").forEach(u => (u.textContent = tx(u.parentElement.dataset.k))); fitScore(sc); } /* 배지 이름도 그 언어로(⇄) */
    fitHeadW(); placeBtns(); fitWord();
  }
  const onUiLang = () => retext(); window.addEventListener("malmun:uilang", onUiLang);
  const onBig = () => { if (!st.alive) return; requestAnimationFrame(() => { if (!st.alive) return; st.hand?.fit?.(); fitHandBox(); fitHeadW(); placeBtns(); fitWord(); fitJudge(); }); }; window.addEventListener("malmun:big", onBig); window.addEventListener("resize", onBig); // ⛶ 크게 보기 켜고 끌 때·폰 돌릴 때 칸 다시 맞춤
  const onFontsDone = () => { if (st.alive) { fitWord(); placeBtns(); fitWord(); fitHbtn(); } }; document.fonts?.ready?.then(() => setTimeout(onFontsDone, 0)); /* 뜻 줄(fitSub2)도 다시 맞춤 */ document.fonts?.addEventListener?.("loadingdone", onFontsDone); // 글꼴이 늦게 오면(나스탈리크·데바나가리) 단추 글 다시 맞춤(10-16)
  const onVis = () => { if (document.visibilityState === "hidden" && st.alive) { if (st.auto || st.resumeAuto) stopAuto(); stopLoop(); hush(); st.busy = false; const H = st.hand; if (H) { clearTimeout(H.adv); H.passSnd = false; } } /* 다른 탭·앱으로 가면 자동·반복·소리·다음 글자 예약 멈춤(본부 10-15) */ if (document.visibilityState === "visible") { try { const c = audioCtx(); if (c.state !== "running") c.resume().catch(() => {}); } catch {} } }; document.addEventListener("visibilitychange", onVis); // 앱으로 돌아오면 소리 장치 깨움(폰에서 다른 앱 갔다 오면 잠들어 쓰는 소리가 안 나던 것 · 본부 10-14)
  const onWinUp = () => { if (st.hand?.cur) st.hand.up?.(); }; window.addEventListener("pointerup", onWinUp, true); window.addEventListener("pointercancel", onWinUp, true); // 손글씨 획 = 창 어디에서 놓아도 끝남(투덜이 10-14)
  return () => { clearTimeout(st.fbWait); st.fb?.off(); st.fb = null; window.removeEventListener("malmun:big", onBig); window.removeEventListener("resize", onBig); document.fonts?.removeEventListener?.("loadingdone", onFontsDone); document.querySelector(".keepov")?.remove(); document.removeEventListener("pointerdown", onInkOut, true); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("malmun:uilang", onUiLang); window.removeEventListener("pointerup", onWinUp, true); window.removeEventListener("pointercancel", onWinUp, true); release(); st.alive = false; { const H0 = st.hand; if (H0) { clearInterval(H0.tInt); H0.tStart = null; H0.tDue = false; clearTimeout(H0.timer); clearTimeout(H0.clr); clearTimeout(H0.adv); clearTimeout(H0.fixT); clearInterval(H0.paceT); } } drawEnd(); /* 닫을 때 시간 막대·채점 예약·넘김 예약·쓰는 소리 모두 멈춤(검사부 10-14 「있」 ㅇ 만 쓰고 닫았다 다시 열면 15초 안에 꽝) */ st.autoGen = (st.autoGen || 0) + 1; st.auto = false; st.resumeAuto = false; st.allNext = false; st.hand?.stopOrder?.(); hush(); st.hand?.ro?.disconnect(); clearTimeout(st.hand?.timer); delete app.__wr; };
}
