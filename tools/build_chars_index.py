"""글자 음성 색인 data/chars_index.json — {글자: 파일명}

두 곳을 합친다(새 것이 이긴다):
  ① 옛 앱(C:\\kdrama-topik) 쓰기 데이터에 적힌 글자↔파일 짝 — 이름만으로 추측하지 않는다(at2·gat2 같은 번호 파일 때문)
  ② 본부 도구(07_tools/eleven_chars.py)가 만든 새 글자 — 05_audio/_chars/chars_new.json · 파일 u{유니코드}.mp3

로컬 미리보기용으로 media/chars/ 에 두 곳 파일을 모아 복사한다(저장소 밖 · gitignore).
실행: python tools/build_chars_index.py  → 올리기: python tools/upload_media.py --chars
"""
import glob, json, os, shutil

OLD = os.environ.get("OLD_APP", r"C:\kdrama-topik")
MALMUN = os.environ.get("MALMUN_ROOT", r"D:\gdrive\malmun")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_DIR = os.path.join(OLD, "audio", "chars")
NEW_DIR = os.path.join(MALMUN, "05_audio", "_chars")


def source(file):
    """파일명 → 실제 위치(새 글자 폴더 먼저)"""
    for d in (NEW_DIR, OLD_DIR):
        p = os.path.join(d, file)
        if os.path.exists(p):
            return p
    return None


def build():
    m = {}
    for f in glob.glob(os.path.join(OLD, "data", "**", "*.json"), recursive=True):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict):
            continue
        for w in d.get("writing") or []:
            for wd in w.get("words", []):
                for c in wd.get("chars", []):
                    a, ch = c.get("audio"), c.get("char")
                    if a and ch:
                        m[ch] = a.split("/")[-1].split("?")[0]
    old_n = len(m)
    new = os.path.join(NEW_DIR, "chars_new.json")
    if os.path.exists(new):
        m.update(json.load(open(new, encoding="utf-8")))
    m = {k: v for k, v in sorted(m.items()) if source(v)}
    with open(os.path.join(APP, "data", "chars_index.json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=0)

    local = os.path.join(APP, "media", "chars")
    # 옛 연결(junction · 파이썬 3.10 은 islink 로 못 알아본다)이면 연결만 푼다 — 원본 폴더에 복사하면 안 된다
    if os.path.exists(local) and os.path.normcase(os.path.realpath(local)) != os.path.normcase(os.path.abspath(local)):
        os.unlink(local) if os.path.islink(local) else os.rmdir(local)
    if os.path.exists(local) and os.path.normcase(os.path.realpath(local)) != os.path.normcase(os.path.abspath(local)):
        raise SystemExit(f"media/chars 가 다른 폴더로 연결되어 있다 — 복사 중단: {os.path.realpath(local)}")
    os.makedirs(local, exist_ok=True)
    for v in set(m.values()):
        dst = os.path.join(local, v)
        src = source(v)
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            shutil.copy2(src, dst)
    print(len(m), "글자 (옛", old_n, "+ 새", len(m) - old_n, ")")


if __name__ == "__main__":
    build()
