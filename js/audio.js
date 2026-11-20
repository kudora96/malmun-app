// 음성 조각 이어 재생 — 조각 사이 간격은 앱이 넣는다(app_build_spec: 기본 400ms)
import { claim } from "./onesound.js?v=1120.37";
export const GAP_MS = 400;

// 점검 소리 끔(본부 10-17) — ?mute=1 이면 음소거 · window.__sfxVolume(점검기)이 있으면 그 크기 · 평소 학습자는 그대로(바꾸는 것 없음)
const tv = a => { if (/[?&]mute=1(&|$)/.test(location.search)) a.muted = true; else if (window.__sfxVolume != null) a.volume = Math.max(0, Math.min(1, window.__sfxVolume)); return a; };
export class Sequence {
  constructor() { this.a = new Audio(); this.a.preload = "auto"; this.q = []; this.i = 0; this.on = false; this.gen = 0; this.timer = 0; this.rate = 1; this.owner = "seq"; this.onstep = null; this.ondone = null; this.ut = 0; this.a.onended = () => this.next(); this.a.onerror = () => this.next(); }
  // items = [{src, ...meta}]
  play(items, from = 0) { this.stop(); this.heard = {}; this.q = items; this.i = from - 1; this.on = true; this.next(); }
  arm(it) { clearInterval(this.ut); this.ut = 0; if (it?.until) this.ut = setInterval(() => { if (this.a.currentTime >= it.until) { clearInterval(this.ut); this.ut = 0; this.a.pause(); this.next(); } }, 15); } // 조각 끝(until) — 한 소리 파일의 한 구간만 재생(두 말 설명 읽기)
  next() {
    clearTimeout(this.timer); clearInterval(this.ut);
    if (!this.on) return;
    this.i++;
    if (this.i >= this.q.length) { this.on = false; this.ondone?.(); return; }
    const go = () => {
      const it = this.q[this.i];
      this.onstep?.(it, this.i);
      let at = it.at; try { const ps = this.a.src, pt = this.a.currentTime; if (ps && pt > 0) (this.heard ||= {})[ps] = Math.max(this.heard[ps] || 0, pt); if (at) { const hh = this.heard?.[new URL(it.src, location.href).href] || 0; if (hh > at && hh - at < 0.6) at = hh; } } catch {} // 같은 소리 파일에서 이미 들은 곳까지는 되감지 않음 — 사이에 다른 말(↳) 조각이 끼어도 같게(대표님 11-20 14:08) // 앞 조각이 끝(until)을 조금 넘겨 소리가 난 만큼 새 조각이 되감지 않음 — 같은 소리 구간을 두 번 들려 주던 것(두 말 켤 때 · 대표님 11-20 13:54 · D-129)
      this.a.src = it.src; this.a.playbackRate = this.rate;
      this.gapping = false; // 새 소리가 걸린 뒤부터 칠하기가 이 조각 시각을 읽음(사이 쉼 동안은 앞 소리 시각이라 읽지 않음 · 대표님 11-20 깜빡임)
      if (at) { this.a.currentTime = at; this.a.addEventListener("loadedmetadata", () => { if (this.a.currentTime < at - 0.2) this.a.currentTime = at; }, { once: true }); } // 그 문장부터(설명 언어 바꿔 이어 읽기)
      // 소리가 시작되기 전에 멈추거나 다른 소리로 바뀌면 앞 play() 가 AbortError 로 늦게 거절됨 → 그걸로 새 차례를 넘기지 않음(⇄·다음 줄을 열자마자 눌렀을 때 소리는 나는데 상태·칠이 안 따라가던 것)
      claim(this.owner); const gen = this.gen; this.arm(it); tv(this.a).play().catch(e => { if (gen === this.gen && e?.name !== "AbortError") this.next(); });
      const nx = this.q[this.i + 1];
      if (nx) { const p = new Audio(); p.preload = "auto"; p.src = nx.src; }
    };
    if (this.i === 0) go(); else { this.gapping = true; this.timer = setTimeout(go, this.q[this.i].gap ?? GAP_MS); } // 조각마다 앞 쉼을 따로 줄 수 있음(말해 보세요 머리말 → 0.6초 → 문장)
  }
  // 소리는 안 내고 그 조각 그 자리에 맞춰 둠(멈춘 채 ⇄ — 다시 누르면 resume 이 그 자리에서 이어서)
  cue(items, from = 0) {
    this.stop(); this.q = items; this.i = from; this.on = false; const it = items[from]; if (!it) return;
    this.onstep?.(it, from); this.a.src = it.src; this.a.playbackRate = this.rate;
    if (it.at) { this.a.currentTime = it.at; this.a.addEventListener("loadedmetadata", () => { if (this.a.currentTime < it.at - 0.2) this.a.currentTime = it.at; }, { once: true }); }
  }
  pause() { this.gen++; if (this.on) this.pgap = this.gapping; this.gapping = false; this.on = false; clearTimeout(this.timer); clearInterval(this.ut); this.a.pause(); }
  resume() { if (!this.q.length) return; this.on = true; if (this.pgap) { this.pgap = false; this.i--; this.next(); return; } /* 조각 사이 쉼에 멈췄으면 다음 조각을 새로(앞 소리를 이어 틀며 다음 조각 until 을 걸어 통째로 빠지던 것 · D-122) */ if (this.a.src && !this.a.ended && this.a.currentTime > 0) { claim(this.owner); this.arm(this.q[this.i]); tv(this.a).play().catch(() => {}); } else { this.i--; this.next(); } }
  stop() { this.heard = {}; this.gen++; this.pgap = false; this.gapping = false; this.on = false; clearTimeout(this.timer); clearInterval(this.ut); this.a.pause(); this.q = []; }
  setRate(r) { this.rate = r; this.a.playbackRate = r; }
  get playing() { return this.on; }
}

// 한 소리 계속 반복(글자 반복 듣기)
export class Looper {
  constructor() { this.a = new Audio(); this.src = null; this.timer = 0; this.a.onended = () => { if (this.src) this.timer = setTimeout(() => tv(this.a).play().catch(() => {}), 500); }; }
  toggle(src) { if (this.src === src) { this.stop(); return false; } this.stop(); this.src = src; this.a.src = src; claim("loop"); tv(this.a).play().catch(() => {}); return true; }
  stop() { clearTimeout(this.timer); this.src = null; this.a.pause(); }
}

// 짧은 소리 한 번(자모)
const one = new Audio();
export function blip(src) { claim("blip"); one.src = src; tv(one).play().catch(() => {}); }
