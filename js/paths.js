// 음성·영상 경로는 여기서만 조립한다(app_build_spec §3-5 — JSON 에는 파일 이름만).
// 지금은 로컬 미리보기(media/ = 저장소 밖 연결). 배포 때 MEDIA 만 R2 주소로 바꾼다.
export const MEDIA = "media";

export const paths = {
  data: (ep, suffix = "") => `data/${ep}/${ep}${suffix}.json`,
  video: ep => `${MEDIA}/video/${ep}.mp4`,
  poster: ep => `img/${ep}.jpg`,
  audio: (ep, file) => `${MEDIA}/audio/${ep}/${file}`,
  char: file => `${MEDIA}/chars/${file}`,
  jamo: name => `${MEDIA}/jamo/${name}.mp3`,
};
