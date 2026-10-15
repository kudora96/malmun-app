// 배경음악 점검(본부 10-15 「카페 느낌」) — 모든 화면에 깔림 · 공부 화면은 아주 작게 · 앱 소리 날 때 더 낮춤 · 마이크 열림(녹음) 중 완전히 0 · ♪ 모든 창 · 🎵 음악 상자
// 소리는 머리 없는 크롬 가짜 출력이라 밖으로 안 나옴 — 여기서만 __sfxVolume 0.02(틀어지는지 보려고 · 음량은 그만큼 곱해짐)
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const v0 = window.__sfxVolume, V = 0.02; window.__sfxVolume = V;
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  try {
    const B = await import(`/js/bgm.js?v=${document.documentElement.dataset.v}`), S = () => B.bgmState(), J = x => JSON.stringify(x);
    try { localStorage.removeItem("malmun.bgm"); } catch {}
    const go = async h => { location.hash = h; await W(1800); };
    const vis = el => el && el.offsetParent && el.getBoundingClientRect().width > 0;
    await go("#/list"); const a = S();
    ok(a.on && a.playing && near(a.gain, V), "편 목록 = 보통 음량(gain 1)", J(a));
    await go("#/learn/L01-00-01"); const b = S();
    ok(b.playing && near(b.gain, V * 0.32) && a.track === b.track, "배우기 = 아주 작게(0.32) · 곡은 끊기지 않고 이어짐", J(b));
    dispatchEvent(new CustomEvent("malmun:snd", { detail: 1 })); await W(100); const c = S();
    dispatchEvent(new CustomEvent("malmun:snd", { detail: -1 })); await W(100); const c2 = S();
    ok(c.duck && near(c.gain, V * 0.32 * 0.3) && !c2.duck && near(c2.gain, V * 0.32), "앱 소리 나는 동안 더 낮춤(덕킹 0.3) · 끝나면 돌아옴", `${J(c)} → ${J(c2)}`);
    const okBgm = [];
    for (const [nm, h, pre] of [["편 목록", "#/list"], ["배우기 머리", "#/learn/L01-00-01"], ["설명 창", "#/learn/L01-00-01", async () => { const l = document.querySelector(".line"); l.click(); await W(400); l.querySelector("[data-act=explain]").click(); await W(1500); }], ["따로 연 말하기", "#/speak/L01-00-01/1"], ["진단", "#/diag"]]) {
      await go(h); if (pre) await pre(); okBgm.push(`${nm}:${[...document.querySelectorAll("[data-act=bgm]")].filter(vis).length}`); }
    ok(okBgm.every(x => /:[1-9]/.test(x)), "♪ 단추 = 모든 창(보이는 곳에 하나 이상)", okBgm.join(" "));
    // 따로 연 말하기에서 실제 녹음(가짜 마이크) — 녹음 도는 동안 음악 0
    await go("#/speak/L01-00-01/1"); const sp = S();
    const rec = document.querySelector(".speak [data-act=rec]"); rec?.click(); await W(700); const d = S();
    rec?.click(); await W(2500); await go("#/learn/L01-00-01"); for (let k = 0; k < 20 && S().mic; k++) await W(250); // 말하기 화면은 다음 녹음을 위해 마이크를 열어 둠 → 화면을 나가면 닫힘
    const e = S();
    ok(d.mic && d.gain === 0 && d.live < 1e-4, "말하기 녹음 중(마이크 열림) = 음악 완전히 0(녹음·받아쓰기에 안 섞임)", `전 ${J(sp)} · 녹음 중 ${J(d)}`);
    ok(!e.mic && e.gain > 0, "말하기 화면을 나가 마이크가 닫히면 = 다시 깔림", J(e));
    await go("#/diag"); const f = S(); ok(f.gain === 0, "진단 화면 = 0", J(f));
    await go("#/list");
    const btn = () => [...document.querySelectorAll("[data-act=bgm]")].find(vis);
    btn().click(); await W(300); const g = S(), gp = btn().getAttribute("aria-pressed");
    ok(!g.playing && !g.on && gp === "false", "♪ 누르면 꺼짐(앱 전체 · 기억)", J(g) + " " + gp);
    await go("#/learn/L01-00-01"); const h1 = S(); ok(!h1.playing, "끈 채로 공부 화면 가도 안 나옴", J(h1));
    [...document.querySelectorAll("[data-act=bgm]")].find(vis).click(); await W(900); const i1 = S();
    ok(i1.playing && i1.on, "다른 창(배우기) ♪ 로 다시 켜짐", J(i1));
    await go("#/list"); document.querySelector("[data-act=musicbox]").click(); await W(500);
    const rows = document.querySelectorAll(".sheet.mbox .mlist li");
    rows[2]?.querySelector("[data-play]").click(); await W(1500); const j = S();
    ok(rows.length === B.TRACKS.length && j.track === B.TRACKS[2].file && document.querySelectorAll(".sheet.mbox [data-dl]").length === B.TRACKS.length && document.querySelector(".sheet.mbox [data-play='2']")?.getAttribute("aria-pressed") === "true",
      "🎵 음악 상자 = 곡 목록 · ▶ 그 곡 듣기 · ⬇ 내려받기 단추", `${rows.length}곡 · 지금 ${j.track}`);
    document.querySelector(".sheet-dim")?.click(); await W(300);
    window.__sfxVolume = 0.0001; await go("#/learn/L01-00-01"); await go("#/list"); const k = S();
    ok(!k.playing, "점검 음소거(__sfxVolume 아주 작게) = 안 틂", J(k));
  } catch (e) { ok(false, "점검 오류", e.message); }
  window.__sfxVolume = v0 ?? 0.0001;
  return res.join("\n");
})();
