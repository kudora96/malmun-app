// ⭐ 내 단어장(시험판 · 네팔어 1편 · 본부 11-16 대표님 승인) — 낱말 칸을 톡 누르면 작은 카드 · 단어장은 이 기기(localStorage)에만
// 소리 = 이미 만들어 둔 낱말 소리를 이어 붙여(wordsnd.json) · 없는 편은 줄 소리의 그 낱말 구간 · 학습자 말이 네팔어가 아니면 아무것도 안 보임
import { lang, uiKoOn, langShort } from "./i18n.js?v=1120.30";
import { noteHTML, applyMode, fixSizes, readNote, stopRead, toggleRead, switchRead, tapBlock, tapWord, hitText, noteBlocks, curBlock, isReading, isPaused } from "./wordnote.js?v=1120.30"; // 단어 카드 설명(위 = 지금 말 · 아래 ↳ 다른 말) + 읽기 소리
import { claim, onSound } from "./onesound.js?v=1120.30";
import { twoOn, setTwo, autoOn, setAuto, autoSchedule, autoCancel, autoPending, autoHold, autoHeld, autoAt, markAuto, showAutoEnd } from "./autoplay.js?v=1120.30"; // 자동 이어 듣기 공용 엔진(설명·단어 카드·조각 카드 · 대표님 11-19 14:11)
import { hold } from "./wake.js?v=1120.30"; // 단어장·카드 ▶ 도 소리 장치 깨워 둠(목록 화면에서 열 때는 학습 화면의 깨우기가 없었음 · 대표님 11-18 「다음 사람」 첫 「다」 안 들림)
let wakeRel = null; const wakeOn = () => { wakeRel ||= hold(); }, wakeOff = () => { const f = wakeRel; wakeRel = null; try { f?.(); } catch {} };
import * as sfx from "./sfx.js?v=1120.30";
import { uikoChip } from "./ui.js?v=1120.30";
import { esc } from "./text.js?v=1120.30";
import { attachDragScroll } from "./dragscroll.js?v=1120.30";
import { sortItems, makeSortButton, attachDelete, loadSort } from "./vlist_ops.js?v=1120.30";
import { PAGE, pageCount, slicePage, clampPage, makePager } from "./vlist_pager.js?v=1120.30";
import { filterItems, makeFindBox, indexLetters, makeIndexBar, groupByEp, findTx } from "./vlist_find.js?v=1120.30";
import { paths } from "./paths.js?v=1120.30";
import { catalog, episode } from "./data.js?v=1120.30";
import { VERSION } from "./version.js?v=1120.30";
import { createMemo, memoBtns, TXM } from "./memo.js?v=1120.30"; // 외우기(대표님 11-20 15:10)

const KEY = "malmun.vocab.ne";
export const vocabOn = () => lang === "ne";

