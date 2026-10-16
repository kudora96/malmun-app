// 배경음악(본부 10-15 투덜이 「카페에서 공부하는 느낌」)
//  · 모든 화면에 깔림 — 첫 화면·편 목록 = 보통(소리부 −30 LUFS 그대로 gain 1) · 공부 화면(배우기·설명·쓰기·말하기) = 아주 작게(STUDY) · 진단 = 0
//  · 앱 소리(문장·설명·자모·효과음 · <audio>/<video> 재생 · sfx.js)가 나는 동안 더 낮춤(덕킹) · 마이크가 열려 있는 동안 완전히 0(녹음·받아쓰기에 안 섞임)
//  · 화면을 옮겨도 곡은 이어지고 음량만 바뀜 · 다른 앱·탭으로 가면 멈춤 · 돌아오면 다음 곡
//  · 켜기/끄기 = ♪ 단추(ui.js bgmBtn · 모든 창 · 처음 켬 · 기억 malmun.bgm) · 🎵 음악 상자(ui.js openMusicBox)에서 곡 골라 듣기
//  · 파일 = 소리부 05_audio/_bgm(직접 합성 · 저작권 없음) — 곡마다 [loopStart, loopEnd] 한 번 → 끝나면 다른 곡(같은 곡 연속 없음 · 앱을 다시 열어도 지난 곡 다음)
//  · 점검(?mute=1 · __sfxVolume 아주 작게)에선 안 틂
import { audioCtx } from "./wake.js?v=1016.1";
import { paths } from "./paths.js?v=1016.1";

const KEY = "malmun.bgm", LAST = "malmun.bgmLast", VOL = "malmun.bgmVol";
// 곡 목록(늘리기 = 한 줄) — song = 곡 이름(한국어 · 고유 이름) · inst = 악기 열쇠(bgm_inst_*) · ver = 결(bgm_ver_*) · loopStart·loopEnd 는 catalog 그대로
export const TRACKS = [ // 소리부 05_audio/_bgm/bgm_catalog.json(10-15 · 민요만 · 안개·별빛·물결 뺌) · ver = 잔잔(공부 화면)·밝은(첫 화면·목록)·신나는(음악 상자에서만)
  { file: "bgm_arirang_a.mp3", song: "아리랑", inst: "bell", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_arirang_b.mp3", song: "아리랑", inst: "kalimba", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_arirang_gayageum.mp3", song: "아리랑", inst: "gayageum", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_arirang_daegeum.mp3", song: "아리랑", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_arirang_piano.mp3", song: "아리랑", inst: "piano", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_doraji_gayageum.mp3", song: "도라지타령", inst: "gayageum", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_doraji_daegeum.mp3", song: "도라지타령", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 97.0 },
  { file: "bgm_kwaeji_calm.mp3", song: "쾌지나 칭칭 나네", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 109.0 },
  { file: "bgm_kwaeji_bright.mp3", song: "쾌지나 칭칭 나네", inst: "gayageum", ver: "bright", loopStart: 1.0, loopEnd: 73.0 },
  { file: "bgm_kwaeji_lively.mp3", song: "쾌지나 칭칭 나네", inst: "piri", ver: "lively", loopStart: 1.0, loopEnd: 93.16 },
  { file: "bgm_ongheya_calm.mp3", song: "옹헤야", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 80.2 },
  { file: "bgm_ongheya_bright.mp3", song: "옹헤야", inst: "gayageum", ver: "bright", loopStart: 1.0, loopEnd: 81.96 },
  { file: "bgm_ongheya_lively.mp3", song: "옹헤야", inst: "piri", ver: "lively", loopStart: 1.0, loopEnd: 79.848 },
  { file: "bgm_ganggang_calm.mp3", song: "강강술래", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 106.6 },
  { file: "bgm_ganggang_bright.mp3", song: "강강술래", inst: "gayageum", ver: "bright", loopStart: 1.0, loopEnd: 74.92 },
  { file: "bgm_ganggang_lively.mp3", song: "강강술래", inst: "piri", ver: "lively", loopStart: 1.0, loopEnd: 68.584 },
  { file: "bgm_arirang_calm.mp3", song: "아리랑", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 90.1 },
  { file: "bgm_arirang_bright.mp3", song: "아리랑", inst: "gayageum", ver: "bright", loopStart: 1.0, loopEnd: 107.92 },
  { file: "bgm_arirang_lively.mp3", song: "아리랑", inst: "piri", ver: "lively", loopStart: 1.0, loopEnd: 115.048 },
  { file: "bgm_doraji_calm.mp3", song: "도라지타령", inst: "daegeum", ver: "calm", loopStart: 1.0, loopEnd: 78.143 },
  { file: "bgm_doraji_bright.mp3", song: "도라지타령", inst: "gayageum", ver: "bright", loopStart: 1.0, loopEnd: 103.857 },
  { file: "bgm_doraji_lively.mp3", song: "도라지타령", inst: "piri", ver: "lively", loopStart: 1.0, loopEnd: 116.2 },
];
const SCENE_GAIN = { "": 1, list: 1, diag: 0 }, STUDY = 0.32, DUCK = 0.3; // 공부 화면 ≈ −10dB · 앱 소리 날 때 그 위에서 ≈ −10dB 더
const UP = 0.8, DOWN = 0.2; // 음량 바꾸는 시간(초) — 내릴 땐 빨리

