// 「왜 틀렸어요?」 서버 몫 계산 — 언어부 09_lang/ai_test/hints.py 를 그대로 옮김(정본 = hints.py · 바뀌면 이 파일도 따라 고침)
//  facts(target, heard, mode) → 한국어 사실 줄 목록(틀린 음절 · 받침 유무 · 소리대로 적힌 철자인지 · 규칙 한 줄) — 모델은 이것만 풀어 씀
//  시험: node worker/stt/test/hints_test.mjs → python hints.py 15줄과 글자 하나까지 같아야 함
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
// 겹받침 연음: 앞에 남는 것 · 넘어가는 것
const SPLIT = { "ㄳ": ["ㄱ", "ㅅ"], "ㄵ": ["ㄴ", "ㅈ"], "ㄺ": ["ㄹ", "ㄱ"], "ㄻ": ["ㄹ", "ㅁ"], "ㄼ": ["ㄹ", "ㅂ"], "ㄽ": ["ㄹ", "ㅅ"],
  "ㄾ": ["ㄹ", "ㅌ"], "ㄿ": ["ㄹ", "ㅍ"], "ㅄ": ["ㅂ", "ㅅ"], "ㄶ": ["ㄴ", ""], "ㅀ": ["ㄹ", ""], "ㅎ": ["", ""] };
const TENSE = { "ㄱ": "ㄲ", "ㄷ": "ㄸ", "ㅂ": "ㅃ", "ㅅ": "ㅆ", "ㅈ": "ㅉ" };
const TENSE_AFTER = ["ㄱ", "ㄲ", "ㅋ", "ㄳ", "ㄺ", "ㄷ", "ㅅ", "ㅆ", "ㅈ", "ㅊ", "ㅌ", "ㅂ", "ㅍ", "ㅄ"];

const hangul = c => c >= "가" && c <= "힣";
const chars = s => [...s];
function split(c) { const n = c.codePointAt(0) - 0xAC00; return [CHO[(n / 588) | 0], JUNG[((n % 588) / 28) | 0], JONG[n % 28]]; }
const join = (i, v, f) => String.fromCodePoint(0xAC00 + CHO.indexOf(i) * 588 + JUNG.indexOf(v) * 28 + JONG.indexOf(f));

// 아주 작은 표준 발음: 된소리 · 연음(받침 + ㅇ) · ㅎ 받침 + 모음 → ㅎ 소리 안 남 · 겹받침 뒤엣것 넘어감 · 띄어쓰기·문장부호 무시
export function pron(s) {
  const out = chars(s).filter(hangul).map(split);
  for (let k = 0; k < out.length - 1; k++) if (TENSE_AFTER.includes(out[k][2]) && TENSE[out[k + 1][0]]) out[k + 1][0] = TENSE[out[k + 1][0]];
  for (let k = 0; k < out.length - 1; k++) {
    const f = out[k][2], ni = out[k + 1][0];
    if (f && ni === "ㅇ") {
      let keep, move;
      if (SPLIT[f]) [keep, move] = SPLIT[f]; else if (f === "ㅇ") continue; else { keep = ""; move = f; }
      out[k][2] = keep; if (move) out[k + 1][0] = move;
    }
  }
  return out.map(x => join(...x)).join("");
}
function hasBatchim(word) { const cs = chars(word).filter(hangul); return cs.length > 0 && split(cs[cs.length - 1])[2] !== ""; }
const words = s => s.match(/[가-힣]+/g) || [];
const last = s => { const c = chars(s); return c[c.length - 1]; };

