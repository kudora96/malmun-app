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
import { t, lang, langName } from "../i18n.js?v=1007.54";
import { esc, renderText, glossCards, sayParts } from "../text.js?v=1007.54";
import { episode } from "../data.js?v=1007.54";
import { paths } from "../paths.js?v=1007.54";
import { Sequence } from "../audio.js?v=1007.54";
import { I, progress, SPEAKER } from "../ui.js?v=1007.54";
import writeView from "./write.js?v=1007.54";
import { diagEnv, keepDiag } from "../diag.js?v=1007.54";
import { playMine as playMineRec, keepFirstOf } from "../playmine.js?v=1007.54";
import { rhythmOf, withRhythm, rhyText, upgradeSaved, keptScore, SCORE_V } from "../rhythm.js?v=1007.54";
import { playSlow, getRate, nextRate, rateLabel, setRateWord } from "../compare.js?v=1007.54";
import { bestHeard, heardHTML, endHint } from "../heard.js?v=1007.54";
import { recDel, downloadRec, askPersist } from "../recstore.js?v=1007.54";
import speakView, { similarity, PASS, PERFECT, starOf, scoreLine, maxMsFor, recGet, recPut } from "./speak.js?v=1007.54";
import { scoreFx, stopFx } from "../scorefx.js?v=1007.54"; // 점수별 효과(본부 10-05)
import { record, micWhy, srWhy, canScore, closeMic, logRec, micLabel, niceLabel, listMics, chooseMic } from "../recorder.js?v=1007.54";
import { hold, quietWake } from "../wake.js?v=1007.54";

const RATES = [1, 0.75, 0.5];
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const LOOP_GAP = 700;
const LEAD = 0.35;  // 자막은 목소리보다 0.35초 먼저 영상 아래에(줄 시각 = 실제 목소리 · 느린 속도면 영상 시간으로 줄인다)
const SCROLL_MS = 220; // 줄을 영상 아래로 올리는 시간 — 먼저 와 있어야 해서 짧게
const FS = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

