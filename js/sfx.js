// 짧은 소리(자모 · 글자 · 낱말 · 토막 · 대사 한 줄) — 미리 받아 풀어 두고(Web Audio 버퍼) 누르는 순간 바로 튼다
// (10-01 본부 진단 · 투덜이 「소리가 기어들어가거나 갑자기 커지거나 앞이 안 나오고 한 번 더 누르면 잘 나온다」)
//  · <audio> 에 누를 때마다 src 를 바꿔 틀면 매번 새로 받고 풀고 출력이 열리며 첫 0.1~0.3초가 약하게/잘려 나온다 → 버퍼는 샘플 단위로 정확히 시작
//  · 소리마다 노드(음량)가 따로라, 한 재생기의 음량을 여러 소리가 같이 건드려 튀던 문제가 없다
// 긴 것(설명 낭독 · 영상)은 계속 <audio>/<video>.
import { logErr } from "./errlog.js?v=1023.8";
import { audioCtx } from "./wake.js?v=1023.8";

const cache = new Map(); // url → Promise<AudioBuffer|null>(null = 파일 없음)
const live = new Set();  // 지금 나는 소리
let gen = 0; // stopAll 번호표 — 받는 중(load)에 멈춤이 오면 다 받은 뒤에도 안 틂(검사부 10-12 vi 막 누르기: 쓰기 자동 글자 소리가 설명 소리와 겹침)
const nameOf = url => decodeURIComponent(url.split("?")[0].split("/").slice(-2).join("/"));
const note = (ev, url, extra) => window.__sfxLog?.push({ t: Math.round(performance.now()), ev, name: nameOf(url), ...extra }); // 점검 도구용

// 합성 소리(파일 없음 · 「synth:이름」 주소) — render(OfflineAudioContext 만들 함수) → AudioBuffer · 한 번 만들어 버퍼로 둠(팡파레 등 · 본부 10-15)
const synths = new Map();
export const defineSynth = (name, render) => synths.set(name, render);
export function load(url) {
  if (!cache.has(url) && url.startsWith("synth:")) {
    const r = synths.get(url.slice(6));
    cache.set(url, r ? Promise.resolve().then(() => r((ch, len) => new OfflineAudioContext(ch, Math.ceil(len * audioCtx().sampleRate), audioCtx().sampleRate))).catch(e => { logErr("sfx", e?.message || "synth", { url }); return null; }) : Promise.resolve(null));
  }
  if (!cache.has(url)) {
    // 받기·풀기 실패는 기록하고 기억에서 뺌 — 다음에 누르면 다시 받음(본부 10-07 폰: 한 번 실패한 소리가 그 뒤로 계속 안 나던 것)
    cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => audioCtx().decodeAudioData(b)).catch(e => { logErr("sfx", e?.message || e?.name || "fail", { url: nameOf(url) }); setTimeout(() => cache.delete(url), 0); return null; }));
  }
  return cache.get(url);
}
export const preload = urls => Promise.all([...new Set(urls.filter(Boolean))].map(load));

// 틀기 — 다 나오면 true · 파일이 없으면 false · 중간에 멈춰도 true(없음이 아니므로)
// opt: { offset 초, dur 초, fade 초(앞뒤 살짝 줄이기 — 원음 잘라 틀 때) }
export let lastTag = null; // 방금 시작한 소리의 꼬리표(fbvoice.js — 남의 소리가 시작됐는지 알려고)
export async function play(url, { offset = 0, dur, fade = 0, tag = null } = {}) {
  const my = gen, buf = await load(url);
  if (!buf) return false;
  if (my !== gen) return true; // 받는 사이 멈춤 = 멈춘 것(없음 아님)
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
    const h = { src, stopped: false, tag };
    live.add(h);
    src.onended = () => {
      live.delete(h); dispatchEvent(new CustomEvent("malmun:snd", { detail: -1 })); // 배경음악 덕킹 끝(bgm.js)
      note(h.stopped ? "멈춤" : "끝", url, { pos: offset + (ctx.currentTime - t0) });
      res(true);
    };
    note("시작", url); lastTag = tag; dispatchEvent(new CustomEvent("malmun:snd", { detail: 1 })); // 배경음악 덕킹(bgm.js)
    src.start(t0, offset, len);
  });
}
export function stopAll() {
  gen++;
  for (const h of live) { h.stopped = true; try { h.src.stop(); } catch {} }
}
export const playing = () => live.size > 0;
export const stopGen = () => gen; // stopAll 번호표(누가 다 멈췄는지 알려고 · fbvoice.js)
export function stopTag(tag) { for (const h of live) if (h.tag === tag) { h.stopped = true; try { h.src.stop(); } catch {} } } // 그 꼬리표 소리만 멈춤(남의 소리는 그대로)
