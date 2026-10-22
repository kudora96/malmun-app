// 영상 위 그림 카드(철학 v1 · 새 1편) — 카드 = 영상부 PNG(바탕 투명) 한 장 또는 여러 장(frames · 말에 맞춰 차례로) · 영상 위에 그림만
//  자료: data/{편}/{편}.overlays.json(영상2팀 · cards[{id,file|frames[{file,start}],start,end,pos,w}]) · texts 칸이 있어도 쓰지 않음
//  대표님 10-22 「영상 밑에 또 자막 · 틀 바꾸지 말자」 = 영상 밖(자막 칸·줄 카드·글 상자)에는 카드 때문에 아무것도 안 나옴 · 공개판과 화면 모양·글 100% 같음
//  카드 = 정한 초에 영상 오른쪽에 천천히 떠오름 · 끝나면 사라짐 · 그림 모양대로 크기(세로로 긴 앱 화면은 영상 높이 92%)
//  안전: json "video" 길이(초)와 지금 영상 길이가 1초 넘게 다르면 띄우지 않음
import { MEDIA } from "./paths.js?v=1022.9";

const getJSON = u => fetch(u, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);

export async function setupOverlays(ep, v, { wrap }) {
  const O = await getJSON(`data/${ep}/${ep}.overlays.json`); // 카드 글(texts)은 쓰지 않음 — 그림 속 글로 끝
  if (!O?.cards?.length) return null;
  const want = +(String(O.video || "").match(/([\d.]+)\s*초/)?.[1] || 0);
  const okVideo = () => !want || (Number.isFinite(v.duration) && Math.abs(v.duration - want) < 1);
  // 한 카드 = 그림 한 장(file) 또는 여러 장(frames:[{file,start}] · 말에 맞춰 차례로 바뀜 · 대표님 10-22 K7 듣기→말하기→쓰기) · 미리 받기
  for (const c of O.cards) { c.fr = (c.frames?.length ? c.frames : [{ file: c.file, start: c.start }]).map(f => { const im = new Image(); im.src = `${MEDIA}/video/overlay/${ep}/${f.file}`; return { ...f, img: im }; }); c.img = c.fr[0].img; }
  const frameAt = (c, tm) => { let k = 0; c.fr.forEach((f, i) => { if (tm >= (f.start ?? c.start)) k = i; }); return k; };
  let cur = null, el = null;
  function layout() {
    if (!el || !cur) return;
    // 크기 = 영상 폭 × w · 그림 모양대로(정사각 카드 · 세로로 긴 앱 화면) · 세로로 넘치면 영상 높이 92% 에 맞춤
    const W = wrap.clientWidth, H = wrap.clientHeight, im = cur.img, r = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
    // v13b 꼴: h(영상 높이 몫) + x_center(가운데 x · 영상 폭 몫) → 높이로 맞추고 폭은 그림 모양대로(선생님 얼굴 x 0.34~0.64 피함 · 영상2팀)
    let bw0, bh0; if (cur.h) { bh0 = cur.h * H; bw0 = bh0 / r; } else { bw0 = cur.w * W; bh0 = bw0 * r; if (bh0 > H * 0.92) { bh0 = H * 0.92; bw0 = bh0 / r; } }
    const side = Math.round(bw0), sideH = Math.round(bh0);
    el.style.width = side + "px"; el.style.height = sideH + "px"; const topY = Math.max(0, Math.round((H - sideH) / 2)); el.style.top = topY + "px";
    if (cur.x_center != null) { el.style.right = "auto"; el.style.left = Math.round(cur.x_center * W - side / 2) + "px"; }
    else { el.style.left = "auto"; el.style.right = (topY + sideH > H - 52 ? 54 : Math.round(W * 0.03)) + "px"; } // 아래 끝이 ⛶ 단추 자리까지 오면 그 왼쪽으로(세로로 긴 앱 화면)
  }
  function show(c) {
    hide(); cur = c;
    el = document.createElement("div"); el.className = "ovc"; el.dataset.id = c.id; el.setAttribute("aria-hidden", "true");
    c.fr.forEach((f, i) => { const d = document.createElement("div"); d.className = "ovf"; d.style.backgroundImage = `url("${f.img.src}")`; el.append(d); });
    el.dataset.f = -1; setFrame(frameAt(c, v.currentTime)); wrap.append(el);
    if (!c.img.naturalWidth) c.img.addEventListener("load", () => cur === c && layout(), { once: true }); // 모양(가로·세로)은 그림을 받은 뒤 다시 잼
    layout();
    requestAnimationFrame(() => el?.classList.add("on")); // 천천히 떠오름(css)
  }
  function setFrame(k) { if (!el || +el.dataset.f === k) return; el.dataset.f = k; [...el.querySelectorAll(".ovf")].forEach((d, i) => d.classList.toggle("on", i === k)); } // 장 바꿈 = 겹쳐 서서히(css)
  function hide() { if (el) { const e = el; e.classList.remove("on"); setTimeout(() => e.remove(), 400); } el = null; cur = null; }
  const tick = () => {
    const tm = v.currentTime, c = okVideo() ? O.cards.filter(x => tm >= x.start && tm < x.end).sort((a, b) => b.start - a.start)[0] || null : null; // 겹치면 늦게 시작한 카드(K7a→b→c = 차례로 바뀜)
    if (c !== cur) (c ? show(c) : hide()); else if (c && c.fr.length > 1) setFrame(frameAt(c, tm));
  };
  let alive = true;
  v.addEventListener("timeupdate", tick); v.addEventListener("seeked", tick);
  if (v.requestVideoFrameCallback) { const fr = () => { if (!alive) return; tick(); v.requestVideoFrameCallback(fr); }; v.requestVideoFrameCallback(fr); }
  const onUi = () => layout(), onRs = () => layout();
  addEventListener("malmun:uilang", onUi); addEventListener("resize", onRs); document.addEventListener("fullscreenchange", onRs);
  return {
    off() { alive = false; hide(); v.removeEventListener("timeupdate", tick); v.removeEventListener("seeked", tick); removeEventListener("malmun:uilang", onUi); removeEventListener("resize", onRs); document.removeEventListener("fullscreenchange", onRs); },
  };
}
