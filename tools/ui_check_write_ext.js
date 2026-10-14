// 쓰기 덧붙임 점검(투덜이 10-13 폰 확인) — #/learn/L01-00-01 을 연 채로 · 소리 아주 작게
// ⓐ 손으로 쓸 때 소리 — 「이」 ㅇ 획을 맞게 그으면 ㅇ 소리 · ㅣ 까지 그어 통과 = 딩동 → 「이」 글자 소리 · 「스윽」 없음
// ⓑ 앱 글 언어 바뀜(malmun:uilang · 앱개발부 안 A) — ne 쓰기 창(자판·손글씨)을 연 채로 한국어 앱 글 ⇄ 네팔어 앱 글 → 쓰기 창 앱 글이 그 언어로만(배우는 한국어 글자 칸 제외) · 쓰던 자리·획 그대로 · 화면 다시 안 그림
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
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
    // ⓑ 앱 글 언어 바뀜
    localStorage.setItem("malmun.lang", "ne"); await i18n.setLang("ne"); await i18n.setUiKo(false);
    const appText = () => { const sc = $(".panel .scr.write"); if (!sc) return ""; const c = sc.cloneNode(true); c.querySelectorAll(".sent, .info .wko, .typed, .target, .slots, .kb, .hbox, .info .rom, .info .mean, .hscore").forEach(x => x.remove()); return c.innerText + " " + [...c.querySelectorAll("[aria-label]")].map(x => x.getAttribute("aria-label")).join(" "); };
    for (const mode of ["kb", "hand"]) {
      localStorage.setItem("malmun.wmode", mode); await open(1); const sc0 = $(".panel .scr.write");
      if (mode === "hand") { const F = await wr().fitPath(wr().hand().ch, 0, "pen"); const iv2 = $(".panel .hink"); const e2 = (t, [x, y]) => { const r = iv2.getBoundingClientRect(); iv2.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 90, pointerType: "touch", isPrimary: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height })); }; const P = F.map(q => [q.x, q.y]); e2("pointerdown", P[0]); P.forEach(q => e2("pointermove", q)); e2("pointerup", P[P.length - 1]); await W(200); }
      const pos0 = JSON.stringify([wr().st().s, wr().st().w, wr().st().c, wr().st().k]), nStr0 = wr().hand()?.strokes.length ?? -1;
      await i18n.setUiKo(true); window.dispatchEvent(new CustomEvent("malmun:uilang")); await W(400);
      const ko = appText(), hasDeva = /[ऀ-ॿ]/.test(ko);
      const same = $(".panel .scr.write") === sc0 && JSON.stringify([wr().st().s, wr().st().w, wr().st().c, wr().st().k]) === pos0 && (wr().hand()?.strokes.length ?? -1) === nStr0;
      await i18n.setUiKo(false); window.dispatchEvent(new CustomEvent("malmun:uilang")); await W(400);
      const ne = appText(), hasKo = /[가-힣]/.test(ne.replace(/\d+ \/ \d+ · [^\n]*/g, "")); // 머리 줄 화자 이름(배우는 한국어) 빼고
      ok(!hasDeva && !hasKo && same, `ⓑ [${mode}] 앱 글 한국어⇄네팔어 = 쓰기 창 글이 그 언어로만 · 자리·획 그대로 · 다시 안 그림`, `한국어일 때 네팔어 ${hasDeva} 「${(ko.match(/[ऀ-ॿ][^\n]{0,12}/) || [""])[0]}」 · 네팔어일 때 한국어 ${hasKo} 「${(ne.replace(/\d+ \/ \d+ · [^\n]*/g, "").match(/[가-힣][^\n]{0,12}/) || [""])[0]}」 · 그대로 ${same}`);
    }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " · " + String(e.stack || "").split("\n").slice(1, 3).join(" ").slice(0, 160)); }
  try { await i18n.setUiKo(false); await i18n.setLang(keep.lang || "en"); } catch {}
  try { for (const [k, v] of [["malmun.wmode", keep.mode], ["malmun.hmode", keep.hmode], ["malmun.lang", keep.lang]]) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
  $(".panel [data-act=close]")?.click(); OscillatorNode.prototype.start = oS;
  return res.join("\n");
})();
