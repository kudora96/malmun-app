// 「왜 틀렸어요?」 /explain (본부 10-19 · 대표님 ㅇ · 언어부 시험 21개 언어 Haiku 5.5 ✗0)
//  입력 JSON { target, heard, mode: "speak"|"write", lang, meaning? } · 머리 칸 X-Dev = 앱 기기 번호
//  → hints.js(서버가 사실 계산 · 언어부 hints.py 이식) → Claude Haiku 5.5(언어부 prompt_v2) → 언어 안전장치(학습자 문자 아니면 한 번 더 → 또면 Sonnet 5.5) → 2~3문장
//  키 = Worker 비밀값 ANTHROPIC_API_KEY 만(앱에 키 없음) · 하루 상한(기기당 EX_DEV_CAP · 전체 EX_ALL_CAP) · 달 지출 상한(EX_MONTH_USD · 추정 $ 를 KV 에 셈)
//  학습자 문장·답은 저장하지 않음(로그 끔 · KV 에는 숫자만)
import Anthropic from "@anthropic-ai/sdk";
import { facts } from "./hints.js";

const HAIKU = "claude-haiku-5-5", SONNET = "claude-sonnet-5-5";
const PRICE = { [HAIKU]: [0.10, 0.50], [SONNET]: [2.00, 10.00] }; // $/1M 입력·출력(10-19 claude-api 표 · 10만 토큰 이하)
const LANG_NAME = { ne: "Nepali", vi: "Vietnamese", th: "Thai", ur: "Urdu", en: "English", id: "Indonesian", mn: "Mongolian",
  si: "Sinhala", bn: "Bengali", tl: "Filipino", uz: "Uzbek", km: "Khmer", lo: "Lao", my: "Burmese",
  zh: "Chinese (Simplified)", ja: "Japanese", es: "Spanish", fr: "French", pt: "Portuguese", ru: "Russian", hi: "Hindi" };

// 언어부 prompt_v2.md 그대로(바뀌면 따라 고침)
const SYSTEM = `You are a kind Korean tutor inside a Korean-learning app. The learner's native language is {LANG_NAME}.
Write ONLY in {LANG_NAME}, even though the facts below are given in Korean. Use very simple everyday words, like talking to a 12-year-old. Polite, warm, never mocking.
Keep every Korean word, syllable or letter in Hangul exactly as written (never romanize, never translate the Korean word itself).

You receive FACTS computed by the app. They are verified and always correct. Base your explanation ONLY on FACTS.
Never add any other claim about Korean spelling, final consonants (받침), vowels, or pronunciation that is not in FACTS.

Output 2 or 3 short sentences, in this order:
1. The correct Korean in one line.
2. What was different and why, using the FACTS (one point only).
3. One short memory tip taken from the rule in FACTS (skip it if sentence 2 already says it).

Special cases:
- If FACTS say the learner did the same as the answer: say it was correct in one sentence and stop.
- If FACTS say it is a spelling written by sound (소리대로 적힌 철자): say the pronunciation was right and the difference is only how the app wrote it. Only in this case may you say the learner did nothing wrong.
- If FACTS say the reason could not be confirmed: do not guess; suggest listening to the model once more.
No lists, no headings, no emoji, no romanization. Stay on this sentence only.`;
const USER = `MODE: {MODE}
TARGET: {TARGET}
HEARD: {HEARD}
MEANING ({LANG_NAME}): {MEANING}
FACTS:
{FACTS}`;
const fill = (tpl, kw) => tpl.replace(/\{(LANG_NAME|MODE|TARGET|HEARD|MEANING|FACTS)\}/g, (_, k) => kw[k]);

// 언어 이탈 안전장치(언어부 claude_ask.py guard_ok 그대로)
const SCRIPT = { ne: /[ऀ-ॿ]/u, hi: /[ऀ-ॿ]/u, bn: /[ঀ-৿]/u, si: /[඀-෿]/u, th: /[฀-๿]/u, lo: /[຀-໿]/u, km: /[ក-៿]/u, my: /[က-႟]/u,
  ur: /[؀-ۿݐ-ݿ]/u, mn: /[Ѐ-ӿ]/u, ru: /[Ѐ-ӿ]/u, zh: /[一-鿿]/u, ja: /[぀-ヿ一-鿿]/u };
