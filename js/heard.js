// 「들린 말」 한 줄 — 점수를 낸 그 인식 결과를 본보기와 음절 단위로 견줘 틀린 곳을 보여 준다(본부 10-04 · 투덜이 승인)
// 견주기 = 음절 편집 거리 정렬(띄어쓰기·문장부호 무시) · 틀린·더 들어간 음절 = 빨간 밑줄 · 빠진 자리 = 빨간 「_」 · 색만으로 구별하지 않게 밑줄도
import { esc } from "./text.js?v=1006.14";
import { similarity, align } from "./score.js?v=1006.14";

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