// 새 글(네팔어 = Claude 도우미 교차 확인 · 한국어 = ⇄ 한 때)
const TX = {
  ne: { menu: "⭐ मेरो शब्दसूची", add: "⭐ सूचीमा थप्नुहोस्", has: "⭐ सूचीमा छ", empty: "अहिले केही छैन। कुनै शब्द थिचेर सूचीमा थप्नुहोस्।", title: "मेरो शब्दसूची", listen: "सुन्नुहोस्", close: "बन्द", auto: "अटो", two: "दुवै भाषा", two_tip: "दुवै भाषामा सुन्नुहोस्", auto_end: "तपाईंले सबै सुन्नुभयो", auto_again: "सुरुबाट फेरि", tabAll: "सबै", tabMine: "मैले सेभ गरेको", addRow: "सूचीमा थप्नुहोस्", hasRow: "सूचीमा छ", offRow: "सूचीबाट हटाउनुहोस्", tAdd: "सूचीमा थपियो", tDel: "सूचीबाट हटाइयो" },
  ko: { menu: "⭐ 내 단어장", add: "⭐ 단어장에 담기", has: "⭐ 단어장에 있음", empty: "아직 없어요. 낱말을 톡 눌러 넣어 보세요.", title: "내 단어장", listen: "듣기", close: "닫기", auto: "자동", two: "두 말", two_tip: "두 말로 듣기", auto_end: "끝까지 들었어요", auto_again: "처음부터 다시", tabAll: "전체", tabMine: "내가 담은", addRow: "단어장에 담기", hasRow: "단어장에 있음", offRow: "단어장에서 빼기", tAdd: "담았어요", tDel: "뺐어요" },
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
const put = it => { if (!has(kOf(it))) { const { line, ...r } = it; write([...read(), { ...r, t: Date.now() }]); } };
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
const wsrc = (ep, id) => `snd/words/${ep}/${id}.mp3?v=2`;
async function playSnd(it, btn, before, ids0) { // 낱말 소리마다 [id, 시작, 끝](소리 나는 구간만 · 앞 저음·뒤 여백 뺌)을 차례로
  const ids = ids0 !== undefined ? ids0 : it.ep && it.n != null ? await unitsFor(it.ep, it.n, it.w) : null; // ids0 = 외우기가 미리 알아 온 낱말 소리 목록(기다림 없이 바로 시작 · 같은 차례 claim)
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
// ── 뒤 화면 잠금(대표님 11-19 16:08 · P0-171) — 겹친 창(단어장·자판·카드·조각 카드)이 열린 동안 뒤 화면(자막 줄·배우기 화면)은 누르기도 움직이기도 안 됨
//    한 곳: syncBar(영상 칸 안 열림·닫힘) + body 에 겹쳐 뜨는 .vk-dim 카드 → bgLock() · 휠·손가락 끌기가 창 안 목록이 더 못 가는 끝에서 뒤로 번지면 막음(창 안 목록은 그대로 스크롤) · 닫으면 열기 전 스크롤 자리로
let bgY = null;
const bgOpen = () => !!document.querySelector(".learn .vstage.vk-on, body > .vk-dim, .vstage > .vk-dim");
const canMove = (e, dx, dy) => { // 이 칸이 그 방향으로 더 갈 수 있나
  const cs = getComputedStyle(e);
  if (dy && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1 && (dy < 0 ? e.scrollTop > 0 : e.scrollTop + e.clientHeight < e.scrollHeight - 1)) return true;
  if (dx && /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1 && (dx < 0 ? e.scrollLeft > 0 : e.scrollLeft + e.clientWidth < e.scrollWidth - 1)) return true;
  return false;
};
function guardScroll(ev, dx, dy) {
  if (bgY == null || (!dx && !dy)) return;
  for (let e = ev.target instanceof Element ? ev.target : null; e && e !== document.documentElement && e !== document.body; e = e.parentElement) if (canMove(e, dx, dy)) return; // 창 안 목록이 갈 수 있으면 그대로
  if (ev.cancelable) ev.preventDefault();
}
let tY = 0, tX = 0;
addEventListener("wheel", e => { if (!e.ctrlKey) guardScroll(e, e.deltaX, e.deltaY); }, { passive: false, capture: true });
addEventListener("touchstart", e => { const t = e.touches[0]; if (t) { tX = t.clientX; tY = t.clientY; } }, { passive: true, capture: true });
addEventListener("touchmove", e => { if (e.touches.length !== 1) return; const t = e.touches[0], dx = tX - t.clientX, dy = tY - t.clientY; tX = t.clientX; tY = t.clientY; guardScroll(e, dx, dy); }, { passive: false, capture: true });
function bgLock() {
  const on = bgOpen(), se = document.scrollingElement;
  if (on && bgY == null) { bgY = se.scrollTop; document.documentElement.classList.add("vk-bglock"); }
  else if (!on && bgY != null) { const y = bgY; bgY = null; document.documentElement.classList.remove("vk-bglock"); if (Math.abs(se.scrollTop - y) > 0.5) se.scrollTop = y; }
}
new MutationObserver(bgLock).observe(document.body, { childList: true });
const syncBar = () => { bgLock();  const L = document.querySelector(".learn"), on = !!stageOf()?.classList.contains("vk-on"); L?.classList.toggle("vk-open", on); L?.querySelectorAll(".lines,.ctrl").forEach(e => { e.inert = on; }); }; // 열려 있는 동안: 갈색 막대는 바탕만 · 아래 자막 줄·조작 줄은 흐리게 + 못 누름(inert = 누르기·키보드 포커스 둘 다 막음)
function stageLock(st) { const own = !st.classList.contains("vk-on"); if (own) { st.style.height = st.getBoundingClientRect().height + "px"; st.classList.add("vk-on"); } try { st.querySelector("video")?.pause(); } catch {} claim("vocab"); syncBar(); return own; }
// ── 아래 갈색 막대 = 조작 막대(대표님 11-18 14:09) — 단어장·조각 카드가 영상 칸 안에 열려 있는 동안: 단어장 = 쪽 넘김(가운데) + ⛶(오른쪽 끝) · 카드 = ‹ 돌아가기(왼쪽) · ▶/⏸ · ⭐ 단어장에 담기(가운데) · ⛶(오른쪽 끝)
//    전체 화면(영상 칸 통째)에서는 갈색 막대가 칸 밖이라 같은 막대를 칸 맨 아래로 옮겨 보여 줌
const CTX = { ko: { back: "돌아가기", add: "단어장에 담기", has: "단어장에 있음", next: "다음", prev: "이전" }, ne: { back: "फिर्ता", add: "सूचीमा थप्नुहोस्", has: "सूचीमा छ", next: "अर्को", prev: "अघिल्लो" } }; // next = 「다음 ›」(대표님 11-20 14:12 · 자동이 꺼져도 다음 카드로 바로 감)
// 자동 이어 듣기 — 순서(자막 낱말 순서)는 배우는 화면이 등록(setCardNav): locate(it)→자리 · at(자리)→{it,pos,before}|null · commit(그 자리) = 줄·뒤 영상을 옮김
let cardNav = null; export const setCardNav = n => { cardNav = n; };
const autoLabel = () => tx("auto");
const twoBtn = () => `<button type="button" class="vp-b vk-two" data-act="two" data-v="two" aria-pressed="${twoOn()}" aria-label="${esc(tx("two_tip"))}"><span class="cc">${esc(tx("two"))}</span></button>`;
const autoBtn = on => `<button type="button" class="vp-b vk-auto" data-act="exauto" data-v="auto" aria-pressed="${on}" aria-label="${esc(autoLabel())}"><span class="cc">${esc(autoLabel())}</span></button>`;
let cbar = null, cardCtl = null; // cardCtl = 지금 열린 카드의 {act, back(), add(), saved()}
const STAR_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z" stroke-linejoin="round"/></svg>';
const STX = { ko: { lb: "단어장", add: "단어장에 담기", has: "단어장에 있음(누르면 빼기)" }, ne: { lb: "शब्दसूची", add: "सूचीमा थप्नुहोस्", has: "सूचीमा छ (थिचेर हटाउनुहोस्)" } }; // 막대 ⭐ = 글은 안 바뀌고 별 모양(☆ 담기 전 · ★ 담은 뒤)으로만 상태 표시(대표님 11-20 15:30) · 네팔어 = 단어장 화면이 이미 쓰는 낱말(शब्दसूची)과 통일
const starBtn = (c, sv) => { const x = STX[uiKoOn() ? "ko" : "ne"], tl = esc(sv ? x.has : x.add); return `<button type="button" class="vp-b vk-star${sv ? " on" : ""}" data-v="${c.add()}" data-on="${sv ? 1 : 0}" aria-label="${tl}" title="${tl}">${STAR_SVG}<span class="t">${esc(x.lb)}</span></button>`; };
function ctlBtns(c) {
  const t = CTX[uiKoOn() ? "ko" : "ne"], bk = c.back(), sv = c.saved(), lis = esc(tx("listen"));
  return [bk ? `<button type="button" class="vp-b vk-back" data-v="${bk}" aria-label="${esc(t.back)}" title="${esc(t.back)}"><span aria-hidden="true">‹</span><span class="t">${esc(t.back)}</span></button>` : "",
    `<button type="button" class="vp-b vk-snd" data-v="snd" aria-label="${lis}" title="${lis}">▶</button>`
    + (c.two?.() ? twoBtn() : "") + (c.auto?.() ? autoBtn(autoOn()) : "") + starBtn(c, sv)
    + (c.next?.() ? `<span class="vk-navpair">` + (() => { const off = !c.prev?.(); return `<button type="button" class="vp-b vk-prev${off ? " vk-off" : ""}" data-v="prev" aria-label="${esc(t.prev)}" title="${esc(t.prev)}"${off ? ' aria-disabled="true"' : ""}><span aria-hidden="true">‹</span><span class="t">${esc(t.prev)}</span></button>`; })() + `<button type="button" class="vp-b vk-next" data-v="next" aria-label="${esc(t.next)}" title="${esc(t.next)}"><span class="t">${esc(t.next)}</span><span aria-hidden="true">›</span></button></span>` : "")];
}
function placeCBar() { // 평소 = 갈색 막대(.seek) 안 · 전체 화면 = 영상 칸 맨 아래
  if (!cbar) return; const st = stageOf(), seek = document.querySelector(".learn .seek"), to = fsOn() ? st : seek;
  if (to && cbar.parentNode !== to) to.append(cbar);
}
let cbarRO = null;
function fitCBar() { // 막대 단추끼리 겹침·넘침 0 · 한 줄(대표님 11-20 15:18) — 실제 남는 자리를 재서 단계로 줄임: s1 이전/다음 글 숨김 → s2 ⭐ 글 숨김 → s3 돌아가기 글 숨김 → s3 간격·안쪽 여백 줄임 → s4 글자 11px
  if (!cbar || !cbar.isConnected) return;
  const bad = () => { const r = cbar.getBoundingClientRect(), bs = [...cbar.querySelectorAll("button")].map(b => b.getBoundingClientRect()).filter(x => x.width); if (!r.width) return false; if (bs.some(x => x.right > r.right + .5 || x.left < r.left - .5)) return true; bs.sort((a, b) => a.left - b.left); return bs.some((x, i) => i && x.left < bs[i - 1].right - .5); };
  cbar.classList.remove("s1", "s2", "s3", "s4", "s5");
  for (const c of ["s1", "s2", "s3", "s4", "s5"]) { if (!bad()) break; cbar.classList.add(c); }
}
function syncCBar() {
  const st = stageOf(), on = !!st?.classList.contains("vk-on") && (listEl || (cardEl && pane));
  if (!on) { cbar?.remove(); cbar = null; return; }
  const card = !!(cardEl && pane && cardCtl), had = cbar && cbar.dataset.k === (card ? "card" : "list"), playIcon = cbar?.querySelector(".vk-snd")?.textContent;
  if (!cbar) { cbar = document.createElement("div"); cbar.className = "vk-cbar"; cbar.setAttribute("role", "toolbar"); cbar.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b || b.disabled) return; e.preventDefault(); e.stopPropagation(); if (b.dataset.v === "fs") return toggleFs(); cardCtl?.act(b.dataset.v, b); }); cbar.addEventListener("pointerdown", e => { if (e.target.closest("button:not(:disabled)")) tok(); }); }
  cbar.dataset.k = card ? "card" : "list";
  if (!cbarRO && typeof ResizeObserver === "function") cbarRO = new ResizeObserver(() => fitCBar());
  cbarRO?.disconnect(); cbarRO?.observe(cbar);
  const cb = card ? ctlBtns(cardCtl) : ["", ""];
  cbar.innerHTML = `<span class="vk-cl">${cb[0]}</span><span class="vk-cc">${cb[1]}</span><span class="vk-cr">${fsBtn()}</span>`;
  if (had && playIcon) { const b = cbar.querySelector(".vk-snd"); if (b) b.textContent = playIcon; }
  placeCBar(); fitCBar();
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
  stopWordSound(); autoCancel(); const el = cardEl; cardEl = null;
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
export function openWordCard(it, { before, fromList = false, piece = null, ents: ents0 = null, autoRun = "", autoPos = -1, lseq = null, lpos = -1, keep = false, pLast = false } = {}) { // lseq·lpos = 단어장에서 연 카드의 「보이는 순서」(단어 → 그 조각들 → 다음 단어…) 줄 목록과 이 카드 자리(자동 이어 듣기 · 대표님 11-20 13:17) · keep = 자동으로 넘어갈 때 단어장은 닫지 않음 // piece = 단어장에서 조각 줄을 눌러 바로 그 조각 카드로(조각 id) · ents = 조각 사전 항목
  closeCard(keep && !!lseq); autoHold(false); wakeOn(); claim("card"); // 어디서 열든(읽기 창·단어장 목록) 다른 소리는 멈춤 — before 를 안 넘겨도 하나
  let view = piece || null; // 지금 보는 조각 id(없으면 구절 카드)
  const saved = () => (view ? has("p:" + view) : has(it.w)), romanNow = () => (document.querySelector(".exv.norom") ? "" : (lang === "ne" && it.note?.dev) || it.rom); // 네팔어 학습자 = 데바나가리 발음(dev) · 발음 토글(.norom)이 끄면 숨김
  const el = (cardEl = document.createElement("div"));
  el.className = "vk-dim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  toPane(el); // 배우는 화면이면 영상 칸 안에서(11-18 13:56 · 단어장 붙임 코드 그대로) · 그 밖의 화면은 예전처럼 겹쳐 뜸
  let pc = null, ents = ents0, act = null; // 조각 자료
  cardCtl = { act: (v, b) => act?.(v, b), back: () => (view ? (piece ? "lback" : "back") : fromList && listEl ? "lback" : "close"), add: () => (view ? "padd" : "add"), saved, auto: () => autoElig(), next: () => autoElig(), prev: () => canPrev(), two: () => !!(view ? ents?.find(x => x.id === view) : it.note) }; // 조작 막대가 부르는 손잡이
  // ── 자동 이어 듣기(대표님 11-19 14:11) — 카드 소리가 끝나면 1.0초 뒤 다음 카드(단어 카드 = 자막 낱말 순서 · 조각 카드 = 같은 낱말 남은 조각 → 다음 낱말 조각) · 뒤 영상도 그 줄 장면으로
  let apos = lseq ? lpos : fromList || piece || !cardNav?.live?.() ? -1 : (cardNav.locate?.(it) ?? -1); // 이 카드의 자막 순서 자리(없으면 자동 단추 없음) · 단어장 카드 = 줄 목록 자리
  const wpos = lpos; let lcur = lpos; // 단어장 카드: wpos = 단어 카드 자리 · lcur = 지금 보는 줄(단어 카드 안 조각 칩을 누르면 그 조각 줄 자리)
  const autoElig = () => (lseq ? lcur >= 0 : apos >= 0 && !!pane && !fromList && !piece);
  const aKind = () => (view ? "piece" : "word");
  const aMark = () => { if (autoElig()) { const k = view && pc?.pieces ? pc.pieces.indexOf(view) : -1; autoAt(aKind(), lseq ? lcur : view ? apos + (k + 1) / 100 : apos, aNext); } };
  const aGo = async kind => { // 다음 낱말 카드(kind=word) / 다음 낱말의 첫 조각(kind=piece · 조각 없는 낱말은 건너뜀)
    let p = apos; for (;;) {
      p++; const nx = await cardNav.at(p); if (cardEl !== el) return; if (!nx) return aEnd(kind);
      if (kind === "piece") { const pcs = await pcOf(nx.it.ep); if (cardEl !== el) return; if (!pcs?.cards?.[clean(nx.it.w)]?.pieces?.length) continue; }
      cardNav.commit(nx); openWordCard(nx.it, { before: nx.before, autoRun: kind, autoPos: p }); return;
    }
  };
  const aEnd = kind => { // 끝 카드 — 「처음부터 다시」
    const host = document.querySelector(".learn") || document.body;
    showAutoEnd(kind, host, { title: tx("auto_end"), again: tx("auto_again"), close: tx("close"), onAgain: () => aRestart(kind), onClose: () => { if (cardEl === el) closeCard(); } });
  };
  const aRestart = async kind => { let p = -1; for (;;) { p++; const nx = await cardNav.at(p); if (!nx) return; if (kind === "piece") { const pcs = await pcOf(nx.it.ep); if (!pcs?.cards?.[clean(nx.it.w)]?.pieces?.length) continue; } cardNav.commit(nx); openWordCard(nx.it, { before: nx.before, autoRun: kind, autoPos: p }); return; } };
  const aGoL = async p => { // 단어장 순서대로 다음 줄(단어 또는 조각) 카드 · 끝이면 끝 카드
    const nx = lseq[p]; if (!nx) return aEndL();
    if (nx.kind === "piece") { const dc = await dictOf(); if (cardEl !== el) return; if (!dc?.entries) return aEndL(); openWordCard({ w: nx.w, rom: "", mean: nx.mean, ep: nx.ep, n: nx.n, ko: "", tr: "" }, { fromList: true, piece: nx.pid, ents: dc.entries, lseq, lpos: p, keep: true }); }
    else openWordCard(nx, { fromList: true, lseq, lpos: p, keep: true });
  };
  const aEndL = () => {
    const host = document.querySelector(".learn") || document.body;
    showAutoEnd(aKind(), host, { title: tx("auto_end"), again: tx("auto_again"), close: tx("close"), onAgain: () => { if (cardEl === el) aGoL(0); }, onClose: () => { if (cardEl === el) closeCard(true); } });
  };
  const aNext = () => { // 지금 카드가 끝났다 치고 다음으로(단추·__auto.next())
    if (cardEl !== el || !autoElig()) return;
    if (lseq) return aGoL(lcur + 1);
    if (view) { const ids = pc?.pieces || [], k = ids.indexOf(view); if (k >= 0 && k < ids.length - 1) { stopRead(); view = ids[k + 1]; toPane(el); draw(); aMark(); startNote(); return; } return aGo("piece"); }
    return aGo("word");
  };
  const canPrev = () => { if (!autoElig()) return false; if (lseq) return lcur > 0; const k = view && pc?.pieces ? pc.pieces.indexOf(view) : -1; return apos > 0 || k > 0; };
  const aBack = async kind => { // 앞 낱말 카드(kind=word) / 앞 낱말의 마지막 조각(kind=piece · 조각 없는 낱말은 건너뜀) · 없으면 그대로
    let p = apos; for (;;) {
      p--; if (p < 0) return; const nx = await cardNav.at(p); if (cardEl !== el) return; if (!nx) return;
      if (kind === "piece") { const pcs = await pcOf(nx.it.ep); if (cardEl !== el) return; if (!pcs?.cards?.[clean(nx.it.w)]?.pieces?.length) continue; }
      cardNav.commit(nx); openWordCard(nx.it, { before: nx.before, autoRun: kind, autoPos: p, pLast: true }); return;
    }
  };
  const aPrev = () => { // 이전 ‹ = 다음 › 과 같은 순서의 바로 앞 카드(첫 카드면 아무 일 없음)
    if (cardEl !== el || !canPrev()) return;
    if (lseq) return aGoL(lcur - 1);
    if (view) { const ids = pc?.pieces || [], k = ids.indexOf(view); if (k > 0) { stopRead(); view = ids[k - 1]; toPane(el); draw(); aMark(); startNote(); return; } return aBack("piece"); }
    return aBack("word");
  };
  const aFinished = () => { if (cardEl !== el || !autoElig() || !autoOn()) return; autoSchedule(() => { if (cardEl !== el || !autoOn() || autoHeld()) return; aNext(); }); }; // 소리 끝 → 1.0초 뒤
  const aTap = () => { // 카드 안 톡 = 멈춤(기다리는 중이면 기다림 취소) · 멈춘 뒤 톡 = 이어서
    if (autoPending()) { autoCancel(); autoHold(true); return true; }
    if (autoHeld() && !isReading()) { autoHold(false); startNote(); return true; }
    return false;
  };
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
  if (autoPos >= 0) apos = autoPos; if (autoRun === "piece") el.style.visibility = "hidden"; aMark(); markAuto(autoLabel);
  before?.(); // 카드가 열리면 바깥 소리(설명 읽기)는 그 자리에서 멈춤 — 카드 소리만
  draw();
  const curNote = () => { const pe = view && ents?.find(x => x.id === view); return pe ? pnote(pe) : it.note; }; // 지금 보는 카드의 설명(구절 카드 또는 조각 카드)
  const startNote = (bk, wi = -1) => { const nt = curNote(); if (nt && cardEl === el) { const v = view; showWait(el); it.__done = null; autoHold(false); autoCancel(); aMark(); readNote(el, it, nt, uiKoOn(), it.order, { from: Math.max(0, noteBlocks(nt).findIndex(x => x.b === bk)), wi, done: aFinished, both: twoOn, url: v ? (l, b) => `snd/dict/${v}_${l}_${b}.mp3?v=10` : null }); if (!isReading()) aFinished(); } }; // 설명 읽기 화면처럼 열리면 저절로 시작
  const onLang = () => { if (cardEl !== el) return removeEventListener("malmun:uilang", onLang); const ko = uiKoOn(), c = el.querySelector(".vk-card"); if (c) { applyMode(c, ko); const u = c.querySelector(".vk-uiko"); u?.setAttribute("aria-pressed", String(ko)); c.querySelectorAll(".vk-snd").forEach(x => { x.setAttribute("aria-label", tx("listen")); x.title = tx("listen"); }); syncCBar(); } switchRead(ko); if (isReading()) autoHold(false); }; // 멈춘(톡) 뒤 ⇄ 로 다시 읽기 시작하면 멈춤 표시 풀기(D-115) · 다시 그리지 않고 보임만 바꿈 · ⇄ = 읽던 블록·그 위치에서 새 말로(처음으로 안 감 · 멈춰 있으면 멈춘 채)
  addEventListener("malmun:uilang", onLang);
  const sync = setInterval(() => { if (cardEl !== el) return clearInterval(sync); const b = document.querySelector(".vk-snd"), t = isReading() && !isPaused() ? "⏸" : "▶"; if (b && b.textContent !== t && curNote()) b.textContent = t; }, 100);
  el.addEventListener("click", e => {
    let b = e.target.closest("[data-v]"); if (b && !el.contains(b)) b = null; // 위쪽 칸의 data-v 를 잡지 않게
    if (!b) { if (!e.target.closest(".vk-card")) closeCard(); else if (autoElig() && autoOn() && !e.target.closest(".vk-note") && !e.target.closest(".vk-uiko")) { if (!aTap() && !toggleRead()) startNote(); } else if (curNote() && !e.target.closest(".vk-uiko") && (e.target.closest(".vk-note") || !hitText(e.target.closest(".vk-card"), e))) { if (autoElig() && autoOn() && aTap()) return; const bk = e.target.closest(".vk-blk")?.dataset.b, kw = e.target.closest(".vk-line .kw"), wi = kw ? [...kw.parentNode.querySelectorAll(".kw")].indexOf(kw) : -1; autoHold(false); const blank = bk && wi < 0 && !hitText(e.target.closest(".vk-blk"), e); if (!(bk && !blank ? (wi >= 0 ? tapWord(bk, wi) : tapBlock(bk)) : toggleRead())) startNote(blank ? undefined : bk, wi); } return; } // 화면 밖 = 닫힘 · 다른 블록 톡 = 그 블록부터 · 읽는 블록 톡 = 멈춤⇄이어서 · 다 읽은 뒤 톡 = 처음부터
    e.stopPropagation(); act(b.dataset.v, b);
  });
  act = (v, b) => {
    if (v === "auto") { const on = !autoOn(); setAuto(on); autoHold(false); if (!on) autoCancel(); else if (!isReading() && !autoPending()) aFinished(); return; } // 자동 켜기/끄기(하나의 설정) · 이미 끝나 있었으면 바로 이어 감
    if (v === "prev") { autoCancel(); aPrev(); return; } // 이전 ‹ = 다음 › 의 거꾸로
    if (v === "next") { autoCancel(); aNext(); return; } // 다음 › = 자동 켬·끔과 무관하게 자동이 넘어가는 것과 같은 순서의 다음 카드(마지막이면 끝 카드)
    if (v === "two") { setTwo(!twoOn()); return; } // 두 말 켬/끔(기억)
    if (v === "fs") { toggleFs(); return; } // ⛶ = 칸 통째 전체 화면 ⇄ 나가기
    if (v === "close") { if (pane && fsOn()) exitFs(); else closeCard(); return; } // 전체 화면 중 ✕ = 먼저 칸 안으로 · 다시 ✕ = 영상 자리로 // ✕ = 바깥 누르기와 똑같이 닫힘
    if (v === "piece") { stopRead(); view = b.dataset.p; if (lseq && !piece) { let j = wpos + 1; while (lseq[j]?.kind === "piece" && lseq[j].pid !== view) j++; if (lseq[j]?.kind === "piece") lcur = j; aMark(); } toPane(el); draw(); startNote(); return; } // 조각 카드(글만)
    if (v === "lback") { closeCard(true); return; } // ← = 단어장 목록 그 쪽·그 위치로(목록은 숨겨 둔 채 그대로 있었음)
    if (v === "back") { stopRead(); view = null; if (lseq) { lcur = wpos; aMark(); } draw(); startNote(); return; } // 조각 카드 ← = 카드(칸 안 그대로)
    if (v === "snd") { // ▶ = 처음부터 다시(설명 읽기 · 낱말 소리는 따로 안 냄)
      if (autoHeld()) { autoHold(false); if (!isReading()) { startNote(); return; } }
      if (curNote()) { if (isReading()) toggleRead(); else startNote(); return; } // ▶/⏸ — 읽는 중 = 멈춤 · 멈춤 = 이어서 · 끝난 뒤 = 처음부터
      showWait(el); stopRead(); it.__done = null;
      return playSnd(it, b, before);
    }
    if (v === "add") { if (has(it.w)) drop(it.w); else put(it); draw(); syncCBar(); return; }
    if (v === "padd") { const e = ents?.find(x => x.id === view); if (e && has("p:" + e.id)) { drop("p:" + e.id); draw(); syncCBar(); } else if (e) { put({ kind: "piece", pid: e.id, w: e.lemma, rom: "", dev: e.dev || "", mean: e.pos_ne || "", ep: it.ep, n: it.n }); draw(); syncCBar(); } return; } // 조각도 단어장에(줄 하나 · 개수 1)
  };
  if (!pane) host().append(el);
  if (it.ep) Promise.all([noteOf(it.ep), pcOf(it.ep), dictOf()]).then(([n, pcs, dc]) => { if (cardEl !== el) return; const x = n?.[clean(it.w)]; pc = pcs?.cards?.[clean(it.w)] || null; ents = dc?.entries || null; if (x) { it.note = x; it.key = clean(it.w); it.order = n._order || []; } if (autoRun !== "piece" && (x || view || (pc && ents))) { draw(); if (x || view) startNote(); }
    if (autoRun === "piece" && pc?.pieces?.length && ents) { stopRead(); view = pLast ? pc.pieces[pc.pieces.length - 1] : pc.pieces[0]; toPane(el); draw(); startNote(); el.style.visibility = ""; } // 자동 조각 이어 듣기 = 새 낱말의 첫 조각 카드로 바로
    else if (autoRun === "piece") { el.style.visibility = ""; aFinished(); } // 조각 없음 = 다음으로
    else if (!x && !view && autoElig() && autoOn()) { if (it.af) { it.__done = aFinished; playSnd(it, null, before); } else aFinished(); } // 설명이 없는 낱말 = 낱말 소리 한 번 뒤 다음으로
    aMark(); }); // 설명이 있으면 문장 자리를 설명으로 · 조각 자료가 있으면 칩
  return el;
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && cardEl) closeCard(!!listEl); });

