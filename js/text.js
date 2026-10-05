// 표시 텍스트 — 한글 자동 감지 스팬(§3-1) · 괄호 병기 · 낱말 카드
export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KO = /[가-힣ㄱ-ㅎㅏ-ㅣ]+/g;

export function renderText(raw) {
  return esc(raw)
    .replace(/\(([^()]*)\)/g, '<span class="gl">($1)</span>')
    .replace(/&quot;([^&]*?)&quot;/g, (m, inner) => /[가-힣]/.test(inner) ? `<span class="ko q">"${inner}"</span>` : m)
    .replace(KO, m => `<span class="ko" lang="ko">${m}</span>`);
}

// "어서 (eo-seo, छिटो) 오세요 (o-se-yo, आउनुहोस्)." → 낱말 카드
export function glossCards(line) {
  // 괄호 앞 덩어리 = 낱말(「읽을 수」처럼 띄어 쓴 것도 한 장)
  const out = [];
  for (const m of line.matchAll(/([^()]*?)\(([^()]*)\)/g)) {
    const ko = m[1].replace(/^[\s.,!?…"“”「」]+|[\s"“”「」]+$/g, "");
    if (!/[가-힣]/.test(ko)) continue;
    const [rom, ...mean] = m[2].split(",");
    out.push({ ko, rom: rom.trim(), mean: mean.join(",").trim() });
  }
  return out;
}

// 한글 음절 → 자모
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
// 겹모음·겹받침은 자판에 있는 낱자로 나눠 친다(옛 앱과 같음)
const SPLIT = { "ㅘ": "ㅗㅏ", "ㅙ": "ㅗㅐ", "ㅚ": "ㅗㅣ", "ㅝ": "ㅜㅓ", "ㅞ": "ㅜㅔ", "ㅟ": "ㅜㅣ", "ㅢ": "ㅡㅣ", "ㅐ": "ㅏㅣ", "ㅔ": "ㅓㅣ", "ㅒ": "ㅑㅣ", "ㅖ": "ㅕㅣ",
  "ㄳ": "ㄱㅅ", "ㄵ": "ㄴㅈ", "ㄶ": "ㄴㅎ", "ㄺ": "ㄹㄱ", "ㄻ": "ㄹㅁ", "ㄼ": "ㄹㅂ", "ㄽ": "ㄹㅅ", "ㄾ": "ㄹㅌ", "ㄿ": "ㄹㅍ", "ㅀ": "ㄹㅎ", "ㅄ": "ㅂㅅ" };

const expand = j => [...j].map(p => (SPLIT[p] ? expand(SPLIT[p]) : p)).join("");
const JUNG_BY = Object.fromEntries([...JUNG].map(j => [expand(j), j]));
const JONG_BY = Object.fromEntries(JONG.filter(Boolean).map(j => [expand(j), j]));

export function toJamo(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  return [...expand(CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28])];
}

// 친 낱자들 → 지금까지 모양(부분 음절). 정답 순서대로만 들어오므로 모음 길이는 정답 기준으로 준다.
export function compose(keys, vowelLen) {
  const s = keys.join("");
  if (s.length <= 1) return s;
  const cho = CHO.indexOf(s[0]);
  const vs = s.slice(1, 1 + vowelLen);
  // 모음이 덜 쳐졌으면 친 만큼만(예: ㅗ 까지 → 오)
  const jung = JUNG.indexOf(JUNG_BY[vs] || JUNG_BY[vs.slice(0, 2)] || JUNG_BY[vs[0]]);
  if (cho < 0 || jung < 0) return s;
  const rest = s.slice(1 + vowelLen);
  const jong = rest ? JONG.indexOf(JONG_BY[rest] || JONG_BY[rest[0]]) : 0;
  return String.fromCharCode(0xac00 + cho * 588 + jung * 28 + Math.max(jong, 0));
}
// 정답 음절의 모음 낱자 수
export function vowelLen(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  return expand(JUNG[Math.floor((c % 588) / 28)]).length;
}

export const JAMO_AUDIO = { "ㄱ": "giyeok", "ㄲ": "ssang_giyeok", "ㄴ": "nieun", "ㄷ": "digeut", "ㄸ": "ssang_digeut", "ㄹ": "rieul", "ㅁ": "mieum", "ㅂ": "bieup", "ㅃ": "ssang_bieup", "ㅅ": "siot", "ㅆ": "ssang_siot", "ㅇ": "ieung", "ㅈ": "jieut", "ㅉ": "ssang_jieut", "ㅊ": "chieut", "ㅋ": "kieuk", "ㅌ": "tieut", "ㅍ": "pieup", "ㅎ": "hieut", "ㅏ": "a", "ㅐ": "ae", "ㅑ": "ya", "ㅒ": "yae", "ㅓ": "eo", "ㅔ": "e", "ㅕ": "yeo", "ㅖ": "ye", "ㅗ": "o", "ㅘ": "wa", "ㅙ": "wae", "ㅚ": "oe", "ㅛ": "yo", "ㅜ": "u", "ㅝ": "wo", "ㅞ": "we", "ㅟ": "wi", "ㅠ": "yu", "ㅡ": "eu", "ㅢ": "ui", "ㅣ": "i" };

// 「이제 말해 보세요」 글 나누기(본부 10-05) — 「안내 "한국어" (로마자, 뜻)」 → { intro, ko, rom, mean } · 괄호 없는 꼴도 받음
export const sayParts = s => { const m = String(s || "").match(/^(.*?)\s*"([^"]+)"\s*(?:\(([^,()]*),\s*([^()]*)\))?\s*[।.]?\s*$/); return m ? { intro: m[1].trim(), ko: m[2], rom: (m[3] || "").trim(), mean: (m[4] || "").trim() } : null; };
