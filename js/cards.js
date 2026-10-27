// 영상 위 AR 카드(얹기부 10-27 · 본부 「A: 앱이 영상 위에 직접 그림」) — 카드 = 코드로 그린 투명 유리판(청록 빛 테두리) · 세로 · 아이콘 + 낱말 짝(학습자 말 / 한국어 같은 크기)
//  자료: data/{편}/{편}.cards.json(얹기부 · 카드 자리·때·하이라이트·사라짐 효과 · 1280×720 영상 그림 기준 px) + data/{편}/{편}.cardtext.json(낱말 · 번역부 21개 언어)
//  카드 = 정한 때에 떠오름(0.3초) → 말하는 낱말 줄이 빛남(글자 크기·자리 0 변화 · 다음 낱말까지 계속) → 카드 끝 0.55초 = 카드마다 다른 사라짐 효과(파편·픽셀·유리 조각·접힘) · 모두 영상 시각(currentTime)으로 계산 = 되감기·일시정지·건너뛰기에 그 자리 그대로
//  자리 = 큰 화면(scene) · 작은 화면(영상 폭 560px 밑 = phone · 글 하한 10px) · 안전: 영상 길이가 json total 과 1초 넘게 다르면 띄우지 않음
//  자료가 없으면 null(옛 PNG 카드 overlays.js 로)
import { lang, uiKoOn } from "./i18n.js?v=1023.39";

