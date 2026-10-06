// 네 창 한 틀 재기(본부 10-06) — #/learn/{편} 을 연 채로 실행 · 15번 줄로 영상→설명→쓰기→말하기 차례로 바꾸며 위 칸·경계 막대·자막 카드 숫자를 잰다
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s);
  const N = 14, line = () => document.querySelectorAll(".line")[N];
  const R = el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom) }; };
  const meas = mode => { const vs = R($(".vstage")), sk = R($(".seek")), c = R(line()), ko = line().querySelector(".kotext");
    return { mode, slotTop: vs.top, slotH: vs.h, seekY: sk.top, seekH: sk.h, card: `${c.top}/${c.left}/${c.w}`, cardH: c.h, font: getComputedStyle(ko).fontSize, over: (() => { const p = $(".panel:not([hidden])"); return p ? Math.max(0, p.scrollHeight - p.clientHeight) : 0; })() }; };
  const out = [];
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  line().click(); await W(900); out.push(meas("video"));
  line().querySelector("[data-act=explain]").click(); await W(1500); out.push(meas("explain"));
  line().querySelector("[data-act=write]").click(); await W(1500); out.push(meas("write"));
  line().querySelector("[data-act=speak]").click(); await W(1500); out.push(meas("speak"));
  return innerWidth + "x" + innerHeight + "\n" + out.map(o => Object.entries(o).map(([k, v]) => k + "=" + v).join(" ")).join("\n");
})();
