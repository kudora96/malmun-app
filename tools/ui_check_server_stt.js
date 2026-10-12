// 서버 받아쓰기(2안) 점검(본부 10-11) — #/learn/L01-00-01 을 연 채로 · 가짜 안드로이드·마이크·받아쓰기 + 가짜 서버(window.fetch 를 그 주소만 가로챔 · window.__sttURL)
// 가짜 받아쓰기 = 녹음 소리 트랙으로는 못 들음(1번안 안 되는 기기) · 트랙 없이(받아쓰기만)는 늘 들음
// ⓐ 안드로이드 + 주소 = 처음부터 녹음 → 서버(1번안 안 씀 · 본부 10-11 변경) → 점수 · 녹음 그대로 · 내 목소리 · 기기 기억 server · 카드도 서버
// ⓑ 서버 429·500·20초·네트워크·빈 글 → 「한 번 더」 · 연속 2번이면 10분 동안 받아쓰기만(sessionStorage malmun.srvoff) · malmun.srdev 에 sronly 안 적음
// ⓒ 주소 없음 → 서버 한 번도 안 부름 · 옛 그대로(연속 2번 → sronly) · 주소 있으면 옛 sronly 기억이 있어도 서버부터 ⓓ 첫 사용 안내 한 번만 ⓔ 기다리는 중 닫기 = 끊김 · 늦은 점수·효과음 없음
(async () => {
  window.__noRhythm = true;
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; delete window.__noSeq;
  const URL0 = "https://stt.test.invalid";
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition, mrs: MediaRecorder.prototype.start, fetch: window.fetch };
  const setUA = android => { if (android) Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36" }); else delete navigator.userAgent; };
  const sfxLog = (window.__sfxLog = []);
  const calls = []; window.__srvMode = "ok";
  // 가짜 서버 — 모드: ok · 429 · 500 · timeout(답 없음 → 앱 20초) · net(네트워크 오류) · empty(빈 글) · slow(3초 뒤 ok)
  window.fetch = (u, o = {}) => {
    if (!String(u).startsWith(URL0)) return keep.fetch(u, o);
    if (/\/health$/.test(String(u))) return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } })); // 데우기(warmSTT)는 받아쓰기 요청이 아님 — 세지 않음
    const c = { url: String(u), method: o.method, type: o.headers?.["Content-Type"], dev: o.headers?.["X-Dev"], size: o.body?.size || 0, isBlob: o.body instanceof Blob, aborted: false, mode: window.__srvMode }; calls.push(c);
    return new Promise((res, rej) => {
      const sig = o.signal, ab = () => { c.aborted = true; rej(new DOMException("aborted", "AbortError")); }; if (sig?.aborted) return ab(); sig?.addEventListener("abort", ab, { once: true });
      const json = (st, b) => new Response(JSON.stringify(b), { status: st, headers: { "Content-Type": "application/json", "Server-Timing": "up;dur=210, ai;dur=1840, total;dur=2080" } }); // Worker 시간 머리 칸 흉내(본부 10-12)
      const m = c.mode, after = m === "slow" ? 3000 : 300;
      if (m === "timeout") return;
      setTimeout(() => { if (c.aborted) return; if (m === "net") return rej(new TypeError("Failed to fetch"));
        if (m === 429) return res(json(429, { error: "daily limit" })); if (m === 500) return res(json(500, { error: "ai failed" }));
        if (m === "empty") return res(json(200, { text: "", words: [] }));
        res(json(200, { text: " " + window.__heard + " ", words: [{ w: window.__heard, s: 0.2, e: 1.4 }] })); }, after);
    });
  };
  const notes = []; const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains("sttnote")) notes.push(n.textContent); }); mo.observe(document.body, { childList: true });
  const clean = () => { try { for (const k of ["malmun.srdev", "malmun.srdev.t", "malmun.lastrec", "malmun.sttnote"]) localStorage.removeItem(k); for (const k of ["malmun.srmode", "malmun.srfail", "malmun.srsrv", "malmun.srmiss", "malmun.srvfail", "malmun.srvoff"]) sessionStorage.removeItem(k); } catch {} };
  const RETRY = /फेरि एक पटक|한 번 더|once more/;
  try {
    clean();
    let gum = 0, mic = null, recOn = 0; const ctxP = import(`/js/wake.js?v=${document.documentElement.dataset.v}`).then(m => m.audioCtx());
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    navigator.mediaDevices.getUserMedia = async () => { gum++; const ctx = await ctxP, dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(dst); o.start(); mic = { g, tr: dst.stream.getAudioTracks()[0] }; const t = mic.tr, f = t.stop.bind(t); t.stop = () => { f(); try { o.stop(); o.disconnect(); } catch {} }; return dst.stream; };
    MediaRecorder.prototype.start = function (...a) { recOn++; this.addEventListener("stop", () => recOn--, { once: true }); return keep.mrs.apply(this, a); };
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start(tr) { const can = recOn > 0 ? false : !tr; window.__srStarts = (window.__srStarts || []).concat(tr ? (recOn ? "동시" : "녹음소리트랙") : "트랙없음");
        if (can) setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__heard }]] }), 400); this.tm = setTimeout(() => this.onend?.(), tr ? 2600 : 1500); }
      stop() { clearTimeout(this.tm); setTimeout(() => this.onend?.(), 50); } abort() { this.stop(); } };
    const talk = async (ms = 1500) => { await W(400); if (mic) { mic.g.gain.value = 0.3; await W(ms); mic.g.gain.value = 0; } };
    setUA(true); window.__sttURL = URL0;
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    const p = $(".panel"); window.__heard = p.__sp._cur().say;
    const once = async () => { const n0 = sfxLog.length; $(".panel [data-act=rec]").click(); talk(); for (let k = 0; k < 30 && !$(".panel [data-act=rec]").classList.contains("on"); k++) await W(50); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 300 && !(/\d+%/.test($(".panel .msg").textContent) || RETRY.test($(".panel .msg").textContent)); k++) await W(100); await W(400); return { msg: $(".panel .msg").textContent, fx: sfxLog.slice(n0).filter(e => e.ev === "시작" && /score_/.test(e.name)).map(e => e.name) }; };
    // ⓐ
    window.__srStarts = []; const g0 = gum; const a3 = await once(); /* 첫 녹음부터 서버 */ const c3 = calls[0] || {};
    ok(/\d+%/.test(a3.msg) && calls.length === 1 && c3.method === "POST" && c3.url === URL0 + "/stt" && c3.isBlob && c3.size > 0 && /^audio\//.test(c3.type || "") && /^[A-Za-z0-9-]{8,64}$/.test(c3.dev || "") && c3.dev === localStorage.getItem("malmun.devid") && !window.__srStarts.length && gum > g0,
      "ⓐ 첫 녹음부터 = 녹음(마이크 엶) → 서버 POST {주소}/stt(녹음 그대로 · Content-Type · X-Dev) → 점수 · 폰 받아쓰기 안 씀", `「${a3.msg.slice(0, 40)}」 · ${c3.type} ${c3.size}B · 받아쓰기 ${window.__srStarts.join("/") || "없음"}`);
    ok(localStorage.getItem("malmun.srdev") === "server" && +localStorage.getItem("malmun.srdev.t") > Date.now() - 60000, "ⓐ 서버 됨 = 기기 기억 server(7일 · 적은 때 있음)", `기억 ${localStorage.getItem("malmun.srdev")}`);
    ok(!!p.__sp._state.blob && !$(".panel [data-act=mine]").disabled && !$(".panel [data-act=mine]").classList.contains("dim") && !$(".panel [data-act=both]").disabled && !/글자 점수만|अक्षरको अंक मात्र|letter score only/.test(a3.msg) && a3.fx.length === 1, "ⓐ 녹음 그대로 · 내 목소리·비교 켜짐 · 「글자 점수만」 아님 · 점수 효과음 한 번", `blob ${p.__sp._state.blob?.size}B · 효과 ${a3.fx.join(",")}`);
    { $(".panel [data-act=mine]").click(); let pl = false; for (let k = 0; k < 30 && !pl; k++) { await W(100); pl = $(".panel [data-act=mine]").classList.contains("playing") || !!p.__sp._state.mine; } ok(pl, "ⓐ [내 목소리] 누르면 방금 녹음 재생"); await W(300); $(".panel [data-act=mine]").click(); await W(300); }
    try { const lr = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]").slice(-1)[0] || {}; ok(lr.mode === "녹음→서버" && /server/.test(lr.seq || ""), "ⓐ 진단 기록 = 녹음→서버", `${lr.mode} · ${String(lr.seq || "").slice(0, 60)}`); ok(/서버 [\d,]+ms = 받기 210 \+ AI 1,840 · 보낸 \d+KB/.test(lr.seq || ""), "ⓐ 진단 기록에 서버 걸린 시간(받기 + AI · Server-Timing · 본부 10-12)", String(lr.seq || "").match(/서버[^·]*·[^·]*/)?.[0] || String(lr.seq || "").slice(-80)); } catch (e) { ok(false, "ⓐ 진단 기록 읽기 " + e.message); }
    // ⓓ 안내 한 번만
    const a4 = await once();
    ok(notes.length === 1 && /저장|stored|सुरक्षित/.test(notes[0]) && /\d+%/.test(a4.msg) && calls.length === 2, "ⓓ 첫 서버 사용 때만 안내 한 번(다음 녹음엔 안 뜸)", `안내 ${notes.length}번 「${(notes[0] || "").slice(0, 40)}」`);
    $(".panel [data-act=close]")?.click(); await W(500);
    // ⓐ 카드도 서버(기기 기억 server)
    { const li = [...document.querySelectorAll(".line")].findIndex(l => l.querySelector("[data-act=explain]")); document.querySelectorAll(".line")[li].querySelector("[data-act=explain]").click(); await W(1600); document.querySelector("video")?.pause();
      const rb = $(".panel .sayb [data-x=rec]"); const n0 = calls.length;
      if (rb) { window.__heard = $(".panel .saybig")?.textContent || window.__heard; window.__srStarts = []; rb.click(); talk(); for (let k = 0; k < 30 && !rb.classList.contains("on"); k++) await W(50); for (let k = 0; k < 120 && rb.classList.contains("on"); k++) await W(100); for (let k = 0; k < 300 && !/\d+%|फेरि एक पटक|한 번 더|once more/.test($(".panel .sayb .smsg").textContent); k++) await W(100); await W(500);
        const m = $(".panel .sayb .smsg").textContent, mine = $(".panel .sayb [data-x=mine]");
        ok(/\d+%/.test(m) && calls.length === n0 + 1 && !window.__srStarts.length && !mine.disabled && !mine.classList.contains("dim"), "ⓐ 카드도 서버 → 점수 · 내 목소리 켜짐", `「${m.slice(0, 40)}」 · 서버 ${calls.length - n0}번`); }
      else ok(false, "ⓐ 카드 🎤 단추 없음");
      $(".panel [data-x=close], .panel [data-act=close]")?.click(); await W(400); }
    // ⓑ 서버 실패(본부 10-12 고침) — 첫 실패 = 「한 번 더」 + 다음에도 서버 · 연속 2번 = 10분 동안 받아쓰기만(malmun.srvoff) · malmun.srdev 안 적음 · 10분 지나면 다시 서버
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause(); window.__heard = $(".panel").__sp._cur().say;
    const off = () => +(sessionStorage.getItem("malmun.srvoff") || 0) > 0;
    for (const m of [429, 500, "net", "empty", "timeout"]) {
      clean(); localStorage.setItem("malmun.sttnote", "2"); window.__srvMode = m; const n0 = calls.length, t0 = performance.now();
      const b = await once(); const sec = (performance.now() - t0) / 1000;
      ok(calls.length === n0 + 1 && RETRY.test(b.msg) && !/\d+%/.test(b.msg) && !b.fx.length && !off() && sessionStorage.getItem("malmun.srvfail") === "1" && !localStorage.getItem("malmun.srdev") && (m !== "timeout" || (sec > 19 && sec < 28)),
        `ⓑ 서버 ${m} 첫 실패 → 「한 번 더」 · 효과음 없음 · 아직 받아쓰기만 아님(다음도 서버) · malmun.srdev 안 적음`, `「${b.msg.slice(0, 30)}」 · srvfail ${sessionStorage.getItem("malmun.srvfail")} · ${sec.toFixed(1)}초`);
      if (m === "timeout") continue; // 20초 × 2 는 길어서 한 번만
      const b1 = await once();
      ok(calls.length === n0 + 2 && RETRY.test(b1.msg) && off() && !localStorage.getItem("malmun.srdev"), `ⓑ 서버 ${m} 연속 두 번 → 10분 동안 받아쓰기만(srvoff)`, `서버 ${calls.length - n0}번 · srvoff ${off()}`);
      if (m === 429) { window.__srStarts = []; const g1 = gum, n1 = calls.length; const b2 = await once();
        ok(gum === g1 && calls.length === n1 && /\d+%/.test(b2.msg) && window.__srStarts.every(x => x === "트랙없음"), "ⓑ 그다음 = 받아쓰기만(마이크 안 엶 · 서버 안 부름) · 점수", `「${b2.msg.slice(0, 40)}」`);
        sessionStorage.setItem("malmun.srvoff", String(Date.now() - 11 * 60000)); window.__srvMode = "ok"; const n2 = calls.length; const b3 = await once();
        ok(calls.length === n2 + 1 && /\d+%/.test(b3.msg), "ⓑ 10분 지나면 다시 서버(같은 탭에 계속 받아쓰기만으로 남지 않음)", `서버 ${calls.length - n2}번 · 「${b3.msg.slice(0, 30)}」`); }
    }
    // 한 번 실패 뒤 성공 = 실패 수 지움
    { clean(); localStorage.setItem("malmun.sttnote", "2"); window.__srvMode = 500; await once(); window.__srvMode = "ok"; const b = await once(); ok(/\d+%/.test(b.msg) && !sessionStorage.getItem("malmun.srvfail") && !off(), "ⓑ 실패 한 번 → 다음 성공 = 실패 수 지움 · 서버 그대로", `srvfail ${sessionStorage.getItem("malmun.srvfail")}`); }
    // 다음 방문 흉내(sessionStorage 비움) · 기기 기억 server 면 서버 다시 시도
    clean(); setDevSRraw("server"); window.__srvMode = "ok"; { const n0 = calls.length; const b = await once(); ok(calls.length === n0 + 1 && /\d+%/.test(b.msg), "ⓑ 다음 방문(기억 server) = 서버 다시 시도"); }
    // ⓒ 주소 없음
    clean(); window.__sttURL = "off"; setDevSRraw("server");
    { const n0 = calls.length; window.__srStarts = []; const c1 = await once(), c2 = await once();
      ok(calls.length === n0 && window.__srStarts.includes("녹음소리트랙") && RETRY.test(c1.msg) && RETRY.test(c2.msg) && localStorage.getItem("malmun.srdev") === "sronly", "ⓒ 주소 없음 = 서버 한 번도 안 부름 · 옛 그대로(1번안 → 연속 2번 → sronly)", `서버 ${calls.length - n0}번 · 기억 ${localStorage.getItem("malmun.srdev")}`);
      const sm = await import(`/js/sttserver.js?v=${document.documentElement.dataset.v}`); ok(!sm.sttReady() && /^https:\/\/[^/]+$/.test(sm.STT_URL), "ⓒ 점검 중(__sttURL=off) = 꺼짐 · 기본 STT_URL = 배포 주소(https · 끝 / 없음)", sm.STT_URL); }
    clean(); window.__sttURL = URL0; localStorage.setItem("malmun.sttnote", "2"); setDevSRraw("sronly"); window.__srvMode = "ok";
    { const n0 = calls.length, g1 = gum; const b = await once(); ok(calls.length === n0 + 1 && gum > g1 && /\d+%/.test(b.msg) && localStorage.getItem("malmun.srdev") === "server", "ⓒ 주소 있음 + 옛 sronly 기억 = 서버부터(녹음 · 점수 · 기억 server)", `「${b.msg.slice(0, 30)}」`); }
    // ⓔ 기다리는 중 닫기
    clean(); window.__sttURL = URL0; localStorage.setItem("malmun.sttnote", "2"); setDevSRraw("server"); window.__srvMode = "slow";
    { const n0 = calls.length, f0 = sfxLog.length; $(".panel [data-act=rec]").click(); talk(); for (let k = 0; k < 30 && !$(".panel [data-act=rec]").classList.contains("on"); k++) await W(50); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100);
      for (let k = 0; k < 80 && calls.length === n0; k++) await W(100); await W(300); const during = $(".panel .msg").textContent, recDis = $(".panel [data-act=rec]").disabled || $(".panel [data-act=rec]").getAttribute("aria-disabled") === "true";
      $(".panel [data-act=close]")?.click(); await W(3800);
      const c = calls[calls.length - 1] || {}, fx = sfxLog.slice(f0).filter(e => e.ev === "시작" && /score_/.test(e.name));
      ok(calls.length === n0 + 1 && c.aborted && !fx.length && !$(".panel .msg") && localStorage.getItem("malmun.srdev") === "server" && sessionStorage.getItem("malmun.srmode") !== "only", "ⓔ 서버 기다리는 중 창 닫기 = 요청 끊김 · 늦은 점수·효과음 없음 · 실패로 안 셈", `기다리는 중 「${during.slice(0, 20)}」 🎤 막힘 ${recDis} · 끊김 ${c.aborted} · 효과 ${fx.length}`);
      document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
      ok(!/\d+%/.test($(".panel .msg").textContent), "ⓔ 다시 열면 옛 점수 없음", `「${$(".panel .msg").textContent.slice(0, 30)}」`);
      // 카드: 기다리는 중 닫기
      $(".panel [data-act=close]")?.click(); await W(500);
      const li = [...document.querySelectorAll(".line")].findIndex(l => l.querySelector("[data-act=explain]")); document.querySelectorAll(".line")[li].querySelector("[data-act=explain]").click(); await W(1600); document.querySelector("video")?.pause();
      const rb = $(".panel .sayb [data-x=rec]"); if (rb) { const n1 = calls.length, f1 = sfxLog.length; window.__heard = $(".panel .saybig")?.textContent || window.__heard; rb.click(); talk(); for (let k = 0; k < 30 && !rb.classList.contains("on"); k++) await W(50); for (let k = 0; k < 120 && rb.classList.contains("on"); k++) await W(100); for (let k = 0; k < 80 && calls.length === n1; k++) await W(100); await W(300);
        $(".panel [data-x=close], .panel [data-act=close]")?.click(); await W(3800); const c2 = calls[calls.length - 1] || {}, fx2 = sfxLog.slice(f1).filter(e => e.ev === "시작" && /score_/.test(e.name));
        ok(calls.length === n1 + 1 && c2.aborted && !fx2.length, "ⓔ 카드도 기다리는 중 닫기 = 끊김 · 효과음 없음", `끊김 ${c2.aborted} · 효과 ${fx2.length}`); }
      else ok(false, "ⓔ 카드 🎤 단추 없음"); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  function setDevSRraw(v) { localStorage.setItem("malmun.srdev", v); localStorage.setItem("malmun.srdev.t", String(Date.now())); }
  mo.disconnect(); window.fetch = keep.fetch; window.__sttURL = "off"; delete window.__srvMode;
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR; MediaRecorder.prototype.start = keep.mrs; setUA(false);
  clean(); window.__noSeq = true;
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 서버 받아쓰기 ${res.length - nb}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
