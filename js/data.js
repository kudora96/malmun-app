// 편 불러오기 — 공통 + KR층 + 학습자 언어층을 sub_id 로 조인(app_build_spec §3-4)
import { paths } from "./paths.js";

const cache = new Map();
const getJSON = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

export async function catalog() {
  if (!cache.has("catalog")) cache.set("catalog", getJSON("data/catalog.json"));
  return cache.get("catalog");
}

let charsIndex;
export async function chars() {
  if (!charsIndex) charsIndex = getJSON("data/chars_index.json").catch(() => ({}));
  return charsIndex;
}

export async function episode(ep, lang) {
  const key = `${ep}.${lang}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const [base, kr, tr] = await Promise.all([
      getJSON(paths.data(ep)),
      getJSON(paths.data(ep, ".kr")).catch(() => ({ explanations: [] })),
      getJSON(paths.data(ep, "." + lang)).catch(() => null),
    ]);
    const krBy = new Map(kr.explanations.map(e => [e.sub_id, e]));
    const trSub = new Map((tr?.subtitles || []).map(s => [s.id, s]));
    const trExp = new Map((tr?.explanations || []).map(e => [e.sub_id, e]));
    const bios = new Map((tr?.characters || []).map(c => [c.id, c.bio]));
    const lines = base.subtitles.map(s => {
      const part = (s.parts || [])[0] || {};
      const k = krBy.get(s.id) || {};
      const x = trExp.get(s.id) || {};
      const paras = (k.kr_audio_text || "").split(/\n\n+/);
      return {
        id: s.id, start: s.start, end: s.end, ko: s.ko, tag: s.tag,
        speaker: part.speaker || "", lineAudio: part.audio || null,
        tr: trSub.get(s.id)?.t || "",
        // 설명: ¶1 = 대사 인용(음성은 lineAudio) · ¶2~ = audio_kr 조각과 1:1
        krParas: paras.slice(1), krAudio: k.audio_kr || [], krHl: k.kr_hl || [],
        glossLine: (x.kr || "").split(/\n\n+/)[0] || "",
        trParas: (x.t || "").split(/\n\n+/).slice(1),
      };
    });
    return {
      id: ep, title: base.title, lang: tr ? lang : null,
      characters: (base.characters || []).map(c => ({ ...c, bio: bios.get(c.id) || "" })),
      lines,
    };
  })();
  cache.set(key, p);
  return p;
}
