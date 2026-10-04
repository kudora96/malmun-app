// 「들린 말」 한 줄 — 점수를 낸 그 인식 결과를 본보기와 음절 단위로 견줘 틀린 곳을 보여 준다(본부 10-04 · 투덜이 승인)
// 견주기 = 음절 편집 거리 정렬(띄어쓰기·문장부호 무시) · 틀린·더 들어간 음절 = 빨간 밑줄 · 빠진 자리 = 빨간 「_」 · 색만으로 구별하지 않게 밑줄도
import { esc } from "./text.js?v=1004.13";
import { similarity } from "./screens/speak.js?v=1004.13";

// 가장 높은 점수를 낸 들은 말
export function bestHeard(want, heard) {
  let best = null, sc = -1;
  for (const h of heard || []) { const s = similarity(want, h); if (s > sc) { sc = s; best = h; } }
  return best;
}

const keep = ch => /[\p{L}\p{N}]/u.test(ch);
// → { html, ok } · html = 들은 말(띄어쓰기는 들은 대로) + 틀린 곳 표시
export function heardHTML(want, got) {
  const a = [...want].filter(keep), gAll = [...got], g = gAll.filter(keep);
  const n = a.length, m = g.length, d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === g[j - 1] ? 0 : 1));
  // 뒤에서부터 따라가며 들은 음절마다 맞음/틀림 · 빠진 본보기 음절은 그 앞 들은 음절 자리에 「_」
  const mark = Array(m).fill("ok"), gapBefore = Array(m + 1).fill(0);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === g[j - 1] ? 0 : 1)) { if (a[i - 1] !== g[j - 1]) mark[j - 1] = "bad"; i--; j--; }
    else if (j > 0 && d[i][j] === d[i][j - 1] + 1) { mark[j - 1] = "bad"; j--; }
    else { gapBefore[j]++; i--; }
  }
  let out = "", k = 0, ok = d[n][m] === 0;
  const gap = c => `<mark class="miss" title="−">${"_".repeat(c)}</mark>`;
  for (const ch of gAll) {
    if (!keep(ch)) { out += esc(ch); continue; }
    if (gapBefore[k]) out += gap(gapBefore[k]);
    out += mark[k] === "bad" ? `<mark class="bad">${esc(ch)}</mark>` : esc(ch);
    k++;
  }
  if (gapBefore[m]) out += gap(gapBefore[m]);
  return { html: out, ok };
}
