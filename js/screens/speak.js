// 말하기 — 따라 말하고 · 내 목소리를 다시 듣고 · 본보기와 얼마나 같은지 본다(10-01 투덜이 · 본부 전달)
//
// 학습자가 누르면 무엇이 되나
//  S1 과제 = 지금 줄의 토막(쓰기와 같은 고정 토막) 차례 → 줄 전체 → (있으면) 새 설명의 「이제 말해 보세요」 문장 · ◀ 1/4 ▶ 로 옮김
//  S2 [▶ 본보기] = 그 토막 소리(쓰기의 「이 부분 듣기」와 같은 소리) · 아래 큰 ▶ 도 같다
//  S8 줄의 마지막 과제를 통과하면 거기서 끝 — 다음 줄로 저절로 넘어가지 않는다 · [⬇] = 내 녹음을 파일로 · [?] = 사용법 풍선(처음 한 번은 저절로)
//  S3 [● 말하기] = 녹음 시작(처음 누를 때만 마이크 허락을 묻는다) → 말이 끝나고 1초 조용하면 저절로 멈춤 · 다시 눌러도 멈춤 · 길어도 8초
//     녹음 중에는 들어오는 소리 크기를 막대로 보여 준다 · 마이크가 안 열리면 다른 마이크로 자동으로 다시(블루투스가 붙었다 떨어지면 기본 마이크가
//     「장치가 제거됨」으로 안 열린다 — 10-01 투덜이 PC 실측) · 1.5초 동안 신호가 0 이면 다음 마이크로 저절로 바꿔 다시 녹음하고, 소리가 들어온
//     마이크를 기억한다 · 전부 0 일 때만 알리고 고르게 한다 · 🎤 로 언제든 직접 고를 수 있다 · 왜 안 되는지 말해 준다
//  S4 [▶ 내 목소리] = 방금(또는 저장해 둔) 내 말 · [비교] = 본보기 → 내 목소리 이어서
//  S5 점수 = 음성 인식이 되는 곳(크롬 등)에서 알아들은 글자와 대본의 닮음(자모 단위) % — 80% 넘으면 ✓ · 그 녹음을 저장 · 1.5초 뒤 다음 토막으로
//     못 넘어도 막지 않는다([다음 ▶]) · 음성 인식이 안 되는 곳은 점수 없이 듣고 비교만(녹음은 저장)
//  S6 녹음은 이 기기 안에만(IndexedDB) — 서버로 보내지 않는다
//  S7 영상 창 안(embedded): 스크롤 없이 · 줄 이동·닫기는 학습 화면이 한다 · 줄 전체까지 통과하면 다음 줄 말하기로
import { t, lang } from "../i18n.js";
import { esc } from "../text.js";
import { episode } from "../data.js";
import { paths } from "../paths.js";
import { audioCtx, hold } from "../wake.js";
import * as sfx from "../sfx.js";
import { trimSilence } from "../recorder.js";

export const PASS = 80;
const MAX_MS = 8000, QUIET_MS = 1000;

