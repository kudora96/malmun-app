// 서버 받아쓰기(2안 · 본부 10-10 설계 · design/stt_server_memo.md) — 녹음 파일 하나를 Cloudflare Worker「stt」에 보내 글 + 낱말 시각을 받음
//  주소 STT_URL = "" 이면 꺼짐(지금 앱 그대로) · 점검은 window.__sttURL 로 바꿔 끼움 · 경로 POST {주소}/stt
//  본문 = 녹음 blob 그대로(Content-Type = blob.type) · 머리 칸 X-Dev = 기기 번호(localStorage malmun.devid · 기기당 하루 상한용)
//  최대 12초 기다림 · 실패(비2xx·429·12초·네트워크·빈 글)는 code 를 붙여 던짐 → recorder.js 가 지금 방식(받아쓰기만)으로
import { t } from "./i18n.js?v=1012.10";

export const STT_URL = "https://stt.kudora96.workers.dev"; // 배포 뒤 Worker 주소를 여기에(예: "https://stt.<계정>.workers.dev") — worker/stt/DEPLOY.md
export const sttURL = () => (window.__sttURL === "off" ? "" : String(window.__sttURL || STT_URL || "").trim().replace(/\/+$/, "")); /* "off" = 점검에서 서버 길 끔(진짜 서버 안 부름) */
export const sttReady = () => /^https?:\/\/[^/]+/.test(sttURL()); // 주소가 없으면 서버 길은 아예 안 씀
const WAIT_MS = 20000; // 첫 요청이 느린 기기(갤럭시 6.2초)·느린 망 — 20초까지(본부 10-12)

export function deviceId() {
  try {
    let id = localStorage.getItem("malmun.devid");
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) { id = crypto.randomUUID?.() || (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)); localStorage.setItem("malmun.devid", id); }
    return id;
  } catch { return "nostore-" + Math.random().toString(36).slice(2, 12); }
}

const fail = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

// blob → { text, words:[{w,s,e}], ms } · 실패 = throw { code: aborted | timeout | network | http429 | http500 … | empty | nourl }
// Worker 「Server-Timing: up;dur=… , ai;dur=… , total;dur=…」 → { up, ai, total }(ms · 본부 10-12)
const timingOf = r => { const h = r?.headers?.get?.("Server-Timing") || "", o = {}; for (const m of h.matchAll(/(\w+);dur=([\d.]+)/g)) o[m[1]] = Math.round(+m[2]); return o.total != null ? o : null; };
export async function serverSTT(blob, { signal } = {}) {
  if (!sttReady()) throw fail("nourl");
  if (!blob) throw fail("noblob");
  if (signal?.aborted) throw fail("aborted");
  const ac = new AbortController(), t0 = performance.now(); let why = "";
  const tm = setTimeout(() => { why = "timeout"; ac.abort(); }, WAIT_MS);
  const onAbort = () => { why = why || "aborted"; ac.abort(); };
  signal?.addEventListener?.("abort", onAbort, { once: true });
  try {
    let r;
    try { r = await fetch(sttURL() + "/stt", { method: "POST", body: blob, headers: { "Content-Type": blob.type || "audio/webm", "X-Dev": deviceId() }, signal: ac.signal, cache: "no-store", credentials: "omit" }); }
    catch { throw fail(why || "network"); }
    const tmg = timingOf(r);
    let j = null; try { j = await r.json(); } catch { if (why) throw fail(why, { tm: tmg }); }
    if (!r.ok) throw fail("http" + r.status, { status: r.status, msg: j?.error || "", tm: tmg });
    const text = String(j?.text || "").trim();
    if (!text) throw fail("empty", { status: r.status, tm: tmg });
    const words = Array.isArray(j?.words) ? j.words.filter(x => x && typeof x.w === "string").map(x => ({ w: x.w, s: +x.s || 0, e: +x.e || 0 })) : [];
    return { text, words, ms: Math.round(performance.now() - t0), tm: tmg };
  } finally { clearTimeout(tm); signal?.removeEventListener?.("abort", onAbort); }
}

const NOTE_V = "2";
// 첫 서버 사용 때 한 번만 안내(언어별 stt_server_note) · 기억 localStorage malmun.sttnote · 알림 모양은 앱 .toast 그대로
// 서버 데우기(본부 10-12 — 첫 요청이 느림 · 1.7~6.2초) — 말하기 화면에 들어올 때 /health 한 번(5분에 한 번까지 · 녹음 안 보냄 · AI 안 부름)
let warmAt = 0;
export function warmSTT() { if (!sttReady() || Date.now() - warmAt < 300000) return; warmAt = Date.now(); fetch(sttURL() + "/health", { cache: "no-store", credentials: "omit" }).catch(() => {}); }
export function sttNoteOnce() {
  try { if (localStorage.getItem("malmun.sttnote") === NOTE_V) return false; localStorage.setItem("malmun.sttnote", NOTE_V); } catch { return false; } /* 문구가 바뀌면 NOTE_V 를 올려 본 사람에게도 한 번 더(본부 10-11 「폰에 녹음이 남음」 정정 = "2") */
  const d = Object.assign(document.createElement("div"), { className: "toast sttnote", textContent: t("stt_server_note") });
  d.setAttribute("role", "status"); document.body.append(d); setTimeout(() => d.remove(), 9000); /* 두 문장 — 읽을 시간 */
  return true;
}
