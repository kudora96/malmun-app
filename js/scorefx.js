// 점수 효과(본부 10-05 · 투덜이 승인) — 카드·말하기 창 같게 · 녹음·점수·재생 경로는 건드리지 않는다(점수가 화면에 뜬 뒤 보이기만)
// 축하 단계(본부 10-15 투덜이 · 말하기·쓰기 같이): 80~94 = pass(☆ 통과) · 95↑ = perfect(★ 완벽 + 색종이) · full = 🎉 100점(소리·리듬 모두 100 · 쓰기는 쓰기부가 정한 100점 조건)
//  · 80 아래(말은 들림) = miss(꽝 살짝 흔들림 0.4초) · 말소리 없음 = 효과 없음
//  🎉 100점 = 화면 위 덮개(position:fixed · 누르기 통과 · 화면 크기 0px): 팡파레(합성 · 파일 없음) + 별 여러 개 날아오름 + 들쭉날쭉 떨어지는 색종이(방사형 햇살 장식 금지) + 「100점!」 큰 글씨
// 점수 줄 위 작은 자리에 겹쳐 떴다가 사라진다(position:absolute — 카드·창 크기·스크롤 안 바뀜) · 움직임 줄이기 설정이면 움직임 없이 표시만
import * as sfx from "./sfx.js?v=1022.18";
import { t } from "./i18n.js?v=1022.18";
import { paths } from "./paths.js?v=1022.18";

export const tierOf = sc => (sc == null ? null : sc >= 95 ? "perfect" : sc >= 80 ? "pass" : "miss");
// 소리 = media/sfx/score_*.mp3(투덜이가 귀로 고른 4개 · 본부 10-05 · 원본 02_assets/sfx) · 파일이 없으면 조용히 건너뜀
export const fxSound = name => paths.sfx(name);
const ICON = { perfect: "★", great: "★", pass: "☆", miss: "꽝" };
const LABEL = { perfect: "fx_perfect", great: "", pass: "fx_pass", miss: "fx_miss" };
const SHOW_MS = { perfect: 1800, great: 1400, pass: 1400, miss: 1400 };

// 팡파레 — 짧은 오르는 세 음 + 긴 으뜸화음(금관 비슷하게: 톱니 둘 + 걸름 열림) · 약 1.9초
sfx.defineSynth("fanfare", mk => {
  const ctx = mk(1, 2.0), out = ctx.createGain(); out.gain.value = 0.32; out.connect(ctx.destination);
  const note = (f, t0, d) => { const lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = "lowpass"; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(700, t0); lp.frequency.linearRampToValueAtTime(3200, t0 + 0.05); lp.frequency.exponentialRampToValueAtTime(1600, t0 + d);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.02); g.gain.linearRampToValueAtTime(0.36, t0 + 0.12); g.gain.setValueAtTime(0.36, t0 + d - 0.06); g.gain.linearRampToValueAtTime(0, t0 + d);
    lp.connect(g); g.connect(out);
    for (const dt of [-6, 6]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t0); o.stop(t0 + d); } };
  [[392, 0, 0.12], [523.25, 0.14, 0.12], [659.25, 0.28, 0.12], [783.99, 0.42, 0.36], [659.25, 0.8, 0.13], [783.99, 0.95, 0.9]].forEach(([f, a, d]) => note(f, a, d));
  [523.25, 659.25, 1046.5].forEach(f => note(f, 0.95, 0.9)); // 끝 = 도·미·솔·도 한꺼번에
  return ctx.startRendering();
});
// 🎉 100점 덮개 — 별(아래에서 날아오름)·색종이(위에서 들쭉날쭉 떨어짐)의 자리·늦춤·크기는 미리 정한 들쭉날쭉 값(가운데에서 퍼지는 모양 아님)
const STARS = [[8, 0, 26], [21, 0.18, 34], [34, 0.07, 22], [47, 0.26, 40], [60, 0.12, 28], [72, 0.31, 36], [84, 0.04, 24], [93, 0.22, 30], [15, 0.4, 20], [66, 0.45, 22]];
const CONF_C = ["#cd2e3a", "#0047a0", "var(--star)"];
function fullFx() {
  document.querySelector(".fxfull")?.remove();
  const d = document.createElement("div"); d.className = "fxfull"; d.setAttribute("aria-hidden", "true");
  const conf = Array.from({ length: 34 }, (_, j) => `<i style="--x:${(j * 37 + (j % 5) * 11) % 100}vw;--dl:${((j * 7) % 10) * 0.07}s;--c:${CONF_C[j % 3]};--r:${(j * 71) % 360}deg;--sw:${((j * 13) % 7) - 3}vw"></i>`).join("");
  const stars = STARS.map(([x, dl, sz]) => `<b style="--x:${x}vw;--dl:${dl}s;--s:${sz}px">★</b>`).join("");
  d.innerHTML = `${conf}${stars}<strong>${t("fx_100")}</strong>`;
  document.body.append(d); setTimeout(() => d.remove(), 2800);
}
// slot = 점수 줄 옆 <span class="fx"> · sc = 점수(null = 말소리 없음 → 지우기만) · busy() 가 참이면(녹음 중) 소리 안 냄 · full = 🎉 100점(부르는 쪽이 조건을 정함)
export function scoreFx(slot, sc, { busy = () => false, full = false } = {}) {
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
  if (full && k === "perfect") fullFx();
  if (!busy()) sfx.play(full && k === "perfect" ? "synth:fanfare" : fxSound("score_" + k)).catch(() => {}); // 점수가 뜨는 순간 한 번 · 🔁 무관
}
// 🎤 누르면 효과음도 바로 멈춤(녹음에 섞이지 않게 · 말하기 창은 stopSounds 가 이미 멈춤)
export const stopFx = () => { sfx.stopAll(); document.querySelector(".fxfull")?.remove(); };
