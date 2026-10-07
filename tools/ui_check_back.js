// 폰 뒤로 가기 점검(본부 10-07 「창을 열고 ✕ 를 몇 번 한 뒤 뒤로 → 앱 밖으로 나감」) — 아무 화면에서나 실행 · 소리 아주 작게
// ⓐ 목록 → 편 → 창 3종(설명·쓰기·말하기)을 각각 열고 ✕ 닫기 × 2번씩 섞은 뒤 뒤로 1번 = 목록 ⓑ 창 열린 채 뒤로 = 창만 닫힘(편 그대로) → 한 번 더 = 목록
// ⓒ 쓰기 창에도 ✕ 닫기 단추(글자 있음) · 쓰기·말하기 안에서 토막 옮기기는 뒤로 가기 칸을 안 쌓음
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001;
  const back = () => new Promise(r => { const f = () => { removeEventListener("popstate", f); setTimeout(r, 400); }; addEventListener("popstate", f); history.back(); setTimeout(r, 1500); });
  const open = async (act, li = 0) => { document.querySelectorAll(".line")[li].querySelector(`[data-act=${act}]`).click(); await W(1300); document.querySelector("video")?.pause(); };
  const close = async () => { const p = $(".panel"); const b = p?.querySelector("[data-act=close], [data-x=close]"); b?.click(); await W(500); return !!b; };
  try {
    location.hash = "#/list"; await W(800); location.hash = "#/learn/L01-00-01"; await W(2500);
    const closes = [];
    for (const act of ["explain", "write", "speak", "explain", "write", "speak"]) { await open(act, act === "speak" ? 1 : 0); closes.push(`${act}:${await close()}`); }
    const panelGone = !$(".panel") || $(".panel").hidden;
    await back();
    ok(location.hash === "#/list" && panelGone, "ⓐ 창 3종을 열고 ✕ 닫기 × 2번씩 뒤 뒤로 1번 = 목록(앱 밖으로 안 나감)", `${closes.join(" ")} · 지금 ${location.hash}`);
    location.hash = "#/learn/L01-00-01"; await W(2500);
    await open("write"); const wclose = $(".panel [data-act=close]"); const hasClose = !!wclose && /\p{L}|✕/u.test(wclose.textContent);
    const seg = $(".panel [data-seg='1']"); if (seg) { seg.click(); await W(400); }
    await back(); const stayed = location.hash.startsWith("#/learn/") && (!$(".panel") || $(".panel").hidden);
    await back();
    ok(stayed && location.hash === "#/list", "ⓑ 창 열린 채 뒤로 = 창만 닫힘(편 그대로) · 한 번 더 = 목록 · 토막 옮기기는 칸 안 쌓음", `첫 뒤로 뒤 편 그대로 ${stayed} · 지금 ${location.hash}`);
    ok(hasClose, "ⓒ 쓰기 창 머리 줄에 ✕ 닫기 단추", wclose?.textContent.trim() || "없음");
    // ⓓ 본부 순서(10-07): 처음 쓰는 학습자(도움말이 처음 뜸 → 「बन्द गर्न…」 글 눌러 닫기) · 탭 기록 50칸 꽉 참 · 빠르게 누름(✕ 바로 다음 창) → 뒤로 1번 = 목록
    { for (const k of ["malmun.sp.help", "malmun.v9tip", "malmun.fliptip", "malmun.modetip", "malmun.wtip"]) try { localStorage.removeItem(k); } catch {}
      for (let k = 0; k < 55; k++) history.pushState(null, "", location.href.split("#")[0] + "#/list"); // 기록 꽉 채움(같은 목록 주소)
      location.hash = "#/list"; await W(800); location.hash = "#/learn/L01-00-01"; await W(2500);
      const tipX = () => { const t = [...document.querySelectorAll(".panel .helpbox:not([hidden]) .x, .panel .helpbox:not([hidden])")][0]; t?.click(); };
      await open("explain"); tipX(); await W(300); $(".panel [data-x=close]")?.click();
      await open("write"); $(".panel [data-act=close]")?.click();
      document.querySelectorAll(".line")[1].querySelector("[data-act=speak]").click(); await W(1300); tipX(); await W(300); $(".panel [data-act=close]")?.click(); await W(700);
      const L0 = history.length; await back();
      ok(location.hash === "#/list", "ⓓ 처음 도움말 닫기 · 기록 50칸 꽉 참 · 빠르게 누름 → 뒤로 1번 = 목록", `기록 ${L0}칸 · 지금 ${location.hash} · 뒤로 기록 ${(JSON.parse(localStorage.getItem("malmun.navlog") || "[]")).slice(-4).join(" | ")}`); }
    location.hash = "#/learn/L01-00-01"; await W(2000);
  } catch (e) { res.push("✗ 점검 도중 오류: " + e.message); }
  const bad = res.filter(x => x.startsWith("✗")).length, out = `${bad ? "✗" : "✓"} 뒤로 가기 ${res.length - bad}/${res.length}\n` + res.join("\n");
  console.log(out); return out;
})();
