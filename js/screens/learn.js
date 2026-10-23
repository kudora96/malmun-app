// 학습 화면 — 영상 + 대사 말풍선 + 재생 모드(영상 / 대사→설명 / 설명만)
//
// 누르면 무엇이 되나 — 학습자 기준 규칙(투덜이 10-01 「자막을 누르면 거기로 가서 멈춰야지」 · CLAUDE.md 「학습 화면 조작 규칙」)
//  R1 줄 누르기          = 그 줄 처음으로 가서 멈춤 · 그 줄 선택 · 줄 안에 [▶ 이 줄 듣기][설명][쓰기]
//  R2 선택한 줄 또 누르기 = 그 줄만 한 번 듣기(이 줄 듣기와 같음)
//  R3 이 줄 듣기          = 그 줄 처음~끝만 재생하고 그 줄 끝에서 멈춤(다음 줄로 넘어가지 않음)
//  R4 큰 ▶ · 영상 누르기 · 스페이스 = 멈춤 ↔ 이어서(하던 것 그대로 · 한 줄 듣기가 끝난 뒤면 거기서부터 이어 보기)
//  R5 ◀ ▶(이전·다음 줄)  = 그 줄로 이동 · 재생 중이면 그 줄부터 이어 재생 · 멈춰 있으면 그 줄 처음에서 멈춤
//  R6 🔁 반복            = 선택한 줄을 끝 → 0.7초 쉼 → 처음으로 계속 · 반복 중 다른 줄을 누르면 그 줄을 반복
//  R7 영상은 늘 맨 위 · 지금 줄은 영상 바로 아래(앞 줄은 영상 뒤로) — 손으로 목록을 움직이면 4초 동안은 따라가지 않음
//  R8 듣기 모드(대사→설명 · 설명만)도 R1~R6 그대로(영상 대신 소리 조각) · 모드를 바꾸면 멈춤(▶ 로 시작)
//  R9 다시 들어오면 마지막 줄이 선택된 채 멈춰 있음
import { noScoreKey } from "../agepolicy.js?v=1023.10"; // 점수 없음 안내 = 나이 때문인지(대표님 10-19)
import { warmSTT } from "../sttserver.js?v=1023.10";
import * as sfxL from "../sfx.js?v=1023.10"; // 카드 말하기 최대 길이 = 본보기 길이로(10-07)
import { t, tAlt, lang, langName, KO_UI, uiKoOn, preloadKoUi } from "../i18n.js?v=1023.10";
// 줄 카드 단추 = 그림만 다섯(대표님 10-20 B 선 아이콘 · 같은 크기 한 줄 · 카드 높이 0px) — ▶ 이 줄 듣기 · 📖 설명 · ✎ 쓰기 · 🎤 말하기 · 🎮 게임 · 이름 = 처음 한 번 차례 풍선말 + 길게 누르기
const SV = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ACTS = [["once", "listen_line", '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'], ["explain", "explain", SV('<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>')], ["write", "write", SV('<path d="M16 3l5 5L8 21H3v-5z"/>')], ["speak", "speak", SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>')], ["game", "line_game", SV('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r="1" fill="currentColor"/><circle cx="18.5" cy="14" r="1" fill="currentColor"/>')]];
// 🎮 줄 게임(게임부 10-20) — 배우기 화면 위 겹침(iframe)으로 game/line.html · 신호 malmun-line / -ready / -done(10_game/shooter/design.md §74)
const GAME_DONE = "malmun.game.done";
const gameDone = (ep, id) => { try { return (JSON.parse(localStorage.getItem(GAME_DONE) || "[]")).includes(`${ep}:${id}`); } catch { return false; } };
const gameMark = (ep, id) => { try { const a = JSON.parse(localStorage.getItem(GAME_DONE) || "[]"); if (!a.includes(`${ep}:${id}`)) { a.push(`${ep}:${id}`); localStorage.setItem(GAME_DONE, JSON.stringify(a)); } } catch {} };
const gnorm = x => (x || "").replace(/[\s.,!?…「」『』"'·]/g, "");
function gameWords(vl, uw, lg, ep) {   // 뜻 조각(v9 pieces)과 소리 낱말(units)을 글자로 맞춰 묶음 — 10_game/tools/build_line.py 와 같은 규칙
  const pieces = vl?.pieces?.length ? vl.pieces : uw.map(w => ({ ko: w.say || w.text, mean_by: {} })), out = [];
  let pi = 0, ui = 0;
  while (pi < pieces.length && ui < uw.length) {
    const pg = [pieces[pi]], ug = [uw[ui]]; let pk = gnorm(pieces[pi].ko), uk = gnorm(uw[ui].say || uw[ui].text); pi++; ui++;
    while (pk !== uk && (pi < pieces.length || ui < uw.length)) {
      if (pk.length < uk.length && pi < pieces.length) { pg.push(pieces[pi]); pk += gnorm(pieces[pi].ko); pi++; }
      else if (ui < uw.length) { ug.push(uw[ui]); uk += gnorm(uw[ui].say || uw[ui].text); ui++; } else break;
    }
    out.push({ ko: pg.map(p => p.ko).join(" "), mean: pg.map(p => (p.mean_by || {})[lg] || "").filter(Boolean).join(" "), audio: ug.map(w => paths.unit(ep, w.id)) });
  }
  return out;
}
import { setTx } from "../retext.js?v=1023.10";
import { langfitRun } from "../langfit.js?v=1023.10";
import { esc, renderText, glossCards, sayParts } from "../text.js?v=1023.10";
import { episode } from "../data.js?v=1023.10";
import { paths, MEDIA } from "../paths.js?v=1023.10";
import { attachVq } from "../vq.js?v=1023.10";
import { setReportCtx } from "../report.js?v=1023.10";
import { fbBind, fbPlan } from "../fbvoice.js?v=1023.10";
import { setupTurns } from "../turns.js?v=1023.10"; // 「따라 해 보세요」 양방향(대표님 10-21) // 결과 안내 소리로 읽기(대표님 10-21)
import { setupOverlays } from "../overlays.js?v=1023.10"; // 영상 위 그림 카드(대표님 10-22 새 1편) // 「따라 해 보세요」 양방향(대표님 10-21) // 결과 안내 소리로 읽기(대표님 10-21)
import { Sequence } from "../audio.js?v=1023.10";
import { I, progress, SPEAKER, spkHtml, uiKoBtn, uikoChip, switchUiKo } from "../ui.js?v=1023.10";
import writeView from "./write.js?v=1023.10";
import { diagEnv, keepDiag } from "../diag.js?v=1023.10";
import { playMine as playMineRec, keepFirstOf } from "../playmine.js?v=1023.10";
import { rhythmOf, withRhythm, rhyText, upgradeSaved, keptScore, SCORE_V, paceOf, paintPace, lateFactor, sylAt, paintAt, karaokeRun, isFull } from "../rhythm.js?v=1023.10";
import { playSlow, getRate, nextRate, rateLabel, setRateWord } from "../compare.js?v=1023.10";
import { heardHTML, endHint, scoreOf, bestFull, spanOf, sylsAt } from "../heard.js?v=1023.10"; // 덧붙은 말 빼고 견주기(본부 10-11)
import { recDel, downloadRec, askPersist } from "../recstore.js?v=1023.10";
import speakView, { similarity, PASS, PERFECT, starOf, scoreLine, maxMsFor, recGet, recPut } from "./speak.js?v=1023.10";
import { scoreFx, stopFx } from "../scorefx.js?v=1023.10"; // 점수별 효과(본부 10-05)
import { record, recordSROnly, srOnlyMode, setSrOnly, isAndroid, srMiss, micWhy, srWhy, canScore, closeMic, logRec, micOpen, seqMode, srOnBlob, devSR, setDevSR, srJudge, micLabel, niceLabel, listMics, chooseMic } from "../recorder.js?v=1023.10";
import { hold, quietWake } from "../wake.js?v=1023.10";
import { hold as bgmHold } from "../bgm.js?v=1023.10"; // 🎮 게임 중 배경음악 멈춤

const RATES = [1, 0.75, 0.5];
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const LOOP_GAP = 700;
const LEAD = 0.35;  // 자막은 목소리보다 0.35초 먼저 영상 아래에(줄 시각 = 실제 목소리 · 느린 속도면 영상 시간으로 줄인다)
const SCROLL_MS = 220; // 줄을 영상 아래로 올리는 시간 — 먼저 와 있어야 해서 짧게
const FS = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

// 🎤 단추 글 = data-k 로(⇄ 때 「말하기」가 speak·speak_now 둘 다라 retext 가 엉뚱한 열쇠로 바꾸던 것 · 다국어부 10-19 si)
const micLbl = () => `🎤 <span data-k="speak_now">${esc(t("speak_now"))}</span>`;
export default async function learn(app, ep, startId, opts = {}) { /* opts.explain = 그 줄 설명 창을 연 채로(#/explain 주소 · 책 QR) */
  const d = await episode(ep, lang);
  if (seqMode()) warmSTT(); // 카드 말해 보기도 서버 받아쓰기 — 미리 데움(본부 10-12)
  setRateWord(t("speed")); // 속도 단추 글 「गति 1×」
  const L = d.lines;
  const last = Math.min(progress.get(ep).at ?? (progress.get(ep).line || 1) - 1, L.length - 1);
  // once = 지금 한 줄만 듣는 중 · rep = 반복 켜짐 · gap = 반복 사이 쉬는 중
  const st = { mode: "video", cur: Math.max(0, last), once: false, rep: false, gap: 0, rate: 0, handScroll: 0, anim: 0 };
  const seq = new Sequence();
  let ready = false;

  const subsOn = () => pref("malmun.fullsub") !== "0"; /* 영상 자막 켬/끔(투덜이 10-12) */
  app.innerHTML = `<section class="scr learn${subsOn() ? "" : " nosub"}">
    <div class="stick">
    <div class="vstage">
    <div class="vmain"><div class="vtitle"><div class="tt"><b class="ko" lang="ko">${esc(d.title || "")}</b>${d.title_t ? `<span class="sub">${esc(d.title_t)}</span>` : ""}</div>${uiKoBtn()}<span class="n"></span></div>
    <div class="varea"><div class="video" id="vwrap"><video playsinline preload="metadata" poster="${paths.poster(ep)}"></video>
      <span class="vplay" aria-hidden="true">${I.play}</span>
      <div class="cap" aria-live="polite"></div>
      <button class="vfs" data-act="fs" aria-label="${esc(t("fullscreen"))}">${FS}</button><span class="vuiko">${uikoChip()}</span>
      </div></div><div class="vsub" hidden aria-hidden="true"><div class="in"></div></div></div>
    <div class="panel" hidden></div>
    </div>
    <button class="bigb" data-act="big" aria-pressed="false" hidden aria-label="${esc(t("big_view"))}" title="${esc(t("big_view"))}"><span aria-hidden="true">⛶</span><span class="off" data-k="big_short">${esc(t("big_short"))}</span><span class="on" data-k="big_off">${esc(t("big_off"))}</span></button>
    <div class="seek" data-off><span class="t0">0:00</span><div class="trk" aria-label="${esc(t("seek_bar"))}"><div class="rail"><i></i></div></div><span class="t1">0:00</span><button class="vsubt" data-act="subs" aria-pressed="${subsOn()}" aria-label="${esc(t("subs_aria"))}" title="${esc(t("subs_aria"))}"><span class="cc" aria-hidden="true">CC</span></button>
      <div class="fstip" role="status" hidden><span class="who">${spkHtml("선생님")}</span><p data-k="subs_tip">${esc(t("subs_tip"))}</p><button class="x" data-act="tipx" aria-label="${esc(t("close_word"))}">✕</button></div></div>
    </div>
    <ol class="lines">${L.map((l, i) => `<li class="line sp-${SPEAKER[l.speaker] || "x"} ${l.speaker === "선생님" ? "" : "right"}" data-i="${i}" data-peek="👁 ${esc(t("subs_peek"))}">
      <span class="who">${spkHtml(l.speaker)}</span>
      <p class="kotext ko" lang="ko">${esc(l.ko)}</p>
      ${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}
      <div class="expl"></div>
      <div class="acts ib5">${ACTS.map(([a, k, ic], q) => `<button class="ib${q ? " menu" : ""}${a === "game" ? " gamebtn" + (gameDone(ep, l.id) ? " gdone" : "") : ""}" data-act="${a}" data-tipk="${k}" aria-label="${esc(t(k))}">${ic}</button>`).join("")}</div>
    </li>`).join("")}</ol>
    <div class="ctrl">
      <a class="iconbtn" href="#/list" aria-label="${esc(t("back"))}">${I.back}</a>
      <button class="iconbtn" data-act="rep" aria-pressed="false" aria-label="${esc(t("repeat"))}">${I.rep}</button>
      <button class="iconbtn" data-act="prev" aria-label="${esc(t("previous"))}">${I.prev}</button>
      <button class="play" data-act="play" aria-label="${esc(t("play"))}">${I.play}</button>
      <button class="iconbtn" data-act="next" aria-label="${esc(t("next"))}">${I.next}</button>
      <button class="spd" data-act="spd">1×</button>
      <button class="modeb" data-act="flip">${esc(t("explain"))}</button>
      <div class="modetip" hidden>${esc(t("flip_tip"))}</div>
    </div>
  </section>`;

  const v = app.querySelector("video");
  const vqOff = attachVq(v, ep); // 화질 자동 720 ⇄ 480(느린 망·잦은 버퍼링 · 단추 없음)
  // 길게 누르기 → 「잘못된 것 신고」(report.js · 대표님 10-20) — 줄 카드 · 영상 밑 자막 · 위 창(설명·말하기·쓰기) · 「왜 틀렸어요?」 답 창(종류 = AI 답)
  const rpOff = setReportCtx(el => {
    const cur = st.panel ? st.panel.i : st.cur, id = i => L[i]?.id ?? String(i + 1);
    if (el.closest(".whys")) return { screen: "why", kind: "ai", ep, line: id(cur), el: el.closest(".whys") };
    if (!app.contains(el)) return null;
    const li = el.closest(".line"); if (li) return { screen: "learn", ep, line: id(+li.dataset.i), el: li };
    if (st.panel && el.closest(".panel")) return { screen: ["explain", "speak", "write"].includes(st.panel.kind) ? st.panel.kind : "other", ep, line: id(st.panel.i), el: el.closest(".panel") };
    if (el.closest(".vsub")) return { screen: "learn", ep, line: id(st.cur), el: el.closest(".vsub") };
    return null;
  });
  // 「따라 해 보세요」 양방향(turns.js · 자료가 있는 편만) — 차례 동안 영상 밑 큰 자막 칸 = 🎤 듣기 · 선생님 반응 자막(학습자 말 ⇄ 한국어)
  // 영상 위 그림 카드(overlays.js) — 작은 화면·작은 글 = 카드 글을 영상 밑 큰 자막 칸 끝에
  let ovl = null;
  setupOverlays(ep, v, { wrap: app.querySelector("#vwrap") }).then(x => { ovl = x; });
  let turns = null;
  let turnLastSub = null;
  function turnSub(x) {
    const w = app.querySelector("#vwrap"); if (!w) return; // 영상 밑 큰 자막 칸이 없어져(대표님 10-22) 차례 글은 영상 안 위쪽 작은 상자(차례 동안만)
    turnLastSub = x && !x.listen ? x : turnLastSub && x?.listen ? null : x;
    if (!x) { w.querySelector(".tsub")?.remove(); return; }
    let inn = w.querySelector(".tsub"); if (!inn) { inn = document.createElement("div"); inn.className = "tsub"; inn.setAttribute("aria-live", "polite"); w.append(inn); }
    if (x.listen) { if (!inn.querySelector(".tlisten")) inn.innerHTML = `<span class="tlisten">🎤 <span data-k="turn_listen">${esc(t("turn_listen"))}</span></span><i class="tlvl"><b></b></i>`; inn.querySelector(".tlvl b").style.width = Math.round(x.level * 100) + "%"; return; }
    inn.innerHTML = `${x[lang] && lang !== "ko" && !uiKoOn() ? `<span class="tr">${esc(x[lang])}</span>` : `<b class="ko" lang="ko">${esc(x.ko || "")}</b>`}`; // 학습자 말 한 줄(⇄ 한국어면 한국어)
  }
  setupTurns(ep, v, { wrap: app.querySelector("#vwrap"), canRun: () => st.mode === "video" && !st.panel && !st.once, onSub: turnSub }).then(x => { turns = x; });
  app.addEventListener("pointerdown", e => { if (turns?.busy() && e.target.closest(".ctrl, .lines, .seek, #vwrap, .vtitle")) turns.skip(); }, true); // 차례 중 누르면 이번 차례 그만(누른 단추 일은 그대로)
  const items = [...app.querySelectorAll(".line")];
  // 두 말 위아래 = ⇄ 상태(대표님 10-19·10-20 「한↔네팔어 바뀌면 위아래도 바뀌어야」) — 학습자 말 화면이면 학습자 말이 위 · 한국어 화면이면 한국어가 위
  //  편 제목 · 영상 아래 큰 자막 · 줄 카드(지금 줄·대화 풍선) — 위 자리 = 큰 글·진한 색(큰 자막은 두 줄 같은 크기) · ⇄ 없는 언어(영어 등)는 지금 그대로
  const lFirst = () => KO_UI.includes(lang) && !uiKoOn();
  function applyFirst() { swapTo(lFirst()); }
  // ⇄ 위아래가 바뀌어도 칸 높이 0px — 제목 칸·줄 카드마다 두 상태(한국어 위·학습자 말 위)를 재서 큰 쪽을 min-height 로(태국어·우르두 제목이 한 상태에서만 두 줄 → 영상 18px 밀리던 것)
  function lockBoth() {
    if (!KO_UI.includes(lang)) return;
    const sc = app.querySelector(".scr.learn"), ttl = app.querySelector(".vtitle"), els = [ttl, ...items].filter(Boolean);
    els.forEach(e => e.style.removeProperty("min-height"));
    const hs = () => els.map(e => e.getBoundingClientRect().height), on0 = sc.classList.contains("lfirst");
    const H = document.documentElement, u0 = H.classList.contains("uiko"); // 반대 상태 = 위아래 + ⇄ 글꼴 규칙(html.uiko)까지(우르두 글꼴 · 15px)
    const a = hs(); swapTo(!on0); H.classList.toggle("uiko", !u0); fitTitle(ttl); const b = hs(); swapTo(on0); H.classList.toggle("uiko", u0); fitTitle(ttl);
    els.forEach((e, k) => { const m = Math.max(a[k], b[k]); if (Math.abs(a[k] - b[k]) > 0.5) e.style.minHeight = m.toFixed(1) + "px"; }); // 두 상태가 다르면 큰 쪽으로(어느 상태에서 열어도)
    sc.classList.add("lockh");
  }
  // 지금 줄 카드(큰 글 · 맞춘 크기)도 두 상태를 재서 큰 쪽을 min-height 로(개발2팀 10-23 · 화면 열 때 lockBoth 는 그 카드가 지금 줄이 아닐 때 잼 → 우르두 3번 줄 ⇄ 때 31px 줄던 것)
  function lockCard(el) {
    if (!KO_UI.includes(lang)) return;
    const sc = app.querySelector(".scr.learn"), H = document.documentElement, on0 = sc.classList.contains("lfirst"), u0 = H.classList.contains("uiko");
    el.style.removeProperty("min-height"); const a = el.getBoundingClientRect().height; swapTo(!on0); H.classList.toggle("uiko", !u0); const b = el.getBoundingClientRect().height; swapTo(on0); H.classList.toggle("uiko", u0);
    if (Math.abs(a - b) > 0.5) el.style.minHeight = Math.max(a, b).toFixed(1) + "px";
  }
  function swapTo(on) {
    app.querySelector(".scr.learn")?.classList.toggle("lfirst", on);
    for (const li of items) { const ko = li.querySelector(".kotext"), tr = li.querySelector(":scope > .tr"); if (!ko || !tr) continue; if (on && ko.nextElementSibling === tr) ko.before(tr); else if (!on && tr.nextElementSibling === ko) ko.after(tr); }
    const tt = app.querySelector(".vtitle .tt"), b = tt?.querySelector(":scope > b"), sub = tt?.querySelector(":scope > .sub"); if (b && sub) { if (on && b.nextElementSibling === sub) b.before(sub); else if (!on && sub.nextElementSibling === b) b.after(sub); }
  }
  applyFirst();
  const playBtn = app.querySelector("[data-act=play]");
  // 맨 앞 줄에선 |◀, 맨 끝 줄에선 ▶| 못 누름(투덜이 10-08 — 다른 ◀ ▶ 처럼) · 설명·쓰기 창이면 그 창의 줄 기준
  const prevBtn = app.querySelector(".ctrl [data-act=prev]"), nextBtn = app.querySelector(".ctrl [data-act=next]");
  const edgeT = setInterval(() => { const i = st.panel ? st.panel.i : st.cur; if (prevBtn) prevBtn.disabled = !(i > 0); if (nextBtn) nextBtn.disabled = !(i < L.length - 1); }, 150);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 선택 · 따라가기 ──
  function select(i, { scroll = true, force = false } = {}) {
    i = Math.max(0, Math.min(L.length - 1, i));
    if (i !== st.cur) {
      items.forEach(li => li.classList.remove("peek")); /* 자막 끔 때 잠깐 본 카드 = 다음 줄로 가면 다시 흐림 */
      items[st.cur]?.classList.remove("cur");
      items[st.cur]?.querySelector(".expl").classList.remove("on");
      st.cur = i;
    }
    try { localStorage.setItem("malmun.last", JSON.stringify({ ep, id: L[i].id })); } catch {} // 다시 열면 이어 보기(검사부 여정 10-20)
    items[i].classList.add("cur"); app.querySelector(".vtitle .n").textContent = `${i + 1} / ${L.length}`; if (ready) vsubFill(i); if (ready) fitCard(i); // 카드 글 크기 = 네 창 같게
    items.forEach((li, k) => li.classList.toggle("past", k < i));
    // 전체 화면(화면만 보기)에서도 자막은 보여야 한다 — 영상 아래쪽에 지금 줄
    capFill(i);
    if (scroll && (force || Date.now() - st.handScroll > 4000)) underVideo(items[i]);
    const p = progress.get(ep);
    progress.set(ep, { at: i, line: Math.max(p.line || 0, i + 1) });
  }
  // 지금 줄 = 영상(+모드 줄) 바로 아래 · 앞 줄들은 영상 뒤로 올라간다
  const stick = app.querySelector(".stick"), list = app.querySelector(".lines");
  // 폰 가로(높이 ≤ 500 · 크게 보기 아닐 때) = 왼쪽 영상 기둥 · 오른쪽 줄 목록 두 칸(대표님 10-16) — 줄 목록 위에 덮는 칸이 없으니 「영상 아래」 = 화면 위
  const mqSide = matchMedia("(orientation: landscape) and (max-height: 500px)"), side = () => mqSide.matches && !st.big, stickH = () => (side() ? 0 : stick.offsetHeight);
  function underVideo(el, instant = false) {
    const to = Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - stickH() - 10, document.documentElement.scrollHeight - innerHeight));
    cancelAnimationFrame(st.anim); clearTimeout(st.animEnd);
    if (instant || reduce || document.hidden) return scrollTo(0, to);
    // 화면 그리기 박자가 멈춰도(가려진 창 · 느린 폰) 제자리에 가 있게 — 움직임이 끝날 시각에 한 번 더 맞춘다
    st.animUntil = performance.now() + SCROLL_MS + 120; // 움직이는 동안은 지킴이가 끼어들지 않게
    st.animEnd = setTimeout(() => { cancelAnimationFrame(st.anim); if (Math.abs(scrollY - to) > 2) scrollTo(0, to); }, SCROLL_MS + 80);
    const from = scrollY, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / SCROLL_MS); scrollTo(0, from + (to - from) * (1 - (1 - k) ** 3)); if (k < 1) st.anim = requestAnimationFrame(step); };
    st.anim = requestAnimationFrame(step);
  }
  // 마지막 줄도 영상 바로 아래까지 올라올 수 있게 목록 아래 여백 = 화면에서 영상을 뺀 높이
  const ctrlBar = app.querySelector(".ctrl");
  const pad = () => { list.style.paddingBottom = Math.max(ctrlBar.offsetHeight + 24, innerHeight - stickH() - 40) + "px"; }; // 맨 끝 줄도 아래 막대 위로 다 보이게
  // 지금 줄이 위 창과 아래 막대 사이에 다 보이지 않으면 그 자리로(손으로 스크롤 중이면 4초 기다림 — handScroll 그대로)
  // 기준(본부 10-05): 줄 카드 전체(아래끝 포함)가 영상 아래~막대 위에 보일 것 · 아니면 카드 위끝을 영상 바로 아래로(카드가 그 사이보다 길어도 위끝 맞춤)
  // 쓰기 창이 열려 있으면 지금 자막 카드(글 전부 + 아래 메뉴 줄)가 쓰기 창과 아래 막대 사이에 다 들어가게 — 길면 카드 안 글을 줄임(10-06 본부·투덜이)
  function fitCard(i) {
    if (st.cardKeep === i) return; // ⇄ 뒤 같은 카드 = 맞춘 단계 그대로(⇄ 0px · 다국어부 10-19 ru 375 카드 단추 줄 14~21px) · 다른 줄·창 크기가 바뀌면 다시 맞춤
    st.cardKeep = -1;
    items.forEach(li => { li.classList.remove("fitc", "tr2", "tr1", "ac1"); li.style.removeProperty("--kf"); li.style.removeProperty("--tf"); });
    const el = items[i]; if (!el) return; const mh0 = el.style.minHeight; el.style.removeProperty("min-height"); // 맞출 땐 글 높이로만(⇄ 고정 높이는 맞춘 뒤 다시 — 아래 lockCard) // 네 창(영상·설명·쓰기·말하기) 모두 같은 카드 자리·같은 글 크기(본부 10-06 「한 틀」)
    const avail = ctrlBar.getBoundingClientRect().top - stick.getBoundingClientRect().bottom - 14;
    const kt = el.querySelector(".kotext"), tt = el.querySelector(":scope > .tr"), ko = (lFirst() && tt) || kt, tr = lFirst() && tt ? kt : tt; if (!ko) { if (mh0) el.style.minHeight = mh0; return; } // 뜻 줄 없는 줄·언어 바꾼 뒤에도(쓰기부 10-20 getComputedStyle null) // 위 자리 = --kf · 아래 = --tf(⇄ 위아래)
    let kf = parseFloat(getComputedStyle(ko).fontSize), tf = tr ? parseFloat(getComputedStyle(tr).fontSize) : 0;
    el.classList.add("fitc");
    for (let k = 0; k < 16 && el.offsetHeight > avail && kf > 11; k++) { kf -= 1; tf = Math.max(10, tf - 0.7); el.style.setProperty("--kf", kf + "px"); el.style.setProperty("--tf", tf + "px"); }
    for (const c of ["tr2", "tr1"]) { if (!tr || el.offsetHeight <= avail) break; el.classList.remove("tr2", "tr1"); el.classList.add(c); } if (el.offsetHeight > avail) el.classList.add("ac1"); lockCard(el); /* 줄 카드 단추 = 늘 그림만 · 이름은 aria-label(10-20) */ /* 그래도 넘치면 [▶ 이 줄 듣기] = ▶ 만(글은 화면 읽기용으로 남김) · 단추 안쪽 여백 줄임(다국어부 10-12 ur 320 — 단추가 셋째 줄로) */ // 가장 작은 글로도 넘치면 학습자 말 뜻을 2줄 → 1줄(설명 창에 다 보임 · 검사부 10-12 vi·th·ur 320 — 단추가 아래 막대 뒤로)
  }
  // 영상 창 = 제목 줄 바로 밑에 영상(위 정렬) · 남는 자리(폰)에 지금 대사를 영화 자막처럼 크게(투덜이 10-06 ㅇ) — 화자(작게) · 한국어(굵게) · 로마자(켜짐이면 작게) · 학습자 언어
  //   글 크기 = 그 자리를 채우는 가장 큰 크기(넘치면 줄임 · 스크롤 0) · 대사가 바뀔 때와 창 크기가 바뀔 때만 다시 맞춤 · 자리가 70px 안 되면(넓고 낮은 창) 자막 줄 없음
  // 제목 줄이 좁은 폰(320)에서 「…」로 잘리지 않게(다국어부 10-12) — 18 → 16 → 14px → 두 줄
  function fitTitle(ttl) {
    const els = [...ttl.querySelectorAll(".tt b, .tt .sub")], over = () => els.some(e => e.scrollWidth > e.clientWidth + 1);
    for (const c of ["", "t1", "t2", "t3"]) { ttl.classList.remove("t1", "t2", "t3"); if (c) ttl.classList.add(c); if (!over()) break; }
  }
  // 크게 보기(⛶) 자막 = 한 줄만(대표님 10-22): 학습자 말 · ⇄ 한국어면 한국어(번역 없는 줄 = 한국어) · CC 끔 = 없음(css .nosub)
  function capFill(i) { const l = L[i], cap = app.querySelector(".cap"); if (!l || !cap) return; cap.innerHTML = uiKoOn() || !l.tr ? `<span class="ko" lang="ko">${esc(l.ko)}</span>` : `<span class="tr" dir="auto">${esc(l.tr)}</span>`; }
  function vsubFill(i) {
    const vm = app.querySelector(".vmain"), box = app.querySelector(".vsub"), inn = box.querySelector(".in"), ttl = app.querySelector(".vtitle");
    if (vm.hidden) return;
    fitTitle(ttl);
    const free = Math.floor(vm.clientHeight - ttl.offsetHeight - (vm.clientWidth * 9) / 16);
    if (free < 70) { box.hidden = true; box.style.removeProperty("height"); return; }
    box.hidden = false; box.style.height = free + "px";
    const l = L[i], rom = romOn() ? (l.v9?.pieces || []).map(p => p.rom).filter(Boolean).join(" ") : "";
    inn.innerHTML = `<span class="who">${spkHtml(l.speaker)}</span><b class="ko" lang="ko">${esc(l.ko)}</b>${rom ? `<span class="rom">${esc(rom)}</span>` : ""}${l.tr ? `<span class="tr">${esc(l.tr)}</span>` : ""}`;
    const fits = z => { inn.style.zoom = String(z); return box.scrollHeight <= box.clientHeight && inn.getBoundingClientRect().height <= box.clientHeight; };
    let lo = 0.6, hi = 1.8;
    if (fits(hi)) lo = hi; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    inn.style.zoom = (Math.floor(lo * 100) / 100).toFixed(2);
  }
  // 위 칸 안 내용 = 그 칸 안에서 맞춤(설명·말하기 — 칸 크기는 그대로 · 넘치면 안 내용만 작게 · 쓰기는 write.js 가 스스로 맞춤)
  // ⇄(앱 글 언어) 뒤 설명 창 = 막대·「말해 보세요」 단추 크기·자리 그대로(본부 ⇄ 0px · 다국어부 10-15) — 창 zoom 은 두고 본문 글(.v9body 안 단추 칸 빼고)만 넘치면 줄임(0.6배까지)
  function fitBody() {
    const body = panel.querySelector(".v9body"); if (!body) return;
    const tg = [...body.children].filter(c => !c.classList.contains("sayb")).concat([...body.querySelectorAll(".sayb > p")]);
    tg.forEach(c => c.style.removeProperty("zoom"));
    for (let z = 0.96; z >= 0.6 && panel.scrollHeight > panel.clientHeight; z -= 0.04) tg.forEach(c => (c.style.zoom = z.toFixed(2)));
  }
  function fitPanel() {
    const kind = st.panel?.kind; if (kind !== "explain" && kind !== "speak") return;
    if (st.uiFit && kind === "explain") return fitBody(); // ⇄ 뒤엔 창을 연 뒤 늦게 오는 맞춤(0.3초·글꼴)도 본문만 — 창 크기 그대로
    const kids = [...panel.children].filter(c => !c.classList.contains("vplay"));
    kids.forEach(c => c.style.removeProperty("min-height")); // 아래 「창 높이 채움」은 잴 때 빼고
    // 설명 = 칸을 꽉 채우는 가장 큰 크기(짧은 줄은 키우고 긴 줄은 줄임 · 15px → 최대 20px · 칩·간격도 같은 비율 — 본부 10-06) · 말하기 = 넘칠 때만 줄임
    const uk = panel.querySelector(".v9bar .chip.uiko"), ukH = z => uk && (uk.style.minHeight = `${(32 / z).toFixed(1)}px`); // ⇄한 = 줄여도 화면에서 32px(본부 1014.2 누르기 쉽게)
    const xb = kind === "explain" && !st.big ? panel.querySelector(".v9bar") : null;
    const vb = st.big && kind === "speak" ? panel.querySelector(".whead") : null; // 크게 말하기 = 머리 줄 폭 안에서만 키움(설명 막대는 크게일 때 두 줄로 꺾여도 됨) // 크게 보기 = 위 막대가 옆으로 넘치지 않는 데까지만 키움(보통 화면은 그대로)
    const fits = z => { kids.forEach(c => (c.style.zoom = String(z))); ukH(z); return panel.scrollHeight <= panel.clientHeight && (!vb || vb.scrollWidth <= vb.clientWidth + 1) && (!xb || !v9Over(xb)); }; // xb = 설명 막대: 키운 배율에서도 한 줄 안(키우면 막대 칸이 좁아져 ✕ 가 밖으로 · 검사부 1016.29 ne 375)
    let lo = 0.5, hi = kind === "explain" ? (st.big ? 1.7 : 1.33) : st.big ? 1.15 : 1; // 크게 설명 = 화면 높이를 글이 다 쓰게 // 크게 보기 말하기 = 과제 글·단추도 키움
    if (fits(hi)) lo = hi; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    lo = Math.floor(lo * 1000) / 1000;
    kids.forEach(c => (lo === 1 ? c.style.removeProperty("zoom") : (c.style.zoom = String(lo)))); ukH(lo);
    for (let k = 0; k < 8 && panel.scrollHeight > panel.clientHeight && lo > 0.4; k++) { lo -= 0.015; kids.forEach(c => (c.style.zoom = lo.toFixed(3))); ukH(lo); } // 그래도 1px 이라도 넘치면 조금씩 더
    // 설명(v9) 틀 = 창 높이를 늘 채움(.exv.v9 높이 auto 라 본문이 짧아지면 「말해 보세요」 칸이 따라 올라감 → ⇄ 때 단추 자리 0px · 다국어부 10-15)
    if (kind === "explain") kids.forEach(c => c.classList.contains("v9") && (c.style.minHeight = `${Math.max(0, panel.clientHeight / lo - 0.5).toFixed(2)}px`));
    st.fitH = kids.reduce((a, c) => a + c.offsetHeight, 0); // 맞춘 때의 내용 높이 — 바뀌면(로마자 켬/끔 · 말해 본 결과 · 단추 줄) 다시 맞춤
  }
  function keepVisible(i, { force = false } = {}) {
    const el = items[i]; if (!el || (!force && Date.now() - st.handScroll <= 4000)) return;
    pad(); fitCard(i);
    const r = el.getBoundingClientRect(), top = side() ? 0 : stick.getBoundingClientRect().bottom, bot = side() ? innerHeight : ctrlBar.getBoundingClientRect().top;
    const fits = r.height <= bot - top;
    if (st.panel ? Math.abs(r.top - top - 10) > 14 : r.top < top - 1 || (fits ? r.bottom > bot + 1 : r.top > top + 12)) underVideo(el); // 쓰기 중 = 언제나 쓰기 창 바로 아래
  }
  new ResizeObserver(() => pad()).observe(stick);
  // 위 칸 내용이 바뀌어 높이가 달라지면 그 순간 한 번 다시 맞춤(스크롤 0 · 본부 10-06) — 소리 재생 중 강조만 바뀌는 것은 높이가 같아 건드리지 않음
  let refitQ = 0;
  new MutationObserver(() => { if (refitQ) return; refitQ = setTimeout(() => { refitQ = 0; // 강조 표시가 쉬지 않고 바뀌어도 120ms 마다 한 번은 살핌(늦추기만 하면 영영 안 돎)
    if (!st.panel || (st.panel.kind !== "explain" && st.panel.kind !== "speak")) return;
    const h = [...panel.children].filter(c => !c.classList.contains("vplay")).reduce((a, c) => a + c.offsetHeight, 0);
    if (st.uiFit && st.panel.kind === "explain") return fitBody(); // ⇄ 뒤 = 창 크기 그대로 · 본문 글만 맞춤
    if (Math.abs(h - (st.fitH || 0)) > 2 || panel.scrollHeight > panel.clientHeight) fitPanel();
  }, 120); }).observe(app.querySelector(".panel"), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class", "aria-pressed"] });
  const onFit = () => { st.uiFit = false; st.cardKeep = -1; lockBoth(); fitPanel(); vsubFill(st.cur); fitCard(st.cur); clearTimeout(st.fitT); st.fitT = setTimeout(() => keepVisible(st.cur), 120); }; // 창 크기가 바뀌면(브라우저가 스크롤을 옮겨도) 지금 줄 카드를 제자리로 — 손 스크롤 중이면 그대로
  addEventListener("resize", onFit);
  addEventListener("resize", pad); pad();
  ["touchmove", "wheel"].forEach(e => window.addEventListener(e, () => { st.handScroll = Date.now(); }, { passive: true }));

  const playing = () => (st.panel?.kind === "explain" ? ex.playing || !!st.gap : st.mode === "video" ? !v.paused || !!st.gap : seq.playing);
  const clearExpl = () => items.forEach(li => { const e = li.querySelector(".expl"); if (e.classList.contains("on") || e.firstChild) { e.classList.remove("on"); e.textContent = ""; } });
  const sync = () => {
    playBtn.innerHTML = playing() ? I.pause : I.play;
    app.querySelector("#vwrap").classList.toggle("paused", !playing());
    app.querySelector(".panel").classList.toggle("paused", !playing());
    items.forEach((li, k) => li.classList.toggle("onceplay", st.once && k === st.cur && playing()));
    if (st.mode === "video" || !v.paused) clearExpl();
    flipLabel(); // 아래 오른쪽 토글 글 = 지금 창에 맞게 // 영상 모드·영상 재생 중엔 줄 밑 설명 글·짝 줄·불을 남기지 않음(본부 10-05 투덜이 버그)
    app.querySelectorAll(".v9bar .pb[data-x=ex]").forEach(b => { const on = b.getAttribute("aria-pressed") === "true" && ex.playing; b.classList.toggle("playing", on); b.querySelector(".ic").textContent = on ? "■" : "▶"; }); // 나오는 동안 ■ + 은은한 깜빡
  };
  function stopAll() {
    clearTimeout(st.gap); st.gap = 0;
    v.pause(); seq.stop();
    items.forEach(li => li.querySelector(".expl").classList.remove("on"));
  }

  // ── 영상: 줄 끝을 0.05초 단위로 지킨다(timeupdate 는 0.25초씩이라 다음 줄 소리가 새어 나온다) ──
  function tick() {
    if (st.mode !== "video" || v.paused) return;
    const now = v.currentTime, l = L[st.cur];
    if ((st.once || st.rep) && now >= l.end) {
      v.pause();
      if (st.rep) {
        v.currentTime = l.start;
        st.gap = setTimeout(() => { st.gap = 0; if (st.rep && !st.panel && !document.hidden) v.play().catch(() => {}); sync(); }, LOOP_GAP); /* 위 창(쓰기·말하기·설명)이 떠 있거나 탭이 숨으면 다시 안 틂(본부 10-15 가만히 있는데 소리) */
      } else st.once = false;
      return sync();
    }
    if (!st.once && !st.rep) {
      let k = -1;
      const lead = LEAD * v.playbackRate;
      for (let i = 0; i < L.length; i++) if (L[i].start <= now + lead) k = i;
      if (k >= 0 && k !== st.cur) select(k);
    }
  }
  const timer = setInterval(tick, 50);
  v.addEventListener("timeupdate", tick); // 화면이 가려져 타이머가 느려져도 줄 끝에서 멈추게
  ["play", "pause", "ended"].forEach(e => v.addEventListener(e, sync));

  // ── 듣기 모드: 조각 이어 재생 ──
  function lessonItems(from, onlyOne) {
    const out = [];
    for (let i = from; i < (onlyOne ? from + 1 : L.length); i++) {
      const l = L[i];
      if (st.mode === "full" && l.lineAudio) out.push({ src: paths.audio(ep, l.lineAudio), i, p: -1 });
      if (l.v9) { const it = v9Items(i, { line: false })[0]; if (it) out.push({ ...it, i }); }
      else l.krAudio.forEach((f, p) => out.push({ src: paths.audio(ep, f), i, p }));
    }
    return out;
  }
  seq.onstep = it => {
    select(it.i);
    v.currentTime = L[it.i].start;
    const box = items[it.i].querySelector(".expl");
    const vx = L[it.i].v9;
    if (it.p >= 0 && vx) { box.innerHTML = `<p>${v9Sent(it.i, it.lang || v9code(txtOf(it.i)))}</p>${pairHTML(it.i, it.lang || v9code(txtOf(it.i)), 0)}`; box.classList.add("on"); } // 카드와 같은 모양(문장 span · 괄호 없음 · 누르면 말풍선)
    else if (it.p >= 0) { box.innerHTML = renderText(L[it.i].krParas[it.p] || ""); box.classList.add("on"); }
    else box.classList.remove("on");
    sync();
  };
  seq.ondone = () => {
    if (st.rep) { st.gap = setTimeout(() => { st.gap = 0; if (st.rep && !st.panel && !document.hidden) seq.play(lessonItems(st.cur, true)); }, LOOP_GAP); }
    else st.once = false;
    sync();
  };

  // ── 위 창 = 영상 · 설명 · 쓰기 중 하나(R12) — 조작은 줄 단추(토글) + 아래 막대 하나뿐(R14) ──
  const panel = app.querySelector(".panel"), vwrap = app.querySelector(".vmain"); // 영상 창 = 제목 줄 + 영상(위 창이 열리면 같이 숨김)
  const ex = new Sequence(); // 설명 읽기(대사 → 설명 문단)
  const romOn = () => pref("malmun.rom") !== "0";
  st.panel = null;
  // ── 새 설명(v9 시안 · 본부 10-03) — 설명 「소리 언어」와 「글 언어」를 따로(교차가 핵심 · 투덜이 철학) · 화면에는 표시형(text)만
  // 소리 = 언어 이름이 붙은 ▶ 단추 둘(누른 언어를 기억 → 듣기 모드도 그 언어) · 글 = 설명 글 바로 위 작은 탭 · 처음엔 둘 다 학습자 언어
  // 아이콘만 있는 단추 없음 · 안쪽 스크롤 없음(폰 375×812 한 화면) · 「이제 말해 보세요」는 카드 안에서 녹음→점수→내 목소리(카드를 떠나지 않음)
  const v9L = d.v9L, v9pref = () => { try { return { snd: "L", txt: "L", ...JSON.parse(pref("malmun.v9") || "{}") }; } catch { return { snd: "L", txt: "L" }; } };
  // 글 언어 = 소리와 따로(검사부 10-20 th — 학습자 말 낭독이 아직 없으면 글까지 한국어로 바뀌던 것) · 학습자 말 글이 있으면 그 글(소리는 한국어로)
  const txtOf = i => { const s0 = v9pref().txt; return s0 === "L" && !L[i]?.v9?.text?.[v9L] ? "ko" : s0; };
  const sndOf = i => { const s0 = v9pref().snd; return s0 === "L" && !L[i]?.v9?.audio?.[v9L]?.ex ? "ko" : s0; }; // 학습자 말 설명 소리가 아직 없는 줄(시범 언어 글만 단계) = 한국어 소리로(시각도 한국어 · 언어부 10-12)
  const v9set = (k, v) => { const P = v9pref(); P[k] = v; pref("malmun.v9", JSON.stringify(P)); };
  // 언어 하나(본부 10-13 투덜이 지적 ① · 안 A) — 앱 글 한국어(ने⇄한 = uiKo) = 설명 소리·본문도 한국어 · 학습자 말이면 모두 학습자 말
  //  머리 토글·설명 창 ▶ 어느 쪽을 눌러도 같이 · 다시 그리지 않고 그 자리에서 글만(retext) → 소리·녹음·채점 안 끊김 · ko.json 은 미리 받아 둠
  const koMode = KO_UI.includes(lang);
  if (koMode) { preloadKoUi(); const w0 = uiKoOn() ? "ko" : "L"; if (v9pref().snd !== w0) v9set("snd", w0); if (v9pref().txt !== w0) v9set("txt", w0); }
  async function uiLang(ko) { st.uiBar = true; try { await switchUiKo(ko); } finally { st.uiBar = false; } } // 설명 막대 고르기 → 앱 글도(되돌아오기 안내 포함) · 소리·본문은 그 손잡이가 맞춤
  const v9code = k => (k === "ko" || !v9L ? "ko" : v9L); // 학습자 언어 설명이 없으면 한국어만(언어부 10-11)
  const v9name = k => (k === "ko" || !v9L ? "한국어" : langName(v9L));
  const v9src = (i, k, what) => { const a = L[i].v9?.audio?.[v9code(k)]?.[what]; return a ? paths.v9(ep, a) : null; };
  const bold = s => esc(s).replace(/&quot;([^&]*?)&quot;|"([^"]*?)"/g, (m, a, b) => `<b>"${a ?? b}"</b>`);
  const sayKey = i => `${ep}/${ep}_${String(L[i].id).padStart(2, "0")}_say`; // 말하기 창의 같은 과제와 같은 칸(✓ 공유)
  const mmss = x => (isFinite(x) ? `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}` : "0:00");
  function v9HTML(i) {
    const l = L[i], x = l.v9, P = v9pref(), tc = v9code(P.txt), tx = x.text?.[tc] || x.text?.ko || {};
    const fx = x.formula_by?.[tc] || x.formula;
    const playBtn = k => `<button class="pb" data-x="ex" data-v="${k}" aria-pressed="false"><span class="ic" aria-hidden="true">▶</span> ${esc(v9name(k))}</button>`;
    // 맨 위 한 줄(본부 10-05 투덜이 승인): 「듣기」 동그란 재생 묶음 · 「읽기」 탭 묶음 · ✕ — 이름표 = 학습자 언어 + (한국어)
    const k = sndOf(i), code = v9code(txtOf(i));
    const lab = key => `<span class="glab"><span data-k="${key}">${esc(t(key))}</span></span>`; // 괄호 속 한국어 덧붙임 뺌 — 화면 글은 한국어 ⇄ 학습자 언어 중 하나만(대표님 10-19 · 검사부 th · 다국어부 10-20)
    return `<div class="exv v9${romOn() ? "" : " norom"}">
      <div class="v9bar">${lab("v9_listen")}<span class="seg snd">${v9L ? (x.audio?.[v9L]?.ex ? playBtn("L") : `<button class="pb nosnd" disabled aria-disabled="true"><span class="ic" aria-hidden="true">🔇</span> ${esc(v9name("L"))}</button>`) : ""}${playBtn("ko")}</span>${x.sent?.length ? `<span class="snum" aria-live="off">1/${x.sent.length}</span>` : ""}${uiKoBtn()}<button class="romb" data-x="v9rom" aria-pressed="${romOn()}"><span data-k="v9_rom">${esc(t("v9_rom"))}</span></button><button class="pb closex" data-x="close" title="${esc(t("close_word"))}" aria-label="${esc(t("close_word"))}"><span class="cx">✕</span><span class="cw"> ${esc(t("close_word"))}</span></button><div class="v9tip" hidden>${esc(t("v9_tip"))}</div></div>
      ${v9L ? "" : `<div class="v9soon">${esc(t("v9_lang_soon"))}</div>`}<div class="v9pop" hidden></div>
      <div class="v9body">
        ${x.pieces?.length || fx ? `<div class="chips">${(x.pieces || []).map(c => `<span class="chip"><b class="ko" lang="ko">${esc(c.ko)}</b> <i>${c.rom != null ? `<span class="rom">${esc(c.rom)}${c.mean && v9L ? ", " : ""}</span>${v9L ? esc(c.mean || "") : ""}` : v9L ? esc(c.gloss || "") : ""}</i></span>`).join("")}${fx ? `<span class="fx">= <b>${esc(fx)}</b></span>` : ""}</div>` : ""}
        <p data-p="0">${v9Sent(i, code)}</p>${pairHTML(i, code, 0)}
        ${l.say ? `<div class="sayb"><p data-p="1" class="sayp">${sayHTML(i, code)}</p>
          <div class="sbtns" data-keep="${esc(t("keep_short"))}"><button class="mic" data-x="rec">${micLbl()}</button><button data-x="model">▶ ${esc(t("model"))}</button><button class="mrate" data-x="mrate" aria-label="${esc(t("speed"))}" aria-pressed="${getRate("m") !== 1}">${rateLabel(getRate("m"))}</button><button data-x="mine" disabled>▶ ${esc(t("my_voice"))}</button><button data-x="keep" title="${esc(t("keep"))}" hidden>${esc(t("keep_short"))}</button><button data-x="savedplay" title="${esc(t("saved_title"))}" hidden>${esc(t("saved_play"))}</button><span class="mini"><button data-x="savedl" class="small" title="${esc(t("download"))}" hidden>⬇ ${esc(t("dl_short"))}</button><button data-x="savedel" class="small" title="${esc(t("del_one"))}" hidden>🗑 ${esc(t("del_short"))}</button></span></div>
          <div class="sline"><span class="lvl" hidden><i></i></span><span class="smsg" aria-live="polite" data-empty="— %"></span><span class="fx" aria-hidden="true"></span></div><div class="tbar" hidden><i></i><em class="pace" hidden></em><span class="tt"></span></div><div class="heardline" data-empty="${esc(t("heard_label"))}: —"></div><div class="microw" data-empty="🎤 ${esc(micLabel() || t("mic_pick"))}"><button class="micname" data-x="mics" hidden></button><select class="micsel" hidden></select></div></div>` : ""}
      </div>
</div>`;
  }
  // v9 설명 소리 차례: (대사) → 설명 → 「이제 말해 보세요」 — 고른(마지막에 누른) 소리 언어
  const v9Items = (i, { line = true, k = sndOf(i) } = {}) => [
    ...(line && L[i].lineAudio ? [{ src: paths.audio(ep, L[i].lineAudio), p: -1 }] : []),
    ...(v9src(i, k, "ex") ? [{ src: v9src(i, k, "ex"), p: 0, lang: v9code(k) }] : []),
    ...sayItems(i, k),
  ];
  // 「이제 말해 보세요」 차례 = 머리말(듣는 언어) → 0.6초 쉼 → 본보기 문장(한국어) · 머리말·문장 소리가 없으면 옛 붙은 소리(say)
  function sayItems(i, k) {
    const head = d.v9head?.[v9code(k)], sent = L[i].v9?.audio?.ko?.sentence;
    if (head && sent) return [{ src: paths.v9(ep, head), p: 1, lang: v9code(k), part: "head" }, { src: paths.v9(ep, sent), p: 1, lang: v9code(k), part: "sent", gap: 600 }];
    return v9src(i, k, "say") ? [{ src: v9src(i, k, "say"), p: 1, lang: v9code(k) }] : [];
  }
  // 설명 글 = 문장 짝(sent)을 듣는 언어로 이어 붙임 · 문장마다 span(누르면 다른 언어 짝) · 따옴표 속 한국어 = 누르면 로마자·뜻(gloss) · 괄호 병기 없음(본부 10-05)
  const qWords = (i, s) => esc(s).replace(/&quot;([^&]*?)&quot;|"([^"]*?)"/g, (m, a, b) => { const w = a ?? b, g = L[i].v9?.gloss?.[w]; return g ? `<b class="gw" data-x="gw" data-g="${esc(w)}" lang="ko">"${esc(w)}"</b>` : `<b>"${esc(w)}"</b>`; });
  function v9Sent(i, code) {
    const x = L[i].v9, sn = x.sent;
    if (!sn?.length) return bold((x.text?.[code] || x.text?.ko || {}).ex || "");
    // 문장 앞 작은 ▶ 단추는 없앰(투덜이 10-07 「원래 없던 게 생김 · 다 지워야」) — 문장 글을 누르면 그 문장부터 듣기는 그대로(투덜이 결정이 단추 원칙보다 먼저)
    // 낱말마다 감쌈(설명 노래방 칠 · 본부 10-08 — 데바나가리는 낱말 단위라야 글꼴이 안 깨짐) · 따옴표 낱말은 통째로
    const toks = str => code === "th" && globalThis.Intl?.Segmenter ? [...new Intl.Segmenter("th", { granularity: "word" }).segment(String(str))].map(x => x.segment) : String(str).match(/"[^"]*"\S*|\S+|\s+/g) || []; // 타이어는 띄어쓰기가 없어 낱말 나누기(Intl.Segmenter · 언어부 10-11)
    const kw = str => toks(str).map(tk => (/^\s+$/.test(tk) ? tk : `<span class="kw">${qWords(i, tk)}</span>`)).join("");
    return sn.map((s, k) => `<span class="sn" data-x="sn" data-s="${k}" data-i="${i}" data-c="${code}"${code === "ko" ? ' lang="ko"' : ""}>${kw(s[code] || "")}</span>`).join(" ");
  }
  // 「이제 말해 보세요」 칸(본부 10-05) — 첫 줄 = 안내(듣기 언어) · 한국어 문장 크게 · 로마자(작게 · 로마자 꺼지면 숨김) · 뜻(작게 · 학습자 언어 항상) · 괄호 없음
  function sayHTML(i, code) {
    const x = L[i].v9, a = sayParts(x.text?.[code]?.say), b = sayParts(x.text?.[v9L]?.say) || a;
    if (!a) return bold((x.text?.[code] || x.text?.ko || {}).say || "");
    return `<span class="sayin"${code === "ko" ? ' lang="ko"' : ""}>${esc(a.intro)}</span><span class="saybig" lang="ko" dir="ltr">${[...String(a.ko)].map(ch => `<span>${esc(ch)}</span>`).join("")}</span>${b?.rom ? `<span class="sayrom rom" dir="ltr">${esc(b.rom)}</span>` : ""}${b?.mean && v9L ? `<span class="saymean">${esc(b.mean)}</span>` : ""}`;
  }
  // 지금 문장 번호 = 재생 시각이 들어간 sent 칸
  const sentAt = (i, code, tm) => { const sn = L[i].v9?.sent || []; let k = 0; sn.forEach((s, j) => { if ((s[`${code}_s`] ?? 0) <= tm + 0.05) k = j; }); return k; };
  function v9Hl() { // 읽는 문장 불 켜기(재생 시각 따라 · 멈추면 그대로) — 카드 · 듣기 모드 줄 밑 글(본부 10-05 같은 모양)
    try { if (st.panel?.kind === "explain" && !ex.playing && !sp?.slow?.playing) { const sb = panel.querySelector(".v9body .sayp .saybig"); if (sb?.querySelector(".kar")) paintAt(sb.children, null, 0); } } catch {} // 견본이 끝나면 글자 칠 지움
    if (st.panel?.kind === "explain" && L[st.panel.i]?.v9 && ex.playing) {
      const it = ex.q[ex.i];
      if (it) {
        const k = it.p === 0 ? sentAt(st.panel.i, it.lang, ex.a.currentTime) : -1;
        panel.querySelectorAll(".v9body .sn").forEach(el => el.classList.toggle("cur", +el.dataset.s === k));
        // 문장 안 노래방 칠(본부 10-08) — 그 문장 시작 ~ 다음 문장 시작 사이를 낱말 글자 수 비례로
        { const sn = L[st.panel.i].v9?.sent || [], tm = ex.a.currentTime, s0 = sn[k]?.[`${it.lang}_s`] ?? 0, s1 = sn[k + 1]?.[`${it.lang}_s`] ?? (ex.a.duration || s0 + 1), fr = (tm - s0) / Math.max(0.1, s1 - s0);
          panel.querySelectorAll(".v9body .sn").forEach(el => { const ws = [...el.querySelectorAll(".kw")], on = +el.dataset.s === k, tot = ws.reduce((a, w) => a + w.textContent.length, 0) || 1; let c = 0;
            ws.forEach(w => { w.classList.toggle("kar", on && c / tot <= fr); c += w.textContent.length; }); }); }
        // 「이제 말해 보세요」 문장 = 견본 소리 따라 글자 칠
        { const say2 = it.p === 1 && it.part !== "head"; paintAt(panel.querySelector(".v9body .sayp .saybig")?.children || [], say2 ? st.sayAt : null, ex.a.currentTime); }
        // 「이제 말해 보세요」 소리 = 그 칸 안내·한국어 문장에 불 + 짝 줄도 그 말 · [▶ नमुना](문장만 · 언어 없음) = 한국어 문장에만(본부 10-05)
        // 머리말 = 안내 줄만 · 문장 = 한국어 문장만 · 옛 붙은 소리 = 둘 다 · [▶ नमुना](언어 없음) = 문장만
        const say = it.p === 1, head = say && it.part === "head", old = say && !!it.lang && !it.part;
        panel.querySelector(".v9body .sayp .sayin")?.classList.toggle("cur", head || old);
        panel.querySelector(".v9body .sayp .saybig")?.classList.toggle("cur", say && !head);
        const vb = panel.querySelector(".v9body");
        if (k >= 0) { setPair(vb, st.panel.i, it.lang, k); setNum(k); }
        else if (head) setPair(vb, st.panel.i, it.lang, "sayhead");
        else if (say && it.part === "sent") setPair(vb, st.panel.i, it.lang, "saymean");
        else if (old) setPair(vb, st.panel.i, it.lang, "say");
      }
    }
    if (seq.playing) {
      const it = seq.q[seq.i];
      if (it?.lang && it.p === 0) { const k = sentAt(it.i, it.lang, seq.a.currentTime); items[it.i]?.querySelectorAll(".expl .sn").forEach(el => el.classList.toggle("cur", +el.dataset.s === k)); setPair(items[it.i]?.querySelector(".expl"), it.i, it.lang, k); }
    }
  }
  const hlTimer = setInterval(v9Hl, 100);
  // 짝 줄(본부 10-05 투덜이 「하이라이트를 따라다니며 자동으로」) — 설명 글 바로 아래 고정 한 줄 · 불 켜진 문장의 다른 언어 짝 · 멈추면 그대로 · 재생 전엔 첫 문장
  const otherOf = code => (code === "ko" ? v9L : "ko");
  function pairHTML(i, code, k) {
    const s = L[i].v9?.sent?.[k]; if (!s) return "";
    const o = otherOf(code);
    return `<p class="pairln" data-k="${k}"${o === "ko" ? ' lang="ko"' : ""}><span class="arr" aria-hidden="true">↳</span> ${bold(s[o] || "")}</p>`;
  }
  function setPair(root, i, code, k) {
    const p = root?.querySelector(".pairln"); if (!p || (p.dataset.k === String(k) && p.dataset.c === code)) return;
    const o = otherOf(code);
    let txt; // k = 문장 번호 · "say" = 「이제 말해 보세요」 칸(다른 언어 안내 + 한국어 문장)
    if (k === "say") { const a = sayParts(L[i].v9?.text?.[o]?.say); if (!a) return; txt = `${a.intro} "${a.ko}"`; }
    else if (k === "sayhead") { const a = sayParts(L[i].v9?.text?.[o]?.say); if (!a) return; txt = a.intro; } // 머리말 짝 = 다른 언어 머리말
    else if (k === "saymean") { const a = sayParts(L[i].v9?.text?.[v9L]?.say); if (!a?.mean) return; txt = a.mean; } // 문장 짝 = 그 문장 뜻(학습자 언어)
    else { const s = L[i].v9?.sent?.[k]; if (!s) return; txt = s[o] || ""; }
    p.dataset.k = k; p.dataset.c = code; o === "ko" && k !== "saymean" ? p.setAttribute("lang", "ko") : p.removeAttribute("lang");
    p.innerHTML = `<span class="arr" aria-hidden="true">↳</span> ${bold(txt)}`;
  }
  const setNum = k => { const n = panel.querySelector(".v9bar .snum"), tot = L[st.panel?.i]?.v9?.sent?.length; if (n && tot) n.textContent = `${k + 1}/${tot}`; }; // 맨 위 「지금 문장/전체」
  // 문장 누르기 = 그 문장부터 재생(본부 10-05 — 문장 말풍선 없앰)
  function playFromSent(el) {
    const i = +el.dataset.i, s = +el.dataset.s, code = el.dataset.c, sn = L[i].v9?.sent?.[s]; if (!sn) return;
    const at = sn[`${code}_s`] || 0;
    if (el.closest(".expl")) { // 듣기 모드 줄 밑 글 — 그 줄 설명 조각을 그 문장부터, 이어서 다음 줄로
      const its = lessonItems(i), idx = its.findIndex(x => x.i === i && x.p === 0); if (idx < 0) return;
      its[idx] = { ...its[idx], at }; seq.play(its, idx);
      items[i].querySelectorAll(".expl .sn").forEach(x => x.classList.toggle("cur", +x.dataset.s === s)); setPair(items[i].querySelector(".expl"), i, code, s);
      return sync();
    }
    const k = sndOf(i), list = v9Items(i, { line: false, k }), from = list.findIndex(x => x.p === 0); if (from < 0) return;
    clearTimeout(st.gap); st.gap = 0; hushSay(); st.exLoop = list; markPlay(k);
    ex.play(list.map((x, j) => (j === from ? { ...x, at } : x)), from);
    panel.querySelectorAll(".v9body .sn").forEach(x => x.classList.toggle("cur", +x.dataset.s === s)); setPair(panel.querySelector(".v9body"), i, code, s); setNum(s);
    sync();
  }
  // 말풍선(하나만 · 바깥 누르면 닫힘)
  function v9Pop(el, html) {
    const box = el.closest(".exv.v9, .expl"); if (!box) return;
    let pop = box.querySelector(":scope > .v9pop"); if (!pop) { pop = Object.assign(document.createElement("div"), { className: "v9pop", hidden: true }); box.append(pop); }
    app.querySelectorAll(".v9pop").forEach(p => { if (p !== pop) { p.hidden = true; p.__for = null; } }); // 하나만
    if (!html) { pop.hidden = true; return; }
    if (!pop.hidden && pop.__for === el) { pop.hidden = true; pop.__for = null; return; } // 같은 것 다시 = 닫기
    pop.innerHTML = html; pop.hidden = false; pop.__for = el;
    const rs = el.getClientRects(), last = rs[rs.length - 1], b = box.getBoundingClientRect(), w = pop.offsetWidth;
    const top = last.bottom - b.top + 4; // 늘 낱말 아래쪽(글 위를 가리지 않게)
    pop.style.top = top + "px"; pop.style.left = Math.max(6, Math.min(b.width - w - 6, last.left - b.left)) + "px";
  }
  const hidePop = () => app.querySelectorAll(".v9pop").forEach(p => { p.hidden = true; p.__for = null; });
  function popFor(el) {
    const sn = el.closest(".sn"), i = sn ? +sn.dataset.i : st.panel.i, x = L[i].v9;
    if (el.dataset.x === "gw") { const w = el.dataset.g, g = x.gloss?.[w] || {}, rom = romOn() && g.rom, gm = v9L ? g.mean : null; /* 어댑터가 학습자 언어 뜻을 mean 으로(v2 · 언어부 #19) */ if (!gm && !rom) return ""; return `<b lang="ko">${esc(w)}</b>${rom ? ` <span class="rom">${esc(g.rom)}</span>` : ""}${gm ? ` · ${esc(gm)}` : ""}`; } /* 뜻 = 학습자 언어(없으면 로마자만 · 언어부 10-11) */ // 뜻·로마자 없으면 말풍선 없음
    return "";
  }
  const onDocDown = e => { if (!e.target.closest(".v9pop, [data-x=sn], [data-x=gw]")) hidePop(); };
  document.addEventListener("pointerdown", onDocDown, true);
  app.classList.toggle("norom", !romOn()); // 로마자 꺼짐 = 카드·줄 밑 글 모두
  // 듣는 언어 = 글 언어(읽기 탭 없음) — 글·말해 보세요 줄을 그 언어로 다시 그림
  function v9Text(i, k) {
    const code = v9code(k), tx = L[i].v9.text?.[code] || L[i].v9.text?.ko || {};
    const p0 = panel.querySelector('.v9body p[data-p="0"]'), p1 = panel.querySelector('.v9body p[data-p="1"]'), f = panel.querySelector(".v9body .chips .fx b");
    const fx = L[i].v9.formula_by?.[code] || L[i].v9.formula;
    if (p0) p0.innerHTML = v9Sent(i, code); if (p1) p1.innerHTML = sayHTML(i, code);
    const pl = panel.querySelector(".v9body .pairln"); if (pl) pl.outerHTML = pairHTML(i, code, +pl.dataset.k || 0); if (f) f.textContent = fx || "";
    hidePop();
  }
  function explainHTML(i) {
    if (L[i].v9) return v9HTML(i);
    const l = L[i], cards = glossCards(l.glossLine), hasTr = l.trParas.some(Boolean);
    return `<div class="exv ${romOn() ? "" : "hide-rom"}">
      <div class="exhead"><b>${esc(t("explain"))}</b><span class="sub">${i + 1} / ${L.length} · ${spkHtml(l.speaker)}</span><span class="grow"></span>
        ${cards.length ? `<button data-x="rom" aria-pressed="${romOn()}">${esc(t("gloss_toggle"))}</button>` : ""}
        ${hasTr ? `<button data-x="tr" aria-pressed="false">${esc(langName(lang))}</button>` : ""}</div>
      <div class="quote"><div class="glosses">${cards.length ? cards.map(c => `<span class="g"><span class="rom">${esc(c.rom)}</span><span class="kw ko" lang="ko">${esc(c.ko)}</span><span class="mean">${esc(c.mean)}</span></span>`).join("")
        : `<span class="kw ko" lang="ko">${esc(l.ko)}</span>`}</div>${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}</div>
      <div class="paras">${l.krParas.map((p, k) => `<p data-p="${k}">${renderText(p)}</p>`).join("") || `<p>${esc(t("no_explain"))}</p>`}
        <div class="learner" hidden><h3>${esc(langName(lang))}</h3>${l.trParas.map(p => `<p>${renderText(p)}</p>`).join("")}</div></div>
      <div class="exprog"><i></i></div>
      <span class="vplay" aria-hidden="true">${I.play}</span></div>`;
  }
  const exItems = i => L[i].v9 ? v9Items(i, { line: false }) : [ // v9 카드 = 설명부터(대사는 방금 듣고 연 것 · 본부 10-05 투덜이)
    ...(L[i].lineAudio ? [{ src: paths.audio(ep, L[i].lineAudio), p: -1 }] : []),
    ...L[i].krAudio.map((f, p) => ({ src: paths.audio(ep, f), p })),
  ];
  ex.onstep = it => {
    const ps = [...panel.querySelectorAll(".paras p[data-p], .v9body p[data-p]")]; // v9 카드는 안쪽 스크롤이 없어 옮기지 않는다
    ps.forEach((el, k) => el.classList.toggle("cur", k === it.p));
    if (!panel.querySelector(".v9")) ps[it.p]?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    sync();
  };
  ex.ondone = () => {
    markPlay();
    panel.querySelectorAll(".paras p.cur").forEach(el => el.classList.remove("cur"));
    // 🔁 반복은 「그 줄 설명 듣기」만(st.exLoop) — 카드 안 [본보기]·[내 목소리]·[저장됨 ▶]는 한 번만 나오고 끝(본부 10-04 「끝없이 되풀이」)
    const loop = st.exLoop;
    if (st.rep && st.panel?.kind === "explain" && loop) st.gap = setTimeout(() => { st.gap = 0; if (st.rep && st.panel?.kind === "explain" && st.exLoop === loop) ex.play(loop); sync(); }, LOOP_GAP);
    sync();
  };
  ex.a.addEventListener("timeupdate", () => { const a = ex.a, bar = panel.querySelector(".exprog i"); if (bar && a.duration) bar.style.width = (100 * a.currentTime) / a.duration + "%"; });
  const markButtons = () => items.forEach((li, k) => li.querySelectorAll("[data-act=explain],[data-act=write],[data-act=speak]").forEach(b => b.setAttribute("aria-pressed", String(!!st.panel && k === st.panel.i && b.dataset.act === st.panel.kind))));

  // 휴대폰 뒤로 가기 — 펼침(마이크 목록) → 창 → 영상 순서로 닫힘(본부 10-04) · 같은 주소에 한 칸씩 쌓고 닫을 때 그 칸을 걷어 낸다
  //  쌓은 칸 수(nav.depth)만큼만 걷어 냄 — 닫기가 두 번 불려도(뒤로 가기가 늦게 도착) 한 칸만(본부 10-07 폰: 창 열고 ✕ 를 몇 번 한 뒤 뒤로 → 앱 밖으로 나가던 것)
  const nav = { n: 0, skip: 0, depth: 0, want: 0 };
  // 뒤로 가기 기록(진단 화면 · 최근 30) — 본부 창에서만 나는 「앱 밖으로」 원인 찾기용
  const navLog = ev => { try { const a = JSON.parse(localStorage.getItem("malmun.navlog") || "[]"); a.push(`${new Date().toISOString().slice(11, 19)} ${ev} d${nav.depth} s${nav.skip} st${history.state?.malmun ?? "-"} ${location.hash} L${history.length}`); localStorage.setItem("malmun.navlog", JSON.stringify(a.slice(-30))); } catch {} };
  // 걷는 중(뒤로 가기가 아직 안 도착)에 새 창을 열면 칸 쌓기는 도착한 뒤에(순서가 꼬여 편 칸까지 걷던 것 막기)
  const doPush = () => { history.pushState({ malmun: ++nav.n }, ""); nav.depth++; navLog("push"); };
  const navPush = () => { if (nav.skip > 0) { nav.want++; navLog("push-wait"); return; } doPush(); };
  const navPop = () => { if (nav.want > 0) { nav.want--; navLog("pop-cancel"); return; } if (nav.depth > 0 && history.state?.malmun) { nav.depth--; nav.skip++; navLog("pop"); history.back(); } };
  // 앞 화면(창이 열린 채 다른 화면으로 간 것)이 남긴 「창 칸」은 건너뜀 — 뒤로가 아무 일도 안 하는 것처럼 보이던 것(본부 10-07)
  // ने⇄한 토글로 다시 그릴 때 열려 있던 창·자리(본부 10-08 — 쓰기 창이 닫혀 하던 걸 잃던 것) · 그 창 칸(history)은 그대로 이어 씀
  const reopen = (() => { try { const r = JSON.parse(sessionStorage.getItem("malmun.reopen") || "null"); sessionStorage.removeItem("malmun.reopen"); return r && r.ep === ep && Date.now() - r.at < 10000 ? r : null; } catch { return null; } })();
  if (reopen && history.state?.malmun) { nav.n = history.state.malmun; nav.depth = 1; } else if (history.state?.malmun) history.replaceState(null, "");
  const onPop = () => {
    if (nav.skip) { nav.skip--; navLog("popped"); if (!nav.skip && nav.want > 0) { nav.want--; doPush(); } return; }
    navLog("back");
    if (nav.depth === 0 && !st.panel && history.state?.malmun) { history.back(); return; } // 남은 창 칸 = 한 칸 더 뒤로
    if (nav.depth > 0) nav.depth--; // 폰 뒤로 = 쌓은 칸 하나가 빠짐
    if (gm.el) { closeGame(true); return; } // 🎮 겹침부터
    if (panel.__sp?.closeList?.()) return; // 마이크 목록부터
    if (st.panel) closePanel(true);
  };
  addEventListener("popstate", onPop);
  // ── 🎮 줄 게임 겹침 — 열 때 영상·소리 멈춤 · 배우기 화면은 그대로(같은 줄·같은 자리) · 닫기 = 게임의 돌아가기·나가기 · 폰 뒤로 가기
  const gm = { el: null, i: -1, v9: null, onMsg: null };
  const abs = u => new URL(u, location.href).href; // iframe(game/) 안에서도 맞는 주소
  async function openGame(i) {
    if (gm.el) return; stopAll(); ex.stop(); st.once = false; sync();
    const l = L[i]; gm.i = i;
    if (!gm.v9) gm.v9 = await fetch(paths.data(ep, ".v9")).then(r => r.ok ? r.json() : null).catch(() => null);
    const vl = gm.v9?.lines?.find(x => x.n === i + 1) || null, uw = l.units?.words || [];
    const data = { type: "malmun-line", ep, n: l.id, lang, view: uiKoOn() ? "ko" : lang, snd: new URL(`${MEDIA}/game/`, location.href).href,
      line: { ko: l.ko, l1: l.tr || "", audio: l.lineAudio ? [abs(paths.audio(ep, l.lineAudio))] : [] }, words: gameWords(vl, uw, lang, ep).map(w => ({ ...w, audio: w.audio.map(abs) })) };
    const wrap = document.createElement("div"); wrap.className = "gamewrap"; wrap.innerHTML = `<iframe title="🎮" src="game/line.html?v=1023.7${/[?&]mute=1/.test(location.search) ? "&mute=1" : ""}" allow="autoplay"></iframe>`;
    document.body.appendChild(wrap); gm.el = wrap; gm.bgm = bgmHold(); navPush(); /* 게임 중 배경음악 멈춤 */
    const fr = wrap.querySelector("iframe");
    gm.onMsg = e => { if (!gm.el || e.source !== fr.contentWindow) return; const m = e.data || {};
      if (m.type === "malmun-line-ready") fr.contentWindow.postMessage(data, "*");
      else if (m.type === "malmun-line-done") { if (m.cleared) { gameMark(ep, l.id); items[i]?.querySelector("[data-act=game]")?.classList.add("gdone"); } closeGame(false); } };
    addEventListener("message", gm.onMsg);
  }
  function closeGame(fromPop) {
    if (!gm.el) return; removeEventListener("message", gm.onMsg); gm.el.remove(); gm.el = null; gm.onMsg = null; gm.bgm?.(); gm.bgm = null;
    if (!fromPop) navPop(); select(gm.i, { scroll: false }); sync();
  }
  // 탭이 숨으면(다른 탭·앱) 문장·설명 소리 멈춤(본부 10-15 — 뒤에 둔 탭에서 소리가 「자주」 남) · 돌아와도 저절로 다시 틀지 않음(▶ 로 이어서)
  const onHide = () => { if (!document.hidden) return; if (playing()) { clearTimeout(st.gap); st.gap = 0; if (st.panel?.kind === "explain") ex.pause(); else if (!st.panel) { if (st.mode === "video") v.pause(); else seq.pause(); } sync(); } };
  document.addEventListener("visibilitychange", onHide);
  async function openPanel(kind, i, { autoplay = false, task, restore = null } = {}) {
    if (!st.panel && !(restore && nav.depth > 0)) navPush(); // 처음 열 때만 한 칸(토글로 다시 열 때는 있던 칸 그대로)
    i = Math.max(0, Math.min(L.length - 1, i));
    stopAll(); ex.stop(); st.once = false; st.uiFit = false; select(i, { scroll: false });
    st.panel?.cleanup?.();
    const mine = (st.panel = { kind, i });
    vwrap.hidden = true; panel.hidden = false; panel.className = `panel ${kind}${kind === "explain" && L[i].v9 ? " v9" : ""}${" fitting"}`; if (kind !== "explain") panel.innerHTML = ""; // 앞 창 내용이 새 창 크기로 잠깐 넘쳐 보이지 않게 setTimeout(() => st.panel === mine && panel.classList.remove("fitting"), 1500); // 글 크기 맞출 때까지 안 보이게(늦어도 1.5초 뒤엔 보임)
    markButtons(); setTimeout(() => placeBig(st.panel), 0); // ⛶ 칩 = 그 창 머리 줄 ♪ 앞(창이 그려진 뒤) · 폰 가로면 저절로 크게
    if (kind === "explain") {
      panel.innerHTML = explainHTML(i);
      st.sayAt = null; if (L[i].say?.ko) sylAt(ep, `${ep}_${String(L[i].id).padStart(2, "0")}_say`, L[i].say.ko).then(a => { if (st.panel === mine) st.sayAt = a; }).catch(() => {}); // 말해 보세요 문장 견본 소리 음절 시각(노래방 칠)
      if (L[i].v9) v9Fit(); fitPanel(); panel.classList.remove("fitting"); setTimeout(fitPanel, 300); document.fonts?.ready.then(() => st.panel === mine && fitPanel()); // 글꼴이 늦게 와도 다시 맞춤 // 한 줄에 안 들어가면 (한국어) 괄호 → ✕ 글자 순서로 뺌
      if (L[i].v9) { mine.cleanup = spStop; spInit(i); if (!canScore()) { const g = panel.querySelector(".sayb .smsg"); if (g) g.textContent = t(noScoreKey()); } } // 마이크는 🎤 누를 때만 연다(열면 블루투스가 통화 모드로 바뀌어 설명 소리까지 전화 음질 — 본부 10-03)
      if (autoplay) { ex.play((st.exLoop = exItems(i))); if (L[i].v9) markPlay(sndOf(i)); }
      setTimeout(() => { if (st.panel === mine) fitCard(i); keepVisible(i); }, 60); setTimeout(() => st.panel === mine && fitCard(i), 350); /* 설명 창이 커진 뒤 지금 줄 카드도 남은 자리에 맞춤(검사부 10-12 vi·th·ur 320 — 단추가 아래 막대 뒤로) */ // 카드가 길어도 그 줄이 아래 막대에 가리지 않게
    } else {
      const view = kind === "speak" ? speakView : writeView; // 줄을 다 쓰면(말하면) 다음 줄의 같은 메뉴로(W6 · S7)
      const cleanup = await view(panel, ep, L[i].id, { embedded: true, task, pos: restore, onNext: k => openPanel(kind, k), onClose: () => closePanel(), navPush, navPop });
      if (st.panel !== mine) return cleanup?.();
      mine.cleanup = cleanup; fitPanel(); panel.classList.remove("fitting"); setTimeout(() => st.panel === mine && fitPanel(), 300);
      setTimeout(() => { fitCard(i); keepVisible(i); }, 60); // 쓰기 창이면 자막 카드 글을 그 자리에 맞춤(손 스크롤 중이어도)
    }
    pad(); underVideo(items[i]); sync();
  }
  function closePanel(fromNav) {
    if (!st.panel) return;
    if (!fromNav) navPop(); // 단추로 닫으면 쌓아 둔 뒤로 가기 칸도 걷어 냄
    st.panel.cleanup?.(); ex.stop(); clearTimeout(st.gap); st.gap = 0; st.panel = null;
    setBig(false); bigB.hidden = true; bigHome.before(bigB); // 창을 닫으면 크게 보기도 끝 · 칩은 제자리(숨김)
    panel.hidden = true; panel.innerHTML = ""; vwrap.hidden = false; vsubFill(st.cur); fitCard(st.cur); // 영상 창도 같은 카드 자리
    markButtons();
    v.currentTime = L[st.cur].start;
    pad(); underVideo(items[st.cur]); sync();
  }
  // ⛶ 크게 보기(대표님 10-16 · 바깥 껍데기만 — 끄면 지금 화면과 1px 도 같음 · 기본 꺼짐) — 위 창(설명·말하기·쓰기)만 화면 가득 · 자막·재생 막대·줄 목록 숨김
  //  켜는 길: 창 오른쪽 아래 ⛶ 단추 · 폰 가로(높이 ≤ 500)에서 창이 열려 있으면 저절로 · 끄는 길: 「작게」 · Esc · 창 닫기 · 세로로 돌림(저절로 켠 것만)
  //  .scr.learn.big · <html>.bigview · window 「malmun:big」(detail.on) — 창 안 배치는 각 창이 이 신호로 다시 맞춤(쓰기 = 쓰기부)
  const bigB = app.querySelector(".bigb"), bigHome = app.querySelector(".stick > .seek"), mqLand = matchMedia("(orientation: landscape) and (max-height: 500px)");
  let bigOn = false, bigAuto = false, bigSave = null;
  function setBig(on, auto = false) {
    on = !!on && !!st.panel; if (on === bigOn) { if (on && !auto) bigAuto = false; return; }
    bigOn = on; bigAuto = on && auto; st.big = on;
    // 「끄면 같음」(검사부 1016.1 G3): 켤 때 창 안 요소마다 style·class·langfit 잰 값(__lf)을 적어 두고 → 끌 때 화면 크기·⇄ 상태·창이 그대로면 그대로 되돌림
    //  (다시 재면 배율·langfit 순서에 따라 1~40px 달라짐) · 크게 때 새로 잰 langfit 고정도 풀림 → 뒤늦게 다시 잰 것까지 0.3·0.7초에 한 번 더 되돌림 · 되돌린 뒤 넘치면(글이 바뀜) 보통 맞춤
    const sig = () => `${innerWidth}x${innerHeight}|${uiKoOn()}|${st.panel?.kind}|${st.panel?.i}`;
    if (on) bigSave = { sig: sig(), els: [panel, ...panel.querySelectorAll("*")].filter(e => e.tagName !== "CANVAS").map(e => [e, e.getAttribute("style"), e.getAttribute("class"), e.__lf || null]), fitH: st.fitH, uiFit: st.uiFit }; // fitH·uiFit = 창 높이 지킴이(아래 MutationObserver)가 크게 때 높이로 다시 맞추지 않게
    const restore = !on && bigSave?.sig === sig() ? bigSave : null; if (!on) bigSave = null;
    // 켤 때·끌 때 모두 langfit 잰 값을 풀어 지금 배치에서 다시 재게(크게 때 보이는 「크게 보기」·「음악」 글도 두 말 중 긴 쪽으로 잠김 → 크게 연 채 ⇄ 0px) — 끌 때 되돌림(put)이 옛 값을 다시 넣음
    for (const e of [panel, ...panel.querySelectorAll("*")]) if (e.__lf) { e.__lf = null; ["min-width", "max-width", "min-height", "max-height", "overflow", "font-size", "white-space", "box-sizing"].forEach(k => e.style.removeProperty(k)); }
    const put = (lf = false) => { if (bigOn || !restore || restore.sig !== sig()) return false; st.fitH = restore.fitH; st.uiFit = restore.uiFit || st.uiFit; for (const [e, sa, ca, f] of restore.els) { if (!e.isConnected) continue; if (lf) e.__lf = f; if (e.getAttribute("style") !== sa) sa == null ? e.removeAttribute("style") : e.setAttribute("style", sa); if (e.getAttribute("class") !== ca) ca == null ? e.removeAttribute("class") : e.setAttribute("class", ca); } return true; };
    const sc = app.querySelector(".scr.learn"); sc.classList.toggle("big", on); document.documentElement.classList.toggle("bigview", on);
    if (on) sc.dataset.orient = orient(); else delete sc.dataset.orient; // 쓰기부 약속(10-16): 크게일 때 방향 land|port
    bigB.setAttribute("aria-pressed", String(on));
    dispatchEvent(new CustomEvent("malmun:big", { detail: { on, orient: orient() } }));
    requestAnimationFrame(() => requestAnimationFrame(() => { // 끄면 = 창을 처음 열 때와 같은 순서(배율 풀고 → 머리 줄 → 창 맞춤)로 다시 맞춤 → 들어가기 전과 1px 같음(검사부 1016.1 G3)
      if (bigOn !== on || !st.panel) return; // ⛶ 빠르게 두 번 = 앞 것은 버림(검사부 G6)
      const v9 = st.panel?.kind === "explain" && L[st.panel.i]?.v9, bar = v9 && panel.querySelector(".v9bar");
      if (put(true)) { // 크게 때 새로 그려진 요소(⇄ 로 말하기 머리 줄 등) = langfit 고정 풀고 보통 크기에서 다시 재고 → 그 창 머리 줄 다시 맞춤
        const old = new Set(restore.els.map(x => x[0]));
        for (const e of panel.querySelectorAll("*")) if (!old.has(e) && e.__lf) { e.__lf = null; ["min-width", "max-width", "min-height", "max-height", "overflow", "font-size", "white-space", "box-sizing"].forEach(k => e.style.removeProperty(k)); }
        langfitRun(panel); // 풀어 둔 새 요소를 보통 크기에서 바로 다시 잼(⇄ 와 같은 모습)
        const fresh = v9 && [...panel.querySelectorAll(".v9body *")].some(e => !old.has(e)); // 크게 때 ⇄ 로 본문이 새로 그려짐 → ⇄ 와 같은 길(본문 글만 맞춤)
        if (fresh) fitBody();
        requestAnimationFrame(() => requestAnimationFrame(() => { if (bigOn) return; if (fresh) fitBody(); dispatchEvent(new CustomEvent("malmun:big", { detail: { on: false, orient: orient() } })); }));
        [300, 700].forEach(ms => setTimeout(() => { if (put() && fresh) fitBody(); }, ms)); if (v9 && panel.scrollHeight > panel.clientHeight + 1) fitBody(); //(⇄ 와 같은 길 · 머리 줄·창 크기 그대로)
        if (panel.scrollHeight <= panel.clientHeight + 1 && !(bar && v9Over(bar))) return; }
      st.uiFit = false;
      if (!on) [...panel.children].forEach(c => c.style.removeProperty("zoom"));
      if (v9) v9Fit(); fitPanel();
      dispatchEvent(new CustomEvent("malmun:big", { detail: { on, orient: orient() } })); // 폭을 다시 잰 뒤 말하기·쓰기 머리 줄도 한 번 더
      // 머리 줄 단계(h1~·nok…)가 바뀌어 숨었던 글(「음악」·「크게 보기」·「닫기」)이 보이게 된 뒤 = langfit 을 그 모습으로 다시 재고(두 말 중 긴 쪽) → 머리 줄 한 번 더(크게 연 채 ⇄ 0px · 검사부 1016.1 ur 812×375)
      requestAnimationFrame(() => requestAnimationFrame(() => { if (bigOn !== on || !st.panel) return;
        for (const e of panel.querySelectorAll("*")) if (e.__lf) { e.__lf = null; ["min-width", "max-width", "min-height", "max-height", "overflow", "font-size", "white-space", "box-sizing"].forEach(k => e.style.removeProperty(k)); }
        langfitRun(panel); if (v9) { v9Fit(); fitPanel(); } dispatchEvent(new CustomEvent("malmun:big", { detail: { on, orient: orient() } })); })); }));
  }
  // ⛶ 칩 자리 = 위 창 머리 줄의 ♪ 앞(보통·크게 같은 자리 · 떠 있는 단추 없음 · 본부 10-16) — 창 내용이 늦게 그려져도(말하기·쓰기) 기다렸다가 넣고 그 창 머리 줄 맞춤을 다시
  function placeBig(mine, n = 0) {
    if (st.panel !== mine) return;
    const head = panel.querySelector(".chip.bgmb, .bgmb-anchor"); if (!head) return n < 40 && setTimeout(() => placeBig(mine, n + 1), 100);
    head.before(bigB); bigB.hidden = false;
    if (matchMedia("(orientation: landscape) and (max-height: 500px)").matches) return setBig(true, true);
    dispatchEvent(new CustomEvent("malmun:big", { detail: { on: bigOn, orient: orient() } })); // 머리 줄에 칩이 늘었음 → 말하기·쓰기 머리 줄 다시 맞춤
    requestAnimationFrame(() => { if (st.panel?.kind === "explain" && L[st.panel.i]?.v9) v9Fit(); fitPanel(); });
  }
  const orient = () => (innerWidth > innerHeight ? "land" : "port");
  // 크게 연 채 폰을 돌리면 방향 표시·신호 다시(쓰기 칸 배치 · 글 크기 맞춤)
  const onTurn = () => { if (!bigOn) return; const sc = app.querySelector(".scr.learn"), o = orient(); if (sc.dataset.orient === o) return; sc.dataset.orient = o; dispatchEvent(new CustomEvent("malmun:big", { detail: { on: true, orient: o } })); requestAnimationFrame(() => { st.uiFit = false; if (st.panel?.kind === "explain" && L[st.panel.i]?.v9) v9Fit(); fitPanel(); }); };
  addEventListener("resize", onTurn);
  const onLand = () => { if (mqLand.matches) { if (st.panel) setBig(true, true); } else if (bigAuto) setBig(false); };
  mqLand.addEventListener?.("change", onLand);
  const onBigKey = e => { if (e.key === "Escape" && bigOn) { e.stopPropagation(); setBig(false); } };
  document.addEventListener("keydown", onBigKey, true);
  bigB.addEventListener("click", e => { e.stopPropagation(); setBig(!bigOn); });
  // 카드 안 말하기(녹음 → 점수 → 내 목소리) — js/recorder.js
  let sp = null; // { i, ctl, blob, audio, saved }
  // 시도 번호 + 받아쓰기 끊기(검사부 10-11) — 「확인 중…」 동안 카드를 닫거나 새로 녹음하면 옛 결과는 버림 · srOnBlob 도 멈춤
  let spAtt = 0, spAbort = null; const spCancel = () => { spAtt++; const a = spAbort; spAbort = null; try { a?.abort(); } catch {} };
  let fbx = null; // 설명 창 「말해 보세요」 결과 읽기(fbvoice.js)
  function spStop() { fbx?.b.off(); fbx = null; spCancel(); quietWake(false); sp?.ctl?.stop(true); sp?.audio?.pause(); sp?.slow?.pause(); sp = null; closeMic(); } // 카드를 닫을 때 마이크도 닫음(그때처럼 · 카드가 열려 있는 동안은 쥐고 있음)
  // 소리는 언제나 하나(본부 10-10 막 누르기 — 느린 견본·내 목소리가 나오는 중에 칸 글을 누르면 설명 읽기가 겹치던 것) — 견본(느린)·내 목소리·효과음 멈춤
  const sayPlaying = () => !!(sp?.slow?.playing || (sp?.audio && !sp.audio.paused));
  const hushSay = () => { sp?.slow?.pause(); sp?.audio?.pause(); sfxL.stopAll(); };
  const playRec = b => { // 말 시작 자리부터 — 풀어서 그 자리부터 직결 재생(js/playmine.js · <audio> 자리 옮기기 안 씀) · 한 번만
    ex.stop(); clearTimeout(st.gap); st.gap = 0; st.exLoop = null; sp.audio?.pause();
    return (sp.audio = playMineRec(b, { keepFirst: keepFirstOf(L[sp.i]?.say?.ko), ref: L[sp.i]?.say?.src }));
  };
  // [내 목소리] = 방금 녹음(잘됐든 못됐든) · 80% 넘으면 [저장] → 눌러야 저장 · 저장한 것은 「저장됨 ▶」 · 열 때 예전 점수 안 보임(투덜이 10-04)
  async function spInit(i) {
    const saved = await upgradeSaved(await recGet(sayKey(i)), { ep, key: `${ep}_${String(L[i].id).padStart(2, "0")}_say`, url: L[i].say.src, text: L[i].say.ko }, v => recPut(sayKey(i), v)); // 옛 판 저장본은 새 점수로
    if (st.panel?.i !== i || !saved?.blob) return;
    sp = { i, saved: { blob: saved.blob, score: saved.score, old: !!saved.old } };
    if (st.panel?.i !== i) return;
    const b = panel.querySelector(".sayb [data-x=savedplay]"); if (b) { b.classList.toggle("oldscore", !!saved.old); b.hidden = false; b.textContent = t("saved_short", { n: `${starOf(saved.score)} ${saved.score ?? ""}`.trim() }); } // 저장된 것도 점수
    panel.querySelectorAll(".sayb [data-x=savedl], .sayb [data-x=savedel]").forEach(x => { x.hidden = false; }); // 저장한 것 내려받기 · 지우기
  }
  async function spRec(i, btn) {
    const box = panel.querySelector(".sayb"), msg = box.querySelector(".smsg"), lvl = box.querySelector(".lvl"), mineB = box.querySelector("[data-x=mine]");
    if (sp?.ctl) { sp.ctl.stop(); return; } // 녹음 중 다시 누름 = 멈춤(점수는 냄)
    if (sp?.checking || btn.disabled) return; // 「확인 중…」 = 🎤 무시(검사부 10-11 — 옛 결과가 새 녹음에 섞이던 것)
    spCancel(); const att = spAtt; // 이 시도 번호
    const playingAtStart = ex.playing || !!(sp?.audio && !sp.audio.paused) || !v.paused; // 진단: 녹음 시작 때 소리가 나오고 있었나
    ex.stop(); clearTimeout(st.gap); st.gap = 0; st.exLoop = null; sp?.audio?.pause(); sp?.slow?.pause(); stopFx(); scoreFx(box.querySelector(".fx"), null); markPlay(); sync(); // 🎤 = 반복·재생·효과음 모두 멈춤
    // 「준비 중」 → 마이크에서 실제 소리가 들어오기 시작하면 「녹음 중」(본부 10-03 — 그 전에 말하면 앞이 비어 버린다)
    quietWake(true); // 녹음하는 동안 깨우기 소리 멈춤(에코 제거가 말을 끊지 않게)
    const tb = box.querySelector(".tbar"), mm = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
    const sayBuf = L[i].say.src ? await Promise.race([sfxL.load(L[i].say.src), new Promise(r => setTimeout(() => r(null), 150))]) : null;
    const pace = await Promise.race([paceOf({ ep, key: `${ep}_${String(L[i].id).padStart(2, "0")}_say`, text: L[i].say.ko, rate: getRate("m"), buf: sayBuf }), new Promise(r => setTimeout(() => r(null), 150))]); // 따라 읽기 칠 = 본보기 음절 시각(본부 10-07)
    const seq = seqMode(); // 안드로이드 = 녹음만 → 끝나면 그 녹음 소리로 받아쓰기(본부 10-10 갤럭시)
    const ctl = (srOnlyMode() && canScore() ? recordSROnly : record)({ noSR: seq, // 받아쓰기만 기기 = 녹음 없이(본부 10-07)
      maxMs: Math.max(maxMsFor(L[i].say.ko), sayBuf ? sayBuf.duration * 2000 + 2000 : 0), // 최대 길이 = max(8, 3 + 0.8 × 음절, 본보기 × 2 + 2)초(투덜이 10-07 허락)
      onTick: (el, max, q = 0) => { // 말하기 창과 같게(투덜이 10-07 허락) — 굵은 막대 · 남은 초 · 멈추면 주황 「n초 뒤 끝나요」 · 본보기 음절 시각대로 안내선·글자 칠(paceOf)
        tb.hidden = false; tb.firstElementChild.style.width = Math.min(100, (100 * el) / max) + "%"; tb.classList.toggle("low", el > max * 0.8); tb.classList.toggle("quiet", q > 400);
        tb.querySelector(".tt").textContent = q > 400 ? t("quiet_left", { s: Math.max(0, (2000 - q) / 1000).toFixed(1) }) : `⏱ ${mm(el)} / ${mm(max)} · ${t("time_left", { s: Math.max(0, Math.ceil((max - el) / 1000)) })}`;
        const pl = tb.querySelector(".pace"); if (pl) { pl.hidden = !pace; if (pace) pl.style.left = Math.min(100, (100 * pace.end) / max) + "%"; }
        if (pace) paintPace(box.querySelector(".saybig")?.children || [], pace, el); },
      onLevel: v => { lvl.firstElementChild.style.width = Math.round(v * 100) + "%"; },
      onStop: () => { for (const c of box.querySelector(".saybig")?.children || []) c.classList.remove("pace"); if (sp?.ctl === ctl) { msg.textContent = t("checking"); lvl.hidden = true; } },
      onSwitch: () => { btn.textContent = "… " + t("mic_opening"); lvl.hidden = true; msg.textContent = t("mic_switched"); },
      onReady: () => { if (sp?.ctl !== ctl) return; btn.textContent = "■ " + t("btn_stop"); lvl.hidden = false; msg.textContent = t("listening");
        const nb = box.querySelector(".micname"); if (nb && micLabel()) { nb.textContent = `🎤 ${micLabel()} ✓`; nb.hidden = false; } }, // 지금 쓰는 마이크 — 자동이 틀렸을 때만 눌러 바꿈
    });
    sp = { i, ctl, saved: sp?.saved, blob: sp?.blob };
    box.querySelector("[data-x=keep]").hidden = true; box.querySelector(".heardline").innerHTML = "";
    btn.classList.add("on"); btn.textContent = "… " + t("mic_opening"); lvl.hidden = true; msg.textContent = "";
    const r = await ctl.done; tb.hidden = true;
    if (isAndroid()) closeMic(); // 안드로이드 = 녹음 끝날 때마다 마이크 닫음 → 다음 녹음 때 새로 엶(본부 10-08 갤럭시 「녹음 소리가 확 줄어듦」 — 자동 크기 조절이 낮아진 채 이어지지 않게 · 허락은 다시 안 물음)
    quietWake(false);
    if (st.panel?.i !== i || sp?.ctl !== ctl) return; // 다른 데로 감
    sp.ctl = null; btn.classList.remove("on"); lvl.hidden = true;
    if (r.cancelled) { btn.innerHTML = micLbl(); msg.textContent = ""; return; }
    if (r.error) { btn.innerHTML = micLbl(); msg.textContent = t(micWhy(r.error)); return; }
    // 녹음 먼저 → 그 녹음 소리로 받아쓰기 · 말소리는 있었는데 들은 말 0 이고 아직 이 기기에서 된 적 없으면 = 이 기기는 안 됨 → 받아쓰기만(기기 기억) · 0점 대신 「한 번 더」(본부 10-10)
    //  판정 = recorder.js srJudge(검사부 10-11) — 연속 2번 기기 실패라야 받아쓰기만(7일 기억) · 인터넷·중단·말 없음·무음은 세지 않음 · "seq-ok" 여도 실패면 「한 번 더」
    //  기다리는 동안 🎤 막음(보통 모양) · 끝나면 어느 길이든 풂 · 닫기·새 녹음 = 시도 번호가 바뀜 → 버림
    if (seq && r.blob) { msg.textContent = t("checking"); const me = sp; me.checking = true; btn.disabled = true; btn.setAttribute("aria-disabled", "true"); btn.classList.remove("on"); btn.innerHTML = micLbl();
      const ac = (spAbort = new AbortController()); let s2;
      try { s2 = await srOnBlob(r.blob, { signal: ac.signal }); } finally { if (spAbort === ac) spAbort = null; me.checking = false; btn.disabled = false; btn.setAttribute("aria-disabled", "false"); }
      if (att !== spAtt || st.panel?.i !== i || !sp || s2.info?.aborted) return; // 닫힘·새 시도 = 옛 결과 버림
      const jd = srJudge(s2, 10 ** ((r.diag?.maxDb ?? -120) / 20)); if (!jd.ok && jd.kind === "notrack") s2.heard = []; // 트랙 대신 마이크를 들음 = 들은 말 버림
      r.heard = s2.heard; r.words = s2.info?.wordList || null; r.srErr = s2.srErr; r.diag = { ...(r.diag || {}), sr: s2.ev, seq: `녹음 ${s2.info?.dur}초 최대 ${s2.info?.maxDb}dB · 트랙 ${s2.info?.track} · 트랙 씀 ${s2.info?.trackUsed ?? "?"} · start 예외 ${s2.info?.startErr || "없음"} · ${s2.info?.ms}ms · 들음 ${s2.heard.length} · 판정 ${jd.kind}${jd.count ? ` ${jd.count}/2` : ""} · 기억 ${devSR() || "-"}` };
      if (s2.info?.srv) r.diag.seq += " · " + s2.info.srv; // 서버 걸린 시간(받기·AI · 본부 10-12)
      if (jd.retry) { btn.innerHTML = micLbl(); msg.textContent = t("sr_retry_dev"); scoreFx(box.querySelector(".fx"), null); logRec({ where: "card", line: L[i].id, want: L[i].say.ko, ...r.diag, why: "retry-dev", score: null, kind: jd.kind, mode: jd.server ? `서버 안 됨(${jd.kind}) ${jd.count || 1}번째 → ${jd.switched ? "10분 받아쓰기만" : "다음도 서버"}` : jd.switched ? "녹음→받아쓰기 연속 2번 안 됨 → 받아쓰기만" : "녹음→받아쓰기 한 번 더" /* 실제 횟수·까닭대로(본부 10-12) */, heard: [] }); return; } }
    const switchedSR = !seq && r.blob && isAndroid() && !srOnlyMode() && canScore() ? srMiss(!r.heard.length && (r.diag?.maxDb ?? -120) > -40) : false; // 연속 2번이면 받아쓰기만으로
    let sc = canScore() && r.heard.length ? scoreOf(L[i].say.ko, r.heard) : null; // 덧붙은 말(앞뒤 다른 말)은 빼고 본보기와 맞는 토막만(본부 10-11)
    const env = await diagEnv(); if (att !== spAtt) return; // 그새 새 시도·닫힘(검사부 10-11) · 진단(화면에 안 보임) — 소리 엔진·🔁·녹음 시작 때 재생 중이었는지·출력 장치 + 녹음 소리 자체(malmun_diag · 마지막 3개)
    logRec({ where: "card", line: L[i].id, want: L[i].say.ko, ...(r.diag?.mode ? {} : { mode: "받아쓰기만" }), ...r.diag, micAfter: micOpen(), heard: [...new Set(r.heard)], score: sc, ...env, playingAtStart });
    if (r.blob) keepDiag(r.blob, { where: "card", why: r.diag?.why, cut: r.diag?.cut, line: L[i].id, score: sc, heard: [...new Set(r.heard)] });
    // 리듬(투덜이 10-06 허락) — 글자 점수 × 리듬 배수(말하기 창과 같은 함수) · 근거는 결과 줄에
    let rhy = null;
    if (sc > 0 && r.blob) { const spn = spanOf(L[i].say.ko, bestFull(L[i].say.ko, r.heard)), rh = await rhythmOf({ ep, key: `${ep}_${String(L[i].id).padStart(2, "0")}_say`, url: L[i].say.src, text: L[i].say.ko, blob: r.blob, heard: spn.text, span: spn, words: r.words, sylOf: x => sylsAt(x).out }); /* 덧붙은 말 = 리듬·빠르기는 토막 구간만(본부 10-11) */ if (st.panel?.i !== i || att !== spAtt) return; if (rh) { rhy = { L: sc, R: rh.R, worst: rh.worst }; sc = withRhythm(sc, rh.R); const lf = lateFactor(rh.yEnd, pace?.end); if (lf.late) { rhy.late = true; sc = Math.floor(sc * lf.f + 1e-9); } } } // 노래방 칠보다 많이 늦으면 최대 80쯤(투덜이 10-08)
    sp.blob = r.blob; sp.score = sc; sp.rhy = rhy;
    mineB.disabled = false; mineB.classList.toggle("dim", !r.blob); // 방금 녹음 — 언제나 · 받아쓰기만이면 흐리게(누르면 까닭)
    setTx(btn, () => "🎤 " + t(sc != null && sc >= PASS ? "speak_now" : "try_again"));
    // 점수가 안 나오면 절대 통과·저장 아님(본부 10-04 — 엉뚱한 말도 그냥 넘어가던 것) · 왜 안 나왔는지 짧게
    // 점수는 언제나 % — 못 알아들었으면 「0% · 까닭」 · 80% 넘으면 [저장]
    box.querySelector("[data-x=keep]").hidden = !(sc != null && sc >= PASS);
    const hintX = (h => h && { ...h, say: L[i].say.ko, rom: Object.fromEntries([...(L[i].v9?.pieces || []).map(p => [p.ko, p.rom]), ...Object.entries(L[i].v9?.gloss || {}).map(([k, g]) => [k, g.rom])].filter(([k, r]) => k && r)) })(endHint(L[i].say.ko, r.heard));
    setTx(msg, () => { let m = switchedSR ? `0% · ${t("sr_only_switched")}` : sc == null ? (canScore() ? `0% · ${t(r.why === "nospeech" ? "why_nospeech" : srWhy(r.srErr))}` : t(noScoreKey())) : scoreLine(sc, r.why, t, hintX); // 두 단계 통과 ☆/★ + 끝난 까닭
      if (rhy && sc != null) m += " · " + rhyText(rhy, t);
      if (rhy?.late && sc != null) m += " · " + t("why_late");
      if (!r.blob && sc != null) m += " · " + t("sr_only_note");
      return m; }); // 언어를 바꾸면 이 글을 새 언어로 다시 씀(retext · 안 A)
    // 결과 안내 = 소리로 읽기 + 불(fbvoice.js) — 새 결과면 한 번 저절로 · ⇄ 는 onUiLang 이 같은 문장부터 그 말로
    if (!fbx || fbx.el !== msg) { fbx?.b.off(); fbx = { el: msg, b: fbBind(msg, { canPlay: () => !!sp && !sp.ctl && st.panel?.kind === "explain" }) }; }
    fbx.mk = () => (sc != null && !switchedSR ? fbPlan({ sc, why: r.why, hint: hintX, rhy, late: rhy?.late, rhyAny: true }) : []);
    fbx.b.set(fbx.mk(), true);
    box.classList.toggle("pass", sc != null && sc >= PASS);
    scoreFx(box.querySelector(".fx"), sc ?? (canScore() && !switchedSR ? 0 : null), { busy: () => !!sp?.ctl, full: isFull(sc, rhy) }); // 점수가 뜨는 순간 효과 한 번 · 아무 말도 없었어도 꽝(투덜이 10-08)
    const bh = bestFull(L[i].say.ko, r.heard); // 들린 말(덧붙은 말은 흐린 회색) — 점수를 낸 그 인식 결과 · 틀린 음절 빨간 밑줄 · 빠진 자리 _
    box.querySelector(".heardline").innerHTML = switchedSR ? `<button class="srboth" data-x="srboth">${esc(t("sr_both_again"))}</button>` : bh ? (({ html, ok }) => `<span class="lab">${esc(t("heard_label"))}:</span> <span class="ko" lang="ko">${html}</span>${ok ? " ✓" : ""}`)(heardHTML(L[i].say.ko, bh)) : "";
  }
  // 맨 위 한 줄 맞추기 + 처음 한 번 말풍선(▶ = 듣는 언어 · 탭 = 읽는 언어 · 3초 · 다시 안 뜸)
  const v9Over = bar => { if (bar.scrollWidth > bar.clientWidth + 1) return true; const r = bar.getBoundingClientRect(), pr = panel.getBoundingClientRect(); if (r.left < pr.left - 1 || r.right > pr.right + 1) return true; return [...bar.children].some(e => { const c = e.getBoundingClientRect(); return c.width > 0 && (c.left < r.left - 1 || c.right > r.right + 1); }); }; // 가운데 맞춤이면 왼쪽 넘침은 scrollWidth 에 안 잡힘
  function v9Fit(z1 = !st.uiFit) {
    const bar = panel.querySelector(".v9bar"); if (!bar) return;
    if (z1) [...panel.children].forEach(c => c.style.removeProperty("zoom")); // 늘 배율 1 에서 잼(줄인 배율에선 막대가 넓어져 단계가 달라짐 — ⛶ 칩이 늦게 들어올 때 · 검사부 1016.1 ur 320 ⇄) · 부른 쪽이 바로 fitPanel
    const over = () => v9Over(bar);
    bar.classList.remove("nok", "nocw", "tight", "nolab");
    for (const c of ["nok", "nocw", "tight", "nolab"]) { if (!over()) break; bar.classList.add(c); } // tight = 칩(⛶·♪·⇄·로마자) 안쪽 여백·사이를 좁힘(⛶ 칩이 늘어 ✕ 가 밀리던 것 · 10-16) · nolab = 그래도 넘치면 「듣기」 이름표 숨김
    // 나중에 칩 글·폭이 바뀌어도(⇄ · 언어 폭 고정 · ■/▶) 넘치면 다시 맞춤(검사부 10-16 ne 375 — 머리 줄 양 끝 잘림)
    if (!bar.__ro && window.ResizeObserver) { let q = 0; bar.__ro = new ResizeObserver(() => { if (q) return; q = setTimeout(() => { q = 0; if (!bar.isConnected) return bar.__ro.disconnect(); if (v9Over(bar)) { v9Fit(); fitPanel(); } }, 200); }); bar.__ro.observe(bar); [...bar.children].forEach(e => bar.__ro.observe(e)); }
    if (pref("malmun.v9tip") !== "1") { const tip = panel.querySelector(".v9tip"); pref("malmun.v9tip", "1"); tip.hidden = false; setTimeout(() => { tip.hidden = true; }, 3000); }
  }
  const markPlay = (k = null) => panel.querySelectorAll(".v9bar .pb[data-x=ex]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === k)));
  function v9Click(x) {
    const i = st.panel.i, k = x.dataset.x;
    if (k === "txt") { // 글 언어 — 편 전체 · 기억 · 소리는 그대로 이어서
      v9set("txt", x.dataset.v); uiLang(x.dataset.v === "ko"); // 언어 하나(안 A)
      const pl = ex.playing, snd = panel.querySelector(".v9bar .pb[aria-pressed=true]")?.dataset.v;
      const tc = v9code(x.dataset.v), tx = L[i].v9.text?.[tc] || L[i].v9.text?.ko || {}, fx = L[i].v9.formula_by?.[tc] || L[i].v9.formula;
      panel.querySelectorAll(".v9bar [data-x=txt]").forEach(b => b.setAttribute("aria-selected", String(b === x)));
      const p0 = panel.querySelector('.v9body p[data-p="0"]'), p1 = panel.querySelector('.v9body p[data-p="1"]'), f = panel.querySelector(".v9body .fx b");
      if (p0) p0.innerHTML = bold(tx.ex || ""); if (p1) p1.innerHTML = bold(tx.say || ""); if (f) f.textContent = fx || "";
      if (pl && snd) markPlay(snd);
      return;
    }
    if (k === "ex") { // ▶ 언어 — 그 언어로 설명 읽기 · 같은 단추 다시 = 멈춤/이어서 · 누른 언어를 기억(듣기 모드도)
      const v = x.dataset.v, on = x.getAttribute("aria-pressed") === "true";
      hushSay();
      const langChange = koMode && (v === "ko") !== uiKoOn(); // 언어 하나(안 A) — 눌린 것처럼 보여도(시범 언어 = 한국어 소리로 대신) 언어가 바뀌면 멈춤이 아니라 바꿈
      if (!langChange && on && ex.playing) { ex.pause(); return sync(); }
      if (!langChange && on && ex.q.length) { ex.resume(); return sync(); }
      const cur = ex.q[ex.i], going = ex.q.length && cur && (ex.playing || ex.a.currentTime > 0);
      v9set("snd", v); v9set("txt", v); uiLang(v === "ko"); clearTimeout(st.gap); st.gap = 0; v9Text(i, v); /* 언어 하나(안 A) — 화면 글도 같이 */
      const items = v9Items(i, { line: false, k: v }); if (!items.length) return;
      st.exLoop = items; markPlay(v);
      if (going && cur.p === 0 && L[i].v9.sent?.length) { // 듣는 중 언어 바꿈 = 같은 문장 번호부터 다른 언어로(본부 10-05)
        const s = sentAt(i, cur.lang, ex.a.currentTime), at = L[i].v9.sent[s]?.[`${v9code(v)}_s`] || 0, from = items.findIndex(x => x.p === 0);
        const run = items.map((x, j) => (j === from ? { ...x, at } : x));
        ex.play(run, from);
        panel.querySelectorAll(".v9body .sn").forEach(el => el.classList.toggle("cur", +el.dataset.s === s));
        return sync();
      }
      if (going && cur.p === 1) { const from = items.findIndex(x => x.p === 1); ex.play(items, Math.max(0, from)); return sync(); }
      ex.play(items); return sync();
    }
    if (k === "gw") { const h = popFor(x); togglePlay(); return h ? v9Pop(x, h) : hidePop(); } // 조각 칩 = 설명 소리 멈춤⇄이어서만(대표님 10-22 · 개발2팀) + 뜻이 있으면 작은 말풍선(소리와 상관없음)
    if (k === "sn") { hidePop(); return togglePlay(); } // 설명 문장 = 설명 소리 멈춤⇄이어서만(대표님 10-22 「읽어 줄 때 끄고 싶다」 · 옛: 그 문장부터 재생)
    if (k === "v9rom") { const on = x.getAttribute("aria-pressed") !== "true"; x.setAttribute("aria-pressed", String(on)); pref("malmun.rom", on ? "1" : "0"); panel.querySelector(".exv").classList.toggle("norom", !on); app.classList.toggle("norom", !on); hidePop(); fitPanel(); return; } // 로마자 켜기/끄기(기억) · 그 순간 글 크기 다시 맞춤(넘친 첫 그림이 보이지 않게)
    if (k === "rec") return spRec(i, x);
    if (k === "close") return closePanel(); // ✕ 닫기 — 녹음 중이면 버리고 영상으로
    if (k === "mics") { // 마이크 목록(카드 안 작은 고르기) — 고르면 기억하고 다음 녹음부터
      const sel = panel.querySelector(".sayb .micsel");
      listMics().then(ds => {
        sel.innerHTML = ds.map(d => `<option value="${esc(d.deviceId)}" ${niceLabel(d.label) === micLabel() ? "selected" : ""}>${esc(niceLabel(d.label) || d.deviceId)}</option>`).join("");
        sel.hidden = false; x.hidden = true;
        sel.onchange = () => { chooseMic(sel.value); x.textContent = `🎤 ${sel.selectedOptions[0]?.textContent || ""}`; x.hidden = false; sel.hidden = true; };
      });
      return;
    }
    if (k === "model") { // 본보기 = 문장만 읽은 소리
      if (sp?.ctl) return;
      clearTimeout(st.gap); st.gap = 0; st.exLoop = null; // 한 번만
      hushSay(); markPlay();
      const r = getRate("m"); if (r !== 1) { ex.stop(); const h = playSlow(L[i].say.src, r); if (sp) sp.slow = h; else sp = { i, slow: h }; karaokeRun(() => panel.querySelector(".v9body .sayp .saybig")?.children, st.sayAt, () => h.el.currentTime, () => sp?.slow === h && h.playing); return sync(); } // 느린 견본도 칠 // 본보기 속도(말하기 화면·비교 화면과 같은 값 · 음높이 그대로)
      ex.play([{ src: L[i].say.src, p: 1 }]); return sync();
    }
    if (k === "mrate") { const nv = nextRate("m"); x.textContent = rateLabel(nv); x.setAttribute("aria-pressed", String(nv !== 1)); return; } // 본보기 속도 바꾸기(기억)
    if (k === "keep") { // [저장] — 더 높거나 같은 점수면 바꿔 끼움(원본 그대로 + 말 시작 위치)
      if (!sp?.blob || !(sp.score >= PASS)) return;
      const msg = panel.querySelector(".sayb .smsg");
      recGet(sayKey(i)).then(old => {
        if (sp.score >= keptScore(old)) { recPut(sayKey(i), { blob: sp.blob, score: sp.score, at: Date.now(), scoreV: SCORE_V, letter: sp.rhy?.L ?? sp.score, R: sp.rhy?.R ?? null }); sp.saved = { blob: sp.blob, score: sp.score }; msg.textContent = `${sp.score}% ✓ · ${starOf(sp.score)} ${t("kept")}`; }
        else msg.textContent = `${sp.score}% ✓ · ${starOf(sp.score)} ${t("kept_better")}`;
        x.hidden = true; const sb = panel.querySelector(".sayb [data-x=savedplay]"); sb.hidden = false; sb.textContent = t("saved_short", { n: `${starOf(sp.saved?.score ?? sp.score)} ${sp.saved?.score ?? sp.score}`.trim() });
        panel.querySelectorAll(".sayb [data-x=savedl], .sayb [data-x=savedel]").forEach(y => { y.hidden = false; }); askPersist(); // 처음 저장 때 오래 남게(조용히)
      });
      return;
    }
    if (k === "savedl") { if (sp?.saved?.blob) downloadRec(sp.saved.blob, `malmun_${sayKey(i).split("/")[1]}_${sp.saved.score ?? ""}`, L[i].say.src); return; } // 원본 그대로 파일로
    if (k === "savedel") { // 이 녹음만 지우기 — 한 번 묻고
      if (!sp?.saved || !confirm(t("del_one_q"))) return;
      recDel(sayKey(i)); sp.audio?.pause(); sp.saved = null;
      panel.querySelectorAll(".sayb [data-x=savedplay], .sayb [data-x=savedl], .sayb [data-x=savedel]").forEach(y => { y.hidden = true; });
      panel.querySelector(".sayb .smsg").textContent = t("deleted");
      return;
    }
    if (k === "savedplay") {
      if (!sp?.saved?.blob || sp.ctl) return;
      ex.stop(); sp.slow?.pause(); markPlay(); sync(); sp.audio?.pause();
      playRec(sp.saved.blob); sp.audioKey = "savedplay";
      return;
    }
    if (k === "srboth") { setSrOnly(false); setDevSR(null); /* 기기 기억·연속 실패 수도 지움(검사부 10-11) */ x.remove(); const m = panel.querySelector(".sayb .smsg"); if (m) m.textContent = t("sr_both_set"); return; } // 다시 같이 시험
    if (k === "mine" && !sp?.blob && srOnlyMode()) { const m = panel.querySelector(".sayb .smsg"); if (m) m.textContent = t("sr_only_why"); return; } // 받아쓰기만 — 녹음 없음
    if (k === "mine") {
      if (!sp?.blob || sp.ctl) return;
      ex.stop(); sp.slow?.pause(); markPlay(); sync();
      playRec(sp.blob); sp.audioKey = "mine";
    }
  }
  // (설명 진행 막대·끌어 옮기기는 없앰 — 본부 10-05 · 이동은 문장 누르기 · 맨 위 줄 「n/N」)
  // 위 창 누르기 = 멈춤/재생(설명) · 한글 대조·학습자 말 단추는 그대로
  // 말해 보기 칸 🎤 말하세요·▶ 견본·▶ 내 목소리 = 누르는 순간 설명 소리 멈춤(대표님 10-22 · 손가락이 닿을 때 바로 · 그 단추 일은 click 에서)
  panel.addEventListener("pointerdown", e => { if (st.panel?.kind !== "explain" || !e.target.closest(".sayb [data-x=rec], .sayb [data-x=model], .sayb [data-x=mine]")) return; if (ex.playing || ex.q.length) { clearTimeout(st.gap); st.gap = 0; st.exLoop = null; ex.stop(); sync(); } });
  panel.addEventListener("click", e => {
    if (st.panel?.kind !== "explain" || e.target.closest("[data-act=uiko]")) return; // ⇄한 은 ui.js 문서 한 곳이 받음(멈춤⇄다시로 새지 않게)
    const x = e.target.closest("[data-x]");
    if (e.target.closest(".sayb")) { if (x) v9Click(x); return; } // 아래 말해 보기 칸 = 그 칸 단추 일만 · 설명 쪽으로 안 넘어감(대표님 10-22 · 옛: 단추 밖 = 설명 멈춤⇄다시)
    if (x && st.panel.i != null && L[st.panel.i].v9) return v9Click(x);
    if (x) {
      const on = x.getAttribute("aria-pressed") !== "true"; x.setAttribute("aria-pressed", String(on));
      if (x.dataset.x === "rom") { panel.querySelector(".exv").classList.toggle("hide-rom", !on); pref("malmun.rom", on ? "1" : "0"); }
      else panel.querySelector(".learner").hidden = !on;
      return;
    }
    togglePlay();
  });

  // ── 동작 ──
  function goPaused(i) { stopAll(); st.once = false; select(i, { force: true }); v.currentTime = L[i].start; sync(); } // R1
  function playLine(i) { // R3 · R6
    stopAll(); select(i, { force: true });
    st.once = !st.rep;
    if (st.mode === "video") { v.currentTime = L[i].start; v.play().catch(() => {}); }
    else seq.play(lessonItems(i, true));
    sync();
  }
  function playFrom(i) { // 이어 보기(듣기)
    stopAll(); st.once = false; select(i, { force: true });
    if (st.mode === "video") { v.currentTime = L[i].start; v.play().catch(() => {}); }
    else seq.play(lessonItems(i, false));
    sync();
  }
  function togglePlay() { // R4
    if (st.panel?.kind === "write") { panel.__wr?.toggle(); return; } // 쓰기 창: ▶ = 이 부분 듣기(W6)
    if (st.panel?.kind === "speak") { panel.__sp?.toggle(); return; } // 말하기 창: ▶ = 본보기(S2)
    if (st.panel?.kind === "explain") { // 설명 창: ▶ = 설명 읽기 멈춤/이어서
      if (sayPlaying()) { hushSay(); markPlay(); return sync(); } // 견본·내 목소리 나오는 중 = 그것만 멈춤
      if (playing()) { clearTimeout(st.gap); st.gap = 0; ex.pause(); }
      else { hushSay(); if (ex.q.length) ex.resume(); else ex.play((st.exLoop = exItems(st.panel.i))); }
      return sync();
    }
    if (playing()) {
      clearTimeout(st.gap); st.gap = 0;
      if (st.mode === "video") v.pause(); else seq.pause();
      return sync();
    }
    const l = L[st.cur];
    if (st.mode === "video") {
      const now = v.currentTime;
      if (st.rep || st.once) { if (now < l.start - 0.1 || now >= l.end - 0.05) v.currentTime = l.start; }
      else if (now < l.start - 0.1 || now > l.end + 1.5) v.currentTime = l.start; // 다른 데로 옮겨져 있으면 선택한 줄부터
      v.play().catch(() => {}); // 빠르게 다시 누르면 「play() 가 pause() 로 끊김」 — 무시(막 누르기 점검 10-08)
    } else if (seq.q.length && !st.rep) seq.resume();
    else seq.play(lessonItems(st.cur, st.rep || st.once));
    sync();
  }
  function onLineTap(i) {
    if (st.rep) return playLine(i);                      // R6 반복 중이면 그 줄을 반복
    if (i === st.cur && !playing()) return playLine(i);   // R2 선택한 줄을 또 누르면 그 줄 듣기
    goPaused(i);                                          // R1
  }
  function step(dir) { // R5
    const i = Math.max(0, Math.min(L.length - 1, st.cur + dir));
    if (playing()) { st.rep ? playLine(i) : st.once ? playLine(i) : playFrom(i); } else goPaused(i);
  }
  function setMode(m) { // R8
    stopAll(); st.once = false; st.mode = m;
    app.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    v.currentTime = L[st.cur].start;
    sync();
  }

  // 아래 막대 오른쪽 토글(본부 10-05 투덜이 — 「대사+설명」「설명만」 방법은 화면에서 뺌 · 코드는 남김)
  //  설명 카드가 열려 있으면 [▶ 전체 영상] = 카드 닫고 그 줄부터 영상을 끝까지 · 영상이 보이면 [설명] = 지금 줄 설명 카드
  function flip() {
    app.querySelector(".modetip").hidden = true;
    if (st.panel?.kind === "explain") { // 카드가 접히며 목록이 위로 당겨지므로 자리를 다시 본다(본부 10-05 — 지금 줄이 아래 막대 뒤로 가던 것)
      const i = st.panel.i; closePanel(); if (st.mode !== "video") setMode("video"); playFrom(i); fullTip();
      requestAnimationFrame(() => keepVisible(st.cur, { force: true }));
      [500, 1200, 2500].forEach(ms => setTimeout(() => keepVisible(st.cur), ms)); return;
    }
    openPanel("explain", st.panel?.i ?? st.cur, { autoplay: true });
  }
  function flipLabel() { const b = app.querySelector(".ctrl [data-act=flip]"), on = st.panel?.kind === "explain", txt = on ? `▶ ${t("full_video")}` : t("explain"); if (b && b.textContent !== txt) b.textContent = txt; }
  if (pref("malmun.fliptip") !== "1") { pref("malmun.fliptip", "1"); const tip = app.querySelector(".modetip"); tip.hidden = false; setTimeout(() => { tip.hidden = true; }, 3500); } // 처음 한 번만
  // 진행 막대 — 영상이 보이면 영상 위치 · 설명 카드면 설명 소리 위치 · 쓰기·말하기 창이면 꺼짐(갈색 줄만)
  const seekEl = app.querySelector(".seek");
  const seekSrc = () => (st.panel?.kind === "explain" ? (ex.q.length ? ex.a : null) : st.panel ? null : v);
  function seekPaint() {
    const a = seekSrc(), has = !!a && isFinite(a.duration) && a.duration > 0;
    seekEl.toggleAttribute("data-off", !has);
    seekEl.querySelector(".rail i").style.width = has ? (100 * a.currentTime) / a.duration + "%" : "0";
    seekEl.querySelector(".t0").textContent = mmss(has ? a.currentTime : 0);
    seekEl.querySelector(".t1").textContent = mmss(has ? a.duration : 0);
  }
  // 지킴이 — 영상이 나오는 동안 지금 줄이 아래 막대 뒤나 영상 뒤로 가 있으면 제자리로(손 스크롤 4초 규칙 · 움직이는 중엔 쉼)
  // 쓰기 중엔 무엇을 눌러도(◀▶·자동·글자·자판 · 창 크기 바뀜) 지금 줄 카드를 쓰기 창 바로 아래 제자리에(본부 10-06 — 15번 ◀ → 자동에서 카드가 밖으로 밀림)
  const pinned = () => { const el = items[st.cur]; return !el || Math.abs(el.getBoundingClientRect().top - stick.getBoundingClientRect().bottom - 10) <= 14; };
  const watch = () => {
    if (performance.now() <= (st.animUntil || 0)) return;
    if (st.panel) { if (Date.now() - st.handScroll > 1500 && !pinned()) keepVisible(st.cur, { force: true }); return; } // 설명·쓰기·말하기 창 모두(한 틀)
    if (!st.panel && !v.paused) keepVisible(st.cur);
  };
  // 설명 창 말해 보기 칸도 「재생 중 = 칠」(투덜이 10-06) — ▶ 본보기 · ▶ 내 목소리 · 저장본 ★ ▶ · 표시만
  const litT = setInterval(() => {
    const box = st.panel?.kind === "explain" && panel.querySelector(".sayb"); if (!box) return;
    const mineOn = !!(sp?.audio && !sp.audio.paused), src = ex.playing && !ex.a.paused && ex.q?.[ex.i]?.src;
    const on = { model: (!!src && src === L[st.panel.i]?.say?.src) || !!sp?.slow?.playing, mine: mineOn && sp.audioKey !== "savedplay", savedplay: mineOn && sp.audioKey === "savedplay" };
    for (const k in on) box.querySelector(`[data-x=${k}]`)?.classList.toggle("playing", !!on[k]);
  }, 100);
  const seekTimer = setInterval(() => { seekPaint(); watch(); }, 250);
  seekEl.addEventListener("pointerdown", e => {
    const trk = e.target.closest(".trk"); if (!trk) return;
    const a = seekSrc(); if (!a || !isFinite(a.duration)) return;
    e.preventDefault(); e.stopPropagation();
    const seek = ev => { const r = trk.getBoundingClientRect(); a.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * a.duration; seekPaint(); };
    seek(e); trk.setPointerCapture?.(e.pointerId);
    const mv = ev => seek(ev), up = () => { trk.removeEventListener("pointermove", mv); trk.removeEventListener("pointerup", up); trk.removeEventListener("pointercancel", up); };
    trk.addEventListener("pointermove", mv); trk.addEventListener("pointerup", up); trk.addEventListener("pointercancel", up);
  });
  // 단추 이름 풍선말(대표님 10-20) — 처음 한 번 ▶ 부터 차례로(학습자 말 + ⇄ 반대 말 · n/5 · 아무 데나 누르면 다음) · 그 뒤엔 길게 누르면 그 단추 이름 · 자리 0px(덮개)
  const tipEl = () => document.querySelector(".actstip"), tipOff = () => { tipEl()?.remove(); clearTimeout(tip.t); };
  const tip = { step: -1, t: 0, lp: 0, lpFired: false };
  function tipShow(btn, n) { tipOff(); if (!btn?.isConnected || !btn.offsetWidth) return; const k = btn.dataset.tipk, a = t(k), b = (() => { try { return tAlt(k); } catch { return null; } })(), d = document.createElement("div"); d.className = "actstip"; d.setAttribute("role", "status");
    d.innerHTML = `<b>${esc(a)}</b>${n ? `<i>${n}/5</i>` : ""}${b && b !== a ? `<small lang="${uiKoOn() ? lang : "ko"}">${esc(b)}</small>` : ""}${n === 5 ? `<small class="hold">${esc(t("hold_name"))}</small>` : ""}`; document.body.append(d);
    const r = btn.getBoundingClientRect(), w = d.offsetWidth, left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)); d.style.left = left + "px"; d.style.top = Math.max(6, r.top - d.offsetHeight - 10) + "px"; d.style.setProperty("--ax", Math.round(r.left + r.width / 2 - left) + "px"); }
  const tipBtns = () => [...(items[st.cur]?.querySelectorAll(".acts [data-tipk]") || [])];
  function tipNext() { tip.step++; const bs = tipBtns(); if (tip.step >= bs.length) { tip.step = -1; tipOff(); try { localStorage.setItem("malmun.actstip", "1"); } catch {} document.removeEventListener("pointerdown", tipTap, true); return; } tipShow(bs[tip.step], tip.step + 1); }
  function tipTap(e) { if (tip.step < 0) return; if (e.target.closest?.(".actstip")) { e.preventDefault(); return tipNext(); } tip.step = 99; tipNext(); } /* 풍선말을 누르면 다음 · 다른 곳 누름 = 풍선말 닫고 그 누름은 그대로 통과(본부 10-20 「처음 들어와 바로 쓰기·다음 눌러도 안 막힘」) */
  function tipStart() { let seen = false; try { seen = localStorage.getItem("malmun.actstip") === "1" || ((/[?&]mute=1/.test(location.search) || navigator.webdriver) && !window.__actsTip); } /* 점검 브라우저 = 안 띄움(점검이 켤 땐 __actsTip) */ catch {} if (seen || tip.step >= 0 || !tipBtns().length || !tipBtns()[0].offsetWidth) return; const mt = app.querySelector(".modetip"); if (mt && !mt.hidden && mt.offsetWidth) { clearTimeout(tip.wait); tip.wait = setTimeout(tipStart, 800); return; } /* 「누르면 설명 ↔ 영상」 안내가 사라진 뒤에(한 화면에 풍선 하나) */ tip.step = -1; document.addEventListener("pointerdown", tipTap, true); tipNext(); }
  const onUiTip = () => { if (tip.step < 0) return; tipOff(); const again = () => { if (tip.step < 0) return; if (document.querySelector(".uikotip")) { tip.t = setTimeout(again, 300); return; } tipShow(tipBtns()[tip.step], tip.step + 1); }; tip.t = setTimeout(again, 60); }; window.addEventListener("malmun:uilang", onUiTip); /* ⇄ = 풍선말 글도 그 말로 · ⇄ 안내 풍선이 떠 있는 동안은 숨겼다가 사라지면 다시(한 화면 풍선 하나 · 검사1팀 10-20) */
  app.querySelector(".lines").addEventListener("pointerdown", e => { const b = e.target.closest(".acts [data-tipk]"); if (!b || tip.step >= 0) return; tip.lpFired = false; clearTimeout(tip.lp); tip.lp = setTimeout(() => { tip.lpFired = true; tipShow(b, 0); tip.t = setTimeout(tipOff, 1800); }, 480); });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) app.querySelector(".lines").addEventListener(ev, () => clearTimeout(tip.lp));
  app.querySelector(".lines").addEventListener("click", e => { if (tip.lpFired && e.target.closest(".acts [data-tipk]")) { tip.lpFired = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true); /* 길게 누름 = 이름만(그 단추 일은 안 함) */
  app.querySelector(".lines").addEventListener("contextmenu", e => { if (e.target.closest(".acts [data-tipk]")) e.preventDefault(); });
  setTimeout(tipStart, 1400); app.__actsTip = tipStart; /* 점검용 */
  app.querySelector(".lines").onclick = e => {
    if (e.target.closest("a")) return;
    const sx = e.target.closest(".expl [data-x=gw], .expl [data-x=sn]"); if (sx) { if (sx.dataset.x === "gw") return v9Pop(sx, popFor(sx)); hidePop(); return playFromSent(sx); } // 듣기 모드 설명 글 — 낱말 뜻 · 문장 = 그 문장부터
    const li = e.target.closest(".line");
    if (!li) return;
    // 자막 끔 + 영상 창 = 흐린 대사 글(또는 👁 표시)을 누르면 그 카드만 또렷하게 ⇄ 다시 흐림(본부 10-12) · 줄 이동·재생은 안 함
    if (!st.panel && app.querySelector(".learn").classList.contains("nosub") && !e.target.closest("button") && (e.target.closest(".kotext, .tr") || e.clientY - li.getBoundingClientRect().top < 30 && li.getBoundingClientRect().right - e.clientX < 110)) {
      const on = !li.classList.contains("peek"); items.forEach(x => x.classList.remove("peek")); li.classList.toggle("peek", on); return;
    }
    if (e.target.closest("[data-act=game]")) return openGame(+li.dataset.i);
    const i = +li.dataset.i, m = e.target.closest("[data-act=explain],[data-act=write],[data-act=speak]");
    // 설명·쓰기 = 위 창을 영상 ⇄ 그 메뉴로 바꾸는 토글(설명은 열면 바로 읽어 줌)
    if (m) return st.panel?.kind === m.dataset.act && st.panel.i === i ? closePanel() : openPanel(m.dataset.act, i, { autoplay: m.dataset.act === "explain" });
    // 이 줄 듣기 = 토글(듣는 중이면 멈춤) · 위 창이 설명·쓰기면 영상으로 돌아와 듣기
    if (e.target.closest("[data-act=once]")) {
      if (!st.panel && st.once && i === st.cur && playing()) { v.pause(); seq.pause(); st.once = false; return sync(); }
      closePanel(); return playLine(i);
    }
    if (st.panel) { if (i !== st.panel.i) openPanel(st.panel.kind, i); else if (st.panel.kind === "explain") togglePlay(); return; } // 위 창이 메뉴면 누른 줄의 같은 메뉴(멈춘 채) · 설명 중 그 줄 카드(단추 밖) = 멈춤⇄다시(본부 10-08)
    onLineTap(i);
  };
  app.querySelector(".ctrl").onclick = e => {
    if (e.target.closest("[data-act=flip]")) return flip();
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (st.panel && (a === "prev" || a === "next")) return openPanel(st.panel.kind, st.panel.i + (a === "next" ? 1 : -1), { autoplay: playing() });
    if (a === "play") togglePlay();
    else if (a === "prev") step(-1);
    else if (a === "next") step(1);
    else if (a === "rep") {
      st.rep = !st.rep; b.setAttribute("aria-pressed", String(st.rep));
      if (st.rep) { st.once = false; if (playing() && !st.panel) playLine(st.cur); } // 위 창(설명·쓰기·말하기)이 떠 있으면 가려진 영상을 틀지 않는다 — 반복은 그 창의 설명 듣기에만
      else { clearTimeout(st.gap); st.gap = 0; }
      sync();
    } else if (a === "spd") { st.rate = (st.rate + 1) % RATES.length; const r = RATES[st.rate]; b.textContent = r + "×"; v.playbackRate = r; seq.setRate(r); ex.setRate(r); }
  };
  v.addEventListener("click", togglePlay);
  // 「ने⇄한」 = 언어 하나(안 A) — 어느 화면·창의 단추든(ui.js 문서 한 곳이 받음 · 다국어부 10-14) 앱 글이 바뀌면 설명 소리·본문도 그 언어로(듣는 중이면 같은 문장부터) · 설명 막대 안 고르기(uiLang)는 제 손잡이가 이미 맞춤
  const onUiLang = () => {
    applyFirst(); st.cardKeep = -1; requestAnimationFrame(() => { fitTitle(app.querySelector(".vtitle")); vsubFill(st.cur); if (turns?.busy() && turnLastSub) turnSub(turnLastSub); fitCard(st.cur); }); // 따라 하기 반응 자막 중이면 그 자막 그대로(⇄ 순서만) // 위아래 바뀜 → 다시 맞춤
    if (!app.querySelector(".scr.learn")) return removeEventListener("malmun:uilang", onUiLang);
    setRateWord(t("speed")); // 속도 알약 말(rateLabel)도 새 언어로(다국어부 10-14)
    st.cardKeep = st.cur; // 지금 카드 맞춤 단계 고정(⇄ 0px)
    if (fbx?.el.isConnected) fbx.b.set(fbx.mk(), false); // 결과 안내 읽기 중이면 같은 문장부터 새 말로
    if (st.panel?.kind === "explain") st.uiFit = true; // 이 창이 닫히거나 다른 줄로 갈 때까지 창 크기 고정
    if (st.uiBar) return; const w = uiKoOn() ? "ko" : "L";
    v9set("snd", w); v9set("txt", w);
    const p = st.panel; if (p?.kind !== "explain" || !L[p.i]?.v9) return;
    panel.querySelectorAll(".v9bar [data-x=txt]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.v === w)));
    const b = panel.querySelector(`.v9bar [data-x=ex][data-v="${w}"]`);
    if (b && ex.playing && b.getAttribute("aria-pressed") !== "true") v9Click(b); else v9Text(p.i, w);
  };
  addEventListener("malmun:uilang", onUiLang);
  const onCapLang = () => capFill(st.cur); addEventListener("malmun:uilang", onCapLang); // ⇄ = 크게 보기 자막도 바로 한국어⇄학습자 말
  // langfit 이 머리 줄(편 제목) 높이를 「두 말 중 큰 쪽」으로 잠근 뒤 = 영상 밑 큰 자막 칸을 다시 잼(처음엔 잠그기 전 제목 높이로 재서 자막 칸이 18px 크고 영상이 328 로 줄었다가 ⇄ 뒤에야 360 · 검사1팀 10-20 vi·id·si·tl·km·my·hi·es)
  const onLfit = () => { if (app.querySelector(".scr.learn")) requestAnimationFrame(() => vsubFill(st.cur)); }; addEventListener("malmun:langfit", onLfit);
  app.querySelector("[data-act=fs]").onclick = () => {
    const w = app.querySelector("#vwrap");
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (w.requestFullscreen) w.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  };
  // 자막 켬/끔 = 영상 밖 재생 막대 끝 작은 CC 칩(대표님 10-19 「영상 안엔 전체 보기만」 · 높이 0px) — 끄면 전체 화면 자막·영상 밑 큰 자막·줄 카드 글을 가림(소리는 그대로)
  const fsTip = app.querySelector(".fstip"); let tipT = 0;
  const hideTip = () => { clearTimeout(tipT); fsTip.hidden = true; };
  app.querySelector("[data-act=subs]").onclick = e => {
    const on = !subsOn(); pref("malmun.fullsub", on ? "1" : "0");
    e.currentTarget.setAttribute("aria-pressed", String(on)); app.querySelector(".learn").classList.toggle("nosub", !on); items.forEach(x => x.classList.remove("peek"));
    if (!on) hideTip();
  };
  app.querySelector("[data-act=tipx]").onclick = hideTip;
  // 선생님 말풍선 = 영상 밖(재생 막대 CC 칩을 가리킴 · 겹쳐 뜸 = 0px) — 전체 영상을 처음 열 때 한 번만(대표님 10-19) · 8초 뒤 저절로 닫힘 · 자막이 이미 꺼져 있으면 안 띄움 · 전체 화면에 들어가면 닫음
  function fullTip() {
    if (!subsOn() || !fsTip || pref("malmun.subtip1")) return;
    pref("malmun.subtip1", "1");
    fsTip.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => { fsTip.hidden = true; }, 8000);
    fsTip.style.removeProperty("max-width"); // 가로 폰 = 막대 위 왼쪽 → ⛶ 왼쪽까지만
    if (matchMedia("(orientation: landscape) and (max-height: 500px)").matches) { const fb = app.querySelector("[data-act=fs]").getBoundingClientRect(), sk = app.querySelector(".seek").getBoundingClientRect(); fsTip.style.maxWidth = Math.max(160, fb.left - sk.left - 10) + "px"; }
  }
  // 크게 보기 안에도 CC(대표님 10-22) = 재생 막대의 그 CC 단추를 ⇄ 옆으로 옮겨 씀(새 단추 아님) · 나오면 제자리로
  const ccBtn = app.querySelector("[data-act=subs]"), ccHome = ccBtn.nextElementSibling;
  const onFsChange = () => { const fs = document.fullscreenElement, w = app.querySelector("#vwrap"); if (fs) hideTip();
    if (fs && fs === w) w.querySelector(".vuiko")?.prepend(ccBtn); else if (ccBtn.parentElement !== ccHome?.parentElement) ccHome?.before(ccBtn); capFill(st.cur); };
  document.addEventListener("fullscreenchange", onFsChange);
  const onKey = e => { if (e.code !== "Space" || /^(INPUT|BUTTON|TEXTAREA|A)$/.test(e.target.tagName)) return; e.preventDefault(); togglePlay(); };
  document.addEventListener("keydown", onKey);

  // R9 — 마지막 줄(또는 쓰기·설명에서 돌아온 줄)에서 멈춘 채 시작
  if (startId) { const k = L.findIndex(l => String(l.id) === String(startId)); if (k >= 0) st.cur = k; }
  ready = true; // 이제 카드 맞춤(fitCard)이 쓰는 막대·창이 다 있음
  try { history.scrollRestoration = "manual"; } catch {} // 새로 열 때 브라우저가 옛 스크롤 자리로 되돌리지 않게(본부 10-06 — 처음 몇 초 7·8번 카드가 보임)
  select(st.cur, { scroll: false });
  lockBoth(); document.fonts?.ready.then(() => { if (app.querySelector(".scr.learn")) { lockBoth(); fitCard(st.cur); } }); pad(); fitCard(st.cur); if (st.cur > 0) underVideo(items[st.cur], true); // 첫 프레임부터 제자리(움직임 없이 바로)
  // 글꼴·영상 크기가 다 잡힌 뒤 한 번 더(처음 열 때 지금 줄이 영상 아래로 안 오던 문제) — 그사이 손으로 움직였으면 하지 않음
  const settle = () => { if (st.cur > 0 && Date.now() - st.handScroll > 4000 && !playing() && !st.panel) { pad(); fitCard(st.cur); underVideo(items[st.cur], true); } };
  document.fonts?.ready.then(() => setTimeout(settle, 50));
  [100, 300, 600, 1200, 2500].forEach(ms => setTimeout(settle, ms)); // 글꼴·영상·그림이 늦게 와 줄 높이가 바뀌어도 바로 제자리
  v.addEventListener("loadedmetadata", settle, { once: true });
  v.addEventListener("loadedmetadata", () => { if (v.paused && !st.once) v.currentTime = L[st.cur].start; }, { once: true });
  sync();
  if (reopen) openPanel(reopen.kind, reopen.i, { restore: reopen }); // ने⇄한 토글 전 창·자리
  else if (opts.explain) openPanel("explain", st.cur, { autoplay: true }); /* #/explain/{편}/{줄} = 그 줄 v9 설명 창(첫 터치 전엔 소리가 막힐 수 있음 — ▶ 로 시작) */
  const release = hold(); // 소리 장치 깨워 두기(첫소리 먹힘 방지)
  return () => { tipOff(); clearTimeout(tip.wait); tip.step = -1; document.removeEventListener("pointerdown", tipTap, true); window.removeEventListener("malmun:uilang", onUiTip); removeEventListener("malmun:uilang", onCapLang); if (gm.el) closeGame(true); removeEventListener("resize", onTurn); mqLand.removeEventListener?.("change", onLand); document.removeEventListener("keydown", onBigKey, true); document.documentElement.classList.remove("bigview"); clearTimeout(tipT); document.removeEventListener("fullscreenchange", onFsChange); clearInterval(edgeT); clearInterval(litT); clearInterval(seekTimer); clearInterval(hlTimer); document.removeEventListener("pointerdown", onDocDown, true); removeEventListener("popstate", onPop); removeEventListener("malmun:uilang", onUiLang); removeEventListener("malmun:langfit", onLfit); document.removeEventListener("visibilitychange", onHide); clearTimeout(st.animEnd); release(); st.panel?.cleanup?.(); ex.stop(); removeEventListener("resize", pad); removeEventListener("resize", onFit); clearInterval(timer); clearTimeout(st.gap); document.removeEventListener("keydown", onKey); seq.stop(); vqOff(); rpOff(); turns?.off(); ovl?.off(); v.pause(); v.removeAttribute("src"); v.load(); };
}
