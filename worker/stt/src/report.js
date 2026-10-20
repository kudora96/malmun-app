// 「잘못된 것 신고」(기획부 feedback_loop.md 1장 · 대표님 10-20 「ㅇ」) — POST /report · JSON · 머리 칸 X-Dev = 기기 번호
//  저장 = D1「DB」표 reports(schema_reports.sql) · 90일 뒤 지움(scheduled · 하루 한 번) · 녹음·이름·연락처는 받지 않음
//  남용 막기 = 기기당 하루 10건(KV「CAP」 rp:{날짜}:{기기} · 이틀 뒤 저절로 지워짐) · 같은 날 같은 기기·자리·종류는 하나로(UNIQUE)
//  글(note)은 100자까지 · 메일·전화·주소가 보이면 글을 버리고 종류만 저장(개인정보를 받지 않기)
export const KINDS = ["tr", "snd", "glyph", "ai", "etc"];
const SCREENS = ["learn", "explain", "speak", "write", "why", "other"];
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
const CONTACT = /[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/|www\.|(?:\+?\d[\d\s().-]{7,}\d)/i;

export async function report(env, dev, body) {
  if (!env.DB) return { status: 503, out: { error: "no db" } }; // DB 를 아직 안 묶음(대표님 배포 전) → 앱은 기기 안에 두었다가 다시 보냄
  const kind = clean(body?.kind, 8), screen = clean(body?.screen, 10);
  if (!KINDS.includes(kind)) return { status: 400, out: { error: "bad kind" } };
  const row = {
    day: new Date().toISOString().slice(0, 10), dev, kind, screen: SCREENS.includes(screen) ? screen : "other",
    ep: /^[A-Za-z0-9-]{1,32}$/.test(body?.ep || "") ? body.ep : "", line: clean(body?.line, 40),
    lang: /^[a-z]{2,3}$/.test(body?.lang || "") ? body.lang : "", ui: body?.ui === "ko" ? "ko" : "learner", ver: clean(body?.ver, 16),
    note: clean(body?.note, 100),
  };
  if (CONTACT.test(row.note)) row.note = "";
  if (env.CAP) { // 기기당 하루 10건
    const k = `rp:${row.day}:${dev}`, n = +(await env.CAP.get(k)) || 0;
    if (n >= (+env.RP_DEV_CAP || 10)) return { status: 429, out: { error: "limit" } };
    await env.CAP.put(k, String(n + 1), { expirationTtl: 172800 });
  }
  await env.DB.prepare(`INSERT INTO reports (day, dev, kind, screen, ep, line, lang, ui, ver, note, at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
    ON CONFLICT(day, dev, ep, line, kind) DO UPDATE SET note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE reports.note END, at = excluded.at`)
    .bind(row.day, row.dev, row.kind, row.screen, row.ep, row.line, row.lang, row.ui, row.ver, row.note, Date.now()).run();
  return { status: 200, out: { ok: true } };
}

// 90일 넘은 신고 지우기(하루 한 번 · wrangler.toml [triggers] crons)
export async function purge(env) {
  if (!env.DB) return;
  const cut = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  await env.DB.prepare("DELETE FROM reports WHERE day < ?1").bind(cut).run();
}
