// 말하기 전수 점검(S1~S7) — #/learn/{편} 을 연 채로 실행. 마이크와 음성 인식은 가짜로 바꿔 앱 동작만 본다
// (가짜 마이크 = 0.8초 동안 삑 소리 뒤 조용 → 「말이 끝나고 1초 조용하면 멈춤」을 확인 · 가짜 인식 = 정해 준 글자를 돌려줌)
(async () => {
  window.__noRhythm = true; // 가짜 마이크(삑 소리)로는 리듬을 잴 수 없음 — 글자 점수·화면 흐름만 봄(리듬은 tools/ui_check_rhythm.js)
  const res = [];
  try {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const $ = s => document.querySelector(s);
  const ok = (c, name, extra = "") => { res.push(`${c ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`); try { sessionStorage.setItem("__sp_part", res.join("\n")); } catch {} }; // 도중 결과도 남김(페이지가 바뀌어도 읽게)
  const log = (window.__sfxLog = []); window.__sfxVolume = 0.0001;
  const vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  Object.defineProperty(HTMLMediaElement.prototype, "volume", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, Math.min(v, 0.0001)); } });
  const mediaPlays = []; const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { this.volume = 0.0001; mediaPlays.push(this.src.slice(0, 5)); return op.call(this); };
  // 가짜 마이크
  let micAsked = 0;
  // __micFail = 앞으로 몇 번 「장치가 제거됨」으로 실패할지 · __silentIds = 열리지만 소리가 0 인 마이크들(소리 없는 블루투스) · 크롬 「기본」 = bt
  try { localStorage.removeItem("malmun.mic"); } catch {}
  navigator.mediaDevices.enumerateDevices = async () => [
    { kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }, { kind: "audioinput", deviceId: "bt", label: "시험 블루투스" }, { kind: "audioinput", deviceId: "usb", label: "시험 USB 마이크" }];
  const asked = (window.__asked = []);
  navigator.mediaDevices.getUserMedia = async c => {
    micAsked++; window.__lastC = c.audio; asked.push(c.audio === true || !c.audio.deviceId ? "기본" : c.audio.deviceId.exact);
    if (window.__micFail > 0) { window.__micFail--; throw new DOMException("Device was removed", "NotReadableError"); }
    if (window.__micDeny) throw new DOMException("denied", "NotAllowedError");
    const ctx = new AudioContext(), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain();
    const id = asked[asked.length - 1], dumb = (window.__silentIds || []).includes(id);
    g.gain.value = dumb ? 0 : 0.3; o.connect(g); g.connect(dst); o.start();
    if (!dumb) window.__mic = { o, g, ctx };
    const tr = dst.stream.getAudioTracks()[0], gs = tr.getSettings.bind(tr); tr.getSettings = () => ({ ...gs(), deviceId: id === "기본" ? "bt" : id });
    (window.__tracks ||= []).push(dst.stream.getAudioTracks()[0]);
    return dst.stream;
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
  await open(1);
  const hb = $(".panel .helpbox"), hbShown = !hb.hidden && hb.querySelectorAll("p").length === 7;
  $(".panel .task").click(); await W(100);
  ok(hbShown && hb.hidden, "처음 열면 사용법 풍선이 저절로 · 아무 데나 누르면 닫힘");
  $(".panel [data-act=help]").click(); await W(100); const hb2 = !hb.hidden; $(".panel [data-act=help]").click(); await W(100);
  ok(hb2 && hb.hidden && !$(".panel .whead [data-act=save]") && !$(".panel .whead [data-act=pick]") && /\S\s*\S/.test($(".panel [data-act=help]").textContent.trim()), "[? 사용법] → 풍선 열림 · 다시 → 닫힘 · 위 줄에 옛 ⬇·🎤 단추 없음", $(".panel .whead").innerText.replace(/\s+/g, " "));
  const sp = $(".panel .speak"), p = $(".panel").getBoundingClientRect(), btn = $(".panel .sbtns").getBoundingClientRect();
  ok($("#vwrap").offsetHeight === 0 && sp && sp.scrollHeight - sp.clientHeight <= 1 && btn.bottom <= p.bottom + 1, "말하기가 영상 창 자리에 · 창 안 스크롤 없음");
  ok($(".panel .say").textContent === "어서 오세요." && /1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "과제 = 첫 토막 「어서 오세요.」 · 1/5(토막 3 + 줄 전체 + 말해 보기)", $(".panel .say").textContent + " " + $(".panel .segnav").innerText.replace(/\s/g, ""));
  ok($(".panel [data-act=mine]").disabled && $(".panel [data-act=both]").disabled, "녹음 전에는 [내 목소리]·[비교] 꺼져 있음");
  let at = log.length; $(".panel [data-act=model]").click(); await W(1800);
  ok(log.slice(at).some(e => e.ev === "시작" && /_01_p01\.mp3$/.test(e.name)) && log.slice(at).some(e => e.ev === "끝"), "[본보기] → 그 토막 소리 끝까지", log.slice(at).map(e => e.ev + "(" + e.name.split("/").pop() + ")").join(" → "));
  at = log.length; $(".ctrl [data-act=play]").click(); await W(500); ok(log.slice(at).some(e => e.ev === "시작"), "아래 ▶ = 본보기"); $(".ctrl [data-act=play]").click(); await W(400);
  // 틀리게 말함
  await say("안녕하세요"); ok(micAsked === 1 && $(".panel .mic").classList.contains("on"), "[말하기] → 마이크 허락 1번 · 녹음 중 표시");
  await waitIdle();
  ok(!$(".panel .mic").classList.contains("on"), "말이 끝나고 조용하면 저절로 멈춤");
  ok(/40%/.test($(".panel .msg").textContent) && !$(".panel .meter").classList.contains("pass") && /1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "다르게 말함(안녕하세요 / 어서 오세요) → 40%(「세요」 두 음절만) · 통과 아님 · 그 자리에 있음(막지 않음)", $(".panel .msg").textContent);
  ok(!$(".panel [data-act=mine]").disabled && $(".panel [data-act=keep]").hidden, "못 넘어도 방금 녹음은 [내 목소리]로 들림 · [저장] 없음(투덜이 10-04)");
  ok(window.__lastC && window.__lastC.echoCancellation === false && window.__lastC.noiseSuppression === false && window.__lastC.autoGainControl === false, "마이크는 날소리로(에코 제거·잡음 억제·자동 크기 끔 — 말이 뚝뚝 끊기던 것)", JSON.stringify(window.__lastC));
  ok(window.__srCont === true, "음성 인식이 말을 끝까지 들음(짧은 말을 중간에 끊지 않음)");
  ok(window.__srTrack === "audio", "음성 인식이 녹음하는 그 마이크를 들음(크롬 기본 마이크가 아니라)", String(window.__srTrack));
  // 점수에 맞는 한마디 — 반쯤 맞음(50%)과 많이 틀림(40 미만)은 말이 다르다
  await say("안녕하세요"); await waitIdle(); const m3 = $(".panel .msg").textContent;
  await say("감사합니다"); await waitIdle(); const m1 = $(".panel .msg").textContent;
  ok(/^\d+% · /.test(m3) && /^\d+% · /.test(m1) && m3.replace(/^\d+%/, "") !== m1.replace(/^\d+%/, ""), "점수마다 한마디가 다름(아직 조금 부족해요 / 천천히 다시)", m3 + " ｜ " + m1);
  // 맞게 말함 → 100% ✓ + [저장] 단추(자동 저장 아님) → 누르면 저장 · 저절로 넘어가지 않음
  await say("어서 오세요"); await waitIdle();
  ok(/100% ✓/.test($(".panel .msg").textContent) && !$(".panel [data-act=keep]").hidden && !/✓/.test($(".panel .segnav").innerText), "맞게 말함 → 100% ✓ · [저장] 나옴 · 아직 저장 안 됨", $(".panel .msg").textContent);
  await W(1800);
  ok(/1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "통과해도 저절로 다음 토막으로 안 넘어감(저장할 틈)", $(".panel .segnav").innerText.replace(/\s/g, ""));
  $(".panel [data-act=keep]").click(); await W(400);
  ok(/1\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && $(".panel [data-act=keep]").hidden && !$(".panel [data-act=savedplay]").hidden, "[저장] 누름 → ✓ · 「저장됨 ▶」 나옴", $(".panel .msg").textContent);
  $(".panel [data-seg='1']").click(); await W(300);
  ok(/2\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && $(".panel .say").textContent.startsWith("경복궁에"), "▶ 로 다음 토막", $(".panel .say").textContent);

  ok(micAsked === 1, "마이크 허락은 처음 한 번만(창이 열려 있는 동안 마이크를 쥐고 있음 — 10-01 판처럼)", String(micAsked));
  // 저장 확인: 앞 토막으로 돌아가면 ✓ + 내 목소리 켜짐
  $(".panel [data-seg='-1']").click(); await W(300);
  ok(/1\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && !$(".panel [data-act=savedplay]").hidden && $(".panel [data-act=mine]").disabled, "앞 토막으로 → ✓ · 「저장됨 ▶」 · (방금 녹음 없음이라 [내 목소리] 꺼짐)", $(".panel .segnav").innerText.replace(/\s/g, ""));
  let dl2 = null; const oc2 = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dl2 = this.download; else oc2.call(this); };
  $(".panel [data-act=savedl]").click(); await W(1200); HTMLAnchorElement.prototype.click = oc2;
  ok(dl2 === "malmun_L01-00-01_01_p01_100.wav", "말하기 창: 저장한 녹음 [⬇ 내려받기] 이름에 점수", String(dl2));
  const ml0 = (window.__mineLog ||= []).length; $(".panel [data-act=savedplay]").click(); for (let k = 0; k < 20 && window.__mineLog.length === ml0; k++) await W(100);
  ok(window.__mineLog.length > ml0, "「저장됨 ▶」 → 저장한 녹음을 말 시작 자리부터(풀어서 직결 재생)", JSON.stringify(window.__mineLog[window.__mineLog.length - 1]));
  ok(!/%/.test($(".panel .msg").textContent), "열 때(돌아왔을 때) 예전 점수는 안 보임 — ✓ 만", $(".panel .msg").textContent);
  // 녹음 중 다시 누르면 멈춤
  await say("어서 오세요", 5000); await W(600); $(".panel [data-act=rec]").click(); await W(1200);
  ok(!$(".panel .mic").classList.contains("on"), "녹음 중 [말하기] 다시 → 멈춤"); await W(1800);
  // 닫았다 다시 열어도 저장이 남음
  line(1).querySelector("[data-act=speak]").click(); await W(500);
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "[말하기] 다시 누름 → 영상으로");
  await open(1);
  ok(/✓/.test($(".panel .segnav").innerText), "다시 열어도 ✓ 와 저장된 녹음이 남아 있음", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 줄 전체까지 통과 → 다음 줄 말하기
  for (const [k, heard] of ["어서 오세요", "경복궁에 온 걸", "환영해요", "어서 오세요 경복궁에 온 걸 환영해요", "한국에 온 걸 환영해요"].entries()) {
    while (+((($(".panel .segnav").innerText.replace(/\s/g, "").match(/(\d+)\/5/)) || [])[1]) !== k + 1) { $(".panel [data-seg='1']").click(); await W(200); }
    await say(heard); await waitIdle(); $(".panel [data-act=keep]").click(); await W(300);
  }
  await W(600);
  ok(/^1 \//.test($(".panel .whead .sub")?.textContent || "") && /5\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && /100% ✓ · .+/.test($(".panel .msg").textContent), "줄 전체까지 통과·저장 → 그 줄에 그대로(다음 줄로 넘어가지 않음)", $(".panel .whead .sub")?.textContent + " · " + $(".panel .msg").textContent);
  // 점수가 안 나오면 절대 통과·저장 아님(본부 10-04) — 말하기 창
  await open(9);
  const settle = async () => { for (let k = 0; k < 40 && /Checking|확인 중|जाँच्दै/.test($(".panel .msg")?.textContent || ""); k++) await W(150); };
  window.__srNone = true; await say("아무 말"); await waitIdle(); await settle();
  ok(/again|फेरि|다시/i.test($(".panel .msg").textContent) && /^0% · /.test($(".panel .msg").textContent) && $(".panel [data-act=keep]").hidden && !$(".panel .meter").classList.contains("pass") && !/✓/.test($(".panel .segnav").innerText), "말하기 창: 결과 없음 → 「0% · 잘 못 알아들었어요」 · 통과·✓·[저장] 아님", $(".panel .msg").textContent);
  window.__srNone = false; window.__srErr = "audio-capture"; await say("아무 말"); await waitIdle(); await settle();
  ok(/microphone|माइक्रोफोन|마이크/i.test($(".panel .msg").textContent) && !/✓/.test($(".panel .segnav").innerText), "말하기 창: audio-capture 오류 → 「음성 인식이 마이크를 못 잡았어요」", $(".panel .msg").textContent);
  window.__srErr = null;
  // 설명 카드 안 「이제 말해 보세요」도 같게
  line(9).querySelector("[data-act=speak]").click(); await W(500);
  line(10).querySelector("[data-act=explain]").click(); await W(1200); document.querySelector("video").pause();
  const crec = async () => { $(".panel .sayb [data-x=rec]").click(); await W(400); speakFor(700); for (let k = 0; k < 60 && $(".panel .sayb [data-x=rec]").classList.contains("on"); k++) await W(150); await W(700); return $(".panel .sayb .smsg").textContent; };
  window.__srNone = true; let cm = await crec();
  ok(/again|फेरि|다시/i.test(cm) && /^0% · /.test(cm) && !/✓/.test(cm) && $(".panel .sayb [data-x=keep]").hidden && !$(".panel .sayb [data-x=mine]").disabled, "카드: 결과 없음 → 「0% · 다시」 · [저장] 없음 · 방금 녹음은 [내 목소리]로", cm);
  window.__srNone = false; window.__srErr = "audio-capture"; cm = await crec();
  ok(/microphone|माइक्रोफोन|마이크/i.test(cm) && !$(".panel .sayb").classList.contains("pass"), "카드: audio-capture → 마이크 안내", cm);
  window.__srErr = null; window.__heard = "감사합니다 여러분"; cm = await crec();
  ok(/^\d+%/.test(cm) && !/✓/.test(cm) && $(".panel .sayb [data-x=keep]").hidden, "카드: 엉뚱한 말 → 낮은 점수 · ✓·[저장] 없음", cm);
  window.__heard = $(".panel .sayb .saybig")?.textContent || $(".panel .sayb p").textContent.match(/"([^"]+)"/)[1]; cm = await crec(); // 말해 보세요 칸 = 한국어 문장 크게(본부 10-05)
  ok(/^100% ✓/.test(cm) && !$(".panel .sayb [data-x=keep]").hidden, "카드: 맞게 말함 → 100% ✓ · [저장] 나옴(자동 저장 아님)", cm);
  $(".panel .sayb [data-x=keep]").click(); await W(500);
  ok(!$(".panel .sayb [data-x=savedplay]").hidden && $(".panel .sayb [data-x=keep]").hidden, "카드: [저장] → 「저장됨 ▶」", $(".panel .sayb .smsg").textContent);
  ok(!$(".panel .sayb .micname").hidden && /✓/.test($(".panel .sayb .micname").textContent), "카드: 🎤 아래 지금 마이크 이름 한 줄(눌러서 바꾸기)", $(".panel .sayb .micname").textContent);
  line(10).querySelector("[data-act=explain]").click(); await W(500);
  // 통과 = 95% 이상 · 들린 말 한 줄(틀린 음절 빨간 밑줄 · 빠진 자리 _) — 1번 줄 「한국에 온 걸 환영해요」(본부 10-04)
  line(1).querySelector("[data-act=explain]").click(); await W(1300); document.querySelector("video").pause();
  const hl = () => $(".panel .sayb .heardline");
  // 음절 정렬 점수(본부 10-04 기대값 · 정정: 혼자 맞은 음절도 맞음) · 점수와 빨간 표시는 같은 정렬
  for (const [h, want] of [["한국에 온 걸 환영해요", 100], ["미국에 온 걸 환영해요", 89], ["한국에 온 걸 환영해", 89], ["한국에 온 걸 환영합니다", 70], ["너 죽는다 환영 한", 22], ["안녕하세요", 11], ["한국에 걸 환영해요", 89]]) {
    window.__heard = h; cm = await crec();
    const got = +(cm.match(/^(\d+)%/) || [])[1], keepShown = !$(".panel .sayb [data-x=keep]").hidden, marks = [...hl().querySelectorAll("mark")].map(x => x.className + ":" + x.textContent).join(" ");
    ok(got === want && keepShown === (want >= 80) && (want >= 95 ? /★/ : want >= 80 ? /☆/ : /^[^☆★]*$/).test(cm), `「${h}」 → ${want}%${want >= 95 ? " ✓ ★ · [저장]" : want >= 80 ? " ✓ ☆ · [저장]" : " · 통과 아님"}`, `${got}% · ${hl().textContent}${marks ? " · 빨간 " + marks : ""}`);
  }
  window.__heard = "미국에 온 걸 환영해요"; cm = await crec();
  ok([...hl().querySelectorAll("mark.bad")].map(x => x.textContent).join("") === "미", "「미국에…」 빨간 밑줄은 「미」만", hl().textContent);
  const okTxt = [...hl().querySelectorAll("b.ok")].map(x => x.textContent).join(""), okCol = getComputedStyle(hl().querySelector("b.ok")).color, badDeco = getComputedStyle(hl().querySelector("mark.bad")).textDecorationLine;
  ok(okTxt === "국에온걸환영해요" && okCol !== getComputedStyle(hl()).color && /underline/.test(badDeco), "「미국에…」 맞은 음절 = 초록 굵게 · 「미」 = 빨강+밑줄", `초록 「${okTxt}」 ${okCol} · 밑줄 ${badDeco}`);
  window.__heard = "한국에 온 걸 환영해요"; cm = await crec();
  ok([...hl().querySelectorAll("b.ok")].map(x => x.textContent).join("") === "한국에온걸환영해요" && !hl().querySelector("mark") && /✓/.test(hl().textContent), "다 맞으면 전부 초록 + ✓", hl().textContent);
  window.__heard = "한국에 걸 환영해요"; cm = await crec();
  ok(!!hl().querySelector("mark.miss"), "「한국에 걸…」 빠진 자리 _", hl().textContent);
  window.__heard = "안녕하세요"; cm = await crec();
  ok([...hl().querySelectorAll("mark.bad")].map(x => x.textContent).join("") === "안녕하세" && /요/.test(hl().textContent), "「안녕하세요」 → 빨간 「안녕하세」 · 「요」는 보통(한 글자라도 맞은 곳)", hl().textContent);
  window.__heard = "너 죽는다 환영 한"; cm = await crec();
  ok([...hl().querySelectorAll("mark.bad")].map(x => x.textContent).join("") === "너죽는다한", "「너 죽는다 환영 한」 → 「환영」만 보통 · 나머지 빨간", hl().textContent);
  // 저장한 녹음 관리(카드) — 내려받기 = 원본 그대로 · 지우기 = 한 번 묻고 그 녹음만
  window.__heard = "한국에 온 걸 환영해요"; cm = await crec(); $(".panel .sayb [data-x=keep]").click(); await W(500);
  let dlc = null; const occ = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dlc = this.download; else occ.call(this); };
  $(".panel .sayb [data-x=savedl]").click(); await W(1200); HTMLAnchorElement.prototype.click = occ;
  ok(dlc === "malmun_L01-00-01_01_say_100.wav" && /⬇ .+/.test($(".panel .sayb [data-x=savedl]").textContent), "카드: 저장한 녹음 [⬇ 내려받기] → 원본 그대로 파일(이름에 점수)", String(dlc));
  let asked2 = 0; const oconf = window.confirm; window.confirm = () => (asked2++, false);
  $(".panel .sayb [data-x=savedel]").click(); await W(200);
  const stay = !$(".panel .sayb [data-x=savedplay]").hidden;
  window.confirm = () => (asked2++, true); $(".panel .sayb [data-x=savedel]").click(); await W(400); window.confirm = oconf;
  const left = await new Promise(res => { const q = indexedDB.open("malmun", 1); q.onsuccess = () => { const g = q.result.transaction("rec").objectStore("rec").get("L01-00-01/L01-00-01_01_say"); g.onsuccess = () => { q.result.close(); res(g.result); }; }; });
  ok(asked2 === 2 && stay && $(".panel .sayb [data-x=savedplay]").hidden && $(".panel .sayb [data-x=savedel]").hidden && !left, "카드: [🗑 지우기] → 한 번 묻고(아니오면 그대로) · 예면 그 녹음만 지움", `물음 ${asked2} · 남은 것 ${left ? "있음" : "없음"}`);
  line(1).querySelector("[data-act=explain]").click(); await W(500);
  // 🔁 켠 채로 카드 소리 — 본보기·내 목소리는 한 번만 · 설명 ▶ 는 반복 · 🎤 = 반복·재생 모두 멈춤(본부 10-04 「끝없이 되풀이」)
  const pl = []; const op3 = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { pl.push({ el: this, src: decodeURIComponent(this.src) }); return op3.call(this); };
  const toEnd = async el => { for (let k = 0; k < 30 && !isFinite(el.duration); k++) await W(100); if (isFinite(el.duration)) el.currentTime = Math.max(0, el.duration - 0.05); };
  line(12).querySelector("[data-act=explain]").click(); await W(1300); document.querySelector("video").pause();
  if (!document.querySelector(".panel").classList.contains("paused")) { $(".ctrl [data-act=play]").click(); await W(300); } // 열 때 저절로 읽는 설명은 멈추고 시작
  if ($(".ctrl [data-act=rep]").getAttribute("aria-pressed") !== "true") { $(".ctrl [data-act=rep]").click(); await W(200); }
  const repOn = $(".ctrl [data-act=rep]").getAttribute("aria-pressed") === "true";
  pl.length = 0; $(".panel .sayb [data-x=model]").click(); await W(300); await toEnd(pl.filter(x => /문장/.test(x.src)).pop().el); const after = pl.length; await W(2000);
  const nModel = pl.filter(x => /문장/.test(x.src)).length, nEx1 = pl.slice(after).filter(x => /설명|문장/.test(x.src)).length; // 본보기가 끝난 뒤 새로 나온 소리
  ok(repOn && nModel === 1 && nEx1 === 0, "🔁 켠 채 [본보기] → 한 번만(설명을 다시 틀지 않음)", `본보기 ${nModel}번 · 끝난 뒤 또 나온 소리 ${nEx1}번`);
  pl.length = 0; $(".panel .v9bar [data-x=ex]").click(); await W(300);
  for (let k = 0; k < 2; k++) { await toEnd(pl[pl.length - 1].el); await W(900); }
  for (let k = 0; k < 2; k++) { await toEnd(pl[pl.length - 1].el); await W(900); }
  const nEx = pl.filter(x => /설명/.test(x.src)).length;
  ok(nEx >= 2, "🔁 켠 채 설명 ▶ → 반복", `설명 ${nEx}번`);
  $(".panel .sayb [data-x=rec]").click(); await W(400); const n0 = pl.length; await W(1500);
  ok(pl.length === n0 && pl.filter(x => !/\.mp4/.test(x.src)).every(x => x.el.paused || /^blob:/.test(x.src)) && document.querySelector("video").paused, "🎤 → 설명 소리·반복 모두 멈춤", `그 뒤 새로 튼 소리 ${pl.length - n0}`);
  speakFor(700); for (let k = 0; k < 60 && $(".panel .sayb [data-x=rec]").classList.contains("on"); k++) await W(150); await W(900);
  const ml1 = (window.__mineLog ||= []).length; $(".panel .sayb [data-x=mine]").click(); await W(4500); // 끝날 때까지(녹음 길이) 기다려도 다시 안 나와야 함
  ok(window.__mineLog.length - ml1 === 1, "🔁 켠 채 [내 목소리] → 한 번만", `내 목소리 ${window.__mineLog.length - ml1}번`);
  $(".ctrl [data-act=rep]").click(); await W(200); HTMLMediaElement.prototype.play = op3;
  line(12).querySelector("[data-act=explain]").click(); await W(500);
  // 블루투스만 있는 기기 → 그 블루투스로라도 녹음(다른 게 없을 때만)
  const ed = navigator.mediaDevices.enumerateDevices; navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "bt", label: "시험 블루투스 Hands-Free" }];
  try { localStorage.removeItem("malmun.mic"); } catch {} asked.length = 0;
  await open(11); await say("아무 말"); await W(300);
  ok($(".panel .mic").classList.contains("on") && asked.length >= 1, "블루투스만 있으면 그것으로 녹음", asked.join(" → "));
  await waitIdle(); navigator.mediaDevices.enumerateDevices = ed;
  // 음성 인식이 없는 기기 → 점수 없이 녹음·비교
  delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
  await open(4);
  await say("아무 말"); await waitIdle();
  ok(!/%/.test($(".panel .msg").textContent) && !$(".panel [data-act=mine]").disabled, "음성 인식 없는 기기 → 점수 없이 녹음되고 [내 목소리]로 비교", $(".panel .msg").textContent);
  // ── 마이크가 말썽일 때 ──
  // ① 「장치가 제거됨」으로 안 열림 → 다음 마이크로 자동으로
  try { localStorage.removeItem("malmun.mic"); } catch {}
  await open(5); window.__micFail = 2; asked.length = 0;
  await say("아무 말"); await W(300);
  ok($(".panel .mic").classList.contains("on") && asked.join(",") === "기본,bt,usb", "마이크 둘이 안 열림 → 다음 마이크로 자동으로 → 녹음 시작", asked.join(" → "));
  ok(!$(".panel .lvl").hidden && parseFloat($(".panel .lvl i").style.width) > 20, "녹음 중 소리 크기 막대가 움직임", $(".panel .lvl i").style.width);
  await waitIdle();
  ok($(".panel .lvl").hidden, "녹음이 끝나면 소리 크기 막대 사라짐");
  // ② 크롬이 고른 마이크가 소리 0(블루투스) → 1.5초 뒤 다음 마이크로 저절로 바꿔 계속 녹음 → 그 마이크를 기억
  try { localStorage.removeItem("malmun.mic"); } catch {}
  await open(6); window.__silentIds = ["기본", "default", "bt"]; asked.length = 0;
  $(".panel [data-act=rec]").click();
  for (let k = 0; k < 80 && asked[asked.length - 1] !== "usb"; k++) await W(100);
  await W(500); const swMsg = $(".panel .msg").textContent; speakFor(700); await W(300);
  ok($(".panel .mic").classList.contains("on") && asked.join(",") === "기본,usb" && $(".panel .miclist").hidden, "소리 0 인 마이크 → 묻지 않고 다음 마이크로 넘어가 녹음 계속(별칭 default 는 안 고름)", asked.join(" → ") + " · " + swMsg);
  await waitIdle();
  ok(localStorage.getItem("malmun.mic") === "usb", "소리가 들어온 마이크를 기억", String(localStorage.getItem("malmun.mic")));
  asked.length = 0; await say("아무 말"); await W(300);
  ok(asked.length === 0 || asked[0] === "usb", "다음 녹음은 바로 그 마이크로(다시 헤매지 않음)", asked.join(" → ") || "열린 마이크 그대로");
  await waitIdle();
  // ③ 마이크가 전부 소리 0 → 알리고 목록 · 고르면 기억
  try { localStorage.removeItem("malmun.mic"); } catch {}
  await open(7); window.__silentIds = ["기본", "default", "bt", "usb"];
  $(".panel [data-act=rec]").click();
  for (let k = 0; k < 120 && $(".panel .miclist").hidden; k++) await W(100);
  await W(300);
  ok(!$(".panel .mic").classList.contains("on") && $(".panel .miclist").querySelectorAll("[data-mic]").length === 2 && !!$(".panel .miclist [data-act=micclose]") && $(".panel .miclist p") && $(".panel [data-act=mine]").disabled, "전부 소리 0 → 멈추고 알림 + 마이크 목록(별칭 default 는 목록에 없음)", $(".panel .msg").textContent);
  const sp2 = $(".panel .speak"); ok(sp2.scrollHeight - sp2.clientHeight <= 1, "마이크 목록이 떠도 창 안 스크롤 없음", sp2.scrollHeight + "/" + sp2.clientHeight);
  window.__silentIds = []; asked.length = 0;
  $(".panel [data-mic=usb]").click(); await W(200);
  ok($(".panel .miclist").hidden && localStorage.getItem("malmun.mic") === "usb", "마이크 고름 → 목록 닫히고 기억", $(".panel .msg").textContent);
  await say("아무 말"); await W(300);
  ok($(".panel .mic").classList.contains("on") && asked[0] === "usb", "다음 녹음은 고른 마이크로", asked.join(" → "));
  await waitIdle();
  // ④ 🎤 단추 = 목록 열고 닫기
  $(".panel [data-act=pick]").click(); await W(200); const o1 = !$(".panel .miclist").hidden && $(".panel [data-mic=usb]").getAttribute("aria-pressed") === "true";
  $(".panel [data-act=pick]").click(); await W(200);
  ok(o1 && $(".panel .miclist").hidden, "🎤 → 목록 열림(고른 마이크 표시) · 다시 → 닫힘");
  // ⑤ 허락 안 함 → 이유를 말해 줌 · 다른 마이크로 헛돌지 않음
  await open(8); window.__micDeny = true; asked.length = 0;
  $(".panel [data-act=rec]").click(); await W(500);
  ok(!$(".panel .mic").classList.contains("on") && asked.length === 1 && $(".panel .msg").textContent.length > 20, "마이크 허락 안 함 → 한 번만 묻고 이유를 알려 줌", $(".panel .msg").textContent);
  window.__micDeny = false; try { localStorage.removeItem("malmun.mic"); } catch {}
  // 말하기 창 = 카드와 같은 기준(본부 10-04) — 1번 줄 5토막 각각 맞음/틀림/빠짐
  window.SpeechRecognition = fakeSR; window.webkitSpeechRecognition = fakeSR; // 앞의 「인식 없는 기기」 시험에서 지운 것 되살림
  await open(1); while (!/(^|\D)1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, ""))) { $(".panel [data-seg='-1']").click(); await W(150); }
  const settle2 = async () => { for (let k = 0; k < 40 && /Checking|확인 중|जाँच्दै/.test($(".panel .msg")?.textContent || ""); k++) await W(150); };
  const syl = x => [...x].filter(c => /[가-힣]/.test(c));
  let bad5 = [];
  for (let k = 0; k < 5; k++) {
    if (k) { $(".panel [data-seg='1']").click(); await W(250); }
    const txt = $(".panel .say").textContent, S = syl(txt);
    const forms = [["맞음", txt, m => /^100% ✓/.test(m) && !$(".panel [data-act=keep]").hidden],
      ["틀림", txt.replace(S[0], S[0] === "미" ? "비" : "미"), m => !/^100/.test(m) && ((+(m.match(/^(\d+)%/) || [])[1] >= 80) === !$(".panel [data-act=keep]").hidden) && !!$(".panel .heardline mark.bad")],
      ["빠짐", txt.replace(S[1] || S[0], ""), m => !/^100/.test(m) && ((+(m.match(/^(\d+)%/) || [])[1] >= 80) === !$(".panel [data-act=keep]").hidden) && !!$(".panel .heardline mark.miss")]];
    for (const [nm, h, chk] of forms) { await say(h); await waitIdle(); await settle2(); const m = $(".panel .msg").textContent; if (!chk(m)) bad5.push(`${k + 1}토막 ${nm}: ${m} | ${$(".panel .heardline").textContent}`); }
  }
  ok(!bad5.length, "말하기 창 1번 줄 5토막 × 맞음(100% ✓★·[저장])/틀림(빨간 밑줄)/빠짐(_) — [저장]은 80%↑ 일 때만", bad5.join(" ; ") || "15/15");
  window.__srNone = true; await say("아무 말"); await waitIdle(); await settle2(); window.__srNone = false;
  ok(/^0% · /.test($(".panel .msg").textContent) && $(".panel [data-act=keep]").hidden && ![...document.querySelectorAll(".panel button")].some(b => !b.hidden && /^⬇$/.test(b.textContent.trim())), "0% 녹음 뒤 저장할 길 없음([저장] 없음 · 옛 ⬇ 없음)", $(".panel .msg").textContent);
  ok(![...document.querySelectorAll(".panel button")].filter(b => !b.hidden && b.offsetParent).some(b => !/[\p{L}]/u.test(b.textContent)), "말하기 창: 아이콘만 단추 없음", [...document.querySelectorAll(".panel button")].filter(b => !b.hidden && b.offsetParent).map(b => b.textContent.trim()).join(" | "));
  const spx = $(".panel .speak"); ok(spx.scrollHeight - spx.clientHeight <= 1, "말하기 창: 들린 말·저장 줄이 떠도 창 안 스크롤 없음", spx.scrollHeight + "/" + spx.clientHeight);
  // 시간 규칙(본부 10-04): 쉼 2초 · 🎤 뒤 6초 · 최대 길이 · 인식 다시 켜기 · 두 단계 통과
  const { scoreLine, maxMsFor } = await import("./js/screens/speak.js?v=" + document.documentElement.dataset.v);
  const tt = x => ({ why_time: "TIME", why_tail: "TAIL", why_other: "OTHER", why_polish: "POLISH" })[x] || x;
  ok(/☆/.test(scoreLine(82, "pause", tt)) && /★/.test(scoreLine(96, "stop", tt)) && !/[☆★]/.test(scoreLine(79, "stop", tt)) && /TIME/.test(scoreLine(82, "time", tt)) && !/why_pause|PAUSE/.test(scoreLine(60, "pause", tt)) && /TAIL/.test(scoreLine(57, "pause", tt, { kind: "tail", tail: "싶어요" })) && /OTHER/.test(scoreLine(0, "pause", tt, { kind: "other", say: "x" })) && /POLISH/.test(scoreLine(85, "pause", tt, { kind: "words", words: [{ w: "싶어요", h: "시퍼요" }] })), "두 단계: 82% → ☆ · 96% → ★ · 79% → 없음 · 쉼(2초)은 문구에 안 씀 · 시간 다 됨 · 들은 내용 안내(뒤 빠짐·다른 말·통과+틀림)", [scoreLine(57, "pause", tt, { kind: "tail", tail: "싶어요" }), scoreLine(60, "pause", tt)].join(" / "));
  // 끝남 문구 = 들은 내용으로(본부 10-06 투덜이) — 다른 말 · 앞부분만 · 바뀜 · 빠짐 · 두 곳 넘게 · 통과+틀림
  { const { endHint } = await import("./js/heard.js?v=" + document.documentElement.dataset.v), { hintText } = await import("./js/screens/speak.js?v=" + document.documentElement.dataset.v), { t: T } = await import("./js/i18n.js?v=" + document.documentElement.dataset.v);
    const Wd = "저도 읽고 싶어요", say = (h, s) => hintText(s, T, (x => x && { ...x, say: Wd })(endHint(Wd, [h])));
    const c = { other: say("안녕하세요", 0), tail: say("저도 읽고", 57), as: say("저도 읽고 시퍼요", 71), miss: say("저도 싶어요", 71), many: say("저두 익고 시퍼요", 43), pass: say("저도 읽고 시퍼요", 85) };
    ok(/「저도 읽고 싶어요」/.test(c.other) && /「싶어요」/.test(c.tail) && /「싶어요」.*「시퍼요」/.test(c.as) && !/「저도」|「읽고」/.test(c.as.split("—")[0]) && /「읽고」/.test(c.miss) && /「저도」·「읽고」/.test(c.many) && /「싶어요」/.test(c.pass) && c.pass.length < c.as.length,
      "끝남 문구: 다른 말 · 앞부분만(빠진 「싶어요」) · 「싶어요」→「시퍼요」 · 「읽고」 빠짐 · 두 곳 넘게 · 통과+틀림(짧게)", Object.values(c).join(" ‖ ")); }
  ok(maxMsFor("어서 오세요.") === 8000 && maxMsFor("세종대왕이요. 오백 년 전에 왕이 직접 만들었어요. 그때 백성들은 글자를 몰랐거든요. 너무 어려웠어요.") >= 28000, "최대 길이 = max(8, 3 + 0.8×음절)초", maxMsFor("세종대왕이요. 오백 년 전에 왕이 직접 만들었어요. 그때 백성들은 글자를 몰랐거든요. 너무 어려웠어요.") + "ms");
  await open(3); window.__heard = $(".panel .say").textContent;
  // 말 사이 1.5초 쉼 → 안 끊김
  $(".panel [data-act=rec]").click(); await W(300); window.__mic.g.gain.value = 0.3; await W(600); window.__mic.g.gain.value = 0.001; await W(1500);
  const still = $(".panel .mic").classList.contains("on"), tbt = $(".panel .tbar .tt")?.textContent || "";
  window.__mic.g.gain.value = 0.3; await W(500); window.__mic.g.gain.value = 0.001; await waitIdle(); await settle2();
  ok(still && /\/ 0:08/.test(tbt), "말 사이 1.5초 쉼 → 안 끊김 · 시간 막대 「0:0n / 0:08」", tbt + " · " + $(".panel .msg").textContent);
  // 2.5초 쉼 → 끊김 + (못 넘었으면) 쉼 안내
  window.__heard = "가나다"; $(".panel [data-act=rec]").click(); await W(300); window.__mic.g.gain.value = 0.3; await W(500); window.__mic.g.gain.value = 0.001; await W(2600);
  const cut = !$(".panel .mic").classList.contains("on"); await waitIdle(); await settle2();
  ok(cut && /something else|अर्कै|다른 말/.test($(".panel .msg").textContent) && !/stopped in the middle|बीचमा|중간에/.test($(".panel .msg").textContent), "2.5초 쉼 → 끊김 · 문구는 시간 대신 들은 내용(「가나다」 = 다른 말로 들렸어요)", $(".panel .msg").textContent);
  // 🎤 뒤 6초 말 없음 → 끝 + 「목소리가 안 들렸어요」
  window.__srNone = true; $(".panel [data-act=rec]").click(); await W(300); window.__mic.g.gain.value = 0.001; await W(6600); await waitIdle(); await settle2(); window.__srNone = false;
  ok(/No voice|आवाज सुनिएन|목소리가 안/.test($(".panel .msg").textContent), "🎤 뒤 6초 말 없음 → 끝 + 「목소리가 안 들렸어요」", $(".panel .msg").textContent);
  // 3초 머뭇 뒤 말 → 인식이 혼자 끝나도 다시 켜서 점수
  window.__srEnd = true; window.__heard = $(".panel .say").textContent; $(".panel [data-act=rec]").click(); await W(300); window.__mic.g.gain.value = 0.001; await W(3000); window.__mic.g.gain.value = 0.3; await W(700); window.__mic.g.gain.value = 0.001; await waitIdle(); await settle2();
  const lr2 = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]").pop() || {};
  ok(/^100% ✓/.test($(".panel .msg").textContent) && (lr2.sr || []).some(x => /restart/.test(x)), "3초 머뭇 뒤 말 → 점수 남(인식 다시 켬 · 진단 restart)", $(".panel .msg").textContent + " · " + (lr2.sr || []).filter(x => /restart/.test(x)).join(","));
  // 녹음 형식 그대로(1004.24 와 같음)
  const dg2 = await new Promise(res => { const q = indexedDB.open("malmun_diag", 1); q.onupgradeneeded = () => q.result.createObjectStore("diag"); q.onsuccess = () => { const g = q.result.transaction("diag").objectStore("diag").getAll(); g.onsuccess = () => { q.result.close(); res(g.result); }; }; });
  const lastB = dg2[dg2.length - 1]?.blob; let rate = 0; try { const ac2 = new AudioContext(); rate = (await ac2.decodeAudioData(await lastB.arrayBuffer())).sampleRate; ac2.close(); } catch {}
  ok(/^audio\/webm;codecs=opus$/.test(lastB?.type || "") && rate > 0, "녹음 형식 그대로(MediaRecorder webm/opus · 다시 굽지 않음)", (lastB?.type || "") + " · 풀린 표본율 " + rate);
  // 닫기 · 마이크 목록 펼침 · 뒤로 가기(본부 10-04)
  await open(2); await say("아무 말"); await waitIdle(); await settle2();
  $(".panel .micname").click(); await W(400);
  const ml = $(".panel .miclist"), task = $(".panel .say");
  ok(!ml.hidden && task.offsetHeight > 0 && !!ml.querySelector("[data-act=micclose]") && /✓/.test(ml.textContent), "마이크 줄 → 작은 펼침(과제 그대로 보임 · 맨 위 ✕ 닫기 · 지금 마이크 ✓)", ml.innerText.replace(/\s+/g, " "));
  ml.querySelector("[data-act=micclose]").click(); await W(300);
  ok(ml.hidden && $(".panel .speak"), "펼침 [✕ 닫기] → 목록만 닫히고 말하기 창 그대로");
  $(".panel .micname").click(); await W(400); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await W(300);
  ok(ml.hidden && $(".panel .speak"), "Esc → 목록 닫힘");
  $(".panel .micname").click(); await W(400); $(".panel .say").click(); await W(300);
  ok(ml.hidden && $(".panel .speak"), "바깥 누르기 → 목록 닫힘");
  $(".panel .micname").click(); await W(400); history.back(); await W(600);
  const afterBack1 = ml.hidden && !!$(".panel .speak");
  history.back(); await W(800);
  ok(afterBack1 && $(".panel").offsetHeight === 0 && $("#vwrap").offsetHeight > 0, "뒤로 가기 → 목록 먼저 닫히고 → 다음 뒤로 가기에 말하기 창 닫혀 영상으로", `목록 닫힘 ${afterBack1} · 영상 ${$("#vwrap").offsetHeight > 0}`);
  await open(2); $(".panel [data-act=rec]").click(); await W(500);
  $(".panel [data-act=close]").click(); await W(600);
  ok($(".panel").offsetHeight === 0 && $("#vwrap").offsetHeight > 0 && /✕/.test($(".panel [data-act=close]")?.textContent || "✕"), "[✕ 닫기] → 녹음 중이어도 버리고 영상으로", "");
  line(4).querySelector("[data-act=explain]").click(); await W(1200); document.querySelector("video").pause();
  $(".panel .v9bar [data-x=close]").click(); await W(600);
  ok($(".panel").offsetHeight === 0 && $("#vwrap").offsetHeight > 0, "설명 카드 [✕ 닫기] → 영상으로");
  // 말하기 창 [🗑 지우기] — 1번 줄 1토막(저장돼 있음)
  await open(1); while (!/(^|\D)1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, ""))) { $(".panel [data-seg='-1']").click(); await W(150); }
  const oc3 = window.confirm; window.confirm = () => true;
  const hadTick = /1\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, ""));
  $(".panel [data-act=savedel]").click(); await W(400);
  ok(hadTick && !/1\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && $(".panel [data-act=savedplay]").hidden, "말하기 창: [🗑 지우기] → 그 토막 ✓·저장됨 사라짐", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 편 목록 「이 편 녹음 모두 지우기」 — 녹음이 있을 때만 보임 · 한 번 묻고 · 진단 녹음도
  location.hash = "#/list"; await W(1200);
  const da = $(".delall button"), shown = da && !da.hidden;
  da?.click(); await W(800); window.confirm = oc3;
  const cnt = await new Promise(res => { const q = indexedDB.open("malmun", 1); q.onsuccess = () => { const g = q.result.transaction("rec").objectStore("rec").getAllKeys(); g.onsuccess = () => { q.result.close(); res(g.result.filter(k => String(k).startsWith("L01-00-01/")).length); }; }; });
  ok(shown && cnt === 0 && da.hidden, "편 목록 「이 편 녹음 모두 지우기」 → 그 편 녹음 0", `보임 ${shown} · 남은 ${cnt}`);
  location.hash = "#/learn/L01-00-01"; await W(1500);
  // 점수별 효과(본부 10-05) — 100 perfect · 95~99 great · 80~94 pass · 80 아래 miss · 말소리 없음 = 효과 없음 · 소리 media/sfx/score_*.mp3 · 크기·스크롤 그대로
  const fxSeen = [], fxSize = [], fxGet = [];
  const fxBox = el => (el.closest(".speak") ? [$(".panel").offsetHeight, $(".panel .speak").scrollHeight - $(".panel .speak").clientHeight].join("/") : String(el.closest(".panel").offsetHeight));
  const mo = new MutationObserver(ms => ms.forEach(m => { const el = m.target; if (el.classList?.contains("fx") && el.classList.contains("on")) { const k = [...el.classList].filter(c => c !== "fx" && c !== "on").join(""); if (fxSeen[fxSeen.length - 1] !== k) { fxSeen.push(k); fxSize.push(fxBox(el)); } } }));
  mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  const of = window.fetch; window.fetch = (u, ...a) => { if (/score_/.test(String(u))) fxGet.push(String(u).match(/score_\w+/)[0]); return of(u, ...a); };
  const fxLog0 = (window.__sfxLog || []).length, fxPlayed = () => (window.__sfxLog || []).slice(fxLog0).filter(e => e.ev === "시작" && /score_/.test(e.name)).map(e => e.name.match(/score_\w+/)[0]);
  await open(1); while (!/(^|\D)1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, ""))) { $(".panel [data-seg='-1']").click(); await W(150); }
  const fxRun = async h => { fxSeen.length = 0; fxSize.length = 0; if (h == null) window.__srNone = true; await say(h ?? "아무 말"); await waitIdle(); await settle2(); window.__srNone = false; const after = fxBox($(".panel .speak .fx")); await W(1900); return [fxSeen.join(","), fxSize.every(x => x === after) && fxBox($(".panel .speak .fx")) === after ? "" : `크기 ${fxSize}→${after}`].join(""); };
  const fxA = await fxRun("어서 오세요"), fxB = await fxRun("어서 오세"), fxC = await fxRun("너 죽는다"), fxD = await fxRun(null);
  ok(fxA === "perfect" && fxB === "pass" && fxC === "miss" && fxD === "", "말하기 창 효과: 100% = perfect · 80% = pass · 0%(말은 들림) = miss · 말소리 없음 = 없음 · 창 크기·스크롤 그대로", `${fxA}|${fxB}|${fxC}|${fxD || "없음"}`);
  const fxPl = fxPlayed();
  ok(["score_perfect", "score_pass", "score_miss"].every(n => fxPl.includes(n)) && fxPl.length === 3, "효과음 score_perfect/pass/miss 가 점수 뜰 때 한 번씩(말소리 없음은 소리 없음)", `남 ${fxPl}`);
  line(1).querySelector("[data-act=explain]").click(); await W(800);
  const crun = async h => { fxSeen.length = 0; fxSize.length = 0; if (h == null) window.__srNone = true; else window.__heard = h; await crec(); window.__srNone = false; const after = fxBox($(".panel .sayb .fx")); await W(1900); return fxSeen.join(",") + (fxSize.every(x => x === after) && fxBox($(".panel .sayb .fx")) === after ? "" : ` 크기 ${fxSize}→${after}`); };
  const cA = await crun("한국에 온 걸 환영해요"), cB = await crun("너 죽는다"), cC = await crun(null);
  ok(cA === "perfect" && cB === "miss" && cC === "", "카드 효과: 100% = perfect · 엉뚱한 말 = miss · 말소리 없음 = 없음 · 카드 크기 그대로(효과가 떠 있을 때 = 사라진 뒤)", `${cA}|${cB}|${cC || "없음"}`);
  // 🎤 누르면 울리던 효과음도 바로 멈춤(녹음에 안 섞임)
  window.__heard = "한국에 온 걸 환영해요"; await crec(); await W(250); const fxN0 = window.__sfxLog.length;
  $(".panel .sayb [data-x=rec]").click(); await W(300); const fxCut = window.__sfxLog.slice(fxN0).some(e => e.ev === "멈춤" && /score_perfect/.test(e.name));
  speakFor(700); for (let k = 0; k < 60 && $(".panel .sayb [data-x=rec]").classList.contains("on"); k++) await W(150); await W(2300);
  ok(fxCut, "카드: 효과음(2초 perfect) 중 🎤 → 효과음 바로 멈춤");
  window.fetch = of; mo.disconnect();
  window.__mic?.ctx.close();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = res.join("\n"); console.log(out); window.__noRhythm = false; return out;
})();
