// 쓰기 덧붙임 점검(투덜이 10-13 폰 확인) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게
// ⓐ 손으로 쓸 때 소리 — 「이」 ㅇ 획을 맞게 그으면 ㅇ 소리 · ㅣ 까지 그어 통과 = 딩동 → 「이」 글자 소리 · 「스윽」 없음
// ⓑ 앱 글 언어 바뀜(malmun:uilang · 앱개발부 안 A) — ne 쓰기 창(자판·손글씨)을 연 채로 한국어 앱 글 ⇄ 네팔어 앱 글 → 쓰기 창 앱 글이 그 언어로만(배우는 한국어 글자 칸 제외) · 쓰던 자리·획 그대로 · 화면 다시 안 그림
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`); window.__wxRes = res;
  window.__sfxVolume = 0.0001; const log = (window.__sfxLog = []);
  let osc = 0; const oS = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { osc++; return oS.apply(this, a); };
  const keep = { mode: localStorage.getItem("malmun.wmode"), hmode: localStorage.getItem("malmun.hmode"), lang: localStorage.getItem("malmun.lang") };
  const wr = () => $(".panel .write")?.parentElement?.__wr, idle = async (ms = 6000) => { const t0 = performance.now(); await W(150); while (performance.now() - t0 < ms && wr()?.busy?.()) await W(100); await W(150); };
  const open = async li => { $(".panel [data-act=close]")?.click(); await W(400); document.querySelectorAll(".line")[li].querySelector("[data-act=write]").click(); await W(2200); document.querySelector("video")?.pause(); await idle(); };
  const i18n = await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`);
  try {
    // ⓐ 「이」 = 13번 줄 이게 등 — 위 글자 줄에서 「이」 고르기
    localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", "free"); localStorage.setItem("malmun.htool", "pen");
    let li = [...document.querySelectorAll(".line")].findIndex(l => /이/.test(l.textContent)); await open(Math.max(0, li));
    const cb = [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === "이"); cb?.click(); await W(1500); wr()?.hand()?.stopOrder?.(); await idle();
    const H = wr().hand(), ch = H.ch, list = await wr().strokesOf(ch), iv = $(".panel .hink"); let id = 70;
    const ev = (t, [x, y]) => { const r = iv.getBoundingClientRect(); iv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height })); };
    const draw = async P => { ev("pointerdown", P[0]); for (const q of P) ev("pointermove", q); ev("pointerup", P[P.length - 1]); id++; await W(60); };
    log.length = 0; const o0 = osc;
    const F0 = await wr().fitPath(ch, 0, "pen"); await draw(F0.map(q => [q.x, q.y])); await W(900);
    const s1 = log.filter(e => e.ev === "시작").map(e => e.name);
    for (let i = 1; i < list.length; i++) { const F = await wr().fitPath(ch, i, "pen"); await draw(F.map(q => [q.x, q.y])); } await W(1500); await idle(5000);
    const s2 = log.filter(e => e.ev === "시작").map(e => e.name), dings = (osc - o0) / 2, swish = s2.filter(n => /^swish/.test(n)).length;
    const charHex = "u" + ch.codePointAt(0).toString(16).toUpperCase() + ".mp3";
    ok(s1.length >= 1 && /j_|\/j\//.test(s1[0]) && H.passed && dings >= 1 && s2.some(n => n.endsWith(charHex)) && !swish, "ⓐ 손으로: 첫 자모 다 그음 = 그 자모 소리 · 통과 = 딩동 → 글자 소리 · 스윽 없음", `${ch} · ㅇ 뒤 ${s1.join(",") || "없음"} · 끝 ${s2.slice(-2).join(",")} · 딩동 ${dings} · 통과 ${H.passed}`);
    // ⓒ 칸 밖에서 손 뗌(투덜이 10-14 PC 마우스 「자석이 갑자기 안 먹고 획이 그대로 남음」 — 손 뗌 잡기가 주석에 묻혀 있던 것) — 자석: 획마다 칸 밖(문서)에서 놓아도 붙음 → 통과 · 자유: 획이 끝나 남지 않고 채점됨
    for (const hm of ["magnet", "free"]) {
      localStorage.setItem("malmun.hmode", hm); localStorage.setItem("malmun.wmode", "hand"); await open(4); const cz = [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === "자"); cz?.click(); await W(1500); wr()?.hand()?.stopOrder?.(); await idle();
      const H2 = wr().hand(), L2 = await wr().strokesOf(H2.ch); for (let k = 0; k < 30 && hm === "magnet" && !H2.magList; k++) await W(100);
      const iv3 = $(".panel .hink"), R3 = iv3.getBoundingClientRect(), pe = (el, t, x, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: R3.left + x * R3.width, clientY: R3.top + y * R3.height }));
      let stuck = 0; for (let i = 0; i < L2.length; i++) { const Q = await wr().fitPath(H2.ch, i, "pen"); pe(iv3, "pointerdown", Q[0].x, Q[0].y); Q.forEach(q => pe(iv3, "pointermove", q.x, q.y)); pe(document.body, "pointerup", 1.3, -0.1); await W(450); if (H2.cur) stuck++; pe(iv3, "pointermove", 0.5, 0.5); }
      await W(2200); const loose = H2.strokes.filter(S => !S.snap).length;
      ok(!stuck && H2.passed && (hm === "free" || !loose), `ⓒ [${hm === "magnet" ? "자석" : "자유"}] 칸 밖에서 손 떼도 획이 끝남 · ${hm === "magnet" ? "붙음 → 「순서 맞음」" : "채점 → 통과"}`, `${H2.ch} · 안 끝난 획 ${stuck} · 안 붙은 획 ${hm === "magnet" ? loose : "-"} · 통과 ${H2.passed} · 「${$(".panel .hscore")?.textContent || ""}」`);
    }
    localStorage.setItem("malmun.hmode", "free");
    // ⓓ 획 사이에 천천히(2.5초) = 다 쓰기 전에는 채점 안 함 · 마지막 획 뒤 1.2초에 자동 채점(투덜이 10-14 「쓰는 도중에 갑자기 꽝」) ⓔ 점수 표시가 손글씨 칸과 안 겹침(10-14 「40%」가 「글」 ㄱ 위)
    { localStorage.setItem("malmun.wmode", "hand"); await open(4); const cg = [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === "글"); cg?.click(); await W(1500); wr()?.hand()?.stopOrder?.(); await idle();
      const H3 = wr().hand(), L3 = await wr().strokesOf(H3.ch), iv4 = $(".panel .hink"), R4 = iv4.getBoundingClientRect(), pe = (t, x, y) => iv4.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 2, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: R4.left + x * R4.width, clientY: R4.top + y * R4.height }));
      let early = 0; for (let i = 0; i < L3.length; i++) { const Q = await wr().fitPath(H3.ch, i, "pen"); pe("pointerdown", Q[0].x, Q[0].y); Q.forEach(q => pe("pointermove", q.x, q.y)); pe("pointerup", Q[Q.length - 1].x, Q[Q.length - 1].y); if (i < L3.length - 1) { await W(2500); if (!$(".panel .hscore").hidden) early++; } }
      await W(2200); const sc = $(".panel .hscore"), shown = !sc.hidden, hb = $(".panel .hbox").getBoundingClientRect(), sr = sc.getBoundingClientRect(), over = sr.right > hb.left && sr.left < hb.right && sr.bottom > hb.top && sr.top < hb.bottom;
      ok(!early && shown && H3.passed, "ⓓ 획 사이 2.5초씩 쉬어도 다 쓰기 전 채점 없음 · 다 쓰면 자동 채점", `${H3.ch} ${L3.length}획 · 이른 채점 ${early} · 끝 「${sc.textContent}」 · 통과 ${H3.passed}`);
      ok(shown && !over, "ⓔ 점수 표시가 손글씨 칸 밖(겹침 0)", `점수 ${Math.round(sr.left)},${Math.round(sr.top)} · 칸 ${Math.round(hb.left)}~${Math.round(hb.right)},${Math.round(hb.top)}~${Math.round(hb.bottom)}`); }
    // ── 투덜이 10-14 쓰기 지시 ──
    const openCh = async (li2, chx, mode = "hand") => { localStorage.setItem("malmun.wmode", mode); localStorage.setItem("malmun.hmode", "free"); await open(li2); const b0 = [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === chx); if (!b0) { for (let k = 0; k < 6 && ![...document.querySelectorAll(".panel .sent .c")].some(b => b.textContent === chx); k++) { $(".panel .segnav [data-seg='1']")?.click(); await W(700); } } [...document.querySelectorAll(".panel .sent .c")].find(b => b.textContent === chx)?.click(); await W(1500); wr()?.hand()?.stopOrder?.(); await idle(); return wr()?.hand(); };
    const pev = (iv5, t, x, y, id5 = 5) => { const r = iv5.getBoundingClientRect(); iv5.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: id5, pointerType: "mouse", isPrimary: true, buttons: t === "pointerup" ? 0 : 1, clientX: r.left + x * r.width, clientY: r.top + y * r.height })); };
    const drawP = async (P, slow = 0) => { const iv5 = $(".panel .hink"); pev(iv5, "pointerdown", ...P[0]); for (const q of P) { pev(iv5, "pointermove", ...q); if (slow) await W(slow); } pev(iv5, "pointerup", ...P[P.length - 1]); await W(80); };
    const liOf = chx => [...document.querySelectorAll(".line")].findIndex(l => (l.querySelector(".kotext")?.textContent || l.textContent).includes(chx));
    // ⓕ ㅇ 소리(연필 · 손으로 조금 크게·비뚤게 그린 ㅇ 5번 = 5번 다 「이응」)
    { localStorage.setItem("malmun.htool", "pencil"); let got = 0; const tries = 5;
      for (let k = 0; k < tries; k++) { const H5 = await openCh(Math.max(0, liOf("있")), "있"); const Q = await wr().fitPath("있", 0, "pencil"); const cx = Q.reduce((a, q) => a + q.x, 0) / Q.length, cy = Q.reduce((a, q) => a + q.y, 0) / Q.length, sc = 1.12 + 0.04 * k, dx = 0.012 * (k - 2);
        log.length = 0; await drawP(Q.map(q => [cx + (q.x - cx) * sc + dx, cy + (q.y - cy) * sc - dx])); await W(700); if (log.some(e => e.ev === "시작" && /j_ieung|j_i?eung|ieung/.test(e.name))) got++; }
      ok(got === tries, "ⓕ 연필 · 손으로 조금 크게·비뚤게 그린 ㅇ = 「이응」 소리 늘(5/5)", `${got}/${tries} · ${log.filter(e => e.ev === "시작").map(e => e.name.split("/").pop()).join(",") || "소리 없음"}`); }
    // ⓖ 자동 멈춤·이어 가기 — 한 줄 자동으로 「있」 2획(ㅇ·ㅣ)까지 → 한 줄 자동 다시 = 멈춤(그 자리) → 전체 자동 = 지운 것 없이 다음 획부터
    { const H6 = await openCh(Math.max(0, liOf("있")), "있"); $(".panel [data-act=auto]").click(); let g = 0; while (g++ < 200 && !(wr().hand() === H6 && H6.ordAt && H6.ordAt.i >= 2)) await W(50);
      $(".panel [data-act=auto]").click(); await W(400); const at = H6.ordAt ? { ...H6.ordAt } : null, stopped = !wr().st().auto, same = wr().hand() === H6; await W(1500); const still = H6.ordAt && at && H6.ordAt.i === at.i && !wr().st().auto;
      const seen = []; const mo = setInterval(() => { if (wr().hand() === H6 && H6.ordAt) seen.push(H6.ordAt.i); }, 40); $(".panel [data-act=autoall]").click(); await W(1500); clearInterval(mo);
      ok(stopped && same && still && at && seen.length && Math.min(...seen) >= at.i, "ⓖ 한 줄 자동 중 같은 단추 = 그 자리(획)에서 멈춤 · 전체 자동 = 그 획부터 이어서(처음부터 다시 안 그림)", `멈춘 자리 ${at ? at.i + 1 + "획 " + Math.round(at.f * 100) + "%" : "-"} · 1.5초 뒤 그대로 ${!!still} · 이어서 그린 획 ${[...new Set(seen)].map(i => i + 1).join(",")}`);
      $(".panel [data-act=autoall]").click(); await W(400); }
    // ⓘ 「다음 ▶」 = 늘 있음 · 누르면 소리 없이 바로 다음 글자
    { const H7 = await openCh(Math.max(0, liOf("있")), "있"); const nb = $(".panel [data-act=hnext]"), pos0 = `${wr().st().w}.${wr().st().c}`; log.length = 0; const o7 = osc; nb?.click(); await W(1500);
      const snd = log.filter(e => e.ev === "시작").length + (osc - o7); ok(!!nb && !nb.disabled && wr().hand() !== H7 && `${wr().st().w}.${wr().st().c}` !== pos0 && snd === 0, "ⓘ 「다음 ▶」 늘 있음 · 누르면 아무것도 안 읽고 바로 다음 글자", `${pos0} → ${wr().st().w}.${wr().st().c} · 소리 ${snd}`); }
    // ⓗ 시간 채점 — 「이」(2획) 첫 획만 긋고 기다림 = 시간 끝에 채점(덜 씀 → 꽝 · 그 글자 머묾) · 다 그으면 바로 채점 → 통과 = 딩동 → 글자 → 다음 글자
    { const H8 = await openCh(Math.max(0, liOf("이")), "이"); const L8 = await wr().strokesOf("이"), lim = (4 + 2.5 * L8.length) * 1000; const Q0 = await wr().fitPath("이", 0, "pen");
      const bar0 = $(".panel .htime"); await drawP(Q0.map(q => [q.x, q.y])); await W(300); const shown = bar0?.classList.contains("on"); await W(lim + 400);
      const sc8 = $(".panel .hscore"), judged = !sc8.hidden, stay = wr().hand() === H8 && !H8.passed;
      ok(shown && judged && stay, "ⓗ 시간 막대 · 덜 그은 채 시간 끝 = 채점(통과 못 함 → 그 글자에 머묾)", `막대 ${shown} · 제한 ${lim / 1000}초 · 점수 「${sc8.textContent}」 · 머묾 ${stay}`);
      await W(1500); const H9 = wr().hand(); log.length = 0; const o9 = osc; for (let i = 0; i < L8.length; i++) { const Q = await wr().fitPath("이", i, "pen"); await drawP(Q.map(q => [q.x, q.y])); } await W(1400);
      await W(2500); const stay9 = wr().hand() === H9, nudge = !!$(".panel [data-act=hnext].nudge"), said = log.some(e => e.ev === "시작" && /uC774\.mp3$/.test(e.name));
      ok(H9.passed && stay9 && nudge && said && osc > o9, "ⓗ 다 그으면 바로 채점 → 통과 = 딩동 → 「이」 → 그 글자에 머묾 · 「다음 ▶」 반짝(대표님 10-16 설명 볼 틈)", `통과 ${H9.passed} · 글자 소리 ${said} · 머묾 ${stay9} · 반짝 ${nudge}`); }
    // ⓙ 쓰는 효과음 — 손(연필·펜·붓) · 순서 · 자동 모두
    { const got = {}; for (const tk of ["pencil", "pen", "brush"]) { localStorage.setItem("malmun.htool", tk); await openCh(Math.max(0, liOf("이")), "이"); log.length = 0; const Q = await wr().fitPath("이", 1, tk); await drawP(Q.map(q => [q.x, q.y]), 4); got["손 " + tk] = log.some(e => e.name === "draw/" + tk);
        log.length = 0; $(".panel [data-act=horder]").click(); await W(1300); got["순서 " + tk] = log.some(e => e.name === "swish/" + tk); $(".panel [data-act=horder]").click(); await W(200); }
      localStorage.setItem("malmun.htool", "pencil"); await openCh(Math.max(0, liOf("이")), "이"); log.length = 0; $(".panel [data-act=auto]").click(); await W(1500); got["자동 pencil"] = log.some(e => e.name === "swish/pencil"); $(".panel [data-act=auto]").click(); await W(300);
      ok(Object.values(got).every(Boolean), "ⓙ 쓰는 효과음 — 손으로 긋기·순서·자동 · 연필·펜·붓 모두", Object.entries(got).map(([k, v]) => `${k} ${v ? "○" : "✗"}`).join(" · ")); }
    localStorage.setItem("malmun.htool", "pen");
    // ⓛ 시간 끝(투덜이 10-15 「시간 막대가 다 지나도 계속 써져」) — 「이」 첫 획을 긋는 채로 시간이 끝남 → 그 자리에서 채점(꽝) · 손 떼고 10ms 뒤 새 획 = 막힘(획 수 그대로 · 새 시간 시작 안 함) · 꽝 지운 뒤 새 획 = 시간 처음부터 · 막대 숫자 = 남은 시간
    { localStorage.setItem("malmun.hmode", "free"); const H = await openCh(Math.max(0, liOf("이")), "이"); const L = await wr().strokesOf("이"), lim = (4 + 2.5 * L.length) * 1000, Q = await wr().fitPath("이", 0, "pen"), iv5 = $(".panel .hink");
      pev(iv5, "pointerdown", Q[0].x, Q[0].y); for (const q of Q.slice(0, Math.floor(Q.length / 2))) pev(iv5, "pointermove", q.x, q.y); await W(1500);
      const bar = $(".panel .htime b"), shownSec = +bar.textContent, realSec = Math.ceil((H.tLimit - (performance.now() - H.tStart)) / 1000), numOk = Math.abs(shownSec - realSec) <= 1;
      await W(Math.max(0, lim - 1500) + 300); /* 시간 끝 + 0.3초(꽝 지움 1.2초 전) */ const judgedAt = !$(".panel .hscore").hidden, curEnded = !H.cur; const n1 = H.strokes.length;
      pev(iv5, "pointerup", 0.5, 0.5); await W(10); pev(iv5, "pointerdown", 0.3, 0.3); pev(iv5, "pointermove", 0.4, 0.4); pev(iv5, "pointerup", 0.4, 0.4); await W(200);
      const blocked = H.strokes.length === n1 && !H.tStart; await W(1500);
      pev(iv5, "pointerdown", Q[0].x, Q[0].y); pev(iv5, "pointermove", Q[1].x, Q[1].y); await W(300); const restarted = !!H.tStart && H.tLimit - (performance.now() - H.tStart) > lim - 1500; pev(iv5, "pointerup", Q[1].x, Q[1].y); await W(200);
      ok(judgedAt && curEnded && blocked && restarted && numOk && !H.passed, "ⓛ 시간 끝 = 긋는 중이어도 바로 채점(꽝) · 바로 이어 긋는 획 막힘 · 꽝 지운 뒤 새 획 = 시간 처음부터 · 막대 숫자 = 남은 시간", `채점 ${judgedAt} 「${$(".panel .hscore").textContent}」 · 획 끝냄 ${curEnded} · 막힘 ${blocked} · 다시 시작 ${restarted} · 숫자 ${shownSec}/실제 ${realSec}`); }
    // ⓚ 다시 쓸 때도 쓰는 소리(투덜이 10-14 「한 번 쓰고 다시 쓸 때 가끔 소리가 안 남」) — 경우마다 한 획 긋고 draw/ 「효과음」 1번 이상
    { const res2 = []; const stroke = async () => { const H = wr().hand(); const L = await wr().strokesOf(H.ch); const Q = await wr().fitPath(H.ch, Math.min(L.length - 1, 1), "pen"); log.length = 0; await drawP(Q.map(q => [q.x, q.y]), 3); return log.filter(e => /^draw\//.test(e.name || "")).length; };
      const li9 = Math.max(0, liOf("있")); await openCh(li9, "있"); res2.push(["첫 획", await stroke()]);
      $(".panel [data-act=hclear]").click(); await W(200); res2.push(["지우기 뒤", await stroke()]);
      $(".panel [data-act=hundo]").click(); await W(200); res2.push(["되돌리기 뒤", await stroke()]);
      $(".panel [data-tool=brush]").click(); await W(200); res2.push(["도구 바꾼 뒤", await stroke()]); $(".panel [data-tool=pen]").click(); await W(200);
      $(".panel [data-act=hnext]").click(); await W(1500); res2.push(["다음 ▶ 뒤", await stroke()]);
      $(".panel [data-act=auto]").click(); await W(1300); $(".panel [data-act=auto]").click(); await W(500); res2.push(["자동 멈춘 뒤", await stroke()]);
      { await openCh(li9, "있"); const H = wr().hand(); const L = await wr().strokesOf(H.ch); for (let i = 0; i < L.length; i++) { const Q = await wr().fitPath(H.ch, i, "pen"); await drawP(Q.map(q => [q.x + 0.2, q.y])); } await W(1800); await W(1400); res2.push(["꽝 뒤 저절로 지운 다음", await stroke()]); }
      $(".panel [data-act=close]").click(); await W(500); await openCh(li9, "있"); res2.push(["창 닫았다 연 뒤", await stroke()]);
      ok(res2.every(([, n]) => n >= 1), "ⓚ 다시 쓸 때마다 쓰는 소리(지우기·되돌리기·도구·다음·자동 뒤·꽝 뒤·다시 열기)", res2.map(([k, n]) => `${k} ${n}`).join(" · ")); }
    // ⓑ 앱 글 언어 바뀜
    localStorage.setItem("malmun.lang", "ne"); await i18n.setLang("ne"); await i18n.setUiKo(false);
    const appText = () => { const sc = $(".panel .scr.write"); if (!sc) return ""; const c = sc.cloneNode(true); c.querySelectorAll(".sent, .info .wko, .typed, .target, .slots, .kb, .hbox, .info .rom, .info .mean, .hscore, .uiko, [lang=ko]").forEach(x => x.remove()); /* lang=ko = 배우는 한국어(판정 상자 속 글자·자모 등) */ return c.innerText + " " + [...c.querySelectorAll("[aria-label]")].map(x => x.getAttribute("aria-label")).join(" "); };
    for (const mode of ["kb", "hand"]) {
      localStorage.setItem("malmun.wmode", mode); await open(1); const sc0 = $(".panel .scr.write");
      if (mode === "hand") { const F = await wr().fitPath(wr().hand().ch, 0, "pen"); const iv2 = $(".panel .hink"); const e2 = (t, [x, y]) => { const r = iv2.getBoundingClientRect(); iv2.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 90, pointerType: "touch", isPrimary: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height })); }; const P = F.map(q => [q.x, q.y]); e2("pointerdown", P[0]); P.forEach(q => e2("pointermove", q)); e2("pointerup", P[P.length - 1]); await W(200); }
      const pos0 = JSON.stringify([wr().st().s, wr().st().w, wr().st().c, wr().st().k]), nStr0 = wr().hand()?.strokes.length ?? -1;
      await (async on => { const sc = document.querySelector(".panel .scr.write"); if (sc && (sc.dataset.uiko === "1") !== on) sc.querySelector("[data-act=uiko]")?.click(); })(true); await W(400);
      const ko = appText(), hasDeva = /[ऀ-ॿ]/.test(ko);
      const same = $(".panel .scr.write") === sc0 && JSON.stringify([wr().st().s, wr().st().w, wr().st().c, wr().st().k]) === pos0 && (wr().hand()?.strokes.length ?? -1) === nStr0;
      await (async on => { const sc = document.querySelector(".panel .scr.write"); if (sc && (sc.dataset.uiko === "1") !== on) sc.querySelector("[data-act=uiko]")?.click(); })(false); await W(400);
      const ne = appText(), hasKo = /[가-힣]/.test(ne.replace(/\d+ \/ \d+ · [^\n]*/g, "")); // 머리 줄 화자 이름(배우는 한국어) 빼고
      ok(!hasDeva && !hasKo && same, `ⓑ [${mode}] 앱 글 한국어⇄네팔어 = 쓰기 창 글이 그 언어로만 · 자리·획 그대로 · 다시 안 그림`, `한국어일 때 네팔어 ${hasDeva} 「${(ko.match(/[ऀ-ॿ][^\n]{0,12}/) || [""])[0]}」 · 네팔어일 때 한국어 ${hasKo} 「${(ne.replace(/\d+ \/ \d+ · [^\n]*/g, "").match(/[가-힣][^\n]{0,12}/) || [""])[0]}」 · 그대로 ${same}`);
    }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " · " + String(e.stack || "").split("\n").slice(1, 3).join(" ").slice(0, 160)); }
  try { await i18n.setUiKo(false); await i18n.setLang(keep.lang || "en"); } catch {}
  try { for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode], ["malmun.lang", keep.lang]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
  $(".panel [data-act=close]")?.click(); OscillatorNode.prototype.start = oS;
  return res.join("\n");
})();
