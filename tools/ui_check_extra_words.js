// 덧붙은 말 점검(본부 10-11) — 본보기 앞뒤에 다른 말을 더 해도(대사 한 줄 통째로 등) 본보기와 가장 잘 맞는 토막만 점수 · 리듬·빠르기도 그 토막 구간
// ① 글자 점수(heard.js spanOf) ② 리듬·빠르기 = 진짜 소리(한 줄 전체 mp3 를 내 녹음으로 · 본보기 = 그 줄 토막 mp3) ③ 말하기 창 ④ 카드 말해 보기 ⑤ 비교 화면
//  #/learn/L01-00-01 을 연 채로 · 가짜 마이크·받아쓰기(①~⑤ 소리 아주 작게)
(async () => {
  const v = document.documentElement.dataset.v, W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s);
  const res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const noSeq0 = window.__noSeq; window.__noSeq = true; try { localStorage.removeItem("malmun.srdev"); sessionStorage.removeItem("malmun.srmode"); sessionStorage.removeItem("malmun.srfail"); } catch {} // 녹음+받아쓰기 같이(안드로이드 흉내에서도 — 녹음 먼저 방식은 ui_check_seq)
  const keep = { gum: navigator.mediaDevices.getUserMedia, en: navigator.mediaDevices.enumerateDevices, SR: window.SpeechRecognition, wSR: window.webkitSpeechRecognition, noR: window.__noRhythm };
  try {
    const H = await import(`/js/heard.js?v=${v}`), R = await import(`/js/rhythm.js?v=${v}`), SP = await import(`/js/screens/speak.js?v=${v}`), { t: T } = await import(`/js/i18n.js?v=${v}`);
    // ① 글자 점수
    const tg = "어서 오세요", sc = h => H.scoreOf(tg, [h]), slow = T("score_1");
    const c = { only: sc("어서 오세요"), tail: sc("어서 오세요 감사합니다"), lead: sc("서울에 오신 걸 환영합니다 어서 오세요"), whole: sc("서울에 오신 걸 환영합니다 어서 오세요 여기가 우리 학교예요"),
      other: sc("고맙습니다 감사합니다"), part: sc("서울에 오신 걸 환영합니다 어서"), part0: sc("어서"), wrong: sc("어서 오세유 감사합니다"), wrong0: sc("어서 오세유") };
    ok(c.only === 100 && c.tail === 100 && c.lead === 100 && c.whole === 100, "본보기만 = 100 · 뒤에 덧붙임 = 100 · 앞에 덧붙임 = 100 · 한 줄 통째(앞뒤) = 100", JSON.stringify(c));
    ok(c.other <= 20, "엉뚱한 말 = 낮음(덧붙은 말 규칙으로 부풀지 않음)", `「고맙습니다 감사합니다」 ${c.other}%`);
    ok(c.part === 40 && c.part === c.part0 && c.wrong === 80 && c.wrong === c.wrong0, "본보기 일부만 = 그대로 일부(앞에 말이 더 있어도 같은 점수) · 틀린 음절은 틀린 채로", `「…어서」 ${c.part}% = 「어서」 ${c.part0}% · 「어서 오세유 …」 ${c.wrong}% = 「어서 오세유」 ${c.wrong0}%`);
    const n5 = H.scoreOf("오백 년 전에 왕이", ["그때 500년 전에 왕이 직접 만들었어요"]), st1 = H.scoreOf("있어요", ["이 있어요"]), two = H.spanOf(tg, "어서 오세여 어서 오세요");
    ok(n5 === 100 && st1 === 75 && two.score === 100 && two.pre.includes("오세여"), "숫자(500 → 오백) 토막도 100 · 더듬음(「이 있어요」)은 덧붙은 말 아님 = 75 그대로 · 두 번 말하면 맞는 쪽(뒤)", `${n5} · ${st1} · 「${two.text}」`);
    const hh = H.heardHTML(tg, "서울에 오신 걸 환영합니다 어서 오세요 여기가"), dv = document.createElement("div"); dv.innerHTML = hh.html;
    ok(hh.ok && dv.querySelectorAll(".xtra").length === 2 && !dv.querySelector("mark") && dv.textContent === "서울에 오신 걸 환영합니다 어서 오세요 여기가", "들린 말: 덧붙은 말 = 흐린 회색(빨간 밑줄 아님) · 글은 들은 그대로 · ✓", dv.innerHTML.replace(/ style="[^"]*"/g, "").slice(0, 160));
    const ln = h => SP.scoreLine(H.scoreOf(tg, [h]), "pause", T, H.endHint(tg, [h])), lw = ln("서울에 오신 걸 환영합니다 어서 오세요 여기가 우리 학교예요"), lp = ln("서울에 오신 걸 환영합니다 어서");
    ok(/^100%/.test(lw) && !lw.includes(slow) && !lp.includes(slow) && /^40%/.test(lp), "결과 문구: 한 줄 통째 = 100% · 「천천히 다시」 없음 · 일부만 = 40%(빠진 뒷부분 안내)", `${lw} ‖ ${lp}`);
    // ② 리듬·빠르기 — 내 녹음 = 한 줄 전체 mp3(덧붙은 말 포함) · 본보기 = 그 줄 토막
    delete window.__noRhythm;
    const ep = "L01-00-01", al = await R.loadAlign(ep), url = k => al.items[k].file.replace(/^.*?media/, "/media").split(String.fromCharCode(92)).join("/");
    const sylOf = x => H.sylsAt(x).out;
    for (const [tk, lk] of [["L01-00-01_01_p03", "L01-00-01_01_line"], ["L01-00-01_01_p01", "L01-00-01_01_line"], ["L01-00-01_01_p02", "L01-00-01_01_line"], ["L01-00-01_08_p03", "L01-00-01_08_line"]]) {
      const ti = al.items[tk], li = al.items[lk], tgt = ti.text, full = li.text, spn = H.spanOf(tgt, full);
      const [ub, lb] = await Promise.all([fetch(url(tk)).then(r => r.blob()), fetch(url(lk)).then(r => r.blob())]);
      const o = { ep, key: tk, url: url(tk), text: tgt };
      const rA = await R.rhythmOf({ ...o, blob: ub, heard: tgt }), rOld = await R.rhythmOf({ ...o, blob: lb, heard: spn.text }), rN = await R.rhythmOf({ ...o, blob: lb, heard: spn.text, span: spn, sylOf });
      // 서버 낱말 시각(가짜 = 그 줄 정렬 시각을 띄어쓰기 낱말로 묶음)
      const words = []; { let k = 0; for (const w of full.split(/\s+/)) { const n = sylOf(w).length; if (!n) continue; words.push({ w, s: li.syl[k].s, e: li.syl[k + n - 1].e }); k += n; } }
      const rW = await R.rhythmOf({ ...o, blob: lb, heard: spn.text, span: spn, words, sylOf });
      const truth = { s: li.syl[spn.j0].s, e: li.syl[spn.j1 - 1].e }, pc = await R.paceOf({ ep, key: tk, text: tgt, rate: 1, buf: null }).catch(() => null);
      const S = r => (r ? R.withRhythm(100, r.R) : "-"), lateS = r => (r && pc ? R.lateFactor(r.yEnd, pc.end).late : null), near = (w, tol) => !!w && (spn.j0 === 0 || Math.abs(w.s - truth.s) < tol) && (spn.j1 === spn.m || Math.abs(w.e - truth.e) < tol + 0.1);
      ok(spn.score === 100 && rA && rN && rW && S(rN) >= Math.min(100, S(rA)) - 2 && S(rW) >= Math.min(100, S(rA)) - 2 && near(rN.win, 0.3) && near(rW.win, 0.15) && !lateS(rN) && !lateS(rW),
        `리듬·빠르기 = 토막 구간만: 「${tgt}」 ⊂ 「${full}」 → 덧붙은 말로 안 깎임 · 늦음 아님 · 구간 맞음`,
        `토막만 녹음 ${S(rA)} · 줄 통째(옛 방식) ${S(rOld)} · 줄 통째(새 · DTW) ${S(rN)} 구간 ${rN?.win ? rN.win.s.toFixed(2) + "~" + rN.win.e.toFixed(2) : "-"} · 서버 낱말 시각 ${S(rW)} ${rW?.win ? rW.win.s.toFixed(2) + "~" + rW.win.e.toFixed(2) : "-"} · 참 ${truth.s.toFixed(2)}~${truth.e.toFixed(2)} · 늦음 ${lateS(rN)}/${lateS(rW)} (yEnd ${rN?.yEnd?.toFixed(2)} · 칠 끝 ${pc ? (pc.end / 1000).toFixed(2) : "-"})`);
      if (tk === "L01-00-01_01_p03") window.__xwWin = { blob: lb, win: rN?.win, text: spn.text, full };
    }
    window.__noRhythm = true; // 아래 = 가짜 마이크(삑) — 글자 점수·화면만
    // ③ 말하기 창 — 가짜 마이크·받아쓰기(녹음+받아쓰기 같이 · 안드로이드 아님)
    let mic = null; const ctxP = import(`/js/wake.js?v=${v}`).then(m => m.audioCtx());
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "default", label: "기본값 - 시험 마이크" }];
    navigator.mediaDevices.getUserMedia = async () => { const ctx = await ctxP, dst = ctx.createMediaStreamDestination(), os = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; os.connect(g); g.connect(dst); os.start(); mic = { g }; const tr = dst.stream.getAudioTracks()[0], f = tr.stop.bind(tr); tr.stop = () => { f(); try { os.stop(); os.disconnect(); } catch {} }; return dst.stream; };
    const fake = class { start() { const h = window.__heard; setTimeout(() => this.onresult?.({ results: [[{ transcript: h.slice(0, 2) }]] }), 250); setTimeout(() => this.onresult?.({ results: [[{ transcript: this.continuous ? h : h.slice(0, 2) }]] }), 500); } stop() { setTimeout(() => this.onend?.(), 50); } };
    window.SpeechRecognition = window.webkitSpeechRecognition = fake;
    const talk = async (ms = 900) => { await W(400); if (mic) { mic.g.gain.value = 0.3; await W(ms); mic.g.gain.value = 0; } };
    document.querySelectorAll(".line")[0].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    const p = $(".panel"), sp = p.__sp, msg = () => $(".panel .msg").textContent;
    const once = async h => { window.__heard = h; $(".panel [data-act=rec]").click(); talk(); await W(500); for (let k = 0; k < 120 && $(".panel [data-act=rec]").classList.contains("on"); k++) await W(100); for (let k = 0; k < 60 && !/\d+%/.test(msg()); k++) await W(100); await W(300); return msg(); };
    const say0 = sp._cur().say;
    let m = await once("어서 오세요 경복궁에 온 걸 환영해요");
    const hl = $(".panel .heardline");
    ok(/^100%/.test(m) && !m.includes(slow) && hl.querySelectorAll(".xtra").length === 1 && !hl.querySelector("mark.bad"), `말하기 창: 「${say0}」 + 뒤에 덧붙임 = 100% · 「천천히」 없음 · 들린 말에 회색 덧붙은 말`, `${m} · 「${hl.textContent}」`);
    m = await once("한국에 오신 걸 환영합니다 어서 오세요 경복궁에 온 걸 환영해요");
    ok(/^100%/.test(m) && !m.includes(slow), "말하기 창: 앞뒤 덧붙임(한 줄 통째) = 100% · 「천천히」 없음", m);
    m = await once("한국에 오신 걸 환영합니다 어서");
    ok(/^40%/.test(m), "말하기 창: 앞에 말 + 본보기 일부만 = 일부 점수(40%) 그대로", m);
    m = await once("고맙습니다 감사합니다 안녕히 계세요");
    ok(/^\d+%/.test(m) && parseInt(m) <= 40 && parseInt(m) === H.scoreOf(say0, ["계세요"]), "말하기 창: 엉뚱한 말 = 낮음(본보기와 같은 조각 「세요」만큼 — 그 조각만 말한 것과 같은 점수 · 부풀지 않음)", m);
    // ⑤ 비교 화면 — 토막 구간(win) + 토막 글만 · 덧붙은 말 칸 없음 · 모두 맞음
    const xw = window.__xwWin;
    if (xw?.win) { const S = sp._state; S.i = 2; sp._paint(); await W(300);
      S.blob = xw.blob; S.win = { blob: xw.blob, ...xw.win, text: xw.text }; S.score = 100; S.heardHTML = `<span class="lab">x:</span> <span class="ko" lang="ko">${H.heardHTML(sp._cur().say, xw.full).html}</span>`; sp._paint(); await W(200);
      const b = p.querySelector("[data-act=both]"); b.disabled = false; if (b.getAttribute("aria-pressed") === "true") { b.click(); await W(200); } b.click(); await W(2500);
      const C = window.__cmp, h = p.querySelector(".cmp");
      ok(sp._cur().say.includes("환영해요") && C && C.marks.every(x => x === "ok") && !C.extra.length && !C.cut && C.ysyl.every(x => x.s >= C.yLead - 0.05 && x.e <= C.yStop + 0.35) && h.scrollHeight <= h.clientHeight + 1,
        "비교 화면: 덧붙은 말이 있으면 토막 구간만(음절 칸 모두 맞음 · 덧붙은 회색 칸 없음 · 끊김 표시 없음 · 넘침 0)", `「${sp._cur().say}」 · 칸 ${C?.marks.join("")} · 덧붙음 ${C?.extra.length} · 내 줄 ${C?.yLead.toFixed(2)}~${C?.yStop.toFixed(2)}초 · 리듬 R ${C?.rh?.R?.toFixed(2)}`);
      b.click(); await W(300); }
    else ok(false, "비교 화면: ② 에서 토막 구간을 못 얻음");
    $(".panel [data-act=close]")?.click(); await W(500);
    // ④ 카드 「이제 말해 보세요」
    const li = [...document.querySelectorAll(".line")].findIndex(l => l.querySelector("[data-act=explain]"));
    document.querySelectorAll(".line")[li].querySelector("[data-act=explain]").click(); await W(1600);
    const rb = $(".panel .sayb [data-x=rec]");
    if (rb) { const tgt = ($(".panel .saybig")?.textContent || "").trim(), go = async h => { window.__heard = h; rb.click(); talk(); await W(500); for (let k = 0; k < 120 && rb.classList.contains("on"); k++) await W(100); for (let k = 0; k < 60 && !/\d+%/.test($(".panel .sayb .smsg").textContent); k++) await W(100); await W(400); return $(".panel .sayb .smsg").textContent; };
      let cm = await go(`여기는 서울이에요 ${tgt} 감사합니다`); const chl = $(".panel .sayb .heardline");
      ok(/^100%/.test(cm) && !cm.includes(slow) && chl.querySelectorAll(".xtra").length === 2, `카드 말해 보기: 앞뒤 덧붙임 + 「${tgt}」 = 100% · 「천천히」 없음 · 회색 덧붙은 말`, `${cm} · 「${chl.textContent}」`);
      cm = await go(tgt); ok(/^100%/.test(cm), "카드 말해 보기: 본보기만 = 100%", cm); }
    else ok(false, "카드 🎤 단추 없음");
    $(".panel [data-x=close], .panel [data-act=close]")?.click(); await W(400);
    // ⑥ 늦음(본부 10-11 단위 고침) — 가짜 마이크 = 진짜 본보기 소리(녹음 시작 순간부터) · 느리게 = WSOLA 늘이기(음높이 그대로) · 늦음은 녹음 소리 안 시각만
    delete window.__noRhythm;
    const ac = await ctxP, OC = new OfflineAudioContext(1, 44100, 44100), dec = async u => ac.decodeAudioData(await (await fetch(u)).arrayBuffer());
    const stretch = (mb, k) => { // 늘이기 k배(앞 조용한 곳 그대로 · ui_check_pace 와 같은 WSOLA)
      const sr = mb.sampleRate, x = mb.getChannelData(0), N = 1024, Hh = 256, s0 = 0.15, outDur = s0 + (mb.duration - s0) * k, inv = t => (t <= s0 ? t : s0 + (t - s0) / k);
      const L = Math.ceil(outDur * sr) + N, y = new Float32Array(L), ws = new Float32Array(L), w = Float32Array.from({ length: N }, (_, j) => 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
      const D = Math.round(0.01 * sr), at = i => (i >= 0 && i < x.length ? x[i] : 0); let prev = -1;
      for (let o = 0; o + N < L; o += Hh) { let ip = Math.round(inv((o + N / 2) / sr) * sr) - N / 2;
        if (prev >= 0) { const nat = prev + Hh; let best = -Infinity, bd = 0; for (let dl = -D; dl <= D; dl += 2) { let c = 0; for (let j = 0; j < N; j += 4) c += at(ip + dl + j) * at(nat + j); if (c > best) { best = c; bd = dl; } } ip += bd; }
        prev = ip; for (let j = 0; j < N; j++) { const q = ip + j; if (q >= 0 && q < x.length) y[o + j] += w[j] * x[q]; ws[o + j] += w[j]; } }
      const nb = OC.createBuffer(1, L, sr), z = nb.getChannelData(0); for (let i = 0; i < L; i++) z[i] = y[i] / Math.max(ws[i], 1e-3); return nb; };
    let feedG = null; window.__feed = null; const mrs0 = MediaRecorder.prototype.start;
    navigator.mediaDevices.getUserMedia = async () => { const dst = ac.createMediaStreamDestination(), g = ac.createGain(); g.connect(dst); feedG = g; return dst.stream; };
    MediaRecorder.prototype.start = function (...a) { const r = mrs0.apply(this, a); const b = window.__feed; if (b && feedG) { const src = ac.createBufferSource(); src.buffer = b; src.connect(feedG); src.start(); this.addEventListener("stop", () => { try { src.stop(); } catch {} }, { once: true }); } return r; };
    window.__xwKeepMrs = mrs0;
    const why = T("why_late"), pct = s => +((s.match(/^(\d+)%/) || [])[1] ?? -1);
    // 말하기 창 — 8번 줄 「줄 전체」(41음절 · 9.4초)
    const lineBuf = await dec(url("L01-00-01_08_line"));
    document.querySelectorAll(".line")[7].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
    { const p2 = $(".panel"), sp2 = p2.__sp, S2 = sp2._state; for (let k = 0; k < 12 && !sp2._cur().whole; k++) { S2.i = k; sp2._paint(); } await W(300);
      const msg = () => $(".panel .msg").textContent; window.__heard = sp2._cur().say;
      const spkL = async feed => { window.__feed = feed; $(".panel [data-act=rec]").click(); await W(800); const t0 = performance.now(); while (performance.now() - t0 < 45000 && $(".panel [data-act=rec]").classList.contains("on")) await W(150); for (let k = 0; k < 150 && !/^\d+%/.test(msg()); k++) await W(100); await W(800); return msg(); };
      const m1 = await spkL(lineBuf), r1 = S2.rhy ? `R ${S2.rhy.R.toFixed(2)}` : "리듬 없음";
      ok(sp2._cur().whole && pct(m1) >= 95 && !m1.includes(why) && !S2.late, "늦음: 말하기 창 「줄 전체」 보통 빠르기 = 감점 없음", `${pct(m1)}% · ${r1} · 늦음 ${S2.late}`);
      const m2 = await spkL(stretch(lineBuf, 2)), r2 = S2.rhy ? `글자 ${S2.rhy.L} · R ${S2.rhy.R.toFixed(2)}` : "리듬 없음";
      ok(pct(m2) >= 75 && pct(m2) <= 88 && m2.includes(why) && S2.late, "늦음: 말하기 창 「줄 전체」 2배 느림 = 약 80 + 「너무 늦게 읽었어요」", `${pct(m2)}% · ${r2} · 늦음 ${S2.late}`); }
    $(".panel [data-act=close]")?.click(); await W(500);
    // 카드 — 1번 줄 말해 보기(짧은 문장)
    { const li2 = [...document.querySelectorAll(".line")].findIndex(l => l.querySelector("[data-act=explain]")); document.querySelectorAll(".line")[li2].querySelector("[data-act=explain]").click(); await W(1600);
      const rb2 = $(".panel .sayb [data-x=rec]"), tgt = ($(".panel .saybig")?.textContent || "").trim(), clean = s => s.replace(/[^\p{L}\p{N}]/gu, "");
      const sk = Object.keys(al.items).find(k => /_say$/.test(k) && clean(al.items[k].text) === clean(tgt));
      if (rb2 && sk) { const sb = await dec(url(sk)), cm = () => $(".panel .sayb .smsg").textContent; window.__heard = tgt;
        const go = async feed => { window.__feed = feed; rb2.click(); await W(800); const t0 = performance.now(); while (performance.now() - t0 < 30000 && rb2.classList.contains("on")) await W(150); for (let k = 0; k < 150 && !/^\d+%/.test(cm()); k++) await W(100); await W(800); return cm(); };
        const c1 = await go(sb); ok(pct(c1) >= 95 && !c1.includes(why), `늦음: 카드 「${tgt}」 보통 빠르기 = 감점 없음`, `${pct(c1)}%`);
        const c2 = await go(stretch(sb, 2)), dur = (al.items[sk].syl.at(-1).e - al.items[sk].syl[0].s).toFixed(2);
        // 짧은 문장은 2배여도 여유(0.8초 + 칠 길이 15%) 안 = 감점 없음이 정의대로 · 3배 = 약 80
        const pe = 0.6 + 1.15 * +dur, lf2 = R.lateFactor(0.15 + 2 * +dur, pe * 1000);
        ok(!lf2.late ? pct(c2) >= 95 && !c2.includes(why) : pct(c2) >= 75 && pct(c2) <= 88 && c2.includes(why), `늦음: 카드 「${tgt}」 2배 느림 = 정의대로(짧은 문장 = 여유 안이라 감점 없음)`, `${pct(c2)}% · 본보기 ${dur}초 · 칠 끝 ${pe.toFixed(2)}초 · 여유 ${(0.8 + 0.15 * pe).toFixed(2)}초`);
        const c3 = await go(stretch(sb, 3));
        ok(pct(c3) >= 75 && pct(c3) <= 88 && c3.includes(why), `늦음: 카드 「${tgt}」 3배 느림 = 약 80 + 「너무 늦게 읽었어요」`, `${pct(c3)}%`);
      } else ok(false, "늦음: 카드 🎤 단추 또는 본보기 소리 없음", sk || "-");
      $(".panel [data-x=close], .panel [data-act=close]")?.click(); await W(400); }
    // 서버 받아쓰기 8초 — 안드로이드 · 녹음 먼저 → 가짜 서버(8초 뒤 답) · 보통 빠르기 = 감점 없음(응답 시간은 늦음에 안 들어감)
    { const URL0 = "https://stt.test.invalid", f0 = window.fetch, ua0 = Object.getOwnPropertyDescriptor(navigator, "userAgent"), su0 = window.__sttURL;
      window.fetch = (u, o = {}) => { if (!String(u).startsWith(URL0)) return f0(u, o); return new Promise((res2, rej) => { const sig = o.signal; sig?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")), { once: true }); setTimeout(() => res2(new Response(JSON.stringify({ text: " " + window.__heard + " ", words: [] }), { status: 200, headers: { "Content-Type": "application/json" } })), 8000); }); };
      Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36" });
      delete window.__noSeq; window.__sttURL = URL0; try { for (const k of ["malmun.srdev", "malmun.srdev.t", "malmun.sttnote"]) localStorage.removeItem(k); for (const k of ["malmun.srmode", "malmun.srfail", "malmun.srsrv", "malmun.srmiss"]) sessionStorage.removeItem(k); } catch {}
      try {
        document.querySelectorAll(".line")[7].querySelector("[data-act=speak]").click(); await W(1500); document.querySelector("video")?.pause();
        const p3 = $(".panel"), sp3 = p3.__sp, S3 = sp3._state; for (let k = 0; k < 12 && !sp3._cur().whole; k++) { S3.i = k; sp3._paint(); } await W(300);
        const msg = () => $(".panel .msg").textContent; window.__heard = sp3._cur().say; window.__feed = lineBuf;
        $(".panel [data-act=rec]").click(); await W(800); let t0 = performance.now(); while (performance.now() - t0 < 30000 && $(".panel [data-act=rec]").classList.contains("on")) await W(150);
        const tStop = performance.now(); for (let k = 0; k < 250 && !/^\d+%/.test(msg()); k++) await W(100); const wait = (performance.now() - tStop) / 1000; await W(800); const m3 = msg();
        ok(wait >= 7.5 && pct(m3) >= 95 && !m3.includes(why) && !S3.late, "늦음: 서버 받아쓰기 응답 8초 걸려도 감점 없음(녹음 소리 안 시각만)", `응답까지 ${wait.toFixed(1)}초 · ${pct(m3)}% · 늦음 ${S3.late} · ${S3.diag?.mode || ""}`);
        $(".panel [data-act=close]")?.click(); await W(500);
      } finally { window.fetch = f0; if (ua0) Object.defineProperty(navigator, "userAgent", ua0); else delete navigator.userAgent; window.__sttURL = su0; window.__noSeq = true; try { for (const k of ["malmun.srdev", "malmun.srdev.t", "malmun.sttnote"]) localStorage.removeItem(k); for (const k of ["malmun.srmode", "malmun.srfail", "malmun.srsrv"]) sessionStorage.removeItem(k); } catch {} } }
    MediaRecorder.prototype.start = mrs0; delete window.__xwKeepMrs; window.__feed = null;
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message + " " + (e.stack || "").split("\n")[1]); }
  if (window.__xwKeepMrs) { MediaRecorder.prototype.start = window.__xwKeepMrs; delete window.__xwKeepMrs; } window.__feed = null;
  navigator.mediaDevices.getUserMedia = keep.gum; navigator.mediaDevices.enumerateDevices = keep.en; window.SpeechRecognition = keep.SR; window.webkitSpeechRecognition = keep.wSR;
  if (keep.noR === undefined) delete window.__noRhythm; else window.__noRhythm = keep.noR; delete window.__xwWin; if (noSeq0 === undefined) delete window.__noSeq; else window.__noSeq = noSeq0;
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 덧붙은 말 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
