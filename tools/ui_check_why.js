// 「왜 틀렸어요?」 점검(본부 10-19 · 겉 틀) — #/learn/L01-00-01 을 연 채로. 마이크·인식·서버는 가짜(진짜 AI 안 부름)
// W1 꺼짐(기본) = 단추·자리 없음 · W2 켬(?why=1 기억) + 틀리게 말함 = 「왜 틀렸어요?」 단추 · 맞게 말하면 없음 · W3 누르면 답 상자(가짜 /explain 긴 답) — 창 안·잘림·겹침 0 · 보낸 것 확인
// W4 다시 누르면 접힘 · W5 서버 실패 = 「설명할 수 없어요」 글 · W6 ⇄ 때 단추 0px
(async () => {
  window.__noRhythm = true; window.__noSrSwitch = true; try { sessionStorage.removeItem("malmun.srmode"); sessionStorage.removeItem("malmun.srmiss"); } catch {}
  const res = []; const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s);
  const ok = (c, name, extra = "") => res.push(`${c ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`);
  window.__sfxVolume = 0.0001;
  try {
  const vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  Object.defineProperty(HTMLMediaElement.prototype, "volume", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, Math.min(v, 0.0001)); } });
  const LONG = "सही वाक्य: 어서 오세요.\n" + "तपाईंले 「오세요」 को सट्टा अर्कै शब्द भन्नुभयो, त्यसैले अर्थ फरक भयो। ".repeat(3) + "\nयाद राख्नुहोस्: 「요」 राख्दा नम्र हुन्छ।";
  const sent = (window.__whySent = []); let fail = false; const of = (window.__whyOf ||= window.fetch);
  window.fetch = async (u, o) => { u = String(u);
    if (u.endsWith("/stt")) return new Response(JSON.stringify({ error: "x" }), { status: 503 });
    if (u.endsWith("/explain")) { sent.push(JSON.parse(o.body)); await W(300); return fail ? new Response("{}", { status: 502 }) : new Response(JSON.stringify({ text: LONG }), { status: 200, headers: { "Content-Type": "application/json" } }); }
    return of(u, o); };
  window.__sttURL = "https://stt.test";
  let micAsked = 0;
  // __micFail = 앞으로 몇 번 「장치가 제거됨」으로 실패할지 · __silentIds = 열리지만 소리가 0 인 마이크들(소리 없는 블루투스) · 크롬 「기본」 = bt
  try { localStorage.removeItem("malmun.mic"); } catch {}
  navigator.mediaDevices.enumerateDevices = async () => [
    { kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }, { kind: "audioinput", deviceId: "bt", label: "시험 블루투스" }, { kind: "audioinput", deviceId: "usb", label: "시험 USB 마이크" }];
  const asked = (window.__asked = []);
  // 소리 크기 하나를 모든 열린 가짜 마이크가 같이 씀(안드로이드는 녹음마다 마이크를 닫고 다시 엶 — 본부 10-08 · 다시 열어도 같은 마이크처럼)
  let lvl = 0.3; const gains = []; const shared = { o: null, ctx: null, g: { gain: { get value() { return lvl; }, set value(v) { lvl = v; gains.forEach(x => (x.gain.value = v)); } } } };
  navigator.mediaDevices.getUserMedia = async c => {
    micAsked++; window.__lastC = c.audio; asked.push(c.audio === true || !c.audio.deviceId ? "기본" : c.audio.deviceId.exact);
    if (window.__micFail > 0) { window.__micFail--; throw new DOMException("Device was removed", "NotReadableError"); }
    if (window.__micDeny) throw new DOMException("denied", "NotAllowedError");
    const ctx = (await (window.__micCtxP ||= import(`/js/wake.js?v=${document.documentElement.dataset.v}`).then(m => m.audioCtx()))), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain();
    const id = asked[asked.length - 1], dumb = (window.__silentIds || []).includes(id);
    g.gain.value = dumb ? 0 : lvl; o.connect(g); g.connect(dst); o.start();
    if (!dumb) { gains.push(g); shared.o = o; shared.ctx = ctx; window.__mic = shared; }
    const tr = dst.stream.getAudioTracks()[0], gs = tr.getSettings.bind(tr); tr.getSettings = () => ({ ...gs(), deviceId: id === "기본" ? "bt" : id });
    (window.__tracks ||= []).push(dst.stream.getAudioTracks()[0]);
    return (window.__offOnStop ||= (s, o) => { for (const t of s.getAudioTracks()) { const f = t.stop.bind(t); t.stop = () => { f(); try { o.stop(); o.disconnect(); } catch {} }; } return s; })(dst.stream, o);
  };
  const speakFor = ms => { const m = window.__mic; if (m) { m.g.gain.value = 0.3; setTimeout(() => { m.g.gain.value = 0; }, ms); } };
  // 가짜 음성 인식
  // 가짜 인식 = 진짜처럼 중간 결과(앞 두 글자)를 먼저 주고 끝 결과를 준다 · continuous 가 아니면 진짜처럼 앞 두 글자에서 끊어 버린다
  const fakeSR = class { start(tr) { window.__srTrack = tr?.kind || null; const h = window.__heard; window.__srCont = !!this.continuous;
    if (window.__srErr) { setTimeout(() => this.onerror?.({ error: window.__srErr }), 100); return; } // 진짜 크롬처럼: 인식이 마이크를 못 잡음
    if (window.__srNone) return; // 아무것도 못 알아들음
    if (window.__srEnd) { window.__srEnd = false; setTimeout(() => this.onend?.(), 2700); return; } // 진짜 크롬처럼: 말이 없으면 2.7초 만에 혼자 끝남
    setTimeout(() => this.onresult?.({ results: [[{ transcript: h.slice(0, 2) }]] }), 250);
    setTimeout(() => this.onresult?.({ results: [[{ transcript: this.continuous ? h : h.slice(0, 2) }]] }), 500); } stop() {} };
  window.SpeechRecognition = fakeSR; window.webkitSpeechRecognition = fakeSR;
  const line = i => [...document.querySelectorAll(".line")][i - 1];
  const open = async i => { line(i).querySelector(".kotext").click(); await W(1000); if (!$(".panel.speak")?.offsetHeight) { line(i).querySelector("[data-act=speak]").click(); await W(1200); } document.querySelector("video").pause(); };
  const say = async (text, ms = 700) => { window.__heard = text; $(".panel [data-act=rec]").click(); await W(400); speakFor(ms); };
  const waitIdle = async (max = 9000) => { const t0 = performance.now(); await W(200); while (performance.now() - t0 < max && ($(".panel .mic")?.classList.contains("on"))) await W(100); await W(900); };
  // 저장 지우고 시작
  await new Promise(r => { const q = indexedDB.deleteDatabase("malmun"); q.onsuccess = q.onerror = q.onblocked = r; });

  ok(!!line(1).querySelector("[data-act=speak]"), "줄 단추에 [말하기] 있음(쓰기 옆)", line(1).querySelector(".acts").innerText.replace(/\n/g, " · "));
  try { localStorage.removeItem("malmun.sp.help"); } catch {}
  const box = () => $(".sheet.whys .whybox"), btn = () => $(".panel .whyb"), shut = async () => { $(".sheet.whys [data-close].mclose")?.click(); await W(200); };
  const inside = e => { const r = e.getBoundingClientRect(), p = $(".panel").getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && r.right <= innerWidth + 1; };
  const inView = e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
  const sp = () => $(".panel .speak"), over = () => (sp() ? sp().scrollHeight - sp().clientHeight : 0);
  // W1 꺼짐
  try { localStorage.removeItem("malmun.why"); localStorage.setItem("malmun.sp.help", "1"); } catch {}
  await open(1); await say("어서 와요"); await waitIdle();
  ok(!btn(), "W1 꺼짐(기본) = 단추·자리 없음(지금 화면 그대로)", `넘침 ${over()}`);
  $(".panel [data-act=close], .panel .closex")?.click(); await W(600);
  // W2 켬
  try { localStorage.setItem("malmun.why", "1"); } catch {}
  await open(1); await say("어서 와요"); await waitIdle();
  const b = btn(); ok(!!b && inside(b) && b.scrollWidth <= b.clientWidth + 2 && over() <= 1, "W2 켬 + 틀림 = 「왜 틀렸어요?」 단추(창 안 · 글 안 잘림 · 말하기 창 넘침 0)", `${b ? b.innerText.replace(/\s+/g, " ") : "없음"} · 넘침 ${over()}`);
  // W3 누름 = 아래에서 올라오는 작은 창
  const o0 = over(); b?.click(); await W(150); const waiting = !!box()?.querySelector(".wait"); await W(900);
  const bx = box(), sh = $(".sheet.whys");
  ok(waiting && bx && /सही/.test(bx.innerText) && inView(sh) && bx.scrollWidth <= bx.clientWidth + 1 && over() === o0, "W3 누름 = 기다림 글 → 아래 작은 창에 답(화면 안 · 가로 잘림 0 · 말하기 창 그대로)", `창 ${Math.round(sh?.getBoundingClientRect().height || 0)}px`);
  const s0 = sent[0] || {}; ok(sent.length === 1 && /^어서 오세요\.?$/.test(s0.target) && s0.heard && s0.mode === "speak" && s0.lang === document.documentElement.lang, "W3 보낸 것 = 정답·들은 말·speak·학습자 언어(한 번만)", JSON.stringify(s0).slice(0, 120));
  // W4 닫고 다시
  await shut(); const gone = !box(); btn().click(); await W(500);
  ok(gone && !!box() && /सही/.test(box().innerText) && sent.length === 1, "W4 ✕ 로 닫힘 · 다시 누르면 같은 답(다시 안 부름)"); await shut();
  // W6 ⇄ 0px
  const r0 = btn().getBoundingClientRect(), u = [...document.querySelectorAll(".panel [data-act=uiko]")].find(e => e.offsetParent);
  if (u) { u.click(); await W(900); const r1 = btn().getBoundingClientRect(); ok(Math.abs(r0.width - r1.width) <= 1 && Math.abs(r0.left - r1.left) <= 1, "W6 ⇄ = 단추 0px", `${Math.round(r0.width)}→${Math.round(r1.width)}`); u.click(); await W(900); }
  // W5 실패
  fail = true; await say("어서 가요"); await waitIdle(); btn()?.click(); await W(1200);
  ok(box()?.classList.contains("err") && box().innerText.trim().length > 4, "W5 서버 실패 = 「지금은 설명할 수 없어요」", box()?.innerText.slice(0, 40)); await shut();
  // 맞게 말함 = 단추 없음
  fail = false; await say("어서 오세요."); await waitIdle();
  ok(!btn(), "맞게 말하면 단추 없음");
  try { localStorage.removeItem("malmun.why"); } catch {}
  $(".panel [data-act=close], .panel .closex")?.click(); await W(400);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  window.fetch = window.__whyOf || window.fetch; delete window.__sttURL; try { localStorage.removeItem("malmun.why"); } catch {}
  return res.join("\n");
})();
