// 진단 화면 #/diag(본부 10-07 「PC 에선 되는데 폰에선 안 됨」) — 투덜이가 폰에서 열어 사진 한 장 · 「복사」로 글째 보냄
//  기기 · 받아쓰기(인식만 / 녹음+인식 동시) · 마이크(허락 · 실제 적용된 설정 · 장치) · 녹음 형식(지원 · 3초 녹음을 풀 수 있나)
//  소리(AudioContext 상태 · 「가」 소리 · 효과음 · 음성 창고 읽기) · 최근 오류 20개 — 앱 동작은 안 바꿈(시험은 이 화면 안에서만)
import { VERSION } from "../version.js?v=1016.58";
import { esc } from "../text.js?v=1016.58";
import { uiKoBtn } from "../ui.js?v=1016.58";
import { t, tAlt, preloadKoUi } from "../i18n.js?v=1016.58";
import { paths } from "../paths.js?v=1016.58";
import { charsF } from "../data.js?v=1016.58";
import { audioCtx } from "../wake.js?v=1016.58";
import * as sfx from "../sfx.js?v=1016.58";
import { srOnlyMode, setSrOnly, devSR, setDevSR, seqMode, srFailCount, serverMode } from "../recorder.js?v=1016.58";
import * as AP from "../agepolicy.js?v=1016.58"; // 나이·나라 · 켜진/막힌 기능(대표님 10-19 시험 스위치 ?age=15&country=NP)
import { sttReady, sttURL, serverSTT } from "../sttserver.js?v=1016.58";
import { diagCount, clearDiag } from "../diag.js?v=1016.58";
import { errLog, clearErr } from "../errlog.js?v=1016.58";

// 같은 오류(종류·글·주소·자리)는 한 줄로 묶음 — 화면·복사 글 같이(본부 10-12 · 띄엄띄엄 쌓인 version.json 실패 20개)
const errGroups = () => { const g = new Map(); for (const e of errLog()) { const k = [e.kind, e.msg, e.url || "", e.src || "", e.line || ""].join("|"), o = g.get(k); if (o) { o.n += e.n || 1; o.at = e.at; } else g.set(k, { ...e, n: e.n || 1 }); } return [...g.values()].reverse(); };

// 안내 글(제목·설명·닫기·소제목·남은 녹음 안내)만 학습자 말 ⇄ 한국어(본부 10-14 결정) · 표·시험 단추·결과·「복사」 글은 늘 한국어(본부·검사부가 읽음)
//  안내 글 = t(열쇠)(ko 쪽은 각 언어 .ko.json) · ⇄ 때 다시 그리지 않고 retext 가 그 자리에서 바꿈(단추 크기·자리 0px · 다국어부 10-15) · 한국어 고정 칸은 lang="ko"(글꼴 안 흔들림)
const L = k => t(k);

