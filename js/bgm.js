// 배경음악(본부 10-15 투덜이 「ㅇ」) — 첫 화면·편 목록에서만 작게 · 듣기·말하기·쓰기 화면에선 저절로 꺼지고 나오면 다시(효과음은 그대로)
//  · 켜기/끄기 = ♪ 단추(첫 화면·편 목록 머리 · 처음 켬 · 기억 malmun.bgm)
//  · 파일 = 소리부 05_audio/_bgm(직접 합성 · 저작권 없음 · −30 LUFS 그대로 gain 1) — 앞뒤 1초를 감아 붙여 둠 → <audio loop> 대신 버퍼 loop(loopStart 1 · loopEnd 1+길이 · 이음매 툭 없음)
//  · 녹음 전 hold() 로 그 자리에서 0 으로 멈춤(녹음에 안 섞임) · 블루투스 깨우기(wake.js)와 같은 소리 장치라 출력은 늘 열려 있음
//  · 점검(?mute=1 · __sfxVolume 아주 작게)에선 안 틂
import { audioCtx } from "./wake.js?v=1015.1";
import { paths } from "./paths.js?v=1015.1";

const KEY = "malmun.bgm";
const TRACK = { file: "bgm_a.mp3", loopStart: 1.0, loopEnd: 97.0 }; // 소리부 추천 a 「안개」(본부가 고르면 바꿈)
const SCENES = new Set(["", "list"]); // 음악이 나오는 화면(첫 화면 · 편 목록)
const FADE = 0.6;

export const bgmOn = () => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } };
const muted = () => /[?&]mute=1\b/.test(location.search) || (window.__sfxVolume ?? 1) < 0.01;

let scene = null, holds = 0, src = null, gain = null, buf = null, loading = null, waitTap = false;

const load = () => (loading ||= fetch(paths.bgm(TRACK.file)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
  .then(b => audioCtx().decodeAudioData(b)).then(b => (buf = b)).catch(() => { loading = null; return null; }));

const want = () => bgmOn() && !muted() && !holds && SCENES.has(scene) && document.visibilityState === "visible";

async function start() {
  if (src || !want()) return;
  const ctx = audioCtx();
  if (ctx.state !== "running") { // 손대기 전엔 소리 장치가 잠겨 있음 → 첫 누름 때
    if (!waitTap) { waitTap = true; addEventListener("pointerdown", () => { waitTap = false; setTimeout(sync, 0); }, { once: true, capture: true }); }
    return;
  }
  const b = buf || (await load()); if (!b || src || !want()) return;
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b; s.loop = true; s.loopStart = TRACK.loopStart; s.loopEnd = Math.min(TRACK.loopEnd, b.duration);
  s.connect(g); g.connect(ctx.destination);
  const t0 = ctx.currentTime; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(Math.min(1, window.__sfxVolume ?? 1), t0 + FADE); /* 점검이 아주 작게 돌리면 그만큼 */
  s.start(t0, TRACK.loopStart); src = s; gain = g;
}
function stop(now = false) {
  if (!src) return;
  const ctx = audioCtx(), s = src, g = gain, t0 = ctx.currentTime; src = gain = null;
  g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(now ? 0 : g.gain.value, t0);
  if (now) { try { s.stop(); } catch {} s.disconnect(); return; }
  g.gain.linearRampToValueAtTime(0, t0 + FADE); try { s.stop(t0 + FADE + 0.05); } catch {}
}
function sync() { if (want()) start(); else stop(); }

// 화면이 바뀔 때(main.js route) — 이름 = 주소 첫 칸("" 첫 화면 · list · learn · speak · write …)
export function bgmScene(name) { scene = name; sync(); }
// 녹음·말하기처럼 음악이 절대 섞이면 안 되는 동안(그 자리에서 0) — 끝나면 release()
export function hold() { holds++; stop(true); let done = false; return () => { if (done) return; done = true; holds = Math.max(0, holds - 1); sync(); }; }
export function setBgm(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {} document.querySelectorAll("[data-act=bgm]").forEach(b => b.setAttribute("aria-pressed", String(bgmOn()))); sync(); }
document.addEventListener("visibilitychange", sync); // 다른 앱으로 가면 멈춤 · 돌아오면 다시
// 마이크를 여는 순간 그 자리에서 0(녹음에 음악이 섞이지 않게 · 마이크 여는 곳이 여럿이라 한 곳에서 받음) — 다시 켜지는 건 화면이 첫 화면·편 목록으로 바뀔 때
{ const md = navigator.mediaDevices, gum = md?.getUserMedia?.bind(md); if (gum) md.getUserMedia = c => { stop(true); return gum(c); }; }
export const bgmState = () => ({ playing: !!src, scene, holds, on: bgmOn() }); // 점검 도구용
