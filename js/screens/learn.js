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
import { t, lang, langName } from "../i18n.js";
import { esc, renderText, glossCards } from "../text.js";
import { episode } from "../data.js";
import { paths } from "../paths.js";
import { Sequence } from "../audio.js";
import { I, progress, SPEAKER } from "../ui.js";
import writeView from "./write.js";

const RATES = [1, 0.75, 0.5];
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const LOOP_GAP = 700;
const LEAD = 0.35;  // 자막은 목소리보다 0.35초 먼저 영상 아래에(줄 시각 = 실제 목소리 · 느린 속도면 영상 시간으로 줄인다)
const SCROLL_MS = 220; // 줄을 영상 아래로 올리는 시간 — 먼저 와 있어야 해서 짧게
const FS = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

export default async function learn(app, ep, startId) {
  const d = await episode(ep, lang);
  const L = d.lines;
  const last = Math.min(progress.get(ep).at ?? (progress.get(ep).line || 1) - 1, L.length - 1);
  // once = 지금 한 줄만 듣는 중 · rep = 반복 켜짐 · gap = 반복 사이 쉬는 중
  const st = { mode: "video", cur: Math.max(0, last), once: false, rep: false, gap: 0, rate: 0, handScroll: 0, anim: 0 };
  const seq = new Sequence();

  app.innerHTML = `<section class="scr learn">
    <div class="stick">
    <div class="vstage">
    <div class="video" id="vwrap"><video playsinline preload="metadata" poster="${paths.poster(ep)}" src="${paths.video(ep)}"></video>
      <span class="vplay" aria-hidden="true">${I.play}</span>
      <div class="cap" aria-live="polite"></div>
      <button class="vfs" data-act="fs" aria-label="${esc(t("fullscreen"))}">${FS}</button></div>
    <div class="panel" hidden></div>
    </div>
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
      <div class="acts"><button data-act="once">${I.play}<span>${esc(t("listen_line"))}</span></button><button class="menu" data-act="explain">${esc(t("explain"))}</button><button class="menu" data-act="write">${esc(t("write"))}</button></div>
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
    // 전체 화면(화면만 보기)에서도 자막은 보여야 한다 — 영상 아래쪽에 지금 줄
    app.querySelector(".cap").innerHTML = `<span class="ko" lang="ko">${esc(L[i].ko)}</span>${L[i].tr ? `<span class="tr">${esc(L[i].tr)}</span>` : ""}`;
    if (scroll && (force || Date.now() - st.handScroll > 4000)) underVideo(items[i]);
    const p = progress.get(ep);
    progress.set(ep, { at: i, line: Math.max(p.line || 0, i + 1) });
  }
  // 지금 줄 = 영상(+모드 줄) 바로 아래 · 앞 줄들은 영상 뒤로 올라간다
  const stick = app.querySelector(".stick"), list = app.querySelector(".lines");
  function underVideo(el) {
    const to = Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - stick.offsetHeight - 10, document.documentElement.scrollHeight - innerHeight));
    cancelAnimationFrame(st.anim);
    if (reduce || document.hidden) return scrollTo(0, to);
    const from = scrollY, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / SCROLL_MS); scrollTo(0, from + (to - from) * (1 - (1 - k) ** 3)); if (k < 1) st.anim = requestAnimationFrame(step); };
    st.anim = requestAnimationFrame(step);
  }
  // 마지막 줄도 영상 바로 아래까지 올라올 수 있게 목록 아래 여백 = 화면에서 영상을 뺀 높이
  const pad = () => { list.style.paddingBottom = Math.max(120, innerHeight - stick.offsetHeight - 40) + "px"; };
  addEventListener("resize", pad); pad();
  ["touchmove", "wheel"].forEach(e => window.addEventListener(e, () => { st.handScroll = Date.now(); }, { passive: true }));

  const playing = () => (st.panel?.kind === "explain" ? ex.playing || !!st.gap : st.mode === "video" ? !v.paused || !!st.gap : seq.playing);
  const sync = () => {
    playBtn.innerHTML = playing() ? I.pause : I.play;
    app.querySelector("#vwrap").classList.toggle("paused", !playing());
    app.querySelector(".panel").classList.toggle("paused", !playing());
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

  // ── 위 창 = 영상 · 설명 · 쓰기 중 하나(R12) — 조작은 줄 단추(토글) + 아래 막대 하나뿐(R14) ──
  const panel = app.querySelector(".panel"), vwrap = app.querySelector("#vwrap");
  const ex = new Sequence(); // 설명 읽기(대사 → 설명 문단)
  const romOn = () => pref("malmun.rom") !== "0";
  st.panel = null;
  function explainHTML(i) {
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
  const exItems = i => [
    ...(L[i].lineAudio ? [{ src: paths.audio(ep, L[i].lineAudio), p: -1 }] : []),
    ...L[i].krAudio.map((f, p) => ({ src: paths.audio(ep, f), p })),
  ];
  ex.onstep = it => {
    const ps = [...panel.querySelectorAll(".paras p[data-p]")];
    ps.forEach((el, k) => el.classList.toggle("cur", k === it.p));
    ps[it.p]?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    sync();
  };
  ex.ondone = () => {
    panel.querySelectorAll(".paras p.cur").forEach(el => el.classList.remove("cur"));
    if (st.rep && st.panel?.kind === "explain") st.gap = setTimeout(() => { st.gap = 0; if (st.rep && st.panel?.kind === "explain") ex.play(exItems(st.panel.i)); sync(); }, LOOP_GAP);
    sync();
  };
  ex.a.addEventListener("timeupdate", () => { const a = ex.a, bar = panel.querySelector(".exprog i"); if (bar && a.duration) bar.style.width = (100 * a.currentTime) / a.duration + "%"; });
  const markButtons = () => items.forEach((li, k) => li.querySelectorAll("[data-act=explain],[data-act=write]").forEach(b => b.setAttribute("aria-pressed", String(!!st.panel && k === st.panel.i && b.dataset.act === st.panel.kind))));

  async function openPanel(kind, i, { autoplay = false } = {}) {
    i = Math.max(0, Math.min(L.length - 1, i));
    stopAll(); ex.stop(); st.once = false; select(i, { scroll: false });
    st.panel?.cleanup?.();
    const mine = (st.panel = { kind, i });
    vwrap.hidden = true; panel.hidden = false; panel.className = `panel ${kind}`;
    markButtons();
    if (kind === "explain") {
      panel.innerHTML = explainHTML(i);
      if (autoplay) ex.play(exItems(i));
    } else {
      const cleanup = await writeView(panel, ep, L[i].id, { embedded: true, onNext: k => openPanel("write", k) }); // 줄을 다 쓰면 다음 줄 쓰기(W6)
      if (st.panel !== mine) return cleanup?.();
      mine.cleanup = cleanup;
    }
    pad(); underVideo(items[i]); sync();
  }
  function closePanel() {
    if (!st.panel) return;
    st.panel.cleanup?.(); ex.stop(); clearTimeout(st.gap); st.gap = 0; st.panel = null;
    panel.hidden = true; panel.innerHTML = ""; vwrap.hidden = false;
    markButtons();
    v.currentTime = L[st.cur].start;
    pad(); underVideo(items[st.cur]); sync();
  }
  // 위 창 누르기 = 멈춤/재생(설명) · 한글 대조·학습자 말 단추는 그대로
  panel.addEventListener("click", e => {
    if (st.panel?.kind !== "explain") return;
    const x = e.target.closest("[data-x]");
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
    if (st.panel?.kind === "write") { panel.__wr?.toggle(); return; } // 쓰기 창: ▶ = 문장 듣기(W6)
    if (st.panel?.kind === "explain") { // 설명 창: ▶ = 설명 읽기 멈춤/이어서
      if (playing()) { clearTimeout(st.gap); st.gap = 0; ex.pause(); }
      else if (ex.q.length) ex.resume(); else ex.play(exItems(st.panel.i));
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

  app.querySelector(".mode").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); };
  app.querySelector(".lines").onclick = e => {
    if (e.target.closest("a")) return;
    const li = e.target.closest(".line");
    if (!li) return;
    const i = +li.dataset.i, m = e.target.closest("[data-act=explain],[data-act=write]");
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
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (st.panel && (a === "prev" || a === "next")) return openPanel(st.panel.kind, st.panel.i + (a === "next" ? 1 : -1), { autoplay: playing() });
    if (a === "play") togglePlay();
    else if (a === "prev") step(-1);
    else if (a === "next") step(1);
    else if (a === "rep") {
      st.rep = !st.rep; b.setAttribute("aria-pressed", String(st.rep));
      if (st.rep) { st.once = false; if (playing()) playLine(st.cur); }
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
  select(st.cur, { scroll: st.cur > 0, force: true });
  // 글꼴·영상 크기가 다 잡힌 뒤 한 번 더(처음 열 때 지금 줄이 영상 아래로 안 오던 문제) — 그사이 손으로 움직였으면 하지 않음
  const settle = () => { if (st.cur > 0 && Date.now() - st.handScroll > 4000 && !playing()) underVideo(items[st.cur]); };
  document.fonts?.ready.then(() => setTimeout(settle, 50));
  setTimeout(settle, 600);
  v.addEventListener("loadedmetadata", () => { if (v.paused && !st.once) v.currentTime = L[st.cur].start; }, { once: true });
  sync();
  return () => { st.panel?.cleanup?.(); ex.stop(); removeEventListener("resize", pad); clearInterval(timer); clearTimeout(st.gap); document.removeEventListener("keydown", onKey); seq.stop(); v.pause(); v.removeAttribute("src"); v.load(); };
}
