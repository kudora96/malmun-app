// 쓰기 ⇄(한국어 앱 글) 점검(본부 10-15 투덜이 「⇄ 는 글만 바꾸고 상태는 그대로 · 단추 크기·자리 0px」) — #/learn/L01-00-01 을 연 채로
// ⇄ 되는 언어(ne·ur·vi·th)마다: ⓐ 가만히 — 쓰기 창 모든 단추·칸·판정 상자·뜻 줄·머리 줄 자리·크기 0px(⇄ 두 번)
// ⓑ 쓰는 중(획 하나 · 시간 막대) ⓒ 꽝 + 「⋯」 펼침 ⓓ 👣 따라 쓰기 ⓔ 자판 자동 도는 중 — ⇄ 뒤 상태 그대로(획 수 · 점수 · 판정 줄 수 · 펼침 · 시간 막대 · 견본 · 자동 위치)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const i18n = await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`);
  const keep = { lang: localStorage.getItem("malmun.lang"), mode: localStorage.getItem("malmun.wmode"), hm: localStorage.getItem("malmun.hmode"), fo: localStorage.getItem("malmun.hfollow") };
  const flip = async on => { await i18n.setUiKo(on); window.dispatchEvent(new CustomEvent("malmun:uilang")); await W(350); };
  const pos = () => [...document.querySelectorAll(".panel .scr.write button:not(.jmore), .panel .hbox, .panel .hjudge, .panel .info .sub2, .panel .whead, .panel .wbtns, .panel .segrow, .panel .sent, .panel .kb")].map(e => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 2) / 2); });
  const diff = (a, b) => { if (a.length !== b.length) return 999; let m = 0; a.forEach((r, i) => r.forEach((v, k) => { m = Math.max(m, Math.abs(v - b[i][k])); })); return m; };
  const open = async (li, mode) => { localStorage.setItem("malmun.wmode", mode); document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(1500); };
  const wr = () => $(".panel .write")?.parentElement?.__wr;
  const draw = async (P, id = 31) => { const iv = $(".panel .hink"), R = iv.getBoundingClientRect(), e = (t, x, y) => iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: true, clientX: R.left + x * R.width, clientY: R.top + y * R.height })); e("pointerdown", ...P[0]); for (const q of P) e("pointermove", ...q); e("pointerup", ...P.at(-1)); await W(120); };
  const bad = { a: [], b: [], c: [], d: [], e: [] };
  try {
    for (const lg of ["ne", "ur", "vi", "th"]) {
      if (!i18n.KO_UI.includes(lg)) continue; localStorage.setItem("malmun.lang", lg); await i18n.setLang(lg); await i18n.setUiKo(false); localStorage.setItem("malmun.hmode", "free"); localStorage.setItem("malmun.hfollow", "0");
      // ⓐ 가만히
      await open(14, "hand"); { const p0 = pos(); await flip(true); const p1 = pos(); await flip(false); const p2 = pos(); const m = Math.max(diff(p0, p1), diff(p0, p2)); if (m) bad.a.push(`${lg} ${m}px`); }
      { await open(14, "kb"); const p0 = pos(); await flip(true); const p1 = pos(); await flip(false); const m = diff(p0, p1); if (m) bad.a.push(`${lg} 자판 ${m}px`); }
      // ⓑ 쓰는 중
      await open(14, "hand"); { const H = wr().hand(), Q = await wr().fitPath(H.ch, 0, "pen"); await draw(Q.map(q => [q.x, q.y])); const s0 = [H.strokes.length, !!$(".panel .htime.on")]; await flip(true); const s1 = [wr().hand().strokes.length, !!$(".panel .htime.on"), wr().hand() === H]; await flip(false); if (s0[0] !== s1[0] || s0[1] !== s1[1] || !s1[2]) bad.b.push(`${lg} ${JSON.stringify(s0)}→${JSON.stringify(s1)}`); }
      // ⓒ 꽝 + 「⋯」 펼침
      await open(14, "hand"); { const H = wr().hand(), L = await wr().strokesOf(H.ch); for (let i = 0; i < L.length; i++) { const Q = await wr().fitPath(H.ch, i, "pen"); await draw(Q.map(q => [q.x + 0.18, q.y + 0.1]), 40 + i); } $(".panel [data-act=hdone]").click(); await W(250); $(".panel .jmore")?.click(); await W(80);
        const snap = () => [!!$(".panel .hjfull"), !$(".panel .hscore").hidden, $(".panel .hscore").querySelectorAll("i[data-k]").length, [...$(".panel .hscore").querySelectorAll("i[data-k]")].map(i => i.textContent.replace(/\D/g, "")).join(","), $(".panel .hjudge").querySelectorAll("p").length, wr().hand().strokes.length];
        const s0 = snap(); await flip(true); const s1 = snap(); await flip(false); if (JSON.stringify(s0) !== JSON.stringify(s1)) bad.c.push(`${lg} ${JSON.stringify(s0)}→${JSON.stringify(s1)}`); }
      // ⓓ 따라 쓰기
      localStorage.setItem("malmun.hfollow", "1"); await open(14, "hand"); { const px = () => { const c = $(".panel .hpace"); if (!c) return 0; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) k++; return k; }; await W(500); const a = px(), pr = $(".panel [data-hfollow]")?.getAttribute("aria-pressed"); await flip(true); await W(300); const b = px(), pr2 = $(".panel [data-hfollow]")?.getAttribute("aria-pressed"); await flip(false); if (!(a > 0 && b > 0 && pr === "true" && pr2 === "true")) bad.d.push(`${lg} 견본 ${a}→${b} 단추 ${pr}→${pr2}`); }
      localStorage.setItem("malmun.hfollow", "0");
      // ⓔ 자판 자동 도는 중
      await open(14, "kb"); { $(".panel [data-act=autoall]").click(); await W(900); const s0 = [wr().st().auto, $(".panel [data-act=autoall]").getAttribute("aria-pressed")]; await flip(true); await W(400); const s1 = [wr().st().auto, $(".panel [data-act=autoall]").getAttribute("aria-pressed")]; await flip(false); $(".panel [data-act=autoall]").click(); await W(300); if (!s0[0] || JSON.stringify(s0) !== JSON.stringify(s1)) bad.e.push(`${lg} ${JSON.stringify(s0)}→${JSON.stringify(s1)}`); }
    }
    ok(!bad.a.length, "ⓐ ⇄ 전후 쓰기 창 모든 단추·칸·판정 상자·뜻 줄·머리 줄 0px(손글씨·자판 · ne·ur·vi·th)", bad.a.join(" · "));
    ok(!bad.b.length, "ⓑ 쓰는 중 ⇄ = 그은 획·시간 막대 그대로", bad.b.join(" · "));
    ok(!bad.c.length, "ⓒ 꽝 + 「⋯」 펼침에서 ⇄ = 펼침·점수·판정 줄 수·획 그대로", bad.c.join(" · "));
    ok(!bad.d.length, "ⓓ 👣 따라 쓰기 중 ⇄ = 견본 붓 그대로", bad.d.join(" · "));
    ok(!bad.e.length, "ⓔ 자판 「전체 자동」 도는 중 ⇄ = 계속 돎", bad.e.join(" · "));
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  await i18n.setUiKo(false); const lg0 = keep.lang || "en"; localStorage.setItem("malmun.lang", lg0); await i18n.setLang(lg0);
  for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hm], ["malmun.hfollow", keep.fo]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 쓰기 ⇄ ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
