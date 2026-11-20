// 내 단어장 정렬·지우기 (도우미 C · 11-18) — vocab.js 가 불러 붙임. 이 파일은 다른 파일을 건드리지 않음.
// 항목 모양(vocab.js): { w:단어, mean:뜻(네팔어), ep:편 ID, t:담은 시각(ms · 옛 항목은 없을 수 있음), order/line/li/idx?:편 안 순서(있으면 씀) }
//
// ── 필요한 css (A 가 app.css 에 붙임 · 색은 앱 변수 · 빨강 = --badc) ──
// .vl-sortbtn{}  정렬 단추(기존 .chip 모양 그대로 · 추가 css 없어도 됨)
// li.vl-row{position:relative;overflow:hidden;touch-action:pan-y}   ← attachDelete 가 줄에 붙임
// .vl-slide{transition:transform .18s ease;will-change:transform}   ← 줄 안 내용 감싸개(js 가 만듦)
// .vl-row.vl-drag .vl-slide{transition:none}
// .vl-row.vl-open .vl-slide{transform:translateX(-88px)}
// .vl-del{position:absolute;top:0;right:0;bottom:0;width:88px;border:0;background:var(--badc);color:#fff;font-weight:700;display:none;align-items:center;justify-content:center}
// .vl-row.vl-open .vl-del,.vl-row.vl-drag .vl-del{display:flex}
// .vl-bin{position:absolute;top:50%;right:8px;transform:translateY(-50%);width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--badc);display:none;cursor:pointer}
// @media (hover:hover) and (pointer:fine){.vl-row:hover .vl-bin,.vl-bin:focus-visible{display:block}}
// .vl-bin:hover{background:var(--hi-soft)}
// .vl-undo{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--bubble)}   ← 3초 되돌리기 칸(같은 줄 안)
// .vl-undo button{min-height:36px;padding:0 14px;border-radius:18px;border:1px solid currentColor;background:none;color:inherit;font-weight:700}
// .vl-row.vl-gone .vl-slide,.vl-row.vl-gone .vl-del,.vl-row.vl-gone .vl-bin{visibility:hidden}
//
// ── 필요한 문구 키 (A 가 문구표에 넣음 · 안 넣어도 아래 기본 글로 나옴; tx(key) 가 키와 다른 글을 주면 그걸 씀) ──
// vlist.sort.recent 최근순 / अन्तिम पहिले · vlist.sort.abc 가나다순 / वर्णानुक्रम · vlist.sort.ep 편 순서 / पाठ क्रम
// vlist.del 지우기 / हटाउनुहोस् · vlist.undo 되돌리기 / फिर्ता गर्नुहोस् · vlist.gone 지웠어요 / हटाइयो

export const SORT_MODES = ["recent", "abc", "ep"];
const SKEY = "malmun.vlist.sort";
const FALL = {
  ko: { "vlist.sort.recent": "최근순", "vlist.sort.abc": "가나다순", "vlist.sort.ep": "편 순서", "vlist.del": "지우기", "vlist.undo": "되돌리기", "vlist.gone": "지웠어요" },
  ne: { "vlist.sort.recent": "नयाँ पहिले", "vlist.sort.abc": "वर्णानुक्रम", "vlist.sort.ep": "पाठ क्रम", "vlist.del": "हटाउनुहोस्", "vlist.undo": "पूर्ववत्", "vlist.gone": "हटाइयो" },
};
const T = (key, lang, tx) => { try { const v = tx?.(key); if (v && v !== key) return v; } catch {} return (FALL[lang === "ko" ? "ko" : "ne"] || FALL.ko)[key] || key; };

// 11-19 16:06 대표님: 정렬은 기억 안 함 — 열 때마다 「편 순서」 · 옛날에 저장된 값은 지움(열 동안만 바꿀 수 있음)
const dropSort = () => { try { localStorage.removeItem(SKEY); } catch {} };
dropSort();
export const loadSort = () => { dropSort(); return "ep"; };