// ── 닮음(자모 단위) ──
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const NUM = { "0": "영", "1": "일", "2": "이", "3": "삼", "4": "사", "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구" };
export function jamoOf(text) {
  let out = "";
  for (const ch of String(text).replace(/500/g, "오백").replace(/[0-9]/g, d => NUM[d])) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c >= 0 && c <= 11171) out += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28];
  }
  return out;
}
export function similarity(want, heard) {
  const a = jamoOf(want), b = jamoOf(heard);
  if (!a.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return Math.max(0, Math.round(100 * (1 - d[a.length][b.length] / Math.max(a.length, b.length))));
}

// ── 내 목소리 저장(S6) ──
const db = () => new Promise((res, rej) => {
  const r = indexedDB.open("malmun", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("rec");
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
export const recGet = async key => { try { const d = await db(); return await new Promise(res => { const q = d.transaction("rec").objectStore("rec").get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; } };
export const recPut = async (key, val) => { try { const d = await db(); await new Promise(res => { const tx = d.transaction("rec", "readwrite"); tx.objectStore("rec").put(val, key); tx.oncomplete = res; tx.onerror = res; }); } catch {} };

export default async function speak(app, ep, id, opts = {}) {
  const d = await episode(ep, lang);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  const parts = (line.units?.parts || []).map(p => ({ key: p.id, text: p.text, say: p.say, src: paths.unit(ep, p.id) }));
  if (parts.length !== 1) parts.push({ key: `${ep}_${String(line.id).padStart(2, "0")}_line`, text: line.ko, say: line.ko, src: lineSrc, whole: true });
  else Object.assign(parts[0], { whole: true });
  // 「이제 말해 보세요. "…"」 과제 — 새 설명이 주는 문장(낱말 하나 바꾼 말)이 있으면 맨 끝에(잠정 필드 subtitles[].say{ko, audio})
  if (line.say) parts.push({ key: `${ep}_${String(line.id).padStart(2, "0")}_say`, text: line.say.ko, say: line.say.ko, src: line.say.src || (line.say.audio ? paths.audio(ep, line.say.audio) : null), task: true });
  if (opts.task === "say" && line.say) parts.startAt = parts.length - 1; // 설명의 「이제 말해 보세요」에서 들어오면 그 과제부터
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const st = { i: parts.startAt || 0, rec: null, stream: null, blob: null, score: null, saved: {}, busy: false, model: false, alive: true, mine: null };
  for (const p of parts) st.saved[p.key] = await recGet(`${ep}/${p.key}`);

  app.innerHTML = `<section class="scr speak ${opts.embedded ? "embedded" : ""}">
    <div class="whead"><b>${esc(t("speak"))}</b><span class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></span>
      <button class="micpick" data-act="help" aria-label="${esc(t("help"))}">?</button><button class="micpick" data-act="save" aria-label="${esc(t("save_rec"))}" title="${esc(t("save_rec"))}" disabled>⬇</button><button class="micpick" data-act="pick" aria-label="${esc(t("mic_pick"))}">🎤</button><span class="segnav"></span></div>
    <div class="miclist" hidden></div>
    <div class="helpbox" hidden>${[1, 2, 3, 4, 5].map(k => `<p>${esc(t("help_sp_" + k))}</p>`).join("")}<p class="x">${esc(t("help_close"))}</p></div>
    <div class="task"><div class="say ko" lang="ko"></div><div class="tr"></div></div>
    <div class="meter"><div class="lvl" hidden><i></i></div><div class="sbar"><i></i><em style="left:${PASS}%"></em></div><div class="msg" aria-live="polite"></div></div>
    <div class="sbtns">
      <button data-act="model">▶ ${esc(t("model"))}</button>
      <button class="mic" data-act="rec"><span class="dot"></span><span class="lab">${esc(t("speak_now"))}</span></button>
      <button data-act="mine" disabled>▶ ${esc(t("my_voice"))}</button>
      <button data-act="both" disabled>${esc(t("compare"))}</button>
    </div>
  </section>`;
  const $ = s => app.querySelector(s);
  const cur = () => parts[st.i];
  const mineBlob = () => st.blob || st.saved[cur().key]?.blob || null;

  function paint() {
    const p = cur(), sv = st.saved[p.key];
    $(".say").textContent = p.text;
    $(".tr").textContent = p.whole ? line.tr || "" : "";
    // 긴 과제(줄 전체)는 창 안에 들어갈 때까지 글자를 줄인다 — 스크롤 없이(S7)
    const say = $(".say"), task = $(".task"), tr = $(".tr");
    say.style.fontSize = ""; tr.hidden = false;
    for (let fs = 26; task.scrollHeight > task.clientHeight + 1 && fs >= 15; fs -= 1) say.style.fontSize = fs + "px";
    if (task.scrollHeight > task.clientHeight + 1) tr.hidden = true; // 그래도 넘치면 번역 줄을 접는다(아래 말풍선에 있다)
    $(".segnav").innerHTML = parts.length > 1
      ? `<button data-seg="-1" ${st.i ? "" : "disabled"} aria-label="${esc(t("previous"))}">◀</button><span>${st.i + 1}/${parts.length}${sv?.score >= PASS ? " ✓" : ""}</span><button data-seg="1" ${st.i < parts.length - 1 ? "" : "disabled"} aria-label="${esc(t("next"))}">▶</button>` : "";
    const sc = st.score ?? sv?.score ?? null;
    $(".sbar i").style.width = (sc ?? 0) + "%";
    $(".meter").classList.toggle("pass", sc != null && sc >= PASS);
    $(".msg").textContent = st.rec ? t(st.switched ? "mic_switched" : "listening") : sc == null ? (mineBlob() ? t("no_score") : SR ? t("speak_hint") : t("speak_hint_noscore"))
      : `${sc}%${sc >= PASS ? " ✓" : ""} · ${t(sc >= 95 ? "score_5" : sc >= PASS ? "score_4" : sc >= 60 ? "score_3" : sc >= 40 ? "score_2" : "score_1")}`; // 점수에 맞는 한마디
    $("[data-act=mine]").disabled = $("[data-act=both]").disabled = $("[data-act=save]").disabled = !mineBlob();
    $(".mic").classList.toggle("on", !!st.rec);
    $(".mic .lab").textContent = st.rec ? t("btn_stop") : t("speak_now");
    $("[data-act=model]").setAttribute("aria-pressed", String(st.model));
  }
  function stopSounds() { sfx.stopAll(); st.model = false; if (st.mine) { st.mine.pause(); st.mine = null; } }
  async function playModel() {
    stopSounds(); st.model = true; paint();
    const p = cur();
    if (!(p.src && (await sfx.play(p.src))) && lineSrc && p.src !== lineSrc && !p.task) await sfx.play(lineSrc);
    st.model = false; if (st.alive) paint();
  }
  const playMine = () => new Promise(res => {
    const b = mineBlob(); if (!b) return res();
    stopSounds();
    const a = (st.mine = new Audio(URL.createObjectURL(b)));
    a.onended = a.onerror = () => { URL.revokeObjectURL(a.src); if (st.mine === a) st.mine = null; res(); };
    a.play().catch(() => res());
  });
  function go(i) { stopRec(true); stopSounds(); st.i = Math.max(0, Math.min(parts.length - 1, i)); st.blob = null; st.score = null; paint(); }

  // ── 녹음 + 음성 인식(S3 · S5) ──
  let sr = null, heard = [], quietTimer = 0, maxTimer = 0, meterTimer = 0;
  // 마이크 열기 — 고른 마이크 → 기본 → 나머지 차례로(하나가 안 열려도 다음 것으로)
  const micPref = v => { try { if (v === undefined) return localStorage.getItem("malmun.mic"); v ? localStorage.setItem("malmun.mic", v) : localStorage.removeItem("malmun.mic"); } catch { return null; } };
  const openOne = c => Promise.race([navigator.mediaDevices.getUserMedia({ audio: c }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 8000))]);
  // 크롬의 「기본」은 윈도우 기본 마이크가 아닐 수 있다(크롬이 따로 고른다 — 10-01 투덜이 PC: 소리가 0 인 블루투스가 잡힘).
  // 그래서 열어 보고 소리가 0 이면 그 마이크를 dead 에 적고 다음 마이크로 넘어간다 · 소리가 들어온 마이크는 기억한다.
  const dead = new Set();
  const devId = s => s?.getAudioTracks()[0]?.getSettings().deviceId || "";
  const closeMic = () => { st.stream?.getTracks().forEach(x => x.stop()); st.stream = null; };
  async function openMic() {
    if (st.stream?.getAudioTracks()[0]?.readyState === "live") return st.stream;
    st.stream = null;
    let last = null, devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId).map(x => x.deviceId); } catch {}
    const tries = [...new Set([micPref() || true, true, ...devs])];
    for (const c of tries) {
      if (dead.has(c)) continue;
      try {
        const s = await openOne(c === true ? true : { deviceId: { exact: c } });
        if (dead.has(devId(s))) { s.getTracks().forEach(x => x.stop()); continue; } // 이름만 다른 같은 마이크
        st.micReq = c;
        return (st.stream = s);
      } catch (e) {
        last = e;
        if (e.name === "NotAllowedError" || e.name === "SecurityError") break; // 허락을 안 한 것 — 다른 장치로 해도 같다
      }
    }
    throw last || Object.assign(new Error("silent"), { name: "SilentError" }); // 열리는 마이크마다 소리가 0
  }
  const micWhy = e => t(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "mic_denied" : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "mic_none" : "mic_busy");
  async function showMics(note) {
    const box = $(".miclist");
    if (!box.hidden && !note) { box.hidden = true; return; }
    let devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId); } catch {}
    box.innerHTML = (note ? `<p>${esc(note)}</p>` : "") + (devs.length ? devs.map((d, k) => `<button data-mic="${esc(d.deviceId)}" aria-pressed="${[micPref(), devId(st.stream)].includes(d.deviceId)}">${esc(d.label || t("mic_pick") + " " + (k + 1))}</button>`).join("") : `<p>${esc(t("mic_none"))}</p>`);
    box.hidden = false;
  }
  async function startRec(switched) {
    stopSounds();
    st.switched = !!switched;
    $(".msg").textContent = t("mic_opening");
    try { await openMic(); }
    catch (e) {
      if (e.name === "SilentError") { dead.clear(); $(".msg").textContent = t("mic_silent"); showMics(t("mic_silent")); }
      else $(".msg").textContent = micWhy(e);
      return;
    }
    if (!st.alive) return;
    const rec = new MediaRecorder(st.stream), chunks = [];
    st.rec = rec; st.blob = null; st.score = null; heard = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => finish(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    rec.start();
    if (SR) {
      try {
        // continuous + 중간 결과 — 그냥 두면 짧은 말을 「글자」에서 끊고 「예요」를 버린다(10-01 본보기 소리로 실측: 글자예요 → 글자 56%)
        sr = new SR(); sr.lang = "ko-KR"; sr.continuous = true; sr.interimResults = true; sr.maxAlternatives = 3;
        sr.onresult = e => {
          const rs = Array.from(e.results, r => Array.from(r));
          for (const r of rs) for (const alt of r) heard.push(alt.transcript);
          if (rs.length > 1) heard.push(rs.map(r => r[0].transcript).join(" ")); // 여러 도막으로 나뉘어 온 말을 이어서도 본다
        };
        sr.onerror = () => {};
        // 녹음하는 바로 그 마이크로 알아듣게 한다 — 그냥 start() 는 크롬 기본 마이크(소리 0 인 블루투스일 수 있다)를 듣는다
        try { sr.start(st.stream.getAudioTracks()[0]); } catch { sr.start(); }
      } catch { sr = null; }
    }
    // 말이 끝나고 1초 조용하면 멈춤
    try {
      const ctx = audioCtx(), src = ctx.createMediaStreamSource(st.stream), an = ctx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize); let spoke = false, quietAt = 0, peak = 0, kept = false, liveMs = 0, lastT = ctx.currentTime, lastAt = Date.now();
      const DEAD_MS = switched ? 2500 : 1500; // 마이크를 바꾼 직후에는 소리 장치가 자리 잡을 시간을 더 준다(블루투스가 통화 모드로 바뀌며 잠깐 끊긴다)
      const lvl = $(".lvl"); lvl.hidden = false;
      const timer = (meterTimer = setInterval(() => {
        // 소리 엔진이 실제로 돌아간 시간만 센다 — 엔진이 멈춰 있으면(새로 고친 직후 · 장치가 바뀌는 중) 산 마이크도 0 으로 보인다
        const now = Date.now(); if (ctx.state === "running" && ctx.currentTime > lastT) liveMs += now - lastAt; else if (ctx.state !== "running") ctx.resume().catch(() => {});
        lastT = ctx.currentTime; lastAt = now;
        an.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        peak = Math.max(peak, rms);
        lvl.firstElementChild.style.width = Math.min(100, Math.round(rms * 500)) + "%"; // 들어오는 소리 크기
        // 바꿔서 연 마이크에 신호가 있으면(말하기 전이라도) 기억 — 다음에는 죽은 마이크를 다시 거치지 않는다
        if (st.switched && !kept && peak >= 0.0002 && liveMs > DEAD_MS) { kept = true; micPref(devId(st.stream) || (st.micReq !== true && st.micReq) || ""); }
        if (rms > 0.02 && !spoke) micPref(devId(st.stream) || (st.micReq !== true && st.micReq) || ""); // 소리가 들어온 마이크를 기억
        if (rms > 0.02) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= Date.now(); if (Date.now() - quietAt > QUIET_MS) stopRec(); }
        // 1.5초 동안 신호가 아예 0 이면(꺼진 마이크 · 소리 없는 블루투스 — 조용한 방의 산 마이크는 0 이 아니다) 다음 마이크로 바꿔 다시 녹음
        if (!spoke && peak < 0.0002 && liveMs > DEAD_MS) { dead.add(st.micReq); if (devId(st.stream)) dead.add(devId(st.stream)); stopRec(true); closeMic(); startRec(true); }
      }, 60));
      rec.addEventListener("stop", () => { clearInterval(timer); // 내 것만 끈다 — 마이크를 바꿔 새로 시작한 녹음의 것을 끄면 안 된다
        try { src.disconnect(); } catch {} }, { once: true });
    } catch {}
    maxTimer = setTimeout(() => stopRec(), MAX_MS);
    paint();
  }
  function stopRec(discard) {
    clearTimeout(maxTimer); clearInterval(meterTimer);
    const lv = $(".lvl"); if (lv) lv.hidden = true;
    const rec = st.rec; if (!rec) return;
    st.rec = null;
    if (discard) rec.onstop = null;
    try { sr?.stop(); } catch {}
    try { rec.state !== "inactive" && rec.stop(); } catch {}
    paint();
  }
  async function finish(blob) {
    blob = (await trimSilence(blob)).blob; // 앞뒤 무음 잘라내기(마이크가 열리는 동안의 빈 소리 — 본부 10-03)
    st.blob = blob;
    if (sr) { // 인식 결과가 조금 늦게 온다
      for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100));
      st.score = heard.length ? Math.max(...heard.map(h => similarity(cur().say, h))) : null; // 못 알아들었으면 0% 가 아니라 점수 없음
    } else st.score = null;
    if (!st.alive) return;
    const p = cur(), old = st.saved[p.key];
    // 저장: 80% 넘은 것(더 높은 점수로만 바꿈) · 점수를 못 재는 곳은 방금 것
    if (st.score == null ? !(old?.score >= PASS) : st.score >= PASS && st.score >= (old?.score ?? 0)) {
      st.saved[p.key] = { blob, score: st.score, at: Date.now() };
      recPut(`${ep}/${p.key}`, st.saved[p.key]);
    }
    paint();
    if (st.score != null && st.score >= PASS) { // 통과 → 다음으로
      await new Promise(r => setTimeout(r, 1500));
      if (!st.alive || st.rec || cur() !== p) return;
      if (st.i < parts.length - 1) go(st.i + 1);
      else $(".msg").textContent = `${st.score}% ✓ · ${t("line_done")}`; // 이 줄 끝 — 다음 줄로 넘어가지 않는다(다음 줄은 학습자가 고른다)
    }
  }
  app.__sp = { toggle: () => (st.model ? (stopSounds(), paint()) : playModel()), busy: () => !!st.rec || st.model || sfx.playing(), _finish: finish, _state: st };

  app.querySelector(".scr").onclick = async e => {
    if (!$(".helpbox").hidden) { $(".helpbox").hidden = true; if (e.target.closest("[data-act=help], .helpbox")) return; } // 풍선은 아무 데나 누르면 닫힘
    const sg = e.target.closest("[data-seg]");
    if (sg) return go(st.i + +sg.dataset.seg);
    const mc = e.target.closest("[data-mic]");
    if (mc) { // 마이크 고르기 → 기억하고 다음 녹음부터 그 마이크
      micPref(mc.dataset.mic); dead.clear();
      stopRec(true); closeMic();
      $(".miclist").hidden = true; $(".msg").textContent = t("mic_chosen");
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "pick") { stopRec(true); return showMics(); }
    if (a === "help") { stopRec(true); $(".miclist").hidden = true; $(".helpbox").hidden = false; return; }
    if (a === "save") { // 내 녹음을 파일로
      const bl = mineBlob(); if (!bl) return;
      const u = URL.createObjectURL(bl), el = document.createElement("a");
      el.href = u; el.download = `malmun_${cur().key}.${/wav/.test(bl.type) ? "wav" : /mp4/.test(bl.type) ? "m4a" : /ogg/.test(bl.type) ? "ogg" : "webm"}`;
      document.body.append(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
      $(".msg").textContent = t("saved_file");
      return;
    }
    if (a === "model") { stopRec(true); st.model ? (stopSounds(), paint()) : playModel(); }
    else if (a === "rec") st.rec ? stopRec() : startRec();
    else if (a === "mine") { stopRec(true); playMine(); }
    else if (a === "both") { stopRec(true); await playModel(); if (st.alive) await new Promise(r => setTimeout(r, 300)), playMine(); }
  };

  paint();
  try { if (!localStorage.getItem("malmun.sp.help")) { localStorage.setItem("malmun.sp.help", "1"); $(".helpbox").hidden = false; } } catch {} // 처음 한 번은 풍선이 저절로
  sfx.preload([lineSrc, ...parts.map(p => p.src)]);
  const release = hold();
  return () => { st.alive = false; stopRec(true); stopSounds(); st.stream?.getTracks().forEach(x => x.stop()); release(); delete app.__sp; };
}
