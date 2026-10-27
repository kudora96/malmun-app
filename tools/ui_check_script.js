// 글자 체계 어댑터 1단계 기준선 점검(쓰기부 10-27 · 작전표 004 G · 한글 감싸기 = 회귀 0) — #/learn/L01-00-01 · 지금 코드 결과를 기준선(tools/baseline_script.json · 감싸기 전 코드로 만듦)과 견줌
//  ⓐ 글자 쪼개기·조합(text.js: toJamoW·jamoParts·compose·vowelLen) ⓑ 획 자료·획 판정(strokesOf·fitPath·handScore × 완벽·2% 밀림·4% 밀림·4% 휨) ⓒ 쓰기 창 뼈대·자리(자판·손글씨·창 ⇄ 한국어) ⓓ 자판 줄
//  기준선 만들기: window.__makeBaseline = true 로 돌리면 "BASE:" + JSON 을 돌려줌(D:\malmun_work\webkit\baseline_script.js)
(async () => {
  const W = ms => new Promise(s => setTimeout(s, ms)), $ = s => document.querySelector(s), res = [], ok = (c, m, x = "") => res.push(`${c ? "✓" : "✗"} ${m}${x ? " · " + x : ""}`);
  window.__sfxVolume = 0.0001; const v = document.documentElement.dataset.v, make = !!window.__makeBaseline;
  const hs = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
  const T = await import(`/js/text.js?v=${v}`), out = {};
  const SAMPLE = [..."한글이어떻게생겼는지다음시간에배워요오늘반가웠어요만나요선생님저는안녕하세요여러분꿨쭤뷁읊닭앉없값괜쉐뒈훼와외위의"];
  // ⓐ 글자 쪼개기 · 조합
  out.jamo = hs(SAMPLE.map(c => T.toJamoW(c).join("")).join("|"));
  out.parts = hs([..."ㄱㄲㄳㄴㄵㄶㄷㄸㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅃㅄㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"].map(j => T.jamoParts(j).join("")).join("|"));
  out.compose = hs(SAMPLE.map(c => T.compose(T.toJamoW(c).flatMap(T.jamoParts), T.vowelLen(c))).join("") + SAMPLE.map(c => T.vowelLen(c)).join(""));
  out.composeOk = SAMPLE.filter(c => T.compose(T.toJamoW(c).flatMap(T.jamoParts), T.vowelLen(c)) === c).length + "/" + SAMPLE.length;
  // 쓰기 창 열기
  const keep = { lang: localStorage.getItem("malmun.lang"), mode: localStorage.getItem("malmun.wmode"), hm: localStorage.getItem("malmun.hmode") };
  const i18n = await import(`/js/i18n.js?v=${v}`); localStorage.setItem("malmun.lang", "ne"); if (i18n.lang !== "ne") await i18n.setLang("ne"); if (i18n.uiKoOn()) await i18n.setUiKo(false); /* 이미 같은 상태면 건드리지 않음(언어 글을 다시 받는 사이 langfit 이 null 을 읽는 것 피함) */ localStorage.setItem("malmun.hmode", "free"); localStorage.setItem("malmun.wlinetip", "2"); localStorage.setItem("malmun.wguide", "9");
  const LI = Math.min(1, document.querySelectorAll(".line").length - 1);
  const open = async mode => { localStorage.setItem("malmun.wmode", mode); document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click()); await W(300); document.querySelectorAll(".line")[LI].querySelector("[data-act=write]").click(); await W(2200); };
  const skel = () => [...document.querySelectorAll(".panel .scr.write *")].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName}.${typeof e.className === "string" ? e.className : ""}[${e.dataset.act || e.dataset.tool || e.dataset.j || ""}]${e.getAttribute("lang") || ""}${e.children.length ? "" : "|" + e.textContent.trim().slice(0, 12)} ${[r.x, r.y, r.width, r.height].map(Math.round).join(",")}`; }).join("\n");
  await open("kb"); out.skel_kb = hs(skel()); out.kb = hs([...document.querySelectorAll(".panel .kb .kr")].map(r => [...r.children].map(b => b.dataset.j + b.textContent).join("")).join("/")); out.kbRows = [...document.querySelectorAll(".panel .kb .kr")].length;
  await open("hand"); out.skel_hand = hs(skel());
  { const sc = $(".panel .scr.write"); sc.querySelector("[data-act=uiko]")?.click(); await W(700); out.skel_hand_ko = hs(skel()); sc.querySelector("[data-act=uiko]")?.click(); await W(500); }
  // ⓑ 획 자료 · 판정
  const wr = $(".panel .write").parentElement.__wr;
  { const fm = /^(\S+) (.*)$/.exec(wr.font()); if (fm) await document.fonts.load(`${fm[1]} 100px ${fm[2]}`, SAMPLE.join("")); await document.fonts.ready; await W(400); } /* 글꼴이 다 온 뒤에 잼(늦게 오면 획 마스크가 달라 가끔 해시가 달랐음) */
  const calc = async () => { const arr = [];
  for (const ch of SAMPLE.slice(0, 36)) { const L = await wr.strokesOf(ch), F = []; for (let i = 0; i < L.length; i++) F.push((await wr.fitPath(ch, i, "pen")).map(q => [q.x, q.y, 1]));
    const hor = S => Math.abs(S.at(-1)[0] - S[0][0]) >= Math.abs(S.at(-1)[1] - S[0][1]), mk = f => F.map((S, i) => Object.assign(f(S, i), { tool: "pen", w: 0.05 }));
    const shift = d => mk((S, i) => S.map(p => hor(S) ? [p[0], p[1] + d * (i % 2 ? 1 : -1), 1] : [p[0] + d * (i % 2 ? 1 : -1), p[1], 1])), bow = a => mk(S => S.map((p, q) => { const f = Math.sin(Math.PI * q / Math.max(1, S.length - 1)) * a; return hor(S) ? [p[0], p[1] - f, 1] : [p[0] - f, p[1], 1]; }));
    const sc = x => { const r = wr.handScore(ch, x, 300); return `${r.total}/${r.shapeP}/${r.lineP}/${r.pass ? 1 : 0}`; };
    arr.push(`${ch}:${L.length}:${L.map(s => s.jamo || "").join("")}:${F.map(S => S.length).join(",")}:${sc(mk(S => S))}:${sc(shift(0.02))}:${sc(shift(0.04))}:${sc(bow(0.04))}`); }
    return arr; };
  let sc2 = await calc(); { let base0 = null; try { base0 = (await (await fetch(`/tools/baseline_script.json?${Date.now()}`)).json()).sizes?.[`${innerWidth}x${innerHeight}`]?.strokes; } catch {} if (!make && base0 && hs(sc2.join(String.fromCharCode(10))) !== base0) { await W(1500); sc2 = await calc(); } } /* 가끔 한 번 어긋나는 것(글꼴·자료가 늦게 올 때) 피함 — 두 번 다 달라야 ✗ */
  out.strokes = hs(sc2.join("\n")); out.strokeN = sc2.length;
  localStorage.setItem("malmun.lang", keep.lang || "en"); if (i18n.lang !== (keep.lang || "en")) await i18n.setLang(keep.lang || "en"); keep.mode == null ? localStorage.removeItem("malmun.wmode") : localStorage.setItem("malmun.wmode", keep.mode); keep.hm == null ? localStorage.removeItem("malmun.hmode") : localStorage.setItem("malmun.hmode", keep.hm);
  document.querySelectorAll(".panel [data-act=close]").forEach(b => b.click());
  const SZ = `${innerWidth}x${innerHeight}`; if (make) return "BASE:" + JSON.stringify({ size: SZ, out, detail: sc2 });
  let base = null; try { base = (await (await fetch(`/tools/baseline_script.json?${Date.now()}`)).json()).sizes?.[SZ]; } catch {}
  if (!base) { ok(false, "이 창 크기의 기준선이 tools/baseline_script.json 에 없음 — 감싸기 전 코드로 먼저 만들어야 함"); }
  else for (const [k, label] of [["jamo", "ⓐ 글자 쪼개기(toJamoW)"], ["parts", "ⓐ 겹자모 나누기(jamoParts)"], ["compose", "ⓐ 자모 조합(compose·vowelLen)"], ["strokes", "ⓑ 획 자료·획 판정(완벽·2%·4% 밀림·4% 휨 × 36자)"], ["kb", "ⓓ 자판 글자·자리"], ["skel_kb", "ⓒ 쓰기 창 뼈대·자리(자판)"], ["skel_hand", "ⓒ 쓰기 창 뼈대·자리(손글씨)"], ["skel_hand_ko", "ⓒ 쓰기 창 뼈대·자리(손글씨 · 창 ⇄ 한국어)"]])
    ok(out[k] === base[k], `${label} = 기준선(감싸기 전)과 같음`, out[k] === base[k] ? "" : `지금 ${out[k]} · 기준 ${base[k]}`);
  ok(out.composeOk === `${SAMPLE.length}/${SAMPLE.length}` && out.kbRows >= 4, "ⓐ 조합이 글자로 되돌아감 · 자판 줄 4+", `${out.composeOk} · 줄 ${out.kbRows}`);
  const nb = res.filter(x => x.startsWith("✗")).length, o = `${nb ? "✗" : "✓"} 글자 체계 어댑터 기준선 ${res.length - nb}/${res.length}\n` + res.join("\n"); console.log(o); return o;
})();
