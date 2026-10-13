// 앱 점검 전부 차례로(앱 창 10-07) — #/learn/L01-00-01 을 연 채로 fetch 로 읽어 eval · 결과 sessionStorage "__all"(도중 결과도) · 소리 아주 작게
// 말하기 점검은 history.back 대신 popstate(점검 도중 앞 화면으로 빠져나가지 않게) · 각 점검 전에 #/learn 새로 열기 · 4분 넘으면 시간 초과
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const names = (window.__allNames || ["speak", "learn", "explain_fit", "noscroll", "fullsub", "write", "write_help", "write_ext", "autoswitch", "handwrite", "hand_order", "hand_dir", "hand_snap", "hand_layout", "hand_score", "uilang", "compare", "cmp_cut", "rhythm", "pace", "lead_noise", "sr_cut", "quiet_stop", "sronly", "seq", "server_stt", "extra_words", "back", "jamobox", "magnet", "interrupt", "monkey"]);
  const out = { v: document.documentElement.dataset.v, size: `${innerWidth}x${innerHeight}`, done: [], fails: [] }, save = () => { try { sessionStorage.setItem("__all", JSON.stringify(out)); } catch {} };
  window.__sfxVolume = 0.0001; save();
  try { localStorage.removeItem("malmun.uiko"); await (await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`)).setUiKo(false); } catch {} // ने⇄한 토글이 켜진 채 남아 있으면(앞 점검이 끊김) 앱 글이 한국어라 문구 점검이 틀림
  for (const n of names) {
    try {
      // 점검마다 학습자 기억값 지우기(앞 점검이 남긴 손글씨·받아쓰기만·속도 등에 안 흔들리게) · 말하기는 맨 앞(다른 점검이 가로챈 함수 영향 없음)
      try { for (const k of Object.keys(localStorage)) if (k.startsWith("malmun.") && !/^malmun\.(lang|p\.)/.test(k)) localStorage.removeItem(k); } catch {} try { for (const k of Object.keys(sessionStorage)) if (k.startsWith("malmun.")) sessionStorage.removeItem(k); } catch {} try { await (await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`)).setUiKo(false); } catch {} /* 기억값을 지워도 메모리의 한국어 앱 글(koUi)은 남음 → 같이 끔(언어 하나 · 10-13) */ delete window.__noSrSwitch; window.__noSeq = true; /* 안드로이드 흉내에서도 옛 「같이」 방식으로 점검 · 「녹음 먼저」는 seq 점검이 따로 */
      window.__sttURL = "off"; // 점검은 진짜 서버(2안) 안 부름 — server_stt 점검만 가짜 주소로 바꿔 끼움
      location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(2500);
      let src = await (await fetch(`/tools/ui_check_${n}.js?` + Date.now())).text();
      if (n === "speak") src = src.replace(/history\.back\(\)/g, 'window.dispatchEvent(new PopStateEvent("popstate",{state:null}))'); // 말하기 점검만(뒤로 가기 점검은 진짜 history.back)
      const r = String(await Promise.race([eval(src), W(n === "speak" ? 600000 : n === "autoswitch" ? 900000 : /^(write|autoswitch|handwrite|hand_order|hand_dir|hand_snap|hand_layout|interrupt|server_stt)$/.test(n) ? 480000 : 240000).then(() => "✗ 시간 초과")]));
      const lines = r.split("\n"), bad = lines.filter(l => /^✗/.test(l.trim()));
      out.done.push(`${n}: ${lines.filter(l => /^✓/.test(l.trim())).length}✓ ${bad.length}✗`);
      bad.forEach(b => out.fails.push(`${n} · ${b.slice(0, 220)}`));
    } catch (e) { out.fails.push(`${n} · 실행 오류 ${e.message}`); }
    document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); save();
  }
  out.finished = true; save();
})();
"started";
