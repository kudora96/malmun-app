import { t, lang, langName, LANGS, setLang, KO_UI, uiKoOn, setUiKo } from "./i18n.js?v=1010.19";
import { VERSION } from "./version.js?v=1010.19";
import { esc } from "./text.js?v=1010.19";

const svg = (d, fill) => `<svg class="ico" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
export const I = {
  play: svg('<path d="M8 5.5v13l11-6.5z"/>', 1),
  pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>', 1),
  prev: svg('<path d="M18 18l-8-6 8-6zM6 6v12"/>'),
  next: svg('<path d="M6 6l8 6-8 6zM18 6v12"/>'),
  rep: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/>'),
};

export const langChip = () => `<button class="chip" data-act="lang" aria-label="${esc(t("lang_title"))}">${I.globe}<span>${esc(langName(lang))}</span></button>`;

// 「ने ⇄ 한」 토글(본부 10-08) — 소리 없는 토글이어도 단추 모양 · 켜짐 = 「한」 쪽 강조 · 누르면 앱 글만 바뀌고 화면 다시 그림
export const uiKoBtn = () => (KO_UI.includes(lang) ? `<button class="chip uiko" data-act="uiko" aria-pressed="${uiKoOn()}" aria-label="${esc(langName(lang))} ⇄ 한국어"><span class="a" lang="${lang}">${esc(langName(lang).slice(0, 2))}</span>⇄<span class="b" lang="ko">한</span></button>` : "");
export async function toggleUiKo(after) { await setUiKo(!uiKoOn()); after?.(); }
export function openLangSheet(onPick) {
  const root = document.getElementById("sheet-root");
  root.innerHTML = `<div class="sheet-dim" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><span class="grab"></span>
    <h2 id="sheet-h">${esc(t("lang_title"))}</h2><p>${esc(t("lang_hint"))}</p>
    <ul>${LANGS.map(([c, n]) => `<li><button data-lang="${c}" aria-current="${c === lang}" lang="${c}">${esc(n)}</button></li>`).join("")}</ul><p class="ver">v${esc(VERSION)}</p></div>`;
  const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  root.onclick = async e => {
    if (e.target.closest("[data-close]")) return close();
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    await setLang(b.dataset.lang, true);
    close(); onPick?.();
  };
  root.querySelector("[aria-current=true]")?.focus();
}

// 진도(이 기기에만)
export const progress = {
  get(ep) { try { return JSON.parse(localStorage.getItem("malmun.p." + ep)) || {}; } catch { return {}; } },
  set(ep, v) { try { localStorage.setItem("malmun.p." + ep, JSON.stringify({ ...progress.get(ep), ...v })); } catch {} },
};
export const SPEAKER = { "선생님": "teacher", "콩": "kong", "두부": "dubu" };
// 화자 이름 옆 학습자 말(본부 10-08 투덜이) — 선생님 = 그 나라 말 「선생님」(뜻) · 두부·콩 = 이름 로마자(로마자 끄기와 무관) · 표 = lang/*.json 「spk_<id>」(없으면 en)
export const spkGloss = ko => { const id = SPEAKER[ko], k = "spk_" + id, g = id ? t(k) : ""; return g && g !== k && g !== ko ? g : ""; };
export const spkHtml = ko => { const g = spkGloss(ko); return `<span class="ko" lang="ko">${esc(ko)}</span>${g ? `<span class="spkg"> · ${esc(g)}</span>` : ""}`; };
