// 짧은 녹음 + 알아듣기 — 설명 카드 안 「이제 말해 보세요」(v9 · 본부 10-03 「카드를 떠나지 않음」)
// 말하기 창(screens/speak.js)과 같은 규칙: 고른·기억한 마이크 → 크롬 기본 → 나머지 · 신호가 아예 0 인 마이크(소리 없는 블루투스)는
// 다음 마이크로 넘어가 다시 녹음 · 소리 들어온 마이크 기억(malmun.mic — 말하기 창과 같은 칸) · 인식은 녹음하는 그 마이크를 끝까지(continuous)
// · 말이 끝나고 1초 조용하면 저절로 멈춤 · 길어도 8초.
// TODO(앱 창): speak.js 의 같은 부분을 이 모듈로 합치기 — 지금은 말하기 창 점검(38)을 깨지 않으려고 따로 둠.
import { audioCtx } from "./wake.js?v=1004.5";

const MAX_MS = 8000, QUIET_MS = 1000, DEAD = 0.0002;
const getSR = () => window.SpeechRecognition || window.webkitSpeechRecognition; // 부를 때마다 찾는다(점검이 가짜로 바꿔 끼울 수 있게)
export const canScore = () => !!getSR();
const pref = v => { try { if (v === undefined) return localStorage.getItem("malmun.mic"); v ? localStorage.setItem("malmun.mic", v) : localStorage.removeItem("malmun.mic"); } catch { return null; } };
const dead = new Set();
let stream = null;
const devId = s => s?.getAudioTracks()[0]?.getSettings().deviceId || "";
const openOne = c => Promise.race([navigator.mediaDevices.getUserMedia({ audio: c }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 8000))]);

