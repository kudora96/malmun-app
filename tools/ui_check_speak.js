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
  navigator.mediaDevices.getUserMedia = async () => {
    micAsked++;
    const ctx = new AudioContext(), dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain();
    g.gain.value = 0.3; o.connect(g); g.connect(dst); o.start(); window.__mic = { o, g, ctx };
    return dst.stream;
  };
  const speakFor = ms => { const m = window.__mic; if (m) { m.g.gain.value = 0.3; setTimeout(() => { m.g.gain.value = 0; }, ms); } };
  // 가짜 음성 인식
  const fakeSR = class { start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__heard }]] }), 500); } stop() {} };
  window.SpeechRecognition = fakeSR; window.webkitSpeechRecognition = fakeSR;
  const line = i => [...document.querySelectorAll(".line")][i - 1];
  const open = async i => { line(i).querySelector(".kotext").click(); await W(1000); if (!$(".panel.speak")?.offsetHeight) { line(i).querySelector("[data-act=speak]").click(); await W(1200); } document.querySelector("video").pause(); };
  const say = async (text, ms = 700) => { window.__heard = text; $(".panel [data-act=rec]").click(); await W(400); speakFor(ms); };
  const waitIdle = async (max = 9000) => { const t0 = performance.now(); await W(200); while (performance.now() - t0 < max && ($(".panel .mic")?.classList.contains("on"))) await W(100); await W(900); };
  // 저장 지우고 시작
  await new Promise(r => { const q = indexedDB.deleteDatabase("malmun"); q.onsuccess = q.onerror = q.onblocked = r; });

  ok(!!line(1).querySelector("[data-act=speak]"), "줄 단추에 [말하기] 있음(쓰기 옆)", line(1).querySelector(".acts").innerText.replace(/\n/g, " · "));
  await open(1);
  const sp = $(".panel .speak"), p = $(".panel").getBoundingClientRect(), btn = $(".panel .sbtns").getBoundingClientRect();
  ok($("#vwrap").offsetHeight === 0 && sp && sp.scrollHeight - sp.clientHeight <= 1 && btn.bottom <= p.bottom + 1, "말하기가 영상 창 자리에 · 창 안 스크롤 없음");
  ok($(".panel .say").textContent === "어서 오세요." && /1\/4/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "과제 = 첫 토막 「어서 오세요.」 · 1/4(토막 3 + 줄 전체)", $(".panel .say").textContent + " " + $(".panel .segnav").innerText.replace(/\s/g, ""));
  ok($(".panel [data-act=mine]").disabled && $(".panel [data-act=both]").disabled, "녹음 전에는 [내 목소리]·[비교] 꺼져 있음");
  let at = log.length; $(".panel [data-act=model]").click(); await W(1800);
  ok(log.slice(at).some(e => e.ev === "시작" && /_01_p01\.mp3$/.test(e.name)) && log.slice(at).some(e => e.ev === "끝"), "[본보기] → 그 토막 소리 끝까지", log.slice(at).map(e => e.ev + "(" + e.name.split("/").pop() + ")").join(" → "));
  at = log.length; $(".ctrl [data-act=play]").click(); await W(500); ok(log.slice(at).some(e => e.ev === "시작"), "아래 ▶ = 본보기"); $(".ctrl [data-act=play]").click(); await W(400);
  // 틀리게 말함
  await say("안녕하세요"); ok(micAsked === 1 && $(".panel .mic").classList.contains("on"), "[말하기] → 마이크 허락 1번 · 녹음 중 표시");
  await waitIdle();
  ok(!$(".panel .mic").classList.contains("on"), "말이 끝나고 조용하면 저절로 멈춤");
  ok(/50%/.test($(".panel .msg").textContent) && !$(".panel .meter").classList.contains("pass") && /1\/4/.test($(".panel .segnav").innerText.replace(/\s/g, "")), "다르게 말함 → 50% · 통과 아님 · 그 자리에 있음(막지 않음)", $(".panel .msg").textContent);
  ok(!$(".panel [data-act=mine]").disabled, "녹음 뒤 [내 목소리] 켜짐");
  const mp = mediaPlays.length; $(".panel [data-act=mine]").click(); await W(600); ok(mediaPlays.length > mp && mediaPlays[mediaPlays.length - 1] === "blob:", "[내 목소리] → 방금 녹음 재생");
  // 맞게 말함 → 통과 · 저장 · 다음 토막
  await say("어서 오세요"); await waitIdle();
  ok(/100%/.test($(".panel .msg").textContent) || /2\/4/.test($(".panel .segnav").innerText), "맞게 말함 → 100% ✓", $(".panel .msg").textContent);
  await W(1800);
  ok(/2\/4/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && $(".panel .say").textContent.startsWith("경복궁에"), "통과 1.5초 뒤 다음 토막으로 자동", $(".panel .say").textContent);
  ok(micAsked === 1, "마이크 허락은 처음 한 번만", String(micAsked));
  // 저장 확인: 앞 토막으로 돌아가면 ✓ + 내 목소리 켜짐
  $(".panel [data-seg='-1']").click(); await W(300);
  ok(/1\/4✓/.test($(".panel .segnav").innerText.replace(/\s/g, "")) && !$(".panel [data-act=mine]").disabled, "앞 토막으로 → ✓ 표시 · 저장된 내 목소리 들을 수 있음", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 녹음 중 다시 누르면 멈춤
  await say("어서 오세요", 5000); await W(600); $(".panel [data-act=rec]").click(); await W(1200);
  ok(!$(".panel .mic").classList.contains("on"), "녹음 중 [말하기] 다시 → 멈춤"); await W(1800);
  // 닫았다 다시 열어도 저장이 남음
  line(1).querySelector("[data-act=speak]").click(); await W(500);
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "[말하기] 다시 누름 → 영상으로");
  await open(1);
  ok(/✓/.test($(".panel .segnav").innerText), "다시 열어도 ✓ 와 저장된 녹음이 남아 있음", $(".panel .segnav").innerText.replace(/\s/g, ""));
  // 줄 전체까지 통과 → 다음 줄 말하기
  for (const heard of ["어서 오세요", "경복궁에 온 걸", "환영해요", "어서 오세요 경복궁에 온 걸 환영해요"]) {
    if (!/^1 \//.test($(".panel .whead .sub").textContent)) break;
    await say(heard); await waitIdle(); await W(1900);
  }
  ok(/^2 \//.test($(".panel .whead .sub")?.textContent || ""), "줄 전체까지 통과 → 2번 줄 말하기로 자동", $(".panel .whead .sub")?.textContent);
  // 음성 인식이 없는 기기 → 점수 없이 녹음·비교
  delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
  await open(4);
  await say("아무 말"); await waitIdle();
  ok(!/%/.test($(".panel .msg").textContent) && !$(".panel [data-act=mine]").disabled, "음성 인식 없는 기기 → 점수 없이 녹음되고 [내 목소리]로 비교", $(".panel .msg").textContent);
  window.__mic?.ctx.close();
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = res.join("\n"); console.log(out); return out;
})();
