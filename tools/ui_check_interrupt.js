// 끼어들기 점검(본부 10-08 — 「무언가 도는 중에 다른 걸 누름」 버그 3개) — #/learn/L01-00-01 을 연 채로 크기마다 · 소리 아주 작게
// 도는 것(자동 완성 자판·손글씨 · 획순 칠 · 이 부분 듣기 · 견본 1×·느리게 · 비교 차례 재생 · 설명 읽기 · 영상) 도중에 누를 것(모드 · 위 글자 · 토막 ▶ · ✕ · 다른 창 · 같은 단추 · 자판 · 다른 줄 카드 · 아래 막대)
// 확인: ① 소리는 늘 하나 이하 ② 「자동」·「재생 중」 표시 = 실제 상태(⏹ 남으면 ✗) ③ 저 혼자 진행 0(누른 뒤 5초 동안 글자·토막 번호 그대로 — 자동이 이어지기로 정해진 경우 빼고) ④ 오류 0
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  // 소리 세기 — <audio>/<video> 재생 중 + sfx(Web Audio) 시작−끝
  const els = new Set(), op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { els.add(this); try { this.volume = Math.min(this.volume, 0.0001); } catch {} return op.call(this); };
  const log = (window.__sfxLog = []), sfxLive = () => { const n = {}; for (const e of log) { n[e.name] = (n[e.name] || 0) + (e.ev === "시작" ? 1 : -1); } return Object.values(n).reduce((a, v) => a + Math.max(0, v), 0); };
  const sounds = () => [...els].filter(e => !e.paused && !e.ended && e.isConnected !== false && e.currentSrc).length + sfxLive();
  const errs = []; const onErr = e => errs.push(String(e.message || e.reason?.message || e.reason)); addEventListener("error", onErr); addEventListener("unhandledrejection", onErr);
  const peak = async ms => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { m = Math.max(m, sounds()); await W(60); } return m; };
  const L = () => document.querySelectorAll(".line"), wr = () => $(".panel .write")?.parentElement?.__wr;
  const pos = () => { const s = wr()?.st(); return s ? `${s.s}.${s.w}.${s.c}.${s.k}` : "-"; };
  const openP = async (act, li = 0) => { L()[li].querySelector(`[data-act=${act}]`).click(); await W(1400); document.querySelector("video")?.pause(); };
  const closeP = async () => { $(".panel [data-act=close], .panel [data-x=close]")?.click(); await W(500); };
  const autoBtn = () => $(".panel [data-act=auto]");
  const stillFor = async ms => { const a = pos(); await W(ms); return [a, pos()]; };
  try {
    // ── 쓰기 ──
    for (const [from, to] of [["kb", "hand"], ["hand", "kb"]]) {
      localStorage.setItem("malmun.wmode", from); await openP("write"); autoBtn().click(); await W(from === "kb" ? 900 : 1300);
      const was = wr()?.st().auto; $(`.panel [data-mode=${to}]`).click(); await W(300);
      const st0 = wr()?.st(), btn = autoBtn()?.textContent || "", mx = await peak(800), [a, b] = await stillFor(5000);
      ok(was && !st0.auto && !/⏹|■/.test(btn) && mx <= 1 && a === b, `쓰기 자동(${from}) 중 → ${to} 모드로 바꿈 = 자동 멈춤 · 단추 글 원래대로 · 저 혼자 안 씀 · 소리 하나 이하`, `자동 ${was}→${st0?.auto} · 단추 「${btn}」 · 소리 최대 ${mx} · 자리 ${a}→${b}`);
      await closeP();
    }
    localStorage.setItem("malmun.wmode", "kb");
    { await openP("write"); autoBtn().click(); await W(900); $(".panel [data-seg='1']")?.click(); await W(300); const s1 = wr()?.st(), mx = await peak(800), [a, b] = await stillFor(5000);
      ok(!s1.auto && !/⏹|■/.test(autoBtn()?.textContent || "") && mx <= 1 && a === b, "쓰기 자동 중 → 토막 ▶ = 자동 멈춤 · 저 혼자 안 씀", `자리 ${a}→${b} · 소리 ${mx}`); await closeP(); }
    { await openP("write"); autoBtn().click(); await W(900); await closeP(); const mx = await peak(1500);
      ok(!$(".panel .write") && mx === 0, "쓰기 자동 중 → ✕ 닫기 = 소리 0 · 쓰기 창 없음", `소리 ${mx}`); }
    { await openP("write"); autoBtn().click(); await W(900); await openP("speak", 1); const mx = await peak(1500);
      ok(!$(".panel .write") && mx === 0, "쓰기 자동 중 → 다른 줄 말하기 열기 = 자동 소리 없음", `소리 ${mx}`); await closeP(); }
    { await openP("write"); autoBtn().click(); await W(900); autoBtn().click(); await W(300); const mx = await peak(800), [a, b] = await stillFor(4000);
      ok(!wr()?.st().auto && mx <= 1 && a === b, "쓰기 자동 중 → 같은 단추 다시 = 멈춤 · 저 혼자 안 씀", `자리 ${a}→${b}`);
      const k = [...document.querySelectorAll(".panel [data-j]")][0]; const n0 = log.length; k?.click(); await W(900); const heard = log.slice(n0).some(e => e.ev === "시작");
      ok(heard, "멈춘 뒤 자판 누름 = 소리 남(정상)", `소리 기록 ${log.length - n0}`); await closeP(); }
    { localStorage.setItem("malmun.wmode", "hand"); await openP("write"); $(".panel [data-act=horder]")?.click(); await W(500); $(".panel [data-mode=kb]").click(); await W(300);
      const mx = await peak(800), [a, b] = await stillFor(3000); ok(mx <= 1 && a === b && !!$(".panel .kb"), "획순 칠 중 → 자판 모드 = 칠 멈춤 · 자판 화면 · 저 혼자 안 씀", `자리 ${a}→${b}`); await closeP(); }
    { localStorage.setItem("malmun.wmode", "kb"); await openP("write"); $(".panel [data-act=sent]")?.click(); await W(500); const k = [...document.querySelectorAll(".panel [data-j]")][0]; k?.click(); await W(200);
      const mx = await peak(1500); ok(mx <= 1, "이 부분 듣기 중 → 자판 누름 = 소리 하나 이하", `소리 최대 ${mx}`); await closeP(); }
    { await openP("write"); const cs = [...document.querySelectorAll(".panel .sent .c")]; autoBtn().click(); await W(900); cs[cs.length - 1]?.click(); await W(400);
      const nows = document.querySelectorAll(".panel .sent .c.now").length, mx = await peak(1200); ok(nows === 1 && mx <= 1, "쓰기 자동 중 → 위 글자 줄 다른 글자 = 지금 글자 하나 · 소리 하나 이하", `지금 글자 ${nows} · 소리 ${mx}`);
      autoBtn().click(); await W(300); await closeP(); }
    // ── 글자 칸 소리 단추(본부 10-08) — 다시 누름 · 자판 · 자동 ──
    { await openP("write"); const bx = () => $(".panel .stage .box"); const n0 = log.length; bx().click(); await W(150); const heard = log.slice(n0).some(e => e.ev === "시작" && /chars_f/.test(e.name)); bx().click(); const m1 = await peak(900);
      [...document.querySelectorAll(".panel [data-j]")][0].click(); bx().click(); await W(50); [...document.querySelectorAll(".panel [data-j]")][1].click(); const m2 = await peak(900);
      bx().click(); await W(100); autoBtn().click(); const m3 = await peak(1500), au = wr()?.st().auto; autoBtn().click(); await W(300);
      ok(heard && m1 <= 1 && m2 <= 1 && m3 <= 1 && au, "글자 칸 = 글자 소리 · 다시 누름·자판·자동 끼어들어도 소리 하나 이하", `소리 ${heard} · ${m1}/${m2}/${m3} · 자동 ${au}`); await closeP(); }
    // ── 말하기 ──
    { await openP("speak"); const m = $(".panel [data-act=model]"); m.click(); await W(400); await closeP(); const mx = await peak(1200); ok(mx === 0, "말하기 견본 중 → ✕ = 소리 0", `소리 ${mx}`); }
    { localStorage.setItem("malmun.rate.m", "0.75"); await openP("speak"); $(".panel [data-act=model]").click(); await W(400); $(".panel [data-act=model]").click(); await W(400);
      const mx = await peak(1000), on = $(".panel [data-act=model]")?.classList.contains("playing"); ok(mx === 0 && !on, "말하기 느린 견본 중 → 같은 단추 다시 = 멈춤 · 칠 꺼짐", `소리 ${mx} · 칠 ${on}`); localStorage.removeItem("malmun.rate.m"); }
    { $(".panel [data-act=model]").click(); await W(400); await openP("speak", 2); const mx = await peak(1200); ok(mx <= 1, "말하기 견본 중 → 다른 줄 말하기 = 소리 하나 이하", `소리 ${mx}`); await closeP(); }
    { await openP("speak"); const p = $(".panel"), S = p.__sp._state; S.blob = await (await fetch(p.__sp._cur().src)).blob(); p.__sp._paint(); await W(200); p.querySelector("[data-act=both]").click(); await W(2000);
      p.querySelector(".cmp .crow.m [data-play]")?.click(); await W(300); p.querySelector("[data-act=model]").click(); const mx = await peak(1500);
      ok(mx <= 1, "비교 줄 재생 중 → 아래 견본 단추 = 소리 하나 이하(두 겹 없음)", `소리 최대 ${mx}`); await closeP(); }
    // ── 설명 · 영상 ──
    { await openP("explain"); $(".panel .v9bar [data-x=ex]")?.click(); await W(600); await openP("write"); const mx = await peak(1500); ok(mx === 0, "설명 읽는 중 → 쓰기 창 열기 = 설명 소리 멈춤", `소리 ${mx}`); await closeP(); }
    { await openP("explain"); $(".panel .v9bar [data-x=ex]")?.click(); await W(600); $(".ctrl [data-act=next]")?.click(); await W(300); const mx = await peak(1500); ok(mx <= 1, "설명 읽는 중 → 아래 ▶| 다음 줄 = 소리 하나 이하", `소리 ${mx}`); await closeP(); }
    { const v = document.querySelector("video"); v.muted = true; $(".ctrl [data-act=play]")?.click(); await W(800); await openP("explain", 3); const vp = v.paused; $(".panel .v9bar [data-x=ex]")?.click(); await W(500); const mx = await peak(1200);
      ok(vp && mx <= 1, "영상 재생 중 → 다른 줄 설명 = 영상 멈춤 · 소리 하나 이하", `영상 멈춤 ${vp} · 소리 ${mx}`); await closeP(); v.muted = false; }
    // ── 「ने ⇄ 한」 앱 글 토글(본부 10-08) — 견본 재생·녹음 중에 누름 = 소리 0 · 마이크 꺼짐 · 다시 누르면 원래 글 ──
    if ($("[data-act=uiko]")) {
      const md = navigator.mediaDevices, kg = md.getUserMedia, ke = md.enumerateDevices, kS = window.SpeechRecognition, kw = window.webkitSpeechRecognition; // 가짜 마이크·받아쓰기(진짜 마이크 안 씀)
      md.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "시험 마이크" }];
      md.getUserMedia = async () => { const c = (await (window.__micCtxP ||= import(`/js/wake.js?v=${document.documentElement.dataset.v}`).then(m => m.audioCtx()))), d = c.createMediaStreamDestination(), o = c.createOscillator(); o.connect(d); o.start(); return (window.__offOnStop ||= (s, o) => { for (const t of s.getAudioTracks()) { const f = t.stop.bind(t); t.stop = () => { f(); try { o.stop(); o.disconnect(); } catch {} }; } return s; })(d.stream, o); };
      window.SpeechRecognition = window.webkitSpeechRecognition = class { start() {} stop() { setTimeout(() => this.onend?.(), 50); } abort() { this.stop(); } };
      const lab0 = $(".line [data-act=speak]")?.textContent;
      { await openP("speak"); $(".panel [data-act=model]").click(); await W(400); $("[data-act=uiko]").click(); await W(1500); const mx = await peak(1000), lab1 = $(".line [data-act=speak]")?.textContent;
        ok(mx === 0 && !!$(".panel:not([hidden]) .speak") && lab1 !== lab0, "견본 재생 중 → ने⇄한 토글 = 소리 0 · 앱 글 바뀜 · 말하기 창은 그대로 다시 열림", `소리 ${mx} · 「${lab0}」→「${lab1}」`); }
      { await openP("speak"); $(".panel [data-act=rec]")?.click(); await W(700); $("[data-act=uiko]").click(); await W(1500); const mx = await peak(1000), mic = !!$(".panel .mic.on, .panel [data-act=rec].on"), lab2 = $(".line [data-act=speak]")?.textContent;
        ok(mx === 0 && !mic && lab2 === lab0, "녹음 중 → ने⇄한 토글 = 소리 0 · 녹음 멈춤 · 다시 누르면 원래 글", `소리 ${mx} · 녹음 ${mic} · 「${lab2}」`); }
      // 창이 열린 채 토글 = 같은 창·같은 자리로 다시 열림(본부 10-08 — 쓰기 창이 닫혀 하던 걸 잃던 것) · 자동 중이면 멈춘 뒤
      { localStorage.setItem("malmun.wmode", "kb"); await openP("write", 1); $(".panel [data-seg='1']")?.click(); await W(300); const c2 = [...document.querySelectorAll(".panel .sent .c")][1]; c2?.click(); await W(600); const a0 = pos();
        autoBtn().click(); await W(700); $("[data-act=uiko]").click(); await W(2200); const a1 = pos(), kind = !!$(".panel:not([hidden]) .write"), au = wr()?.st().auto, mx = await peak(800), [x, y] = await stillFor(3000);
        ok(kind && a1.split(".").slice(0, 3).join(".") === a0.split(".").slice(0, 3).join(".") && !au && mx <= 1 && x === y, "쓰기 창(토막 2·글자 2) 자동 중 → ने⇄한 토글 = 쓰기 창 그대로 · 같은 자리 · 자동 멈춤 · 저 혼자 안 씀", `창 ${kind} · ${a0}→${a1} · 자동 ${au} · 소리 ${mx} · ${x}→${y}`);
        $("[data-act=uiko]").click(); await W(2200); ok(!!$(".panel:not([hidden]) .write") && pos().split(".").slice(0, 3).join(".") === a0.split(".").slice(0, 3).join("."), "다시 토글 = 쓰기 창·자리 그대로", pos()); await closeP(); }
      { await openP("speak", 1); const sp0 = $(".panel")?.__sp?._state.i; $(".panel .segnav [data-seg='1']")?.click(); await W(500); const sp1 = $(".panel")?.__sp?._state.i; $("[data-act=uiko]").click(); await W(2200); const sp2 = $(".panel")?.__sp?._state.i;
        ok(!!$(".panel:not([hidden]) .speak") && sp2 === sp1, "말하기 창(다른 토막) → ने⇄한 토글 = 말하기 창·같은 토막", `${sp0}→${sp1}→${sp2}`); $("[data-act=uiko]").click(); await W(2200); await closeP(); }
      try { localStorage.removeItem("malmun.uiko"); } catch {}
      md.getUserMedia = kg; md.enumerateDevices = ke; window.SpeechRecognition = kS; window.webkitSpeechRecognition = kw;
    }
    ok(!errs.length, "끼어들기 중 오류 0", errs.slice(0, 3).join(" | "));
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  HTMLMediaElement.prototype.play = op; removeEventListener("error", onErr); removeEventListener("unhandledrejection", onErr);
  try { localStorage.removeItem("malmun.wmode"); localStorage.removeItem("malmun.rate.m"); } catch {}
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} ${innerWidth}x${innerHeight} 끼어들기 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
