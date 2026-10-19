// /explain 경로·CORS·입력 검사(키 없이 — 모델 안 부름)
import w from "../src/index.js";
const go = (path, init) => w.fetch(new Request("https://x" + path, init), {}, null).then(async r => `${r.status} ${r.headers.get("Access-Control-Allow-Origin") || "-"} ${await r.text()}`);
const H = { Origin: "http://localhost:8771", "X-Dev": "dev-test-0001", "Content-Type": "application/json" };
const B = JSON.stringify({ target: "글자는 약속이에요.", heard: "글자는 약소이에요.", mode: "speak", lang: "ne" });
console.log("OPTIONS", await go("/explain", { method: "OPTIONS", headers: { Origin: "http://localhost:8771" } }));
console.log("키 없음", await go("/explain", { method: "POST", headers: H, body: B }));
console.log("남의 주소", await go("/explain", { method: "POST", headers: { ...H, Origin: "https://evil.example" }, body: B }));
console.log("기기 없음", await go("/explain", { method: "POST", headers: { ...H, "X-Dev": "" }, body: B }));
console.log("나쁜 json", await go("/explain", { method: "POST", headers: H, body: "{" }));
console.log("언어 없음", await go("/explain", { method: "POST", headers: H, body: JSON.stringify({ target: "가", heard: "나", lang: "xx" }) }));
console.log("GET", await go("/explain", { method: "GET", headers: H }));
