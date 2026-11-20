// 단어 카드 설명(대표님 11-16 「설명 창 방식 그대로」) — 위 = 지금 말(⇄ 상태) 본문 · 아래 「↳」 한 줄 = 다른 말 · ⇄ 누르면 그 자리에서 즉시 바뀜
// 읽기 소리 = 낱말 소리 다음에 뜻·쓰임 → 예문1 → 예문2 차례로(지금 말) · 읽는 줄에 노래방 불 · 파일 = media/wordnote/<편>/<낱말번호>_<ko|ne>_<mean|ex1|ex2>.mp3(말하기부가 만듦 · 없으면 건너뜀)
import { claim, onSound } from "./onesound.js?v=1120.34";
import { esc } from "./text.js?v=1120.34";
import { twoOn } from "./autoplay.js?v=1120.34";

const BLK = [["mean", "ko_mean", "ne_mean"], ["ex1", "ko_ex1", "ne_ex1"], ["ex2", "ko_ex2", "ne_ex2"]];
const pick = (n, ko, k) => n?.[`${k ? "ko" : "ne"}_${ko}`] || n?.[`${k ? "ko" : "ne"}_${ko === "ex1" ? "ex" : ko}`] || ""; // ex1 = 옛 이름 ex 도 받음
export const noteBlocks = n => BLK.map(([b]) => ({ b, ko: pick(n, b, true), ne: pick(n, b, false) })).filter(x => x.ko && x.ne);
const gwWrap = (t, st, wj = false) => { let o = "", b = ""; const fl = () => { if (b) { o += st.q ? `<span class="gw">${esc(b)}</span>` : esc(b); b = ""; } }; for (const c of t) { if (c === "「" && !st.q) { fl(); st.q = true; b = c; } else if (c === "」" && st.q) { b += c; fl(); st.q = false; } else b += c; } fl(); return wj ? o.replace(/<\/span>(?=[^\s<])/g, "</span>⁠") : o; }; // 상자 바로 뒤 조사는 줄이 갈리지 않게(wj=↳ 줄 · 낱말 줄은 .kw 가 nowrap · 대표님 11-18 16:27) // 「…」 = 설명 칸 .gw 와 같은 흰 상자(따옴표 문자는 상자 안) · 여러 낱말에 걸쳐도 낱말마다 상자
const kws = (s, lang, on = true) => { const st = { q: false }; return String(s).split(/(\s+)/).map(t => (/^\s*$/.test(t) ? t : `<span class="${on ? "kw" : "kx"}" lang="${lang}">${gwWrap(t, st)}</span>`)).join(""); }; // kw = 지금 말(톡·칠 대상) · kx = 숨은 말(⇄ 하면 서로 바뀜)

