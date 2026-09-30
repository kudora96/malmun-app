// 학습 화면 — 옛 앱(learn.html) 조작 그대로(투덜이 2026-09-30 「예전 게 훨씬 좋다」)
//  · 영상을 누르면 멈춤 / 다시 누르면 재생 · 전체 화면 버튼(화면만 보기)
//  · 줄을 누르면 그 줄로 가서 재생(끝나면 그 줄을 다시) + 아래에 반복 막대 「#05 … 🔁 반복 · ▶ 전체」 + 줄 밑에 설명·쓰기 버튼
//  · 같은 줄을 한 번 더 누르면 닫고 이어서 전체 재생 · 🔁 반복 = 줄 사이 0.7초 쉬고 반복 + 속도 · ⏹ 중지
//  · 목록 머리: ◀ ▶ 줄 이동 · 학습자말→한국어 순서 바꾸기 · A- A+ · 05/15
//  · [말문] 듣기 모드 둘(대사→설명 · 설명만)은 app_build_spec 재생 모드 — 머리 오른쪽 단추
import { t, lang, langName } from "../i18n.js";
import { esc, renderText } from "../text.js";
import { episode } from "../data.js";
import { paths } from "../paths.js";
import { Sequence } from "../audio.js";
import { I, progress, SPEAKER } from "../ui.js";

const SPEEDS = [1, 0.75, 0.5];
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const FS = I.play.replace(/<path[^>]*\/>/, '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2"/>');

