// 쓰기 — 옛 앱 쓰기 연습을 그대로 쓴다(js/legacy/writing.js · 투덜이 2026-09-30 「예전에 만든 그 방식대로」)
// 이 파일은 새 데이터로 옛 writingData 를 만들어 넘기고, 옛 화면 틀(머리줄 · wr-body · 닫기)만 그린다.
import { t, lang } from "../i18n.js";
import { esc, glossCards } from "../text.js";
import { episode, chars } from "../data.js";
import { paths, MEDIA } from "../paths.js";

const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const JONG = ["", "ㄱ", "ㄲ", "ㄱㅅ", "ㄴ", "ㄴㅈ", "ㄴㅎ", "ㄷ", "ㄹ", "ㄹㄱ", "ㄹㅁ", "ㄹㅂ", "ㄹㅅ", "ㄹㅌ", "ㄹㅍ", "ㄹㅎ", "ㅁ", "ㅂ", "ㅂㅅ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
// 옛 데이터와 같은 꼴: 겹모음은 그대로(옛 expandJamo 가 나눈다) · 겹받침은 낱자로
function jamoOf(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  return [CHO[Math.floor(c / 588)], JUNG[Math.floor((c % 588) / 28)], ...JONG[c % 28]];
}

const VOWEL = { a: "아", ae: "애", ya: "야", yae: "얘", eo: "어", e: "에", yeo: "여", ye: "예", o: "오", wa: "와", wae: "왜", oe: "외", yo: "요", u: "우", wo: "워", we: "웨", wi: "위", yu: "유", eu: "으", ui: "의", i: "이" };

let wordsIndex;
const words = () => (wordsIndex ||= fetch("data/words_index.json").then(r => r.json()).catch(() => ({})));

function buildWriting(line, charIdx, wordIdx) {
  const cards = glossCards(line.glossLine);
  const ws = line.ko.split(/\s+/).map(w => w.replace(/[^가-힣]/g, "")).filter(Boolean).map(word => {
    const card = cards.find(c => c.ko.replace(/[^가-힣]/g, "") === word);
    const cs = [...word].map(ch => ({ char: ch, jamo: jamoOf(ch), audio: charIdx[ch] ? paths.char(charIdx[ch]) : null }));
    const wa = wordIdx[word] ? `${MEDIA}/${wordIdx[word]}` : word.length === 1 ? cs[0].audio : null; // 한 글자 낱말은 글자 소리(옛 앱과 같음)
    return { word, meaning_ne: card?.mean || "", audio: wa, chars: cs };
  });
  return { sub_id: line.id, sentence: line.ko, sentence_ne: line.tr, sentence_end: 0, words: ws };
}

export default async function write(app, ep, id) {
  const [d, charIdx, wordIdx] = await Promise.all([episode(ep, lang), chars(), words()]);
  const li = Math.max(0, d.lines.findIndex(l => String(l.id) === String(id)));
  const line = d.lines[li];
  const prev = d.lines[li - 1], next = d.lines[li + 1];

  // 모음 자판 소리 = 그 모음 글자 소리(ㅏ → 「아」 · 글자와 같은 목소리) · 없으면 옛 자모 소리
  const jamoSound = name => (VOWEL[name] && charIdx[VOWEL[name]] ? paths.char(charIdx[VOWEL[name]]) : paths.jamo(name));
  window.MALMUN_WR = { t, jamo: jamoSound, lineAudio: line.lineAudio ? paths.audio(ep, line.lineAudio) : null };
  window.wrStopAll?.();
  window.writingData = buildWriting(line, charIdx, wordIdx);
  window.wrWritingSubId = line.id;
  Object.assign(window, { wrWordIdx: 0, wrCharIdx: 0, wrJamoIdx: 0, wrEnteredJamo: [], wrAdvanceTimer: null });

  app.innerHTML = `<section class="writing-overlay open">
    <div style="max-width:960px;margin:0 auto;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
    <div class="qo-header">
      <a class="nav-arrow" ${prev ? `href="#/write/${ep}/${prev.id}"` : 'aria-disabled="true"'} aria-label="${esc(t("previous"))}">&#9664;</a>
      <a class="nav-arrow" ${next ? `href="#/write/${ep}/${next.id}"` : 'aria-disabled="true"'} aria-label="${esc(t("next"))}">&#9654;</a>
      <div class="wr-num">#${String(li + 1).padStart(2, "0")}</div>
      <div class="wr-nav-ne">${esc(line.tr || line.ko)}</div>
    </div>
    <div class="wr-body" id="wr-body"></div>
    <div style="padding:6px 14px 10px;flex-shrink:0"><a class="wr-cbtn wr-cbtn-close" href="#/learn/${ep}/${line.id}" style="display:block;text-align:center">&#10005; ${esc(t("btn_close"))}</a></div>
    </div>
  </section>`;
  window.renderWriting();
  window.preloadJamoAudio();
  return () => { window.wrStopAll?.(); window.wrLoopStop?.(); };
}