const getJSON = u => fetch(u, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
const ICON = {
  jamo: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8.5 8.5h6.5v7.5"/></svg>',
  life: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h16l-1.7 9.2a1.6 1.6 0 0 1-1.6 1.3H7.3a1.6 1.6 0 0 1-1.6-1.3z"/><path d="M8.5 8.5l2.2-4M15.5 8.5l-2.2-4"/></svg>',
  exam: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="3.5" width="11.5" height="16" rx="2"/><path d="M7.5 8h5.5M7.5 11.5h5.5M7.5 15h3"/><path d="M13.5 20.5l.7-3.2 5.2-5.2a1.5 1.5 0 0 1 2.1 0l.3.3a1.5 1.5 0 0 1 0 2.1l-5.2 5.2z"/></svg>',
  mouth: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12c2.2-3.2 4.6-4.4 8.5-3.6 3.9-.8 6.3.4 8.5 3.6-2.2 3.6-4.7 5-8.5 5s-6.3-1.4-8.5-5z"/><path d="M3.5 12c2.6.9 5.2 1.3 8.5 1.3s5.9-.4 8.5-1.3"/></svg>',
  ear: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9.5a5 5 0 0 1 10 0c0 2.6-1.7 3.4-2.7 4.7-.8 1-.6 2.3-1.5 3.3a2.6 2.6 0 0 1-4.3-1.4"/><path d="M10.2 9.6a1.9 1.9 0 0 1 3.8 0c0 1.1-1 1.5-1.4 2.2"/></svg>',
  pencil: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l.9-4.2L16.4 4.3a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.7 18.6z"/><path d="M14.5 6.2l3.3 3.3"/></svg>',
  paper: '<svg class="cd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5M8 12h7M8 15.5h7M8 18.5h4"/></svg>'
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ease = x => x * x * (3 - 2 * x), clamp01 = x => Math.max(0, Math.min(1, x));
const rng = seed => { let a = (seed >>> 0) + 0x6d2b79f5; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// 보로노이 조각(유리) — 사각형을 seed 점마다 반평면으로 잘라 다각형 목록(0~1 비율)
function voronoi(k, seed) {
  const r = rng(seed), pts = Array.from({ length: k }, () => [r(), r()]), out = [];
  for (let i = 0; i < k; i++) {
    let poly = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let j = 0; j < k && poly.length; j++) {
      if (j === i) continue;
      const mx = (pts[i][0] + pts[j][0]) / 2, my = (pts[i][1] + pts[j][1]) / 2, nx = pts[j][0] - pts[i][0], ny = pts[j][1] - pts[i][1], f = p => (p[0] - mx) * nx + (p[1] - my) * ny;
      const next = [];
      for (let a = 0; a < poly.length; a++) {
        const p = poly[a], q = poly[(a + 1) % poly.length], fp = f(p), fq = f(q);
        if (fp <= 0) next.push(p);
        if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); next.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      poly = next;
    }
    if (poly.length >= 3) out.push(poly);
  }
  return out;
}

export async function setupCards(ep, v, { wrap }) {
  const [C, X] = await Promise.all([getJSON(`data/${ep}/${ep}.cards.json`), getJSON(`data/${ep}/${ep}.cardtext.json`)]);
  if (!C?.cards?.length || !X?.ko) return null;
  const want = +C.total || 0, okVideo = () => !want || (Number.isFinite(v.duration) && Math.abs(v.duration - want) < 1);
  const learn = wrap.closest(".learn"), ccOn = () => !learn || !learn.classList.contains("nosub");
  const layer = document.createElement("div"); layer.className = "cd-layer"; layer.setAttribute("aria-hidden", "true"); wrap.append(layer);
  let cur = null, ar = null, ex = null, exKey = "", lastKey = "";

  // 실제로 그린 칸에서 다시 재 봄 — 기기 글꼴 폭이 달라 모자라면(앱 검사부: 키릴 글꼴 74>72px) 선생님 반대쪽으로 4px씩 더 키움(폭 · 높이) · 화면 밖 0
  function settle(el, r) {
    const R = { ...r }; let ok = fit(el, R);
    for (let k = 0; k < 24 && !ok; k++) {
      const inn = el.querySelector(".cd-in"), wide = !(inn.scrollWidth <= inn.clientWidth + .5 && [...inn.querySelectorAll(".cd-pair, .cd-pair span")].every(p => p.scrollWidth <= p.clientWidth + .5));
      if (wide) { // 폭: 선생님 반대쪽 먼저 · 화면 끝이면 반대쪽(상자와 안 겹칠 때만)
        let done = false;
        for (const d of [R.dir, -R.dir]) { const nx = d < 0 ? R.x - 4 : R.x, nw = R.w + 4, t = { x: nx, y: R.y, w: nw, h: R.h }; if (nx < 0 || nx + nw > (R.W ?? 1e9)) continue; if (d !== R.dir && !R.baseHit && (R.boxes || []).some(q => t.x < q.x1 && t.x + t.w > q.x0 && t.y < q.y1 && t.y + t.h > q.y0)) continue; R.x = nx; R.w = nw; R.dir = d; done = true; break; }
        if (!done) break;
      }
      else { const ny = R.palm ? R.y - 4 : R.y; if (ny < 0 || ny + R.h + 4 > (R.H ?? 1e9) - 40) break; R.y = ny; R.h += 4; }
      place(el, R); ok = fit(el, R);
    }
    el._r = R; return R;
  }
  // ── 낱말 짝: 학습자 말이 있고(CC 켬) 한국어 화면이 아니면 두 줄(⇄ 위아래) · 아니면 한국어 한 줄
  const word = (kind, key) => {
    const k = kind === "k9d" ? "k9" : kind, ko = X.ko[k]?.[key] ?? "", tr = lang !== "ko" && ccOn() ? X.i18n?.[lang]?.[k]?.[key] : null;
    return tr ? { tr, ko, trFirst: !uiKoOn() } : { ko };
  };
  const pair = (kind, key, cls = "") => { const w = word(kind, key), a = `<span class="cd-tr" lang="${esc(lang)}">${esc(w.tr || "")}</span>`, b = `<span class="cd-ko" lang="ko">${esc(w.ko)}</span>`; return `<div class="cd-pair ${cls}">${w.tr ? (w.trFirst ? a + b : b + a) : b}</div>`; };
  const rows = kind => ({
    k5: () => `<div class="cd-row" data-r="0">${ICON.jamo}<span class="cd-num">①</span>${pair(kind, "h")}</div><div class="cd-row" data-r="1">${ICON.life}<span class="cd-num">②</span>${pair(kind, "life")}</div><div class="cd-row" data-r="2">${ICON.exam}<span class="cd-num">③</span>${pair(kind, "ex")}</div>`,
    k7: () => `<div class="cd-row" data-r="0">${ICON.ear}${pair(kind, "l7")}</div><div class="cd-row" data-r="1">${ICON.mouth}${pair(kind, "s7")}</div><div class="cd-row" data-r="2">${ICON.pencil}${pair(kind, "w7")}</div>`,
    k9d: () => `<div class="cd-row" data-r="0">${ICON.paper}${ICON.mouth}${pair(kind, "r")}</div><div class="cd-row" data-r="1">${pair(kind, "pe")}</div><div class="cd-row" data-r="2">${pair(kind, "cite")}</div>`,
    k10: () => `<div class="cd-row cd-k10" data-r="0"><div class="cd-chars"><img src="img/cards/kong_front.png" alt=""><img src="img/cards/dubu_front.png" alt=""></div>${pair(kind, "game", "cd-center")}</div>`
  }[kind] || (() => ""))();

  // ── 영상 그림 칸(1280×720) → 화면 px
  const place = (el, r) => Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
  const geom = () => { const W = wrap.clientWidth, H = wrap.clientHeight, s = Math.min(W / 1280, H / 720); return { W, H, s, ox: (W - 1280 * s) / 2, oy: (H - 720 * s) / 2, phone: W < 560 }; };
  const segAt = (c, tm) => c.segments.find(x => tm >= x.t0 && tm < x.t1) || (tm < c.segments[0].t0 ? c.segments[0] : c.segments.at(-1));
  const fit = (el, r, minOverride) => { // 카드 안 글 맞춤 — 넘치면 줄임(하한 큰 화면 8px·폰 10px · 말줄임 없음 · 낱말 중간 꺾임 없음 = 줄바꿈은 낱말 사이만)
    const inn = el.querySelector(".cd-in"), max = r.phone ? 17 : Math.max(10.5, 24 * r.s), min = minOverride ?? 10;
    let fs = max; for (; fs >= min - 1e-6; fs -= 0.5) { el.style.setProperty("--fs", fs + "px"); if (fits(inn)) return true; }
    el.style.setProperty("--fs", min + "px"); return false;
  };
  const fits = inn => inn.scrollHeight <= inn.clientHeight + .5 && inn.scrollWidth <= inn.clientWidth + .5 && [...inn.querySelectorAll(".cd-pair, .cd-pair span")].every(p => p.scrollWidth <= p.clientWidth + .5); // 칸 안 · 낱말이 칸 폭보다 길면(중간 꺾임 금지) 넘침
  // 폰(영상 폭 560 밑): 글 하한 10px 에서도 안 들어가면 칸을 키움 — 선생님 쪽 모서리(손바닥 컷은 손 쪽 아래)는 그대로 두고 반대쪽(화면 구석 쪽)으로 · 선생님 얼굴·몸 상자(boxes)와 안 겹침 · 화면 밖 0
  const solved = new Map(); window.__cdSolved = solved; // 점검용(칸 키움 결과)
  function solvePhone(c, seg, g) {
    const key = `${g.phone ? "p" : "b"}|${c.id}|${seg.cut}|${lang}|${ccOn()}|${uiKoOn()}|${g.W}x${g.H}`; if (solved.has(key)) return solved.get(key);
    const k = g.s, b = g.phone ? seg.phone : seg.scene, base = { x: g.ox + b.x * k, y: g.oy + b.y * k, w: b.w * k, h: b.h * k }, palm = /손바닥/.test(seg.mode || ""), M = 0, bottomLimit = g.H - 40;
    const boxes = (seg.boxes || []).map(([x0, y0, x1, y1]) => ({ x0: g.ox + x0 * k - 10, y0: g.oy + y0 * k - 10, x1: g.ox + x1 * k + 10, y1: g.oy + y1 * k + 10 }));
    const fc = seg.boxes?.[0] ? (seg.boxes[0][0] + seg.boxes[0][2]) / 2 : 640, tcx = g.ox + fc * k, cardCx = base.x + base.w / 2, dirX = cardCx < tcx ? -1 : 1; // -1 = 카드가 선생님 왼쪽(오른쪽 모서리 고정 · 왼쪽으로 키움)
    const hit = r => boxes.some(q => r.x < q.x1 && r.x + r.w > q.x0 && r.y < q.y1 && r.y + r.h > q.y0), tmp = document.createElement("div"); tmp.className = "cd-ar" + (g.phone ? " cd-ph" : ""); tmp.style.visibility = "hidden"; tmp.innerHTML = html(c); layer.append(tmp);
    const grow = (dir, f, fh) => { const w = base.w * f, h = palm ? Math.min(base.h * fh, base.y + base.h - M) : base.h * fh; return { x: dir < 0 ? base.x + base.w - w : base.x, y: palm ? base.y + base.h - h : base.y, w, h }; };
    const baseHit = hit(base); // 정해 둔 자리가 대략 상자(얼굴·몸통 씨앗)와 겹쳐 보이면(상자는 대략) 상자 검사는 건너뜀
    let best = { ...base }, ok = false, bestArea = 0, bestDir = dirX;
    for (const dir of [dirX, -dirX]) { // 선생님 반대쪽 먼저 · 화면 끝에 막히면 그 반대쪽(선생님 쪽은 상자와 안 겹치는 만큼만)
      let cand = { ...base }, got = false;
      for (let f = 1; f <= 3.4 && !got; f += 0.06) {
        for (const kh of [palm ? 0.5 : 0.65, 0]) { // 높이도 같이 키워 보고 · 몸(상자)에 닿으면 폭만 키워 봄
          const r = grow(dir, f, 1 + (f - 1) * kh); if (r.x < M || r.x + r.w > g.W - M || r.y < M || r.y + r.h > bottomLimit) continue; if (!baseHit && hit(r)) continue;
          if (r.w * r.h >= cand.w * cand.h) cand = r;
          place(tmp, { ...r, w: r.w - 4 }); tmp.style.setProperty("--fs", "10px"); /* 폭 4px 여유로 재 봄 — 글꼴·반올림 차이로 1~2px 넘치던 것(ru 320폭 카드9) */ if (fits(tmp.querySelector(".cd-in"))) { cand = r; got = true; break; }
        }
        if (!got && f > 1 && grow(dir, f, 1).x + grow(dir, f, 1).w > g.W - M) break;
      }
      if (got) { best = cand; ok = true; bestDir = dir; break; } if (cand.w * cand.h > bestArea) { best = cand; bestArea = cand.w * cand.h; bestDir = dir; }
    }
    tmp.remove(); const out = { ...best, ok, dir: bestDir, palm, boxes, baseHit }; solved.set(key, out); return out;
  }
  const rectOf = (c, tm) => {
    const g = geom(), seg = segAt(c, tm);
    const r = solvePhone(c, seg, g); return { x: r.x, y: r.y, w: r.w, h: r.h, phone: g.phone, s: g.s, dir: r.dir, palm: r.palm, W: g.W, H: g.H, boxes: r.boxes, baseHit: r.baseHit }; // 큰 화면도 글 하한 10px 에서 넘치면 칸을 키움(ru 「Аудирование」 4px 넘침)
  };
  const html = c => `<div class="cd-card"><div class="cd-in">${rows(c.kind)}</div><div class="cd-glow"></div></div>`;

  // ── 사라짐 효과(0.55초 · 영상 시각으로 계산) — 카드를 조각(타일/보로노이)으로 나눠 위치·회전·투명도만 바꿈
  function buildExit(c, r) {
    ex = document.createElement("div"); ex.className = "cd-ar cd-ex"; place(ex, r); ex.style.setProperty("--fs", ar.style.getPropertyValue("--fs"));
    if (ar.dataset.hl) ex.dataset.hl = ar.dataset.hl;
    const src = ar.querySelector(".cd-card"), st = c.exit?.style || "fold", W = r.w, H = r.h, tiles = [];
    const mk = (bx, by, bw, bh, poly) => { const t = document.createElement("div"); t.className = "cd-t"; Object.assign(t.style, { left: bx + "px", top: by + "px", width: bw + "px", height: bh + "px" }); const inner = src.cloneNode(true); Object.assign(inner.style, { position: "absolute", left: -bx + "px", top: -by + "px", width: W + "px", height: H + "px" });
      if (poly) t.style.clipPath = `polygon(${poly.map(p => `${((p[0] * W - bx) / bw * 100).toFixed(2)}% ${((p[1] * H - by) / bh * 100).toFixed(2)}%`).join(",")})`; t.append(inner); ex.append(t); return t; };
    if (st === "fold") { const t = document.createElement("div"); t.className = "cd-t cd-fold"; Object.assign(t.style, { left: 0, top: 0, width: W + "px", height: H + "px" }); t.append(src.cloneNode(true)); ex.append(t); tiles.push({ el: t, fold: true }); }
    else if (st === "glass") { voronoi(14, 9).forEach((poly, i) => { const xs = poly.map(p => p[0] * W), ys = poly.map(p => p[1] * H), bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by; tiles.push({ el: mk(bx, by, bw, bh, poly), ox: bx + bw / 2, oy: by + bh / 2, r: rng(900 + i) }); }); }
    else { const cols = st === "pixel" ? 12 : 7, rowsN = st === "pixel" ? 10 : 7; for (let j = 0; j < rowsN; j++) for (let i = 0; i < cols; i++) { const bx = i * W / cols, by = j * H / rowsN, bw = W / cols, bh = H / rowsN; tiles.push({ el: mk(bx, by, bw, bh), ox: bx + bw / 2, oy: by + bh / 2, r: rng(i * 131 + j * 17 + (st === "pixel" ? 5 : 7)), col: i / cols }); } }
    layer.append(ex); ar.style.visibility = "hidden"; ex._tiles = tiles; ex._style = st; ex._r = r;
  }
  function paintExit(p) { // p = 0~1
    if (!ex) return; const st = ex._style, r = ex._r, k = r.s;
    for (const T of ex._tiles) {
      if (T.fold) { const sx = Math.max(.001, 1 - ease(clamp01(p * 1.4))), sy = Math.max(.001, 1 - ease(clamp01((p - .35) / .65))); T.el.style.transform = `translateY(${-20 * p * k}px) scale(${sx},${sy})`; T.el.style.opacity = String(1 - ease(clamp01((p - .6) / .4))); continue; }
      const rr = T.r, W = r.w, H = r.h, dx = T.ox - W / 2, dy = T.oy - H / 2, dist = Math.hypot(dx, dy) + 1e-6;
      let mx, my, ang, al;
      if (st === "shatter") { const d = rr() * .25, q = Math.max(0, (p - d) / (1 - d)), v0 = (40 + rr() * 70) * k, a0 = (rr() * 4.4 - 2.2); ang = a0 * q; mx = dx / dist * v0 * q; my = dy / dist * v0 * q + 90 * k * q * q; al = 1 - ease(clamp01((q - .25) / .75)); }
      else if (st === "glass") { const d = rr() * .3, q = Math.max(0, (p - d) / (1 - d)), a0 = rr() * 2.4 - 1.2, v0 = (10 + rr() * 35) * k; ang = a0 * q; mx = dx / dist * v0 * q; my = dy / dist * 20 * k * q + 150 * k * q * q; al = 1 - ease(clamp01((q - .3) / .7)); }
      else { const edge = T.col * .55 + rr() * .3, q = Math.max(0, (p - edge * .6) / (1 - edge * .6)); ang = 0; mx = (rr() * 70 - 10) * k * q; my = (rr() * 80 - 40) * k * q - 25 * k * q; al = 1 - ease(clamp01(q * 1.3)); }
      T.el.style.transformOrigin = `${T.ox - parseFloat(T.el.style.left)}px ${T.oy - parseFloat(T.el.style.top)}px`;
      T.el.style.transform = `translate(${mx}px,${my}px) rotate(${ang}rad)`; T.el.style.opacity = String(Math.max(0, al));
    }
  }
  function clearExit() { ex?.remove(); ex = null; exKey = ""; if (ar) ar.style.visibility = ""; }

  // ── 카드 한 장 만들기·치우기
  function show(c, tm) {
    hide(); cur = c; ar = document.createElement("div"); ar.className = "cd-ar"; ar.dataset.id = c.id; ar.innerHTML = html(c);
    const r = rectOf(c, tm); place(ar, r); ar.classList.toggle("cd-ph", r.phone); layer.append(ar); settle(ar, r); ar.dataset.k = `${r.x | 0},${r.y | 0},${r.w | 0},${lang},${ccOn()},${uiKoOn()}`;
    if (tm - c.start < 0.35) ar.classList.add("cd-rise");
    rechk = [250, 900, 2200].map(ms => setTimeout(() => { if (cur === c && ar && !ex) { const was = ar.dataset.hl; solved.clear(); refresh(v.currentTime); } }, ms)); // 글꼴(시스템 대체 글꼴)이 그린 뒤 적용되면 폭이 달라짐 → 칸·글 다시 재 봄 (앱 검사부 ru 320)
  }
  let rechk = [];
  function hide() { rechk.forEach(clearTimeout); rechk = []; clearExit(); ar?.remove(); ar = null; cur = null; }
  function refresh(tm) { // 자리·언어·CC·⇄ 가 바뀌면 다시 그림(글 맞춤도 다시)
    if (!cur) return; const was = ex ? { st: ex._style } : null; clearExit(); ar.innerHTML = html(cur); const r = rectOf(cur, tm); place(ar, r); ar.classList.toggle("cd-ph", r.phone); settle(ar, r); ar.dataset.k = `${r.x | 0},${r.y | 0},${r.w | 0},${lang},${ccOn()},${uiKoOn()}`; ar.dataset.hl = ""; if (was) exKey = "";
  }
  const tick = () => {
    const tm = v.currentTime, c = okVideo() ? C.cards.find(x => tm >= x.start && tm < x.end) || null : null;
    if (c !== cur) { if (c) show(c, tm); else hide(); }
    if (!cur) return;
    const r = rectOf(cur, tm), key = `${r.x | 0},${r.y | 0},${r.w | 0},${lang},${ccOn()},${uiKoOn()}`;
    if (key !== ar.dataset.k) refresh(tm);
    // 하이라이트 — 켜지면 다음 낱말까지 · 마지막 낱말은 사라짐 효과가 끝날 때까지 · 글자 크기·자리 0 변화
    const on = new Set((cur.highlights || []).filter(h => tm >= h.t0 - 1e-6 && tm < h.t1).map(h => h.row)), hk = [...on].join(",");
    if ((ar.dataset.hl || "") !== hk || (ex && ex.dataset.hl !== hk)) { ar.dataset.hl = hk; ar.querySelector(".cd-in")?.classList.toggle("cd-hlmode", on.size > 0); ar.querySelectorAll(".cd-row").forEach(el => el.classList.toggle("on", on.has(+el.dataset.r))); }
    // 사라짐 효과
    const e0 = cur.exit?.start ?? cur.end - 0.55;
    if (tm >= e0) { if (!ex) buildExit(cur, ar._r || r); const ki = `${r.x | 0},${r.w | 0}`; if (exKey && exKey !== ki) { clearExit(); buildExit(cur, ar._r || r); } exKey = ki; paintExit(clamp01((tm - e0) / (cur.exit?.dur || 0.55))); }
    else if (ex) clearExit();
  };
  let alive = true;
  const onFont = () => { solved.clear(); if (cur) refresh(v.currentTime); }; // 글꼴이 늦게 오면(몽골·미얀마·우르두…) 칸 크기·글 맞춤을 다시
  document.fonts?.addEventListener?.("loadingdone", onFont); document.fonts?.ready?.then(onFont);
  v.addEventListener("timeupdate", tick); v.addEventListener("seeked", tick); v.addEventListener("loadedmetadata", tick);
  if (v.requestVideoFrameCallback) { const fr = () => { if (!alive) return; tick(); v.requestVideoFrameCallback(fr); }; v.requestVideoFrameCallback(fr); }
  else { const raf = () => { if (!alive) return; tick(); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  const onRs = () => tick(), mo = learn && new MutationObserver(() => tick());
  mo?.observe(learn, { attributes: true, attributeFilter: ["class"] }); mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  addEventListener("malmun:uilang", onRs); addEventListener("resize", onRs); document.addEventListener("fullscreenchange", onRs);
  return { off() { alive = false; document.fonts?.removeEventListener?.("loadingdone", onFont); mo?.disconnect(); hide(); layer.remove(); v.removeEventListener("timeupdate", tick); v.removeEventListener("seeked", tick); v.removeEventListener("loadedmetadata", tick); removeEventListener("malmun:uilang", onRs); removeEventListener("resize", onRs); document.removeEventListener("fullscreenchange", onRs); } };
}
