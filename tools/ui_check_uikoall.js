// 「모든 창에 ⇄」 점검(다국어부 10-20 · 대표님 원칙 「모든 창에 ⇄(학습자 언어⇄한국어) 기본」) — 검사부 되풀이 시험용 · 판마다 ✗ 0
// 쓰는 법: ?lang=xx 로 연 #/learn/{편} 에서 eval · window.__allStates 로 골라 돌리기
// 창(상태)마다: 그 창을 연 뒤 → 화면 안에 보이고 · 다른 것에 덮이지 않은(가운데 점이 그 단추) ⇄ 가 하나라도 있는지
//  창이 겹쳐 열렸으면(언어 창·답 창·음악 상자 = #sheet-root) 그 창 안에 ⇄ 가 있어야 ✓(뒤 화면의 ⇄ 는 덮개에 가려 못 누름)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const L = document.documentElement.lang, out = [];
  const v = document.documentElement.dataset.v, I = await import(`/js/i18n.js?v=${v}`);
  if (!I.KO_UI.includes(L)) return `· ${L}: ⇄ 단추 없는 언어(건너뜀)`;
  const vis = el => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { if (a.hidden) return false; const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false; } return el.getClientRects().length > 0; };
  const usable = b => { if (!vis(b)) return false; const r = b.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false; const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); const hit = document.elementFromPoint(x, y); return !!hit && b.contains(hit); };
  const lines = () => document.querySelectorAll(".lines .line");
  const act = async (a, i = 1) => { const l = lines()[i]; l?.click(); await W(450); [...(l?.querySelectorAll(`[data-act=${a}]`) || [])].find(vis)?.click(); await W(1500); };
  const learn = async () => { location.hash = "#/list"; await W(500); location.hash = "#/learn/L01-00-01"; await W(2200); };
  const click = async (sel, ms = 600) => { const b = [...document.querySelectorAll(sel)].find(vis); b?.click(); await W(ms); return !!b; };
  const sheetRoot = () => document.getElementById("sheet-root");
  const STATES = {
    // 전체 화면은 맨 먼저(점검 시작 직후에만 누름 허락이 남아 있음 · 뒤로 가면 헤드리스가 거절)
    "전체 화면 영상": async () => { await learn(); try { await document.querySelector("#vwrap").requestFullscreen(); } catch { throw new Error("전체 화면을 못 엶(헤드리스 허락 없음 · 맨 앞에서만 됨)"); } await W(700); },
    "첫 화면": async () => { location.hash = "#/"; await W(1200); },
    "편 목록": async () => { location.hash = "#/list"; await W(800); },
    "언어 창": async () => { location.hash = "#/list"; await W(700); await click("[data-act=lang]", 500); },
    "배우기": async () => { await learn(); },
    "배우기 크게 보기": async () => { await learn(); lines()[1]?.click(); await W(500); await click("[data-act=big]", 900); },
    "설명 창": async () => { await learn(); await act("explain", 1); },
    "말하기 창": async () => { await learn(); await act("speak", 1); },
    "말하기 창 ? 방법": async () => { await learn(); await act("speak", 1); await click(".speak [data-act=help]"); },
    "쓰기 창": async () => { await learn(); await act("write", 1); },
    "쓰기 창 ? 방법": async () => { await learn(); await act("write", 1); await click(".write [data-act=help], .whelp"); },
    "말하기 화면(따로)": async () => { location.hash = "#/list"; await W(400); location.hash = "#/speak/L01-00-01/1"; await W(2200); },
    "쓰기 화면(따로)": async () => { location.hash = "#/list"; await W(400); location.hash = "#/write/L01-00-01/1"; await W(2200); },
    "왜 틀렸나 답 창": async () => { await learn(); await act("speak", 1); const b = Object.assign(document.createElement("button"), { textContent: "?" }); b.dataset.act = "why"; b.style.cssText = "position:fixed;left:0;top:0"; const r = Object.assign(document.createElement("span"), { className: "whyrow" }); Object.assign(r.dataset, { t: "안녕", h: "안녕", m: "speak", mean: "" }); r.append(b); document.body.append(r); b.click(); await W(700); r.remove(); },
    "진단": async () => { location.hash = "#/list"; await W(600); location.hash = "#/diag"; await W(2500); }, // 진단은 편 목록에서 들어감(배우기 말하기 창에서 바로 가면 108px 내려가 열림 → 개발부에 따로 알림)
  };
  const want = window.__allStates || Object.keys(STATES);
  out.push(`언어 ${L} · ${innerWidth}x${innerHeight}`);
  let total = 0;
  for (const st of want) {
    try {
      if (I.uiKoOn()) await I.setUiKo(false);
      if (document.fullscreenElement) { await document.exitFullscreen(); await W(400); }
      sheetRoot() && (sheetRoot().innerHTML = ""); scrollTo(0, 0); /* 앞 상태 스크롤이 남아 머리 줄이 밖으로 나간 것을 「없음」으로 잘못 세지 않게 */
      await STATES[st]();
      const sheet = sheetRoot()?.querySelector("[role=dialog]");
      const scope = sheet && vis(sheet) ? sheet : document;
      const ok = [...scope.querySelectorAll("[data-act=uiko]")].some(usable);
      if (ok) out.push(`✓ ${st}`);
      else { total++; const why = [...scope.querySelectorAll("[data-act=uiko]")].map(b => { const r = b.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return vis(b) ? `${r.left | 0},${r.top | 0} 덮음=${h ? (h.className || h.tagName) : "화면 밖"}` : "숨김"; }).join(" / "); out.push(`✗ ${st} ⇄ 없음${scope !== document ? `(겹친 창 .${sheet.className.split(" ").join(".")} 안)` : ""}${why ? ` · ${why}` : ""}`); }
    } catch (e) { out.push(`✗ ${st} 실행 오류 ${e.message}`); total++; }
  }
  if (document.fullscreenElement) await document.exitFullscreen();
  sheetRoot() && (sheetRoot().innerHTML = "");
  out.push(total ? `✗ 합계 ${total}` : "✓ 모든 창에 ⇄");
  return out.join("\n");
})();
