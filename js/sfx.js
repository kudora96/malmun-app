// 짧은 소리(자모 · 글자 · 낱말 · 토막 · 대사 한 줄) — 미리 받아 풀어 두고(Web Audio 버퍼) 누르는 순간 바로 튼다
// (10-01 본부 진단 · 투덜이 「소리가 기어들어가거나 갑자기 커지거나 앞이 안 나오고 한 번 더 누르면 잘 나온다」)
//  · <audio> 에 누를 때마다 src 를 바꿔 틀면 매번 새로 받고 풀고 출력이 열리며 첫 0.1~0.3초가 약하게/잘려 나온다 → 버퍼는 샘플 단위로 정확히 시작
//  · 소리마다 노드(음량)가 따로라, 한 재생기의 음량을 여러 소리가 같이 건드려 튀던 문제가 없다
// 긴 것(설명 낭독 · 영상)은 계속 <audio>/<video>.
import { audioCtx } from "./wake.js?v=1004.23";

const cache = new Map(); // url → Promise<AudioBuffer|null>(null = 파일 없음)
const live = new Set();  // 지금 나는 소리
const nameOf = url => decodeURIComponent(url.split("?")[0].split("/").slice(-2).join("/"));
const note = (ev, url, extra) => window.__sfxLog?.push({ t: Math.round(performance.now()), ev, name: nameOf(url), ...extra }); // 점검 도구용

export function load(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => audioCtx().decodeAudioData(b)).catch(() => null));
  }
  return cache.get(url);
}
export const preload = urls => Promise.all([...new Set(urls.filter(Boolean))].map(load));

// 틀기 — 다 나오면 true · 파일이 없으면 false · 중간에 멈춰도 true(없음이 아니므로)
// opt: { offset 초, dur 초, fade 초(앞뒤 살짝 줄이기 — 원음 잘라 틀 때) }
export async function play(url, { offset = 0, dur, fade = 0 } = {}) {
  const buf = await load(url);
  if (!buf) return false;
  const ctx = audioCtx();
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.connect(g); g.connect(ctx.destination);
  const len = Math.min(dur ?? buf.duration - offset, buf.duration - offset);
  const vol = window.__sfxVolume ?? 1; // 점검 도구가 아주 작게 돌릴 때
  const t0 = ctx.currentTime + 0.01;
  if (fade > 0) {
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + fade);
    g.gain.setValueAtTime(vol, t0 + len - fade); g.gain.linearRampToValueAtTime(0, t0 + len);
  } else g.gain.setValueAtTime(vol, t0);
  return new Promise(res => {
    const h = { src, stopped: false };
    live.add(h);
    src.onended = () => {
      live.delete(h);
      note(h.stopped ? "멈춤" : "끝", url, { pos: offset + (ctx.currentTime - t0) });
      res(true);
    };
    note("시작", url);
    src.start(t0, offset, len);
  });
}
export function stopAll() {
  for (const h of live) { h.stopped = true; try { h.src.stop(); } catch {} }
}
export const playing = () => live.size > 0;
