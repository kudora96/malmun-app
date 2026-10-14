// 「모국어⇄한」 전수 조사(다국어부 10-14 · 투덜이 지적 「⇄ 눌러도 안 바뀌는 글」) — 검사부 되풀이 시험용 · 판마다 「안 바뀐 글자 0」
// 쓰는 법: ?lang=xx 로 연 #/learn/{편} 에서 fetch 로 읽어 eval(run_all 과 같음) · window.__uikoStates 로 화면 고르기
// 화면(상태)마다: 모국어로 새로 염 → ⇄ 누름(그 자리에서 바뀜) → 한국어로 새로 염 → 견줌 → ⇄ 다시(돌아옴) → 모국어로 새로 염 → 견줌
//  ✗ 안 바뀜 = ⇄ 뒤 그 자리 글이 「새로 연 화면」 글과 다름(글·aria-label·title·placeholder)
//  ✗ 섞임 = 모국어 화면인데 한글 UI 글 / 한국어 화면인데 모국어 글자(배우는 내용 = 대사·낱말·설명 본문·이름은 뺌)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const L = document.documentElement.lang, out = [], seen = new Set();
  const v = document.documentElement.dataset.v, I = await import(`/js/i18n.js?v=${v}`);
  if (!I.KO_UI.includes(L)) return `· ${L}: 한국어 앱 글(.ko.json) 없음 — ⇄ 단추 없는 언어(건너뜀)`;
  const HANGUL = /[가-힣ㄱ-ㆎ]/;
  const SCRIPT = { ne: /[ऀ-ॿ]/, hi: /[ऀ-ॿ]/, th: /[฀-๿]/, ur: /[؀-ۿ]/, bn: /[ঀ-৿]/, km: /[ក-៿]/, lo: /[຀-໿]/, my: /[က-႟]/, si: /[඀-෿]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, mn: /[Ѐ-ӿ]/, ru: /[Ѐ-ӿ]/, ky: /[Ѐ-ӿ]/ }[L] || /[A-Za-zÀ-ɏ]{3,}/;
  // 배우는 내용·이름(언어와 상관없이 그대로인 것) — retext SKIP 과 같은 뜻 + 자판·글자 칸·화자 이름·편 제목
  const CONTENT = "[lang=ko]:not(button):not(.chip), .kotext, .ko, .v9body p, .v9body .pair, .glosses, .saybig, .sayrom, .tr, .trrom, .rom, .mean, .who, .vsub, .vtitle .tt, .sent, .wko, .slot, .slotrow, .kb, .hand, .spk, .spkg, .chips, .cap, .lines .line > p, .eps .t, .cwave, .csyl, .heard, .hrow, .stage, script, style, svg, textarea, input, .uiko .b, .uiko .a, [data-lang], [data-act=lang], .pb"; // [data-act=lang]·.pb = 언어 이름 단추(일부러 그 언어 이름)
  const vis = el => { for (let a = el; a && a !== document.body; a = a.parentElement) { if (a.hidden) return false; const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false; } return el.getClientRects().length > 0; };
  const path = el => { const p = []; for (let a = el; a && a !== document.body; a = a.parentElement) { let i = 0; for (let b = a; (b = b.previousElementSibling);) i++; p.unshift(a.tagName.toLowerCase() + (a.className && typeof a.className === "string" ? "." + a.className.trim().split(/\s+/)[0] : "") + ":" + i); } return p.join(">"); };
  const label = el => (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : el.tagName.toLowerCase());
  function cap() {
    const m = new Map();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) { const el = n.parentElement, s = n.nodeValue.trim(); if (!s || !el || !/\p{L}/u.test(s) || el.closest(CONTENT) || !vis(el)) continue; m.set(path(el) + "#t" + [...el.childNodes].indexOf(n), { el, s }); }
    for (const el of document.querySelectorAll("[aria-label],[title],[placeholder]")) { if (el.closest(CONTENT + ", .uiko") || !vis(el)) continue; for (const a of ["aria-label", "title", "placeholder"]) { const s = el.getAttribute(a); if (s && /\p{L}/u.test(s)) m.set(path(el) + "@" + a, { el, s, a }); } }
    return m;
  }
  const where = (k, x) => `${label(x.el)}${x.a ? "@" + x.a : ""}`;
  function cmp(st, after, fresh, toKo) {
    let n = 0;
    for (const [k, f] of fresh) { const a = after.get(k); if (!a || a.s === f.s) continue; const key = `${st}|안바뀜|${where(k, f)}|${a.s}`; if (seen.has(key)) continue; seen.add(key); n++; out.push(`✗ ${st} 안 바뀜(${toKo ? "모국어→한" : "한→모국어"}) ${where(k, f)} 「${a.s.slice(0, 40)}」 → 새로 열면 「${f.s.slice(0, 40)}」`); }
    return n;
  }
  function mixed(st, m, ko) {
    let n = 0;
    for (const [k, x] of m) { const bad = ko ? SCRIPT.test(x.s) && !HANGUL.test(x.s) : HANGUL.test(x.s); if (!bad) continue; const key = `${st}|섞임|${ko}|${where(k, x)}|${x.s}`; if (seen.has(key)) continue; seen.add(key); n++; out.push(`✗ ${st} 섞임(${ko ? "한국어 화면에 모국어" : "모국어 화면에 한글"}) ${where(k, x)} 「${x.s.slice(0, 40)}」`); }
    return n;
  }
  const lines = () => document.querySelectorAll(".lines .line");
  const act = async (a, i = 0) => { const l = lines()[i]; l?.click(); await W(450); const b = [...(l?.querySelectorAll(`[data-act=${a}]`) || [])].find(vis); b?.click(); await W(1500); return !!b; };
  const STATES = {
    "처음 화면": async () => { location.hash = "#/?hello"; await W(900); },
    "편 목록": async () => { location.hash = "#/list"; await W(900); },
    "언어 창": async () => { location.hash = "#/list"; await W(800); document.querySelector("[data-act=lang]")?.click(); await W(500); },
    "배우기": async () => { location.hash = "#/list"; await W(500); location.hash = "#/learn/L01-00-01"; await W(2200); lines()[0]?.click(); await W(500); },
    "설명 창": async () => { await STATES["배우기"](); await act("explain"); },
    "쓰기 창(자판)": async () => { await STATES["배우기"](); await act("write"); },
    "쓰기 창(손글씨)": async () => { await STATES["쓰기 창(자판)"](); [...document.querySelectorAll(".wmode button")].filter(vis)[1]?.click(); await W(800); },
    "쓰기 도움말": async () => { await STATES["쓰기 창(자판)"](); [...document.querySelectorAll("[data-act=help],.whelp")].find(vis)?.click(); await W(600); },
    "말하기 창": async () => { await STATES["배우기"](); await act("speak"); },
    "말하기 도움말": async () => { await STATES["말하기 창"](); [...document.querySelectorAll(".speak [data-act=help]")].find(vis)?.click(); await W(600); },
    "말하기 화면(따로)": async () => { location.hash = "#/list"; await W(500); location.hash = "#/speak/L01-00-01/1"; await W(2200); },
    "쓰기 화면(따로)": async () => { location.hash = "#/list"; await W(500); location.hash = "#/write/L01-00-01/1"; await W(2200); },
    "진단": async () => { location.hash = "#/diag"; await W(1500); },
  };
  const want = window.__uikoStates || Object.keys(STATES);
  const setMode = async ko => { if (I.uiKoOn() !== ko) { await I.setUiKo(ko); } };
  const toggle = async () => { const b = [...document.querySelectorAll("[data-act=uiko]")].find(vis); if (!b) return false; b.click(); await W(700); return true; };
  out.push(`언어 ${L} · ${innerWidth}x${innerHeight}`);
  let total = 0;
  for (const st of want) {
    try {
      document.getElementById("sheet-root") && (document.getElementById("sheet-root").innerHTML = "");
      await setMode(false); await STATES[st](); const capL = cap(); total += mixed(st, capL, false);
      if (!(await toggle())) { out.push(`✗ ${st} ⇄ 단추 없음(보이는 곳)`); total++; continue; }
      const capT = cap(); await STATES[st](); const capK = cap(); total += mixed(st, capK, true) + cmp(st, capT, capK, true);
      await toggle(); const capT2 = cap(); await setMode(false); await STATES[st](); const capL2 = cap(); total += cmp(st, capT2, capL2, false);
      out.push(`  ${st}: 글 ${capL.size}개 봄`);
    } catch (e) { out.push(`✗ ${st} 실행 오류 ${e.message}`); total++; }
  }
  await setMode(false);
  out.push(total ? `✗ 합계 ${total}` : "✓ 안 바뀐 글·섞인 글 0");
  return out.join("\n");
})();
