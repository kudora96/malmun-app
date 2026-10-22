import { t } from "../i18n.js?v=1022.27";
import { esc } from "../text.js?v=1022.27";
import { langChip, openLangSheet, uiKoBtn, spkHtml } from "../ui.js?v=1022.27";
import { rerender } from "../main.js?v=1022.27";
import { needBirth, askBirth } from "../birth.js?v=1022.27";

const KEY = "malmun.started";
const started = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export default function welcome(app) {
  // 두 번째부터는 바로 편 목록
  // 다시 열면 = 마지막 편·줄에서 멈춘 채 이어 보기(검사부 여정 10-20 · 새 단추 없이 동작으로) · 기록 없으면 편 목록
  if (started() && !location.hash.includes("hello")) { let last = null; try { last = JSON.parse(localStorage.getItem("malmun.last") || "null"); } catch {} location.replace(last?.ep && /^[A-Za-z0-9-]+$/.test(last.ep) ? `#/learn/${last.ep}/${encodeURIComponent(last.id)}` : "#/list"); return; }
  app.innerHTML = `<section class="scr welcome">
    <div class="top">${uiKoBtn()}${langChip()}</div>
    <div class="board"><img src="img/L01-00-01.jpg" alt=""></div>
    <div class="hello">
      <span class="big ko" lang="ko">안녕하세요!</span>
      <span class="tr">${esc(t("hello"))}</span>
      <span class="say">${esc(t("welcome_say"))}</span>
    </div>
    <a class="cta" href="#/list">${esc(t("start"))}</a>
    <div class="ledge"></div>
  </section>`;
  app.querySelector("[data-act=lang]").onclick = () => { tipOff(); openLangSheet(rerender); };
  // 처음 한 번 = 오른쪽 위 언어 단추를 가리키는 선생님 풍선말(본부 10-20 대표님 「처음 들어가서 언어를 직접 고르고 싶어」 · 화면 틀 그대로 · 누르거나 언어 단추를 누르면 다시 안 뜸)
  const TIP = "malmun.langtip", lb = app.querySelector("[data-act=lang]"); let tip = null;
  const tipOff = () => { try { localStorage.setItem(TIP, "1"); } catch {} tip?.remove(); tip = null; lb.classList.remove("tiphi"); };
  try { if (!localStorage.getItem(TIP) && !started()) { const r = lb.getBoundingClientRect(); tip = document.createElement("div"); tip.className = "langtip"; tip.setAttribute("role", "status"); tip.innerHTML = `<b>${spkHtml("선생님")}</b><span dir="auto">🌐 ${esc(t("lang_hint"))}</span>`; tip.style.top = (r.bottom + window.scrollY + 10) + "px"; app.querySelector(".scr.welcome").append(tip); lb.classList.add("tiphi"); tip.onclick = tipOff; } } catch {}
  // ⇄ 는 retext 가 그 자리에서 글만 바꿈(다시 그리지 않음 · 본부 10-15)
  // 처음 [시작하기] = 그 위 선생님 풍선말로 태어난 해 + 사는 나라(대표님 10-20 · 틀 0px · birth.js) → 확인 뒤 편 목록
  const cta = app.querySelector(".cta");
  cta.onclick = e => {
    if (needBirth()) { e.preventDefault(); tipOff(); askBirth(app.querySelector(".scr.welcome"), cta, () => { try { localStorage.setItem(KEY, "1"); } catch {} location.hash = "#/list"; }); return; }
    try { localStorage.setItem(KEY, "1"); } catch {}
  };
}
