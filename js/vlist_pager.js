// 내 단어장 쪽 나누기 + 쪽 넘김 막대 (도우미 E · 11-18) — vocab.js 가 불러 붙임. 이 파일은 다른 파일을 건드리지 않음.
// 20개씩 한 쪽 · 쪽 넘김 = 영상 칸 아래 갈색 조작 막대(.seek) 자리 · 폭 좁으면 「‹ 이전  3 / 50  다음 ›」(가운데 누르면 쪽 번호 고르기) · 넓으면 「‹ 1 2 [3] 4 5 … 50 ›」
export const PAGE = 20;
export const pageCount = n => Math.max(1, Math.ceil(n / PAGE));
export const slicePage = (arr, p) => arr.slice(p * PAGE, p * PAGE + PAGE);
export const clampPage = (p, n) => Math.max(0, Math.min(pageCount(n) - 1, p | 0));

// 새 글(네팔어 = Claude 도우미 2명 교차 · 11-18)
export const PAGER_TX = {
  ko: { prev: "‹ 이전", next: "다음 ›", pick: "쪽 고르기", aria: "쪽 넘기기" },
  ne: { prev: "‹ अघिल्लो", next: "अर्को ›", pick: "पृष्ठ छान्नुहोस्", aria: "पृष्ठ पल्टाउनुहोस्" },
};

// 넓은 막대에 보일 쪽 번호들(1-기준) · 맨 앞·맨 끝·지금 쪽 둘레 · 사이는 '…' → 예: 1 2 3 4 5 … 50
export function pageWindow(cur, total, slots = 7) {
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, total, cur, cur - 1, cur + 1]);
  if (cur <= 3) [2, 3, 4, 5].forEach(n => s.add(n));
  if (cur >= total - 2) [total - 1, total - 2, total - 3, total - 4].forEach(n => s.add(n));
  const a = [...s].filter(n => n >= 1 && n <= total).sort((x, y) => x - y), r = [];
  a.forEach((n, i) => { if (i && n - a[i - 1] > 1) r.push("…"); r.push(n); });
  return r;
}

// host = 갈색 막대(.seek) · foot = true 면 host 맨 아래에 갈색 줄을 새로 둠(영상 칸이 없는 화면의 겹쳐 뜨는 단어장)
// 돌려줌 { update(cur0, total, ko) · destroy() } — cur0 = 0 부터
export function makePager(host, onPage, foot = false) {
  const bar = document.createElement("div"); bar.className = "vp-bar" + (foot ? " vp-foot" : ""); bar.setAttribute("role", "navigation"); bar.hidden = true;
  host.append(bar); host.classList.add("vp-on");
  let cur = 0, total = 1, ko = true, pick = null;
  const closePick = () => { pick?.remove(); pick = null; };
  const go = p => { closePick(); p = Math.max(0, Math.min(total - 1, p)); if (p !== cur) onPage?.(p); };
  const btn = (cls, txt, on, dis, curPg) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = txt; if (dis) b.disabled = true; if (curPg) b.setAttribute("aria-current", "page"); b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); on(); }); return b; };
  const wide = () => bar.clientWidth >= 420;
  function render() {
    closePick(); bar.textContent = ""; bar.hidden = total <= 1; const t = PAGER_TX[ko ? "ko" : "ne"]; bar.setAttribute("aria-label", t.aria);
    host.classList.toggle("vp-on", total > 1);
    if (total <= 1) return;
    if (wide()) {
      bar.classList.add("w"); bar.classList.remove("n");
      bar.append(btn("vp-b vp-pv", "‹", () => go(cur - 1), cur === 0));
      for (const n of pageWindow(cur + 1, total)) bar.append(n === "…" ? Object.assign(document.createElement("span"), { className: "vp-dots", textContent: "…" }) : btn("vp-b vp-pn" + (n === cur + 1 ? " on" : ""), String(n), () => go(n - 1), false, n === cur + 1));
      bar.append(btn("vp-b vp-nx", "›", () => go(cur + 1), cur === total - 1));
    } else {
      bar.classList.add("n"); bar.classList.remove("w");
      bar.append(btn("vp-b vp-pv", t.prev, () => go(cur - 1), cur === 0));
      const mid = btn("vp-b vp-mid", `${cur + 1} / ${total}`, () => togglePick(), false); mid.setAttribute("aria-haspopup", "listbox"); bar.append(mid);
      bar.append(btn("vp-b vp-nx", t.next, () => go(cur + 1), cur === total - 1));
    }
  }
  function togglePick() { // 쪽 번호 고르기 작은 목록
    if (pick) return closePick();
    const t = PAGER_TX[ko ? "ko" : "ne"], d = (pick = document.createElement("div")); d.className = "vp-pick"; d.setAttribute("role", "listbox"); d.setAttribute("aria-label", t.pick);
    d.innerHTML = Array.from({ length: total }, (_, i) => `<button type="button" role="option" class="vp-po${i === cur ? " on" : ""}"${i === cur ? ' aria-current="page"' : ""} data-p="${i}">${i + 1}</button>`).join("");
    d.addEventListener("click", e => { const b = e.target.closest(".vp-po"); e.stopPropagation(); if (b) go(+b.dataset.p); });
    bar.append(d); const on = d.querySelector(".on"); if (on) d.scrollTop = on.offsetTop - d.clientHeight / 2;
  }
  const outside = e => { if (pick && !bar.contains(e.target)) closePick(); };
  document.addEventListener("pointerdown", outside, true);
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (!bar.hidden && wide() !== bar.classList.contains("w")) render(); }) : null; ro?.observe(bar);
  return {
    update(c, n, k) { cur = c; total = n; ko = k !== false; render(); },
    destroy() { document.removeEventListener("pointerdown", outside, true); ro?.disconnect(); bar.remove(); host.classList.remove("vp-on"); },
  };
}