// 블루투스 마이크는 맨 뒤로 — 열면 이어폰이 통화 모드가 되고 크롬 음성 인식이 못 잡는다(본부 10-04 투덜이 크롬: audio-capture 오류)
// 크롬 사이트 설정이 블루투스를 기본으로 줘도 USB·내장 마이크가 있으면 그걸 먼저 · 블루투스밖에 없을 때만 블루투스
export const isBT = label => /bluetooth|블루투스|hands-?free|headset|수화기|헤드셋|airpods|buds/i.test(label || "");
export async function micCandidates(prefId) {
  let devs = [];
  try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId); } catch {}
  // 「기본값 - …」「커뮤니케이션 - …」은 실제 장치의 별명 — 같은 groupId 의 실제 장치가 있으면 빼고 실제 장치로(투덜이 PC: 둘 다 USB)
  const alias = d => (d.deviceId === "default" || d.deviceId === "communications") && devs.some(x => x !== d && x.groupId && x.groupId === d.groupId && x.deviceId !== "default" && x.deviceId !== "communications");
  devs = devs.filter(d => !alias(d));
  const ok = devs.filter(d => !isBT(d.label)).map(d => d.deviceId), bt = devs.filter(d => isBT(d.label)).map(d => d.deviceId);
  return { list: [...new Set([...(prefId ? [prefId] : []), ...ok, true, ...bt])], ok };
}
// 연 마이크에 실제 신호가 오는지 본다(최대 1.2초 · 첫 샘플이 0 이 아니면 바로 끝) — true 옴 · false 완전 0(죽은 마이크) · null 모름(소리 엔진이 멈춤)
// 완전한 0 만 죽은 것으로 본다 — 조용한 방의 산 마이크는 바닥 소음이 있다. 실제 걸린 시간은 소리 엔진 시계(currentTime)로 잰다(뒤 탭 타이머 느려짐 무관)
export async function probe(s, ms = 1200) {
  let src = null;
  try {
    const ctx = audioCtx();
    if (ctx.state !== "running") { await ctx.resume().catch(() => {}); if (ctx.state !== "running") return null; }
    src = ctx.createMediaStreamSource(s); const an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
    const buf = new Float32Array(512), t0 = ctx.currentTime, w0 = Date.now();
    while (ctx.currentTime - t0 < ms / 1000) {
      await new Promise(r => setTimeout(r, 40));
      an.getFloatTimeDomainData(buf);
      if (buf.some(v => v !== 0)) return true;
      if (Date.now() - w0 > ms * 6) return null; // 소리 엔진이 안 감
    }
    return false;
  } catch { return null; } finally { try { src?.disconnect(); } catch {} }
}
// 장치 이름에서 학습자에게 소음인 것 빼기 — 끝의 「(1b3f:2008)」 장치 번호 · 「2- 」 같은 앞번호(본부 10-04)
export const niceLabel = l => String(l || "").replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "").replace(/(^|\()\s*\d+-\s*/g, "$1").trim();
export const micLabel = () => niceLabel(stream?.getAudioTracks()[0]?.label);
export async function listMics() { try { return (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId); } catch { return []; } }
export function chooseMic(id) { pref(id || ""); dead.clear(); closeMic(); }
// 크롬이 고른 마이크(true)가 블루투스인데 다른 마이크가 있으면 → 닫고 그쪽을 먼저(허락 전에는 이름을 몰라 이렇게 뒤에서 거른다)
export async function avoidBT(s, c, tries, k, isDead) {
  if (c !== true || !isBT(s.getAudioTracks()[0]?.label)) return false;
  const { ok } = await micCandidates();
  const left = ok.filter(id => !tries.slice(0, k).includes(id) && !isDead(id));
  if (!left.length) return false;
  s.getTracks().forEach(x => x.stop());
  tries.splice(k + 1, 0, ...left);
  return true;
}
async function openMic() {
  if (stream?.getAudioTracks()[0]?.readyState === "live") return stream;
  stream = null;
  let last = null;
  const tries = (await micCandidates(pref())).list;
  for (let k = 0; k < tries.length; k++) {
    const c = tries[k];
    if (dead.has(c)) continue;
    try {
      const s = await openOne(c === true ? true : { deviceId: { exact: c } });
      if (dead.has(devId(s))) { s.getTracks().forEach(x => x.stop()); continue; }
      if (await avoidBT(s, c, tries, k, id => dead.has(id))) continue;
      if ((await probe(s)) === false) { dead.add(c); if (devId(s)) dead.add(devId(s)); s.getTracks().forEach(x => x.stop()); continue; } // 신호 0 → 다음 후보
      s.req = c;
      return (stream = s);
    } catch (e) {
      last = e;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") break;
    }
  }
  dead.clear();
  throw last || Object.assign(new Error("silent"), { name: "SilentError" });
}
export const micOpen = () => stream?.getAudioTracks()[0]?.readyState === "live";
export function closeMic() { stream?.getTracks().forEach(x => x.stop()); stream = null; }
// 음성 인식이 아무것도 못 알아들었을 때 까닭 → 글자 열쇠(점수 없음 = 통과·저장 아님)
export const srWhy = err => ({ "audio-capture": "sr_audio", network: "sr_network", "not-allowed": "sr_denied", "service-not-allowed": "sr_denied" })[err] || "sr_none";
// 안 될 때 까닭 → 글자 열쇠(lang/*.json)
export const micWhy = e => (e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "mic_denied" : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "mic_none" : e?.name === "SilentError" ? "mic_silent" : "mic_busy");

// record() → { stop(discard), done: Promise<{ blob, heard[] } | { error } | { cancelled }> }
// onLevel(0~1) = 들어오는 소리 크기 · onSwitch() = 소리 0 인 마이크를 버리고 다른 마이크로 다시 시작함
// 말 시작 위치 찾기(본부 10-04 되돌림: 녹음을 WAV 로 다시 굽지 않는다 — 처음 잘 되던 판처럼 MediaRecorder 원본 그대로 저장)
// 파일은 자르지 않고 「말 시작 0.15초 전」 초만 돌려준다 → 재생을 그 자리부터(앞 무음 = 마이크가 열리는 동안의 빈 소리 — 10-03)
export async function findLead(blob, pre = 0.15) {
  try {
    const buf = await audioCtx().decodeAudioData(await blob.arrayBuffer());
    const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.02)), rms = [];
    for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += d[k] * d[k]; rms.push(Math.sqrt(s / win)); }
    const peak = Math.max(0, ...rms); if (peak < 0.003) return 0;
    const th = Math.max(0.006, peak * 0.08), a = rms.findIndex(v => v > th);
    return Math.max(0, (a * win) / sr - pre);
  } catch { return 0; }
}
// 내 녹음 틀기 — 원본을 풀어 lead 초부터(webm 녹음은 <audio> 로는 자리 옮기기가 안 됨) · { pause(), done }
export function playBlob(blob, lead = 0) {
  const ctx = audioCtx(); let node = null, stopped = false, resolve;
  const done = new Promise(r => (resolve = r));
  blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
    if (stopped) return resolve();
    const g = ctx.createGain(); g.gain.value = window.__sfxVolume ?? 1;
    node = ctx.createBufferSource(); node.buffer = buf; node.connect(g); g.connect(ctx.destination);
    node.onended = () => resolve();
    node.start(0, Math.min(Math.max(0, lead), Math.max(0, buf.duration - 0.05)));
    (window.__mineLog ||= []).push({ lead, dur: buf.duration, rate: buf.sampleRate });
  }).catch(() => resolve());
  return { pause() { stopped = true; try { node?.stop(); } catch {} resolve(); }, done };
}
// ── 진단 기록(화면에 안 보임 · 본부 10-04) — 녹음이 끝날 때마다 localStorage malmun.lastrec 에 마지막 5개 ──
// 음성 인식 이벤트 순서와 시각(ms) · 들은 글 · 점수 · 마이크 · 트랙 전달 여부 · 길이 · lead · 최대 소리 dB
export function srWatch(sr, t0, ev = []) {
  if (typeof sr.addEventListener !== "function") return ev; // 가짜 인식기(점검) 등
  for (const n of ["start", "audiostart", "soundstart", "speechstart", "speechend", "soundend", "audioend", "result", "nomatch", "error", "end"])
    sr.addEventListener(n, e => ev.push(`${n === "error" ? "error:" + (e.error || "?") : n}@${Math.round(performance.now() - t0)}`));
  return ev;
}
// 녹음하는 동안 음성 인식을 계속 켜 둔다 — 크롬은 말이 없으면 2~3초 만에 혼자 끝낸다(본부 10-04 진단: audioend@2668 · end@2753)
// → 머뭇거리다 3초 뒤에 말하면 바르게 말해도 0% 가 됐다. 녹음이 끝날 때까지 끝나면 같은 트랙으로 다시 켠다(들은 글은 이어서 모음)
// · 1초 안에 또 끝나면 0.2초 쉬고 · 허락·마이크 오류면 다시 켜지 않음 · 진단에 restart@ms
export function listen(track, { onText = () => {}, onErr = () => {}, t0 = performance.now(), ev = [] } = {}) {
  const SR = getSR(); if (!SR) return null;
  const h = { ev, track: false, on: true, sr: null, n: 0, stop() { h.on = false; try { h.sr?.stop(); } catch {} } };
  let lastStart = 0;
  const go = () => {
    if (!h.on || h.n > 30) return;
    let sr; try { sr = new SR(); } catch { return; }
    sr.lang = "ko-KR"; sr.continuous = true; sr.interimResults = true; sr.maxAlternatives = 3;
    sr.onresult = e => {
      const rs = Array.from(e.results, r => Array.from(r));
      for (const r of rs) for (const a of r) onText(a.transcript);
      if (rs.length > 1) onText(rs.map(r => r[0].transcript).join(" ")); // 여러 도막으로 나뉘어 온 말을 이어서도 본다
    };
    sr.onerror = e => { const er = e.error || "error"; onErr(er); if (/not-allowed|audio-capture/.test(er)) h.on = false; };
    sr.onend = () => {
      if (!h.on || h.sr !== sr) return;
      ev.push(`restart@${Math.round(performance.now() - t0)}`);
      setTimeout(go, performance.now() - lastStart < 1000 ? 200 : 0);
    };
    srWatch(sr, t0, ev);
    h.sr = sr; h.n++; lastStart = performance.now();
    try { sr.start(track); h.track = true; } catch { try { sr.start(); } catch {} }
  };
  go();
  return h;
}
export function logRec(entry) {
  try {
    const a = JSON.parse(localStorage.getItem("malmun.lastrec") || "[]");
    a.push({ at: new Date().toISOString(), ...entry });
    localStorage.setItem("malmun.lastrec", JSON.stringify(a.slice(-5)));
  } catch {}
}
export const dB = x => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);
// 마이크를 미리 열어 둔다 — 허락을 이미 받은 경우에만(처음 보는 사람에게 카드 열자마자 허락 창을 띄우지 않게)
export async function warmMic() {
  try { if ((await navigator.permissions.query({ name: "microphone" })).state === "granted") await openMic(); } catch {}
}

