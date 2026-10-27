// 음성·영상 경로는 여기서만 조립한다(app_build_spec §3-5 — JSON 에는 파일 이름만).
// 로컬 미리보기 = media/(저장소 밖 연결) · 배포 = R2 버킷 malmun-media(tools/upload_media.py 로 올림)
import { dataBase } from "./tl.js?v=1023.40";
const R2 = "https://pub-5e6f50ff2dda412eaa13ca4d4302d599.r2.dev";
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname); // 같은 와이파이 폰(사설 IP 주소)도 로컬 미리보기 = media/(10-22 대표님 폰에서 R2 옛 영상이 나옴)
export const MEDIA = LOCAL ? "media" : R2;

// ?v 한 칸씩 올림(10-07) — 음성 창고에 CORS 허락을 넣기 전에 폰이 받아 둔 옛 응답(허락 머리 없음 · 7일 저장)을 다시 쓰지 않게
export const paths = {
  data: (ep, suffix = "") => `${dataBase}/${ep}/${ep}${suffix}.json`, // 배울 말마다 자료 길(js/tl.js · ko = 옛 길 data/<편>/ 그대로)
  // ?v= = 판 번호 — 영상을 바꾸면 올려서 폰·브라우저에 남은 옛 영상을 쓰지 않게 한다
  // q = "720"·"480" → video/{q}/{ep}.mp4(10-20 화질 자동 · vq.js) · q 없음 = 옛 한 판(못 받을 때 마지막 대안)
  video: (ep, q) => (q ? `${MEDIA}/video/${q}/${ep}.mp4?v=1` : `${MEDIA}/video/${ep}.mp4?v=3`),
  poster: ep => `img/${ep}.jpg`,
  audio: (ep, file) => `${MEDIA}/audio/${ep}/${file}?v=6`, // 대사 낭독 v4(10-02) · 설명 음성은 v2 그대로
  unit: (ep, id) => `${MEDIA}/audio/${ep}/units/${id}.mp3?v=6`, // v5 = 말 앞 0.2초에 아주 작은 저음(블루투스 깨우기 · 10-02) · v4 = 일레븐 v4 판 확정(10-02 · 투덜이 귀로 고름) · 쓰기 낱말·토막 소리(본부 일레븐랩스) · v2 = 앞뒤 여유 + 대사와 같은 말투 · v3 = 15번 맨 앞 둘 다시(10-01)
  // 글자·자모 = 크기를 맞춘 사본(tools/normalize_letters.py → letters/c · letters/j)
  // ?v= = 소리를 다시 만들면 올린다(폰·브라우저에 남은 옛 소리를 쓰지 않게) — v2: 앞 0.2초·뒤 0.15초 여유(10-01)
  char: file => `${MEDIA}/letters/c/${file}?v=3`,
  jamo: name => `${MEDIA}/letters/j/${name}.mp3?v=3`,
  // 새 설명(v9) 시안 소리 — tools/sync_v9.py 가 로컬 media/v9 에만 복사(아직 R2 에 없음 · 「올려」 전)
  v9: (ep, rel) => `${MEDIA}/v9/${ep}/${rel.split("/").map(encodeURIComponent).join("/")}?v=11`,
  sfx: name => `${MEDIA}/sfx/${name}.mp3?v=2`,
  bgm: file => `${MEDIA}/bgm/${file}?v=1`, // 배경음악(소리부 10-15 · 05_audio/_bgm) // 점수 효과음(본부 10-05 · 다시 맞추면 v 올림)
  charF: file => `${MEDIA}/chars_f/${file}?v=8`, // v8 = 소리부 10-12 글자 14개 새 판(받아쓰기·모음 짝 검사 걸린 것) · v7 = 소리부 10-11 자모 40 음량·7개 다시 · 글자 242 음량 · 공용 아나운서 글자·자모 소리(본부 05_audio/_chars_f) · v4 = 말 시작 0.03초 전부터(본부 10-06 · 투덜이 「딱 좋아」)
};
