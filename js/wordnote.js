// 단어 카드 설명(대표님 11-16 「설명 창 방식 그대로」) — 위 = 지금 말(⇄ 상태) 본문 · 아래 「↳」 한 줄 = 다른 말 · ⇄ 누르면 그 자리에서 즉시 바뀜
// 읽기 소리 = 낱말 소리 다음에 뜻·쓰임 → 예문1 → 예문2 차례로(지금 말) · 읽는 줄에 노래방 불 · 파일 = media/wordnote/<편>/<낱말번호>_<ko|ne>_<mean|ex1|ex2>.mp3(말하기부가 만듦 · 없으면 건너뜀)
import { esc } from "./text.js?v=1116.28";

const BLK = [["mean", "ko_mean", "ne_mean"], ["ex1", "ko_ex1", "ne_ex1"], ["ex2", "ko_ex2", "ne_ex2"]];
const pick = (n, ko, k) => n?.[`${k ? "ko" : "ne"}_${ko}`] || n?.[`${k ? "ko" : "ne"}_${ko === "ex1" ? "ex" : ko}`] || ""; // ex1 = 옛 이름 ex 도 받음
export const noteBlocks = n => BLK.map(([b]) => ({ b, ko: pick(n, b, true), ne: pick(n, b, false) })).filter(x => x.ko && x.ne);
const kws = (s, lang) => String(s).split(/(\s+)/).map(t => (/^\s*$/.test(t) ? t : `<span class="kw" lang="${lang}">${esc(t)}</span>`)).join("");

// 본문 = 지금 말 한 줄(위) + 「↳」 다른 말 한 줄(아래) — 블록마다
export function noteHTML(n, koFirst) {
  const bl = noteBlocks(n); if (!bl.length) return "";
  return `<div class="vk-sent vk-note">${bl.map(x => {
    const [a, al, b, bl2] = koFirst ? [x.ko, "ko", x.ne, "ne"] : [x.ne, "ne", x.ko, "ko"];
    return `<div class="vk-blk" data-b="${x.b}"><p class="vk-s vk-line" lang="${al}">${kws(a, al)}</p><p class="vk-s vk-pair" lang="${bl2}"><span class="arr" aria-hidden="true">↳</span> ${esc(b)}</p></div>`;
  }).join("")}</div>`;
}

// ── 읽기 소리 — 설명 읽기 화면과 같은 방식: 저절로 시작 · 글을 톡 = 그 자리에서 멈춤 · 다시 톡 = 같은 자리에서 이어서 · ⇄ = 같은 블록·같은 위치에서 새 말로
let cur = null, tick = 0, from = null; // from = 낱말을 톡 한 자리(블록·낱말 번호) — 노란 칠은 그 낱말부터 새로 자람(대표님 11-17)
const LEAD = 0.1;
const blkOf = j => j.root.querySelector(`.vk-blk[data-b="${j.bl[j.k]?.b}"]`);
function show(j) { // 지금 블록 표시 + 노래방 불(소리 위치 그대로)
  const blk = blkOf(j); if (!blk || !j.a) return;
  if (!blk.classList.contains("cur")) { j.root.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); blk.classList.add("cur"); }
  const ws = [...blk.querySelectorAll(".vk-line .kw")], tot = ws.reduce((s, w) => s + w.textContent.length, 0) || 1, fr = (j.a.currentTime + LEAD) / Math.max(0.2, j.a.duration || 1); let c = 0;
  if (from && from.k !== j.k) from = null;
  ws.forEach((w, i) => { w.classList.toggle("kar", c / tot <= fr && !(from && i < from.wi)); c += w.textContent.length; });
}
const run = j => { clearInterval(tick); tick = setInterval(() => { if (!j.dead && !j.paused) show(j); }, 40); };
export function stopRead() { clearInterval(tick); tick = 0; if (cur) { clearTimeout(cur.gap); if (cur.a) { cur.a.onended = cur.a.onerror = null; try { cur.a.pause(); } catch {} } cur.dead = true; cur = null; } document.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); document.querySelectorAll(".vk-note .kw.kar").forEach(e => e.classList.remove("kar")); }
export const isReading = () => !!cur;
export const isPaused = () => !!cur?.paused;
function play(j, k, at, hold, lead = 0) { // k 블록을 at(0~1 비율)부터 · hold = 멈춘 채 그 자리만
  if (j.dead) return;
  if (k >= j.bl.length) return stopRead();
  j.k = k; const blk = blkOf(j); if (!blk) return play(j, k + 1, 0, hold);
  const a = (j.a = new Audio(`snd/wordnote/${j.it.ep}/${j.no}_${j.lang}_${j.bl[k].b}.mp3?v=1`)); a.preload = "auto"; j.resumeK = -1;
  let started = false;
  a.onerror = () => { if (!started && !j.dead) play(j, k + 1, 0, hold); };
  a.onended = () => { clearInterval(tick); const b = blkOf(j); b?.classList.remove("cur"); b?.querySelectorAll(".vk-line .kw").forEach(w => w.classList.add("kar")); j.resumeK = k + 1; j.gap = setTimeout(() => { j.gap = 0; play(j, k + 1, 0, false); }, 350); };
  a.addEventListener("loadedmetadata", () => { if (at > 0 && a.duration) { try { a.currentTime = Math.max(0, at * a.duration - lead); } catch {} } if (hold && j.a === a) show(j); }, { once: true });
  if (hold) { j.paused = true; started = true; return; }
  j.paused = false;
  a.play().then(() => { started = true; if (j.a === a && !j.dead) { show(j); run(j); } }).catch(() => { if (!j.dead && !j.paused && j.a === a) play(j, k + 1, 0, false); });
}
export function readNote(root, it, n, koFirst, order, { from = 0 } = {}) {
  stopRead();
  const no = (order || []).indexOf(String(it.key || "").trim()) + 1; if (!no) return; // 낱말 번호 = wordnote.json 의 _order 안 자리(1부터)
  const bl = noteBlocks(n); if (!bl.length) return;
  const j = (cur = { dead: false, a: null, k: 0, root, it, no, bl, lang: koFirst ? "ko" : "ne", paused: false, gap: 0, resumeK: -1 });
  play(j, Math.min(from, bl.length - 1), 0, false);
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
  const tot = ws.reduce((s, w) => s + w.textContent.length, 0) || 1, fr = ws.slice(0, wi).reduce((s, w) => s + w.textContent.length, 0) / tot;
  const playing = k === j.k && j.resumeK < 0 && j.a;
  if (playing) {
    const on = ws.reduce((m, w, i) => (w.classList.contains("kar") ? i : m), -1); // 지금 불 켜진 낱말
    if (on === wi) return toggleRead();
    const d = j.a.duration || 0; clearTimeout(j.gap); j.gap = 0;
    if (d) { try { j.a.currentTime = Math.max(0, fr * d - LEAD + 0.001); } catch {} j.root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); from = { k, wi }; ws[wi].classList.add("kar"); }
    if (j.paused || j.a.paused) { j.paused = false; j.a.play().then(() => { if (!j.dead && !j.paused) { show(j); run(j); } }).catch(() => {}); } else show(j);
    return true;
  }
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
