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
    const got = p.querySelector(".crow.y .csyl .cel[data-k='1']");
    ok(got?.querySelector(".got")?.textContent === "저" && got?.querySelector(".want")?.textContent === "리" && p.querySelector(".crow.y .csyl .cel[data-k='0']").classList.contains("miss"), "들은 글자 표시: 리 칸 = 빨강 「저」 + 위 흐린 「리」 · 우 = 빠짐", got?.textContent);
    const hd = p.querySelector(".whead"), ys = [...hd.children].filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2));
    ok(Math.max(...ys) - Math.min(...ys) <= 6 && hd.scrollWidth <= hd.clientWidth + 1, "말하기 머리 줄 한 줄(✕ 가 둘째 줄로 안 떨어짐)", hd.className + " · 높이 " + hd.offsetHeight);
    const sb = p.querySelector(".sbtns").getBoundingClientRect(), pr = p.getBoundingClientRect();
    const cmpB = Math.max(...[...p.querySelectorAll(".cmp .cmpw > *")].map(x => x.getBoundingClientRect().bottom)), cmpT = Math.min(...[...p.querySelectorAll(".cmp .cmpw > *")].map(x => x.getBoundingClientRect().top)), hdB = p.querySelector(".whead").getBoundingClientRect().bottom;
    ok(p.scrollHeight - p.clientHeight <= 0 && sb.bottom <= pr.bottom + 1 && !p.querySelector(".cmp").hidden && cmpB <= sb.top + 1 && cmpT >= hdB - 1, "위 칸 안(스크롤 0 · 비교 내용이 머리 줄과 단추 줄 사이 · 안 겹침)", `${p.scrollHeight - p.clientHeight}px · 비교 ${Math.round(cmpT)}~${Math.round(cmpB)} · 머리 ${Math.round(hdB)} · 단추 ${Math.round(sb.top)}`);
    // 음절 글자 = 한 크기 · 같은 층끼리 안 겹침(좁은 칸은 위·아래 번갈아)
    const sizes = new Set([...p.querySelectorAll(".csyl .cel .tx")].map(x => getComputedStyle(x.querySelector(".got") || x).fontSize));
    let overlap = 0; p.querySelectorAll(".csyl").forEach(row => { const tx = [...row.querySelectorAll(".cel .tx")].map(x => x.getBoundingClientRect()); for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) { const a = tx[i], c = tx[j]; if (a.right > c.left + 2 && c.right > a.left + 2 && a.bottom > c.top + 2 && c.bottom > a.top + 2) overlap++; } });
    ok(sizes.size === 1 && overlap === 0, "음절 글자 한 크기 · 겹침 0(좁은 칸은 위·아래 두 층)", `${[...sizes].join(",")} · 겹침 ${overlap} · 좁은 칸 ${p.querySelectorAll(".csyl .cel.narrow").length}`);
    // 음절 칸 = 표시만(투덜이 10-07) — 단추 아님 · 손가락 커서 없음 · 탭 순서 밖 · 눌러도 소리 없음
    { const cel = p.querySelector(".crow.m .csyl .cel[data-k='3']"), lp0 = c.lastPlay; window.__cmp.stopPlay(); cel.click(); await W(200);
      const cs = getComputedStyle(cel);
      ok(cel.tagName !== "BUTTON" && cs.cursor !== "pointer" && cel.tabIndex < 0 && c.lastPlay === lp0 && !c.st.el && !c.st.src, "음절 칸 = 표시만(단추 아님 · 커서 기본 · 탭 밖 · 눌러도 소리 없음)", `${cel.tagName} · ${cs.cursor} · tab ${cel.tabIndex}`); }
    // 파형 = 누르고 싶게 — 올리면 세로 막대 + 시각 · 손가락 커서 · 누르면 그 음절 첫머리부터 그 줄 속도로 끝까지 · 재생 중 ▶ 칠
    { const wv = p.querySelector(".crow.m .cwave"), wr = wv.getBoundingClientRect(), s3 = c.msyl[3], x = wr.left + ((s3.s + s3.e) / 2 - c.mLead) / c.span * wr.width, y = wr.top + wr.height / 2;
      wv.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true, pointerType: "mouse" })); await W(50);
      const h = wv.querySelector(".chov"), hl = h && !h.hidden ? h.firstChild.textContent : "";
      wv.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true })); await W(250); const lp = c.lastPlay, onB = p.querySelector(".crow.m").classList.contains("on");
      ok(getComputedStyle(wv).cursor === "pointer" && hl === `${(s3.s - c.mLead).toFixed(2)}s` && Math.abs(lp.from - s3.s) < 0.005 && lp.to === undefined && onB, "파형: 올리면 막대 + 시각 · 누르면 「읽」 첫머리부터 끝까지 · ▶ 칠", `미리 보기 ${hl} · ${lp.from.toFixed(2)}~끝 · 칠 ${onB}`);
      wv.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true })); window.__cmp.stopPlay(); await W(100); }
    // ▶ 그 줄 전체 — 누르면 처음부터 · 재생 중 칠 · 다시 누르면 멈춤
    { const pm = p.querySelector(".crow.m [data-play]"); pm.click(); await W(250); const on1 = p.querySelector(".crow.m").classList.contains("on"), lp = c.lastPlay; pm.click(); await W(150); const on2 = p.querySelector(".crow.m").classList.contains("on");
      ok(/\p{L}/u.test(pm.textContent) && on1 && Math.abs(lp.from - c.mLead) < 0.005 && lp.to === undefined && !on2, "▶ 줄 전체 듣기(처음부터 · 칠) → 다시 누르면 멈춤", `${pm.textContent} · ${on1}/${on2}`); }
    // 줄마다 속도(본부 10-07) — 본보기 줄 단추 두 번 = 0.75× · 그 줄 음절 누르면 <audio> rate 0.75 · 음높이 그대로 · 내 목소리 줄은 1× 그대로(보통 재생) · 기억됨
    { try { localStorage.removeItem("malmun.rate.m"); localStorage.removeItem("malmun.rate.y"); } catch {}
      const rm = () => p.querySelector(".crow.m [data-rate]"), ry = () => p.querySelector(".crow.y [data-rate]");
      rm().click(); await W(50); rm().click(); await W(50);
      const t1 = performance.now(); p.querySelector(".crow.m [data-play]").click(); await W(300);
      const el = c.st.el, a = [el?.playbackRate, el?.preservesPitch]; let endMs = 1; c.st.el?.pause(); window.__cmp.st.elDone?.();
      p.querySelector(".crow.y [data-play]").click(); await W(200); const yEl = !!c.st.el; p.querySelector(".crow.y [data-play]").click(); await W(100);
      ok(/ 0\.75×$/.test(rm().textContent) && /\p{L}/u.test(rm().textContent) && rm().getAttribute("aria-pressed") === "true" && / 1×$/.test(ry().textContent) && a[0] === 0.75 && a[1] === true && endMs > 0 && !yEl && localStorage.getItem("malmun.rate.m") === "0.75", "줄마다 속도: 본보기 0.75×(음높이 그대로 · 칠 · 기억) · 내 목소리 1×(보통 재생)", `본보기 ${rm().textContent} rate ${a[0]} pitch ${a[1]} ${Math.round(endMs)}ms · 내 ${ry().textContent}`);
      for (let k = 0; k < 3; k++) { rm().click(); await W(30); }
      ok(/ 1×$/.test(rm().textContent) && rm().getAttribute("aria-pressed") === "false", "단계 차례 0.75 → 0.6 → 0.5 → 1 (1× = 칠 없음)", rm().textContent); }
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
    // 그림·재생 한 기준(본부 10-06) — 앞 1초 잡음(부스럭) + 말 → 내 목소리 줄 x=0 = lead · 음절 칸 누르면 그 칸 밑 파형 구간이 그대로 나옴
    { const { wavOf } = await import(`/js/recstore.js?v=${v}`), ctx = new OfflineAudioContext(1, 44100, 44100);
      const m = await ctx.decodeAudioData(await (await fetch("/media/audio/L01-00-01/units/L01-00-01_13_p02.mp3")).arrayBuffer()), d = m.getChannelData(0), sr = m.sampleRate;
      const pre = Math.round(sr * 1), nb = ctx.createBuffer(1, pre + d.length, sr), x = nb.getChannelData(0);
      for (let i = 0; i < pre; i++) x[i] = (Math.random() * 2 - 1) * 0.004; x.set(d, pre);
      S.blob = wavOf(nb, 0, nb.duration, 1); S.heardHTML = `<span class="lab">x:</span> <span class="ko">${heardHTML(want, want).html}</span>`;
      b.disabled = false; b.click(); await W(2500);
      const c2 = window.__cmp, cells = [...p.querySelectorAll(".crow.y .csyl .cel")];
      const posOk = cells.every((el, k) => Math.abs(parseFloat(el.style.left) - (100 * (c2.ysyl[k].s - c2.yLead)) / c2.span) < 0.5);
      { const wv = p.querySelector(".crow.y .cwave"), wr = wv.getBoundingClientRect(), s3 = c2.ysyl[3]; wv.dispatchEvent(new MouseEvent("click", { clientX: wr.left + ((s3.s + s3.e) / 2 - c2.yLead) / c2.span * wr.width, clientY: wr.top + 5, bubbles: true })); } await W(300);
      const lp = c2.lastPlay, yd = c2.ybuf.getChannelData(0), ysr = c2.ybuf.sampleRate, rms = (a, z) => { let q = 0; for (let i = Math.round(a * ysr); i < Math.round(z * ysr); i++) q += yd[i] * yd[i]; return Math.sqrt(q / Math.max(1, Math.round((z - a) * ysr))); };
      ok(c2.yLead > 0.9 && posOk && lp?.ri === 1 && Math.abs(lp.from - c2.ysyl[3].s) < 0.005 && rms(c2.ysyl[3].s, c2.ysyl[3].e) > 5 * rms(0.2, 0.8), "앞 1초 잡음 녹음: x=0 = lead · 칸 자리 = (s−lead)/전체 · 「읽」 자리 파형 누름 = 그 음절부터(말소리 있음)", `lead ${c2.yLead.toFixed(2)} · 칸 ${c2.ysyl[3].s.toFixed(2)}~${c2.ysyl[3].e.toFixed(2)} · 튼 곳 ${lp?.from.toFixed(2)}`);
      b.click(); await W(200); }
    // 투덜이 10-08: 견본 나오는 중 내 목소리 줄 ▶ → 두 겹(끊긴 차례 재생이 내 목소리를 또 틂) · 아래 [내 목소리] 단추는 비교 줄 재생 때 안 켬 · 방금 점수 표시
    { S.score = 88; const p2 = document.querySelector(".panel"), b2 = p2.querySelector("[data-act=both]"); b2.click(); await W(600); b2.click(); for (let k = 0; k < 40 && !p2.querySelector(".crow.y [data-play]"); k++) await W(150); await W(300);
      const c3 = window.__cmp; c3.plays = []; p2.querySelector(".crow.y [data-play]").click(); await W(250);
      const lit = p2.querySelector("[data-act=mine]").classList.contains("playing"); await W(c3.ybuf.duration * 1000 + 2500);
      const ys = c3.plays.filter(r => r === 1).length;
      ok(ys === 1 && !lit, "견본 나오는 중 내 목소리 줄 ▶ → 내 목소리 한 번만(두 겹 없음) · 아래 단추 안 켜짐", `내 목소리 ${ys}번 · 아래 칠 ${lit}`);
      const sc = p2.querySelector(".cmp .cscore"); ok(!!sc && /%/.test(sc.textContent) && sc.getBoundingClientRect().right <= p2.getBoundingClientRect().right + 1, "비교 화면에 방금 점수(내 목소리 줄 오른쪽 · 창 안)", sc?.textContent || "없음"); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = `${innerWidth}x${innerHeight}\n` + res.join("\n"); console.log(out); return out;
})();
