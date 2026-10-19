// 자동 번역 막기 점검(대표님 「자동번역기능 절대로 뜨게 해서는 안 돼」 · 본부 10-19) — 틀을 고칠 때 빠지지 않게
//  <html translate="no"> · <meta name="google" content="notranslate"> · 어떤 요소도 translate="yes" 로 풀지 않음 · 첫 화면·목록·배우기·말하기·쓰기·진단·사용법·답 창에서
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const html = document.documentElement, meta = document.querySelector('meta[name="google"][content="notranslate"]');
  ok(html.getAttribute("translate") === "no" && !!meta, "<html translate=no> · <meta google notranslate>", `${html.getAttribute("translate")} · ${!!meta}`);
  const leak = () => [...document.querySelectorAll('[translate]:not([translate="no"])')].map(e => e.tagName + "." + e.className).slice(0, 3);
  for (const h of ["#/", "#/list", "#/learn/L01-00-01", "#/diag"]) {
    location.hash = h; await W(h === "#/diag" ? 3000 : 2000);
    if (h.startsWith("#/learn")) for (const k of ["explain", "speak", "write"]) { const l = document.querySelector(".line"); l.click(); await W(300); l.querySelector(`[data-act=${k}]`).click(); await W(2200); document.querySelector(".panel [data-act=help]")?.click(); await W(300); const lk = leak(); ok(!lk.length && html.getAttribute("translate") === "no", `${h} ${k} 창·사용법: 번역 풀림 0`, lk.join(" ")); document.querySelector(".panel [data-act=close], .panel .closex")?.click(); await W(600); }
    else { const lk = leak(); ok(!lk.length && html.getAttribute("translate") === "no", `${h}: 번역 풀림 0`, lk.join(" ")); }
  }
  return res.join("\n");
})();