const epKey = ep => { const m = String(ep ?? "").match(/\d+/g); return m ? m.map(n => n.padStart(6, "0")).join("-") : "Ffff"; }; // 숫자 크기 순(ne1 < ne2 < ne10)
const posOf = x => { const v = x.order ?? x.line ?? x.li ?? x.idx ?? x.n; const n = Number(v); return v != null && Number.isFinite(n) ? n : null; };

// 새 배열을 돌려줌(원본 안 바꿈) · lang = 'ko'|'ne' (abc 기준 글: ko=단어 · ne=뜻)
export function sortItems(items, mode = "recent", lang = "ko") {
  const a = (items || []).map((x, i) => ({ x, i })); // i = 저장된 순서(= 담은 순 · 시각 없는 옛 항목의 대신)
  const ts = o => (Number.isFinite(o.x.t) ? o.x.t : null);
  const loc = lang === "ne" ? "ne" : "ko";
  const col = new Intl.Collator(loc), key = o => (o.k ??= String((lang === "ne" ? o.x.mean || o.x.w : o.x.w) || "")); // 1만 개도 빠르게: 비교기 하나 · 글 한 번만 뽑음
  const cmp = {
    recent: (p, q) => { const s = ts(p), t = ts(q); if (s != null && t != null) return t - s || q.i - p.i; if (s != null) return -1; if (t != null) return 1; return q.i - p.i; }, // 시각 없는 옛 항목은 맨 아래
    abc: (p, q) => col.compare(key(p), key(q)) || p.i - q.i,
    ep: (p, q) => { const e = epKey(p.x.ep).localeCompare(epKey(q.x.ep)); if (e) return e; const s = posOf(p.x), t = posOf(q.x); if (s != null && t != null && s !== t) return s - t; return p.i - q.i; },
  }[mode] || (() => 0);
  return a.sort(cmp).map(o => o.x);
}

// 정렬 단추 — 누를 때마다 다음 정렬. getMode()/setMode(m) 은 부르는 쪽 것. 돌려줌 = <button> (b.refresh() 로 글 다시)
export function makeSortButton(getMode, setMode, lang = "ko", tx) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip vl-sortbtn";
  const cur = () => { const m = getMode?.() ?? loadSort(); return SORT_MODES.includes(m) ? m : "recent"; };
  const label = () => { const m = cur(), t = T(`vlist.sort.${m}`, lang, tx); b.textContent = `⇅ ${t}`; b.dataset.mode = m; b.setAttribute("aria-label", t); };
  b.addEventListener("click", () => { const n = SORT_MODES[(SORT_MODES.indexOf(cur()) + 1) % SORT_MODES.length]; setMode?.(n); label(); });
  label(); b.refresh = label; return b;
}