export default async function diag(app) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const res = {}; // 시험 결과(칸 이름 → 글)
  const row = (k, v) => `<tr><th>${esc(k)}</th><td data-k="${esc(k)}">${esc(v ?? "")}</td></tr>`;
  const set = (k, v) => { res[k] = v; const td = app.querySelector(`td[data-k="${CSS.escape(k)}"]`); if (td) td.textContent = v; };
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/ogg;codecs=opus", "audio/aac"];
  const mrTypes = window.MediaRecorder ? types.filter(x => MediaRecorder.isTypeSupported?.(x)).join(", ") || "(없음)" : "MediaRecorder 없음";
  let micPerm = "?"; try { micPerm = (await navigator.permissions?.query({ name: "microphone" }))?.state || "?"; } catch { micPerm = "query 안 됨"; }
  // 받아쓰기만 = 이번 방문만(sessionStorage malmun.srmode) 인지 기기 기억(localStorage malmun.srdev · 7일) 인지 갈라 적음(검사부 10-11)
  const srOff = (() => { try { const t = +sessionStorage.getItem("malmun.srvoff") || 0; return t && Date.now() - t < 600000 ? Math.ceil((600000 - (Date.now() - t)) / 60000) : 0; } catch { return 0; } })(); /* 서버 연속 2번 실패 → 10분 받아쓰기만(본부 10-12) */
  const srSess = (() => { try { return sessionStorage.getItem("malmun.srmode") === "only"; } catch { return false; } })(), srHow = devSR() === "sronly" ? "기기 기억 7일" : srOff ? `서버 연속 실패 → ${srOff}분 더 받아쓰기만` : srSess ? "이번 방문만" : "";
  // 기기 안 받아쓰기(본부 10-19 18세 미만 말하기 조사) — Chrome processLocally · 한국어 언어 팩 상태(available · 내려받기는 안 함)
  let onDev = "기능 없음(이 브라우저)"; if (SR?.available) { try { onDev = `한국어 ${await SR.available({ langs: ["ko-KR"], processLocally: true })} · 서버 받아쓰기 ${await SR.available({ langs: ["ko-KR"], processLocally: false })}`; } catch (e) { onDev = "확인 실패 " + e.message; } }
  const base = {
    "판": VERSION, "주소": location.href.replace(/[?#].*$/, ""), "브라우저": navigator.userAgent, "화면": `${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio}`,
    "받아쓰기 방식": srOnlyMode() ? `받아쓰기만(${srHow}${devSR() === "sronly" ? " — 녹음 소리로 받아쓰기가 연속 2번 안 됨" : ""})` : seqMode() && serverMode() ? `녹음 → 서버 받아쓰기(2안 · 안드로이드 기본 · ${devSR() === "server" ? "이 기기에서 됨 확인 · 기기 기억 7일" : "아직 확인 전"} · 실패하면 이번 방문만 받아쓰기만)` : seqMode() ? `녹음 먼저 → 그 소리로 받아쓰기(${devSR() === "seq-ok" ? "이 기기에서 됨 확인 · 기기 기억 7일" : "아직 확인 전"} · 연속 실패 ${srFailCount()}/2 · 이번 방문만)` : "녹음+받아쓰기 같이", "서버 받아쓰기": sttReady() ? `켜짐 · ${sttURL()}` : "꺼짐(주소 없음)", "받아쓰기 있음": SR ? (window.SpeechRecognition ? "SpeechRecognition" : "webkitSpeechRecognition") : "없음", "마이크 허락": micPerm,
    "기기 안 받아쓰기": onDev,
    "나이 판정": AP.gateOn() ? `${AP.age() ?? "모름"}세 · 나라 ${AP.country() || "모름(가장 엄한 쪽)"}${AP.testMode() ? " · 시험 스위치(?age=off 로 끔)" : ""} · 판 ${AP.POLICY.version}` : "꺼짐(나이 화면 전 · 지금 앱 그대로) · 시험: 주소 끝 ?age=15&country=NP",
    "켜진 기능": AP.table().filter(x => x.ok).map(x => x.ko).join(" · ") || "-",
    "막힌 기능": AP.table().filter(x => !x.ok).map(x => `${x.ko}(${x.min === Infinity ? "보류" : x.min + "세부터"})`).join(" · ") || "없음",
    "18세 미만 받아쓰기": AP.gateOn() && !AP.allowed("sttServer") ? `서버·브라우저 받아쓰기 막음 · 기기 안 한국어 ${AP.onDeviceKo}${AP.onDeviceKo === "available" ? " → 기기 안으로 채점" : " → 채점 없이 녹음·견주기만"}` : "해당 없음",
    "녹음 형식": mrTypes, "AudioContext": (() => { try { return audioCtx().state; } catch (e) { return "만들기 실패 " + e.message; } })(),
    "preservesPitch": "preservesPitch" in HTMLMediaElement.prototype ? "있음" : "webkitPreservesPitch" in HTMLMediaElement.prototype ? "webkit 만" : "없음",
  };
  const tests = [["sr", "받아쓰기만 시험(5초 · 「안녕하세요」라고 말해 보세요)"], ["srrec", "녹음+받아쓰기 동시 시험(5초)"], ["recsr", "녹음 3초 → 그 녹음 소리로 받아쓰기(동시 아님)"], ["srthen", "받아쓰기 먼저(5초) → 끝난 뒤 녹음 3초"], ...(sttReady() ? [["recsrv", "녹음 3초 → 서버 받아쓰기(2안)"]] : []), ["mic", "마이크 열기 · 설정 보기"], ["rec", "3초 녹음 → 풀기 시험"], ["ga", "「가」 소리 틀기"], ["fx", "효과음 틀기"], ["r2", "음성 창고 읽기 시험"]];
  const keys = { sr: "받아쓰기만", srrec: "녹음+받아쓰기", recsr: "녹음→그 소리 받아쓰기", srthen: "받아쓰기→녹음", recsrv: "녹음→서버 받아쓰기", mic: "마이크 설정", rec: "녹음 풀기", ga: "「가」 소리", fx: "효과음", r2: "음성 창고" };
  // 최근 말하기 녹음 5개(본부 10-08 갤럭시 — 녹음/점수 엇박자 · 녹음 소리 줄어듦) — malmun.lastrec(녹음마다 · 재생하면 키움·peak 덧붙음)
  const recRows = () => { let a = []; try { a = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]"); } catch {} const ev = x => { const sr = x.sr || [], n = k => sr.filter(e => String(e).startsWith(k)).length; return `start ${n("start@")} · audiostart ${n("audiostart")} · speechstart ${n("speechstart")} · result ${n("result")} · nomatch ${n("nomatch")}${sr.filter(e => String(e).startsWith("error")).map(e => " · " + e).join("")}${n("restart") ? " · restart " + n("restart") : ""}`; };
    return a.slice().reverse().map(x => [String(x.at || "").slice(11, 19), x.where, `방식 ${x.mode || "?"}`, `끝 ${x.why || "?"}${x.cut ? "(" + x.cut + ")" : ""}`, ev(x), `들음 「${(x.heard || []).slice(-1)[0] || "없음"}」`, `점수 ${x.score ?? "-"}`, `녹음 최대 ${x.maxDb ?? "?"}dB`, x.play || "재생 전", `마이크 뒤 ${x.micAfter || "?"}`, x.seq ? `1번 길: ${x.seq}` : "", `${x.mic || ""} · ${x.set || ""}`, `ctx ${x.ctxRate || "?"}Hz ${x.ctxState || ""}`].join(" | ")); };
  // 「남은 진단 녹음」 안내 문단 = 두 말(모국어·한국어) 중 높은 쪽 높이로 고정(⇄ 때 아래 단추가 위아래로 안 움직임)
  // 머리 줄 제목·설명(.grow)도 두 말 중 높은 쪽 높이로(ur 320 에서 ⇄ 때 아래가 다 밀리던 것 · 다국어부 10-15)
  const keepGrow = () => { const g = app.querySelector(".diag .bar .grow"); if (!g) return; const parts = [[g.querySelector(".t"), "diag_title"], [g.querySelector(".sub"), "diag_hint"]].filter(([e]) => e); g.style.minHeight = ""; const h1 = g.getBoundingClientRect().height, old = parts.map(([e]) => e.textContent); parts.forEach(([e, k]) => { const a = tAlt(k); if (a) e.textContent = a; }); const h2 = g.getBoundingClientRect().height; parts.forEach(([e], i) => (e.textContent = old[i])); g.style.minHeight = Math.max(h1, h2) + "px"; };
  const keepH = () => { keepGrow(); const p = app.querySelector(".dkeep"), s = p?.firstChild; if (!s || s.nodeType !== 3) return; const alt = tAlt("diag_keep"); if (!alt) return; p.style.minHeight = ""; const H = () => p.getBoundingClientRect().height, h1 = H(), v = s.nodeValue; s.nodeValue = v.replace(t("diag_keep"), alt); const h2 = H(); s.nodeValue = v; p.style.minHeight = Math.max(h1, h2) + "px"; };
  const paint = () => {
    const errs = errLog();
    app.innerHTML = `<section class="scr diag"><div class="bar"><div class="grow"><div class="t">${esc(L("diag_title"))}</div><div class="sub">${esc(L("diag_hint"))}</div></div>${uiKoBtn()}<a class="dback" href="#/list">✕ <span data-k="close_word">${esc(L("close_word"))}</span></a></div>
      <table class="dtab" lang="ko">${Object.entries(base).map(([k, v]) => row(k, v)).join("")}${Object.values(keys).map(k => row(k, res[k] ?? "—")).join("")}</table>
      <div class="dbtns" lang="ko">${tests.map(([a, l]) => `<button data-t="${a}">${esc(l)}</button>`).join("")}</div>
      <p class="dkeep">${esc(L("diag_keep"))} <b class="dkeepn">…</b></p><div class="dbtns" lang="ko"><button data-t="cleardiag">진단 녹음 지우기</button></div><h3>${esc(L("diag_h_rec"))}</h3><ol class="derr drec">${recRows().map(x => `<li>${esc(x)}</li>`).join("") || "<li>없음</li>"}</ol>
      <h3>${esc(L("diag_h_nav"))}</h3><ol class="derr">${(() => { try { return JSON.parse(localStorage.getItem("malmun.navlog") || "[]"); } catch { return []; } })().slice().reverse().map(x => `<li>${esc(x)}</li>`).join("") || "<li>없음</li>"}</ol><h3>${esc(L("diag_h_err"))} ${errs.length}</h3><ol class="derr">${(() => { const g = new Map(); for (const e of errs) { const k = [e.kind, e.msg, e.url || "", e.src || "", e.line || ""].join("|"), o = g.get(k); if (o) { o.n += e.n || 1; o.at = e.at; } else g.set(k, { ...e, n: e.n || 1 }); } return [...g.values()].reverse(); })().map(e => `<li>${esc(`${e.kind} ${e.msg}${e.url ? " · " + e.url : ""}${e.src ? " · " + e.src + ":" + e.line : ""}${e.n > 1 ? ` × ${e.n}회 · 마지막 ${e.at}` : ` · ${e.at}`}`)}</li>`).join("") /* 같은 오류는 한 줄로 묶음(× N회 · 마지막 시각 · 본부 10-12) */ || "<li>없음</li>"}</ol>
      <div class="dbtns" lang="ko"><button data-t="copy">복사</button>${srOnlyMode() || devSR() || /Android/i.test(navigator.userAgent) ? '<button data-t="srboth">1번 길(녹음 → 그 소리로 받아쓰기) 다시 시험 · 기기 기억 지우기</button>' : ""}<button data-t="clr">오류 지우기</button></div><p class="dmsg"></p></section>`;
    diagCount().then(n => { const b = app.querySelector(".dkeepn"); if (b) b.textContent = String(n); }); /* 진단 녹음 개수(본부 10-11) */
    keepH();
  };
  paint(); preloadKoUi().then(() => app.querySelector(".scr.diag") && keepH()); // 한국어판이 늦게 와도 두 말 높이로 다시 잼
  let running = false; // 시험 도는 중(검사부 10-11) — 시험 단추·「오류 지우기」·「다시 시험」 모두 막음(복사만 됨)
  const lock = on => app.querySelectorAll(".diag button[data-t]").forEach(x => { if (x.dataset.t !== "copy") x.disabled = on; });
  const msg = s => { const p = app.querySelector(".dmsg"); if (p) p.textContent = s; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 받아쓰기 한 번 — track 이 있으면 start(track) 를 먼저 해 보고 안 되면 start() · 사건·결과·오류를 한 줄로
  const srOnce = (track, ms = 5000) => new Promise(done => {
    if (!SR) return done("받아쓰기 없음");
    const ev = [], t0 = performance.now(), at = () => Math.round(performance.now() - t0); let heard = "", how = "start()", r;
    try { r = new SR(); } catch (e) { return done("만들기 실패 " + e.message); }
    r.lang = "ko-KR"; r.continuous = true; r.interimResults = true;
    for (const n of ["start", "audiostart", "speechstart", "speechend", "audioend", "end", "nomatch"]) r.addEventListener?.(n, () => ev.push(`${n}@${at()}`));
    r.onerror = e => ev.push(`error:${e.error}@${at()}`);
    r.onresult = e => { heard = Array.from(e.results, x => x[0].transcript).join(" "); };
    try { if (track) { r.start(track); how = "start(track)"; } else r.start(); }
    catch (e) { ev.push(`start(track) 예외 ${e.name}`); try { r.start(); how = "start()"; } catch (e2) { return done(`start 예외 ${e2.name} ${e2.message}`); } }
    setTimeout(() => { try { r.stop(); } catch {} setTimeout(() => done(`${how} · 들음 「${heard || "없음"}」 · ${ev.join(" ")}`), 800); }, ms);
  });
  const onClick = async e => { // 단추 = app 한 곳에서 받음(⇄한 뒤 다시 그려도 안 끊김)
    const b = e.target.closest(".scr.diag [data-t]"); if (!b) return;
    const a = b.dataset.t; try { audioCtx().resume?.(); } catch {}
    if (a === "copy") { const txt = [...app.querySelectorAll(".dtab tr")].map(tr => tr.innerText.replace(/\t/, ": ")).join("\n") + "\n최근 녹음:\n" + recRows().join("\n") + "\n뒤로:\n" + (() => { try { return JSON.parse(localStorage.getItem("malmun.navlog") || "[]").join("\n"); } catch { return ""; } })() + "\n오류:\n" + errGroups().map(e => `${e.kind} ${e.msg}${e.url ? " · " + e.url : ""}${e.n > 1 ? ` × ${e.n}회 · 마지막 ${e.at}` : ` · ${e.at}`}`).join("\n"); /* 복사 글도 같은 오류 한 줄로(본부 10-12) */
      try { await navigator.clipboard.writeText(txt); msg("복사했어요"); } catch { msg("복사 안 됨 — 사진으로 보내 주세요"); } return; }
    if (a === "clr") { if (running) return; clearErr(); paint(); return; }
    if (a === "cleardiag") { if (running) return; await clearDiag(); const n = app.querySelector(".dkeepn"); if (n) n.textContent = String(await diagCount()); msg("진단 녹음을 지웠어요"); return; }
    if (a === "srboth") { if (running) return; setSrOnly(false); setDevSR(null); location.reload(); return; } // 다음 말하기에서 녹음+받아쓰기 같이 다시 시험 · 기기 기억·연속 실패 수 지움
    if (running) return; // 시험은 한 번에 하나(검사부 10-11) — 도는 동안 시험 단추 전부 막음
    running = true; lock(true); msg("시험 중…");
    let s = null; const stopMic = () => { try { s?.getTracks().forEach(x => x.stop()); } catch {} s = null; }; // 마이크는 어느 길이든 finally 에서 닫음(검사부 10-11)
    try {
      if (a === "sr") set(keys.sr, await srOnce(null));
      else if (a === "recsr") { // 녹음 먼저 → 그 녹음을 WebAudio → MediaStreamDestination 트랙으로 틀며 받아쓰기(마이크와 동시 사용 없음)
        s = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r));
        msg("3초 동안 「안녕하세요」라고 말하세요"); rec.start(); await wait(3000); rec.stop(); await stopped; stopMic();
        const ctx = audioCtx(), buf = await ctx.decodeAudioData(await new Blob(ch, { type: rec.mimeType }).arrayBuffer()), dst = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = buf; src.connect(dst);
        msg("녹음 소리로 받아쓰기 중…"); const tr = dst.stream.getAudioTracks()[0]; setTimeout(() => { try { src.start(); } catch {} }, 400);
        const out = await srOnce(tr, Math.ceil(buf.duration * 1000) + 1500); tr.stop(); try { src.stop(); } catch {} set(keys.recsr, `녹음 ${buf.duration.toFixed(1)}초 · ${out}`); }
      else if (a === "recsrv") { // 녹음 3초 → 서버(2안) — 결과 글·낱말 수·걸린 시간 · 녹음은 보내기만(저장 안 함)
        s = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r));
        msg("3초 동안 「안녕하세요」라고 말하세요"); rec.start(); await wait(3000); rec.stop(); await stopped; stopMic(); msg("서버 받아쓰기 중…");
        const blob = new Blob(ch, { type: rec.mimeType || "audio/webm" });
        try { const o = await serverSTT(blob); set(keys.recsrv, `${blob.type} ${blob.size}B · 들음 「${o.text}」 · 낱말 ${o.words.length} · ${o.ms}ms`); } catch (er) { set(keys.recsrv, `실패 ${er.code || er.message}${er.msg ? " · " + er.msg : ""}`); } }
      else if (a === "srthen") { // 받아쓰기 먼저(마이크 스트림 안 엶 — 동시 사용 시험이 되지 않게 · 검사부 10-11) → 끝난 뒤 마이크 열고 녹음
        msg("5초 동안 말하세요(받아쓰기)"); const o1 = await srOnce(null);
        msg("이제 3초 녹음"); s = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r)); rec.start(); await wait(3000); rec.stop(); await stopped; stopMic();
        let dec = ""; try { const buf = await audioCtx().decodeAudioData(await new Blob(ch, { type: rec.mimeType }).arrayBuffer()); let pk = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); dec = `녹음 ${buf.duration.toFixed(1)}초 최대 ${(20 * Math.log10(pk || 1e-9)).toFixed(1)}dB`; } catch (er) { dec = "녹음 풀기 실패 " + er.name; }
        set(keys.srthen, `${o1} → ${dec}`); }
      else if (a === "srrec" || a === "mic" || a === "rec") {
        s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tr = s.getAudioTracks()[0], gs = tr.getSettings?.() || {};
        if (a === "mic") { const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput").map(d => d.label || "(이름 없음)");
          set(keys.mic, `${tr.label} · echo ${gs.echoCancellation} · noise ${gs.noiseSuppression} · agc ${gs.autoGainControl} · ${gs.sampleRate || "?"}Hz ch${gs.channelCount ?? "?"} · 장치 ${devs.join(" / ")}`); }
        else if (a === "srrec") { const rec = new MediaRecorder(s); rec.start(); const clone = tr.clone?.(); try { const out = await srOnce(clone || tr); rec.stop(); set(keys.srrec, `${out} · 녹음 트랙 ${tr.readyState} · 녹음 ${rec.state}`); } finally { clone?.stop(); try { rec.state !== "inactive" && rec.stop(); } catch {} } }
        else { const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r)); rec.start(); await wait(3000); rec.stop(); await stopped;
          const blob = new Blob(ch, { type: rec.mimeType }); let dec = "";
          try { const buf = await audioCtx().decodeAudioData(await blob.arrayBuffer()); let pk = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); dec = `풀림 ${buf.duration.toFixed(2)}초 · 최대 ${(20 * Math.log10(pk || 1e-9)).toFixed(1)}dB`; }
          catch (er) { dec = "풀기 실패 " + (er.name || er.message); }
          set(keys.rec, `${rec.mimeType || "?"} · ${blob.size}B · ${dec}`); }
      } else if (a === "ga" || a === "fx") {
        let url; if (a === "ga") { const cf = await charsF("L01-00-01").catch(() => ({})); url = cf?.["가"] ? paths.charF(cf["가"]) : null; } else url = paths.sfx("score_pass");
        if (!url) set(keys[a], "주소 없음"); else { const ctx = audioCtx(), s0 = ctx.state; const ok = await sfx.play(url); set(keys[a], `${ok ? "틀었음" : "못 틂(파일 받기·풀기 실패)"} · ctx ${s0}→${ctx.state} · ${url.split("/").slice(-2).join("/")}`); }
      } else if (a === "r2") {
        const u = paths.sfx("score_pass"); try { const r = await fetch(u + "&diag=" + Date.now(), { cache: "no-store" }); set(keys.r2, `${r.status} · ACAO ${r.headers.get("access-control-allow-origin") || "없음"} · ${(await r.arrayBuffer()).byteLength}B`); }
        catch (er) { set(keys.r2, "읽기 실패 " + er.message + " (CORS?)"); }
      }
      msg("끝");
    } catch (er) { set(keys[a], `실패 ${er.name || ""} ${er.message || er}`); msg("실패"); }
    finally { stopMic(); running = false; lock(false); }
  };
  app.addEventListener("click", onClick);
  // ⇄한 → 화면 글만 다시 그림(시험 결과 res 는 그대로 · 도는 중이면 단추 다시 막음)
  const onUi = () => { if (!app.querySelector(".scr.diag")) return removeEventListener("malmun:uilang", onUi); keepH(); }; // 글은 retext 가 바꿈 · 안내 문단 높이만 두 말 중 큰 쪽으로
  addEventListener("malmun:uilang", onUi);
  return () => { removeEventListener("malmun:uilang", onUi); app.removeEventListener("click", onClick); };
}
