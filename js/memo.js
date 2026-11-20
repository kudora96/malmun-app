// 외우기(대표님 11-20 15:10~15:13 「ㅇ」) — 단어장 낱말을 설명 없이 쭉 읽어 누워서 듣고 외우게
// 줄마다 한 짝 = 한국어 낱말 소리 + 학습자 말 뜻 소리(⇄ 순서) · 반복 ×N 이면 그 짝을 N 번 · 짝 사이 0.4초 · 줄 사이 0.8초
// 뜻 소리 = 짧은 뜻 낱말 소리(data/memo_map.json 이 알려 주는 것)가 있으면 그것 · 없으면 카드 뜻풀이 첫 문장(낱말 시각 w 로 자름)
// 소리는 언제나 하나(onesound) — vocab.js 가 이 엔진에 줄 목록·낱말 소리·뜻 소리 자리를 건네 줌
import { claim, onSound } from "./onesound.js?v=1120.23";
import { showAutoEnd, hideAutoEnd } from "./autoplay.js?v=1120.23";
import { esc } from "./text.js?v=1120.23";

let repMem = 1; // 이 앱을 연 동안만(새로 열면 ×1)
export const GAP_PAIR = 400, GAP_ROW = 800;
const SENT_END = /[.!?。।॥][」"')”’』»]*$/;
export const TXM = {
  ko: { go: "외우기", rep: "반복", end: "끝까지 들었어요", again: "처음부터 다시", close: "닫기" },
  ne: { go: "याद गर्नुहोस्", rep: "दोहोर्‍याउनुहोस्", end: "तपाईंले सबै सुन्नुभयो", again: "सुरुबाट फेरि", close: "बन्द" },
};

// 뜻풀이 첫 문장 구간(초) — 낱말 시각 w[낱말][시작,끝] · 글 낱말 수와 같지 않아도 첫 마침표 낱말 번호로 자름
export function firstSentence(note, l) {
  const w = note?.[`${l}_mean_w`], tx = String(note?.[`${l}_mean`] || ""), tk = tx.split(/\s+/).filter(Boolean);
  if (!w?.length) return { s: 0, e: 0 };
  let k = tk.findIndex(t => SENT_END.test(t)); if (k < 0 || k >= w.length) k = w.length - 1;
  return { s: Math.max(0, w[0][0] - 0.12), e: w[k][1] + 0.15 };
}

// api = { seq(): 줄 목록 · ko(): 한국어 먼저? · show(i): 그 줄이 보이게(쪽 넘김·금색 테두리) · word(it, done): 낱말 소리(없으면 done 바로) · stopWord() ·
//         mean(it): {url(l), note} | null · shortUrl(it, l): 짧은 뜻 소리 주소 | null · host(): 끝 카드를 붙일 곳 · onState() · tx() }
export function createMemo(api) {
  let tok = 0, idx = 0, running = false, started = false, curA = null, curRes = null, self = 0, timer = 0, repN = repMem;
  const st = () => ({ on: started, running, idx, rep: repN });
  const log = (window.__memo = { log: [], skip: false, get state() { return st(); } });
  const off = onSound("memo", () => { if (!self && running) halt(); }); // 다른 소리(줄 ▶·카드 열기)가 시작하면 멈춤(이어서 하려면 ▶)
  const sleep = ms => new Promise(r => { curRes = r; timer = setTimeout(() => { timer = 0; curRes = null; r(); }, log.skip ? 5 : ms); });
  const stopAu = () => { clearTimeout(timer); timer = 0; if (curA) { try { curA.onended = curA.onerror = null; curA.pause(); } catch {} curA = null; } api.stopWord?.(); const r = curRes; curRes = null; r?.(); };
  function halt() { tok++; running = false; stopAu(); api.onState?.(); }
  function clip(src, s, e) { // 이미 있는 소리 파일의 한 구간
    return new Promise(res => {
      let done = false; const fin = () => { if (done) return; done = true; clearTimeout(timer); timer = 0; curRes = null; if (curA === a) { try { a.pause(); } catch {} curA = null; } res(); };
      const a = (curA = new Audio(src)); curRes = fin; self++; claim("memo"); self--;
      a.onended = a.onerror = fin;
      a.addEventListener("loadedmetadata", () => { try { a.currentTime = s || 0; } catch {} }, { once: true });
      a.play().then(() => { if (e > s) { clearTimeout(timer); timer = setTimeout(fin, Math.max(200, (e - (s || 0)) * 1000)); } }).catch(fin);
    });
  }
  async function part(it, l) {
    log.log.push(`${it.kind === "piece" ? "p:" + it.pid : it.w}|${l}`);
    if (log.skip) return sleep(5);
    if (l === "ko") return new Promise(res => { curRes = res; const t = setTimeout(res, 20000); api.word(it, () => { clearTimeout(t); res(); }, f => { self++; try { f(); } finally { self--; } }); });
    const short = api.shortUrl?.(it, l); if (short) return clip(short, 0, 0);
    const m = api.mean?.(it); if (!m?.note) return; const sp = firstSentence(m.note, l); return clip(m.url(l), sp.s, sp.e);
  }
  async function run(i) {
    const my = ++tok; idx = i; running = true; started = true; hideAutoEnd(); api.onState?.();
    while (my === tok) {
      const sq = api.seq(); if (idx >= sq.length) { end(my); return; }
      const it = sq[idx]; api.show(idx); api.onState?.();
      for (let r = 0; r < repN && my === tok; r++) {
        const ls = api.ko() ? ["ko", "ne"] : ["ne", "ko"];
        for (let p = 0; p < 2 && my === tok; p++) { await part(it, ls[p]); if (my !== tok) return; if (p === 0) { await sleep(GAP_PAIR); if (my !== tok) return; } }
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
  return {
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
}
export const memoBtns = (m, ko) => { // 갈색 막대에 붙는 단추 둘 · 눌림 = 읽는 중(금색)
  const t = TXM[ko ? "ko" : "ne"], s = m.st();
  return `<button type="button" class="vm-go" data-vm="go" aria-pressed="${s.running}" aria-label="${esc(t.go)}" title="${esc(t.go)}"><span class="vm-ic" aria-hidden="true">${s.running ? "⏸" : "▶"}</span><span class="vm-t">${esc(t.go)}</span></button><button type="button" class="vm-rep" data-vm="rep" aria-label="${esc(t.rep)} ×${m.rep()}" title="${esc(t.rep)}">×${m.rep()}</button>`;
};
