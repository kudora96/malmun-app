// 말하기 결과 화면 겹침 전수 점검(투덜이 10-07 「일부러 이상하게 말했더니 문구가 겹쳐 나옴 — 절대 겹치면 안 됨」) — #/learn/L01-00-01 을 연 채로 크기마다 실행 · 소리 없음
// 1~15번 모든 토막 × 결과 다섯 가지(긴 뒷부분 못 들음 · 엉뚱한 말 · 낱말 둘 틀림 · 통과+리듬 · 못 알아들음)를 화면에 그려
// 머리 줄 · 과제 글 · 번역 · 막대 · 결과 문구 · 들은 말 · 저장 줄 · 단추 줄 상자끼리 겹침 0 · 과제 칸 넘침 0 · 창 스크롤 0
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), bad = [], small = [];
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  let n = 0;
  try {
    const lines = document.querySelectorAll(".line");
    for (let li = 0; li < lines.length; li++) {
      lines[li].querySelector("[data-act=speak]")?.click(); await W(1100);
      const p = document.querySelector(".panel"); if (!p?.__sp) { bad.push(`${li + 1}번 말하기 안 열림`); continue; }
      for (let si = 0; si < 30; si++) {
        const S = p.__sp._state, c = p.__sp._cur(), say = c.say || c.text, syl = [...say].filter(x => /[가-힣]/.test(x)).join(""), half = say.slice(Math.floor(say.length / 3));
        const cases = [
          { score: 18, whyEnd: "pause", hint: { kind: "tail", tail: half, say }, heard: say.slice(0, 6), rhy: { L: 19, R: 0.74, worst: { k: 0, ch: syl[0], kind: "long" } } },
          { score: 12, whyEnd: "pause", hint: { kind: "other", say }, heard: "아 그 뭐더라 음 잘 모르겠어요 다시 해 볼게요 어어", rhy: null },
          { score: 55, whyEnd: "pause", hint: { kind: "words", words: [{ w: say.split(" ")[0], h: "엉뚱한말이길게들림" }, { w: say.split(" ").slice(-1)[0], h: "" }], restOk: true }, heard: say, rhy: { L: 55, R: 0.6, worst: { k: 1, ch: syl[1] || syl[0], kind: "pause" } } },
          { score: 96, whyEnd: "", hint: { kind: "words", words: [{ w: say.split(" ")[0], h: "저" }] }, heard: say, rhy: { L: 100, R: 0.8, worst: { k: 2, ch: syl[2] || syl[0], kind: "stutter" } } },
          { score: 0, note: "why_noword", whyEnd: "nospeech", heard: "" }];
        for (const x of cases) {
          Object.assign(S, { score: x.score, whyEnd: x.whyEnd, hint: x.hint ? { ...x.hint, rom: {} } : null, note: x.note || null, kept: null, rec: null, rhy: x.rhy, heardHTML: x.heard ? `<span class="lab">x:</span> <span class="ko">${x.heard}</span>` : "" });
          p.__sp._paint(); await W(60); n++;
          const task = p.querySelector(".task"), box = s => [...p.querySelectorAll(s)].filter(e => !e.hidden && e.offsetHeight && e.offsetWidth).map(e => ({ s, r: e.getBoundingClientRect() }));
          const B = [".whead", ".task .say", ".task .tr", ".sbar", ".msg", ".heardline", ".keeprow", ".sbtns"].flatMap(box), pr = p.getBoundingClientRect(), tag = `${li + 1}번 ${p.querySelector(".segnav > span")?.textContent.replace(/\s*✓/, "") || "1/1"} ${x.score}%`;
          const ov = []; for (let i = 0; i < B.length; i++) for (let k = i + 1; k < B.length; k++) if (hit(B[i].r, B[k].r)) ov.push(`${B[i].s}×${B[k].s}`);
          const out = B.filter(b => b.r.top < pr.top - 1 || b.r.bottom > pr.bottom + 1).map(b => b.s);
          if (ov.length || out.length || task.scrollHeight > task.clientHeight + 1 || p.scrollHeight > p.clientHeight + 1) bad.push(`${tag} 겹침 ${ov.join(",") || 0} · 밖 ${out.join(",") || 0} · 과제 넘침 ${task.scrollHeight - task.clientHeight} · 창 ${p.scrollHeight - p.clientHeight} · 「${p.querySelector(".msg").textContent.slice(0, 60)}」`);
          const fs = parseFloat(getComputedStyle(p.querySelector(".say")).fontSize); if (fs < 13) small.push(`${tag} 과제 글 ${fs}px`);
        }
        Object.assign(S, { score: null, hint: null, rhy: null, heardHTML: "", note: null }); p.__sp._paint();
        const nx = p.querySelector(".segnav [data-seg='1']"); if (!nx || nx.disabled) break;
        nx.click(); await W(350);
      }
      p.querySelector("[data-act=close]").click(); await W(500);
    }
  } catch (e) { bad.push("점검 도중 오류: " + e.message); }
  const out = [`${bad.length ? "✗" : "✓"} ${innerWidth}x${innerHeight} 말하기 결과 겹침 0 · ${n}화면${small.length ? ` · 13px 아래 ${small.length}` : ""}`, ...bad.map(x => "✗ " + x), ...small.slice(0, 5).map(x => "· " + x)].join("\n");
  console.log(out); return out;
})();
