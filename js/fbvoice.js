// 말하기 결과 안내 = 소리로 읽기 + 따라가기 불 + ⇄ 즉시(대표님 10-21 · 설계 _hq/design_speak_feedback_voice.md) — 개발2팀
//  글은 지금 그대로(speak.js scoreLine · rhyText · why_late) — 여기서는 같은 재료(점수·까닭·틀린 곳·리듬·늦음)로 「읽을 차례」를 만들고, 화면 글의 그 문장에 <span> 만 씌움(글자·자리 0px)
//  소리: 틀 조각 = media/fb/{목소리}/{id}.mp3(소리부 · data/fb_manifest.json) · 점수 = fb/{목소리}/n/{N}.mp3 · 한국어 낱말·들린 말·음절 = 공용 글자 소리(chars_f) 한 글자씩(또박또박 · 대표님 10-21)
//  목소리 = ⇄ 상태(학습자 말 = 그 말 · 한국어 = ko) · ⇄ 누르면 같은 문장부터 그 말로 이어 읽음
//  ⇄ 창마다 독립(대표님 10-22 · 설계 _hq/design_uiko_scope.md): 말·목소리 = fbBind(el) 의 el 이 든 창 상태(uiKoIn(el)) · 끼운 조각 글(lv)도 그 상태로 다시 만듦
//  자동 재생 = 결과가 새로 나오면 한 번(기억 malmun.fbauto = "0" 이면 끔 · 「?」 사용법에서) · 결과 글 누르기 = 읽기 ⇄ 멈춤
//  겹침 없음: 다른 소리(sfx)가 시작되거나 <audio>/<video> 가 재생되면 즉시 멈춤 · 소리 파일이 없으면 조용히 다음 조각
import * as sfx from "./sfx.js?v=1023.26";
import { paths, MEDIA } from "./paths.js?v=1023.26";
import { t, tFor, lang, uiKoOn, uiKoIn } from "./i18n.js?v=1023.26";
import { R_FULL } from "./rhythm.js?v=1023.26";
import { charsF } from "./data.js?v=1023.26";

const PASS = 80, PERFECT = 95;
const V = 1; // 소리 판(소리부가 다시 만들면 올림)
const fbUrl = (voice, id) => `${MEDIA}/fb/${voice}/${id}.mp3?v=${V}`;
const numUrl = (voice, n) => `${MEDIA}/fb/${voice}/n/${n}.mp3?v=${V}`; // 「N%」
const plainUrl = (voice, n) => `${MEDIA}/fb/${voice}/num/${n}.mp3?v=${V}`; // 맨 숫자(획 번호·초 · 쓰기부)
let cf = null; const jamoUrl = async j => { cf ||= charsF().catch(() => ({})); const m = await cf; return m[j] ? paths.charF(m[j]) : null; }; // 자모 = 공용 아나운서 자모 소리
const charUrl = ch => paths.charF(`u${ch.codePointAt(0).toString(16).toUpperCase()}.mp3`);
export const fbAuto = () => { try { return localStorage.getItem("malmun.fbauto") !== "0"; } catch { return true; } };
export const setFbAuto = on => { try { localStorage.setItem("malmun.fbauto", on ? "1" : "0"); } catch {} };

let man = null;
const manifest = () => (man ||= fetch(`data/fb_manifest.json?v=${document.documentElement.dataset.v || ""}`).then(r => (r.ok ? r.json() : null)).catch(() => null));
manifest();

