// ⭐ 내 단어장(시험판 · 네팔어 1편 · 본부 11-16 대표님 승인) — 낱말 칸을 톡 누르면 작은 카드 · 단어장은 이 기기(localStorage)에만
// 소리 = 이미 만들어 둔 낱말 소리를 이어 붙여(wordsnd.json) · 없는 편은 줄 소리의 그 낱말 구간 · 학습자 말이 네팔어가 아니면 아무것도 안 보임
import { lang, uiKoOn, langShort } from "./i18n.js?v=1119.17";
import { noteHTML, applyMode, fixSizes, readNote, stopRead, toggleRead, switchRead, tapBlock, tapWord, noteBlocks, curBlock, isReading, isPaused } from "./wordnote.js?v=1119.17"; // 단어 카드 설명(위 = 지금 말 · 아래 ↳ 다른 말) + 읽기 소리
import { claim, onSound } from "./onesound.js?v=1119.17";
import { hold } from "./wake.js?v=1119.17"; // 단어장·카드 ▶ 도 소리 장치 깨워 둠(목록 화면에서 열 때는 학습 화면의 깨우기가 없었음 · 대표님 11-18 「다음 사람」 첫 「다」 안 들림)
let wakeRel = null; const wakeOn = () => { wakeRel ||= hold(); }, wakeOff = () => { const f = wakeRel; wakeRel = null; try { f?.(); } catch {} };
import * as sfx from "./sfx.js?v=1119.17";
import { uikoChip } from "./ui.js?v=1119.17";
import { esc } from "./text.js?v=1119.17";
import { attachDragScroll } from "./dragscroll.js?v=1119.17";
import { sortItems, makeSortButton, attachDelete, loadSort } from "./vlist_ops.js?v=1119.17";
import { PAGE, pageCount, slicePage, clampPage, makePager } from "./vlist_pager.js?v=1119.17";
import { filterItems, makeFindBox, indexLetters, makeIndexBar, groupByEp, findTx } from "./vlist_find.js?v=1119.17";
import { paths } from "./paths.js?v=1119.17";
import { VERSION } from "./version.js?v=1119.17";

const KEY = "malmun.vocab.ne";
export const vocabOn = () => lang === "ne";

// 새 글(네팔어 = Claude 도우미 교차 확인 · 한국어 = ⇄ 한 때)
const TX = {
  ne: { menu: "⭐ मेरो शब्दसूची", add: "⭐ सूचीमा थप्नुहोस्", has: "⭐ सूचीमा छ", empty: "अहिले केही छैन। कुनै शब्द थिचेर सूचीमा थप्नुहोस्।", title: "मेरो शब्दसूची", listen: "सुन्नुहोस्", close: "बन्द" },
  ko: { menu: "⭐ 내 단어장", add: "⭐ 단어장에 담기", has: "⭐ 단어장에 있음", empty: "아직 없어요. 낱말을 톡 눌러 넣어 보세요.", title: "내 단어장", listen: "듣기", close: "닫기" },
};
const tx = k => (uiKoOn() ? TX.ko : TX.ne)[k];
const cntTx = n => (uiKoOn() ? `${n}개` : `${n} शब्द`), cntHTML = n => { const t = cntTx(n), m = t.match(/^(\d+)(.*)$/); return m ? `${m[1]}<i>${esc(m[2])}</i>` : esc(t); }; // 좁은 화면에서는 숫자만(css가 단위 글 <i> 를 가림 · 글은 그대로 있음) // 단어장 제목 옆 숫자 배지 글(대표님 11-18 13:41 · 괄호 숫자 대신)

const read = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const write = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} dispatchEvent(new CustomEvent("malmun:vocab")); };
export const vocabList = () => read();
export const vocabCount = () => read().length;
// 항목 열쇠: 단어 = 단어 글 그대로 · 조각 = "p:" + 조각 id (같은 낱말이 문장 단위·조각 단위로 둘 다 담겨도 각각 1개 · 같은 조각 id 끼리만 중복 막음 · 대표님 11-18 14:00)
const kOf = x => (x.kind === "piece" ? "p:" + x.pid : x.w);
const has = k => read().some(x => kOf(x) === k);
const put = it => { if (!has(kOf(it))) write([...read(), { ...it, t: Date.now() }]); };
const drop = k => write(read().filter(x => kOf(x) !== k));

// ── 낱말 소리 구간 = 줄 소리(대사 낭독) 안에서 · 낱말 시각(words) 우선 · 없으면 음절 정렬(align)
const alignCache = {};
const alignOf = ep => (alignCache[ep] ||= fetch(paths.data(ep, ".align")).then(r => (r.ok ? r.json() : null)).catch(() => null));
const clean = s => String(s || "").replace(/[^가-힣0-9A-Za-z]/g, "");
export async function wordSpan(ep, line, piece) {
  const need = clean(piece);
  const w = (line.words || []).find(x => clean(x.w) === need);
  if (w && w.end > w.start) return { s: Math.max(0, w.start - 0.05), e: w.end + 0.12 };
  const al = await alignOf(ep), base = String(line.lineAudio || "").replace(/\.mp3.*$/, "");
  const it = al?.items?.[base] || al?.items?.[`${ep}_${String(line.id).padStart(2, "0")}_line`];
  const sy = it?.syl;
  if (sy?.length && need) {
    const i = sy.map(x => x.ch).join("").indexOf(need);
    if (i >= 0) return { s: Math.max(0, sy[i].s - 0.05), e: sy[i + need.length - 1].e + 0.12 };
  }
  return { s: 0, e: 0 }; // 구간을 못 찾음 = 그 줄 소리 처음부터(이미 있는 소리만)
}

