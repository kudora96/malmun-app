// 음성·영상 경로는 여기서만 조립한다(app_build_spec §3-5 — JSON 에는 파일 이름만).
// 로컬 미리보기 = media/(저장소 밖 연결) · 배포 = R2 버킷 malmun-media(tools/upload_media.py 로 올림)
const R2 = "https://pub-5e6f50ff2dda412eaa13ca4d4302d599.r2.dev";
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const MEDIA = LOCAL ? "media" : R2;

export const paths = {
  data: (ep, suffix = "") => `data/${ep}/${ep}${suffix}.json`,
  video: ep => `${MEDIA}/video/${ep}.mp4`,
  poster: ep => `img/${ep}.jpg`,
  audio: (ep, file) => `${MEDIA}/audio/${ep}/${file}`,
  // 글자·자모 = 크기를 맞춘 사본(tools/normalize_letters.py → letters/c · letters/j)
  char: file => `${MEDIA}/letters/c/${file}`,
  jamo: name => `${MEDIA}/letters/j/${name}.mp3`,
};