// ── 읽을 차례 만들기(speak.js scoreLine 과 같은 갈래) ─────────────────────────────
//  문장 = { key, vars(화면 글용), slots(소리용: 칸 → {num}|{ko}|{sub:[문장…]}) } · 점수 문장 = { num }
const romOn = () => { try { return localStorage.getItem("malmun.rom") !== "0"; } catch { return true; } };
const koq = s => `⁨"${s}"⁩`;
const short = (w, n = 8) => { const a = [...String(w)]; let k = 0, i = 0; for (; i < a.length && k < n; i++) if (/[가-힣]/.test(a[i])) k++; return i < a.length ? a.slice(0, i).join("").trim() + "…" : w; };
export function fbPlan({ sc, why, hint, rhy, late, rhyAny = false }) { // rhyAny = 설명 창(리듬 줄을 점수와 상관없이 붙임 — learn.js 와 같게)
  if (sc == null) return [];
  const q = w => `${koq(w)}${romOn() && hint?.rom?.[w] ? `(${hint.rom[w]})` : ""}`;
  const S = (key, vars = {}, slots = {}, lv) => ({ key, vars, slots, ...(lv && { lv }) }); // lv = 창 말로 다시 만들 조각 글(칸 → ko => 글)
  const out = [{ num: sc }];
  const fast = sc < PASS && (why === "time" || (why === "pause" && hint?.kind === "tail"));
  if (fast) {
    out.push(S(why === "time" ? "why_time" : "why_pause_tail"));
    if (hint?.kind === "tail" && hint.tail) { const k = t("why_tail_short") === "why_tail_short" ? "why_tail" : "why_tail_short"; out.push(S(k, { tail: q(short(hint.tail)) }, { tail: { ko: short(hint.tail) } })); }
  } else {
    out.push(S(sc >= PERFECT ? "score_5" : sc >= PASS ? "score_4" : sc >= 60 ? "score_3" : sc >= 40 ? "score_2" : "score_1"));
    if (why === "time") out.push(S("why_time"));
    else if (hint?.kind === "tail" && sc < PASS && hint.tail) out.push(S("why_tail", { tail: q(short(hint.tail)) }, { tail: { ko: short(hint.tail) } }));
    else if (hint?.kind === "other" && sc < PASS) out.push(S("why_other", { say: koq(short(hint.say || "")) }, { say: { ko: short(hint.say || "") } }));
    else if (hint?.kind === "words") {
      const ws = hint.words.slice(0, 2), list = ws.map(x => q(x.w)).join("·"), wsKo = { ko: ws.map(x => x.w).join(" ") };
      if (sc >= PASS) out.push(S("why_polish", { ws: list }, { ws: wsKo }));
      else if (hint.words.length > 2) out.push(S("why_many", { ws: list }, { ws: wsKo }));
      else {
        const parts = hint.words.map(x => (x.h ? S("why_heard_as", { w: q(x.w), h: koq(short(x.h, 6)) }, { w: { ko: x.w }, h: { ko: short(x.h, 6) } }) : S("why_missing", { w: q(x.w) }, { w: { ko: x.w } })));
        const redo = S("why_redo", { ws: list }, { ws: wsKo }), rest = hint.restOk ? [S("why_rest_ok")] : [];
        out.push(S("why_frame", { parts: parts.map(p => t(p.key, p.vars)).join(" · "), redo: t(redo.key, redo.vars), rest: rest.length ? " " + t("why_rest_ok") : "" }, { parts: { sub: parts }, redo: { sub: [redo] }, rest: { sub: rest } },
          { parts: ko => parts.map(p => textOf(p, ko)).join(" · "), redo: ko => textOf(redo, ko), rest: ko => (rest.length ? " " + tFor(ko, "why_rest_ok") : "") }));
      }
    }
  }
  if (rhy && (rhyAny || rhy.L >= PASS)) {
    const r = Math.floor(rhy.R * 100 + 1e-9);
    out.push(S("rhythm_line", { l: rhy.L, r }, { l: { num: rhy.L }, r: { num: r } }));
    if (rhy.R < R_FULL && rhy.worst) out.push(S("rhy_" + rhy.worst.kind, { s: koq(rhy.worst.ch) }, { s: { ko: rhy.worst.ch } }));
  }
  if (late) out.push(S("why_late"));
  return out;
}
const textOf = (s, ko = uiKoOn()) => (s.num != null ? `${s.num}%` : tFor(ko, s.key, s.lv ? { ...s.vars, ...Object.fromEntries(Object.entries(s.lv).map(([k, f]) => [k, f(ko)])) } : s.vars));

