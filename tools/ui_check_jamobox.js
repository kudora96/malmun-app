// 자모 나눔 점검(본부 10-08 — 11,172자 중 911자가 자모 하나를 통째로 잃어 자판 칠·획순·손글씨 판정이 한 칸씩 밀리던 것) — #/learn/L01-00-01 을 연 채로
// 쓰기 창을 열고 __wr.unitsOf(글자) 가 기본 자모 차례(초성·중성·종성 → 겹자모는 나눠서)와 같은지 · 칸마다 잉크가 있는지(전체 잉크의 1% 이상)
// 표본 1,000자(씨앗 고정) · window.__jamoAll = true 면 11,172자 전부(약 1분 반) · 40자마다 양보
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  try {
    const v = document.documentElement.dataset.v || "", J = await import(`/js/jamobox.js?v=${v}`);
    if (!$(".panel .write")) { document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(1500); document.querySelector("video")?.pause(); }
    const wr = $(".panel .write")?.parentElement?.__wr; if (!wr) throw new Error("쓰기 창 없음");
    const all = window.__jamoAll === true, list = [];
    if (all) for (let c = 0; c < 11172; c++) list.push(String.fromCharCode(0xac00 + c));
    else { let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); for (const ch of "어서오세요경복궁에온걸환영해대궁굴꿰뛔뽜쐐끼쬐놔뇨귀큉") list.push(ch); while (list.length < 1000) list.push(String.fromCharCode(0xac00 + Math.floor(rnd() * 11172))); }
    await document.fonts?.load(wr.font(), list.join("")).catch(() => {});
    const bad = [], thin = [];
    for (let i = 0; i < list.length; i++) {
      const ch = list[i], s = J.split(ch), want = [s.cho, s.jung, s.jong].filter(Boolean).flatMap(J.baseOf).join(""), us = wr.unitsOf(ch), got = us.map(u => u.jamo).join("");
      if (want !== got) bad.push(`${ch}(${want}→${got})`);
      else { const tot = us.reduce((a, u) => a + u.px.length, 0) || 1; const t = us.filter(u => u.px.length < tot * 0.01).map(u => u.jamo); if (t.length) thin.push(`${ch}(${t.join("")})`); }
      if (i % 40 === 39) await W(0);
    }
    ok(!bad.length, `자모 차례 = 기본 자모(빠짐·밀림 0) ${list.length}자`, bad.length ? `${bad.length}자 · ${bad.slice(0, 12).join(" ")}` : "");
    ok(!thin.length, `칸마다 잉크 1% 이상 ${list.length}자`, thin.length ? `${thin.length}자 · ${thin.slice(0, 12).join(" ")}` : "");
    // 자판 칠(본부 10-08) — 1편 글자 전부 · 한 자모씩 칠할 때 친 자모 잉크 덜 칠 < 2% · 안 친 자모로 넘침 < 1%
    { const chs = [...new Set([...document.querySelectorAll(".line")].map(b => b.textContent).join("").replace(/[^가-힣]/g, ""))], badP = []; let wu = 0, wo = 0;
      for (const ch of chs) { const nb = wr.unitsOf(ch).length; for (let k = 1; k <= nb; k++) { const r = wr.paintCheck(ch, k); wu = Math.max(wu, r.under); wo = Math.max(wo, r.over); if (r.under >= 0.02 || r.over >= 0.01) badP.push(`${ch}${k}(${(r.under * 100).toFixed(1)}/${(r.over * 100).toFixed(1)})`); } await W(0); }
      ok(chs.length > 20 && !badP.length, `자판 칠 ${chs.length}자 · 친 자모 덜 칠 < 2% · 넘침 < 1%`, `최대 ${(wu * 100).toFixed(1)}% / ${(wo * 100).toFixed(1)}%${badP.length ? " · " + badP.slice(0, 10).join(" ") : ""}`); }
    $(".panel [data-act=close]")?.click();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 자모 나눔 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
