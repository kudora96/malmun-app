// 단어 카드 설명(대표님 11-16 「설명 창 방식 그대로」) — 위 = 지금 말(⇄ 상태) 본문 · 아래 「↳」 한 줄 = 다른 말 · ⇄ 누르면 그 자리에서 즉시 바뀜
// 읽기 소리 = 낱말 소리 다음에 뜻·쓰임 → 예문1 → 예문2 차례로(지금 말) · 읽는 줄에 노래방 불 · 파일 = media/wordnote/<편>/<낱말번호>_<ko|ne>_<mean|ex1|ex2>.mp3(말하기부가 만듦 · 없으면 건너뜀)
import { esc } from "./text.js?v=1117.1";

const BLK = [["mean", "ko_mean", "ne_mean"], ["ex1", "ko_ex1", "ne_ex1"], ["ex2", "ko_ex2", "ne_ex2"]];
const pick = (n, ko, k) => n?.[`${k ? "ko" : "ne"}_${ko}`] || n?.[`${k ? "ko" : "ne"}_${ko === "ex1" ? "ex" : ko}`] || ""; // ex1 = 옛 이름 ex 도 받음
export const noteBlocks = n => BLK.map(([b]) => ({ b, ko: pick(n, b, true), ne: pick(n, b, false) })).filter(x => x.ko && x.ne);
const kws = (s, lang, on = true) => String(s).split(/(\s+)/).map(t => (/^\s*$/.test(t) ? t : `<span class="${on ? "kw" : "kx"}" lang="${lang}">${esc(t)}</span>`)).join(""); // kw = 지금 말(톡·칠 대상) · kx = 숨은 말(⇄ 하면 서로 바뀜)