// 다른 화면(쓰기부 등)이 쓰는 입구 — [{ k: 열쇠, v: { 칸: 값 } }, …] → 읽을 차례(fbBind().set 에 그대로)
//  값: 숫자 = 맨 숫자 소리(num/) · { pct: n } = 「n%」 · 자모 글자(ㄱ~ㅣ) = 자모 소리 · 한글 = 글자 소리 한 자씩 · "wx_…"·"h_dir_…" 같은 열쇠 이름 = 그 열쇠 글 조각
//  { k: null, pct: n } = 점수 한 문장(「n%」)
const KEYLIKE = /^(wx_|h_dir_|why_|score_|rhy_|sentence_)/;
export function fbFrom(list) {
  const one = x => {
    if (x.k == null && x.pct != null) return { num: x.pct };
    const vars = {}, slots = {}, lv = {};
    for (const [name, val] of Object.entries(x.v || {})) {
      if (typeof val === "number") { vars[name] = String(val); slots[name] = { n: val }; }
      else if (val && typeof val === "object" && val.pct != null) { vars[name] = `${val.pct}%`; slots[name] = { num: val.pct }; }
      else if (typeof val === "string" && KEYLIKE.test(val)) { vars[name] = t(val); slots[name] = { sub: [{ key: val, vars: {}, slots: {} }] }; lv[name] = ko => tFor(ko, val); }
      else if (typeof val === "string" && /^[ㄱ-ㆎ·\s]+$/.test(val)) { vars[name] = val; slots[name] = { jamo: val }; }
      else { vars[name] = String(val ?? ""); slots[name] = /[가-힣]/.test(String(val)) ? { ko: String(val) } : {}; }
    }
    return { key: x.k, vars, slots, ...(Object.keys(lv).length && { lv }) };
  };
  return (list || []).map(one);
}

// ── 소리 줄 세우기 ─────────────────────────────────────────────────────────────
async function urlsOf(s, ko = uiKoOn()) {
  const m = await manifest(), mode = ko ? "K" : "L", voice = mode === "K" ? "ko" : lang;
  if (s.num != null) return [numUrl(voice, Math.max(0, Math.min(100, Math.round(s.num))))];
  const segs = m?.langs?.[lang]?.[mode]?.[s.key]; if (!segs) return [];
  const out = [];
  for (const g of segs) {
    if (g.id) out.push(fbUrl(voice, g.id));
    else if (g.s) {
      const v = s.slots[g.s]; if (!v) continue;
      if (v.num != null) out.push(numUrl(voice, Math.max(0, Math.min(100, Math.round(v.num)))));
      else if (v.n != null) out.push(plainUrl(voice, Math.max(0, Math.min(100, Math.round(v.n)))));
      else if (v.jamo) { for (const j of String(v.jamo)) if (/[ㄱ-ㆎ]/.test(j)) out.push(await jamoUrl(j)); }
      else if (v.ko) { for (const ch of String(v.ko).replace(/…$/, "")) { if (/[가-힣]/.test(ch)) out.push(charUrl(ch)); else if (/\s/.test(ch)) out.push(null); } } // 낱말 사이 = 짧은 쉼
      else if (v.sub) { for (const x of v.sub) out.push(...(await urlsOf(x, ko))); }
    }
  }
  return out;
}

