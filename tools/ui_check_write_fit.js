// 쓰기 화면 글 잘림 전수 점검(대표님 10-16 「글자 크기 맞춤은 무조건 자동 · 폰 먼저」) — #/learn/L01-00-01 을 연 채로
// 언어(ne·en·ur·th·vi) × 손글씨·자판 × ⇄(모국어·한국어) — 지금 창 크기에서 쓰기 창의 모든 단추·글(머리 줄·뜻 줄·도구·아래 단추·손글씨 단추·점수)이
// 잘리거나 「…」(줄임표)로 끝나지 않는지 · 판정 상자는 「⋯」 전체 보기가 있어 뺌 · 그림만 단추(글이 숨은 것)는 글이 없으니 뺌
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const i18n = await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`);
  const keep = { lang: localStorage.getItem("malmun.lang"), mode: localStorage.getItem("malmun.wmode") };
  const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === "none" || cs.visibility === "hidden") return false; } return true; };
  // 잘림 = ① 가로: 넘침 숨김·줄임표 칸에서 글이 칸보다 넓음 ② 세로: 보이는 글 줄(글자 상자)이 자르는 칸(넘침 숨김) 위·아래 밖으로 나감 — 숨은 두 겹 글(::after)은 글이 아니라 안 셈
  const vt0 = () => (document.documentElement.lang === "ur" ? 12 : 6); // 나스탈리크 = 글 줄 상자가 글자보다 훨씬 큼(보이는 잉크는 단추 안) → 세로 여유 크게
  const cut = e => { const vt = vt0(); const cs = getComputedStyle(e); if (!vis(e)) return false; const clip = cs.overflowX !== "visible" || cs.overflowY !== "visible", btn = e.matches("button"); if (!clip && !btn) return false; /* 단추 = 자르지 않아도 글이 단추 밖으로 나가면 잘림으로 셈 */ /* 줄임표(text-overflow)는 넘침을 숨길 때만 보임 */ if (clip && e.scrollWidth > e.clientWidth + 1) return true;
    const er = e.getBoundingClientRect(), tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim() || !vis(n.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width && (r.right > er.right + 1.5 || r.left < er.left - 1.5 || (clip && (r.bottom > er.bottom + 1.5 || r.top < er.top - 1.5)) || (btn && (r.bottom > er.bottom + vt || r.top < er.top - vt)))) return true; } return false; };
  const SEL = ".panel .scr.write :is(button, .mean, .wko, .whead .sub, .whead > b, .hscore, .ml, .ms, .dl > span, .lt, .sp, .ln)";
  const bad = [];
  try {
    for (const lg of ["ne", "en", "ur", "th", "vi"]) { localStorage.setItem("malmun.lang", lg); await i18n.setLang(lg); await i18n.setUiKo(false);
      for (const mode of ["hand", "kb"]) { localStorage.setItem("malmun.wmode", mode); document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); (document.querySelectorAll(".line")[14] || [...document.querySelectorAll(".line")].sort((a, b) => (b.querySelector(".kotext")?.textContent.length || 0) - (a.querySelector(".kotext")?.textContent.length || 0))[0]).querySelector("[data-act=write]").click(); await W(1600);
        for (const ko of i18n.KO_UI.includes(lg) ? [false, true] : [false]) { if (ko) { await (async on => { const sc = document.querySelector(".panel .scr.write"); if (sc && (sc.dataset.uiko === "1") !== on) sc.querySelector("[data-act=uiko]")?.click(); })(true); await W(500); }
          const hit = [...document.querySelectorAll(SEL)].filter(e => !e.closest(".hjudge, .hjfull, .helpbox, .inkmenu") && cut(e)).map(e => `${(e.closest("[data-act],[data-mode],[data-tool],[data-hmode],[data-hfollow]")?.dataset.act || e.closest("[data-mode]")?.dataset.mode || e.closest("[data-tool]")?.dataset.tool || e.className || e.tagName).toString().slice(0, 14)}${e.matches("button") ? "" : "." + (e.className || e.tagName).toString().slice(0, 8)}「${(e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 12)}」${e.scrollWidth - e.clientWidth}px`);
          if (hit.length) bad.push(`${lg}${ko ? "⇄한" : ""} ${mode}: ${[...new Set(hit)].slice(0, 5).join(", ")}`);
          if (ko) { await (async on => { const sc = document.querySelector(".panel .scr.write"); if (sc && (sc.dataset.uiko === "1") !== on) sc.querySelector("[data-act=uiko]")?.click(); })(false); await W(300); } } } }
    ok(!bad.length, `쓰기 창 글 잘림·「…」 0(${innerWidth}×${innerHeight} · ne·en·ur·th·vi × 손글씨·자판 × ⇄)`, bad.slice(0, 10).join(" · "));
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  await i18n.setUiKo(false); const lg0 = keep.lang || "en"; localStorage.setItem("malmun.lang", lg0); await i18n.setLang(lg0);
  keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 쓰기 글 맞춤 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
