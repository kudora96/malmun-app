// 「따라 해 보세요」 양방향 — 갈래 재생기(대표님 10-21 · 설계 _hq/design_follow_along_interactive.md · 영상2팀 v5 반응 영상 표)
//  본 영상이 차례(pause)에 오면 멈춤(대기 앵커) → 겹친 <video> 2개 번갈아: 기다림 반복(I1~I3 · 무음 · 끊김 없이) + 🎤 듣기(vowel.js · 기기 안)
//  → 판정 → 가장 가까운 쉼 지점/끝 프레임에서 반응 영상(소리 켬) → 맞음(G) = 본 영상 resume 부터 · 틀림 = 고침 영상 → T1 → 다시 듣기(2번까지) · 세 번째도 = E1~E3 번갈아 → resume(자동)
//  자료: data/{편}/{편}.turns.json(영상2팀) + data/{편}/{편}.reactions.json(언어부 자막 {ID:{ko,en,ne…}}) · 영상 = video/{720|480}/react/{편}/{file}
//  없으면(자료·영상·마이크 거절·못 받음) = 아무것도 안 함 → 영상 속 4.5초 무음이 따라 할 시간(앱 밖과 같음)
import { MEDIA } from "./paths.js?v=1023.10";
import { startQ } from "./vq.js?v=1023.10";
import { listen, analyze, judge } from "./vowel.js?v=1023.10";

// 공개판 스위치(본부 10-21): 2편 진짜 반응 영상이 나올 때까지 주소 ?follow=1 일 때만(이 기기 기억 · ?follow=0 끔)
try { const f = new URLSearchParams(location.search).get("follow"); if (f === "1") localStorage.setItem("malmun.follow", "1"); else if (f === "0") localStorage.removeItem("malmun.follow"); } catch {}
export const followOn = () => { try { return localStorage.getItem("malmun.follow") === "1"; } catch { return false; } };
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const reactUrl = (ep, file, q) => `${MEDIA}/video/${q}/react/${ep}/${file}?v=1`;
const W = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => fetch(u, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);

