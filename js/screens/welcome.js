import { t } from "../i18n.js?v=1015.3";
import { esc } from "../text.js?v=1015.3";
import { langChip, openLangSheet, uiKoBtn, bgmBtn } from "../ui.js?v=1015.3";
import { rerender } from "../main.js?v=1015.3";

const KEY = "malmun.started";
const started = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export default function welcome(app) {
  // 두 번째부터는 바로 편 목록
  if (started() && !location.hash.includes("hello")) { location.replace("#/list"); return; }
  app.innerHTML = `<section class="scr welcome">
    <div class="top">${bgmBtn()}${uiKoBtn()}${langChip()}</div>
    <div class="board"><img src="img/L01-00-01.jpg" alt=""></div>
    <div class="hello">
      <span class="big ko" lang="ko">안녕하세요!</span>
      ${t("hello").replace(/[!！\s]/g, "") !== "안녕하세요" ? `<span class="tr">${esc(t("hello"))}</span>` : ""}<!-- 한국어로 바꾸면 큰 인사와 같은 말이라 뺌 -->
      <span class="say">${esc(t("welcome_say"))}</span>
    </div>
    <a class="cta" href="#/list">${esc(t("start"))}</a>
    <div class="ledge"></div>
  </section>`;
  app.querySelector("[data-act=lang]").onclick = () => openLangSheet(rerender);
  const onUi = () => { if (!app.querySelector(".scr.welcome")) return window.removeEventListener("malmun:uilang", onUi); rerender(); }; // 「ने⇄한」 뒤 다시 그림(ui.js 가 받음 · 본부 10-14)
  window.addEventListener("malmun:uilang", onUi);
  app.querySelector(".cta").onclick = () => { try { localStorage.setItem(KEY, "1"); } catch {} };
}
