// 단어장 찾기 규칙(대표님 11-19 14:45 · P0-171) — 쓰는 대로 바로 걸러짐 · 한국어 초성 · 네팔어(데바나가리) · 로마자 느슨 맞춤 · 한글 자판 조합
// 이 파일은 순수 함수만(화면·다른 파일 안 건드림) — vlist_find.js(filterItems)·hankey.js(자판)가 불러 씀
//  vocabMatch(query, item[, dev]) → true/false  · item = { w:단어, mean:뜻(네팔어), dev?:발음(데바나가리), rom? } · dev 는 셋째 인자가 먼저
//  hangulCompose(text, jamo) → 글 끝에 자모 하나를 붙이며 음절을 조합(ㅇ+ㅏ+ㄴ → 안) · hangulBackspace(text) → 한 자모씩 지움
const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"], JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"], JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];
const CI = Object.fromEntries(CHO.map((c, i) => [c, i])), VI = Object.fromEntries(JUNG.map((c, i) => [c, i])), JI = Object.fromEntries(JONG.map((c, i) => [c, i]));
const isSyl = c => !!c && c >= "가" && c <= "힣";
const isCons = c => c in CI || c in JI, isVow = c => c in VI;
const sylOf = (c, v, j = 0) => String.fromCharCode(0xac00 + (c * 21 + v) * 28 + j);
const dec = ch => { const n = ch.charCodeAt(0) - 0xac00; return { c: Math.floor(n / 588), v: Math.floor((n % 588) / 28), j: n % 28 }; };
// 겹받침·겹모음 묶기/풀기
const JJ = { ㄱㅅ: "ㄳ", ㄴㅈ: "ㄵ", ㄴㅎ: "ㄶ", ㄹㄱ: "ㄺ", ㄹㅁ: "ㄻ", ㄹㅂ: "ㄼ", ㄹㅅ: "ㄽ", ㄹㅌ: "ㄾ", ㄹㅍ: "ㄿ", ㄹㅎ: "ㅀ", ㅂㅅ: "ㅄ" };
const JJ_SPLIT = Object.fromEntries(Object.entries(JJ).map(([k, v]) => [v, [k[0], k[1]]]));
const VV = { ㅗㅏ: "ㅘ", ㅗㅐ: "ㅙ", ㅗㅣ: "ㅚ", ㅜㅓ: "ㅝ", ㅜㅔ: "ㅞ", ㅜㅣ: "ㅟ", ㅡㅣ: "ㅢ" };
const VV_SPLIT = Object.fromEntries(Object.entries(VV).map(([k, v]) => [v, [k[0], k[1]]]));

export function hangulCompose(text, jamo) {
  text = String(text || ""); const last = text.slice(-1), head = text.slice(0, -1);
  if (isCons(jamo) || (jamo in CI)) {
    if (isSyl(last)) {
      const { c, v, j } = dec(last);
      if (j === 0 && jamo in JI) return head + sylOf(c, v, JI[jamo]);
      if (j) { const jc = JONG[j], two = JJ[jc + jamo]; if (two) return head + sylOf(c, v, JI[two]); }
    }
    return text + jamo;
  }
  if (isVow(jamo)) {
    if (isSyl(last)) {
      const { c, v, j } = dec(last);
      if (j === 0) { const two = VV[JUNG[v] + jamo]; return two ? head + sylOf(c, VI[two]) : text + jamo; }
      const jc = JONG[j]; let keep = 0, move = jc; // 받침이 다음 글자 첫소리로 넘어감
      if (JJ_SPLIT[jc]) { keep = JI[JJ_SPLIT[jc][0]]; move = JJ_SPLIT[jc][1]; }
      if (move in CI) return head + sylOf(c, v, keep) + sylOf(CI[move], VI[jamo]);
      return text + jamo;
    }
    if (last in CI) return head + sylOf(CI[last], VI[jamo]);
    if (last in VI) { const two = VV[last + jamo]; if (two) return head + two; }
  }
  return text + jamo;
}
export function hangulBackspace(text) {
  text = String(text || ""); if (!text) return text; const last = text.slice(-1), head = text.slice(0, -1);
  if (isSyl(last)) {
    const { c, v, j } = dec(last);
    if (j) { const jc = JONG[j]; return head + sylOf(c, v, JJ_SPLIT[jc] ? JI[JJ_SPLIT[jc][0]] : 0); }
    if (VV_SPLIT[JUNG[v]]) return head + sylOf(c, VI[VV_SPLIT[JUNG[v]][0]]);
    return head + CHO[c];
  }
  if (VV_SPLIT[last]) return head + VV_SPLIT[last][0];
  return head;
}

