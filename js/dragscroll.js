/* dragscroll.js — 단어장 목록 휴대폰식 밀기(관성) · PC 마우스 끌기·휠 부드럽게
 *
 * [도우미 A 에게 · css 두 줄 — 스크롤 막대 숨김, 목록에 class="flick" 붙이기]
 *   .flick { scrollbar-width:none; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
 *   .flick::-webkit-scrollbar { display:none; }
 *
 * 사용: const off = attachDragScroll(listEl, {friction:0.95, threshold:6, wheel:true});  off() 하면 모두 해제.
 * 휴대폰 터치 = 브라우저 기본 관성(건드리지 않음). 마우스만 직접 관성 · 휠은 부드럽게 따라감.
 * 끌다 놓은 것(>threshold px)은 「넘기기」 → 그 뒤 클릭 한 번을 삼켜 단어가 안 열림. 제자리 누름은 그대로 클릭.
 */
export function attachDragScroll(el, opts) {
  const o = Object.assign({ friction: 0.95, threshold: 6, minSpeed: 0.02, wheel: true, wheelEase: 0.18 }, opts || {});
  let raf = 0, down = false, dragging = false, sx = 0, sy = 0, startTop = 0, pid = -1;
  let samples = [];
  let swallow = false, swallowTimer = 0;
  let wheelTarget = null;

  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; wheelTarget = null; };
  const maxTop = () => Math.max(0, el.scrollHeight - el.clientHeight);

  function inertia(v) { // v = px/ms
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, now - last); last = now;
      const before = el.scrollTop;
      el.scrollTop = before + v * dt;
      v *= Math.pow(o.friction, dt / 16.667);
      if (Math.abs(v) < o.minSpeed || el.scrollTop === before) { raf = 0; return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function onDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stop();
    down = true; dragging = false; pid = e.pointerId;
    sx = e.clientX; sy = e.clientY; startTop = el.scrollTop;
    samples = [{ t: e.timeStamp, y: e.clientY }];
  }
  function onMove(e) {
    if (!down || e.pointerId !== pid) return;
    const dy = e.clientY - sy;
    if (!dragging) {
      if (Math.hypot(e.clientX - sx, dy) <= o.threshold) return;
      dragging = true;
      try { el.setPointerCapture(pid); } catch (_) {}
    }
    e.preventDefault();
    el.scrollTop = startTop - dy;
    samples.push({ t: e.timeStamp, y: e.clientY });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
  }
  function onUp(e) {
    if (!down || e.pointerId !== pid) return;
    down = false;
    try { el.releasePointerCapture(pid); } catch (_) {}
    if (!dragging) return;
    dragging = false;
    swallow = true; // 바로 뒤따르는 click 한 번만 삼킴
    clearTimeout(swallowTimer); swallowTimer = setTimeout(() => { swallow = false; }, 350);
    const a = samples[0], b = samples[samples.length - 1];
    const dt = b.t - a.t;
    // 멈췄다 놓은 경우(마지막 움직임이 80ms 넘게 전)는 관성 없음
    if (dt > 0 && e.timeStamp - b.t < 80) {
      const v = -(b.y - a.y) / dt;
      if (Math.abs(v) > o.minSpeed) inertia(v);
    }
  }
  function onClick(e) {
    if (!swallow) return;
    swallow = false; clearTimeout(swallowTimer);
    e.stopPropagation(); e.preventDefault();
  }
  const blockSel = (e) => { if (dragging) e.preventDefault(); };
  function onWheel(e) {
    if (!o.wheel || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (maxTop() <= 0) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= el.clientHeight;
    const cur = wheelTarget == null ? el.scrollTop : wheelTarget;
    const t = Math.max(0, Math.min(maxTop(), cur + d));
    if (t === el.scrollTop && wheelTarget == null) return; // 끝이면 바깥으로 넘겨줌
    e.preventDefault();
    if (raf && wheelTarget == null) { cancelAnimationFrame(raf); raf = 0; } // 관성 중이면 휠이 이어받음
    wheelTarget = t;
    if (!raf) {
      const step = () => {
        const diff = wheelTarget - el.scrollTop;
        if (Math.abs(diff) < 0.5) { el.scrollTop = wheelTarget; raf = 0; wheelTarget = null; return; }
        el.scrollTop += diff * o.wheelEase;
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('click', onClick, true);
  el.addEventListener('selectstart', blockSel);
  el.addEventListener('dragstart', blockSel);
  el.addEventListener('wheel', onWheel, { passive: false });

  return function detach() {
    stop(); clearTimeout(swallowTimer);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.removeEventListener('click', onClick, true);
    el.removeEventListener('selectstart', blockSel);
    el.removeEventListener('dragstart', blockSel);
    el.removeEventListener('wheel', onWheel);
  };
}
