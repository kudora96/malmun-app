// 화면 뼈대 해시 점검(앱 말부 10-27 · LEARN 1단계 회귀 0 · docs/learn_stage1.md) — 같은 코드로 두 판을 돌려 해시가 같으면 화면(글·lang·dir·클래스)이 똑같음 — 화면 「뼈대」(태그·클래스·lang·dir·data-k·aria·글)만 모아 해시 · style 값(px)은 안 봄
// window.__DUMP = "상태 이름" 이면 그 상태 뼈대 줄들을 그대로 돌려줌(오프라인 diff 용) · window.__K = 한국어 켬
(async () => { try {
  const W = ms => new Promise(s => setTimeout(s, ms)); const v = document.documentElement.dataset.v;
  const I = await import(`/js/i18n.js?v=${v}`); await I.setUiKo(!!window.__K);
  const vis = e => e && e.getClientRects().length;
  const learn = async () => { location.hash = "#/list"; await W(400); location.hash = "#/learn/L01-00-01"; await W(1500); for (let i = 0; i < 20 && document.querySelectorAll(".lines .line").length < 2; i++) await W(300); await W(500); };
  const act = async a => { const l = document.querySelectorAll(".lines .line")[1]; if (!l) return; l.click(); await W(400); [...l.querySelectorAll(`[data-act=${a}]`)].find(vis)?.click(); await W(1500); };
  const ST = {
    "첫 화면": async () => { location.hash = "#/"; await W(1200); },
    "목록": async () => { location.hash = "#/diag"; await W(300); location.hash = "#/list"; await W(1000); },
    "언어 창": async () => { location.hash = "#/list"; await W(800); document.querySelector("[data-act=lang]")?.click(); await W(700); },
    "배우기": learn, "줄 고름": async () => { await learn(); document.querySelectorAll(".lines .line")[1]?.click(); await W(800); },
    "설명 창": async () => { await learn(); await act("explain"); }, "말하기 창": async () => { await learn(); await act("speak"); },
    "쓰기 창": async () => { await learn(); await act("write"); },
    "말하기 따로": async () => { location.hash = "#/list"; await W(400); location.hash = "#/speak/L01-00-01/1"; await W(2200); },
    "쓰기 따로": async () => { location.hash = "#/list"; await W(400); location.hash = "#/write/L01-00-01/1"; await W(2200); },
  };
  const skel = () => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    for (let e = w.nextNode(); e; e = w.nextNode()) {
      if (/^(SCRIPT|STYLE|LINK|META|CANVAS|VIDEO|AUDIO|SOURCE|IMG|SVG|PATH)$/i.test(e.tagName)) continue;
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).filter(Boolean).join("|");
      const a = ["lang", "dir", "data-k", "data-act", "aria-label", "aria-pressed", "title", "placeholder"].map(k => e.hasAttribute(k) ? `${k}=${e.getAttribute(k)}` : "").filter(Boolean).join(" ");
      const cls = typeof e.className === "string" ? e.className.split(/\s+/).filter(c => !/^(pl|cur|on|sel|open|fit|lf)$/.test(c)).sort().join(".") : "";
      const hid = e.hidden ? " [hidden]" : "";
      out.push(`${e.tagName.toLowerCase()}${cls ? "." + cls : ""} ${a}${hid} ${own}`.trim());
    }
    return out;
  };
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };
  const root = document.documentElement; const res = [];
  for (const [name, go] of Object.entries(ST)) {
    if (window.__DUMP && window.__DUMP !== name && window.__DUMP !== "ALL") continue;
    document.getElementById("sheet-root") && (document.getElementById("sheet-root").innerHTML = "");
    await go(); await W(500);
    const lines = skel();
    if (window.__DUMP === name) return "head\n" + lines.map(x => "· " + x).join("\n") + "\n·";
    if (window.__DUMP === "ALL") { res.push(...lines.map(x => name + " | " + x)); continue; }
    res.push(`${name} ${lines.length} ${hash(lines.join("\n"))} html[lang=${root.lang} dir=${root.dir} class=${root.className}]`);
  }
  await I.setUiKo(false);
  return "head\n" + res.map(x => "· " + x).join("\n") + "\n·";
} catch (e) { return "head\n· 오류: " + e.message + " @ " + String(e.stack).split("\n")[1] + "\n·"; } })()