// 「톡」 — 새 소리 파일 없이 sfx.js 합성 소리 한 개(0.05초) · 읽기·카드 낭독·영상 등 다른 소리가 나는 중이면 안 냄(소리는 하나 · onesound)
sfx.defineSynth("tok", mk => { const c = mk(1, 0.07), o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(900, 0); o.frequency.exponentialRampToValueAtTime(420, 0.05); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.22, 0.004); g.gain.exponentialRampToValueAtTime(0.001, 0.06); o.connect(g); g.connect(c.destination); o.start(0); o.stop(0.07); return c.startRendering(); });
const otherSound = () => sfx.playing() || isReading() || !!au || [...document.querySelectorAll("audio,video")].some(m => !m.paused && !m.ended);
const tok = () => {}; // 누르는 「톡」은 이제 앱 전체 한 곳(js/tick.js · Web Audio 틱 · 학습 소리 안 끊음) — 여기서 따로 안 냄(소리 두 번 방지)

// ── 단어장 목록(대표님 11-18 13:07) — 배우는 화면에서는 영상 칸 자리 안에서 열림(설명 창이 열리는 자리 · 다른 칸 크기·배치 불변) · 그 밖의 화면은 예전처럼 겹쳐 뜸
//    열면 영상 멈춤 · 오른쪽 위 ✕ = 닫고 영상 자리로 · 단어 누르면 카드 · ⇄ = 앱 전체 하나(한국어 쪽: 단어·발음·뜻 / 네팔어 쪽: 뜻·단어·발음)
let listEl = null, listOff = [];
// 단어장 조각 줄 = 그 조각 카드를 영상 칸 안에서(조각 사전은 한 번 받아 둔 것)
function openPieceFromList(it, lseq = null, lpos = -1) { dictOf().then(dc => { if (dc?.entries) openWordCard({ w: it.w, rom: "", mean: it.mean, ep: it.ep, n: it.n, ko: "", tr: "" }, { fromList: true, piece: it.pid, ents: dc.entries, lseq, lpos }); }); }
export function closeVocabList() {
  closeCard(); listOff.forEach(f => { try { f(); } catch {} }); listOff = [];
  const st = listEl?.closest?.(".vstage"); listEl?.remove(); listEl = null; if (st) stageFree(st); wakeOff();
}
// ── 두 탭(대표님 11-19 14:42) — 「전체」= 편의 모든 단어 카드(+조각) 자동 · 「내가 담은」= ⭐ 한 것만 · 고른 탭은 기억
const TABKEY = "malmun.vocab.tab"; // 11-19 16:08 대표님: 탭도 기억 안 함 — 열 때마다 「전체」 · 옛 저장값은 지움
const dropTab = () => { try { localStorage.removeItem(TABKEY); } catch {} };
dropTab();
const loadTab = () => { dropTab(); return "all"; };
let allMem = null; // 전체 탭 자료(편마다 한 번만 읽음)
export const allWords = () => (allMem ||= (async () => {
  const cat = await catalog().catch(() => null), parents = [], seen = new Set();
  for (const e of (cat?.episodes || []).filter(x => x.ready)) {
    let E = null; try { E = await episode(e.id, lang); } catch {} if (!E) continue;
    let order = 0;
    for (const line of E.lines || []) for (const c of line.v9?.pieces || []) {
      const k = clean(c.ko); if (!k || seen.has(k)) continue; seen.add(k);
      const sp = await wordSpan(e.id, line, c.ko);
      parents.push({ w: c.ko, rom: c.rom || "", mean: c.mean || "", ep: e.id, n: line.id, af: line.lineAudio || "", s: sp.s, e: sp.e, ko: line.ko, tr: line.v9?.tr || line.tr || "", order: order++ });
    }
  }
  return parents;
})());
// 단어 하나의 조각 줄(단어 바로 아래 · 같은 조각이 여러 단어에 있어도 단어마다 따로) — ⭐ 로 담는 조각과 같은 모양
let entMap = null;
async function subsCtx(eps) { // 편마다 조각 표 한 번 · 사전 한 번 읽고 나면 단어마다 바로(1만 개여도 빠르게)
  const [dc, ...pcs] = await Promise.all([dictOf(), ...eps.map(pcOf)]); entMap ||= new Map((dc?.entries || []).map(e => [e.id, e]));
  const byEp = Object.fromEntries(eps.map((ep, i) => [ep, pcs[i]]));
  return x => (x.kind === "piece" || !x.ep ? [] : (byEp[x.ep]?.cards?.[clean(x.w)]?.pieces || []).map(id => entMap.get(id)).filter(Boolean).map(e => ({ kind: "piece", pid: e.id, w: e.lemma, rom: "", dev: e.dev || "", mean: e.pos_ne || "", ep: x.ep, n: x.n })));
}

