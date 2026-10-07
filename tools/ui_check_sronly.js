// 받아쓰기만 자동 대체 점검(본부 10-07 안드로이드 「녹음과 받아쓰기를 같이 못 하는 기기」) — #/learn/L01-00-01 을 연 채로 · 가짜 안드로이드·마이크·인식 · 소리 아주 작게
// 가짜 인식 = 마이크(녹음)가 열려 있으면 audio-capture 오류로 끝 · 안 열려 있으면 들은 말을 줌
// ⓐ 안드로이드: 녹음+받아쓰기 → 말소리는 있는데 들은 말 0 → 받아쓰기만으로 바뀜(기억) · 안내 ⓑ 다음 말하기 = 마이크 안 엶 · 글자 점수 · 「글자 점수만」 · 내 목소리·비교 흐림 → 누르면 까닭
// ⓒ 카드도 받아쓰기만 · ⓓ PC(안드로이드 아님)는 같은 실패에도 안 바뀜
(async () => {
  window.__noRhythm = true;
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition };
  const setUA = android => { if (android) Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36" }); else delete navigator.userAgent; };
  try {
    try { localStorage.removeItem("malmun.srmode"); localStorage.removeItem("malmun.mic"); } catch {}
    const tracks = []; let gum = 0, mic = null;
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    navigator.mediaDevices.getUserMedia = async () => { gum++; const ctx = new AudioContext(), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(dst); o.start(); mic = { g }; tracks.push(dst.stream.getAudioTracks()[0]); return dst.stream; };
    const micLive = () => tracks.some(t => t.readyState === "live");
    // __srSilent = 앞으로 몇 번(인식 켜기)은 말없이 2.7초 만에 혼자 끝남(진짜 크롬처럼) · Infinity = 계속 말 없음
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { if (micLive()) { setTimeout(() => { this.onerror?.({ error: "audio-capture" }); this.onend?.(); }, 300); return; }
      if (window.__srSilent > 0) { window.__srSilent--; setTimeout(() => this.onend?.(), 2700); return; }
      setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__heard }]] }), 400); setTimeout(() => this.onend?.(), 1500); } stop() {} };
    const talk = async () => { if (!mic) return; mic.g.gain.value = 0.3; await W(1500); mic.g.gain.value = 0; };
    // ⓐ
    setUA(true);
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    const p = $(".panel"); window.__heard = p.__sp._cur().say;
    const once = async () => { $(".panel [data-act=rec]").click(); await W(500); talk(); for (let k = 0; k < 100 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 80 && !/%/.test($(".panel .msg").textContent); k++) await W(100); await W(300); return $(".panel .msg").textContent; };
    const m0 = await once(), one = localStorage.getItem("malmun.srmode") !== "only";
    const m1 = await once(), btn = $(".panel [data-act=srboth]");
    ok(one && localStorage.getItem("malmun.srmode") === "only" && /0%/.test(m1) && /बोली पहिचान|recognition|받아쓰기/i.test(m1) && !!btn, "ⓐ 안드로이드: 말소리 있는데 들은 말 0 — 1번은 그대로 · 연속 2번이면 받아쓰기만으로(기억) · 안내 + 「다시 같이 시험」 단추", `1번 뒤 그대로 ${one} · 「${m1}」 · 단추 ${!!btn}`);
    btn?.click(); await W(200); ok(localStorage.getItem("malmun.srmode") !== "only", "ⓐ 「다시 같이 시험」 누르면 받아쓰기만 꺼짐"); localStorage.setItem("malmun.srmode", "only");
    // ⓑ
    const g0 = gum; $(".panel [data-act=rec]").click(); for (let k = 0; k < 80 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 80 && !/%/.test($(".panel .msg").textContent); k++) await W(100); await W(300);
    const m2 = $(".panel .msg").textContent, mb = $(".panel [data-act=mine]");
    const dim = mb.classList.contains("dim") && $(".panel [data-act=both]").classList.contains("dim");
    mb.click(); await W(200); const m3 = $(".panel .msg").textContent;
    ok(gum === g0 && /^\d+%/.test(m2) && /글자 점수만|अक्षर अंक मात्र|letter score only/.test(m2) && dim && /리듬|लय|rhythm/i.test(m3), "ⓑ 받아쓰기만: 마이크 안 엶 · 글자 점수 · 「글자 점수만」 · 내 목소리·비교 흐림 → 누르면 까닭", `마이크 ${gum - g0}번 · 「${m2}」 · 흐림 ${dim} · 「${m3}」`);
    // ⓔ 받아쓰기만에서도 끝 규칙 같게 — 🎤 뒤 말 없음(인식이 혼자 끝나도 다시 켜며 6초) → 「목소리가 안 들렸어요」 · 3초 머뭇(인식이 한 번 끝남) 뒤 말 → 점수
    { window.__srSilent = Infinity; const t0 = performance.now(); $(".panel [data-act=rec]").click(); await W(300); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 40 && !/%/.test($(".panel .msg").textContent); k++) await W(100);
      const sec = (performance.now() - t0) / 1000, mn = $(".panel .msg").textContent; window.__srSilent = 1;
      $(".panel [data-act=rec]").click(); await W(300); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 40 && !/%/.test($(".panel .msg").textContent); k++) await W(100); await W(300);
      const mh = $(".panel .msg").textContent; window.__srSilent = 0;
      ok(sec > 5.5 && /^0%/.test(mn) && /^\d+%/.test(mh) && !/^0%/.test(mh), "ⓔ 받아쓰기만: 말 없음 → 6초 뒤 「안 들렸어요」 · 3초 머뭇 뒤 말 → 점수", `말 없음 ${sec.toFixed(1)}초 「${mn}」 · 머뭇 뒤 「${mh}」`); }
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(600);
    // ⓒ 카드
    document.querySelectorAll(".line")[9].querySelector("[data-act=explain]").click(); await W(1500); document.querySelector("video")?.pause();
    const cb = $(".panel .sayb [data-x=rec]");
    if (!cb) ok(false, "ⓒ 카드 말해 보기 단추 없음");
    else { window.__heard = $(".panel .sayb .saybig")?.textContent || ""; const g1 = gum; cb.click(); await W(300); for (let k = 0; k < 80 && cb.classList.contains("on"); k++) await W(100); for (let k = 0; k < 80 && !/%/.test($(".panel .sayb .smsg").textContent); k++) await W(100); await W(300);
      const cm = $(".panel .sayb .smsg").textContent, mine = $(".panel .sayb [data-x=mine]");
      ok(gum === g1 && /^\d+%/.test(cm) && /글자 점수만|अक्षर अंक मात्र|letter score only/.test(cm) && mine.classList.contains("dim"), "ⓒ 카드도 받아쓰기만 · 글자 점수 · 내 목소리 흐림", `마이크 ${gum - g1}번 · 「${cm}」`); }
    document.querySelectorAll(".line")[9].querySelector("[data-act=explain]").click(); await W(600);
    // ⓓ PC
    localStorage.removeItem("malmun.srmode"); setUA(false);
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    $(".panel [data-act=rec]").click(); await W(500); talk(); for (let k = 0; k < 100 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 80 && !/%/.test($(".panel .msg").textContent); k++) await W(100); await W(300);
    ok(localStorage.getItem("malmun.srmode") !== "only", "ⓓ PC(안드로이드 아님)는 같은 실패에도 받아쓰기만으로 안 바뀜", $(".panel .msg").textContent);
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(600);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  setUA(false); try { localStorage.removeItem("malmun.srmode"); } catch {}
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR;
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 받아쓰기만 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
