// 음성 조각 이어 재생 — 조각 사이 간격은 앱이 넣는다(app_build_spec: 기본 400ms)
export const GAP_MS = 400;

export class Sequence {
  constructor() { this.a = new Audio(); this.a.preload = "auto"; this.q = []; this.i = 0; this.on = false; this.timer = 0; this.rate = 1; this.onstep = null; this.ondone = null; this.a.onended = () => this.next(); this.a.onerror = () => this.next(); }
  // items = [{src, ...meta}]
  play(items, from = 0) { this.stop(); this.q = items; this.i = from - 1; this.on = true; this.next(); }
  next() {
    clearTimeout(this.timer);
    if (!this.on) return;
    this.i++;
    if (this.i >= this.q.length) { this.on = false; this.ondone?.(); return; }
    const go = () => {
      const it = this.q[this.i];
      this.onstep?.(it, this.i);
      this.a.src = it.src; this.a.playbackRate = this.rate;
      this.a.play().catch(() => this.next());
      const nx = this.q[this.i + 1];
      if (nx) { const p = new Audio(); p.preload = "auto"; p.src = nx.src; }
    };
    if (this.i === 0) go(); else this.timer = setTimeout(go, GAP_MS);
  }
  pause() { this.on = false; clearTimeout(this.timer); this.a.pause(); }
  resume() { if (!this.q.length) return; this.on = true; if (this.a.src && !this.a.ended && this.a.currentTime > 0) this.a.play(); else { this.i--; this.next(); } }
  stop() { this.on = false; clearTimeout(this.timer); this.a.pause(); this.q = []; }
  setRate(r) { this.rate = r; this.a.playbackRate = r; }
  get playing() { return this.on; }
}

// 한 소리 계속 반복(글자 반복 듣기)
export class Looper {
  constructor() { this.a = new Audio(); this.src = null; this.timer = 0; this.a.onended = () => { if (this.src) this.timer = setTimeout(() => this.a.play().catch(() => {}), 500); }; }
  toggle(src) { if (this.src === src) { this.stop(); return false; } this.stop(); this.src = src; this.a.src = src; this.a.play().catch(() => {}); return true; }
  stop() { clearTimeout(this.timer); this.src = null; this.a.pause(); }
}

// 짧은 소리 한 번(자모)
const one = new Audio();
export function blip(src) { one.src = src; one.play().catch(() => {}); }
