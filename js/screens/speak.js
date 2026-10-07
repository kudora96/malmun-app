// 말하기 — 따라 말하고 · 내 목소리를 다시 듣고 · 본보기와 얼마나 같은지 본다(10-01 투덜이 · 본부 전달)
//
// 학습자가 누르면 무엇이 되나
//  S1 과제 = 지금 줄의 토막(쓰기와 같은 고정 토막) 차례 → 줄 전체 → (있으면) 새 설명의 「이제 말해 보세요」 문장 · ◀ 1/4 ▶ 로 옮김
//  S2 [▶ 본보기] = 그 토막 소리(쓰기의 「이 부분 듣기」와 같은 소리) · 아래 큰 ▶ 도 같다
//  S8 줄의 마지막 과제를 통과하면 거기서 끝 — 다음 줄로 저절로 넘어가지 않는다 · [⬇] = 내 녹음을 파일로 · [?] = 사용법 풍선(처음 한 번은 저절로)
//  S3 [● 말하기] = 녹음 시작(처음 누를 때만 마이크 허락을 묻는다) → 말이 끝나고 1초 조용하면 저절로 멈춤 · 다시 눌러도 멈춤 · 길어도 8초
//     녹음 중에는 들어오는 소리 크기를 막대로 보여 준다 · 마이크가 안 열리면 다른 마이크로 자동으로 다시(블루투스가 붙었다 떨어지면 기본 마이크가
//     「장치가 제거됨」으로 안 열린다 — 10-01 투덜이 PC 실측) · 1.5초 동안 신호가 0 이면 다음 마이크로 저절로 바꿔 다시 녹음하고, 소리가 들어온
//     마이크를 기억한다 · 전부 0 일 때만 알리고 고르게 한다 · 🎤 로 언제든 직접 고를 수 있다 · 왜 안 되는지 말해 준다
//  S4 [▶ 내 목소리] = 방금(또는 저장해 둔) 내 말 · [비교] = 본보기 → 내 목소리 이어서
//  S5 점수 = 음성 인식이 되는 곳(크롬 등)에서 알아들은 글자와 대본의 닮음(자모 단위) % — 80% 넘으면 ✓ · 그 녹음을 저장 · 1.5초 뒤 다음 토막으로
//     못 넘어도 막지 않는다([다음 ▶]) · 음성 인식이 안 되는 곳은 점수 없이 듣고 비교만(녹음은 저장)
//  S6 녹음은 이 기기 안에만(IndexedDB) — 서버로 보내지 않는다
//  S7 영상 창 안(embedded): 스크롤 없이 · 줄 이동·닫기는 학습 화면이 한다 · 줄 전체까지 통과하면 다음 줄 말하기로
import { t, lang } from "../i18n.js?v=1007.84";
import { esc, sayParts } from "../text.js?v=1007.84";
import { episode } from "../data.js?v=1007.84";
import { paths } from "../paths.js?v=1007.84";
import { audioCtx, hold, quietWake } from "../wake.js?v=1007.84";
import * as sfx from "../sfx.js?v=1007.84";
import { diagEnv, keepDiag } from "../diag.js?v=1007.84";
import { playMine as playMineRec, keepFirstOf } from "../playmine.js?v=1007.84";
import { bestHeard, heardHTML, endHint } from "../heard.js?v=1007.84";
import { openCompare, playSlow, getRate, nextRate, rateLabel, setRateWord } from "../compare.js?v=1007.84";
import { rhythmOf, withRhythm, rhyText, upgradeSaved, keptScore, SCORE_V, paceOf, paintPace } from "../rhythm.js?v=1007.84";
import { recDel, downloadRec, askPersist } from "../recstore.js?v=1007.84";
import { logRec, dB, srWhy, srWatch, niceLabel, ALIAS } from "../recorder.js?v=1007.84";

// 통과 두 단계(본부 10-04 · 투덜이 「원어민은 되지만 외국인은 100% 어렵다」): 80↑ = ☆ 통과(✓ · [저장]) · 95↑ = ★ 완벽
export const PASS = 80, PERFECT = 95;
export const starOf = sc => (sc >= PERFECT ? "★" : sc >= PASS ? "☆" : "");
// 점수 한 줄 + 끝난 까닭(시간 다 됨 · 6초 말 없음 · 못 넘었는데 2초 쉼으로 끝남 — ■ 누름은 안내 없음)
// 끝난 까닭(본부 10-06): ⏱ 시간 다 됨은 그대로 · 2초 쉼(pause)은 문구에 안 씀 — 대신 들은 내용(hint = heard.js endHint)으로
// 시간 다 됨 · 끝까지 못 가고 오래 멈춤 = 「천천히 다시」 대신 「조금 더 빨리」(투덜이 10-07 — 긴 줄을 또박또박 읽다 끊김)
const fastLine = (sc, why, t, hint) => `${sc}% · ${t(why === "time" ? "why_time" : "why_pause_tail")}${hint?.kind === "tail" && hint.tail ? " · " + hintText(sc, t, hint).split(" — ")[0] : ""}`;
export const scoreLine = (sc, why, t, hint) => sc < PASS && (why === "time" || (why === "pause" && hint?.kind === "tail")) ? fastLine(sc, why, t, hint) : `${sc}%${sc >= PASS ? " ✓" : ""} · ${starOf(sc) ? starOf(sc) + " " : ""}${t(sc >= PERFECT ? "score_5" : sc >= PASS ? "score_4" : sc >= 60 ? "score_3" : sc >= 40 ? "score_2" : "score_1")}${why === "time" ? " · " + t("why_time") : (h => (h ? " · " + h : ""))(hintText(sc, t, hint))}`;
// 틀린 곳을 글로(본부 10-06 투덜이 결정) — 낱말은 한글 그대로 「」 · 로마자 켜짐이면 괄호에(있는 낱말만) · 2개까지 · 통과면 짧게
const romOn = () => { try { return localStorage.getItem("malmun.rom") !== "0"; } catch { return true; } };
const short = (w, n = 8) => { const a = [...String(w)]; let k = 0, i = 0; for (; i < a.length && k < n; i++) if (/[가-힣]/.test(a[i])) k++; return i < a.length ? a.slice(0, i).join("").trim() + "…" : w; };
export function hintText(sc, t, hint) {
  if (!hint) return "";
  const q = w => `「${w}」${romOn() && hint.rom?.[w] ? `(${hint.rom[w]})` : ""}`;
  if (hint.kind === "tail") return sc < PASS && hint.tail ? t("why_tail", { tail: q(short(hint.tail)) }) : ""; // 긴 뒷부분은 앞 몇 글자 + …(투덜이 10-07 — 문구가 너무 길어 겹침)
  if (hint.kind === "other") return sc < PASS ? t("why_other", { say: `「${short(hint.say || "")}」` }) : "";
  if (hint.kind !== "words") return "";
  const ws = hint.words, list = ws.slice(0, 2).map(x => q(x.w)).join("·");
  if (sc >= PASS) return t("why_polish", { ws: list });
  if (ws.length > 2) return t("why_many", { ws: list });
  const parts = ws.map(x => (x.h ? t("why_heard_as", { w: q(x.w), h: `「${short(x.h, 6)}」` }) : t("why_missing", { w: q(x.w) })));
  return `${parts.join(" · ")} — ${t("why_redo", { ws: list })}${hint.restOk ? " " + t("why_rest_ok") : ""}`;
}
// 시간 규칙(본부 10-04 · 투덜이 승인): 말 사이 쉼 2초 · 🎤 뒤 6초 안에 말 없으면 끝 · 최대 길이 = max(8, 3 + 0.8 × 음절)초
const QUIET_MS = 2000, START_MS = 6000;
export const maxMsFor = say => Math.max(8000, (3 + 0.8 * [...String(say || "")].filter(c => /[가-힣]/.test(c)).length) * 1000);

