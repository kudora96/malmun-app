import { VERSION } from "./version.js?v=1016.68";
import { LANG_INFO } from "./langs.js?v=1016.68";
// 학습자 언어 — 고르게 하지 않는다(CLAUDE.md).
// ① 저장된 선택 ② 폰 언어가 22개 중 하나 ③ 폰 시간대로 나라 짐작 ④ 영어
export const LANGS = [
  ["ne", "नेपाली"], ["bn", "বাংলা"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["th", "ไทย"],
  ["mn", "Монгол"], ["ur", "اردو"], ["si", "සිංහල"], ["tl", "Filipino"], ["uz", "Oʻzbekcha"],
  /* ky 보류(원어민 확인 뒤 · 언어부 10-11) */ ["km", "ខ្មែរ"], ["lo", "ລາວ"], ["my", "မြန်မာ"], ["zh", "中文"],
  ["ja", "日本語"], ["ru", "Русский"], ["hi", "हिन्दी"], ["en", "English"], ["es", "Español"], ["fr", "Français"], ["pt", "Português"],
];
const CODES = LANGS.map(l => l[0]);
// 준비된 언어(앱 글 lang/{c}.json 이 있는 것 · 언어부 10-11 S1 ①) — 자동 선택·저장값은 이것만 · 나머지는 ?lang= 으로만(시범)
const DEV_HOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
// 언어마다 다른 값(단계·방향·글꼴·줄 높이)은 js/langs.js 한 곳 — tools/sync_lang.py 가 언어부 프로필에서 씀(다국어부 10-12 · 언어를 더할 때 이 파일은 안 고침)
// stage: ready = 공개 · pilot = 개발 주소(localhost·127.0.0.1)에서만(시범 언어 · 공개 판은 본부 신호 전까지 「곧」)
const stageOf = c => LANG_INFO[c]?.stage;
export const READY = CODES.filter(c => stageOf(c) === "ready" || (DEV_HOST && stageOf(c) === "pilot"));
const RTL = new Set(CODES.filter(c => LANG_INFO[c]?.dir === "rtl"));
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
  if (READY.includes(saved)) return { lang: saved, how: "saved" };
  for (const tag of navigator.languages || [navigator.language || "en"]) {
    let c = String(tag).toLowerCase().split("-")[0];
    c = ALIAS[c] || c;
    if (READY.includes(c) && c !== "en") return { lang: c, how: "phone" };
  }
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  if (READY.includes(TZ[tz])) return { lang: TZ[tz], how: "timezone" };
  return { lang: "en", how: "default" };
}

let strings = {}, fallback = {}, koUi = {};
// 「ने ⇄ 한」 앱 글 한국어 토글(본부 10-08 투덜이) — 켜면 앱 글(lang/*.json)만 {lang}.ko.json(학습자 말 글을 한국어로 옮긴 것)으로 · 배우는 내용(대사·뜻·설명·자막)은 그대로 · 기억 malmun.uiko
export const KO_UI = CODES.filter(c => LANG_INFO[c]?.ko_ui); // {lang}.ko.json 이 있는 언어(js/langs.js)
const UIKO = "malmun.uiko";
export const uiKoOn = () => { try { return KO_UI.includes(lang) && localStorage.getItem(UIKO) === "1"; } catch { return false; } };
// {lang}.ko.json 은 언어마다 한 번만 받아 기억(앱개발부 10-13 안 A — 토글 「즉시」) · 받아 둔 뒤엔 setUiKo 가 기다림 없이 koUi 를 바꿈(await 앞에서)
const koGot = {}, koWait = {};
export function preloadKoUi(c = lang) {
  if (!KO_UI.includes(c)) { koGot[c] ||= {}; return Promise.resolve({}); } // ⇄ 없는 언어도 「받음」으로 표시(기다리는 쪽이 끝없이 다시 부르지 않게)
  return (koWait[c] ||= fetch(`lang/${c}.ko.json?v=${VERSION}`).then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => (koGot[c] = j)));
}
async function loadKoUi() {
  document.documentElement.classList.toggle("uiko", uiKoOn()); // 한국어 앱 글 = 문단마다 제 방향(css 다국어부 · ur 처럼 오른쪽→왼쪽 언어에서 한국어 문장 부호가 뒤집히지 않게)
  if (!uiKoOn()) { koUi = {}; return; }
  const c = lang;
  if (koGot[c]) { koUi = koGot[c]; return; }
  const j = await preloadKoUi(c);
  if (lang === c && uiKoOn()) koUi = j; // 기다리는 새 언어·토글이 바뀌었으면 옛 결과 버림
}
export async function setUiKo(on) { try { localStorage.setItem(UIKO, on ? "1" : "0"); } catch {} await loadKoUi(); }
// 지금 쓸 수 있는 화면 글 열쇠 전부(앱개발부 retext — 바꾸기 전·뒤 t(k) 견줘 그 자리에서 글 바꾸기)
export const uiKeys = () => Object.keys({ ...fallback, ...strings, ...koUi });
export let lang = "en";