// Python difflib.SequenceMatcher(a, b).get_opcodes() — 같은 결과(낱말 목록은 짧아 autojunk 없음)
function opcodes(a, b) {
  const b2j = new Map(); b.forEach((x, j) => { if (!b2j.has(x)) b2j.set(x, []); b2j.get(x).push(j); });
  const longest = (alo, ahi, blo, bhi) => {
    let besti = alo, bestj = blo, bestsize = 0, j2len = new Map();
    for (let i = alo; i < ahi; i++) {
      const n = new Map();
      for (const j of b2j.get(a[i]) || []) { if (j < blo) continue; if (j >= bhi) break; const k = (j2len.get(j - 1) || 0) + 1; n.set(j, k); if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; } }
      j2len = n;
    }
    return [besti, bestj, bestsize];
  };
  const q = [[0, a.length, 0, b.length]], mb = [];
  while (q.length) {
    const [alo, ahi, blo, bhi] = q.pop(), [i, j, k] = longest(alo, ahi, blo, bhi);
    if (k) { mb.push([i, j, k]); if (alo < i && blo < j) q.push([alo, i, blo, j]); if (i + k < ahi && j + k < bhi) q.push([i + k, ahi, j + k, bhi]); }
  }
  mb.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const merged = []; let [i1, j1, k1] = [0, 0, 0];
  for (const [i2, j2, k2] of mb) { if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2; else { if (k1) merged.push([i1, j1, k1]); [i1, j1, k1] = [i2, j2, k2]; } }
  if (k1) merged.push([i1, j1, k1]);
  merged.push([a.length, b.length, 0]);
  const ops = []; let i = 0, j = 0;
  for (const [ai, bj, size] of merged) {
    const tag = i < ai && j < bj ? "replace" : i < ai ? "delete" : j < bj ? "insert" : "";
    if (tag) ops.push([tag, i, ai, j, bj]);
    i = ai + size; j = bj + size;
    if (size) ops.push(["equal", ai, i, bj, j]);
  }
  return ops;
}

export function facts(target, heard, mode) {
  const F = [];
  if (target === heard) return ["같음: 학습자가 정답과 똑같이 했다(틀린 곳 없음)."];
  const tNos = target.replace(/\s/g, ""), hNos = heard.replace(/\s/g, "");
  if (tNos === hNos) return ["띄어쓰기만 다름(글자는 모두 맞음).",
    target.includes(" 수 ") ? "규칙: 「-을 수 있다」의 「수」는 따로 쓰는 낱말이라 앞뒤를 띄어 쓴다(소리는 이어 읽어도 된다)." : "규칙: 낱말 사이를 정답처럼 띄어 쓴다."];
  if (mode === "speak" && pron(target) === pron(heard))
    return [`소리대로 적힌 철자: 「${heard}」는 「${target}」의 실제 소리를 받아쓰기가 그대로 적은 것이다. 학습자 발음은 맞다(학습자 잘못 없음).`];
  const tw = words(target), hw = words(heard);
  const sorted = x => [...x].sort();
  if (sorted(tw).join("\u0000") === sorted(hw).join("\u0000") && tw.join("\u0000") !== hw.join("\u0000")) {
    const d = hw.map((a, k) => (a !== tw[k] ? tw[k] : null)).filter(x => x != null);
    return [`차례만 다름: 낱말은 다 맞고 순서가 바뀌었다. 정답 차례: ${tw.join(" ")}`,
      d.includes("수") ? "규칙: 「-을 수 있다」(할 수 있다)는 「읽을 수 있어」처럼 한 덩어리로 이 차례 그대로 말한다." : "규칙: 정답 차례대로 말한다."];
  }
  for (const [op, a1, a2, b1, b2] of opcodes(tw, hw)) {
    if (op === "equal") continue;
    const tseg = tw.slice(a1, a2).join(" ") || "(없음)", hseg = hw.slice(b1, b2).join(" ") || "(없음)";
    F.push(`다른 곳: 정답 「${tseg}」 ↔ 학습자 「${hseg}」`);
    F.push(...wordFacts(tseg, hseg));
  }
  return F;
}

