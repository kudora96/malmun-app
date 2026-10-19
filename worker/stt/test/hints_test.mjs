// hints.js = hints.py 같은지(언어부 15문항 + 덧붙인 문항) — node worker/stt/test/hints_test.mjs
import { facts } from "../src/hints.js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const DIR = process.env.HINTS_DIR || "D:/gdrive/malmun/09_lang/ai_test";
const cases = JSON.parse(readFileSync(`${DIR}/cases.json`, "utf8")).cases;
const extra = [["글자는 약속이에요.", "글자는 약속이에요.", "speak"], ["우리도 읽을 수 있어요?", "우리도 읽을수 있어요?", "write"], ["저는 학생이에요", "나는 학생이에요", "speak"],
  ["어서 오세요. 경복궁에 온 걸 환영해요.", "어서 오세요. 경복궁에 온 걸 환영해", "speak"], ["학교에 가요", "가요 학교에", "speak"], ["선생님 안녕하세요", "선생님 안녕", "write"],
  ["물을 마셔요", "무를 마셔요", "speak"], ["값이 싸요", "갑시 싸요", "speak"], ["좋아요", "조아요", "speak"], ["한글", "안글", "speak"], ["가 나 다 라", "가 라", "write"], ["사과를 먹어요", "사과을 먹어요", "write"],
  ["친구예요", "친구이에요", "write"], ["책이에요", "책예요", "write"], ["어제 공부했어요", "어제 공부해요", "speak"], ["가나다", "abc", "write"], ["", "가", "write"]];
const all = cases.map(c => [c.target, c.heard, c.mode]).concat(extra);
const py = execFileSync("python", ["-X", "utf8", "-c", `import sys,json; sys.path.insert(0, r'${DIR}'); import hints; print(json.dumps([hints.facts(t,h,m) for t,h,m in json.load(sys.stdin)], ensure_ascii=False))`], { input: JSON.stringify(all), encoding: "utf8" });
const want = JSON.parse(py); let bad = 0;
all.forEach((c, k) => { const got = facts(...c); if (JSON.stringify(got) !== JSON.stringify(want[k])) { bad++; console.log("✗", c.join(" | "), "\n  py:", want[k].join(" / "), "\n  js:", got.join(" / ")); } });
console.log(`${bad ? "✗" : "✓"} hints.js = hints.py ${all.length - bad}/${all.length}`); process.exit(bad ? 1 : 0);
