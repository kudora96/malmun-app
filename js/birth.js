// 첫 실행 「태어난 해 + 사는 나라」(age_policy.md 5·6-4장 · 대표님 10-20 「풍선말 · 화면 틀 0px」) — 처음 [시작하기]를 누르면 그 위에 선생님 풍선말
//  태어난 해 = 빈칸에서 시작(기본값 없음 · 1920~올해) · 나라 = 폰 시간대로 미리 짐작(기기 언어는 안 씀 · 9-1) · 둘 다 있어야 [확인] · 「? 왜 묻나요」 = 한 줄 펼침
//  저장 = 기기 안 malmun.birth · malmun.country 만(서버로 안 보냄) → agepolicy 가 판정 · 18세 미만이면 다음 풍선말에 안내 한 줄(5B 보기·듣기 / 5C 10대) → [시작하기]
//  나라 이름 = Intl.DisplayNames(지금 화면 말 · ⇄ 한국어면 한국어) — 번역 열쇠 없이 21개 언어 · ⇄ 때 그 자리에서 다시 씀
import { t, lang, uiKoOn } from "./i18n.js?v=1022.16";
import { esc } from "./text.js?v=1022.16";
import { spkHtml } from "./ui.js?v=1022.16";
import { age, allowed, minAge, applyGate } from "./agepolicy.js?v=1022.16";

const KB = "malmun.birth", KC = "malmun.country";
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const needBirth = () => get(KB) == null;

// 시간대 → 나라(웹판 나라 짐작 · 학습자 나라 먼저)
const TZC = {
  "Asia/Kathmandu": "NP", "Asia/Katmandu": "NP", "Asia/Dhaka": "BD", "Asia/Dacca": "BD", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN",
  "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Jayapura": "ID", "Asia/Pontianak": "ID", "Asia/Bangkok": "TH", "Asia/Ulaanbaatar": "MN",
  "Asia/Ulan_Bator": "MN", "Asia/Hovd": "MN", "Asia/Choibalsan": "MN", "Asia/Karachi": "PK", "Asia/Colombo": "LK", "Asia/Manila": "PH",
  "Asia/Tashkent": "UZ", "Asia/Samarkand": "UZ", "Asia/Bishkek": "KG", "Asia/Phnom_Penh": "KH", "Asia/Vientiane": "LA", "Asia/Yangon": "MM",
  "Asia/Rangoon": "MM", "Asia/Shanghai": "CN", "Asia/Urumqi": "CN", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Almaty": "KZ", "Asia/Qyzylorda": "KZ", "Asia/Aqtobe": "KZ", "Asia/Aqtau": "KZ", "Asia/Atyrau": "KZ", "Asia/Oral": "KZ", "Asia/Qostanay": "KZ",
  "Asia/Taipei": "TW", "Asia/Hong_Kong": "HK", "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Thimphu": "BT",
  "Asia/Kabul": "AF", "Asia/Tehran": "IR", "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Lisbon": "PT", "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT", "Europe/Warsaw": "PL", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Helsinki": "FI",
  "Europe/Copenhagen": "DK", "Europe/Prague": "CZ", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Athens": "GR", "Europe/Istanbul": "TR", "Europe/Kiev": "UA", "Europe/Kyiv": "UA",
  "Europe/Moscow": "RU", "Europe/Kaliningrad": "RU", "Europe/Samara": "RU", "Europe/Volgograd": "RU", "Asia/Yekaterinburg": "RU", "Asia/Omsk": "RU", "Asia/Novosibirsk": "RU",
  "Asia/Krasnoyarsk": "RU", "Asia/Irkutsk": "RU", "Asia/Yakutsk": "RU", "Asia/Vladivostok": "RU", "Asia/Sakhalin": "RU", "Asia/Magadan": "RU", "Asia/Kamchatka": "RU",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Phoenix": "US", "America/Los_Angeles": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO",
  "America/Lima": "PE", "America/Santiago": "CL", "Africa/Lagos": "NG", "Africa/Cairo": "EG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Africa/Casablanca": "MA",
};
const ISO = "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
export function guessCountry() { let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {} return TZC[tz] || ""; }
const uiLang = () => (uiKoOn() ? "ko" : lang === "tl" ? "fil" : lang);
function names() {
  // 그 말 나라 이름 자료가 없는 기기(브라우저) = 한국어 이름(영어 섞임 0 · 대표님 10-19 「한국어 ⇄ 학습자 언어만」)
  let dn = null, l = uiLang(); try { if (!Intl.DisplayNames.supportedLocalesOf([l]).length) l = "ko"; dn = new Intl.DisplayNames([l], { type: "region", fallback: "code" }); } catch {}
  const coll = (() => { try { return new Intl.Collator(l); } catch { return new Intl.Collator(); } })();
  return ISO.map(c => [c, (dn && dn.of(c)) || c]).sort((a, b) => coll.compare(a[1], b[1]));
}

