# 서버 받아쓰기(2안) 켜는 방법 — 투덜이용

이 Worker「stt」는 학습자 녹음을 받아 Cloudflare 의 받아쓰기 AI(whisper)로 글로 바꿔 앱에 돌려줍니다.
**녹음은 저장하지 않습니다**(받아쓰기 뒤 바로 버림 · 로그도 끔).
앱은 지금 주소가 비어 있어서 **이 단계를 다 하기 전까지는 예전과 똑같이** 움직입니다.

> Cloudflare 계정을 바꾸는 일이라 **투덜이 허락 뒤에** 합니다. 키·비밀번호는 어디에도 적지 않습니다.

## 1. Workers AI 켜기(대시보드)
1. https://dash.cloudflare.com 에 로그인(R2 와 같은 계정).
2. 왼쪽 메뉴 **AI → Workers AI** 를 엽니다.
3. 처음이면 안내대로 「시작하기/Use Workers AI」를 누릅니다(무료 몫 안에서는 돈이 안 나갑니다).

## 2. 하루 상한용 KV 만들기
1. 왼쪽 메뉴 **Storage & Databases → KV**(또는 Workers KV) → **Create namespace**.
2. 이름: `malmun-stt-cap` → 만들기.
3. 만들어진 줄의 **ID**(긴 글자)를 복사합니다.
4. 이 폴더의 `wrangler.toml` 에서 `id = "PUT_KV_NAMESPACE_ID_HERE"` 를 복사한 ID 로 바꿉니다.
   (KV ID 는 비밀이 아닙니다.)

## 3. 배포(앱개발부가 투덜이 허락 뒤 실행)
PC 명령 창에서:
```
cd C:\malmun-app-dev\worker\stt
npx wrangler login        ← 처음 한 번 · 브라우저가 열리면 Cloudflare 로그인 허락
npx wrangler deploy
```
끝나면 화면에 주소가 나옵니다. 예: `https://stt.<계정이름>.workers.dev`

확인: 브라우저로 `https://stt.<계정이름>.workers.dev/health` 를 열어 `{"ok":true}` 가 보이면 됩니다.

## 4. 앱에 주소 넣기
- 파일: `C:\malmun-app-dev\js\sttserver.js`
- 줄: `export const STT_URL = "";`
- 따옴표 안에 3단계 주소를 넣습니다(끝에 `/stt` 는 붙이지 않음):
  `export const STT_URL = "https://stt.<계정이름>.workers.dev";`
- 그다음 앱개발부가 점검(run_all) → 판 올리기.

넣으면 **안드로이드는 처음부터 「녹음 → 서버 받아쓰기」** 로 갑니다. 서버가 안 되면(인터넷·상한·오류) 그 방문 동안은 「받아쓰기만」으로 돌아갑니다.
PC·아이폰은 지금 방식 그대로입니다.
진단 화면(#/diag)의 「서버 받아쓰기」 줄에 켜짐/주소가 보이고, 「녹음 3초 → 서버 받아쓰기(2안)」 단추로 바로 시험할 수 있습니다.

## 5. 비용(본부 10-10 메모 기준 · 공개 가격 · 확인 필요)
- 값: 1분 약 0.0005달러(약 0.7원).
- **하루 무료 몫 약 210분**(10,000 neurons ÷ 분당 약 46.63). 한 번 말하기 3~10초면 하루 약 1,300~4,000번.
- 넘으면 **Workers 유료 플랜(월 5달러) + 쓴 만큼** — 유료 플랜 켜기는 투덜이가 직접(돈 나가는 일).
  무료 플랜에서 몫을 넘으면 그날은 서버가 오류를 돌려주고, 앱은 자동으로 「받아쓰기만」으로 돌아갑니다.
- 남용 막기: 기기당 하루 200번(`DEV_CAP`), 전체 하루 20,000번(`ALL_CAP`) — `wrangler.toml` 의 `[vars]` 에서 바꾸고 다시 `npx wrangler deploy`.
  (KV 로 세서 아주 정확하지는 않습니다 — 대략 막는 용도.)

## 6. 지키는 것
- 받는 곳(CORS): `https://kudora96.github.io`, `http://localhost:*`, `http://127.0.0.1:*` 만.
- 녹음 크기 1MB 넘으면 거절(보통 15초 녹음은 100KB 안쪽).
- 녹음·받아쓴 글을 저장하지 않음(R2·KV·로그 없음). KV 에는 날짜+기기 번호별 **횟수 숫자만**(이틀 뒤 저절로 지워짐).
- 실제 폰 3~4종에서 첫 시험 필요: 특히 아이폰/일부 안드로이드의 `audio/mp4` 녹음을 모델이 잘 받는지.

## 「왜 틀렸어요?」(/explain · 10-19) 켜기 — 대표님 직접
같은 Worker「stt」에 경로 `/explain` 이 더해졌습니다(받아쓰기와 같은 주소). Claude(Haiku 5.5)를 부르므로 **운영용 API 키**가 필요합니다.
1. https://console.anthropic.com → 「기본 워크스페이스」 → API Keys → **Create Key** · 이름 `malmun-app-prod` · 만료 90일. 키는 어디에도 적지 않습니다.
2. Console → Limits(또는 Billing)에서 달 지출 상한을 정해 두면 이중 안전(앱 Worker 도 `EX_MONTH_USD`(지금 $20) 넘으면 그달 쉼).
3. PC 명령 창:
```
cd C:\malmun-app-dev\worker\stt
npm install
npx wrangler secret put ANTHROPIC_API_KEY      ← 물으면 키를 붙여 넣기(화면에 안 보임)
npx wrangler deploy
```
4. 확인: 앱 주소 끝에 `?why=1` 을 붙여 열고(이 기기에서만 켜짐 · `?why=0` 끔) 말하기에서 일부러 틀리게 말하면 「왜 틀렸어요?」 단추가 보입니다.
- 상한: 기기당 하루 `EX_DEV_CAP`(30) · 전체 하루 `EX_ALL_CAP`(3000) · 달 `EX_MONTH_USD`($20 추정) — wrangler.toml 에서 바꿈.
- 학습자 문장·답은 저장하지 않습니다(로그 끔 · KV 에는 숫자만).
