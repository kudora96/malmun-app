// 단어 카드 설명(대표님 11-16 「설명 창 방식 그대로」) — 위 = 지금 말(⇄ 상태) 본문 · 아래 「↳」 한 줄 = 다른 말 · ⇄ 누르면 그 자리에서 즉시 바뀜
// 읽기 소리 = 낱말 소리 다음에 뜻·쓰임 → 예문1 → 예문2 차례로(지금 말) · 읽는 줄에 노래방 불 · 파일 = media/wordnote/<편>/<낱말번호>_<ko|ne>_<mean|ex1|ex2>.mp3(말하기부가 만듦 · 없으면 건너뜀)
import { esc } from "./text.js?v=1116.12";

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

// ── 읽기 소리
let cur = null, tick = 0;
export function stopRead() { clearInterval(tick); tick = 0; if (cur) { try { cur.a.pause(); } catch {} cur.dead = true; cur = null; } document.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); document.querySelectorAll(".vk-note .kw.kar").forEach(e => e.classList.remove("kar")); }
const LEAD = 0.1;
export function readNote(root, it, n, koFirst, order) {
  stopRead();
  const no = (order || []).indexOf(String(it.key || "").trim()) + 1; if (!no) return; // 낱말 번호 = wordnote.json 의 _order 안 자리(1부터)
  const lang = koFirst ? "ko" : "ne", bl = noteBlocks(n);
  const job = (cur = { dead: false, a: null });
  const go = k => {
    if (job.dead || k >= bl.length) return k >= bl.length && stopRead();
    const blk = root.querySelector(`.vk-blk[data-b="${bl[k].b}"]`); if (!blk) return go(k + 1);
    const a = (job.a = new Audio(`media/wordnote/${it.ep}/${no}_${lang}_${bl[k].b}.mp3?v=1`)); a.preload = "auto";
    let started = false;
    a.onerror = () => { if (!started) go(k + 1); };
    a.onended = () => { blk.classList.remove("cur"); blk.querySelectorAll(".vk-line .kw").forEach(w => w.classList.add("kar")); setTimeout(() => go(k + 1), 350); };
    a.play().then(() => {
      started = true; root.querySelectorAll(".vk-blk.cur").forEach(e => e.classList.remove("cur")); root.querySelectorAll(".vk-line .kw.kar").forEach(e => e.classList.remove("kar")); blk.classList.add("cur");
      clearInterval(tick); const ws = [...blk.querySelectorAll(".vk-line .kw")], tot = ws.reduce((s, w) => s + w.textContent.length, 0) || 1;
      tick = setInterval(() => { if (job.dead) return; const fr = (a.currentTime + LEAD) / Math.max(0.2, a.duration || 1); let c = 0; ws.forEach(w => { w.classList.toggle("kar", c / tot <= fr); c += w.textContent.length; }); }, 40);
    }).catch(() => go(k + 1));
  };
  go(0);
}