export default async function learn(app, ep, startId) {
  const d = await episode(ep, lang);
  setRateWord(t("speed")); // 속도 단추 글 「गति 1×」
  const L = d.lines;
  const last = Math.min(progress.get(ep).at ?? (progress.get(ep).line || 1) - 1, L.length - 1);
  // once = 지금 한 줄만 듣는 중 · rep = 반복 켜짐 · gap = 반복 사이 쉬는 중
  const st = { mode: "video", cur: Math.max(0, last), once: false, rep: false, gap: 0, rate: 0, handScroll: 0, anim: 0 };
  const seq = new Sequence();
  let ready = false;

  app.innerHTML = `<section class="scr learn">
    <div class="stick">
    <div class="vstage">
    <div class="vmain"><div class="vtitle"><div class="tt"><b class="ko" lang="ko">${esc(d.title || "")}</b>${d.title_t ? `<span class="sub">${esc(d.title_t)}</span>` : ""}</div><span class="n"></span></div>
    <div class="varea"><div class="video" id="vwrap"><video playsinline preload="metadata" poster="${paths.poster(ep)}" src="${paths.video(ep)}"></video>
      <span class="vplay" aria-hidden="true">${I.play}</span>
      <div class="cap" aria-live="polite"></div>
      <button class="vfs" data-act="fs" aria-label="${esc(t("fullscreen"))}">${FS}</button></div></div><div class="vsub" hidden aria-hidden="true"><div class="in"></div></div></div>
    <div class="panel" hidden></div>
    </div>
    <div class="seek" data-off><span class="t0">0:00</span><div class="trk" aria-label="seek"><div class="rail"><i></i></div></div><span class="t1">0:00</span></div>
    </div>
    <ol class="lines">${L.map((l, i) => `<li class="line sp-${SPEAKER[l.speaker] || "x"} ${l.speaker === "선생님" ? "" : "right"}" data-i="${i}">
      <span class="who ko" lang="ko">${esc(l.speaker)}</span>
      <p class="kotext ko" lang="ko">${esc(l.ko)}</p>
      ${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}
      <div class="expl"></div>
      <div class="acts"><button data-act="once">${I.play}<span>${esc(t("listen_line"))}</span></button><button class="menu" data-act="explain">${esc(t("explain"))}</button><button class="menu" data-act="write">${esc(t("write"))}</button><button class="menu" data-act="speak">${esc(t("speak"))}</button></div>
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
  const items = [...app.querySelectorAll(".line")];
  const playBtn = app.querySelector("[data-act=play]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 선택 · 따라가기 ──
  function select(i, { scroll = true, force = false } = {}) {
    i = Math.max(0, Math.min(L.length - 1, i));
    if (i !== st.cur) {
      items[st.cur]?.classList.remove("cur");
      items[st.cur]?.querySelector(".expl").classList.remove("on");
      st.cur = i;
    }
    items[i].classList.add("cur"); app.querySelector(".vtitle .n").textContent = `${i + 1} / ${L.length}`; if (ready) vsubFill(i); if (ready) fitCard(i); // 카드 글 크기 = 네 창 같게
    items.forEach((li, k) => li.classList.toggle("past", k < i));
    // 전체 화면(화면만 보기)에서도 자막은 보여야 한다 — 영상 아래쪽에 지금 줄
    app.querySelector(".cap").innerHTML = `<span class="ko" lang="ko">${esc(L[i].ko)}</span>${L[i].tr ? `<span class="tr">${esc(L[i].tr)}</span>` : ""}`;
    if (scroll && (force || Date.now() - st.handScroll > 4000)) underVideo(items[i]);
    const p = progress.get(ep);
    progress.set(ep, { at: i, line: Math.max(p.line || 0, i + 1) });
  }
  // 지금 줄 = 영상(+모드 줄) 바로 아래 · 앞 줄들은 영상 뒤로 올라간다
  const stick = app.querySelector(".stick"), list = app.querySelector(".lines");
  function underVideo(el, instant = false) {
    const to = Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - stick.offsetHeight - 10, document.documentElement.scrollHeight - innerHeight));
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
  const pad = () => { list.style.paddingBottom = Math.max(ctrlBar.offsetHeight + 24, innerHeight - stick.offsetHeight - 40) + "px"; }; // 맨 끝 줄도 아래 막대 위로 다 보이게
  // 지금 줄이 위 창과 아래 막대 사이에 다 보이지 않으면 그 자리로(손으로 스크롤 중이면 4초 기다림 — handScroll 그대로)
  // 기준(본부 10-05): 줄 카드 전체(아래끝 포함)가 영상 아래~막대 위에 보일 것 · 아니면 카드 위끝을 영상 바로 아래로(카드가 그 사이보다 길어도 위끝 맞춤)
  // 쓰기 창이 열려 있으면 지금 자막 카드(글 전부 + 아래 메뉴 줄)가 쓰기 창과 아래 막대 사이에 다 들어가게 — 길면 카드 안 글을 줄임(10-06 본부·투덜이)
  function fitCard(i) {
    items.forEach(li => { li.classList.remove("fitc"); li.style.removeProperty("--kf"); li.style.removeProperty("--tf"); });
    const el = items[i]; if (!el) return; // 네 창(영상·설명·쓰기·말하기) 모두 같은 카드 자리·같은 글 크기(본부 10-06 「한 틀」)
    const avail = ctrlBar.getBoundingClientRect().top - stick.getBoundingClientRect().bottom - 14;
    const ko = el.querySelector(".kotext"), tr = el.querySelector(".tr");
    let kf = parseFloat(getComputedStyle(ko).fontSize), tf = tr ? parseFloat(getComputedStyle(tr).fontSize) : 0;
    el.classList.add("fitc");
    for (let k = 0; k < 16 && el.offsetHeight > avail && kf > 11; k++) { kf -= 1; tf = Math.max(10, tf - 0.7); el.style.setProperty("--kf", kf + "px"); el.style.setProperty("--tf", tf + "px"); }
  }
  // 영상 창 = 제목 줄 바로 밑에 영상(위 정렬) · 남는 자리(폰)에 지금 대사를 영화 자막처럼 크게(투덜이 10-06 ㅇ) — 화자(작게) · 한국어(굵게) · 로마자(켜짐이면 작게) · 학습자 언어
  //   글 크기 = 그 자리를 채우는 가장 큰 크기(넘치면 줄임 · 스크롤 0) · 대사가 바뀔 때와 창 크기가 바뀔 때만 다시 맞춤 · 자리가 70px 안 되면(넓고 낮은 창) 자막 줄 없음
  function vsubFill(i) {
    const vm = app.querySelector(".vmain"), box = app.querySelector(".vsub"), inn = box.querySelector(".in"), ttl = app.querySelector(".vtitle");
    if (vm.hidden) return;
    const free = Math.floor(vm.clientHeight - ttl.offsetHeight - (vm.clientWidth * 9) / 16);
    if (free < 70) { box.hidden = true; box.style.removeProperty("height"); return; }
    box.hidden = false; box.style.height = free + "px";
    const l = L[i], rom = romOn() ? (l.v9?.pieces || []).map(p => p.rom).filter(Boolean).join(" ") : "";
    inn.innerHTML = `<span class="who ko" lang="ko">${esc(l.speaker)}</span><b class="ko" lang="ko">${esc(l.ko)}</b>${rom ? `<span class="rom">${esc(rom)}</span>` : ""}${l.tr ? `<span class="tr">${esc(l.tr)}</span>` : ""}`;
    const fits = z => { inn.style.zoom = String(z); return box.scrollHeight <= box.clientHeight && inn.getBoundingClientRect().height <= box.clientHeight; };
    let lo = 0.6, hi = 1.8;
    if (fits(hi)) lo = hi; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    inn.style.zoom = (Math.floor(lo * 100) / 100).toFixed(2);
  }
  // 위 칸 안 내용 = 그 칸 안에서 맞춤(설명·말하기 — 칸 크기는 그대로 · 넘치면 안 내용만 작게 · 쓰기는 write.js 가 스스로 맞춤)
  function fitPanel() {
    const kind = st.panel?.kind; if (kind !== "explain" && kind !== "speak") return;
    const kids = [...panel.children].filter(c => !c.classList.contains("vplay"));
    // 설명 = 칸을 꽉 채우는 가장 큰 크기(짧은 줄은 키우고 긴 줄은 줄임 · 15px → 최대 20px · 칩·간격도 같은 비율 — 본부 10-06) · 말하기 = 넘칠 때만 줄임
    const fits = z => { kids.forEach(c => (c.style.zoom = String(z))); return panel.scrollHeight <= panel.clientHeight; };
    let lo = 0.5, hi = kind === "explain" ? 1.33 : 1;
    if (fits(hi)) lo = hi; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    lo = Math.floor(lo * 1000) / 1000;
    kids.forEach(c => (lo === 1 ? c.style.removeProperty("zoom") : (c.style.zoom = String(lo))));
    for (let k = 0; k < 8 && panel.scrollHeight > panel.clientHeight && lo > 0.4; k++) { lo -= 0.015; kids.forEach(c => (c.style.zoom = lo.toFixed(3))); } // 그래도 1px 이라도 넘치면 조금씩 더
    st.fitH = kids.reduce((a, c) => a + c.offsetHeight, 0); // 맞춘 때의 내용 높이 — 바뀌면(로마자 켬/끔 · 말해 본 결과 · 단추 줄) 다시 맞춤
  }
  function keepVisible(i, { force = false } = {}) {
    const el = items[i]; if (!el || (!force && Date.now() - st.handScroll <= 4000)) return;
    pad(); fitCard(i);
    const r = el.getBoundingClientRect(), top = stick.getBoundingClientRect().bottom, bot = ctrlBar.getBoundingClientRect().top;
    const fits = r.height <= bot - top;
    if (st.panel ? Math.abs(r.top - top - 10) > 14 : r.top < top - 1 || (fits ? r.bottom > bot + 1 : r.top > top + 12)) underVideo(el); // 쓰기 중 = 언제나 쓰기 창 바로 아래
  }
  new ResizeObserver(() => pad()).observe(stick);
  // 위 칸 내용이 바뀌어 높이가 달라지면 그 순간 한 번 다시 맞춤(스크롤 0 · 본부 10-06) — 소리 재생 중 강조만 바뀌는 것은 높이가 같아 건드리지 않음
  let refitQ = 0;
  new MutationObserver(() => { if (refitQ) return; refitQ = setTimeout(() => { refitQ = 0; // 강조 표시가 쉬지 않고 바뀌어도 120ms 마다 한 번은 살핌(늦추기만 하면 영영 안 돎)
    if (!st.panel || (st.panel.kind !== "explain" && st.panel.kind !== "speak")) return;
    const h = [...panel.children].filter(c => !c.classList.contains("vplay")).reduce((a, c) => a + c.offsetHeight, 0);
    if (Math.abs(h - (st.fitH || 0)) > 2 || panel.scrollHeight > panel.clientHeight) fitPanel();
  }, 120); }).observe(app.querySelector(".panel"), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class", "aria-pressed"] });
  const onFit = () => { fitPanel(); vsubFill(st.cur); fitCard(st.cur); clearTimeout(st.fitT); st.fitT = setTimeout(() => keepVisible(st.cur), 120); }; // 창 크기가 바뀌면(브라우저가 스크롤을 옮겨도) 지금 줄 카드를 제자리로 — 손 스크롤 중이면 그대로
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
        st.gap = setTimeout(() => { st.gap = 0; if (st.rep) v.play(); sync(); }, LOOP_GAP);
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
    if (it.p >= 0 && vx) { box.innerHTML = `<p>${v9Sent(it.i, it.lang || v9code(v9pref().snd))}</p>${pairHTML(it.i, it.lang || v9code(v9pref().snd), 0)}`; box.classList.add("on"); } // 카드와 같은 모양(문장 span · 괄호 없음 · 누르면 말풍선)
    else if (it.p >= 0) { box.innerHTML = renderText(L[it.i].krParas[it.p] || ""); box.classList.add("on"); }
    else box.classList.remove("on");
    sync();
  };
  seq.ondone = () => {
    if (st.rep) { st.gap = setTimeout(() => { st.gap = 0; if (st.rep) seq.play(lessonItems(st.cur, true)); }, LOOP_GAP); }
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
  const v9set = (k, v) => { const P = v9pref(); P[k] = v; pref("malmun.v9", JSON.stringify(P)); };
  const v9code = k => (k === "ko" ? "ko" : v9L);
  const v9name = k => (k === "ko" ? "한국어" : langName(v9L));
  const v9src = (i, k, what) => { const a = L[i].v9?.audio?.[v9code(k)]?.[what]; return a ? paths.v9(ep, a) : null; };
  const bold = s => esc(s).replace(/&quot;([^&]*?)&quot;|"([^"]*?)"/g, (m, a, b) => `<b>"${a ?? b}"</b>`);
  const sayKey = i => `${ep}/${ep}_${String(L[i].id).padStart(2, "0")}_say`; // 말하기 창의 같은 과제와 같은 칸(✓ 공유)
  const mmss = x => (isFinite(x) ? `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}` : "0:00");
  function v9HTML(i) {
    const l = L[i], x = l.v9, P = v9pref(), tc = v9code(P.txt), tx = x.text?.[tc] || x.text?.ko || {};
    const fx = x.formula_by?.[tc] || x.formula;
    const playBtn = k => `<button class="pb" data-x="ex" data-v="${k}" aria-pressed="false"><span class="ic" aria-hidden="true">▶</span> ${esc(v9name(k))}</button>`;
    // 맨 위 한 줄(본부 10-05 투덜이 승인): 「듣기」 동그란 재생 묶음 · 「읽기」 탭 묶음 · ✕ — 이름표 = 학습자 언어 + (한국어)
    const k = P.snd, code = v9code(k);
    const lab = (key, ko) => `<span class="glab">${esc(t(key))}${lang === "ko" ? "" : ` <small lang="ko">(${ko})</small>`}</span>`;
    return `<div class="exv v9${romOn() ? "" : " norom"}">
      <div class="v9bar">${lab("v9_listen", "듣기")}<span class="seg snd">${playBtn("L")}${playBtn("ko")}</span>${x.sent?.length ? `<span class="snum" aria-live="off">1/${x.sent.length}</span>` : ""}<button class="romb" data-x="v9rom" aria-pressed="${romOn()}">${esc(t("v9_rom"))}</button><button class="pb closex" data-x="close" title="${esc(t("close_word"))}" aria-label="${esc(t("close_word"))}"><span class="cx">✕</span><span class="cw"> ${esc(t("close_word"))}</span></button></div>
      <div class="v9tip" hidden>${esc(t("v9_tip"))}</div><div class="v9pop" hidden></div>
      <div class="v9body">
        ${x.pieces?.length || fx ? `<div class="chips">${(x.pieces || []).map(c => `<span class="chip"><b class="ko" lang="ko">${esc(c.ko)}</b> <i>${c.rom != null ? `<span class="rom">${esc(c.rom)}${c.mean ? ", " : ""}</span>${esc(c.mean || "")}` : esc(c.gloss || "")}</i></span>`).join("")}${fx ? `<span class="fx">= <b>${esc(fx)}</b></span>` : ""}</div>` : ""}
        <p data-p="0">${v9Sent(i, code)}</p>${pairHTML(i, code, 0)}
        ${l.say ? `<div class="sayb"><p data-p="1" class="sayp">${sayHTML(i, code)}</p>
          <div class="sbtns" data-keep="${esc(t("keep_short"))}"><button class="mic" data-x="rec">🎤 ${esc(t("speak_now"))}</button><button data-x="model">▶ ${esc(t("model"))}</button><button class="mrate" data-x="mrate" aria-label="${esc(t("speed"))}" aria-pressed="${getRate("m") !== 1}">${rateLabel(getRate("m"))}</button><button data-x="mine" disabled>▶ ${esc(t("my_voice"))}</button><button data-x="keep" title="${esc(t("keep"))}" hidden>${esc(t("keep_short"))}</button><button data-x="savedplay" title="${esc(t("saved_title"))}" hidden>${esc(t("saved_play"))}</button><span class="mini"><button data-x="savedl" class="small" title="${esc(t("download"))}" hidden>⬇ ${esc(t("dl_short"))}</button><button data-x="savedel" class="small" title="${esc(t("del_one"))}" hidden>🗑 ${esc(t("del_short"))}</button></span></div>
          <div class="sline"><span class="lvl" hidden><i></i></span><span class="smsg" aria-live="polite" data-empty="— %"></span><span class="fx" aria-hidden="true"></span></div><div class="tbar" hidden><i></i><span class="tt"></span></div><div class="heardline" data-empty="${esc(t("heard_label"))}: —"></div><div class="microw" data-empty="🎤 ${esc(micLabel() || t("mic_pick"))}"><button class="micname" data-x="mics" hidden></button><select class="micsel" hidden></select></div></div>` : ""}
      </div>
</div>`;
  }
  // v9 설명 소리 차례: (대사) → 설명 → 「이제 말해 보세요」 — 고른(마지막에 누른) 소리 언어
  const v9Items = (i, { line = true, k = v9pref().snd } = {}) => [
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
    return sn.map((s, k) => `<button class="snp" data-x="sn" data-s="${k}" data-i="${i}" data-c="${code}" aria-label="▶ ${k + 1}">▶</button><span class="sn" data-x="sn" data-s="${k}" data-i="${i}" data-c="${code}"${code === "ko" ? ' lang="ko"' : ""}>${qWords(i, s[code] || "")}</span>`).join(" ");
  }
  // 「이제 말해 보세요」 칸(본부 10-05) — 첫 줄 = 안내(듣기 언어) · 한국어 문장 크게 · 로마자(작게 · 로마자 꺼지면 숨김) · 뜻(작게 · 학습자 언어 항상) · 괄호 없음
  function sayHTML(i, code) {
    const x = L[i].v9, a = sayParts(x.text?.[code]?.say), b = sayParts(x.text?.[v9L]?.say) || a;
    if (!a) return bold((x.text?.[code] || x.text?.ko || {}).say || "");
    return `<span class="sayin"${code === "ko" ? ' lang="ko"' : ""}>${esc(a.intro)}</span><span class="saybig" lang="ko">${esc(a.ko)}</span>${b?.rom ? `<span class="sayrom rom">${esc(b.rom)}</span>` : ""}${b?.mean ? `<span class="saymean">${esc(b.mean)}</span>` : ""}`;
  }
  // 지금 문장 번호 = 재생 시각이 들어간 sent 칸
  const sentAt = (i, code, tm) => { const sn = L[i].v9?.sent || []; let k = 0; sn.forEach((s, j) => { if ((s[`${code}_s`] ?? 0) <= tm + 0.05) k = j; }); return k; };
  function v9Hl() { // 읽는 문장 불 켜기(재생 시각 따라 · 멈추면 그대로) — 카드 · 듣기 모드 줄 밑 글(본부 10-05 같은 모양)
    if (st.panel?.kind === "explain" && L[st.panel.i]?.v9 && ex.playing) {
      const it = ex.q[ex.i];
      if (it) {
        const k = it.p === 0 ? sentAt(st.panel.i, it.lang, ex.a.currentTime) : -1;
        panel.querySelectorAll(".v9body .sn").forEach(el => el.classList.toggle("cur", +el.dataset.s === k));
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
    const k = v9pref().snd, list = v9Items(i, { line: false, k }), from = list.findIndex(x => x.p === 0); if (from < 0) return;
    clearTimeout(st.gap); st.gap = 0; sp?.audio?.pause(); st.exLoop = list; markPlay(k);
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
    if (el.dataset.x === "gw") { const w = el.dataset.g, g = x.gloss?.[w] || {}, rom = romOn() && g.rom; if (!g.ne && !rom) return ""; return `<b lang="ko">${esc(w)}</b>${rom ? ` <span class="rom">${esc(g.rom)}</span>` : ""}${g.ne ? ` · ${esc(g.ne)}` : ""}`; } // 뜻·로마자 없으면 말풍선 없음
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
      <div class="exhead"><b>${esc(t("explain"))}</b><span class="sub">${i + 1} / ${L.length} · <span class="ko" lang="ko">${esc(l.speaker)}</span></span><span class="grow"></span>
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
  const nav = { n: 0, skip: 0 };
  const navPush = () => { history.pushState({ malmun: ++nav.n }, ""); };
  const navPop = () => { if (history.state?.malmun) { nav.skip++; history.back(); } };
  const onPop = () => {
    if (nav.skip) { nav.skip--; return; }
    if (panel.__sp?.closeList?.()) return; // 마이크 목록부터
    if (st.panel) closePanel(true);
  };
  addEventListener("popstate", onPop);
  async function openPanel(kind, i, { autoplay = false, task } = {}) {
    if (!st.panel) navPush(); // 처음 열 때만 한 칸
    i = Math.max(0, Math.min(L.length - 1, i));
    stopAll(); ex.stop(); st.once = false; select(i, { scroll: false });
    st.panel?.cleanup?.();
    const mine = (st.panel = { kind, i });
    vwrap.hidden = true; panel.hidden = false; panel.className = `panel ${kind}${kind === "explain" && L[i].v9 ? " v9" : ""}${" fitting"}`; if (kind !== "explain") panel.innerHTML = ""; // 앞 창 내용이 새 창 크기로 잠깐 넘쳐 보이지 않게 setTimeout(() => st.panel === mine && panel.classList.remove("fitting"), 1500); // 글 크기 맞출 때까지 안 보이게(늦어도 1.5초 뒤엔 보임)
    markButtons();
    if (kind === "explain") {
      panel.innerHTML = explainHTML(i);
      if (L[i].v9) v9Fit(); fitPanel(); panel.classList.remove("fitting"); setTimeout(fitPanel, 300); document.fonts?.ready.then(() => st.panel === mine && fitPanel()); // 글꼴이 늦게 와도 다시 맞춤 // 한 줄에 안 들어가면 (한국어) 괄호 → ✕ 글자 순서로 뺌
      if (L[i].v9) { mine.cleanup = spStop; spInit(i); if (!canScore()) { const g = panel.querySelector(".sayb .smsg"); if (g) g.textContent = t("speak_hint_noscore"); } } // 마이크는 🎤 누를 때만 연다(열면 블루투스가 통화 모드로 바뀌어 설명 소리까지 전화 음질 — 본부 10-03)
      if (autoplay) { ex.play((st.exLoop = exItems(i))); if (L[i].v9) markPlay(v9pref().snd); }
      setTimeout(() => keepVisible(i), 60); // 카드가 길어도 그 줄이 아래 막대에 가리지 않게
    } else {
      const view = kind === "speak" ? speakView : writeView; // 줄을 다 쓰면(말하면) 다음 줄의 같은 메뉴로(W6 · S7)
      const cleanup = await view(panel, ep, L[i].id, { embedded: true, task, onNext: k => openPanel(kind, k), onClose: () => closePanel(), navPush, navPop });
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
    panel.hidden = true; panel.innerHTML = ""; vwrap.hidden = false; vsubFill(st.cur); fitCard(st.cur); // 영상 창도 같은 카드 자리
    markButtons();
    v.currentTime = L[st.cur].start;
    pad(); underVideo(items[st.cur]); sync();
  }
  // 카드 안 말하기(녹음 → 점수 → 내 목소리) — js/recorder.js
  let sp = null; // { i, ctl, blob, audio, saved }
  function spStop() { quietWake(false); sp?.ctl?.stop(true); sp?.audio?.pause(); sp?.slow?.pause(); sp = null; closeMic(); } // 카드를 닫을 때 마이크도 닫음(그때처럼 · 카드가 열려 있는 동안은 쥐고 있음)
  const playRec = b => { // 말 시작 자리부터 — 풀어서 그 자리부터 직결 재생(js/playmine.js · <audio> 자리 옮기기 안 씀) · 한 번만
    ex.stop(); clearTimeout(st.gap); st.gap = 0; st.exLoop = null; sp.audio?.pause();
    return (sp.audio = playMineRec(b, { keepFirst: keepFirstOf(L[sp.i]?.say?.ko) }));
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
    const playingAtStart = ex.playing || !!(sp?.audio && !sp.audio.paused) || !v.paused; // 진단: 녹음 시작 때 소리가 나오고 있었나
    ex.stop(); clearTimeout(st.gap); st.gap = 0; st.exLoop = null; sp?.audio?.pause(); sp?.slow?.pause(); stopFx(); scoreFx(box.querySelector(".fx"), null); markPlay(); sync(); // 🎤 = 반복·재생·효과음 모두 멈춤
    // 「준비 중」 → 마이크에서 실제 소리가 들어오기 시작하면 「녹음 중」(본부 10-03 — 그 전에 말하면 앞이 비어 버린다)
    quietWake(true); // 녹음하는 동안 깨우기 소리 멈춤(에코 제거가 말을 끊지 않게)
    const tb = box.querySelector(".tbar"), mm = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
    const ctl = record({
      maxMs: maxMsFor(L[i].say.ko), // 최대 길이 = max(8, 3 + 0.8 × 음절)초
      onTick: (el, max) => { tb.hidden = false; tb.firstElementChild.style.width = Math.min(100, (100 * el) / max) + "%"; tb.classList.toggle("low", el > max * 0.8); tb.querySelector(".tt").textContent = `${mm(el)} / ${mm(max)}`; },
      onLevel: v => { lvl.firstElementChild.style.width = Math.round(v * 100) + "%"; },
      onStop: () => { if (sp?.ctl === ctl) { msg.textContent = t("checking"); lvl.hidden = true; } },
      onSwitch: () => { btn.textContent = "… " + t("mic_opening"); lvl.hidden = true; msg.textContent = t("mic_switched"); },
      onReady: () => { if (sp?.ctl !== ctl) return; btn.textContent = "■ " + t("btn_stop"); lvl.hidden = false; msg.textContent = t("listening");
        const nb = box.querySelector(".micname"); if (nb && micLabel()) { nb.textContent = `🎤 ${micLabel()} ✓`; nb.hidden = false; } }, // 지금 쓰는 마이크 — 자동이 틀렸을 때만 눌러 바꿈
    });
    sp = { i, ctl, saved: sp?.saved, blob: sp?.blob };
    box.querySelector("[data-x=keep]").hidden = true; box.querySelector(".heardline").innerHTML = "";
    btn.classList.add("on"); btn.textContent = "… " + t("mic_opening"); lvl.hidden = true; msg.textContent = "";
    const r = await ctl.done; tb.hidden = true;
    quietWake(false);
    if (st.panel?.i !== i || sp?.ctl !== ctl) return; // 다른 데로 감
    sp.ctl = null; btn.classList.remove("on"); lvl.hidden = true;
    if (r.cancelled) { btn.textContent = "🎤 " + t("speak_now"); msg.textContent = ""; return; }
    if (r.error) { btn.textContent = "🎤 " + t("speak_now"); msg.textContent = t(micWhy(r.error)); return; }
    let sc = canScore() && r.heard.length ? Math.max(...r.heard.map(h => similarity(L[i].say.ko, h))) : null;
    const env = await diagEnv(); // 진단(화면에 안 보임) — 소리 엔진·🔁·녹음 시작 때 재생 중이었는지·출력 장치 + 녹음 소리 자체(malmun_diag · 마지막 3개)
    logRec({ where: "card", line: L[i].id, want: L[i].say.ko, ...r.diag, heard: [...new Set(r.heard)], score: sc, ...env, playingAtStart });
    keepDiag(r.blob, { where: "card", line: L[i].id, score: sc, heard: [...new Set(r.heard)] });
    // 리듬(투덜이 10-06 허락) — 글자 점수 × 리듬 배수(말하기 창과 같은 함수) · 근거는 결과 줄에
    let rhy = null;
    if (sc > 0) { const rh = await rhythmOf({ ep, key: `${ep}_${String(L[i].id).padStart(2, "0")}_say`, url: L[i].say.src, text: L[i].say.ko, blob: r.blob, heard: bestHeard(L[i].say.ko, r.heard) }); if (st.panel?.i !== i) return; if (rh) { rhy = { L: sc, R: rh.R, worst: rh.worst }; sc = withRhythm(sc, rh.R); } }
    sp.blob = r.blob; sp.score = sc; sp.rhy = rhy;
    mineB.disabled = false; // 방금 녹음 — 언제나
    btn.textContent = "🎤 " + t(sc != null && sc >= PASS ? "speak_now" : "try_again");
    // 점수가 안 나오면 절대 통과·저장 아님(본부 10-04 — 엉뚱한 말도 그냥 넘어가던 것) · 왜 안 나왔는지 짧게
    // 점수는 언제나 % — 못 알아들었으면 「0% · 까닭」 · 80% 넘으면 [저장]
    box.querySelector("[data-x=keep]").hidden = !(sc != null && sc >= PASS);
    msg.textContent = sc == null ? (canScore() ? `0% · ${t(r.why === "nospeech" ? "why_nospeech" : srWhy(r.srErr))}` : t("speak_hint_noscore")) : scoreLine(sc, r.why, t, (h => h && { ...h, say: L[i].say.ko, rom: Object.fromEntries([...(L[i].v9?.pieces || []).map(p => [p.ko, p.rom]), ...Object.entries(L[i].v9?.gloss || {}).map(([k, g]) => [k, g.rom])].filter(([k, r]) => k && r)) })(endHint(L[i].say.ko, r.heard))); // 두 단계 통과 ☆/★ + 끝난 까닭
    if (rhy && sc != null) msg.textContent += " · " + rhyText(rhy, t);
    box.classList.toggle("pass", sc != null && sc >= PASS);
    scoreFx(box.querySelector(".fx"), sc, { busy: () => !!sp?.ctl }); // 점수가 뜨는 순간 효과 한 번 · 말소리 없음(점수 없음)은 효과 없음
    const bh = bestHeard(L[i].say.ko, r.heard); // 들린 말 — 점수를 낸 그 인식 결과 · 틀린 음절 빨간 밑줄 · 빠진 자리 _
    box.querySelector(".heardline").innerHTML = bh ? (({ html, ok }) => `<span class="lab">${esc(t("heard_label"))}:</span> <span class="ko" lang="ko">${html}</span>${ok ? " ✓" : ""}`)(heardHTML(L[i].say.ko, bh)) : "";
  }
  // 맨 위 한 줄 맞추기 + 처음 한 번 말풍선(▶ = 듣는 언어 · 탭 = 읽는 언어 · 3초 · 다시 안 뜸)
  function v9Fit() {
    const bar = panel.querySelector(".v9bar"); if (!bar) return;
    const over = () => bar.scrollWidth > bar.clientWidth + 1;
    bar.classList.remove("nok", "nocw");
    if (over()) bar.classList.add("nok");
    if (over()) bar.classList.add("nocw");
    if (pref("malmun.v9tip") !== "1") { const tip = panel.querySelector(".v9tip"); pref("malmun.v9tip", "1"); tip.hidden = false; setTimeout(() => { tip.hidden = true; }, 3000); }
  }
  const markPlay = (k = null) => panel.querySelectorAll(".v9bar .pb[data-x=ex]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === k)));
  function v9Click(x) {
    const i = st.panel.i, k = x.dataset.x;
    if (k === "txt") { // 글 언어 — 편 전체 · 기억 · 소리는 그대로 이어서
      v9set("txt", x.dataset.v);
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
      sp?.audio?.pause();
      if (on && ex.playing) { ex.pause(); return sync(); }
      if (on && ex.q.length) { ex.resume(); return sync(); }
      const cur = ex.q[ex.i], going = ex.q.length && cur && (ex.playing || ex.a.currentTime > 0);
      v9set("snd", v); clearTimeout(st.gap); st.gap = 0; v9Text(i, v);
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
    if (k === "gw") { const sn = x.closest(".sn"), h = popFor(x); if (sn) playFromSent(sn); return h ? v9Pop(x, h) : hidePop(); } // 따옴표 낱말 = 그 문장부터 재생 + 뜻이 있으면 작은 말풍선(본부 10-05)
    if (k === "sn") { hidePop(); return playFromSent(x); } // 문장 = 그 문장부터 재생
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
      sp?.audio?.pause(); sp?.slow?.pause(); markPlay();
      const r = getRate("m"); if (r !== 1) { ex.stop(); if (sp) sp.slow = playSlow(L[i].say.src, r); else sp = { i, slow: playSlow(L[i].say.src, r) }; return sync(); } // 본보기 속도(말하기 화면·비교 화면과 같은 값 · 음높이 그대로)
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
    if (k === "savedl") { if (sp?.saved?.blob) downloadRec(sp.saved.blob, `malmun_${sayKey(i).split("/")[1]}_${sp.saved.score ?? ""}`); return; } // 원본 그대로 파일로
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
    if (k === "mine") {
      if (!sp?.blob || sp.ctl) return;
      ex.stop(); sp.slow?.pause(); markPlay(); sync();
      playRec(sp.blob); sp.audioKey = "mine";
    }
  }
  // (설명 진행 막대·끌어 옮기기는 없앰 — 본부 10-05 · 이동은 문장 누르기 · 맨 위 줄 「n/N」)
  // 위 창 누르기 = 멈춤/재생(설명) · 한글 대조·학습자 말 단추는 그대로
  panel.addEventListener("click", e => {
    if (st.panel?.kind !== "explain") return;
    const x = e.target.closest("[data-x]");
    if (e.target.closest(".sayb")) { if (x) v9Click(x); return; } // 말하기 칸은 눌러도 멈춤/재생 안 함
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
    if (st.mode === "video") { v.currentTime = L[i].start; v.play(); }
    else seq.play(lessonItems(i, true));
    sync();
  }
  function playFrom(i) { // 이어 보기(듣기)
    stopAll(); st.once = false; select(i, { force: true });
    if (st.mode === "video") { v.currentTime = L[i].start; v.play(); }
    else seq.play(lessonItems(i, false));
    sync();
  }
  function togglePlay() { // R4
    if (st.panel?.kind === "write") { panel.__wr?.toggle(); return; } // 쓰기 창: ▶ = 이 부분 듣기(W6)
    if (st.panel?.kind === "speak") { panel.__sp?.toggle(); return; } // 말하기 창: ▶ = 본보기(S2)
    if (st.panel?.kind === "explain") { // 설명 창: ▶ = 설명 읽기 멈춤/이어서
      if (playing()) { clearTimeout(st.gap); st.gap = 0; ex.pause(); }
      else if (ex.q.length) ex.resume(); else ex.play((st.exLoop = exItems(st.panel.i)));
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
      v.play();
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
      const i = st.panel.i; closePanel(); if (st.mode !== "video") setMode("video"); playFrom(i);
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
  app.querySelector(".lines").onclick = e => {
    if (e.target.closest("a")) return;
    const sx = e.target.closest(".expl [data-x=gw], .expl [data-x=sn]"); if (sx) { if (sx.dataset.x === "gw") return v9Pop(sx, popFor(sx)); hidePop(); return playFromSent(sx); } // 듣기 모드 설명 글 — 낱말 뜻 · 문장 = 그 문장부터
    const li = e.target.closest(".line");
    if (!li) return;
    const i = +li.dataset.i, m = e.target.closest("[data-act=explain],[data-act=write],[data-act=speak]");
    // 설명·쓰기 = 위 창을 영상 ⇄ 그 메뉴로 바꾸는 토글(설명은 열면 바로 읽어 줌)
    if (m) return st.panel?.kind === m.dataset.act && st.panel.i === i ? closePanel() : openPanel(m.dataset.act, i, { autoplay: m.dataset.act === "explain" });
    // 이 줄 듣기 = 토글(듣는 중이면 멈춤) · 위 창이 설명·쓰기면 영상으로 돌아와 듣기
    if (e.target.closest("[data-act=once]")) {
      if (!st.panel && st.once && i === st.cur && playing()) { v.pause(); seq.pause(); st.once = false; return sync(); }
      closePanel(); return playLine(i);
    }
    if (st.panel) { if (i !== st.panel.i) openPanel(st.panel.kind, i); return; } // 위 창이 메뉴면 누른 줄의 같은 메뉴(멈춘 채)
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
  app.querySelector("[data-act=fs]").onclick = () => {
    const w = app.querySelector("#vwrap");
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (w.requestFullscreen) w.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  };
  const onKey = e => { if (e.code !== "Space" || /^(INPUT|BUTTON|TEXTAREA|A)$/.test(e.target.tagName)) return; e.preventDefault(); togglePlay(); };
  document.addEventListener("keydown", onKey);

  // R9 — 마지막 줄(또는 쓰기·설명에서 돌아온 줄)에서 멈춘 채 시작
  if (startId) { const k = L.findIndex(l => String(l.id) === String(startId)); if (k >= 0) st.cur = k; }
  ready = true; // 이제 카드 맞춤(fitCard)이 쓰는 막대·창이 다 있음
  try { history.scrollRestoration = "manual"; } catch {} // 새로 열 때 브라우저가 옛 스크롤 자리로 되돌리지 않게(본부 10-06 — 처음 몇 초 7·8번 카드가 보임)
  select(st.cur, { scroll: false });
  pad(); fitCard(st.cur); if (st.cur > 0) underVideo(items[st.cur], true); // 첫 프레임부터 제자리(움직임 없이 바로)
  // 글꼴·영상 크기가 다 잡힌 뒤 한 번 더(처음 열 때 지금 줄이 영상 아래로 안 오던 문제) — 그사이 손으로 움직였으면 하지 않음
  const settle = () => { if (st.cur > 0 && Date.now() - st.handScroll > 4000 && !playing() && !st.panel) { pad(); fitCard(st.cur); underVideo(items[st.cur], true); } };
  document.fonts?.ready.then(() => setTimeout(settle, 50));
  [100, 300, 600, 1200, 2500].forEach(ms => setTimeout(settle, ms)); // 글꼴·영상·그림이 늦게 와 줄 높이가 바뀌어도 바로 제자리
  v.addEventListener("loadedmetadata", settle, { once: true });
  v.addEventListener("loadedmetadata", () => { if (v.paused && !st.once) v.currentTime = L[st.cur].start; }, { once: true });
  sync();
  const release = hold(); // 소리 장치 깨워 두기(첫소리 먹힘 방지)
  return () => { clearInterval(litT); clearInterval(seekTimer); clearInterval(hlTimer); document.removeEventListener("pointerdown", onDocDown, true); removeEventListener("popstate", onPop); clearTimeout(st.animEnd); release(); st.panel?.cleanup?.(); ex.stop(); removeEventListener("resize", pad); removeEventListener("resize", onFit); clearInterval(timer); clearTimeout(st.gap); document.removeEventListener("keydown", onKey); seq.stop(); v.pause(); v.removeAttribute("src"); v.load(); };
}
