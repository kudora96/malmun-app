// 설명 창 채움 재기(본부 10-06) — 10번(짧은 줄)·8번(긴 줄) 설명을 열어 글 크기 배율·남는 빈 높이·넘침을 잰다
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), out = [innerWidth + "x" + innerHeight];
  for (const n of [10, 8]) {
    const l = document.querySelectorAll(".line")[n - 1]; l.querySelector("[data-act=explain]").click(); await W(1600);
    const p = document.querySelector(".panel"), k = [...p.children].find(c => !c.classList.contains("vplay"));
    const z = parseFloat(k.style.zoom || 1), body = p.querySelector(".v9sent, .sn, p");
    out.push(`${n}번 배율=${z.toFixed(2)} 글=${body ? (parseFloat(getComputedStyle(body).fontSize) * z).toFixed(1) + "px" : "?"} 빈 높이=${Math.round(p.clientHeight - k.getBoundingClientRect().height)}px 넘침=${p.scrollHeight - p.clientHeight}px`);
  }
  return out.join("\n");
})();
