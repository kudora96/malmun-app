import { VERSION } from "./version.js?v=1007.92";
// 학습자 언어 — 고르게 하지 않는다(CLAUDE.md).
// ① 저장된 선택 ② 폰 언어가 22개 중 하나 ③ 폰 시간대로 나라 짐작 ④ 영어
export const LANGS = [
  ["ne", "नेपाली"], ["bn", "বাংলা"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["th", "ไทย"],
  ["mn", "Монгол"], ["ur", "اردو"], ["si", "සිංහල"], ["tl", "Tagalog"], ["uz", "Oʻzbekcha"],
  ["ky", "Кыргызча"], ["km", "ខ្មែរ"], ["lo", "ລາວ"], ["my", "မြန်မာ"], ["zh", "中文"],
  ["ja", "日本語"], ["ru", "Русский"], ["hi", "हिन्दी"], ["en", "English"], ["es", "Español"], ["fr", "Français"], ["pt", "Português"],
];
const CODES = LANGS.map(l => l[0]);
const RTL = new Set(["ur"]);
// 폰 언어 코드가 우리 코드와 다른 것
const ALIAS = { fil: "tl", nb: "en" };
const TZ = {
  "Asia/Kathmandu": "ne", "Asia/Katmandu": "ne", "Asia/Dhaka": "bn", "Asia/Dacca": "bn",
  "Asia/Ho_Chi_Minh": "vi", "Asia/Saigon": "vi", "Asia/Jakarta": "id", "Asia/Makassar": "id",
  "Asia/Jayapura": "id", "Asia/Pontianak": "id", "Asia/Bangkok": "th", "Asia/Ulaanbaatar": "mn",
  "Asia/Ulan_Bator": "mn", "Asia/Hovd": "mn", "Asia/Choibalsan": "mn", "Asia/Karachi": "ur",
  "Asia/Colombo": "si", "Asia/Manila": "tl", "Asia/Tashkent": "uz", "Asia/Samarkand": "uz",
  "Asia/Bishkek": "ky", "Asia/Phnom_Penh": "km", "Asia/Vientiane": "lo", "Asia/Yangon": "my",
  "Asia/Rangoon": "my", "Asia/Shanghai": "zh", "Asia/Urumqi": "zh", "Asia/Tokyo": "ja",
  // 10-02 러시아어·힌디어 추가(카자흐스탄은 러시아어로 · 키르기스스탄은 시간대로는 ky, 폰이 러시아어면 ru)
  "Asia/Kolkata": "hi", "Asia/Calcutta": "hi",
  "Europe/Moscow": "ru", "Europe/Kaliningrad": "ru", "Europe/Samara": "ru", "Europe/Volgograd": "ru", "Asia/Yekaterinburg": "ru", "Asia/Omsk": "ru",
  "Asia/Novosibirsk": "ru", "Asia/Krasnoyarsk": "ru", "Asia/Irkutsk": "ru", "Asia/Yakutsk": "ru", "Asia/Vladivostok": "ru", "Asia/Sakhalin": "ru",
  "Asia/Magadan": "ru", "Asia/Kamchatka": "ru", "Asia/Almaty": "ru", "Asia/Qyzylorda": "ru", "Asia/Aqtobe": "ru", "Asia/Aqtau": "ru", "Asia/Atyrau": "ru", "Asia/Oral": "ru", "Asia/Qostanay": "ru",
};
const KEY = "malmun.lang";

function store(get, v) {
  try { return get ? localStorage.getItem(KEY) : localStorage.setItem(KEY, v); } catch { return null; }
}

export function detectLang() {
  const saved = store(true);
  if (CODES.includes(saved)) return { lang: saved, how: "saved" };
  for (const tag of navigator.languages || [navigator.language || "en"]) {
    let c = String(tag).toLowerCase().split("-")[0];
    c = ALIAS[c] || c;
    if (CODES.includes(c) && c !== "en") return { lang: c, how: "phone" };
  }
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  if (TZ[tz]) return { lang: TZ[tz], how: "timezone" };
  return { lang: "en", how: "default" };
}

let strings = {}, fallback = {};
export let lang = "en";

export async function setLang(code, remember = false) {
  lang = code;
  if (remember) store(false, code);
  const load = c => fetch(`lang/${c}.json?v=${VERSION}`).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  [fallback, strings] = await Promise.all([load("en"), code === "en" ? Promise.resolve({}) : load(code)]);
  document.documentElement.lang = code;
  document.documentElement.dir = RTL.has(code) ? "rtl" : "ltr";
}

export const t = (k, vars) => {
  let s = strings[k] ?? fallback[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};
export const langName = c => (LANGS.find(l => l[0] === c) || [c, c])[1];
