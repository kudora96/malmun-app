import "./agepolicy.js?v=1119.60"; // 기능별 나이(대표님 10-19) — 받아쓰기 막기는 다른 것보다 먼저
import "./tick.js?v=1119.60"; // 누르는 「톡」 소리(Web Audio 합성 · 학습 소리 안 끊음)
import { initAppTip } from "./apptip.js?v=1119.60"; initAppTip(); // 공용 도움말(title → 위쪽 작은 상자)
import { detectLang, setLang, LANGS, t } from "./i18n.js?v=1119.60";
import { VERSION } from "./version.js?v=1119.60";
import { bgmScene } from "./bgm.js?v=1119.60";
import welcome from "./screens/welcome.js?v=1119.60";
import list from "./screens/list.js?v=1119.60";
import learn from "./screens/learn.js?v=1119.60";
import write from "./screens/write.js?v=1119.60";
import speak from "./screens/speak.js?v=1119.60";
import diag from "./screens/diag.js?v=1119.60";
import "./errlog.js?v=1119.60"; // 오류 기록(진단 화면용 · 기록만)
import { devgoPrep, devgoRun } from "./devgo.js?v=1119.60"; // 대표님 확인용 바로가기 ?go=(로컬판에서만 · 본부 10-23)

const app = document.getElementById("app");
const explain = (app, ep, id) => learn(app, ep, id, { explain: true }); /* #/explain/{편}/{줄} = 학습 화면 + 그 줄 새(v9) 설명 창(10-12 · 옛 explain.js 화면 대신 · 책 QR 주소 그대로) */
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
  try { window.scrollTo(0, 0); } catch {} // 화면을 바꾸면 맨 위부터(다국어부 10-20 — 말하기 창 연 채 #/diag 로 가면 108px 내려간 채 열림)
  document.getElementById("sheet-root").innerHTML = "";
  const screen = routes[name] || welcome;
  bgmScene(routes[name] ? name : ""); // 배경음악 = 첫 화면·편 목록만(본부 10-15)
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

// 새 판 알림 — 열어 둔 탭이 옛 코드를 계속 쓰지 않게(본부 10-04 · 11-18 12:53 대표님 「ㅇ 고쳐」) · 처음 켤 때·화면이 보일 때·창 포커스·1분마다 version.json 확인 · 새 판마다(같은 판은 한 번) 큰 단추 · 자동 새로고침 없음(학습 중 화면이 바뀌면 안 됨)
let shownV = "", checking = false;
async function checkNew() {
  if (document.hidden || checking) return; /* 화면 숨김 동안엔 쉼 — 다시 보이면 visibilitychange·focus 가 바로 확인 */
  checking = true;
  try {
    const v = (await (await fetch("version.json?t=" + Date.now(), { cache: "no-store" })).json()).v;
    if (v && v !== VERSION && v !== shownV) {
      shownV = v;
      document.querySelectorAll(".newver").forEach(e => e.remove());
      const b = document.createElement("button");
      b.className = "newver"; b.dataset.v = v; b.textContent = "↻ " + t("new_version");
      b.onclick = () => location.reload();
      document.body.append(b);
    }
  } catch {} finally { checking = false; }
}
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkNew());
window.addEventListener("focus", checkNew);
setInterval(checkNew, 60 * 1000);
checkNew();
try { history.scrollRestoration = "manual"; } catch {} // 창을 닫을 때 걷어 내는 뒤로 가기 칸이 화면 위치를 되돌리지 않게(지금 줄은 앱이 맞춤)
document.documentElement.dataset.v = VERSION;
console.info("말문 판", VERSION);

(async () => {
  // ?lang=ne 처럼 주소로 학습자 언어를 정할 수 있다(미리보기 · 기억됨) — 아니면 자동(CLAUDE.md 언어 자동)
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS.some(l => l[0] === q)) await setLang(q, true); else await setLang(detectLang().lang);
  await devgoPrep();
  window.addEventListener("hashchange", route);
  route().then(devgoRun);
})();