// ── 화면 글에 문장 표시(span) · 읽기 · 불 ─────────────────────────────────────────
//  bind(el) → { set(plan, fresh), stop() } · set = 글을 새로 쓴 뒤마다 부름(fresh = 새 결과 → 자동 재생)
export function fbBind(el, { canPlay = () => true } = {}) {
  let plan = [], gen = 0, cur = -1, mine = false; const ko = () => uiKoIn(el); // 이 상자가 든 창의 ⇄ 상태(창 밖이면 앱 전체)
  // 문장마다 불 칸 = 글자 마디만 <span class="fbs"> 로 감쌈(안의 <p>·<b>·단추 구조는 그대로 · 마디 경계를 넘으면 마디마다 조각 span · 같은 data-fb · 쓰기부 10-21)
  const mark = () => {
    el.querySelectorAll("span.fbs").forEach(sp => sp.replaceWith(...sp.childNodes)); el.normalize();
    const nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, off = 0;
    while ((n = w.nextNode())) { if (n.parentElement?.closest("button")) { off += n.nodeValue.length; continue; } nodes.push([n, off]); off += n.nodeValue.length; }
    const txt = el.textContent, ranges = []; let at = 0;
    const K = ko(); plan.forEach((s, i) => { const x = textOf(s, K), k = x ? txt.indexOf(x, at) : -1; if (k >= 0) { ranges.push([k, k + x.length, i]); at = k + x.length; } });
    for (const [a, b, i] of ranges.reverse()) for (const [nd, o] of [...nodes].reverse()) { // 뒤에서부터 → 앞 마디 위치가 안 바뀜
      const s0 = Math.max(a, o), e0 = Math.min(b, o + nd.nodeValue.length); if (s0 >= e0 || !nd.isConnected) continue;
      const r = document.createRange(); r.setStart(nd, s0 - o); r.setEnd(nd, e0 - o); const sp = document.createElement("span"); sp.className = "fbs"; sp.dataset.fb = i; r.surroundContents(sp);
    }
  };
  const lit = i => { cur = i; el.querySelectorAll(".fbs").forEach(s => s.classList.toggle("fbon", +s.dataset.fb === i)); el.classList.toggle("fbplay", i >= 0); };
  const stop = () => { if (cur < 0 && !mine) return; gen++; sfx.stopTag("fb"); mine = false; lit(-1); };
  async function play(from = 0) {
    const my = ++gen;
    for (let i = from; i < plan.length; i++) {
      if (my !== gen) return; lit(i);
      for (const u of await urlsOf(plan[i], ko())) {
        if (my !== gen) return; // 새 읽기가 시작됨 = 옛 줄은 조용히 끝(새 줄을 멈추지 않게)
        if (!canPlay()) return stop();
        if (!u) { await new Promise(r => setTimeout(r, 120)); continue; }
        const g0 = sfx.stopGen(); mine = true; await sfx.play(u, { tag: "fb" }); mine = false;
        if (sfx.stopGen() !== g0) { if (my === gen) { gen++; lit(-1); } return; } // 다른 쪽이 소리를 다 멈춤(🎤·견본 등) = 읽기도 끝
      }
      if (my !== gen) return; await new Promise(r => setTimeout(r, 250));
    }
    if (my === gen) lit(-1);
  }
  // 다른 소리가 시작되면 멈춤(소리는 언제나 하나)
  const onSnd = e => { if (e.detail === 1 && sfx.lastTag !== "fb" && cur >= 0) stop(); };
  const onMedia = e => { if (cur >= 0 && e.target instanceof HTMLMediaElement) stop(); };
  addEventListener("malmun:snd", onSnd); document.addEventListener("play", onMedia, true);
  const onTap = e => { if (!plan.length || e.target.closest?.("button, a, input, [data-act], [data-x]")) return; if (cur >= 0) stop(); else play(0); }; // 안의 단추(⋯·💾·왜 틀렸어요)는 그 단추 일만
  el.addEventListener("click", onTap);
  let autoT = 0;
  return {
    set(p, fresh) {
      const was = cur; plan = p || []; el.classList.toggle("fbcan", plan.length > 0);
      if (!plan.length) { clearTimeout(autoT); stop(); return; }
      mark();
      if (was >= 0) { sfx.stopTag("fb"); const i = Math.min(was, plan.length - 1); lit(i); play(i); return; } // ⇄ = 같은 문장부터 그 말로(글은 이미 새 말)
      if (fresh && plan.length && fbAuto()) { // 새 결과 = 점수 효과음(scorefx · sfx)이 다 끝난 뒤 0.3초 쉬고 한 번(검사1팀 10-21 「100%」 1.5초 겹침) · 최대 6초 기다림
        clearTimeout(autoT); const t0 = performance.now();
        let quiet = 0; // 다른 소리 없이 이어진 시간 — 0.3초 연속 조용해야 시작(한 번 보고 0.3초 뒤 시작하면 그 사이 효과음이 시작될 수 있음 · 검사1팀 1021.12 🎤 끼어든 뒤)
        const go = () => { if (!canPlay()) return; quiet = sfx.playing() ? 0 : quiet + 100; if (quiet >= 300 || performance.now() - t0 > 6000) return play(0); autoT = setTimeout(go, 100); };
        autoT = setTimeout(go, 400);
      }
    },
    stop() { clearTimeout(autoT); stop(); },
    playing: () => cur >= 0,
    off() { clearTimeout(autoT); stop(); removeEventListener("malmun:snd", onSnd); document.removeEventListener("play", onMedia, true); el.removeEventListener("click", onTap); },
  };
}
