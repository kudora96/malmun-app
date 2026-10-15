# 언어 넣기 절차 — 언어부 자료 → 앱 (다국어부 · 2026-10-12)

> 한 장 요약: **언어부 make_lang S1~S8 ✓ → 다국어부 `sync_lang.py` 한 번 → 언어 점검 → 검사부 → 앱개발부 올리기.**
> 언어를 더할 때 **앱 코드(js)는 고치지 않는다** — 언어마다 다른 값(방향·글꼴·줄 높이·준비 단계)은 `js/langs.js` 한 곳에 있고, 이 파일은 언어부 프로필에서 만든다.

## 0. 누가 무엇을

| 단계 | 누가 | 결과 |
|---|---|---|
| S1~S6 글쓰기·검수 | 언어부 | `09_lang/{xx}/` · S6 ✗0 |
| S7 조립 | 언어부 | `09_lang/out/{ep}/{ep}.v9.v2.json` 의 `langs` 에 xx |
| S8 넘기기 | 언어부 | `09_lang/{xx}/handoff_{xx}.md` · 소리부에 `narration_{xx}.json` |
| 소리 만들기 | 소리부 | `04_subtitles/{ep}/_preview/새설명_소리_{xx}/` (없어도 글만 단계로 넣을 수 있음) |
| **앱에 넣기 + 언어 점검** | **다국어부** | 작업 사본에 lang·data·langs.json · 점검 ✗0 |
| 학습자 눈 점검 | 검사부 | qa_log ✗0 |
| 올리기(git·R2) · 공개 READY | 앱개발부 · 본부 신호 | 공개 |

## 1. 언어부 쪽 「넘겨도 됨」 조건 (sync_lang 이 먼저 확인 · 하나라도 안 되면 그 언어는 건너뜀)

1. `state_{xx}.json` 에 S6·S7·S8 끝 · `report_{xx}.md` 마지막 줄에 ✗ 없음
2. `python 09_lang/ui/check_ui.py 09_lang/ui/todo_{xx}.json` ✗0(언어부) — 앱 en.json 열쇠 전부 · 자리 `{n}` `{c}` 같은 묶음 · ASCII `"` 만 · 넘길 파일 = `--export` 결과 `09_lang/ui/out/{xx}/`(같은 것을 `09_lang/{xx}/` 에도)
   - sync_lang 도 자리 묶음을 다시 견줌(다르면 그 언어 건너뜀)
3. out v2 의 `langs` 에 xx · 앱 sync_v9 검사(check_v2) 통과
4. 프로필 `profiles/{xx}.json` 의 `status` 가 「보류」가 아님(ky 건너뜀) · `dir` · `line_height_min` · `min_font_px`(빈 값 = 앱 기본값)
- ne 는 `09_lang/ne/` 가 없음 → 앱 글만 `ui/out/ne/` 에서 · 대사층·설명은 04_subtitles·out v2(sync_content·sync_v9)

## 2. 다국어부: `python tools/sync_lang.py <편> <xx[,yy,…]|all> [--dry]`

언어마다 차례로 (21개도 한 번에):

| 하는 일 | 원본 → 앱 |
|---|---|
| 앱 글 | `09_lang/ui/out/{xx}/lang_{xx}.json`(없으면 `09_lang/{xx}/`) → `lang/{xx}.json` |
| 앱 글 한국어판(ने ⇄ 한 토글) | 같은 자리 `lang_{xx}.ko.json` → `lang/{xx}.ko.json` |
| 대사 번역층 | `09_lang/{xx}/{ep}.{xx}.json` → `data/{ep}/{ep}.{xx}.json` |
| 언어 표 | 프로필 → `js/langs.js` 의 `{xx}` 칸 `{dir, font, lh, minpx, ko_ui, stage}` |
| 설명(v9 v2) | `sync_v9.py {ep}` 한 번(모든 언어가 든 out v2 · 없는 소리는 단추 숨김 = 글만 단계) |
| 편 목록 | `sync_content.py` → catalog `episodes[].langs` |

