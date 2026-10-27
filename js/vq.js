// 영상 화질 자동(본부 10-20 대표님 「화질 올리면 인터넷 느린 나라에서 안 돌아감」) — 고르는 단추 없음 · 화면 틀 0px
//  기본 720p · 느린 망(effectiveType slow-2g·2g·3g · 데이터 절약 saveData)이면 처음부터 480p
//  재생 중 버퍼링이 잦으면(1분 안 3번 · 또는 한 번 4초 넘게 멈춤) 480p 로 바꾸고 같은 자리·같은 재생 상태로 이어 감 · 그 기기는 하루 동안 480p 로 시작
//  1080p 는 앱에서 안 씀(원본 보관) · R2 = video/720/{ep}.mp4 · video/480/{ep}.mp4(영상1팀 06_release\video\720·480) · 없으면 다음 것(480 → 옛 video/{ep}.mp4)
import { paths } from "./paths.js?v=1023.40";

const K = "malmun.vq480";
const get = () => { try { return +localStorage.getItem(K) || 0; } catch { return 0; } };
const slowNet = () => { const c = navigator.connection; if (!c) return false; return !!c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || ""); }; // downlink 숫자는 브라우저 어림값이라 흔들림 → 쓰지 않음(effectiveType 이 이미 그걸로 정함)
export const startQ = () => (slowNet() || Date.now() - get() < 864e5 ? "480" : "720");
const chain = (ep, q) => (q === "480" ? ["480"] : ["720", "480"]).map(x => paths.video(ep, x)).concat(paths.video(ep));

// <video> 에 붙임 — 처음 주소 고르기 · 못 받으면 다음 주소 · 잦은 버퍼링이면 480 으로
export function attachVq(v, ep) {
  let q = startQ(), list = chain(ep, q), i = 0, waits = [], waitT = 0, seeking = false, done = false;
  v.dataset.q = q; v.src = list[0];
  const swap = (to, why) => { // 같은 자리 · 같은 재생 상태로 다음 주소
    const t = v.currentTime || 0, play = !v.paused; i = list.indexOf(to); if (i < 0) return;
    v.dataset.q = /\/480\//.test(to) ? "480" : /\/720\//.test(to) ? "720" : "old"; v.dataset.qwhy = why;
    v.src = to; v.addEventListener("loadedmetadata", () => { try { v.currentTime = t; } catch {} if (play) v.play().catch(() => {}); }, { once: true });
  };
  const onErr = () => { if (!v.getAttribute("src") || done) return; const nx = list[i + 1]; if (nx) swap(nx, "error"); };
  const down = () => { if (v.dataset.q !== "720") return; try { localStorage.setItem(K, String(Date.now())); } catch {} const to = list.find(u => /\/480\//.test(u)); if (to) swap(to, "slow"); };
  const onWait = () => { if (seeking || v.paused) return; const now = Date.now(); waits = waits.filter(x => now - x < 60000).concat(now); if (waits.length >= 3) return down(); clearTimeout(waitT); waitT = setTimeout(() => { if (!v.paused && v.readyState < 3) down(); }, 4000); };
  const onGo = () => clearTimeout(waitT);
  const onSeek = () => { seeking = true; clearTimeout(waitT); }, onSeeked = () => { seeking = false; };
  v.addEventListener("error", onErr); v.addEventListener("waiting", onWait); v.addEventListener("playing", onGo); v.addEventListener("canplay", onGo);
  v.addEventListener("seeking", onSeek); v.addEventListener("seeked", onSeeked);
  return () => { done = true; clearTimeout(waitT); v.removeEventListener("error", onErr); v.removeEventListener("waiting", onWait); v.removeEventListener("playing", onGo); v.removeEventListener("canplay", onGo); v.removeEventListener("seeking", onSeek); v.removeEventListener("seeked", onSeeked); };
}
