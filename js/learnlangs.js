// 「배울 말」 프로필(다국어부 10-27 · 작전표 004 F · 조직 v2 앱 말부) — 학습자 말 표(langs.js)와 같은 모양 · 앱이 가르치는 말마다 한 줄
//  ready = 앱에서 실제로 도는 배울 말(1단계 = ko 만 · 나머지는 틀만 — 그 말 자료·쓰기·채점이 생기면 true)
//  dir 글자 방향 · stt 받아쓰기(Web Speech) 언어 코드 · script 글자 체계(쓰기·글자 풀이 방식을 고름) · font 구글 글꼴 이름(없으면 기본 글꼴) · hand 손글씨형 큰 제목 글꼴 · lh 줄 높이 최소
export const LEARN_INFO = {
  ko: { ready: true, dir: "ltr", stt: "ko-KR", script: "hangul", hand: "Gaegu" },
  en: { ready: false, dir: "ltr", stt: "en-US", script: "latin", hand: "Gaegu" },
  ta: { ready: false, dir: "ltr", stt: "ta-IN", script: "tamil", font: "Noto Sans Tamil", lh: 1.7 },
};
