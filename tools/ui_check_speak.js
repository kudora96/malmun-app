// 말하기 전수 점검(S1~S7) — #/learn/{편} 을 연 채로 실행. 마이크와 음성 인식은 가짜로 바꿔 앱 동작만 본다
// (가짜 마이크 = 0.8초 동안 삑 소리 뒤 조용 → 「말이 끝나고 1초 조용하면 멈춤」을 확인 · 가짜 인식 = 정해 준 글자를 돌려줌)
(async () => {
  const res = [];
  try {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const $ = s => document.querySelector(s);
  const ok = (c, name, extra = "") => res.push(`${c ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`);
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
    micAsked++; asked.push(c.audio === true ? "기본" : c.audio.deviceId.exact);
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
  const hb = $(".panel .helpbox"), hbShown = !hb.hidden && hb.querySelectorAll("p").length === 6;
  $(".panel .task").click(); await W(100);
  ok(hbShown && hb.hidden, "처음 열면 사용법 풍선이 저절로 · 아무 데나 누르면 닫힘");
  $(".panel [data-act=help]").click(); await W(100); const hb2 = !hb.hidden; $(".panel [data-act=help]").click(); await W(100);
  ok(hb2 && hb.hidden && $(".panel [data-act=save]").disabled, "[?] → 풍선 열림 · 다시 → 닫힘 · 녹음 전에는 [⬇] 꺼져 있음");
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
  ok(/50%/.test($(".panel .msg").textContent) && !$(".panel .meter").classList.contains("pass") && /1\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "다르게 말함 → 50% · 통과 아님 · 그 자리에 있음(막지 않음)", $(".panel .msg").textContent);
  ok(!$(".panel [data-act=mine]").disabled, "녹음 뒤 [내 목소리] 켜짐");
  let dl = null; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dl = this.download + " " + this.href.slice(0, 5); else oc.call(this); };
  $(".panel [data-act=save]").click(); await W(200); HTMLAnchorElement.prototype.click = oc;
  ok(/^malmun_L01-00-01_01_p01\.(wav|webm|m4a|ogg) blob:$/.test(dl || ""), "[⬇] → 내 녹음을 파일로 내려받음", String(dl));
  ok(window.__srCont === true, "음성 인식이 말을 끝까지 들음(짧은 말을 중간에 끊지 않음)");
  ok(window.__srTrack === "audio", "음성 인식이 녹음하는 그 마이크를 들음(크롬 기본 마이크가 아니라)", String(window.__srTrack));
  const mp = mediaPlays.length; $(".panel [data-act=mine]").click(); await W(600); ok(mediaPlays.length > mp && mediaPlays[mediaPlays.length - 1] === "blob:", "[내 목소리] → 방금 녹음 재생");
  // 점수에 맞는 한마디 — 반쯤 맞음(50%)과 많이 틀림(40 미만)은 말이 다르다
  await say("안녕하세요"); await waitIdle(); const m3 = $(".panel .msg").textContent;
  await say("감사합니다"); await waitIdle(); const m1 = $(".panel .msg").textContent;
  ok(/^\d+% · /.test(m3) && /^\d+% · /.test(m1) && m3.replace(/^\d+%/, "") !== m1.replace(/^\d+%/, ""), "점수마다 한마디가 다름(아직 조금 부족해요 / 천천히 다시)", m3 + " ｜ " + m1);
  // 맞게 말함 → 통과 · 저장 · 다음 토막
  await say("어서 오세요"); await waitIdle();
  ok(/100%/.test($(".panel .msg").textContent) || /2\/5/.test($(".panel .segnav").innerText), "맞게 말함 → 100% ✓", $(".panel .msg").textContent);
  await W(1800);
  ok(/2\/5/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && $(".panel .say").textContent.startsWith("경복궁에"), "통과 1.5초 뒤 다음 토막으로 자동", $(".panel .say").textContent);
  await W(1600); const liveT = (window.__tracks || []).filter(x => x.readyState === "live").length;
  ok(liveT === 0, "녹음이 끝나고 3초 뒤 마이크 닫힘(블루투스 통화 모드 풀기)", "열린 마이크 " + liveT);
  // 저장 확인: 앞 토막으로 돌아가면 ✓ + 내 목소리 켜짐
  $(".panel [data-seg='-1']").click(); await W(300);
  ok(/1\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && !$(".panel [data-act=mine]").disabled, "앞 토막으로 → ✓ 표시 · 저장된 내 목소리 들을 수 있음", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 녹음 중 다시 누르면 멈춤
  await say("어서 오세요", 5000); await W(600); $(".panel [data-act=rec]").click(); await W(1200);
  ok(!$(".panel .mic").classList.contains("on"), "녹음 중 [말하기] 다시 → 멈춤"); await W(1800);
  // 닫았다 다시 열어도 저장이 남음
  line(1).querySelector("[data-act=speak]").click(); await W(500);
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "[말하기] 다시 누름 → 영상으로");
  await open(1);
  ok(/✓/.test($(".panel .segnav").innerText), "다시 열어도 ✓ 와 저장된 녹음이 남아 있음", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 줄 전체까지 통과 → 다음 줄 말하기
  for (const heard of ["어서 오세요", "경복궁에 온 걸", "환영해요", "어서 오세요 경복궁에 온 걸 환영해요", "한국에 온 걸 환영해요"]) {
    if (!/^1 \//.test($(".panel .whead .sub").textContent)) break;
    await say(heard); await waitIdle(); await W(1900);
  }
  await W(600);
  ok(/^1 \//.test($(".panel .whead .sub")?.textContent || "") && /5\/5✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && /100% ✓ · .+/.test($(".panel .msg").textContent), "줄 전체까지 통과 → 거기서 끝(다음 줄로 넘어가지 않음) · 「이 줄을 다 했어요」", $(".panel .whead .sub")?.textContent + " · " + $(".panel .msg").textContent);
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
  ok($(".panel .mic").classList.contains("on") && asked.join(",") === "기본,default,bt", "마이크 둘이 안 열림 → 다음 마이크로 자동으로 → 녹음 시작", asked.join(" → "));
  ok(!$(".panel .lvl").hidden && parseFloat($(".panel .lvl i").style.width) > 20, "녹음 중 소리 크기 막대가 움직임", $(".panel .lvl i").style.width);
  await waitIdle();
  ok($(".panel .lvl").hidden, "녹음이 끝나면 소리 크기 막대 사라짐");
  // ② 크롬이 고른 마이크가 소리 0(블루투스) → 1.5초 뒤 다음 마이크로 저절로 바꿔 계속 녹음 → 그 마이크를 기억
  try { localStorage.removeItem("malmun.mic"); } catch {}
  await open(6); window.__silentIds = ["기본", "default", "bt"]; asked.length = 0;
  $(".panel [data-act=rec]").click();
  for (let k = 0; k < 80 && asked[asked.length - 1] !== "usb"; k++) await W(100);
  await W(500); const swMsg = $(".panel .msg").textContent; speakFor(700); await W(300);
  ok($(".panel .mic").classList.contains("on") && asked.join(",") === "기본,default,usb" && $(".panel .miclist").hidden, "소리 0 인 마이크 → 묻지 않고 다음 마이크로 넘어가 녹음 계속(같은 블루투스는 다시 안 열어 봄)", asked.join(" → ") + " · " + swMsg);
  await waitIdle();
  ok(localStorage.getItem("malmun.mic") === "usb" && !$(".panel [data-act=mine]").disabled, "소리가 들어온 마이크를 기억 · 녹음됨", String(localStorage.getItem("malmun.mic")));
  asked.length = 0; await say("아무 말"); await W(300);
  ok(asked.length === 0 || asked[0] === "usb", "다음 녹음은 바로 그 마이크로(다시 헤매지 않음)", asked.join(" → ") || "열린 마이크 그대로");
  await waitIdle();
  // ③ 마이크가 전부 소리 0 → 알리고 목록 · 고르면 기억
  try { localStorage.removeItem("malmun.mic"); } catch {}
  await open(7); window.__silentIds = ["기본", "default", "bt", "usb"];
  $(".panel [data-act=rec]").click();
  for (let k = 0; k < 120 && $(".panel .miclist").hidden; k++) await W(100);
  await W(300);
  ok(!$(".panel .mic").classList.contains("on") && $(".panel .miclist").querySelectorAll("button").length === 3 && $(".panel .miclist p") && $(".panel [data-act=mine]").disabled, "전부 소리 0 → 멈추고 알림 + 마이크 목록", $(".panel .msg").textContent);
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
  window.__mic?.ctx.close();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = res.join("\n"); console.log(out); return out;
})();