// ── 소리 한 개(카드 안) — 낱말마다 이미 만들어 둔 낱말 소리(일레븐랩스 v4 · units/_w##)를 이어 붙여 틂(대표님 11-16 「문장을 자르지 말고 되어 있는 단어를 이어 붙여」)
//    낱말 소리 목록 = data/<편>/<편>.wordsnd.json (줄 번호 → 낱말 → [소리 id]) · 목록에 없으면(다른 편) 예전처럼 줄 소리의 그 구간
const sndMem = {};
const sndOf = ep => (sndMem[ep] ||= fetch(paths.data(ep, ".wordsnd")).then(r => (r.ok ? r.json() : null)).catch(() => null));
export const unitsFor = async (ep, n, w) => (await sndOf(ep))?.lines?.[String(n)]?.[clean(w)] || null;
let au = null, stopT = 0, seq = 0;
onSound("card", () => stopWordSound());
export function stopWordSound() { stopRead(); seq++; clearTimeout(stopT); if (au) { try { au.pause(); } catch {} au = null; } }
function playSpan(it, btn, before) {
  if (!it.af) return;
  before?.(); claim("card"); stopWordSound();
  const a = (au = new Audio(paths.audio(it.ep, it.af)));
  btn?.classList.add("playing");
  const end = () => { clearTimeout(stopT); if (au === a) { try { a.pause(); } catch {} au = null; } btn?.classList.remove("playing"); it.__done?.(); };
  a.onended = a.onerror = end;
  a.addEventListener("loadedmetadata", () => { try { a.currentTime = it.s || 0; } catch {} }, { once: true });
  a.play().then(() => { if (it.e > it.s) { clearTimeout(stopT); stopT = setTimeout(end, Math.max(200, (it.e - (it.s || 0)) * 1000 + 80)); } }).catch(end);
}
// 낱말 소리 = 공개판 저장소 안(snd/words/<편>/<id>.mp3 · 같은 사이트라 빠름 · R2 units/_k## 는 그대로 둠 · 대표님 11-16 「바로 나와야」)
const wsrc = (ep, id) => `snd/words/${ep}/${id}.mp3?v=1`;
async function playSnd(it, btn, before) { // 낱말 소리마다 [id, 시작, 끝](소리 나는 구간만 · 앞 저음·뒤 여백 뺌)을 차례로
  const ids = it.ep && it.n != null ? await unitsFor(it.ep, it.n, it.w) : null;
  if (!ids?.length) return playSpan(it, btn, before);
  before?.(); claim("card"); stopWordSound(); const my = seq;
  btn?.classList.add("playing");
  const fin = () => { if (my === seq) { au = null; clearTimeout(stopT); btn?.classList.remove("playing"); it.__done?.(); } };
  const as = ids.map(([id]) => { const a = new Audio(wsrc(it.ep, id)); a.preload = "auto"; return a; });
  const back = () => { if (it.af) { seq++; playSpan(it, btn); } else fin(); }; // 낱말 소리를 못 받으면 예전 길(줄 소리의 그 구간)
  const go = k => {
    if (my !== seq) return;
    if (k >= as.length) return fin();
    const a = (au = as[k]), [, s0, e0] = ids[k];
    let done = false; const next = () => { if (done || my !== seq) return; done = true; clearTimeout(stopT); try { a.pause(); } catch {} go(k + 1); };
    a.onended = next;
    a.onerror = () => (k === 0 ? back() : next());
    a.addEventListener("loadedmetadata", () => { try { a.currentTime = s0 || 0; } catch {} }, { once: true });
    a.play().then(() => { if (e0 > s0) { clearTimeout(stopT); stopT = setTimeout(next, Math.max(150, (e0 - (s0 || 0)) * 1000)); } }).catch(() => (k === 0 ? back() : fin()));
  };
  go(0);
}