// ── 닮음 = 음절 정렬(js/score.js · 「들린 말」 빨간 표시와 같은 함수 — 본부 10-04) ──
import { similarity } from "../score.js?v=1007.84";
import { scoreFx } from "../scorefx.js?v=1007.84"; // 점수별 효과(본부 10-05)
export { similarity };

// ── 내 목소리 저장(S6) ──
const db = () => new Promise((res, rej) => {
  const r = indexedDB.open("malmun", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("rec");
  r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); res(d); }; r.onerror = () => rej(r.error); // 지우기·판 올림이 오면 바로 놓아 줌 — 안 놓으면 그 뒤 여는 것이 모두 멈춤(본부 10-04 빈 말하기 창)
});
// 저장소가 막히거나 늦어도(허락 묻는 중 · 사생활 창 · 미리보기 창) 화면을 붙잡지 않게 — 1.5초 안에 못 읽으면 「저장 없음」으로(본부 10-04: 빈 말하기 창)
const late = (p, ms = 1500) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
export const recGet = key => late(recGet0(key));
const recGet0 = async key => { try { const d = await db(); return await new Promise(res => { const q = d.transaction("rec").objectStore("rec").get(key); q.onsuccess = () => { d.close(); res(q.result || null); }; q.onerror = () => { d.close(); res(null); }; }); } catch { return null; } };
export const recPut = async (key, val) => { try { const d = await db(); await new Promise(res => { const tx = d.transaction("rec", "readwrite"); tx.objectStore("rec").put(val, key); tx.oncomplete = tx.onerror = () => { d.close(); res(); }; }); } catch {} };