export function record({ onLevel = () => {}, onSwitch = () => {}, onReady = () => {}, onStop = () => {} } = {}) {
  let stopNow = () => {}, cancelled = false;
  const ctl = { stop: discard => { if (discard) cancelled = true; stopNow(); } };
  ctl.done = (async () => {
    for (let k = 0; k < 6; k++) {
      let s;
      try { s = await openMic(); } catch (e) { return { error: e }; }
      if (cancelled) return { cancelled: true };
      const r = await once(s, k > 0);
      if (r.dead) { dead.add(s.req); if (devId(s)) dead.add(devId(s)); closeMic(); onSwitch(); continue; }
      return cancelled ? { cancelled: true } : r;
    }
    return { error: Object.assign(new Error("silent"), { name: "SilentError" }) };
  })();
  function once(s, switched) {
    return new Promise(res => {
      const rec = new MediaRecorder(s), chunks = [], heard = [], t0 = performance.now();
      let srEv = [], trackPassed = false, maxRms = 0;
      let sr = null, srErr = null, over = false, src = null, meter = 0, maxT = 0;
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.start();
      sr = listen(s.getAudioTracks()[0], { onText: x => heard.push(x), onErr: er => { srErr = er; }, t0, ev: srEv }); // 녹음 끝까지 켜 둠
      trackPassed = !!sr?.track;
      const finish = (extra = {}) => {
        if (over) return; over = true;
        clearInterval(meter); clearTimeout(maxT); onLevel(0);
        if (!extra.dead && !cancelled) onStop(); // 녹음 끝 — 인식 결과를 기다리는 동안 「확인 중…」
        try { src?.disconnect(); } catch {}
        try { sr?.stop(); } catch {}
        rec.onstop = async () => {
          if (sr && !extra.dead && !cancelled) for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100)); // 인식 결과는 조금 늦게 온다
          const raw = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const lead = extra.dead || cancelled ? 0 : await findLead(raw);
          res({ blob: raw, lead, heard, srErr, diag: { mic: s.getAudioTracks()[0]?.label || "", track: trackPassed, sr: srEv, sec: Math.round(performance.now() - t0) / 1000, lead: Math.round(lead * 100) / 100, maxDb: dB(maxRms), dead: !!extra.dead, cancelled }, ...extra });
        };
        try { rec.state !== "inactive" ? rec.stop() : rec.onstop(); } catch { rec.onstop(); }
      };
      stopNow = () => finish();
      try {
        const ctx = audioCtx(), an = ctx.createAnalyser(); src = ctx.createMediaStreamSource(s);
        an.fftSize = 1024; src.connect(an);
        const buf = new Float32Array(an.fftSize), DEAD_MS = switched ? 2500 : 1500;
        let ready = false, spoke = false, quietAt = 0, peak = 0, liveMs = 0, lastT = ctx.currentTime, lastAt = Date.now(), kept = false;
        meter = setInterval(() => {
          const now = Date.now(); // 소리 엔진이 실제로 돈 시간만 센다(멈춰 있으면 산 마이크도 0 으로 보인다)
          if (ctx.state === "running" && ctx.currentTime > lastT) liveMs += now - lastAt; else if (ctx.state !== "running") ctx.resume().catch(() => {});
          lastT = ctx.currentTime; lastAt = now;
          an.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
          peak = Math.max(peak, rms); maxRms = Math.max(maxRms, rms); onLevel(Math.min(1, rms * 5));
          if (!ready && rms > 0) { ready = true; onReady(); } // 마이크에서 실제 소리(바닥 소음이라도)가 들어오기 시작함
          if ((rms > 0.02 || (switched && peak >= DEAD && liveMs > DEAD_MS)) && !kept) { kept = true; pref(devId(s) || (s.req !== true && s.req) || ""); }
          if (rms > 0.02) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= now; if (now - quietAt > QUIET_MS) finish(); }
          if (!spoke && peak < DEAD && liveMs > DEAD_MS) finish({ dead: true });
        }, 60);
      } catch {}
      maxT = setTimeout(() => finish(), MAX_MS);
    });
  }
  return ctl;
}
