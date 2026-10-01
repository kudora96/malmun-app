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
import { t, lang } from "../i18n.js";
import { esc, renderText } from "../text.js";
import { episode } from "../data.js";
import { paths } from "../paths.js";
import { Sequence } from "../audio.js";
import { I, progress, SPEAKER } from "../ui.js";

const RATES = [1, 0.75, 0.5];
const LOOP_GAP = 700;
const FS = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

export default async function learn(app, ep, startId) {
  const d = await episode(ep, lang);
  const L = d.lines;
  const last = Math.min(progress.get(ep).at ?? (progress.get(ep).line || 1) - 1, L.length - 1);
  // once = 지금 한 줄만 듣는 중 · rep = 반복 켜짐 · gap = 반복 사이 쉬는 중
  const st = { mode: "video", cur: Math.max(0, last), once: false, rep: false, gap: 0, rate: 0, handScroll: 0 };
  const seq = new Sequence();

  app.innerHTML = `<section class="scr learn">
    <div class="stick">
    <div class="video" id="vwrap"><video playsinline preload="metadata" poster="${paths.poster(ep)}" src="${paths.video(ep)}"></video>
      <span class="vplay" aria-hidden="true">${I.play}</span>
      <button class="vfs" data-act="fs" aria-label="${esc(t("fullscreen"))}">${FS}</button></div>
    <div class="mode" role="group">
      <button data-mode="video" aria-pressed="true">${esc(t("mode_video"))}</button>
      <button data-mode="full" aria-pressed="false">${esc(t("mode_full"))}</button>
      <button data-mode="explain" aria-pressed="false">${esc(t("mode_explain"))}</button>
      <span class="where" aria-live="polite"></span>
    </div>
    </div>
    <ol class="lines">${L.map((l, i) => `<li class="line sp-${SPEAKER[l.speaker] || "x"} ${l.speaker === "선생님" ? "" : "right"}" data-i="${i}">
      <span class="who ko" lang="ko">${esc(l.speaker)}</span>
      <p class="kotext ko" lang="ko">${esc(l.ko)}</p>
      ${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}
      <div class="expl"></div>
      <div class="acts"><button data-act="once">${I.play}<span>${esc(t("listen_line"))}</span></button><a href="#/explain/${ep}/${l.id}">${esc(t("explain"))}</a><a href="#/write/${ep}/${l.id}">${esc(t("write"))}</a></div>
    </li>`).join("")}</ol>
    <div class="ctrl">
      <a class="iconbtn" href="#/list" aria-label="${esc(t("back"))}">${I.back}</a>
      <button class="iconbtn" data-act="rep" aria-pressed="false" aria-label="${esc(t("repeat"))}">${I.rep}</button>
      <button class="iconbtn" data-act="prev" aria-label="${esc(t("previous"))}">${I.prev}</button>
      <button class="play" data-act="play" aria-label="${esc(t("play"))}">${I.play}</button>
      <button class="iconbtn" data-act="next" aria-label="${esc(t("next"))}">${I.next}</button>
      <button class="spd" data-act="spd">1×</button>
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
    items[i].classList.add("cur");
    items.forEach((li, k) => li.classList.toggle("past", k < i));
    app.querySelector(".where").textContent = `${i + 1} / ${L.length}`;
    if (scroll && (force || Date.now() - st.handScroll > 4000)) underVideo(items[i]);
    const p = progress.get(ep);
    progress.set(ep, { at: i, line: Math.max(p.line || 0, i + 1) });
  }
  // 지금 줄 = 영상(+모드 줄) 바로 아래 · 앞 줄들은 영상 뒤로 올라간다
  const stick = app.querySelector(".stick"), list = app.querySelector(".lines");
  function underVideo(el) {
    const y = el.getBoundingClientRect().top + scrollY - stick.offsetHeight - 10;
    scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
  }
  // 마지막 줄도 영상 바로 아래까지 올라올 수 있게 목록 아래 여백 = 화면에서 영상을 뺀 높이
  const pad = () => { list.style.paddingBottom = Math.max(120, innerHeight - stick.offsetHeight - 40) + "px"; };
  addEventListener("resize", pad); pad();
  ["touchmove", "wheel"].forEach(e => window.addEventListener(e, () => { st.handScroll = Date.now(); }, { passive: true }));

  const playing = () => (st.mode === "video" ? !v.paused || !!st.gap : seq.playing);
  const sync = () => {
    playBtn.innerHTML = playing() ? I.pause : I.play;
    app.querySelector("#vwrap").classList.toggle("paused", !playing());
    items.forEach((li, k) => li.classList.toggle("onceplay", st.once && k === st.cur && playing()));
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
      for (let i = 0; i < L.length; i++) if (L[i].start <= now + 0.05) k = i;
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
      l.krAudio.forEach((f, p) => out.push({ src: paths.audio(ep, f), i, p }));
    }
    return out;
  }
  seq.onstep = it => {
    select(it.i);
    v.currentTime = L[it.i].start;
    const box = items[it.i].querySelector(".expl");
    if (it.p >= 0) { box.innerHTML = renderText(L[it.i].krParas[it.p] || ""); box.classList.add("on"); }
    else box.classList.remove("on");
    sync();
  };
  seq.ondone = () => {
    if (st.rep) { st.gap = setTimeout(() => { st.gap = 0; if (st.rep) seq.play(lessonItems(st.cur, true)); }, LOOP_GAP); }
    else st.once = false;
    sync();
  };

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

  app.querySelector(".mode").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); };
  app.querySelector(".lines").onclick = e => {
    if (e.target.closest("a")) return;
    const li = e.target.closest(".line");
    if (!li) return;
    if (e.target.closest("[data-act=once]")) return playLine(+li.dataset.i);
    onLineTap(+li.dataset.i);
  };
  app.querySelector(".ctrl").onclick = e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "play") togglePlay();
    else if (a === "prev") step(-1);
    else if (a === "next") step(1);
    else if (a === "rep") {
      st.rep = !st.rep; b.setAttribute("aria-pressed", String(st.rep));
      if (st.rep) { st.once = false; if (playing()) playLine(st.cur); }
      else { clearTimeout(st.gap); st.gap = 0; }
      sync();
    } else if (a === "spd") { st.rate = (st.rate + 1) % RATES.length; const r = RATES[st.rate]; b.textContent = r + "×"; v.playbackRate = r; seq.setRate(r); }
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
  select(st.cur, { scroll: st.cur > 0, force: true });
  v.addEventListener("loadedmetadata", () => { if (v.paused && !st.once) v.currentTime = L[st.cur].start; }, { once: true });
  sync();
  return () => { removeEventListener("resize", pad); clearInterval(timer); clearTimeout(st.gap); document.removeEventListener("keydown", onKey); seq.stop(); v.pause(); v.removeAttribute("src"); v.load(); };
}
