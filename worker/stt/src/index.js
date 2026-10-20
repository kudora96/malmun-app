// 말문 서버 받아쓰기 Worker「stt」(2안 · 본부 10-10 설계 · design/stt_server_memo.md)
//  POST /stt  본문 = 녹음 그대로(audio/webm;codecs=opus 또는 audio/mp4) · 머리 칸 X-Dev = 앱 기기 번호
//  → Workers AI @cf/openai/whisper-large-v3-turbo(language "ko") → { text, words: [{ w, s, e }] } (초)
//  녹음은 저장하지 않음 — R2·KV 에 안 넣고 로그에도 안 남김(받아쓰기 뒤 메모리에서 버림)
//  하루 상한 = KV「CAP」 숫자 세기(기기당 DEV_CAP · 전체 ALL_CAP) — KV 는 원자적이 아니라 대략(남용 막기용)
//  CORS = https://kudora96.github.io · http://localhost:* · http://127.0.0.1:* 만
import { explain } from "./explain.js"; // 「왜 틀렸어요?」(본부 10-19)
import { report, purge } from "./report.js"; // 「잘못된 것 신고」(10-20 · D1 「DB」 묶은 뒤 켜짐)
const MODEL = "@cf/openai/whisper-large-v3-turbo";
const MAX_BYTES = 1024 * 1024; // 약 1MB(opus 15초는 보통 100KB 안쪽)
const TYPES = /^audio\/(webm|mp4|ogg|mpeg|aac|x-m4a|wav)\b/i;

const allowOrigin = o => (o === "https://kudora96.github.io" || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || "") ? o : "");
const cors = o => {
  const a = allowOrigin(o);
  return a ? { "Access-Control-Allow-Origin": a, "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Dev", "Access-Control-Max-Age": "86400", "Access-Control-Expose-Headers": "Server-Timing" } : { "Vary": "Origin" };
};
const json = (o, status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(o), ...extra } });
// 걸린 시간(본부 10-12 · 투덜이 「ㅇ」) — 숫자만: up = 녹음 받기 끝까지 · ai = Workers AI · total = 전체(ms) · 녹음·글·기기 번호는 안 남김
const timing = (up, ai, total) => ({ "Server-Timing": `up;dur=${up}, ai;dur=${ai}, total;dur=${total}` });
// 날짜별 구간 개수(KV) — tm:{날짜}:{0-3|3-6|6-12|12+} · 30일 뒤 저절로 지워짐 · 실패해도 받아쓰기는 그대로
async function countBand(env, ms) {
  if (!env.CAP) return;
  const day = new Date().toISOString().slice(0, 10), band = ms < 3000 ? "0-3" : ms < 6000 ? "3-6" : ms < 12000 ? "6-12" : "12+", k = `tm:${day}:${band}`;
  try { const n = +(await env.CAP.get(k)) || 0; await env.CAP.put(k, String(n + 1), { expirationTtl: 2592000 }); } catch {}
}

