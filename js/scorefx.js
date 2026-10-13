// 점수 효과(본부 10-05 · 투덜이 승인) — 카드·말하기 창 같게 · 녹음·점수·재생 경로는 건드리지 않는다(점수가 화면에 뜬 뒤 보이기만)
// 100% = perfect(큰 ★ 터짐 + 반짝 조각 0.8초) · 95~99 = great(★ 톡) · 80~94 = pass(☆) · 80 아래(말은 들림) = miss(꽝 살짝 흔들림 0.4초) · 말소리 없음 = 효과 없음
// 점수 줄 위 작은 자리에 겹쳐 떴다가 사라진다(position:absolute — 카드·창 크기·스크롤 안 바뀜) · 움직임 줄이기 설정이면 움직임 없이 표시만
import * as sfx from "./sfx.js?v=1013.1";
import { t } from "./i18n.js?v=1013.1";
import { paths } from "./paths.js?v=1013.1";

export const tierOf = sc => (sc == null ? null : sc >= 100 ? "perfect" : sc >= 95 ? "great" : sc >= 80 ? "pass" : "miss");
// 소리 = media/sfx/score_*.mp3(투덜이가 귀로 고른 4개 · 본부 10-05 · 원본 02_assets/sfx) · 파일이 없으면 조용히 건너뜀
export const fxSound = name => paths.sfx(name);
const ICON = { perfect: "★", great: "★", pass: "☆", miss: "꽝" };
const LABEL = { perfect: "fx_perfect", great: "", pass: "fx_pass", miss: "fx_miss" };
const SHOW_MS = { perfect: 1800, great: 1400, pass: 1400, miss: 1400 };

// slot = 점수 줄 옆 <span class="fx"> · sc = 점수(null = 말소리 없음 → 지우기만) · busy() 가 참이면(녹음 중) 소리 안 냄
export function scoreFx(slot, sc, { busy = () => false } = {}) {
  if (!slot) return;
  clearTimeout(slot.__t); slot.className = "fx"; slot.innerHTML = "";
  const k = tierOf(sc); if (!k) return;
  void slot.offsetWidth; // 같은 단계가 연달아 나와도 움직임을 처음부터
  // 완벽 = 색종이(본부 10-13 — 가운데에서 같은 간격으로 퍼지는 햇살 모양은 욱일기처럼 보일 수 있어 뺌) · 각도·거리 들쭉날쭉 · 태극 빨강·파랑 + 금색
  const CONF = [[18, 22, "#cd2e3a"], [77, 30, "#0047a0"], [131, 17, "var(--star)"], [166, 27, "#cd2e3a"], [212, 24, "#0047a0"], [249, 31, "var(--star)"], [296, 19, "#cd2e3a"], [338, 26, "#0047a0"]];
  const sparks = k === "perfect" ? CONF.map(([a, d, c], j) => `<i style="--a:${a}deg;--d:${d}px;--c:${c};--r:${(j * 53) % 90}deg"></i>`).join("") : "";
  slot.innerHTML = `<b${k === "miss" ? ' lang="ko"' : ""}>${ICON[k]}</b>${LABEL[k] ? `<span>${t(LABEL[k])}</span>` : ""}${sparks}`;
  slot.classList.add("on", k);
  slot.__t = setTimeout(() => { slot.className = "fx"; slot.innerHTML = ""; }, SHOW_MS[k]);
  if (!busy()) sfx.play(fxSound("score_" + k)).catch(() => {}); // 점수가 뜨는 순간 한 번 · 🔁 무관
}
// 🎤 누르면 효과음도 바로 멈춤(녹음에 섞이지 않게 · 말하기 창은 stopSounds 가 이미 멈춤)
export const stopFx = () => sfx.stopAll();
