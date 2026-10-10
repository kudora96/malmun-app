// 안드로이드 「녹음 먼저 → 그 녹음 소리로 받아쓰기」 점검(본부 10-10 긴급 · 갤럭시 녹음+받아쓰기 동시 불가) — #/learn/L01-00-01 을 연 채로 · 가짜 안드로이드·마이크·받아쓰기
// 가짜 받아쓰기 = 녹음(MediaRecorder)이 도는 중이면 아무것도 못 들음(동시 불가 기기) · 트랙으로 받으면 window.__trackOK 일 때만 들음 · 트랙 없이(받아쓰기만)는 늘 들음
// ⓐ 트랙 받아쓰기 됨: 점수 남 · 녹음 그대로(내 목소리) · 기기 기억 seq-ok ⓑ 안 됨: 0점 대신 「한 번 더」 · 효과음 없음 · 기기 기억 sronly → 다음 = 받아쓰기만(마이크 안 엶) · 점수 · 따라 읽기 칠 ⓒ 카드도 ⓐ
(async () => {
  window.__noRhythm = true;
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; delete window.__noSeq;
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition, mrs: MediaRecorder.prototype.start, mrp: MediaRecorder.prototype.stop };
  const setUA = android => { if (android) Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => "Mozilla/5.0 (Linux; Android 10; SM-G973N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36" }); else delete navigator.userAgent; };
  const sfxLog = (window.__sfxLog = []);
  try {
    try { localStorage.removeItem("malmun.srdev"); sessionStorage.removeItem("malmun.srmode"); localStorage.removeItem("malmun.lastrec"); } catch {}
    let gum = 0, mic = null, recOn = 0; const ctxP = import(`/js/wake.js?v=${document.documentElement.dataset.v}`).then(m => m.audioCtx());
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    navigator.mediaDevices.getUserMedia = async () => { gum++; const ctx = await ctxP, dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(dst); o.start(); mic = { g, tr: dst.stream.getAudioTracks()[0] }; const t = mic.tr, f = t.stop.bind(t); t.stop = () => { f(); try { o.stop(); o.disconnect(); } catch {} }; return dst.stream; };
    MediaRecorder.prototype.start = function (...a) { recOn++; this.addEventListener("stop", () => recOn--, { once: true }); return keep.mrs.apply(this, a); };
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start(tr) { this.tr = tr; const can = recOn > 0 ? false : tr ? (tr !== mic?.tr && !!window.__trackOK) : true; window.__srStarts = (window.__srStarts || []).concat(tr ? (recOn ? "동시" : tr === mic?.tr ? "마이크트랙" : "녹음소리트랙") : "트랙없음");
        if (can) setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__heard }]] }), 400); this.tm = setTimeout(() => this.onend?.(), tr ? 2600 : 1500); }
      stop() { clearTimeout(this.tm); setTimeout(() => this.onend?.(), 50); } };
    const talk = async (ms = 1500) => { await W(400); if (mic) { mic.g.gain.value = 0.3; await W(ms); mic.g.gain.value = 0; } };
    setUA(true);
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    const p = $(".panel"); window.__heard = p.__sp._cur().say;
    const once = async () => { const n0 = sfxLog.length; $(".panel [data-act=rec]").click(); talk(); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 300 && !/\d+%|फेरि एक पटक|한 번 더|once more/.test($(".panel .msg").textContent); k++) await W(100); await W(400); return { msg: $(".panel .msg").textContent, fx: sfxLog.slice(n0).filter(e => e.ev === "시작" && /score_/.test(e.name)).map(e => e.name) }; };
    // ⓐ
    window.__trackOK = true; window.__srStarts = []; let a = await once();
    ok(/\d+%/.test(a.msg) && localStorage.getItem("malmun.srdev") === "seq-ok" && !!p.__sp._state.blob && !window.__srStarts.includes("동시") && window.__srStarts.includes("녹음소리트랙"),
      "ⓐ 안드로이드: 녹음만 → 끝나면 그 녹음 소리로 받아쓰기 = 점수 · 녹음 그대로 · 기기 기억 seq-ok", `「${a.msg.slice(0, 50)}」 · 받아쓰기 ${window.__srStarts.join("/")} · 기억 ${localStorage.getItem("malmun.srdev")}`);
    // ⓑ
    localStorage.removeItem("malmun.srdev"); window.__trackOK = false; window.__srStarts = []; const g0 = gum; let b = await once(); const retry = $(".panel .msg").textContent;
    ok(!/\d+%/.test(b.msg) && /फेरि एक पटक|한 번 더|once more/.test(b.msg) && !b.fx.length && localStorage.getItem("malmun.srdev") === "sronly", "ⓑ 녹음 소리로도 못 들음(말소리 있음) = 0점 대신 「한 번 더 말해 주세요」 · 효과음 없음 · 기기 기억 sronly", `「${retry.slice(0, 40)}」 · 효과 ${b.fx.join(",") || "없음"} · 기억 ${localStorage.getItem("malmun.srdev")}`);
    window.__srStarts = []; const g1 = gum; let paced = false; const watch = setInterval(() => { if ($(".panel .say span.pace")) paced = true; }, 50); b = await once(); clearInterval(watch);
    ok(gum === g1 && /\d+%/.test(b.msg) && window.__srStarts.every(x => x === "트랙없음") && paced, "ⓑ 다음 말하기 = 받아쓰기만(마이크 안 엶) · 점수 · 따라 읽기 칠", `마이크 ${gum - g1}번 · 「${b.msg.slice(0, 40)}」 · 칠 ${paced}`);
    ok(!$(".panel .srboth, .panel [data-act=srboth]"), "ⓑ 학습자 화면에 「다시 같이 확인하기」 단추 없음(진단 화면에만)");
    $(".panel [data-act=close]")?.click(); await W(500);
    // ⓒ 카드(설명 「이제 말해 보세요」)
    localStorage.removeItem("malmun.srdev"); window.__trackOK = true; window.__srStarts = [];
    const li = [...document.querySelectorAll(".line")].findIndex(l => l.querySelector("[data-act=explain]")); document.querySelectorAll(".line")[li].querySelector("[data-act=explain]").click(); await W(1600);
    const rb = $(".panel .sayb [data-x=rec]"); if (rb) { window.__heard = $(".panel .saybig")?.textContent || window.__heard; rb.click(); talk(); for (let k = 0; k < 120 && rb.classList.contains("on"); k++) await W(100); for (let k = 0; k < 300 && !/\d+%|फेरि एक पटक|한 번 더|once more/.test($(".panel .sayb .smsg").textContent); k++) await W(100); await W(500);
      const m = $(".panel .sayb .smsg").textContent; ok(/\d+%/.test(m) && localStorage.getItem("malmun.srdev") === "seq-ok" && window.__srStarts.includes("녹음소리트랙") && !window.__srStarts.includes("동시"), "ⓒ 카드도 녹음 먼저 → 그 소리로 받아쓰기 = 점수", `「${m.slice(0, 40)}」 · ${window.__srStarts.join("/")}`); }
    else ok(false, "ⓒ 카드 🎤 단추 없음");
    $(".panel [data-x=close], .panel [data-act=close]")?.click(); await W(400);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR; MediaRecorder.prototype.start = keep.mrs; setUA(false);
  try { localStorage.removeItem("malmun.srdev"); sessionStorage.removeItem("malmun.srmode"); } catch {} window.__noSeq = true;
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 녹음 먼저 → 받아쓰기 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
