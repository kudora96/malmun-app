import { t } from "../i18n.js?v=1007.84";
import { esc } from "../text.js?v=1007.84";
import { langChip, openLangSheet } from "../ui.js?v=1007.84";
import { rerender } from "../main.js?v=1007.84";

const KEY = "malmun.started";
const started = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export default function welcome(app) {
  // 두 번째부터는 바로 편 목록
  if (started() && !location.hash.includes("hello")) { location.replace("#/list"); return; }
  app.innerHTML = `<section class="scr welcome">
    <div class="top">${langChip()}</div>
    <div class="board"><img src="img/L01-00-01.jpg" alt=""></div>
    <div class="hello">
      <span class="big ko" lang="ko">안녕하세요!</span>
      <span class="tr">${esc(t("hello"))}</span>
      <span class="say">${esc(t("welcome_say"))}</span>
    </div>
    <a class="cta" href="#/list">${esc(t("start"))}</a>
    <div class="ledge"></div>
  </section>`;
  app.querySelector("[data-act=lang]").onclick = () => openLangSheet(rerender);
  app.querySelector(".cta").onclick = () => { try { localStorage.setItem(KEY, "1"); } catch {} };
}
