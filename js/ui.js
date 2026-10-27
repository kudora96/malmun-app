import { MUSIC_ON, bgmOn, setBgm, TRACKS, playTrack, bgmNow, onBgmChange, bgmVol, setBgmVol, playNext } from "./bgm.js?v=1023.39";
import { LEARN } from "./tl.js?v=1023.39";
import { paths } from "./paths.js?v=1023.39";
import { t, tL, tAlt, lang, langName, LANGS, READY, setLang, KO_UI, uiKoOn, setUiKo, langShort, preloadKoUi } from "./i18n.js?v=1023.39";
import { snapshot, retext } from "./retext.js?v=1023.39";
import "./langfit.js?v=1023.39"; // ⇄ 때 단추 크기·자리 고정(다국어부 10-15)
import { VERSION } from "./version.js?v=1023.39";
import { esc } from "./text.js?v=1023.39";

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

// 「ने ⇄ 한」 토글(본부 10-08 · 10-14 모든 화면) — 소리 없는 토글이어도 단추 모양 · 켜짐 = 「한」 쪽 강조
//  어느 화면에서 눌러도 앱 전체가 같이(기억 malmun.uiko) · 다시 그리지 않고 그 자리에서 글만(retext) · 처음엔 모국어
//  화면은 uiKoBtn() 만 머리 줄 오른쪽 묶음 맨 앞에 두면 됨 — 누르기는 아래 문서 한 곳(switchUiKo)이 받음(배우기 화면은 자기 손잡이가 먼저 받고 멈춤)
export const uiKoBtn = () => bgmBtn() + uikoChip();
export const uikoChip = (ko = uiKoOn()) => (KO_UI.includes(lang) ? `<button class="chip uiko" data-act="uiko" aria-pressed="${ko}" aria-label="${esc(langName(lang))} ⇄ 한국어"><span class="a" lang="${lang}">${esc(langShort(lang))}</span><span class="ar" aria-hidden="true">⇄</span><span class="b" lang="ko">한</span></button>` : "");
// ♪ 「음악」 = 🎵 음악 상자 열기(대표님 10-16 · 모든 창 = uiKoBtn() 앞 · ⇄ 없는 언어에도 · 크기 고정 · 끔 = 흐리게 빗금(data-on) · 누르기는 아래 문서 한 곳)
const BGM_I = { on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>', off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>' };
// 배경음악 켜기·끄기(대표님 10-20) = ⇄ 바로 왼쪽 동그란 단추 · 🔇 꺼짐(처음) ⇄ 🔊 켜짐 · 누르면 바로 켜기·끄기(음악 상자는 따로) · 크기 고정(글 없음 · 이름 = aria·title)
export const bgmBtn = () => !MUSIC_ON ? `<span class="bgmb-anchor" hidden></span>` : `<button class="chip bgmb" data-act="bgmtog" data-on="${bgmOn()}" aria-pressed="${bgmOn()}" aria-label="${esc(t("bgm_short"))}" title="${esc(t("bgm_short"))}"><span class="bi" aria-hidden="true">${BGM_I[bgmOn() ? "on" : "off"]}</span></button>`;
const paintBgm = () => document.querySelectorAll("[data-act=bgmtog]").forEach(b => { const on = bgmOn(); b.dataset.on = String(on); b.setAttribute("aria-pressed", String(on)); const i = b.querySelector(".bi"); if (i) i.innerHTML = BGM_I[on ? "on" : "off"]; });
export async function toggleUiKo(after) { await switchUiKo(!uiKoOn()); after?.(); }
export async function switchUiKo(ko) {
  if (!KO_UI.includes(lang) || ko === uiKoOn()) return;
  const before = snapshot(); await setUiKo(ko); retext(before, document.body);
  document.querySelectorAll("[data-act=uiko]").forEach(b => { if (!b.closest("[data-uiko]")) b.setAttribute("aria-pressed", String(uiKoOn())); }); // 창(data-uiko) 안 ⇄ 는 그 창 상태 그대로
  if (ko) backTip(); // 안내는 4초 뒤 저절로 사라짐(⇄ 상태 보존 · 다국어부 uikeep 10-15)
}
// 창 안 ⇄(대표님 10-22 「⇄ 창마다 독립」 · _hq/design_uiko_scope.md) — 창 뿌리 data-uiko="1|0" 만 뒤집고 그 창 안 글만 바꿈 · 기억 안 함(창 닫으면 버림) · 돌아오는 길 풍선 없음(앱 전체 ⇄ 때만)
//  창 주인: 열 때 root.dataset.uiko = uiKoOn() ? "1" : "0"(= openUiScope(root)) · 창 안 글은 tIn(root, 열쇠) · ⇄ 칩은 uikoChip(uiKoIn(root)) · malmun:uilang 의 detail.root 가 내 창이 아니면 무시
export const openUiScope = root => { if (root) { root.dataset.uiko = uiKoOn() ? "1" : "0"; root.classList.toggle("uiko", uiKoOn()); } return root; };
export function switchUiScope(root, ko = root?.dataset.uiko !== "1") {
  if (!root || !KO_UI.includes(lang) || ko === (root.dataset.uiko === "1")) return;
  const before = snapshot(root.dataset.uiko === "1"); root.dataset.uiko = ko ? "1" : "0"; root.classList.toggle("uiko", ko); retext(before, root, ko, root);
  root.querySelectorAll("[data-act=uiko]").forEach(b => b.setAttribute("aria-pressed", String(ko)));
}
// ⇄ 미끄럼 칸(대표님 10-23 시안 ③) — 켜진 말(.a/.b) 뒤 주황 칸 = 칩의 ::before(--pl·--pw) · 누르면 0.2초 미끄러짐 · 칩 크기·자리 0px(겹 그림만) · 못 잰 칩은 css 가 켜진 글자 둘레만 채움
function placePill(c) {
  const ko = c.getAttribute("aria-pressed") === "true", on = c.querySelector(ko ? ".b" : ".a"), arE = c.querySelector(".ar"); if (!on || !arE || !c.offsetWidth) return;
  // 칩 자기 좌표(offset* = 칩 안쪽 px · 설명 창처럼 통째로 키우거나 줄인 zoom 에서도 ::before 와 같은 단위 · 가로 설명 창 10-23 칸이 1.33배로 밀리던 것)
  const bx = e => [e.offsetLeft, e.offsetLeft + e.offsetWidth], ob = bx(on);
  const arRect = () => { const [l0, r0] = bx(arE), m = /matrix\(([-\d.e]+)/.exec(getComputedStyle(arE).transform), sc = m ? Math.abs(parseFloat(m[1])) : 1, cx = (l0 + r0) / 2, hw = ((r0 - l0) * sc) / 2; return [cx - hw, cx + hw]; }; // ⇄ 글자 자리(작게 보이기 transform 반영)
  if (!c.dataset.tight) { const a0 = arRect(), gap = e => { const [l0, r0] = bx(e); return Math.max(a0[0] - r0, l0 - a0[1]); }, gp = Math.min(gap(c.querySelector(".a")), gap(c.querySelector(".b"))); c.dataset.tight = gp < 2 ? "2" : gp < 4 ? "1" : "0"; } // 글자와 ⇄ 사이가 좁을수록 ⇄ 글자만 작게(칩 크기 0px) — 1px = 72% · 3px = 86%
  const ar = arRect();
  const rs = ob[0] + ob[1] > ar[0] + ar[1]; // 켜진 말이 ⇄ 오른쪽(왼→오 「한」 · 오른→왼 ur 의 모국어)
  if (c.dataset.tight !== "2" && (rs ? ob[0] < ar[1] + 1.5 : ob[1] > ar[0] - 1.5)) { c.dataset.tight = "2"; return placePill(c); } // 글자 상자가 ⇄ 에 닿음(ur 나스탈리크) = ⇄ 한 단계 더 작게
  let l = ob[0] - 5, rgt = ob[1] + 5;
  if (rs) l = Math.max(l, ar[1] + 1.5); else rgt = Math.min(rgt, ar[0] - 1.5); // ⇄ 와 1.5px 틈
  l = Math.max(2, Math.min(l, ob[0])); rgt = Math.min(c.clientWidth - 2, Math.max(rgt, ob[1]));
  // 칸 모양이 칩 둥근 테두리 안에 쏙(대표님 10-23 「둥그런 거 삐져나옴」) — 칩 안쪽 둥근 네모를 2.5px 줄인 곳 안에 칸(둥근 네모)의 테두리 점이 모두 들도록 칸 높이를 줄임 · 세로 가운데
  const W = c.clientWidth, H = c.clientHeight, g = 2.5, R = Math.max(0, Math.min(parseFloat(getComputedStyle(c).borderTopLeftRadius) - c.clientTop, W / 2, H / 2) - g), pw = rgt - l;
  const inside = (x0, y0) => { const cx = Math.min(Math.max(x0, g + R), W - g - R), cy = Math.min(Math.max(y0, g + R), H - g - R); return x0 >= g - 0.01 && x0 <= W - g + 0.01 && y0 >= g - 0.01 && y0 <= H - g + 0.01 && Math.hypot(x0 - cx, y0 - cy) <= R + 0.01; };
  const fits = (t, ph) => { const r = Math.min(pw, ph) / 2; for (let i = 0; i < 4; i++) { const ox = i % 2 ? l + pw - r : l + r, oy = i < 2 ? t + r : t + ph - r; for (let a = 0; a <= 8; a++) { const th = (Math.PI / 2) * (a / 8) + [Math.PI, 1.5 * Math.PI, 0.5 * Math.PI, 0][i]; if (!inside(ox + r * Math.cos(th), oy + r * Math.sin(th))) return false; } } return true; };
  let ph = H - 2 * g; while (ph > 8 && !fits((H - ph) / 2, ph)) ph -= 0.5;
  c.style.setProperty("--pl", l.toFixed(1) + "px"); c.style.setProperty("--pw", pw.toFixed(1) + "px"); c.style.setProperty("--pt", ((H - ph) / 2).toFixed(1) + "px"); c.style.setProperty("--ph", ph.toFixed(1) + "px");
  if (!c.classList.contains("pl")) requestAnimationFrame(() => c.classList.add("pl")); // 처음 자리는 움직임 없이 · 그 뒤부터 미끄러짐
  if (!c.__pillRO && window.ResizeObserver) { c.__pillRO = true; pillRO.observe(c); } // 칩 크기가 바뀌면 다시 잼(설명 창이 맞는 배율을 찾느라 칩 높이를 여러 번 바꿈 · 가로 설명 창 10-23)
}
const pillRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => placePill(e.target))) : null;
const pillAll = () => document.querySelectorAll(".chip.uiko").forEach(placePill);
if (!window.__pillWired) {
  window.__pillWired = true;
  new MutationObserver(recs => { for (const r of recs) { if (r.type === "attributes") { if (r.target.matches?.(".chip.uiko")) placePill(r.target); continue; } for (const n of r.addedNodes) if (n.nodeType === 1) (n.matches(".chip.uiko") ? [n] : n.querySelectorAll(".chip.uiko")).forEach(placePill); } })
    .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed"] });
  for (const ev of ["resize", "malmun:langfit", "malmun:uilang"]) addEventListener(ev, () => requestAnimationFrame(pillAll));
  document.fonts?.ready.then(pillAll); document.addEventListener("fullscreenchange", () => requestAnimationFrame(pillAll));
}
// 한국어로 바꾼 뒤 길을 잃지 않게(본부 10-14 ④) — 처음 두 번만, 모국어로 「ไทย⇄한 을 누르면 돌아와요」
function backTip() {
  const K = "malmun.uikotip"; let n = 0; try { n = +localStorage.getItem(K) || 0; if (n >= 2) return; localStorage.setItem(K, String(n + 1)); } catch {}
  const d = Object.assign(document.createElement("div"), { className: "toast uikotip", textContent: tL("uiko_back_tip", { b: `${langShort(lang)}⇄한` }) });
  d.lang = lang; document.body.append(d); setTimeout(() => d.remove(), 4000);
}
if (!window.__uikoWired) { // 문서 한 곳에서 받기(화면이 따로 손잡이를 안 달아도 됨)
  window.__uikoWired = true;
  // 잡기 단계(capture)에서 받고 멈춤 — 화면의 「바깥 누르면 닫힘」(? 방법·말풍선·마이크 목록) 손잡이까지 가지 않게 → ⇄ = 그 상태 그대로 글만(본부 10-15 투덜이 원칙)
  document.addEventListener("click", e => { const b = e.target.closest?.("[data-act=uiko]"); if (!b) return; e.preventDefault(); e.stopPropagation(); const sc = b.closest("[data-uiko]"); if (sc) switchUiScope(sc); else switchUiKo(!uiKoOn()); }, true); // 창 안 ⇄ = 그 창만 · 밖 ⇄ = 앱 전체
  document.addEventListener("click", e => { if (!MUSIC_ON || !e.target.closest?.("[data-act=bgmtog]")) return; e.preventDefault(); e.stopPropagation(); setBgm(!bgmOn()); paintBgm(); }, true); /* ⇄ 처럼 잡기 단계 = 바깥 누르면 닫힘에 안 감 */
  document.addEventListener("click", e => { if (MUSIC_ON && e.target.closest?.("[data-act=bgm], [data-act=musicbox]")) openMusicBox(); });
  preloadKoUi();
}
// 🎵 음악 상자(본부 10-15 · 대표님 10-16 ♪ 로 엶) — 켜기/끄기 · 🔊 음량 막대(기억) · 지금 나오는 곡 · ⏭ 다음 곡 · 곡 목록(▶ 듣기 · ⬇ 내려받기 mp3 · 직접 만든 곡이라 자유) · 머리에 ⇄
//  ⇄ 를 눌러도 창 그대로(글만 바뀜 · 상태 보존) · 소리·음량은 bgm.js 가 앱 전체에 적용
export const musicBtn = () => `<button class="musicbox" data-act="musicbox">🎵 <span data-k="music_box">${esc(t("music_box"))}</span></button>`;
const volPos = f => Math.round(f <= 1 ? f * 50 : 50 + (f - 1) * 50), volOf = p => (p <= 50 ? p / 50 : 1 + (p - 50) / 50); // 막대 자리 ⇄ 음량 배수
export function openMusicBox() {
  const root = document.getElementById("sheet-root");
  const nm = (x, f = t) => { const k = "bgm_song_" + x.id, v = f(k); return v === k ? x.en : v; }; // 곡 이름 = 학습자 언어(다국어부 열쇠 · 없으면 영어) · ⇄ = 한국어
  const KV = { calm: "잔잔", bright: "밝은", power: "힘찬" };
  const stk = k => `<span class="stk"><span data-k="${k}">${esc(t(k))}</span><span class="gh" aria-hidden="true" data-t="${esc(t(k))}"></span><span class="gh" aria-hidden="true" data-t="${esc(tAlt(k) ?? "")}"></span></span>`; // 단추 폭 = 두 말 중 긴 쪽(⇄ 0px · 잘림 없음)
  const tLL = k => (uiKoOn() ? tAlt(k) ?? tL(k) : t(k)); // 학습자 말(⇄ 한국어 중에도)
  const one = (a, b) => `<span class="gb" data-t="${esc(a)}"></span> <small data-t="${esc(b)}"></small>`; // 겹친 글 = ::after(글 마디가 아니라 ⇄ 바꿈(retext)이 건드리지 않음)
  // 칸 크기 = 학습자 말·한국어 중 큰 쪽(보이지 않는 두 겹) → ⇄ 때 줄 높이·단추 자리 0px(대표님 10-15 「⇄ 는 글만」)
  const lab = x => `<span class="stk"><span><b data-k="bgm_song_${x.id}">${esc(nm(x))}</b> <small><span data-k="bgm_ver_${x.ver}">${esc(t("bgm_ver_" + x.ver))}</span></small></span><span class="gh" aria-hidden="true">${one(nm(x, tLL), tLL("bgm_ver_" + x.ver))}</span><span class="gh" aria-hidden="true" lang="ko">${one(x.song, KV[x.ver] || "")}</span></span>`;
  const row = (x, i) => { const on = bgmNow() === i; return `<li${on ? ' class="now"' : ""}><span class="nm">${lab(x)}</span>
    <button class="mplay" data-play="${i}" aria-pressed="${on}"><span aria-hidden="true">${on ? "■" : "▶"}</span> ${stk(on ? "music_stop" : "music_play")}</button>
    <button class="mdl" data-dl="${i}">⬇ ${stk("music_dl")}</button></li>`; };
  const nowHTML = () => { const i = bgmNow(), k = bgmOn() ? "music_wait" : "music_none"; return i >= 0 ? `<span class="ml" data-k="music_now">${esc(t("music_now"))}</span> ${lab(TRACKS[i])}` : `<span class="ml" data-k="${k}">${esc(t(k))}</span>`; };
  const ctrl = () => `<button class="monoff" data-mb="onoff" aria-pressed="${bgmOn()}"><span aria-hidden="true">♪</span> ${stk(bgmOn() ? "music_on" : "music_off")}</button>
    <label class="mvol"><span aria-hidden="true">🔊</span><span class="sr" data-k="music_vol">${esc(t("music_vol"))}</span><input type="range" min="0" max="100" step="5" value="${volPos(bgmVol())}" data-mb="vol" aria-label="${esc(t("music_vol"))}"></label>
    <button class="mnext" data-mb="next"${bgmOn() ? "" : " disabled"}>⏭ ${stk("music_next")}</button>`;
  const paint = () => { const ul = root.querySelector(".mlist"); if (!ul) return; ul.innerHTML = TRACKS.map(row).join(""); root.querySelector(".mnow").innerHTML = nowHTML(); const c = root.querySelector(".mctrl"); if (!c.contains(document.activeElement) || document.activeElement.type !== "range") c.innerHTML = ctrl(); };
  root.innerHTML = `<div class="sheet-dim" data-close></div>
    <div class="sheet mbox" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><span class="grab"></span>
    <h2 id="sheet-h"><span data-k="music_box">🎵 ${esc(t("music_box"))}</span>${uikoChip()}<button class="mclose" data-close aria-label="${esc(t("close_word"))}">✕</button></h2>
    <div class="mctrl">${ctrl()}</div>
    <p class="mnow">${nowHTML()}</p>
    <p data-k="music_hint">${esc(t("music_hint"))}</p>
    <ul class="mlist">${TRACKS.map(row).join("")}</ul></div>`;
  onBgmChange(paint);
  const close = () => { onBgmChange(null); root.innerHTML = ""; document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  // 막대 가운데(50) = 기본 크기(1배) · 오른쪽 끝 = 2배 · 왼쪽 끝 = 0(대표님 10-16) · 많이 키우면/줄이면 잠깐 풍선 도움말(고른 언어)
  let tipT = 0, tipK = "";
  const volTip = k => { const c = root.querySelector(".mctrl"); let b = root.querySelector(".mvtip"); if (!k) { b?.remove(); tipK = ""; return; } if (k === tipK && b) return; tipK = k; b?.remove(); b = Object.assign(document.createElement("div"), { className: "mvtip", role: "status" }); b.innerHTML = `<span data-k="${k}">${esc(t(k))}</span>`; c.after(b); clearTimeout(tipT); tipT = setTimeout(() => { b.remove(); tipK = ""; }, 2600); };
  root.oninput = e => { const v = e.target.closest?.("[data-mb=vol]"); if (!v) return; const p = +v.value; setBgmVol(volOf(p)); volTip(p >= 70 ? "music_vol_loud" : p <= 15 ? "music_vol_quiet" : ""); };
  root.onclick = async e => {
    if (e.target.closest("[data-close]")) return close();
    const mb = e.target.closest("[data-mb]");
    if (mb?.dataset.mb === "onoff") { setBgm(!bgmOn()); return setTimeout(paint, 50); }
    if (mb?.dataset.mb === "next") { playNext(); return setTimeout(paint, 300); }
    const pb = e.target.closest("[data-play]");
    if (pb) { const i = +pb.dataset.play; if (bgmNow() === i) setBgm(false); else playTrack(i); return setTimeout(paint, 300); }
    const db = e.target.closest("[data-dl]");
    if (db) { const x = TRACKS[+db.dataset.dl]; db.disabled = true;
      try { const b = await (await fetch(paths.bgm(x.file))).blob(), u = URL.createObjectURL(b), a = Object.assign(document.createElement("a"), { href: u, download: `malmun_${x.file.replace(/^bgm_/, "")}` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
      catch { const d = Object.assign(document.createElement("div"), { className: "toast", textContent: t("music_dl_fail") }); document.body.append(d); setTimeout(() => d.remove(), 3000); } finally { db.disabled = false; } }
  };
}
// 「(곧)」 = 지금 말 글 + 보이지 않는 반대 말 겹(::after · retext 가 안 건드림) → 칸 = 큰 쪽 · ⇄ 때 줄바꿈 0px(es·my 21.7px · 다국어부 10-20)
export function openLangSheet(onPick) {
  const root = document.getElementById("sheet-root");
  root.innerHTML = `<div class="sheet-dim" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><span class="grab"></span>
    <h2 id="sheet-h">${esc(t("lang_title"))}${uiKoBtn()}</h2><p>${esc(t("lang_hint"))}</p>
    <ul>${LANGS.map(([c, n]) => { const ok = READY.includes(c) || c === lang; return `<li><button data-lang="${c}" aria-current="${c === lang}" lang="${c}"${ok ? "" : ' disabled aria-disabled="true"'}>${esc(n)}${ok ? "" : ` <small class="sn"><span>(${esc(t("lang_soon"))})</span><span class="g" aria-hidden="true" data-t="(${esc(t("lang_soon"))})"></span><span class="g" aria-hidden="true" data-t="(${esc(tAlt("lang_soon") ?? t("lang_soon"))})"></span></small>`}</button></li>`; }).join("")}</ul><p class="ver">v${esc(VERSION)}</p></div>`;
  const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  root.onclick = async e => {
    if (e.target.closest("[data-close]")) return close();
    const b = e.target.closest("[data-lang]");
    if (!b || b.disabled) return;
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
export const spkHtml = ko => { const g = spkGloss(ko); return `<span class="ko" lang="${LEARN}">${esc(ko)}</span>${g ? `<span class="spkg"> · ${esc(g)}</span>` : ""}`; };
