// 「⇄ 상태 보존」 점검(다국어부 10-15 · 투덜이 원칙 「⇄ = 그 상태 그대로 글만 바꾸기」) — 검사부 되풀이 시험용 · 판마다 ✗ 0
// 쓰는 법: ?lang=xx 로 연 #/learn/{편} 에서 fetch 로 읽어 eval · window.__keepStates 로 골라 돌리기
// 상태마다: 그 상태를 만든 뒤(창 열기·스크롤·재생·고르기) → 상태 지문 → ⇄ → 지문 → 견줌(→ 한국어 → 모국어 둘 다)
//  지문 = 주소 · 열린 창(대화상자·도움말·설명/쓰기/말하기 창·언어 창·덮개) · 스크롤(창·목록·창 안) · 영상/소리 재생 여부·시각 · 눌린 단추(aria-pressed·selected·expanded) · 입력 값 · 고른 줄
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const L = document.documentElement.lang, out = [];
  const v = document.documentElement.dataset.v, I = await import(`/js/i18n.js?v=${v}`);
  if (!I.KO_UI.includes(L)) return `· ${L}: ⇄ 단추 없는 언어(건너뜀)`;
  const vis = el => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { if (a.hidden) return false; const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false; } return el.getClientRects().length > 0; };
  const path = el => { const p = []; for (let a = el; a && a !== document.body; a = a.parentElement) { let i = 0; for (let b = a; (b = b.previousElementSibling);) i++; p.unshift(a.tagName.toLowerCase() + ":" + i); } /* 이름표(class)는 상태로 바뀌니 빼고 자리만 */ return p.join(">"); };
  const label = el => (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : el.tagName.toLowerCase());
  const OPEN = "[role=dialog], .sheet, .helpbox, .help, .panel, .cmp, .scorefx, .fx100, .toast, details[open], .modal, .overlay, .wtip, .modetip, .fstip, .whelp-box, .hbox, .full, .more";
  function finger() {
    const f = { hash: location.hash, open: [], scroll: {}, media: [], pressed: {}, inputs: {}, sel: "" };
    for (const el of document.querySelectorAll(OPEN)) if (vis(el)) f.open.push(label(el));
    f.scroll.win = Math.round(scrollY);
    for (const el of document.querySelectorAll("body *")) { if (el.scrollTop > 2 || el.scrollLeft > 2) f.scroll[path(el)] = `${Math.round(el.scrollTop)},${Math.round(el.scrollLeft)}`; }
    for (const m of document.querySelectorAll("video, audio")) if (m.src || m.currentSrc) f.media.push(`${m.tagName}:${m.paused ? "멈춤" : "재생"}@${m.currentTime.toFixed(0)}`);
    for (const el of document.querySelectorAll("[aria-pressed=true],[aria-selected=true],[aria-expanded=true],[aria-current=true]")) if (vis(el) && !el.matches("[data-act=uiko], .v9bar .pb")) f.pressed /* 설명 소리 단추(.pb)는 ⇄ 때 소리 말을 따라 바뀌는 게 맞음(안 A) */[path(el)] = label(el);
    for (const el of document.querySelectorAll("input, textarea, select")) if (el.value) f.inputs[path(el)] = el.value;
    const s = document.querySelector(".lines .line.sel, .lines .line.on, .lines .line.cur"); f.sel = s ? path(s) : "";
    return f;
  }
  function diff(a, b) {
    const d = [];
    if (a.hash !== b.hash) d.push(`주소 ${a.hash} → ${b.hash}`);
    const lost = a.open.filter(x => !b.open.includes(x)); if (lost.length) d.push(`닫힘 ${lost.join(" ")}`);
    if (Math.abs(a.scroll.win - b.scroll.win) > 2) d.push(`화면 스크롤 ${a.scroll.win} → ${b.scroll.win}`);
    for (const k of Object.keys(a.scroll)) if (k !== "win" && a.scroll[k] !== b.scroll[k]) d.push(`스크롤 ${k.split(">").pop()} ${a.scroll[k]} → ${b.scroll[k] ?? "0"}`);
    const ma = a.media.join(" "), mb = b.media.join(" "); if (a.media.some(x => x.includes("재생")) && !b.media.some(x => x.includes("재생"))) d.push(`재생 멈춤 ${ma} → ${mb}`);
    for (const k of Object.keys(a.pressed)) if (!(k in b.pressed)) d.push(`고른 것 풀림 ${a.pressed[k]}`);
    for (const k of Object.keys(a.inputs)) if (a.inputs[k] !== b.inputs[k]) d.push(`입력 지워짐 ${k.split(">").pop()}`);
    if (a.sel !== b.sel) d.push(`고른 줄 바뀜`);
    return d;
  }
  const lines = () => document.querySelectorAll(".lines .line");
  const act = async (a, i = 1) => { const l = lines()[i]; l?.click(); await W(450); [...(l?.querySelectorAll(`[data-act=${a}]`) || [])].find(vis)?.click(); await W(1500); };
  const learn = async () => { location.hash = "#/list"; await W(500); location.hash = "#/learn/L01-00-01"; await W(2200); };
  const scrollIn = sel => { const el = [...document.querySelectorAll(sel)].find(e => vis(e) && e.scrollHeight > e.clientHeight + 20); if (el) el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) / 2); return !!el; };
  const STATES = {
    "편 목록 스크롤": async () => { location.hash = "#/list"; await W(800); scrollTo(0, 300); await W(300); },
    "언어 창 열림": async () => { location.hash = "#/list"; await W(700); document.querySelector("[data-act=lang]")?.click(); await W(500); },
    "배우기 줄 고름 + 목록 스크롤": async () => { await learn(); lines()[4]?.click(); await W(600); scrollIn(".lines"); await W(300); },
    "배우기 영상 재생 중": async () => { await learn(); lines()[2]?.click(); await W(400); document.querySelector("[data-act=play]")?.click(); await W(1500); },
    "설명 창 + 안 스크롤": async () => { await learn(); await act("explain", 1); scrollIn(".panel, .v9body, .exv"); await W(300); },
    "설명 창 듣는 중": async () => { await learn(); await act("explain", 1); [...document.querySelectorAll(".v9bar [data-x=ex]")].find(vis)?.click(); await W(1200); },
    "말하기 창 ? 방법 열림": async () => { await learn(); await act("speak", 1); [...document.querySelectorAll(".speak [data-act=help]")].find(vis)?.click(); await W(600); },
    "쓰기 창 ? 방법 열림": async () => { await learn(); await act("write", 1); [...document.querySelectorAll(".write [data-act=help], .whelp")].find(vis)?.click(); await W(600); },
    "말하기 화면(따로) ? 방법": async () => { location.hash = "#/list"; await W(400); location.hash = "#/speak/L01-00-01/1"; await W(2200); [...document.querySelectorAll("[data-act=help]")].find(vis)?.click(); await W(600); },
    "진단 스크롤": async () => { location.hash = "#/diag"; await W(1500); scrollTo(0, 400); scrollIn(".diag"); await W(300); },
  };
  const want = window.__keepStates || Object.keys(STATES);
  const toggle = async () => { const b = [...document.querySelectorAll("[data-act=uiko]")].find(vis); if (!b) return false; b.click(); await W(900); return true; };
  out.push(`언어 ${L} · ${innerWidth}x${innerHeight}`);
  let total = 0;
  for (const st of want) {
    try {
      if (I.uiKoOn()) await I.setUiKo(false);
      document.getElementById("sheet-root") && (document.getElementById("sheet-root").innerHTML = "");
      await STATES[st](); const a = finger();
      if (!a.open.length && /열림|창|방법/.test(st)) out.push(`· ${st}: 창을 못 엶(건너뜀 · 화면이 바뀌었으면 점검기 고침)`);
      if (!(await toggle())) { out.push(`✗ ${st} ⇄ 단추 없음(보이는 곳)`); total++; continue; }
      const b = finger(); const d1 = diff(a, b);
      if (!(await toggle())) { out.push(`✗ ${st} ⇄ 단추 사라짐(한국어 쪽)`); total++; continue; }
      const c = finger(); const d2 = diff(b, c);
      if (d1.length) { total++; out.push(`✗ ${st} (모국어→한) ${d1.join(" · ")}`); }
      if (d2.length) { total++; out.push(`✗ ${st} (한→모국어) ${d2.join(" · ")}`); }
      if (!d1.length && !d2.length) out.push(`✓ ${st} 그대로`);
    } catch (e) { out.push(`✗ ${st} 실행 오류 ${e.message}`); total++; }
  }
  if (I.uiKoOn()) await I.setUiKo(false);
  out.push(total ? `✗ 합계 ${total}` : "✓ ⇄ 뒤에도 모든 상태 그대로");
  return out.join("\n");
})();