// 단추 글 = 기호(◀ ▶ ? ✕) + 글 — 좁으면 글만 숨김(머리 줄 한 줄 유지)
const lbl = s => { const m = String(s).match(/^([^\p{L}\p{M}\p{N}]*)(.*?)([^\p{L}\p{M}\p{N}]*)$/u); return m ? `${m[1] ? `<i class="ic">${esc(m[1].trim())}</i>` : ""}<span class="lt">${esc(m[2])}</span>${m[3] ? `<i class="ic">${esc(m[3].trim())}</i>` : ""}` : esc(s); };
export default async function speak(app, ep, id, opts = {}) {
  const d = await episode(ep, lang);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  setRateWord(t("speed"));
  const line = d.lines[li];
  const lineSrc = line.lineAudio ? paths.audio(ep, line.lineAudio) : null;
  const romMap = Object.fromEntries([...(line.v9?.pieces || []).map(p => [p.ko, p.rom]), ...Object.entries(line.v9?.gloss || {}).map(([k, g]) => [k, g.rom])].filter(([k, r]) => k && r)); // 틀린 낱말 옆 로마자(있는 것만)
  const parts = (line.units?.parts || []).map(p => ({ key: p.id, text: p.text, say: p.say, src: paths.unit(ep, p.id) }));
  if (parts.length !== 1) parts.push({ key: `${ep}_${String(line.id).padStart(2, "0")}_line`, text: line.ko, say: line.ko, src: lineSrc, whole: true });
  else Object.assign(parts[0], { whole: true });
  // 「이제 말해 보세요. "…"」 과제 — 새 설명이 주는 문장(낱말 하나 바꾼 말)이 있으면 맨 끝에(잠정 필드 subtitles[].say{ko, audio})
  if (line.say) parts.push({ key: `${ep}_${String(line.id).padStart(2, "0")}_say`, text: line.say.ko, say: line.say.ko, src: line.say.src || (line.say.audio ? paths.audio(ep, line.say.audio) : null), task: true });
  if (opts.task === "say" && line.say) parts.startAt = parts.length - 1; // 설명의 「이제 말해 보세요」에서 들어오면 그 과제부터
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const st = { i: parts.startAt || 0, rec: null, stream: null, blob: null, score: null, saved: {}, busy: false, model: false, alive: true, mine: null };
  const savedReady = Promise.all(parts.map(async p => { const k = `${ep}/${p.key}`; st.saved[p.key] = await upgradeSaved(await recGet(k), { ep, key: p.key, url: p.src, text: p.say || p.text }, v => recPut(k, v)); })); // 옛 판(리듬 없음) 저장본은 새 점수로 // 기다리지 않고 먼저 그린다 — 다 읽으면 다시 그림

  app.innerHTML = `<section class="scr speak ${opts.embedded ? "embedded" : ""}">
    <div class="whead"><b>${esc(t("speak"))}</b><span class="sub">${li + 1} / ${d.lines.length}<span class="spk"> · <span class="ko" lang="ko">${esc(line.speaker)}</span></span></span>
      <button class="micpick" data-act="help" aria-label="${esc(t("help"))}">${lbl(t("help_btn"))}</button><span class="segnav"></span><button class="micpick closex" data-act="close" aria-label="${esc(t("close_btn"))}">${lbl(t("close_btn"))}</button></div>
    <div class="miclist" hidden></div>
    <div class="helpbox" hidden>${[1, 2, 3, 4, 5, 6].map(k => `<p>${esc(t("help_sp_" + k))}</p>`).join("")}<p class="x">${esc(t("help_close"))}</p></div>
    <div class="task"><div class="say ko" lang="ko"></div><div class="tr"></div></div>
    <div class="meter"><div class="lvl" hidden><i></i></div><div class="sbar"><i></i><em style="left:${PASS}%"></em></div><div class="tbar" hidden><i></i><em class="pace" hidden></em><span class="tt"></span></div><div class="msgw"><div class="msg" aria-live="polite"></div><span class="fx" aria-hidden="true"></span></div><div class="heardline"></div><div class="keeprow"><button data-act="keep" title="${esc(t("keep"))}" hidden>${esc(t("keep_short"))}</button><button data-act="savedplay" title="${esc(t("saved_title"))}" hidden>${esc(t("saved_play"))}</button><span class="mini"><button data-act="savedl" title="${esc(t("download"))}" hidden>⬇ ${esc(t("dl_short"))}</button><button data-act="savedel" title="${esc(t("del_one"))}" hidden>🗑 ${esc(t("del_short"))}</button></span></div><button class="micname" data-act="pick" hidden></button></div>
    <div class="cmp" hidden></div>
    <div class="sbtns">
      <span class="mcol"><button data-act="model">▶ ${esc(t("model"))}</button><button class="mrate" data-act="mrate" aria-label="${esc(t("speed"))}">${esc(rateLabel(getRate("m")))}</button></span>
      <button class="mic" data-act="rec"><span class="dot"></span><span class="lab">${esc(t("speak_now"))}</span></button>
      <button data-act="mine" disabled>▶ ${esc(t("my_voice"))}</button>
      <button data-act="both" disabled>${esc(t("compare"))}</button>
    </div>
  </section>`;
  const $ = s => app.querySelector(s);
  const cur = () => parts[st.i];
  // 도움말 풍선 = 칸 안에 다 보이게(본부 10-07 · 스크롤 0) — 넘치면 글을 조금씩 작게(최소 0.6배)
  const fitHelp = () => { const hb = $(".helpbox"); if (!hb || hb.hidden) return; const ps = [...hb.children]; ps.forEach(x => x.style.removeProperty("zoom")); for (let z = 0.95; z >= 0.6 && hb.scrollHeight > hb.clientHeight; z -= 0.05) ps.forEach(x => (x.style.zoom = z.toFixed(2))); };
  new ResizeObserver(() => fitHelp()).observe($(".helpbox"));
  // 머리 줄은 한 줄(본부 10-06 — 375×667 에서 「✕ बन्द」가 둘째 줄로 떨어짐) — 넘치면 h1: 단추 글 숨김(◀ ▶ ? ✕ 만) → h2: 제목 옆 「· 화자」 숨김
  function fitHead() { const h = $(".whead"); if (!h) return; h.classList.remove("h1", "h2"); for (const c of ["h1", "h2"]) { if (h.scrollWidth <= h.clientWidth + 1) break; h.classList.add(c); } }
  new ResizeObserver(() => fitHead()).observe($(".whead"));
  // [तुलना] = 비교 화면(파형 두 줄 + 음절 칸 · js/compare.js) — 다시 누르면 원래 말하기 화면 · 토막을 바꾸거나 🎤 를 누르면 닫음
  let cmp = null;
  const closeCmp = () => { cmp?.close(); cmp = null; $(".cmp").hidden = true; app.querySelector(".scr").classList.remove("cmpon"); $("[data-act=both]").setAttribute("aria-pressed", "false"); };
  const heardOf = () => { const x = document.createElement("div"); x.innerHTML = st.heardHTML || ""; x.querySelectorAll(".lab, mark.miss").forEach(e => e.remove()); return (x.querySelector(".ko")?.textContent || "").trim(); };
  async function openCmp() {
    stopSounds(); closeCmp();
    const p = cur(), b = mineBlob(); if (!b || !p.src) return;
    app.querySelector(".scr").classList.add("cmpon"); $(".cmp").hidden = false; $("[data-act=both]").setAttribute("aria-pressed", "true");
    const c = await openCompare($(".cmp"), { ep, key: p.key, url: p.src, text: p.say || p.text, blob: b, heard: heardOf(), why: st.blob === b ? st.whyEnd : null, t, onRate: () => paint() });
    if (!$(".scr").classList.contains("cmpon")) return c.close();
    cmp = c;
  }
  // [내 목소리] = 이번에 통과한 녹음 또는 예전에 통과해 저장된 녹음만(못 넘은 녹음은 안 들려줌 — 투덜이 10-04) · 음성 인식이 없는 기기는 방금 녹음
  // [내 목소리] = 방금 녹음(잘됐든 못됐든 · 투덜이 10-04) · 80% 넘으면 [저장] 단추 → 눌러야 저장 · 저장한 것은 「저장됨 ▶」로 따로
  const savedRec = () => st.saved[cur().key] || null;
  const mineBlob = () => st.blob || null;

  function paint() {
    if (!st.rec && !st.starting) quietWake(false); // 녹음이 끝나면 깨우기 소리 다시
    const p = cur(), sv = st.saved[p.key];
    $(".say").innerHTML = [...String(p.text)].map(ch => `<span>${esc(ch)}</span>`).join(""); // 글자마다(녹음 중 속도 안내 칠 — 본부 10-07)
    // 「말해 보기」 과제 = 카드와 같게 로마자(작게 · 로마자 꺼지면 숨김) + 뜻(학습자 언어) — 괄호 없음(본부 10-05)
    const sp = p.task ? sayParts(line.v9?.text?.[lang]?.say) : null, romOn = (() => { try { return localStorage.getItem("malmun.rom") !== "0"; } catch { return true; } })();
    $(".tr").innerHTML = p.whole ? esc(line.tr || "") : sp ? `${romOn && sp.rom ? `<span class="trrom">${esc(sp.rom)}</span>` : ""}${esc(sp.mean)}` : "";
    // 긴 과제(줄 전체)는 창 안에 들어갈 때까지 글자를 줄인다 — 스크롤 없이(S7)
    $(".segnav").innerHTML = parts.length > 1
      ? `<button data-seg="-1" ${st.i ? "" : "disabled"} aria-label="${esc(t("previous"))}">${lbl(t("prev_btn"))}</button><span>${st.i + 1}/${parts.length}${sv?.score >= PASS ? " ✓" : ""}</span><button data-seg="1" ${st.i < parts.length - 1 ? "" : "disabled"} aria-label="${esc(t("next"))}">${lbl(t("next_btn"))}</button>` : "";
    fitHead();
    const sc = st.score ?? null; // 점수는 이번에 말한 뒤에만(열 때 예전 점수를 보이지 않음 — ✓ 는 토막 번호 옆에)
    $(".sbar i").style.width = (sc ?? 0) + "%";
    $(".meter").classList.toggle("pass", sc != null && sc >= PASS);
    // 점수는 언제나 % — 알아듣지 못했으면 「0% · 까닭」(투덜이 10-04)
    $(".msg").textContent = st.rec ? t(!st.ready ? "mic_opening" : st.switched ? "mic_switched" : "listening") : st.kept ? `${sc}% ✓ · ${starOf(sc)} ${t(st.kept)}` : st.note ? `0% · ${t(st.whyEnd === "nospeech" ? "why_nospeech" : st.note)}` : st.micErr && sc == null && !mineBlob() ? st.micErr : sc == null ? (SR ? t(mineBlob() ? "no_score" : "speak_hint") : t(mineBlob() ? "no_score" : "speak_hint_noscore"))
      : scoreLine(sc, st.whyEnd, t, st.hint); // 점수에 맞는 한마디 + 끝난 까닭·틀린 곳(들은 내용으로)
    if (!st.rec && st.rhy && sc != null && !st.note && st.rhy.L >= PASS) $(".msg").textContent += " · " + rhyText(st.rhy, t); // 근거: 글자 % · 리듬 % · 가장 많이 깎인 곳
    $("[data-act=mine]").disabled = $("[data-act=both]").disabled = !mineBlob();
    $("[data-act=keep]").hidden = !(sc != null && sc >= PASS && mineBlob() && !st.kept); // 80% 넘으면 [저장]
    $("[data-act=savedplay]").hidden = $("[data-act=savedl]").hidden = $("[data-act=savedel]").hidden = !savedRec()?.blob;
    $("[data-act=savedplay]").classList.toggle("oldscore", !!savedRec()?.old); // 다시 못 잰 옛 점수 = 흐리게
    if (savedRec()?.blob) $("[data-act=savedplay]").textContent = t("saved_short", { n: `${starOf(savedRec().score)} ${savedRec().score ?? ""}`.trim() }); // 저장된 것도 점수 보이게
    $(".heardline").innerHTML = !st.rec && st.heardHTML ? st.heardHTML : ""; // 들린 말(틀린 음절 빨간 밑줄 · 빠진 자리 _)
    $(".mic").classList.toggle("on", !!st.rec);
    $(".mic .lab").textContent = st.rec ? (st.ready ? t("btn_stop") : "… " + t("mic_opening")) : "🎤 " + t("speak_now"); // 준비 중 → 마이크에 실제 소리가 들어오면 녹음 중 · 카드처럼 「🎤 बोल्नुहोस्」
    $("[data-act=model]").setAttribute("aria-pressed", String(st.model));
    { const r = getRate("m"), mb = $("[data-act=mrate]"); mb.textContent = rateLabel(r); mb.setAttribute("aria-pressed", String(r !== 1)); }
    fitTask(); // 결과 문구·들은 말까지 다 넣은 뒤에 잼(투덜이 10-07 — 긴 결과 문구가 아래를 밀어 과제 글이 머리 줄·막대와 겹침)
  }
  // 긴 과제(줄 전체)·긴 결과 문구 = 창 안에 들어갈 때까지 줄인다 — 스크롤·겹침 없이(S7)
  //  과제 글 26 → 15px → 번역 줄 접기(아래 말풍선에 있다) → 결과 문구 13 → 11px → 과제 글 14 → 11px
  function fitTask() {
    const say = $(".say"), task = $(".task"), tr = $(".tr"), msg = $(".msg"), over = () => task.scrollHeight > task.clientHeight + 1;
    say.style.fontSize = ""; tr.hidden = false; msg.style.fontSize = "";
    for (let fs = 26; over() && fs >= 15; fs -= 1) say.style.fontSize = fs + "px";
    if (over()) tr.hidden = true;
    for (let fs = 12.5; over() && fs >= 11; fs -= 0.5) msg.style.fontSize = fs + "px";
    for (let fs = 14; over() && fs >= 11; fs -= 1) say.style.fontSize = fs + "px";
  }
  new ResizeObserver(() => st.alive && fitTask()).observe($(".task"));
  function stopSounds() { sfx.stopAll(); st.slow?.pause(); st.slow = null; st.model = false; if (st.mine) { st.mine.pause(); st.mine = null; } }
  async function playModel() {
    stopSounds(); st.model = true; paint();
    const p = cur(), r = getRate("m");
    if (r !== 1 && (p.src || lineSrc)) { const h = (st.slow = playSlow(p.src || lineSrc, r)); await h.done; if (st.slow === h) st.slow = null; } // 본보기 속도(1× 아니면 · 음높이 그대로)
    else if (!(p.src && (await sfx.play(p.src))) && lineSrc && p.src !== lineSrc && !p.task) await sfx.play(lineSrc);
    st.model = false; if (st.alive) paint();
  }
  const playMine = async (rec = { blob: mineBlob() }, key = "mine") => { // 말 시작 자리부터 — 풀어서 그 자리부터 직결 재생(js/playmine.js · <audio> 자리 옮기기 안 씀)
    const b = rec?.blob; if (!b) return;
    stopSounds();
    const h = (st.mine = playMineRec(b, { keepFirst: keepFirstOf(cur().say || cur().text) })); st.mineKey = key; // 어느 단추의 소리인지(재생 중 칠 표시용)
    await h.done; if (st.mine === h) st.mine = null;
  };
  function go(i) { closeCmp(); stopRec(true); stopSounds(); st.rhy = null; st.i = Math.max(0, Math.min(parts.length - 1, i)); st.blob = null; st.score = null; st.note = null; st.kept = null; st.heardHTML = ""; scoreFx($(".fx"), null); paint(); }

  // ── 녹음 + 음성 인식(S3 · S5) ── 10-04 되돌림: 10-01 잘 되던 판(a9e13f9) 그대로 · 남긴 차이는 「◆」 표시(본부 10-04)
  let sr = null, srErr = null, heard = [], quietTimer = 0, maxTimer = 0, meterTimer = 0;
  // 마이크 열기 — 고른 마이크 → 기본 → 나머지 차례로(하나가 안 열려도 다음 것으로)
  // ◆ 윈도우 별칭 장치(default · communications)는 기억도 고르기도 안 함 — 통신 장치를 열면 윈도우가 다른 소리를 줄인다(10-04)
  const micPref = v => { try { if (v === undefined) { const p = localStorage.getItem("malmun.mic"); return p && !ALIAS(p) ? p : null; } if (v && !ALIAS(v)) localStorage.setItem("malmun.mic", v); else if (!v) localStorage.removeItem("malmun.mic"); } catch { return null; } };
  // 날소리로 녹음(본부 10-04) — 크롬 기본값(에코 제거·잡음 억제·자동 크기)이 말 도중 소리를 뚝뚝 끊었다 · 말하기 연습 녹음은 날소리가 맞다(녹음 중엔 앱이 소리를 안 틂)
  const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  const openOne = c => Promise.race([navigator.mediaDevices.getUserMedia({ audio: { ...(c === true ? {} : c), ...RAW } }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 8000))]);
  // 크롬의 「기본」은 윈도우 기본 마이크가 아닐 수 있다(크롬이 따로 고른다 — 10-01 투덜이 PC: 소리가 0 인 블루투스가 잡힘).
  // 그래서 열어 보고 소리가 0 이면 그 마이크를 dead 에 적고 다음 마이크로 넘어간다 · 소리가 들어온 마이크는 기억한다.
  const dead = new Set();
  const devId = s => s?.getAudioTracks()[0]?.getSettings().deviceId || "";
  const closeMic = () => { st.stream?.getTracks().forEach(x => x.stop()); st.stream = null; };
  async function openMic() {
    if (st.stream?.getAudioTracks()[0]?.readyState === "live") return st.stream;
    st.stream = null;
    let last = null, devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId && !ALIAS(x.deviceId)).map(x => x.deviceId); } catch {} // ◆
    const tries = [...new Set([micPref() || true, true, ...devs])];
    for (const c of tries) {
      if (dead.has(c)) continue;
      try {
        const s = await openOne(c === true ? true : { deviceId: { exact: c } });
        if (dead.has(devId(s)) || (c === true && ALIAS(devId(s)) && devs.length)) { s.getTracks().forEach(x => x.stop()); continue; } // 이름만 다른 같은 마이크 · ◆ 별칭이면 실제 장치로
        st.micReq = c;
        return (st.stream = s);
      } catch (e) {
        last = e;
        if (e.name === "NotAllowedError" || e.name === "SecurityError") break; // 허락을 안 한 것 — 다른 장치로 해도 같다
      }
    }
    throw last || Object.assign(new Error("silent"), { name: "SilentError" }); // 열리는 마이크마다 소리가 0
  }
  const micWhy = e => t(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "mic_denied" : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "mic_none" : "mic_busy");
  async function showMics(note) {
    const box = $(".miclist");
    if (!box.hidden && !note) { box.hidden = true; return; }
    let devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === "audioinput" && x.deviceId && !ALIAS(x.deviceId)); } catch {}
    // 작은 펼침 — 맨 위 「✕ 닫기」 · 지금 마이크에 ✓ · 하나 고르면 닫힘 · 바깥 누르기·Esc·뒤로 가기로도 닫힘(본부 10-04)
    box.innerHTML = `<button class="mclose" data-act="micclose">${esc(t("close_list"))}</button>` + (note ? `<p>${esc(note)}</p>` : "") + (devs.length ? devs.map((d, k) => { const on = [micPref(), devId(st.stream)].includes(d.deviceId); return `<button data-mic="${esc(d.deviceId)}" aria-pressed="${on}">${on ? "✓ " : ""}${esc(niceLabel(d.label) || t("mic_pick") + " " + (k + 1))}</button>`; }).join("") : `<p>${esc(t("mic_none"))}</p>`);
    if (box.hidden) { box.hidden = false; opts.navPush?.("mics"); }
  }
  function closeMics(fromNav) { const box = $(".miclist"); if (!box || box.hidden) return false; box.hidden = true; if (!fromNav) opts.navPop?.(); return true; }
  const onEsc = e => { if (e.key === "Escape" && closeMics()) e.stopPropagation(); };
  document.addEventListener("keydown", onEsc, true);
  // ◆ 지금 쓰는 마이크 이름 한 줄(자동이 틀렸을 때만 눌러서 바꿈)
  function showMicName() { const b = $(".micname"), l = niceLabel(st.stream?.getAudioTracks()[0]?.label); if (b && l) { b.textContent = `🎤 ${l} ✓`; b.hidden = false; } }
  // 녹음 시간 막대(🎤 아래) — 차오름 + 「0:04 / 0:12」 · 남은 시간 20% 아래면 주황
  const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  // 녹음 시간 막대(투덜이 10-07 「시간 바가 있어야 더 빨리 읽어야 하는 걸 앎」) — 굵게 · 남은 초 · 멈추면 「n초 뒤 끝나요」 · 본보기 음절 시각 ×1.15(÷본보기 속도) 안내선 + 위 문장 글자를 그 시각대로 칠(rhythm.js paceOf)(점수와 상관없음)
  function tickBar(el, max, quietMs = 0) {
    const b = $(".tbar"); if (!b) return;
    b.hidden = false; b.firstElementChild.style.width = Math.min(100, (100 * el) / max) + "%";
    b.classList.toggle("low", el > max * 0.8); b.classList.toggle("quiet", quietMs > 400);
    const pace = st.pace, pl = b.querySelector(".pace"); if (pl) { pl.hidden = !pace; if (pace) pl.style.left = Math.min(100, (100 * pace.end) / max) + "%"; }
    b.querySelector(".tt").textContent = quietMs > 400 ? t("quiet_left", { s: Math.max(0, (QUIET_MS - quietMs) / 1000).toFixed(1) }) : `⏱ ${mmss(el)} / ${mmss(max)} · ${t("time_left", { s: Math.max(0, Math.ceil((max - el) / 1000)) })}`;
    if (pace) paintPace($(".say").children, pace, el); // 본보기 음절 시각대로(본부 10-07)
  }
  const clearPace = () => { for (const c of $(".say")?.children || []) c.classList.remove("pace"); };
  async function startRec(switched) {
    stopSounds();
    st.switched = !!switched;
    $(".msg").textContent = t("mic_opening");
    try { await openMic(); st.micErr = ""; }
    catch (e) {
      // 거절·막힘 안내는 다시 그려도 남게 st.micErr 에 붙듦(본부 10-04 · 창은 그대로 · 본보기 듣기는 됨)
      if (e.name === "SilentError") { dead.clear(); $(".msg").textContent = st.micErr = t("mic_silent"); showMics(t("mic_silent")); }
      else $(".msg").textContent = st.micErr = micWhy(e);
      return;
    }
    if (!st.alive) return;
    const rec = new MediaRecorder(st.stream), chunks = [];
    scoreFx($(".fx"), null); st.rec = rec; st.ready = false; st.score = null; st.note = null; st.kept = null; heard = []; srErr = null;
    st.diag = { t0: performance.now(), sr: [], track: false, peak: 0, mic: st.stream.getAudioTracks()[0]?.label || "" }; // ◆ 진단
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    // 녹음이 저절로 멈춤(stopRec 안 거침) = 「cut」 + 그때 마이크 트랙 상태를 진단에(투덜이 10-07 r8 — 까닭 안내 없이 끊김)
    rec.onstop = () => { if (st.rec === rec) { st.why = "cut"; st.diag.cut = st.stream?.getAudioTracks()[0]?.readyState || "?"; st.rec = null; clearTimeout(maxTimer); clearInterval(meterTimer); st.srOver?.(); } finish(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
    rec.start();
    // 음성 인식 — continuous + 중간 결과 · 녹음하는 바로 그 트랙으로 · 녹음이 끝날 때까지 혼자 end 되면 같은 트랙으로 다시(진단 restart@ · 본부 10-04)
    // 인식에는 녹음 트랙의 「복사본」을 줌(투덜이 10-07 r8 허락) — 크롬 인식이 말 한 덩이를 끝내며(speechend → audioend) 받은 트랙을 꺼 버려 녹음까지 3~4초에 끊기던 것
    //  인식이 끝나면 새 복사본으로 다시 켜고 들은 말은 이어 붙임 · 녹음 끝은 앱 규칙만(■ · 2초 쉼 · 최대 시간)
    let srOff = false, srAt = 0, over = false, srTrack = null; const dropSrTrack = () => { try { srTrack?.stop(); } catch {} srTrack = null; };
    st.srOver = () => { over = true; const t = srTrack; srTrack = null; setTimeout(() => { try { t?.stop(); } catch {} }, 2500); }; // 마지막 결과가 올 틈을 두고 끔
    const startSR = () => {
      if (over || srOff) return;
      if (!SR) return;
      let r; try { r = new SR(); } catch { return; }
      r.lang = "ko-KR"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
      r.onresult = e => {
        const rs = Array.from(e.results, x => Array.from(x));
        for (const x of rs) for (const a of x) heard.push(a.transcript);
        if (rs.length > 1) heard.push(rs.map(x => x[0].transcript).join(" "));
      };
      r.onerror = e => { srErr = e.error || "error"; if (/not-allowed|audio-capture/.test(srErr)) srOff = true; };
      r.onend = () => { if (over || srOff || sr !== r) return; st.diag.sr.push(`restart@${Math.round(performance.now() - st.diag.t0)}`); setTimeout(startSR, performance.now() - srAt < 1000 ? 200 : 0); };
      srWatch(r, st.diag.t0, st.diag.sr);
      sr = r; srAt = performance.now();
      dropSrTrack(); const tr = st.stream.getAudioTracks()[0];
      try { srTrack = tr?.clone?.() || null; r.start(srTrack || tr); st.diag.track = srTrack ? "clone" : true; } catch { dropSrTrack(); try { r.start(); } catch {} }
    };
    startSR();
    // 말이 끝나고 1초 조용하면 멈춤
    try {
      const ctx = audioCtx(), src = ctx.createMediaStreamSource(st.stream), an = ctx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize); let spoke = false, quietAt = 0, peak = 0, noise = 0, kept = false, liveMs = 0, lastT = ctx.currentTime, lastAt = Date.now();
      const DEAD_MS = switched ? 2500 : 1500; // 마이크를 바꾼 직후에는 소리 장치가 자리 잡을 시간을 더 준다(블루투스가 통화 모드로 바뀌며 잠깐 끊긴다)
      const lvl = $(".lvl"); lvl.hidden = true; // ◆ 첫 소리가 들어오면 보임(준비 중 → 녹음 중)
      const timer = (meterTimer = setInterval(() => {
        // 소리 엔진이 실제로 돌아간 시간만 센다 — 엔진이 멈춰 있으면(새로 고친 직후 · 장치가 바뀌는 중) 산 마이크도 0 으로 보인다
        const now = Date.now(); if (ctx.state === "running" && ctx.currentTime > lastT) liveMs += now - lastAt; else if (ctx.state !== "running") ctx.resume().catch(() => {});
        lastT = ctx.currentTime; lastAt = now;
        an.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        peak = Math.max(peak, rms); st.diag.peak = Math.max(st.diag.peak, rms);
        if (!st.ready && rms > 0 && st.rec === rec) { st.ready = true; lvl.hidden = false; paint(); showMicName(); } // ◆
        lvl.firstElementChild.style.width = Math.min(100, Math.round(rms * 500)) + "%"; // 들어오는 소리 크기
        // 바꿔서 연 마이크에 신호가 있으면(말하기 전이라도) 기억 — 다음에는 죽은 마이크를 다시 거치지 않는다
        if (st.switched && !kept && peak >= 0.0002 && liveMs > DEAD_MS) { kept = true; micPref(devId(st.stream) || (st.micReq !== true && st.micReq) || ""); }
        // 말소리 기준 = 방 소음의 3배(0.004~0.02) — 투덜이 10-07: 마이크 최대가 −31~−34dB(0.02~0.028)라 고정 0.02 면 조금 작게 말해도 「조용」 → 2초 뒤 끊김
        if (!spoke && rms < 0.02) noise = noise ? noise * 0.9 + rms * 0.1 : rms;
        const thr = Math.min(0.02, Math.max(0.004, noise * 3)); st.diag.noise = noise; st.diag.thr = thr; // 진단(끝난 까닭 옆에)
        if (rms > thr && !spoke) micPref(devId(st.stream) || (st.micReq !== true && st.micReq) || ""); // 소리가 들어온 마이크를 기억
        if (rms > thr) { spoke = true; quietAt = 0; } else if (spoke) { quietAt ||= Date.now(); if (Date.now() - quietAt > QUIET_MS) { st.why = "pause"; st.diag.quiet = Date.now() - quietAt; stopRec(); } }
        if (!spoke && performance.now() - st.diag.t0 > START_MS) { st.why = "nospeech"; stopRec(); } // 🎤 뒤 6초 말 없음
        tickBar(performance.now() - st.diag.t0, st.maxMs, spoke && quietAt ? Date.now() - quietAt : 0);
        // 1.5초 동안 신호가 아예 0 이면(꺼진 마이크 · 소리 없는 블루투스 — 조용한 방의 산 마이크는 0 이 아니다) 다음 마이크로 바꿔 다시 녹음
        if (!spoke && peak < 0.0002 && liveMs > DEAD_MS) { dead.add(st.micReq); if (devId(st.stream)) dead.add(devId(st.stream)); stopRec(true); closeMic(); startRec(true); }
      }, 60));
      rec.addEventListener("stop", () => { clearInterval(timer); // 내 것만 끈다 — 마이크를 바꿔 새로 시작한 녹음의 것을 끄면 안 된다
        try { src.disconnect(); } catch {} }, { once: true });
    } catch {}
    st.maxMs = maxMsFor(cur().say); st.why = "stop";
    maxTimer = setTimeout(() => { st.why = "time"; stopRec(); }, st.maxMs);
    // 따라 읽기 칠 = rhythm.js paceOf · 최대 길이 = max(지금 식, 본보기 × 2 + 2초)(투덜이 10-07 허락 — 긴 줄 또박또박이면 빠듯)
    st.pace = null; { const p = cur(), u = p.src || lineSrc, t0 = st.diag.t0, myRec = st.rec; if (u) sfx.load(u).then(async b => { if (!b || st.rec !== myRec) return; const pc = await paceOf({ ep, key: p.src ? p.key : `${ep}_${String(line.id).padStart(2, "0")}_line`, text: p.text, rate: getRate("m"), buf: b }); if (st.rec === myRec) st.pace = pc;
      const m2 = Math.max(st.maxMs, b.duration * 2000 + 2000); if (m2 > st.maxMs) { st.maxMs = m2; clearTimeout(maxTimer); maxTimer = setTimeout(() => { st.why = "time"; stopRec(); }, Math.max(0, m2 - (performance.now() - t0))); } }).catch(() => {}); }
    paint();
  }
  function stopRec(discard) {
    clearTimeout(maxTimer); clearInterval(meterTimer);
    const lv = $(".lvl"); if (lv) lv.hidden = true;
    const rec = st.rec; if (!rec) return;
    st.rec = null;
    if (discard) rec.onstop = null;
    st.srOver?.(); try { sr?.stop(); } catch {}
    try { rec.state !== "inactive" && rec.stop(); } catch {}
    paint();
  }
  async function finish(blob) {
    st.whyEnd = st.why; const tb = $(".tbar"); if (tb) tb.hidden = true; clearPace();
    st.blob = blob; st.kept = null; st.hint = null; // 방금 녹음(원본 그대로) — 언제나 [내 목소리]로
    if (sr) { // 인식 결과가 조금 늦게 온다 — 그동안 「확인 중…」
      if (!heard.length) $(".msg").textContent = t("checking");
      for (let k = 0; k < 20 && !heard.length; k++) await new Promise(r => setTimeout(r, 100));
      st.score = heard.length ? Math.max(...heard.map(h => similarity(cur().say, h))) : null;
      if (st.score == null) { st.note = srWhy(srErr); st.score = 0; } // 못 알아들음 = 0% + 까닭
      st.hint = (h => h && { ...h, say: cur().say, rom: romMap })(endHint(cur().say, heard)); // 끝난 까닭·틀린 곳 문구용(들은 내용) — 점수는 그대로
      const bh = bestHeard(cur().say, heard); // 점수를 낸 그 들은 말 → 본보기와 견줘 보여 줌
      st.heardHTML = bh ? (({ html, ok }) => `<span class="lab">${esc(t("heard_label"))}:</span> <span class="ko" lang="ko">${html}</span>${ok ? " ✓" : ""}`)(heardHTML(cur().say, bh)) : ""; // 까닭(마이크를 못 잡음 · 인터넷 · 허락 · 못 알아들음)
    } else st.score = null;
    if (!st.alive) return;
    const p = cur(), old = st.saved[p.key];
    // 리듬(투덜이 10-06 허락) — 글자 점수 × 리듬 배수 · 본보기 음절 시각(align.json)이 있을 때만 · 근거는 결과 줄에 「글자 % · 리듬 %」
    st.rhy = null;
    if (sr && heard.length && st.score > 0) { const rh = await rhythmOf({ ep, key: p.key, url: p.src, text: p.say || p.text, blob, heard: bestHeard(p.say, heard) }); if (!st.alive) return; if (rh) { st.rhy = { L: st.score, R: rh.R, worst: rh.worst }; st.score = withRhythm(st.score, rh.R); } }
    if (st.diag) { const env = await diagEnv(); logRec({ where: "speak", why: st.whyEnd, cut: st.diag.cut, quiet: st.diag.quiet, thrDb: dB(st.diag.thr || 0), noiseDb: dB(st.diag.noise || 0), line: line.id, part: p.key, want: p.say, mic: st.diag.mic, track: st.diag.track, sr: st.diag.sr, sec: Math.round(performance.now() - st.diag.t0) / 1000, maxDb: dB(st.diag.peak), heard: [...new Set(heard)], score: st.score, ...env, playingAtStart: !!st.playingAtStart }); keepDiag(blob, { where: "speak", why: st.whyEnd, cut: st.diag.cut, line: line.id, part: p.key, score: st.score, heard: [...new Set(heard)] }); } // 진단(화면에 안 보임) — 녹음 소리도 malmun_diag 에 마지막 3개
    // 저장은 자동이 아님 — 80% 넘으면 [저장] 단추가 나오고 학습자가 누른다(투덜이 10-04) · 저절로 다음 토막으로 넘기지도 않는다(저장할 틈)
    paint();
    if (sr && heard.length) scoreFx($(".fx"), st.score, { busy: () => !!st.rec }); // 점수가 뜨는 순간 효과 한 번 · 말소리 없음(못 알아들음)은 효과 없음
  }
  app.__sp = { closeList: () => closeMics(true), toggle: () => (st.model ? (stopSounds(), paint()) : playModel()), busy: () => !!st.rec || st.model || sfx.playing(), _finish: finish, _state: st, _cur: () => cur(), _paint: () => paint() };

  app.querySelector(".scr").onclick = async e => {
    if (!$(".helpbox").hidden) { $(".helpbox").hidden = true; if (e.target.closest("[data-act=help], .helpbox")) return; } // 풍선은 아무 데나 누르면 닫힘
    if (!$(".miclist").hidden && !e.target.closest(".miclist, [data-act=pick]")) { closeMics(); return; } // 마이크 목록 바깥 누르기 = 닫기
    const sg = e.target.closest("[data-seg]");
    if (sg) return go(st.i + +sg.dataset.seg);
    const mc = e.target.closest("[data-mic]");
    if (mc) { // 마이크 고르기 → 기억하고 다음 녹음부터 그 마이크
      micPref(mc.dataset.mic); dead.clear();
      stopRec(true); closeMic();
      closeMics(); $(".msg").textContent = t("mic_chosen");
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "pick") { stopRec(true); if (closeMics()) return; return showMics(); }
    if (a === "micclose") { closeMics(); return; }
    if (a === "close") { stopRec(true); closeMics(); if (opts.onClose) opts.onClose(); else location.hash = `#/learn/${ep}/${line.id}`; return; } // ✕ 닫기 — 녹음 중이면 버리고
    if (a === "help") { stopRec(true); closeMics(); $(".helpbox").hidden = false; return; }
    if (a === "keep") { // [저장] — 더 높거나 같은 점수면 바꿔 끼움
      const p = cur(), old = st.saved[p.key];
      if (!st.blob || !(st.score >= PASS)) return;
      if (st.score >= keptScore(old)) { st.saved[p.key] = { blob: st.blob, score: st.score, at: Date.now(), scoreV: SCORE_V, letter: st.rhy?.L ?? st.score, R: st.rhy?.R ?? null }; recPut(`${ep}/${p.key}`, st.saved[p.key]); st.kept = "kept"; askPersist(); }
      else st.kept = "kept_better";
      return paint();
    }
    if (a === "savedl") { const sv = savedRec(); if (sv?.blob) downloadRec(sv.blob, `malmun_${cur().key}_${sv.score ?? ""}`); return; } // 원본 그대로 파일로
    if (a === "savedel") { // 이 녹음만 지우기 — 한 번 묻고
      if (!savedRec() || !confirm(t("del_one_q"))) return;
      stopSounds(); recDel(`${ep}/${cur().key}`); delete st.saved[cur().key]; st.kept = null; paint(); $(".msg").textContent = t("deleted");
      return;
    }
    if (a === "mrate") { const nv = nextRate("m"); paint(); app.querySelector(".cmp .crow.m [data-rate]")?.replaceChildren(rateLabel(nv)); return; } // 본보기 속도(비교 화면 본보기 줄과 같은 값 · 기억)
    if (a === "savedplay") { stopRec(true); playMine(savedRec(), "savedplay"); return; }
    if (a === "model") { stopRec(true); st.model ? (stopSounds(), paint()) : playModel(); }
    else if (a === "rec") { if (st.starting) return; closeCmp(); if (!st.rec) { st.playingAtStart = sfx.playing() || st.model || !!st.mine; st.heardHTML = ""; quietWake(true); } /* 진단 · 녹음하는 동안 깨우기 소리 멈춤 */ st.rec ? stopRec() : (st.starting = true, startRec().finally(() => { st.starting = false; if (!st.rec) quietWake(false); })); } // 마이크를 여는 동안 또 눌러도 하나만(빠르게 여러 번 누름)
    else if (a === "mine") { stopRec(true); playMine(); }
    else if (a === "both") { stopRec(true); cmp || $(".scr").classList.contains("cmpon") ? (stopSounds(), closeCmp()) : openCmp(); }
  };

  // 「재생 중 = 칠」(투덜이 10-06) — 소리가 나오는 동안만 그 단추를 칠함(본보기·내 목소리·저장본 같은 모양) · 비교 차례 재생 땐 지금 나오는 쪽으로 옮겨 감 · 표시만
  const litT = setInterval(() => {
    const row = app.querySelector(".cmp:not([hidden]) .crow.on"), cmpOn = row ? (row.classList.contains("m") ? "model" : "mine") : "";
    const mineOn = !!(st.mine && !st.mine.paused);
    const on = { model: st.model || cmpOn === "model", mine: (mineOn && st.mineKey === "mine") || cmpOn === "mine", savedplay: mineOn && st.mineKey === "savedplay" };
    for (const k in on) $(`[data-act=${k}]`)?.classList.toggle("playing", !!on[k]);
  }, 100);
  paint();
  savedReady.then(() => { if (st.alive) paint(); }); // 저장된 ✓·「저장됨 ▶」은 읽히는 대로
  try { if (!localStorage.getItem("malmun.sp.help")) { localStorage.setItem("malmun.sp.help", "1"); $(".helpbox").hidden = false; } } catch {} // 처음 한 번은 풍선이 저절로
  sfx.preload([lineSrc, ...parts.map(p => p.src)]);
  const release = hold();
  return () => { st.alive = false; clearInterval(litT); closeCmp(); stopRec(true); stopSounds(); st.stream?.getTracks().forEach(x => x.stop()); release(); quietWake(false); document.removeEventListener("keydown", onEsc, true); delete app.__sp; };
}