// ── 카드 — 단어 · 로마자 · 네팔어 뜻(같은 크기) · ▶ · 그 줄 문장(한국어 · 네팔어 같은 크기) · ⭐ 넣기
let cardEl = null;
// 영상 칸 안 열림(단어장·조각 카드) 공통 — 칸 높이 잠금 · 영상 멈춤 · 아래 갈색 막대는 바탕만(시간 글·진행 막대·▶ 숨기고 못 누름 · 높이 그대로) — 닫으면 원래대로
const stageOf = () => document.querySelector(".learn .vstage");
const syncBar = () => { const L = document.querySelector(".learn"), on = !!stageOf()?.classList.contains("vk-on"); L?.classList.toggle("vk-open", on); L?.querySelectorAll(".lines,.ctrl").forEach(e => { e.inert = on; }); }; // 열려 있는 동안: 갈색 막대는 바탕만 · 아래 자막 줄·조작 줄은 흐리게 + 못 누름(inert = 누르기·키보드 포커스 둘 다 막음)
function stageLock(st) { const own = !st.classList.contains("vk-on"); if (own) { st.style.height = st.getBoundingClientRect().height + "px"; st.classList.add("vk-on"); } try { st.querySelector("video")?.pause(); } catch {} claim("vocab"); syncBar(); return own; }
// ── 아래 갈색 막대 = 조작 막대(대표님 11-18 14:09) — 단어장·조각 카드가 영상 칸 안에 열려 있는 동안: 단어장 = 쪽 넘김(가운데) + ⛶(오른쪽 끝) · 카드 = ‹ 돌아가기(왼쪽) · ▶/⏸ · ⭐ 단어장에 담기(가운데) · ⛶(오른쪽 끝)
//    전체 화면(영상 칸 통째)에서는 갈색 막대가 칸 밖이라 같은 막대를 칸 맨 아래로 옮겨 보여 줌
const CTX = { ko: { back: "돌아가기", add: "단어장에 담기", has: "단어장에 있음" }, ne: { back: "फिर्ता", add: "सूचीमा थप्नुहोस्", has: "सूचीमा छ" } };
let cbar = null, cardCtl = null; // cardCtl = 지금 열린 카드의 {act, back(), add(), saved()}
function ctlBtns(c) {
  const t = CTX[uiKoOn() ? "ko" : "ne"], bk = c.back(), sv = c.saved(), lis = esc(tx("listen"));
  return [bk ? `<button type="button" class="vp-b vk-back" data-v="${bk}" aria-label="${esc(t.back)}" title="${esc(t.back)}"><span aria-hidden="true">‹</span><span class="t">${esc(t.back)}</span></button>` : "",
    `<button type="button" class="vp-b vk-snd" data-v="snd" aria-label="${lis}" title="${lis}">▶</button>`
    + `<button type="button" class="vp-b vk-add" data-v="${c.add()}" ${sv ? "disabled" : ""} aria-label="${esc(sv ? t.has : t.add)}" title="${esc(sv ? t.has : t.add)}"><span aria-hidden="true">⭐</span><span class="t">${esc(sv ? t.has : t.add)}</span></button>`];
}
function placeCBar() { // 평소 = 갈색 막대(.seek) 안 · 전체 화면 = 영상 칸 맨 아래
  if (!cbar) return; const st = stageOf(), seek = document.querySelector(".learn .seek"), to = fsOn() ? st : seek;
  if (to && cbar.parentNode !== to) to.append(cbar);
}
function syncCBar() {
  const st = stageOf(), on = !!st?.classList.contains("vk-on") && (listEl || (cardEl && pane));
  if (!on) { cbar?.remove(); cbar = null; return; }
  const card = !!(cardEl && pane && cardCtl), had = cbar && cbar.dataset.k === (card ? "card" : "list"), playIcon = cbar?.querySelector(".vk-snd")?.textContent;
  if (!cbar) { cbar = document.createElement("div"); cbar.className = "vk-cbar"; cbar.setAttribute("role", "toolbar"); cbar.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b || b.disabled) return; e.preventDefault(); e.stopPropagation(); if (b.dataset.v === "fs") return toggleFs(); cardCtl?.act(b.dataset.v, b); }); cbar.addEventListener("pointerdown", e => { if (e.target.closest("button:not(:disabled)")) tok(); }); }
  cbar.dataset.k = card ? "card" : "list";
  const cb = card ? ctlBtns(cardCtl) : ["", ""];
  cbar.innerHTML = `<span class="vk-cl">${cb[0]}</span><span class="vk-cc">${cb[1]}</span><span class="vk-cr">${fsBtn()}</span>`;
  if (had && playIcon) { const b = cbar.querySelector(".vk-snd"); if (b) b.textContent = playIcon; }
  placeCBar();
}
// 전체 화면(대표님 11-18 13:35) — 영상 ⛶ 와 같은 방식(requestFullscreen) · 영상 칸(.vstage) 통째로 · 그 안에 단어장·조각 카드가 들어 있음 · 못 쓰는 기계는 칸을 화면 가득 덮는 방식(vk-pfs)
const fsOn = () => { const st = stageOf(); return !!st && (document.fullscreenElement === st || st.classList.contains("vk-pfs")); };
const exitFs = () => { const st = stageOf(); st?.classList.remove("vk-pfs"); if (document.fullscreenElement && document.fullscreenElement === st) document.exitFullscreen?.().catch(() => {}); placeCBar(); };
const toggleFs = () => { const st = stageOf(); if (!st) return; if (fsOn()) return exitFs(); if (st.requestFullscreen) st.requestFullscreen().catch(() => { st.classList.add("vk-pfs"); placeCBar(); }); else { st.classList.add("vk-pfs"); placeCBar(); } };
const fsBtn = () => { const f = document.querySelector(".learn .vfs"); return f ? `<button class="vfs vk-fs" data-v="fs" aria-label="${esc(f.getAttribute("aria-label") || "")}" title="${esc(f.getAttribute("aria-label") || "")}">${f.innerHTML}</button>` : ""; };
const host = () => (fsOn() && listEl ? stageOf() : document.body); // 전체 화면 안에서는 겹쳐 뜨는 카드도 그 칸 안에 넣어야 보임
function stageFree(st) { exitFs(); st.classList.remove("vk-on"); st.style.removeProperty("height"); syncBar(); syncCBar(); }
let pane = null; // 조각 카드가 영상 칸 안에 있는 동안 {own, st}
function toPane(el) { const st = stageOf(); if (!st || pane) return; pane = { own: stageLock(st), st, ls: listEl?.querySelector(".vk-ul")?.scrollTop || 0 }; if (listEl) listEl.style.display = "none"; el.className = "vk-pane vk-ppane"; st.append(el); }
function fromPane(el) { if (!pane) return; const { own, st } = pane; pane = null; if (own) stageFree(st); if (listEl) listEl.style.display = ""; el.className = "vk-dim"; host().append(el); }
export function closeCard(back = false) { // back = 단어장 목록으로 돌아감(카드만 닫음) · 아니면 칸 안 전부 닫고 영상 자리로
  stopWordSound(); const el = cardEl; cardEl = null;
  if (pane) { const pane0 = pane, { own, st } = pane; pane = null; if (back && listEl) { listEl.style.display = ""; const u = listEl.querySelector(".vk-ul"); if (u) u.scrollTop = pane0.ls; } else { if (own) stageFree(st); if (listEl) closeVocabList(); } }
  el?.remove(); cardCtl = null; syncCBar(); if (!listEl) wakeOff();
}
addEventListener("hashchange", () => { if (pane) closeCard(); });
document.addEventListener("fullscreenchange", () => { if (cardEl && !pane) host().append(cardEl); if (!document.fullscreenElement) stageOf()?.classList.remove("vk-pfs"); placeCBar(); });
// 「소리 준비 중…」(대표님 11-16) — ▶ 를 누르고 소리가 시작될 때까지(0.25초 넘게 걸릴 때만) 카드 맨 위에 작게 · 아무 소리나 시작하면 지움
const WAIT_TX = { ne: "आवाज तयार हुँदै छ…", ko: "소리 준비 중…" };
let waitT = 0;
function hideWait() { clearTimeout(waitT); waitT = 0; document.querySelectorAll(".vk-wait").forEach(w => w.remove()); }
function showWait() {} // 「소리 준비 중」 안내는 없앰(대표님 11-17 · 표제어를 가렸음)
document.addEventListener("playing", hideWait, true); document.addEventListener("error", hideWait, true);
// 낱말 설명(대표님 11-16 「저는」이면 저는에 대한 설명 · 한국어·네팔어 1:1) — data/<편>/<편>.wordnote.json: 낱말 → {ko_mean, ne_mean, ko_ex, ne_ex} · 없는 낱말만 영상 속 문장
const noteMem = {};
export const noteOf = ep => (noteMem[ep] ||= fetch(paths.data(ep, ".wordnote") + "?v=" + VERSION).then(r => (r.ok ? r.json() : null)).catch(() => null));
// ── 조각 칩(1편 단어 카드 전부 · 조각 나누기 표 11-18) — 구절 카드 아래 「이렇게 만들어졌어요」 한 줄 + 조각 칩 · 칩을 톡 = 그 조각 자기 카드(글만 · ▶ 없음) · ← = 구절 카드로
const dictMem = {}, pcMem = {};
const dictOf = () => (dictMem.d ||= fetch("data/dict/ko_ne.json?v=" + VERSION).then(r => (r.ok ? r.json() : null)).catch(() => null));
const pcOf = ep => (pcMem[ep] ||= fetch(paths.data(ep, ".pieces") + "?v=" + VERSION).then(r => (r.ok ? r.json() : null)).catch(() => null));
const stack = (cls, a, b) => `<p class="${cls} vk-sw" data-ko="${a}" data-ne="${b}"><span class="vis">${uiKoOn() ? a : b}</span></p>`; // 지금 말 글 하나만(⇄ 하면 같은 칸에서 글만 바뀜 · 높이는 fixSizes 가 큰 쪽으로 고정)
const PTX = { ne: { built: "यसरी बनेको", back: "फिर्ता" }, ko: { built: "이렇게 만들어졌어요", back: "돌아가기" } };
function piecesHTML(pc, ents) {
  if (!pc?.pieces?.length || !ents) return "";
  const chips = pc.pieces.map(id => ents.find(e => e.id === id)).filter(Boolean).map(e => `<button class="vk-chip" data-v="piece" data-p="${esc(e.id)}" lang="ko">${esc(e.lemma)}</button>`).join("");
  return chips ? `<div class="vk-pcs">${stack("vk-built", esc(pc.built_ko || ""), esc(pc.built_ne || ""))}<div class="vk-chips">${chips}</div></div>` : "";
}
const XBTN = `<div class="vk-xw"><button class="vk-x" data-v="close" aria-label="✕" title="✕"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>`; // ✕ 닫기(카드 오른쪽 위 · 글자 없이 모양만 · 누르는 범위 44px · 바깥 누르기와 같은 closeCard · 대표님 11-18 12:33)
const pnote = e => ({ ko_mean: e.ko_mean, ne_mean: e.ne_mean, ko_ex1: e.ex?.[0]?.ko, ne_ex1: e.ex?.[0]?.ne, ko_ex2: e.ex?.[1]?.ko, ne_ex2: e.ex?.[1]?.ne, ...(e.w || {}) }); // 조각 카드 = 구절 카드와 같은 읽기 틀(뜻 → 예문1 → 예문2) · e.w = 강제 정렬 낱말 시각(<말>_<블록>_w · 노래방 칠하기)
function pieceHTML(e, roman, foot = "") {
  const k = uiKoOn();
  return `${XBTN}<div class="vk-row"><div class="vk-main"><span class="vk-t ko" lang="ko">${esc(e.lemma)}</span>${roman ? `<span class="vk-rom" lang="ne">${esc(e.dev || "")}</span>` : ""}${stack("vk-s vk-pos", esc(e.pos_ko || ""), esc(e.pos_ne || ""))}</div>${lang === "ne" ? `<button class="chip uiko vk-uiko" data-act="uiko" aria-pressed="${k}" aria-label="नेपाली ⇄ 한국어"><span class="a" lang="ne">${esc(langShort("ne"))}</span><span class="ar" aria-hidden="true">⇄</span><span class="b" lang="ko">한</span></button>` : ""}</div>
    ${noteHTML(pnote(e), k)}${foot}`;
}
const meanHTML = it => { const kh = it.note?.ko_head; return kh ? `<span class="vk-t vk-mean vk-sw" data-ko="${esc(kh)}" data-ne="${esc(it.mean || "")}" data-lk="1" lang="${uiKoOn() ? "ko" : "ne"}"><span class="vis">${esc(uiKoOn() ? kh : it.mean || "")}</span></span>` : `<span class="vk-t vk-mean" lang="ne">${esc(it.mean || "")}</span>`; }; // 맨 위 뜻 줄: 한국어 뜻(ko_head)이 있으면 ⇄ 때 같은 칸에서 글만 바뀜(11-18)
export function openWordCard(it, { before, fromList = false, piece = null, ents: ents0 = null } = {}) { // piece = 단어장에서 조각 줄을 눌러 바로 그 조각 카드로(조각 id) · ents = 조각 사전 항목
  closeCard(); wakeOn(); claim("card"); // 어디서 열든(읽기 창·단어장 목록) 다른 소리는 멈춤 — before 를 안 넘겨도 하나
  let view = piece || null; // 지금 보는 조각 id(없으면 구절 카드)
  const saved = () => (view ? has("p:" + view) : has(it.w)), romanNow = () => (document.querySelector(".exv.norom") ? "" : (lang === "ne" && it.note?.dev) || it.rom); // 네팔어 학습자 = 데바나가리 발음(dev) · 발음 토글(.norom)이 끄면 숨김
  const el = (cardEl = document.createElement("div"));
  el.className = "vk-dim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  toPane(el); // 배우는 화면이면 영상 칸 안에서(11-18 13:56 · 단어장 붙임 코드 그대로) · 그 밖의 화면은 예전처럼 겹쳐 뜸
  let pc = null, ents = ents0, act = null; // 조각 자료
  cardCtl = { act: (v, b) => act?.(v, b), back: () => (view ? (piece ? "lback" : "back") : pane && fromList && listEl ? "lback" : ""), add: () => (view ? "padd" : "add"), saved }; // 조작 막대가 부르는 손잡이
  const foot = () => (pane ? "" : `<div class="vk-btns vk-foot">${ctlBtns(cardCtl).join("")}</div>`); // 영상 칸 밖(겹쳐 뜨는 카드)만 카드 아래에 조작 단추 · 칸 안이면 아래 갈색 막대
  const draw = () => { // 그리고 나서: 글 하나만 두고 높이는 두 말 중 큰 쪽으로 고정
    draw0(); const c = el.querySelector(".vk-card"), pe = view && ents?.find(x => x.id === view);
    if (c) { c.__nt = pe ? pnote(pe) : it.note; fixSizes(c); }
    syncCBar();
  };
  const draw0 = () => {
    const pe = view && ents?.find(x => x.id === view);
    if (pe) { el.innerHTML = `<div class="vk-card vk-pcard" data-m="${uiKoOn() ? "ko" : "ne"}" data-ck="${esc(it.ep + "|" + it.w + "|" + view)}">${pieceHTML(pe, !document.querySelector(".exv.norom"), foot())}</div>`; return; }
    el.innerHTML = `<div class="vk-card" data-m="${uiKoOn() ? "ko" : "ne"}" data-ck="${esc(it.ep + "|" + it.w + "|")}">
      ${XBTN}<div class="vk-row">
        <div class="vk-main"><span class="vk-t ko" lang="ko">${esc(it.w)}</span>${romanNow() ? `<span class="vk-rom" lang="ne">${esc(romanNow())}</span>` : ""}${meanHTML(it)}</div>${lang === "ne" ? `<button class="chip uiko vk-uiko" data-act="uiko" aria-pressed="${uiKoOn()}" aria-label="नेपाली ⇄ 한국어"><span class="a" lang="ne">${esc(langShort("ne"))}</span><span class="ar" aria-hidden="true">⇄</span><span class="b" lang="ko">한</span></button>` : ""}</div>
      ${piecesHTML(pc, ents)}${noteHTML(it.note, uiKoOn()) || (it.ko ? `<div class="vk-sent"><span class="vk-s ko" lang="ko">${esc(it.ko)}</span>${it.tr ? `<span class="vk-s vk-str" lang="ne">${esc(it.tr)}</span>` : ""}</div>` : "")}
      ${foot()}</div>`;
  };
  before?.(); // 카드가 열리면 바깥 소리(설명 읽기)는 그 자리에서 멈춤 — 카드 소리만
  draw();
  const curNote = () => { const pe = view && ents?.find(x => x.id === view); return pe ? pnote(pe) : it.note; }; // 지금 보는 카드의 설명(구절 카드 또는 조각 카드)
  const startNote = (bk, wi = -1) => { const nt = curNote(); if (nt && cardEl === el) { const v = view; showWait(el); it.__done = null; readNote(el, it, nt, uiKoOn(), it.order, { from: Math.max(0, noteBlocks(nt).findIndex(x => x.b === bk)), wi, url: v ? (l, b) => `snd/dict/${v}_${l}_${b}.mp3?v=9` : null }); } }; // 설명 읽기 화면처럼 열리면 저절로 시작
  const onLang = () => { if (cardEl !== el) return removeEventListener("malmun:uilang", onLang); const ko = uiKoOn(), c = el.querySelector(".vk-card"); if (c) { applyMode(c, ko); const u = c.querySelector(".vk-uiko"); u?.setAttribute("aria-pressed", String(ko)); c.querySelectorAll(".vk-snd").forEach(x => { x.setAttribute("aria-label", tx("listen")); x.title = tx("listen"); }); syncCBar(); } switchRead(ko); }; // 다시 그리지 않고 보임만 바꿈 · ⇄ = 읽던 블록·그 위치에서 새 말로(처음으로 안 감 · 멈춰 있으면 멈춘 채)
  addEventListener("malmun:uilang", onLang);
  const sync = setInterval(() => { if (cardEl !== el) return clearInterval(sync); const b = document.querySelector(".vk-snd"), t = isReading() && !isPaused() ? "⏸" : "▶"; if (b && b.textContent !== t && curNote()) b.textContent = t; }, 100);
  el.addEventListener("click", e => {
    let b = e.target.closest("[data-v]"); if (b && !el.contains(b)) b = null; // 위쪽 칸의 data-v 를 잡지 않게
    if (!b) { if (!e.target.closest(".vk-card")) closeCard(); else if (e.target.closest(".vk-note") && curNote()) { const bk = e.target.closest(".vk-blk")?.dataset.b, kw = e.target.closest(".vk-line .kw"), wi = kw ? [...kw.parentNode.querySelectorAll(".kw")].indexOf(kw) : -1; if (!(bk ? (wi >= 0 ? tapWord(bk, wi) : tapBlock(bk)) : toggleRead())) startNote(bk, wi); } return; } // 화면 밖 = 닫힘 · 다른 블록 톡 = 그 블록부터 · 읽는 블록 톡 = 멈춤⇄이어서 · 다 읽은 뒤 톡 = 처음부터
    e.stopPropagation(); act(b.dataset.v, b);
  });
  act = (v, b) => {
    if (v === "fs") { toggleFs(); return; } // ⛶ = 칸 통째 전체 화면 ⇄ 나가기
    if (v === "close") { if (pane && fsOn()) exitFs(); else closeCard(); return; } // 전체 화면 중 ✕ = 먼저 칸 안으로 · 다시 ✕ = 영상 자리로 // ✕ = 바깥 누르기와 똑같이 닫힘
    if (v === "piece") { stopRead(); view = b.dataset.p; toPane(el); draw(); startNote(); return; } // 조각 카드(글만)
    if (v === "lback") { closeCard(true); return; } // ← = 단어장 목록 그 쪽·그 위치로(목록은 숨겨 둔 채 그대로 있었음)
    if (v === "back") { stopRead(); view = null; draw(); startNote(); return; } // 조각 카드 ← = 카드(칸 안 그대로)
    if (v === "snd") { // ▶ = 처음부터 다시(설명 읽기 · 낱말 소리는 따로 안 냄)
      if (curNote()) { if (isReading()) toggleRead(); else startNote(); return; } // ▶/⏸ — 읽는 중 = 멈춤 · 멈춤 = 이어서 · 끝난 뒤 = 처음부터
      showWait(el); stopRead(); it.__done = null;
      return playSnd(it, b, before);
    }
    if (v === "add") { put(it); draw(); return; }
    if (v === "padd") { const e = ents?.find(x => x.id === view); if (e) { put({ kind: "piece", pid: e.id, w: e.lemma, rom: "", dev: e.dev || "", mean: e.pos_ne || "", ep: it.ep, n: it.n }); draw(); } return; } // 조각도 단어장에(줄 하나 · 개수 1)
  };
  if (!pane) host().append(el);
  if (it.ep) Promise.all([noteOf(it.ep), pcOf(it.ep), dictOf()]).then(([n, pcs, dc]) => { if (cardEl !== el) return; const x = n?.[clean(it.w)]; pc = pcs?.cards?.[clean(it.w)] || null; ents = dc?.entries || null; if (x) { it.note = x; it.key = clean(it.w); it.order = n._order || []; } if (x || (pc && ents)) { draw(); if (x) startNote(); } }); // 설명이 있으면 문장 자리를 설명으로 · 조각 자료가 있으면 칩
  return el;
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && cardEl) closeCard(!!listEl); });

