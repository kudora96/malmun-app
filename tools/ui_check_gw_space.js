// 조각·단어 카드 설명 「상자」+조사 간격(대표님 11-18 16:27 「「만나다」는 사람을 띄어쓰기 이상」) — #/learn/L01-00-01 (어느 화면 크기든)
//  ⓐ 상자(.gw) 바로 뒤 조사까지 간격 ≤ 0.5px(바짝 붙음) · 상자와 조사가 다른 줄로 갈리지 않음 ⓑ 낱말(.kw) 사이 공백은 ≥ 2.5px 보임(같은 줄) ⓒ 조각 사전 전체(ko·ne 두 말 × 설명·예문) 훑음
//  결함정답표 F-gwspace: 상자와 조사 사이가 1px 이상 벌어지거나 공백이 사라지면 ✗
(async () => {
  const res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`), V = document.documentElement.dataset.v;
  const wn = await import(`/js/wordnote.js?v=${V}`), dc = await (await fetch(`data/dict/ko_ne.json?v=${V}`)).json(), ents = dc.entries || [];
  const host = document.createElement("div"); host.className = "vk-card vk-pcard"; host.style.cssText = "position:fixed;left:0;top:0;width:" + Math.min(innerWidth, 560) + "px;max-height:none;overflow:visible;visibility:hidden;z-index:-1;padding:12px"; document.body.appendChild(host);
  const bad = { a: [], b: [], c: [] }; let nGw = 0, nTail = 0, nKw = 0;
  for (const e of ents) for (const ko of [true, false]) {
    const n = { ko_mean: e.ko_mean, ne_mean: e.ne_mean }; (e.ex || []).slice(0, 2).forEach((x, i) => { n[`ko_ex${i + 1}`] = x.ko; n[`ne_ex${i + 1}`] = x.ne; });
    host.innerHTML = wn.noteHTML(n, ko);
    for (const g of host.querySelectorAll(".gw")) { nGw++; const nx = g.nextSibling, a = g.getBoundingClientRect(); if (!(nx && nx.nodeType === 3 && nx.textContent.trim() && !/^\s/.test(nx.textContent))) continue; nTail++;
      const rg = document.createRange(); rg.setStart(nx, 0); rg.setEnd(nx, 1); const r = rg.getBoundingClientRect(), gap = r.left - a.right, dy = Math.abs((r.top + r.height / 2) - (a.top + a.height / 2));
      if (!(gap <= 0.5) || dy > a.height * 0.6) bad.a.push(`${e.lemma}${ko ? "ko" : "ne"} 「${g.textContent.slice(1, 4)}」 간격 ${gap.toFixed(1)} 줄차 ${dy.toFixed(0)}`); }
    for (const ln of host.querySelectorAll(".vk-line")) { const ks = [...ln.querySelectorAll(".kw")]; nKw += ks.length;
      for (let i = 1; i < ks.length; i++) { const p = ks[i - 1].getBoundingClientRect(), q = ks[i].getBoundingClientRect(); if (q.left < p.left || Math.abs(p.top - q.top) > p.height * 0.3) continue; /* 줄 바뀜 제외 */ const gap = q.left - p.right; if (document.dir !== "rtl" && gap < 2.5 && getComputedStyle(ln).direction === "ltr") bad.b.push(`${e.lemma} ${ks[i - 1].textContent.slice(0, 4)}|${ks[i].textContent.slice(0, 4)} 공백 ${gap.toFixed(1)}`); } }
  }
  host.remove();
  ok(nGw > 0 && nTail > 0, `ⓒ 조각 사전 ${ents.length}개 훑음(두 말) · 상자 ${nGw}개 · 바로 뒤 조사 ${nTail}개 · 낱말 ${nKw}개`);
  ok(!bad.a.length, "ⓐ 상자와 뒤 조사 사이 간격 ≤ 0.5px · 같은 줄", `${bad.a.length}곳 ` + bad.a.slice(0, 4).join(" · "));
  ok(!bad.b.length, "ⓑ 낱말 사이 공백 ≥ 2.5px 보임", `${bad.b.length}곳 ` + bad.b.slice(0, 4).join(" · "));
  const nb = res.filter(x => x.startsWith("✗")).length, out = `${nb ? "✗" : "✓"} 상자+조사 간격 ${res.length - nb}/${res.length} · ${innerWidth}px\n` + res.join("\n"); console.log(out); return out;
})();
