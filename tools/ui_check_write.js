// 쓰기 전수 점검(W1~W6) — #/learn/{편} 을 연 채로 실행. 소리는 끄고, 무슨 소리가 언제 났는지 적는다.
// 확인: 맞음(딩동→자모) · 틀림(툭→그 자모 소리도) · 글자 완성(자모 … 0.5초 … 글자) · 소리 중 자판 무시 ·
//       창 안 스크롤 없음(자판·단추가 창 안에) · 긴 줄 토막 나누기 · 토막 끝 → 다음 토막 · 줄 끝 → 대사 → 다음 줄 · 글자 반복 · 단어/문장 듣기 · 아래 ▶
(async () => { const res = []; try {
  const W = ms => new Promise(s => setTimeout(s, ms));
  const log = []; const T = () => Math.round(performance.now());
  // 소리 끄기 = 음소거가 아니라 아주 작게(크롬은 뒤에 있는 탭의 「음소거된」 소리를 전기 아끼려 멈춘다 — 10-01 실측)
  const vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  Object.defineProperty(HTMLMediaElement.prototype, "volume", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, Math.min(v, 0.0001)); } });
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const name = decodeURIComponent((this.src || "").split("?")[0].split("/").slice(-2).join("/"));
    if (!this.__h) { this.__h = 1;
      this.addEventListener("ended", () => log.push({ t: T(), ev: "끝", name: decodeURIComponent((this.src || "").split("?")[0].split("/").slice(-2).join("/")) }));
      this.addEventListener("pause", () => { if (!this.ended) log.push({ t: T(), ev: "멈춤", name: decodeURIComponent((this.src || "").split("?")[0].split("/").slice(-2).join("/")), pos: this.currentTime }); }); }
    this.volume = 0.0001; log.push({ t: T(), ev: "시작", name }); return op.call(this);
  };
  window.__sfxLog = log; window.__sfxVolume = 0.0001; // 짧은 소리(js/sfx.js 버퍼)는 여기로 적힌다 · 아주 작게
  const AC = window.AudioContext, oo = AC.prototype.createOscillator; let lastTone = 0;
  AC.prototype.createOscillator = function () { const now = T(); if (now - lastTone > 50) log.push({ t: now, ev: "효과음", name: "" }); lastTone = now; return oo.call(this); };
  const $ = s => document.querySelector(s);
  const ok = (c, name, extra = "") => res.push(`${c ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`);
  const line = i => [...document.querySelectorAll(".line")][i - 1];
  const openWrite = async i => { line(i).querySelector(".kotext").click(); await W(1200); if (!$(".panel.write")) { line(i).querySelector("[data-act=write]").click(); await W(1300); } };
  const key = j => [...document.querySelectorAll(".panel [data-j]")].find(b => b.dataset.j === j)?.click();
  const idle = async (max = 8000) => { const t0 = T(); await W(150); let calm = 0; while (T() - t0 < max) { const b = $(".panel .write")?.parentElement?.__wr?.busy?.() ?? false; calm = b ? 0 : calm + 1; if (calm >= 3) return; await W(100); } };
  const fits = () => {
    const p = $(".panel").getBoundingClientRect(), wr = $(".panel .write");
    const keys = [...document.querySelectorAll(".panel .kb button")], btns = $(".panel .wbtns").getBoundingClientRect();
    const lastKey = keys.length ? keys[keys.length - 1].getBoundingClientRect() : { bottom: 0 };
    const kbTop = $(".panel .kb")?.getBoundingClientRect().top ?? 0; // 10-06: 세 단추는 위 글자 칸 오른쪽 — 자판보다 위에 있어야(겹침 0)
    return { scroll: wr.scrollHeight - wr.clientHeight, inside: lastKey.bottom <= p.bottom + 1 && btns.bottom <= kbTop + 1, sentOverflow: $(".panel .sent").scrollWidth - $(".panel .sent").clientWidth };
  };
  const desc = from => log.slice(from).map(e => `${e.ev}${e.name ? "(" + e.name.split("/").pop() + ")" : ""}`).join(" → ");

  await openWrite(1);
  let f = fits(); ok(f.scroll <= 1 && f.inside, "창 안 스크롤 없음 · 자판·단추가 창 안", `넘침 ${f.scroll}px`);
  let at = log.length; key("ㅇ"); await idle();
  ok(desc(at) === "효과음 → 시작(j_ieung.mp3) → 끝(j_ieung.mp3)", "ㅇ 맞음 → 딩동 → 자모 소리", desc(at));
  at = log.length; key("ㄱ"); await idle();
  ok(/^효과음 → 시작\(j_giyeok\.mp3\)/.test(desc(at)) && $(".panel .slot.current")?.classList.contains("shake"), "ㄱ 틀림 → 뿅뿅(귀여운 틀림 소리) → 그래도 ㄱ 소리 · 흔들림", desc(at));
  at = log.length; key("ㅓ"); await W(150); key("ㅅ"); await idle();
  const ev = log.slice(at);
  ok(/^효과음 → 시작\(j_eo\.mp3\) → 끝\(j_eo\.mp3\)/.test(desc(at)) && !ev.some(e => /uC5B4|eo_char/.test(e.name)), "ㅓ 완성 → 딩동 → ㅓ 소리 · 글자를 읽어 주는 소리 없음(W3)", desc(at));
  // 누르면 언제나 받기(본부 10-06) — 글자 완성 축하 중 누른 ㅅ 은 기억했다가 다음 글자 「서」로 넘어가자마자 처리
  const iEo = ev.findIndex(e => e.ev === "끝" && /j_eo/.test(e.name)), iS = ev.findIndex(e => e.ev === "시작" && /j_siot/.test(e.name));
  ok(iS > iEo && iEo >= 0 && $(".panel .target")?.textContent === "서" && document.querySelectorAll(".panel .slot.filled").length === 1, "글자 완성 축하 중 누른 ㅅ → 다음 글자 「서」 첫 칸으로 이어짐", desc(at));
  ok($(".panel .target")?.textContent === "서", "다음 글자 「서」");
  // 빠르게 연달아(소리 도중 5번) — ㅓ(서 끝) ㅇ ㅗ(오 끝) ㅅ ㅔ → 5번 모두 처리 → 「세」까지 다 침 · 다음 「요」
  key("ㅓ"); await W(60); key("ㅇ"); await W(60); key("ㅗ"); await W(60); key("ㅅ"); await W(60); key("ㅔ"); await idle(9000); await W(300); await idle(6000);
  ok($(".panel .target")?.textContent === "요", "소리 도중 빠르게 5번(ㅓ ㅇ ㅗ ㅅ ㅔ) → 5번 다 처리 · 「서」「오」「세」 완성 → 다음 「요」", `지금 ${$(".panel .target")?.textContent}`);
  // 되돌려 앞 토막 처음부터(뒤 점검이 「서」 기준) — 토막 ▶ ◀
  $(".panel [data-seg='1']").click(); await W(200); $(".panel [data-seg='-1']").click(); await W(300); key("ㅇ"); await idle(); key("ㅓ"); await idle(4000);
  // 글자 반복
  const ch = [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === "오" && !c.classList.contains("noaudio"));
  if (ch) { ch.click(); await W(300); const c2 = [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === "오"); ok(c2.classList.contains("loop"), "「오」 누름 → 반복"); c2.click(); await W(200); ok(![...document.querySelectorAll(".panel .sent .c.loop")].length, "다시 → 멈춤"); }
  // 단어 듣기 · 문장 듣기 · 아래 ▶
  // 단어 듣기 · 이 부분 듣기 = 본부가 일레븐랩스로 따로 만든 소리(units/{id}.mp3) — 끝까지 다 나오고, 줄 전체(_sub_t1)는 안 나옴
  const units = await (await fetch("data/L01-00-01/L01-00-01.units.json", { cache: "no-store" })).json();
  const unitCheck = async (btn, wantId, name) => {
    const at0 = log.length; $(btn).click(); await idle(8000);
    const ev = log.slice(at0), st0 = ev.find(e => e.ev === "시작"), end0 = ev.find(e => e.ev === "끝");
    ok(st0 && st0.name.endsWith(wantId + ".mp3") && end0 && !ev.some(e => e.name.includes("_sub_t1")), name, desc(at0));
  };
  await unitCheck(".panel [data-act=word]", units.lines["1"].words[0].id, "단어 듣기 → 따로 만든 「어서」 소리(끝까지)");
  await unitCheck(".panel [data-act=sent]", units.lines["1"].parts[0].id, `이 부분 듣기 → 따로 만든 토막 「${units.lines["1"].parts[0].say}」 소리(줄 전체 아님)`);
  $(".panel [data-act=sent]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "true", "이 부분 듣기 켜짐");
  $(".panel [data-act=sent]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "false", "다시 누르면 멈춤");
  $(".ctrl [data-act=play]").click(); await W(200); ok($(".panel [data-act=sent]").getAttribute("aria-pressed") === "true", "아래 ▶ = 이 부분 듣기"); $(".ctrl [data-act=play]").click(); await W(200);
  // 자동 완성 — 지금 토막의 남은 글자를 한 자모씩 · 글자마다 모양이 맞나 · 토막이 끝나면 멈춤 · 다시 누르면 멈춤
  const watchShapes = () => { const seen = []; const mo = new MutationObserver(() => { const b = $(".panel .box.ok"); if (b) { const k = b.querySelector(".target").textContent + "=" + b.querySelector(".typed").textContent; if (seen[seen.length - 1] !== k) seen.push(k); } }); mo.observe($(".panel .write"), { subtree: true, childList: true, attributes: true }); return { seen, stop: () => mo.disconnect() }; };
  let segBefore = $(".panel .segnav").innerText.replace(/\s/g, "");
  let w8 = watchShapes(); const atAuto = log.length; $(".panel [data-act=auto]").click(); await W(300);
  ok($(".panel [data-act=auto]").getAttribute("aria-pressed") === "true", "자동 완성 누름 → 「멈춤」 단추로 바뀜");
  await idle(30000); w8.stop();
  const badShape = w8.seen.filter(k => { const [a, b] = k.split("="); return a !== b; });
  ok(w8.seen.length >= 1 && !badShape.length && $(".panel .segnav").innerText.replace(/\s/g, "") !== segBefore && $(".panel [data-act=auto]").getAttribute("aria-pressed") === "false",
    "자동 완성 → 남은 글자를 한 자모씩 다 쳐서 토막 끝 · 저절로 멈춤", `${w8.seen.join(" ")}${badShape.length ? " · 틀린 모양 " + badShape.join(" ") : ""} · 토막 ${segBefore} → ${$(".panel .segnav").innerText.replace(/\s/g, "")}`);
  const autoSounds = log.slice(atAuto).filter(e => e.ev === "시작").map(e => e.name);
  ok(autoSounds.length > 0 && autoSounds.every(n => /^j\//.test(n) || /\/j_/.test(n)), "자동 완성 → 자음·모음 소리만(글자·단어·문장 소리 없음)", autoSounds.join(","));
  $(".panel [data-act=auto]").click(); await W(1500); $(".panel [data-act=auto]").click(); await W(200);
  ok($(".panel [data-act=auto]").getAttribute("aria-pressed") === "false", "자동 완성 중 다시 누름 → 멈춤");
  await idle(8000);
  $(".panel [data-act=retry]")?.click(); line(1).querySelector(".kotext").click(); await W(300);
  if ($(".panel.write")) { line(1).querySelector("[data-act=write]").click(); await W(500); } line(1).querySelector("[data-act=write]").click(); await W(1300);
  // 1번 줄을 끝까지 → 대사 → 2번 줄 쓰기(자동)
  const t0 = T(); let guard = 0;
  while ($(".panel .target") && /1 \//.test($(".panel .whead .sub").textContent) && guard++ < 60) {
    const cur = $(".panel .slot.current")?.textContent; if (!cur) { await W(300); continue; }
    const before = log.length; key(cur); await idle(5000); if (log.length === before) await W(300);
  }
  await W(500); await idle(9000); await W(1200);
  ok(/^2 \//.test($(".panel .whead .sub")?.textContent || ""), "1번 줄 다 쓰면 → 대사 → 2번 줄 쓰기로 자동", `${Math.round((T() - t0) / 1000)}초 · 지금 ${$(".panel .whead .sub")?.textContent}`);
  // 긴 줄(8번) — 토막 · 스크롤 없음 · 토막 넘김
  await openWrite(8);
  f = fits(); const nav = $(".panel .segnav")?.innerText || "";
  ok(/1\/\d/.test(nav) && f.sentOverflow <= 1 && f.scroll <= 1, "8번(41글자) 고정 토막으로 · 한 줄에 다 보임 · 스크롤 없음", `${nav.replace(/\s/g, "")} · ${$(".panel .sent").innerText.replace(/\s+/g, " ")} · 넘침 ${f.sentOverflow}/${f.scroll}`);
  const total = +(nav.match(/\/(\d+)/) || [])[1] || 1;
  $(".panel [data-seg='1']").click(); await W(300); ok(new RegExp(`2/${total}`).test($(".panel .segnav").innerText.replace(/\s/g, "")), "토막 ▶ → 2번째 토막", $(".panel .sent").innerText.replace(/\s+/g, " "));
  // 마지막 토막으로 가서 자동 완성으로 끝내기 → 다음 줄(9번)
  for (let s = 2; s < total; s++) { $(".panel [data-seg='1']").click(); await W(200); }
  $(".panel [data-act=auto]").click(); await idle(30000);
  await W(500); await idle(12000); await W(1500);
  ok(/^9 \//.test($(".panel .whead .sub")?.textContent || ""), "8번 마지막 토막 끝 → 대사 → 9번 줄 쓰기로 자동", $(".panel .whead .sub")?.textContent);
  line(9).querySelector("[data-act=write]").click(); await W(400);
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "쓰기 단추 다시 → 영상");
  // 겹모음 한 칸(본부 10-06) — 14번 「이게」: 게 = 칸 2개 · ㅔ 한 번 / ㅓ+ㅣ 두 번 둘 다 맞음 · 자동 완성 소리 ㄱ→ㅔ
  line(14).querySelector(".kotext").click(); await W(800); if ($(".panel").hidden || !$(".panel .sent")) { line(14).querySelector("[data-act=write]").click(); await W(1300); }
  for (let k = 0; k < 30 && !/^14 \//.test($(".panel .whead .sub")?.textContent || ""); k++) await W(100); // 14번 쓰기 창이 다 열릴 때까지
  for (let k = 0; k < 4 && !/(^|\D)1\//.test($(".panel .segnav").innerText.replace(/\s/g, "")); k++) { $(".panel [data-seg='-1']").click(); await W(200); }
  for (let k = 0; k < 6 && !/^이게/.test($(".panel .sent").textContent.replace(/\s/g, "")); k++) { $(".panel [data-seg='1']").click(); await W(250); }
  const segAt = $(".panel .segnav").innerText.replace(/\s/g, "");
  const reSeg = async () => { $(".panel [data-seg='-1']").click(); await W(200); $(".panel [data-seg='1']").click(); await W(250); };
  const tgt = () => $(".panel .target")?.textContent, slots = () => document.querySelectorAll(".panel .slot").length, typed = () => $(".panel .typed")?.textContent;
  key("ㅇ"); await idle(); key("ㅣ"); await idle();
  const geSlots = slots(), geT = tgt();
  key("ㄱ"); await idle(); key("ㅔ"); await idle(4000);
  const oneKey = tgt();
  await reSeg(); key("ㅇ"); await idle(); key("ㅣ"); await idle(); key("ㄱ"); await idle(); key("ㅓ"); await idle();
  const midTyped = typed(), midSlots = slots(), midT = tgt();
  key("ㅣ"); await idle(4000);
  const twoKeys = tgt();
  ok(geT === "게" && geSlots === 2 && oneKey === "그" && midT === "게" && midTyped === "거" && midSlots === 2 && twoKeys === "그",
    "게 = 칸 2개 · [ㅔ] 한 번으로도 · [ㅓ][ㅣ] 두 번으로도 맞음(중간 모양 「거」)", `${segAt} · 칸 ${geSlots} · ㅔ→${oneKey} · ㅓ 뒤 「${midTyped}」 · ㅓㅣ→${twoKeys}`);
  await reSeg(); at = log.length; $(".panel [data-act=auto]").click(); await idle(20000); await W(300);
  const jam = log.slice(at).filter(e => e.ev === "시작").map(e => e.name.split("/").pop().replace(/\.mp3$/, ""));
  const gi = jam.indexOf("j_giyeok");
  ok(gi >= 0 && jam[gi + 1] === "j_e" && !jam.includes("j_eo"), "자동 완성 「게」 = ㄱ(기역) → ㅔ(에) 소리 차례 · ㅓ 소리 없음", jam.slice(0, 8).join(" → "));
  f = fits(); ok(f.scroll <= 1 && f.inside && document.querySelectorAll(".panel .kb .kr:nth-child(4) button, .panel .kb .kr:nth-child(5) button").length === 11, "겹모음 줄 11개 넣어도 창 안 스크롤 없음 · 자판이 창 안", `넘침 ${f.scroll}px`);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = res.join("\n"); console.log(out); return out;
})();
