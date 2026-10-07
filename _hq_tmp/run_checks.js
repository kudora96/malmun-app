// 본부 QA — 앱 자동 점검 전부를 차례로(각 점검 전에 #/learn/L01-00-01 새로 열기) · 결과 window.__qa
// 붙여 넣는 법: 브라우저에서 이 파일 내용을 실행(fetch 로 읽어 eval)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const names = ["learn", "explain_fit", "noscroll", "write", "write_help", "handwrite", "hand_order", "speak", "speak_fit", "compare", "cmp_overlap", "cmp_cut", "rhythm", "pace", "lead_noise", "sr_cut", "quiet_stop"];
  const out = window.__qa = { size: `${innerWidth}x${innerHeight}`, v: document.documentElement.dataset.v, done: [], fails: [], errs: [] };
  addEventListener("error", e => out.errs.push(String(e.message)));
  addEventListener("unhandledrejection", e => out.errs.push("rej " + String(e.reason && e.reason.message || e.reason)));
  for (const n of names) {
    try {
      location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(2500);
      const src = await (await fetch(`/tools/ui_check_${n}.js?` + Date.now())).text();
      const r = String(await Promise.race([eval(src), W(240000).then(() => "✗ 시간 초과(4분)")]));
      const lines = r.split("\n"); const bad = lines.filter(l => /^✗/.test(l.trim()));
      out.done.push(`${n}: ${lines.filter(l => /^✓/.test(l.trim())).length}✓ ${bad.length}✗`);
      bad.forEach(b => out.fails.push(`${n} · ${b.slice(0, 220)}`));
    } catch (e) { out.fails.push(`${n} · 실행 오류 ${e.message}`); }
    document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  }
  out.finished = true;
})();
"started";
