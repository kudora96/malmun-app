// 쓰기 안내 소리(대표님 10-21 · 개발2팀 fbvoice) — #/learn/L01-00-01 · ne(⇄ 되는 말)
//  ⓐ 채점 전 안내: 그 줄 첫 글자 = 자동 읽기 시작(불) · 판정 상자 줄·꼬리표 그대로 ⓑ 채점 뒤: 점수·줄마다 칠 span(.fbs) · <p> 줄 수 그대로 · 자동 읽기(불)
//  ⓒ ⇄ = 틀 0px · 줄 수·칠 그대로 · 읽는 중이면 이어 읽음 ⓓ 새로 긋기(펜 대기) = 즉시 멈춤 ⓔ 상자 안 단추(⋯·💾) 누름 = 읽기 안 바뀜 · fbvoice 없으면 건너뜀
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; const v = document.documentElement.dataset.v, i18n = await import(`/js/i18n.js?v=${v}`), ui = await import(`/js/ui.js?v=${v}`);
  let fbOk = true; try { await import(`/js/fbvoice.js?v=${v}`); } catch { fbOk = false; }
  if (!fbOk) { res.push("✓ fbvoice 없음 — 건너뜀"); return res.join("\n"); }
  const keep = { lang: localStorage.getItem("malmun.lang"), mode: localStorage.getItem("malmun.wmode"), auto: localStorage.getItem("malmun.fbauto") };
  localStorage.setItem("malmun.lang", "ne"); await i18n.setLang("ne"); await i18n.setUiKo(false); localStorage.setItem("malmun.wmode", "hand"); localStorage.setItem("malmun.hmode", "free"); localStorage.removeItem("malmun.fbauto");
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[0].querySelector("[data-act=write]").click(); await W(2600);
  const bx = () => $(".panel .hjudge"), lit = () => !!bx()?.querySelector(".fbon") || bx()?.classList.contains("fbplay");
  ok(bx()?.classList.contains("guide") && bx().querySelectorAll("p").length >= 2 && lit(), "ⓐ 채점 전 안내 = 그 줄 첫 글자 자동 읽기(불) · 줄 그대로", `줄 ${bx()?.querySelectorAll("p").length} · 불 ${lit()}`);
  const wr = () => $(".panel .write").parentElement.__wr, H = wr().hand(), ch = H.ch, L = await wr().strokesOf(ch), iv = $(".panel .hink"), R = iv.getBoundingClientRect(); let id = 80;
  const draw = async Q => { const ev = (t, q) => iv.dispatchEvent(new PointerEvent(t, { pointerId: id, bubbles: true, cancelable: true, clientX: R.left + q.x * R.width, clientY: R.top + q.y * R.height, pointerType: "touch", isPrimary: true })); ev("pointerdown", Q[0]); for (const q of Q) ev("pointermove", q); ev("pointerup", Q.at(-1)); id++; await W(150); };
  for (let i = 0; i < L.length; i++) await draw((await wr().fitPath(ch, i, "pen")).map(q => ({ x: q.x + 0.05, y: q.y + 0.03 })));
  $(".panel [data-act=hdone]").click(); await W(1600);
  const nP = bx().querySelectorAll("p").length, nTg = bx().querySelectorAll(".tg").length, nS = new Set([...bx().querySelectorAll(".fbs")].map(s => s.dataset.fb)).size;
  ok(nP >= 1 && nS >= Math.min(nP, 1) && lit(), "ⓑ 채점 뒤 = 줄마다 칠 · <p> 줄·꼬리표 그대로 · 자동 읽기", `줄 ${nP} · 꼬리표 ${nTg} · 칠 ${nS} · 불 ${lit()}`);
  const pos = () => [...document.querySelectorAll(".panel .scr.write button, .panel .hbox, .panel .hjudge")].map(e => JSON.stringify(e.getBoundingClientRect())).join("|");
  const p0 = pos(); $(".panel .scr.write [data-act=uiko]").click(); await W(600); const p1 = pos(), n1 = bx().querySelectorAll("p").length, s1 = bx().querySelectorAll(".fbs").length, l1 = lit(); $(".panel .scr.write [data-act=uiko]").click(); await W(500);
  ok(p0 === p1 && n1 === nP && s1 > 0 && l1, "ⓒ ⇄ = 틀 0px · 줄·칠 그대로 · 이어 읽음(불)", `틀 ${p0 === p1} · 줄 ${n1} · 칠 ${s1} · 불 ${l1}`);
  const mb = bx().querySelector("button"); if (mb) { const a0 = lit(); mb.click(); await W(150); ok(lit() === a0 || !!$(".keepov") || !!$(".panel .hjfull"), "ⓔ 상자 안 단추 누름 = 읽기 안 바뀜"); document.querySelector(".keepov [data-kact=close]")?.click(); document.querySelector(".panel .hjfull")?.click(); await W(200); }
  if (!lit()) { bx().click(); await W(300); } const before = lit(); await draw([{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }]); await W(200);
  ok(before && !lit(), "ⓓ 새로 긋기 = 안내 소리 즉시 멈춤", `전 ${before} · 뒤 ${lit()}`);
  localStorage.setItem("malmun.lang", keep.lang || "en"); await i18n.setLang(keep.lang || "en"); keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode); keep.auto == null ? localStorage.removeItem("malmun.fbauto") : localStorage.setItem("malmun.fbauto", keep.auto);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 쓰기 안내 소리 ${res.length - nb}/${res.length}\n` + res.join("\n"); console.log(out); return out;
})();