// 줄 지우기 — rowEl(li) 에 붙임. onDelete(item) 은 3초 뒤 진짜 지울 때 한 번. 돌려줌 = { destroy() }
export function attachDelete(rowEl, item, onDelete, lang = "ko", tx) {
  const R = 88, UNDO_MS = 3000;
  rowEl.classList.add("vl-row");
  const slide = document.createElement("div"); slide.className = "vl-slide";
  while (rowEl.firstChild) slide.append(rowEl.firstChild);
  const mkBtn = (cls, txt, aria) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = txt; if (aria) b.setAttribute("aria-label", aria); return b; };
  const delTxt = T("vlist.del", lang, tx);
  const del = mkBtn("vl-del", delTxt), bin = mkBtn("vl-bin", "🗑", delTxt); // 휴지통 = 항상 보임(11-18 13:39) · 도움말은 브라우저 기본 title 말고 앱 작은 글 상자(휴지통 위쪽 · 마우스일 때만)
  rowEl.append(slide, del, bin);

  // 밀기: 가로가 세로보다 클 때만(그 전엔 세로 스크롤에 맡김) · 마우스는 밀기 없음(휴지통 사용)
  let sx = 0, sy = 0, base = 0, mode = "", id = null;
  const setX = x => { slide.style.transform = `translateX(${x}px)`; };
  const open = o => { rowEl.classList.toggle("vl-open", o); rowEl.classList.remove("vl-drag"); slide.style.transform = ""; };
  rowEl.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || e.target.closest(".vl-del,.vl-bin,.vl-undo")) return;
    sx = e.clientX; sy = e.clientY; base = rowEl.classList.contains("vl-open") ? -R : 0; mode = ""; id = e.pointerId;
  });
  rowEl.addEventListener("pointermove", e => {
    if (e.pointerId !== id || mode === "v") return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!mode) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; if (Math.abs(dx) <= Math.abs(dy)) { mode = "v"; return; } mode = "h"; rowEl.classList.add("vl-drag"); try { rowEl.setPointerCapture(id); } catch {} }
    setX(Math.max(-R, Math.min(0, base + dx)));
  });
  rowEl.addEventListener("pointerup", e => {
    if (e.pointerId !== id) return; id = null;
    if (mode === "h") { const x = Math.max(-R, Math.min(0, base + (e.clientX - sx))); open(x < -R / 2); rowEl.__swiped = true; setTimeout(() => { rowEl.__swiped = false; }, 0); }
    mode = "";
  });
  rowEl.addEventListener("pointercancel", e => { if (e.pointerId === id) { id = null; if (mode === "h") open(rowEl.classList.contains("vl-open")); mode = ""; } });
  // 밀고 뗀 직후의 클릭은 줄 열기로 새지 않게 · 열린 줄을 누르면 닫기만
  rowEl.addEventListener("click", e => {
    if (e.target.closest(".vl-del,.vl-bin,.vl-undo")) return;
    if (rowEl.__swiped || rowEl.classList.contains("vl-open")) { e.preventDefault(); e.stopPropagation(); if (!rowEl.__swiped) open(false); }
  }, true);
  const outside = e => { if (rowEl.classList.contains("vl-open") && !rowEl.contains(e.target)) open(false); };
  document.addEventListener("pointerdown", outside, true);

  // 지우기 → 같은 줄 안 3초 되돌리기
  let timer = 0, undo = null;
  const start = e => {
    e.preventDefault(); e.stopPropagation(); if (undo) return;
    open(false); rowEl.classList.add("vl-gone");
    undo = document.createElement("div"); undo.className = "vl-undo";
    const msg = document.createElement("span"); msg.textContent = T("vlist.gone", lang, tx);
    const ub = mkBtn("vl-undobtn", "↩ " + T("vlist.undo", lang, tx));
    undo.append(msg, ub); rowEl.append(undo);
    timer = setTimeout(() => { timer = 0; document.removeEventListener("pointerdown", outside, true); try { onDelete?.(item); } finally { undo?.remove(); undo = null; } }, UNDO_MS);
    ub.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); clearTimeout(timer); timer = 0; undo.remove(); undo = null; rowEl.classList.remove("vl-gone"); });
  };
  del.addEventListener("click", start); bin.addEventListener("click", start);
  let tip = null; const hideTip = () => { tip?.remove(); tip = null; };
  bin.addEventListener("pointerenter", e => { // 마우스만 · 휴대폰(터치)은 도움말 없음 · 줄(overflow 숨김) 밖 칸(영상 칸·전체 화면 안)에 fixed 로 띄워 안 잘림
    if (e.pointerType !== "mouse") return; hideTip();
    tip = document.createElement("div"); tip.className = "vl-tip"; tip.setAttribute("role", "tooltip"); tip.textContent = window.__sentText?.("bin") || delTxt; // 풍선 = 「단어장에서 지워요」 설명 문장(apptip.js · 11-20)
    (bin.closest(".vstage") || document.fullscreenElement || document.body).append(tip);
    const r = bin.getBoundingClientRect(), t = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    tip.style.left = Math.round(Math.max(4, Math.min(vw - t.width - 4, r.left + r.width / 2 - t.width / 2))) + "px"; tip.style.top = Math.round(Math.max(4, r.top - t.height - 6)) + "px"; // 휴지통 위쪽
  });
  for (const ev of ["pointerleave", "pointerdown", "blur"]) bin.addEventListener(ev, hideTip);
  return { destroy() { clearTimeout(timer); hideTip(); document.removeEventListener("pointerdown", outside, true); } };
}
