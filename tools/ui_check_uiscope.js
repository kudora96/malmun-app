// 「⇄ 창마다 독립」 점검(다국어부 10-23 · _hq/design_uiko_scope.md) — 설명 창을 창 범위로 열고 창 안 ⇄ = 창만 · 바깥 ⇄ = 창 그대로 · 되돌리면 처음 글 · 창이 data-uiko 를 스스로 달게 되면 openUiScope 줄은 빼도 됨
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)); const v = document.documentElement.dataset.v;
  const I = await import(`/js/i18n.js?v=${v}`), U = await import(`/js/ui.js?v=${v}`); if (I.uiKoOn()) await I.setUiKo(false);
  location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(2300);
  const vis = e => e && e.getClientRects().length;
  const l = document.querySelectorAll(".lines .line")[1]; l.click(); await W(400); [...l.querySelectorAll("[data-act=explain]")].find(vis)?.click(); await W(1500);
  const panel = document.querySelector(".panel:not([hidden])"); if (!panel) return "head\n· 설명 창 못 엶\n·";
  U.openUiScope(panel);
  const norm = s => s.replace(/[0-9:.]+/g, "#");
  const out = () => norm([...document.querySelectorAll(".vtitle, .lines .line .acts")].map(e => e.innerText).join("|"));
  const inn = () => norm(panel.innerText);
  const chipIn = [...panel.querySelectorAll("[data-act=uiko]")].find(vis);
  const outs = [...document.querySelectorAll("[data-act=uiko]")].filter(b => !b.closest("[data-uiko]"));
  const r = [`밖 칩 ${outs.length}개 · 보이는 것 ${outs.filter(vis).length}`];
  if (!chipIn) return "head\n· 창 안 ⇄ 없음\n·";
  const o0 = out(), i0 = inn();
  chipIn.click(); await W(900); const o1 = out(), i1 = inn();
  r.push(`창 안 ⇄: 창 바뀜=${i0 !== i1} · 바깥 그대로=${o0 === o1} · 전역=${I.uiKoOn()} · 창=${panel.dataset.uiko} · 창칩=${chipIn.getAttribute("aria-pressed")} · 밖칩=${outs.map(b => b.getAttribute("aria-pressed")).join(",")}`);
  if (o0 !== o1) { const a = o0.split("\n"), b = o1.split("\n"); a.forEach((x, j) => { if (x !== b[j]) r.push(`  밖 다름 「${x.slice(0, 50)}」→「${(b[j] || "").slice(0, 50)}」`); }); }
  await U.switchUiKo(true); await W(900); const o2 = out(), i2 = inn();
  r.push(`바깥 ⇄(전역 켬): 바깥 바뀜=${o1 !== o2} · 창 그대로=${i1 === i2} · 전역=${I.uiKoOn()} · 창=${panel.dataset.uiko} · 창칩=${chipIn.getAttribute("aria-pressed")}`);
  chipIn.click(); await W(900); const i3 = inn();
  r.push(`창 안 다시: 창 처음으로=${i3 === i0}`);
  if (i3 !== i0) { const a = i0.split("\n"), b = i3.split("\n"); a.forEach((x, j) => { if (x !== b[j]) r.push(`  창 다름 「${x.slice(0, 50)}」→「${(b[j] || "").slice(0, 50)}」`); }); }
  await U.switchUiKo(false); await W(900);
  r.push(`바깥 다시: 바깥 처음으로=${out() === o0} · 창 그대로=${inn() === i3}`);
  return "head\n" + r.map(x => "· " + x).join("\n") + "\n·";
})()
