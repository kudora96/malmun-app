// 끊긴 녹음 비교 화면 점검(본부 10-07 r8 사진) — #/learn/L01-00-01 을 연 채로 크기마다 · 투덜이 r8(tools/_rec · 깃에 안 올림 · 「…거구나」에서 끊김)
// 확인: 빠진 끝 음절 = 흐린 점선 칸(ghost) · 모두 「여기서 끝남」 선 오른쪽 · 내 줄 글자끼리 겹침 0 · 「यहाँ रोकियो」 표시 있음 · 화면 안(넘침 0)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  try {
    const r8 = await fetch("/tools/_rec/r8.webm"); if (!r8.ok) return "✗ tools/_rec/r8.webm 없음";
    const blob = await r8.blob(), L = document.querySelectorAll(".line"), li = L.length - 1;
    if (!document.querySelector(".panel")?.__sp) { L[li].querySelector("[data-act=speak]").click(); await W(1500); }
    const p = document.querySelector(".panel"), sp = p.__sp; for (let k = 0; k < 10 && !sp._cur().whole; k++) { p.querySelector("[data-act=next], .segnav [data-seg='1']")?.click(); await W(300); }
    const S = sp._state; S.blob = blob; S.whyEnd = "cut"; S.heardHTML = `<span class="ko">그게 세종대왕이 하고 싶었던 거구나</span>`; sp._paint(); await W(200);
    const b = p.querySelector("[data-act=both]"); if (b.getAttribute("aria-pressed") === "true") { b.click(); await W(200); } b.click(); await W(2500);
    const C = window.__cmp, h = p.querySelector(".cmp"), stop = h.querySelector(".crow.y .cstop"), sx = stop?.getBoundingClientRect().left ?? -1;
    const ghosts = [...h.querySelectorAll(".crow.y .cel.ghost, .crow.y .wcel")].filter(e => e.getBoundingClientRect().width > 0).filter(e => e.classList.contains("ghost") || [...e.querySelectorAll(".wch")].every(c => c.classList.contains("miss")));
    const leftOk = ghosts.every(g => g.getBoundingClientRect().left >= sx - 1);
    const txs = [...h.querySelectorAll(".crow.y .csyl .tx")].map(x => x.getBoundingClientRect()).filter(r => r.width); let ov = 0; for (let i = 0; i < txs.length; i++) for (let k = i + 1; k < txs.length; k++) if (hit(txs[i], txs[k])) ov++;
    const noWorst = ![...h.querySelectorAll(".crow.y .rworst")].some(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().left >= sx - 1); // 안 한 말은 주황(가장 나쁜 곳) 아님
    ok(C?.cut && ghosts.length > 0 && leftOk && noWorst && !!stop && /\S/.test(stop.textContent) && !ov && h.scrollHeight <= h.clientHeight + 1,
      `${innerWidth}×${innerHeight} 끊긴 녹음: 빠진 끝 음절 = 점선 칸 · 모두 「${stop?.textContent || "?"}」 선 오른쪽 · 내 줄 글자 겹침 0 · 넘침 0`,
      `cut ${C?.cut} · 들은 끝 음절 ${C?.tail}/${C?.msyl.length} · 점선 ${ghosts.length} · 선 오른쪽 ${leftOk} · 겹침 ${ov} · 넘침 ${h.scrollHeight > h.clientHeight + 1} · 안 한 말 주황 없음 ${noWorst}`);
    b.click(); await W(300);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 끊긴 녹음 비교 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
