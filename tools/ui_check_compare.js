// 말하기 「तुलना」 비교 화면 점검(본부 10-06) — #/learn/{편} 을 연 채로 실행 · 소리는 아주 작게
// 13번 2/4 토막(「우리도 읽을 수 있어요」)에 「저도 읽을 수 있어요」 소리를 내 녹음으로 넣고(녹음 경로는 안 씀) 비교 화면을 연다
// 확인: 파형 두 줄 · 본보기 음절 = align.json · 내 음절 수 같음 · 색(빠짐·틀림·맞음) · 위 칸 안(스크롤 0 · 단추 줄 보임) · 다시 누르면 원래 화면 · 토막 바꾸면 닫힘
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  try {
    document.querySelectorAll(".line")[12].querySelector("[data-act=speak]").click(); await W(1500);
    const p = document.querySelector(".panel"); p.querySelectorAll(".segnav button")[1].click(); await W(500);
    const S = p.__sp._state, v = document.documentElement.dataset.v, { heardHTML } = await import(`/js/heard.js?v=${v}`);
    const want = p.querySelector(".task .say").textContent.replace(/[?]/g, "");
    S.blob = await (await fetch("/media/v9/L01-00-01/" + encodeURIComponent("새설명_소리_kr") + "/" + encodeURIComponent("L01-00-01_13_말해보세요_문장.mp3"))).blob();
    S.heardHTML = `<span class="lab">x:</span> <span class="ko">${heardHTML(want, "저도 읽을 수 있어요").html}</span>`;
    const b = p.querySelector("[data-act=both]"); b.disabled = false; b.click(); await W(2200);
    const c = window.__cmp, al = await (await fetch(`/data/L01-00-01/L01-00-01.align.json?${Date.now()}`)).json(), A = al.items["L01-00-01_13_p02"].syl;
    ok(document.querySelectorAll(".cmp canvas").length === 2 && c, "파형 두 줄(본보기 · 내 목소리)");
    ok(c.msyl.length === A.length && c.msyl.every((x, k) => x.ch === A[k].ch && Math.abs(x.s - A[k].s) < 1e-6), "본보기 음절 = align.json", c.msyl.map(x => x.ch).join(""));
    ok(c.ysyl.length === c.msyl.length && c.ysyl.every((x, k) => !k || x.s >= c.ysyl[k - 1].s), "내 목소리 음절 = 같은 수 · 차례대로(DTW)", c.ysyl.map(x => x.s.toFixed(2)).join(" "));
    ok(c.marks.join(",") === "miss,bad,ok,ok,ok,ok,ok,ok,ok", "색 = 점수 정렬(우 빠짐 · 리 틀림 · 나머지 맞음)", c.marks.join(","));
    const got = p.querySelector(".crow.y .csyl button[data-k='1']");
    ok(got?.querySelector(".got")?.textContent === "저" && got?.querySelector(".want")?.textContent === "리" && p.querySelector(".crow.y .csyl button[data-k='0']").classList.contains("miss"), "들은 글자 표시: 리 칸 = 빨강 「저」 + 위 흐린 「리」 · 우 = 빠짐", got?.textContent);
    const hd = p.querySelector(".whead"), ys = [...hd.children].filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2));
    ok(Math.max(...ys) - Math.min(...ys) <= 6 && hd.scrollWidth <= hd.clientWidth + 1, "말하기 머리 줄 한 줄(✕ 가 둘째 줄로 안 떨어짐)", hd.className + " · 높이 " + hd.offsetHeight);
    const sb = p.querySelector(".sbtns").getBoundingClientRect(), pr = p.getBoundingClientRect();
    ok(p.scrollHeight - p.clientHeight <= 0 && sb.bottom <= pr.bottom + 1 && !p.querySelector(".cmp").hidden, "위 칸 안(스크롤 0 · 단추 줄 보임)", `${p.scrollHeight - p.clientHeight}px`);
    const cut = [...p.querySelectorAll(".csyl button")].filter(x => x.scrollWidth > x.clientWidth + 1 && !x.classList.contains("tight")).length;
    ok(cut === 0, "음절 글자 잘림 없음", `${cut}`);
    b.click(); await W(300);
    ok(p.querySelector(".cmp").hidden && !p.querySelector(".task").offsetParent === false && b.getAttribute("aria-pressed") === "false", "다시 누름 → 원래 말하기 화면");
    b.click(); await W(1200); p.querySelectorAll(".segnav button")[0].click(); await W(400);
    ok(p.querySelector(".cmp").hidden, "토막 바꾸면 비교 화면 닫힘");
    // 덧붙은 소리 = 회색 작은 칸
    p.querySelectorAll(".segnav button")[1].click(); await W(400);
    S.blob = await (await fetch("/media/audio/L01-00-01/units/L01-00-01_13_p02.mp3")).blob();
    S.heardHTML = `<span class="lab">x:</span> <span class="ko">${heardHTML(want, "그럼 우리도 읽을 수 있어요").html}</span>`;
    b.disabled = false; b.click(); await W(1500);
    ok(window.__cmp.extra.map(x => x.ch).join("") === "그럼" && p.querySelectorAll(".crow.y .csyl .add").length === 2 && window.__cmp.marks.every(x => x === "ok"), "덧붙은 소리 = 회색 작은 칸(「그」「럼」) · 나머지 맞음", window.__cmp.extra.map(x => x.ch).join(""));
    b.click(); await W(200);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = `${innerWidth}x${innerHeight}\n` + res.join("\n"); console.log(out); return out;
})();
