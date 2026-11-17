// ⭐ 내 단어장(시험판 · 네팔어 1편 · 본부 11-16 대표님 승인) — 낱말 칸을 톡 누르면 작은 카드 · 단어장은 이 기기(localStorage)에만
// 소리 = 이미 만들어 둔 낱말 소리를 이어 붙여(wordsnd.json) · 없는 편은 줄 소리의 그 낱말 구간 · 학습자 말이 네팔어가 아니면 아무것도 안 보임
import { lang, uiKoOn, langShort } from "./i18n.js?v=1116.30";
import { noteHTML, readNote, stopRead, toggleRead, switchRead, tapBlock, tapWord, noteBlocks } from "./wordnote.js?v=1116.30"; // 단어 카드 설명(위 = 지금 말 · 아래 ↳ 다른 말) + 읽기 소리
import { esc } from "./text.js?v=1116.30";
import { paths } from "./paths.js?v=1116.30";
import { VERSION } from "./version.js?v=1116.30";

const KEY = "malmun.vocab.ne";
export const vocabOn = () => lang === "ne";

// 새 글(네팔어 = Claude 도우미 교차 확인 · 한국어 = ⇄ 한 때)
const TX = {
  ne: { menu: "⭐ मेरो शब्द-सूची", add: "⭐ सूचीमा थप्नुहोस्", has: "⭐ सूचीमा छ", done: "✓ मैले याद गरिसकें", gone: "सूचीबाट हटाइयो", undo: "↩ फिर्ता गर्नुहोस्", empty: "अहिले केही छैन। कुनै शब्द थिचेर सूचीमा थप्नुहोस्।", title: "मेरो शब्द-सूची", listen: "सुन्नुहोस्", close: "बन्द" },
  ko: { menu: "⭐ 내 단어장", add: "⭐ 단어장에 넣기", has: "⭐ 단어장에 있음", done: "✓ 다 외웠어요", gone: "목록에서 뺐어요", undo: "↩ 되돌리기", empty: "아직 없어요. 낱말을 톡 눌러 넣어 보세요.", title: "내 단어장", listen: "듣기", close: "닫기" },
};
const tx = k => (uiKoOn() ? TX.ko : TX.ne)[k];

