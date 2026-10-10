// 막 누르기 점검(본부 10-08 투덜이 「여러 각도로 별 이상한 짓까지」) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게 · 마이크·받아쓰기는 가짜
// 학습 화면에서 보이는 누를 수 있는 것을 무작위로(씨앗 window.__monkeySeed · 길이 window.__monkeyMs 기본 90초 · 50~400ms 간격) — 연타·열자마자 닫기·녹음 중 아무 데나·손글씨 긋기 포함
// 감시(100ms 마다): 오류 0 · 소리 2개 이상이 0.3초 넘게 0 · 「자동」 단추 글 = 실제 자동 · 20번마다 5.5초 쉬며 저절로 바뀜 0(자동·재생 중 빼고) · 가로 넘침 0
// 문제 = 직전 누른 20개(요소 경로)를 sessionStorage "__monkey" 에 · window.__monkeyReplay = 그 목록을 주면 같은 순서로 다시 누름
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s);
  const seed0 = window.__monkeySeed ?? 1, dur = window.__monkeyMs ?? 90000, replay = window.__monkeyReplay || null;
  let sd = seed0 >>> 0; const rnd = () => { sd = (sd + 0x6D2B79F5) >>> 0; let t = sd; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__sfxVolume = 0.0001; window.__noSrSwitch = true;
  // 가짜 마이크·받아쓰기
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition, play: HTMLMediaElement.prototype.play, cerr: console.error };
  navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
  navigator.mediaDevices.getUserMedia = async () => { const ctx = (await (window.__micCtxP ||= import(`/js/wake.js?v=${document.documentElement.dataset.v}`).then(m => m.audioCtx()))), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0.2; o.connect(g); g.connect(dst); o.start(); setTimeout(() => (g.gain.value = 0), 1200); return (window.__offOnStop ||= (s, o) => { for (const t of s.getAudioTracks()) { const f = t.stop.bind(t); t.stop = () => { f(); try { o.stop(); o.disconnect(); } catch {} }; } return s; })(dst.stream, o); };
  window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: $(".panel .task .say, .panel .saybig")?.textContent || "어서 오세요" }]] }), 500); setTimeout(() => this.onend?.(), 1600); } stop() {} };
  // 소리 세기
  const els = new Set(); HTMLMediaElement.prototype.play = function () { els.add(this); try { this.volume = Math.min(this.volume, 0.0001); } catch {} return keep.play.call(this); };
  const log = (window.__sfxLog = []), sfxLive = () => { const n = {}; for (const e of log) n[e.name] = (n[e.name] || 0) + (e.ev === "시작" ? 1 : -1); return Object.values(n).reduce((a, v) => a + Math.max(0, v), 0); };
  const sounds = () => [...els].filter(e => !e.paused && !e.ended && e.currentSrc && !(e.tagName === "VIDEO" && e.muted)).length + sfxLive();
  const errs = []; const onErr = e => errs.push(String(e.message || e.reason?.message || e.reason)); addEventListener("error", onErr); addEventListener("unhandledrejection", onErr);
  console.error = (...a) => { if (!/Failed to load resource|404/.test(String(a[0]))) errs.push("console " + String(a[0]).slice(0, 120)); return keep.cerr.apply(console, a); };
  // 요소 경로(다시 누르기용)
  const pathOf = el => { const p = []; while (el && el !== document.body) { const par = el.parentElement; if (!par) break; p.unshift(`${el.tagName.toLowerCase()}:${[...par.children].indexOf(el)}`); el = par; } return p.join(">"); };
  const byPath = path => { let el = document.body; for (const seg of path.split(">")) { const [, i] = seg.split(":"); el = el?.children[+i]; if (!el) return null; } return el; };
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden]"); };
  const SEL = "button:not([disabled]), [data-j], .sent .c, .line, .cwave, .hink, .saybig, .v9body .sn, .v9body .kw";
  const BAD = "a, [data-raw], [data-x=savedl], [data-x=savedel], [data-act=savedl], [data-act=savedel], .langchip, [data-act=lang], .newver, [data-t]"; // 내려받기·지우기·언어·새 판 단추·진단은 뺌
  const acts = [], probs = []; let lastAct = performance.now();
  const doAct = async el => {
    lastAct = performance.now();
    if (el.classList.contains("hink")) { const r = el.getBoundingClientRect(), ev = (t, fx, fy) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: "touch", clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, buttons: 1 }));
      const x0 = rnd(), y0 = rnd(); ev("pointerdown", x0, y0); for (let k = 1; k <= 6; k++) ev("pointermove", Math.min(1, x0 + k * 0.05), y0); ev("pointerup", Math.min(1, x0 + 0.3), y0); return; }
    if (el.classList.contains("cwave")) { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width * rnd(), clientY: r.top + 5 })); return; }
    el.click();
  };
  const wrSt = () => $(".panel .write")?.parentElement?.__wr?.st?.();
  const snap = () => { const s = wrSt(); return JSON.stringify({ w: s ? `${s.s}.${s.w}.${s.c}.${s.k}` : null, seg: $(".panel .segnav span")?.textContent || null, hash: location.hash }); };
  const busy = () => { const s = wrSt(); return !!(s?.auto || s?.sent || s?.busy) || sounds() > 0 || !!$(".panel .mic.on, .panel [data-act=rec].on, .panel [data-x=rec].on") || !document.querySelector("video")?.paused; };
  const report = (kind, x) => { if (probs.length < 12) probs.push({ kind, x, last: acts.slice(-20) }); try { sessionStorage.setItem("__monkey", JSON.stringify({ seed: seed0, probs })); } catch {} };
  // 감시
  let over2 = 0; const mon = setInterval(() => {
    const n = sounds(); over2 = n >= 2 ? over2 + 100 : 0; if (over2 === 400) report("소리 2개 이상 0.3초+", n);
    const s = wrSt(), b = $(".panel [data-act=auto]"); if (s && b && /⏹|■/.test(b.textContent) !== !!(s.auto || s.resumeAuto)) report("자동 표시 ≠ 실제", `${b.textContent} / ${s.auto}`);
    if (document.documentElement.scrollWidth > innerWidth + 1) report("가로 넘침", document.documentElement.scrollWidth);
  }, 100);
  try {
    if (!location.hash.startsWith("#/learn/")) { location.hash = "#/learn/L01-00-01"; await W(2500); }
    const t0 = performance.now(); let k = 0;
    const steps = replay || null;
    while (steps ? k < steps.length : performance.now() - t0 < dur) {
      if (!location.hash.startsWith("#/learn/")) { location.hash = "#/learn/L01-00-01"; await W(2000); } // 앱 밖·목록으로 나가면 돌아옴
      let el, path;
      if (steps) { path = steps[k]; el = byPath(path); }
      else { const cand = [...document.querySelectorAll(SEL)].filter(e => !e.closest(BAD) && !e.matches(BAD) && vis(e)); if (!cand.length) { await W(200); continue; } el = cand[Math.floor(rnd() * cand.length)]; path = pathOf(el); }
      if (el) { acts.push(path + " | " + (el.textContent || el.className).trim().slice(0, 24)); try { await doAct(el); } catch (e) { errs.push("누름 " + e.message); } }
      k++;
      if (!steps && k % 20 === 0) { // 쉬며 저절로 바뀜 보기
        await W(600); const a = snap(), wasBusy = busy(); await W(5500); const b = snap();
        if (a !== b && !wasBusy && !busy()) report("누름 없이 5초 동안 바뀜", `${a} → ${b}`);
      } else await W(50 + Math.floor(rnd() * 350));
      if (errs.length) { report("오류", errs.splice(0).join(" | ")); }
    }
  } catch (e) { report("점검 도중 오류", e.message); }
  clearInterval(mon);
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR; HTMLMediaElement.prototype.play = keep.play; console.error = keep.cerr;
  removeEventListener("error", onErr); removeEventListener("unhandledrejection", onErr); delete window.__noSrSwitch;
  document.querySelectorAll(".panel [data-act=close], .panel [data-x=close]").forEach(b => b.click()); document.querySelector("video")?.pause();
  const res = [`${probs.length ? "✗" : "✓"} 막 누르기 씨앗 ${seed0} · ${acts.length}번 누름 · ${innerWidth}x${innerHeight}`, ...probs.map(p => `✗ ${p.kind} · ${String(p.x).slice(0, 160)} · 직전 ${p.last.slice(-5).join(" → ")}`)];
  const out = res.join("\n"); console.log(out); return out;
})();
