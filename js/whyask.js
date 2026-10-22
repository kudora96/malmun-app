// 「왜 틀렸어요?」(본부 10-19 · 대표님 ㅇ · 앱 AI ①) — 틀렸을 때만 단추 · 누르면 Worker /explain 이 2~3문장(학습자 말)
//  겉 틀: 기본 꺼짐 — 켜기 = 주소에 ?why=1 (기억 malmun.why · ?why=0 이면 끔) · 꺼져 있으면 단추·상자 자체를 그리지 않음(지금 화면과 0px 같음)
//  쓰기 화면(쓰기부)도 이 파일을 씀: whyRow(target, heard, mode, meaning) 를 틀림 표시 옆에 넣고 · 같은 data-act=why 클릭은 아래 문서 하나가 받음
//  키는 앱에 없음(Worker 비밀값) · 보내는 것 = 정답 문장 · 학습자가 말한/쓴 글 · 모드 · 학습자 언어 · 뜻(있으면) · 기기 번호
import { t, lang } from "./i18n.js?v=1022.29";
import { sttURL, sttReady, deviceId } from "./sttserver.js?v=1022.29";
import { allowed } from "./agepolicy.js?v=1022.29"; // AI = 나이(대표님 10-19)
import { uikoChip } from "./ui.js?v=1022.29"; // 답 창에서도 ⇄(음악 상자와 같은 자리 · 대표님 「⇄ 는 어디서든 즉시」)
import { esc } from "./text.js?v=1022.29";

const KEY = "malmun.why";
try { const m = /[?&]why=([01])\b/.exec(location.search); if (m) m[1] === "1" ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch {}
export const whyOn = () => { try { return allowed("aiExplain") && localStorage.getItem(KEY) === "1" && sttReady(); } catch { return false; } };

// 단추 + 답 자리(답은 누른 뒤에만 생김) — 꺼져 있거나 고칠 것이 없으면 빈 글자
export const whyRow = (target, heard, mode, meaning = "") => !whyOn() || !target || !heard || target === heard ? "" :
  `<span class="whyrow" data-t="${esc(target)}" data-h="${esc(heard)}" data-m="${mode === "write" ? "write" : "speak"}" data-mean="${esc(meaning)}"><button class="whyb" data-act="why"><span aria-hidden="true">💡</span> <span data-k="why_ask">${esc(t("why_ask"))}</span></button></span>`;

const cache = new Map(); // 같은 문장·같은 답이면 다시 안 부름(돈·기다림 아낌)
async function ask(row) {
  const body = { target: row.dataset.t, heard: row.dataset.h, mode: row.dataset.m, lang, meaning: row.dataset.mean || undefined };
  const k = JSON.stringify(body); if (cache.has(k)) return cache.get(k);
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 25000);
  try {
    const r = await fetch(sttURL() + "/explain", { method: "POST", headers: { "Content-Type": "application/json", "X-Dev": deviceId() }, body: JSON.stringify(body), signal: ac.signal, cache: "no-store", credentials: "omit" });
    const j = await r.json().catch(() => ({}));
    const out = r.ok && j.text ? { text: j.text } : { key: r.status === 429 ? "why_limit" : "why_fail" };
    if (out.text) cache.set(k, out);
    return out;
  } catch { return { key: "why_fail" }; } finally { clearTimeout(tm); }
}

// 답 = 아래에서 올라오는 작은 창(음악 상자와 같은 틀) — 말하기·쓰기 창 모양은 그대로(0px · 넘침·겹침 없음 · 우르두 320 에서 창 안 상자는 137px 넘쳤음)
function sheet(html) {
  const root = document.getElementById("sheet-root"); if (!root) return null;
  root.innerHTML = `<div class="sheet-dim" data-close></div><div class="sheet whys" role="dialog" aria-modal="true" aria-labelledby="why-h"><span class="grab"></span>
    <h2 id="why-h"><span aria-hidden="true">💡</span> <span data-k="why_ask">${esc(t("why_ask"))}</span>${uikoChip()}<button class="mclose" data-close aria-label="${esc(t("close_word"))}">✕</button></h2>
    <div class="whybox" role="status" aria-live="polite" dir="auto">${html}</div></div>`;
  const close = () => { root.innerHTML = ""; root.onclick = null; document.removeEventListener("keydown", key, true); };
  const key = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", key, true);
  root.onclick = e => { if (e.target.closest("[data-close]")) close(); };
  return root.querySelector(".whybox");
}
const answer = r => (r.text ? esc(r.text).replace(/\n+/g, "<br>") : `<span data-k="${r.key}">${esc(t(r.key))}</span>`); // 답 = 학습자 말(한국어 낱말 섞임)

if (!window.__whyWired) {
  window.__whyWired = true;
  document.addEventListener("click", async e => {
    const b = e.target.closest?.("[data-act=why]"); if (!b) return;
    e.stopPropagation();
    const row = b.closest(".whyrow"); if (!row || row.dataset.busy) return;
    row.dataset.busy = "1"; b.setAttribute("aria-busy", "true");
    let box = sheet(`<span class="wait" data-k="why_wait">${esc(t("why_wait"))}</span>`);
    const r = await ask(row);
    delete row.dataset.busy; b.removeAttribute("aria-busy");
    if (!box?.isConnected) return; // 기다리는 동안 닫음
    box.innerHTML = answer(r); box.classList.toggle("err", !r.text);
  }, true);
}
