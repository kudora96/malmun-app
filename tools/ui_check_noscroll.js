// 스크롤바 깜빡임 0 점검(본부 10-06 투덜이) — #/learn/{편} 을 연 채로 실행 · 지금 창 크기에서
// 동작(설명 열기 1·8·15 · 로마자 끔/켬 · 소리 언어 바꿈 · 쓰기 · 말하기 · 줄 바꿈 · 창 크기 바뀜 신호)마다 50ms 간격 2초 동안
// 위 칸(.vstage) 안의 모든 칸 중 「보이는데 scrollHeight > clientHeight + 1 이고 스크롤바가 뜰 수 있는(overflow auto/scroll)」 칸 · 위 칸 자체 넘침이 한 번도 없어야 함
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], bad = [];
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; window.__sfxVolume = 0.0001;
  const line = n => document.querySelectorAll(".line")[n - 1], p = () => document.querySelector(".panel");
  const scan = () => {
    const out = [], vs = document.querySelector(".vstage");
    for (const el of [vs, ...vs.querySelectorAll("*")]) {
      if (!el.offsetParent && el !== vs) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
      const canBar = /(auto|scroll)/.test(cs.overflowY), clip = el.classList.contains("panel") || el === vs;
      if ((canBar || clip) && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0) out.push((el.className || el.tagName) + ":" + (el.scrollHeight - el.clientHeight));
    }
    return out;
  };
  const watch = async (name, act) => { const seen = new Set(); act(); for (let k = 0; k < 40; k++) { scan().forEach(x => seen.add(x)); await W(50); } res.push(!seen.size); if (seen.size) bad.push(`${name}: ${[...seen].slice(0, 4).join(" · ")}`); };
  for (const n of [1, 8, 15]) {
    await watch(`${n}번 설명 열기`, () => line(n).querySelector("[data-act=explain]").click());
    await watch(`${n}번 로마자 바꿈`, () => p().querySelector("[data-x=v9rom]")?.click());
    await watch(`${n}번 로마자 다시`, () => p().querySelector("[data-x=v9rom]")?.click());
    await watch(`${n}번 소리 언어 바꿈`, () => p().querySelector(".v9bar .snd button:last-child")?.click());
    await watch(`${n}번 창 크기 신호`, () => dispatchEvent(new Event("resize")));
    await watch(`${n}번 쓰기`, () => line(n).querySelector("[data-act=write]").click());
    await watch(`${n}번 말하기`, () => line(n).querySelector("[data-act=speak]").click());
    await watch(`${n}번 영상`, () => line(n).querySelector("[data-act=speak]").click());
  }
  await watch("설명 중 다른 줄", () => { line(3).querySelector("[data-act=explain]").click(); });
  await watch("설명 → 다음 줄(▶|)", () => document.querySelector(".ctrl [data-act=next]").click());
  const out = `${bad.length ? "✗" : "✓"} ${innerWidth}x${innerHeight} 스크롤바·넘침 0: ${res.filter(Boolean).length}/${res.length}` + (bad.length ? "\n  " + bad.join("\n  ") : "");
  console.log(out); return out;
})();