// 풍선말 — wrap(.scr.welcome) 안 · [시작하기](cta) 위 · 끝나면 go()
export function askBirth(wrap, cta, go) {
  wrap.querySelector(".btip")?.remove();
  const y = new Date().getFullYear(), years = Array.from({ length: y - 1919 }, (_, i) => y - i), guess = get(KC) || guessCountry();
  const tip = document.createElement("div"); tip.className = "btip"; tip.setAttribute("role", "dialog"); tip.setAttribute("aria-modal", "false");
  tip.innerHTML = `<b class="who">${spkHtml("선생님")}</b><p class="q" data-k="birth_q">${esc(t("birth_q"))}</p><p class="s" data-k="birth_sub">${esc(t("birth_sub"))}</p>
    <div class="row"><select class="by" aria-label="${esc(t("birth_year"))}"><option value="" data-k="birth_year">${esc(t("birth_year"))}</option>${years.map(v => `<option value="${v}">${v}</option>`).join("")}</select>
      <select class="bc" aria-label="${esc(t("birth_country"))}"></select></div>
    <p class="wa" hidden data-k="birth_why_a">${esc(t("birth_why_a"))}</p>
    <div class="bt"><button type="button" class="why" aria-expanded="false"><span aria-hidden="true">?</span> <span data-k="birth_why">${esc(t("birth_why"))}</span></button><button type="button" class="ok" disabled data-k="birth_ok">${esc(t("birth_ok"))}</button></div>`;
  wrap.append(tip);
  const by = tip.querySelector(".by"), bc = tip.querySelector(".bc"), ok = tip.querySelector(".ok");
  const fillC = () => { const cur = bc.value || guess; bc.innerHTML = `<option value="" data-k="birth_country">${esc(t("birth_country"))}</option>` + names().map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join(""); bc.value = cur; };
  fillC();
  const place = () => { if (!tip.isConnected) return; const r = cta.getBoundingClientRect(), w = wrap.getBoundingClientRect(); tip.style.top = Math.max(8, r.top - w.top - tip.offsetHeight - 14) + "px"; };
  const can = () => { ok.disabled = !(by.value && bc.value); };
  by.onchange = bc.onchange = can; can();
  tip.querySelector(".why").onclick = e => { const wa = tip.querySelector(".wa"); wa.hidden = !wa.hidden; e.currentTarget.setAttribute("aria-expanded", String(!wa.hidden)); place(); };
  const onUi = () => { fillC(); can(); requestAnimationFrame(place); }; addEventListener("malmun:uilang", onUi);
  const onRs = () => place(); addEventListener("resize", onRs);
  const close = () => { removeEventListener("malmun:uilang", onUi); removeEventListener("resize", onRs); tip.remove(); };
  ok.onclick = () => {
    if (ok.disabled) return;
    try { localStorage.setItem(KB, by.value); localStorage.setItem(KC, bc.value); } catch {}
    applyGate();
    const a = age(), key = a != null && a < 18 ? (allowed("sttServer") ? "age_teen_note" : "age_kid_note") : null;
    if (!key) { close(); go(); return; }
    // 18세 미만 = 같은 풍선 자리에 안내 한 줄 + [시작하기]
    tip.innerHTML = `<b class="who">${spkHtml("선생님")}</b><p class="q2">${esc(t(key, { n: minAge("aiExplain") }))}</p><div class="bt"><button type="button" class="ok go" data-k="start">${esc(t("start"))}</button></div>`;
    tip.querySelector(".go").onclick = () => { close(); go(); };
    requestAnimationFrame(place);
  };
  requestAnimationFrame(place);
  return close;
}
