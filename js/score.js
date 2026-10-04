// 말하기 점수 = 음절 정렬 하나로(본부 10-04 · 투덜이 승인) — 점수와 「들린 말」 빨간 표시가 늘 같은 함수에서 나온다
// 예전 자모(낱자) 편집 거리는 ㅇ·ㅏ·ㅎ·ㅔ·ㅛ 같은 흔한 낱자가 우연히 겹쳐 전혀 다른 말도 20~40% 가 깔렸다(「안녕하세요」 25%)
// 1) 단위 = 음절(띄어쓰기·부호 무시) · 본보기 W 와 들린 말 H 를 편집 거리로 정렬(같은 음절만 「맞음」)
// 2) 맞음 = 정렬에서 같은 음절이면 혼자여도 맞음(투덜이 10-04 정정: 「요」처럼 한 글자라도 맞은 곳·틀린 곳을 정확히 짚는 게 낫다)
// 3) 점수 = round(100 × 맞은 음절 / max(W, H)) — 더 말한 것도 깎임
const NUM = { "0": "영", "1": "일", "2": "이", "3": "삼", "4": "사", "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구" };
const syl = s => [...String(s).replace(/500/g, "오백").replace(/[0-9]/g, d => NUM[d])].filter(ch => /[\p{L}\p{N}]/u.test(ch));

// → { score, ops: [{ t: "m"|"s"|"i"|"d", ok }] }  t: m 맞음 · s 바뀜 · i 더 들어감(H 에만) · d 빠짐(W 에만) · ok = 점수에 든 맞음
export function align(want, heard) {
  const W = syl(want), H = syl(heard), n = W.length, m = H.length;
  if (!n) return { score: 0, ops: H.map(() => ({ t: "i", ok: false })) };
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (W[i - 1] === H[j - 1] ? 0 : 1));
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) { // 맞음(대각선)을 먼저 — 이어진 묶음이 갈라지지 않게
    if (i > 0 && j > 0 && W[i - 1] === H[j - 1] && d[i][j] === d[i - 1][j - 1]) { ops.push({ t: "m" }); i--; j--; }
    else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.push({ t: "s" }); i--; j--; }
    else if (j > 0 && d[i][j] === d[i][j - 1] + 1) { ops.push({ t: "i" }); j--; }
    else { ops.push({ t: "d" }); i--; }
  }
  ops.reverse();
  let ok = 0;
  for (const o of ops) { o.ok = o.t === "m"; if (o.ok) ok++; }
  return { score: Math.max(0, Math.round((100 * ok) / Math.max(n, m))), ops };
}
export const similarity = (want, heard) => align(want, heard).score;
