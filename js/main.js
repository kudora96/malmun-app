import { detectLang, setLang, LANGS, t } from "./i18n.js?v=1004.2";
import { VERSION } from "./version.js?v=1004.2";
import welcome from "./screens/welcome.js?v=1004.2";
import list from "./screens/list.js?v=1004.2";
import learn from "./screens/learn.js?v=1004.2";
import explain from "./screens/explain.js?v=1004.2";
import write from "./screens/write.js?v=1004.2";
import speak from "./screens/speak.js?v=1004.2";

const app = document.getElementById("app");
const routes = { "": welcome, list, learn, explain, write, speak };
let cleanup = null;

async function route() {
  const [name = "", ...args] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  cleanup?.(); cleanup = null;
  document.getElementById("sheet-root").innerHTML = "";
  const screen = routes[name] || welcome;
  try {
    cleanup = (await screen(app, ...args.map(decodeURIComponent))) || null;
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty">${String(e.message || e)}</div>`;
  }
  window.scrollTo(0, 0);
}

export const go = hash => { location.hash = hash; };
export const rerender = route;

// 새 판 알림 — 열어 둔 탭이 옛 코드를 계속 쓰지 않게(본부 10-04) · 화면이 다시 보일 때와 10분마다 version.json 을 본다
let newShown = false;
async function checkNew() {
  if (newShown) return;
  try {
    const v = (await (await fetch("version.json?t=" + Date.now(), { cache: "no-store" })).json()).v;
    if (v && v !== VERSION) {
      newShown = true;
      const b = document.createElement("button");
      b.className = "newver"; b.textContent = "↻ " + t("new_version");
      b.onclick = () => location.reload();
      document.body.append(b);
    }
  } catch {}
}
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkNew());
setInterval(checkNew, 10 * 60 * 1000);
document.documentElement.dataset.v = VERSION;
console.info("말문 판", VERSION);

(async () => {
  // ?lang=ne 처럼 주소로 학습자 언어를 정할 수 있다(미리보기 · 기억됨) — 아니면 자동(CLAUDE.md 언어 자동)
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS.some(l => l[0] === q)) await setLang(q, true); else await setLang(detectLang().lang);
  window.addEventListener("hashchange", route);
  route();
})();
