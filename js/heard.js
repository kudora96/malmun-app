// 「들린 말」 한 줄 — 점수를 낸 그 인식 결과를 본보기와 음절 단위로 견줘 틀린 곳을 보여 준다(본부 10-04 · 투덜이 승인)
// 견주기 = 음절 편집 거리 정렬(띄어쓰기·문장부호 무시) · 틀린·더 들어간 음절 = 빨간 밑줄 · 빠진 자리 = 빨간 「_」 · 색만으로 구별하지 않게 밑줄도
import { esc } from "./text.js?v=1022.17";
import { similarity, align } from "./score.js?v=1022.17";

const keep = ch => /[\p{L}\p{N}]/u.test(ch);
// 덧붙은 말 빼고 견주기(본부 10-11) — 본보기 앞뒤에 다른 말을 더 해도(대사 한 줄 통째로 등) 본보기와 가장 잘 맞는 이어진 토막만 점수
//  들은 말 → 음절 낱개 [{ ch, a, b }] (a·b = 원래 글자 자리 · score.js 와 같은 바꿈: 500 → 오백 · 숫자 → 한 글자씩)
const NUM = { "0": "영", "1": "일", "2": "이", "3": "삼", "4": "사", "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구" };
export function sylsAt(s) {
  const cs = [...String(s ?? "")], out = [];
  for (let i = 0; i < cs.length;) {
    if (cs[i] === "5" && cs[i + 1] === "0" && cs[i + 2] === "0") { out.push({ ch: "오", a: i, b: i + 3 }, { ch: "백", a: i, b: i + 3 }); i += 3; continue; }
    if (/[0-9]/.test(cs[i])) out.push({ ch: NUM[cs[i]], a: i, b: i + 1 }); else if (keep(cs[i])) out.push({ ch: cs[i], a: i, b: i + 1 });
    i++;
  }
  return { cs, out };
}
const cvOf = ch => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? Math.floor(c / 28) : ch; }; // 첫소리+모음
const near = (x, y) => x === y || cvOf(x) === cvOf(y);
// 토막 고르기 규칙:
//  1) 덧붙은 말 = 띄어쓰기 낱말 통째로만(「환영합니다」의 「다」처럼 낱말 일부를 떼지 않음 — 틀린 끝말은 틀림 그대로)
//  2) 후보 = 들은 말의 이어진 낱말 [w0, w1] · 점수 = score.js 그대로(맞은 음절 ÷ max(본보기, 토막)) — 토막을 넓혀도 맞은 수는 안 늘어 부풀지 않음
//  3) 가장 높은 점수 · 같으면 통째(덧붙은 말 없음)가 먼저 · 그다음 뒤쪽 토막(다시 말한 것)
//  4) 더듬음은 덧붙은 말이 아님 — 토막 바로 앞 짧은 낱말(2음절 이하)의 끝 음절이 토막 첫 음절과 같거나 첫소리+모음이 같으면(「이 있어요」) · 뒤도 같게(「있어요 요」) 토막에 넣음
// → { text, pre, post, j0, j1, m, score } · j0·j1 = 토막 음절(들은 말 음절 차례) · pre/post = 덧붙은 말(원래 글자 그대로)
export function spanOf(want, got) {
  got = String(got ?? "");
  const { cs, out: H } = sylsAt(got), m = H.length, n = sylsAt(want).out.length, all = similarity(want, got);
  const whole = { text: got, pre: "", post: "", j0: 0, j1: m, m, score: all };
  if (!m || !n || all === 100) return whole;
  // 낱말 = 띄어쓰기로 나눈 덩어리 → 음절 [f, l)
  const wd = []; for (let j = 0; j < m; j++) { const gap = j > 0 && cs.slice(H[j - 1].b, H[j].a).some(ch => /\s/.test(ch)); if (!j || gap) wd.push({ f: j, l: j + 1 }); else wd[wd.length - 1].l = j + 1; }
  if (wd.length < 2) return whole;
  const txt = (j0, j1) => cs.slice(H[j0].a, H[j1 - 1].b).join("");
  let best = null;
  for (let w0 = 0; w0 < wd.length; w0++) for (let w1 = w0; w1 < wd.length && wd[w1].l - wd[w0].f <= 2 * n + 4; w1++) {
    if (w0 === 0 && w1 === wd.length - 1) continue;
    const sc = similarity(want, txt(wd[w0].f, wd[w1].l)); if (!best || sc >= best.score) best = { w0, w1, score: sc };
  }
  if (!best || best.score <= all) return whole;
  let { w0, w1 } = best;
  const short = w => wd[w].l - wd[w].f <= 2;
  for (let c = 0; c < 2 && w0 > 0 && short(w0 - 1) && near(H[wd[w0 - 1].l - 1].ch, H[wd[w0].f].ch); c++) w0--;
  for (let c = 0; c < 2 && w1 < wd.length - 1 && short(w1 + 1) && near(H[wd[w1 + 1].f].ch, H[wd[w1].l - 1].ch); c++) w1++;
  if (w0 === 0 && w1 === wd.length - 1) return whole;
  const j0 = wd[w0].f, j1 = wd[w1].l, a = H[j0].a, b = H[j1 - 1].b, text = cs.slice(a, b).join("");
  return { text, pre: cs.slice(0, a).join(""), post: cs.slice(b).join(""), j0, j1, m, score: similarity(want, text) };
}
// 들은 말 하나의 점수(덧붙은 말 뺀 토막) · 여럿이면 가장 높은 것 · 없으면 null
export const heardScore = (want, h) => spanOf(want, h).score;
export const scoreOf = (want, heard) => (heard?.length ? Math.max(...heard.map(h => heardScore(want, h))) : null);
// 가장 높은 점수를 낸 들은 말(통째 · 덧붙은 말 포함)
export function bestFull(want, heard) {
  let best = null, sc = -1;
  for (const h of heard || []) { const s = heardScore(want, h); if (s > sc) { sc = s; best = h; } }
  return best;
}
// 가장 높은 점수를 낸 들은 말의 토막(덧붙은 말 뺌 — 끝난 까닭·리듬·비교 화면이 쓰는 것)
export function bestHeard(want, heard) { const f = bestFull(want, heard); return f == null ? null : spanOf(want, f).text; }
// → { html, ok } · html = 들은 말(띄어쓰기는 들은 대로) + 표시 — 점수와 같은 정렬(score.js align)
//   초록 굵게 = 맞은 음절 · 빨간 밑줄 = 점수에 안 든 음절 전부(틀림 · 더 들어감 · 홀로 맞은 1음절) · 빠진 자리 = 빨간 「_」
//  덧붙은 말(본부 10-11) = 앞뒤에 흐린 회색(점수에 안 듦 · 틀림 아님)
export function heardHTML(want, full) {
  const sp = spanOf(want, full), got = sp.text, xtra = s => (s ? `<span class="xtra" style="color:var(--mute);opacity:.75">${esc(s)}</span>` : "");
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
  return { html: xtra(sp.pre) + out + xtra(sp.post), ok: score === 100, span: sp };
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