export function openVocabList() {
  closeVocabList(); wakeOn();
  const stage = document.querySelector(".learn .vstage"), el = (listEl = document.createElement("div"));
  if (stage) { el.className = "vk-pane"; stageLock(stage); } // 칸 크기 그대로(영상 칸 높이 · 다른 칸 안 밀림) · 영상 멈춤 · 아래 막대 바탕만 // 영상·읽기 소리 멈춤(닫아도 멈춘 채)
  else { el.className = "vk-dim vk-listdim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); }
  const devOf = (x, N) => (lang === "ne" && (x.kind === "piece" ? x.dev : N[x.ep]?.[clean(x.w)]?.dev)) || ""; // 목록 발음 줄 = 카드와 같은 자료(note.dev · 학습자 글자) · 없으면 비움(로마자로 되돌리지 않음 · 대표님 11-18)
  let shownN = null, tstT = 0, popKey = null;
  const bump = b => { if (!b) return; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }; // 배지 톡 튐 ~200ms
  const toast = k => { let t = el.querySelector(".vk-tst"); if (!t) { t = document.createElement("div"); t.className = "vk-tst"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); el.append(t); } t.textContent = "⭐ " + tx(k); t.classList.remove("on"); void t.offsetWidth; t.classList.add("on"); clearTimeout(tstT); tstT = setTimeout(() => t.classList.remove("on"), 1200); };
  let N = {}, tab = loadTab(), subs = new Map(), byKey = new Map(), mode = loadSort(), offDrag = null, cur = 0, all = [], view = [], devMap = new Map(), pager = null, ul = null, wrap = null;
  const on0 = (t, f, o) => { addEventListener(t, f, o); listOff.push(() => removeEventListener(t, f, o)); };
  const find = makeFindBox(() => { cur = 0; drawList(); }, uiKoOn()); // 찾기 칸(앱 칩 모양) — 한 번 만들어 계속 씀(글·초점 유지)
  const rowTx = (x, ko) => { const d = devMap.get(x) || "", w = `<span class="vk-t ko" lang="ko">${esc(x.w)}</span>`, r = d ? `<span class="vk-rom" lang="ne">${esc(d)}</span>` : "", m = `<span class="vk-t vk-mean" lang="ne">${esc(x.mean || "")}</span>`; return ko ? w + r + m : m + w + r; };
  const mountPager = () => { // 쪽 넘김 = 영상 칸 아래 갈색 막대(.seek · 목록이 열려 있는 동안 바탕만 남은 자리) · 영상 칸이 없는 화면은 목록 맨 아래 갈색 줄
    const seek = stage ? document.querySelector(".learn .seek") : null, host = seek || el.querySelector(".vk-sheet") || el;
    if (pager && pager.host === host) return;
    pager?.destroy(); pager = makePager(host, p => { cur = p; drawList(); }, !seek); pager.host = host;
  };
  const filterGroups = q => all.filter(x => filterItems([x], q, d => devMap.get(d)).length || (subs.get(x) || []).some(sx => filterItems([sx], q, d => devMap.get(d)).length)); // 찾기 = 단어 또는 그 조각 어느 쪽이든 맞으면 단어째 남김(걸러내는 곳은 여기 한 곳)
  const scrollToRow = i => { const li = ul?.querySelectorAll(".vk-li")[i]; if (li) ul.scrollTop += li.getBoundingClientRect().top - ul.getBoundingClientRect().top - (mode === "ep" ? 26 : 2); };
  const drawList = (focusIdx = -1) => { // 쪽 안만 다시 그림 — 찾기·쪽 넘기기·색인은 여기(1만 개여도 20줄만 그림)
    if (listEl !== el || !ul) return;
    const ko = uiKoOn(), L = ko ? "ko" : "ne";
    view = filterGroups(find.value()); cur = clampPage(cur, view.length); // 쪽 = 단어(윗줄)만 셈 · 조각 줄은 단어 밑에 그대로
    byKey.clear(); const isAll = tab === "all", T = k => esc(tx(k));
    const star = x => { const sv = has(kOf(x)); return isAll ? `<button class="vk-st" data-v="st" data-w="${esc(kOf(x))}" aria-pressed="${sv}" aria-label="${T(sv ? "offRow" : "addRow")}">${sv ? "⭐" : "☆"}</button>` : ""; };
    const one = (x, cls) => { byKey.set(kOf(x), x); return `<li class="${cls}"><button class="vk-pl" data-v="pl" data-w="${esc(kOf(x))}" aria-label="${T("listen")}" title="${T("listen")}">▶</button><button class="vk-lb" data-w="${esc(kOf(x))}">${rowTx(x, ko)}</button>${star(x)}</li>`; };
    const rows = x => one(x, "vk-li") + (subs.get(x) || []).map(sx => one(sx, "vk-sub")).join("");
    const pg = slicePage(view, cur);
    ul.innerHTML = mode === "ep" ? groupByEp(pg, ko, view).map(g => (g.head ? `<li class="vp-grp" aria-hidden="true">${esc(g.head)}</li>` : "") + rows(g.x)).join("") : pg.map(rows).join("");
    wrap.querySelector(".vk-empty")?.remove(); ul.hidden = !pg.length;
    const ik = mode === "abc" && pg.length ? `${L}|${find.value()}|${view.length}` : "", idx = wrap.querySelector(".vp-idx"); // 색인 막대는 같은 목록이면 그대로 둠(쪽이 바뀌어도 미끄러뜨리는 손가락이 안 끊김)
    if (idx && idx.dataset.ik !== ik) idx.remove();
    if (!pg.length) wrap.insertAdjacentHTML("afterbegin", `<p class="vk-empty">${esc(findTx("nofound", ko))}</p>`);
    else if (ik && !wrap.querySelector(".vp-idx")) { const ib = wrap.appendChild(makeIndexBar(indexLetters(view, L), i => { const p = Math.floor(i / PAGE); if (p !== cur) { cur = p; drawList(i % PAGE); } else scrollToRow(i % PAGE); }, ko)); ib.dataset.ik = ik; } // 가나다 색인 = 글자 있는 쪽·줄로
    ul.scrollTop = 0; if (!isAll) ul.querySelectorAll(".vk-li").forEach((li, i) => attachDelete(li, pg[i], it => drop(kOf(it)), L)); // 휴지통 = 「내가 담은」 탭만
    pager?.update(cur, pageCount(view.length), ko);
    if (focusIdx >= 0) scrollToRow(focusIdx);

  };
  // ── 외우기(대표님 11-20 15:10~15:38) — 탭 줄 셋째 칩 「외우기」 → 전용 보기: 단어장 조각(낱낱 단어)만 · 순서대로 · 한국어 낱말 소리 → 짧은 뜻 소리(⇄ 순서) · 묶음 머리 없음 · 같은 조각은 처음 한 번만
  let memoOn = false, mseq = [], mbar = null, mview = null, memoMap = null, tmpN = 0;
  fetch("data/memo_map.json?v=" + VERSION).then(r => (r.ok ? r.json() : null)).then(j => { memoMap = j; }).catch(() => {});
  const mapOf = it => { const m = memoMap; if (!m) return null; const c = clean(it.w), k = it.kind === "piece" ? "p:" + it.pid : "w:" + c; return m[it.ep]?.[k] || m[k] || m[it.ep]?.[c] || m[c] || null; };
  const sndOf = (m, f) => { let v = m?.[f]; if (Array.isArray(v)) v = v[0]; return typeof v === "string" && /^snd\//.test(v) ? v : null; }; // 앱 안 상대 주소만 · 아직 없는 항목은 null → 뜻풀이 첫 문장(임시)
  const mname = (it, m) => (m && m.mode === "word" && (m.ne_word || m.list_ne)) || it.mean || ""; // 뜻 낱말 · 짝 없으면 갈래 이름
  const mkSeq = () => { const out = [], seen = new Set(), add = x => { const k = x.kind === "piece" ? "p:" + x.pid : "w:" + clean(x.w); if (!seen.has(k)) { seen.add(k); out.push(x); } }; for (const x of view) { if (x.kind === "piece") { add(x); continue; } const sb = subs.get(x) || []; if (sb.length) sb.forEach(add); else add(x); } return out; }; // 묶음 머리는 빼고 조각만(조각 없는 낱말은 그 낱말 자체가 조각 하나)
  const memo = createMemo({
    seq: () => mseq, ko: () => uiKoOn(), host: () => document.querySelector(".learn") || document.body,
    show: i => { const lis = mview?.querySelectorAll("li") || []; lis.forEach(e => e.classList.remove("vm-on")); mview?.querySelectorAll(".vm-say").forEach(e => e.classList.remove("vm-say")); if (i < 0) return; const li = lis[i]; if (!li) return; li.classList.add("vm-on"); const u = mview, off = li.getBoundingClientRect().top - u.getBoundingClientRect().top - (u.clientHeight - li.offsetHeight) / 2; u.scrollTo ? u.scrollTo({ top: u.scrollTop + off, behavior: off && Math.abs(off) < 900 ? "smooth" : "auto" }) : (u.scrollTop += off); },
    side: (i, l) => { const li = mview?.querySelectorAll("li")[i]; li?.querySelectorAll(".vm-say").forEach(e => e.classList.remove("vm-say")); if (l && li) li.querySelector(l === "ko" ? ".vm-k" : ".vm-m")?.classList.add("vm-say"); },
    stopWord: () => stopWordSound(),
    word: async (it, done, guard) => { const ids = it.kind !== "piece" && it.ep && it.n != null ? await unitsFor(it.ep, it.n, it.w) : null; if (!ids?.length && !(it.kind !== "piece" && it.af)) return done(); it.__done = done; guard(() => playSnd(it, null, null, ids || null)); },
    mean: it => { if (it.kind === "piece") { const e = entMap?.get(it.pid); return e ? { note: pnote(e), url: l => `snd/dict/${it.pid}_${l}_mean.mp3?v=10` } : null; } const nt = N[it.ep], k = clean(it.w), no = (nt?._order || []).indexOf(k) + 1; return nt?.[k] && no ? { note: nt[k], url: l => `snd/wordnote/${it.ep}/${no}_${l}_mean.mp3?v=10` } : null; },
    shortUrl: (it, l) => { const m = mapOf(it); if (!m) return null; if (l === "ko") return sndOf(m, "ko_snd"); return m.mode === "word" ? sndOf(m, "ne_word_snd") : null; }, // 짧은 소리(조각 한국어 낱말·짧은 뜻 낱말) · 없으면 뜻풀이 첫 문장(임시) · mean 항목은 뜻풀이 한 문장
    onState: () => drawMemo(),
  });
  const mrow = (it, ko, i) => { const m = mapOf(it), d = devMap.get(it) || it.dev || "", k = `<span class="vm-k ko" lang="ko">${esc(it.w)}</span>`, r = d ? `<span class="vm-r" lang="ne">${esc(d)}</span>` : "", n = `<span class="vm-m" lang="ne">${esc(mname(it, m))}</span>`; return `<li class="vm-row"><button type="button" class="vm-lb" data-i="${i}">${ko ? k + r + n : n + k + r}</button></li>`; };
  const drawMemoRows = () => { if (!mview) return; const ko = uiKoOn(); mview.innerHTML = mseq.map((it, i) => mrow(it, ko, i)).join(""); tmpN = mseq.filter(it => { const m = mapOf(it); return !(m && sndOf(m, "ko_snd") && (m.mode === "mean" || sndOf(m, "ne_word_snd"))); }).length; window.__memo.temp = tmpN; window.__memo.n = mseq.length; };
  const drawMemo = () => { // 전용 보기 갈색 막대(‹ 돌아가기 · ▶/⏸ · ×N) — 쪽 넘김 막대 자리(목록 화면에는 없음)
    if (listEl !== el) return; const host = stage ? document.querySelector(".learn .seek") : el.querySelector(".vk-sheet") || el; if (!host) return;
    if (!memoOn) { mbar?.remove(); mbar = null; host.classList.remove("vm-has", "vm-mv"); host.style.removeProperty("--vmw"); return; }
    if (!mbar || mbar.parentNode !== host) { mbar?.remove(); mbar = document.createElement("div"); mbar.className = "vm-bar" + (stage ? "" : " vm-foot"); mbar.setAttribute("role", "toolbar"); host.append(mbar); }
    host.classList.add("vm-mv"); mbar.innerHTML = memoBtns(memo, uiKoOn());
  };
  const enterMemo = (auto = true) => { memoOn = true; mseq = mkSeq(); el.classList.add("vk-mv"); mview = el.querySelector(".vm-view"); if (!mview) return; mview.hidden = false; drawMemoRows(); el.querySelectorAll(".vk-tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.t === "memo"))); drawMemo(); mview.scrollTop = 0; if (auto && mseq.length) memo.jump(0); };
  const leaveMemo = () => { memo.reset(); memoOn = false; el.classList.remove("vk-mv"); if (mview) { mview.hidden = true; mview.innerHTML = ""; } el.querySelectorAll(".vk-tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.t === tab))); drawMemo(); };
  const memoClick = e => { const b = e.target.closest?.("[data-vm]"); if (!b || !mbar?.contains(b)) return; e.preventDefault(); e.stopPropagation(); if (b.dataset.vm === "rep") memo.cycle(); else if (b.dataset.vm === "back") leaveMemo(); else memo.toggle(); };
  listOff.push(() => { memo.stop(); mbar?.remove(); mbar?.parentNode?.classList.remove("vm-has", "vm-mv"); mbar = null; document.querySelector(".learn .seek")?.classList.remove("vm-has", "vm-mv"); });
  on0("click", memoClick, true);
  const draw = async () => {
    const L = uiKoOn() ? "ko" : "ne", isAll = tab === "all", pend = tab, src = isAll ? await allWords() : read();
    all = sortItems(src, mode, L); const total = all.length;
    await Promise.all([...new Set(all.map(x => x.ep).filter(Boolean))].map(async ep => { N[ep] = await noteOf(ep); }));
    const sf = await subsCtx([...new Set(all.map(x => x.ep).filter(Boolean))]); if (listEl !== el || pend !== tab) return;
    subs = new Map(all.map(x => [x, sf(x)]));
    const ko = uiKoOn(); devMap = new Map(); for (const x of all) { devMap.set(x, devOf(x, N)); for (const sx of subs.get(x)) devMap.set(sx, devOf(sx, N)); } find.setLang(ko);
    const tb = (t, k) => `<button type="button" class="vk-tab" role="tab" data-v="tab" data-t="${t}" aria-selected="${tab === t && !memoOn}"><b>${esc(tx(k))}</b>${t === "mine" ? `<span class="vk-cnt vk-mn" data-n="${vocabCount()}">${cntHTML(vocabCount())}</span>` : tab === t ? `<span class="vk-cnt">${cntHTML(total)}</span>` : ""}</button>`; // 「내가 담은」 탭 배지 = 어느 탭에서도 늘 보임(담은 개수 · 단어+조각 각 1 · 대표님 11-19 15:53)
    const body = `<div class="vk-head"><span class="vk-tt" role="tablist">${tb("all", "tabAll")}${tb("mine", "tabMine")}${total ? `<button type="button" class="vk-tab vk-memotab" role="tab" data-v="tab" data-t="memo" aria-selected="${memoOn}" aria-label="${esc(TXM[uiKoOn() ? "ko" : "ne"].go)}"><b><span class="vm-full">${esc(TXM[uiKoOn() ? "ko" : "ne"].go)}</span>${uiKoOn() ? "" : `<span class="vm-short">${esc(TXM.ne.tab)}</span>`}</b></button>` : ""}</span><span class="vk-sortslot"></span><span class="vk-uik">${uikoChip()}</span></div>
      ${total ? `<div class="vp-frow"><span class="vp-findslot"></span></div><div class="vp-wrap"><ul class="vk-ul flick"></ul></div><ul class="vm-view vk-ul flick" hidden></ul>` : `<p class="vk-empty">${esc(tx("empty"))}</p>`}`;
    el.innerHTML = stage ? `${XBTN}${body}` : `<div class="vk-sheet">${XBTN}${body}</div>`;
    { const n = vocabCount(); if (shownN != null && shownN !== n) bump(el.querySelector(".vk-mn")); shownN = n; }
    offDrag?.(); offDrag = null; ul = el.querySelector(".vk-ul"); wrap = el.querySelector(".vp-wrap");
    el.querySelector(".vk-sortslot")?.append(makeSortButton(() => mode, m => { mode = m; cur = 0; draw(); }, L, k => (k.startsWith("vlist.") ? k : tx(k))));
    el.querySelector(".vp-findslot")?.replaceWith(find); mountPager();
    if (ul) { offDrag = attachDragScroll(ul, { friction: 0.95, threshold: 6, wheel: true }); drawList(); } else pager?.update(0, 1, ko);
    const mWas = memoOn, mRun = memo.st().running, mIdx = memo.st().idx; memo.reset(); mview = null; el.classList.remove("vk-mv"); if (mWas && total) { enterMemo(false); if (mRun) memo.jump(Math.min(mIdx, mseq.length - 1)); } else { memoOn = false; drawMemo(); } // 탭·정렬로 새로 그려지면 외우기 닫힘 · ⇄ 로 새로 그리면 외우기 보기는 남아 지금 줄부터 바뀐 순서로
  };
  draw();
  el.addEventListener("click", e => {
    if (e.target.closest(".vk-fs")) return toggleFs();
    if (e.target.closest(".vk-x")) return fsOn() ? exitFs() : closeVocabList(); // 전체 화면 중 ✕ = 먼저 칸 안으로 · 다시 ✕ = 영상 자리로
    if (e.target === el && !stage) return closeVocabList();
    const tb = e.target.closest(".vk-tab"); if (tb) { if (tb.dataset.t === "memo") { if (!memoOn) enterMemo(); return; } if (memoOn && tb.dataset.t === tab) return leaveMemo(); if (tb.dataset.t !== tab) { memoOn = false; tab = tb.dataset.t; cur = 0; draw(); } return; } // 탭 바꿈(열려 있는 동안만)
    const st = e.target.closest(".vk-st"); if (st) { const it = byKey.get(st.dataset.w); if (it) { const k = kOf(it), was = has(k); popKey = k; toast(was ? "tDel" : "tAdd"); if (was) drop(k); else put(it); } return; } // 전체 탭 ⭐ = 담기 · 다시 누르면 빼기(개수 배지가 바로 오르내림)
    const seqAt = btn => { const sq = view.flatMap(x => [x, ...(subs.get(x) || [])]), li = btn.closest("li"), lis = [...ul.querySelectorAll("li.vk-li,li.vk-sub")], pg0 = slicePage(view, cur)[0], base = pg0 ? sq.indexOf(pg0) : 0, p = lis.indexOf(li); return p >= 0 && base >= 0 && sq[base + p] ? { sq, p: base + p } : { sq, p: -1 }; }; // 눌린 줄의 「보이는 순서」 자리(탭·정렬·찾기·쪽 · 단어 아래 조각 포함)
    if (memoOn) { const lb0 = e.target.closest(".vm-lb"); if (lb0) memo.jump(+lb0.dataset.i); return; } // 외우기 보기에서 줄을 누르면 거기부터 이어 감(멈춘 때도)
    const pl = e.target.closest(".vk-pl"); // 줄 ▶ = 그 단어 소리(카드 ▶ 와 같은 길 · claim("card") 이 다른 소리를 멈춤)
    if (pl) { const it = byKey.get(pl.dataset.w) || read().find(x => kOf(x) === pl.dataset.w); if (it && it.kind === "piece") { const { sq, p } = seqAt(pl); return openPieceFromList(p >= 0 ? sq[p] : it, p >= 0 ? sq : null, p); } if (it) { it.__done = null; pl.classList.add("playing"); playSnd(it, pl).catch(() => {}).finally(() => setTimeout(() => pl.classList.remove("playing"), 0)); } return; }
    const b = e.target.closest(".vk-lb"); if (!b) return;
    const it = byKey.get(b.dataset.w) || read().find(x => kOf(x) === b.dataset.w); const { sq, p } = seqAt(b), at = p >= 0 ? sq[p] : it; if (at && at.kind === "piece") return openPieceFromList(at, p >= 0 ? sq : null, p); if (at) openWordCard(at, { fromList: true, lseq: p >= 0 ? sq : null, lpos: p });
  });
  el.addEventListener("pointerdown", e => { if (e.target.closest(".vk-lb,.vk-st,.vk-tab,.vm-lb")) tok(); const sb = e.target.closest(".vl-sortbtn"); if (sb) { tok(); sb.classList.add("hit"); setTimeout(() => sb.classList.remove("hit"), 220); } }); // 정렬 단추도 줄처럼 「톡」+눌림 · 갈색 바탕이 잠깐 채워졌다 돌아옴 // 줄 누르는 순간 「톡」 — 다른 소리가 나는 중이면 안 냄
  const on = (t, f, o) => { addEventListener(t, f, o); listOff.push(() => removeEventListener(t, f, o)); };
  listOff.push(() => { pager?.destroy(); pager = null; });
  on("pointerdown", e => { if (listEl === el && e.target.closest?.(".vp-bar .vp-b:not(:disabled),.vp-po,.vp-clr,.vp-mic,.vp-han,.hk-key,.hk-tab,.hk-x")) tok(); }, true); // 쪽 넘김·쪽 번호·찾기 ✕ 도 줄처럼 「톡」(다른 소리가 나는 중이면 안 냄)
  on("malmun:vocab", () => { if (listEl !== el) return; if (tab !== "all") return draw(); ul?.querySelectorAll(".vk-st").forEach(b => { const sv = has(b.dataset.w); b.textContent = sv ? "⭐" : "☆"; b.disabled = false; b.setAttribute("aria-pressed", String(sv)); b.setAttribute("aria-label", tx(sv ? "offRow" : "addRow")); if (b.dataset.w === popKey) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); } }); popKey = null; const n = vocabCount(), mb = el.querySelector(".vk-mn"); if (mb && shownN !== n) { mb.innerHTML = cntHTML(n); mb.dataset.n = String(n); bump(mb); } shownN = n; }); // 전체 탭은 ⭐ 과 「내가 담은」 배지만 바꿈(쪽·자리 그대로)
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
