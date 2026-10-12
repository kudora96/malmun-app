// 영상 자막 켬/끔 + 선생님 말풍선 + #/explain 주소 점검(투덜이·본부 10-12) — #/learn/L01-00-01 을 연 채로 · 지금 창 크기에서
// ⓐ 자막 단추 = 단추 모양(테두리·바탕) · aria-pressed · 영상 틀(#vwrap = 전체 화면이 되는 칸) 안 ⓑ 끄면 자막(전체 화면 자막·영상 밑 큰 자막·줄 카드 글) 가림 · 켜면 보임
// ⓒ 다시 열어도 기억 ⓓ 말풍선 = 처음 전체 영상 때 뜸 · ✕ 로 닫힘 · 자막 단추·⛶ 와 안 겹침 · 영상 틀 안 · 3번 뒤엔 안 뜸 · 저절로 닫힘
// ⓔ #/explain/L01-00-01/3 = 학습 화면 + 3번 줄 새(v9) 설명 창(옛 kr.json 글 없음)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  const shot = n => { try { window.__qaShot?.(`fullsub_${innerWidth}_${n}.png`); } catch {} };
  const play0 = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play0.call(this).catch(() => {}); }; /* 끝에 되돌림 */
  const vis = el => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const R = el => el.getBoundingClientRect(), box = r => `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
  const openLearn = async (h = "#/learn/L01-00-01") => { location.hash = "#/list"; await W(500); location.hash = h; await W(2500); };
  try {
    try { localStorage.removeItem("malmun.fullsub"); localStorage.removeItem("malmun.fullsubtip"); } catch {}
    await openLearn();
    // ⓐ
    const b = $("#vwrap [data-act=subs]"), cs = b && getComputedStyle(b);
    const looks = !!cs && (parseFloat(cs.borderTopWidth) > 0 || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) && R(b).height >= 28;
    ok(!!b && b.tagName === "BUTTON" && looks && b.getAttribute("aria-pressed") === "true", "ⓐ 자막 단추 = 단추 모양 · aria-pressed=true(기본 켬)", b ? `${box(R(b))} 테두리 ${cs.borderTopWidth} 바탕 ${cs.backgroundColor}` : "없음");
    ok(!!b && $("#vwrap").contains(b) && $("#vwrap").contains($(".fstip")) && $("#vwrap").contains($(".cap")), "ⓐ 단추·말풍선·자막이 전체 화면 칸(#vwrap) 안 — 전체 화면에서도 보임");
    { const fs = R($("#vwrap [data-act=fs]")), sb = R(b), vw = R($("#vwrap"));
      ok(!hit(fs, sb) && sb.left >= vw.left - 0.5 && sb.right <= vw.right + 0.5 && sb.bottom <= vw.bottom + 0.5, "ⓐ 자막 단추가 ⛶ 와 안 겹치고 영상 틀 안", `단추 ${box(sb)} ⛶ ${box(fs)} 영상 ${box(vw)}`); }
    // ⓑ 끄기 · 켜기
    const ko = () => document.querySelector(".line.cur .kotext"), vin = $(".vsub .in");
    const vsubOn0 = !$(".vsub").hidden && vis(vin);
    b.click(); await W(150);
    const offP = b.getAttribute("aria-pressed") === "false", offC = $(".learn").classList.contains("nosub");
    const offVsub = !vis(vin), offCard = /blur/.test(getComputedStyle(ko()).filter), offCap = getComputedStyle($(".cap")).display === "none";
    shot("off"); await W(1500);
    ok(offP && offC && offVsub && offCard && offCap, "ⓑ 끄기 = 바로 자막 가림(영상 밑 큰 자막 · 지금 줄 카드 글 흐림 · 전체 화면 자막 없음)", `pressed ${b.getAttribute("aria-pressed")} · 큰 자막 처음 보임 ${vsubOn0}→${!offVsub ? "보임" : "가림"} · 카드 ${getComputedStyle(ko()).filter}`);
    // ⓑ' 흐린 카드 누름 → 그 카드만 보임 → 다시 누름 = 흐림 · 다시 보이게 한 뒤 다음 줄 = 흐림
    { const blur = el => /blur/.test(getComputedStyle(el).filter), c0 = document.querySelector(".line.cur"), i0 = +c0.dataset.i;
      const badge = getComputedStyle(c0, "::after").content;
      c0.querySelector(".kotext").click(); await W(150); const shown = !blur(c0.querySelector(".kotext")) && !blur(c0.querySelector(".tr") || c0.querySelector(".kotext")), stay = +document.querySelector(".line.cur").dataset.i === i0;
      const others = [...document.querySelectorAll(".line")].filter(x => x !== c0).every(x => blur(x.querySelector(".kotext")));
      shot("peek"); await W(1500);
      c0.querySelector(".kotext").click(); await W(150); const again = blur(c0.querySelector(".kotext"));
      c0.querySelector(".kotext").click(); await W(150); $(".ctrl [data-act=next]").click(); await W(400); $("video").pause();
      const c1 = document.querySelector(".line.cur"), afterNext = blur(c0.querySelector(".kotext")) && c1 !== c0 && blur(c1.querySelector(".kotext"));
      ok(/👁/.test(badge) && shown && stay && others && again && afterNext, "ⓑ 흐린 카드 누름 = 그 카드만 보임(줄 이동 없음) · 다시 누름 = 흐림 · 다음 줄로 가면 흐림 · 「👁」 표시", `표시 ${badge} · 보임 ${shown} 제자리 ${stay} 나머지 흐림 ${others} · 다시 ${again} · 다음 줄 ${afterNext}`); }
    let lsOff = null; try { lsOff = localStorage.getItem("malmun.fullsub"); } catch {}
    // 전체 화면 흉내 — 헤드리스에서 진짜로 들어가지면 자막 칸 display 도 확인
    let fsNote = "전체 화면 진입 안 됨(헤드리스) → 칸 안 자손 검사로 대신";
    try { await $("#vwrap").requestFullscreen(); await W(400); } catch {}
    if (document.fullscreenElement === $("#vwrap")) {
      const capOff = getComputedStyle($(".cap")).display === "none", btnIn = vis($("#vwrap [data-act=subs]"));
      $("#vwrap [data-act=subs]").click(); await W(150);
      const capOn = getComputedStyle($(".cap")).display !== "none";
      ok(capOff && capOn && btnIn, "ⓑ 전체 화면 안: 자막 단추 보임 · 끔 = 자막 없음 · 켬 = 자막", `끔 ${capOff} 켬 ${capOn}`);
      $("#vwrap [data-act=subs]").click(); await W(150); try { await document.exitFullscreen(); } catch {} await W(400); fsNote = "전체 화면에서 확인함";
    }
    ok(lsOff === "0", "ⓒ 끔이 기억됨(malmun.fullsub=0)", `${lsOff} · ${fsNote}`);
    await openLearn();
    const b2 = $("#vwrap [data-act=subs]");
    ok(b2?.getAttribute("aria-pressed") === "false" && $(".learn").classList.contains("nosub"), "ⓒ 다시 열어도 자막 끔 그대로");
    b2.click(); await W(150);
    ok(b2.getAttribute("aria-pressed") === "true" && !$(".learn").classList.contains("nosub") && !/blur/.test(getComputedStyle(ko()).filter) && ($(".vsub").hidden || vis($(".vsub .in"))), "ⓑ 켜기 = 바로 자막 다시 보임");
    // ⓓ 말풍선 — 설명 창 → [▶ 전체 영상]
    try { localStorage.removeItem("malmun.fullsubtip"); } catch {}
    const toFull = async () => { document.querySelectorAll(".line")[0].querySelector("[data-act=explain]").click(); await W(1200); $(".ctrl [data-act=flip]").click(); await W(700); };
    await toFull();
    const tip = $(".fstip"), shown = vis(tip);
    shot("tip"); await W(1500);
    const tr = R(tip), vw = R($("#vwrap")), others = [...document.querySelectorAll("#vwrap [data-act=subs], #vwrap [data-act=fs], .ctrl button, .ctrl a, .seek")].filter(vis);
    const over = others.filter(o => hit(tr, R(o))).map(o => o.dataset.act || o.className);
    ok(shown, "ⓓ 전체 영상을 처음 열면 선생님 말풍선이 뜸", shown ? `${box(tr)} · ${tip.textContent.trim().slice(0, 50)}` : "안 뜸");
    ok(shown && !over.length && tr.left >= vw.left - 0.5 && tr.right <= vw.right + 0.5 && tr.top >= vw.top - 0.5 && tr.bottom <= vw.bottom + 0.5, "ⓓ 말풍선이 자막 단추·⛶·아래 막대와 안 겹치고 영상 틀 안", `겹침 ${over.join(",") || "없음"} · 영상 ${box(vw)}`);
    const x = tip.querySelector("[data-act=tipx]"), xs = x && getComputedStyle(x);
    ok(!!x && x.tagName === "BUTTON" && parseFloat(xs.borderTopWidth) > 0 && R(x).width >= 22, "ⓓ ✕ = 단추 모양", x ? box(R(x)) : "없음");
    x?.click(); await W(150);
    ok(!vis(tip), "ⓓ ✕ 누르면 닫힘");
    $("video").pause();
    await toFull(); const s2 = vis($(".fstip")); await W(8500); const auto = !vis($(".fstip"));
    $("video").pause();
    await toFull(); const s3 = vis($(".fstip")); $(".fstip [data-act=tipx]")?.click(); $("video").pause();
    await toFull(); const s4 = vis($(".fstip")); $("video").pause();
    ok(s2 && auto && s3 && !s4, "ⓓ 8초 뒤 저절로 닫힘 · 처음 3번만 뜸(4번째 안 뜸)", `2번 ${s2} 저절로 ${auto} 3번 ${s3} 4번 ${s4}`);
    // 자막이 꺼져 있으면 말풍선 안 뜸
    try { localStorage.removeItem("malmun.fullsubtip"); } catch {}
    $("#vwrap [data-act=subs]").click(); await toFull(); const s5 = vis($(".fstip")); $("video").pause(); $("#vwrap [data-act=subs]").click();
    ok(!s5, "ⓓ 자막을 이미 끈 사람에겐 말풍선 안 뜸");
    // ⓔ #/explain 주소
    await openLearn("#/explain/L01-00-01/3"); await W(800);
    const p = $(".panel"), li = document.querySelectorAll(".line")[2];
    const { episode } = await import(`/js/data.js?v=${document.documentElement.dataset.v}`);
    const { lang } = await import(`/js/i18n.js?v=${document.documentElement.dataset.v}`);
    const d = await episode("L01-00-01", lang), old = (d.lines[2].krParas || []).map(s => String(s).replace(/<[^>]+>|[*_#\[\]{}]/g, "").trim().slice(0, 18)).filter(s => s.length >= 6);
    const txt = p?.textContent || "", leak = old.filter(s => txt.includes(s));
    shot("explain3"); await W(1500);
    ok(!!$(".scr.learn") && !$(".scr.explain:not(.embedded)") && vis(p) && p.classList.contains("explain") && !!p.querySelector(".exv.v9") && li?.querySelector("[data-act=explain]")?.getAttribute("aria-pressed") === "true" && location.hash.startsWith("#/explain/L01-00-01/3"),
      "ⓔ #/explain/L01-00-01/3 = 학습 화면 + 3번 줄 새(v9) 설명 창", `${location.hash} · 패널 ${p?.className} · 3번 설명 단추 ${li?.querySelector("[data-act=explain]")?.getAttribute("aria-pressed")}`);
    ok(!leak.length, "ⓔ 옛 kr.json 설명 글이 안 보임", leak.length ? leak.join(" / ") : `옛 문단 ${old.length}개 견줌`);
    p?.querySelector("[data-x=close]")?.click(); await W(400);
    ok(!!$(".scr.learn") && p.hidden, "ⓔ 설명 ✕ = 같은 편 학습 화면(영상)으로");
  } catch (e) { ok(false, "실행 오류", e.message); }
  HTMLMediaElement.prototype.play = play0;
  try { localStorage.removeItem("malmun.fullsub"); localStorage.removeItem("malmun.fullsubtip"); } catch {}
  location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(1500);
  const out = `${innerWidth}x${innerHeight}\n` + res.join("\n");
  console.log(out); return out;
})();