// 본문 = 지금 말 한 줄만(블록마다) · 바로 아래 「↳」 한 줄 = 그 블록의 다른 말(항상 다 보임) · 두 말은 겹침(.ghost)으로 높이 맞춤 → ⇄ 해도 크기 그대로
const SENT_END = /[.!?。।][」"')]*$/;
const splitSent = t => String(t).split(/(?<=[.!?。।][」"')]*)\s+/).filter(Boolean); // 문장 나누기(마침표 뒤 띄어쓰기) — 두 말을 순서대로 짝지음
const pairInner = t => `<span class="arr" aria-hidden="true">↳</span> ${splitSent(t).map((x, i) => `<span class="ps" data-s="${i}">${esc(x)}</span>`).join(" ")}`;
export function noteHTML(n, koFirst) { // 두 말 글을 처음부터 다 그려 둠 → ⇄ 는 글을 다시 그리지 않고 보임만 바꿈(applyMode)
  const bl = noteBlocks(n); if (!bl.length) return "";
  return `<div class="vk-sent vk-note">${bl.map(x => `<div class="vk-blk" data-b="${x.b}"><p class="vk-s vk-line">${["ko", "ne"].map(l => `<span class="vis ly mn" data-l="${l}" lang="${l}">${kws(x[l], l, (l === "ko") === !!koFirst)}</span>`).join("")}</p></div><p class="vk-s vk-pair pairln" data-pb="${x.b}">${["ko", "ne"].map(l => `<span class="vis ly pr" data-l="${l}" lang="${l}">${pairInner(x[l])}</span>`).join("")}</p>`).join("")}</div>`;
}
// ⇄ — 카드 글을 그대로 두고 보이는 말만 바꿈(다시 그리지 않음 · 전환 효과 없음)
export function applyMode(card, ko) {
  const m = ko ? "ko" : "ne"; card.dataset.m = m;
  card.querySelectorAll(".vk-line .mn").forEach(ly => ly.querySelectorAll(".kw,.kx").forEach(w => { const on = ly.dataset.l === m; w.classList.toggle("kw", on); w.classList.toggle("kx", !on); w.classList.remove("kar"); }));
  card.querySelectorAll(".ps.on").forEach(e => e.classList.remove("on"));
}
const clearHl = root => (root || document).querySelectorAll(".vk-note .ps.on").forEach(e => e.classList.remove("on"));
function setPair() {} // (옛) 읽는 블록 칸에만 글 — 이제 ↳ 줄은 항상 다 보임
export const curBlock = () => (cur ? cur.bl[cur.k]?.b : "");

// ── 읽기 소리 — 설명 읽기 화면과 같은 방식: 저절로 시작 · 글을 톡 = 그 자리에서 멈춤 · 다시 톡 = 같은 자리에서 이어서 · ⇄ = 같은 블록·같은 위치에서 새 말로
let cur = null, tick = 0, from = null; // from = 낱말을 톡 한 자리(블록·낱말 번호) — 노란 칠은 그 낱말부터 새로 자람(대표님 11-17)
const LEAD = 0.1, wl = w => w.textContent.replace(/[「」]/g, "").length; // 노래방 비율 = 소리 나는 글자만(「」는 안 읽음)
const blkOf = j => j.root.querySelector(`.vk-blk[data-b="${j.bl[j.k]?.b}"]`);
function show(j) { // 지금 블록 표시 + 노래방 불(소리 위치 그대로)
  const blk = blkOf(j); if (!blk || !j.a) return; setPair(j, j.k);
  if (!blk.classList.contains("cur")) { j.root.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); blk.classList.add("cur"); }
  const ws = [...blk.querySelectorAll(".vk-line .kw")], tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = (j.a.currentTime + LEAD) / Math.max(0.2, j.a.duration || 1); let c = 0;
  if (from && from.k !== j.k) from = null;
  // 문장 안에서만 칠: 지금 소리 위치가 든 문장의 낱말만 불 · 앞 문장 칠은 지움 · 짝(↳) 줄의 같은 순서 문장에 연노랑
  let sid = 0; const ids = ws.map(w => { const r = sid; if (SENT_END.test(w.textContent)) sid++; return r; }), starts = [];
  ws.forEach((w, i) => { if (starts[ids[i]] === undefined) starts[ids[i]] = c; c += wl(w); });
  let cs = 0; starts.forEach((s0, q) => { if (s0 / tot <= fr) cs = q; }); if (from && ids[from.wi] !== undefined) cs = Math.max(cs, ids[from.wi]); c = 0; // 톡한 낱말의 문장보다 앞 문장으로 되돌아가지 않음
  ws.forEach((w, i) => { w.classList.toggle("kar", ids[i] === cs && c / tot <= fr && !(from && i < from.wi)); c += wl(w); });
  const ps = [...j.root.querySelectorAll(`.vk-note > .vk-pair[data-pb="${j.bl[j.k].b}"] .pr[data-l="${j.lang === "ko" ? "ne" : "ko"}"] .ps`)], tg = Math.min(cs, ps.length - 1);
  j.root.querySelectorAll(".vk-note .ps.on").forEach(e => { if (e !== ps[tg]) e.classList.remove("on"); }); ps[tg]?.classList.add("on");
}
const run = j => { clearInterval(tick); tick = setInterval(() => { if (!j.dead && !j.paused) show(j); }, 40); };
export function stopRead() { clearInterval(tick); tick = 0; if (cur) { clearTimeout(cur.gap); if (cur.a) { cur.a.onended = cur.a.onerror = null; try { cur.a.pause(); } catch {} } cur.dead = true; cur = null; } document.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); document.querySelectorAll(".vk-note .kw.kar").forEach(e => e.classList.remove("kar")); clearHl(); }
export const isReading = () => !!cur;
export const isPaused = () => !!cur?.paused;
function play(j, k, at, hold, lead = 0) { // k 블록을 at(0~1 비율)부터 · hold = 멈춘 채 그 자리만
  if (j.dead) return;
  if (k >= j.bl.length) return stopRead();
  j.k = k; const blk = blkOf(j); if (!blk) return play(j, k + 1, 0, hold); setPair(j, k);
  const pre = j.pre?.k === k ? j.pre.a : null; j.pre = null; const a = (j.a = pre || new Audio(j.url(j.lang, j.bl[k].b))); a.preload = "auto"; j.resumeK = -1;
  if (!hold && j.bl[k + 1]) { try { const na = new Audio(j.url(j.lang, j.bl[k + 1].b)); na.preload = "auto"; na.load(); j.pre = { k: k + 1, a: na }; } catch {} } // 다음 블록 소리 미리 받아 두기(끊김 방지)
  let started = false;
  a.onerror = () => { if (!started && !j.dead) play(j, k + 1, 0, hold); };
  a.onended = () => { clearInterval(tick); const b = blkOf(j); b?.classList.remove("cur"); j.root.querySelectorAll(".vk-line .kw.kar").forEach(w => w.classList.remove("kar")); clearHl(j.root); from = null; j.resumeK = k + 1; j.gap = setTimeout(() => { j.gap = 0; play(j, k + 1, 0, false); }, 300); };
  a.addEventListener("loadedmetadata", () => { if (at > 0 && a.duration) { try { a.currentTime = Math.max(0, at * a.duration - lead); } catch {} } if (hold && j.a === a) show(j); }, { once: true });
  if (hold) { j.paused = true; started = true; return; }
  j.paused = false;
  a.play().then(() => { started = true; if (j.a === a && !j.dead) { show(j); run(j); } }).catch(() => { if (!j.dead && !j.paused && j.a === a) play(j, k + 1, 0, false); });
}
export function readNote(root, it, n, koFirst, order, { from: fk = 0, wi = -1, url = null } = {}) {
  stopRead();
  const no = (order || []).indexOf(String(it.key || "").trim()) + 1; if (!no && !url) return; // 낱말 번호 = wordnote.json 의 _order 안 자리(1부터)
  const bl = noteBlocks(n); if (!bl.length) return;
  const j = (cur = { dead: false, a: null, k: 0, root, it, no, bl, lang: koFirst ? "ko" : "ne", paused: false, gap: 0, resumeK: -1, url: url || ((l, b) => `snd/wordnote/${it.ep}/${no}_${l}_${b}.mp3?v=2`) });
  const k0 = Math.min(fk, bl.length - 1);
  if (wi >= 0) { setPair(j, k0); return startAt(j, k0, wi); }
  play(j, k0, 0, false);
}
// 톡 = 멈춤 ⇄ 이어서(같은 소리 · 같은 자리). 읽는 중이 아니면 false(끝난 뒤 = 부르는 쪽이 처음부터 다시)
export function toggleRead() {
  const j = cur; if (!j) return false;
  if (!j.paused) { j.paused = true; clearTimeout(j.gap); j.gap = 0; clearInterval(tick); try { j.a?.pause(); } catch {} return true; }
  j.paused = false; clearTimeout(j.gap); j.gap = 0;
  if (j.resumeK >= 0 && j.a?.ended) { play(j, j.resumeK, 0, false); return true; }
  j.a.play().then(() => { if (!j.dead && !j.paused) { show(j); run(j); } }).catch(() => {});
  return true;
}
// 다른 문장 블록을 톡 = 그 블록 처음부터(지금 말 · 뒤 블록으로 이어 읽음) · 지금 읽는(멈춘) 블록이면 멈춤⇄이어서 · 끝난 뒤엔 어느 블록이든 그 블록부터
export function tapBlock(b) {
  from = null;
  const j = cur, k = j ? j.bl.findIndex(x => x.b === b) : -1; if (!j || k < 0) return false;
  if (k === j.k && j.resumeK < 0) return toggleRead();
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick);
  if (j.a) { j.a.onended = j.a.onerror = null; try { j.a.pause(); } catch {} }
  j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar"));
  play(j, k, 0, false); return true;
}
// 문장 안 낱말을 톡(대표님 11-17) = 그 낱말 시작 소리부터(노래방 불과 같은 글자 비율 시간) · 지금 불 켜진 낱말을 톡 = 멈춤⇄이어서 · 다른 낱말 = 그 자리로 옮겨 계속 읽음(뒤 블록으로 이어짐)
export function tapWord(b, wi) {
  const j = cur, k = j ? j.bl.findIndex(x => x.b === b) : -1; if (!j || k < 0) return false;
  const ws = [...(blkOf({ root: j.root, bl: j.bl, k })?.querySelectorAll(".vk-line .kw") || [])]; if (!ws[wi]) return tapBlock(b);
  const tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = ws.slice(0, wi).reduce((s, w) => s + wl(w), 0) / tot;
  const playing = k === j.k && j.resumeK < 0 && j.a;
  if (playing) {
    const pausedNow = j.paused || j.a.paused;
    if (!pausedNow && ws[wi].classList.contains("kar")) { // 읽는 중 켜진 낱말 톡 = 그 낱말 시작에서 멈춤 · 그 낱말만 노랑
      const d0 = j.a.duration || 0; if (d0) { try { j.a.currentTime = Math.max(0, fr * d0 - LEAD + 0.001); } catch {} }
      from = { k, wi }; j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); ws[wi].classList.add("kar"); return toggleRead();
    }
    const d = j.a.duration || 0; clearTimeout(j.gap); j.gap = 0;
    if (d) { try { j.a.currentTime = Math.max(0, fr * d - LEAD + 0.001); } catch {} j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); from = { k, wi }; ws[wi].classList.add("kar"); }
    if (j.paused || j.a.paused) { j.paused = false; j.a.play().then(() => { if (!j.dead && !j.paused) { show(j); run(j); } }).catch(() => {}); } else show(j);
    return true;
  }
  return startAt(j, k, wi);
}
function startAt(j, k, wi) { // 그 낱말 시작 소리부터 새로 읽음(앞 칠 지움)
  const ws = [...(blkOf({ root: j.root, bl: j.bl, k })?.querySelectorAll(".vk-line .kw") || [])], tot = ws.reduce((s, w) => s + wl(w), 0) || 1, fr = ws.slice(0, wi).reduce((s, w) => s + wl(w), 0) / tot;
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick);
  if (j.a) { j.a.onended = j.a.onerror = null; try { j.a.pause(); } catch {} }
  j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar"));
  from = { k, wi };
  play(j, k, fr, false, fr > 0 ? LEAD - 0.001 : 0); return true;
}
// ⇄ — 글을 다시 그린 뒤 부름: 같은 블록 · 같은 비율 위치에서 새 말로(멈춰 있었으면 멈춘 채)
export function switchRead(koFirst) {
  const j = cur; if (!j) return;
  const a = j.a, ended = !!a?.ended || j.resumeK >= 0, fr = !ended && a?.duration ? a.currentTime / a.duration : 0, k = ended ? (j.resumeK >= 0 ? j.resumeK : j.k) : j.k;
  clearTimeout(j.gap); j.gap = 0; clearInterval(tick);
  if (a) { a.onended = a.onerror = null; try { a.pause(); } catch {} }
  j.lang = koFirst ? "ko" : "ne";
  play(j, k, fr, j.paused);
}
