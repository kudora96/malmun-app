// ⭐ 내 단어장(시험판 · 네팔어 1편 · 본부 11-16 대표님 승인) — 낱말 칸을 톡 누르면 작은 카드 · 단어장은 이 기기(localStorage)에만
// 소리 = 이미 있는 줄 소리(대사 낭독)에서 그 낱말 구간만 · 새 소리 안 만듦 · 학습자 말이 네팔어가 아니면 아무것도 안 보임
import { lang, uiKoOn } from "./i18n.js?v=1023.41";
import { esc } from "./text.js?v=1023.41";
import { paths } from "./paths.js?v=1023.41";

const KEY = "malmun.vocab.ne";
export const vocabOn = () => lang === "ne";

// 새 글(네팔어 = Claude 도우미 교차 확인 · 한국어 = ⇄ 한 때)
const TX = {
  ne: { menu: "⭐ मेरो शब्द-सूची", add: "⭐ सूचीमा थप्नुहोस्", has: "⭐ सूचीमा छ", done: "✓ मैले याद गरिसकें", empty: "अहिले केही छैन। कुनै शब्द थिचेर सूचीमा थप्नुहोस्।", title: "मेरो शब्द-सूची", listen: "सुन्नुहोस्", close: "बन्द" },
  ko: { menu: "⭐ 내 단어장", add: "⭐ 단어장에 넣기", has: "⭐ 단어장에 있음", done: "✓ 다 외웠어요", empty: "아직 없어요. 낱말을 톡 눌러 넣어 보세요.", title: "내 단어장", listen: "듣기", close: "닫기" },
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

// ── 소리 한 개(카드 안) — 시작~끝 구간만 재생
let au = null, stopT = 0;
export function stopWordSound() { clearTimeout(stopT); if (au) { try { au.pause(); } catch {} au = null; } }
function playSpan(it, btn, before) {
  if (!it.af) return;
  before?.(); stopWordSound();
  const a = (au = new Audio(paths.audio(it.ep, it.af)));
  btn?.classList.add("playing");
  const end = () => { clearTimeout(stopT); if (au === a) { try { a.pause(); } catch {} au = null; } btn?.classList.remove("playing"); };
  a.onended = a.onerror = end;
  a.addEventListener("loadedmetadata", () => { try { a.currentTime = it.s || 0; } catch {} }, { once: true });
  a.play().then(() => { if (it.e > it.s) { clearTimeout(stopT); stopT = setTimeout(end, Math.max(200, (it.e - (it.s || 0)) * 1000 + 80)); } }).catch(end);
}

// ── 카드 — 단어 · 로마자 · 네팔어 뜻(같은 크기) · ▶ · 그 줄 문장(한국어 · 네팔어 같은 크기) · ⭐ 넣기
let cardEl = null;
export function closeCard() { stopWordSound(); cardEl?.remove(); cardEl = null; }
export function openWordCard(it, { before } = {}) {
  closeCard();
  const saved = () => has(it.w), roman = (document.querySelector(".exv.norom") ? "" : it.rom);
  const el = (cardEl = document.createElement("div"));
  el.className = "vk-dim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  const draw = () => {
    el.innerHTML = `<div class="vk-card">
      <div class="vk-row"><button class="vk-snd" data-v="snd" aria-label="${esc(tx("listen"))}" title="${esc(tx("listen"))}">▶</button>
        <div class="vk-main"><span class="vk-t ko" lang="ko">${esc(it.w)}</span>${roman ? `<span class="vk-rom">${esc(roman)}</span>` : ""}<span class="vk-t vk-mean" lang="ne">${esc(it.mean || "")}</span></div></div>
      ${it.ko ? `<div class="vk-sent"><span class="vk-s ko" lang="ko">${esc(it.ko)}</span>${it.tr ? `<span class="vk-s vk-str" lang="ne">${esc(it.tr)}</span>` : ""}</div>` : ""}
      <div class="vk-btns"><button class="vk-add" data-v="add" ${saved() ? "disabled" : ""}>${esc(saved() ? tx("has") : tx("add"))}</button>${saved() ? `<button class="vk-done" data-v="done">${esc(tx("done"))}</button>` : ""}</div></div>`;
  };
  draw();
  el.addEventListener("click", e => {
    let b = e.target.closest("[data-v]"); if (b && !el.contains(b)) b = null; // 위쪽 칸의 data-v 를 잡지 않게
    if (!b) { if (!e.target.closest(".vk-card")) closeCard(); return; } // 화면 밖을 누르면 닫힘
    e.stopPropagation();
    if (b.dataset.v === "snd") return playSpan(it, b, before);
    if (b.dataset.v === "add") { put(it); draw(); return; }
    if (b.dataset.v === "done") { drop(it.w); closeCard(); }
  });
  document.body.append(el);
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
    const it = read().find(x => x.w === b.dataset.w); if (it) openWordCard(it);
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
