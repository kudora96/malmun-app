// 녹음 끊김 점검(투덜이 10-07 r8 허락 — 「…거구나」 뒤 0.5초 숨에서 녹음이 끝남) — #/learn/L01-00-01 을 연 채로 · 마이크·인식은 가짜 · 소리 아주 작게
// 가짜 인식 = 진짜 크롬처럼 말 한 덩이를 끝내며 받은 트랙을 꺼 버리고(track.stop) 혼자 끝남(onend) → 녹음은 계속 · 인식은 다시 켜져 들은 말 이어 붙임
// 가짜 마이크 = 4초 말(삑) 중간에 0.5초 숨 → 조용 → 2초 쉼 규칙으로 끝 · 끝난 까닭(why) = pause · 진단 기록에 why · 인식 트랙 = 복사본
// 말하기 창 · 설명 카드 둘 다
(async () => {
  window.__noRhythm = true;
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  Object.defineProperty(HTMLMediaElement.prototype, "volume", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, Math.min(v, 0.0001)); } });
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition };
  try {
    try { localStorage.removeItem("malmun.mic"); localStorage.removeItem("malmun.lastrec"); } catch {}
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    let mic = null;
    navigator.mediaDevices.getUserMedia = async () => { const ctx = new AudioContext(), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(dst); o.start(); mic = { g }; return dst.stream; };
    const talk = async () => { mic.g.gain.value = 0.3; await W(1700); mic.g.gain.value = 0; await W(500); mic.g.gain.value = 0.3; await W(1800); mic.g.gain.value = 0; }; // 1.7초 말 · 0.5초 숨 · 1.8초 말
    let n = 0; const tracks = [];
    // 가짜 인식: 1번째 = 「그게 세종대왕이」 뒤 1.2초에 받은 트랙을 끄고 혼자 끝남 · 2번째부터 = 「하고 싶었던 거구나」
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start(tr) { const k = n++; tracks.push(tr || null);
      if (k === 0) { setTimeout(() => this.onresult?.({ results: [[{ transcript: "그게 세종대왕이" }]] }), 500); setTimeout(() => { try { tr?.stop(); } catch {} this.onend?.(); }, 1200); }
      else setTimeout(() => this.onresult?.({ results: [[{ transcript: "하고 싶었던 거구나" }]] }), 400); } stop() {} };
    const last = () => { try { const a = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]"); return a[a.length - 1] || {}; } catch { return {}; } };
    // ① 말하기 창
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    const t0 = performance.now(); $(".panel [data-act=rec]").click(); await W(500); talk();
    await W(2200); const still = !!$(".panel [data-act=rec]")?.classList.contains("on");
    for (let k = 0; k < 120 && $(".panel [data-act=rec]")?.classList.contains("on"); k++) await W(100);
    const dur = (performance.now() - t0) / 1000; await W(2500); const L1 = last();
    ok(still && dur > 5.5 && L1.why === "pause" && L1.track === "clone" && n >= 2 && tracks[0] !== null, "말하기 창: 인식이 트랙을 끄고 끝나도 녹음 계속 → 2초 쉼으로 끝(why pause) · 인식 = 복사본 트랙 · 다시 켬",
      `2.7초 때 녹음 중 ${still} · 녹음 ${dur.toFixed(1)}초 · why ${L1.why} · track ${L1.track} · 인식 ${n}번 · sr ${(L1.sr || []).filter(x => /restart/.test(x)).join(" ")}`);
    const heard = (L1.heard || []).join(" | ");
    ok(/세종대왕이/.test(heard) && /거구나/.test(heard), "말하기 창: 다시 켠 인식의 들은 말도 이어 붙음", heard);
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(600);
    // ② 설명 카드
    n = 0; tracks.length = 0;
    document.querySelectorAll(".line")[9].querySelector("[data-act=explain]").click(); await W(1500); document.querySelector("video")?.pause();
    const cb = $(".panel .sayb [data-x=rec]");
    if (!cb) ok(false, "카드: 말해 보기 단추 없음");
    else { const t1 = performance.now(); cb.click(); await W(500); talk(); await W(2200); const st2 = cb.classList.contains("on");
      for (let k = 0; k < 120 && cb.classList.contains("on"); k++) await W(100);
      const d2 = (performance.now() - t1) / 1000; await W(2500); const L2 = last();
      ok(st2 && d2 > 5.5 && L2.where === "card" && L2.why === "pause" && L2.track === "clone" && n >= 2, "카드: 인식이 트랙을 끄고 끝나도 녹음 계속 → 2초 쉼으로 끝 · 복사본 트랙",
        `2.7초 때 녹음 중 ${st2} · 녹음 ${d2.toFixed(1)}초 · why ${L2.why} · track ${L2.track} · 인식 ${n}번`); }
    document.querySelectorAll(".line")[9].querySelector("[data-act=explain]").click(); await W(600);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR;
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 녹음 끊김 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