function wordFacts(t, h) {
  const F = [], tc = chars(t), hc = chars(h);
  // 높임: 저/나
  if (t.startsWith("저") && h.startsWith("나") && tc.length === 1 && hc.length === 1) return ["규칙: 선생님·어른 앞에서는 자기를 「나」 대신 낮춘 말 「저」로 말한다."];
  // 요 빠짐
  if (t.endsWith("요") && tc.slice(0, -1).join("") === h) return [`「${t}」에서 끝의 「요」가 빠졌다.`, "규칙: 「요」를 붙이면 높여 말하는 공손한 말이 된다. 선생님께는 「요」를 붙인다."];
  // 시제
  if (t.includes("했어") && t.split("했어").join("해") === h) return ["「했어요」(지난 일)를 「해요」(지금 일)로 말했다.", "규칙: 이미 지난 일은 「-었/았/했-」을 넣어 말한다."];
  // 조사 · 이에요/예요 — 앞 낱말 받침
  const pairs = [["는", "가"], ["은", "이"], ["를", "을"], ["을", "를"], ["는", "은"], ["은", "는"], ["가", "이"], ["이", "가"]];
  for (const [a, b] of pairs) {
    if (t.endsWith(a) && h.endsWith(b) && tc.slice(0, -1).join("") === hc.slice(0, -1).join("")) {
      const stem = tc.slice(0, -1).join(""), bt = hasBatchim(stem);
      F.push(`조사: 「${stem}」 뒤 「${a}」 자리에 「${b}」를 썼다. 「${stem}」의 마지막 글자 「${last(stem)}」는 받침이 ${bt ? "있다" : "없다"}.`);
      const s = new Set([a, b]), tp = x => "은는".includes(x);
      if (s.has("을") && s.has("를") && s.size === 2) F.push("규칙: 받침 없는 말 뒤에는 「를」, 받침 있는 말 뒤에는 「을」.");
      else if ([a, b].every(x => "은는이가".includes(x)) && tp(a) !== tp(b))
        F.push("규칙: 「은/는」은 무엇에 대해 말하는지(주제)를 내세울 때 — 「글자는 약속이에요」처럼 「무엇은 무엇이다」고 풀이할 때 쓴다. 「이/가」를 쓰면 「(다른 게 아니라) 글자가」처럼 뜻이 바뀐다.");
      return F;
    }
  }
  for (const [a, b] of [["예요", "이에요"], ["이에요", "예요"]]) {
    const al = chars(a).length, bl = chars(b).length;
    if (t.endsWith(a) && h.endsWith(b) && tc.slice(0, -al).join("") === hc.slice(0, -bl).join("")) {
      const stem = tc.slice(0, -al).join(""), bt = hasBatchim(stem);
      return [`「${stem}」의 마지막 글자 「${last(stem)}」는 받침이 ${bt ? "있다" : "없다"}.`, "규칙: 받침 있는 말 뒤에는 「이에요」, 받침 없는 말 뒤에는 「예요」."];
    }
  }
  // 음절 하나 다름 → 자모 비교
  if (tc.length === hc.length) {
    tc.forEach((x, k) => {
      const y = hc[k];
      if (x !== y && hangul(x) && hangul(y)) {
        const [i1, v1, f1] = split(x), [i2, v2, f2] = split(y);
        if (i1 !== i2) { F.push(`「${x}」의 첫소리 「${i1}」를 「${i2 === "ㅇ" ? "ㅇ(소리 없음)" : i2}」로 말했다.`); if (i1 === "ㅎ") F.push("규칙: 낱말 맨 앞 「ㅎ」은 숨을 내쉬며 [h]로 분명히 낸다."); }
        if (v1 !== v2) { F.push(`「${x}」의 모음 「${v1}」를 「${v2}」로 말했다.`); if (v1 === "ㅐ" && v2 === "ㅏ") F.push("규칙: 「ㅐ」는 「ㅏ」보다 입을 덜 벌리고, 입꼬리를 옆으로 조금 당겨 [애]로 낸다."); }
        if (f1 !== f2) {
          F.push(`「${x}」의 받침 「${f1 || "없음"}」를 「${f2 || "없음"}」로 말했다.`);
          if (f1 && !f2) F.push(`규칙: 받침 「${f1}」를 빼면 다른 낱말이 된다. 뒤에 모음이 오면 받침이 뒤로 넘어가 이어 소리 난다(정답 소리 [${pron(t)}]).`);
          else if (SPLIT[f1] && f2 && f2 !== f1) F.push(`규칙: 겹받침 「${f1}」는 뒤에 모음이 오면 앞엣것은 남고 뒤엣것이 넘어간다(정답 소리 [${pron(t)}]).`);
        }
      }
    });
  }
  if (!F.length) F.push("까닭을 기계로 확정하지 못함 — 지어내지 말고 본보기를 다시 들어 보라고만 한다.");
  return F;
}
