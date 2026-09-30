// 학습 화면 — 영상 + 대사 말풍선 + 재생 모드(영상 / 대사→설명 / 설명만)
import { t, lang } from "../i18n.js";
import { esc, renderText } from "../text.js";
import { episode } from "../data.js";
import { paths } from "../paths.js";
import { Sequence } from "../audio.js";
import { I, progress, SPEAKER } from "../ui.js";

const RATES = [1, 0.75, 0.5];

export default async function learn(app, ep) {
  const d = await episode(ep, lang);
  const L = d.lines;
  const st = { mode: "video", cur: Math.min(progress.get(ep).line || 0, L.length) - 1, rep: false, rate: 0 };
  if (st.cur < 0) st.cur = 0;
  const seq = new Sequence();

  app.innerHTML = `<section class="scr learn">
    <div class="video"><video playsinline preload="metadata" poster="${paths.poster(ep)}" src="${paths.video(ep)}"></video></div>
    <div class="mode" role="group">
      <button data-mode="video" aria-pressed="true">${esc(t("mode_video"))}</button>
      <button data-mode="full" aria-pressed="false">${esc(t("mode_full"))}</button>
      <button data-mode="explain" aria-pressed="false">${esc(t("mode_explain"))}</button>
    </div>
    <ol class="lines">${L.map((l, i) => `<li class="line sp-${SPEAKER[l.speaker] || "x"} ${l.speaker === "선생님" ? "" : "right"}" data-i="${i}">
      <span class="who ko" lang="ko">${esc(l.speaker)}</span>
      <p class="kotext ko" lang="ko">${esc(l.ko)}</p>
      ${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}
      <div class="expl"></div>
      <div class="acts"><a href="#/explain/${ep}/${l.id}">${esc(t("explain"))}</a><a href="#/write/${ep}/${l.id}">${esc(t("write"))}</a></div>
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

  function setCur(i, scroll = true) {
    if (i === st.cur && items[i].classList.contains("cur")) return;
    items[st.cur]?.classList.remove("cur");
    items[st.cur]?.querySelector(".expl").classList.remove("on");
    st.cur = i;
    items[i].classList.add("cur");
    if (scroll) items[i].scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const seen = progress.get(ep).line || 0;
    if (i + 1 > seen) progress.set(ep, { line: i + 1 });
  }
  const playing = () => (st.mode === "video" ? !v.paused : seq.playing);
  const syncBtn = () => { playBtn.innerHTML = playing() ? I.pause : I.play; };

  // 영상 모드: 시간 → 줄
  v.addEventListener("timeupdate", () => {
    if (st.mode !== "video") return;
    const now = v.currentTime;
    const l = L[st.cur];
    if (st.rep && l && now >= l.end) { v.currentTime = l.start; return; }
    let k = -1;
    for (let i = 0; i < L.length; i++) if (L[i].start <= now + 0.05) k = i;
    if (k >= 0 && k !== st.cur) setCur(k);
  });
  ["play", "pause", "ended"].forEach(e => v.addEventListener(e, syncBtn));

  // 듣기 모드: 조각 이어 재생
  function lessonItems(from) {
    const out = [];
    const to = st.rep ? from + 1 : L.length;
    for (let i = from; i < to; i++) {
      const l = L[i];
      if (st.mode === "full" && l.lineAudio) out.push({ src: paths.audio(ep, l.lineAudio), i, p: -1 });
      l.krAudio.forEach((f, p) => out.push({ src: paths.audio(ep, f), i, p }));
    }
    return out;
  }
  seq.onstep = it => {
    setCur(it.i);
    v.currentTime = L[it.i].start;
    const box = items[it.i].querySelector(".expl");
    if (it.p >= 0) { box.innerHTML = renderText(L[it.i].krParas[it.p] || ""); box.classList.add("on"); }
    else box.classList.remove("on");
    syncBtn();
  };
  seq.ondone = () => { if (st.rep && st.mode !== "video") return startLesson(st.cur); syncBtn(); };
  function startLesson(from) { v.pause(); seq.play(lessonItems(from)); syncBtn(); }

  function setMode(m) {
    st.mode = m;
    app.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    seq.stop(); v.pause();
    items.forEach(li => li.querySelector(".expl").classList.remove("on"));
    if (m !== "video") startLesson(st.cur);
    syncBtn();
  }
  function jump(i) {
    i = Math.max(0, Math.min(L.length - 1, i));
    setCur(i);
    if (st.mode === "video") { v.currentTime = L[i].start; v.play(); } else startLesson(i);
  }

  app.querySelector(".mode").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); };
  app.querySelector(".lines").onclick = e => {
    if (e.target.closest("a")) return;
    const li = e.target.closest(".line");
    if (li) jump(+li.dataset.i);
  };
  app.querySelector(".ctrl").onclick = e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "play") {
      if (st.mode === "video") { if (v.paused) { if (v.currentTime < L[st.cur].start - 0.1 || v.ended) v.currentTime = L[st.cur].start; v.play(); } else v.pause(); }
      else if (seq.playing) seq.pause(); else if (seq.q.length) seq.resume(); else startLesson(st.cur);
      syncBtn();
    } else if (a === "prev") jump(st.cur - 1);
    else if (a === "next") jump(st.cur + 1);
    else if (a === "rep") { st.rep = !st.rep; b.setAttribute("aria-pressed", String(st.rep)); if (st.mode !== "video" && seq.playing) startLesson(st.cur); }
    else if (a === "spd") { st.rate = (st.rate + 1) % RATES.length; const r = RATES[st.rate]; b.textContent = r + "×"; v.playbackRate = r; seq.setRate(r); }
  };

  setCur(st.cur, false);
  v.currentTime = 0;
  return () => { seq.stop(); v.pause(); v.removeAttribute("src"); v.load(); };
}