// ── 한국어 맞춤: 그냥 들어 있음 · 초성(ㅇㄴ→안녕) · 섞어 쓰기(안ㄴ→안녕)
const nospace = s => String(s || "").replace(/\s+/g, "");
function koFit(q, w) {
  q = [...nospace(q).normalize("NFC")]; w = [...nospace(w).normalize("NFC")];
  if (!q.length || q.length > w.length) return false;
  for (let i = 0; i + q.length <= w.length; i++) {
    let ok = true;
    for (let k = 0; k < q.length && ok; k++) {
      const a = q[k], b = w[i + k];
      if (a === b) continue;
      if (!isSyl(b)) { ok = false; break; }
      const B = dec(b);
      if (a in CI && !isSyl(a)) { ok = CI[a] === B.c; continue; } // 낱 자음 = 그 글자의 첫소리
      ok = false;
    }
    if (ok) return true;
  }
  return false;
}

// ── 네팔어(데바나가리) 느슨 맞춤: NFC · 점(nukta)·달 점(ँ ं ः)·받침표(्) 무시 · ऑ ≈ ओ ≈ अ · 짧은/긴 모음 같게
const FOLD = { "ऑ": "अ", "ओ": "अ", "ऍ": "ए", "ई": "इ", "ऊ": "उ", "ी": "ि", "ू": "ु", "ॉ": "", "ो": "", "ऒ": "अ", "ॊ": "" };
export function devFold(s) {
  s = String(s || "").normalize("NFC").replace(/[​-‍\s]/g, "").replace(/[़ँंः्]/g, "").replace(/[क़-य़]/g, c => c.normalize("NFD").replace(/़/g, ""));
  return [...s].map(c => (c in FOLD ? FOLD[c] : c)).join("");
}
// ── 로마자: 데바나가리 → 대략 로마자(ITRANS 비슷) 뒤 둘 다 느슨하게 접어 비교(h 빼기 · 긴 모음 한 글자 · eo→a · w→v)
const C = { क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny", ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h", ळ: "l" };
const IV = { अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऑ: "o", ऍ: "e" };
const MA = { "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e" };
export function devToLatin(s) {
  s = String(s || "").normalize("NFC").replace(/[क़-य़]/g, c => c.normalize("NFD")).replace(/[़​-‍\s]/g, ""); let out = ""; const a = [...s];
  for (let i = 0; i < a.length; i++) {
    const c = a[i], n = a[i + 1];
    if (c in C) { out += C[c]; if (n === "्") i++; else if (n && n in MA) { out += MA[n]; i++; } else out += "a"; }
    else if (c in IV) out += IV[c]; else if (c === "ं" || c === "ँ") out += "n"; else if (c === "ः") out += "h"; else if (/[A-Za-z]/.test(c)) out += c;
  }
  return out;
}
export const latFold = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "").replace(/eo/g, "a").replace(/w/g, "v").replace(/z/g, "j").replace(/h/g, "").replace(/(.)\1+/g, "$1").replace(/ee|ii/g, "i").replace(/oo|uu/g, "u");

// 항목마다 접은 글을 한 번만 만들어 둠(1만 개도 빠르게) · 발음 글이 바뀌면 다시
const CACHE = new WeakMap();
const cacheOf = (item, dev) => { let c = CACHE.get(item); if (!c || c.dev !== dev) { const m = String(item.mean || ""); c = { dev, wl: String(item.w || "").toLowerCase(), ml: m.toLowerCase(), dl: dev.toLowerCase(), rl: String(item.rom || "").toLowerCase(), mf: devFold(m), df: devFold(dev), lat: null }; CACHE.set(item, c); } return c; };
const HAN = /[ㄱ-ㅣ가-힣]/, DEV = /[ऀ-ॿ]/, LAT = /^[A-Za-z\s'.-]+$/;
export function vocabMatch(query, item, dev) {
  const q0 = String(query || "").normalize("NFC").trim(); if (!q0) return true; if (!item) return false;
  const d = String(dev != null ? dev : item.dev || ""), c = cacheOf(item, d), ql = q0.toLowerCase();
  if (c.wl.includes(ql) || c.ml.includes(ql) || c.dl.includes(ql) || c.rl.includes(ql)) return true; // 어디든 들어 있으면(앞·가운데)
  if (HAN.test(q0)) return koFit(q0, item.w);
  if (DEV.test(q0)) { const f = devFold(q0); return !!f && (c.mf.includes(f) || c.df.includes(f)); }
  if (LAT.test(q0)) { const f = latFold(q0); if (!f) return false; if (c.lat == null) c.lat = latFold(devToLatin(d)) + "|" + latFold(devToLatin(item.mean || "")); return c.lat.includes(f); }
  return false;
}
