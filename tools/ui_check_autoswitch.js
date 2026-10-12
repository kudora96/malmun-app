// 자동 완성 두 가지 끼어들기 점검(본부 10-12 투덜이 실사용 1012.4 — ① [자동 완성]이 줄 끝에서 안 멈추고 다음 줄로 감 ② 한쪽 도는 중 다른 쪽 = 「띵띵」 계속)
// #/learn/L01-00-01 을 연 채로 · 쓰기 창(자판) · 소리 아주 작게
// ⓐ [자동 완성] → 줄 끝에서 멈춤 · 5초 동안 다음 줄로 안 감 · 자동 꺼짐 · 소리 0
// ⓑ 서로 바꿔 누르기 4가지(전체→한 줄 · 한 줄→전체 · 같은 단추 둘) — 소리 겹침 0(2개 이상 0.3초+ 없음) · 자모 치는 빠르기가 두 배로 안 늘어남(고리 하나) · 자리 = 이어받음(처음으로 안 감) · 눌린 단추 표시 = 실제 모드
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const els = new Set(), op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { els.add(this); try { this.volume = Math.min(this.volume, 0.0001); } catch {} return op.call(this); };
  const log = (window.__sfxLog = []), sfxLive = () => { const n = {}; for (const e of log) n[e.name] = (n[e.name] || 0) + (e.ev === "시작" ? 1 : -1); return Object.values(n).reduce((a, v) => a + Math.max(0, v), 0); };
  const sounds = () => [...els].filter(e => !e.paused && !e.ended && e.isConnected !== false && e.currentSrc).length + sfxLive();
  let osc = 0; const oS = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { osc++; return oS.apply(this, a); }; // write.js tone() = 오실레이터 2개(딩동) — __sfxLog 에 안 남는 소리(투덜이 「띵띵」)
  const errs = []; const onErr = e => errs.push(String(e.message || e.reason?.message || e.reason)); addEventListener("error", onErr); addEventListener("unhandledrejection", onErr);
  const wr = () => $(".panel .write")?.parentElement?.__wr, S = () => wr()?.st() || {};
  const sub = () => $(".panel .whead .sub")?.textContent || "";
  const ord = s => (s.s ?? 0) * 1e6 + (s.w ?? 0) * 1e4 + (s.c ?? 0) * 100 + (s.k ?? 0);
  const pos = () => { const s = S(); return `${s.s}.${s.w}.${s.c}.${s.k}`; };
  // 지켜보기 — ms 동안: 소리 2개 이상이 0.3초 넘게 이어진 적 · 자모 친 수(자판 반짝 = .right 붙음)
  const watch = async ms => { let over = 0, worst = 0, flashes = 0; const mo = new MutationObserver(ms2 => { for (const m of ms2) if (m.target.classList?.contains("right") && m.oldValue !== null && !/\bright\b/.test(m.oldValue)) flashes++; });
    const kb = $(".panel .kb"); if (kb) mo.observe(kb, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    const t0 = performance.now(); while (performance.now() - t0 < ms) { const n = sounds(); over = n >= 2 ? over + 60 : 0; worst = Math.max(worst, over); await W(60); } mo.disconnect(); return { worst, flashes }; };
  const btn = m => $(`.panel [data-act=${m === "line" ? "auto" : "autoall"}]`);
  const shown = () => ["line", "all"].filter(m => btn(m)?.getAttribute("aria-pressed") === "true");
  let MODE = "kb";
  const openWrite = async li => { document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(1500); document.querySelector("video")?.pause(); const mb = $(`.panel [data-mode=${MODE}]`); if (mb && mb.getAttribute("aria-pressed") !== "true") { mb.click(); await W(MODE === "hand" ? 1500 : 400); } };
  // 손글씨 모드는 자판이 없어 「반짝」 대신 글자 자리(c) 바뀜을 셈
  const watchPos = async ms => { let over = 0, worst = 0, steps = 0, last = pos(); const o0 = osc, t0 = performance.now(); while (performance.now() - t0 < ms) { const n = sounds(); over = n >= 2 ? over + 60 : 0; worst = Math.max(worst, over); const p = pos(); if (p !== last) { steps++; last = p; } await W(30); } return { worst, flashes: steps, dings: (osc - o0) / 2 }; };
  const closeP = async () => { $(".panel [data-act=close]")?.click(); await W(600); };
  try {
    // 가장 짧은 줄 고르기(글자 수) — 줄 끝까지 빨리
    const lens = [...document.querySelectorAll(".line")].map((l, i) => [i, (l.querySelector(".ko")?.textContent || l.textContent).replace(/[^가-힣]/g, "").length]).filter(([i]) => i < document.querySelectorAll(".line").length - 1).sort((a, b) => a[1] - b[1]);
    const short = lens[0][0];
    for (MODE of ["kb", "hand"]) { const watchM = watchPos, tag = MODE === "kb" ? "[자판]" : "[손글씨]";
    // ⓐ [자동 완성] → 줄 끝 → 5초 그대로
    await openWrite(short); const sub0 = sub();
    btn("line").click(); let g = 0; while (!S().lineEnd && g++ < 1500) await W(200);
    const atEnd = S().lineEnd; let g2 = 0; await W(300); while (S().sent && g2++ < 200) await W(100); const heardLine = g2 > 0; const w5 = await watchM(5000); // 대사가 끝난 뒤 5초(본부 10-12 — W6 자동 넘김이 대사 뒤에 오므로)
    ok(atEnd && sub() === sub0 && !S().auto && !S().allNext && !shown().length && heardLine && w5.flashes === 0 && w5.dings === 0 && w5.worst === 0 && sounds() === 0,
      tag + " ⓐ [자동 완성] = 줄 끝에서 멈춤 · 5초 동안 다음 줄로 안 감 · 자동 꺼짐 · 소리 없음", `${sub0} → ${sub()} · 줄끝 ${atEnd} · 자동 ${S().auto} · 단추 ${shown().join(",") || "없음"} · 대사 ${heardLine} · 걸음 ${w5.flashes} · 딩동 ${w5.dings}`);
    // 다시 누르면 같은 줄 처음부터
    btn("line").click(); await W(700); ok(S().auto && S().autoMode === "line" && S().s === 0 && !S().lineEnd && sub() === sub0, tag + " ⓐ 줄 끝에서 다시 [자동 완성] = 같은 줄 처음부터", `${pos()} · ${sub()}`);
    btn("line").click(); await W(400); await closeP();
    // ⓑ 바꿔 누르기 4가지
    for (const [a, b] of [["all", "line"], ["line", "all"], ["all", "all"], ["line", "line"]]) {
      await openWrite(0); const subA = sub();
      btn(a).click(); await W(1800); const before = await watchM(MODE === "hand" ? 4000 : 2400); const p0 = ord(S()), pp0 = pos();
      btn(b).click(); await W(150);
      const same = a === b, after = await watchM(MODE === "hand" ? 4000 : 2400), p1 = ord(S()), m = `${tag} ⓑ ${a === "all" ? "전체" : "한 줄"} 도는 중 → ${b === "all" ? "전체" : "한 줄"} 누름`;
      if (same) {
        const still = pos(); const w2 = await watchM(2000);
        ok(!S().auto && !shown().length && pos() === still && w2.flashes === 0 && w2.dings === 0 && after.worst < 300 && sounds() === 0, `${m} = 그 자리에서 멈춤 · 소리 0 · 더 안 침`, `${pp0} → ${still} → ${pos()} · 걸음 ${w2.flashes} · 딩동 ${w2.dings}`);
      } else {
        const rate0 = before.flashes, rate1 = after.flashes;
        ok(S().auto && S().autoMode === b && shown().join() === b && after.worst < 300 && rate1 <= Math.max(rate0 * 1.5, rate0 + 2) && after.dings <= Math.max(before.dings * 1.5, before.dings + 2) && p1 >= p0 && sub() === subA,
          `${m} = 먼저 것 멈춤 · 누른 쪽이 그 자리에서 이어받음 · 소리 겹침 없음 · 한 고리`, `${pp0} → ${pos()} · 걸음 ${rate0}→${rate1} · 딩동 ${before.dings}→${after.dings} · 겹침 ${after.worst}ms · 단추 ${shown().join(",")}`);
        btn(b).click(); await W(500); ok(!S().auto && sounds() === 0, `${m} → 다시 그 단추 = 멈춤`, `자동 ${S().auto}`);
      }
      await closeP();
    }
    }
    ok(!errs.length, "오류 0", errs.slice(0, 3).join(" | "));
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  HTMLMediaElement.prototype.play = op; OscillatorNode.prototype.start = oS; removeEventListener("error", onErr); removeEventListener("unhandledrejection", onErr);
  const bad = res.filter(r => r.startsWith("✗")).length, head = `${innerWidth}x${innerHeight} 자동 두 가지 끼어들기 ${res.length - bad}/${res.length}`;
  const out = (bad ? "✗ " : "✓ ") + head + "\n  " + res.join("\n  "); console.log(out); return out;
})();
