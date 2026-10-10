// 진단 화면 #/diag(본부 10-07 「PC 에선 되는데 폰에선 안 됨」) — 투덜이가 폰에서 열어 사진 한 장 · 「복사」로 글째 보냄
//  기기 · 받아쓰기(인식만 / 녹음+인식 동시) · 마이크(허락 · 실제 적용된 설정 · 장치) · 녹음 형식(지원 · 3초 녹음을 풀 수 있나)
//  소리(AudioContext 상태 · 「가」 소리 · 효과음 · 음성 창고 읽기) · 최근 오류 20개 — 앱 동작은 안 바꿈(시험은 이 화면 안에서만)
import { VERSION } from "../version.js?v=1010.23";
import { esc } from "../text.js?v=1010.23";
import { paths } from "../paths.js?v=1010.23";
import { charsF } from "../data.js?v=1010.23";
import { audioCtx } from "../wake.js?v=1010.23";
import * as sfx from "../sfx.js?v=1010.23";
import { srOnlyMode, setSrOnly } from "../recorder.js?v=1010.23";
import { errLog, clearErr } from "../errlog.js?v=1010.23";

export default async function diag(app) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const res = {}; // 시험 결과(칸 이름 → 글)
  const row = (k, v) => `<tr><th>${esc(k)}</th><td data-k="${esc(k)}">${esc(v ?? "")}</td></tr>`;
  const set = (k, v) => { res[k] = v; const td = app.querySelector(`td[data-k="${CSS.escape(k)}"]`); if (td) td.textContent = v; };
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/ogg;codecs=opus", "audio/aac"];
  const mrTypes = window.MediaRecorder ? types.filter(x => MediaRecorder.isTypeSupported?.(x)).join(", ") || "(없음)" : "MediaRecorder 없음";
  let micPerm = "?"; try { micPerm = (await navigator.permissions?.query({ name: "microphone" }))?.state || "?"; } catch { micPerm = "query 안 됨"; }
  const base = {
    "판": VERSION, "주소": location.href.replace(/[?#].*$/, ""), "브라우저": navigator.userAgent, "화면": `${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio}`,
    "받아쓰기 방식": srOnlyMode() ? "받아쓰기만(이 기기는 녹음과 같이 안 됨으로 기억)" : "녹음+받아쓰기 같이", "받아쓰기 있음": SR ? (window.SpeechRecognition ? "SpeechRecognition" : "webkitSpeechRecognition") : "없음", "마이크 허락": micPerm,
    "녹음 형식": mrTypes, "AudioContext": (() => { try { return audioCtx().state; } catch (e) { return "만들기 실패 " + e.message; } })(),
    "preservesPitch": "preservesPitch" in HTMLMediaElement.prototype ? "있음" : "webkitPreservesPitch" in HTMLMediaElement.prototype ? "webkit 만" : "없음",
  };
  const tests = [["sr", "받아쓰기만 시험(5초 · 「안녕하세요」라고 말해 보세요)"], ["srrec", "녹음+받아쓰기 동시 시험(5초)"], ["recsr", "녹음 3초 → 그 녹음 소리로 받아쓰기(동시 아님)"], ["srthen", "받아쓰기 먼저(5초) → 끝난 뒤 녹음 3초"], ["mic", "마이크 열기 · 설정 보기"], ["rec", "3초 녹음 → 풀기 시험"], ["ga", "「가」 소리 틀기"], ["fx", "효과음 틀기"], ["r2", "음성 창고 읽기 시험"]];
  const keys = { sr: "받아쓰기만", srrec: "녹음+받아쓰기", recsr: "녹음→그 소리 받아쓰기", srthen: "받아쓰기→녹음", mic: "마이크 설정", rec: "녹음 풀기", ga: "「가」 소리", fx: "효과음", r2: "음성 창고" };
  // 최근 말하기 녹음 5개(본부 10-08 갤럭시 — 녹음/점수 엇박자 · 녹음 소리 줄어듦) — malmun.lastrec(녹음마다 · 재생하면 키움·peak 덧붙음)
  const recRows = () => { let a = []; try { a = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]"); } catch {} const ev = x => { const sr = x.sr || [], n = k => sr.filter(e => String(e).startsWith(k)).length; return `start ${n("start@")} · audiostart ${n("audiostart")} · speechstart ${n("speechstart")} · result ${n("result")} · nomatch ${n("nomatch")}${sr.filter(e => String(e).startsWith("error")).map(e => " · " + e).join("")}${n("restart") ? " · restart " + n("restart") : ""}`; };
    return a.slice().reverse().map(x => [String(x.at || "").slice(11, 19), x.where, `방식 ${x.mode || "?"}`, `끝 ${x.why || "?"}${x.cut ? "(" + x.cut + ")" : ""}`, ev(x), `들음 「${(x.heard || []).slice(-1)[0] || "없음"}」`, `점수 ${x.score ?? "-"}`, `녹음 최대 ${x.maxDb ?? "?"}dB`, x.play || "재생 전", `마이크 뒤 ${x.micAfter || "?"}`, `${x.mic || ""} · ${x.set || ""}`, `ctx ${x.ctxRate || "?"}Hz ${x.ctxState || ""}`].join(" | ")); };
  const paint = () => {
    const errs = errLog();
    app.innerHTML = `<section class="scr diag"><div class="bar"><div class="grow"><div class="t">진단 · Diagnostics</div><div class="sub">사진 한 장 또는 「복사」로 보내 주세요</div></div><a class="dback" href="#/list">✕ 닫기</a></div>
      <table class="dtab">${Object.entries(base).map(([k, v]) => row(k, v)).join("")}${Object.values(keys).map(k => row(k, res[k] ?? "—")).join("")}</table>
      <div class="dbtns">${tests.map(([a, l]) => `<button data-t="${a}">${esc(l)}</button>`).join("")}</div>
      <h3>최근 말하기 녹음 5개</h3><ol class="derr drec">${recRows().map(x => `<li>${esc(x)}</li>`).join("") || "<li>없음</li>"}</ol>
      <h3>뒤로 가기 기록</h3><ol class="derr">${(() => { try { return JSON.parse(localStorage.getItem("malmun.navlog") || "[]"); } catch { return []; } })().slice().reverse().map(x => `<li>${esc(x)}</li>`).join("") || "<li>없음</li>"}</ol><h3>최근 오류 ${errs.length}개</h3><ol class="derr">${errs.slice().reverse().map(e => `<li>${esc(`${e.at} ${e.kind} ${e.msg}${e.url ? " · " + e.url : ""}${e.src ? " · " + e.src + ":" + e.line : ""}`)}</li>`).join("") || "<li>없음</li>"}</ol>
      <div class="dbtns"><button data-t="copy">복사</button>${srOnlyMode() ? '<button data-t="srboth">다시 같이 시험(받아쓰기만 끄기)</button>' : ""}<button data-t="clr">오류 지우기</button></div><p class="dmsg"></p></section>`;
  };
  paint();
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
  app.querySelector(".diag").addEventListener("click", async e => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    const a = b.dataset.t; try { audioCtx().resume?.(); } catch {}
    if (a === "copy") { const txt = [...app.querySelectorAll(".dtab tr")].map(tr => tr.innerText.replace(/\t/, ": ")).join("\n") + "\n최근 녹음:\n" + recRows().join("\n") + "\n뒤로:\n" + (() => { try { return JSON.parse(localStorage.getItem("malmun.navlog") || "[]").join("\n"); } catch { return ""; } })() + "\n오류:\n" + errLog().map(e => JSON.stringify(e)).join("\n");
      try { await navigator.clipboard.writeText(txt); msg("복사했어요"); } catch { msg("복사 안 됨 — 사진으로 보내 주세요"); } return; }
    if (a === "clr") { clearErr(); paint(); return; }
    if (a === "srboth") { setSrOnly(false); location.reload(); return; } // 다음 말하기에서 녹음+받아쓰기 같이 다시 시험
    b.disabled = true; msg("시험 중…");
    try {
      if (a === "sr") set(keys.sr, await srOnce(null));
      else if (a === "recsr") { // 녹음 먼저 → 그 녹음을 WebAudio → MediaStreamDestination 트랙으로 틀며 받아쓰기(마이크와 동시 사용 없음)
        const s = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r));
        msg("3초 동안 「안녕하세요」라고 말하세요"); rec.start(); await wait(3000); rec.stop(); await stopped; s.getTracks().forEach(x => x.stop());
        const ctx = audioCtx(), buf = await ctx.decodeAudioData(await new Blob(ch, { type: rec.mimeType }).arrayBuffer()), dst = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = buf; src.connect(dst);
        msg("녹음 소리로 받아쓰기 중…"); const tr = dst.stream.getAudioTracks()[0]; setTimeout(() => { try { src.start(); } catch {} }, 400);
        const out = await srOnce(tr, Math.ceil(buf.duration * 1000) + 1500); tr.stop(); set(keys.recsr, `녹음 ${buf.duration.toFixed(1)}초 · ${out}`); }
      else if (a === "srthen") { // 마이크 열고 받아쓰기 먼저 → 끝난 뒤 녹음
        const s = await navigator.mediaDevices.getUserMedia({ audio: true }); msg("5초 동안 말하세요(받아쓰기)"); const o1 = await srOnce(null);
        msg("이제 3초 녹음"); const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r)); rec.start(); await wait(3000); rec.stop(); await stopped; s.getTracks().forEach(x => x.stop());
        let dec = ""; try { const buf = await audioCtx().decodeAudioData(await new Blob(ch, { type: rec.mimeType }).arrayBuffer()); let pk = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); dec = `녹음 ${buf.duration.toFixed(1)}초 최대 ${(20 * Math.log10(pk || 1e-9)).toFixed(1)}dB`; } catch (er) { dec = "녹음 풀기 실패 " + er.name; }
        set(keys.srthen, `${o1} → ${dec}`); }
      else if (a === "srrec" || a === "mic" || a === "rec") {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tr = s.getAudioTracks()[0], gs = tr.getSettings?.() || {};
        if (a === "mic") { const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput").map(d => d.label || "(이름 없음)");
          set(keys.mic, `${tr.label} · echo ${gs.echoCancellation} · noise ${gs.noiseSuppression} · agc ${gs.autoGainControl} · ${gs.sampleRate || "?"}Hz ch${gs.channelCount ?? "?"} · 장치 ${devs.join(" / ")}`); }
        else if (a === "srrec") { const rec = new MediaRecorder(s); rec.start(); const clone = tr.clone?.(); const out = await srOnce(clone || tr); rec.stop(); clone?.stop(); set(keys.srrec, `${out} · 녹음 트랙 ${tr.readyState} · 녹음 ${rec.state}`); }
        else { const rec = new MediaRecorder(s), ch = []; rec.ondataavailable = x => x.data.size && ch.push(x.data); const stopped = new Promise(r => (rec.onstop = r)); rec.start(); await wait(3000); rec.stop(); await stopped;
          const blob = new Blob(ch, { type: rec.mimeType }); let dec = "";
          try { const buf = await audioCtx().decodeAudioData(await blob.arrayBuffer()); let pk = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); dec = `풀림 ${buf.duration.toFixed(2)}초 · 최대 ${(20 * Math.log10(pk || 1e-9)).toFixed(1)}dB`; }
          catch (er) { dec = "풀기 실패 " + (er.name || er.message); }
          set(keys.rec, `${rec.mimeType || "?"} · ${blob.size}B · ${dec}`); }
        s.getTracks().forEach(x => x.stop());
      } else if (a === "ga" || a === "fx") {
        let url; if (a === "ga") { const cf = await charsF("L01-00-01").catch(() => ({})); url = cf?.["가"] ? paths.charF(cf["가"]) : null; } else url = paths.sfx("score_pass");
        if (!url) set(keys[a], "주소 없음"); else { const ctx = audioCtx(), s0 = ctx.state; const ok = await sfx.play(url); set(keys[a], `${ok ? "틀었음" : "못 틂(파일 받기·풀기 실패)"} · ctx ${s0}→${ctx.state} · ${url.split("/").slice(-2).join("/")}`); }
      } else if (a === "r2") {
        const u = paths.sfx("score_pass"); try { const r = await fetch(u + "&diag=" + Date.now(), { cache: "no-store" }); set(keys.r2, `${r.status} · ACAO ${r.headers.get("access-control-allow-origin") || "없음"} · ${(await r.arrayBuffer()).byteLength}B`); }
        catch (er) { set(keys.r2, "읽기 실패 " + er.message + " (CORS?)"); }
      }
      msg("끝");
    } catch (er) { set(keys[a], `실패 ${er.name || ""} ${er.message || er}`); msg("실패"); }
    b.disabled = false;
  });
  return () => {};
}
