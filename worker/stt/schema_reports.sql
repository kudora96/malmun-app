-- 「잘못된 것 신고」 표(src/report.js) — 대표님이 D1 DB 를 만든 뒤 한 번: npx wrangler d1 execute malmun-reports --remote --file schema_reports.sql
-- 기기 번호(무작위)·자리(편·줄)·종류·(나이 되면) 짧은 글·시각만 · 90일 뒤 지움
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,          -- YYYY-MM-DD (UTC)
  dev TEXT NOT NULL,          -- 기기 무작위 번호(malmun.devid)
  kind TEXT NOT NULL,         -- tr 번역 · snd 소리 · glyph 글자·획 · ai AI 답 · etc 기타
  screen TEXT NOT NULL,       -- learn · explain · speak · write · why · other
  ep TEXT NOT NULL DEFAULT '',
  line TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT '',
  ui TEXT NOT NULL DEFAULT 'learner',
  ver TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new', -- new · seen · fixed · wontfix (라이브부)
  at INTEGER NOT NULL,
  UNIQUE (day, dev, ep, line, kind)
);
CREATE INDEX IF NOT EXISTS reports_day ON reports (day);
