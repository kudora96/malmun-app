// 영상 위 그림 카드(철학 v1 · 대표님 10-22 새 1편 v11) — 카드 그림 = 영상부 PNG(1:1 · 둥근 모서리 밖 투명) · 설명 글만 앱이 코드로 겹침(학습자 말 ⇄ 한국어)
//  자료: data/{편}/{편}.overlays.json(영상2팀 · cards[{id,file,start,end,pos,w,texts[{key,ko,x,y,w,align,size,translate}]}]) + {편}.overlays_i18n.json(언어부 {key:{ko,en,ne…}})
//  카드 = 정한 초에 영상 오른쪽 빈 곳에 천천히 떠오름 · 끝나면 사라짐 · 화면 틀 0px(#vwrap 안 겹침)
//  작은 화면(영상 폭 600px 아래) · 글이 12px 아래로 작아지는 말 = 카드 글을 빼고 영상 밑 자막 칸에 같은 차례로(onText)
//  안전: json "video" 길이(초)와 지금 영상 길이가 1초 넘게 다르면 띄우지 않음(옛 영상 위에 새 카드가 뜨지 않게)
import { MEDIA } from "./paths.js?v=1021.14";
import { t, lang, uiKoOn } from "./i18n.js?v=1021.14";

const getJSON = u => fetch(u, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
const MIN_PX = 12, MIN_W = 600;

export async function setupOverlays(ep, v, { wrap, onText }) {
  const [O, I] = await Promise.all([getJSON(`data/${ep}/${ep}.overlays.json`), getJSON(`data/${ep}/${ep}.overlays_i18n.json`)]);
  if (!O?.cards?.length) return null;
  const want = +(String(O.video || "").match(/([\d.]+)\s*초/)?.[1] || 0);
  const okVideo = () => !want || (Number.isFinite(v.duration) && Math.abs(v.duration - want) < 1);
  for (const c of O.cards) { const im = new Image(); im.src = `${MEDIA}/video/overlay/${ep}/${c.file}`; c.img = im; } // 미리 받기
  const textOf = x => (x.translate === false || uiKoOn() || lang === "ko" ? x.ko : I?.[x.key]?.[lang] || x.ko); // 학습자 말 ⇄ 한국어 · 번역 없는 칸(저자·연도)은 그대로
  let cur = null, el = null, fallback = false;
  const lines = c => c.texts.map(x => textOf(x));
  function layout() {
    if (!el || !cur) return;
    const W = wrap.clientWidth, H = wrap.clientHeight, side = Math.round(cur.w * W);
    el.style.width = el.style.height = side + "px"; el.style.right = Math.round(W * 0.03) + "px"; el.style.top = Math.max(0, Math.round((H - side) / 2)) + "px";
    el.querySelectorAll(".ovt").forEach(s => s.remove());
    const canSub = onText?.canShow?.(cur.texts.length) ?? true; // 자막 칸이 없는 화면(가로 폰) = 영상 아래쪽 작은 글 상자(.ovcap)
    const minPx = MIN_PX;
    fallback = W < MIN_W;
    if (!fallback) for (const x of cur.texts) {
      const s = document.createElement("span"); s.className = "ovt"; s.textContent = textOf(x); s.dir = "auto";
      if (x.color) s.style.color = x.color;
      const bw = x.w * side; let fs = x.size * side;
      Object.assign(s.style, { left: (x.x * side - bw / 2) + "px", width: bw + "px", top: (x.y * side) + "px", textAlign: x.align || "center", fontSize: fs + "px" });
      el.append(s);
      // 두 줄까지 접어 넣고 그래도 넘치면 글을 줄임 · 12px 아래가 되면 이 카드 글은 자막 칸으로
      const fit = () => { const lh = parseFloat(getComputedStyle(s).lineHeight) || fs * 1.25; return s.scrollWidth <= bw + 0.5 && s.getBoundingClientRect().height <= lh + 1; }; // 한 줄(카드 칸 사이가 좁아 두 줄이면 겹침 · 812×375 K9)
      while (!fit() && fs > minPx - 0.01) { fs -= 0.5; s.style.fontSize = fs + "px"; }
      if (!fit() || fs < MIN_PX) { fallback = true; break; }
      s.style.transform = "translateY(-50%)";
    }
    if (fallback) el.querySelectorAll(".ovt").forEach(s => s.remove());
    wrap.querySelector(".ovcap")?.remove();
    if (fallback && cur.texts.length && !canSub) { const cap = document.createElement("div"); cap.className = "ovcap"; cap.setAttribute("aria-hidden", "true"); cap.innerHTML = lines(cur).map(x => `<span dir="auto"></span>`).join(""); [...cap.children].forEach((sp, i) => (sp.textContent = lines(cur)[i])); wrap.append(cap); onText?.(null); }
    else onText?.(fallback && cur.texts.length ? lines(cur) : null);
  }
  function show(c) {
    hide(); cur = c;
    el = document.createElement("div"); el.className = "ovc"; el.dataset.id = c.id; el.setAttribute("aria-hidden", "true");
    el.style.backgroundImage = `url("${c.img.src}")`; wrap.append(el); layout();
    requestAnimationFrame(() => el?.classList.add("on")); // 천천히 떠오름(css)
  }
  function hide() { wrap.querySelector(".ovcap")?.remove(); if (el) { const e = el; e.classList.remove("on"); setTimeout(() => e.remove(), 400); } el = null; if (cur) { cur = null; onText?.(null); } }
  const tick = () => {
    const tm = v.currentTime, c = okVideo() ? O.cards.find(x => tm >= x.start && tm < x.end) : null;
    if (c !== cur) (c ? show(c) : hide());
  };
  let alive = true;
  v.addEventListener("timeupdate", tick); v.addEventListener("seeked", tick);
  if (v.requestVideoFrameCallback) { const fr = () => { if (!alive) return; tick(); v.requestVideoFrameCallback(fr); }; v.requestVideoFrameCallback(fr); }
  const onUi = () => layout(), onRs = () => layout();
  addEventListener("malmun:uilang", onUi); addEventListener("resize", onRs); document.addEventListener("fullscreenchange", onRs);
  return {
    lines: () => (cur && fallback ? lines(cur) : null),
    off() { alive = false; hide(); v.removeEventListener("timeupdate", tick); v.removeEventListener("seeked", tick); removeEventListener("malmun:uilang", onUi); removeEventListener("resize", onRs); document.removeEventListener("fullscreenchange", onRs); },
  };
}
