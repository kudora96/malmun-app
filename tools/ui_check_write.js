// 쓰기 전수 점검 — #/learn/{편} 을 연 채로 콘솔(또는 자동화)에서 실행. 소리는 끄고 어떤 소리가 났는지만 적는다.
// 확인: 자판 맞음/틀림 · 글자 모양(친 낱자로 만든 글자 = 목표 글자) · 겹모음·겹받침·쌍받침 · 문장 완성 · 글자 반복 · 단어/문장 듣기 · 자동 완성 · 다시 연습 · 아래 ▶
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const played = [];
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { this.muted = true; played.push(decodeURIComponent((this.src || "").split("/").slice(-2).join("/"))); return op.call(this); };
  const AC = window.AudioContext; const oo = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function () { played.push("툭(틀림)"); return oo.call(this); };
  const $ = s => document.querySelector(s), res = [];
  const ok = (cond, name, extra = "") => res.push(`${cond ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`);
  const line = i => [...document.querySelectorAll(".line")][i - 1];
  const openWrite = async i => { line(i).querySelector(".kotext").click(); await W(400); if (!$(".panel.write")) line(i).querySelector("[data-act=write]").click(); await W(1300); };
  const key = async j => { const b = [...document.querySelectorAll(".panel [data-j]")].find(b => b.dataset.j === j); if (!b) return false; b.click(); await W(60); return true; };
  // 지금 글자의 자모(화면 칸에 적힌 것 = 앱이 기대하는 순서)를 친다
  const typeChar = async () => {
    const target = $(".panel .target")?.textContent;
    const slots = [...document.querySelectorAll(".panel .slot")].length;
    let last = "";
    for (let k = 0; k < slots; k++) {
      const cur = $(".panel .slot.current")?.textContent;
      if (!cur) break;
      await key(cur); last = $(".panel .typed")?.textContent || last;
    }
    await W(750);
    return { target, last };
  };
  const typeAll = async () => {
    const bad = []; let n = 0;
    while ($(".panel .target")) { const r = await typeChar(); n++; if (r.last !== r.target) bad.push(`${r.target}≠${r.last}`); if (n > 80) break; }
    return { n, bad };
  };

  await openWrite(1);
  ok(!!$(".panel.write .kb") && $(".panel .sent .c"), "1번 쓰기 열림", $(".panel .sent").innerText.replace(/\s+/g, " "));
  played.length = 0; await key("ㅇ");
  ok($(".panel .slot.filled")?.textContent === "ㅇ" && played.some(p => p.includes("ieung")), "ㅇ 맞음 → 칸 채움 + 자모 소리", played.join(","));
  played.length = 0; await key("ㄱ"); await W(200);
  ok($(".panel .slot.current")?.classList.contains("shake") && played.join() === "툭(틀림)", "ㄱ 틀림 → 흔들림 + 툭만(자모 소리 없음)", played.join(","));
  played.length = 0; await key("ㅓ"); await W(100);
  ok($(".panel .box")?.classList.contains("ok") && played.length === 1 && played[0].startsWith("c/"), "ㅓ(마지막 낱자) → 「어」 완성 + 글자 소리 하나만", played.join(","));
  await W(750); ok($(".panel .target")?.textContent === "서", "0.65초 뒤 다음 글자 「서」");
  const s1 = await typeAll();
  ok(!!$(".panel .done-card") && !s1.bad.length, `1번 문장 끝까지(${s1.n}글자 · 겹모음 환)`, s1.bad.join(" "));
  await W(500); ok(played.some(p => p.includes("_01_sub_t1")), "문장 완성 → 대사 소리", played.slice(-2).join(","));
  $(".panel [data-act=retry]").click(); await W(300); ok($(".panel .target")?.textContent === "어", "다시 연습 → 처음 「어」");
  // 글자 반복
  const ch = [...document.querySelectorAll(".panel .sent .c")].find(c => !c.classList.contains("noaudio") && c.textContent === "오");
  played.length = 0; ch.click(); await W(300);
  ok(ch.classList.contains("loop") && played.length === 1 && /반복|दोहोर|Repeat/.test($(".panel .loopnote").textContent), "「오」 누름 → 반복 시작", played.join(","));
  ch.click(); await W(200); ok(!ch.classList.contains("loop"), "「오」 다시 → 반복 멈춤");
  ch.click(); await W(200); await key("ㅇ"); await W(100); ok(!ch.classList.contains("loop"), "반복 중 자판 → 반복 멈춤");
  // 단어 듣기 · 문장 듣기 · 아래 ▶
  played.length = 0; $(".panel [data-act=word]").click(); await W(2600); ok(played.length >= 2, "단어 듣기 → 글자를 차례로", played.join(","));
  $(".panel [data-act=sent]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "true", "문장 듣기 → 켜짐");
  $(".panel [data-act=sent]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "false", "문장 듣기 다시 → 멈춤");
  $(".ctrl [data-act=play]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "true", "아래 ▶ → 문장 듣기");
  $(".ctrl [data-act=play]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "false", "아래 ▶ 다시 → 멈춤");
  // 자동 완성
  const before = $(".panel .target").textContent; $(".panel [data-act=auto]").click(); await W(900);
  ok($(".panel .target")?.textContent !== before, "자동 완성 → 다음 글자로", `${before} → ${$(".panel .target")?.textContent}`);
  // 겹받침(읽) · 쌍받침(랐 · 었) 문장
  for (const i of [5, 8, 13]) {
    if (!line(i)) continue;
    await openWrite(i);
    const r = await typeAll();
    ok(!!$(".panel .done-card") && !r.bad.length, `${i}번 문장 끝까지(${r.n}글자)`, r.bad.join(" ") || $(".panel .done-card .big")?.textContent);
  }
  // 다른 줄 누르면 그 줄 쓰기 · 쓰기 단추 다시 = 영상
  line(2).querySelector(".kotext").click(); await W(1300);
  ok(/2 \//.test($(".panel .whead .sub")?.textContent || ""), "쓰기 중 2번 줄 → 2번 쓰기");
  line(2).querySelector("[data-act=write]").click(); await W(500);
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "쓰기 다시 → 영상");
  const out = res.join("\n"); console.log(out); return out;
})();
