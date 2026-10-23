// 「잘못된 것 신고」(기획부 feedback_loop.md 1장 · 대표님 10-20 「ㅇ」 · 시안 rep_mock_*) — 화면 틀 0px · 새 단추 없음
//  길게 누르기(0.55초 · 손가락 10px 안) 또는 오른쪽 누르기 → 그 자리 위 작은 풍선 「⚑ 잘못된 것 신고」 → 같은 자리 선생님 풍선: 종류 5개 + (나이 되면) 짧은 글 100자 + 닫기·보내기 → 「고마워요」
//  어디서: 배우기 줄 카드 · 위 창(설명·말하기·쓰기) · 「왜 틀렸어요?」 답 창(종류 = AI 답 미리 고름) — 화면마다 setReportCtx(fn) 로 「무엇을 신고하나」를 알려 줌
//  길게 누르기를 안 받는 곳(다른 부서·다른 손짓과 겹침 막기): 단추·링크·입력 칸·그림 판(canvas)·자판(data-j)·손글씨 칸·재생 막대·비교 파형·영상
//  보내기 = 기기 안 줄(malmun.rpq · 최대 50)에 넣고 Worker /report 로 → 서버가 없거나(503) 망이 끊기면 줄에 두었다가 다음 실행·다음 신고 때 다시
//  기기당 하루 10건(malmun.rpday) · 나이: reportTap(종류) · reportText(글·기기 번호) — agepolicy 표 그대로 · 종류만인 나이 = 그날만 쓰는 무작위 번호
import { t } from "./i18n.js?v=1023.7";
import { esc } from "./text.js?v=1023.7";
import { spkHtml } from "./ui.js?v=1023.7";
import { allowed } from "./agepolicy.js?v=1023.7";
import { sttURL, deviceId } from "./sttserver.js?v=1023.7";

export const KINDS = ["tr", "snd", "glyph", "ai", "etc"];
const NO = "button, a, input, textarea, select, label, canvas, svg, video, [data-j], [data-act], .seek, .hslot, .hand, .cmp, .wv, .rpmenu, .rptip, [contenteditable], .gamewrap, .vplay";
const LONG = 550, MOVE = 10, DAYCAP = 10, QMAX = 50;
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const today = () => new Date().toISOString().slice(0, 10);

let ctxFn = null; // 지금 화면이 정함: (눌린 요소) → { screen, ep, line, kind? } | null
export function setReportCtx(fn) { ctxFn = fn; return () => { if (ctxFn === fn) ctxFn = null; }; }

// 기기 안 줄 + 보내기
const queue = () => { try { const q = JSON.parse(ls("malmun.rpq") || "[]"); return Array.isArray(q) ? q : []; } catch { return []; } };
const saveQ = q => ls("malmun.rpq", JSON.stringify(q.slice(-QMAX)));
const dayN = () => { try { const d = JSON.parse(ls("malmun.rpday") || "{}"); return d.d === today() ? +d.n || 0 : 0; } catch { return 0; } };
// 기기 번호: 글을 쓸 수 있는 나이(reportText)만 기기 번호 · 그 밖(종류만)은 그날만 쓰는 무작위 번호(하루 상한용 · 날마다 바뀌어 기기와 이어지지 않음 · 처리방침 1장)
const anonId = () => { try { const a = JSON.parse(ls("malmun.rpanon") || "{}"); if (a.d === today() && /^[A-Za-z0-9-]{8,64}$/.test(a.id || "")) return a.id; } catch {} const id = "a-" + (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); ls("malmun.rpanon", JSON.stringify({ d: today(), id })); return id; };
const repId = () => (allowed("reportText") ? deviceId() : anonId());
let flushing = false;
export async function flushReports() {
  if (flushing || !sttURL()) return; flushing = true;
  try {
    for (const it of queue()) {
      let st = 0; try { const r = await fetch(sttURL() + "/report", { method: "POST", headers: { "Content-Type": "application/json", "X-Dev": repId() }, body: JSON.stringify(it), cache: "no-store", credentials: "omit" }); st = r.status; } catch { st = 0; }
      if (st === 0 || st === 503 || st >= 500) break; // 서버 없음·망 끊김 = 다음에
      saveQ(queue().filter(x => x.at !== it.at)); // 200(저장)·400·429(못 받는 것) = 줄에서 뺌
    }
  } finally { flushing = false; }
}
function send(rec) {
  const q = queue(), same = q.find(x => x.ep === rec.ep && x.line === rec.line && x.kind === rec.kind && x.day === rec.day);
  if (same) Object.assign(same, rec.note ? { note: rec.note } : {}); else q.push(rec);
  saveQ(q); ls("malmun.rpday", JSON.stringify({ d: today(), n: dayN() + (same ? 0 : 1) }));
  flushReports();
}

