// 손글씨 바른 획 점수 전수(본부 10-12 「ㄱ·ㅈ+ㅓ 계열 바른 획 96~99」) — #/learn/L01-00-01 을 연 채로 · 편의 모든 글자 × 연필·펜·붓
// ⓐ 자료 획 길(brushPath) 그대로 그음 = 100 ⓑ 회색 가운데 길(글자부 strokefit · 앱 fitPath) 그대로 = 100 ⓒ 글자 가운데 선(centerOf · 조심스러운 학습자) = 100
// ⓓ 펜 굵기만큼 옆으로 비껴 그음(연필·펜) = 거의 다 80 아래(글자 모양상 가로획이 많아 겹치는 몇 자만 예외 · 5% 이하)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode") };
  try {
    localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", "free");
    document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(2500);
    const wr = $(".panel .write")?.parentElement?.__wr; if (!wr) throw new Error("쓰기 창 없음");
    const ep = (location.hash.match(/learn\/([^/?]+)/) || [])[1] || "L01-00-01";
    const j = await (await fetch(`/data/${ep}/${ep}.json?` + Date.now())).json();
    const chars = [...new Set(((j.subtitles || []).map(l => l.ko).join("") + (window.__handChars || "전접경거기건겠쿼")).replace(/[^가-힣]/g, ""))]; // 편 대사 글자 전부 + 본부 결함 목록(10-12)
    const TW = { pencil: 0.04, pen: 0.07, brush: 0.12 }, T = Object.keys(TW), bad = { a: [], b: [], c: [] }, shiftPass = { pencil: [], pen: [] }; let n = 0;
    for (const ch of chars) {
      const list = await wr.strokesOf(ch); if (!list.length) continue; n++;
      const Qs = list.map(S => wr.brushPath(ch, S)), cen = wr.centerOf(ch);
      for (const tk of T) {
        const mk = P => Object.assign(P, { tool: tk, w: TW[tk] });
        const a = wr.handScore(ch, Qs.map(Q => mk(Q.map(q => [q.x, q.y])))).pct;
        const F = []; for (let i = 0; i < list.length; i++) F.push(await wr.fitPath(ch, i, tk));
        const b = wr.handScore(ch, F.map(Q => mk(Q.map(q => [q.x, q.y])))).pct;
        const c = wr.handScore(ch, cen.map(S => mk(S.map(p => [p[0], p[1]])))).pct;
        if (a < 100) bad.a.push(`${ch}(${tk} ${a})`); if (b < 100) bad.b.push(`${ch}(${tk} ${b})`); if (c < 100) bad.c.push(`${ch}(${tk} ${c})`);
        if (tk !== "brush" && wr.handScore(ch, Qs.map(Q => mk(Q.map(q => [q.x + TW.pen, q.y])))).pct >= 80) shiftPass[tk].push(ch);
      }
      if (n % 10 === 0) await W(0); // 화면 숨 돌림
    }
    ok(n >= 90, `글자 ${n}자 × 도구 3 잼`, `${chars.length}자 중 획 자료 있는 것`);
    ok(!bad.a.length, "ⓐ 자료 획 길 그대로 = 100", bad.a.join(" "));
    ok(!bad.b.length, "ⓑ 회색 가운데 길 그대로 = 100", bad.b.join(" "));
    ok(!bad.c.length, "ⓒ 글자 가운데 선 = 100", bad.c.join(" "));
    ok(shiftPass.pencil.length <= n * 0.05 && shiftPass.pen.length <= n * 0.05, "ⓓ 펜 굵기만큼 비껴 그음(연필·펜) = 거의 다 80 아래", `통과한 글자 연필 ${shiftPass.pencil.join("") || "없음"} · 펜 ${shiftPass.pen.join("") || "없음"}`);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  try { for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
  $(".panel [data-act=close]")?.click();
  return res.join("\n");
})();
