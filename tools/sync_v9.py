# 새 설명(v9) 시안 자료 가져오기 — 본부 04_subtitles/{편}/_v9/{편}_v9_app.json + _preview 소리
# 글 → data/{편}/{편}.v9.json · 소리 → media/v9/{편}/(로컬 복사 · 저장소에 안 들어감)
# media/audio 는 05_audio 로 이어진 연결 폴더라 거기에 쓰지 않는다(드라이브 쪽 원본을 건드리지 않게).
import json, os, shutil, sys

MALMUN = r"D:\gdrive\malmun"
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sync(ep):
    src = os.path.join(MALMUN, "04_subtitles", ep, "_v9", f"{ep}_v9_app.json")
    d = json.load(open(src, encoding="utf-8"))
    root = os.path.join(MALMUN, d.get("audio_root", f"04_subtitles/{ep}/_preview/").replace("/", os.sep))
    out = os.path.join(APP, "media", "v9", ep)
    os.makedirs(out, exist_ok=True)
    n = 0
    for l in d["lines"]:
        for lg in (l.get("audio") or {}).values():
            for rel in lg.values():
                a, b = os.path.join(root, rel.replace("/", os.sep)), os.path.join(out, rel.replace("/", os.sep))
                if os.path.exists(a):
                    os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copy2(a, b); n += 1
                else:
                    print("소리 없음:", rel)
    # 말하기 본보기 = 문장만 읽은 소리(본부 10-03 · app.json 에 칸이 없어 이름 규칙으로) → audio.ko.sentence
    for l in d["lines"]:
        rel = f"새설명_소리_kr/{ep}_{l['n']:02d}_말해보세요_문장.mp3"
        a = os.path.join(root, rel.replace("/", os.sep))
        if os.path.exists(a):
            b = os.path.join(out, rel.replace("/", os.sep)); shutil.copy2(a, b); n += 1
            l.setdefault("audio", {}).setdefault("ko", {})["sentence"] = rel
    with open(os.path.join(APP, "data", ep, f"{ep}.v9.json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print(ep, len(d["lines"]), "줄 ·", n, "소리")


if __name__ == "__main__":
    for ep in sys.argv[1:] or ["L01-00-01"]:
        sync(ep)
