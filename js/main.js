import { detectLang, setLang, LANGS, t } from "./i18n.js?v=1007.96";
import { VERSION } from "./version.js?v=1007.96";
import welcome from "./screens/welcome.js?v=1007.96";
import list from "./screens/list.js?v=1007.96";
import learn from "./screens/learn.js?v=1007.96";
import explain from "./screens/explain.js?v=1007.96";
import write from "./screens/write.js?v=1007.96";
import speak from "./screens/speak.js?v=1007.96";
import diag from "./screens/diag.js?v=1007.96";
import "./errlog.js?v=1007.96"; // 오류 기록(진단 화면용 · 기록만)

const app = document.getElementById("app");
const routes = { "": welcome, list, learn, explain, write, speak, diag }; // diag = 진단 화면(본부 10-07 폰)
let cleanup = null;

// 주소에서 편 ID·줄 번호 다듬기 — 복사할 때 뒤에 붙은 「 (설명」·따옴표·괄호를 잘라 낸다(본부 10-04: 「L01-00-01 (」로 읽혀 오류)
const EP_ROUTES = new Set(["learn", "explain", "write", "speak"]);
const dec = x => { try { return decodeURIComponent(x); } catch { return x; } };
const cleanId = x => dec(x).split(/[\s()"'「」『』\[\]<>]/)[0].replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
const toast = msg => { const d = Object.assign(document.createElement("div"), { className: "toast", textContent: msg }); document.body.append(d); setTimeout(() => d.remove(), 3500); };

async function route() {
  let [name = "", ...args] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  name = dec(name).replace(/[^a-z]/gi, "").toLowerCase();
  if (EP_ROUTES.has(name) && args.length) {
    const clean = [cleanId(args[0]), ...args.slice(1).map(x => dec(x).split(/[^A-Za-z0-9]/)[0]).filter(Boolean)];
    if (clean.join("/") !== args.map(dec).join("/")) { history.replaceState(null, "", "#/" + [name, ...clean].join("/")); args = clean; } // 주소창도 깨끗하게
    else args = clean;
  } else args = args.map(dec);
  cleanup?.(); cleanup = null;
  document.getElementById("sheet-root").innerHTML = "";
  const screen = routes[name] || welcome;
  try {
    cleanup = (await screen(app, ...args)) || null;
  } catch (e) {
    console.error(e);
    if (EP_ROUTES.has(name)) { toast(t("ep_missing")); location.hash = "#/list"; return; } // 없는 편 → 오류 글 대신 목록으로
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
try { history.scrollRestoration = "manual"; } catch {} // 창을 닫을 때 걷어 내는 뒤로 가기 칸이 화면 위치를 되돌리지 않게(지금 줄은 앱이 맞춤)
document.documentElement.dataset.v = VERSION;
console.info("말문 판", VERSION);

(async () => {
  // ?lang=ne 처럼 주소로 학습자 언어를 정할 수 있다(미리보기 · 기억됨) — 아니면 자동(CLAUDE.md 언어 자동)
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS.some(l => l[0] === q)) await setLang(q, true); else await setLang(detectLang().lang);
  window.addEventListener("hashchange", route);
  route();
})();
