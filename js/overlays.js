// 영상 위 그림 카드(철학 v1 · 새 1편) — 카드 = 영상부 PNG(바탕 투명) 한 장 또는 여러 장(frames · 말에 맞춰 차례로) · 영상 위에 그림만
//  자료: data/{편}/{편}.overlays.json(영상2팀 · cards[{id,file|frames[{file,start}],start,end,pos,w}]) · texts 칸이 있어도 쓰지 않음
//  대표님 10-22 「영상 밑에 또 자막 · 틀 바꾸지 말자」 = 영상 밖(자막 칸·줄 카드·글 상자)에는 카드 때문에 아무것도 안 나옴 · 공개판과 화면 모양·글 100% 같음
//  카드 = 정한 초에 영상 오른쪽에 천천히 떠오름 · 끝나면 사라짐 · 그림 모양대로 크기(세로로 긴 앱 화면은 영상 높이 92%)
//  학습자 말 그림(대표님 10-22 「ㅇ」): CC 를 따라감 — CC 끔 = 한국어 카드(file) · CC 켬 = 학습자 말 그림(file_i18n{lang} · 없으면 file) · ⇄ 는 카드에 영향 없음
//   json 꼴(영상2팀): 카드마다 "file_i18n":{"ne":"…_ne.png"} · frames 를 쓰면 장마다 같은 칸 · 자리·크기·초는 한국어 판과 같음
//  안전: json "video" 길이(초)와 지금 영상 길이가 1초 넘게 다르면 띄우지 않음
import { MEDIA } from "./paths.js?v=1022.22";
import { lang } from "./i18n.js?v=1022.22";

const getJSON = u => fetch(u, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);

