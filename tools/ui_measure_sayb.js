// 설명 창 말하기 칸 높이 — 말하기 전 / 뒤(결과 세 줄을 글만 채워 흉내 · 녹음은 안 함) 비교 · 10번·8번
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), out = [innerWidth + "x" + innerHeight];
  for (const n of [10, 8]) {
    document.querySelectorAll(".line")[n - 1].querySelector("[data-act=explain]").click(); await W(1600);
    const p = document.querySelector(".panel"), b = p.querySelector(".sayb"), k = [...p.children].find(c => !c.classList.contains("vplay"));
    const h0 = b.offsetHeight, z = parseFloat(k.style.zoom || 1), gap = Math.round(p.clientHeight - k.getBoundingClientRect().height);
    b.querySelector(".smsg").textContent = "100% ✓ · ★ उत्कृष्ट!"; b.querySelector(".heardline").innerHTML = '<span class="lab">सुनिएको:</span> <span class="ko" lang="ko">그럼 우리는요 ✓</span>';
    const nb = b.querySelector(".micname"); nb.textContent = "🎤 Microphone (USB) ✓"; nb.hidden = false; b.querySelector("[data-x=keep]").hidden = false;
    const h1 = b.offsetHeight;
    out.push(`${n}번 배율=${z.toFixed(2)} 빈 높이=${gap}px 넘침=${p.scrollHeight - p.clientHeight}px 말하기 칸 전=${h0} 뒤=${h1} 차=${h1 - h0}px`);
  }
  return out.join("\n");
})();
