import { t } from "../i18n.js?v=1006.9";
import { esc } from "../text.js?v=1006.9";
import { catalog } from "../data.js?v=1006.9";
import { langChip, openLangSheet, progress } from "../ui.js?v=1006.9";
import { rerender } from "../main.js?v=1006.9";
import { VERSION } from "../version.js?v=1006.9";
import { recCount, recDelEpisode } from "../recstore.js?v=1006.9";

const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default async function list(app, unit = "L01-00") {
  const cat = await catalog();
  const eps = cat.episodes.filter(e => e.id.startsWith(unit));
  const first = eps.find(e => e.ready);
  const p = first ? progress.get(first.id) : {};
  const seen = Math.min(p.line || 0, first?.lines || 0);
  app.innerHTML = `<section class="scr list">
    <div class="bar"><div class="grow"><div class="t ko" lang="ko">${esc(cat.units[unit] || unit)}</div>
      <div class="sub">${esc(unit)} · ${esc(t("n_episodes", { n: eps.length }))}</div></div>${langChip()}</div>
    ${first ? `<a class="hero" href="#/learn/${first.id}"><img src="img/${first.id}.jpg" alt="">
      <div><div class="ttl ko" lang="ko">${esc(first.id.slice(-2))} ${esc(first.title)}</div>
      <div class="meta">${mmss(first.duration)} · ${esc(t("n_lines", { n: first.lines }))}${seen ? " · " + esc(t("seen_to", { n: seen })) : ""}</div>
      <div class="prog"><i style="width:${first.lines ? (100 * seen) / first.lines : 0}%"></i></div></div></a>` : ""}
    <ol class="eps">${eps.filter(e => e !== first).map(e => {
      const inner = `<span class="n">${esc(e.id.slice(-2))}</span><span class="ko" lang="ko">${esc(e.title)}</span><span class="st">${e.ready ? "" : esc(t("soon"))}</span>`;
      return `<li>${e.ready ? `<a href="#/learn/${e.id}">${inner}</a>` : `<div class="soon">${inner}</div>`}</li>`;
    }).join("")}</ol>
    ${first ? `<p class="delall"><button data-ep="${esc(first.id)}" hidden>🗑 ${esc(t("del_all"))}</button></p>` : ""}
    <p class="ver">v${esc(VERSION)}</p>
  </section>`;
  app.querySelector("[data-act=lang]").onclick = () => openLangSheet(rerender);
  // 이 편 녹음 모두 지우기(녹음이 있을 때만 보임 · 한 번 묻고 · 진단 녹음도 같이)
  const da = app.querySelector(".delall button");
  if (da) {
    recCount(da.dataset.ep).then(n => { da.hidden = !n; });
    da.onclick = async () => { if (!confirm(t("del_all_q"))) return; await recDelEpisode(da.dataset.ep); da.hidden = true; da.parentElement.append(Object.assign(document.createElement("span"), { textContent: " " + t("deleted") })); };
  }
}
