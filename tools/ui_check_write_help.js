// 쓰기 「? कसरी」 도움말 점검(본부 10-07) — #/learn/L01-00-01 을 연 채로 크기마다 · 자판·손글씨 두 모드
//  열림 · 6줄 + 닫기 안내 · 칸 안 스크롤 0(넘치면 글 크기 줄임) · 머리 줄 한 줄(넘침 0) · 아무 데나 누르면 닫힘
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  try {
    for (const mode of ["kb", "hand"]) {
      localStorage.setItem("malmun.wmode", mode); location.hash = "#/learn/L01-00-01"; await W(700);
      document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(2000);
      const P = document.querySelector(".panel"), $ = s => P.querySelector(s), hd = $(".whead") || $(".bar");
      ok(hd.scrollWidth <= hd.clientWidth + 1, `${mode}: 머리 줄 넘침 0(모드 단추 · ? कसरी)`, `${hd.scrollWidth - hd.clientWidth}px`);
      $("[data-act=help]").click(); await W(400);
      const hb = $(".helpbox"), z = hb.firstElementChild.style.zoom || "1";
      ok(!hb.hidden && hb.querySelectorAll("p").length === 7 && hb.scrollHeight <= hb.clientHeight + 1, `${mode}: 도움말 6줄 + 닫기 · 칸 안 스크롤 0`, `글 크기 ${z} · 넘침 ${hb.scrollHeight - hb.clientHeight}px`);
      hb.click(); await W(200);
      ok(hb.hidden, `${mode}: 누르면 닫힘`);
      document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(500);
    }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  localStorage.removeItem("malmun.wmode");
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} ${innerWidth}x${innerHeight} 쓰기 도움말 ${res.length - bad}/${res.length}\n` + res.join("\n"); console.log(out); return out;
})();
