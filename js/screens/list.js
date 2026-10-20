import { t, lang, uiKoOn, epTitles } from "../i18n.js?v=1020.3";
import { esc } from "../text.js?v=1020.3";
import { catalog } from "../data.js?v=1020.3";
import { langChip, openLangSheet, progress, uiKoBtn } from "../ui.js?v=1020.3";
import { rerender } from "../main.js?v=1020.3";
import { VERSION } from "../version.js?v=1020.3";
import { recCount, recDelEpisode } from "../recstore.js?v=1020.3";

const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// 제목 = 학습자 말 ⇄ 한국어(다국어부 10-20) — 보이는 글(.cur) + 보이지 않는 두 겹(한국어·학습자 말)이 같은 칸에 겹쳐 칸 크기 = 둘 중 큰 쪽 → ⇄ 때 0px
//  번역이 없으면(언어부 전) 한국어 한 겹 그대로 · ⇄ 는 malmun:uilang 에서 .cur 글만 바꿈
const koRuns = s => esc(s).replace(/[ᄀ-ᇿ㄰-㆏가-힣]+/g, m => `<span class="ko" lang="ko">${m}</span>`); // 학습자 말 제목 속 배우는 한글 조각(ㄱ→ㄲ · ㅏㅗ)은 한국어로 표시
const ttl = (id, ko, tt) => { const tr = tt[id]; if (!tr) return `<span class="ko" lang="ko">${esc(ko)}</span>`; const k = uiKoOn(); return `<span class="ept" data-ko="${esc(ko)}" data-tr="${esc(tr)}"><span class="cur" lang="${k ? "ko" : lang}">${k ? esc(ko) : koRuns(tr)}</span><span class="gh" aria-hidden="true" lang="ko">${esc(ko)}</span><span class="gh" aria-hidden="true" lang="${lang}">${koRuns(tr)}</span></span>`; };
const reTitles = () => { const k = uiKoOn(); for (const e of document.querySelectorAll(".list .ept")) { const c = e.querySelector(".cur"); c.innerHTML = k ? esc(e.dataset.ko) : koRuns(e.dataset.tr); c.lang = k ? "ko" : lang; } };
if (!window.__eptWired) { window.__eptWired = true; addEventListener("malmun:uilang", reTitles); }

export default async function list(app, unit = "L01-00") {
  const [cat, tt] = await Promise.all([catalog(), epTitles()]);
  const eps = cat.episodes.filter(e => e.id.startsWith(unit));
  const first = eps.find(e => e.ready);
  const p = first ? progress.get(first.id) : {};
  const seen = Math.min(p.line || 0, first?.lines || 0);
  app.innerHTML = `<section class="scr list">
    <div class="bar"><div class="grow"><div class="t ko" lang="ko">${esc(cat.units[unit] || unit)}</div>
      <div class="sub">${esc(unit)} · <span>${esc(t("n_episodes", { n: eps.length }))}</span></div></div><span class="hbt">${uiKoBtn()}${langChip()}</span></div>
    ${first ? `<a class="hero" href="#/learn/${first.id}"><img src="img/${first.id}.jpg" alt="">
      <div><div class="ttl">${esc(first.id.slice(-2))} ${ttl(first.id, first.title, tt)}</div>
      <div class="meta">${mmss(first.duration)} · <span>${esc(t("n_lines", { n: first.lines }))}</span>${seen ? ` · <span>${esc(t("seen_to", { n: seen }))}</span>` : ""}</div><!-- {n} 칸 글은 따로 감쌈 — ⇄ 때 그 자리에서 바뀌게(다국어부 10-15) -->
      <div class="prog"><i style="width:${first.lines ? (100 * seen) / first.lines : 0}%"></i></div></div></a>` : ""}
    <ol class="eps">${eps.filter(e => e !== first).map(e => {
      const inner = `<span class="n">${esc(e.id.slice(-2))}</span>${ttl(e.id, e.title, tt)}<span class="st">${e.ready ? "" : esc(t("soon"))}</span>`;
      return `<li>${e.ready ? `<a href="#/learn/${e.id}">${inner}</a>` : `<div class="soon">${inner}</div>`}</li>`;
    }).join("")}</ol>
    ${first ? `<p class="delall"><button data-ep="${esc(first.id)}" hidden>🗑 ${esc(t("del_all"))}</button></p>` : ""}
    <p class="ver">v${esc(VERSION)}</p>
  </section>`;
  app.querySelector("[data-act=lang]").onclick = () => openLangSheet(rerender);
  // 「ने⇄한」 누르기는 ui.js 문서 한 곳이 받음(앱 전체 같이) · {n} 칸 글도 retext 가 그 자리에서 바꿈 → 다시 그리지 않음(스크롤·열린 언어 창 그대로 · 본부 10-15 「⇄ = 상태 그대로 글만」)
  // 이 편 녹음 모두 지우기(녹음이 있을 때만 보임 · 한 번 묻고 · 진단 녹음도 같이)
  const da = app.querySelector(".delall button");
  if (da) {
    recCount(da.dataset.ep).then(n => { da.hidden = !n; });
    da.onclick = async () => { if (!confirm(t("del_all_q"))) return; await recDelEpisode(da.dataset.ep); da.hidden = true; da.parentElement.append(Object.assign(document.createElement("span"), { textContent: " " + t("deleted") })); };
  }
}
