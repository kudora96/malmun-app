// 쓰기 전수 점검(W1~W6) — #/learn/{편} 을 연 채로 실행. 소리는 끄고, 무슨 소리가 언제 났는지 적는다.
// 확인: 맞음(딩동→자모) · 틀림(툭→그 자모 소리도) · 글자 완성(자모 … 0.5초 … 글자) · 소리 중 자판 무시 ·
//       창 안 스크롤 없음(자판·단추가 창 안에) · 긴 줄 토막 나누기 · 토막 끝 → 다음 토막 · 줄 끝 → 대사 → 다음 줄 · 글자 반복 · 단어/문장 듣기 · 아래 ▶
(async () => { const res = []; try {
  // 학습자 기억값에 안 흔들리게(본부 10-07 — 손글씨 기억이 남아 자판 점검이 손글씨 화면에서 돎) — 자판 · 로마자 켬 · 속도 1×
  try { localStorage.setItem("malmun.wmode", "kb"); localStorage.removeItem("malmun.rom"); localStorage.removeItem("malmun.rate.m"); localStorage.removeItem("malmun.rate.y"); } catch {}
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

  // 편 자료에서 읽음(옛 세종 1번 줄 「어서 오세요」·8번 줄을 박아 두지 않음 · 개발2팀 10-22): SY = 1번 줄 첫 토막 음절 · 자모로 풀어 침 · LL = 가장 긴 줄
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ", JONG = ["", "ㄱ", "ㄲ", "ㄱㅅ", "ㄴ", "ㄴㅈ", "ㄴㅎ", "ㄷ", "ㄹ", "ㄹㄱ", "ㄹㅁ", "ㄹㅂ", "ㄹㅅ", "ㄹㅌ", "ㄹㅍ", "ㄹㅎ", "ㅁ", "ㅂ", "ㅂㅅ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const jamo = ch => { const n = ch.charCodeAt(0) - 0xac00; return [CHO[Math.floor(n / 588)], JUNG[Math.floor((n % 588) / 28)], ...JONG[n % 28]]; }, uOf = ch => "u" + ch.codePointAt(0).toString(16).toUpperCase();
  const LL = 1 + [...document.querySelectorAll(".line")].map(l => (l.querySelector(".kotext")?.textContent || "").replace(/[^가-힣]/g, "").length).reduce((b, n, i, a) => (n > a[b] ? i : b), 0);
  await openWrite(1);
  const SY = [...$(".panel .sent").textContent].filter(c => /[가-힣]/.test(c)), J0 = jamo(SY[0]), J1 = jamo(SY[1]), WRONG = J0[0] === "ㄱ" ? "ㄴ" : "ㄱ";
  res.push(`· 1번 줄 첫 토막 「${SY.join("")}」`);
  let f = fits(); ok(f.scroll <= 1 && f.inside, "창 안 스크롤 없음 · 자판·단추가 창 안", `넘침 ${f.scroll}px`);
  let at = log.length; key(J0[0]); await idle();
  ok(/^효과음 → 시작\(j_\w+\.mp3\) → 끝\(j_\w+\.mp3\)$/.test(desc(at)), `${J0[0]} 맞음 → 딩동 → 자모 소리`, desc(at));
  at = log.length; key(WRONG); await idle();
  ok(/^효과음 → 시작\(j_\w+\.mp3\)/.test(desc(at)) && $(".panel .slot.current")?.classList.contains("shake"), `${WRONG} 틀림 → 뿅뿅(귀여운 틀림 소리) → 그래도 ${WRONG} 소리 · 흔들림`, desc(at));
  for (const j of J0.slice(1, -1)) { key(j); await idle(); } // 「${SY[0]}」 끝 자모 앞까지
  at = log.length; key(J0[J0.length - 1]); await W(150); key(J1[0]); await idle();
  const ev = log.slice(at);
  ok(new RegExp(`^효과음 → 시작\\(j_\\w+\\.mp3\\) → 끝\\(j_\\w+\\.mp3\\) → 시작\\(${uOf(SY[0])}\\.mp3\\) → 끝\\(${uOf(SY[0])}\\.mp3\\)`).test(desc(at)), `${J0[J0.length - 1]} 완성 → 딩동 → 자모 소리 → 「${SY[0]}」 글자 소리(W3 · 투덜이 10-08)`, desc(at));
  // 누르면 언제나 받기(본부 10-06) — 글자 완성 축하 중 누른 ㅅ 은 기억했다가 다음 글자 「서」로 넘어가자마자 처리
  const iEo = ev.findIndex(e => e.ev === "끝" && /j_/.test(e.name)), iS = ev.findLastIndex(e => e.ev === "시작" && /j_/.test(e.name)); // 끝 자모 소리 끝 → (글자 소리) → 다음 글자 첫 자모 소리
  ok(iS > iEo && iEo >= 0 && $(".panel .target")?.textContent === SY[1] && document.querySelectorAll(".panel .slot.filled").length === 1, `글자 완성 축하 중 누른 ${J1[0]} → 다음 글자 「${SY[1]}」 첫 칸으로 이어짐`, desc(at));
  ok($(".panel .target")?.textContent === SY[1], `다음 글자 「${SY[1]}」`);
  // 빠르게 연달아(소리 도중 5번) — ㅓ(서 끝) ㅇ ㅗ(오 끝) ㅅ ㅔ → 5번 모두 처리 → 「세」까지 다 침 · 다음 「요」
  const FAST = [...J1.slice(1), ...jamo(SY[2]), ...jamo(SY[3])]; for (const j of FAST) { key(j); await W(60); } await idle(9000); await W(300); await idle(6000);
  ok($(".panel .target")?.textContent === SY[4], `소리 도중 빠르게 ${FAST.length}번(${FAST.join(" ")}) → 다 처리 · 「${SY[1]}」「${SY[2]}」「${SY[3]}」 완성 → 다음 「${SY[4]}」`, `지금 ${$(".panel .target")?.textContent}`);
  // 되돌려 앞 토막 처음부터(뒤 점검이 「서」 기준) — 토막 ▶ ◀
  $(".panel [data-seg='1']").click(); await W(200); $(".panel [data-seg='-1']").click(); await W(300); for (const j of J0) { key(j); await idle(); } await idle(4000);
  // 위 글자 줄 글자 누르기 = 그 글자 소리 한 번(되풀이 없음 · 눌린 표시 안 남김 · 10-06 투덜이)
  const ch = [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === SY[2] && !c.classList.contains("noaudio"));
  if (ch) { const at0 = log.length; ch.click(); await W(2600); const c2 = [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === SY[2]); const st = log.slice(at0).filter(e => e.ev === "시작").length; ok(st === 1 && !c2.classList.contains("loop") && document.activeElement !== c2 && $(".panel .target")?.textContent === SY[2] && c2.classList.contains("now"), `「${SY[2]}」 누름 → 그 글자로 가서 쓰기(칠) · 소리 한 번 · 되풀이 없음`, `시작 ${st}번 · 지금 ${$(".panel .target")?.textContent}`);
    // 「서」 눌러 돌아옴 — 건너뛴 「오」는 안 씀(기본) · 쓴 「어」는 초록(본부 10-07)
    [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === SY[1]).click(); await W(1500);
    const cs = t => [...document.querySelectorAll(".panel .sent .c")].find(c => c.textContent === t);
    ok($(".panel .target")?.textContent === SY[1] && cs(SY[0]).classList.contains("done") && cs(SY[1]).classList.contains("now") && getComputedStyle(cs(SY[1])).backgroundColor !== getComputedStyle(cs(SY[3])).backgroundColor, `「${SY[1]}」 눌러 돌아옴 · 쓴 「${SY[0]}」 초록 · 지금 글자 = 칠(안 쓴 칸과 바탕 다름)`, $(".panel .target")?.textContent); }
  // 단어 듣기 · 문장 듣기 · 아래 ▶
  // 단어 듣기 · 이 부분 듣기 = 본부가 일레븐랩스로 따로 만든 소리(units/{id}.mp3) — 끝까지 다 나오고, 줄 전체(_sub_t1)는 안 나옴
  const units = await fetch("data/L01-00-01/L01-00-01.units.json", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null); // 따로 만든 토막 소리 목록(옛 세종 · 새 편엔 없음 = 줄 소리)
  const unitCheck = async (btn, wantId, name) => {
    const at0 = log.length; $(btn).click(); await idle(8000); for (let k = 0; k < 120 && !log.slice(at0).some(e => e.ev === "끝"); k++) await W(100); // 긴 줄 소리(새 1편 1번 7초)는 끝날 때까지
    const ev = log.slice(at0), st0 = ev.find(e => e.ev === "시작"), end0 = ev.find(e => e.ev === "끝");
    ok(st0 && (wantId ? st0.name.endsWith(wantId + ".mp3") && !ev.some(e => e.name.includes("_sub_t1")) : /L01-00-01_01_/.test(st0.name)) && end0, name, desc(at0));
  };
  ok(!$(".panel [data-act=word]"), "「단어 듣기」 단추 없음(투덜이 10-07 — 「이 부분 듣기」가 다 읽음 · 글자 소리는 위 글자 줄)");
  await unitCheck(".panel [data-act=line]", units?.lines?.["1"]?.parts?.[0]?.id, units ? `🔊 이 줄 듣기 → 따로 만든 토막 「${units.lines["1"].parts[0].say}」 소리(줄 전체 아님)` : "🔊 이 줄 듣기 → 1번 줄 소리 끝까지(토막 소리 목록 없는 편)");
  $(".panel [data-act=line]").click(); await W(200); ok($(".panel [data-act=line]").getAttribute("aria-pressed") === "true", "🔊 이 줄 듣기 켜짐(눌린 모양)");
  $(".panel [data-act=line]").click(); await W(200); ok($(".panel [data-act=line]").getAttribute("aria-pressed") === "false", "다시 누르면 멈춤");
  $(".ctrl [data-act=play]").click(); await W(200); ok($(".panel [data-act=line]").getAttribute("aria-pressed") === "true", "아래 ▶ = 이 줄 듣기"); $(".ctrl [data-act=play]").click(); await W(200);
  { const lb = $(".panel [data-act=line]"), cs = lb && getComputedStyle(lb); ok(lb?.tagName === "BUTTON" && parseFloat(cs.borderTopWidth) > 0 && !!lb.getAttribute("aria-label"), "🔊 = 단추 모양(테두리 · 이름 있음 · 투덜이 10-13)", `${lb?.tagName} · 테두리 ${cs?.borderTopWidth} · 「${lb?.getAttribute("aria-label")}」`); }
  // 듣기+자동 쓰기 단추 셋(대표님 10-22) — [글자] = 지금 글자를 써 보이고 그 글자 소리 · [낱말] = 그 낱말 끝까지 · [문장] = 줄 끝까지 · 누른 것만 눌림 · 다시 누르면 멈춤 · 단추 글 고정
  const wst = () => $(".panel .write")?.parentElement?.__wr?.st?.(), labs0 = [...$(".panel .wbtns").querySelectorAll("button")].map(b => b.textContent).join("|");
  { await idle(4000); const hc = $(".panel [data-act=hearch]"), ch0 = $(".panel .box .target")?.textContent || "", want = "u" + (ch0.codePointAt(0) || 0).toString(16).toUpperCase() + ".mp3", c0 = [wst().w, wst().c];
    const at0 = log.length; hc.click(); await W(300); const pressed = hc.getAttribute("aria-pressed") === "true"; for (let k = 0; k < 60 && wst().auto; k++) await W(200); await idle(4000);
    const said = log.slice(at0).some(e => e.ev === "시작" && e.name.endsWith(want)), moved = wst().w !== c0[0] || wst().c !== c0[1] || wst().segEnd;
    ok(pressed && said && !wst().auto && hc.getAttribute("aria-pressed") === "false" && moved, "[글자] = 지금 글자를 다 쳐 보이고 그 글자 소리 · 그 글자만 하고 멈춤(대표님 10-22)", `「${ch0}」 눌림 ${pressed} · 소리 ${said} · 멈춤 ${!wst().auto} · 다음 글자 ${moved}`); }
  let segBefore = $(".panel .segnav").innerText.replace(/\s/g, ""), sBefore = wst()?.s;
  const watchShapes = () => { const seen = []; const mo = new MutationObserver(() => { const b = $(".panel .box.ok"); if (b) { const k = b.querySelector(".target").textContent + "=" + b.querySelector(".typed").textContent; if (seen[seen.length - 1] !== k) seen.push(k); } }); mo.observe($(".panel .write"), { subtree: true, childList: true, attributes: true }); return { seen, stop: () => mo.disconnect() }; };
  let w8 = watchShapes(); const atAuto = log.length, subBefore = $(".panel .whead .sub")?.textContent, w0 = wst().w; $(".panel [data-act=auto]").click(); await W(300);
  ok($(".panel [data-act=auto]").getAttribute("aria-pressed") === "true", "[낱말] 누름 → 그 단추만 눌림");
  for (let k = 0; k < 300 && wst()?.auto; k++) await W(200); await idle(8000); w8.stop();
  const badShape = w8.seen.filter(k => { const [a, b] = k.split("="); return a !== b; });
  ok(w8.seen.length >= 1 && !badShape.length && wst().w === w0 && wst().c === $(".panel .write").parentElement.__wr.segs()[sBefore][w0].chars.length - 1 && wst()?.s === sBefore && $(".panel .whead .sub")?.textContent === subBefore && $(".panel [data-act=auto]").getAttribute("aria-pressed") === "false",
    "[낱말] → 그 낱말 글자를 한 자모씩 다 쳐서 그 낱말 마지막 글자에 머묾 · 다음 낱말·토막·줄로 안 감(대표님 10-23)", `${w8.seen.join(" ")}${badShape.length ? " · 틀린 모양 " + badShape.join(" ") : ""} · 토막 ${segBefore} → ${$(".panel .segnav").innerText.replace(/\s/g, "")}`);
  { $(".panel [data-act=autoall]").click(); await W(400); const S = wst(); const on = S?.auto && S.autoMode === "all" && $(".panel [data-act=autoall]").getAttribute("aria-pressed") === "true"; $(".panel [data-act=autoall]").click(); await W(400);
    ok(on && !wst().auto && [...$(".panel .wbtns").querySelectorAll("button")].map(b => b.textContent).join("|") === labs0, "[문장] = 줄 자동 시작 · 다시 누르면 멈춤 · 단추 글 고정(글자·낱말·문장)", `시작 ${on} · 멈춤 ${!wst().auto} · 글 ${labs0}`); }
  const autoAll = log.slice(atAuto).filter(e => e.ev === "시작").map(e => e.name), isLine = n => /_sub_|(^|\/)audio\/|(^|\/)units\//.test(n), lineAt = autoAll.findIndex(isLine), autoSounds = lineAt < 0 ? autoAll : autoAll.slice(0, lineAt); // 줄 끝 대사 한 번(본부 10-12)은 따로
  ok(lineAt === -1 || autoAll.filter(isLine).length <= 1, "자동 완성 → 토막 끝 소리는 한 번만(본부 10-12)", autoAll.slice(lineAt).join(","));
  ok(autoSounds.length > 0 && autoSounds.every(n => /^j\//.test(n) || /\/j_/.test(n) || /chars_f\/u[0-9A-F]{4}\.mp3$/.test(n)) && autoSounds.some(n => /chars_f\/u/.test(n)), "자동 완성 → 자음·모음 소리 + 글자 완성 때 글자 소리(쓰는 동안 단어·문장 소리 없음 · 투덜이 10-08)", `다른 소리: ${autoSounds.filter(n => !(/^j\//.test(n) || /\/j_/.test(n) || /chars_f\/u[0-9A-F]{4}\.mp3$/.test(n))).join(",") || "없음"} · ${autoSounds.length}개`);
  $(".panel [data-act=auto]").click(); await W(1500); $(".panel [data-act=auto]").click(); await W(200);
  ok($(".panel [data-act=auto]").getAttribute("aria-pressed") === "false", "자동 완성 중 다시 누름 → 멈춤");
  await idle(8000);
  $(".panel [data-act=retry]")?.click(); line(1).querySelector(".kotext").click(); await W(300);
  if ($(".panel.write")) { line(1).querySelector("[data-act=write]").click(); await W(500); } line(1).querySelector("[data-act=write]").click(); await W(1300);
  // 1번 줄을 끝까지 → 대사 → 2번 줄 쓰기(자동)
  const t0 = T(); let guard = 0;
  while ($(".panel .target") && /1 \//.test($(".panel .whead .sub").textContent) && guard++ < 400) {
    const cur = $(".panel .slot.current")?.textContent; if (!cur) { await W(300); continue; }
    const before = log.length; key(cur); await idle(5000); if (log.length === before) await W(300);
  }
  await W(500); await idle(9000); await W(1200);
  ok(/^2 \//.test($(".panel .whead .sub")?.textContent || ""), "1번 줄 다 쓰면 → 대사 → 2번 줄 쓰기로 자동", `${Math.round((T() - t0) / 1000)}초 · 지금 ${$(".panel .whead .sub")?.textContent}`);
  // 긴 줄(옛 8번 · 가장 긴 줄) — 토막 · 스크롤 없음 · 토막 넘김
  await openWrite(LL);
  f = fits(); const nav = $(".panel .segnav")?.innerText || "";
  ok(/1\/\d/.test(nav) && f.sentOverflow <= 1 && f.scroll <= 1, `${LL}번(가장 긴 줄) 고정 토막으로 · 한 줄에 다 보임 · 스크롤 없음`, `${nav.replace(/\s/g, "")} · ${$(".panel .sent").innerText.replace(/\s+/g, " ")} · 넘침 ${f.sentOverflow}/${f.scroll}`);
  const total = +(nav.match(/\/(\d+)/) || [])[1] || 1;
  $(".panel [data-seg='1']").click(); await W(300); ok(new RegExp(`2/${total}`).test($(".panel .segnav").innerText.replace(/\s/g, "")), "토막 ▶ → 2번째 토막", $(".panel .sent").innerText.replace(/\s+/g, " "));
  // 마지막 토막으로 가서 [전체 자동] → 그 줄 문장 전체 소리 한 번 → 그 줄에 머묾(투덜이 10-15 「전체인데 일부만」 · 다음 줄로 저절로 안 넘어감 · 다음 줄 소리 예약 0)
  for (let s = 2; s < total; s++) { $(".panel [data-seg='1']").click(); await W(200); }
  const at8 = (window.__sfxLog || []).length; $(".panel [data-act=autoall]").click(); await idle(30000); /* 기록 배열은 그대로 둠(아래 점검이 같은 배열을 봄) */
  for (let k = 0; k < 120 && !$(".panel .write")?.parentElement?.__wr?.st?.().lineEnd; k++) await W(250); await W(5000);
  { const S8 = $(".panel .write")?.parentElement?.__wr?.st?.(), lab8 = $(".panel [data-act=autoall]")?.textContent || "", heard = (window.__sfxLog || []).slice(at8).filter(e => e.ev === "시작" && new RegExp(`_sub|_t\\d|line|L01-00-01_${String(LL).padStart(2, "0")}`).test(e.name || "")).map(e => e.name);
    ok(new RegExp(`^${LL} /`).test($(".panel .whead .sub")?.textContent || "") && S8?.lineEnd && !S8.auto && !S8.allNext && !/⏹/.test(lab8) && heard.length >= 1, `[전체 자동] ${LL}번 마지막 토막 끝 → 그 줄 문장 소리 한 번 → ${LL}번 줄에 머묾(다음 줄로 안 감)`, `${$(".panel .whead .sub")?.textContent} · 자동 ${S8?.auto} · 단추 「${lab8}」 · 소리 ${heard.join(",")}`); }
  $(".panel [data-seg='-1']")?.click(); await W(300); $(".panel [data-act=autoall]").click(); await W(800); $(".panel [data-act=autoall]")?.click(); await W(300); ok(!$(".panel .write")?.parentElement?.__wr?.st?.().auto, "전체 자동 중 같은 단추 = 멈춤");
  line(LL).querySelector("[data-act=write]").click(); await W(400); /* 10-15 전체 자동 = 그 줄에 머묾 → 그 줄 쓰기 단추 다시 */
  ok($("#vwrap").offsetHeight > 0 && $(".panel").offsetHeight === 0, "쓰기 단추 다시 → 영상");
  // 겹모음 한 칸(본부 10-06) — 「게」가 든 첫 줄·토막(편 자료 · 옛 세종 14번 「이게」 · 개발2팀 10-22): 게 = 칸 2개 · ㅔ 한 번 / ㅓ+ㅣ 두 번 둘 다 맞음 · 자동 완성 소리 ㄱ→ㅔ
  const LG = 1 + [...document.querySelectorAll(".line")].findIndex(l => /게/.test(l.querySelector(".kotext")?.textContent || ""));
  line(LG).querySelector(".kotext").click(); await W(800); if ($(".panel").hidden || !$(".panel .sent")) { line(LG).querySelector("[data-act=write]").click(); await W(1300); }
  for (let k = 0; k < 30 && !new RegExp(`^${LG} /`).test($(".panel .whead .sub")?.textContent || ""); k++) await W(100); // 그 줄 쓰기 창이 다 열릴 때까지
  for (let k = 0; k < 4 && !/(^|\D)1\//.test($(".panel .segnav").innerText.replace(/\s/g, "")); k++) { $(".panel [data-seg='-1']").click(); await W(200); }
  for (let k = 0; k < 6 && !/게/.test($(".panel .sent").textContent); k++) { $(".panel [data-seg='1']").click(); await W(250); }
  const segAt = $(".panel .segnav").innerText.replace(/\s/g, "");
  const reSeg = async () => { const first = /(^|\D)1\//.test($(".panel .segnav").innerText.replace(/\s/g, "")), a = first ? "1" : "-1", b = first ? "-1" : "1"; $(`.panel [data-seg='${a}']`).click(); await W(200); $(`.panel [data-seg='${b}']`).click(); await W(250); }; // 같은 토막 처음부터(첫 토막이면 ▶ 뒤 ◀)
  const tgt = () => $(".panel .target")?.textContent, slots = () => document.querySelectorAll(".panel .slot:not(.slotpad)").length, typed = () => $(".panel .typed")?.textContent;
  // 「게」 앞 음절은 자모로 쳐 넣음(옛 「이」 = ㅇ ㅣ) · 「게」 다음 음절 = 다 친 뒤 과제
  const SG = [...$(".panel .sent").textContent].filter(c => /[가-힣]/.test(c)), GI = SG.indexOf("게"), PRE = SG.slice(0, GI), NEXT = SG[GI + 1] || ""; // 자모 풀기(jamo)는 위 1번 줄 시험과 같은 것
  const typePre = async () => { for (const ch of PRE) for (const j of jamo(ch)) { key(j); await idle(); } };
  await typePre();
  const geSlots = slots(), geT = tgt();
  key("ㄱ"); await idle(); key("ㅔ"); await idle(4000);
  const oneKey = tgt();
  await reSeg(); await typePre(); key("ㄱ"); await idle(); key("ㅓ"); await idle();
  const midTyped = typed(), midSlots = slots(), midT = tgt();
  key("ㅣ"); await idle(4000);
  const twoKeys = tgt();
  ok(GI >= 0 && geT === "게" && geSlots === 2 && oneKey === NEXT && midT === "게" && midTyped === "거" && midSlots === 2 && twoKeys === NEXT,
    "게 = 칸 2개 · [ㅔ] 한 번으로도 · [ㅓ][ㅣ] 두 번으로도 맞음(중간 모양 「거」)", `${segAt} · 칸 ${geSlots} · ㅔ→${oneKey} · ㅓ 뒤 「${midTyped}」 · ㅓㅣ→${twoKeys}`);
  await reSeg(); at = log.length; $(".panel [data-act=auto]").click(); await idle(20000); await W(300);
  const jam = log.slice(at).filter(e => e.ev === "시작").map(e => e.name.split("/").pop().replace(/\.mp3$/, ""));
  const gi = jam.indexOf("j_giyeok");
  ok(gi >= 0 && jam[gi + 1] === "j_e" && !jam.includes("j_eo"), "자동 완성 「게」 = ㄱ(기역) → ㅔ(에) 소리 차례 · ㅓ 소리 없음", jam.slice(0, 8).join(" → "));
  f = fits(); ok(f.scroll <= 1 && f.inside && document.querySelectorAll(".panel .kb .kr:nth-child(4) button, .panel .kb .kr:nth-child(5) button").length === 11, "겹모음 줄 11개 넣어도 창 안 스크롤 없음 · 자판이 창 안", `넘침 ${f.scroll}px`);
  // 투덜이 10-08 폰: 자동 완성 중 글자 마지막 자모 소리 때 자판 → 멈춤 · 그 뒤 자판이 눌려도 소리 안 나던 것(다 친 글자에 머묾)
  { await reSeg(); const wrx = () => $(".panel .write")?.parentElement?.__wr; $(".panel [data-act=auto]").click(); let hit = false;
    for (let i = 0; i < 400 && !hit; i++) { await W(25); const S = wrx()?.st?.(); if (S && S.done && S.auto) hit = true; }
    const before = tgt(); key("ㄱ"); await W(150); const S1 = wrx().st(), after = tgt();
    await idle(4000); at = log.length; let err = null; const oe = e => (err = e.message || String(e.reason)); addEventListener("error", oe); addEventListener("unhandledrejection", oe);
    const nj = [...document.querySelectorAll(".panel .slot")].length ? null : null; key("ㅏ"); await idle(3000); removeEventListener("error", oe); removeEventListener("unhandledrejection", oe);
    const snd = log.slice(at).some(e => e.ev === "시작" && /chars_f\/j_|letters\/j/.test(e.name));
    ok(hit && !S1.auto && S1.k === 0 && !err && snd, "자동 완성 중 글자 끝 소리 때 자판 → 멈춤 · 다음 글자로 · 그 뒤 자판 소리 남(오류 없음)", `멈춘 순간 ${before}→${after} · k ${S1.k} · 소리 ${snd} · 오류 ${err || "없음"}`); }
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const out = res.join("\n"); console.log(out); return out;
})();