- `stage`: `pilot`(개발 주소에서만 · 지구 목록·자동 선택에 들어감) → `ready`(공개 · **본부 신호 때만** 바꿈). 처음 넣을 때는 늘 `pilot`.
- i18n.js 는 `js/langs.js` 를 읽어 READY·RTL·글꼴 링크·KO_UI·줄 높이(`--lang-lh`)를 정한다(10-12 옮김 끝 · 공개로 바꾸기 = `sync_lang.py --ready xx`).
- **앱에서 고친 글 보호**: 앱 쪽 값 ≠ 원본 값인 열쇠가 있으면 그 언어는 **덮지 않고** 표(열쇠 · 앱 값 · 원본 값)로 보여 줌(⏸) → 언어부에 「열쇠·값」을 보내 원본(todo)을 맞춘 뒤 다시 · 일부러 덮을 땐 `--force`.
- **화면 글 고침은 한 곳**: 앱개발부·다국어부가 화면 글을 바꾸고 싶으면 앱 lang/*.json 을 직접 고치지 않고 언어부에 「열쇠·언어·값」 메시지 → 언어부 todo → 내보냄 → sync_lang(언어부 제안 10-12).
- **열쇠 정본** = 다국어부 사본(C:\malmun-app-lang)의 `lang/en.json` — 열쇠가 생기거나 바뀌면 다국어부가 언어부에 알림(언어부 template 이 이것을 따름).
- 결과 한 줄씩: `vi ✓ 글 161/161 · 번역층 15줄 · v2 ✓ · 소리 31/31` / `km ⏭ S6 ✗2` 처럼.

## 3. 언어 점검 (다국어부 · 넣은 언어마다)

`tools/ui_check_lang.js` 를 `?lang=xx` 로 연 `#/learn/{편}` 에서 eval(run_all 과 같은 방식) — 폰 375×812 · 작은 폰 320×640 · PC 1280×800 에서 모든 화면(첫 화면·편 목록·배우기·설명·쓰기·말하기·전체 화면)을 열어:
1. **넘침**: 글 칸 `scrollWidth > clientWidth` · 단추 글 잘림 · 두 칸 겹침
2. **위아래 잘림**: 글자 높이(태국 위아래 부호 · 나스탈리크 · 미얀마·크메르 겹침 부호) > 칸 높이 — `overflow:hidden` 고정 높이 칸
3. **방향**: ur 는 `dir=rtl` · 한국어 조각·숫자·시간은 격리(`<bdi>`/`dir=ltr`)되어 순서가 맞음
4. **남은 자리**: 화면 글에 `{n}` 같은 자리가 그대로 보이면 ✗ · en 으로 떨어진 열쇠 수
5. **글꼴**: 그 언어 글꼴이 실제로 실렸는지(`document.fonts.check`)
+ 기존 `run_all.js` 를 `?lang=xx` 로 한 번.
+ **⇄ 없는 언어(en)도 꼭 같이** — 다국어부 장치(langfit·uiKo)는 ⇄ 있는 언어만 쓰므로 en 에서 화면이 멈추지 않는지(learn ✓) 늘 함께 봄(10-15 langfit 끝없는 되부름 사고 · 쓰기부 발견).
+ ⇄ 점검: `ui_check_uiko.js`(안 바뀐 글·섞인 글·⇄ 전후 크기·자리 0px) · `ui_check_uikeep.js`(⇄ 전후 상태 그대로)

✗0 → 검사부에 「언어 xx 넣음 · 사본 주소 · 볼 것」 → 검사부 ✗0 → 앱개발부 올리기.

## 4. 21개 한꺼번에

1. 언어부 `make_lang.py <편> all --parallel`(S1~S6 언어마다 따로 · S7 한 곳 · S8 따로)
2. 다국어부 `sync_lang.py <편> all` → 조건 맞는 언어만 넣고 표로 보고(건너뛴 언어는 까닭과 함께 언어부로)
3. `ui_check_lang.js` 를 언어마다·크기마다 → 언어별 ✗ 표 · 앱 코드 문제(모든 언어 공통)는 다국어부/주인 부서가 고치고, 글 문제(너무 긺 등)는 언어부에 열쇠·언어·글자 수로 돌려보냄
4. 검사부는 글자 갈래별 대표만 깊게(라틴 vi · 타이 th · 아랍 ur · 데바나가리 ne · 미얀마 my · 한자 zh) + 나머지는 자동 점검 결과
5. 공개 = 본부 신호 → `stage: ready` 일괄 → 앱개발부 올리기 (동시 출시 · languages-parallel-launch)

## 5. 고칠 곳이 앱 다른 파일이면

다국어부 파일(i18n.js · data.js 언어 부분 · welcome/list 언어 부분 · RTL·글꼴 CSS 구역 · sync_lang · ui_check_lang · js/langs.js) 밖이면 고치지 않고 주인 부서에 「파일:줄 · 무엇 · 어느 언어에서 보이는지」로 요청.
