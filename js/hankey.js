// 앱 안 자판(대표님 11-19 14:45~14:49 · P0-171) — 한글(한)·네팔 글자(ने) 두 벌 · 아래에서 올라오는 시트 · 찾기 칸 글을 직접 씀
//  한글: 자음 14+쌍자음 5 · 모음 · 치면 음절이 조합(ㅇ+ㅏ+ㄴ→안) · 네팔 글자: 모음·자음·모음표·받침표(्)는 그냥 이어 붙임(글꼴이 겹글자로 합침)
//  휴대폰에선 시트가 화면 맨 아래(영상 칸 아래 갈색 막대 밑)에 떠서 결과 목록을 안 가림 · 겹치면 목록 칸 맨 아래 한 줄로 끼움
import { hangulCompose, hangulBackspace } from "./search.js?v=1120.8";
import { uiKoOn } from "./i18n.js?v=1120.8";

export const HK_TX = {
  ko: { han: "한글 자판", ne: "네팔 글자 자판", close: "자판 닫기", bs: "한 글자 지우기", sp: "띄어쓰기", title: "자판" },
  ne: { han: "कोरियाली किबोर्ड", ne: "नेपाली किबोर्ड", close: "किबोर्ड बन्द गर्नुहोस्", bs: "एउटा अक्षर मेट्नुहोस्", sp: "स्पेस", title: "किबोर्ड" },
};
const KO_ROWS = [[..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ"], [..."ㅋㅌㅍㅎㄲㄸㅃㅆㅉ"], [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"], [..."ㅐㅒㅔㅖ", " ", "⌫"]];
// 네팔 글자 = 한글 자판과 같은 4줄(높이 같게) · 줄이 넓으면 가로로 밀어 봄(.hk-row.sc) — 모음·모음표 / 자음 / 자음·기호 / 받침표·띄어쓰기·지우기
const NE_ROWS = [
  [..."अआइईउऊएऐओऔ", ..."ािीुूेैोौ"],
  [..."कखगघङचछजझञटठडढणतथदधन"], [..."पफबभमयरलवश", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ", "ळ", "ॐ", "।"],
  [..."ंँ्ॉ", "ृ", " ", "⌫"],
];
const VOW_KO = new Set([..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅐㅒㅔㅖ"]), VOW_NE = new Set([..."अआइईउऊएऐओऔािीुूेैोौंँ्ॉृ"]);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// 글 한 칸 지우기(네팔 글자 = 코드 한 칸 · 겹글자 구성 하나씩)
const neBackspace = s => [...String(s || "")].slice(0, -1).join("");

// opts: { input(찾기 칸 <input>), onChange(), lang: 'ko'|'ne' (자판 글자 벌), ui: true=한국어 화면 · false=네팔어 화면, host(찾기 칸 부모 — 겹치면 여기에 끼움), onClose() }
export function makeKeypad({ input, onChange, lang = "ko", ui = true, host, onClose }) {
  const d = document.createElement("div"); d.className = "hk-sheet"; d.setAttribute("role", "group"); let L = lang, K = ui;
  const T = () => (K ? HK_TX.ko : HK_TX.ne);
  const draw = () => {
    const rows = L === "ko" ? KO_ROWS : NE_ROWS, t = T();
    d.dataset.lang = L; d.setAttribute("aria-label", t.title);
    d.innerHTML = `<div class="hk-top"><button type="button" class="hk-tab${L === "ko" ? " on" : ""}" aria-pressed="${L === "ko"}" data-l="ko" lang="ko" aria-label="${esc(t.han)}">한</button><button type="button" class="hk-tab${L === "ne" ? " on" : ""}" aria-pressed="${L === "ne"}" data-l="ne" lang="ne" aria-label="${esc(t.ne)}">ने</button><span class="hk-gap"></span><button type="button" class="hk-x" aria-label="${esc(t.close)}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></button></div>`
      + rows.map(r => `<div class="hk-row${r.length > 12 ? " sc" : ""}">${r.map(k => (k === " " ? `<button type="button" class="hk-key hk-sp" data-k=" " aria-label="${esc(t.sp)}">␣</button>`
        : k === "⌫" ? `<button type="button" class="hk-key hk-bs" data-k="⌫" aria-label="${esc(t.bs)}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5h11v14H9L3 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`
        : `<button type="button" class="hk-key${(L === "ko" ? VOW_KO : VOW_NE).has(k) ? " v" : ""}" data-k="${k}" lang="${L}">${k}</button>`)).join("")}</div>`).join("");
  };
  const put = k => {
    const v = input.value;
    input.value = k === "⌫" ? (L === "ko" ? hangulBackspace(v) : neBackspace(v)) : k === " " ? v + " " : L === "ko" ? hangulCompose(v, k) : v + k;
    input.dispatchEvent(new Event("input", { bubbles: true })); onChange?.();
  };
  d.addEventListener("pointerdown", e => { if (e.target.closest("button")) e.preventDefault(); }); // 글 칸 초점·휴대폰 기본 자판 안 불러냄
  d.addEventListener("click", e => {
    e.stopPropagation(); const b = e.target.closest("button"); if (!b) return;
    if (b.classList.contains("hk-x")) return onClose?.();
    if (b.classList.contains("hk-tab")) { L = b.dataset.l; draw(); return; }
    if (b.dataset.k != null) put(b.dataset.k);
  });
  d.addEventListener("keydown", e => e.stopPropagation());
  d.setUi = k => { K = k; draw(); }; d.setLang = l => { L = l; draw(); };
  draw();
  // ⇄ 가 바뀌면(열려 있는 동안) 자판도 곧바로 따라감: 한국어 먼저=한글 · 네팔어 먼저=네팔 글자(시트 안 「한/ने」 도 같이) · 그 뒤 손으로 바꾼 건 그대로(⇄ 가 바뀔 때만 움직임)
  let lastK = uiKoOn();
  const onUi = () => { if (!d.isConnected) return removeEventListener("malmun:uilang", onUi); const k = uiKoOn(); if (k === lastK) return; lastK = k; K = k; L = k ? "ko" : "ne"; draw(); };
  addEventListener("malmun:uilang", onUi);
  // 자리 잡기: 화면 맨 아래에 붙이고, 결과 목록 칸과 겹치면 목록 칸 맨 아래 한 줄로
  d.place = () => {
    d.classList.remove("in"); document.body.appendChild(d);
    const pane = host?.closest?.(".vk-pane,.vk-sheet"), seek = document.querySelector(".learn .seek"), pr = pane?.getBoundingClientRect(), sr = d.getBoundingClientRect();
    const bottom = pane ? Math.max(pr.bottom, seek && pane.classList.contains("vk-pane") ? seek.getBoundingClientRect().bottom : 0) : 0;
    if (pane && sr.top < bottom - 1) { d.classList.add("in"); pane.appendChild(d); }
  };
  return d;
}
