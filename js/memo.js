// 외우기(대표님 11-20 15:10~17:06) — 단어장의 조각(낱낱 단어)만 쭉 읽어 누워서 듣고 외우게 · 전용 보기(vocab.js 가 그림)
// 줄마다 = 그 조각 카드 뜻풀이의 첫 문장을 통째로(snd/dict/<조각>_<말>_mean.mp3 의 첫 문장 구간만 · 새 소리 0 · 낱말만 잘라 붙인 소리는 안 씀) · ⇄ 앞에 둔 말 한 문장 · 「두 말」 켜면 다른 말 문장도 이어서
// 반복 ×N = 그 묶음(한 말이면 한 문장 · 두 말이면 두 문장)을 N 번 · 묶음 사이 0.4초 · 줄 사이 0.8초 · 소리는 언제나 하나(onesound)
import { claim, onSound } from "./onesound.js?v=1120.38";
import { showAutoEnd, hideAutoEnd } from "./autoplay.js?v=1120.38";
import { esc } from "./text.js?v=1120.38";

let repMem = 1; // 이 앱을 연 동안만(새로 열면 ×1)
export const GAP_PAIR = 400, GAP_ROW = 800;
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

// api = { seq(): 줄 목록 · ko(): 한국어 먼저? · two(): 두 말? · show(i): 그 줄이 보이게(금색 테두리·저절로 스크롤) · mean(it): {url(l), note} | null · tick(i, l, t): 읽는 낱말 칠(t<0 = 지움) · host() · onState() }
export function createMemo(api) {
  let tok = 0, idx = 0, running = false, started = false, curA = null, curRes = null, self = 0, timer = 0, repN = repMem;
  const st = () => ({ on: started, running, idx, rep: repN });
  const log = (window.__memo = { log: [], clips: [], skip: false, get state() { return st(); } });
  const off = onSound("memo", () => { if (!self && running) halt(); }); // 다른 소리(줄 ▶·카드 열기)가 시작하면 멈춤(이어서 하려면 ▶)
  const sleep = ms => new Promise(r => { curRes = r; timer = setTimeout(() => { timer = 0; curRes = null; r(); }, log.skip ? 5 : ms); });
  const stopAu = () => { clearTimeout(timer); timer = 0; if (curA) { try { curA.onended = curA.onerror = null; curA.pause(); } catch {} curA = null; } api.stopWord?.(); const r = curRes; curRes = null; r?.(); };
  function halt() { tok++; running = false; stopAu(); api.onState?.(); }
  function clip(src, s, e, tick) { // 이미 있는 소리 파일의 한 구간 · tick(초) = 읽는 낱말 따라가기(끝나면 tick(-1)) · 구간 끝(e)에서 바로 멈춤
    return new Promise(res => {
      let done = false, iv = 0; const fin = () => { if (done) return; done = true; clearInterval(iv); if (tick) tick(-1); clearTimeout(timer); timer = 0; curRes = null; if (curA === a) { try { a.pause(); } catch {} curA = null; } res(); };
      const a = (curA = new Audio(src)); curRes = fin; self++; claim("memo"); self--;
      a.onended = a.onerror = fin;
      a.addEventListener("loadedmetadata", () => { try { a.currentTime = s || 0; } catch {} }, { once: true });
      a.play().then(() => { if (!done) iv = setInterval(() => { if (curA !== a) return; if (e > s && a.currentTime >= e) return fin(); if (tick) tick(a.currentTime); }, 40); if (e > s) { clearTimeout(timer); timer = setTimeout(fin, Math.max(200, (e - (s || 0)) * 1000 + 300)); } }).catch(fin);
    });
  }
  async function part(it, l) {
    log.log.push(`${it.kind === "piece" ? "p:" + it.pid : it.w}|${l}`);
    const m = api.mean?.(it); if (!m?.note) return log.skip ? sleep(5) : undefined; const sp = firstSentence(m.note, l), ix = idx;
    log.clips.push({ i: ix, l, url: m.url(l), s: sp.s, e: sp.e, n: sp.tk.length });
    if (log.skip) return sleep(5);
    return clip(m.url(l), sp.s, sp.e, api.tick ? t => api.tick(ix, l, t) : null); // 뜻풀이 첫 문장 구간만(둘째 문장부터는 안 들림)
  }
  async function run(i) {
    const my = ++tok; stopAu(); idx = i; running = true; started = true; hideAutoEnd(); api.onState?.();
    while (my === tok) {
      const sq = api.seq(); if (idx >= sq.length) { end(my); return; }
      const it = sq[idx]; api.show(idx); api.onState?.();
      for (let r = 0; r < repN && my === tok; r++) {
        const ls = api.ko() ? ["ko", "ne"] : ["ne", "ko"], ps = api.two?.() ? ls : [ls[0]]; // 한 말 = 앞에 둔 말 한 문장 · 두 말 = 앞에 둔 말 → 다른 말
        for (let p = 0; p < ps.length && my === tok; p++) { await part(it, ps[p]); if (my !== tok) return; if (p < ps.length - 1) { await sleep(GAP_PAIR); if (my !== tok) return; } }
        if (r < repN - 1) { await sleep(GAP_ROW); if (my !== tok) return; }
      }
      if (my !== tok) return; await sleep(GAP_ROW); if (my !== tok) return;
      idx++;
    }
  }
  function end(my) {
    if (my !== tok) return; running = false; started = false; idx = 0; api.onState?.(); const t = TXM[api.ko() ? "ko" : "ne"];
    showAutoEnd("word", api.host?.() || document.body, { title: t.end, again: t.again, close: t.close, onAgain: () => run(0), onClose: () => { api.show(-1); } });
  }
  const eng = {
    st,
    rep: () => repN,
    cycle() { repN = repN >= 4 ? 1 : repN + 1; repMem = repN; api.onState?.(); }, // ×1→×2→×3→×4→×1 (돌고 있어도 다음 줄부터 먹힘)
    toggle() { if (running) return halt(); run(idx); }, // ▶ = 처음(맨 위 또는 마지막에 누른 줄) · ⏸ 뒤 ▶ = 그 줄부터 이어서
    jump(i) { run(i); }, // 아무 줄 누르면 거기부터
    active: () => started,
    halt() { if (running) halt(); },
    stop() { tok++; running = false; started = false; idx = 0; stopAu(); hideAutoEnd(); api.show?.(-1); api.onState?.(); off(); },
    reset() { tok++; running = false; started = false; idx = 0; stopAu(); hideAutoEnd(); api.show(-1); api.onState?.(); },
    guard(f) { self++; try { return f(); } finally { self--; } }, // 내 소리를 시작하는 순간의 claim 은 나를 멈추지 않음
  };
  log.jump = eng.jump; log.halt = eng.halt; // 검사용
  return eng;
}
export const memoBtns = (m, ko, two) => { // 외우기 전용 보기 갈색 막대: ‹ 돌아가기 · ▶/⏸ · 두 말 · ×N (⛶ 는 공용 막대 오른쪽 끝) · 눌림 = 읽는 중(금색) · 두 말 = 카드·설명 막대의 「두 말」과 같은 단추·같은 저장값
  const t = TXM[ko ? "ko" : "ne"], s = m.st();
  return `<button type="button" class="vm-back" data-vm="back" aria-label="${esc(t.back)}" title="${esc(t.back)}"><span class="vm-ic" aria-hidden="true">‹</span><span class="vm-t">${esc(t.back)}</span></button><button type="button" class="vm-go" data-vm="go" aria-pressed="${s.running}" aria-label="${s.running ? "⏸" : "▶"}" title="${esc(t.go)}"><span class="vm-ic" aria-hidden="true">${s.running ? "⏸" : "▶"}</span></button><button type="button" class="vm-two vk-two" data-vm="two" data-act="two" aria-pressed="${!!two}" aria-label="${esc(t.two)}"><span class="cc">${esc(t.two)}</span></button><button type="button" class="vm-rep" data-vm="rep" aria-label="${esc(t.rep)} ×${m.rep()}" title="${esc(t.rep)}">×${m.rep()}</button>`;
};