const LATIN = /[A-Za-zÀ-ɏḀ-ỿ]/u;
export function guardOk(lang, text) {
  if (!text || /\b(Wait|Actually|correction)\b/.test(lang !== "en" ? text : text.slice(0, 40))) return false;
  if (lang !== "zh" && lang !== "ja" && /[一-鿿]/u.test(text)) return false; // 한자 섞임
  if (lang === "ja" && !/[぀-ヿ]/u.test(text)) return false;
  const letters = [...text].filter(c => /\p{L}/u.test(c) && !(c >= "가" && c <= "힣") && !(c >= "ㄱ" && c <= "ㆎ"));
  if (letters.length < (lang === "zh" || lang === "ja" ? 6 : 15)) return false; // 거의 한국어로만 답함
  const pat = SCRIPT[lang] || LATIN;
  return letters.filter(c => pat.test(c)).length / letters.length >= 0.8;
}

// 하루 상한·달 지출 상한(KV「CAP」 · 숫자만) — 상한에 걸리면 이유 글자, 아니면 false
async function overCap(env, dev) {
  if (!env.CAP) return false;
  const day = new Date().toISOString().slice(0, 10), mon = day.slice(0, 7);
  const kd = `ex:${day}:${dev}`, ka = `ex:${day}:all`, km = `exusd:${mon}`;
  const devCap = +env.EX_DEV_CAP || 30, allCap = +env.EX_ALL_CAP || 3000, monUsd = +env.EX_MONTH_USD || 20;
  const [nd, na, um] = await Promise.all([env.CAP.get(kd), env.CAP.get(ka), env.CAP.get(km)]).then(a => a.map(x => +x || 0));
  if (um / 1e6 >= monUsd) return "month";
  if (nd >= devCap) return "device";
  if (na >= allCap) return "all";
  await Promise.all([env.CAP.put(kd, String(nd + 1), { expirationTtl: 172800 }), env.CAP.put(ka, String(na + 1), { expirationTtl: 172800 })]);
  return false;
}
async function addSpend(env, usd) {
  if (!env.CAP || !usd) return;
  const km = `exusd:${new Date().toISOString().slice(0, 7)}`;
  try { const u = +(await env.CAP.get(km)) || 0; await env.CAP.put(km, String(u + Math.ceil(usd * 1e6)), { expirationTtl: 3456000 }); } catch {}
}

const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);

// body → { status, out } (CORS·기기 번호 확인은 index.js)
export async function explain(env, ctx, dev, body) {
  const target = clean(body?.target, 200), heard = clean(body?.heard, 200), lang = String(body?.lang || ""), mode = body?.mode === "write" ? "write" : "speak";
  const meaning = clean(body?.meaning, 300) || "-";
  if (!target || !LANG_NAME[lang]) return { status: 400, out: { error: "bad input" } };
  if (!env.ANTHROPIC_API_KEY) return { status: 503, out: { error: "not configured" } };
  try { const c = await overCap(env, dev); if (c) return { status: 429, out: { error: c === "device" ? "daily limit" : "service busy" } }; }
  catch { /* KV 오류 = 상한 못 셈 → 그래도 설명(학습자 막지 않음) */ }
  const F = facts(target, heard, mode);
  const system = fill(SYSTEM, { LANG_NAME: LANG_NAME[lang] });
  const user = fill(USER, { LANG_NAME: LANG_NAME[lang], MODE: mode, TARGET: target, HEARD: heard || "(없음)", MEANING: meaning, FACTS: F.map(f => "- " + f).join("\n") });
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 30000 });
  let usd = 0, text = "", used = HAIKU, route = [];
  try {
    for (const model of [HAIKU, HAIKU, SONNET]) { // 처음 · 안전장치 걸리면 같은 모델로 한 번 더 · 또 걸리면 Sonnet
      const r = await client.messages.create({ model, max_tokens: 4000, system, output_config: { effort: "medium" }, messages: [{ role: "user", content: user }] });
      const [pi, po] = PRICE[model]; usd += (r.usage.input_tokens * pi + r.usage.output_tokens * po) / 1e6; route.push(model); used = model;
      if (r.stop_reason === "refusal") { ctx?.waitUntil?.(addSpend(env, usd)); return { status: 200, out: { code: "refusal" } }; }
      text = r.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (guardOk(lang, text)) break;
      text = "";
    }
  } catch (e) {
    ctx?.waitUntil?.(addSpend(env, usd));
    if (e instanceof Anthropic.RateLimitError) return { status: 429, out: { error: "service busy" } };
    if (e instanceof Anthropic.APIError) return { status: 502, out: { error: "ai failed" } };
    return { status: 502, out: { error: "ai failed" } };
  }
  ctx?.waitUntil?.(addSpend(env, usd));
  if (!text) return { status: 200, out: { code: "unclear" } }; // 세 번 다 학습자 말이 아님 → 앱은 「본보기를 다시 들어 보세요」
  return { status: 200, out: { text, model: used, tries: route.length } };
}
