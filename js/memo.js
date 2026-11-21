// 외우기(대표님 11-20 15:10~17:06) — 단어장의 조각(낱낱 단어)만 쭉 읽어 누워서 듣고 외우게 · 전용 보기(vocab.js 가 그림)
// 줄마다 = 그 조각 카드 뜻풀이의 첫 문장을 통째로(snd/dict/<조각>_<말>_mean.mp3 의 첫 문장 구간만 · 새 소리 0 · 낱말만 잘라 붙인 소리는 안 씀) · ⇄ 앞에 둔 말 한 문장 · 「두 말」 켜면 다른 말 문장도 이어서
// 반복 ×N = 그 묶음(한 말이면 한 문장 · 두 말이면 두 문장)을 N 번 · 묶음 사이 0.4초 · 줄 사이 0.8초 · 소리는 언제나 하나(onesound)
import { claim, onSound } from "./onesound.js?v=1120.38";
import { showAutoEnd, hideAutoEnd } from "./autoplay.js?v=1120.38";
import { esc } from "./text.js?v=1120.38";
import { commaMap } from "./wordnote.js?v=1120.38";

let repMem = 1; // 이 앱을 연 동안만(새로 열면 ×1)
export const GAP_PAIR = 400, GAP_ROW = 800, GAP_CL = 300; // GAP_CL = 마디 사이(단어 카드와 같은 0.3초)
const SENT_END = /[.!?。।॥][」"')”’』»]*$/;
export const TXM = {
  ko: { go: "외우기", rep: "반복", two: "두 말", end: "끝까지 들었어요", again: "처음부터 다시", close: "닫기", back: "돌아가기" },
  ne: { go: "याद गर्नुहोस्", tab: "याद गर्नु", rep: "दोहोर्‍याउनुहोस्", two: "दुवै भाषा", end: "तपाईंले सबै सुन्नुभयो", again: "सुरुबाट फेरि", close: "बन्द", back: "फिर्ता" },
};

// 뜻풀이 첫 문장 구간(초) — 낱말 시각 w[낱말][시작,끝] · 글 낱말 수와 같지 않아도 첫 마침표 낱말 번호로 자름
// 끝 = 마지막 낱말 끝 + 0.15초 · 단 다음 문장 첫 낱말이 새지 않게 그 빈틈 가운데를 넘지 않음(1120.24 learn.js segEdge 방식)
export function firstSentence(note, l) {
  const w = note?.[`${l}_mean_w`], tx = String(note?.[`${l}_mean`] || ""), tk = tx.split(/\s+/).filter(Boolean);
  let k = tk.findIndex(t => SENT_END.test(t)); if (k < 0) k = tk.length - 1;
  if (!w?.length) return { s: 0, e: 0, k, tk: tk.slice(0, k + 1), w: null };
  if (k >= w.length) k = w.length - 1;
  const e0 = w[k][1], nx = w[k + 1]?.[0]; let e = e0 + 0.15; if (nx != null && nx >= e0) e = Math.min(e, Math.max(e0, (e0 + nx) / 2));
  return { s: Math.max(0, w[0][0] - 0.12), e, k, tk: tk.slice(0, k + 1), w: w.slice(0, k + 1) };
}

// 마디 통역(대표님 11-21 10:30 「실시간 통역처럼 짧게 바로바로 1대1」 · 단어 카드 mkPlan 과 같은 규칙) — 뜻풀이 첫 문장을 쉼표·마침표 마디(따옴표 안 쉼표는 안 끊음)로 나눠 두 말의 마디 수가 같으면 마디별 구간표를 만듦(새 소리 0 · 낱말 시각 w) · 다르면(또는 낱말 시각 없음·마디 1개) null = 문장 통째 번갈아
const PAD = 0.15, LEAD = 0.1, plans = new WeakMap();
export function planFor(note) {
  if (!note || typeof note !== "object") return null; if (plans.has(note)) return plans.get(note);
  let out = null; try {
    const f = { ko: firstSentence(note, "ko"), ne: firstSentence(note, "ne") }, seg = {};
    if (f.ko.w && f.ne.w) { for (const l of ["ko", "ne"]) { const { tk, w } = f[l], cm = commaMap(tk), gs = []; tk.forEach((_, i) => { (gs[cm.cl[i]] ||= []).push(i); }); const g2 = gs.filter(Boolean); if (!g2.length) { seg[l] = null; break; }
      let pe = 0; seg[l] = g2.map((g, ci) => { const st = w[g[0]][0], lw = w[g[g.length - 1]], e0 = lw[1] || lw[0] + 0.1, ns = g2[ci + 1] ? w[g2[ci + 1][0]][0] : null, e = e0 + PAD, o = { st, at: ci ? Math.max(pe, st - PAD) : f[l].s, until: ns != null ? Math.max(e0, Math.min(e, ns - LEAD - 0.01)) : f[l].e }; pe = e0; return o; }); }
      if (seg.ko && seg.ne && seg.ko.length === seg.ne.length && seg.ko.length >= 2) out = { n: seg.ko.length, seg, f }; }
  } catch { out = null; }
  plans.set(note, out); return out;
}

// api = { seq(): 줄 목록 · ko(): 한국어 먼저? · two(): 두 말? · show(i): 그 줄이 보이게(금색 테두리·저절로 스크롤) · mean(it): {url(l), note} | null · tick(i, l, t): 읽는 낱말 칠(t<0 = 지움) · host() · onState() }
export function createMemo(api) {
  // 대표님 11-21 10:18·10:21 「읽는 중 ⇄·두 말·⏸▶ 가 소리를 끊지 않는다」 — 단어 카드(wordnote.js)와 같은 원리:
  //  소리 요소는 그대로 두고, 다음에 무엇을 읽을지는 말(부분)이 끝나는 순간마다 지금 상태(⇄ 순서·두 말·×N)로 새로 정한다. 같은 줄에서 이미 읽은 말은 done 에 적어 다시 안 읽는다.
  //  ⏸ = 지금 소리·쉼 타이머를 얼려 두고(cur.freeze) ▶ = 그 자리에서 이어 감(cur.thaw). 소리를 끊고 처음부터 다시 틀지 않는다.
  let tok = 0, idx = 0, running = false, alive = false, started = false, cur = null, gateRes = null, self = 0, repN = repMem;
  const st = () => ({ on: started, running, idx, rep: repN, alive });
  const log = (window.__memo = { log: [], clips: [], skip: false, get state() { return st(); } });
  const off = onSound("memo", () => { if (!self && running) pause(); }); // 다른 소리(줄 ▶·카드 열기)가 시작하면 멈춤(▶ 하면 그 자리에서 이어서)
  const releaseGate = () => { const g = gateRes; gateRes = null; g?.(); };
  const gate = () => (running ? 0 : new Promise(r => { gateRes = r; })); // 멈춘 동안 다음 걸음으로 못 가게 붙잡음(▶ 하면 풀림)
  const cancelCur = () => { const c = cur; cur = null; if (c) c.cancel(); api.stopWord?.(); };
  const sleep = ms => new Promise(res => { // 멈출 수 있는 쉼 — ⏸ 하면 남은 시간만 얼림
    const o = { left: log.skip ? 5 : ms, t: 0, t0: 0, start() { this.t0 = performance.now(); this.t = setTimeout(() => o.cancel(), Math.max(1, this.left)); }, freeze() { if (!this.t) return; clearTimeout(this.t); this.t = 0; this.left = Math.max(0, this.left - (performance.now() - this.t0)); }, thaw() { this.start(); }, cancel() { clearTimeout(this.t); if (cur === o) cur = null; res(); } };
    cur = o; if (running) o.start();
  });
  function pause() { if (!running) return; running = false; cur?.freeze(); api.onState?.(); }
  function resume() { if (running || !alive) return; running = true; cur?.thaw(); releaseGate(); api.onState?.(); }
  function clip(src, s, endFn, emax, tick) { // 이미 있는 소리 파일의 한 구간 · endFn(초) = 지금 끝낼 시각(두 말 켜고 끔에 따라 그때그때 정함) · tick(초) = 읽는 낱말 따라가기(끝나면 tick(-1)) · freeze/thaw = ⏸/▶ (같은 소리 요소 · 같은 자리)
    return new Promise(res => {
      let done = false, frozen = false, iv = 0, tm = 0; const a = new Audio(src);
      const clear = () => { clearInterval(iv); clearTimeout(tm); iv = tm = 0; };
      const fin = () => { if (done) return; done = true; clear(); if (tick) tick(-1); if (cur === o) cur = null; try { a.onended = a.onerror = null; a.pause(); } catch {} res(); };
      const arm = () => { clear(); iv = setInterval(() => { const e = endFn(a.currentTime); if (e > s && a.currentTime >= e) return fin(); if (tick) tick(a.currentTime); }, 40); if (emax > s) tm = setTimeout(fin, Math.max(200, (emax - (a.currentTime || s || 0)) * 1000 + 300)); };
      const go = () => { self++; claim("memo"); self--; return a.play().then(() => { if (!done && !frozen) arm(); }).catch(() => { if (!frozen) fin(); }); };
      const o = { a, cancel: fin, freeze() { frozen = true; clear(); try { a.pause(); } catch {} }, thaw() { if (done) return; frozen = false; go(); }, repaint() { if (tick && !done) tick(a.currentTime); } };
      cur = o; a.onended = a.onerror = fin;
      a.addEventListener("loadedmetadata", () => { try { a.currentTime = s || 0; } catch {} }, { once: true });
      if (running) go(); else frozen = true;
    });
  }
  // 한 부분 = (말 l, 마디 ci | 통째) · spec = { ci, first, toEnd } — 돌려주는 값: 통째로 읽다가 두 말을 켜서 마디 끝에서 끊긴 자리(마디 번호) 또는 -1
  async function part(it, l, plan, spec) {
    const ci = spec.ci ?? -1; log.log.push(`${it.kind === "piece" ? "p:" + it.pid : it.w}|${l}` + (ci >= 0 ? `|${ci}` : ""));
    const m = api.mean?.(it); if (!m?.note) return log.skip ? sleep(5).then(() => ({ cut: -1, rest: false })) : { cut: -1, rest: false }; const sp = firstSentence(m.note, l);
    let s = sp.s, endFn = () => sp.e, cut = -1, rest = false; const emax = sp.e;
    if (plan && ci >= 0) { const S = plan.seg[l][ci]; s = S.at; endFn = spec.second ? () => S.until : spec.toEnd ? () => sp.e : () => { rest = !api.two?.(); return rest ? sp.e : S.until; }; } // 첫 말 = 두 말이면 그 마디 끝에서 · 껐으면 문장 끝까지 이어서 · 둘째 말(↳) = 그 마디 끝까지만
    else if (plan) endFn = t => { if (!api.two?.()) { cut = -1; return sp.e; } const S = plan.seg[l]; let c = 0; S.forEach((x, i) => { if (t + LEAD >= x.st) c = i; }); cut = c; return S[c].until; }; // 통째 읽는 중 두 말을 켜면 지금 마디 끝에서 끊고 그 짝으로
    const e = plan && ci >= 0 ? plan.seg[l][ci].until : sp.e;
    log.clips.push({ i: idx, l, url: m.url(l), s, e, n: sp.tk.length, ci });
    if (log.skip) { await sleep(5); return { cut: -1, rest: false }; }
    await clip(m.url(l), s, endFn, emax, api.tick ? t => api.tick(idx, l, t) : null); // 뜻풀이 첫 문장 구간만(둘째 문장부터는 안 들림) · 줄 번호는 칠할 때 지금 값(⇄ 로 목록 순서가 바뀌어도 맞음)
    return { cut, rest };
  }
  async function run(i) {
    const my = ++tok; cancelCur(); releaseGate(); idx = i; running = true; alive = true; started = true; hideAutoEnd(); api.onState?.();
    while (my === tok) {
      const sq = api.seq(); if (idx >= sq.length) { end(my); return; }
      const it = sq[idx]; api.show(idx); api.onState?.(); const plan = planFor(api.mean?.(it)?.note);
      for (let r = 0; r < repN && my === tok; r++) {
        const done = new Set(); let slept = false, ci = -1, played = false;
        for (;;) { // 말이 하나 끝날 때마다 지금 상태(⇄ 순서·두 말)로 다음 말을 정함 · 마디 통역 = 첫 말 마디 → 다른 말 같은 마디 → 다음 마디(새 순서의 첫 말부터)… · 마디 수가 다르면 문장 통째 번갈아
          await gate(); if (my !== tok) return;
          const ls = api.ko() ? ["ko", "ne"] : ["ne", "ko"], two = !!api.two?.(); let d;
          if (!plan) { const nl = !done.size ? ls[0] : two ? ls.find(l => !done.has(l)) : undefined; d = nl ? { nl } : { end: true }; }
          else if (ci < 0) d = two ? { nl: ls[0], ci: 0 } : { nl: ls[0], whole: true };
          else { const nl = !done.size ? ls[0] : two ? ls.find(l => !done.has(l)) : undefined; if (nl) d = { nl, ci, second: done.size > 0 }; else if (ci + 1 >= plan.n) d = { end: true }; else d = two ? { nl: ls[0], ci: ci + 1, fresh: true } : { nl: ls[0], ci: ci + 1, fresh: true, toEnd: true }; }
          if (d.end) break;
          if (played && !slept) { await sleep(plan ? GAP_CL : GAP_PAIR); if (my !== tok) return; slept = true; continue; } // 말과 말 사이 쉼 뒤에 한 번 더 상태를 봄
          slept = false; played = true; if (d.fresh) done.clear(); if (d.ci != null) ci = d.ci; done.add(d.nl);
          const rr = await part(it, d.nl, plan, d); if (my !== tok) return;
          if (d.whole) { if (rr.cut >= 0) { ci = rr.cut; continue; } break; } // 통째로 읽다 두 말이 켜져 마디 끝에서 끊김 = 그 마디의 짝부터 · 아니면 이 줄 끝
          if (d.toEnd || rr.rest) break; // 두 말을 끄고 남은 마디를 문장 끝까지 이어 읽음(소리가 문장 끝까지 감) = 이 줄 끝
        }
        if (r < repN - 1) { await sleep(GAP_ROW); if (my !== tok) return; }
      }
      if (my !== tok) return; await sleep(GAP_ROW); if (my !== tok) return; await gate(); if (my !== tok) return;
      idx++;
    }
  }
  function end(my) {
    if (my !== tok) return; running = false; alive = false; started = false; idx = 0; api.onState?.(); const t = TXM[api.ko() ? "ko" : "ne"];
    showAutoEnd("word", api.host?.() || document.body, { title: t.end, again: t.again, close: t.close, onAgain: () => run(0), onClose: () => { api.show(-1); } });
  }
  const full = () => { tok++; running = false; alive = false; cancelCur(); releaseGate(); }; // 완전히 멈춤(줄 눌러 새로 시작·닫기·검사)
  const eng = {
    st,
    rep: () => repN,
    cycle() { repN = repN >= 4 ? 1 : repN + 1; repMem = repN; api.onState?.(); }, // ×1→×2→×3→×4→×1 (돌고 있어도 다음 줄부터 먹힘)
    toggle() { if (running) return pause(); if (alive) return resume(); run(idx); }, // ⏸ = 그 자리에서 멈춤 · ▶ = 멈춘 그 자리에서 이어서(줄 처음 아님) · 끝났거나 멈춘 적 없으면 처음(맨 위 또는 마지막에 누른 줄)부터
    jump(i) { run(i); }, // 아무 줄 누르면 거기부터
    active: () => started,
    halt() { if (running || alive) { full(); api.onState?.(); } },
    remap(i) { if (alive) idx = i; }, // 목록 순서가 바뀌었을 때(⇄·정렬) 읽는 줄 번호만 맞춤 — 소리·읽은 기록은 그대로
    repaint() { cur?.repaint?.(); }, // 줄 글을 다시 그린 직후 지금 읽는 낱말 칠을 바로 되살림
    stop() { full(); started = false; idx = 0; hideAutoEnd(); api.show?.(-1); api.onState?.(); off(); },
    reset() { full(); started = false; idx = 0; hideAutoEnd(); api.show(-1); api.onState?.(); },
    guard(f) { self++; try { return f(); } finally { self--; } }, // 내 소리를 시작하는 순간의 claim 은 나를 멈추지 않음
  };
  log.jump = eng.jump; log.halt = eng.halt; // 검사용
  log.planAt = i => { const it = api.seq()[i], pl = it && planFor(api.mean?.(it)?.note); return pl ? { n: pl.n, seg: JSON.parse(JSON.stringify(pl.seg)) } : null; };
  return eng;
}
export const memoBtns = (m, ko, two) => { // 외우기 전용 보기 갈색 막대: ‹ 돌아가기 · ▶/⏸ · 두 말 · ×N (⛶ 는 공용 막대 오른쪽 끝) · 눌림 = 읽는 중(금색) · 두 말 = 카드·설명 막대의 「두 말」과 같은 단추·같은 저장값
  const t = TXM[ko ? "ko" : "ne"], s = m.st();
  return `<button type="button" class="vm-back" data-vm="back" aria-label="${esc(t.back)}" title="${esc(t.back)}"><span class="vm-ic" aria-hidden="true">‹</span><span class="vm-t">${esc(t.back)}</span></button><button type="button" class="vm-go" data-vm="go" aria-pressed="${s.running}" aria-label="${s.running ? "⏸" : "▶"}" title="${esc(t.go)}"><span class="vm-ic" aria-hidden="true">${s.running ? "⏸" : "▶"}</span></button><button type="button" class="vm-two vk-two" data-vm="two" data-act="two" aria-pressed="${!!two}" aria-label="${esc(t.two)}"><span class="cc">${esc(t.two)}</span></button><button type="button" class="vm-rep" data-vm="rep" aria-label="${esc(t.rep)} ×${m.rep()}" title="${esc(t.rep)}">×${m.rep()}</button>`;
};