export async function setLang(code, remember = false) {
  lang = code;
  if (remember) store(false, code);
  const load = c => fetch(`lang/${c}.json?v=${VERSION}`).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  // 빠진 열쇠는 영어가 아니라 한국어로(대표님 10-19 원칙 「화면 글은 한국어 ⇄ 학습자 언어뿐 · 영어 섞임 금지」) — en 학습자만 en 이 자기 말
  [fallback, strings] = await Promise.all([load(code === "en" ? "en" : "ko"), code === "en" ? Promise.resolve({}) : load(code)]);
  await loadKoUi(); preloadKoUi(code); // 한국어 토글 글은 미리 받아 둠(누르면 바로 · 기다리지 않음)
  document.documentElement.lang = code;
  const info = LANG_INFO[code] || {}; /* 그 언어일 때만 글꼴 링크 · 줄 높이는 --lang-lh(css 다국어부 구역) */
  if (info.font && !document.querySelector(`link[data-font="${code}"]`)) { const k = Object.assign(document.createElement("link"), { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?family=${info.font.replace(/ /g, "+")}:wght@400;700&display=swap` }); k.dataset.font = code; document.head.append(k); }
  document.documentElement.style.setProperty("--lang-lh", info.lh || "");
  document.documentElement.dir = RTL.has(code) && Object.keys(strings).length ? "rtl" : "ltr"; // 그 언어 글이 실제로 실렸을 때만 오른쪽→왼쪽(언어부 10-11 — 영어 글인데 뒤집히던 것)
  window.dispatchEvent(new CustomEvent("malmun:langset")); // 언어를 바꿈(지구 단추) — langfit 이 단추 폭을 다시 잼
}

export const t = (k, vars) => {
  if (vars && typeof vars.n === "number") { try { const c = new Intl.PluralRules(koUi[k] != null ? "ko" : lang).select(vars.n), kk = `${k}_${c}`; if (koUi[kk] ?? strings[kk] ?? fallback[kk]) k = kk; } catch {} } /* 복수형 — {n} 이 있으면 열쇠_one/_few/_many/_other 가 있을 때 그것(언어부 A5) */
  let s = koUi[k] ?? strings[k] ?? fallback[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};
// ⇄ 반대쪽 글(지금 모국어면 한국어판 · 한국어면 모국어) — 단추 폭을 두 말 중 긴 쪽으로 고정할 때(js/langfit.js · 다국어부 10-15)
export const tAlt = k => { const ko = koGot[lang]; if (!ko) return null; return uiKoOn() ? (strings[k] ?? fallback[k] ?? null) : (ko[k] ?? strings[k] ?? fallback[k] ?? null); };
export const koReady = c => !!koGot[c || lang];
// 모국어 글(한국어 토글과 상관없이) — 한국어로 바꾼 직후 「돌아오는 길」 안내처럼 학습자가 꼭 읽어야 하는 글(본부 10-14 ④)
export const tL = (k, vars) => { let s = strings[k] ?? fallback[k] ?? k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b); return s; };
export const langName = c => (LANGS.find(l => l[0] === c) || [c, c])[1];
// 「내 말 ⇄ 한」 토글용 짧은 이름(본부 10-12) — 언어부 프로필 ui_short → js/langs.js short · 없으면 로마자 두 글자 코드(이름 앞 글자 자르기는 「ไท」처럼 뜻이 엉뚱해짐)
export const langShort = c => LANG_INFO[c]?.short || (c === "ne" ? "ने" : c.toUpperCase());