export default async function learn(app, ep, startId) {
  const d = await episode(ep, lang);
  const L = d.lines;
  const seq = new Sequence();
  const st = { cur: null, open: -1, loop: null, loopPausing: false, userPaused: false, last: -1, speed: 0, mode: "video" };
  let loopTimer = 0;
  const trFirst = () => pref("malmun.order") !== "ko";
  let scale = +(pref("malmun.font") || 1);

  app.innerHTML = `<section class="scr learn" style="--fs:${scale}">
    <div class="topbar"><a class="iconbtn" href="#/list" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="ep">${esc(ep)}</div><div class="ttl ko" lang="ko">${esc(d.title)}</div></div></div>
    <div class="video" id="vwrap"><video playsinline preload="metadata" poster="${paths.poster(ep)}" src="${paths.video(ep)}"></video>
      <button class="vbtn vplay" data-act="vtoggle" aria-label="${esc(t("play"))}">${I.play}</button>
      <button class="vbtn vfs" data-act="fs" aria-label="${esc(t("fullscreen"))}">${FS}</button></div>
    <div class="loopbar" hidden><div class="info"></div>
      <button class="lb rep" data-act="loop">🔁 ${esc(t("repeat"))}</button><button class="lb all" data-act="all">▶ ${esc(t("play_all"))}</button>
      <button class="lb spd" data-act="spd" hidden>🐢1x</button><button class="lb stop" data-act="stop" hidden>⏹ ${esc(t("btn_stop"))}</button></div>
    <div class="lhead">
      <button class="nav" data-act="prev" aria-label="${esc(t("previous"))}">&#9664;</button><button class="nav" data-act="next" aria-label="${esc(t("next"))}">&#9654;</button>
      <button class="order" data-act="order"></button>
      <button class="font" data-act="fmin">A-</button><button class="font" data-act="fplus">A+</button>
      <span class="count"></span>
      <span class="grow"></span>
      <button class="mode" data-mode="full" aria-pressed="false">${esc(t("mode_full"))}</button>
      <button class="mode" data-mode="explain" aria-pressed="false">${esc(t("mode_explain"))}</button>
    </div>
    <ol class="rows">${L.map((l, i) => `<li class="row sp-${SPEAKER[l.speaker] || "x"}" data-i="${i}">
      <div class="rl"><span class="num">${i + 1}</span><div class="txt"></div><span class="time">${fmt(l.start)}</span></div>
      <div class="expl"></div>
      <div class="detail">
        ${l.trParas.some(Boolean) ? `<a class="db" href="#/explain/${ep}/${l.id}/tr"><b>${esc(lang.toUpperCase())}</b><span>${esc(langName(lang))} ${esc(t("explain"))}</span></a>` : ""}
        <a class="db" href="#/explain/${ep}/${l.id}"><b>KR</b><span>${esc(t("explain_kr"))}</span></a>
        <a class="db" href="#/write/${ep}/${l.id}"><b>✏️</b><span>${esc(t("write"))}</span></a>
      </div></li>`).join("")}<li class="tailpad"></li></ol>
  </section>`;

  const $ = s => app.querySelector(s);
  const v = $("video"), rows = [...app.querySelectorAll(".row")], bar = $(".loopbar");

  function paintText() {
    rows.forEach((r, i) => {
      const l = L[i], ko = `<div class="ko ${trFirst() ? "sec" : "pri"}" lang="ko">${esc(l.ko)}</div>`, tr = l.tr ? `<div class="tr ${trFirst() ? "pri" : "sec"}">${esc(l.tr)}</div>` : "";
      r.querySelector(".txt").innerHTML = `<span class="who ko" lang="ko">${esc(l.speaker)}</span>` + (trFirst() && tr ? tr + ko : ko + tr);
    });
    $(".order").textContent = trFirst() ? `${lang.toUpperCase()}→KO` : `KO→${lang.toUpperCase()}`;
  }
  function highlight(i, scroll = true) {
    rows.forEach((r, k) => r.classList.toggle("active", k === i));
    if (i >= 0) {
      if (scroll) rows[i].scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      if (i + 1 > (progress.get(ep).line || 0)) progress.set(ep, { line: i + 1 });
    }
    $(".count").textContent = `${i >= 0 ? String(i + 1).padStart(2, "0") : "--"}/${String(L.length).padStart(2, "0")}`;
    $("[data-act=prev]").disabled = i <= 0;
    $("[data-act=next]").disabled = i >= L.length - 1;
  }
  function showBar(mode) {
    const i = st.cur;
    if (i == null) { bar.hidden = true; return; }
    bar.hidden = false;
    const text = trFirst() && L[i].tr ? L[i].tr : L[i].ko;
    bar.querySelector(".info").textContent = `${mode === "loop" ? "🔁 " : ""}#${String(i + 1).padStart(2, "0")} ${text.length > 25 ? text.slice(0, 25) + "…" : text}`;
    bar.querySelector(".rep").hidden = bar.querySelector(".all").hidden = mode === "loop";
    bar.querySelector(".spd").hidden = bar.querySelector(".stop").hidden = mode !== "loop";
  }
  const openDetail = i => rows.forEach((r, k) => r.classList.toggle("open", k === i));
  function cancelLoop() { clearTimeout(loopTimer); st.loopPausing = false; if (st.loop != null) rows[st.loop].classList.remove("looping"); st.loop = null; }
  function resetSpeed() { st.speed = 0; v.playbackRate = 1; seq.setRate(1); bar.querySelector(".spd").textContent = "🐢1x"; }
  function stopLesson() { seq.stop(); rows.forEach(r => r.querySelector(".expl").classList.remove("on")); }
  function setMode(m) {
    st.mode = m;
    app.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  }

  // 영상 모드 — 옛 updateSubtitle(0.2초마다) 그대로
  function tick() {
    if (st.mode !== "video" || st.userPaused || v.paused) return;
    const now = v.currentTime;
    if (st.cur != null && st.loop == null && now >= L[st.cur].end) { v.currentTime = L[st.cur].start; return; }
    if (st.loop != null && !st.loopPausing && now >= L[st.loop].end) {
      st.loopPausing = true; v.currentTime = L[st.loop].start; v.pause();
      loopTimer = setTimeout(() => { if (st.loop != null && !st.userPaused) { v.play(); st.loopPausing = false; } }, 700);
      return;
    }
    let found = -1;
    for (let k = 0; k < L.length; k++) if (now >= L[k].start && now < L[k].end) { found = k; break; }
    if (found < 0 && now >= L[L.length - 1].end) found = L.length - 1;
    if (found >= 0 && found !== st.last) { st.last = found; highlight(found); }
  }
  const timer = setInterval(tick, 200);
  const syncVBtn = () => { $(".vplay").innerHTML = v.paused ? I.play : I.pause; $("#vwrap").classList.toggle("paused", v.paused); };
  ["play", "pause", "ended"].forEach(e => v.addEventListener(e, syncVBtn));

  // 듣기 모드(대사→설명 · 설명만)
  function lessonFrom(i) {
    v.pause(); stopLesson(); cancelLoop();
    const items = [];
    for (let k = i; k < (st.loop != null ? i + 1 : L.length); k++) {
      if (st.mode === "full" && L[k].lineAudio) items.push({ src: paths.audio(ep, L[k].lineAudio), i: k, p: -1 });
      L[k].krAudio.forEach((f, p) => items.push({ src: paths.audio(ep, f), i: k, p }));
    }
    seq.play(items);
  }
  seq.onstep = it => {
    st.cur = it.i; highlight(it.i); v.currentTime = L[it.i].start;
    rows.forEach((r, k) => { const e = r.querySelector(".expl"); if (k !== it.i || it.p < 0) e.classList.remove("on"); });
    if (it.p >= 0) { const e = rows[it.i].querySelector(".expl"); e.innerHTML = renderText(L[it.i].krParas[it.p] || ""); e.classList.add("on"); }
  };
  seq.ondone = () => { rows.forEach(r => r.querySelector(".expl").classList.remove("on")); };

  // 옛 onSubClick
  function onRow(i) {
    if (st.mode !== "video") { st.cur = i; openDetail(i); return lessonFrom(i); }
    if (st.open === i) { openDetail(-1); st.open = -1; playAll(); highlight(i); st.last = i; return; }
    cancelLoop(); st.userPaused = false; st.cur = i; st.open = i;
    v.currentTime = L[i].start; v.play();
    openDetail(i); highlight(i); showBar("once");
  }
  function playAll() {
    stopLesson(); setMode("video"); cancelLoop(); resetSpeed();
    st.cur = null; st.loopPausing = false; st.userPaused = false; st.last = -1;
    openDetail(-1); st.open = -1; bar.hidden = true; v.play();
  }
  function startLoop() {
    if (st.cur == null) return;
    st.userPaused = false; st.loop = st.cur; st.loopPausing = false;
    rows[st.loop].classList.add("looping");
    if (st.mode === "video") { v.currentTime = L[st.loop].start; v.play(); } else lessonFrom(st.loop);
    showBar("loop");
  }
  function stopLoop() { cancelLoop(); resetSpeed(); v.pause(); stopLesson(); if (st.cur != null) showBar("once"); }
  function toggleVideo() {
    if (st.mode !== "video") { if (seq.playing) seq.pause(); else if (seq.q.length) seq.resume(); return; }
    if (v.paused) { st.userPaused = false; v.play(); } else { st.userPaused = true; v.pause(); }
  }

  app.querySelector(".scr").addEventListener("click", e => {
    if (e.target.closest("a")) return;
    if (e.target === v) return toggleVideo(); // 영상을 누르면 멈춤/재생
    const m = e.target.closest("[data-mode]");
    if (m) { const on = m.getAttribute("aria-pressed") !== "true"; setMode(on ? m.dataset.mode : "video"); stopLesson(); if (on) { st.cur ??= Math.max(st.last, 0); openDetail(st.cur); highlight(st.cur); lessonFrom(st.cur); } return; }
    const b = e.target.closest("[data-act]");
    if (b) {
      const a = b.dataset.act;
      if (a === "vtoggle") toggleVideo();
      else if (a === "fs") { const w = $("#vwrap"); (document.fullscreenElement ? document.exitFullscreen() : (w.requestFullscreen?.() || v.webkitEnterFullscreen?.()))?.catch?.(() => {}); }
      else if (a === "loop") startLoop();
      else if (a === "all") playAll();
      else if (a === "stop") stopLoop();
      else if (a === "spd") { st.speed = (st.speed + 1) % SPEEDS.length; const r = SPEEDS[st.speed]; v.playbackRate = r; seq.setRate(r); b.textContent = "🐢" + r + "x"; }
      else if (a === "prev" || a === "next") { const cur = st.cur ?? st.last; onRowNav(cur < 0 ? 0 : cur + (a === "next" ? 1 : -1)); }
      else if (a === "order") { pref("malmun.order", trFirst() ? "ko" : "tr"); paintText(); if (st.cur != null) showBar(st.loop != null ? "loop" : "once"); }
      else if (a === "fmin" || a === "fplus") { scale = Math.min(1.6, Math.max(0.8, +(scale + (a === "fplus" ? 0.1 : -0.1)).toFixed(1))); pref("malmun.font", scale); app.querySelector(".scr").style.setProperty("--fs", scale); }
      return;
    }
    const r = e.target.closest(".row .rl");
    if (r) onRow(+r.parentElement.dataset.i);
  });
  // 옛 navSub — 그 줄로 가서 재생(상세는 열지 않음)
  function onRowNav(i) {
    if (i < 0 || i >= L.length) return;
    if (st.mode !== "video") { st.cur = i; return lessonFrom(i); }
    st.last = i; highlight(i); cancelLoop(); st.userPaused = false; v.currentTime = L[i].start; v.play();
  }
  // 옛 앱처럼 스페이스 = 멈춤/재생
  const onKey = e => { if (e.code !== "Space" || /INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)) return; e.preventDefault(); toggleVideo(); };
  document.addEventListener("keydown", onKey);

  paintText(); highlight(-1, false); syncVBtn();
  if (startId) { const i = L.findIndex(l => String(l.id) === String(startId)); if (i >= 0) { st.cur = i; st.open = i; openDetail(i); highlight(i); showBar("once"); v.currentTime = L[i].start; } }
  return () => { clearInterval(timer); clearTimeout(loopTimer); seq.stop(); v.pause(); document.removeEventListener("keydown", onKey); v.removeAttribute("src"); v.load(); };
}