// 본문 = 지금 말 한 줄만(블록마다) · 바로 아래 「↳」 한 줄 = 그 블록의 다른 말(항상 다 보임) · 두 말은 겹침(.ghost)으로 높이 맞춤 → ⇄ 해도 크기 그대로
export const SENT_END = /[.!?。।][」"')”’』»]*$/;
const splitSent = t => String(t).split(/(?<=[.!?。।][」"')”’』»]*)\s+/).filter(Boolean); // 문장 나누기(마침표 뒤 띄어쓰기) — 두 말을 순서대로 짝지음
export const COMMA = /[,，、][」"')”’』»]*$/; // 쉼표 마디(대표님 11-19 10:59 · 칠하기 단위) · 마침표(SENT_END)는 문장 끝
const PAR_OPEN = /^[「"'“‘『«]*\(/, PAR_CLOSE = /\)[」"'”’』»]*$/, TOK = /"[^"]*"\S*|\S+|\s+/g; // 괄호 (…) 는 앞뒤로 마디가 갈림(대표님 11-19 13:31)
// ── 칠하기 마디 공용(카드·설명 읽기 둘 다 · 대표님 11-19 13:31) — 마디 = 문장 끝(따옴표 끝 포함)·괄호 앞뒤·쉼표에서 끝남 · 낱말 글 배열 → 마디 번호(gi) / ↳ 줄의 지금 마디만 .on
export const clauseMap = texts => { let sid = 0, cid = 0, g = 0, n = 0, open = false; const ids = [], cl = [], gi = []; texts.forEach(t => { if (PAR_OPEN.test(t) && n > 0) { cid++; g++; n = 0; } if (PAR_OPEN.test(t)) open = true; ids.push(sid); cl.push(cid); gi.push(g); n++; if (SENT_END.test(t)) { sid++; cid = 0; g++; n = 0; open = false; } else if (COMMA.test(t) || (open && PAR_CLOSE.test(t))) { cid++; g++; n = 0; if (PAR_CLOSE.test(t)) open = false; } }); return { ids, cl, gi, cum: gi, ncum: gi.length ? gi[gi.length - 1] + 1 : 1 }; }; // gi = 낱말이 든 마디(문장 통틀어) · ncum = 마디 수
export const splitClause = (x, qa = false) => { const tk = (qa ? String(x).match(TOK) : String(x).split(/(\s+)/)) || [], ws = tk.filter(t => t && !/^\s+$/.test(t)), gi = clauseMap(ws).gi, out = []; ws.forEach((t, i) => { out[gi[i]] = out[gi[i]] ? out[gi[i]] + " " + t : t; }); return out.filter(Boolean); }; // qa = 따옴표 한 덩어리(설명 읽기 윗줄과 같은 낱말 나누기)
export const commaMap = texts => { let cid = 0, q = false; const cl = []; texts.forEach(t => { cl.push(cid); if ((String(t).match(/"/g) || []).length % 2) q = !q; if (!q && (COMMA.test(t) || SENT_END.test(t))) cid++; }); return { cl, n: texts.length && cl[cl.length - 1] === cid ? cid + 1 : cid || 1 }; }; // 쉼표·마침표에서만 갈리는 마디(따옴표 안 쉼표는 안 갈림 · 괄호로는 안 갈림) — 두 말 ↳ 짝 맞춤 기준(대표님 11-19 16:37 「쉼표가 경계 · 「र …」 는 다음 마디」)
export const markClause = (pairEl, cc, ncl, span = null, byComma = false) => { let pcs = [...(pairEl?.querySelectorAll(".pc") || [])];
  if (byComma) { const gs = []; let cur = []; let q = false; pcs.forEach(e => { const t = e.textContent.trim(); cur.push(e); if ((t.match(/"/g) || []).length % 2) q = !q; if (!q && (COMMA.test(t) || SENT_END.test(t))) { gs.push(cur); cur = []; } }); if (cur.length) gs.push(cur); // 쉼표 묶음 · 같은 수면 같은 순서 · 다르면 시각 겹침
    const L = gs.map(g => Math.max(1, g.reduce((a, e) => a + e.textContent.length, 0))), T = L.reduce((a, b) => a + b, 0); let a = 0;
    gs.forEach((g, i) => { const s0 = a / T; a += L[i]; const on = gs.length === ncl ? i === cc : span ? a / T > span[0] + 1e-6 && s0 < span[1] - 1e-6 : true; g.forEach(e => e.classList.toggle("pcm", on)); }); return; }
 // 마디 수가 같으면 같은 순서 마디 · 다르면 시각(span = 지금 마디의 문장 안 [시작,끝] 0~1)과 겹치는 마디 · 시각 없으면 문장 통째
  if (pcs.length === ncl) pcs.forEach((e, i) => e.classList.toggle("pcm", i === cc));
  else if (span && pcs.length) { const L = pcs.map(e => Math.max(1, e.textContent.length)), T = L.reduce((a, b) => a + b, 0); let a = 0; pcs.forEach((e, i) => { const s0 = a / T; a += L[i]; e.classList.toggle("pcm", a / T > span[0] + 1e-6 && s0 < span[1] - 1e-6); }); }
  else pcs.forEach(e => e.classList.add("pcm")); };
const pairInner = t => { let w = 0; return `<span class="arr" aria-hidden="true">↳</span> ${splitSent(t).map((x, i) => { const st = { q: false }; return `<span class="ps" data-s="${i}">${splitClause(x).map((c, j) => `<span class="pc" data-c="${j}">${c.split(" ").map(tk => `<span class="pw" data-w="${w++}">${gwWrap(tk, st, true)}</span>`).join(" ")}</span>`).join(" ")}</span>`; }).join(" ")}`; }; // ↳ 글도 윗줄처럼 낱말마다 .pw(같은 낱말 나누기 · 「」 상자 그대로) — ↳ 소리 때 지금 낱말만 진한 노랑(.pk · 대표님 11-19 16:03)
// 카드 글은 지금 말 하나만 DOM 에 둠(숨은 복사본 없음) — 높이는 열 때 두 말을 번갈아 재어 큰 쪽으로 고정(fixSizes) · ⇄ 는 같은 칸 안에서 글만 바꿈(applyMode)
const lineIn = (x, l) => kws(x[l], l), pairIn = (x, l) => pairInner(x[l]);
export function noteHTML(n, koFirst) {
  const bl = noteBlocks(n); if (!bl.length) return "";
  const al = koFirst ? "ko" : "ne", ol = koFirst ? "ne" : "ko";
  return `<div class="vk-sent vk-note">${bl.map(x => `<div class="vk-blk" data-b="${x.b}"><p class="vk-s vk-line" lang="${al}">${lineIn(x, al)}</p></div><p class="vk-s vk-pair pairln" data-pb="${x.b}" lang="${ol}">${pairIn(x, ol)}</p>`).join("")}</div>`;
}
function fill(card, ko) { // 지금 말 글을 같은 칸에 채움(칸·블록 노드는 그대로)
  const al = ko ? "ko" : "ne", ol = ko ? "ne" : "ko", nt = card.__nt;
  if (nt) noteBlocks(nt).forEach(x => {
    const ln = card.querySelector(`.vk-blk[data-b="${x.b}"] .vk-line`), pr = card.querySelector(`.vk-pair[data-pb="${x.b}"]`);
    if (ln) { ln.setAttribute("lang", al); ln.innerHTML = lineIn(x, al); } if (pr) { pr.setAttribute("lang", ol); pr.innerHTML = pairIn(x, ol); }
  });
  card.querySelectorAll(".vk-sw").forEach(e => { const v = e.querySelector(".vis"); if (v) v.textContent = e.dataset[al]; if (e.dataset.lk) e.setAttribute("lang", al); });
}
const hCache = new Map(); // 카드+화면 폭 → 칸 높이(두 말 중 큰 쪽)
export function fixSizes(card, again = false) { // 열 때 한 번: 두 말을 번갈아 채워 재고 큰 쪽으로 min-height 고정 · 같은 카드·폭이면 기억해 둔 값 그대로
  const els = [...card.querySelectorAll(".vk-line, .vk-pair, .vk-sw")]; if (!els.length || !card.isConnected) return;
  const ko = card.dataset.m === "ko", key = `${card.dataset.ck}|${Math.round(card.clientWidth)}|${ko}`; els.forEach(e => (e.style.minHeight = "")); const zf = card.offsetWidth ? card.getBoundingClientRect().width / card.offsetWidth : 1, H = e => e.getBoundingClientRect().height / (zf || 1); // 확대(zoom)된 카드도 같은 단위로
  let hs = again ? null : hCache.get(key);
  if (!hs) { const m1 = els.map(H); fill(card, !ko); const m2 = els.map(H); fill(card, ko); hs = m1.map((h, i) => Math.ceil(Math.max(h, m2[i]) * 10) / 10); hCache.set(key, hs); if (document.fonts?.status === "loading") document.fonts.ready.then(() => { if (card.isConnected) fixSizes(card, true); }); } // 글꼴이 늦게 오면(데바나가리 등) 다 온 뒤 한 번 더 재어 고정
  els.forEach((e, i) => (e.style.minHeight = hs[i] + "px"));
}
export function applyMode(card, ko) { // ⇄ — 칸은 그대로 · 글만 바꿈
  card.dataset.m = ko ? "ko" : "ne"; fill(card, ko);
  card.querySelectorAll(".ps.on, .pc.on").forEach(e => e.classList.remove("on"));
}
const clearHl = root => (root || document).querySelectorAll(".vk-note .ps.on, .vk-note .pc.on").forEach(e => e.classList.remove("on"));
function setPair() {} // (옛) 읽는 블록 칸에만 글 — 이제 ↳ 줄은 항상 다 보임
export const curBlock = () => (cur ? cur.bl[cur.k]?.b : "");

// ── 읽기 소리 — 설명 읽기 화면과 같은 방식: 저절로 시작 · 글을 톡 = 그 자리에서 멈춤 · 다시 톡 = 같은 자리에서 이어서 · ⇄ = 같은 블록·같은 위치에서 새 말로
let cur = null, tick = 0, from = null; // from = 낱말을 톡 한 자리(블록·낱말 번호) — 노란 칠은 그 낱말부터 새로 자람(대표님 11-17)
const LEAD = 0.1, wl = w => w.textContent.replace(/[「」]/g, "").length; // 노래방 비율 = 소리 나는 글자만(「」는 안 읽음)
// 낱말 시각(강제 정렬 · 11-17): wordnote.json 의 <말>_<블록>_w = [[시작,끝],…] (kw 낱말 수와 같을 때만 · 없으면 글자 수 비율로 대신)
const wtOf = (n, l, b, cnt) => { const t = n?.[`${l}_${b}_w`]; return Array.isArray(t) && t.length === cnt && t.every(x => Array.isArray(x) && x.length >= 2) ? t : null; };
const cntOf = (n, l, b) => String(n?.[`${l}_${b}`] || n?.[`${l}_${b === "ex1" ? "ex" : b}`] || "").split(/\s+/).filter(Boolean).length;
// ── 카드 본문 따라 넘기기(대표님 11-18 14:05) — 자막 칸처럼 읽는 줄이 칸 위쪽 1/3 쯤에 오게 0.3초 부드럽게 · 머리(sticky)는 그대로 · 손(휠·터치·끌기)으로 넘기는 동안 4초 멈춤 · 다음 줄 읽기 시작하면 다시 따라감
const HAND_MS = 4000, FOLLOW_MS = 300;
const scrollerOf = root => root.querySelector(".vk-card") || root;
function watchHand(card) { // 손 넘김 감지(코드로 옮기는 것은 wheel·touchmove·pointerdown 을 일으키지 않음)
  if (card.__hf) return; card.__hf = 1; card.__hand = 0;
  ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach(e => card.addEventListener(e, () => { card.__hand = Date.now(); cancelAnimationFrame(card.__anim); }, { passive: true }));
}
function headBottom(card, r0, zf) { // 머리 고정(sticky) 부분의 아래 끝 = 읽는 줄이 가려지지 않는 맨 위
  let hb = 0; for (const c of card.children) { if (c.classList.contains("vk-xw") || c.classList.contains("vk-wait")) continue; if (getComputedStyle(c).position === "sticky") hb = Math.max(hb, (c.getBoundingClientRect().bottom - r0.top) / zf); } return hb;
}
function followLine(j, anchor, fresh) { // fresh = 새 줄 시작(손 멈춤 풀고 따라감) · 아니면 줄이 칸 밖이고 손 넘김 4초 지난 뒤에만
  const card = scrollerOf(j.root); if (!card || !anchor || !card.isConnected) return; watchHand(card);
  if (fresh) card.__hand = 0; else if (Date.now() - card.__hand < HAND_MS) return;
  const r0 = card.getBoundingClientRect(), zf = card.offsetWidth ? r0.width / card.offsetWidth : 1, ar = anchor.getBoundingClientRect();
  const hb = headBottom(card, r0, zf), H = card.clientHeight, vis = Math.max(40, H - hb - 8), top = (ar.top - r0.top) / zf, bot = (ar.bottom - r0.top) / zf;
  if (!fresh && top >= hb && bot <= H - 8) return; // 이미 다 보이면 그대로
  const to = Math.max(0, Math.min(card.scrollHeight - H, card.scrollTop + top - (hb + vis / 3)));
  if (Math.abs(to - card.scrollTop) < 2) return;
  cancelAnimationFrame(card.__anim); const from = card.scrollTop, t0 = performance.now();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) { card.scrollTop = to; return; }
  const step = now => { const k = Math.min(1, (now - t0) / FOLLOW_MS); card.scrollTop = from + (to - from) * (1 - (1 - k) ** 3); if (k < 1) card.__anim = requestAnimationFrame(step); };
  card.__anim = requestAnimationFrame(step);
}
const blkOf = j => j.root.querySelector(`.vk-blk[data-b="${j.bl[j.k]?.b}"]`);
// ↳ 줄 소리 차례(자동 이어 듣기) — 그 말 소리의 낱말 시각(<말>_<블록>_w)대로 ↳ 줄의 지금 마디만 엷게(같은 칠하기 마디 규칙 · 낱말 시각 없으면 글자 수 비율)
function showPair(j) {
  const blk = blkOf(j); if (!blk || !j.a) return; const b = j.bl[j.k].b;
  if (!blk.classList.contains("cur")) { j.root.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); blk.classList.add("cur"); }
  blk.querySelectorAll(".vk-line .kw.kar, .kw.ks, .kw.kt").forEach(e => e.classList.remove("kar", "ks", "kt")); // 윗줄(지금 말) 칠은 지움 — 소리는 ↳ 줄 말
  const pe = j.root.querySelector(`.vk-note > .vk-pair[data-pb="${b}"]`); if (!pe) return;
  const ws = String(j.bl[j.k][j.pl] || "").split(/\s+/).filter(Boolean), tot = ws.reduce((s, w) => s + w.replace(/[「」]/g, "").length, 0) || 1, tn = j.a.currentTime + LEAD, fr = tn / Math.max(0.2, j.a.duration || 1);
  const cm = clauseMap(ws), wt = wtOf(j.n, j.pl, b, ws.length); let cg = 0;
  if (wt) wt.forEach((x, i) => { if (x[0] <= tn) cg = cm.gi[i]; }); else { let c = 0; const st = []; ws.forEach((w, i) => { if (st[cm.gi[i]] === undefined) st[cm.gi[i]] = c; c += w.replace(/[「」]/g, "").length; }); st.forEach((s0, q) => { if (s0 / tot <= fr) cg = q; }); }
  if (j.ci1 >= 0) { const pl = planOf(j, j.k), i0 = pl?.[j.pl]?.[j.ci1]?.i0; if (i0 !== undefined && cm.gi[i0] !== undefined) cg = Math.max(cg, cm.gi[i0]); }
  const idx = cm.gi.indexOf(cg), cs = cm.ids[idx] ?? 0, cc = cm.cl[idx] ?? 0, ncl = Math.max(0, ...ws.map((_, i) => (cm.ids[i] === cs ? cm.cl[i] : -1))) + 1;
  const ps = [...pe.querySelectorAll(".ps")], tg = Math.min(cs, ps.length - 1);
  { const key = "p" + j.k + ":" + cs, fresh = j.fk !== key; j.fk = key; followLine(j, ps[tg] || pe, fresh); }
  j.root.querySelectorAll(".vk-note .ps.on").forEach(e => { if (e !== ps[tg]) e.classList.remove("on"); }); ps[tg]?.classList.add("on");
  j.root.querySelectorAll(".vk-note .pc.on").forEach(e => e.classList.remove("on")); markClause(ps[tg], cc, ncl);
  { const tw = [...blk.querySelectorAll(".vk-line .kw")], tm = clauseMap(tw.map(w => w.textContent)), nT = Math.max(0, ...tw.map((_, i) => (tm.ids[i] === cs ? tm.cl[i] : -1))) + 1; tw.forEach((w, i) => w.classList.remove("ks")); } // 안 읽는 윗줄 = ↳ 읽는 마디의 짝 마디만 엷게
  { let wi = 0; if (wt) wt.forEach((x, i) => { if (x[0] <= tn) wi = i; }); else { let c = 0; ws.forEach((w, i) => { if (c / tot <= fr) wi = i; c += w.replace(/[「」]/g, "").length; }); } if (j.ci1 >= 0) { const i0 = planOf(j, j.k)?.[j.pl]?.[j.ci1]?.i0; if (i0 !== undefined) wi = Math.max(wi, i0); } pe.querySelectorAll(".pw").forEach(e => e.classList.toggle("pk", +e.dataset.w === wi)); } // ↳ 소리 = 지금 낱말 하나만 진한 노랑(그 말 w 시각)
}
function show(j) { // 지금 블록 표시 + 노래방 불(소리 위치 그대로)
  if (j.ph) return showPair(j);
  const blk = blkOf(j); if (!blk || !j.a) return; setPair(j, j.k);
  if (!blk.classList.contains("cur")) { j.root.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt")); blk.classList.add("cur"); }
  const ws = [...blk.querySelectorAll(".vk-line .kw")], tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = (j.a.currentTime + LEAD) / Math.max(0.2, j.a.duration || 1); let c = 0;
  if (from && from.k !== j.k) from = null;
  // 문장 안에서만 칠: 지금 소리 위치가 든 문장의 낱말만 불 · 앞 문장 칠은 지움 · 짝(↳) 줄의 같은 순서 문장에 연노랑
  const cm = clauseMap(ws.map(w => w.textContent)), ids = cm.ids, cl = cm.cl, gi = cm.gi, starts = []; // 칠하기 단위 = 쉼표 마디(gi) · ids = 문장 · cl = 문장 안 마디
  ws.forEach((w, i) => { if (starts[gi[i]] === undefined) starts[gi[i]] = c; c += wl(w); });
  const wt = wtOf(j.n, j.lang, j.bl[j.k].b, ws.length), tn = j.a.currentTime + LEAD; // wt = 강제 정렬 낱말 시각(있으면 그대로 · 없으면 글자 수 비율)
  let cg = 0; if (wt) { wt.forEach((x, i) => { if (x[0] <= tn) cg = gi[i]; }); } else starts.forEach((s0, q) => { if (s0 / tot <= fr) cg = q; });
  if (from && gi[from.wi] !== undefined) cg = Math.max(cg, gi[from.wi]); c = 0; if (j.c0 >= 0) { const pl = planOf(j, j.k); if (pl && gi[pl[j.lang][j.c0].i0] !== undefined) cg = Math.max(cg, gi[pl[j.lang][j.c0].i0]); } // 마디 구간으로 시작한 소리는 그 마디보다 앞 마디를 칠하지 않음 // 톡한 낱말의 마디보다 앞으로 되돌아가지 않음
  const cs = ids[gi.indexOf(cg)] ?? 0, cc = cl[gi.indexOf(cg)] ?? 0, ncl = Math.max(0, ...ws.map((_, i) => (ids[i] === cs ? cl[i] : -1))) + 1;
  ws.forEach((w, i) => { w.classList.toggle("kar", gi[i] === cg && (wt ? wt[i][0] <= tn : c / tot <= fr) && !(from && i < from.wi)); c += wl(w); });
  ws.forEach((w, i) => { w.classList.toggle("ks", gi[i] === cg && !(from && i < from.wi)); w.classList.toggle("kt", !!from && from.k === j.k && from.wi === i && w.classList.contains("kar")); }); // ks = 읽는 마디 연노랑(쉼표 마디 · 지난 마디 칠 지움) · kt = 톡한 낱말만 진한 노랑
  const ps = [...j.root.querySelectorAll(`.vk-note > .vk-pair[data-pb="${j.bl[j.k].b}"] .ps`)], tg = Math.min(cs, ps.length - 1);
  { const key = j.k + ":" + cs, fresh = j.fk !== key; j.fk = key; followLine(j, blk.querySelector(".kw.ks") || blk, fresh); } // 읽는 문장(없으면 블록)을 따라 카드 본문 넘김
  j.root.querySelectorAll(".vk-note .ps.on").forEach(e => { if (e !== ps[tg]) e.classList.remove("on"); }); ps[tg]?.classList.add("on");
  j.root.querySelectorAll(".vk-note .pc.on").forEach(e => e.classList.remove("on")); j.root.querySelectorAll(".vk-note .pw.pk").forEach(e => e.classList.remove("pk")); markClause(ps[tg], cc, ncl); // 읽는 쪽 = 낱말 진한 노랑 + 마디 엷게 · 안 읽는 쪽 = 짝 마디만 엷게(한 말·두 말 같음 · 마디 수 다르면 문장 통째 · 대표님 11-19 16:22)
}
const run = j => { clearInterval(tick); tick = setInterval(() => { if (!j.dead && !j.paused) { show(j); segCheck(j); } }, 40); };
// ── 마디 통역(대표님 11-20 13:20) — 두 말을 켜면 마디(쉼표·마침표로 끊은 단위)마다 [지금 말 마디] → [다른 말 마디] 번갈아 · 새 소리 없이 기존 블록 소리에서 마디 구간(낱말 시각 _w · 앞뒤 0.15초)만 틀음 · 마디 수가 다르면 문장 수가 같은 블록은 문장 번갈아 · 그것도 다르면 · 낱말 시각 없는 블록은 블록 통째 번갈아(옛 방식)
const other = l => (l === "ko" ? "ne" : "ko"), PAD = 0.15;
const SENT2 = /[.!?।॥][」"')”’』»]*$/; // 문장 끝(. ? ! । ॥ · 따옴표 안은 안 끊음)
const sentMap = texts => { let cid = 0, q = false; const cl = []; texts.forEach(t => { cl.push(cid); if ((String(t).match(/"/g) || []).length % 2) q = !q; if (!q && SENT2.test(t)) cid++; }); return { cl }; };
function mkPlan(j, k, mode) { // 단계(대표님 11-20 14:05) — ① 마디(쉼표·마침표) 수 같음 ② 아니면 문장 수 같음 ③ 아니면 null(블록 통째) · mode = "clause" | "sent"(검사용: 정해진 단계만)
  const b = j.bl[k].b, per = {};
  for (const l of ["ko", "ne"]) { const ws = String(j.bl[k][l] || "").split(/\s+/).filter(Boolean), wt = wtOf(j.n, l, b, ws.length); if (!wt) return null; per[l] = { ws, wt }; }
  const mk = (l, mp) => { const { ws, wt } = per[l], cm = mp(ws), gs = []; ws.forEach((_, i) => { (gs[cm.cl[i]] ||= []).push(i); }); const g2 = gs.filter(Boolean); if (!g2.length) return null;
    let pe = 0; return g2.map((g, ci) => { const st = wt[g[0]][0], ls = wt[g[g.length - 1]], e0 = ls[1] || ls[0] + 0.1, ns = g2[ci + 1] ? wt[g2[ci + 1][0]][0] : null, e = e0 + PAD, s = { st, i0: g[0], at: Math.max(pe, st - PAD), until: ns != null ? Math.max(e0, Math.min(e, ns - LEAD - 0.01)) : e }; pe = e0; return s; }); };
  for (const [nm, mp] of [["clause", commaMap], ["sent", sentMap]]) { if (mode && mode !== nm) continue; const o = { ko: mk("ko", mp), ne: mk("ne", mp) }; if (o.ko && o.ne && o.ko.length === o.ne.length) { o.level = nm; return o; } }
  return null;
}
const planOf = (j, k) => { j.plans = j.plans || {}; const key = k + ":" + j.lang; if (!(key in j.plans)) { let p = null; try { p = mkPlan(j, k); } catch {} j.plans[key] = p; } return j.plans[key]; };
export const planBlocks = (n, lang = "ne") => { const bl = noteBlocks(n), j = { n, lang, bl, plans: {} }; return bl.map((x, k) => ({ b: x.b, plan: planOf(j, k) })); }; // 검사·점검용: 블록마다 마디 구간표(없으면 null = 통째 번갈아)
function segCheck(j) { // 지금 말 마디 구간 끝(두 말 켬) · 다른 말 마디 구간 끝 = 그 소리 멈추고 다음 차례로
  const a = j.a; if (!a || j.dead || j.gap || j.fin || a.ended) return; const t = a.currentTime;
  if (j.half) { if (j.until != null && t >= j.until) finish(j, j.k, 1, j.ci1); return; }
  if (!j.both?.()) return; const pl = planOf(j, j.k); if (!pl) return; const S = pl[j.pl]; let c = Math.max(j.c0 | 0, 0); S.forEach((s, i) => { if (t + LEAD >= s.st) c = Math.max(c, i); });
  if (t >= S[c].until) finish(j, j.k, 0, c);
}
const goNext = j => { const [nk2, np, nc] = nxt(j); j.nph = np; j.nci = nc; j.nlg = np ? other(j.endLg || j.pl) : null; play(j, nk2, 0, false); }; // 다음 차례로(마디 · 블록)
function finish(j, k, ph, c) { // 한 소리 구간이 끝남(소리 끝 · 마디 구간 끝 둘 다) → 칠 지움 · 0.3초 뒤 다음 차례(두 말 상태는 그때 다시 봄)
  if (j.fin || j.dead) return; j.fin = 1; clearInterval(tick); const a = j.a; if (a) { a.onended = a.onerror = null; try { a.pause(); } catch {} }
  j.endK = k; j.endPh = ph; j.endC = c; j.endLg = j.pl; const nk = nxt(j)[0], b = blkOf(j); if (nk !== k) b?.classList.remove("cur");
  j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(w => w.classList.remove("kar", "ks", "kt")); j.root.querySelectorAll(".pw.pk").forEach(w => w.classList.remove("pk")); j.root.querySelectorAll(".vk-note .pc.on, .vk-note .ps.on").forEach(w => w.classList.remove("on")); clearHl(j.root); from = null;
  j.resumeK = nk === k ? k : k + 1; j.resumePh = 0;
  j.gap = setTimeout(() => { j.gap = 0; goNext(j); }, 300);
}
export function stopRead() { clearInterval(tick); document.querySelectorAll(".vk-card").forEach(c => cancelAnimationFrame(c.__anim)); tick = 0; if (cur) { clearTimeout(cur.gap); if (cur.a) { cur.a.onended = cur.a.onerror = null; try { cur.a.pause(); } catch {} } cur.dead = true; cur = null; } document.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); document.querySelectorAll(".vk-note .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt")); document.querySelectorAll(".vk-note .pw.pk").forEach(e => e.classList.remove("pk")); clearHl(); }
export const isReading = () => !!cur;
try { window.__noteJ = () => cur; } catch {} // 검사용: 지금 읽는 카드 상태(블록·차례·마디) — card_interp
export const isPaused = () => !!cur?.paused;
// 소리가 끝난 뒤 다음에 틀 것 = 틀기 직전 두 말 상태로 다시 정함(0.3초 틈·⏸ 중에 끄거나 켠 것도 먹음 · 11-20 D-119)
const nxt = j => { const k = j.endK, two = !!j.both?.(), pl = j.endC >= 0 ? planOf(j, k) : null; // [블록, 차례(0 지금 말·1 다른 말), 마디(-1 = 통째)]
  if (pl) { const n = pl.ko.length, c = j.endC; if (!j.endPh && two) return [k, 1, c]; return c + 1 < n ? [k, 0, c + 1] : [k + 1, 0, -1]; } // 두 말 끄면 남은 마디는 한 말로 이어서
  return !j.endPh && two ? [k, 1, -1] : [k + 1, 0, -1]; };
function play(j, k, at, hold, lead = 0, sec = null) { // k 블록을 at(0~1 비율)부터 · hold = 멈춘 채 그 자리만
  if (j.dead) return;
  if (k >= j.bl.length) { const f = j.done; stopRead(); f?.(); return; } // 끝까지 읽음 = 자동 이어 듣기가 다음으로(대표님 11-19 14:11)
  const ph = j.nph | 0, ci = j.nci ?? -1; j.nph = 0; j.nci = -1; if (ph && !j.both?.()) /* ↳ 차례인데 두 말이 꺼져 있으면(틈·⏸ 중 끔) 건너뜀 · 마디 중이면 남은 마디를 한 말로 이어 */ { const pl0 = ci >= 0 ? planOf(j, k) : null; if (pl0 && ci + 1 < pl0.ko.length) { j.nci = ci + 1; return play(j, k, 0, hold); } return play(j, k + 1, 0, hold); } j.half = ph; j.ph = ph; j.k = k; j.n = j.n || null; const blk = blkOf(j); if (!blk) return play(j, k + 1, 0, hold); setPair(j, k);
  // 두 말 듣기(대표님 11-19 14:30 · 기본 켬 · 자동/손 둘 다) = 블록마다 지금 말 소리 → 이어서 ↳ 다른 말 소리 · 끄면 한 말만
  const pl = j.nlg || (ph ? other(j.lang) : j.lang); j.nlg = null; j.pl = pl; j.ph = pl === j.lang ? 0 : 1; // half = 마디 짝 중 앞(0)·뒤(1) 차례 · ph = 지금 읽는 말이 윗줄 말이 아님(↳) — ⇄ 로 소리 도중 말이 바뀌면 둘이 달라질 수 있음
  { const pln = ci >= 0 ? planOf(j, k) : null, sg = pln ? pln[pl][ci] : null; j.fin = 0; j.until = sg && ph ? sg.until : null; j.ci1 = ph ? ci : -1; j.c0 = !ph && sg ? ci : -1; if (sg) { sec = sg.at; lead = 0; } } // 마디 구간 = 그 말 소리의 그 마디 자리부터(지금 말 = 끝까지 틀며 마디 끝에서 넘김 · 다른 말 = 그 마디 끝까지만)
  const pre = j.pre?.k === k && j.pre.ph === ph ? j.pre.a : null; j.pre = null; const a = (j.a = pre || new Audio(j.url(pl, j.bl[k].b))); a.preload = "auto"; j.resumeK = -1; j.resumePh = 0;
  const au = !!j.both?.(), nk = au && !ph ? k : k + 1, nph = au && !ph ? 1 : 0;
  if (!hold && j.bl[nk]) { try { const na = new Audio(j.url(nph ? other(j.lang) : j.lang, j.bl[nk].b)); na.preload = "auto"; na.load(); j.pre = { k: nk, ph: nph, a: na }; } catch {} } // 다음 소리 미리 받아 두기(끊김 방지)
  let started = false;
  a.onerror = () => { if (!started && !j.dead) { const au2 = !!j.both?.(); if (au2 && !ph) j.nph = 1; play(j, au2 && !ph ? k : k + 1, 0, hold); } };
  a.onended = () => { const pl2 = planOf(j, k), h = j.half; finish(j, k, h, h ? j.ci1 : pl2 ? pl2.ko.length - 1 : -1); }; // 소리가 끝까지 감(마디 구간 끝도 같은 길 · finish)
  const onMeta = () => { if (sec != null) { try { a.currentTime = Math.max(0, sec - lead); } catch {} } else if (at > 0 && a.duration) { try { a.currentTime = Math.max(0, at * a.duration - lead); } catch {} } if (hold && j.a === a) show(j); };
  if (a.readyState >= 1) onMeta(); else a.addEventListener("loadedmetadata", onMeta, { once: true }); // 미리 받아 둔 소리는 이미 메타가 와 있음
  if (hold) { j.paused = true; started = true; return; }
  j.paused = false;
  claim("card"); a.play().then(() => { started = true; if (j.a === a && !j.dead) { show(j); run(j); } }).catch(() => { if (!j.dead && !j.paused && j.a === a) play(j, k + 1, 0, false); });
}
export function readNote(root, it, n, koFirst, order, { from: fk = 0, wi = -1, url = null, done = null, both = null } = {}) {
  stopRead();
  const no = (order || []).indexOf(String(it.key || "").trim()) + 1; if (!no && !url) return; // 낱말 번호 = wordnote.json 의 _order 안 자리(1부터)
  const bl = noteBlocks(n); if (!bl.length) return;
  const j = (cur = { dead: false, a: null, k: 0, root, it, no, bl, n, lang: koFirst ? "ko" : "ne", paused: false, gap: 0, resumeK: -1, resumePh: 0, nph: 0, ph: 0, done, both, url: url || ((l, b) => `snd/wordnote/${it.ep}/${no}_${l}_${b}.mp3?v=10`) });
  const k0 = Math.min(fk, bl.length - 1);
  if (wi >= 0) { setPair(j, k0); return startAt(j, k0, wi); }
  play(j, k0, 0, false);
}
// 톡 = 멈춤 ⇄ 이어서(같은 소리 · 같은 자리). 읽는 중이 아니면 false(끝난 뒤 = 부르는 쪽이 처음부터 다시)
export function toggleRead() {
  const j = cur; if (!j) return false;
  if (!j.paused) { j.paused = true; clearTimeout(j.gap); j.gap = 0; clearInterval(tick); try { j.a?.pause(); } catch {} return true; }
  j.paused = false; clearTimeout(j.gap); j.gap = 0;
  if (j.resumeK >= 0 && (j.a?.ended || j.fin)) { goNext(j); return true; }
  claim("card"); j.a.play().then(() => { if (!j.dead && !j.paused) { show(j); run(j); } }).catch(() => {});
  return true;
}
// 다른 문장 블록을 톡 = 그 블록 처음부터(지금 말 · 뒤 블록으로 이어 읽음) · 지금 읽는(멈춘) 블록이면 멈춤⇄이어서 · 끝난 뒤엔 어느 블록이든 그 블록부터
export function tapBlock(b) {
  from = null;
  const j = cur, k = j ? j.bl.findIndex(x => x.b === b) : -1; if (!j || k < 0) return false;
  if (k === j.k && j.resumeK < 0) return toggleRead();
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick);
  if (j.a) { j.a.onended = j.a.onerror = null; try { j.a.pause(); } catch {} }
  j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt"));
  play(j, k, 0, false); return true;
}
// 문장 안 낱말을 톡(대표님 11-17) = 그 낱말 시작 소리부터(노래방 불과 같은 글자 비율 시간) · 지금 불 켜진 낱말을 톡 = 멈춤⇄이어서 · 다른 낱말 = 그 자리로 옮겨 계속 읽음(뒤 블록으로 이어짐)
export function tapWord(b, wi) {
  const j = cur, k = j ? j.bl.findIndex(x => x.b === b) : -1; if (!j || k < 0) return false;
  const ws = [...(blkOf({ root: j.root, bl: j.bl, k })?.querySelectorAll(".vk-line .kw") || [])]; if (!ws[wi]) return tapBlock(b);
  const tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = ws.slice(0, wi).reduce((s, w) => s + wl(w), 0) / tot;
  const wt = wtOf(j.n, j.lang, j.bl[k].b, ws.length), sec = wt ? wt[wi][0] : null, seek = d => (sec != null ? Math.max(0, sec - LEAD + 0.001) : Math.max(0, fr * d - LEAD + 0.001));
  const playing = k === j.k && j.resumeK < 0 && j.a && !j.ph; // 다른 말(↳) 차례엔 윗줄 낱말 시각이 안 맞으니 그 낱말부터 새로 읽음
  if (playing) {
    const pausedNow = j.paused || j.a.paused;
    if (!pausedNow && ws[wi].classList.contains("kar")) { // 읽는 중 켜진 낱말 톡 = 그 낱말 시작에서 멈춤 · 그 낱말만 노랑
      const d0 = j.a.duration || 0; if (d0) { try { j.a.currentTime = seek(d0); } catch {} }
      from = { k, wi }; j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt")); ws[wi].classList.add("kar"); return toggleRead();
    }
    const d = j.a.duration || 0; clearTimeout(j.gap); j.gap = 0;
    if (d) { try { j.a.currentTime = seek(d); } catch {} j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt")); from = { k, wi }; ws[wi].classList.add("kar"); }
    if (j.paused || j.a.paused) { j.paused = false; claim("card"); j.a.play().then(() => { if (!j.dead && !j.paused) { show(j); run(j); } }).catch(() => {}); } else show(j);
    return true;
  }
  return startAt(j, k, wi);
}
function startAt(j, k, wi) { // 그 낱말 시작 소리부터 새로 읽음(앞 칠 지움)
  const ws = [...(blkOf({ root: j.root, bl: j.bl, k })?.querySelectorAll(".vk-line .kw") || [])], tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = ws.slice(0, wi).reduce((s, w) => s + wl(w), 0) / tot;
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick);
  if (j.a) { j.a.onended = j.a.onerror = null; try { j.a.pause(); } catch {} }
  j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks").forEach(e => e.classList.remove("kar", "ks", "kt"));
  const wt = wtOf(j.n, j.lang, j.bl[k].b, ws.length); from = { k, wi };
  play(j, k, fr, false, fr > 0 ? LEAD - 0.001 : 0, wt && wi > 0 ? wt[wi][0] : null); return true;
}
// ⇄ — 글을 다시 그린 뒤 부름: 같은 블록 · 같은 비율 위치에서 새 말로(멈춰 있었으면 멈춘 채)
export function switchRead(koFirst) {
  const j = cur; if (!j) return;
  const a = j.a, ended = !!a?.ended || j.resumeK >= 0, fr = !ended && a?.duration ? a.currentTime / a.duration : 0, k = ended ? (j.resumeK >= 0 ? j.resumeK : j.k) : j.k;
  if (a && !ended && j.a === a && (a.currentTime > 0 || j.c0 >= 0 || j.ci1 >= 0)) { // 마디 소리가 막 시작(받는 중 · 시각 0)이어도 같은 소리 그대로 이어 읽음 — 처음부터·같은 마디 다시 읽지 않음(11-20 15:33 · D-127) // ⇄ = 지금 소리를 처음으로 안 돌리고 그대로 이어 읽음(칠도 이어짐) · 줄 끝나면 바뀐 순서대로 다음 블록(대표님 11-20 13:30 · D-125)
    const nl2 = koFirst ? "ko" : "ne", other = l => (l === "ko" ? "ne" : "ko"); j.lang = nl2; j.ph = j.pl === nl2 ? 0 : 1; j.pre = null;
    { const au = !!j.both?.(), nk = au && !j.ph ? k : k + 1, nph = au && !j.ph ? 1 : 0; if (!j.paused && j.bl[nk]) { try { const na = new Audio(j.url(nph ? other(j.lang) : j.lang, j.bl[nk].b)); na.preload = "auto"; na.load(); j.pre = { k: nk, ph: nph, a: na }; } catch {} } }
    j.root.querySelectorAll(".vk-line .kw.kar, .kw.ks, .kw.kt").forEach(e => e.classList.remove("kar", "ks", "kt")); j.root.querySelectorAll(".pw.pk").forEach(w => w.classList.remove("pk")); clearHl(j.root); from = null; show(j); return;
  }
  if (ended && !j.dead) { j.lang = koFirst ? "ko" : "ne"; j.pre = null; return; } // 소리가 막 끝난 틈(0.3초·⏸) 중 ⇄ = 아무것도 다시 안 틂 — 다음 차례는 finish 가 정한 대로(이미 읽은 말·마디는 건너뛰고 안 읽은 쪽부터) · 이후 블록·마디만 새 말 순서(대표님 11-20 15:06 · D-126)
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick); j.pre = null; // 미리 받아 둔 다음 블록 소리는 옛 말 것 — 버림(블록 사이 틈에 ⇄ 하면 옛 말로 이어 읽던 것)
  if (a) { a.onended = a.onerror = null; try { a.pause(); } catch {} }
  // 같은 낱말에서: 두 말 다 낱말 시각이 있으면 지금 낱말 번호 → 새 말 그 낱말 시작 시각 · 없으면 소리 위치 비율
  let sec = null; const b = j.bl[k]?.b, nl = koFirst ? "ko" : "ne", ob = a && !ended && b ? wtOf(j.n, j.lang, b, cntOf(j.n, j.lang, b)) : null, nb = b ? wtOf(j.n, nl, b, cntOf(j.n, nl, b)) : null;
  if (ob && nb && a) { let wi = -1; ob.forEach((x, i) => { if (x[0] <= a.currentTime + LEAD) wi = i; }); if (wi >= 0) sec = nb[wi][0]; }
  j.lang = nl;
  { const pe = ended && j.resumeK >= 0 && j.endC >= 0 && planOf(j, j.endK), pm = !ended && j.ph && j.ci1 >= 0 && planOf(j, j.k); // 마디 번갈아 중 ⇄ = 그 마디부터 새 말 먼저(미완 마디부터)
    if (pe) { const c = j.endPh ? j.endC + 1 : j.endC; j.fin = 0; j.nci = c < pe.ko.length ? c : -1; return play(j, c < pe.ko.length ? j.endK : j.endK + 1, 0, j.paused); }
    if (pm) { j.nci = j.ci1; return play(j, j.k, 0, j.paused); } }
  play(j, k, fr, j.paused, sec != null && sec > 0 ? LEAD - 0.001 : 0, sec != null && sec > 0 ? sec : null);
}
// 누른 자리에 실제 글씨가 있나(대표님 11-20 13:34) — 블록 상자 안의 빈 곳은 글씨 아님(= 그 자리에서 멈춤⇄이어서) · 좌표 없는 합성 click(0,0)은 글씨로 봄
export function hitText(root, e) {
  const x = e?.clientX, y = e?.clientY; if (!root || typeof x !== "number" || (!x && !y)) return true;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), r = document.createRange();
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!/\S/.test(n.nodeValue)) continue; r.selectNodeContents(n);
    for (const q of r.getClientRects()) if (x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2) return true;
  }
  return false;
}
