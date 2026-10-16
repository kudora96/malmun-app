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
    const rec = document.querySelector(".speak [data-act=rec]"); rec?.click(); for (let k = 0; k < 30 && !rec?.classList.contains("on"); k++) await W(100); await W(150); const d = S(); // 녹음이 실제로 시작된 뒤(🎤 뒤 마이크 여는 데 0.3~0.7초)
    rec?.click(); await W(2500); await go("#/learn/L01-00-01"); for (let k = 0; k < 20 && S().mic; k++) await W(250); // 말하기 화면은 다음 녹음을 위해 마이크를 열어 둠 → 화면을 나가면 닫힘
    const e = S();
    ok(d.mic && d.gain === 0 && d.live < 1e-4, "말하기 녹음 중(마이크 열림) = 음악 완전히 0(녹음·받아쓰기에 안 섞임)", `전 ${J(sp)} · 녹음 중 ${J(d)}`);
    ok(!e.mic && e.gain > 0, "말하기 화면을 나가 마이크가 닫히면 = 다시 깔림", J(e));
    await go("#/diag"); const f = S(); ok(f.gain === 0, "진단 화면 = 0", J(f));
    // ♪ = 🎵 음악 상자 열기(대표님 10-16) — 상자 안 켜기/끄기 · 음량 막대 · ⏭ 다음 곡 · 곡 목록
    const btn = () => [...document.querySelectorAll("[data-act=bgm]")].find(vis), box = () => document.querySelector(".sheet.mbox"), q = s2 => box()?.querySelector(s2);
    await go("#/list"); btn().click(); await W(400);
    ok(!!box() && !!q("[data-mb=onoff]") && !!q("[data-mb=vol]") && !!q("[data-mb=next]") && !!q(".mnow") && q(".mlist")?.children.length === B.TRACKS.length, "♪ 누르면 음악 상자(켜기/끄기 · 음량 · 지금 곡 · 다음 곡 · 곡 목록)", box() ? q(".mnow").textContent.trim().slice(0, 40) : "안 열림");
    const w0 = btn().getBoundingClientRect().width; [...document.querySelectorAll("[data-act=uiko]")].find(vis)?.click(); await W(500); const keep = !!box(); [...document.querySelectorAll("[data-act=uiko]")].find(vis)?.click(); await W(500);
    ok(keep && !!box(), "상자 연 채 ⇄ = 그대로(상태 보존)", String(keep));
    const vol = q("[data-mb=vol]"); vol.value = "40"; vol.dispatchEvent(new Event("input", { bubbles: true })); await W(300); const v1 = S();
    ok(near(v1.vol, 0.4) && near(v1.gain, V * 0.4), "음량 막대 40 = 배경음악 0.4배(기억)", J(v1));
    const t0 = S().track; q("[data-mb=next]").click(); await W(1500); const t1 = S();
    ok(t1.playing && t1.track && t1.track !== t0, "⏭ 다음 곡 = 다른 곡", `${t0} → ${t1.track}`);
    q("[data-mb=onoff]").click(); await W(300); const g = S(), gp = btn().dataset.on;
    ok(!g.playing && !g.on && gp === "false", "상자에서 끄면 꺼짐(앱 전체 · ♪ 흐리게 · 기억)", J(g) + " " + gp);
    q("[data-close]").click(); await W(300);
    await go("#/learn/L01-00-01"); const h1 = S(); ok(!h1.playing, "끈 채로 공부 화면 가도 안 나옴", J(h1));
    btn().click(); await W(400); q("[data-mb=onoff]").click(); await W(1200); const i1 = S();
    ok(i1.playing && i1.on && near(i1.gain, V * 0.32 * 0.4), "다른 창(배우기) ♪ 상자에서 다시 켜짐 · 공부 화면은 음량 값에서 다시 작게", J(i1));
    const rows = box().querySelectorAll(".mlist li"); rows[2]?.querySelector("[data-play]").click(); await W(1500); const j = S();
    ok(j.track === B.TRACKS[2].file && box().querySelectorAll("[data-dl]").length === B.TRACKS.length && box().querySelector("[data-play='2']")?.getAttribute("aria-pressed") === "true",
      "곡 목록 ▶ 그 곡 듣기 · ⬇ 내려받기 단추", `${rows.length}곡 · 지금 ${j.track}`);
    const w1 = btn() ? btn().getBoundingClientRect().width : -1; q("[data-mb=vol]").value = "100"; q("[data-mb=vol]").dispatchEvent(new Event("input", { bubbles: true }));
    q("[data-close]").click(); await W(300);
    ok(w0 > 0, "♪ 단추 있음", `폭 ${w0.toFixed(1)}`);
    window.__sfxVolume = 0.0001; await go("#/learn/L01-00-01"); await go("#/list"); const k = S();
    ok(!k.playing, "점검 음소거(__sfxVolume 아주 작게) = 안 틂", J(k));
  } catch (e) { ok(false, "점검 오류", e.message); }
  window.__sfxVolume = v0 ?? 0.0001;
  return res.join("\n");
})();