export async function setupOverlays(ep, v, { wrap }) {
  const O = await getJSON(`data/${ep}/${ep}.overlays.json`); // 카드 글(texts)은 쓰지 않음 — 그림 속 글로 끝
  if (!O?.cards?.length) return null;
  const want = +(String(O.video || "").match(/([\d.]+)\s*초/)?.[1] || 0);
  const okVideo = () => !want || (Number.isFinite(v.duration) && Math.abs(v.duration - want) < 1);
  // 한 카드 = 그림 한 장(file) 또는 여러 장(frames:[{file,start}] · 말에 맞춰 차례로 바뀜 · 대표님 10-22 K7 듣기→말하기→쓰기) · 미리 받기
  const url = f => `${MEDIA}/video/overlay/${ep}/${f}`, img = u => { const im = new Image(); im.src = u; return im; };
  const learn = wrap.closest(".learn"), ccOn = () => !!learn && !learn.classList.contains("nosub"); // CC 칩 상태(learn.js 가 .nosub 로 표시)
  for (const c of O.cards) c.fr = (c.frames?.length ? c.frames : [{ file: c.file, file_i18n: c.file_i18n, start: c.start }]).map(f => { const t = lang !== "ko" && f.file_i18n?.[lang]; const x = { ...f, ko: img(url(f.file)), tr: t ? img(url(t)) : null }; x.tr?.addEventListener("error", () => { x.tr = null; if (cur === c) paint(); }, { once: true }); return x; }); // 학습자 말 그림이 없거나 못 받으면 한국어 그림
  const pick = f => (ccOn() && f.tr ? f.tr : f.ko); // 지금 띄울 그림
  const imgOf = c => pick(c.fr[0]);
  const frameAt = (c, tm) => { let k = 0; c.fr.forEach((f, i) => { if (tm >= (f.start ?? c.start)) k = i; }); return k; };
  let cur = null, el = null; const SWAP = 0.25; // 장 바꿈 전환(초)
  function layout() {
    if (!el || !cur) return;
    // 크기 = 영상 폭 × w · 그림 모양대로(정사각 카드 · 세로로 긴 앱 화면) · 세로로 넘치면 영상 높이 92% 에 맞춤
    const W = wrap.clientWidth, H = wrap.clientHeight, im = imgOf(cur), r = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
    // v13b 꼴: h(영상 높이 몫) + x_center(가운데 x · 영상 폭 몫) → 높이로 맞추고 폭은 그림 모양대로(선생님 얼굴 x 0.34~0.64 피함 · 영상2팀)
    let bw0, bh0; if (cur.h) { bh0 = cur.h * H; bw0 = bh0 / r; } else { bw0 = cur.w * W; bh0 = bw0 * r; if (bh0 > H * 0.92) { bh0 = H * 0.92; bw0 = bh0 / r; } }
    const side = Math.round(bw0), sideH = Math.round(bh0);
    el.style.width = side + "px"; el.style.height = sideH + "px"; const topY = Math.max(0, Math.round((H - sideH) / 2)); el.style.top = topY + "px";
    if (cur.x_center != null) { el.style.right = "auto"; el.style.left = Math.round(cur.x_center * W - side / 2) + "px"; }
    else { el.style.left = "auto"; el.style.right = (topY + sideH > H - 52 ? 54 : Math.round(W * 0.03)) + "px"; } // 아래 끝이 ⛶ 단추 자리까지 오면 그 왼쪽으로(세로로 긴 앱 화면)
  }
  function show(c) {
    // 전환 = json 카드 "fade"(초 · 영상2팀 K7a·b·c = 0.25) · 없으면 시간이 겹치는 이어진 카드(장 바꿈)만 0.25초 · 처음 떠오름 0.7초(css)는 그대로(본부 10-22)
    const chain = !!(el && cur && cur.end > c.start && c.end > cur.start), FD = c.fade ?? (chain ? SWAP : null), fast = FD != null && chain;
    hide(fast ? FD : 0); cur = c;
    el = document.createElement("div"); el.className = "ovc"; el.dataset.id = c.id; el.setAttribute("aria-hidden", "true");
    if (fast) Object.assign(el.style, { transition: `opacity ${FD}s ease`, transform: "none" }); // 장 바꿈 = 제자리에서 빠르게
    c.fr.forEach(f => { const d = document.createElement("div"); d.className = "ovf"; d.style.backgroundImage = `url("${pick(f).src}")`; d.style.transition = `opacity ${c.fade ?? SWAP}s ease`; el.append(d); }); // 카드 안 여러 장(frames) 바뀜도 0.25초(또는 fade)
    el.dataset.f = -1; setFrame(frameAt(c, v.currentTime)); wrap.append(el);
    const im0 = imgOf(c); if (!im0.naturalWidth) im0.addEventListener("load", () => cur === c && layout(), { once: true }); // 모양(가로·세로)은 그림을 받은 뒤 다시 잼
    layout();
    requestAnimationFrame(() => el?.classList.add("on")); // 천천히 떠오름(css)
  }
  function paint() { if (!el || !cur) return; [...el.querySelectorAll(".ovf")].forEach((d, i) => { d.style.backgroundImage = `url("${pick(cur.fr[i]).src}")`; }); layout(); } // CC 켬·끔 = 그 자리에서 그림만 바꿈(자리·크기 그대로)
  function setFrame(k) { if (!el || +el.dataset.f === k) return; el.dataset.f = k; [...el.querySelectorAll(".ovf")].forEach((d, i) => d.classList.toggle("on", i === k)); } // 장 바꿈 = 겹쳐 서서히(css)
  function hide(fd) { if (el) { const e = el; if (fd) e.style.transition = `opacity ${fd}s ease`; e.classList.remove("on"); setTimeout(() => e.remove(), fd ? fd * 1000 + 20 : 400); } el = null; cur = null; } // fd = 빠른 장 바꿈(초)
  const tick = () => {
    const tm = v.currentTime, c = okVideo() ? O.cards.filter(x => tm >= x.start && tm < x.end).sort((a, b) => b.start - a.start)[0] || null : null; // 겹치면 늦게 시작한 카드(K7a→b→c = 차례로 바뀜)
    if (c !== cur) (c ? show(c) : hide()); else if (c && c.fr.length > 1) setFrame(frameAt(c, tm));
  };
  let alive = true;
  v.addEventListener("timeupdate", tick); v.addEventListener("seeked", tick);
  if (v.requestVideoFrameCallback) { const fr = () => { if (!alive) return; tick(); v.requestVideoFrameCallback(fr); }; v.requestVideoFrameCallback(fr); }
  const onUi = () => layout(), onRs = () => layout();
  const mo = learn && new MutationObserver(() => paint()); mo?.observe(learn, { attributes: true, attributeFilter: ["class"] }); // CC 켬·끔 = 그 자리에서 그림만 바꿈
  addEventListener("malmun:uilang", onUi); addEventListener("resize", onRs); document.addEventListener("fullscreenchange", onRs);
  return {
    off() { alive = false; mo?.disconnect(); hide(); v.removeEventListener("timeupdate", tick); v.removeEventListener("seeked", tick); removeEventListener("malmun:uilang", onUi); removeEventListener("resize", onRs); document.removeEventListener("fullscreenchange", onRs); },
  };
}
