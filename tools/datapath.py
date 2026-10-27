"""편 자료 폴더 한 곳 — 배울 말(LEARN)별 경로 상수 (본부·다국어부 10-27)
ko = 옛 길 data/{편}/ 그대로 · 다른 배울 말 = data/{말}/{편}/ (앱 resolver 와 같은 규칙)
ko 를 data/ko/ 로 옮길 때는 이 파일의 KO_LEGACY_PATH 만 False 로 (그 전에 sync_*·measure_sync·writing_units·upload_media 가 모두 data_dir() 를 쓰게 고친 뒤)."""
import os
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KO_LEGACY_PATH = True


def data_dir(learn, ep):
    learn = learn or "ko"
    if learn == "ko" and KO_LEGACY_PATH: return os.path.join(APP, "data", ep)
    return os.path.join(APP, "data", learn, ep)
