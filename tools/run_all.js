// 앱 점검 전부 차례로(앱 창 10-07) — #/learn/L01-00-01 을 연 채로 fetch 로 읽어 eval · 결과 sessionStorage "__all"(도중 결과도) · 소리 아주 작게
// 말하기 점검은 history.back 대신 popstate(점검 도중 앞 화면으로 빠져나가지 않게) · 각 점검 전에 #/learn 새로 열기 · 4분 넘으면 시간 초과
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const names = (window.__allNames || ["learn", "explain_fit", "noscroll", "write", "write_help", "handwrite", "hand_order", "compare", "cmp_cut", "rhythm", "pace", "lead_noise", "sr_cut", "quiet_stop", "speak"]);
  const out = { v: document.documentElement.dataset.v, size: `${innerWidth}x${innerHeight}`, done: [], fails: [] }, save = () => { try { sessionStorage.setItem("__all", JSON.stringify(out)); } catch {} };
  window.__sfxVolume = 0.0001; save();
  for (const n of names) {
    try {
      location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(2500);
      let src = await (await fetch(`/tools/ui_check_${n}.js?` + Date.now())).text();
      src = src.replace(/history\.back\(\)/g, 'window.dispatchEvent(new PopStateEvent("popstate",{state:null}))');
      const r = String(await Promise.race([eval(src), W(n === "speak" ? 600000 : 240000).then(() => "✗ 시간 초과")]));
      const lines = r.split("\n"), bad = lines.filter(l => /^✗/.test(l.trim()));
      out.done.push(`${n}: ${lines.filter(l => /^✓/.test(l.trim())).length}✓ ${bad.length}✗`);
      bad.forEach(b => out.fails.push(`${n} · ${b.slice(0, 220)}`));
    } catch (e) { out.fails.push(`${n} · 실행 오류 ${e.message}`); }
    document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); save();
  }
  out.finished = true; save();
})();
"started";