// opts: { wrap(#vwrap), canRun() 차례를 해도 되나(영상 모드·이어 보기 중), onSub({id,ko,tr}|{listen:true,level}|null) 자막 칸, lang }
export async function setupTurns(ep, v, opts) {
  if (!followOn()) return null;
  const [T, I] = await Promise.all([getJSON(`data/${ep}/${ep}.turns.json`), getJSON(`data/${ep}/${ep}.reactions.json`)]);
  if (!T?.turns?.length || !T.reactions) return null;
  const q = startQ(), urls = new Map(); // id → objectURL(미리 받은 것)
  const files = { ...Object.fromEntries(Object.entries(T.reactions).map(([k, r]) => [k, r.file])), ...Object.fromEntries(Object.entries(T.waits || {}).map(([k, r]) => [k, r.file])) };
  let alive = true;
  (async () => { for (const [id, f] of Object.entries(files)) { if (!alive) return; try { const r = await fetch(reactUrl(ep, f, q)); if (r.ok) urls.set(id, URL.createObjectURL(await r.blob())); } catch {} } })(); // 편 열 때 미리 받기(작은 파일)
  const ready = () => Object.keys(files).every(id => urls.has(id));
  // 겹친 영상 2개(본 영상과 같은 자리·크기 · 평소 숨김)
  const mk = () => { const e = document.createElement("video"); e.className = "brv"; e.playsInline = true; e.preload = "auto"; e.hidden = true; opts.wrap.append(e); return e; };
  const AV = [mk(), mk()]; let front = -1;
  const show = (k) => { AV[k].hidden = false; if (front >= 0 && front !== k) AV[front].hidden = true; front = k; };
  const hideAll = () => { for (const e of AV) { e.pause(); e.hidden = true; } front = -1; };
  const load = (k, id, muted) => new Promise(res => { const e = AV[k]; e.muted = muted; e.src = urls.get(id); e.currentTime = 0; const ok = () => { e.removeEventListener("loadeddata", ok); res(true); }; e.addEventListener("loadeddata", ok); setTimeout(() => res(false), 1500); });
  // 한 영상을 끝(또는 stopAt)까지 틀고 기다림
  const playTo = (k, stopAt) => new Promise(res => {
    const e = AV[k], end = stopAt ?? e.duration; let done = false;
    const fin = () => { if (done) return; done = true; e.pause(); res(); };
    const tick = () => { if (done) return; if (e.currentTime >= end - 0.04 || e.ended) return fin(); e.requestVideoFrameCallback ? e.requestVideoFrameCallback(tick) : setTimeout(tick, 30); };
    e.addEventListener("ended", fin, { once: true }); show(k); e.play().catch(fin); tick(); turn.stopper = fin;
  });

  const turn = { busy: false, done: new Set(), abort: null, stopper: null, eIdx: 0 };
  const idleIds = T.idle || Object.keys(T.waits || {});
  async function runTurn(t) {
    turn.busy = true; const ac = new AbortController(); turn.abort = ac;
    v.pause(); try { v.currentTime = t.pause; } catch {}
    let tries = 0, k = 0, lastIdle = "";
    try {
      for (;;) {
        // ① 기다림 반복 + 듣기(동시에)
        opts.onSub?.({ listen: true, level: 0 });
        let result = null;
        const heard = listen({ maxMs: 4000, signal: ac.signal, onLevel: l => opts.onSub?.({ listen: true, level: l }) }).then(x => { result = judge(analyze(x), t.expect); }).catch(e => { result = { id: "MIC", err: e }; });
        while (!result && !ac.signal.aborted) {
          const id = idleIds.filter(x => x !== lastIdle)[Math.floor(Math.random() * Math.max(1, idleIds.length - 1))] || idleIds[0]; lastIdle = id;
          if (!(await load(k, id, true))) throw new Error("idle load");
          const rests = [...(T.waits?.[id]?.rests || []), AV[k].duration].filter(Number.isFinite).sort((a, b) => a - b);
          for (const r of rests) { await playTo(k, r); if (result || ac.signal.aborted) break; if (r < AV[k].duration - 0.05) continue; }
          k ^= 1;
        }
        await heard; if (ac.signal.aborted) return;
        opts.wrap.dataset.turnLast = `${result.id}${result.segs ? " " + result.segs.map(q => `${q.dur.toFixed(2)}s F1 ${Math.round(q.f1)} F2 ${Math.round(q.f2)}`).join(" | ") : ""}`; // 마지막 판정(진단·점검용 · 화면에 안 보임)
        if (result.id === "MIC") { pref("malmun.turnmic", "0"); break; } // 마이크 거절·없음 = 앞으로 차례 안 함
        // ② 반응 영상
        const id = result.id === "G" ? (tries ? "G3" : ["G1", "G2"][turn.done.size % 2]) : tries >= 2 ? `E${(turn.eIdx++ % 3) + 1}` : result.id;
        opts.onSub?.(null);
        if (urls.has(id) && (await load(k, id, false))) { opts.onSub?.({ id, ...(I?.[id] || {}) }); await playTo(k, T.reactions[id]?.cut); k ^= 1; }
        if (result.id === "G" || tries >= 2) break;
        tries++;
        if (urls.has("T1") && (await load(k, "T1", false))) { opts.onSub?.({ id: "T1", ...(I?.T1 || {}) }); await playTo(k, T.reactions.T1?.cut); k ^= 1; }
      }
    } catch {} finally {
      opts.onSub?.(null); hideAll(); turn.done.add(t.n); turn.busy = false; turn.abort = null;
      if (!ac.signal.aborted) { try { v.currentTime = t.resume ?? t.end; } catch {} v.play().catch(() => {}); }
    }
  }
  // 본 영상 시각 지켜보기 — 차례 pause 를 지나는 순간(앞으로 재생 중일 때만 · 한 번 한 차례는 그 재생에서 한 번)
  let lastT = v.currentTime;
  const onTime = () => {
    const now = v.currentTime, prev = lastT; lastT = now;
    if (turn.busy || v.paused || pref("malmun.turnmic") === "0" || !ready() || !opts.canRun()) return;
    const t = T.turns.find(x => prev < x.pause && now >= x.pause && now - prev < 1 && !turn.done.has(x.n));
    if (t) runTurn(t);
  };
  const onSeek = () => { lastT = v.currentTime; turn.done.clear(); }; // 손으로 옮기면 다시 할 수 있음
  v.addEventListener("timeupdate", onTime); v.addEventListener("seeking", onSeek);
  if (v.requestVideoFrameCallback) { const fr = () => { if (!alive) return; onTime(); v.requestVideoFrameCallback(fr); }; v.requestVideoFrameCallback(fr); } // 프레임마다 = 차례 자리에서 정확히 멈춤(timeupdate 는 0.25초 늦을 수 있음)
  return {
    busy: () => turn.busy,
    skip() { if (!turn.busy) return; turn.abort?.abort(); turn.stopper?.(); hideAll(); }, // ▶·◀▶·줄 누르기 = 이번 차례 그만(부른 쪽이 본 영상을 다룸)
    off() { alive = false; this.skip(); v.removeEventListener("timeupdate", onTime); v.removeEventListener("seeking", onSeek); for (const e of AV) { e.removeAttribute("src"); e.remove(); } for (const u of urls.values()) URL.revokeObjectURL(u); },
  };
}
