// 편 불러오기 — 공통 + KR층 + 학습자 언어층을 sub_id 로 조인(app_build_spec §3-4)
import { paths } from "./paths.js?v=1021.1";
import { VERSION } from "./version.js?v=1021.1";

const cache = new Map();
// 앱 판 번호를 붙여 받는다 — 새 판이면 옛 데이터를 쓰지 않게(tools/bump_version.py)
const getJSON = url => fetch(url + (url.includes("?") ? "&" : "?") + "v=" + VERSION).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

export async function catalog() {
  if (!cache.has("catalog")) cache.set("catalog", getJSON("data/catalog.json"));
  return cache.get("catalog");
}

let charsIndex;
export async function chars() {
  if (!charsIndex) charsIndex = getJSON("data/chars_index.json").catch(() => ({}));
  return charsIndex;
}

let charsFIndex;
// 공용 아나운서 글자·자모 소리 {글자 또는 자모: 파일명}(본부 · 05_audio/_chars_f/chars_f.json → tools/build_chars_index.py 가 data/ 로)
// 10-06: 자모 40개(공통) + 그 편 글자만(data/{편}/{편}.chars_f.json) — 11,172자 전부를 받지 않게
const charsFEp = new Map();
export async function charsF(ep) {
  if (!charsFIndex) charsFIndex = getJSON("data/chars_f.json").catch(() => ({}));
  if (ep && !charsFEp.has(ep)) charsFEp.set(ep, getJSON(paths.data(ep, ".chars_f")).catch(() => ({})));
  const [j, e] = await Promise.all([charsFIndex, ep ? charsFEp.get(ep) : {}]);
  return { ...j, ...e };
}

export async function episode(ep, lang) {
  const key = `${ep}.${lang}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const [base, kr, tr, wt, un, v9] = await Promise.all([
      getJSON(paths.data(ep)),
      getJSON(paths.data(ep, ".kr")).catch(() => ({ explanations: [] })),
      getJSON(paths.data(ep, "." + lang)).catch(() => null),
      getJSON(paths.data(ep, ".words")).catch(() => ({ lines: {} })), // 대사 원음 안 낱말 시각(쓰기의 단어·부분 듣기)
      getJSON(paths.data(ep, ".units")).catch(() => ({ lines: {} })), // 쓰기 낱말·토막 목록(고정 · tools/writing_units.py)
      getJSON(paths.data(ep, ".v9")).catch(() => null), // 새 설명(v9 시안 · 본부 10-03) — 있으면 설명 창이 새 카드로
    ]);
    const krBy = new Map(kr.explanations.map(e => [e.sub_id, e]));
    const trSub = new Map((tr?.subtitles || []).map(s => [s.id, s]));
    const trExp = new Map((tr?.explanations || []).map(e => [e.sub_id, e]));
    const bios = new Map((tr?.characters || []).map(c => [c.id, c.bio]));
    const v9langs = (v9?.langs || []).filter(c => c !== "ko"), v2 = v9?.schema === 2, vL = v9langs.includes(lang) ? lang : null; // v2 = 언어 중립 규격(언어부 10-11 v9_schema_v2.md)
    const lines = base.subtitles.map((s, n) => {
      const nv = v9view(v9?.lines.find(x => x.n === n + 1), vL, v2);
      const part = (s.parts || [])[0] || {};
      const k = krBy.get(s.id) || {};
      const x = trExp.get(s.id) || {};
      const paras = (k.kr_audio_text || "").split(/\n\n+/);
      return {
        // 줄 시각 = 편 JSON(정본 · 본부 make_srt 가 목소리에 맞춤 10-01) — tools/measure_sync.py 는 검사용
        id: s.id, start: s.start, end: s.end, ko: s.ko, tag: s.tag,
        // 낱말 시각 = 본부 eleven_align(일레븐랩스 강제 정렬) · 잘라 듣기는 cs/ce(소리 끝까지 넓힌 값)
        speaker: part.speaker || "", lineAudio: part.audio || null,
        words: (wt.lines[String(s.id)] || []).map(w => ({ w: w.w, start: w.cs ?? w.start, end: w.ce ?? w.end })),
        units: un.lines[String(s.id)] || null,
        say: s.say?.ko ? s.say : nv?.say ? { ko: nv.say, src: paths.v9(ep, nv.audio.ko.sentence || nv.audio.ko.say) } : null, // 「이제 말해 보세요」 과제(잠정 · 본부 10-01) · v9 시안이면 그 문장 · 본보기 = 문장만 읽은 소리(없으면 앞말 포함)
        v9: nv,
        tr: trSub.get(s.id)?.t || "",
        // 설명: ¶1 = 대사 인용(음성은 lineAudio) · ¶2~ = audio_kr 조각과 1:1
        krParas: paras.slice(1), krAudio: k.audio_kr || [], krHl: k.kr_hl || [],
        glossLine: (x.kr || "").split(/\n\n+/)[0] || "",
        trParas: (x.t || "").split(/\n\n+/).slice(1),
      };
    });
    return {
      id: ep, title: base.title, title_t: tr?.title_t || "", lang: tr ? lang : null, // title_t = 학습자 언어 편 제목(영상 창 제목 줄)
      v9head: v9?.say_head || null, // 「이제 말해 보세요」 머리말 소리(언어마다 하나 · 모든 줄 공통)
      v9L: vL, // v9 「학습자 언어」 — 그 언어 자료가 없으면 null = 설명은 한국어만(언어부 10-11 S1 ② — 네팔어로 떨어지던 것)
      characters: (base.characters || []).map(c => ({ ...c, bio: bios.get(c.id) || "" })),
      lines,
    };
  })();
  cache.set(key, p);
  return p;
}

// v9 줄 하나를 학습자 언어 L 로 펼침(언어부 app_changes.md §1) — v2(schema 2)·v1 둘 다 받음 · 화면 코드는 v1 칸 이름 그대로 씀 · 말풍선 뜻은 gloss[w].mean
//  L = null(그 언어 자료 없음) → 공용 한국어만 · v2 견주기 줄은 ko_by[L] 의 글·소리·시각을 같이 바꿈 · 공용 시각이 null 이고 언어판도 없으면 한국어 설명 소리 숨김
function v9view(nv, L, v2) {
  if (!nv) return null;
  if (!v2) return { ...nv, gloss: Object.fromEntries(Object.entries(nv.gloss || {}).map(([w, g]) => [w, { rom: g.rom, mean: (L && g[L]) || "" }])) };
  const kb = (L && nv.ko_by?.[L]) || {}, shared = !(nv.sent || []).some(x => x.ko_s == null), koEx = kb.audio_ex || (shared ? nv.audio?.ko?.ex : null);
  return {
    ...nv,
    tr: nv.sub?.[L] || "",
    pieces: (nv.pieces || []).map(p => ({ ko: p.ko, rom: p.rom, mean: p.mean_by?.[L] || "" })),
    text: { ...nv.text, ko: kb.ex != null ? { ex: kb.ex, say: kb.say ?? nv.text?.ko?.say } : nv.text?.ko },
    audio: { ...nv.audio, ko: { ...nv.audio?.ko, ex: koEx } },
    sent: (nv.sent || []).map((x, k) => ({ ...x, ko: kb.sent?.[k] ?? x.ko, ko_s: kb.sent_s ? kb.sent_s[k] : x.ko_s })),
    gloss: Object.fromEntries(Object.entries(nv.gloss || {}).map(([w, g]) => [w, { rom: g.rom, mean: g.by?.[L] || "" }])),
  };
}
