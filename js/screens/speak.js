// 말하기 — 따라 말하고 · 내 목소리를 다시 듣고 · 본보기와 얼마나 같은지 본다(10-01 투덜이 · 본부 전달)
//
// 학습자가 누르면 무엇이 되나
//  S1 과제 = 지금 줄의 토막(쓰기와 같은 고정 토막) 차례 → 마지막에 줄 전체 · ◀ 1/4 ▶ 로 옮김
//  S2 [▶ 본보기] = 그 토막 소리(쓰기의 「이 부분 듣기」와 같은 소리) · 아래 큰 ▶ 도 같다
//  S3 [● 말하기] = 녹음 시작(처음 누를 때만 마이크 허락을 묻는다) → 말이 끝나고 1초 조용하면 저절로 멈춤 · 다시 눌러도 멈춤 · 길어도 8초
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
const recGet = async key => { try { const d = await db(); return await new Promise(res => { const q = d.transaction("rec").objectStore("rec").get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; } };
const recPut = async (key, val) => { try { const d = await db(); await new Promise(res => { const tx = d.transaction("rec", "readwrite"); tx.objectStore("rec").put(val, key); tx.oncomplete = res; tx.onerror = res; }); } catch {} };

export default async function speak(app, ep, id, opts = {}) {
  const d = await episode(ep, lang);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  const parts = (line.units?.parts || []).map(p => ({ key: p.id, text: p.text, say: p.say, src: paths.unit(ep, p.id) }));
  if (parts.length !== 1) parts.push({ key: `${ep}_${String(line.id).padStart(2, "0")}_line`, text: line.ko, say: line.ko, src: lineSrc, whole: true });
  else Object.assign(parts[0], { whole: true });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const st = { i: 0, rec: null, stream: null, blob: null, score: null, saved: {}, busy: false, model: false, alive: true, mine: null };
  for (const p of parts) st.saved[p.key] = await recGet(`${ep}/${p.key}`);

  app.innerHTML = `<section class="scr speak ${opts.embedded ? "embedded" : ""}">
    <div class="whead"><b>${esc(t("speak"))}</b><span class="sub">${li + 1} / ${d.lines.length} · <span class="ko" lang="ko">${esc(line.speaker)}</span></span>
      <span class="segnav"></span></div>
    <div class="task"><div class="say ko" lang="ko"></div><div class="tr"></div></div>
    <div class="meter"><div class="bar"><i></i><em style="left:${PASS}%"></em></div><div class="msg" aria-live="polite"></div></div>
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
    $(".bar i").style.width = (sc ?? 0) + "%";
    $(".meter").classList.toggle("pass", sc != null && sc >= PASS);
    $(".msg").textContent = st.rec ? t("listening") : sc == null ? (mineBlob() ? t("no_score") : SR ? t("speak_hint") : t("speak_hint_noscore"))
      : sc >= PASS ? `${sc}% ✓ ${t("score_pass")}` : `${sc}% · ${t("score_try")}`;
    $("[data-act=mine]").disabled = $("[data-act=both]").disabled = !mineBlob();
    $(".mic").classList.toggle("on", !!st.rec);
    $(".mic .lab").textContent = st.rec ? t("btn_stop") : t("speak_now");
    $("[data-act=model]").setAttribute("aria-pressed", String(st.model));
  }
  function stopSounds() { sfx.stopAll(); st.model = false; if (st.mine) { st.mine.pause(); st.mine = null; } }
  async function playModel() {
    stopSounds(); st.model = true; paint();
    const p = cur();
    if (!(await sfx.play(p.src)) && lineSrc && p.src !== lineSrc) await sfx.play(lineSrc);
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
  async function startRec() {
    stopSounds();
    try { st.stream ||= await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { $(".msg").textContent = t("no_mic"); return; }
    const rec = new MediaRecorder(st.stream), chunks = [];
    st.rec = rec; st.blob = null; st.score = null; heard = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => finish(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    rec.start();
    if (SR) {
      try {
        sr = new SR(); sr.lang = "ko-KR"; sr.interimResults = false; sr.maxAlternatives = 3;
        sr.onresult = e => { for (let i = 0; i < e.results.length; i++) for (let k = 0; k < e.results[i].length; k++) heard.push(e.results[i][k].transcript); };
        sr.onerror = () => {}; sr.start();
      } catch { sr = null; }
    }
    // 말이 끝나고 1초 조용하면 멈춤
    try {
      const ctx = audioCtx(), src = ctx.createMediaStreamSource(st.stream), an = ctx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize); let spoke = false, quietAt = 0;
      meterTimer = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        if (rms > 0.02) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= Date.now(); if (Date.now() - quietAt > QUIET_MS) stopRec(); }
      }, 60);
      rec.addEventListener("stop", () => { clearInterval(meterTimer); try { src.disconnect(); } catch {} }, { once: true });
    } catch {}
    maxTimer = setTimeout(() => stopRec(), MAX_MS);
    paint();
  }
  function stopRec(discard) {
    clearTimeout(maxTimer); clearInterval(meterTimer);
    const rec = st.rec; if (!rec) return;
    st.rec = null;
    if (discard) rec.onstop = null;
    try { sr?.stop(); } catch {}
    try { rec.state !== "inactive" && rec.stop(); } catch {}
    paint();
  }
  async function finish(blob) {
    st.blob = blob;
    if (sr) { // 인식 결과가 조금 늦게 온다
      for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100));
      st.score = heard.length ? Math.max(...heard.map(h => similarity(cur().say, h))) : 0;
    } else st.score = null;
    if (!st.alive) return;
    const p = cur(), old = st.saved[p.key];
    // 저장: 80% 넘은 것(더 높은 점수로만 바꿈) · 점수를 못 재는 곳은 방금 것
    if (st.score == null ? true : st.score >= PASS && st.score >= (old?.score ?? 0)) {
      st.saved[p.key] = { blob, score: st.score, at: Date.now() };
      recPut(`${ep}/${p.key}`, st.saved[p.key]);
    }
    paint();
    if (st.score != null && st.score >= PASS) { // 통과 → 다음으로
      await new Promise(r => setTimeout(r, 1500));
      if (!st.alive || st.rec || cur() !== p) return;
      if (st.i < parts.length - 1) go(st.i + 1);
      else if (li < d.lines.length - 1) opts.embedded ? opts.onNext?.(li + 1) : (location.hash = `#/speak/${ep}/${d.lines[li + 1].id}`);
    }
  }
  app.__sp = { toggle: () => (st.model ? (stopSounds(), paint()) : playModel()), busy: () => !!st.rec || st.model || sfx.playing(), _finish: finish, _state: st };

  app.querySelector(".scr").onclick = async e => {
    const sg = e.target.closest("[data-seg]");
    if (sg) return go(st.i + +sg.dataset.seg);
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "model") { stopRec(true); st.model ? (stopSounds(), paint()) : playModel(); }
    else if (a === "rec") st.rec ? stopRec() : startRec();
    else if (a === "mine") { stopRec(true); playMine(); }
    else if (a === "both") { stopRec(true); await playModel(); if (st.alive) await new Promise(r => setTimeout(r, 300)), playMine(); }
  };

  paint();
  sfx.preload([lineSrc, ...parts.map(p => p.src)]);
  const release = hold();
  return () => { st.alive = false; stopRec(true); stopSounds(); st.stream?.getTracks().forEach(x => x.stop()); release(); delete app.__sp; };
}
