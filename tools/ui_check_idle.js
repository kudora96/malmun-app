// 가만히 두면 소리 0(본부 10-15 투덜이 — 배우기 안 쓰기 창 채점 뒤 아무것도 안 하는데 소리가 「자주」 남)
// 배우기 → 15번 줄 쓰기 · 손글씨 → ✓ 채점(빈 칸) → 그대로 window.__idleMs(기본 180초 · 검사부는 300000) 둠
// 그동안 울린 소리 기록: Web Audio 소스 start(버퍼 길이·발진기 주파수) · <audio>/<video> play · 효과음 기록(__sfxLog)
// 45Hz 깨우기 신호(wake.js · 귀에 안 들림 · 크롬 탭 🔊 표시는 이것)는 따로 셈
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const log = [], t0 = () => Math.round(performance.now());
  const AS = window.AudioScheduledSourceNode?.prototype, s0 = AS?.start;
  if (AS && !AS.__idleHook) { AS.__idleHook = true; AS.start = function (...a) { log.push({ t: t0(), k: this.constructor.name, f: this.frequency?.value, d: this.buffer ? +this.buffer.duration.toFixed(2) : null, loop: !!this.loop }); return s0.apply(this, a); }; }
  const MP = HTMLMediaElement.prototype, p0 = MP.play;
  if (!MP.__idleHook) { MP.__idleHook = true; MP.play = function (...a) { log.push({ t: t0(), k: this.tagName, src: (this.currentSrc || this.src || "").split("/").pop().slice(0, 40) }); return p0.apply(this, a); }; }
  const run = async (rep, label, pre = null) => {
    location.hash = "#/list"; await W(600); location.hash = "#/learn/L01-00-01"; await W(1800);
    const ln = [...document.querySelectorAll(".line")], last = ln[ln.length - 1];
    if (pre) await pre(ln); // 쓰기부 10-15 — 앞에서 다른 줄 쓰기 창을 이렇게 쓰고 닫은 뒤
    document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(500);
    if (rep) { document.querySelector("[data-act=rep]").click(); await W(200); last.click(); await W(300); last.click(); await W(1500); } // 🔁 켜고 마지막 줄 듣는 중
    last.querySelector("[data-act=write]").click(); await W(1800);
    document.querySelector(".panel [data-mode=hand]")?.click(); await W(1500);
    document.querySelector(".panel [data-act=hdone]")?.click(); await W(3000);
    const from = t0(), dur = window.__idleMs ?? 100000, sfx0 = (window.__sfxLog || []).length;
    await W(dur);
    const got = log.filter(x => x.t >= from), wake = got.filter(x => x.k === "OscillatorNode" && x.f === 45), other = got.filter(x => !(x.k === "OscillatorNode" && x.f === 45));
    const media = [...document.querySelectorAll("audio,video")].filter(m => !m.paused).map(m => m.tagName + ":" + (m.currentSrc || "").split("/").pop().slice(0, 30));
    const sfx = (window.__sfxLog || []).slice(sfx0).filter(e => e.ev === "시작").map(e => e.name);
    ok(!other.length && !media.length && !sfx.length, `${label} · 배우기 안 쓰기 창 채점 뒤 가만히 ${Math.round(dur / 1000)}초 = 소리 0`, `소리 ${other.length} ${other.slice(0, 6).map(x => JSON.stringify(x)).join(" ")} · 재생 중 ${media.join(",") || "없음"} · 효과음 ${[...new Set(sfx)].slice(0, 6).join(",") || "없음"} · 깨우기 45Hz 새로 ${wake.length}`);
    if (rep) document.querySelector("[data-act=rep][aria-pressed=true]")?.click();
  };
  // 쓰기부 10-15(투덜이 「가만히 있는데 앞 줄 「세종대왕이요」 소리」) — 앞 줄 쓰기 창에서 자동·넘김을 쓰고 닫은 뒤에도 소리 0
  const W2 = async (li, mode = "kb") => { localStorage.setItem("malmun.wmode", mode); document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(1500); };
  const q = s => document.querySelector(s);
  const pres = [
    ["ⓒ 7번 줄 「전체 자동」 켰다 끈 뒤", async () => { await W2(6); q(".panel [data-act=autoall]")?.click(); await W(3000); q(".panel [data-act=autoall]")?.click(); await W(300); q(".panel [data-act=close]")?.click(); await W(500); }],
    ["ⓓ 7번 줄 「전체 자동」 켠 채 닫은 뒤", async () => { await W2(6); q(".panel [data-act=autoall]")?.click(); await W(3000); q(".panel [data-act=close]")?.click(); await W(500); }],
    ["ⓔ 6번 줄 「전체 자동」으로 줄 끝까지(문장 소리) 뒤", async () => { await W2(5); q(".panel [data-act=autoall]")?.click(); for (let k = 0; k < 160 && !q(".panel .write")?.parentElement?.__wr?.st?.().lineEnd; k++) await W(250); await W(6000); q(".panel [data-act=close]")?.click(); await W(500); }],
    ["ⓕ 14번 줄 손글씨 ▶ 다음으로 넘긴 뒤 · 창 닫았다 다시 연 뒤", async () => { await W2(13, "hand"); for (let k = 0; k < 4; k++) { q(".panel [data-act=hnext]")?.click(); await W(500); } q(".panel [data-act=close]")?.click(); await W(500); await W2(13, "hand"); q(".panel [data-act=close]")?.click(); await W(500); }],
  ];
  try { await run(false, "ⓐ 그냥"); await run(true, "ⓑ 🔁 한 줄 반복 켠 채"); for (const [lb, pre] of pres) await run(false, lb, pre); } catch (e) { ok(false, "점검 오류", e.message); }
  return res.join("\n");
})();
