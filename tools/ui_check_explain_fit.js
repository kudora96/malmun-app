// 설명 칸 스크롤 0 점검(본부 10-06) — #/learn/{편} 을 연 채로 실행 · 지금 창 크기에서
// 1~끝 줄 × 로마자 끔/켬 × 말해 보기 전/뒤(결과 세 줄 + ★ 저장본·내려받기·지우기 단추 줄을 글로 흉내 · 녹음은 안 함) → 설명 칸 scrollHeight − clientHeight = 0
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], bad = [];
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const lines = document.querySelectorAll(".line"), p = document.querySelector(".panel");
  const over = () => p.scrollHeight - p.clientHeight;
  const zoom = () => parseFloat([...p.children].find(c => !c.classList.contains("vplay"))?.style.zoom || 1).toFixed(2);
  for (let n = 1; n <= lines.length; n++) {
    for (const rom of [false, true]) {
      lines[n - 1].querySelector("[data-act=explain]").click(); await W(900);
      const rb = p.querySelector("[data-x=v9rom]");
      if (rb && (rb.getAttribute("aria-pressed") === "true") !== rom) { rb.click(); await W(500); }
      const o0 = over(), z0 = zoom();
      const b = p.querySelector(".sayb");
      if (b) {
        b.querySelector(".smsg").textContent = "100% ✓ · ★ उत्कृष्ट! पूरा सही।";
        b.querySelector(".heardline").innerHTML = '<span class="lab">सुनिएको:</span> <span class="ko" lang="ko">' + (b.querySelector(".saybig")?.textContent || "") + " ✓</span>";
        const nb = b.querySelector(".micname"); nb.textContent = "🎤 Microphone (USB Audio Device) ✓"; nb.hidden = false;
        ["keep", "savedplay", "savedl", "savedel"].forEach(x => { const e = b.querySelector(`[data-x=${x}]`); if (e) e.hidden = false; });
        b.querySelector("[data-x=savedplay]").textContent = "★ 100 ▶";
        await W(400);
      }
      const o1 = over(), z1 = zoom();
      const cut = b ? [...b.querySelectorAll(".heardline,.microw")].some(e => e.getBoundingClientRect().bottom > p.getBoundingClientRect().bottom + 1) : false;
      const ok = o0 <= 0 && o1 <= 0 && !cut;
      if (!ok) bad.push(`${n}번 로마자 ${rom ? "켬" : "끔"}: 전 넘침 ${o0}px(배율 ${z0}) · 뒤 넘침 ${o1}px(배율 ${z1})${cut ? " · 결과 줄 잘림" : ""}`);
      res.push(ok);
      const close = p.querySelector("[data-x=close], .closex"); lines[n - 1].querySelector("[data-act=explain]").click(); await W(300);
    }
  }
  const head = `${innerWidth}x${innerHeight} 설명 칸 스크롤 0: ${res.filter(Boolean).length}/${res.length}`;
  const out = (bad.length ? "✗ " : "✓ ") + head + (bad.length ? "\n  " + bad.join("\n  ") : "");
  console.log(out); return out;
})();
