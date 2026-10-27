# 배울 말(LEARN) 1단계 — 앱 말부 10-27 (작전표 004 F · P8-04·05)

**한 줄**: 앱이 가르치는 말을 코드에 박지 않고 `LEARN` 한 곳에서 읽는다. 1단계 = 한국어(ko)가 지금과 똑같이 도는 것(회귀 0).

## 있는 것
- `js/learnlangs.js` — 배울 말 프로필 표 `LEARN_INFO`(학습자 말 표 langs.js 와 같은 모양): ko(ready) · en · ta(틀만 — ta 는 Noto Sans Tamil). 항목: `ready dir stt script font hand lh`.
- `js/tl.js` — `LEARN`(지금 배울 말 · 기본 ko · 개발 주소에서만 `?learn=xx` · 공개는 ready 말만 `malmun.learn`) · `learnInfo` · `dataBase` · `KO_LEGACY_PATH`.
- 편 자료 길 `paths.data()`: ko = `data/<편>/`(옛 길 그대로) · 다른 말 = `data/<말>/<편>/`. ko 를 `data/ko/` 로 옮길 때는 도구 6~7개와 함께 `KO_LEGACY_PATH=false` 한 줄(개발1팀).
- 받아쓰기 언어 코드 = `learnInfo.stt`(recorder·speak·diag·agepolicy · 전엔 `ko-KR` 박힘).
- 배울 말 글(대사·낱말·제목·글자·화자 이름)의 `lang="ko"` → `lang="${LEARN}"`(compare·learn·list·speak·write·text·ui). ko 일 때 글자 하나까지 똑같음.

## 회귀 점검 (화면 뼈대 해시)
`tools/ui_check_skel.js` = 화면 10개의 뼈대(태그·클래스·lang·dir·data-k·aria·글)를 해시. 새 프로필로(상태 누적 없음) 두 판에서 돌려 같으면 ✓. `--eval "window.__K=true"` = 한국어 켬 · `window.__DUMP="상태 이름"`(또는 ALL) = 줄 그대로.
`node D:\malmun_work\qa\headless_run.js --url http://127.0.0.1:<포트> --sizes 375 --lang ne --mute 1 --script tools\ui_check_skel.js`
1단계 결과: ne vi ur en ja × 한국어 꺼짐/켜짐 × 10화면 모두 기준판(ep1v11 4bd6cd6)과 해시 같음.

## 2단계 이후 남은 「한국어 박힌 곳」 (실측 4bd6cd6)
1. 자료 필드 이름 `ko`(대사 `subtitles[].ko` · v9 `ko_by`·`audio.ko` · 어댑터 `v9view`) → 배울 말 글 `t` 한 이름 · 조건 `code === "ko"`(learn.js 438·444·484)도 `code === LEARN`.
2. 클래스 `.ko` 26곳 + css `[lang=ko]`·`.ko` 9곳 → `.tl`(배울 말 글 표시) · 글꼴·줄 높이는 `:lang()` 대신 프로필.
3. 한글 전용 로직: `jamobox.js`·`strokes.js`·`write.js`(획순·자판 `.kb lang="ko"`)·`text.js`(받침·`KO` 정규식)·`fbvoice.js`·speak 채점·`compare/rhythm`. 영어 등은 글자 체계(`script`)별 쓰기·글자 풀이가 새로 필요(앱 내용부·글자부).
4. 글 상수: learn.js `▶ 시작`·`끝`(줄 처음·끝 칸 라벨) · welcome.js `안녕하세요!` · ui.js ⇄ 칩 `한`·speak.js `⇄한` → 배울 말 짧은 이름·인사말을 프로필에.
5. 글꼴: 손글씨 큰 제목(Gaegu = 한글) → 말마다 `hand` · 쓰는 글자만 부분 로드 · RTL 은 `dir` 을 html 하나가 아니라 글 단위(배울 말이 ur · 학습자 말이 ne).
6. ⇄ 열쇠·도구 이름 `uiKo`·`*.ko.json`·`ui_check_uiko*` → 「배울 말」 이름(P0-25).