// 음량(대표님 10-16 · 🎵 음악 상자 막대 · 0~1 · 기억 · 앱 전체 — 공부 화면·덕킹·녹음 0 은 이 값 위에서 그대로)
export const bgmVol = () => { try { const v = parseFloat(localStorage.getItem(VOL)); return v >= 0 && v <= 1 ? v : 1; } catch { return 1; } };
export function setBgmVol(v) { try { localStorage.setItem(VOL, String(Math.max(0, Math.min(1, v)))); } catch {} sync(); }
export const bgmOn = () => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } };
const muted = () => /[?&]mute=1\b/.test(location.search) || (window.__sfxVolume ?? 1) < 0.01;

let scene = null, holds = 0, src = null, gain = null, waitTap = false, cur = -1, next = -1, mic = false, sounds = 0, target = 0, endAt = 0;
const media = new Set(); // 지금 나는 <audio>/<video>
const loads = new Map(); // 곡 번호 → Promise<AudioBuffer|null>
const load = i => { if (!loads.has(i)) loads.set(i, fetch(paths.bgm(TRACKS[i].file)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
  .then(b => audioCtx().decodeAudioData(b)).catch(() => { loads.delete(i); return null; })); return loads.get(i); };
// 다음 곡 = 지금 화면 결(첫 화면·목록 = 밝은 · 그 밖 = 잔잔)에서 방금(지난번 앱) 곡이 아닌 것 하나 · 화면을 옮겨도 나오던 곡은 끝까지(다음 곡부터 그 화면 결)
const poolVer = () => (scene === "" || scene === "list" ? "bright" : "calm");
const pick = () => { let last = cur; if (last < 0) try { last = +(localStorage.getItem(LAST) ?? -1); } catch {} const ids = TRACKS.map((_, i) => i), pool = ids.filter(i => TRACKS[i].ver === poolVer()), c = (pool.length ? pool : ids).filter(i => i !== last); return c.length ? c[Math.floor(Math.random() * c.length)] : (pool[0] ?? 0); };

const playOk = () => bgmOn() && !muted() && document.visibilityState === "visible";
// 지금 있어야 할 음량(0~1) — 화면 · 앱 소리 · 마이크 · 막음(hold)
const level = () => { for (const m of media) if (!m.isConnected || m.paused || m.ended) media.delete(m); /* 화면에서 사라진 영상·소리(멈춤 신호 없이 빠짐)는 뺌 — 안 빼면 덕킹이 안 풀림(ur 320 점검) */ if (mic || holds) return 0; const g = scene in SCENE_GAIN ? SCENE_GAIN[scene] : STUDY; return g * bgmVol() * (sounds > 0 || media.size ? DUCK : 1) * Math.min(1, window.__sfxVolume ?? 1); };
function setGain(now = false) {
  target = level(); if (!gain) return;
  const ctx = audioCtx(), t0 = ctx.currentTime, g = gain.gain, v = g.value;
  g.cancelScheduledValues(t0); g.setValueAtTime(now ? target : v, t0);
  if (!now) g.linearRampToValueAtTime(target, t0 + (target < v ? DOWN : UP));
  if (endAt - 1.5 > t0 + UP) { g.setValueAtTime(target, endAt - 1.5); g.linearRampToValueAtTime(0, endAt); } // 곡 끝 줄임은 다시 걸어 둠
}

async function start(force = -1) {
  if (src || !playOk()) return;
  const ctx = audioCtx();
  if (ctx.state !== "running") { // 첫 누름 전엔 소리 장치가 잠겨 있음 → 아무거나 처음 누를 때 조용히(본부 10-15 · 따로 단추·안내 없음)
    if (!waitTap) { waitTap = true; addEventListener("pointerdown", () => { waitTap = false; setTimeout(sync, 0); }, { once: true, capture: true }); }
    return;
  }
  const i = force >= 0 ? force : next >= 0 ? next : pick(); next = -1;
  const b = await load(i); if (!b || src || !playOk()) return;
  const T = TRACKS[i], a = T.loopStart, len = Math.min(T.loopEnd, b.duration) - a;
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b; s.connect(g); g.connect(ctx.destination);
  const t0 = ctx.currentTime; g.gain.setValueAtTime(0, t0);
  s.onended = () => { if (src !== s) return; src = gain = null; s.disconnect(); if (next < 0) next = pick(); sync(); paintBox(); }; // 곡이 끝남 → 다른 곡
  s.start(t0, a, len); src = s; gain = g; cur = i; endAt = t0 + len;
  target = level(); g.gain.linearRampToValueAtTime(target, t0 + UP); g.gain.setValueAtTime(target, endAt - 1.5); g.gain.linearRampToValueAtTime(0, endAt); // 곡 끝 1.5초 줄이며 다음 곡으로
  try { localStorage.setItem(LAST, String(i)); } catch {}
  if (TRACKS.length > 1) { next = pick(); load(next); }
  paintBox();
}
function stop(now = false) {
  if (!src) return;
  const ctx = audioCtx(), s = src, g = gain, t0 = ctx.currentTime; src = gain = null;
  g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(now ? 0 : g.gain.value, t0);
  if (now) { try { s.stop(); } catch {} s.disconnect(); }
  else { g.gain.linearRampToValueAtTime(0, t0 + 0.6); try { s.stop(t0 + 0.65); } catch {} }
  paintBox();
}
function sync() {
  if (!playOk()) return stop();
  if (!src) { target = level(); return start(); }
  setGain(mic || holds > 0);
}

// 화면이 바뀔 때(main.js route) — 이름 = 주소 첫 칸("" 첫 화면 · list · learn · speak · write · diag …)
export function bgmScene(name) { const v0 = poolVer(); scene = name; if (poolVer() !== v0 && next >= 0) { next = pick(); load(next); } sync(); } // 결이 바뀌면 다음 곡도 그 결로
// 음악이 절대 섞이면 안 되는 동안(그 자리에서 0) — 끝나면 release()
export function hold() { holds++; sync(); let done = false; return () => { if (done) return; done = true; holds = Math.max(0, holds - 1); sync(); }; }
export function setBgm(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {} document.querySelectorAll("[data-act=bgm]").forEach(b => (b.dataset.on = String(bgmOn()))); sync(); paintBox(); }
// 🎵 음악 상자에서 이 곡 듣기(꺼져 있으면 켬) · 지금 나는 곡이면 그대로
export function playTrack(i) { if (!bgmOn()) { try { localStorage.setItem(KEY, "1"); } catch {} document.querySelectorAll("[data-act=bgm]").forEach(b => (b.dataset.on = "true")); } if (src && cur === i) return; stop(true); next = -1; start(i); }
export const bgmNow = () => (src ? cur : -1);
// ⏭ 다음 곡(음악 상자) — 지금 화면 결에서 다른 곡으로 바로
export function playNext() { if (!bgmOn()) return; const n = next >= 0 ? next : pick(); stop(true); next = -1; start(n); }
let boxPaint = null; export const onBgmChange = f => { boxPaint = f; };
function paintBox() { try { boxPaint?.(); } catch {} }

document.addEventListener("visibilitychange", sync); // 다른 앱으로 가면 멈춤 · 돌아오면 다시
// 앱 소리 덕킹 — <audio>/<video>(문장·설명·영상) 재생 · sfx.js 짧은 소리(자모·글자·효과음 · malmun:snd 신호)
for (const ev of ["play", "playing"]) document.addEventListener(ev, e => { if (e.target instanceof HTMLMediaElement && !e.target.muted && !media.has(e.target)) { media.add(e.target); sync(); } }, true);
for (const ev of ["pause", "ended", "emptied", "abort"]) document.addEventListener(ev, e => { if (media.delete(e.target)) sync(); }, true);
addEventListener("malmun:snd", e => { sounds = Math.max(0, sounds + (e.detail || 0)); sync(); });
// 마이크 — 여는 순간(허락 묻기 전부터) 그 자리에서 0 · 열린 마이크가 하나라도 살아 있는 동안 0 · 다 닫히면 다시(녹음·받아쓰기에 음악이 안 섞임 · 여는 곳이 여럿이라 한 곳에서 받음)
{ const md = navigator.mediaDevices, gum = md?.getUserMedia?.bind(md), live = new Set(); let tm = 0;
  const check = () => { for (const s of live) if (!s.getTracks().some(x => x.readyState === "live")) live.delete(s); const m = live.size > 0; if (m !== mic) { mic = m; sync(); } if (!live.size && tm) { clearInterval(tm); tm = 0; } };
  if (gum) md.getUserMedia = c => { mic = true; sync(); return gum(c).then(s => { if (c?.audio) { live.add(s); if (!tm) tm = setInterval(check, 250); } else check(); return s; }, e => { check(); throw e; }); }; }
export const bgmState = () => ({ playing: !!src, scene, holds, on: bgmOn(), track: cur >= 0 ? TRACKS[cur].file : null, next: next >= 0 ? TRACKS[next].file : null, gain: src ? +target.toFixed(3) : 0, vol: bgmVol(), live: gain ? +gain.gain.value.toFixed(3) : 0, mic, duck: sounds > 0 || media.size > 0 }); // 점검 도구용