// ArrayBuffer → base64(조각으로 · 큰 배열을 한 번에 펼치면 스택이 넘침)
function b64(buf) {
  const u = new Uint8Array(buf); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

// 하루 상한 — 키 = cap:{날짜 UTC}:{기기} · cap:{날짜}:all · 이틀 뒤 저절로 지워짐
async function overCap(env, dev) {
  if (!env.CAP) return false; // KV 를 안 묶었으면 상한 없음(시험용)
  const day = new Date().toISOString().slice(0, 10), kd = `cap:${day}:${dev}`, ka = `cap:${day}:all`;
  const devCap = +env.DEV_CAP || 200, allCap = +env.ALL_CAP || 20000;
  const [nd, na] = await Promise.all([env.CAP.get(kd), env.CAP.get(ka)]).then(a => a.map(x => +x || 0));
  if (nd >= devCap || na >= allCap) return nd >= devCap ? "device" : "all";
  await Promise.all([env.CAP.put(kd, String(nd + 1), { expirationTtl: 172800 }), env.CAP.put(ka, String(na + 1), { expirationTtl: 172800 })]);
  return false;
}

export default {
  async fetch(req, env, ctx) {
    const t0 = Date.now(), o = req.headers.get("Origin") || "", url = new URL(req.url);
    if (req.method === "OPTIONS") return allowOrigin(o) ? new Response(null, { status: 204, headers: cors(o) }) : new Response(null, { status: 403 });
    if (url.pathname === "/health" && req.method === "GET") return json(o, 200, { ok: true });
    if (url.pathname === "/explain") { // 「왜 틀렸어요?」 — JSON 받아 2~3문장(explain.js)
      if (req.method !== "POST") return json(o, 405, { error: "method not allowed" });
      if (!allowOrigin(o)) return json(o, 403, { error: "origin not allowed" });
      const dev = req.headers.get("X-Dev") || "";
      if (!/^[A-Za-z0-9-]{8,64}$/.test(dev)) return json(o, 400, { error: "bad device id" });
      if (!/^application\/json(;|$)/i.test(req.headers.get("Content-Type") || "")) return json(o, 415, { error: "json only" });
      if (+(req.headers.get("Content-Length") || 0) > 4096) return json(o, 413, { error: "too large" });
      let body; try { const t = await req.text(); if (t.length > 4096) return json(o, 413, { error: "too large" }); body = JSON.parse(t); } catch { return json(o, 400, { error: "bad json" }); }
      const r = await explain(env, ctx, dev, body);
      return json(o, r.status, r.out);
    }
    if (url.pathname === "/report") { // 신고 — JSON 받아 D1 에 한 줄(report.js)
      if (req.method !== "POST") return json(o, 405, { error: "method not allowed" });
      if (!allowOrigin(o)) return json(o, 403, { error: "origin not allowed" });
      const dev = req.headers.get("X-Dev") || "";
      if (!/^[A-Za-z0-9-]{8,64}$/.test(dev)) return json(o, 400, { error: "bad device id" });
      if (!/^application\/json(;|$)/i.test(req.headers.get("Content-Type") || "")) return json(o, 415, { error: "json only" });
      let body; try { const t = await req.text(); if (t.length > 2048) return json(o, 413, { error: "too large" }); body = JSON.parse(t); } catch { return json(o, 400, { error: "bad json" }); }
      try { const r = await report(env, dev, body); return json(o, r.status, r.out); } catch { return json(o, 500, { error: "save failed" }); }
    }
    if (url.pathname !== "/stt") return json(o, 404, { error: "not found" });
    if (req.method !== "POST") return json(o, 405, { error: "method not allowed" });
    if (!allowOrigin(o)) return json(o, 403, { error: "origin not allowed" });
    const dev = req.headers.get("X-Dev") || "";
    if (!/^[A-Za-z0-9-]{8,64}$/.test(dev)) return json(o, 400, { error: "bad device id" });
    const type = req.headers.get("Content-Type") || "";
    if (!TYPES.test(type)) return json(o, 415, { error: "audio only" });
    if (+(req.headers.get("Content-Length") || 0) > MAX_BYTES) return json(o, 413, { error: "too large" });
    let buf;
    try { buf = await req.arrayBuffer(); } catch { return json(o, 400, { error: "read failed" }); }
    if (!buf.byteLength) return json(o, 400, { error: "empty audio" });
    if (buf.byteLength > MAX_BYTES) return json(o, 413, { error: "too large" });
    const tUp = Date.now() - t0;
    try { const c = await overCap(env, dev); if (c) return json(o, 429, { error: c === "device" ? "daily limit" : "service busy" }); }
    catch { /* KV 오류 = 상한 못 셈 → 그래도 받아쓰기(학습자 막지 않음) */ }
    let out; const tA = Date.now();
    try { out = await env.AI.run(MODEL, { audio: b64(buf), language: "ko", task: "transcribe", vad_filter: true }); }
    catch (e) { const tot = Date.now() - t0; ctx?.waitUntil?.(countBand(env, tot)); return json(o, 502, { error: "stt failed" }, timing(tUp, Date.now() - tA, tot)); } // 녹음 내용·오류 본문은 남기지 않음
    finally { buf = null; }
    const tAi = Date.now() - tA, tTot = Date.now() - t0; ctx?.waitUntil?.(countBand(env, tTot));
    const words = [];
    for (const sg of out?.segments || []) for (const w of sg?.words || []) { const t = String(w.word || "").trim(); if (t) words.push({ w: t, s: Math.round((+w.start || 0) * 100) / 100, e: Math.round((+w.end || 0) * 100) / 100 }); }
    return json(o, 200, { text: String(out?.text || "").trim(), words }, timing(tUp, tAi, tTot));
  },
  // 하루 한 번(wrangler.toml [triggers]) — 90일 넘은 신고 지우기
  async scheduled(ev, env, ctx) { ctx.waitUntil(purge(env)); },
};
