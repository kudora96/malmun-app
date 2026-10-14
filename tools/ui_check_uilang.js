// 언어 하나 점검(본부 10-13 투덜이 지적 ① · 안 A) — #/learn/L01-00-01 을 연 채로 · 학습자 말이 KO_UI 언어(ne·vi·th·ur)일 때만 · 소리 아주 작게 · 마이크·받아쓰기 가짜
// ⓐ 설명 듣는 중 ▶ 학습자 말 → 화면 앱 글에 한국어 0 · 소리 안 끊기고 학습자 말 소리로 · 다시 그리지 않음(같은 패널 그대로)
// ⓑ ▶ 한국어 → 앱 글에 학습자 글자 0 · 한국어 소리
// ⓒ 머리 「⇄한」 토글 = 설명 소리·본문도 같이(듣는 중) · ⓓ 말해 보기 결과 뒤 바꾸기 → 결과 줄도 그 언어 · ⓔ 녹음 중 바꾸기 → 녹음 안 끊김 · 결과도 새 언어
// 배우는 내용(대사·낱말·설명 본문·학습자 말 뜻·「」 안 한국어 낱말·언어 이름)은 빼고 셈
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const v = document.documentElement.dataset.v, I = await import(`/js/i18n.js?v=${v}`), LANG = I.lang;
  if (!I.KO_UI.includes(LANG)) return `✓ 언어 하나: ${LANG} 는 ⇄한 없음 — 건너뜀`;
  window.__sfxVolume = 0.0001; window.__noRhythm = true; window.__noSrSwitch = true;
  const SCRIPT = { ne: /[ऀ-ॿ]/, vi: /[ăâđêôơưạ-ỹ]/i, th: /[฀-๿]/, ur: /[؀-ۿ]/ }[LANG];
  const CONTENT = "[lang=ko], .kotext, .ko, .v9body, .glosses, .saybig, .tr, .rom, .mean, .who, .vsub, .vtitle, .v9bar [data-x=ex], [data-act=uiko], .toast.uikotip, .pairln, .lines .line:not(.cur), video, .heard"; // .toast.uikotip = 한국어로 바꾼 직후 모국어 「돌아오는 길」 안내(일부러 모국어 · 다국어부 10-14)
  const strip = s => s.replace(/「[^」]*」|⁨[^⁩]*⁩|"[^"]*"/g, "");
  const left = re => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { const p = n.parentElement; if (!p || !p.getClientRects().length || p.closest(CONTENT) || p.closest("[hidden]")) continue; if (re.test(strip(n.nodeValue))) out.push(`${p.tagName.toLowerCase()}.${String(p.className).split(" ")[0]}「${n.nodeValue.trim().slice(0, 20)}」`); } return out; };
  const HANGUL = /[가-힣]/;
  const HAS_L = LANG === "ne"; // 학습자 말 설명 소리가 있는 언어(시범 언어는 아직 글만 → 한국어 소리로 대신 · 언어부 10-12)
  const isKr = a => /_kr_|새설명_소리_kr/.test(decodeURIComponent(a?.src || ""));
  const media = new Set(), op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { media.add(this); return op.call(this); }; // new Audio() 는 문서에 없음 — 튼 것을 모아 둠
  const playing = () => [...media].find(a => !a.paused && a.tagName !== "VIDEO");
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition };
  let mic = null; const ctxP = import(`/js/wake.js?v=${v}`).then(m => m.audioCtx());
  try {
    try { sessionStorage.removeItem("malmun.srmode"); localStorage.removeItem("malmun.srdev"); } catch {}
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    navigator.mediaDevices.getUserMedia = async () => { const ctx = await ctxP, dst = ctx.createMediaStreamDestination(), o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(dst); o.start(); mic = { g }; const tr = dst.stream.getAudioTracks()[0], f = tr.stop.bind(tr); tr.stop = () => { f(); try { o.stop(); } catch {} }; return dst.stream; };
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__heard }]] }), 400); this.tm = setTimeout(() => this.onend?.(), 1500); } stop() { clearTimeout(this.tm); setTimeout(() => this.onend?.(), 50); } };
    const talk = async (ms = 1300) => { await W(400); if (mic) { mic.g.gain.value = 0.3; await W(ms); mic.g.gain.value = 0; } };
    // 한국어 모드로 시작
    if (!I.uiKoOn()) { $("[data-act=uiko]").click(); await W(900); }
    $(".panel [data-act=close], .panel [data-x=close]")?.click(); await W(300);
    document.querySelectorAll(".line")[1].querySelector("[data-act=explain]").click(); await W(2500);
    const pnl = $(".panel"), a0 = playing();
    // ⓐ ▶ 학습자 말(듣는 중)
    { const bL = $('.panel .v9bar [data-x=ex][data-v="L"]'); if (bL) bL.click(); else $("[data-act=uiko]").click(); } await W(1500); // 학습자 말 설명 소리가 없는 언어(시범)는 ▶ 학습자 말 단추가 없음 → 머리 토글로
    const a1 = playing(), hl = left(HANGUL);
    ok(!I.uiKoOn() && !hl.length && !!a1 && (!HAS_L || !isKr(a1)) && $(".panel") === pnl, `ⓐ ${LANG} 듣는 중 ▶ 학습자 말 → 앱 글 한국어 0 · 소리 이어서(학습자 말) · 다시 안 그림`, `uiKo ${I.uiKoOn()} · 한국어 남음 ${hl.length} ${hl.slice(0, 4).join(" ")} · 소리 ${a0 ? "있었음" : "없었음"}→${a1 ? decodeURIComponent(a1.src.split("/").pop()).slice(0, 30) : "없음"}`);
    // ⓑ ▶ 한국어
    $('.panel .v9bar [data-x=ex][data-v="ko"]')?.click(); await W(1500);
    const a2 = playing(), sl = left(SCRIPT);
    ok(I.uiKoOn() && !sl.length && !!a2 && isKr(a2), `ⓑ ▶ 한국어 → 앱 글에 ${LANG} 글자 0 · 한국어 소리`, `uiKo ${I.uiKoOn()} · ${LANG} 남음 ${sl.length} ${sl.slice(0, 4).join(" ")} · 소리 ${a2 ? decodeURIComponent(a2.src.split("/").pop()).slice(0, 30) : "없음"}`);
    // ⓒ 머리 토글(듣는 중) = 설명 소리·본문도
    $("[data-act=uiko]").click(); await W(1500);
    const a3 = playing(), hl3 = left(HANGUL), sel = $('.panel .v9bar [data-x=ex][aria-pressed=true]')?.dataset.v ?? (HAS_L ? null : "L");
    ok(!I.uiKoOn() && !hl3.length && !!a3 && (!HAS_L || !isKr(a3)) && (sel === "L" || !HAS_L) && $(".panel") === pnl, "ⓒ 머리 ⇄한 토글(듣는 중) → 앱 글·설명 소리·▶ 표시 모두 학습자 말 · 다시 안 그림", `uiKo ${I.uiKoOn()} · 한국어 남음 ${hl3.length} ${hl3.slice(0, 3).join(" ")} · ▶ ${sel} · 소리 ${a3 ? decodeURIComponent(a3.src.split("/").pop()).slice(0, 30) : "없음"}`);
    // ⓓ 말해 보기 결과 뒤 바꾸기
    const rec = () => $(".panel .sayb [data-x=rec]");
    window.__heard = $(".panel .saybig")?.textContent?.trim() || "저 글자 만들었어요";
    rec().click(); talk(); for (let k = 0; k < 80 && rec().classList.contains("on"); k++) await W(150); for (let k = 0; k < 120 && !/%/.test($(".panel .sayb .smsg")?.textContent || ""); k++) await W(150);
    const m0 = $(".panel .sayb .smsg").textContent;
    $('.panel .v9bar [data-x=ex][data-v="ko"]')?.click(); await W(1200);
    const m1 = $(".panel .sayb .smsg").textContent;
    ok(/%/.test(m0) && /%/.test(m1) && !SCRIPT.test(strip(m1)) && m0 !== m1, "ⓓ 말해 보기 결과 뒤 ▶ 한국어 → 결과 줄도 한국어(점수 그대로)", `「${m0.slice(0, 40)}」 → 「${m1.slice(0, 40)}」`);
    // ⓔ 녹음 중 바꾸기 → 녹음 안 끊김 · 결과 = 새 언어
    rec().click(); await W(900); const on1 = rec().classList.contains("on");
    $("[data-act=uiko]").click(); await W(500); const on2 = rec().classList.contains("on");
    await talk(); for (let k = 0; k < 80 && rec().classList.contains("on"); k++) await W(150); for (let k = 0; k < 120 && !/%/.test($(".panel .sayb .smsg")?.textContent || ""); k++) await W(150);
    const m2 = $(".panel .sayb .smsg").textContent, hl5 = left(HANGUL);
    ok(on1 && on2 && /%/.test(m2) && !HANGUL.test(strip(m2)) && !hl5.length, "ⓔ 녹음 중 ⇄한 → 녹음 안 끊김 · 결과 줄·앱 글 학습자 말", `녹음 ${on1}→${on2} · 「${m2.slice(0, 40)}」 · 한국어 남음 ${hl5.length} ${hl5.slice(0, 3).join(" ")}`);
  } catch (e) { ok(false, "점검 도중 오류 " + e.message); }
  finally {
    navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR;
    try { await I.setUiKo(false); } catch {}
    $(".panel [data-act=close], .panel [data-x=close]")?.click(); document.querySelectorAll("audio").forEach(a => a.pause());
  }
  const bad = res.filter(r => r.startsWith("✗")).length;
  return [`${bad ? "✗" : "✓"} 언어 하나 ${res.length - bad}/${res.length} (${LANG})`, ...res].join("\n");
})();
