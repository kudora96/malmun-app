import { detectLang, setLang } from "./i18n.js";
import welcome from "./screens/welcome.js";
import list from "./screens/list.js";
import learn from "./screens/learn.js";
import explain from "./screens/explain.js";
import write from "./screens/write.js";
import speak from "./screens/speak.js";

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

(async () => {
  await setLang(detectLang().lang);
  window.addEventListener("hashchange", route);
  route();
})();
