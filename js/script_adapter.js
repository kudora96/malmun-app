// 글자 체계 어댑터(쓰기부 10-27 · 작전표 004 G · 설계 _hq/design/script_adapter.md) — 1단계 = 한글 감싸기
//  배울 말의 글자 체계마다 어댑터 하나: 글자 쪼개기·조합 · 자판 · 획 엔진 · 소리 이름을 한 곳에서 내줌.
//  쓰기 화면(write.js)은 한글 함수를 직접 부르지 않고 SCRIPT 로 부름. 한글 어댑터는 지금 함수를 **그대로** 부를 뿐(동작 0 변경 · 기준선 tools/baseline_script.json 으로 점검).
//  다른 체계(라틴·키릴·데바나가리·아랍·가나·한자·태국계)는 2단계 이후 — 인터페이스는 설계서 §2.
//  1단계는 늘 한글(배울 말 프로필 LEARN 이 들어오면 `adapterOf(learnInfo.script)` 로 고름 — 그 한 줄만 바뀜).
import { toJamoW, jamoParts, compose, vowelLen, JAMO_AUDIO } from "./text.js?v=1023.40";
import { units as jamoUnits, baseOf, shapeFix } from "./jamobox.js?v=1023.40"; // 한글 자모 덩어리 나누기(글자부)
import { createStrokes } from "./strokes.js?v=1023.40"; // 획 자료·획순 칠(글자부)
import { fitToGuide } from "./strokefit.js?v=1023.40"; // 자석 따라오는 획 길

const KEYS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ"], VOW = [..."ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"];
const VOW2 = [..."ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ"]; // 겹모음 줄(본부 10-06) — 칸 하나 · ㅓ+ㅣ 처럼 나눠 쳐도 받음

export const HANGUL = {
  id: "hangul", dir: "ltr",
  // 글자 쪼개기·조합: 한 칸(음절) → 부품(자모) 목록 · 자판으로 친 부품 → 글자
  jamoOf: toJamoW, jamoParts, compose, vowelLen,
  // 부품 소리 이름(chars_f 에 없을 때 쓰는 옛 이름) · 자판
  soundNames: JAMO_AUDIO,
  keyboard: { keys: KEYS, vowels: VOW, vowels2: VOW2, rows: [KEYS.slice(0, 10), KEYS.slice(10), VOW, VOW2.slice(0, 6), VOW2.slice(6)], lang: "ko" },
  // 획 엔진(글꼴 마스크 위에 자모 획 템플릿을 맞추는 한글 방식 · 글자부) — 글꼴·크기 계산은 그대로
  engine: { createStrokes, jamoUnits, shapeFix, baseOf, fitToGuide },
};

export const ADAPTERS = { hangul: HANGUL };
export const adapterOf = id => ADAPTERS[id] || null;
export const SCRIPT = HANGUL; // 1단계 = 한글만
