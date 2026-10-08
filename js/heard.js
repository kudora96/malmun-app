// 「들린 말」 한 줄 — 점수를 낸 그 인식 결과를 본보기와 음절 단위로 견줘 틀린 곳을 보여 준다(본부 10-04 · 투덜이 승인)
// 견주기 = 음절 편집 거리 정렬(띄어쓰기·문장부호 무시) · 틀린·더 들어간 음절 = 빨간 밑줄 · 빠진 자리 = 빨간 「_」 · 색만으로 구별하지 않게 밑줄도
import { esc } from "./text.js?v=1008.23";
import { similarity, align } from "./score.js?v=1008.23";

// 가장 높은 점수를 낸 들은 말
export function bestHeard(want, heard) {
  let best = null, sc = -1;
  for (const h of heard || []) { const s = similarity(want, h); if (s > sc) { sc = s; best = h; } }
  return best;
}

const keep = ch => /[\p{L}\p{N}]/u.test(ch);
// → { html, ok } · html = 들은 말(띄어쓰기는 들은 대로) + 표시 — 점수와 같은 정렬(score.js align)
//   초록 굵게 = 맞은 음절 · 빨간 밑줄 = 점수에 안 든 음절 전부(틀림 · 더 들어감 · 홀로 맞은 1음절) · 빠진 자리 = 빨간 「_」
export function heardHTML(want, got) {
  const { ops, score } = align(want, got), gAll = [...got];
  const mark = [], gapBefore = [0];
  for (const o of ops) {
    if (o.t === "d") { gapBefore[mark.length] = (gapBefore[mark.length] || 0) + 1; continue; }
    mark.push(o.ok ? "ok" : "bad"); gapBefore[mark.length] ||= 0;
  }
  let out = "", k = 0;
  const gap = c => `<mark class="miss" title="−">${"_".repeat(c)}</mark>`;
  for (const ch of gAll) {
    if (!keep(ch)) { out += esc(ch); continue; }
    if (gapBefore[k]) out += gap(gapBefore[k]);
    out += mark[k] === "bad" ? `<mark class="bad">${esc(ch)}</mark>` : `<b class="ok">${esc(ch)}</b>`; // 맞은 음절 = 초록 굵게(밑줄 없음 · 투덜이 제안)
    k++;
  }
  if (gapBefore[k]) out += gap(gapBefore[k]);
  return { html: out, ok: score === 100 };
}

// 끝난 까닭·틀린 곳 = 시간이 아니라 들은 내용으로(본부 10-06 — 끝까지 말했는데 「중간에 멈췄어요」가 나와 믿음이 깨짐)
//  점수와 같은 음절 정렬(score.js align)을 본보기의 띄어쓰기 낱말로 묶는다(「싶」만 틀려도 「싶어요」 통째로)
//  · { kind: "tail", tail } — 들은 음절이 다 맞고 본보기 뒤쪽만 비었다(빠진 뒷부분을 본보기 글자 그대로)
//  · { kind: "other" } — 맞은 음절이 거의 없다(본보기의 30% 미만)
//  · { kind: "words", words: [{ w, h }], restOk } — 바뀐 낱말(h = 들은 말) · 빠진 낱말(h = "") · 덧붙은 소리는 짚지 않음
//  · null — 틀린 낱말 없음
export function endHint(want, heard) {
  const got = bestHeard(want, heard); if (!got) return null;
  const { ops } = align(want, got), H = [...got].filter(keep);
  const words = String(want).split(/\s+/).map(x => ({ raw: x, n: [...x].filter(keep).length })).filter(x => x.n);
  const n = words.reduce((a, x) => a + x.n, 0); if (!n) return null;
  const ok = ops.filter(o => o.ok).length;
  let tailN = 0; for (let k = ops.length - 1; k >= 0 && ops[k].t === "d"; k--) tailN++;
  if (ok > 0 && tailN > 0 && ops.slice(0, ops.length - tailN).every(o => o.t === "m")) {
    let seen = 0, at = 0; const w = [...want];
    for (let k = 0; k < w.length; k++) { if (keep(w[k])) { if (seen === n - tailN) { at = k; break; } seen++; } }
    return { kind: "tail", tail: w.slice(at).join("").replace(/[.?!…,。、\s]+$/u, "").trim() };
  }
  if (ok / n < 0.3) return { kind: "other" };
  // 본보기 음절마다: 맞음/바뀜/빠짐 + 그 자리에 들은 음절
  const st = [], got1 = []; let wi = 0, hi = 0;
  for (const o of ops) {
    if (o.t === "m") { st[wi] = "m"; got1[wi] = H[hi]; wi++; hi++; }
    else if (o.t === "s") { st[wi] = "s"; got1[wi] = H[hi]; wi++; hi++; }
    else if (o.t === "d") { st[wi] = "d"; got1[wi] = ""; wi++; }
    else { if (wi > 0 && st[wi - 1] !== "m") got1[wi - 1] += H[hi]; hi++; } // 덧붙은 소리는 틀린 낱말 안일 때만 그 낱말 들은 말에 붙임
  }
  const out = []; let at = 0, anyOk = false;
  for (const w of words) {
    const ss = st.slice(at, at + w.n), hs = got1.slice(at, at + w.n).join(""); at += w.n;
    const clean = w.raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (ss.every(x => x === "m")) { anyOk = true; continue; }
    out.push({ w: clean, h: ss.every(x => x === "d") ? "" : hs });
  }
  return out.length ? { kind: "words", words: out, restOk: anyOk } : null;
}