// 풍선(작은 메뉴 · 신고 풍선) — 화면 위에 겹쳐 뜸(fixed) · 누른 자리 위(모자라면 아래)
let pop = null, popOff = null;
function closePop() { popOff?.(); popOff = null; pop?.remove(); pop = null; document.querySelectorAll(".rphi").forEach(e => e.classList.remove("rphi")); }
function place(el, r) {
  const h = el.offsetHeight, w = el.offsetWidth, gap = 8, vh = innerHeight;
  if (h > vh - 16) { el.style.maxHeight = (vh - 16) + "px"; el.style.overflowY = "auto"; } // 아주 낮은 화면 = 풍선 안만 넘김
  const hh = Math.min(h, vh - 16); let top = r.top - hh - gap; if (top < 8) top = r.bottom + gap;
  el.style.top = Math.max(8, Math.min(top, vh - hh - 8)) + "px"; // 늘 화면 안
  if (el.classList.contains("rpmenu")) el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + 12)) + "px";
}
function show(el, r, hi) {
  closePop(); pop = el; el.style.visibility = "hidden"; document.body.append(el); place(el, r); el.style.visibility = "";
  hi?.classList.add("rphi");
  const out = e => { if (!el.contains(e.target)) closePop(); }, key = e => { if (e.key === "Escape") { e.stopPropagation(); closePop(); } }, gone = () => closePop();
  const ui = () => { if (!pop) return; for (const x of pop.querySelectorAll("[data-ph]")) x.placeholder = t(x.dataset.ph); requestAnimationFrame(() => pop && place(pop, r)); };
  setTimeout(() => document.addEventListener("pointerdown", out, true), 0); document.addEventListener("keydown", key, true); addEventListener("hashchange", gone); addEventListener("resize", gone); addEventListener("malmun:uilang", ui);
  popOff = () => { document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", key, true); removeEventListener("hashchange", gone); removeEventListener("resize", gone); removeEventListener("malmun:uilang", ui); };
}
function menu(ctx, r, hi) {
  const m = document.createElement("div"); m.className = "rpmenu"; m.setAttribute("role", "menu");
  m.innerHTML = `<button type="button" role="menuitem"><span aria-hidden="true">⚑</span> <span data-k="rp_menu">${esc(t("rp_menu"))}</span></button>`;
  m.querySelector("button").onclick = () => form(ctx, r, hi);
  show(m, r, hi);
}
function form(ctx, r, hi) {
  const f = document.createElement("div"); f.className = "rptip"; f.setAttribute("role", "dialog"); f.setAttribute("aria-label", t("rp_menu"));
  if (dayN() >= DAYCAP) { f.innerHTML = `<b class="who">${spkHtml("선생님")}</b><p class="q" data-k="rp_limit">${esc(t("rp_limit"))}</p><div class="bt"><button type="button" class="x" data-k="close_word">${esc(t("close_word"))}</button></div>`; f.querySelector(".x").onclick = closePop; return show(f, r, hi); }
  const text = allowed("reportText");
  let kind = KINDS.includes(ctx.kind) ? ctx.kind : "";
  f.innerHTML = `<b class="who">${spkHtml("선생님")}</b><p class="q" data-k="rp_q">${esc(t("rp_q"))}</p>
    <div class="ks">${KINDS.map(k => `<button type="button" data-k2="${k}" aria-pressed="${k === kind}"><span data-k="rp_k_${k}">${esc(t("rp_k_" + k))}</span></button>`).join("")}</div>
    ${text ? `<textarea maxlength="100" rows="2" dir="auto" data-ph="rp_ph" placeholder="${esc(t("rp_ph"))}"></textarea>` : ""}
    <div class="bt"><button type="button" class="x" data-k="close_word">${esc(t("close_word"))}</button><button type="button" class="go" ${kind ? "" : "disabled"} data-k="rp_send">${esc(t("rp_send"))}</button></div>`;
  const go = f.querySelector(".go");
  f.querySelectorAll("[data-k2]").forEach(b => (b.onclick = () => { kind = b.dataset.k2; f.querySelectorAll("[data-k2]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); go.disabled = false; }));
  f.querySelector(".x").onclick = closePop;
  go.onclick = () => {
    if (!kind) return;
    send({ kind, screen: ctx.screen || "other", ep: ctx.ep || "", line: String(ctx.line ?? ""), lang: document.documentElement.lang || "", ui: document.documentElement.classList.contains("uiko") ? "ko" : "learner", ver: document.documentElement.dataset.v || "", note: text ? (f.querySelector("textarea")?.value || "").trim().slice(0, 100) : "", day: today(), at: Date.now() });
    f.innerHTML = `<b class="who">${spkHtml("선생님")}</b><p class="q" data-k="rp_thx">${esc(t("rp_thx"))}</p>`; place(f, r);
    setTimeout(() => { if (pop === f) closePop(); }, 2500);
  };
  show(f, r, hi);
}

// 길게 누르기 — 문서 하나에서 받음(화면이 ctxFn 을 정했을 때만)
function target(e) {
  if (!ctxFn || !allowed("reportTap")) return null;
  const el = e.target instanceof Element ? e.target : null; if (!el || el.closest(NO)) return null;
  const ctx = ctxFn(el); return ctx ? { ctx, el: ctx.el || el } : null;
}
let lp = null, swallow = 0;
function fire(x, ev) {
  try { getSelection()?.removeAllRanges(); } catch {}
  swallow = Date.now() + 800; navigator.vibrate?.(15);
  const r = (ev.target instanceof Element ? ev.target : x.el).getBoundingClientRect(); // 자리 = 누른 글(카드 전체가 화면 밖으로 길 때도 손 가까이)
  menu(x.ctx, { top: r.top, bottom: r.bottom, left: ev.clientX != null ? Math.min(r.right, Math.max(r.left, ev.clientX - 40)) : r.left }, x.el);
}
document.addEventListener("pointerdown", e => {
  clearTimeout(lp?.timer); lp = null; if (e.button > 0) return;
  const x = target(e); if (!x) return;
  lp = { x, sx: e.clientX, sy: e.clientY, timer: setTimeout(() => { const l = lp; lp = null; if (l) fire(l.x, { clientX: l.sx, target: e.target }); }, LONG) };
}, true);
const cancel = () => { clearTimeout(lp?.timer); lp = null; };
document.addEventListener("pointermove", e => { if (lp && Math.hypot(e.clientX - lp.sx, e.clientY - lp.sy) > MOVE) cancel(); }, true);
["pointerup", "pointercancel", "scroll"].forEach(ev => document.addEventListener(ev, cancel, true));
document.addEventListener("click", e => { if (Date.now() < swallow && !e.target.closest?.(".rpmenu, .rptip")) { e.preventDefault(); e.stopPropagation(); swallow = 0; } }, true); // 길게 누른 손을 뗄 때 생기는 누르기(줄 고르기·재생)는 버림
document.addEventListener("contextmenu", e => { const x = target(e); if (!x) return; e.preventDefault(); if (Date.now() < swallow) return; cancel(); fire(x, e); }, true); // PC 오른쪽 누르기 · 폰 글자 길게 누르기 메뉴 대신

setTimeout(flushReports, 3000); // 지난번 못 보낸 신고