const read = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const write = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} dispatchEvent(new CustomEvent("malmun:vocab")); };
export const vocabList = () => read();
export const vocabCount = () => read().length;
const has = w => read().some(x => x.w === w);
const put = it => { if (!has(it.w)) write([...read(), { ...it, t: Date.now() }]); };
const drop = w => write(read().filter(x => x.w !== w));

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
export function stopWordSound() { stopRead(); seq++; clearTimeout(stopT); if (au) { try { au.pause(); } catch {} au = null; } }
function playSpan(it, btn, before) {
  if (!it.af) return;
  before?.(); stopWordSound();
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
  before?.(); stopWordSound(); const my = seq;
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
export function closeCard() { stopWordSound(); cardEl?.remove(); cardEl = null; }
// 「소리 준비 중…」(대표님 11-16) — ▶ 를 누르고 소리가 시작될 때까지(0.25초 넘게 걸릴 때만) 카드 맨 위에 작게 · 아무 소리나 시작하면 지움
const WAIT_TX = { ne: "आवाज तयार हुँदै छ…", ko: "소리 준비 중…" };
let waitT = 0;
function hideWait() { clearTimeout(waitT); waitT = 0; document.querySelectorAll(".vk-wait").forEach(w => w.remove()); }
function showWait(el) {
  hideWait(); waitT = setTimeout(() => { const c = el.querySelector(".vk-card"); if (!c || cardEl !== el) return; const w = document.createElement("div"); w.className = "vk-wait"; w.setAttribute("role", "status"); w.textContent = uiKoOn() || lang !== "ne" ? WAIT_TX.ko : WAIT_TX.ne; c.prepend(w); }, 250);
  setTimeout(hideWait, 9000); // 끝내 안 오면 지움
}
document.addEventListener("playing", hideWait, true); document.addEventListener("error", hideWait, true);
// 낱말 설명(대표님 11-16 「저는」이면 저는에 대한 설명 · 한국어·네팔어 1:1) — data/<편>/<편>.wordnote.json: 낱말 → {ko_mean, ne_mean, ko_ex, ne_ex} · 없는 낱말만 영상 속 문장
const noteMem = {};
export const noteOf = ep => (noteMem[ep] ||= fetch(paths.data(ep, ".wordnote") + "?v=" + VERSION).then(r => (r.ok ? r.json() : null)).catch(() => null));
export function openWordCard(it, { before, fromList = false } = {}) {
  closeCard();
  const saved = () => has(it.w), roman = (document.querySelector(".exv.norom") ? "" : it.rom);
  const el = (cardEl = document.createElement("div"));
  el.className = "vk-dim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  const draw = () => {
    el.innerHTML = `<div class="vk-card">
      <div class="vk-row"><button class="vk-snd" data-v="snd" aria-label="${esc(tx("listen"))}" title="${esc(tx("listen"))}">▶</button>
        <div class="vk-main"><span class="vk-t ko" lang="ko">${esc(it.w)}</span>${roman ? `<span class="vk-rom">${esc(roman)}</span>` : ""}<span class="vk-t vk-mean" lang="ne">${esc(it.mean || "")}</span></div>${lang === "ne" ? `<button class="chip uiko vk-uiko" data-act="uiko" aria-pressed="${uiKoOn()}" aria-label="नेपाली ⇄ 한국어"><span class="a" lang="ne">${esc(langShort("ne"))}</span><span class="ar" aria-hidden="true">⇄</span><span class="b" lang="ko">한</span></button>` : ""}</div>
      ${noteHTML(it.note, uiKoOn()) || (it.ko ? `<div class="vk-sent"><span class="vk-s ko" lang="ko">${esc(it.ko)}</span>${it.tr ? `<span class="vk-s vk-str" lang="ne">${esc(it.tr)}</span>` : ""}</div>` : "")}
      <div class="vk-btns"><button class="vk-add" data-v="add" ${saved() ? "disabled" : ""}>${esc(saved() ? tx("has") : tx("add"))}</button>${saved() && fromList ? `<button class="vk-done" data-v="done">${esc(tx("done"))}</button>` : ""}</div></div>`;
  };
  before?.(); // 카드가 열리면 바깥 소리(설명 읽기)는 그 자리에서 멈춤 — 카드 소리만
  draw();
  const startNote = bk => { if (it.note && cardEl === el) { showWait(el); it.__done = null; readNote(el, it, it.note, uiKoOn(), it.order, { from: Math.max(0, noteBlocks(it.note).findIndex(x => x.b === bk)) }); } }; // 설명 읽기 화면처럼 열리면 저절로 시작
  const onLang = () => { if (cardEl !== el) return removeEventListener("malmun:uilang", onLang); draw(); switchRead(uiKoOn()); }; // ⇄ = 읽던 블록·그 위치에서 새 말로(처음으로 안 감 · 멈춰 있으면 멈춘 채)
  addEventListener("malmun:uilang", onLang);
  el.addEventListener("click", e => {
    let b = e.target.closest("[data-v]"); if (b && !el.contains(b)) b = null; // 위쪽 칸의 data-v 를 잡지 않게
    if (!b) { if (!e.target.closest(".vk-card")) closeCard(); else if (e.target.closest(".vk-note") && it.note) { const bk = e.target.closest(".vk-blk")?.dataset.b, kw = e.target.closest(".vk-line .kw"), wi = kw ? [...kw.parentNode.querySelectorAll(".kw")].indexOf(kw) : -1; if (!(bk ? (wi >= 0 ? tapWord(bk, wi) : tapBlock(bk)) : toggleRead())) startNote(bk); } return; } // 화면 밖 = 닫힘 · 다른 블록 톡 = 그 블록부터 · 읽는 블록 톡 = 멈춤⇄이어서 · 다 읽은 뒤 톡 = 처음부터
    e.stopPropagation();
    if (b.dataset.v === "snd") { // ▶ = 처음부터 다시(설명 읽기 · 낱말 소리는 따로 안 냄)
      if (it.note) { startNote(); return; }
      showWait(el); stopRead(); it.__done = null;
      return playSnd(it, b, before);
    }
    if (b.dataset.v === "add") { put(it); draw(); return; }
    if (b.dataset.v === "done") { // 지움 막기(대표님 11-16): 바로 지우지 않고 5초 「되돌리기」
      const snap = read().find(x => x.w === it.w); drop(it.w);
      el.querySelector(".vk-card").innerHTML = `<p class="vk-gone">${esc(tx("gone"))}</p><div class="vk-btns"><button class="vk-add" data-v="undo">${esc(tx("undo"))}</button></div>`;
      clearTimeout(el.__ut); el.__ut = setTimeout(() => { if (cardEl === el) closeCard(); }, 5000); el.__snap = snap; return;
    }
    if (b.dataset.v === "undo") { if (el.__snap) put(el.__snap); clearTimeout(el.__ut); draw(); }
  });
  document.body.append(el);
  if (it.ep) noteOf(it.ep).then(n => { const x = n?.[clean(it.w)]; if (x && cardEl === el) { it.note = x; it.key = clean(it.w); it.order = n._order || []; draw(); startNote(); } }); // 설명이 있으면 문장 자리를 설명으로
  return el;
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && cardEl) closeCard(); });

// ── 단어장 목록(편 목록 위 「⭐ 내 단어장 (N)」 → 목록 → 단어 → 같은 카드)
let listEl = null;
export function closeVocabList() { closeCard(); listEl?.remove(); listEl = null; }
export function openVocabList() {
  closeVocabList();
  const el = (listEl = document.createElement("div"));
  el.className = "vk-dim vk-listdim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  const draw = () => {
    const a = read();
    el.innerHTML = `<div class="vk-sheet"><div class="vk-head"><b>${esc(tx("title"))} (${a.length})</b><button class="vk-x" data-v="x">✕ ${esc(tx("close"))}</button></div>
      ${a.length ? `<ul class="vk-ul">${a.map(x => `<li><button class="vk-li" data-w="${esc(x.w)}"><span class="vk-t ko" lang="ko">${esc(x.w)}</span>${x.rom ? `<span class="vk-rom">${esc(x.rom)}</span>` : ""}<span class="vk-t vk-mean" lang="ne">${esc(x.mean || "")}</span></button></li>`).join("")}</ul>` : `<p class="vk-empty">${esc(tx("empty"))}</p>`}</div>`;
  };
  draw();
  el.addEventListener("click", e => {
    if (e.target.closest(".vk-x") || e.target === el) return closeVocabList();
    const b = e.target.closest(".vk-li"); if (!b) return;
    const it = read().find(x => x.w === b.dataset.w); if (it) openWordCard(it, { fromList: true });
  });
  addEventListener("malmun:vocab", () => { if (listEl === el) draw(); });
  document.body.append(el);
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
