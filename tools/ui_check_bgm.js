// 배경음악 점검(본부 10-15) — 첫 화면·편 목록에서만 나옴 · 배우기·말하기·쓰기 화면에선 꺼짐 · 나오면 다시 · ♪ 끄기/켜기 · 마이크 여는 순간 멈춤 · ?mute(아주 작은 __sfxVolume)면 안 틂
// 소리는 머리 없는 크롬 가짜 출력이라 밖으로 안 나옴 — 여기서만 __sfxVolume 0.02(틀어지는지 보려고)
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const v0 = window.__sfxVolume; window.__sfxVolume = 0.02;
  try {
    const B = await import(`/js/bgm.js?v=${document.documentElement.dataset.v}`), S = () => B.bgmState();
    try { localStorage.removeItem("malmun.bgm"); } catch {}
    const go = async h => { location.hash = h; await W(1800); };
    await go("#/list"); const a = S();
    ok(a.on && a.playing && a.scene === "list", "편 목록 = 배경음악 나옴(처음 켬)", JSON.stringify(a));
    await go("#/learn/L01-00-01"); const b = S();
    ok(!b.playing, "배우기 화면 = 꺼짐", JSON.stringify(b));
    await go("#/speak/L01-00-01/1"); const c = S();
    ok(!c.playing, "따로 연 말하기 화면 = 꺼짐", JSON.stringify(c));
    await go("#/list"); const d = S();
    ok(d.playing, "편 목록으로 돌아오면 다시 나옴", JSON.stringify(d));
    ok(/arirang|doraji/.test(a.track || "") && /arirang|doraji/.test(d.track || "") && a.track !== d.track && d.next && d.next !== d.track, "아리랑 곡 돌려 쓰기 — 다시 틀 때 다른 곡 · 다음 곡 미리 정함(같은 곡 연속 없음)", `${a.track} → ${d.track} · 다음 ${d.next}`);
    const btn = () => document.querySelector("[data-act=bgm]");
    btn().click(); await W(300); const e = S(), ep = btn().getAttribute("aria-pressed");
    ok(!e.playing && !e.on && ep === "false", "♪ 누르면 꺼짐(단추 aria-pressed false · 기억)", JSON.stringify(e) + " " + ep);
    await go("#/learn/L01-00-01"); await go("#/list"); const f = S();
    ok(!f.playing, "끈 채로 화면을 오가도 안 나옴", JSON.stringify(f));
    btn().click(); await W(900); const g = S();
    ok(g.playing && g.on, "♪ 다시 누르면 켜짐", JSON.stringify(g));
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(x => x.stop()); } catch {}
    const h = S(); ok(!h.playing, "마이크 여는 순간 그 자리에서 멈춤(녹음에 안 섞임)", JSON.stringify(h));
    window.__sfxVolume = 0.0001; await go("#/learn/L01-00-01"); await go("#/list"); const i = S();
    ok(!i.playing, "점검 음소거(__sfxVolume 아주 작게) = 안 틂", JSON.stringify(i));
    const hb = document.querySelector(".list .bar"), ks = [...hb.querySelectorAll("button,.chip")].filter(x => x.offsetParent).map(x => x.getBoundingClientRect());
    let ov = 0; for (let p = 0; p < ks.length; p++) for (let q = p + 1; q < ks.length; q++) { const x = ks[p], y = ks[q]; if (x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1) ov++; }
    ok(!ov && ks.every(r => r.right <= innerWidth + 0.5) && document.documentElement.scrollWidth <= innerWidth, "편 목록 머리 줄 ♪ 단추 겹침·화면 밖 0", `단추 ${ks.length} · 겹침 ${ov}`);
  } catch (e) { ok(false, "점검 오류", e.message); }
  window.__sfxVolume = v0 ?? 0.0001;
  return res.join("\n");
})();
