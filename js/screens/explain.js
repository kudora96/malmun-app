// 설명 화면 — 대사 낱말 카드 + 설명 문단(음성 조각과 1:1 하이라이트)
import { t, lang, langName } from "../i18n.js?v=1010.32";
import { esc, renderText, glossCards } from "../text.js?v=1010.32";
import { episode } from "../data.js?v=1010.32";
import { paths } from "../paths.js?v=1010.32";
import { Sequence } from "../audio.js?v=1010.32";
import { I, spkHtml } from "../ui.js?v=1010.32";

const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

// opts.embedded = 학습 화면의 영상 창 자리에 띄움(새 화면 아님 · 투덜이 10-01) — 닫기·앞뒤 줄은 학습 화면에 맡긴다
export default async function explain(app, ep, id, view, opts = {}) {
  const d = await episode(ep, lang);
  const idx = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const l = d.lines[idx];
  const cards = glossCards(l.glossLine);
  const showRom = pref("malmun.rom") !== "0";
  const hasTr = l.trParas.some(Boolean);
  const seq = new Sequence();

  app.innerHTML = `<section class="scr explain ${opts.embedded ? "embedded" : ""} ${showRom ? "" : "hide-rom"}">
    ${opts.embedded ? `<div class="pbar"><b>${esc(t("explain"))}</b><span class="sub">${idx + 1} / ${d.lines.length} · ${spkHtml(l.speaker)}</span><button class="iconbtn" data-act="close" aria-label="${esc(t("btn_close"))}">✕</button></div>`
    : `<div class="bar"><a class="iconbtn" href="#/learn/${ep}/${l.id}" aria-label="${esc(t("back"))}">${I.back}</a>
      <div class="grow"><div class="t">${esc(t("explain"))}</div><div class="sub">${idx + 1} / ${d.lines.length} · ${spkHtml(l.speaker)}</div></div>
      <a class="chip" href="#/write/${ep}/${l.id}">${esc(t("write"))}</a></div>`}
    <div class="quote">
      <div class="glosses">${cards.length ? cards.map(c => `<span class="g"><span class="rom">${esc(c.rom)}</span><span class="kw ko" lang="ko">${esc(c.ko)}</span><span class="mean">${esc(c.mean)}</span></span>`).join("")
        : `<span class="kw ko" lang="ko" style="font-size:20px;font-weight:700">${esc(l.ko)}</span>`}</div>
      ${l.tr ? `<p class="tr">${esc(l.tr)}</p>` : ""}
      <div class="toggles">
        ${cards.length ? `<button data-act="rom" aria-pressed="${showRom}">${esc(t("gloss_toggle"))}</button>` : ""}
        ${hasTr ? `<button data-act="tr" aria-pressed="${view === "tr"}">${esc(langName(lang))}</button>` : ""}
      </div>
    </div>
    <div class="paras">${l.krParas.map((p, i) => `<p data-p="${i}">${renderText(p)}</p>`).join("") || `<p>${esc(t("no_explain"))}</p>`}
      <div class="learner" ${view === "tr" ? "" : "hidden"}><h3>${esc(langName(lang))}</h3>${l.trParas.map(p => `<p>${renderText(p)}</p>`).join("")}</div></div>
    <div class="player">
      <div class="prog"><i style="width:0%"></i></div>
      <div class="row">
        ${opts.embedded ? `<button class="iconbtn" data-act="nav" data-d="-1" aria-label="${esc(t("previous"))}">${I.prev}</button>` : `<a class="iconbtn" href="#/explain/${ep}/${d.lines[Math.max(0, idx - 1)].id}" aria-label="${esc(t("previous"))}">${I.prev}</a>`}
        <div class="grow times"><span class="now">0:00</span><span class="where"></span></div>
        <button class="play" data-act="play" aria-label="${esc(t("play"))}">${I.play}</button>
        ${opts.embedded ? `<button class="iconbtn" data-act="nav" data-d="1" aria-label="${esc(t("next"))}">${I.next}</button>` : `<a class="iconbtn" href="#/explain/${ep}/${d.lines[Math.min(d.lines.length - 1, idx + 1)].id}" aria-label="${esc(t("next"))}">${I.next}</a>`}
      </div>
    </div>
  </section>`;

  const ps = [...app.querySelectorAll(".paras p[data-p]")];
  const bar = app.querySelector(".prog i"), now = app.querySelector(".now"), where = app.querySelector(".where");
  const playBtn = app.querySelector("[data-act=play]");
  const items = [
    ...(l.lineAudio ? [{ src: paths.audio(ep, l.lineAudio), p: -1 }] : []),
    ...l.krAudio.map((f, p) => ({ src: paths.audio(ep, f), p })),
  ];
  const sync = () => { playBtn.innerHTML = seq.playing ? I.pause : I.play; };
  seq.onstep = it => {
    ps.forEach((el, i) => el.classList.toggle("cur", i === it.p));
    ps[it.p]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    where.textContent = it.p < 0 ? t("line_audio") : `${t("explain")} ${it.p + 1} / ${l.krAudio.length}`;
    sync();
  };
  seq.ondone = () => { ps.forEach(el => el.classList.remove("cur")); sync(); };
  seq.a.addEventListener("timeupdate", () => {
    const a = seq.a;
    if (a.duration) bar.style.width = (100 * a.currentTime) / a.duration + "%";
    now.textContent = `${Math.floor(a.currentTime / 60)}:${String(Math.floor(a.currentTime % 60)).padStart(2, "0")}`;
  });

  app.querySelector(".scr").onclick = e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "close") return opts.onClose?.();
    if (b.dataset.act === "nav") return opts.onNav?.(idx + +b.dataset.d);
    if (b.dataset.act === "play") { if (seq.playing) seq.pause(); else if (seq.q.length) seq.resume(); else seq.play(items); sync(); }
    if (b.dataset.act === "rom") { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); app.querySelector(".scr").classList.toggle("hide-rom", !on); pref("malmun.rom", on ? "1" : "0"); }
    if (b.dataset.act === "tr") { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); app.querySelector(".learner").hidden = !on; }
  };
  return () => seq.stop();
}
