// /explain 연기 시험(실제 Haiku 5.5 호출 · 2~3번 · 약 $0.001) — 키는 윈도 사용자 환경 변수(화면에 안 찍음)
import { explain, guardOk } from "../src/explain.js";
import { execFileSync } from "node:child_process";
const key = process.env.ANTHROPIC_API_KEY || execFileSync("powershell", ["-NoProfile", "-Command", "[Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY','User')"], { encoding: "utf8" }).trim();
console.log("guard", guardOk("ne", "सही वाक्य हो: 글자는 약속이에요. तपाईंले 「약속」 को अन्तिम अक्षर बिर्सनुभयो।"), guardOk("ne", "The answer is 글자는 약속이에요 and you forgot the last consonant."));
const noKey = await explain({}, null, "dev-test-0001", { target: "글자는 약속이에요.", heard: "글자는 약소이에요.", mode: "speak", lang: "ne" });
console.log("키 없음 →", noKey.status, JSON.stringify(noKey.out));
if (process.argv[2] !== "live") process.exit(0);
for (const [lang, t, h, m] of [["ne", "글자는 약속이에요.", "글자는 약소이에요.", "speak"], ["ur", "그때 백성들은 글자를 몰랐거든요.", "그때 백성들은 글자을 몰랐거든요.", "write"]]) {
  const r = await explain({ ANTHROPIC_API_KEY: key }, null, "dev-test-0001", { target: t, heard: h, mode: m, lang });
  console.log(lang, r.status, JSON.stringify(r.out));
}
