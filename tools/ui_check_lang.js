// 언어 점검(다국어부 10-12) — 학습자 언어 글이 잘리거나 넘치거나 자리가 남는지 · 절차 docs/lang_ingest.md §3
// 쓰는 법: ?lang=xx 로 연 #/learn/{편} 에서 fetch 로 읽어 eval(run_all 과 같음) · window.__langScreens 로 화면 고르기
// 보는 것(3px 까지는 봐줌 — 글자 상자 기준이라 잉크는 안 잘림 · 10-12 ur 눈 확인): ① 글 덩이가 잘리는 조상(overflow 숨김) 밖으로 나감(가로·세로 · 태국 위아래 부호·나스탈리크 꼬리) ② 화면 밖으로 넘침
//          ③ 화면 글에 {n} 같은 자리가 그대로 ④ 그 언어 글꼴이 실렸는지 ⑤ 방향(dir)이 언어 표와 맞는지
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const out = [], seen = new Set();
  const L = document.documentElement.lang, { LANG_INFO } = await import(`/js/langs.js?v=${document.documentElement.dataset.v}`);
  const info = LANG_INFO[L] || {};
  const vis = el => { const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && el.getClientRects().length; };
  const clipper = el => { for (let a = el; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/hidden|clip|auto|scroll/.test(s.overflowX + s.overflowY)) return a; } return null; };
  const label = el => (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : el.tagName.toLowerCase());
  function scan(where) {
    let bad = 0;
    const tw = document.createTreeWalker(document.querySelector("#app") || document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      const txt = n.nodeValue.trim(), el = n.parentElement;
      if (!txt || !el || !vis(el) || el.closest("[hidden],svg,script,style")) continue;
      if (/\{[a-z_]+\}/.test(txt)) { const k = `${where}|자리|${txt}`; if (!seen.has(k)) { seen.add(k); out.push(`✗ ${where} 자리 남음 「${txt.slice(0, 40)}」 ${label(el)}`); bad++; } }
      const r = document.createRange(); r.selectNodeContents(n);
      const tr = r.getBoundingClientRect(); if (!tr.width || !tr.height) continue;
      if (getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) { const k = `${where}|…|${label(el)}`; if (!seen.has(k)) { seen.add(k); out.push(`✗ ${where} 말줄임(…)으로 잘림 「${txt.slice(0, 30)}」 ${label(el)}`); bad++; } continue; }
      const c = clipper(el); if (!c) continue;
      const cr = c.getBoundingClientRect(), cs = getComputedStyle(c);
      if (cr.width < 2 || cr.height < 2) continue; // 화면 읽기 전용(1px 숨김 글) — 보이는 글이 아님
      const ox = !/visible/.test(cs.overflowX), oy = !/visible/.test(cs.overflowY), scrolls = /auto|scroll/.test(cs.overflowX + cs.overflowY);
      if (scrolls) continue; // 밀어 보는 칸(모드 줄 등)은 넘쳐도 됨
      const dx = ox ? Math.max(cr.left - tr.left, tr.right - cr.right) : 0, dy = oy ? Math.max(cr.top - tr.top, tr.bottom - cr.bottom) : 0;
      if (dx > 3 || dy > 3) { const k = `${where}|${label(el)}|${txt.slice(0, 12)}`; if (!seen.has(k)) { seen.add(k); out.push(`✗ ${where} 잘림 ${dx > 3 ? "가로 " + dx.toFixed(0) + "px " : ""}${dy > 3 ? "세로 " + dy.toFixed(0) + "px " : ""}「${txt.slice(0, 30)}」 ${label(el)} ⊂ ${label(c)}`); bad++; } }
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) { out.push(`✗ ${where} 화면 가로 넘침 ${document.documentElement.scrollWidth}px > ${innerWidth}`); bad++; }
    out.push(bad ? `  (${where} ✗${bad})` : `✓ ${where} 잘림·넘침·자리 없음`);
  }
  // ⑥ 네모(□) 글자: 학습자 글자가 언어 표 글꼴(없으면 앱 글꼴 Noto Sans KR·Devanagari·Bengali)에 있는지(없으면 기기 글꼴로 떨어져 폰마다 □ 위험)
  async function tofu(where) {
    const fams = info.font ? [info.font] : ["Noto Sans KR", "Noto Sans Devanagari", "Noto Sans Bengali"];
    const seenC = new Set(), miss = new Set();
    const tw = document.createTreeWalker(document.querySelector("#app") || document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      const el = n.parentElement; if (!el || el.closest('[lang="ko"],.ko,.rom,svg,script,style') || !vis(el)) continue;
      for (const ch of n.nodeValue) if (!/[\s\p{P}\p{S}\p{N}A-Za-z가-힣ㄱ-ㆎ]/u.test(ch)) seenC.add(ch);
    }
    // 글꼴 조각의 unicode-range 로 판정(Google Fonts 는 글자가 있는 범위만 조각으로 냄) — 폭 견주기는 기기 글꼴이 대신 그려 주면 못 잡음(10-13 실측)
    await document.fonts.ready;
    const R = f => [...document.fonts].filter(ff => ff.family.replace(/["']/g, "") === f).flatMap(ff => (ff.unicodeRange || "U+0-10FFFF").split(",").map(r => { const [a, b] = r.trim().replace(/^U\+/i, "").split("-"); const lo = parseInt(a.replace(/\?/g, "0"), 16), hi = b ? parseInt(b, 16) : parseInt(a.replace(/\?/g, "F"), 16); return [lo, hi]; }));
    const ranges = fams.flatMap(R);
    for (const ch of seenC) { const cp = ch.codePointAt(0); if (!ranges.some(([lo, hi]) => cp >= lo && cp <= hi)) miss.add(ch); }
    out.push(miss.size ? `✗ ${where} 글꼴에 없는 글자 ${miss.size}개(□ 위험) 「${[...miss].slice(0, 12).join(" ")}」` : `✓ ${where} 글자 ${seenC.size}종 모두 글꼴에 있음`);
  }
  const want = window.__langScreens || ["list", "learn", "explain", "write", "speak"];
  out.push(`언어 ${L} · ${innerWidth}x${innerHeight} · dir=${document.documentElement.dir}`);
  out.push((info.dir || "ltr") === document.documentElement.dir ? "✓ 방향 맞음" : `✗ 방향 ${document.documentElement.dir} ≠ 표 ${info.dir}`);
  if (info.font) { await document.fonts.ready; await W(300); out.push([...document.fonts].some(f => f.family.replace(/"/g, "") === info.font && f.status === "loaded") ? `✓ 글꼴 ${info.font} 실림` : `✗ 글꼴 ${info.font} 안 실림`); }
  const back = () => document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  for (const s of want) {
    try {
      if (s === "list") { location.hash = "#/list"; await W(900); scan("편 목록"); location.hash = "#/learn/L01-00-01"; await W(2200); continue; }
      if (s === "learn") { scan("배우기"); await tofu("배우기"); continue; }
      const line = document.querySelector(".lines .line"); line?.click(); await W(500);
      const act = { explain: "explain", write: "write", speak: "speak" }[s];
      const btn = [...document.querySelectorAll(".line.sel [data-act], .line.on [data-act], .line [data-act]")].find(b => b.dataset.act === act && vis(b));
      if (!btn) { out.push(`· ${s} 단추를 못 찾음(건너뜀)`); continue; }
      btn.click(); await W(1500); scan({ explain: "설명", write: "쓰기", speak: "말하기" }[s]);
      btn.click(); await W(600); back();
    } catch (e) { out.push(`✗ ${s} 실행 오류 ${e.message}`); }
  }
  return out.join("\n");
})();
