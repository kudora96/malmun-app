// 비교 화면 글자 겹침 전수 점검(본부 10-07 투덜이 「긴 줄 음절 글자가 겹쳐 못 읽음」) — #/learn/L01-00-01 을 연 채로, 크기마다 한 번 실행 · 소리는 아주 작게
// 1~15번 모든 토막 × 내 목소리 두 가지: ⓐ 본보기 mp3 그대로(말 길이 같음) ⓑ 투덜이 실제 녹음 r1~r3(tools/_rec · 깃에 안 올림 · 차례로 돌려 씀)
//  ⓑ 는 「우리도 읽을 수 있어요」(1.6초) 녹음이라 본보기 말 길이의 0.5~2배인 토막만 겹침을 셈(긴 줄에 1.6초 녹음 = 40음절이 화면 1/5 에 몰림 — 실제로 없는 경우) · 나머지는 참고로 셈만
//  들은 말 = 본보기 글에서 둘째 음절만 「저」(틀린 글자 표시까지 봄)
// 확인: 줄마다 보이는 글자 상자(음절 칸 또는 낱말 칸)끼리 겹침 0 · 글자 크기 10~15px(낱말 칸 안 글자는 9px 까지) · 낱말 칸이 된 토막 목록 보고
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), res = [], bad = [], words = [], sizes = [];
  window.__sfxVolume = 0.0001;
  const isSyl = c => c >= "가" && c <= "힣";
  const blobs = []; for (const f of ["r1", "r2", "r3"]) { const r = await fetch(`/tools/_rec/${f}.webm`); if (r.ok) blobs.push(await r.blob()); }
  if (!blobs.length) return "✗ tools/_rec/r1~r3.webm 없음";
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1; // 1px 닿는 것까지는 겹침 아님
  let n = 0, skip = 0;
  try {
    const lines = document.querySelectorAll(".line");
    for (let li = 0; li < lines.length; li++) {
      const sb = lines[li].querySelector("[data-act=speak]"); if (!sb) continue;
      sb.click(); await W(1200);
      const p = document.querySelector(".panel"); if (!p?.__sp) { res.push(`✗ ${li + 1}번 말하기 안 열림`); continue; }
      for (let si = 0; si < 30; si++) {
        const S = p.__sp._state, want = p.querySelector(".task .say").textContent.replace(/[?.!,]/g, "").trim();
        let j = 0; const heard = [...want].map(c => (isSyl(c) && ++j === 2 ? "저" : c)).join("");
        const mblob = await (await fetch(p.__sp._cur().src)).blob();
        for (const mode of ["ⓐ", "ⓑ"]) {
        S.blob = mode === "ⓐ" ? mblob : blobs[n % blobs.length]; S.heardHTML = `<span class="ko">${heard}</span>`; n++;
        const b = p.querySelector("[data-act=both]"); window.__cmp = null; // 이미 열려 있으면 첫 누름은 닫힘 → 한 번 더
        for (let t = 0; t < 2 && !window.__cmp; t++) { b.disabled = false; b.click(); for (let k = 0; k < 20 && !window.__cmp; k++) await W(100); }
        await W(350); const c = window.__cmp; c?.stopPlay(); if (!c) { bad.push(`${mode} ${li + 1}번 비교 안 열림`); continue; }
        const seg = `${mode} ${li + 1}번 ${p.querySelector(".segnav > span")?.textContent.replace(/\s*✓/, "") || "1/1"} 「${want}」`;
        const mLen = c.msyl[c.msyl.length - 1].e - c.msyl[0].s, yLen = c.yStop - c.yLead, real = mode === "ⓐ" || (yLen >= mLen * 0.5 && yLen <= mLen * 2);
        if (!real) { skip++; continue; }
        let ov = 0; const ovr = new Set();
        p.querySelectorAll(".cmp .csyl").forEach(row => {
          const wd = row.classList.contains("words"), tx = [...row.querySelectorAll(wd ? ".wcel .tx" : ".cel .tx")].map(x => x.getBoundingClientRect()).filter(r => r.width);
          for (let i = 0; i < tx.length; i++) for (let k = i + 1; k < tx.length; k++) if (hit(tx[i], tx[k])) { ov++; ovr.add(row.closest(".crow").classList.contains("m") ? "본보기" : "내"); }
          const fs = [...row.querySelectorAll(wd ? ".wcel .tx" : ".cel .tx")].map(x => parseFloat(getComputedStyle(x.querySelector(".got") || x).fontSize)), lo = Math.min(...fs);
          sizes.push(lo); if (lo < (wd ? 9 : 10) - 0.01) bad.push(`${seg} 글자 ${lo}px`);
          if (wd) words.push(`${seg} ${row.closest(".crow").classList.contains("m") ? "본보기" : "내"} 줄 ${lo}px`);
        });
        if (ov) bad.push(`${seg} 겹침 ${ov}(${[...ovr].join("·")} 줄)`);
        }
        const nx = p.querySelector(".segnav [data-seg='1']"); if (!nx || nx.disabled) break;
        nx.click(); await W(500);
      }
      p.querySelector("[data-act=close]").click(); await W(700);
    }
  } catch (e) { bad.push("점검 도중 오류: " + e.message); }
  res.unshift(`${bad.length ? "✗" : "✓"} ${innerWidth}x${innerHeight} 비교 글자 겹침 0 · 비교 ${n - skip}번(ⓑ 말 길이 안 맞아 뺀 것 ${skip}) · 가장 작은 글자 ${Math.min(...sizes)}px · 낱말 칸 ${words.length}줄`);
  res.push(...bad.map(x => "✗ " + x), ...words.map(x => "· 낱말 칸: " + x));
  const out = res.join("\n"); console.log(out); return out;
})();
