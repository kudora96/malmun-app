// 학습 화면 단추 전수 점검 — 브라우저 콘솔(또는 자동화)에서 #/learn/{편} 을 연 채로 붙여 넣어 실행
// 단추를 차례로 누르고 매번 확인한다: 지금 줄이 위 창 바로 아래에 보이나 · 위 창이 정확히 하나(영상/설명/쓰기)인가 ·
// 위 창이 화면의 80% 를 넘지 않나 · 줄 단추 켜짐 표시가 위 창과 맞나. 소리는 끄고 돈다(끝나면 새로고침하면 다시 켜진다).
// 화면을 고칠 때마다 돌려서 ✗ 가 없어야 한다(투덜이 10-01 「너가 다 눌러보고 버그 잡고 다시 줘야 해」).
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const play = HTMLMediaElement.prototype.play;
  const vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume"); // 음소거 대신 아주 작게(뒤 탭 음소거 소리는 크롬이 멈춤)
  Object.defineProperty(HTMLMediaElement.prototype, "volume", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, Math.min(v, 0.0001)); } });
  HTMLMediaElement.prototype.play = function () { this.volume = 0.0001; return play.call(this); };
  const $ = s => document.querySelector(s);
  const L = () => [...document.querySelectorAll(".line")];
  const line = i => L()[i - 1];
  const res = [];
  const check = name => {
    const cur = $(".line.cur"), st = $(".stick").getBoundingClientRect(), ctrl = $(".ctrl").getBoundingClientRect(), c = cur.getBoundingClientRect();
    const vid = $("#vwrap").offsetHeight > 0, pan = $(".panel").offsetHeight > 0;
    const top = vid && !pan ? "영상" : pan && !vid ? ($(".panel").classList.contains("explain") ? "설명" : "쓰기") : "❌둘다/없음";
    const pressed = [...cur.querySelectorAll("[aria-pressed=true]")].map(b => b.dataset.act).join("");
    const bad = [];
    if (!(c.top >= st.bottom - 2 && c.top < ctrl.top - 30)) bad.push(`지금 줄 안 보임(${Math.round(c.top)} · 위 창 끝 ${Math.round(st.bottom)} · 아래 막대 ${Math.round(ctrl.top)})`);
    if (top.startsWith("❌")) bad.push("위 창 " + top);
    if (st.height > innerHeight * 0.8) bad.push("위 창 너무 큼 " + Math.round(st.height));
    if ((top === "설명" && pressed !== "explain") || (top === "쓰기" && pressed !== "write") || (top === "영상" && pressed)) bad.push("단추 표시 어긋남 " + pressed);
    res.push(`${bad.length ? "✗" : "✓"} ${name} → ${top} · 줄 ${L().indexOf(cur) + 1}${bad.length ? " · " + bad.join(" / ") : ""}`);
  };
  const tap = async (i, act, w = 700) => { (act ? line(i).querySelector(`[data-act=${act}]`) : line(i).querySelector(".kotext")).click(); await W(w); };
  const bar = async (a, w = 700) => { $(`.ctrl [data-act=${a}]`).click(); await W(w); };
  const n = L().length;
  check("처음");
  await tap(5); check("5번 줄");
  await tap(5, null, 1200); check("5번 또(그 줄 듣기)");
  await tap(5, "explain", 1200); check("5번 설명");
  $(".panel .paras, .panel .v9body p").click(); await W(500); check("설명 창 누름(멈춤)"); // 옛 설명 · 새 설명(v9) 카드 둘 다
  await tap(5, "explain"); check("설명 다시 = 영상");
  await tap(5, "write", 1300); check("5번 쓰기");
  await tap(5, "write"); check("쓰기 다시 = 영상");
  await tap(Math.min(12, n), "explain", 1200); check("12번 설명");
  await bar("next", 1200); check("▶| = 다음 줄 설명");
  await bar("prev", 1200); check("|◀ = 앞 줄 설명");
  await tap(Math.min(9, n), null, 1200); check("설명 중 다른 줄 = 그 줄 설명");
  await tap(Math.min(9, n), "once", 1200); check("이 줄 듣기 = 영상");
  await tap(Math.min(9, n), "once", 600); check("이 줄 듣기 다시 = 멈춤");
  await tap(2, "write", 1300); check("2번 쓰기");
  await tap(n - 1, null, 1300); check("쓰기 중 다른 줄 = 그 줄 쓰기");
  await tap(n - 1, "explain", 1200); check("쓰기에서 바로 설명");
  await tap(n - 1, "explain"); check("설명 다시 = 영상");
  await tap(n); check("마지막 줄");
  await tap(n, "explain", 1200); check("마지막 줄 설명");
  await tap(n, "explain"); check("마지막 줄 설명 닫기");
  await tap(1); check("첫 줄");
  $("[data-mode=full]").click(); await W(500); await tap(3); check("대사→설명 모드 3번");
  await tap(3, "explain", 1200); check("대사→설명 모드 설명");
  await tap(3, "explain"); check("대사→설명 모드 설명 닫기");
  $("[data-mode=video]").click(); await W(400); await bar("rep", 300); await tap(4, null, 1200); check("반복 켜고 4번");
  await tap(4, "explain", 1200); check("반복 중 설명");
  await tap(4, "explain"); check("반복 중 설명 닫기");
  await bar("rep", 300); document.querySelector("video").pause();
  const out = res.join("\n");
  console.log(out);
  return out;
})();
