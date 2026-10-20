// /report 경로·입력 검사·하루 10건·같은 자리 하나로·연락처 글 버림 — 가짜 D1·KV(배포 없이) · node test/report_test.mjs
import w from "../src/index.js";
const rows = new Map(), kv = new Map();
const DB = { prepare: sql => ({ bind: (...a) => ({ run: async () => {
  if (/^DELETE/.test(sql)) { for (const [k, r] of rows) if (r[0] < a[0]) rows.delete(k); return; }
  const key = [a[0], a[1], a[4], a[5], a[2]].join("|"), old = rows.get(key); rows.set(key, old && !a[9] ? [...a.slice(0, 9), old[9], a[10]] : a); } }) }) };
const CAP = { get: async k => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v) };
let fail = 0; const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const go = (env, body, h = {}) => w.fetch(new Request("https://x/report", { method: "POST", headers: { Origin: "http://localhost:8790", "X-Dev": "dev-test-0001", "Content-Type": "application/json", ...h }, body: typeof body === "string" ? body : JSON.stringify(body) }), env, null).then(async r => [r.status, await r.json()]);
const B = { kind: "tr", screen: "learn", ep: "L01-00-01", line: "3", lang: "ne", ui: "learner", ver: "1020.5", note: "뜻이 조금 달라요" };
ok((await go({}, B))[0] === 503, "DB 없음 = 503(앱이 기기 안에 두고 다시 보냄)");
const env = { DB, CAP };
ok((await go(env, B))[0] === 200 && rows.size === 1, "저장 1줄");
ok((await go(env, { ...B, note: "" }))[0] === 200 && rows.size === 1 && [...rows.values()][0][9] === "뜻이 조금 달라요", "같은 날·자리·종류 = 하나로(글은 남김)");
ok((await go(env, { ...B, kind: "xx" }))[0] === 400, "모르는 종류 = 400");
ok((await go(env, B, { "X-Dev": "" }))[0] === 400, "기기 번호 없음 = 400");
ok((await go(env, B, { Origin: "https://evil.example" }))[0] === 403, "남의 주소 = 403");
ok((await go(env, "{"))[0] === 400, "나쁜 json = 400");
ok((await go(env, "x".repeat(3000)))[0] === 413, "너무 큼 = 413");
await go(env, { ...B, line: "9", note: "연락 주세요 abc@test.com" }); ok([...rows.values()].find(r => r[5] === "9")?.[9] === "", "메일·전화 들어간 글 = 버리고 종류만");
await go(env, { ...B, line: "10", note: "x".repeat(300) }); ok([...rows.values()].find(r => r[5] === "10")?.[9].length === 100, "글 100자까지");
let last; for (let i = 0; i < 12; i++) last = (await go(env, { ...B, line: "L" + i }))[0];
ok(last === 429, "기기당 하루 10건 넘음 = 429");
rows.set("old", ["2000-01-01"]); await w.scheduled({}, env, { waitUntil: p => p }); await new Promise(r => setTimeout(r, 10)); ok(!rows.has("old"), "90일 넘은 신고 지움(scheduled)");
console.log(fail ? `✗ ${fail}` : "✓ 모두 통과"); process.exit(fail ? 1 : 0);