// 「톡」 — 새 소리 파일 없이 sfx.js 합성 소리 한 개(0.05초) · 읽기·카드 낭독·영상 등 다른 소리가 나는 중이면 안 냄(소리는 하나 · onesound)
sfx.defineSynth("tok", mk => { const c = mk(1, 0.07), o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(900, 0); o.frequency.exponentialRampToValueAtTime(420, 0.05); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.22, 0.004); g.gain.exponentialRampToValueAtTime(0.001, 0.06); o.connect(g); g.connect(c.destination); o.start(0); o.stop(0.07); return c.startRendering(); });
const otherSound = () => sfx.playing() || isReading() || !!au || [...document.querySelectorAll("audio,video")].some(m => !m.paused && !m.ended);
const tok = () => { try { if (!otherSound()) sfx.play("synth:tok").catch(() => {}); } catch {} };

// ── 단어장 목록(대표님 11-18 13:07) — 배우는 화면에서는 영상 칸 자리 안에서 열림(설명 창이 열리는 자리 · 다른 칸 크기·배치 불변) · 그 밖의 화면은 예전처럼 겹쳐 뜸
//    열면 영상 멈춤 · 오른쪽 위 ✕ = 닫고 영상 자리로 · 단어 누르면 카드 · ⇄ = 앱 전체 하나(한국어 쪽: 단어·발음·뜻 / 네팔어 쪽: 뜻·단어·발음)
let listEl = null, listOff = [];
// 단어장 조각 줄 = 그 조각 카드를 영상 칸 안에서(조각 사전은 한 번 받아 둔 것)
function openPieceFromList(it) { dictOf().then(dc => { if (dc?.entries) openWordCard({ w: it.w, rom: "", mean: it.mean, ep: it.ep, n: it.n, ko: "", tr: "" }, { fromList: true, piece: it.pid, ents: dc.entries }); }); }
export function closeVocabList() {
  closeCard(); listOff.forEach(f => { try { f(); } catch {} }); listOff = [];
  const st = listEl?.closest?.(".vstage"); listEl?.remove(); listEl = null; if (st) stageFree(st); wakeOff();
}
export function openVocabList() {
  closeVocabList(); wakeOn();
  const stage = document.querySelector(".learn .vstage"), el = (listEl = document.createElement("div"));
  if (stage) { el.className = "vk-pane"; stageLock(stage); } // 칸 크기 그대로(영상 칸 높이 · 다른 칸 안 밀림) · 영상 멈춤 · 아래 막대 바탕만 // 영상·읽기 소리 멈춤(닫아도 멈춘 채)
  else { el.className = "vk-dim vk-listdim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); }
  const devOf = (x, N) => (lang === "ne" && (x.kind === "piece" ? x.dev : N[x.ep]?.[clean(x.w)]?.dev)) || ""; // 목록 발음 줄 = 카드와 같은 자료(note.dev · 학습자 글자) · 없으면 비움(로마자로 되돌리지 않음 · 대표님 11-18)
  let N = {}, mode = loadSort(), offDrag = null, cur = 0, all = [], view = [], devMap = new Map(), pager = null, ul = null, wrap = null;
  const find = makeFindBox(() => { cur = 0; drawList(); }, uiKoOn()); // 찾기 칸(앱 칩 모양) — 한 번 만들어 계속 씀(글·초점 유지)
  const rowTx = (x, ko) => { const d = devMap.get(x) || "", w = `<span class="vk-t ko" lang="ko">${esc(x.w)}</span>`, r = d ? `<span class="vk-rom" lang="ne">${esc(d)}</span>` : "", m = `<span class="vk-t vk-mean" lang="ne">${esc(x.mean || "")}</span>`; return ko ? w + r + m : m + w + r; };
  const mountPager = () => { // 쪽 넘김 = 영상 칸 아래 갈색 막대(.seek · 목록이 열려 있는 동안 바탕만 남은 자리) · 영상 칸이 없는 화면은 목록 맨 아래 갈색 줄
    const seek = stage ? document.querySelector(".learn .seek") : null, host = seek || el.querySelector(".vk-sheet") || el;
    if (pager && pager.host === host) return;
    pager?.destroy(); pager = makePager(host, p => { cur = p; drawList(); }, !seek); pager.host = host;
  };
  const scrollToRow = i => { const li = ul?.querySelectorAll(".vk-li")[i]; if (li) ul.scrollTop += li.getBoundingClientRect().top - ul.getBoundingClientRect().top - (mode === "ep" ? 26 : 2); };
  const drawList = (focusIdx = -1) => { // 쪽 안만 다시 그림 — 찾기·쪽 넘기기·색인은 여기(1만 개여도 20줄만 그림)
    if (listEl !== el || !ul) return;
    const ko = uiKoOn(), L = ko ? "ko" : "ne";
    view = filterItems(all, find.value(), x => devMap.get(x)); cur = clampPage(cur, view.length);
    const pg = slicePage(view, cur), rows = x => `<li class="vk-li"><button class="vk-pl" data-v="pl" data-w="${esc(kOf(x))}" aria-label="${esc(tx("listen"))}" title="${esc(tx("listen"))}">▶</button><button class="vk-lb" data-w="${esc(kOf(x))}">${rowTx(x, ko)}</button></li>`;
    ul.innerHTML = mode === "ep" ? groupByEp(pg, ko, view).map(g => (g.head ? `<li class="vp-grp" aria-hidden="true">${esc(g.head)}</li>` : "") + rows(g.x)).join("") : pg.map(rows).join("");
    wrap.querySelector(".vk-empty")?.remove(); ul.hidden = !pg.length;
    const ik = mode === "abc" && pg.length ? `${L}|${find.value()}|${view.length}` : "", idx = wrap.querySelector(".vp-idx"); // 색인 막대는 같은 목록이면 그대로 둠(쪽이 바뀌어도 미끄러뜨리는 손가락이 안 끊김)
    if (idx && idx.dataset.ik !== ik) idx.remove();
    if (!pg.length) wrap.insertAdjacentHTML("afterbegin", `<p class="vk-empty">${esc(findTx("nofound", ko))}</p>`);
    else if (ik && !wrap.querySelector(".vp-idx")) { const ib = wrap.appendChild(makeIndexBar(indexLetters(view, L), i => { const p = Math.floor(i / PAGE); if (p !== cur) { cur = p; drawList(i % PAGE); } else scrollToRow(i % PAGE); }, ko)); ib.dataset.ik = ik; } // 가나다 색인 = 글자 있는 쪽·줄로
    ul.scrollTop = 0; ul.querySelectorAll(".vk-li").forEach((li, i) => attachDelete(li, pg[i], it => drop(kOf(it)), L));
    pager?.update(cur, pageCount(view.length), ko);
    if (focusIdx >= 0) scrollToRow(focusIdx);
  };
  const draw = async () => {
    const L = uiKoOn() ? "ko" : "ne"; all = sortItems(read(), mode, L); const total = all.length;
    await Promise.all([...new Set(all.map(x => x.ep).filter(Boolean))].map(async ep => { N[ep] = await noteOf(ep); }));
    if (listEl !== el) return;
    const ko = uiKoOn(); devMap = new Map(all.map(x => [x, devOf(x, N)])); find.setLang(ko);
    const body = `<div class="vk-head"><span class="vk-tt"><b>${esc(tx("title"))}</b><span class="vk-cnt">${cntHTML(total)}</span></span><span class="vk-sortslot"></span><span class="vk-uik">${uikoChip()}</span></div>
      ${total ? `<div class="vp-frow"><span class="vp-findslot"></span></div><div class="vp-wrap"><ul class="vk-ul flick"></ul></div>` : `<p class="vk-empty">${esc(tx("empty"))}</p>`}`;
    el.innerHTML = stage ? `${XBTN}${body}` : `<div class="vk-sheet">${XBTN}${body}</div>`;
    offDrag?.(); offDrag = null; ul = el.querySelector(".vk-ul"); wrap = el.querySelector(".vp-wrap");
    el.querySelector(".vk-sortslot")?.append(makeSortButton(() => mode, m => { mode = m; cur = 0; draw(); }, L, k => (k.startsWith("vlist.") ? k : tx(k))));
    el.querySelector(".vp-findslot")?.replaceWith(find); mountPager();
    if (ul) { offDrag = attachDragScroll(ul, { friction: 0.95, threshold: 6, wheel: true }); drawList(); } else pager?.update(0, 1, ko);
  };
  draw();
  el.addEventListener("click", e => {
    if (e.target.closest(".vk-fs")) return toggleFs();
    if (e.target.closest(".vk-x")) return fsOn() ? exitFs() : closeVocabList(); // 전체 화면 중 ✕ = 먼저 칸 안으로 · 다시 ✕ = 영상 자리로
    if (e.target === el && !stage) return closeVocabList();
    const pl = e.target.closest(".vk-pl"); // 줄 ▶ = 그 단어 소리(카드 ▶ 와 같은 길 · claim("card") 이 다른 소리를 멈춤)
    if (pl) { const it = read().find(x => kOf(x) === pl.dataset.w); if (it && it.kind === "piece") return openPieceFromList(it); if (it) { it.__done = null; pl.classList.add("playing"); playSnd(it, pl).catch(() => {}).finally(() => setTimeout(() => pl.classList.remove("playing"), 0)); } return; }
    const b = e.target.closest(".vk-lb"); if (!b) return;
    const it = read().find(x => kOf(x) === b.dataset.w); if (it && it.kind === "piece") return openPieceFromList(it); if (it) openWordCard(it, { fromList: true });
  });
  el.addEventListener("pointerdown", e => { if (e.target.closest(".vk-lb")) tok(); const sb = e.target.closest(".vl-sortbtn"); if (sb) { tok(); sb.classList.add("hit"); setTimeout(() => sb.classList.remove("hit"), 220); } }); // 정렬 단추도 줄처럼 「톡」+눌림 · 갈색 바탕이 잠깐 채워졌다 돌아옴 // 줄 누르는 순간 「톡」 — 다른 소리가 나는 중이면 안 냄
  const on = (t, f, o) => { addEventListener(t, f, o); listOff.push(() => removeEventListener(t, f, o)); };
  listOff.push(() => { pager?.destroy(); pager = null; });
  on("pointerdown", e => { if (listEl === el && e.target.closest?.(".vp-bar .vp-b:not(:disabled),.vp-po,.vp-clr")) tok(); }, true); // 쪽 넘김·쪽 번호·찾기 ✕ 도 줄처럼 「톡」(다른 소리가 나는 중이면 안 냄)
  on("malmun:vocab", () => { if (listEl === el) draw(); });
  on("malmun:uilang", () => { if (listEl === el) draw(); }); // ⇄ = 줄 순서·제목 바뀜(칸 크기는 그대로)
  on("hashchange", () => closeVocabList()); // 다른 화면으로 가면 닫음
  on("keydown", e => { if (e.key === "Escape" && !cardEl) closeVocabList(); });
  (stage || document.body).append(el); syncCBar(); // ⛶ = 아래 갈색 막대 오른쪽 끝(목록·카드 어디서든 같은 자리)
}
// 편 목록 위 단추 글 — 개수는 말 바뀔 때마다 다시
export const vocabMenuHTML = () => (vocabOn() ? `<p class="vk-menu"><button class="vk-menubtn" data-act="vocab" data-n="${vocabCount()}">${esc(tx("menu"))} <span class="vk-n">(${vocabCount()})</span></button></p>` : "");

// 작은 단추 「⭐ N」 — 「ने⇄한」 바로 왼쪽(모든 화면 · 네팔어만) · 누르면 그 자리에 단어장 목록이 겹쳐 뜸(영상·녹음·설명 소리는 안 끊음)
export const starChip = () => (vocabOn() ? `<button class="chip vkstar" data-vk="star" aria-label="${esc(tx("title"))}" title="${esc(tx("title"))}"><span class="vs" aria-hidden="true">⭐</span><span class="vn">${vocabCount()}</span></button>` : "");
if (!window.__vkStarWired) {
  window.__vkStarWired = true;
  document.addEventListener("click", e => { const b = e.target.closest?.("[data-vk=star]"); if (!b) return; e.preventDefault(); e.stopPropagation(); openVocabList(); }, true); // 앞서 받아 화면 쪽 멈춤⇄다시로 새지 않게
  addEventListener("malmun:vocab", () => document.querySelectorAll(".vkstar .vn").forEach(n => { n.textContent = String(vocabCount()); }));
}
